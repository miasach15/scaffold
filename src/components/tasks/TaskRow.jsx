import { useState } from "react";
import { FileText, Pencil, Plus } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { decimalToTimeInput, decimalToTimeLabel, defaultLeadDays, formatShortDate, getLocalToday, isOverdueTask, timeToDecimal } from "../../lib/dateHelpers";
import { deleteBtn, ghostBtn, inputStyle, noTypeDateProps } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import UrgencyBadge from "../shared/UrgencyBadge";

// Notion-plain by design: a checkbox and the title, nothing decorative competing for
// attention. Category is still there (border tint, and still assignable from Task
// Detail) — it just isn't a separate clickable dot cluttering every row in the list.
// Clicking the title opens the Focus Timer directly (with any notes shown right there
// alongside it) rather than a plain detail view — the pencil icon is the way in to
// actually rename/re-date/edit notes.
//
// Moving a task is just a checkbox (Done) and the date itself — tapping the date opens
// the same native date/time inputs this row already had, updates instantly, no
// confirmation. Both are real 44px targets. Overdue tasks get exactly one more thing: a
// small "Move to today" button, since reaching for the date picker just to pick today's
// date already sitting right there is one tap more than it needs to be — no other task
// gets this button.
export default function TaskRow({ t, onToggleDone, onRemove, showDate, onOpenDetail, onOpenFocus, onSetDate, onSetStart }) {
  const CATEGORY_COLORS = useCategoryColors();
  const category = t.category || "Personal";
  const col = CATEGORY_COLORS[category] || CATEGORY_COLORS.Personal;
  const tinted = !t.done;
  const [editingDate, setEditingDate] = useState(false);
  // Overdue gets zero extra signal here — no badge, no "carried over" wording, not even
  // the app's own muted version of it — same plain date text a done task already gets.
  // The ONLY place "this is overdue" shows at all is the "From earlier" group heading in
  // TodaySection; a row pulled out of that group (or shown in the Tasks list generally)
  // should look identical to any other task.
  const overdue = showDate && isOverdueTask(t);

  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 14, background: "#fff", border: `1px solid ${tinted ? col.border : "#EDEDED"}`, flexWrap: "wrap", rowGap: 8 }}>
      <div style={{ width: 44, height: 44, margin: "-13px 0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Checkbox checked={t.done} onClick={() => onToggleDone(t.id, !t.done)} color={col} />
      </div>
      <button
        onClick={() => (onOpenFocus ? onOpenFocus(t.id, t.title) : onOpenDetail(t.id))}
        title="Click to start a focus session on this"
        style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1, fontSize: 14, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {t.title}
      </button>
      {t.notes && <FileText size={13} strokeWidth={2.2} color="#B4BCC5" style={{ flexShrink: 0 }} title={`Notes: ${t.notes}`} />}
      {onOpenFocus && (
        <button onClick={() => onOpenDetail(t.id)} title="Edit this task" className="hoverable" style={{ background: "none", border: "none", color: "#B4BCC5", cursor: "pointer", padding: 2, display: "flex", flexShrink: 0 }}>
          <Pencil size={13} strokeWidth={2.2} />
        </button>
      )}
      {/* An Education-generated task's own category is already set to the user's actual
          School category (see App.jsx), so `col` above is already that live color —
          no separate hardcoded Education color needed here. */}
      {t.eduId && <div style={{ fontSize: 10, color: col.text, background: col.bg, padding: "2px 6px", borderRadius: 5 }}>from Education</div>}
      {overdue && onSetDate && (
        <button onClick={() => onSetDate(t.id, getLocalToday())} className="hoverable" style={{ ...ghostBtn, minHeight: 44, minWidth: 44, padding: "0 12px", flexShrink: 0 }}>
          Move to today
        </button>
      )}
      {showDate && editingDate ? (
        <div
          // Blur-when-focus-leaves-the-group, not blur-on-either-field — so tabbing from
          // the date into the time input doesn't slam the editor shut before you can use it.
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEditingDate(false); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <input
            type="date"
            autoFocus
            value={t.date || ""}
            onChange={(e) => onSetDate(t.id, e.target.value)}
            {...noTypeDateProps}
            style={{ ...inputStyle, width: 130, fontSize: 11.5, padding: "3px 6px" }}
          />
          {onSetStart && (
            <input
              type="time"
              value={decimalToTimeInput(t.start)}
              onChange={(e) => onSetStart(t.id, e.target.value ? timeToDecimal(e.target.value) : null)}
              title="Optional: a specific time it's due"
              style={{ ...inputStyle, width: 96, fontSize: 11.5, padding: "3px 6px" }}
            />
          )}
        </div>
      ) : showDate && t.date ? (
        // The visual badge/date text stays its normal small size — only the invisible tap
        // zone around it grows to 44px, so this doesn't end up looking like every other
        // row suddenly has an oversized date pill.
        <button
          onClick={() => setEditingDate(true)}
          title={`${formatShortDate(t.date)}${t.start != null ? ` · ${decimalToTimeLabel(t.start)}` : ""} (click to change)`}
          style={{ background: "none", border: "none", padding: "0 4px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44 }}
        >
          {t.done || overdue ? (
            <span style={{ fontSize: 12, color: "#93A0AD" }}>{formatShortDate(t.date)}</span>
          ) : (
            <UrgencyBadge iso={t.date} done={t.done} leadDays={defaultLeadDays(t)} />
          )}
        </button>
      ) : showDate ? (
        <button
          onClick={() => setEditingDate(true)}
          title="Add a due date"
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3, background: "#fff", border: "1.5px dashed #D1D5DB",
            borderRadius: 999, padding: "0 9px 0 6px", minHeight: 44, minWidth: 44, fontSize: 11.5, fontWeight: 700, color: "#93A0AD", cursor: "pointer", whiteSpace: "nowrap",
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
