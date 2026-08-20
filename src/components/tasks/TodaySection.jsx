import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { cardStyle, serifFont } from "../../lib/constants";
import { toISO } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";

// A deliberately calm, low-chrome view of what's on your plate — no category cycling,
// no delete buttons, nothing but a checkbox and a title. A simple task (no due date, or
// a due date that isn't today) keeps showing up here every day, dimmed as "not urgent",
// until you finish it — it doesn't just vanish because today isn't its date. Only things
// tied to a specific day (a step from a "break it down" task, or an Education work
// session) show up here just on that day. The full Tasks list below has all the editing
// controls; this is just the at-a-glance one.
export default function TodaySection({ tasks, onToggleDone, onOpenDetail }) {
  const CATEGORY_COLORS = useCategoryColors();
  const todayISO = toISO(new Date());
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const relevant = tasks.filter((t) => {
    if (t.done) return false;
    if (t.groupId || t.eduId) return t.date === todayISO; // tied to a specific day
    return true; // a simple task — always on your plate until done
  });

  return (
    <div style={{ ...cardStyle, padding: "26px 28px", marginBottom: 22, boxShadow: "0 4px 18px rgba(15,23,42,0.04)" }}>
      <div style={{ fontFamily: serifFont, fontSize: 26, fontWeight: 500, color: "#000000" }}>Today</div>
      <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 20 }}>{dateLabel}</div>

      {relevant.length === 0 ? (
        <div style={{ fontSize: 15, color: "#8FCBA3", padding: "8px 0 4px" }}>Nothing on your plate — nice work.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {relevant.map((t) => {
            const col = CATEGORY_COLORS[t.category || "Personal"] || CATEGORY_COLORS.Personal;
            const overdue = t.date && t.date < todayISO;
            const urgent = overdue || t.date === todayISO;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, opacity: urgent ? 1 : 0.65 }}>
                <Checkbox checked={false} onClick={() => onToggleDone(t.id, true)} color={col} />
                <button
                  onClick={() => onOpenDetail(t.id)}
                  style={{
                    flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0,
                    fontSize: urgent ? 16.5 : 15, fontWeight: urgent ? 500 : 400, color: overdue ? "#B03A3A" : "#000000",
                  }}
                >
                  {t.title}
                </button>
                {!urgent && t.date && <div style={{ fontSize: 11, color: "#B4BCC5", whiteSpace: "nowrap" }}>Due {t.date}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
