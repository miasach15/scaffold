import { useEffect, useRef } from "react";
import { PRIMARY, ROW_H, cardStyle, serifFont } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { addDays, dayLabel, dateLabel, decimalToTimeLabel, monthLabel, hourLabel, startOfWeek, toISO } from "../../lib/dateHelpers";
import CalBlock from "./CalBlock";
import StripRow from "./StripRow";
import { ghostBtn } from "../../lib/styles";

export default function CalendarView({ days, weekStart, setWeekStart, dayView, onSetDayView, onEnterMonth, events, dueChips, onCellClick, onChipClick, onRescheduleTask, onRescheduleEvent, onEditEvent, educationCategory }) {
  const CATEGORY_COLORS = useCategoryColors();
  const eduCol = CATEGORY_COLORS[educationCategory] || CATEGORY_COLORS.Personal;
  const onDropItem = (kind, id, iso) => (kind === "event" ? onRescheduleEvent(id, iso) : onRescheduleTask(id, iso, null));
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 6 * ROW_H;
  }, []);

  const todayISO = toISO(new Date());
  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;

  // Calendar shows deadlines, not day-to-day to-dos: Education due dates (homework,
  // assignments, tests) and goal deadlines/milestones. Plain tasks, "break it down"
  // groups (their own due date and their individual work-day steps alike), and
  // Education work sessions ("Work on: X"/"Study: X") never render here at all — those
  // live on the Tasks/Education pages instead. This intentionally narrows what used to
  // render on Calendar; see the Tasks page for the day-to-day list.
  const isDueKind = (chip) => chip.kind === "edu" || chip.kind === "goal-deadline" || chip.kind === "goal-milestone";
  const chipStyle = (chip) => {
    if (chip.kind === "event") return CATEGORY_COLORS[chip.category] || CATEGORY_COLORS.Personal;
    if (isDueKind(chip)) {
      const c = chip.kind === "edu" ? eduCol : (CATEGORY_COLORS[chip.category] || CATEGORY_COLORS.Personal);
      return { bg: c.border, border: c.border, text: "#fff" };
    }
    // "goal" (small actions): colored outline only — a work day, not a deadline.
    const c = CATEGORY_COLORS[chip.category] || CATEGORY_COLORS.Personal;
    return { ...c, bg: "#fff" };
  };
  const chipLabel = (chip) => {
    if (isDueKind(chip)) return `Due: ${chip.title}`;
    return chip.title;
  };
  // Assessments sit in "All day" instead — a test is the whole day it happens, not a
  // step you work through. A due chip with a specific time (an Education deadline) gets
  // the same treatment a timed event already gets — it moves into the hourly grid at
  // that time instead of sitting in a flat, dateless-looking strip row.
  const dueChipsOnly = dueChips.filter((c) => c.start == null && (c.kind === "goal-deadline" || c.kind === "goal-milestone" || (c.kind === "edu" && c.type !== "Assessment")));
  const taskChipsOnly = dueChips.filter((c) => c.kind === "goal");
  const assessmentChips = dueChips.filter((c) => c.kind === "edu" && c.type === "Assessment" && c.start == null);
  const allDayEventChips = [
    ...events.filter((e) => e.start == null).map((e) => ({ id: e.id, kind: "event", title: e.title, date: e.date, done: false, category: e.category })),
    ...assessmentChips,
  ];
  const timedDueChips = dueChips.filter((c) => c.start != null && c.kind === "edu");

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
              <StripRow
                label="All day"
                days={days}
                chips={allDayEventChips}
                chipStyle={chipStyle}
                chipLabel={chipLabel}
                onChipClick={(chip) => (chip.kind === "edu" ? onChipClick(chip) : onEditEvent({ id: chip.id, title: chip.title, date: chip.date, start: null, duration: null, category: chip.category }))}
                onAddClick={(iso) => onCellClick(iso, null)}
                onDropItem={onDropItem}
                rollOverdueToToday
              />
            </div>
            {/* One row instead of two separate "Due"/"Tasks" strips — fewer rows to scan.
                The chip styling itself (filled vs. outline, per chipStyle) already carries
                the deadline-vs-work distinction, so splitting them into separate rows was
                mostly redundant with that. */}
            <div data-tour="calendar-tasksrow" style={{ flexShrink: 0 }}>
              <StripRow label="Due" days={days} chips={[...dueChipsOnly, ...taskChipsOnly]} chipStyle={chipStyle} chipLabel={chipLabel} onChipClick={onChipClick} onDropItem={onDropItem} rollOverdueToToday emphasis />
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
                      {timedDueChips.filter((c) => c.date === iso).map((c) => (
                        <CalBlock key={c.kind + c.id} item={{ ...c, title: `${chipLabel(c)} · ${decimalToTimeLabel(c.start)}`, duration: 30 }} color={chipStyle(c)} onEditEvent={() => onChipClick(c)} />
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
      <div style={{ fontSize: 11.5, color: "#93A0AD", marginTop: 6, marginRight: 56, flexShrink: 0 }}>
        {/* Click vs. tap wording for desktop vs. touch. Also leaves room on the right so
            the floating quick-capture button (bottom-right, see StickyNoteCorner) never
            sits on top of this text on a narrow screen. */}
        <span className="cal-hint-desktop">Click any cell to add an event or task.</span>
        <span className="cal-hint-mobile">Tap any cell to add an event or task.</span>
        <style>{`
          .cal-hint-mobile { display: none; }
          @media (max-width: 640px) {
            .cal-hint-desktop { display: none; }
            .cal-hint-mobile { display: inline; }
          }
        `}</style>
      </div>
    </div>
  );
}
