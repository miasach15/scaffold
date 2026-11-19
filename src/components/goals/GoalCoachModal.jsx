import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { BORDER, INK, MUTED, PRIMARY_DARK, SURFACE } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";
import ModalPortal from "../shared/ModalPortal";

// A back-and-forth chat with Claude for turning a vague idea into one or more real
// goals — or, when `existingGoal` is passed (see GoalCard's "Talk it through"), for
// figuring out what's next on something already in progress instead of starting over.
// Unlike "Break it down for me"/"Fill this in for me" (one shot: description in, plan
// out), this one can ask a question first and won't propose anything until it's
// actually ready — see supabase/functions/goal-coach-chat.
//
// `proposal` lives on its own assistant message (not in a separate modal) so reviewing
// it stays part of the conversation — edit or drop anything before creating it, same
// "nothing lands until you confirm" rule BreakdownPreviewModal uses elsewhere, just
// inline instead of a second overlay.
export default function GoalCoachModal({ categoryKeys, defaultCategory, existingGoal, onAddGoal, onAddMilestone, onAddAction, onClose }) {
  // Only the REAL back-and-forth goes here — the opening greeter below is UI-only and
  // never sent to the API, since Anthropic's Messages API expects the first turn to be
  // "user", not "assistant".
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [creatingIdx, setCreatingIdx] = useState(null);
  const bottomRef = useRef(null);
  const { supported: speechSupported, listening, toggle: toggleListening } = useSpeechToText((phrase) => {
    setInput((t) => (t && !/[\s.]$/.test(t) ? t + " " : t) + phrase);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const greeter = existingGoal
    ? `Let's figure out what's next for "${existingGoal.title}". What have you gotten done so far, or what's tripping you up?`
    : "What's something you want to work toward? Tell me as much or as little as you've got — we'll figure out the real shape of it together.";

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("goal-coach-chat", {
        body: {
          messages: nextMessages,
          categoryKeys,
          existingGoal: existingGoal
            ? { title: existingGoal.title, milestones: existingGoal.milestones.map((m) => ({ title: m.title, actions: m.actions.map((a) => a.title) })) }
            : null,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      // What goes back into history for the NEXT turn's context — a proposal with no
      // accompanying text still needs some readable stand-in, since there's no full
      // tool-result round trip here, just a plain-text conversation log.
      const historyContent = data.reply || (data.proposal ? `(proposed: ${data.proposal.goals.map((g) => g.title).join(", ")})` : "");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: historyContent, reply: data.reply, proposal: data.proposal, status: data.proposal ? "pending" : null },
      ]);
    } catch (e) {
      setError(e.message || "Couldn't reach the coach. Try again.");
    } finally {
      setSending(false);
    }
  };

  const updateProposal = (mi, updater) => {
    setMessages((prev) => prev.map((m, i) => (i !== mi ? m : { ...m, proposal: { goals: updater(m.proposal.goals) } })));
  };
  const setGoalField = (mi, gi, field, value) =>
    updateProposal(mi, (goals) => goals.map((g, j) => (j !== gi ? g : { ...g, [field]: value })));
  const removeGoal = (mi, gi) => updateProposal(mi, (goals) => goals.filter((_, j) => j !== gi));
  const setMilestoneTitle = (mi, gi, mj, title) =>
    updateProposal(mi, (goals) => goals.map((g, j) => (j !== gi ? g : { ...g, milestones: g.milestones.map((m, k) => (k !== mj ? m : { ...m, title })) })));
  const removeMilestone = (mi, gi, mj) =>
    updateProposal(mi, (goals) => goals.map((g, j) => (j !== gi ? g : { ...g, milestones: g.milestones.filter((_, k) => k !== mj) })));
  const setActionTitle = (mi, gi, mj, aj, title) =>
    updateProposal(mi, (goals) =>
      goals.map((g, j) =>
        j !== gi ? g : { ...g, milestones: g.milestones.map((m, k) => (k !== mj ? m : { ...m, actions: m.actions.map((a, l) => (l !== aj ? a : { ...a, title })) })) }
      )
    );
  const removeAction = (mi, gi, mj, aj) =>
    updateProposal(mi, (goals) =>
      goals.map((g, j) => (j !== gi ? g : { ...g, milestones: g.milestones.map((m, k) => (k !== mj ? m : { ...m, actions: m.actions.filter((_, l) => l !== aj) })) }))
    );

  const createProposal = async (mi) => {
    const goals = messages[mi].proposal.goals;
    if (goals.length === 0) return;
    setCreatingIdx(mi);
    setError(null);
    try {
      const createdTitles = [];
      for (const g of goals) {
        const isContinuation = existingGoal && g.title.trim().toLowerCase() === existingGoal.title.trim().toLowerCase();
        const goalId = isContinuation ? existingGoal.id : await onAddGoal(g.title, g.category || defaultCategory, null);
        for (const m of g.milestones) {
          if (!m.title) continue;
          const milestoneId = await onAddMilestone(goalId, m.title);
          for (const a of m.actions || []) {
            if (a.title) await onAddAction(goalId, milestoneId, a.title, null, a.daysNeeded);
          }
        }
        createdTitles.push(g.title);
      }
      setMessages((prev) => prev.map((m, i) => (i !== mi ? m : { ...m, status: "created" })));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          system: true,
          content:
            createdTitles.length === 1
              ? `Created "${createdTitles[0]}". Want help with anything else?`
              : `Created ${createdTitles.length} goals: ${createdTitles.join(", ")}. Want help with anything else?`,
        },
      ]);
    } catch (e) {
      setError(e.message || "Couldn't create that. Try again.");
    } finally {
      setCreatingIdx(null);
    }
  };

  const dismissProposal = (mi) => setMessages((prev) => prev.map((m, i) => (i !== mi ? m : { ...m, status: "dismissed" })));

  return (
    <ModalPortal>
      <div style={overlayStyle} onClick={onClose}>
        <div
          style={{ ...modalStyle, width: 560, padding: 0, display: "flex", flexDirection: "column", height: "min(680px, 88dvh)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{existingGoal ? "What's next" : "Talk through a goal"}</div>
            <div style={{ flex: 1 }} />
            <button onClick={onClose} title="Close" style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 18, padding: "0 2px" }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <Bubble role="assistant" text={greeter} />
            {messages.map((m, i) => (
              <div key={i}>
                {m.content && <Bubble role={m.role} text={m.content} system={m.system} />}
                {m.proposal && m.status !== "dismissed" && (
                  <ProposalCard
                    goals={m.proposal.goals}
                    categoryKeys={categoryKeys}
                    created={m.status === "created"}
                    creating={creatingIdx === i}
                    onSetGoalField={(gi, field, v) => setGoalField(i, gi, field, v)}
                    onRemoveGoal={(gi) => removeGoal(i, gi)}
                    onSetMilestoneTitle={(gi, mj, v) => setMilestoneTitle(i, gi, mj, v)}
                    onRemoveMilestone={(gi, mj) => removeMilestone(i, gi, mj)}
                    onSetActionTitle={(gi, mj, aj, v) => setActionTitle(i, gi, mj, aj, v)}
                    onRemoveAction={(gi, mj, aj) => removeAction(i, gi, mj, aj)}
                    onCreate={() => createProposal(i)}
                    onDismiss={() => dismissProposal(i)}
                  />
                )}
              </div>
            ))}
            {sending && <Bubble role="assistant" typing />}
            {error && <div style={{ fontSize: 12, color: "#B03A3A", padding: "0 2px" }}>{error}</div>}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type your reply..."
              rows={1}
              autoFocus
              style={{ ...inputStyle, flex: 1, resize: "none", background: SURFACE, fontFamily: "inherit", maxHeight: 90 }}
            />
            {speechSupported && (
              <button
                onClick={toggleListening}
                title={listening ? "Stop dictating" : "Dictate instead of typing"}
                style={{
                  ...ghostBtn, minWidth: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  color: listening ? "#B03A3A" : MUTED, borderColor: listening ? "#B03A3A" : BORDER,
                }}
              >
                {listening ? <Square size={14} strokeWidth={2.2} /> : <Mic size={16} strokeWidth={2.2} />}
              </button>
            )}
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending}
              className="btn-primary"
              style={{ ...primaryBtn, minWidth: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: !input.trim() || sending ? 0.5 : 1 }}
              title="Send"
            >
              <Send size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function Bubble({ role, text, typing, system }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "82%", padding: "9px 13px", borderRadius: 14,
          borderBottomRightRadius: isUser ? 4 : 14,
          borderBottomLeftRadius: isUser ? 14 : 4,
          background: isUser ? PRIMARY_DARK : system ? "#F0EEFB" : "#fff",
          color: isUser ? "#fff" : INK,
          border: isUser ? "none" : `1px solid ${BORDER}`,
          fontSize: 13.5, lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "break-word",
        }}
      >
        {typing ? <TypingDots /> : text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 3, padding: "2px 0" }}>
      <style>{`
        @keyframes goal-coach-bounce { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }
      `}</style>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: MUTED, animation: "goal-coach-bounce 1.1s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

