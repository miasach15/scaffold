import { useState } from "react";
import { EDU_TYPE_COLORS } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { deleteBtn, ghostBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import Swatch from "../shared/Swatch";
import UrgencyBadge from "../shared/UrgencyBadge";

export default function WorkItemRow({ item }) {
  const CATEGORY_COLORS = useCategoryColors();
  // Session/task rows here are Education-linked work sessions, outlined in whichever
  // category they're actually tagged with (item.category) rather than a fixed task pink.
  const col = item.colorKind === "edu" ? (EDU_TYPE_COLORS[item.eduType] || EDU_TYPE_COLORS.Homework) : (CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal);
  const tinted = !item.done;
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 12, marginBottom: 6, background: item.colorKind === "task" ? "#fff" : (tinted ? col.bg : "#fff"), border: `1.5px solid ${tinted ? col.border : "#EDEDED"}` }}>
      <Checkbox checked={item.done} onClick={item.onToggleDone} color={col} />
      <Swatch color={col} size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.onFocus ? (
          <button onClick={item.onFocus} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, fontSize: 13.5, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1, color: "#000000" }}>{item.title}</button>
        ) : (
          <div style={{ fontSize: 13.5, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>{item.title}</div>
        )}
        {item.subtitle && <div style={{ fontSize: 10.5, color: "#93A0AD" }}>{item.subtitle}</div>}
      </div>
      <UrgencyBadge iso={item.date} done={item.done} />
      <div style={{ fontSize: 10.5, color: "#93A0AD", whiteSpace: "nowrap" }}>{item.dateLabel}</div>
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
