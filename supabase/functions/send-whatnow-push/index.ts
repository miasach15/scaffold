// Supabase Edge Function: for every subscribed device (browser/PWA via Web Push, or the
// App Store app via APNs), picks the single most pressing thing happening or due today —
// same "Do this next" idea as the in-app What Now modal — and pushes it as a phone/
// desktop notification. Built for ADHD-style external nudging: you shouldn't have to
// open the app and decide what to do; it just tells you.
//
// Deploy with:  supabase functions deploy send-whatnow-push
// Requires these secrets (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected):
//   Web Push (browser/PWA):
//     supabase secrets set VAPID_PUBLIC_KEY=...   (same value as VITE_VAPID_PUBLIC_KEY)
//     supabase secrets set VAPID_PRIVATE_KEY=...  (keep this one secret — never client-side)
//     supabase secrets set VAPID_SUBJECT=mailto:you@example.com
//   APNs (the App Store app) — from Apple Developer → Certificates, IDs & Profiles → Keys:
//     supabase secrets set APNS_KEY_ID=...        (10-char key ID)
//     supabase secrets set APNS_TEAM_ID=...        (10-char team ID)
//     supabase secrets set APNS_TOPIC=com.miasachdev.scaffold   (the app's bundle ID)
//     supabase secrets set APNS_AUTH_KEY="$(cat AuthKey_XXXX.p8)"   (the whole .p8 file, PEM)
//     supabase secrets set APNS_SANDBOX=true      (only while testing a Debug/Xcode build; omit or "false" for TestFlight/App Store builds)
// Either channel's secrets can be set without the other — whichever is missing is just
// skipped. Scheduled by migration_whatnow_cron.sql (pg_cron, once deployed) — runs every
// 15 minutes and, per subscribed device, only actually sends once that device's own
// interval/quiet-hours settings say it's due.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@example.com";

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID");
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID");
const APNS_TOPIC = Deno.env.get("APNS_TOPIC");
const APNS_AUTH_KEY = Deno.env.get("APNS_AUTH_KEY");
const APNS_HOST = Deno.env.get("APNS_SANDBOX") === "true" ? "api.sandbox.push.apple.com" : "api.push.apple.com";

type Item = { title: string; category: string | null; start: number | null; duration: number | null };
type Pick = { title: string; body: string };

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
function pickWhatNow(items: Item[], nowHour: number): Pick | null {
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

function itemsForUser(userId: string, today: string, tasks: any[], eduItems: any[], goalActions: any[], events: any[]): Item[] {
  return [
    ...tasks.filter((t) => t.user_id === userId && t.date === today)
      .map((t) => ({ title: t.title, category: t.category, start: t.start, duration: t.duration })),
    ...eduItems.filter((e) => e.user_id === userId && e.due_date === today)
      .map((e) => ({ title: `${e.title} (${e.type})`, category: "Education", start: null, duration: null })),
    ...goalActions.filter((a) => a.user_id === userId && a.due_date === today && !a.done)
      .map((a) => ({ title: a.title, category: null, start: null, duration: null })),
    ...events.filter((ev) => ev.user_id === userId && ev.date === today)
      .map((ev) => ({ title: ev.title, category: ev.category, start: ev.start, duration: ev.duration })),
  ];
}

// --- APNs: a signed ES256 JWT ("provider authentication token"), reused for every
// device this run since it's cheap to build and Apple accepts the same one for ~an hour.
let apnsJwtCache: { token: string; builtAt: number } | null = null;

async function apnsAuthToken(): Promise<string> {
  if (apnsJwtCache && Date.now() - apnsJwtCache.builtAt < 30 * 60 * 1000) return apnsJwtCache.token;

  const pem = APNS_AUTH_KEY!.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID })));
  const claims = b64url(enc.encode(JSON.stringify({ iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) })));
  const signingInput = `${header}.${claims}`;
  // WebCrypto's ECDSA signature is already raw (r||s) IEEE-P1363 format — exactly what JWS/ES256 wants, no re-encoding needed.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput)));
  const token = `${signingInput}.${b64url(sig)}`;
  apnsJwtCache = { token, builtAt: Date.now() };
  return token;
}

