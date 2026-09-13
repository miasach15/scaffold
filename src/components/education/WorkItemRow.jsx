import { useState } from "react";
import { deleteBtn, ghostBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";

// Every row here — a work session or homework — is an Education item, so it's always
// your School category color (item.col, set by EducationView), not whatever category
// the underlying task happens to carry. Only ever shown inside "Today," so there's no
// date or "Due today" badge to repeat — just what it is, and a time if it has one.
export default function WorkItemRow({ item }) {
  const col = item.col;
  const tinted = !item.done;
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, marginBottom: 10, background: "#fff", border: `1px solid ${tinted ? col.border : "#EDEDED"}` }}>
      <Checkbox checked={item.done} onClick={item.onToggleDone} color={col} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.onFocus ? (
          <button onClick={item.onFocus} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, fontSize: 13.5, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1, color: "#000000" }}>{item.title}</button>
        ) : (
          <div style={{ fontSize: 13.5, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>{item.title}</div>
        )}
        {item.subtitle && <div style={{ fontSize: 10.5, color: "#93A0AD" }}>{item.subtitle}</div>}
      </div>
      {item.timeLabel && <div style={{ fontSize: 10.5, color: "#93A0AD", whiteSpace: "nowrap" }}>{item.timeLabel}</div>}
      {confirmDelete ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => item.onRemove("one")} style={{ ...ghostBtn, fontSize: 10.5, padding: "4px 8px" }}>This one</button>
          <button onClick={() => item.onRemove("following")} style={{ ...ghostBtn, fontSize: 10.5, padding: "4px 8px" }}>+ following</button>
          <button onClick={() => setConfirmDelete(false)} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: "#93A0AD", fontSize: 14, padding: "0 2px" }}>×</button>
        </div>
      ) : (
        <button onClick={() => (item.hasFollowing ? setConfirmDelete(true) : item.onRemove("one"))} className="btn-delete" style={deleteBtn}>×</button>
      )}
    </div>
  );
}
