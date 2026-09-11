// Supabase Edge Function: Twilio calls this whenever someone texts your Scaffold number.
// Looks the sender up by phone number, adds whatever they wrote as a new (undated)
// task on their account, and texts back a confirmation. Doesn't touch the calendar —
// see the note at the bottom of this file.
//
// Deploy with:
//   supabase functions deploy receive-sms --no-verify-jwt
// The --no-verify-jwt flag matters: Twilio's webhook can't send a Supabase auth header,
// so the function needs to accept unauthenticated requests. If you deploy via the
// Dashboard's "Via Editor" flow instead of the CLI, look for a "Enforce JWT verification"
// toggle on the function and turn it OFF — the code below verifies the request is
// genuinely from Twilio a different way (the X-Twilio-Signature header), so this isn't
// left wide open.
//
// Then, in the Twilio Console: Phone Numbers → Manage → Active Numbers → your number →
// under "Messaging Configuration," set "A message comes in" to a webhook, method POST,
// pointed at this function's URL (shown after you deploy it — looks like
// https://<project-ref>.supabase.co/functions/v1/receive-sms).
//
// Needs TWILIO_AUTH_TOKEN set (same secret send-sms-digest uses) — used here only to
// verify incoming requests are really from Twilio, not to send anything.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function isValidTwilioRequest(url: string, params: Record<string, string>, signature: string | null): Promise<boolean> {
  if (!signature || !TWILIO_AUTH_TOKEN) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) data += key + params[key];
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(TWILIO_AUTH_TOKEN), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === signature;
}

function twiml(message: string) {
  const escaped = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return twiml("Scaffold isn't fully set up yet — missing Supabase config.");

    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) params[key] = String(value);

    const signature = req.headers.get("X-Twilio-Signature");
    const valid = await isValidTwilioRequest(req.url, params, signature);
    if (!valid) return new Response("Invalid signature", { status: 403 });

    const from = params["From"];
    const body = (params["Body"] || "").trim();
    if (!from) return twiml("Couldn't tell who this was from.");
    if (!body) return twiml("Text me what you want added and I'll put it on your list.");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile, error: profileErr } = await admin.from("profiles").select("id").eq("phone_number", from).maybeSingle();
    if (profileErr) return twiml("Something went wrong looking up your account.");
    if (!profile) return twiml("This number isn't linked to a Scaffold account — add it in Settings first.");

    const { error: insertErr } = await admin.from("tasks").insert({ user_id: profile.id, title: body, category: "Personal" });
    if (insertErr) return twiml("Couldn't add that — try again in a bit.");

    return twiml(`Added "${body}" to your tasks.`);
  } catch (e) {
    return twiml(`Something went wrong: ${String(e)}`);
  }
});

// Not built: turning a text into a calendar EVENT (with a specific date/time) rather
// than an undated task. Every text becomes a task landing in Today — genuinely parsing
// "lunch with Sam Friday at noon" into a scheduled event would need its own date/time
// extraction step, which is a real follow-up, not something quietly skipped here.
