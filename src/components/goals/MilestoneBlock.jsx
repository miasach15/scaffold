import { useState } from "react";
import { inputStyle } from "../../lib/styles";
import { deleteBtn, ghostBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import UrgencyBadge from "../shared/UrgencyBadge";

export default function MilestoneBlock({ milestone, col, onAddAction, onSetActionDone, onRemoveAction, onRemoveMilestone, onRenameMilestone, onSetMilestoneDueDate, onRenameAction, onSetActionDueDate }) {
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

  return (
    <div style={{ border: "1px solid #ECECEC", borderRadius: 10, padding: "8px 10px", background: "#FDFCFA" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: 4, background: milestoneDone ? col.border : "#DADAD8", flexShrink: 0 }} />
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
            style={{ ...inputStyle, flex: 1, fontSize: 13, fontWeight: 700, padding: "3px 6px" }}
          />
        ) : (
          <div
            onClick={startEditMilestone}
            title="Click to edit"
            style={{ flex: 1, fontSize: 13, fontWeight: 700, textDecoration: milestoneDone ? "line-through" : "none", opacity: milestoneDone ? 0.6 : 1, cursor: "text" }}
          >
            {milestone.title}
          </div>
        )}
        {total > 0 && <div style={{ fontSize: 10.5, color: "#93A0AD" }}>{done}/{total}</div>}
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
          <>
            <UrgencyBadge iso={milestone.dueDate} done={milestoneDone} />
            <div onClick={() => setEditingMilestoneDate(true)} title="Click to change target date" style={{ fontSize: 10.5, color: "#93A0AD", cursor: "pointer", whiteSpace: "nowrap" }}>{milestone.dueDate}</div>
          </>
        ) : (
          <button onClick={() => setEditingMilestoneDate(true)} title="Set a target date — this will auto-fill dates for actions below" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10.5, color: "#B4BCC5", fontWeight: 600, whiteSpace: "nowrap", padding: 0 }}>+ target date</button>
        )}
        <button onClick={onRemoveMilestone} className="btn-delete" style={deleteBtn}>×</button>
      </div>
      {milestone.actions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8, paddingLeft: 15 }}>
          {milestone.actions.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  style={{ flex: 1, fontSize: 13, textDecoration: a.done ? "line-through" : "none", opacity: a.done ? 0.5 : 1, cursor: "text" }}
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
                <>
                  <UrgencyBadge iso={a.dueDate} done={a.done} />
                  <div onClick={() => setEditingDateId(a.id)} title="Click to change date" style={{ fontSize: 10.5, color: "#93A0AD", cursor: "pointer" }}>{a.dueDate}</div>
                </>
              ) : (
                <button onClick={() => setEditingDateId(a.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10.5, color: "#B4BCC5", fontWeight: 600, whiteSpace: "nowrap", padding: 0 }}>+ date</button>
              )}
              <button onClick={() => onRemoveAction(a.id)} className="btn-delete" style={deleteBtn}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, paddingLeft: 15 }}>
        <input placeholder="Next action..." value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 12.5, padding: "6px 8px" }} onKeyDown={(e) => e.key === "Enter" && addAction()} />
        <input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} style={{ ...inputStyle, width: 124, fontSize: 12.5, padding: "6px 8px" }} />
        <button onClick={addAction} style={{ ...ghostBtn, fontSize: 12, padding: "6px 10px" }}>Add</button>
      </div>
    </div>
  );
}
