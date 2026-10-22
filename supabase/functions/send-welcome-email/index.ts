// Supabase Edge Function: sends a custom "Welcome to Scaffold" email via Resend.
// Triggered by the DB trigger in migration_welcome_email_trigger.sql whenever a
// new row is inserted into auth.users (i.e. someone signs up).
//
// Deploy with:  supabase functions deploy send-welcome-email
// Requires a RESEND_API_KEY secret:  supabase secrets set RESEND_API_KEY=re_xxx
// Also needs UNSUB_SECRET set (same secret the unsubscribe function checks against) —
// supabase secrets set UNSUB_SECRET=<any long random string>
//
// Same visual language as send-getting-started-email and send-daily-agenda: gray page
// behind a white rounded card, dot + italic-serif "Scaffold" wordmark opposite a small
// eyebrow label, a big serif headline. Now carries a real "Unsubscribe" link in the
// footer (see supabase/functions/unsubscribe) plus the List-Unsubscribe/
// List-Unsubscribe-Post headers, which is what actually gets Gmail/Outlook to show
// their own native one-click unsubscribe button next to the sender.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Resend lets you send from onboarding@resend.dev with no setup while testing.
// Once you verify your own domain in Resend, change this to e.g. "Scaffold <hello@yourdomain.com>".
const FROM_EMAIL = Deno.env.get("WELCOME_FROM_EMAIL") || "Scaffold <onboarding@resend.dev>";
const UNSUB_SECRET = Deno.env.get("UNSUB_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Duplicated identically in send-getting-started-email, send-daily-agenda, and verified
// the same way in supabase/functions/unsubscribe — a Deno edge function can't import
// from a sibling function, so this stays small and copy-pasted rather than factored out.
async function signToken(uid: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(UNSUB_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(uid));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function unsubscribeLink(uid: string): Promise<string> {
  return `${SUPABASE_URL}/functions/v1/unsubscribe?uid=${encodeURIComponent(uid)}&sig=${await signToken(uid)}`;
}

const SANS = "'Inter', -apple-system, sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";
const INK = "#1A1A2E";
const MUTED = "#4B5563";
const SUBTLE = "#6B7280";
const CARD_BG = "#FAFAF9";
const BORDER = "#ECECEC";
const PURPLE = "#8290D8";
const CORAL = "#FF9286";

serve(async (req) => {
  try {
    const payload = await req.json();
    const email = payload.email;
    const uid = payload.uid;
    if (!email) {
      return new Response(JSON.stringify({ error: "missing email" }), { status: 400 });
    }
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
    }

    // uid is optional (manual test sends via curl might not pass one) — skip the
    // opt-out check and unsubscribe link in that case rather than failing the send.
    let unsubUrl: string | null = null;
    if (uid) {
      if (SERVICE_ROLE_KEY) {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: profile } = await admin.from("profiles").select("email_opt_out").eq("id", uid).maybeSingle();
        if (profile?.email_opt_out) {
          return new Response(JSON.stringify({ ok: true, skipped: "opted out" }), { status: 200 });
        }
      }
      if (UNSUB_SECRET) unsubUrl = await unsubscribeLink(uid);
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Scaffold</title>
<style>body { margin:0; padding:0; background:#F0F0F0; }</style>
</head>
<body style="margin:0; padding:0; background:#F0F0F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0F0F0;" bgcolor="#F0F0F0">
    <tr>
      <td align="center" style="background:#F0F0F0; padding:32px 16px;" bgcolor="#F0F0F0">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; width:100%; background:#FFFFFF; border-radius:20px;" bgcolor="#FFFFFF">
          <tr>
            <td style="font-family:${SANS}; padding:36px 32px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid ${BORDER}; margin-bottom:24px;">
                <tr>
                  <td style="padding-bottom:16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td width="16" valign="middle"><div style="width:8px; height:8px; border-radius:50%; background:${CORAL};"></div></td>
                      <td valign="middle" style="font-family:${SERIF}; font-style:italic; font-size:20px; color:${INK};">Scaffold</td>
                    </tr></table>
                  </td>
                  <td align="right" valign="middle" style="padding-bottom:16px; font-family:${SANS}; font-size:10.5px; font-weight:700; color:${SUBTLE}; letter-spacing:0.5px; white-space:nowrap;">WELCOME</td>
                </tr>
              </table>

              <div style="font-family:${SERIF}; font-size:34px; color:${INK}; margin-bottom:24px;">Welcome.</div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CARD_BG}; border:1px solid ${BORDER}; border-radius:14px; margin-bottom:28px;">
                <tr><td style="padding:20px;">
                  <div style="font-family:${SERIF}; font-size:19px; color:${INK}; line-height:1.35; margin-bottom:8px;">Your calendar, tasks, goals, habits, and journal — all in one quiet place.</div>
                  <div style="font-family:${SANS}; font-size:13.5px; color:${MUTED}; line-height:1.5;">Once you confirm your email and sign in, a quick tour will walk you through every page.</div>
                </td></tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BORDER}; padding-top:16px;">
                <tr>
                  <td style="font-family:${SANS}; font-size:11px; color:${SUBTLE};">
                    Sent automatically by Scaffold${unsubUrl ? ` · <a href="${unsubUrl}" style="color:${SUBTLE};">Unsubscribe</a>` : ""}
                  </td>
                  <td align="right"><div style="width:14px; height:14px; border-radius:4px; background:${PURPLE};"></div></td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL, to: email, subject: "Welcome to Scaffold", html,
        // Gets Gmail/Outlook to show their own native one-click unsubscribe button
        // next to the sender — belt-and-suspenders with the link in the footer above.
        ...(unsubUrl ? { headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: errText }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
