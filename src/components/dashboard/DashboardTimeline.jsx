import { useEffect, useRef } from "react";
import { BORDER } from "../../lib/constants";
import { hourLabel } from "../../lib/dateHelpers";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import CalBlock from "../calendar/CalBlock";

// A compact, scrollable hour-ruled day column — the same positioned-block math Calendar's
// own week grid uses (see CalBlock), just a single day, a shorter row height, and a fixed
// viewport that auto-scrolls to "now" instead of showing the whole 24 hours at once.
const ROW_H = 34;
const GRID_HEIGHT = 280;

export default function DashboardTimeline({ timedTasks, events, onOpenFocus, onToggleDone, onEditEvent }) {
  const CATEGORY_COLORS = useCategoryColors();
  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (nowDecimal - 1.5) * ROW_H);
    // Once on mount only — the initial scroll position, not something that should yank
    // the view back to "now" on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={scrollRef} style={{ display: "grid", gridTemplateColumns: "44px 1fr", height: GRID_HEIGHT, overflowY: "auto", borderRadius: 10, border: `1px solid ${BORDER}` }}>
      <div style={{ position: "relative", height: 24 * ROW_H, background: "#FAFAF9" }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ position: "absolute", top: h * ROW_H - 6, right: 8, fontSize: 9.5, color: "#B4BCC5" }}>
            {h === 0 ? "" : hourLabel(h)}
          </div>
        ))}
      </div>
      <div style={{ position: "relative", height: 24 * ROW_H, borderLeft: `1px solid ${BORDER}` }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ position: "absolute", top: h * ROW_H, left: 0, right: 0, height: ROW_H, borderTop: "1px solid #F4F6F8" }} />
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
        <div style={{ position: "absolute", top: nowDecimal * ROW_H, left: 0, right: 0, height: 0, zIndex: 5, pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#C0685E" }} />
          <div style={{ height: 1.5, background: "#C0685E" }} />
        </div>
      </div>
    </div>
  );
}