function ProposalCard({ goals, categoryKeys, created, creating, onSetGoalField, onRemoveGoal, onSetMilestoneTitle, onRemoveMilestone, onSetActionTitle, onRemoveAction, onCreate, onDismiss }) {
  if (goals.length === 0) {
    return <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Nothing left here — type a reply to try again.</div>;
  }
  return (
    <div style={{ marginTop: 8, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 }}>
        {created ? "Created" : "Here's the plan"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {goals.map((g, gi) => (
          <div key={gi} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <input
                value={g.title}
                disabled={created}
                onChange={(e) => onSetGoalField(gi, "title", e.target.value)}
                style={{ ...inputStyle, flex: 1, fontSize: 14, fontWeight: 700, padding: "6px 9px", background: created ? "transparent" : "#fff", border: created ? "none" : undefined }}
              />
              {!created && (
                <select
                  value={g.category}
                  onChange={(e) => onSetGoalField(gi, "category", e.target.value)}
                  style={{ ...inputStyle, fontSize: 11.5, padding: "5px 7px", width: 110 }}
                >
                  {categoryKeys.map((c) => <option key={c}>{c}</option>)}
                </select>
              )}
              {!created && goals.length > 1 && (
                <button onClick={() => onRemoveGoal(gi)} style={deleteBtn}>×</button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.milestones.map((m, mj) => (
                <div key={mj} style={{ paddingLeft: 10, borderLeft: `2px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      value={m.title}
                      disabled={created}
                      onChange={(e) => onSetMilestoneTitle(gi, mj, e.target.value)}
                      style={{ ...inputStyle, flex: 1, fontSize: 12.5, fontWeight: 600, padding: "4px 7px", background: created ? "transparent" : "#fff", border: created ? "none" : undefined }}
                    />
                    {!created && <button onClick={() => onRemoveMilestone(gi, mj)} style={deleteBtn}>×</button>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 3 }}>
                    {(m.actions || []).map((a, aj) => (
                      <div key={aj} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: MUTED, fontSize: 11 }}>–</span>
                        <input
                          value={a.title}
                          disabled={created}
                          onChange={(e) => onSetActionTitle(gi, mj, aj, e.target.value)}
                          style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "3px 6px", background: created ? "transparent" : "#fff", border: created ? "none" : undefined }}
                        />
                        {!created && <button onClick={() => onRemoveAction(gi, mj, aj)} style={{ ...deleteBtn, padding: "2px 6px" }}>×</button>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!created && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={onDismiss} style={{ ...ghostBtn, fontSize: 12.5 }}>Not quite — keep talking</button>
          <button onClick={onCreate} disabled={creating} className="btn-primary" style={{ ...primaryBtn, flex: 1, fontSize: 12.5, opacity: creating ? 0.6 : 1 }}>
            {creating ? "Creating..." : `Create ${goals.length} goal${goals.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}
