import { EDU_TYPE_COLORS, cardStyle, serifFont } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { addMonths, monthLabel, monthMatrix, toISO } from "../../lib/dateHelpers";
import { ghostBtn } from "../../lib/styles";

const DOTS_SHOWN = 4;

// A zoomed-out month grid — deliberately light on detail. Only events and things that
// are actually due (goal deadlines/milestones, education items) show up as small dots;
// tasks and small actions are left off since at this zoom level they'd just be noise.
// Click a day to jump into Day view for it.
export default function MonthView({ monthDate, setMonthDate, events, dueChips, onSelectDay, onExitMonth }) {
  const CATEGORY_COLORS = useCategoryColors();
  const todayISO = toISO(new Date());
  const cells = monthMatrix(monthDate);

  const dotColor = (item) => {
    if (item.kind === "event") return CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal;
    if (item.kind === "goal-deadline" || item.kind === "goal-milestone") return CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal;
    if (item.kind === "edu") return EDU_TYPE_COLORS[item.type] || EDU_TYPE_COLORS.Homework;
    return CATEGORY_COLORS.Personal;
  };
  const dotLabel = (item) => {
    if (item.kind === "goal-deadline") return `Goal due: ${item.title}`;
    if (item.kind === "goal-milestone") return `Milestone: ${item.title}`;
    if (item.kind === "edu") return `${item.title}${item.subject ? ` (${item.subject})` : ""}`;
    return item.title;
  };

  const itemsForDay = (iso) => {
    const dueOnly = dueChips.filter((c) => c.date === iso && c.kind !== "task" && c.kind !== "goal");
    const eventsOnly = events.filter((e) => e.date === iso).map((e) => ({ kind: "event", title: e.title, category: e.category }));
    return [...eventsOnly, ...dueOnly];
  };

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: serifFont, fontSize: 22, fontWeight: 700 }}>{monthLabel(monthDate)}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={onExitMonth} className="btn-ghost" style={ghostBtn}>Week</button>
          <button onClick={() => setMonthDate(new Date())} className="btn-ghost" style={ghostBtn}>Today</button>
          <button onClick={() => setMonthDate(addMonths(monthDate, -1))} className="btn-ghost" style={ghostBtn}>‹</button>
          <button onClick={() => setMonthDate(addMonths(monthDate, 1))} className="btn-ghost" style={ghostBtn}>›</button>
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "1px solid #EDF0F3", flexShrink: 0 }}>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
            <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 10.5, color: "#9CA3AF", fontWeight: 700, letterSpacing: 0.6 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gridTemplateRows: "repeat(6, minmax(0, 1fr))", flex: 1, minHeight: 0 }}>
          {cells.map(({ date, inMonth }) => {
            const iso = toISO(date);
            const isToday = iso === todayISO;
            const items = itemsForDay(iso);
            const shown = items.slice(0, DOTS_SHOWN);
            const extra = items.length - shown.length;
            return (
              <button
                key={iso}
                onClick={() => onSelectDay(iso)}
                style={{
                  border: "1px solid #F4F6F8", background: "none", textAlign: "left", padding: "6px 6px",
                  display: "flex", flexDirection: "column", gap: 3, cursor: "pointer", minWidth: 0, minHeight: 0,
                  opacity: inMonth ? 1 : 0.4,
                }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 700, width: 22, height: 22, lineHeight: "22px", textAlign: "center", borderRadius: "50%",
                  background: isToday ? "var(--primary, #7B6EF0)" : "transparent", color: isToday ? "#fff" : "#000000", flexShrink: 0,
                }}>{date.getDate()}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  {shown.map((it, i) => {
                    const col = dotColor(it);
                    return (
                      <div key={i} title={dotLabel(it)} style={{
                        fontSize: 9.5, fontWeight: 600, padding: "1px 5px", borderRadius: 5, color: col.text, background: col.bg, border: `1px solid ${col.border}`,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%",
                      }}>
                        {dotLabel(it)}
                      </div>
                    );
                  })}
                  {extra > 0 && <div style={{ fontSize: 9.5, color: "#B4BCC5", fontWeight: 600 }}>+{extra} more</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "#93A0AD", marginTop: 6, flexShrink: 0 }}>Click any day to zoom in. Tasks aren't shown at this zoom level: switch to Day or Week to see them.</div>
    </div>
  );
}
