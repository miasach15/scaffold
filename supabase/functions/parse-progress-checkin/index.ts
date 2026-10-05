// Supabase Edge Function: takes a free-text (or dictated) check-in — what got done, what
// to add, what to push back — plus today's still-open items, and figures out which of
// up to three narrow, additive actions it actually describes:
//   1. mark an existing item DONE (matched by meaning, not exact wording — "wrapped up
//      the lab report" matches an item titled "Chem lab writeup")
//   2. move an existing item's date (e.g. "push the essay to Friday")
//   3. something NEW that wasn't on the list — classified as a flexible task or a
//      fixed-time calendar event ("I have a dentist appointment Tuesday at 3" is an
//      event, not a task)
// Deliberately never deletes or renames anything that already exists, and never adds a
// new item directly — newItems always go through the client's own review-before-confirm
// step (same one Brain Dump uses), so a misheard word is something you catch and fix on
// the review screen, not something that silently lands wrong.
//
// Deploy with:  supabase functions deploy parse-progress-checkin
// Requires an ANTHROPIC_API_KEY secret (same one used by the other planners):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    doneIds: { type: "array", items: { type: "string" } },
    dateChanges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          newDate: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["id", "newDate"],
        additionalProperties: false,
      },
    },
    newItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          type: { type: "string", enum: ["task", "event"] },
          date: { type: ["string", "null"], description: "YYYY-MM-DD, or null for no due date (tasks only — an event should always get a date if at all possible)" },
          start: { type: ["number", "null"], description: "decimal hour 0-23.99 (e.g. 14.5 = 2:30pm) ONLY for an event with a clear time mentioned, otherwise null" },
          duration: { type: ["number", "null"], description: "minutes, or null if not mentioned" },
        },
        required: ["title", "type", "date", "start", "duration"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["doneIds", "dateChanges", "newItems", "summary"],
  additionalProperties: false,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { report, items, today } = await req.json();
    if (!report || !report.trim()) {
      return new Response(JSON.stringify({ error: "missing report" }), { status: 400, headers: corsHeaders });
    }
    if (!Array.isArray(items)) {
      return new Response(JSON.stringify({ error: "missing items" }), { status: 400, headers: corsHeaders });
    }
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500, headers: corsHeaders });
    }

    const todayISO = typeof today === "string" && ISO_DATE_RE.test(today) ? today : new Date().toISOString().slice(0, 10);
    const list = items.length > 0
      ? items.map((it: { id: string; title: string; date: string | null }) => `${it.id}: ${it.title}${it.date ? ` (currently due ${it.date})` : ""}`).join("\n")
      : "(nothing open right now)";
    const prompt = `Someone is doing a quick check-in on their day. Today's date is ${todayISO}. Here's what they said, in their own words:
"""
${report.trim()}
"""

Here is their list of still-open items today, one per line as "id: title (currently due date)":
${list}

Figure out, from what they said, which of up to three things apply. Do all that genuinely apply — a single check-in can do more than one.

1. DONE — which of the listed items (by id) are they describing as finished? Match by meaning, not exact wording. Don't guess at partial progress ("started reading chapter 4" is NOT done) — only clearly completed items count.

2. MOVE A DATE — are they asking to push back, reschedule, or extend the deadline of one of the LISTED items? Only ever for an item that's actually in the list above (never invent an id). Resolve whatever they said ("Friday", "in two days", "next week") into an actual YYYY-MM-DD date using ${todayISO} as today. If they don't give enough to resolve a real date, don't include it.

3. SOMETHING NEW — are they mentioning something that is NOT already one of the listed items? For each one:
   - Classify it as "event" if it's a fixed-time happening — an appointment, a meeting, something at a specific clock time ("dentist at 3", "practice from 4 to 5:30"). Classify it as "task" if it's flexible work with no inherent fixed time ("pick up groceries", "finish the essay").
   - Give it a short, clear title (same style as the existing ones — lead with a verb-ish or noun phrase, no filler).
   - Resolve any date they gave into YYYY-MM-DD using ${todayISO} as today, or null if they gave none (a task can have no date; an event should get one whenever the day is inferable at all, even just "today").
   - For an EVENT only: if they gave a clock time, resolve it to a decimal hour (e.g. "2:30pm" → 14.5); otherwise null.
   - duration in minutes only if they actually said or clearly implied how long it runs (e.g. "4 to 5:30" → 90 minutes) — otherwise null, never invent a number.

Be conservative: when in doubt about whether something is NEW versus referring to an EXISTING listed item, prefer matching it to the existing item (duplicates are worse than a missed add). Never touch an id that isn't in the list.

Also write a short, factual, second-person summary of everything you actually did (e.g. "Marked Chem lab writeup done, pushed the essay to Friday, and found one new thing to add." or "Didn't find anything in there to act on."). If there's anything new, mention there's something to review, but don't describe it in detail — the review screen does that. No cheerleading, just what happened.`;

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

    // Belt-and-suspenders: only ever act on ids that were actually in the input list, and
    // only ever accept dates/types that are genuinely well-formed — in case the model
    // echoes something malformed or (despite the prompt) invents an id.
    const validIds = new Set(items.map((it: { id: string }) => it.id));
    result.doneIds = (result.doneIds || []).filter((id: string) => validIds.has(id));
    result.dateChanges = (result.dateChanges || []).filter(
      (c: { id: string; newDate: string }) => validIds.has(c.id) && ISO_DATE_RE.test(c.newDate)
    );
    result.newItems = (result.newItems || [])
      .filter((it: { title: string }) => it.title && it.title.trim())
      .map((it: { title: string; type: string; date: string | null; start: number | null; duration: number | null }) => ({
        title: it.title.trim(),
        type: it.type === "event" ? "event" : "task",
        date: it.date && ISO_DATE_RE.test(it.date) ? it.date : null,
        start: typeof it.start === "number" && it.start >= 0 && it.start < 24 ? it.start : null,
        duration: typeof it.duration === "number" && it.duration > 0 ? Math.round(it.duration) : null,
      }));

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
