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

// Brand kit values (Figma "Brand & Identity" section — color palette + typography specs):
//   Background #FDFCFB · Surface #FAFAF9 · Ink Black #1A1A2E · Muted Gray #6B7280/#4B5563
//   Border Light #D9D3E6 · Blue-Purple Main #8290D8 (primary accent) · Coral Main #FF9286 (secondary accent)
//   Instrument Serif = headings/titles · Inter = everything else
//
// Each step is its own card: a small coral "STEP 0N" label, an Instrument Serif title, then
// two lines of body copy — a bold one-line "do this" action, then a lighter "why/what happens"
// detail line. Two short chunks read faster than one long paragraph, which is the point: this
// is meant to be skimmable in a few seconds per step, not read like a manual.
function step(n: string, title: string, action: string, detail: string) {
  return `
    <div style="background:#FAFAF9; border:1px solid #D9D3E6; border-radius:14px; padding:20px; margin-bottom:14px;">
      <div style="font-family:'Inter', -apple-system, sans-serif; font-weight:700; font-size:12px; letter-spacing:0.06em; text-transform:uppercase; color:#FF9286; margin-bottom:8px;">Step ${n}</div>
      <div style="font-family:'Instrument Serif', Georgia, serif; font-weight:400; font-size:24px; color:#1A1A2E; margin-bottom:8px;">${title}</div>
      <div style="font-family:'Inter', -apple-system, sans-serif; font-weight:600; font-size:14px; color:#1A1A2E; margin-bottom:4px; line-height:1.4;">${action}</div>
      <div style="font-family:'Inter', -apple-system, sans-serif; font-weight:400; font-size:13.5px; color:#4B5563; line-height:1.5;">${detail}</div>
    </div>`;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const email = payload.email;
    if (!email) return new Response(JSON.stringify({ error: "missing email" }), { status: 400 });
    if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });

    const html = `
      <div style="font-family: 'Inter', -apple-system, 'Helvetica Neue', sans-serif; max-width: 480px; margin: 0 auto; padding: 36px 24px; background: #FDFCFB;">
        <div style="font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: 32px; color: #8290D8; margin-bottom: 6px;">Scaffold</div>
        <div style="font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; font-size: 18px; color: #4B5563; margin-bottom: 14px;">Getting set up</div>
        <p style="font-size: 14px; color: #4B5563; line-height: 1.5; margin: 0 0 24px;">Four steps, in order. Do them one at a time — each one only takes a couple minutes, and the app is actually ready for you after, not just installed.</p>
        ${step(
          "01",
          "Change your colors",
          "Settings → Categories → tap a swatch on each one.",
          "School, Personal, Health, Social, and Extracurriculars are already set up — just pick colors that feel calm to look at, not stressful. You'll see these everywhere, so go with whatever's easiest on your eyes."
        )}
        ${step(
          "02",
          "Put in your schedule",
          "Calendar → tap any day → add what's already set for the next 2 weeks.",
          "Classes, practice, appointments — the stuff that's already decided, not stuff you're still planning. This part usually takes about 5 minutes and saves you from re-adding the same things later."
        )}
        ${step(
          "03",
          "Brain dump",
          "Dashboard → Brain Dump button → list anything else floating around.",
          "Assignments, errands, things you don't want to forget — one line each, no sorting or prioritizing needed right now. Just get it out of your head; you can turn any line into a real task later."
        )}
        ${step(
          "04",
          "Add a goal",
          "Goals page → New Goal → give it an end date.",
          "Something bigger than a quick errand — an application, a big project, a class you're working toward. Once it has a deadline, Scaffold breaks it into milestones and steps for you automatically."
        )}
        <p style="font-size: 12px; color: #6B7280; margin-top: 24px; line-height: 1.5;">That's it — everything else in Scaffold builds on those four. Take them one at a time; there's no rush.</p>
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
