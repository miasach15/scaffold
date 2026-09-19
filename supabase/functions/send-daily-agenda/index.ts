// Supabase Edge Function: sends a styled "here's your day" email — a few top
// priorities, a chronological timeline of what's actually scheduled, and a peek at
// tomorrow's first thing. Styled to match a reference design the user provided directly
// (no email template exists in the connected Figma file — checked all 5 sections).
// Doesn't replicate the Dashboard's step-collapsing for "break it down" projects or
// Education work sessions — a plain task or event covers most days, and that collapsing
// logic is real complexity not worth duplicating in a second runtime for a first version.
//
// TEMPORARY: only sends to the emails in ALLOWED_EMAILS below, regardless of how many
// real users exist — this is explicitly a "just me, for now" rollout. Add more emails
// to that list (or delete the filter entirely) once you're ready to send this to
// everyone; nothing else about the function needs to change to do that.
//
// Deploy with:  supabase functions deploy send-daily-agenda
// Uses the same RESEND_API_KEY secret already set for send-welcome-email.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically — no need to set
// those yourself.
// Scheduled by migration_daily_agenda_cron.sql (pg_cron, once deployed).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") || Deno.env.get("WELCOME_FROM_EMAIL") || "Scaffold <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// TEMPORARY allowlist — see the file comment above.
const ALLOWED_EMAILS = ["miasachdev15@gmail.com"];

