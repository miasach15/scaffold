// Supabase Edge Function: sends a styled "here's your day" email — today's timed
// schedule, anything untimed due today or carried over, and today's events. Same shape
// as the Dashboard's "Today's Scaffolded Steps", though it doesn't replicate that page's
// step-collapsing for "break it down" projects or Education work sessions — a plain task
// or event covers most days, and collapsing logic is real complexity not worth
// duplicating in a second runtime for a first version of this email.
//
// TEMPORARY: only sends to the emails in ALLOWED_EMAILS below, regardless of how many
// real users exist — this is explicitly a "just me, for now" rollout. Add more emails
// to that list (or delete the filter entirely) once you're ready to send this to
// everyone; nothing else about the function needs to change to do that.
//
// Deploy with:  supabase functions deploy send-daily-agenda
// Uses the same RESEND_API_KEY secret already set for send-welcome-email/
// send-daily-digest. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically — no need to set those yourself.
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
const SWATCHES: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  ocean: { bg: "#E3E6F2", border: "#A1A9CE", text: "#42496C", accent: "#4A5BA8" },
  sky: { bg: "#E0E4F5", border: "#9AA3D6", text: "#3B4473", accent: "#8290D8" },
  emerald: { bg: "#D9FCF1", border: "#84EBCB", text: "#24896A", accent: "#059669" },
  pink: { bg: "#FCD9E4", border: "#EB84A5", text: "#8C2144", accent: "#FF8CB1" },
  amber: { bg: "#FCEAD9", border: "#EBB684", text: "#885525", accent: "#F57C0B" },
  teal: { bg: "#DBFAF7", border: "#8AE6DB", text: "#2B8278", accent: "#14B8A6" },
  slate: { bg: "#E9EAEC", border: "#B2B6BD", text: "#52555C", accent: "#6B7280" },
  coral: { bg: "#FCDDD9", border: "#EB8E84", text: "#8C2C21", accent: "#FF9286" },
  lilac: { bg: "#EBE1F4", border: "#B99CD3", text: "#583D70", accent: "#B894D9" },
  beige: { bg: "#F0EBE6", border: "#C7BAA9", text: "#655949", accent: "#CEBFAB" },
  peach: { bg: "#FCDCD9", border: "#EB8D84", text: "#8B2B22", accent: "#FEABA3" },
};
const DEFAULT_CATEGORY_COLOR_KEYS: Record<string, string> = {
  School: "ocean", Personal: "pink", Health: "emerald", Social: "lilac", Extracurriculars: "coral",
};

const pad = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeLabel = (decimalHour: number) => {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${pad(m)} ${period}`;
};
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function itemCard(title: string, category: string | null, col: { bg: string; border: string; text: string; accent: string }, subtitle: string) {
  return `
    <div style="display:flex; align-items:center; gap:10px; padding:12px 14px; border:1.5px solid ${col.border}; border-left:4px solid ${col.accent}; border-radius:10px; background:#fff; margin-bottom:8px;">
      <div style="flex:1; min-width:0;">
        <div style="font-size:14px; font-weight:700; color:${col.accent};">${escapeHtml(title)}</div>
        <div style="font-size:11.5px; color:#6B7280; margin-top:1px;">${escapeHtml(subtitle)}</div>
      </div>
    </div>`;
}

serve(async (_req) => {
  try {
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not set" }, 500);
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const today = todayISO();
    const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (usersErr) return json({ error: usersErr.message }, 500);
    const users = usersPage.users.filter((u) => !!u.email && ALLOWED_EMAILS.includes(u.email as string));
    if (users.length === 0) return json({ ok: true, sent: 0, note: "no user in ALLOWED_EMAILS matched a real account" });

    const userIds = users.map((u) => u.id);
    const [{ data: profiles }, { data: tasks }, { data: events }] = await Promise.all([
      admin.from("profiles").select("id,name,category_colors").in("id", userIds),
      admin.from("tasks").select("user_id,title,date,start,duration,category,done,group_id,edu_id").in("user_id", userIds).eq("done", false),
      admin.from("events").select("user_id,title,date,start,duration,category").in("user_id", userIds).eq("date", today),
    ]);

    let sent = 0;
    const errors: string[] = [];

    for (const user of users) {
      const profile = (profiles || []).find((p) => p.id === user.id);
      const categoryColors: Record<string, string> = { ...DEFAULT_CATEGORY_COLOR_KEYS, ...(profile?.category_colors || {}) };
      const colFor = (category: string | null) => {
        const key = (category && categoryColors[category]) || "pink";
        return SWATCHES[key] || SWATCHES.pink;
      };

      const myTasks = (tasks || []).filter((t) => t.user_id === user.id && !t.group_id && !t.edu_id);
      const timed = myTasks.filter((t) => t.date === today && t.start != null).sort((a, b) => a.start - b.start);
      const untimed = myTasks.filter((t) => t.date === today && t.start == null);
      const overdue = myTasks.filter((t) => t.date && t.date < today && t.start == null);
      const myEvents = (events || []).filter((e) => e.user_id === user.id);

      const totalItems = timed.length + untimed.length + overdue.length + myEvents.length;
      const firstName = (profile?.name || "").trim().split(" ")[0];

      let bodyHtml: string;
      if (totalItems === 0) {
        bodyHtml = `<div style="font-size:13.5px; color:#9CA3AF; padding:16px 0;">Nothing on the calendar today. A quiet one — or a good day to add something in the app.</div>`;
      } else {
        const sections: string[] = [];
        if (timed.length > 0 || myEvents.length > 0) {
          const timedAndEvents = [
            ...timed.map((t) => ({ title: t.title, category: t.category, start: t.start, duration: t.duration })),
            ...myEvents.map((e) => ({ title: e.title, category: e.category, start: e.start, duration: e.duration })),
          ].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
          sections.push(
            `<div style="font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.4px; margin:18px 0 8px;">Today's schedule</div>` +
              timedAndEvents
                .map((it) => itemCard(it.title, it.category, colFor(it.category), `${timeLabel(it.start)}${it.duration ? ` · ${Math.round(it.duration)}m` : ""}${it.category ? ` · ${it.category}` : ""}`))
                .join("")
          );
        }
        if (untimed.length > 0) {
          sections.push(
            `<div style="font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.4px; margin:18px 0 8px;">Anytime today</div>` +
              untimed.map((t) => itemCard(t.title, t.category, colFor(t.category), t.category || "")).join("")
          );
        }
        if (overdue.length > 0) {
          sections.push(
            `<div style="font-size:11px; font-weight:700; color:#B0873A; text-transform:uppercase; letter-spacing:0.4px; margin:18px 0 8px;">Carried over</div>` +
              overdue.map((t) => itemCard(t.title, t.category, colFor(t.category), `Since ${t.date}${t.category ? ` · ${t.category}` : ""}`)).join("")
          );
        }
        bodyHtml = sections.join("");
      }

      const html = `
        <div style="font-family: -apple-system, 'IBM Plex Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #FAFAFA;">
          <div style="font-family: Georgia, 'Playfair Display', serif; font-size: 24px; font-weight: 700; color: #1A1A2E; margin-bottom: 2px;">Scaffold</div>
          <p style="font-size: 13px; color: #9CA3AF; margin-top: 0;">Good morning${firstName ? `, ${firstName}` : ""} — ${dateLabel}</p>
          ${bodyHtml}
        </div>`;

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
