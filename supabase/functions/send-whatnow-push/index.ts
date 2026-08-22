// Supabase Edge Function: for every subscribed device, picks the single most pressing
// thing happening or due today — same "Do this next" idea as the in-app What Now modal —
// and pushes it as a phone/desktop notification. Built for ADHD-style external nudging:
// you shouldn't have to open the app and decide what to do; it just tells you.
//
// Deploy with:  supabase functions deploy send-whatnow-push
// Requires these secrets (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected):
//   supabase secrets set VAPID_PUBLIC_KEY=...     (same value as VITE_VAPID_PUBLIC_KEY)
//   supabase secrets set VAPID_PRIVATE_KEY=...    (keep this one secret — never client-side)
//   supabase secrets set VAPID_SUBJECT=mailto:you@example.com
// Scheduled by migration_whatnow_cron.sql (pg_cron, once deployed) — runs every 15
// minutes and, per subscribed device, only actually sends once that device's own
// interval/quiet-hours settings say it's due.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@example.com";

type Item = { title: string; category: string | null; start: number | null; duration: number | null };

const CATEGORY_RANK = (c: string | null) => (c === "Education" ? 0 : c === "Personal" ? 2 : 1);

function localParts(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value])) as Record<string, string>;
  let hour = Number(p.hour);
  if (hour === 24) hour = 0;
  return { dateISO: `${p.year}-${p.month}-${p.day}`, hourDecimal: hour + Number(p.minute) / 60, hour };
}

function formatTime(decimal: number) {
  const h24 = Math.floor(decimal);
  const m = Math.round((decimal - h24) * 60);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Same three-tier idea as WhatNowModal: something happening right now beats something
// merely scheduled later today, which beats something just due today with no set time.
function pickWhatNow(items: Item[], nowHour: number): { title: string; body: string } | null {
  const happeningNow = items
    .filter((it) => it.start != null && nowHour >= it.start! && nowHour < it.start! + (it.duration ?? 0.5))
    .sort((a, b) => CATEGORY_RANK(a.category) - CATEGORY_RANK(b.category));
  if (happeningNow.length > 0) return { title: "Right now", body: happeningNow[0].title };

  const upcoming = items
    .filter((it) => it.start != null && it.start! > nowHour)
    .sort((a, b) => a.start! - b.start!);
  if (upcoming.length > 0) return { title: "Coming up", body: `${upcoming[0].title} at ${formatTime(upcoming[0].start!)}` };

  const untimed = items
    .filter((it) => it.start == null)
    .sort((a, b) => CATEGORY_RANK(a.category) - CATEGORY_RANK(b.category));
  if (untimed.length > 0) return { title: "Do this next", body: untimed[0].title };

  return null;
}

serve(async (_req) => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available" }, 500);
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return json({ error: "VAPID keys not set" }, 500);
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const [{ data: subs }, { data: profiles }, { data: tasks }, { data: eduItems }, { data: goalActions }, { data: events }] = await Promise.all([
      admin.from("push_subscriptions").select("*"),
      admin.from("profiles").select("id,whatnow_notifications,whatnow_interval_minutes,whatnow_window_start,whatnow_window_end"),
      admin.from("tasks").select("user_id,title,date,start,duration,category,done").eq("done", false),
      admin.from("edu_items").select("user_id,title,type,subject,due_date,done").eq("done", false),
      admin.from("goal_actions").select("user_id,title,due_date,done"),
      admin.from("events").select("user_id,title,date,start,duration,category"),
    ]);

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    let sent = 0;
    const skipped: string[] = [];
    const errors: string[] = [];
    const staleEndpoints: string[] = [];

    for (const sub of subs || []) {
      const profile = profileById.get(sub.user_id);
      if (!profile || !profile.whatnow_notifications) { skipped.push(sub.id); continue; }

      const { dateISO: today, hourDecimal, hour } = localParts(sub.timezone || "UTC");
      if (hour < profile.whatnow_window_start || hour >= profile.whatnow_window_end) { skipped.push(sub.id); continue; }

      const intervalMs = (profile.whatnow_interval_minutes || 60) * 60 * 1000;
      if (sub.last_sent_at && Date.now() - new Date(sub.last_sent_at).getTime() < intervalMs) { skipped.push(sub.id); continue; }

      const items: Item[] = [
        ...(tasks || []).filter((t) => t.user_id === sub.user_id && t.date === today)
          .map((t) => ({ title: t.title, category: t.category, start: t.start, duration: t.duration })),
        ...(eduItems || []).filter((e) => e.user_id === sub.user_id && e.due_date === today)
          .map((e) => ({ title: `${e.title} (${e.type})`, category: "Education", start: null, duration: null })),
        ...(goalActions || []).filter((a) => a.user_id === sub.user_id && a.due_date === today && !a.done)
          .map((a) => ({ title: a.title, category: null, start: null, duration: null })),
        ...(events || []).filter((ev) => ev.user_id === sub.user_id && ev.date === today)
          .map((ev) => ({ title: ev.title, category: ev.category, start: ev.start, duration: ev.duration })),
      ];

      const pick = pickWhatNow(items, hourDecimal);
      if (!pick) { skipped.push(sub.id); continue; } // nothing today — stay quiet rather than notify about nothing

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify(pick)
        );
        await admin.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("id", sub.id);
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) staleEndpoints.push(sub.endpoint);
        else errors.push(`${sub.id}: ${String(e)}`);
      }
    }

    if (staleEndpoints.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
    }

    return json({ ok: true, sent, skipped: skipped.length, staleRemoved: staleEndpoints.length, errors });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
