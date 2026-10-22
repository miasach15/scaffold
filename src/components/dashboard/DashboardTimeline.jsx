import { Plus } from "lucide-react";
import { useState } from "react";
import { BORDER, MUTED } from "../../lib/constants";
import { hourLabel } from "../../lib/dateHelpers";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import CalBlock from "../calendar/CalBlock";

// Three 8-hour columns side by side instead of one scrollable 24-hour column — the whole
// day visible at once, no scrolling to see the evening. Same positioned-block math
// Calendar's own week grid uses (see CalBlock), just narrower per column and with an
// hourOffset so a block's "top" is relative to its own column's start hour, not midnight.
const ROW_H = 34;
const HOURS_PER_COL = 8;
const COLUMN_STARTS = [0, 8, 16];

export default function DashboardTimeline({ timedTasks, events, onOpenFocus, onToggleDone, onEditEvent, onAddTaskAt }) {
  const CATEGORY_COLORS = useCategoryColors();
  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;
  // Which hour slot is showing the inline "type a title, Enter to add" row — clicking
  // any empty hour opens it right there, same click-an-empty-cell convention Calendar's
  // own grid already uses, rather than a separate add-task form living elsewhere.
  const [addingAtHour, setAddingAtHour] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");

  const startAddAt = (hour) => {
    setAddingAtHour(hour);
    setDraftTitle("");
  };
  const commitAdd = () => {
    if (draftTitle.trim()) onAddTaskAt?.(addingAtHour, draftTitle.trim());
    setAddingAtHour(null);
    setDraftTitle("");
  };

  const colFor = (hour) => Math.min(COLUMN_STARTS.length - 1, Math.floor(hour / HOURS_PER_COL));

  return (
    <div>
      {onAddTaskAt && (
        <button
          onClick={() => startAddAt(Math.round(nowDecimal))}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 11.5, fontWeight: 600, padding: 0, marginBottom: 6 }}
        >
          <Plus size={12} strokeWidth={2.5} /> Add a time block
        </button>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        {COLUMN_STARTS.map((colStart) => {
          const colHours = Array.from({ length: HOURS_PER_COL }, (_, i) => colStart + i);
          const colEvents = events.filter((e) => colFor(e.start) === colFor(colStart));
          const colTasks = timedTasks.filter((t) => colFor(t.start) === colFor(colStart));
          const nowInCol = nowDecimal >= colStart && nowDecimal < colStart + HOURS_PER_COL;
          return (
            <div
              key={colStart}
              style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "26px 1fr", height: HOURS_PER_COL * ROW_H, borderRadius: 10, border: `1px solid ${BORDER}` }}
            >
              <div style={{ position: "relative", background: "#FAFAF9", borderRadius: "10px 0 0 10px" }}>
                {colHours.map((h) => (
                  <div key={h} style={{ position: "absolute", top: (h - colStart) * ROW_H - 6, right: 3, fontSize: 8.5, color: "#B4BCC5" }}>
                    {hourLabel(h).replace(/\s?[AP]M$/i, "")}
                  </div>
                ))}
              </div>
              <div style={{ position: "relative", borderLeft: `1px solid ${BORDER}` }}>
                {colHours.map((h) => (
                  <div
                    key={h}
                    onClick={onAddTaskAt ? () => startAddAt(h) : undefined}
                    style={{ position: "absolute", top: (h - colStart) * ROW_H, left: 0, right: 0, height: ROW_H, borderTop: "1px solid #F4F6F8", cursor: onAddTaskAt ? "pointer" : "default" }}
                  />
                ))}
                {colEvents.map((e) => (
                  <CalBlock key={`e-${e.id}`} item={e} color={CATEGORY_COLORS[e.category] || CATEGORY_COLORS.Personal} rowHeight={ROW_H} hourOffset={colStart} onEditEvent={onEditEvent} />
                ))}
                {colTasks.map((t) => (
                  <CalBlock
                    key={`t-${t.id}`}
                    item={t}
                    color={CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal}
                    rowHeight={ROW_H}
                    hourOffset={colStart}
                    isTask
                    done={t.done}
                    onOpenFocus={() => onOpenFocus(t.id, t.title, t.duration)}
                    onToggleDone={() => onToggleDone(t.id, true)}
                  />
                ))}
                {addingAtHour != null && colFor(addingAtHour) === colFor(colStart) && (
                  <div style={{ position: "absolute", top: (addingAtHour - colStart) * ROW_H, left: 3, right: 3, height: ROW_H - 4, zIndex: 6 }} onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") setAddingAtHour(null); }}
                      onBlur={commitAdd}
                      placeholder={`At ${hourLabel(addingAtHour)}?`}
                      style={{ width: "100%", height: "100%", boxSizing: "border-box", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "0 6px", fontSize: 10.5, outline: "none" }}
                    />
                  </div>
                )}
                {nowInCol && (
                  <div style={{ position: "absolute", top: (nowDecimal - colStart) * ROW_H, left: 0, right: 0, height: 0, zIndex: 5, pointerEvents: "none" }}>
                    <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#C0685E" }} />
                    <div style={{ height: 1.5, background: "#C0685E" }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
