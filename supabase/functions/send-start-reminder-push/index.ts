// Supabase Edge Function: fires a "time to start" push the minute a timed task or
// event's scheduled start arrives — separate from send-whatnow-push's periodic "what's
// most worth doing right now" nudges, this one is tied to an exact moment on the
// calendar, not an interval. Reuses the same push_subscriptions/device_push_tokens
// tables and the same VAPID/APNs secrets send-whatnow-push already uses.
//
// Deploy with:  supabase functions deploy send-start-reminder-push
// Requires the same secrets as send-whatnow-push (see that function's header comment)
// plus migration_start_reminders.sql run first. Scheduled every minute by
// migration_start_reminder_cron.sql — each item only ever gets sent once per
// (kind, item_id, scheduled date, scheduled start), enforced by start_reminder_log's
// unique constraint, so overlapping ticks never double-send.

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

type Item = { kind: "task" | "event"; id: string; userId: string; title: string; start: number };

function localParts(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value])) as Record<string, string>;
  let hour = Number(p.hour);
  if (hour === 24) hour = 0;
  return { dateISO: `${p.year}-${p.month}-${p.day}`, hourDecimal: hour + Number(p.minute) / 60 };
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
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput)));
  const token = `${signingInput}.${b64url(sig)}`;
  apnsJwtCache = { token, builtAt: Date.now() };
  return token;
}

function formatTime(decimal: number) {
  const h24 = Math.floor(decimal);
  const m = Math.round((decimal - h24) * 60);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

async function sendApns(deviceToken: string, item: Item): Promise<"sent" | "stale" | "error"> {
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
    body: JSON.stringify({ aps: { alert: { title: "Time to start", body: item.title }, sound: "default" } }),
  });
  if (res.ok) return "sent";
  if (res.status === 400 || res.status === 410) return "stale";
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

    const [{ data: webSubs }, { data: deviceTokens }, { data: profiles }, { data: tasks }, { data: events }] = await Promise.all([
      admin.from("push_subscriptions").select("*"),
      admin.from("device_push_tokens").select("*"),
      admin.from("profiles").select("id,start_reminders"),
      admin.from("tasks").select("id,user_id,title,date,start").eq("done", false).not("start", "is", null),
      admin.from("events").select("id,user_id,title,date,start").not("start", "is", null),
    ]);

    const startReminderUsers = new Set((profiles || []).filter((p) => p.start_reminders).map((p) => p.id));
    // One timezone per user — whichever subscribed device reports one first; a user
    // notifying across several devices in different zones is not a case worth handling.
    const timezoneByUser = new Map<string, string>();
    for (const s of webSubs || []) if (!timezoneByUser.has(s.user_id)) timezoneByUser.set(s.user_id, s.timezone || "UTC");
    for (const d of deviceTokens || []) if (!timezoneByUser.has(d.user_id)) timezoneByUser.set(d.user_id, d.timezone || "UTC");

    let sent = 0;
    const errors: string[] = [];
    const staleWebEndpoints: string[] = [];
    const staleDeviceTokens: string[] = [];

    // Everyone's own "now" and "today" differ by timezone, so group users by zone
    // instead of calling localParts() per item.
    const usersToCheck = [...startReminderUsers].filter((uid) => timezoneByUser.has(uid));
    for (const userId of usersToCheck) {
      const { dateISO: today, hourDecimal: now } = localParts(timezoneByUser.get(userId) || "UTC");
      const due: Item[] = [
        ...(tasks || [])
          .filter((t) => t.user_id === userId && t.date === today && now >= t.start && now < t.start + 1 / 30)
          .map((t) => ({ kind: "task" as const, id: t.id, userId, title: t.title, start: t.start })),
        ...(events || [])
          .filter((e) => e.user_id === userId && e.date === today && now >= e.start && now < e.start + 1 / 30)
          .map((e) => ({ kind: "event" as const, id: e.id, userId, title: e.title, start: e.start })),
      ];
      if (due.length === 0) continue;

      for (const item of due) {
        const { error: logError } = await admin
          .from("start_reminder_log")
          .insert({ user_id: userId, kind: item.kind, item_id: item.id, scheduled_date: today, scheduled_start: item.start });
        if (logError) {
          if (logError.code !== "23505") errors.push(`log ${item.kind} ${item.id}: ${logError.message}`);
          continue; // already notified for this exact scheduled moment (or a real error) — skip either way
        }

        const body = `${item.title} at ${formatTime(item.start)}`;
        if (webPushReady) {
          for (const sub of (webSubs || []).filter((s) => s.user_id === userId)) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
                JSON.stringify({ title: "Time to start", body, tag: "start-reminder" })
              );
              sent++;
            } catch (e) {
              const status = (e as { statusCode?: number }).statusCode;
              if (status === 404 || status === 410) staleWebEndpoints.push(sub.endpoint);
              else errors.push(`web ${sub.id}: ${String(e)}`);
            }
          }
        }
        if (apnsReady) {
          for (const dt of (deviceTokens || []).filter((d) => d.user_id === userId)) {
            try {
              const result = await sendApns(dt.token, { ...item, title: body });
              if (result === "sent") sent++;
              else if (result === "stale") staleDeviceTokens.push(dt.token);
              else errors.push(`apns ${dt.id}: request failed`);
            } catch (e) {
              errors.push(`apns ${dt.id}: ${String(e)}`);
            }
          }
        }
      }
    }

    if (staleWebEndpoints.length > 0) await admin.from("push_subscriptions").delete().in("endpoint", staleWebEndpoints);
    if (staleDeviceTokens.length > 0) await admin.from("device_push_tokens").delete().in("token", staleDeviceTokens);

    return json({ ok: true, sent, staleRemoved: staleWebEndpoints.length + staleDeviceTokens.length, errors });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
