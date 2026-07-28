import { EDU_TYPE_COLORS, PRIORITY_COLORS, TASK_COLOR } from "../../lib/constants";
import { deleteBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import Swatch from "../shared/Swatch";
import UrgencyBadge from "../shared/UrgencyBadge";

export default function TaskRow({ t, onToggleDone, onRemove, showDate, onOpenFocus }) {
  const priority = t.priority || "Low";
  const col = priority !== "Low" ? PRIORITY_COLORS[priority] : TASK_COLOR;
  const tinted = priority !== "Low" && !t.done;
  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 6, background: tinted ? col.bg : "#fff", border: `1px solid ${tinted ? col.border : "#F1EEE9"}` }}>
      <Checkbox checked={t.done} onClick={() => onToggleDone(t.id)} color={TASK_COLOR} />
      <Swatch color={col} />
      <button onClick={() => onOpenFocus(t.id, t.title)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1, fontSize: 14, color: "#000000" }}>{t.title}</button>
      {t.eduId && <div style={{ fontSize: 10, color: EDU_TYPE_COLORS.Assignment.text, background: EDU_TYPE_COLORS.Assignment.bg, padding: "2px 6px", borderRadius: 5 }}>from Education</div>}
      {showDate && <UrgencyBadge iso={t.date} done={t.done} />}
      {showDate && <div style={{ fontSize: 12, color: "#93A0AD" }}>{t.date}</div>}
      <button onClick={() => onRemove(t.id)} className="btn-delete" style={deleteBtn}>×</button>
    </div>
  );
}
