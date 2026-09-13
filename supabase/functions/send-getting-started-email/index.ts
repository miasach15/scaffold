// Supabase Edge Function: sends a "here's how to set up Scaffold" email — 4 concrete
// steps (colors, calendar, brain dump, a goal), same order as the in-app post-tour
// setup flow (src/components/nav/SetupOverlay.jsx). Not cron-scheduled — this is a
// one-time send you trigger yourself (see the deploy comment below for how), not
// something that runs automatically on signup like send-welcome-email does.
//
// Deploy with:  supabase functions deploy send-getting-started-email
// Uses the same RESEND_API_KEY secret already set for send-welcome-email.
//
// To send it: POST to the function URL with a JSON body { "email": "you@example.com" }.
// From the Supabase Dashboard: Edge Functions → send-getting-started-email → there's an
// "Invoke"/testing panel where you can paste that JSON body directly, no terminal
// needed. Or from a terminal:
//   curl -X POST https://qxxamolmtdrwimosclur.supabase.co/functions/v1/send-getting-started-email \
//     -H "Content-Type: application/json" \
//     -H "Authorization: Bearer <anon/publishable key>" \
//     -d '{"email":"miasachdev15@gmail.com"}'

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("WELCOME_FROM_EMAIL") || "Scaffold <onboarding@resend.dev>";

function step(n: number, title: string, body: string) {
  return `
    <div style="display:flex; gap:14px; padding:14px 0; border-top:1px solid #ECECEC;">
      <div style="flex-shrink:0; width:28px; height:28px; border-radius:50%; background:#F1F0FB; color:#4A5BA8; font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center;">${n}</div>
      <div>
        <div style="font-size:14.5px; font-weight:700; color:#1A1A2E; margin-bottom:2px;">${title}</div>
        <div style="font-size:13.5px; color:#5A6472; line-height:1.5;">${body}</div>
      </div>
    </div>`;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const email = payload.email;
    if (!email) return new Response(JSON.stringify({ error: "missing email" }), { status: 400 });
    if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });

    const html = `
      <div style="font-family: -apple-system, 'IBM Plex Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #FAFAFA;">
        <div style="font-family: Georgia, 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #1A1A2E; margin-bottom: 6px;">Scaffold</div>
        <p style="font-size: 15px; color: #2A2A2A; line-height: 1.5; margin-top:0;">Four things, in order, and the app is actually set up for you — not just installed.</p>
        <div style="background:#fff; border-radius:14px; padding: 4px 18px; margin-top: 12px;">
          ${step(1, "Change your colors", "Settings → pick colors for your categories. Whatever's calm to look at — no wrong answer.")}
          ${step(2, "Put in your schedule", "Add what's already set for the next two weeks — classes, practice, appointments. Click any day on the Calendar to add one.")}
          ${step(3, "Brain dump", "List anything else coming up — assignments, errands, whatever's floating around. One line each; sort it out later. There's a Brain Dump button right on the Dashboard.")}
          ${step(4, "Add a goal", "The big stuff — not a quick errand. Give it an end date on the Goals page and Scaffold builds the milestones and steps around it for you.")}
        </div>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 28px;">That's it — everything else in the app builds on those four.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: email, subject: "Getting set up in Scaffold", html }),
    });

    if (!res.ok) return new Response(JSON.stringify({ error: await res.text() }), { status: 502 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
