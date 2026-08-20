import { useState } from "react";
import { Plus } from "lucide-react";
import { CATEGORY_KEYS, EDU_TYPE_COLORS } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { deleteBtn, inputStyle } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import Swatch from "../shared/Swatch";
import UrgencyBadge from "../shared/UrgencyBadge";

export default function TaskRow({ t, onToggleDone, onSetCategory, onRemove, showDate, onOpenDetail, onSetDate }) {
  const CATEGORY_COLORS = useCategoryColors();
  const category = t.category || "Personal";
  const col = CATEGORY_COLORS[category] || CATEGORY_COLORS.Personal;
  const tinted = !t.done;
  const [editingDate, setEditingDate] = useState(false);

  const cycleCategory = () => {
    if (!onSetCategory) return;
    const i = CATEGORY_KEYS.indexOf(category);
    onSetCategory(t.id, CATEGORY_KEYS[(i + 1) % CATEGORY_KEYS.length]);
  };

  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 6, background: "#fff", border: `1.5px solid ${tinted ? col.border : "#EDEDED"}` }}>
      <Checkbox checked={t.done} onClick={() => onToggleDone(t.id, !t.done)} color={col} />
      <button onClick={cycleCategory} title={`${category} — click to change category`} style={{ background: "none", border: "none", padding: 0, cursor: onSetCategory ? "pointer" : "default" }}>
        <Swatch color={col} />
      </button>
      <button onClick={() => onOpenDetail(t.id)} title="Click to see full name and edit" style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1, fontSize: 14, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</button>
      {t.eduId && <div style={{ fontSize: 10, color: EDU_TYPE_COLORS.Assignment.text, background: EDU_TYPE_COLORS.Assignment.bg, padding: "2px 6px", borderRadius: 5 }}>from Education</div>}
      {showDate && t.date && <UrgencyBadge iso={t.date} done={t.done} />}
      {showDate && editingDate ? (
        <input
          type="date"
          autoFocus
          value={t.date || ""}
          onChange={(e) => { onSetDate(t.id, e.target.value); setEditingDate(false); }}
          onBlur={() => setEditingDate(false)}
          style={{ ...inputStyle, width: 130, fontSize: 11.5, padding: "3px 6px" }}
        />
      ) : showDate && t.date ? (
        <div onClick={() => setEditingDate(true)} title="Click to change date" style={{ fontSize: 12, color: "#93A0AD", cursor: "pointer" }}>{t.date}</div>
      ) : showDate ? (
        <button
          onClick={() => setEditingDate(true)}
          title="Add a due date"
          style={{
            display: "inline-flex", alignItems: "center", gap: 3, background: "#fff", border: "1.5px dashed #D1D5DB",
            borderRadius: 999, padding: "3px 9px 3px 6px", fontSize: 11.5, fontWeight: 700, color: "#93A0AD", cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
          Add date
        </button>
      ) : null}
      <button onClick={() => onRemove(t.id)} className="btn-delete" style={deleteBtn}>×</button>
    </div>
  );
}
