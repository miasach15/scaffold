import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { BORDER } from "../../lib/constants";
import { decimalToTimeLabel, formatShortDate } from "../../lib/dateHelpers";
import { inputStyle } from "../../lib/styles";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";
import TaskRow from "./TaskRow";

// A homework/assignment/assessment deadline, shown alongside plain tasks and "break it
// down" groups in the Tasks list so "what's due" is all in one place. Same shape as
// GroupedTaskRow on purpose — click to expand and see (and check off, re-date, or
// remove) the individual work sessions right here, instead of having to leave for the
// Education page just to see what's actually scheduled. The due date/time is its own
// click target, same inline editor GroupedTaskRow uses — moving it reflows the not-done
// sessions (see App.jsx's updateEduDeadline). "Open in Education" stays as a plain link
// for the things that only make sense over there: renaming the deadline itself, AI
// re-planning, deleting it.
export default function EduDeadlineRow({ item, col, sessions, onToggleItemDone, onToggleDone, onSetCategory, onRemove, onOpenDetail, onOpenFocus, onSetDate, onSetStart, onUpdateDeadline, onAddSession, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const [editingDue, setEditingDue] = useState(false);

  return (
    <div>
      <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: "#fff", border: `1px solid ${BORDER}` }}>
        <Checkbox checked={item.done} onClick={() => onToggleItemDone(item.id, !item.done)} color={col} />
        <div style={{ fontSize: 10, color: col.text, background: col.bg, padding: "2px 6px", borderRadius: 5, fontWeight: 700, flexShrink: 0 }}>{item.type}</div>
        <button
          onClick={() => setExpanded((x) => !x)}
          className="expand-toggle"
          style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
        >
          {sessions.length > 0 && (expanded ? <ChevronDown size={15} strokeWidth={2.3} color="#93A0AD" /> : <ChevronRight size={15} strokeWidth={2.3} color="#93A0AD" />)}
          <span style={{ minWidth: 0, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1, fontSize: 14, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.title}{item.subject ? ` (${item.subject})` : ""}
          </span>
        </button>
        {onUpdateDeadline && editingDue ? (
          <div
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEditingDue(false); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <input
              type="date"
              autoFocus
              value={item.dueDate}
              onChange={(e) => e.target.value && onUpdateDeadline(item.id, e.target.value, item.dueStart)}
              style={{ ...inputStyle, width: 130, fontSize: 11.5, padding: "3px 6px" }}
            />
          </div>
        ) : (
          <button
            onClick={() => setEditingDue(true)}
            title={`${formatShortDate(item.dueDate)}${item.dueStart != null ? ` · ${decimalToTimeLabel(item.dueStart)}` : ""} (click to change)`}
            style={{ background: "none", border: "none", padding: 0, cursor: onUpdateDeadline ? "pointer" : "default", display: "inline-flex" }}
            disabled={!onUpdateDeadline}
          >
            <UrgencyBadge iso={item.dueDate} done={item.done} leadDays={2} />
          </button>
        )}
      </div>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, marginLeft: 22 }}>
          {sessions.map((t) => (
            <TaskRow key={t.id} t={t} onToggleDone={onToggleDone} onSetCategory={onSetCategory} onRemove={onRemove} onOpenDetail={onOpenDetail} onOpenFocus={onOpenFocus} onSetDate={onSetDate} onSetStart={onSetStart} showDate />
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onAddSession && (
              <button
                onClick={onAddSession}
                className="hoverable"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px dashed #D1D5DB",
                  borderRadius: 999, padding: "5px 11px 5px 8px", fontSize: 11.5, fontWeight: 700, color: "#7B8794", cursor: "pointer", marginTop: 2,
                }}
              >
                <Plus size={12} strokeWidth={2.5} /> Add session
              </button>
            )}
            {onOpen && <button onClick={onOpen} style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, color: "#93A0AD", textDecoration: "underline", cursor: "pointer" }}>Open in Education</button>}
          </div>
        </div>
      )}
    </div>
  );
}
