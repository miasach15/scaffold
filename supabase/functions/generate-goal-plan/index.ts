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

Break this into 3-5 concrete milestones that build toward the outcome in order. For each milestone, give 2-4 next actions — things that could go on a to-do list, not vague advice.

Each action should be sized as ONE sitting of about 45 minutes to 1.5 hours of real, substantial focused work — err toward the longer end. This is NOT a quick checklist item: things like "check email", "inspect checklist", "review notes", "make a list", or "read the instructions" are all too small on their own — fold trivial steps like that into the larger piece of work they support (e.g. don't make "inspect checklist" its own action — it's part of "Draft the checklist" or whatever real task comes next). If a step you're considering would take less than 45 minutes by itself, merge it into a neighboring step rather than listing it separately. If it would take much more than 1.5 hours, split it into two.

Titles matter a lot here because they get shown as small chips on a calendar, so keep them short:
- Milestone titles: max ~6 words.
- Action titles: max ~4-5 words (aim under 30 characters). Lead with a verb (e.g. "Book flights", "Email advisor", "Draft outline") — no filler words like "consider" or "try to", no sub-clauses, no trailing detail after a comma or "for"/"about". If the full idea needs more words, cut it down to the core verb + object and drop the rest.`;

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