// Returns "sent" | "stale" (bad/expired token — caller should delete it) | "error".
async function sendApns(deviceToken: string, pick: Pick): Promise<"sent" | "stale" | "error"> {
  const jwt = await apnsAuthToken();
  const res = await fetch(`https://${APNS_HOST}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": APNS_TOPIC!,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify({ aps: { alert: { title: pick.title, body: pick.body }, sound: "default" } }),
  });
  if (res.ok) return "sent";
  if (res.status === 400 || res.status === 410) return "stale"; // BadDeviceToken / Unregistered
  return "error";
}

serve(async (_req) => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available" }, 500);

    const webPushReady = !!VAPID_PUBLIC_KEY && !!VAPID_PRIVATE_KEY;
    const apnsReady = !!APNS_KEY_ID && !!APNS_TEAM_ID && !!APNS_TOPIC && !!APNS_AUTH_KEY;
    if (!webPushReady && !apnsReady) return json({ error: "Neither VAPID (Web Push) nor APNs secrets are set" }, 500);
    if (webPushReady) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const [{ data: webSubs }, { data: deviceTokens }, { data: profiles }, { data: tasks }, { data: eduItems }, { data: goalActions }, { data: events }] = await Promise.all([
      admin.from("push_subscriptions").select("*"),
      admin.from("device_push_tokens").select("*"),
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
    const staleWebEndpoints: string[] = [];
    const staleDeviceTokens: string[] = [];

    // Shared per-device gate: is this device due for a notification right now, and if
    // so, what should it say? Returns null when it should be skipped (quiet hours,
    // already sent recently, or genuinely nothing on the plate today).
    function due(userId: string, timezone: string, lastSentAt: string | null): Pick | null {
      const profile = profileById.get(userId);
      if (!profile || !profile.whatnow_notifications) return null;
      const { dateISO: today, hourDecimal, hour } = localParts(timezone || "UTC");
      if (hour < profile.whatnow_window_start || hour >= profile.whatnow_window_end) return null;
      const intervalMs = (profile.whatnow_interval_minutes || 60) * 60 * 1000;
      if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < intervalMs) return null;
      const items = itemsForUser(userId, today, tasks || [], eduItems || [], goalActions || [], events || []);
      return pickWhatNow(items, hourDecimal);
    }

    if (webPushReady) {
      for (const sub of webSubs || []) {
        const pick = due(sub.user_id, sub.timezone, sub.last_sent_at);
        if (!pick) { skipped.push(sub.id); continue; }
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, JSON.stringify(pick));
          await admin.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("id", sub.id);
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) staleWebEndpoints.push(sub.endpoint);
          else errors.push(`web ${sub.id}: ${String(e)}`);
        }
      }
    }

    if (apnsReady) {
      for (const dt of deviceTokens || []) {
        const pick = due(dt.user_id, dt.timezone, dt.last_sent_at);
        if (!pick) { skipped.push(dt.id); continue; }
        try {
          const result = await sendApns(dt.token, pick);
          if (result === "sent") {
            await admin.from("device_push_tokens").update({ last_sent_at: new Date().toISOString() }).eq("id", dt.id);
            sent++;
          } else if (result === "stale") {
            staleDeviceTokens.push(dt.token);
          } else {
            errors.push(`apns ${dt.id}: request failed`);
          }
        } catch (e) {
          errors.push(`apns ${dt.id}: ${String(e)}`);
        }
      }
    }

    if (staleWebEndpoints.length > 0) await admin.from("push_subscriptions").delete().in("endpoint", staleWebEndpoints);
    if (staleDeviceTokens.length > 0) await admin.from("device_push_tokens").delete().in("token", staleDeviceTokens);

    return json({ ok: true, sent, skipped: skipped.length, staleRemoved: staleWebEndpoints.length + staleDeviceTokens.length, errors });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
