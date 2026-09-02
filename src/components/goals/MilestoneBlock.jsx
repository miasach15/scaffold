import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { formatShortDate } from "../../lib/dateHelpers";
import { inputStyle } from "../../lib/styles";
import { INK, MUTED, PRIMARY, PRIMARY_DARK, SECONDARY, monoFont } from "../../lib/constants";
import { deleteBtn, ghostBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import UrgencyBadge from "../shared/UrgencyBadge";

// A settled/done milestone gets the calm blue border (same brand accent as the outer
// goal card); the still-active one gets a neutral border with a thicker ink-tinted
// left edge instead — a "you are here" marker, matched to the Figma reference.
const CURRENT_BORDER = "rgba(42,42,53,0.2)";
// The milestone checkbox is a fixed ink color when checked (a "settled" marker,
// distinct from category color) — action checkboxes below stay category-colored,
// matching how Checkbox is used everywhere else in the app.
const INK_CHECK_COLOR = { border: INK };

// Thin inline bar + percentage, matched to the goal header's CompletionRing — same
// fixed brand accent, so "how done is this" reads consistently at both levels.
function MiniProgressBar({ pct }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ width: 56, height: 5, borderRadius: 3, background: "#CDE2F5", overflow: "hidden" }}>
        <div style={{ height: "100%", width: "100%", background: PRIMARY, borderRadius: 3, transform: `scaleX(${pct / 100})`, transformOrigin: "left", transition: "transform .2s" }} />
      </div>
      <div style={{ fontFamily: monoFont, fontSize: 10.5, fontWeight: 700, color: PRIMARY_DARK, width: 28, textAlign: "right" }}>{pct}%</div>
    </div>
  );
}

