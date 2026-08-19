// Supabase Edge Function: breaks a pasted-in assignment prompt/instructions into an
// ordered list of concrete work steps using Claude, returned as structured JSON.
//
// Deploy with:  supabase functions deploy generate-assignment-plan
// Requires an ANTHROPIC_API_KEY secret (same one used by generate-goal-plan):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  required: ["steps"],
  additionalProperties: false,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { title, details, dueDate } = await req.json();
    if (!details || !details.trim()) {
      return new Response(JSON.stringify({ error: "missing assignment details" }), { status: 400, headers: corsHeaders });
    }
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500, headers: corsHeaders });
    }

    const prompt = `A student has this assignment${title ? ` titled "${title}"` : ""}${dueDate ? `, due ${dueDate}` : ""}. Here are the assignment details/instructions:

"""
${details.trim()}
"""

Break this into an ordered list of concrete work steps a student would do in sequence to complete and turn in the assignment — from the first step to final submission.

Each step should be sized as ONE sitting of about 45 minutes to 1.5 hours of real, substantial focused work — err toward the longer end. This is NOT a quick checklist item: things like "open the doc", "read the prompt", "check requirements", or "inspect checklist" are all too small on their own — fold trivial steps like that into the larger piece of real work they support. Size the number of steps to the actual scope of the assignment: a short assignment might only need 2-3 steps, a substantial one might need up to 8-10 — but every single step must independently be a real 45-90 minute sitting of work, never a checklist trivia item.

Titles matter a lot here because they get shown as small chips on a calendar, so keep them short:
- Max ~4-5 words, under 30 characters. Lead with a verb (e.g. "Outline the essay", "Draft intro paragraph", "Cite sources", "Proofread and submit") — no filler words like "consider" or "try to", no sub-clauses, no trailing detail after a comma or "for"/"about".`;

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
          max_tokens: 1500,
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
      return new Response(JSON.stringify({ error: "The request was declined. Try rephrasing the details." }), { status: 422, headers: corsHeaders });
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
