import { useEffect, useRef } from "react";
import { EDU_TYPE_COLORS, PRIMARY, ROW_H, TASK_COLOR, cardStyle, serifFont } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { addDays, dayLabel, dateLabel, monthLabel, hourLabel, startOfWeek, toISO } from "../../lib/dateHelpers";
import CalBlock from "./CalBlock";
import StripRow from "./StripRow";
import { ghostBtn } from "../../lib/styles";

export default function CalendarView({ days, weekStart, setWeekStart, dayView, onSetDayView, onEnterMonth, events, tasks, dueChips, onCellClick, onToggleTask, onChipClick, onOpenTaskDetail, onRescheduleTask, onEditEvent }) {
  const CATEGORY_COLORS = useCategoryColors();
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 6 * ROW_H;
  }, []);

  const todayISO = toISO(new Date());
  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;

  const chipStyle = (chip) => {
    if (chip.kind === "goal-deadline" || chip.kind === "goal-milestone") {
      const c = CATEGORY_COLORS[chip.category] || CATEGORY_COLORS.Personal;
      return { bg: c.border, border: c.border, text: "#fff" };
    }
    if (chip.kind === "edu") return EDU_TYPE_COLORS[chip.type] || EDU_TYPE_COLORS.Homework;
    if (chip.kind === "event") return CATEGORY_COLORS[chip.category] || CATEGORY_COLORS.Personal;
    // "goal" (small actions) and "task" chips: colored outline only, by category, no fill
    if (chip.kind === "goal" || chip.kind === "task") {
      const c = CATEGORY_COLORS[chip.category] || CATEGORY_COLORS.Personal;
      return { ...c, bg: "#fff" };
    }
    return { ...TASK_COLOR, bg: "#fff" };
  };
  const chipLabel = (chip) => {
    if (chip.kind === "goal-deadline") return `Goal due: ${chip.title}`;
    if (chip.kind === "goal-milestone") return chip.title;
    if (chip.kind === "edu") return `${chip.title}${chip.subject ? ` (${chip.subject})` : ""}`;
    return chip.title;
  };
  // A plain task's date IS its due date now, so it belongs in "Due" with everything else
  // that's a deadline (goal deadlines/milestones, Education). The "Tasks" row is reserved
  // for the actual day-to-day doing: a step from a "break it down" task (its date is the
  // day you work on that step, not the project's overall due date) and goal actions
  // (already a concrete "do this on this day" step, not an aggregate deadline).
  const dueChipsOnly = dueChips.filter((c) => c.kind === "goal-deadline" || c.kind === "goal-milestone" || c.kind === "edu" || c.kind === "task-group-due" || (c.kind === "task" && !c.groupId));
  const taskChipsOnly = dueChips.filter((c) => c.kind === "goal" || (c.kind === "task" && c.groupId));
  const allDayEventChips = events.filter((e) => e.start == null).map((e) => ({ id: e.id, kind: "event", title: e.title, date: e.date, done: false, category: e.category }));

  const isDay = !!dayView;
  const goPrev = () => (isDay ? onSetDayView(toISO(addDays(days[0], -1))) : setWeekStart(addDays(weekStart, -7)));
  const goNext = () => (isDay ? onSetDayView(toISO(addDays(days[0], 1))) : setWeekStart(addDays(weekStart, 7)));
  const goToday = () => (isDay ? onSetDayView(todayISO) : setWeekStart(startOfWeek(new Date())));
  const modeBtnStyle = (active) => ({
    ...ghostBtn, padding: "5px 10px", fontSize: 12,
    background: active ? "var(--primary-tint, #E7E3FC)" : "#fff",
    borderColor: active ? "var(--primary, #7B6EF0)" : ghostBtn.border,
    color: active ? "var(--primary-dark, #5849C4)" : ghostBtn.color,
  });

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: serifFont, fontSize: 22, fontWeight: 700 }}>{monthLabel(days[0])}</div>
        <div data-tour="calendar-nav" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => onSetDayView(null)} className="btn-ghost" style={modeBtnStyle(!isDay)}>Week</button>
            <button onClick={() => onSetDayView(dayView || todayISO)} className="btn-ghost" style={modeBtnStyle(isDay)}>Day</button>
            <button onClick={onEnterMonth} className="btn-ghost" style={modeBtnStyle(false)}>Month</button>
          </div>
          <button onClick={goToday} className="btn-ghost" style={ghostBtn}>Today</button>
          <button onClick={goPrev} className="btn-ghost" style={ghostBtn}>‹</button>
          <button onClick={goNext} className="btn-ghost" style={ghostBtn}>›</button>
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* On narrow screens the day grid would get crushed unreadably — this wrapper
            scrolls horizontally as one synced unit (header + strip rows + hourly grid
            all move together) instead of squishing each day column down. */}
        <div style={{ overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ minWidth: isDay ? 320 : 760, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`, borderBottom: "1px solid #EDF0F3", flexShrink: 0 }}>
              <div />
              {days.map((d) => {
                const iso = toISO(d);
                const isToday = iso === todayISO;
                return (
                  <div
                    key={iso}
                    onClick={isDay ? undefined : () => onSetDayView(iso)}
                    title={isDay ? undefined : "Click to zoom into this day"}
                    style={{ padding: "12px 6px", textAlign: "center", borderLeft: "1px solid #F4F6F8", cursor: isDay ? "default" : "pointer" }}
                  >
                    <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: 0.6 }}>{dayLabel(d).toUpperCase()}</div>
                    <div style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, marginTop: 3, width: 32, height: 32, lineHeight: "32px",
                      borderRadius: "50%", margin: "3px auto 0",
                      background: isToday ? PRIMARY : "transparent", color: isToday ? "#fff" : "#000000",
                    }}>{dateLabel(d)}</div>
                  </div>
                );
              })}
            </div>

            <div data-tour="calendar-allday" style={{ flexShrink: 0 }}>
              <StripRow label="All day" days={days} chips={allDayEventChips} chipStyle={chipStyle} chipLabel={chipLabel} onChipClick={(chip) => onEditEvent({ id: chip.id, title: chip.title, date: chip.date, start: null, duration: null, category: chip.category })} onAddClick={(iso) => onCellClick(iso, null)} />
            </div>
            <div data-tour="calendar-due" style={{ flexShrink: 0 }}>
              <StripRow label="Due" days={days} chips={dueChipsOnly} chipStyle={chipStyle} chipLabel={chipLabel} onChipClick={onChipClick} onDropTask={(taskId, iso) => onRescheduleTask(taskId, iso, null)} rollOverdueToToday />
            </div>
            <div data-tour="calendar-tasksrow" style={{ flexShrink: 0 }}>
              <StripRow label="Tasks" days={days} chips={taskChipsOnly} chipStyle={chipStyle} chipLabel={chipLabel} onChipClick={onChipClick} onDropTask={(taskId, iso) => onRescheduleTask(taskId, iso, null)} rollOverdueToToday emphasis />
            </div>

            <div ref={scrollRef} data-tour="calendar-grid" style={{ display: "grid", gridTemplateColumns: `56px 1fr`, flex: 1, minHeight: 0, overflowY: "auto" }}>
              <div style={{ position: "relative", height: 24 * ROW_H }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} style={{ position: "absolute", top: h * ROW_H - 6, right: 8, fontSize: 10.5, color: "#B4BCC5" }}>
                    {h === 0 ? "" : hourLabel(h)}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, position: "relative" }}>
                {days.map((d) => {
                  const iso = toISO(d);
                  return (
                    <div key={iso} style={{ position: "relative", borderLeft: "1px solid #F4F6F8", height: 24 * ROW_H }}>
                      {Array.from({ length: 24 }, (_, h) => (
                        <div
                          key={h}
                          onClick={() => onCellClick(iso, h)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            try {
                              const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
                              if (data.taskId) onRescheduleTask(data.taskId, iso, h);
                            } catch {}
                          }}
                          style={{ position: "absolute", top: h * ROW_H, left: 0, right: 0, height: ROW_H, borderTop: "1px solid #F4F6F8", cursor: "pointer" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFBFC")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        />
                      ))}
                      {events.filter((e) => e.date === iso && e.start != null).map((e) => (
                        <CalBlock key={e.id} item={e} color={CATEGORY_COLORS[e.category] || CATEGORY_COLORS.Personal} onEditEvent={onEditEvent} />
                      ))}
                      {tasks.filter((t) => t.date === iso && t.start != null).map((t) => (
                        <CalBlock key={t.id} item={t} color={{ ...(CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal), bg: "#fff" }} done={t.done} isTask onOpenFocus={() => onOpenTaskDetail(t.id)} onToggleDone={() => onToggleTask(t.id, !t.done)} />
                      ))}
                      {iso === todayISO && (
                        <div style={{ position: "absolute", top: nowDecimal * ROW_H, left: 0, right: 0, height: 0, zIndex: 5, pointerEvents: "none" }}>
                          <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#C0685E" }} />
                          <div style={{ height: 1.5, background: "#C0685E" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "#93A0AD", marginTop: 6, flexShrink: 0 }}>Click any cell to add an event or task. Drag a task to reschedule it.</div>
    </div>
  );
}