// Same swatch palette as src/lib/constants.js (CATEGORY_COLOR_SWATCHES + each swatch's
// THEME_PRESETS.primary as `accent`) — duplicated here since a Deno edge function can't
// import from the app's own src/. Keep these two in sync if the app's palette changes.
const SWATCHES: Record<string, { accent: string }> = {
  ocean: { accent: "#4A5BA8" }, sky: { accent: "#8290D8" }, emerald: { accent: "#059669" },
  pink: { accent: "#FF8CB1" }, amber: { accent: "#F57C0B" }, teal: { accent: "#14B8A6" },
  slate: { accent: "#6B7280" }, coral: { accent: "#FF9286" }, lilac: { accent: "#B894D9" },
  beige: { accent: "#CEBFAB" }, peach: { accent: "#FEABA3" },
};
const DEFAULT_CATEGORY_COLOR_KEYS: Record<string, string> = {
  School: "ocean", Personal: "pink", Health: "emerald", Social: "lilac", Extracurriculars: "coral",
};
const CATEGORY_EMOJI: Record<string, string> = {
  School: "📚", Personal: "⭐", Health: "🏃", Social: "👥", Extracurriculars: "🎨",
};

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeLabel = (decimalHour: number) => {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}:00 ${period}` : `${h12}:${pad(m)} ${period}`;
};
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

const CARD_BG = "#FAFAF9";
function sectionLabel(text: string, color = "#9CA3AF") {
  return `<div style="font-size:11px; font-weight:700; color:${color}; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">${text}</div>`;
}

function priorityCard(n: number, category: string, title: string, accent: string) {
  return `
    <div style="flex:1; min-width:0; background:${CARD_BG}; border-radius:12px; padding:14px 16px;">
      <div style="font-size:10.5px; font-weight:700; color:${accent}; letter-spacing:0.4px; margin-bottom:8px; white-space:nowrap;">${pad(n)} / ${escapeHtml((category || "PERSONAL").toUpperCase())}</div>
      <div style="font-family: 'Instrument Serif', Georgia, serif; font-size:15px; color:#1A1A2E; line-height:1.3;">${escapeHtml(title)}</div>
    </div>`;
}

function scheduleRow(timeStr: string, durationStr: string, category: string, title: string, notes: string | null, accent: string) {
  const emoji = CATEGORY_EMOJI[category] || "🔹";
  return `
    <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:10px;">
      <div style="width:64px; flex-shrink:0; padding-top:14px; text-align:right;">
        <div style="font-size:12.5px; font-weight:700; color:#1A1A2E;">${timeStr}</div>
        <div style="font-size:10.5px; color:#9CA3AF;">${durationStr}</div>
      </div>
      <div style="width:8px; flex-shrink:0; padding-top:20px; display:flex; justify-content:center;">
        <div style="width:8px; height:8px; border-radius:50%; background:${accent};"></div>
      </div>
      <div style="flex:1; min-width:0; background:${CARD_BG}; border-radius:12px; padding:12px 16px;">
        <div style="font-size:13.5px; font-weight:700; color:#1A1A2E;">${emoji} ${escapeHtml(title)}</div>
        ${notes ? `<div style="font-size:12px; color:#6B7280; margin-top:3px; line-height:1.4;">${escapeHtml(notes)}</div>` : ""}
      </div>
    </div>`;
}

function simpleRow(title: string, category: string, sub: string, accent: string) {
  return `
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
      <div style="width:6px; height:6px; border-radius:50%; background:${accent}; flex-shrink:0;"></div>
      <div style="flex:1; min-width:0; font-size:13px; color:#1A1A2E;">${escapeHtml(title)}</div>
      <div style="font-size:11px; color:#9CA3AF; flex-shrink:0;">${escapeHtml(sub)}</div>
    </div>`;
}

serve(async (_req) => {
  try {
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not set" }, 500);
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const now = new Date();
    const today = isoOf(now);
    const tomorrow = isoOf(new Date(now.getTime() + 86400000));
    const dateShort = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();

    const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (usersErr) return json({ error: usersErr.message }, 500);
    const users = usersPage.users.filter((u) => !!u.email && ALLOWED_EMAILS.includes(u.email as string));
    if (users.length === 0) return json({ ok: true, sent: 0, note: "no user in ALLOWED_EMAILS matched a real account" });

    const userIds = users.map((u) => u.id);
    const [{ data: profiles }, { data: tasks }, { data: events }] = await Promise.all([
      admin.from("profiles").select("id,name,category_colors").in("id", userIds),
      admin.from("tasks").select("user_id,title,date,start,duration,category,notes,done,group_id,edu_id").in("user_id", userIds).eq("done", false),
      admin.from("events").select("user_id,title,date,start,duration,category").in("user_id", userIds).in("date", [today, tomorrow]),
    ]);

    let sent = 0;
    const errors: string[] = [];

    for (const user of users) {
      const profile = (profiles || []).find((p) => p.id === user.id);
      const categoryColors: Record<string, string> = { ...DEFAULT_CATEGORY_COLOR_KEYS, ...(profile?.category_colors || {}) };
      const accentFor = (category: string | null) => SWATCHES[(category && categoryColors[category]) || "pink"]?.accent || SWATCHES.pink.accent;

      const myTasks = (tasks || []).filter((t) => t.user_id === user.id && !t.group_id && !t.edu_id);
      const myEvents = (events || []).filter((e) => e.user_id === user.id);

      const timedToday = myTasks.filter((t) => t.date === today && t.start != null).sort((a, b) => a.start - b.start);
      const untimedToday = myTasks.filter((t) => t.date === today && t.start == null);
      const overdue = myTasks.filter((t) => t.date && t.date < today && t.start == null);
      const eventsToday = myEvents.filter((e) => e.date === today);

      // Schedule = anything with a fixed time slot, chronological. Priorities = the
      // undated-to-a-slot "stuff to actually get done" pile — overdue first (most
      // pressing), so the two sections don't just repeat each other.
      const schedule = [
        ...timedToday.map((t) => ({ title: t.title, category: t.category, notes: t.notes, start: t.start, duration: t.duration })),
        ...eventsToday.map((e) => ({ title: e.title, category: e.category, notes: null as string | null, start: e.start, duration: e.duration })),
      ].sort((a, b) => a.start - b.start);
      const doPile = [...overdue, ...untimedToday];
      const priorities = doPile.slice(0, 3);
      const restOfDoPile = doPile.slice(3);

      const firstName = (profile?.name || "").trim().split(" ")[0];
      const totalItems = schedule.length + doPile.length;

      const tomorrowTimed = myTasks.filter((t) => t.date === tomorrow && t.start != null).sort((a, b) => a.start - b.start);
      const tomorrowEvents = myEvents.filter((e) => e.date === tomorrow).sort((a, b) => (a.start ?? 99) - (b.start ?? 99));
      const tomorrowUntimed = myTasks.filter((t) => t.date === tomorrow && t.start == null);
      const tomorrowTop = [...tomorrowTimed, ...tomorrowEvents][0] || tomorrowUntimed[0] || null;

      let bodyHtml: string;
      if (totalItems === 0) {
        bodyHtml = `<div style="font-size:13.5px; color:#9CA3AF; padding:8px 0 24px;">Nothing on the calendar today. A quiet one — or a good day to add something in the app.</div>`;
      } else {
        const parts: string[] = [];
        if (priorities.length > 0) {
          parts.push(
            sectionLabel("Today's Core Priorities") +
              `<div class="priority-row" style="display:flex; gap:10px; margin-bottom:28px;">` +
              priorities.map((p, i) => priorityCard(i + 1, p.category, p.title, accentFor(p.category))).join("") +
              `</div>`
          );
        }
        if (schedule.length > 0) {
          parts.push(
            sectionLabel("Chronological Schedule") +
              `<div style="margin-bottom:${restOfDoPile.length > 0 ? 20 : 28}px;">` +
              schedule.map((it) => scheduleRow(timeLabel(it.start), it.duration ? `${Math.round(it.duration)}m` : "", it.category, it.title, it.notes, accentFor(it.category))).join("") +
              `</div>`
          );
        }
        if (restOfDoPile.length > 0) {
          parts.push(
            sectionLabel("Also on your list") +
              `<div style="margin-bottom:28px;">` +
              restOfDoPile.map((t) => simpleRow(t.title, t.category, t.date < today ? "Carried over" : t.category, accentFor(t.category))).join("") +
              `</div>`
          );
        }
        bodyHtml = parts.join("");
      }

      const lookingAhead = tomorrowTop
        ? `
        ${sectionLabel("Looking Ahead")}
        <div style="background: linear-gradient(135deg, #2A2A3D, #1A1A2E); border-radius:14px; padding:28px 24px;">
          <div style="font-size:10.5px; font-weight:700; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Tomorrow's Focus</div>
          <div style="font-family: 'Instrument Serif', Georgia, serif; font-size:19px; color:#fff;">${escapeHtml(tomorrowTop.title)}</div>
        </div>`
        : "";

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your day</title>
<style>
  body { margin:0; padding:0; background:#FDFCFB; }
  /* Three priority cards side by side get too cramped to read on a phone-width
     screen — stack them instead, same cards just full-width and top-to-bottom. */
  @media (max-width: 480px) {
    .priority-row { flex-direction: column !important; }
    .priority-row > div { flex: none !important; margin-bottom: 10px; }
    .priority-row > div:last-child { margin-bottom: 0; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:#FDFCFB;">
  <div style="width:100%; background:#FDFCFB;">
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 28px; background: #FDFCFB;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:16px; border-bottom:1px solid #D9D3E6; margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:8px; height:8px; border-radius:50%; background:#FF9286; flex-shrink:0;"></div>
          <div style="font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size:20px; color:#8290D8;">Scaffold</div>
        </div>
        <div style="font-size:10.5px; font-weight:700; color:#9CA3AF; letter-spacing:0.5px; white-space:nowrap;">DAILY AGENDA &bull; ${dateShort}</div>
      </div>
      <div style="font-family: 'Instrument Serif', Georgia, serif; font-size:28px; color:#1A1A2E; margin-bottom:24px;">Good morning${firstName ? `, ${firstName}` : ""}.</div>
      ${bodyHtml}
      ${lookingAhead}
      <div style="border-top:1px solid #D9D3E6; margin-top:28px; padding-top:16px; font-size:11.5px; color:#9CA3AF;">Sent automatically by Scaffold.</div>
    </div>
  </div>
</body>
</html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: user.email, subject: totalItems > 0 ? `Your day: ${totalItems} thing${totalItems === 1 ? "" : "s"} on the calendar` : "Your day: nothing on the calendar", html }),
      });

      if (res.ok) sent++;
      else errors.push(`${user.email}: ${await res.text()}`);
    }

    return json({ ok: true, sent, errors });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
