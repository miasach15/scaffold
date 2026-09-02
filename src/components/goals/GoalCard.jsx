import { useState } from "react";
import { Pencil, Check, X, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { formatShortDate } from "../../lib/dateHelpers";
import { supabase } from "../../lib/supabase";
import { INK, MUTED, PRIMARY_DARK, monoFont, serifFont } from "../../lib/constants";
import { deleteBtn, inputStyle, ghostBtn } from "../../lib/styles";
import UrgencyBadge from "../shared/UrgencyBadge";
import MilestoneBlock from "./MilestoneBlock";

// A goal's overall completion, at a glance — separate from each category's own color
// (the tag chip/card wash), this ring is always the same brand accent so it reads as
// one consistent "how done is this" marker across every goal on the page.
function CompletionRing({ pct, size = 40 }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFEAE3" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PRIMARY_DARK} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: monoFont, fontSize: 10, fontWeight: 700, color: INK }}>
        {pct}%
      </div>
    </div>
  );
}

export default function GoalCard({ goal, onRemoveGoal, onRenameGoal, onSetGoalDeadline, onAddMilestone, onRemoveMilestone, onRenameMilestone, onSetMilestoneDueDate, onAddAction, onMoveAction, onSetActionDone, onRemoveAction, onRenameAction, onSetActionDueDate }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(goal.title);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [filling, setFilling] = useState(false);
  const [fillError, setFillError] = useState(null);
  // New, empty goals start expanded so it's obvious where to add the first milestone;
  // goals that already have content start collapsed to keep the list short.
  const [expanded, setExpanded] = useState(goal.milestones.length === 0);
  const col = CATEGORY_COLORS[goal.category];
  const allActions = goal.milestones.flatMap((m) => m.actions);
  const doneCount = allActions.filter((a) => a.done).length;
  const total = allActions.length;
  const allDone = total > 0 && doneCount === total;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const addMilestone = () => {
    if (!milestoneTitle.trim()) return;
    onAddMilestone(goal.id, milestoneTitle.trim());
    setMilestoneTitle("");
  };

  const startEditTitle = () => {
    setTitleDraft(goal.title);
    setEditingTitle(true);
  };
  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== goal.title) onRenameGoal(goal.id, titleDraft);
    setEditingTitle(false);
  };
  const cancelTitle = () => setEditingTitle(false);

  const fillInForMe = async () => {
    if (filling) return;
    setFilling(true);
    setFillError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-goal-plan", {
        body: { outcome: goal.title, category: goal.category },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const milestones = data?.milestones || [];
      if (milestones.length === 0) throw new Error("No plan came back. Try renaming the goal to be more specific.");
      for (const m of milestones) {
        if (!m.title) continue;
        const milestoneId = await onAddMilestone(goal.id, m.title);
        for (const a of m.actions || []) {
          if (a.title) await onAddAction(goal.id, milestoneId, a.title, null);
        }
      }
      // The goal already has an end date — spread it across everything that just got
      // created undated, same cascade as setting the deadline manually.
      if (goal.deadline && onSetGoalDeadline) await onSetGoalDeadline(goal.id, goal.deadline);
    } catch (e) {
      setFillError(e.message || "Couldn't reach the planner. It may not be set up yet.");
    } finally {
      setFilling(false);
    }
  };

  return (
    <div className="hoverable" style={{ border: `1px solid ${col.border}`, borderRadius: 20, overflow: "hidden", background: col.bg, transition: "box-shadow .15s ease, transform .15s ease" }}>
      <div style={{ padding: "20px 22px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 6, background: "#fff", border: `1px solid ${col.border}`, marginBottom: 8 }}>
              <div style={{ fontFamily: monoFont, fontSize: 10, fontWeight: 700, color: col.text, textTransform: "uppercase" }}>{goal.category}</div>
            </div>
            {editingTitle ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") cancelTitle();
                  }}
                  style={{ ...inputStyle, fontFamily: serifFont, fontSize: 26, fontWeight: 500, padding: "4px 8px", flex: 1, minWidth: 0 }}
                />
                <button onClick={saveTitle} title="Save" style={{ background: "none", border: "none", cursor: "pointer", color: INK, padding: 4, display: "flex" }}><Check size={16} strokeWidth={2.5} /></button>
                <button onClick={cancelTitle} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex" }}><X size={16} strokeWidth={2.5} /></button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontFamily: serifFont, fontSize: 26, color: INK, letterSpacing: -0.2 }}>{goal.title}</div>
                <button onClick={startEditTitle} title="Rename goal" style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 2, display: "flex" }}><Pencil size={12.5} strokeWidth={2.3} /></button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {onSetGoalDeadline && editingDeadline ? (
                <input
                  type="date"
                  autoFocus
                  value={goal.deadline || ""}
                  onChange={(e) => { onSetGoalDeadline(goal.id, e.target.value); setEditingDeadline(false); }}
                  onBlur={() => setEditingDeadline(false)}
                  style={{ ...inputStyle, width: 138, fontSize: 11.5, padding: "3px 6px" }}
                />
              ) : goal.deadline ? (
                <div
                  onClick={() => onSetGoalDeadline && setEditingDeadline(true)}
                  title={onSetGoalDeadline ? `${formatShortDate(goal.deadline)} (click to change). Changing this spreads dates across anything still undated underneath.` : undefined}
                  style={{ cursor: onSetGoalDeadline ? "pointer" : "default" }}
                >
                  <UrgencyBadge iso={goal.deadline} done={allDone} leadDays={2} />
                </div>
              ) : onSetGoalDeadline ? (
                <button
                  onClick={() => setEditingDeadline(true)}
                  title="Set an end date: spreads dates across every milestone and action underneath automatically"
                  style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "transparent", border: `1.5px dashed ${MUTED}`, color: MUTED, borderRadius: 999, padding: "2px 8px 2px 5px", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}
                >
                  <Plus size={11} strokeWidth={2.5} /> end date
                </button>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {total > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, color: MUTED, textAlign: "right", whiteSpace: "nowrap" }}>{doneCount} of {total}<br />completed</div>
                <CompletionRing pct={pct} />
              </div>
            )}
            <button onClick={() => setExpanded((x) => !x)} title={expanded ? "Collapse" : "Expand"} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex" }}>
              {expanded ? <ChevronDown size={16} strokeWidth={2.3} /> : <ChevronRight size={16} strokeWidth={2.3} />}
            </button>
            <button onClick={() => onRemoveGoal(goal.id)} style={{ ...deleteBtn, color: MUTED }}>×</button>
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 22px 20px" }}>
          {goal.milestones.length === 0 ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>No milestones yet. Add the first big step below, or let AI fill it in for you.</div>
              <button
                onClick={fillInForMe}
                disabled={filling}
                style={{ ...ghostBtn, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5, opacity: filling ? 0.6 : 1 }}
              >
                {filling ? "Filling it in..." : "Fill this in for me"}
              </button>
              {fillError && <div style={{ fontSize: 11.5, color: "#B03A3A", marginTop: 6 }}>{fillError}</div>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
              {goal.milestones.map((m) => (
                <MilestoneBlock
                  key={m.id}
                  milestone={m}
                  col={col}
                  onAddAction={(t, d) => onAddAction(goal.id, m.id, t, d)}
                  onMoveAction={(aid, dir) => onMoveAction(goal.id, m.id, aid, dir)}
                  onSetActionDone={(aid, done) => onSetActionDone(goal.id, m.id, aid, done)}
                  onRemoveAction={(aid) => onRemoveAction(goal.id, m.id, aid)}
                  onRemoveMilestone={() => onRemoveMilestone(goal.id, m.id)}
                  onRenameMilestone={(title) => onRenameMilestone(goal.id, m.id, title)}
                  onSetMilestoneDueDate={(date) => onSetMilestoneDueDate(goal.id, m.id, date)}
                  onRenameAction={(aid, title) => onRenameAction(goal.id, m.id, aid, title)}
                  onSetActionDueDate={(aid, date) => onSetActionDueDate(goal.id, m.id, aid, date)}
                />
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <input placeholder="Add a milestone..." value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 13 }} onKeyDown={(e) => e.key === "Enter" && addMilestone()} />
            <button onClick={addMilestone} style={{ ...ghostBtn, fontSize: 13 }}>Add milestone</button>
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Next actions with a due date show up on the Calendar automatically.</div>
        </div>
      )}
    </div>
  );
}
