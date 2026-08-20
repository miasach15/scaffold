import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { EDU_TYPE_COLORS, cardStyle, serifFont } from "../../lib/constants";
import { daysUntil, defaultLeadDays, inLeadWindow, toISO } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";

// A deliberately calm, low-chrome view of what's on your plate — no category cycling,
// no delete buttons, nothing but a checkbox and a title. Three ways a task ends up here:
//   1. No due date at all — persists every day, dimmed as "not urgent", until you finish it.
//   2. A due date, and either "days needed" (leadDays) or nothing at all (defaults to a
//      2-day window — see defaultLeadDays) — persists every day too, dimmed until today
//      falls within that window, then flips to a bold "Urgent" state.
//   3. A step from a "break it down" task, an Education work session, or a homework/
//      assignment/test deadline — only shows up once that date arrives (today or
//      overdue), not before; these already have their own per-day/per-deadline scheduling.
// The full Tasks list below has all the editing controls; this is just the glance one.
export default function TodaySection({ tasks, onToggleDone, onOpenDetail, eduItems, onSetEduDone, onGoToEducation }) {
  const CATEGORY_COLORS = useCategoryColors();
  const todayISO = toISO(new Date());
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const taskItems = tasks
    .filter((t) => !t.done && (!t.date || defaultLeadDays(t) || t.date <= todayISO))
    .map((t) => ({
      id: t.id, title: t.title, date: t.date, leadDays: defaultLeadDays(t),
      col: CATEGORY_COLORS[t.category || "Personal"] || CATEGORY_COLORS.Personal,
      onToggle: () => onToggleDone(t.id, true), onOpen: () => onOpenDetail(t.id),
    }));

  const eduDeadlineItems = (eduItems || [])
    .filter((e) => !e.done && e.dueDate && e.dueDate <= todayISO)
    .map((e) => ({ id: `edu-${e.id}`, title: e.title, date: e.dueDate, leadDays: null, col: EDU_TYPE_COLORS[e.type] || EDU_TYPE_COLORS.Homework, onToggle: () => onSetEduDone(e.id, true), onOpen: onGoToEducation }));

  // Overdue and due-soonest first; anything with no due date (a plain reminder that has
  // no "day it's due" to sort by) sinks to the bottom instead of interrupting the order.
  const relevant = [...taskItems, ...eduDeadlineItems].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return (
    <div style={{ ...cardStyle, padding: "26px 28px", marginBottom: 22, boxShadow: "0 4px 18px rgba(15,23,42,0.04)" }}>
      <div style={{ fontFamily: serifFont, fontSize: 26, fontWeight: 500, color: "#000000" }}>Today</div>
      <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 20 }}>{dateLabel}</div>

      {relevant.length === 0 ? (
        <div style={{ fontSize: 15, color: "#8FCBA3", padding: "8px 0 4px" }}>Nothing on your plate — nice work.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {relevant.map((it) => {
            const overdue = it.date && it.date < todayISO;
            const dueToday = it.date === todayISO;
            const urgent = inLeadWindow(it.date, it.leadDays, false);
            const waitingOnWindow = it.date && it.leadDays && !overdue && !dueToday && !urgent; // has a date+leadDays but the window hasn't opened yet
            const active = overdue || dueToday || urgent; // full-priority state
            let tagLabel = null;
            if (overdue) tagLabel = "Overdue";
            else if (urgent && !dueToday) tagLabel = `Urgent — ${daysUntil(it.date)}d left`;
            return (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 14, opacity: active ? 1 : 0.65 }}>
                <Checkbox checked={false} onClick={it.onToggle} color={it.col} />
                <button
                  onClick={it.onOpen}
                  style={{
                    flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0,
                    fontSize: active ? 16.5 : 15, fontWeight: active ? 500 : 400,
                    color: overdue ? "#B03A3A" : urgent ? "#B0631F" : "#000000",
                  }}
                >
                  {it.title}
                </button>
                {tagLabel && (
                  <div style={{ fontSize: 11, color: overdue ? "#B03A3A" : "#B0631F", whiteSpace: "nowrap", fontWeight: 700 }}>{tagLabel}</div>
                )}
                {waitingOnWindow && (
                  <div style={{ fontSize: 11, color: "#B4BCC5", whiteSpace: "nowrap" }}>due {it.date}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
