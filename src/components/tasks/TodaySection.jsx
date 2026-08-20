import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { cardStyle, serifFont } from "../../lib/constants";
import { toISO } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";

// A deliberately calm, low-chrome view of just today's tasks — no category cycling, no
// delete buttons, no due-date math, nothing but a checkbox and a title. The full Tasks
// list further down still has all the editing controls; this is just the at-a-glance one.
export default function TodaySection({ tasks, onToggleDone, onOpenDetail }) {
  const CATEGORY_COLORS = useCategoryColors();
  const todayISO = toISO(new Date());
  const todaysTasks = tasks.filter((t) => t.date === todayISO);
  const remaining = todaysTasks.filter((t) => !t.done);
  const done = todaysTasks.filter((t) => t.done);
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ ...cardStyle, padding: "26px 28px", marginBottom: 22, boxShadow: "0 4px 18px rgba(15,23,42,0.04)" }}>
      <div style={{ fontFamily: serifFont, fontSize: 26, fontWeight: 500, color: "#000000" }}>Today</div>
      <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 20 }}>{dateLabel}</div>

      {todaysTasks.length === 0 ? (
        <div style={{ fontSize: 15, color: "#B4BCC5", padding: "8px 0 4px" }}>Nothing due today.</div>
      ) : remaining.length === 0 ? (
        <div style={{ fontSize: 15, color: "#8FCBA3", padding: "8px 0 4px" }}>All done for today — nice work.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {remaining.map((t) => {
            const col = CATEGORY_COLORS[t.category || "Personal"] || CATEGORY_COLORS.Personal;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Checkbox checked={false} onClick={() => onToggleDone(t.id, true)} color={col} />
                <button
                  onClick={() => onOpenDetail(t.id)}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, fontSize: 16.5, fontWeight: 500, color: "#000000" }}
                >
                  {t.title}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {done.length > 0 && remaining.length > 0 && (
        <div style={{ fontSize: 12, color: "#B4BCC5", marginTop: 16 }}>+{done.length} already done today</div>
      )}
    </div>
  );
}
