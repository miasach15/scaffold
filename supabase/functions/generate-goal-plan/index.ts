// Supabase Edge Function: breaks a free-text goal description into milestones
// and small actions using Claude, returned as structured JSON.
//
// Deploy with:  supabase functions deploy generate-goal-plan
// Requires an ANTHROPIC_API_KEY secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    milestones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "actions"],
        additionalProperties: false,
      },
    },
  },
  required: ["milestones"],
  additionalProperties: false,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { outcome, category } = await req.json();
    if (!outcome || !outcome.trim()) {
      return new Response(JSON.stringify({ error: "missing outcome" }), { status: 400, headers: corsHeaders });
    }
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500, headers: corsHeaders });
    }

    const prompt = `The user wants to achieve this outcome: "${outcome.trim()}"${category ? ` (category: ${category})` : ""}.

Break this into 3-5 concrete milestones that build toward the outcome in order. For each milestone, give 2-3 next actions — things that could go on a to-do list, not vague advice. Fewer, bigger actions beat many small ones here.

HARD FLOOR: every action must represent at least 45 minutes of real, substantial focused work by itself — most should land closer to 1-1.5 hours. This is a strict minimum, not a suggestion. Before finalizing each action, sanity-check it: "could a person plausibly spend 45+ minutes doing just this?" If the honest answer is no — if it's something you'd actually finish in 5-15 minutes — it is too small and must be merged into a bigger, adjacent piece of work, not listed on its own. Concretely too-small on their own: "check email", "look something up", "make a list", "read the instructions", "send a message", "set a reminder", "pick a date". Fold every one of those into whichever real chunk of work they support instead of giving them their own line.

Titles matter a lot here because they get shown as small chips on a calendar, so keep them short:
- Milestone titles: max ~6 words.
- Action titles: max ~4-5 words (aim under 30 characters). Lead with a verb (e.g. "Book flights", "Email advisor", "Draft outline") — no filler words like "consider" or "try to", no sub-clauses, no trailing detail after a comma or "for"/"about". If the full idea needs more words, cut it down to the core verb + object and drop the rest. A short title is still fine even though the underlying action is a big chunk of work — the title doesn't need to describe every sub-step, just the headline.`;

    // Anthropic's API occasionally returns a transient overloaded_error / 429 —
    // retry a couple times with backoff before giving up.
    let res: Response | null = null;
    let lastErrText = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-opus-5",
          max_tokens: 2000,
          output_config: {
            effort: "medium",
            format: { type: "json_schema", schema: PLAN_SCHEMA },
          },
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) break;

      lastErrText = await res.text();
      const retryable = res.status === 429 || res.status === 529 || lastErrText.includes("overloaded_error");
      if (!retryable || attempt === 2) break;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1) * (attempt + 1))); // 600ms, 2400ms
    }

    if (!res || !res.ok) {
      const friendly = lastErrText.includes("overloaded_error")
        ? "Claude is a bit overloaded right now — try again in a few seconds."
        : lastErrText;
      return new Response(JSON.stringify({ error: friendly }), { status: 502, headers: corsHeaders });
    }

    const data = await res.json();

    if (data.stop_reason === "refusal") {
      return new Response(JSON.stringify({ error: "The request was declined. Try rephrasing the outcome." }), { status: 422, headers: corsHeaders });
    }

    const textBlock = (data.content || []).find((b: { type: string }) => b.type === "text");
    if (!textBlock) {
      return new Response(JSON.stringify({ error: "no plan returned" }), { status: 502, headers: corsHeaders });
    }

    const plan = JSON.parse(textBlock.text);
    return new Response(JSON.stringify(plan), { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
