import { CATEGORY_KEYS, EDU_TYPE_COLORS, TASK_COLOR } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { deleteBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import Swatch from "../shared/Swatch";
import UrgencyBadge from "../shared/UrgencyBadge";

export default function TaskRow({ t, onToggleDone, onSetCategory, onRemove, showDate, onOpenFocus }) {
  const CATEGORY_COLORS = useCategoryColors();
  const category = t.category || "Personal";
  const col = CATEGORY_COLORS[category] || CATEGORY_COLORS.Personal;
  const tinted = !t.done;

  const cycleCategory = () => {
    if (!onSetCategory) return;
    const i = CATEGORY_KEYS.indexOf(category);
    onSetCategory(t.id, CATEGORY_KEYS[(i + 1) % CATEGORY_KEYS.length]);
  };

  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 6, background: tinted ? col.bg : "#fff", border: `1px solid ${tinted ? col.border : "#EDEDED"}` }}>
      <Checkbox checked={t.done} onClick={() => onToggleDone(t.id, !t.done)} color={TASK_COLOR} />
      <button onClick={cycleCategory} title={`${category} — click to change category`} style={{ background: "none", border: "none", padding: 0, cursor: onSetCategory ? "pointer" : "default" }}>
        <Swatch color={col} />
      </button>
      <button onClick={() => onOpenFocus(t.id, t.title)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1, fontSize: 14, color: "#000000" }}>{t.title}</button>
      {t.eduId && <div style={{ fontSize: 10, color: EDU_TYPE_COLORS.Assignment.text, background: EDU_TYPE_COLORS.Assignment.bg, padding: "2px 6px", borderRadius: 5 }}>from Education</div>}
      {showDate && <UrgencyBadge iso={t.date} done={t.done} />}
      {showDate && <div style={{ fontSize: 12, color: "#93A0AD" }}>{t.date}</div>}
      <button onClick={() => onRemove(t.id)} className="btn-delete" style={deleteBtn}>×</button>
    </div>
  );
}
