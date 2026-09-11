// Supabase Edge Function: texts every opted-in user what's due today (same "active" set
// Today shows in the app — overdue, due today, or inside a task's own urgency window —
// plus Education and goal deadlines), same logic as send-daily-digest but by SMS instead
// of email. If nothing's due AND the user has nothing at all on their plate (no undone
// tasks or goals anywhere), sends a short nudge to add something instead of staying
// silent — texting back adds it straight to Tasks, see receive-sms.
//
// Deploy with:  supabase functions deploy send-sms-digest
// Needs TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER secrets set.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically — no need to set
// those yourself.
// Scheduled by migration_sms_digest_cron.sql (pg_cron, once deployed).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
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

async function sendSms(to: string, body: string) {
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER!, Body: body }),
  });
  if (!res.ok) throw new Error(await res.text());
}

serve(async (_req) => {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return json({ error: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER not set" }, 500);
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const today = todayISO();

    const { data: profiles, error: profilesErr } = await admin
      .from("profiles")
      .select("id,phone_number")
      .eq("sms_reminders_enabled", true)
      .not("phone_number", "is", null);
    if (profilesErr) return json({ error: profilesErr.message }, 500);
    if (!profiles || profiles.length === 0) return json({ ok: true, sent: 0, skipped: 0, note: "no opted-in users" });

    const userIds = profiles.map((p) => p.id);
    const [{ data: tasks }, { data: eduItems }, { data: goalActions }] = await Promise.all([
      admin.from("tasks").select("user_id,title,date,lead_days,done,group_id,edu_id").in("user_id", userIds).eq("done", false),
      admin.from("edu_items").select("user_id,title,type,due_date,done").in("user_id", userIds).eq("done", false),
      admin.from("goal_actions").select("user_id,title,due_date,done").in("user_id", userIds).eq("done", false),
    ]);

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      const items: { title: string; sub: string }[] = [];

      (tasks || [])
        .filter((t) => t.user_id === profile.id && t.date && !t.group_id && !t.edu_id)
        .forEach((t) => {
          const d = daysUntil(t.date, today);
          const lead = t.lead_days || 2; // same default as the app's TodaySection
          if (d < 0) items.push({ title: t.title, sub: d === -1 ? "carried over" : `carried over ${-d}d` });
          else if (d === 0) items.push({ title: t.title, sub: "due today" });
          else if (d <= lead - 1) items.push({ title: t.title, sub: `due in ${d}d` });
        });

      (eduItems || [])
        .filter((e) => e.user_id === profile.id && e.due_date)
        .forEach((e) => {
          const d = daysUntil(e.due_date, today);
          if (d < 0) items.push({ title: `${e.title} (${e.type})`, sub: d === -1 ? "carried over" : `carried over ${-d}d` });
          else if (d === 0) items.push({ title: `${e.title} (${e.type})`, sub: "due today" });
        });

      (goalActions || [])
        .filter((a) => a.user_id === profile.id && a.due_date)
        .forEach((a) => {
          const d = daysUntil(a.due_date, today);
          if (d < 0) items.push({ title: a.title, sub: d === -1 ? "carried over" : `carried over ${-d}d` });
          else if (d === 0) items.push({ title: a.title, sub: "due today" });
        });

      let body: string;
      if (items.length > 0) {
        const lines = items.slice(0, 8).map((it) => `• ${it.title} (${it.sub})`).join("\n");
        const more = items.length > 8 ? `\n+ ${items.length - 8} more` : "";
        body = `Scaffold — today:\n${lines}${more}\n\nReply with anything to add it as a task.`;
      } else {
        // Nothing due — but does this user have anything on their plate at all? If not,
        // a plain "nothing's due" text is a dead end; nudge toward actually planning
        // something instead of staying silent.
        const hasAnythingUndone =
          (tasks || []).some((t) => t.user_id === profile.id) ||
          (goalActions || []).some((a) => a.user_id === profile.id);
        if (hasAnythingUndone) {
          skipped++;
          continue;
        }
        body = "Scaffold — nothing on your list yet. Reply with a task or goal and I'll add it for you.";
      }

      try {
        await sendSms(profile.phone_number as string, body);
        sent++;
      } catch (e) {
        errors.push(`${profile.id}: ${String(e)}`);
      }
    }

    return json({ ok: true, sent, skipped, errors });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