export default function MilestoneBlock({ milestone, col, onAddAction, onMoveAction, onSetActionDone, onRemoveAction, onRemoveMilestone, onRenameMilestone, onSetMilestoneDueDate, onRenameAction, onSetActionDueDate }) {
  const [actionTitle, setActionTitle] = useState("");
  const [actionDate, setActionDate] = useState("");
  const [editingMilestone, setEditingMilestone] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState(milestone.title);
  const [editingActionId, setEditingActionId] = useState(null);
  const [actionDraft, setActionDraft] = useState("");
  const [editingDateId, setEditingDateId] = useState(null);
  const [editingMilestoneDate, setEditingMilestoneDate] = useState(false);
  const done = milestone.actions.filter((a) => a.done).length;
  const total = milestone.actions.length;
  const milestoneDone = total > 0 && done === total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const addAction = () => {
    if (!actionTitle.trim()) return;
    onAddAction(actionTitle.trim(), actionDate);
    setActionTitle(""); setActionDate("");
  };

  const startEditMilestone = () => {
    setMilestoneDraft(milestone.title);
    setEditingMilestone(true);
  };
  const saveMilestone = () => {
    if (milestoneDraft.trim() && milestoneDraft.trim() !== milestone.title) onRenameMilestone(milestoneDraft);
    setEditingMilestone(false);
  };

  const startEditAction = (a) => {
    setActionDraft(a.title);
    setEditingActionId(a.id);
  };
  const saveAction = (a) => {
    if (actionDraft.trim() && actionDraft.trim() !== a.title) onRenameAction(a.id, actionDraft);
    setEditingActionId(null);
  };

  // Clicking the milestone's own checkbox is a shortcut for "mark the whole thing
  // done/undone" — it flips every action underneath at once, on top of (not instead
  // of) checking actions off one at a time below.
  const toggleAll = () => {
    if (total === 0) return;
    const next = !milestoneDone;
    milestone.actions.forEach((a) => { if (a.done !== next) onSetActionDone(a.id, next); });
  };

  return (
    <div
      style={{
        borderRadius: 14, padding: "12px 14px", background: "#fff",
        border: `1px solid ${milestoneDone ? SECONDARY : CURRENT_BORDER}`,
        borderLeftWidth: milestoneDone ? 1 : 3,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap", rowGap: 6 }}>
        {total > 0 ? (
          <div title={milestoneDone ? "Mark all not done" : "Mark all done"}>
            <Checkbox checked={milestoneDone} onClick={toggleAll} color={INK_CHECK_COLOR} />
          </div>
        ) : (
          <div style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid #D1D5DB", flexShrink: 0 }} />
        )}
        {editingMilestone ? (
          <input
            autoFocus
            value={milestoneDraft}
            onChange={(e) => setMilestoneDraft(e.target.value)}
            onBlur={saveMilestone}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveMilestone();
              if (e.key === "Escape") setEditingMilestone(false);
            }}
            style={{ ...inputStyle, flex: "1 1 140px", fontSize: 14, fontWeight: 600, padding: "3px 6px" }}
          />
        ) : (
          <div
            onClick={startEditMilestone}
            title="Click to edit"
            style={{
              flex: "1 1 140px", fontSize: 14, fontWeight: 600, cursor: "text",
              color: milestoneDone ? PRIMARY_DARK : INK,
              textDecoration: milestoneDone ? "line-through" : "none", opacity: milestoneDone ? 0.75 : 1,
            }}
          >
            {milestone.title}
          </div>
        )}
        {editingMilestoneDate ? (
          <input
            type="date"
            autoFocus
            value={milestone.dueDate || ""}
            onChange={(e) => { onSetMilestoneDueDate(e.target.value); setEditingMilestoneDate(false); }}
            onBlur={() => setEditingMilestoneDate(false)}
            style={{ ...inputStyle, width: 124, fontSize: 11.5, padding: "3px 6px" }}
          />
        ) : milestone.dueDate ? (
          <div onClick={() => setEditingMilestoneDate(true)} title={`${formatShortDate(milestone.dueDate)} (click to change)`} style={{ cursor: "pointer" }}>
            <UrgencyBadge iso={milestone.dueDate} done={milestoneDone} leadDays={2} />
          </div>
        ) : (
          <button onClick={() => setEditingMilestoneDate(true)} title="Set a target date: this will auto-fill dates for actions below" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10.5, color: MUTED, fontWeight: 600, whiteSpace: "nowrap", padding: 0 }}>+ target date</button>
        )}
        {total > 0 && <MiniProgressBar pct={pct} />}
        <button onClick={onRemoveMilestone} className="btn-delete" style={deleteBtn}>×</button>
      </div>
      {milestone.actions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8, paddingLeft: 28 }}>
          {milestone.actions.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <button
                  onClick={() => onMoveAction(a.id, "up")}
                  disabled={i === 0}
                  title="Move up"
                  style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: 0, color: i === 0 ? "#DDD6CB" : MUTED, display: "flex", lineHeight: 0 }}
                >
                  <ChevronUp size={11} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => onMoveAction(a.id, "down")}
                  disabled={i === milestone.actions.length - 1}
                  title="Move down"
                  style={{ background: "none", border: "none", cursor: i === milestone.actions.length - 1 ? "default" : "pointer", padding: 0, color: i === milestone.actions.length - 1 ? "#DDD6CB" : MUTED, display: "flex", lineHeight: 0 }}
                >
                  <ChevronDown size={11} strokeWidth={2.5} />
                </button>
              </div>
              <Checkbox checked={a.done} onClick={() => onSetActionDone(a.id, !a.done)} color={col} />
              {editingActionId === a.id ? (
                <input
                  autoFocus
                  value={actionDraft}
                  onChange={(e) => setActionDraft(e.target.value)}
                  onBlur={() => saveAction(a)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveAction(a);
                    if (e.key === "Escape") setEditingActionId(null);
                  }}
                  style={{ ...inputStyle, flex: 1, fontSize: 13, padding: "3px 6px" }}
                />
              ) : (
                <div
                  onClick={() => startEditAction(a)}
                  title="Click to edit"
                  style={{ flex: 1, fontSize: 12.5, color: a.done ? MUTED : INK, textDecoration: a.done ? "line-through" : "none", opacity: a.done ? 0.7 : 1, cursor: "text" }}
                >
                  {a.title}
                </div>
              )}
              {editingDateId === a.id ? (
                <input
                  type="date"
                  autoFocus
                  value={a.dueDate || ""}
                  onChange={(e) => { onSetActionDueDate(a.id, e.target.value); setEditingDateId(null); }}
                  onBlur={() => setEditingDateId(null)}
                  style={{ ...inputStyle, width: 124, fontSize: 11.5, padding: "3px 6px" }}
                />
              ) : a.dueDate ? (
                <div onClick={() => setEditingDateId(a.id)} title={`${formatShortDate(a.dueDate)} (click to change)`} style={{ cursor: "pointer" }}>
                  <UrgencyBadge iso={a.dueDate} done={a.done} leadDays={2} />
                </div>
              ) : (
                <button onClick={() => setEditingDateId(a.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10.5, color: MUTED, fontWeight: 600, whiteSpace: "nowrap", padding: 0 }}>+ date</button>
              )}
              <button onClick={() => onRemoveAction(a.id)} className="btn-delete" style={deleteBtn}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, paddingLeft: 28 }}>
        <input placeholder="Next action..." value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 12.5, padding: "6px 8px" }} onKeyDown={(e) => e.key === "Enter" && addAction()} />
        <input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} style={{ ...inputStyle, width: 124, fontSize: 12.5, padding: "6px 8px" }} />
        <button onClick={addAction} style={{ ...ghostBtn, fontSize: 12, padding: "6px 10px" }}>Add</button>
      </div>
    </div>
  );
}
