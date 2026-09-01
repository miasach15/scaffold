// Supabase Edge Function: sends every user a "here's what's due" email once a day,
// covering the same "active" items Today shows in the app — overdue, due today, or
// inside a task's "days needed" urgency window — plus Education and goal deadlines.
// Skips a user entirely if nothing's due (no empty-inbox spam).
//
// Deploy with:  supabase functions deploy send-daily-digest
// Uses the same RESEND_API_KEY secret as send-welcome-email (already required if
// you've deployed that one). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by Supabase — no need to set them yourself.
// Scheduled by migration_daily_digest_cron.sql (pg_cron, once deployed).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") || Deno.env.get("WELCOME_FROM_EMAIL") || "Scaffold <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const pad = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const daysUntil = (iso: string, today: string) => {
  const a = new Date(today + "T00:00:00");
  const b = new Date(iso + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

serve(async (_req) => {
  try {
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not set" }, 500);
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const today = todayISO();

    // listUsers() paginates at 50/page by default — fine for a small user base; bump
    // perPage or loop pages if this ever needs to scale past that.
    const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (usersErr) return json({ error: usersErr.message }, 500);
    const users = usersPage.users.filter((u) => !!u.email);

    const [{ data: tasks }, { data: eduItems }, { data: goalActions }] = await Promise.all([
      admin.from("tasks").select("user_id,title,date,lead_days,done,group_id,edu_id").eq("done", false),
      admin.from("edu_items").select("user_id,title,type,due_date,done").eq("done", false),
      admin.from("goal_actions").select("user_id,title,due_date,done").eq("done", false),
    ]);

    let sent = 0;
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const user of users) {
      const items: { title: string; sub: string; tone: "carried" | "warn" }[] = [];

      (tasks || [])
        .filter((t) => t.user_id === user.id && t.date && !t.group_id && !t.edu_id)
        .forEach((t) => {
          const d = daysUntil(t.date, today);
          const lead = t.lead_days || 2; // same default as the app's TodaySection
          if (d < 0) items.push({ title: t.title, sub: d === -1 ? "Carried over" : `Carried over: ${-d}d`, tone: "carried" });
          else if (d === 0) items.push({ title: t.title, sub: "Due today", tone: "warn" });
          else if (d <= lead - 1) items.push({ title: t.title, sub: `Due in ${d} day${d === 1 ? "" : "s"}`, tone: "warn" });
        });

      (eduItems || [])
        .filter((e) => e.user_id === user.id && e.due_date)
        .forEach((e) => {
          const d = daysUntil(e.due_date, today);
          if (d < 0) items.push({ title: `${e.title} (${e.type})`, sub: d === -1 ? "Carried over" : `Carried over: ${-d}d`, tone: "carried" });
          else if (d === 0) items.push({ title: `${e.title} (${e.type})`, sub: "Due today", tone: "warn" });
        });

      (goalActions || [])
        .filter((a) => a.user_id === user.id && a.due_date)
        .forEach((a) => {
          const d = daysUntil(a.due_date, today);
          if (d < 0) items.push({ title: a.title, sub: d === -1 ? "Carried over" : `Carried over: ${-d}d`, tone: "carried" });
          else if (d === 0) items.push({ title: a.title, sub: "Due today", tone: "warn" });
        });

      if (items.length === 0) {
        skipped.push(user.id);
        continue;
      }

      const rows = items
        .map(
          (it) => `
        <div style="display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid #EDEDED;">
          <span style="font-size:14px; color:#2A2A2A;">${escapeHtml(it.title)}</span>
          <span style="font-size:12px; font-weight:700; color:${it.tone === "carried" ? "#5849C4" : "#8A5424"}; white-space:nowrap;">${it.sub}</span>
        </div>`
        )
        .join("");

      const html = `
        <div style="font-family: -apple-system, 'IBM Plex Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #FAFAFA;">
          <div style="font-family: Georgia, 'Playfair Display', serif; font-size: 24px; font-weight: 700; color: #000000; margin-bottom: 4px;">Scaffold</div>
          <p style="font-size: 13px; color: #9CA3AF; margin-top: 0;">What's due: ${today}</p>
          <div style="background:#fff; border-radius:12px; padding: 6px 16px; margin-top: 16px;">${rows}</div>
        </div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: user.email, subject: `${items.length} thing${items.length === 1 ? "" : "s"} due today`, html }),
      });

      if (res.ok) sent++;
      else errors.push(`${user.email}: ${await res.text()}`);
    }

    return json({ ok: true, sent, skipped: skipped.length, errors });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
