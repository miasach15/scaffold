// Supabase Edge Function: sends a custom "Welcome to Scaffold" email via SendGrid.
// Triggered by the DB trigger in migration_welcome_email_trigger.sql whenever a
// new row is inserted into auth.users (i.e. someone signs up).
//
// Deploy with:  supabase functions deploy send-welcome-email
// Requires two secrets:
//   supabase secrets set SENDGRID_API_KEY=SG.xxx
//   supabase secrets set SENDGRID_FROM_EMAIL="Scaffold <you@yourdomain.com>"
// Unlike Resend, SendGrid has no shared sandbox sender — SENDGRID_FROM_EMAIL must be an
// address you've verified in SendGrid first (Settings → Sender Authentication → either
// verify a single sender address, or authenticate a whole domain). Sending will fail
// with a 403 until that's done.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL_RAW = Deno.env.get("SENDGRID_FROM_EMAIL") || Deno.env.get("WELCOME_FROM_EMAIL") || "";

// SendGrid wants `from` as a {email, name} object, not the combined "Name <email>"
// string Resend accepted directly — this pulls the two apart. Falls back to treating
// the whole value as the email if there's no "<...>" wrapper.
function parseFromAddress(raw: string): { email: string; name?: string } {
  const m = raw.match(/^(.*)<(.+)>\s*$/);
  if (m) {
    const name = m[1].trim();
    return { email: m[2].trim(), name: name || undefined };
  }
  return { email: raw.trim() };
}

async function sendViaSendGrid(to: string, subject: string, html: string) {
  return fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: parseFromAddress(FROM_EMAIL_RAW),
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const email = payload.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "missing email" }), { status: 400 });
    }
    if (!SENDGRID_API_KEY) {
      return new Response(JSON.stringify({ error: "SENDGRID_API_KEY not set" }), { status: 500 });
    }
    if (!FROM_EMAIL_RAW) {
      return new Response(JSON.stringify({ error: "SENDGRID_FROM_EMAIL not set" }), { status: 500 });
    }

    const html = `
      <div style="font-family: -apple-system, 'IBM Plex Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #FAFAFA;">
        <div style="font-family: Georgia, 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #000000; margin-bottom: 6px;">Scaffold</div>
        <p style="font-size: 15px; color: #2A2A2A; line-height: 1.5;">Welcome. Your calendar, tasks, goals, habits, and journal, all in one quiet place.</p>
        <p style="font-size: 14px; color: #5A6472; line-height: 1.5;">Once you confirm your email and sign in, a quick tour will walk you through every page.</p>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px;">You're getting this because you signed up at Scaffold.</p>
      </div>
    `;

    // SendGrid returns 202 Accepted with an empty body on success (no JSON, unlike
    // Resend) — res.ok already covers that, so the only thing worth reading back out
    // is the error body on a non-2xx response.
    const res = await sendViaSendGrid(email, "Welcome to Scaffold", html);

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: errText }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
