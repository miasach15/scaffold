// Supabase Edge Function: a back-and-forth goal-coaching conversation with Claude —
// unlike generate-goal-plan (one shot: description in, milestones out), this one can
// ask clarifying questions first, and only proposes actual goal(s) once there's enough
// to work with. Also handles "help me figure out next steps for something I'm already
// working on" (pass `existingGoal`) and can propose more than one goal in a single
// conversation.
//
// Deploy with:  supabase functions deploy goal-coach-chat
// Requires an ANTHROPIC_API_KEY secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const PROPOSE_GOALS_TOOL = {
  name: "propose_goals",
  description:
    "Propose one or more fully fleshed-out goals once the conversation has enough detail to actually create them — each with its own milestones and actions. Only call this when you're genuinely ready to propose; keep chatting with a plain text reply otherwise.",
  input_schema: {
    type: "object",
    properties: {
      goals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "The goal's outcome, written the way the user would say it." },
            category: { type: "string", description: "Exactly one of the category names given in the system prompt." },
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
          required: ["title", "category", "milestones"],
          additionalProperties: false,
        },
      },
    },
    required: ["goals"],
    additionalProperties: false,
  },
};

function systemPrompt(categoryKeys: string[], existingGoal: { title: string; milestones: { title: string; actions: string[] }[] } | null) {
  const categoryLine = `The user's actual categories are: ${categoryKeys.join(", ")}. When you propose a goal, "category" must be exactly one of these — never invent a new one.`;

  const existingLine = existingGoal
    ? `The user is already working on this goal and wants help with what comes next — don't start over from scratch:
Goal: "${existingGoal.title}"
Existing milestones: ${existingGoal.milestones.length === 0 ? "(none yet)" : existingGoal.milestones.map((m) => `"${m.title}" (actions: ${m.actions.length ? m.actions.join(", ") : "none yet"})`).join("; ")}
Ask about what's actually happened since the last milestone/action, what's changed, or what's blocking them — then propose new milestones/actions for THIS SAME goal (reuse its exact title and category) rather than a second unrelated goal, unless they explicitly bring up something separate.`
    : `The user wants help turning a vague idea into one or more real goals — or they may already know roughly what they want and just want it fleshed out quickly. Read which one it is from how they write and match that energy: don't force a long interview on someone who clearly already knows what they want.`;

  return `You are a warm, sharp goal-coaching assistant inside a student productivity app called Scaffold. You're talking with a student (often one who finds starting or sustaining big projects hard — be encouraging, never preachy or corporate).

${existingLine}

Your job, through short back-and-forth chat (not a wall of text):
- Help them land on something SPECIFIC and genuinely theirs — not a vague wish ("get better at art") but something with a real shape ("build a 10-piece portfolio for art school applications").
- Ask ONE focused question at a time, not a list of questions. Keep your own messages short — a sentence or two, like a text message, not an essay.
- A student can be working toward more than one thing — if they mention two distinct goals, it's fine to end up proposing both, as separate entries in the same propose_goals call.
- Don't drag this out. Once you have enough — a clear outcome, roughly why it matters or what "done" looks like — propose it. If the user says something like "just make it" / "that's good" / "sounds right", propose immediately with whatever you have, even if it's not perfect.
- Never propose on your very first reply unless the user already gave you something fully specific and complete.

${categoryLine}

When you call propose_goals: 3-5 milestones per goal, in order, each with 2-3 concrete actions (things that could go on a to-do list). HARD FLOOR: every action must represent at least 45 minutes of real, focused work — most should land closer to 1-1.5 hours. Fold anything smaller ("send a message", "look something up", "pick a date") into a bigger adjacent action instead of listing it alone. Titles are short: milestone titles under ~6 words, action titles under ~5 words / 30 characters, leading with a verb ("Book flights", not "Consider booking flights").

When you're just chatting (not proposing yet), reply with plain text only — no tool call.`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages, categoryKeys, existingGoal } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "missing messages" }), { status: 400, headers: corsHeaders });
    }
    if (!Array.isArray(categoryKeys) || categoryKeys.length === 0) {
      return new Response(JSON.stringify({ error: "missing categoryKeys" }), { status: 400, headers: corsHeaders });
    }
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500, headers: corsHeaders });
    }

    const body = {
      model: "claude-opus-5",
      max_tokens: 3000,
      system: systemPrompt(categoryKeys, existingGoal || null),
      messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      tools: [PROPOSE_GOALS_TOOL],
    };

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
        body: JSON.stringify(body),
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

    const blocks = data.content || [];
    const textBlocks = blocks.filter((b: { type: string }) => b.type === "text");
    const toolBlock = blocks.find((b: { type: string; name?: string }) => b.type === "tool_use" && b.name === "propose_goals");

    const reply = textBlocks.map((b: { text: string }) => b.text).join("\n\n").trim() || null;
    const proposal = toolBlock ? toolBlock.input : null;

    if (!reply && !proposal) {
      return new Response(JSON.stringify({ error: "No response came back. Try again." }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ reply, proposal }), { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
