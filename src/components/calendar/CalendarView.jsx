import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MUTED, PRIMARY, PRIMARY_DARK, ROW_H, cardStyle, serifFont } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { useDragReschedule } from "../../hooks/useDragReschedule";
import { addDays, dayLabel, dateLabel, decimalToTimeLabel, layoutOverlaps, monthLabel, hourLabel, startOfWeek, toISO } from "../../lib/dateHelpers";
import CalBlock from "./CalBlock";
import StripRow from "./StripRow";
import { ghostBtn } from "../../lib/styles";

export default function CalendarView({ days, weekStart, setWeekStart, dayView, onSetDayView, onEnterMonth, events, dueChips, tasks, onCellClick, onChipClick, onRescheduleTask, onRescheduleEvent, onEditEvent, onOpenFocus, onSetTaskDone, educationCategory }) {
  const CATEGORY_COLORS = useCategoryColors();
  const eduCol = CATEGORY_COLORS[educationCategory] || CATEGORY_COLORS.Personal;
  const onDropItem = (kind, id, iso, hour) => (kind === "event" ? onRescheduleEvent(id, iso, hour) : onRescheduleTask(id, iso, hour ?? null));
  // Pointer-based drag-to-reschedule (see the hook's own comment) — replaces native
  // HTML5 drag/drop, which never fired from a touch gesture.
  const { drag, beginPress, guardClick } = useDragReschedule(onDropItem);
  const todayISO = toISO(new Date());
  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;
  const scrollRef = useRef(null);
  useEffect(() => {
    // A little above "now" instead of pinned right at the top edge — leaves the last
    // hour or so of context visible above the current-time line instead of it sitting
    // flush against the grid's edge.
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (nowDecimal - 1.5) * ROW_H);
    // Intentionally once on mount only — this is the initial scroll position, not
    // something that should yank the view back to "now" every time the clock ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calendar shows deadlines, not day-to-day to-dos: Education due dates (homework,
  // assignments, tests) and goal deadlines/milestones. Plain tasks, "break it down"
  // groups (their own due date and their individual work-day steps alike), and
  // Education work sessions ("Work on: X"/"Study: X") never render here at all — those
  // live on the Tasks/Education pages instead. This intentionally narrows what used to
  // render on Calendar; see the Tasks page for the day-to-day list.
  const isDueKind = (chip) => chip.kind === "edu" || chip.kind === "goal-deadline" || chip.kind === "goal-milestone";
  const chipStyle = (chip) => {
    // Solid, not a pale category-tint wash — same treatment "Due" chips below already
    // use, so an all-day event reads as a deliberate colored chip instead of a faint tint.
    if (chip.kind === "event") {
      const c = CATEGORY_COLORS[chip.category] || CATEGORY_COLORS.Personal;
      return { bg: c.border, border: c.border, text: "#fff" };
    }
    if (isDueKind(chip)) {
      const c = chip.kind === "edu" ? eduCol : (CATEGORY_COLORS[chip.category] || CATEGORY_COLORS.Personal);
      return { bg: c.border, border: c.border, text: "#fff" };
    }
    // Fallback for anything neither an event nor a deadline — colored outline only.
    const c = CATEGORY_COLORS[chip.category] || CATEGORY_COLORS.Personal;
    return { ...c, bg: "#fff" };
  };
  // No "Due: " prefix — the strip's own row label ("Due"/"All day") already says that;
  // repeating it on every chip just eats into the space for the actual subject/title
  // ("calc quiz", "bio test") that's the useful part to read at a glance.
  const chipLabel = (chip) => chip.title;
  // Assessments sit in "All day" instead — a test is the whole day it happens, not a
  // step you work through. A due chip with a specific time (an Education deadline) gets
  // the same treatment a timed event already gets — it moves into the hourly grid at
  // that time instead of sitting in a flat, dateless-looking strip row.
  // Goal actions (the small day-to-day steps under a milestone) deliberately don't
  // render on Calendar at all — same "deadlines, not day-to-day to-dos" narrowing as
  // plain tasks above. They still show on Tasks and Dashboard.
  const dueChipsOnly = dueChips.filter((c) => c.start == null && (c.kind === "goal-deadline" || c.kind === "goal-milestone" || (c.kind === "edu" && c.type !== "Assessment")));
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
  // A real segmented control (one pill, a solid-filled active segment) instead of three
  // separately bordered buttons that only changed border color when active — closer to
  // how both iOS's UISegmentedControl and Google Calendar's own view switcher read.
  const segmentBtnStyle = (active) => ({
    border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12.5, fontWeight: 600,
    background: active ? PRIMARY_DARK : "transparent", color: active ? "#fff" : MUTED,
  });
  const iconNavBtnStyle = { ...ghostBtn, width: 36, height: 36, minHeight: 0, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" };

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* Follows the pointer 1:1 while dragging a chip/task to reschedule it — pointer-
          events:none so it never blocks the elementFromPoint hit-testing that figures out
          what's underneath it (see useDragReschedule). */}
      {drag && (
        <div
          style={{
            position: "fixed", left: drag.x, top: drag.y, transform: "translate(-50%, -130%)", zIndex: 300, pointerEvents: "none",
            background: PRIMARY, color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 11px", borderRadius: 8,
            boxShadow: "0 8px 20px rgba(0,0,0,0.25)", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {drag.title}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: serifFont, fontSize: 22, fontWeight: 500, letterSpacing: -0.2 }}>{monthLabel(days[0])}</div>
        <div data-tour="calendar-nav" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 2, background: "#F1F2F6", borderRadius: 12, padding: 3 }}>
            <button onClick={() => onSetDayView(null)} className="btn-ghost" style={segmentBtnStyle(!isDay)}>Week</button>
            <button onClick={() => onSetDayView(dayView || todayISO)} className="btn-ghost" style={segmentBtnStyle(isDay)}>Day</button>
            <button onClick={onEnterMonth} className="btn-ghost" style={segmentBtnStyle(false)}>Month</button>
          </div>
          <button onClick={goToday} className="btn-ghost" style={ghostBtn}>Today</button>
          <button onClick={goPrev} className="btn-ghost" style={iconNavBtnStyle} title="Previous" aria-label="Previous">
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
          <button onClick={goNext} className="btn-ghost" style={iconNavBtnStyle} title="Next" aria-label="Next">
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* Day view keeps a horizontal-scroll floor so its single column stays readable
            on a narrow phone. Week view deliberately has none — all 7 days need to stay
            visible together rather than sliding off to the side, so its columns just
            compress with the viewport (minmax(0, 1fr) below lets them shrink instead of
            forcing a scroll). */}
        <div style={{ overflowX: isDay ? "auto" : "hidden", overflowY: "hidden", WebkitOverflowScrolling: "touch", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ minWidth: isDay ? 320 : 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
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
                      fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, marginTop: 3, width: 32, height: 32, lineHeight: "32px",
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
                beginPress={beginPress}
                guardClick={guardClick}
                drag={drag}
                rollOverdueToToday
              />
            </div>
            {/* One row instead of two separate "Due"/"Tasks" strips — fewer rows to scan.
                The chip styling itself (filled vs. outline, per chipStyle) already carries
                the deadline-vs-work distinction, so splitting them into separate rows was
                mostly redundant with that. */}
            <div data-tour="calendar-tasksrow" style={{ flexShrink: 0 }}>
              <StripRow label="Due" days={days} chips={dueChipsOnly} chipStyle={chipStyle} chipLabel={chipLabel} onChipClick={onChipClick} onDropItem={onDropItem} beginPress={beginPress} guardClick={guardClick} drag={drag} rollOverdueToToday emphasis />
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
                          data-drop-iso={iso}
                          data-drop-hour={h}
                          onClick={() => onCellClick(iso, h)}
                          style={{
                            position: "absolute", top: h * ROW_H, left: 0, right: 0, height: ROW_H, borderTop: "1px solid #F4F6F8", cursor: "pointer",
                            background: drag && drag.overIso === iso && drag.overHour === h ? "#EEF1FB" : undefined,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFBFC")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        />
                      ))}
                      {/* Everything timed on this day — events, due-chips, and any task
                          you've actually given a specific start time — gets laid out
                          together so two things scheduled at overlapping times land side
                          by side instead of stacking on top of each other. A timed task
                          is the one exception to "Calendar shows deadlines, not day-to-day
                          to-dos" above: giving it a specific slot makes it event-like
                          enough that it belongs here too, same as it already shows up at
                          that time on Dashboard's own timeline — an UNtimed task still
                          doesn't appear here at all. */}
                      {layoutOverlaps([
                        ...events.filter((e) => e.date === iso && e.start != null).map((e) => ({ kind: "event", start: e.start, duration: e.duration, data: e })),
                        ...timedDueChips.filter((c) => c.date === iso).map((c) => ({ kind: "chip", start: c.start, duration: 30, data: c })),
                        ...(tasks || []).filter((t) => t.date === iso && t.start != null && !t.done).map((t) => ({ kind: "task", start: t.start, duration: t.duration, data: t })),
                      ]).map((block) => {
                        if (block.kind === "event") {
                          return (
                            <CalBlock
                              key={block.data.id}
                              item={block.data}
                              color={CATEGORY_COLORS[block.data.category] || CATEGORY_COLORS.Personal}
                              onEditEvent={onEditEvent}
                              col={block.col} cols={block.cols}
                              draggable
                              dragKind="event"
                              beginPress={beginPress}
                              guardClick={guardClick}
                            />
                          );
                        }
                        if (block.kind === "task") {
                          return (
                            <CalBlock
                              key={`task-${block.data.id}`}
                              item={block.data}
                              color={CATEGORY_COLORS[block.data.category] || CATEGORY_COLORS.Personal}
                              isTask
                              done={block.data.done}
                              onOpenFocus={() => onOpenFocus(block.data.id, block.data.title)}
                              onToggleDone={() => onSetTaskDone(block.data.id, true)}
                              col={block.col} cols={block.cols}
                              draggable
                              dragKind="task"
                              beginPress={beginPress}
                              guardClick={guardClick}
                            />
                          );
                        }
                        return (
                          <CalBlock
                            key={block.data.kind + block.data.id}
                            item={{ ...block.data, title: `${chipLabel(block.data)} · ${decimalToTimeLabel(block.data.start)}`, duration: 30 }}
                            color={chipStyle(block.data)}
                            onEditEvent={() => onChipClick(block.data)}
                            col={block.col} cols={block.cols}
                          />
                        );
                      })}
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
    </div>
  );
}
