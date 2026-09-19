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
//   Page #F0F0F0 (the gray behind the card, not the card itself) · Card #FFFFFF · Surface #FAFAF9
//   Ink Black #1A1A2E · Muted Gray #6B7280/#4B5563 · Border Light #ECECEC
//   Blue-Purple Main #8290D8 (primary accent) · Coral Main #FF9286 (secondary accent)
//   Instrument Serif = headings/titles · Inter = everything else
//
// Redesigned to match a reference mockup the user provided directly (a white card
// floating on a gray page, each step showing a time estimate and a breadcrumb for where
// in the app it happens) — no email template exists in the connected Figma file for
// this exact layout, so the mockup itself is the source of truth here, not a token.
const SANS = "'Inter', -apple-system, sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";
const INK = "#1A1A2E";
const MUTED = "#4B5563";
const SUBTLE = "#6B7280";
const STEP_BG = "#FAFAF9";
const STEP_BORDER = "#ECECEC";
const PURPLE = "#8290D8";
const CORAL = "#FF9286";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// Each step: a "0N / CATEGORY" label (alternating the two brand accents) opposite a
// small time-estimate pill, a serif title, a small gray breadcrumb for exactly where in
// the app this happens, and one description line. No icons — an emoji glyph for each
// category (gear/calendar/etc.) would've been the obvious way to mark the breadcrumb,
// but this app's emails stay emoji-free on purpose, so a plain accent-colored dot marks
// it instead, same convention the daily agenda email already uses for its schedule rows.
function step(n: string, category: string, minutes: number, title: string, breadcrumb: string, detail: string, accent: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${STEP_BG}; border:1px solid ${STEP_BORDER}; border-radius:14px; margin-bottom:14px;">
      <tr>
        <td style="padding:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
            <tr>
              <td style="font-family:${SANS}; font-weight:700; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:${accent};">${n} / ${escapeHtml(category)}</td>
              <td align="right">
                <span style="display:inline-block; font-family:${SANS}; font-size:11px; font-weight:600; color:${SUBTLE}; background:#F3F3F1; border:1px solid ${STEP_BORDER}; border-radius:999px; padding:3px 10px;">${minutes} min</span>
              </td>
            </tr>
          </table>
          <div style="font-family:${SERIF}; font-weight:400; font-size:21px; color:${INK}; margin-bottom:8px;">${escapeHtml(title)}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;"><tr>
            <td width="12" valign="middle"><div style="width:5px; height:5px; border-radius:50%; background:${accent};"></div></td>
            <td valign="middle" style="font-family:${SANS}; font-weight:700; font-size:10.5px; letter-spacing:0.04em; text-transform:uppercase; color:${SUBTLE};">${escapeHtml(breadcrumb)}</td>
          </tr></table>
          <div style="font-family:${SANS}; font-weight:400; font-size:13.5px; color:${MUTED}; line-height:1.5;">${escapeHtml(detail)}</div>
        </td>
      </tr>
    </table>`;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const email = payload.email;
    if (!email) return new Response(JSON.stringify({ error: "missing email" }), { status: 400 });
    if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Getting set up in Scaffold</title>
<style>body { margin:0; padding:0; background:#F0F0F0; }</style>
</head>
<body style="margin:0; padding:0; background:#F0F0F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0F0F0;" bgcolor="#F0F0F0">
    <tr>
      <td align="center" style="background:#F0F0F0; padding:32px 16px;" bgcolor="#F0F0F0">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; width:100%; background:#FFFFFF; border-radius:20px;" bgcolor="#FFFFFF">
          <tr>
            <td style="font-family:${SANS}; padding:36px 32px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid ${STEP_BORDER}; margin-bottom:24px;">
                <tr>
                  <td style="padding-bottom:16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td width="16" valign="middle"><div style="width:8px; height:8px; border-radius:50%; background:${CORAL};"></div></td>
                      <td valign="middle" style="font-family:${SERIF}; font-style:italic; font-size:20px; color:${INK};">Scaffold</td>
                    </tr></table>
                  </td>
                  <td align="right" valign="middle" style="padding-bottom:16px; font-family:${SANS}; font-size:10.5px; font-weight:700; color:${SUBTLE}; letter-spacing:0.5px; white-space:nowrap;">ONBOARDING SERIES &bull; 01</td>
                </tr>
              </table>

              <div style="font-family:${SERIF}; font-size:34px; color:${INK}; margin-bottom:24px;">Getting set up.</div>

              ${step("01", "CATEGORIES", 2, "Change your colors", "Settings > Categories",
                "Scaffold works best when it matches your vibe. Head over to settings and pick calm, comfortable colors for your five core buckets: School, Personal, Health, Social, and Extracurriculars.", PURPLE)}
              ${step("02", "CALENDAR", 5, "Put in your schedule", "Calendar > Any day",
                "Add your fixed events for the next two weeks. Classes, practice, work, family dinners — whatever has a set time. Don't worry about minor tasks yet. Just give yourself a solid anchor.", CORAL)}
              ${step("03", "CAPTURE", 1, "Do a quick brain dump", "Dashboard > Brain Dump",
                "Get everything out of your head. Type out your current assignments, random errands, and reminders one line at a time. No organization, no dates, no sorting. We'll clean it up later.", PURPLE)}
              ${step("04", "TARGET", 1, "Add a single goal", "Goals > New Goal",
                "Choose one meaningful milestone you want to reach. Add an end date. Once you enter it, Scaffold will automatically break it down into tiny, low-stress milestones and daily steps.", CORAL)}

              <div style="border-top:1px solid ${STEP_BORDER}; margin:10px 0 24px;"></div>

              <div style="text-align:center; font-family:${SERIF}; font-size:26px; color:${INK}; margin-bottom:10px;">You are ready.</div>
              <div style="text-align:center; font-family:${SANS}; font-size:13.5px; color:${MUTED}; line-height:1.5; margin-bottom:24px;">That is the whole plan. Scaffold is built around your natural pace. Take a breath — we have got you covered.</div>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;"><tr>
                <td align="center" style="background:${PURPLE}; border-radius:10px;">
                  <a href="https://usescaffold.app" style="display:inline-block; font-family:${SANS}; font-weight:700; font-size:14px; color:#FFFFFF; text-decoration:none; padding:13px 28px;">Go to my Dashboard</a>
                </td>
              </tr></table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${STEP_BORDER}; padding-top:16px;">
                <tr>
                  <td style="font-family:${SANS}; font-size:11px; color:${SUBTLE};">Sent automatically by Scaffold &bull; Unsubscribe</td>
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
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: email, subject: "Getting set up in Scaffold", html }),
    });

    if (!res.ok) return new Response(JSON.stringify({ error: await res.text() }), { status: 502 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
