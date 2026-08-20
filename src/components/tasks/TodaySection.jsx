import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { EDU_TYPE_COLORS, cardStyle, serifFont } from "../../lib/constants";
import { toISO } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";

// A deliberately calm, low-chrome view of what's on your plate — no category cycling,
// no delete buttons, nothing but a checkbox and a title. Only a task with NO due date at
// all persists here every day, dimmed as "not urgent", until you finish it. Anything with
// an actual date — a plain task, a step from a "break it down" task, an Education work
// session, a homework/assignment/test deadline — only shows up here once that date
// arrives (today or overdue), not before. The full Tasks list below has all the editing
// controls; this is just the glance one.
export default function TodaySection({ tasks, onToggleDone, onOpenDetail, eduItems, onSetEduDone, onGoToEducation }) {
  const CATEGORY_COLORS = useCategoryColors();
  const todayISO = toISO(new Date());
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const taskItems = tasks
    .filter((t) => !t.done && (!t.date || t.date <= todayISO))
    .map((t) => ({ id: t.id, title: t.title, date: t.date, col: CATEGORY_COLORS[t.category || "Personal"] || CATEGORY_COLORS.Personal, onToggle: () => onToggleDone(t.id, true), onOpen: () => onOpenDetail(t.id) }));

  const eduDeadlineItems = (eduItems || [])
    .filter((e) => !e.done && e.dueDate && e.dueDate <= todayISO)
    .map((e) => ({ id: `edu-${e.id}`, title: e.title, date: e.dueDate, col: EDU_TYPE_COLORS[e.type] || EDU_TYPE_COLORS.Homework, onToggle: () => onSetEduDone(e.id, true), onOpen: onGoToEducation }));

  const relevant = [...taskItems, ...eduDeadlineItems];

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
            const hasDate = !!it.date; // dated items shown here are always due today or overdue
            return (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 14, opacity: hasDate ? 1 : 0.65 }}>
                <Checkbox checked={false} onClick={it.onToggle} color={it.col} />
                <button
                  onClick={it.onOpen}
                  style={{
                    flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0,
                    fontSize: hasDate ? 16.5 : 15, fontWeight: hasDate ? 500 : 400, color: overdue ? "#B03A3A" : "#000000",
                  }}
                >
                  {it.title}
                </button>
                {overdue && <div style={{ fontSize: 11, color: "#B03A3A", whiteSpace: "nowrap", fontWeight: 600 }}>Overdue</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
