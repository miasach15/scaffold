import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { CATEGORY_KEYS, EDU_TYPE_COLORS } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { defaultLeadDays, formatShortDate } from "../../lib/dateHelpers";
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
      {t.notes && <FileText size={13} strokeWidth={2.2} color="#B4BCC5" style={{ flexShrink: 0 }} title={`Notes: ${t.notes}`} />}
      {t.eduId && <div style={{ fontSize: 10, color: EDU_TYPE_COLORS.Assignment.text, background: EDU_TYPE_COLORS.Assignment.bg, padding: "2px 6px", borderRadius: 5 }}>from Education</div>}
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
        // One signal, not two — the badge already says "Overdue"/"Due tomorrow"/etc.,
        // so a separate raw date string next to it would just be noise. The exact date
        // is still there on hover, and clicking either lets you change it.
        <button onClick={() => setEditingDate(true)} title={`${formatShortDate(t.date)} — click to change`} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "inline-flex" }}>
          {t.done ? <span style={{ fontSize: 12, color: "#93A0AD" }}>{formatShortDate(t.date)}</span> : <UrgencyBadge iso={t.date} done={t.done} leadDays={defaultLeadDays(t)} />}
        </button>
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
