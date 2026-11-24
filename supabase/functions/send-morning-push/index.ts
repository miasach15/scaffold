// Supabase Edge Function: once a day, at a local hour the user picks, pushes a short
// "here's today" summary to their phone/desktop — the push equivalent of
// send-daily-agenda's email, for anyone who wants it on-device instead of (or as well
// as) in their inbox. Reuses the same push_subscriptions/device_push_tokens tables and
// the same VAPID/APNs secrets send-whatnow-push already uses.
//
// Deploy with:  supabase functions deploy send-morning-push
// Requires the same secrets as send-whatnow-push (see that function's header comment)
// plus migration_morning_push.sql run first. Scheduled every 15 minutes by
// migration_morning_push_cron.sql — each user only ever gets sent once per local
// calendar day, enforced by comparing today's date against profiles.morning_push_last_sent
// (set right after a successful send).

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

type Item = { title: string; start: number | null };

function localParts(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value])) as Record<string, string>;
  let hour = Number(p.hour);
  if (hour === 24) hour = 0;
  return { dateISO: `${p.year}-${p.month}-${p.day}`, hour };
}

function formatTime(decimal: number) {
  const h24 = Math.floor(decimal);
  const m = Math.round((decimal - h24) * 60);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Same "carry it forward, don't let it go quiet" scope as send-whatnow-push's
// itemsForUser — overdue-but-still-open items count as part of today, same as the
// in-app Today list. `doneEduIds` keeps a leftover Education work-session row (its
// assignment already marked done, but the session itself never individually checked
// off) from getting summarized every morning forever — see send-whatnow-push's
// itemsForUser for the full story.
function itemsForUser(userId: string, today: string, tasks: any[], eduItems: any[], goalActions: any[], events: any[], doneEduIds: Set<string>): Item[] {
  return [
    ...tasks.filter((t) => t.user_id === userId && t.date && t.date <= today && (!t.edu_id || !doneEduIds.has(t.edu_id)))
      .map((t) => ({ title: t.title, start: t.date === today ? t.start : null })),
    ...eduItems.filter((e) => e.user_id === userId && !e.done && e.due_date && e.due_date <= today)
      .map((e) => ({ title: `${e.title} (${e.type})`, start: null })),
    ...goalActions.filter((a) => a.user_id === userId && a.due_date && a.due_date <= today && !a.done)
      .map((a) => ({ title: a.title, start: null })),
    ...events.filter((ev) => ev.user_id === userId && ev.date === today)
      .map((ev) => ({ title: ev.title, start: ev.start })),
  ];
}

function buildMessage(items: Item[]): { title: string; body: string } | null {
  if (items.length === 0) return { title: "Good morning", body: "Nothing on the calendar today." };
  const timed = items.filter((it) => it.start != null).sort((a, b) => a.start! - b.start!);
  const first = timed[0] || items[0];
  const countLabel = `${items.length} thing${items.length === 1 ? "" : "s"} today`;
  const headline = timed[0] ? `${first.title} at ${formatTime(first.start!)}` : `First up: ${first.title}`;
  return { title: "Good morning", body: items.length === 1 ? headline : `${countLabel} — ${headline}` };
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

async function sendApns(deviceToken: string, msg: { title: string; body: string }): Promise<"sent" | "stale" | "error"> {
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
    body: JSON.stringify({ aps: { alert: { title: msg.title, body: msg.body }, sound: "default" } }),
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

    const [{ data: webSubs }, { data: deviceTokens }, { data: profiles }, { data: tasks }, { data: eduItems }, { data: goalActions }, { data: events }] = await Promise.all([
      admin.from("push_subscriptions").select("*"),
      admin.from("device_push_tokens").select("*"),
      admin.from("profiles").select("id,morning_push,morning_push_hour,morning_push_last_sent"),
      admin.from("tasks").select("user_id,title,date,start,edu_id").eq("done", false),
      admin.from("edu_items").select("id,user_id,title,type,due_date,done"),
      admin.from("goal_actions").select("user_id,title,due_date,done"),
      admin.from("events").select("user_id,title,date,start"),
    ]);

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const doneEduIds = new Set((eduItems || []).filter((e) => e.done).map((e) => e.id));
    // One timezone per user — whichever subscribed device reports one first; a user
    // notifying across several devices in different zones is not a case worth handling.
    const timezoneByUser = new Map<string, string>();
    for (const s of webSubs || []) if (!timezoneByUser.has(s.user_id)) timezoneByUser.set(s.user_id, s.timezone || "UTC");
    for (const d of deviceTokens || []) if (!timezoneByUser.has(d.user_id)) timezoneByUser.set(d.user_id, d.timezone || "UTC");

    let sent = 0;
    const errors: string[] = [];
    const staleWebEndpoints: string[] = [];
    const staleDeviceTokens: string[] = [];

    const dueUsers = [...timezoneByUser.keys()].filter((uid) => {
      const profile = profileById.get(uid);
      if (!profile || !profile.morning_push) return false;
      const { dateISO: today, hour } = localParts(timezoneByUser.get(uid) || "UTC");
      if (today === profile.morning_push_last_sent) return false;
      return hour >= (profile.morning_push_hour ?? 7);
    });

    for (const userId of dueUsers) {
      const { dateISO: today } = localParts(timezoneByUser.get(userId) || "UTC");
      const items = itemsForUser(userId, today, tasks || [], eduItems || [], goalActions || [], events || [], doneEduIds);
      const msg = buildMessage(items);
      if (!msg) continue;

      let anySent = false;
      if (webPushReady) {
        for (const sub of (webSubs || []).filter((s) => s.user_id === userId)) {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, JSON.stringify({ ...msg, tag: "morning-push" }));
            sent++; anySent = true;
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
            const result = await sendApns(dt.token, msg);
            if (result === "sent") { sent++; anySent = true; }
            else if (result === "stale") staleDeviceTokens.push(dt.token);
            else errors.push(`apns ${dt.id}: request failed`);
          } catch (e) {
            errors.push(`apns ${dt.id}: ${String(e)}`);
          }
        }
      }

      if (anySent) await admin.from("profiles").update({ morning_push_last_sent: today }).eq("id", userId);
    }

    if (staleWebEndpoints.length > 0) await admin.from("push_subscriptions").delete().in("endpoint", staleWebEndpoints);
    if (staleDeviceTokens.length > 0) await admin.from("device_push_tokens").delete().in("token", staleDeviceTokens);

    return json({ ok: true, sent, errors });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
