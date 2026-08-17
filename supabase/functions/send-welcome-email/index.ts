// Supabase Edge Function: sends a custom "Welcome to Scaffold" email via Resend.
// Triggered by the DB trigger in migration_welcome_email_trigger.sql whenever a
// new row is inserted into auth.users (i.e. someone signs up).
//
// Deploy with:  supabase functions deploy send-welcome-email
// Requires a RESEND_API_KEY secret:  supabase secrets set RESEND_API_KEY=re_xxx

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Resend lets you send from onboarding@resend.dev with no setup while testing.
// Once you verify your own domain in Resend, change this to e.g. "Scaffold <hello@yourdomain.com>".
const FROM_EMAIL = Deno.env.get("WELCOME_FROM_EMAIL") || "Scaffold <onboarding@resend.dev>";

serve(async (req) => {
  try {
    const payload = await req.json();
    const email = payload.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "missing email" }), { status: 400 });
    }
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
    }

    const html = `
      <div style="font-family: -apple-system, 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #FAFAFA;">
        <div style="font-family: Georgia, 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #000000; margin-bottom: 6px;">Scaffold</div>
        <p style="font-size: 15px; color: #2A2A2A; line-height: 1.5;">Welcome — your calendar, tasks, goals, habits, and journal, all in one quiet place.</p>
        <p style="font-size: 14px; color: #5A6472; line-height: 1.5;">Once you confirm your email and sign in, a quick tour will walk you through every page.</p>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px;">You're getting this because you signed up at Scaffold.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: email, subject: "Welcome to Scaffold", html }),
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
