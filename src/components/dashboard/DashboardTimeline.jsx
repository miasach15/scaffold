import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { BORDER, MUTED } from "../../lib/constants";
import { hourLabel } from "../../lib/dateHelpers";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import CalBlock from "../calendar/CalBlock";

// A single hour-ruled day column — the same positioned-block math Calendar's own week
// grid uses (see CalBlock), just one day and a shorter row height. No fixed pixel
// height here: this fills whatever vertical space its own Dashboard column gives it
// (see DashboardView's dedicated "Today" column), auto-scrolled to "now" on mount so
// whatever portion is visible centers around the current time.
const ROW_H = 34;

export default function DashboardTimeline({ timedTasks, events, onOpenFocus, onToggleDone, onEditEvent, onAddTaskAt }) {
  const CATEGORY_COLORS = useCategoryColors();
  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;
  const scrollRef = useRef(null);
  // Which hour slot is showing the inline "type a title, Enter to add" row — clicking
  // any empty hour opens it right there, same click-an-empty-cell convention Calendar's
  // own grid already uses, rather than a separate add-task form living elsewhere.
  const [addingAtHour, setAddingAtHour] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (nowDecimal - 1.5) * ROW_H);
    // Once on mount only — the initial scroll position, not something that should yank
    // the view back to "now" on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAddAt = (hour) => {
    setAddingAtHour(hour);
    setDraftTitle("");
  };
  const commitAdd = () => {
    if (draftTitle.trim()) onAddTaskAt?.(addingAtHour, draftTitle.trim());
    setAddingAtHour(null);
    setDraftTitle("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {onAddTaskAt && (
        <button
          onClick={() => startAddAt(Math.round(nowDecimal))}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 11.5, fontWeight: 600, padding: 0, marginBottom: 6, flexShrink: 0 }}
        >
          <Plus size={12} strokeWidth={2.5} /> Add a time block
        </button>
      )}
      <div ref={scrollRef} style={{ display: "grid", gridTemplateColumns: "40px 1fr", flex: 1, minHeight: 0, overflowY: "auto", borderRadius: 10, border: `1px solid ${BORDER}` }}>
        <div style={{ position: "relative", height: 24 * ROW_H, background: "#FAFAF9" }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{ position: "absolute", top: h * ROW_H - 6, right: 8, fontSize: 9.5, color: "#B4BCC5" }}>
              {h === 0 ? "" : hourLabel(h)}
            </div>
          ))}
        </div>
        <div style={{ position: "relative", height: 24 * ROW_H, borderLeft: `1px solid ${BORDER}` }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              onClick={onAddTaskAt ? () => startAddAt(h) : undefined}
              style={{ position: "absolute", top: h * ROW_H, left: 0, right: 0, height: ROW_H, borderTop: "1px solid #F4F6F8", cursor: onAddTaskAt ? "pointer" : "default" }}
            />
          ))}
          {events.map((e) => (
            <CalBlock key={`e-${e.id}`} item={e} color={CATEGORY_COLORS[e.category] || CATEGORY_COLORS.Personal} rowHeight={ROW_H} onEditEvent={onEditEvent} />
          ))}
          {timedTasks.map((t) => (
            <CalBlock
              key={`t-${t.id}`}
              item={t}
              color={CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal}
              rowHeight={ROW_H}
              isTask
              done={t.done}
              onOpenFocus={() => onOpenFocus(t.id, t.title, t.duration)}
              onToggleDone={() => onToggleDone(t.id, true)}
            />
          ))}
          {addingAtHour != null && (
            <div style={{ position: "absolute", top: addingAtHour * ROW_H, left: 3, right: 3, height: ROW_H - 4, zIndex: 6 }} onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") setAddingAtHour(null); }}
                onBlur={commitAdd}
                placeholder={`What's at ${hourLabel(addingAtHour)}?`}
                style={{ width: "100%", height: "100%", boxSizing: "border-box", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "0 8px", fontSize: 11.5, outline: "none" }}
              />
            </div>
          )}
          <div style={{ position: "absolute", top: nowDecimal * ROW_H, left: 0, right: 0, height: 0, zIndex: 5, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#C0685E" }} />
            <div style={{ height: 1.5, background: "#C0685E" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
