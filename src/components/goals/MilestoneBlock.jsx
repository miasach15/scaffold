import { useState } from "react";
import { inputStyle } from "../../lib/styles";
import { deleteBtn, ghostBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import UrgencyBadge from "../shared/UrgencyBadge";

export default function MilestoneBlock({ milestone, col, onAddAction, onSetActionDone, onRemoveAction, onRemoveMilestone }) {
  const [actionTitle, setActionTitle] = useState("");
  const [actionDate, setActionDate] = useState("");
  const done = milestone.actions.filter((a) => a.done).length;
  const total = milestone.actions.length;
  const milestoneDone = total > 0 && done === total;

  const addAction = () => {
    if (!actionTitle.trim()) return;
    onAddAction(actionTitle.trim(), actionDate);
    setActionTitle(""); setActionDate("");
  };

  return (
    <div style={{ border: "1px solid #ECECEC", borderRadius: 10, padding: "8px 10px", background: "#FDFCFA" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: 4, background: milestoneDone ? col.border : "#DADAD8", flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, textDecoration: milestoneDone ? "line-through" : "none", opacity: milestoneDone ? 0.6 : 1 }}>{milestone.title}</div>
        {total > 0 && <div style={{ fontSize: 10.5, color: "#93A0AD" }}>{done}/{total}</div>}
        <button onClick={onRemoveMilestone} className="btn-delete" style={deleteBtn}>×</button>
      </div>
      {milestone.actions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8, paddingLeft: 15 }}>
          {milestone.actions.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Checkbox checked={a.done} onClick={() => onSetActionDone(a.id, !a.done)} color={col} />
              <div style={{ flex: 1, fontSize: 13, textDecoration: a.done ? "line-through" : "none", opacity: a.done ? 0.5 : 1 }}>{a.title}</div>
              {a.dueDate && <UrgencyBadge iso={a.dueDate} done={a.done} />}
              {a.dueDate && <div style={{ fontSize: 10.5, color: "#93A0AD" }}>{a.dueDate}</div>}
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
