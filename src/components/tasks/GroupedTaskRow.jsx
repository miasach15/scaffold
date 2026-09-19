import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { decimalToTimeInput, decimalToTimeLabel, formatShortDate, timeToDecimal } from "../../lib/dateHelpers";
import { inputStyle } from "../../lib/styles";
import UrgencyBadge from "../shared/UrgencyBadge";
import TaskRow from "./TaskRow";

// A "break it down" task collapses to one row here — the Tasks list should show one
// task, not one row per day you're working on it. Click to expand and see (and check
// off) the individual steps, each still showing its own date. The overall due date/time
// is its own click target (not the expand toggle) — click it to change it, same native
// date/time inputs every other due-date editor in the app uses; the not-done steps
// automatically reflow to the new date (see TasksView's reflowGroupDueDate).
export default function GroupedTaskRow({ groupTitle, groupDueDate, groupDueStart, remainingItems, doneCount, total, onToggleDone, onSetCategory, onRemove, onOpenDetail, onOpenFocus, onSetDate, onSetStart, onSetGroupDeadline, onAddStep }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [expanded, setExpanded] = useState(false);
  const [editingDue, setEditingDue] = useState(false);
  const category = remainingItems[0]?.category || "Personal";
  const col = CATEGORY_COLORS[category] || CATEGORY_COLORS.Personal;
  const allDone = doneCount >= total;

  return (
    <div>
      <div
        className="hoverable"
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, width: "100%",
          background: "#fff", border: `1px solid ${col.border}`,
        }}
      >
        <button
          onClick={() => setExpanded((x) => !x)}
          className="expand-toggle"
          style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
        >
          {expanded ? <ChevronDown size={15} strokeWidth={2.3} color="#93A0AD" /> : <ChevronRight size={15} strokeWidth={2.3} color="#93A0AD" />}
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "#000000", textDecoration: allDone ? "line-through" : "none", opacity: allDone ? 0.5 : 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{groupTitle}</div>
        </button>
        {onSetGroupDeadline && editingDue ? (
          <div
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEditingDue(false); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <input
              type="date"
              autoFocus
              value={groupDueDate || ""}
              onChange={(e) => e.target.value && onSetGroupDeadline(e.target.value, groupDueStart)}
              style={{ ...inputStyle, width: 130, fontSize: 11.5, padding: "3px 6px" }}
            />
            <input
              type="time"
              value={decimalToTimeInput(groupDueStart)}
              onChange={(e) => onSetGroupDeadline(groupDueDate, e.target.value ? timeToDecimal(e.target.value) : null)}
              title="Optional: a specific time it's due"
              style={{ ...inputStyle, width: 96, fontSize: 11.5, padding: "3px 6px" }}
            />
          </div>
        ) : (
          groupDueDate && !allDone && (
            <button
              onClick={() => setEditingDue(true)}
              title={`${formatShortDate(groupDueDate)}${groupDueStart != null ? ` · ${decimalToTimeLabel(groupDueStart)}` : ""} (click to change)`}
              style={{ background: "none", border: "none", padding: 0, cursor: onSetGroupDeadline ? "pointer" : "default", display: "inline-flex" }}
              disabled={!onSetGroupDeadline}
            >
              <UrgencyBadge iso={groupDueDate} done={false} leadDays={2} />
            </button>
          )
        )}
        <div style={{ fontSize: 11, color: "#93A0AD", whiteSpace: "nowrap" }}>{doneCount}/{total} steps done</div>
      </div>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, marginLeft: 22 }}>
          {remainingItems.map((t) => (
            <TaskRow key={t.id} t={t} onToggleDone={onToggleDone} onSetCategory={onSetCategory} onRemove={onRemove} onOpenDetail={onOpenDetail} onOpenFocus={onOpenFocus} onSetDate={onSetDate} onSetStart={onSetStart} showDate />
          ))}
          {onAddStep && (
            <button
              onClick={onAddStep}
              className="hoverable"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start", background: "#fff", border: "1.5px dashed #D1D5DB",
                borderRadius: 999, padding: "5px 11px 5px 8px", fontSize: 11.5, fontWeight: 700, color: "#7B8794", cursor: "pointer", marginTop: 2,
              }}
            >
              <Plus size={12} strokeWidth={2.5} /> Add step
            </button>
          )}
        </div>
      )}
    </div>
  );
}
