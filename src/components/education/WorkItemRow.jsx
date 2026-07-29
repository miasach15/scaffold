import { EDU_TYPE_COLORS, PRIORITY_COLORS, TASK_COLOR } from "../../lib/constants";
import { deleteBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import Swatch from "../shared/Swatch";
import UrgencyBadge from "../shared/UrgencyBadge";

export default function WorkItemRow({ item }) {
  const col = item.colorKind === "edu" ? (EDU_TYPE_COLORS[item.eduType] || EDU_TYPE_COLORS.Homework) : TASK_COLOR;
  const tinted = !item.done;
  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 12, marginBottom: 6, background: tinted ? col.bg : "#fff", border: `1px solid ${tinted ? col.border : "#EDEDED"}` }}>
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
      {item.priority && item.priority !== "Low" && !item.done && (
        <div style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[item.priority].text, background: "rgba(255,255,255,0.6)", border: `1px solid ${PRIORITY_COLORS[item.priority].border}`, padding: "2px 7px", borderRadius: 999 }}>{item.priority}</div>
      )}
      <UrgencyBadge iso={item.date} done={item.done} />
      <div style={{ fontSize: 10.5, color: "#93A0AD", whiteSpace: "nowrap" }}>{item.dateLabel}</div>
      <button onClick={item.onRemove} className="btn-delete" style={deleteBtn}>×</button>
    </div>
  );
}
