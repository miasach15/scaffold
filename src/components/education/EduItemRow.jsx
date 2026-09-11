import { useState } from "react";
import { ghostBtn } from "../../lib/styles";
import { deleteBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import UrgencyBadge from "../shared/UrgencyBadge";

// Click the row to manage its sessions/sub-tasks (rename, add, remove, or break it down
// with AI) — see EduSessionsModal. No quick-add row here anymore; one clear way in.
// `col` is your actual School category color (see EducationView) — no separate swatch
// dot needed since the checkbox and the card itself already carry that color.
export default function EduItemRow({ item, col, onToggleDone, onRemove, onOpen, tag, hasFollowing }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 9, border: `1px solid ${col.border}`, borderRadius: 14, padding: "10px 12px", marginBottom: 8, background: "#fff", transition: "box-shadow .15s ease, transform .15s ease" }}>
      <Checkbox checked={item.done} onClick={() => onToggleDone(item.id, !item.done)} color={col} />
      <button onClick={onOpen} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>{item.title}</div>
        <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
          <div style={{ fontSize: 10, color: col.text, background: col.bg, display: "inline-block", padding: "1px 6px", borderRadius: 5, fontWeight: 600 }}>{item.type}</div>
          {item.subject && <div style={{ fontSize: 10, color: "#93A0AD" }}>{item.subject}</div>}
        </div>
      </button>
      {tag ? <div style={{ fontSize: 11, color: "#93A0AD", fontWeight: 600 }}>{tag}</div> : <UrgencyBadge iso={item.dueDate} done={item.done} leadDays={2} />}
      {confirmDelete ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => onRemove(item.id, "one")} style={{ ...ghostBtn, fontSize: 10.5, padding: "4px 8px" }}>This one</button>
          <button onClick={() => onRemove(item.id, "following")} style={{ ...ghostBtn, fontSize: 10.5, padding: "4px 8px" }}>+ following</button>
          <button onClick={() => setConfirmDelete(false)} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: "#93A0AD", fontSize: 14, padding: "0 2px" }}>×</button>
        </div>
      ) : (
        <button onClick={() => (hasFollowing ? setConfirmDelete(true) : onRemove(item.id, "one"))} className="btn-delete" style={deleteBtn}>×</button>
      )}
    </div>
  );
}
