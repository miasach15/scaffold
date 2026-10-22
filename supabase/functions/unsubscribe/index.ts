// Supabase Edge Function: the destination of the "Unsubscribe" link/button in every
// automated email (welcome, getting-started, daily agenda). Public and unauthenticated
// on purpose — whoever clicks it is reading their own email, not signed into the app in
// that moment — so instead of trusting a client-supplied user id, the link carries an
// HMAC signature (see signToken below) that only a server holding UNSUB_SECRET could
// have produced, checked against the SAME secret here before anything is written.
//
// Handles both:
//   GET  — someone clicking the plain-text link in the email body; shows a small
//          confirmation page.
//   POST — Gmail/Outlook's native one-click "Unsubscribe" button next to the sender
//          name (RFC 8058's List-Unsubscribe-Post), which POSTs here directly with no
//          page shown at all. Same effect, just no HTML response needed.
//
// Deploy with:  supabase functions deploy unsubscribe --no-verify-jwt
// The --no-verify-jwt flag matters: this is reached straight from an email client, which
// can't send a Supabase auth header. The signature check above is what keeps this from
// being "anyone can unsubscribe anyone" despite being open like that.
//
// Needs UNSUB_SECRET set — supabase secrets set UNSUB_SECRET=<any long random string> —
// the SAME secret used when each sender function signs a link for this (see
// unsubscribeLink in send-welcome-email/send-getting-started-email/send-daily-agenda).
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UNSUB_SECRET = Deno.env.get("UNSUB_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function signToken(uid: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(UNSUB_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(uid));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const SANS = "'Inter', -apple-system, sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";

function page(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0; padding:0; background:#F0F0F0; font-family:${SANS};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0F0F0;">
    <tr><td align="center" style="padding:48px 16px;">
      <table role="presentation" width="420" cellpadding="0" cellspacing="0" border="0" style="max-width:420px; width:100%; background:#FFFFFF; border-radius:20px;">
        <tr><td style="padding:36px 32px; text-align:center;">
          <div style="font-family:${SERIF}; font-style:italic; font-size:18px; color:#1A1A2E; margin-bottom:20px;">Scaffold</div>
          ${body}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  const sig = url.searchParams.get("sig");

  if (!uid || !sig || !UNSUB_SECRET) {
    const body = `<div style="font-family:${SERIF}; font-size:22px; color:#1A1A2E; margin-bottom:8px;">That link isn't valid.</div><div style="font-size:13.5px; color:#6B7280;">Missing or incomplete — try the link from the email again.</div>`;
    return req.method === "POST"
      ? new Response(JSON.stringify({ error: "invalid link" }), { status: 400, headers: corsHeaders })
      : new Response(page("Unsubscribe", body), { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html" } });
  }

  const expected = await signToken(uid);
  if (expected !== sig) {
    const body = `<div style="font-family:${SERIF}; font-size:22px; color:#1A1A2E; margin-bottom:8px;">That link isn't valid.</div><div style="font-size:13.5px; color:#6B7280;">The signature doesn't match — try the link from the email again.</div>`;
    return req.method === "POST"
      ? new Response(JSON.stringify({ error: "bad signature" }), { status: 403, headers: corsHeaders })
      : new Response(page("Unsubscribe", body), { status: 403, headers: { ...corsHeaders, "Content-Type": "text/html" } });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await admin.from("profiles").update({ email_opt_out: true }).eq("id", uid);

  if (req.method === "POST") {
    // One-click unsubscribe (RFC 8058) — Gmail/Outlook expect a plain success response,
    // never a page.
    return new Response(null, { status: error ? 500 : 200, headers: corsHeaders });
  }

  const body = error
    ? `<div style="font-family:${SERIF}; font-size:22px; color:#1A1A2E; margin-bottom:8px;">Something went wrong.</div><div style="font-size:13.5px; color:#6B7280;">Try the link again in a minute.</div>`
    : `<div style="font-family:${SERIF}; font-size:22px; color:#1A1A2E; margin-bottom:8px;">You're unsubscribed.</div><div style="font-size:13.5px; color:#6B7280; line-height:1.5;">No more automated emails from Scaffold — welcome, getting-started, or your daily agenda. You can still use the app as normal.</div>`;
  return new Response(page("Unsubscribed", body), { status: error ? 500 : 200, headers: { ...corsHeaders, "Content-Type": "text/html" } });
});
