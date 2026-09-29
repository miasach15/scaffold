// Supabase Edge Function: takes a free-text (or dictated) "what did you get done"
// progress report plus today's still-open tasks, and returns which of those tasks the
// report actually describes as finished — matched by meaning, not exact wording
// ("wrapped up the lab report" should match a task titled "Chem lab writeup").
//
// Deploy with:  supabase functions deploy parse-progress-checkin
// Requires an ANTHROPIC_API_KEY secret (same one used by the other planners):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    doneIds: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["doneIds", "summary"],
  additionalProperties: false,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { report, items } = await req.json();
    if (!report || !report.trim()) {
      return new Response(JSON.stringify({ error: "missing report" }), { status: 400, headers: corsHeaders });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ doneIds: [], summary: "Nothing open to check in on." }), { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } });
    }
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500, headers: corsHeaders });
    }

    const list = items.map((it: { id: string; title: string }) => `${it.id}: ${it.title}`).join("\n");
    const prompt = `Someone is doing a progress check-in on their day. Here's what they said they got done, in their own words:
"""
${report.trim()}
"""

Here is their list of still-open items today, one per line as "id: title":
${list}

Figure out which of these items (by id) they're actually describing as DONE — match by meaning, not exact wording (e.g. "wrapped up the lab report" matches an item titled "Chem lab writeup"). Only include an id if the report genuinely describes that specific item as finished. Don't guess at partial progress ("started reading chapter 4" is NOT done) — only clearly completed items count. It's fine to return an empty list if nothing in the report matches anything finished.

Also write a short one-sentence summary confirming what you understood, in second person (e.g. "Marked 2 things done: Chem lab writeup, Read chapter 4." or "Didn't find anything in there that matches your open list."). Keep it plain and factual, no cheerleading.`;

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
          max_tokens: 800,
          output_config: {
            effort: "medium",
            format: { type: "json_schema", schema: RESULT_SCHEMA },
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
        ? "Claude is a bit overloaded right now. Try again in a few seconds."
        : lastErrText;
      return new Response(JSON.stringify({ error: friendly }), { status: 502, headers: corsHeaders });
    }

    const data = await res.json();

    if (data.stop_reason === "refusal") {
      return new Response(JSON.stringify({ error: "The request was declined. Try rephrasing." }), { status: 422, headers: corsHeaders });
    }

    const textBlock = (data.content || []).find((b: { type: string }) => b.type === "text");
    if (!textBlock) {
      return new Response(JSON.stringify({ error: "no result returned" }), { status: 502, headers: corsHeaders });
    }

    const result = JSON.parse(textBlock.text);
    // Belt-and-suspenders: only ever return ids that were actually in the input list, in
    // case the model echoes something malformed.
    const validIds = new Set(items.map((it: { id: string }) => it.id));
    result.doneIds = (result.doneIds || []).filter((id: string) => validIds.has(id));

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
