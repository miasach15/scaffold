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

Break this into 3-5 concrete milestones that build toward the outcome in order. For each milestone, give 2-4 small, specific, actionable next actions — things that could go on a to-do list, not vague advice. Titles should be short and concrete, no filler words like "consider" or "try to".`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: errText }), { status: 502, headers: corsHeaders });
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
