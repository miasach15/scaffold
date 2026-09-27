import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Clock, Flame, GripVertical } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { BORDER, cardStyle, INK, MUTED, PRIMARY, PRIMARY_DARK, PRIMARY_TINT, SURFACE, serifFont } from "../../lib/constants";
import { ghostBtn } from "../../lib/styles";
const FOCUS_PRESETS = [15, 25, 50];

// Flat experiment: no white card fill/border/shadow, sections just sit directly on the
// page's own background — one continuous surface instead of white boxes on gray.
const flatSection = { background: "transparent", border: "none", borderRadius: 0, boxShadow: "none" };
// A plain hairline between sections — no fill, so it reads as a divider on the same flat
// background rather than a boxed-off panel. Applied to every section after the first one
// in each column.
const dividedSection = { ...flatSection, borderTop: `1px solid ${BORDER}`, paddingTop: 20 };
import { addDays, currentStreak as habitStreak, dayLabel, decimalToTimeLabel, defaultLeadDays, inLeadWindow, pad, startOfWeek, toISO } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";
import { EmptyState } from "../shared/Misc";
import BrainDumpModal from "./BrainDumpModal";

// A session's notes can be several comma-joined micro-steps (see groupItemsByDate) — a
// step that just repeats the row's own title is dropped outright (adds nothing), and
// showing every remaining one at once is overwhelming. Only the next concrete thing to
// do shows by default; the rest are still there, just a click away instead of gone.
const stepParts = (notes, title) => {
  if (!notes) return [];
  return notes.split(",").map((s) => s.trim()).filter(Boolean).filter((p) => p.toLowerCase() !== (title || "").toLowerCase());
};

function StepNotes({ notes, title, color }) {
  const [expanded, setExpanded] = useState(false);
  const parts = stepParts(notes, title);
  if (parts.length === 0) return null;
  return (
    <div style={{ marginTop: 1 }}>
      {parts.length > 1 ? (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 2, background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: 11.5, color: color || MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
          }}
        >
          {expanded ? <ChevronDown size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} /> : <ChevronRight size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Next: {parts[0]}</span>
        </button>
      ) : (
        <div style={{ fontSize: 11.5, color: color || MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Next: {parts[0]}</div>
      )}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3, paddingLeft: 15 }}>
          {parts.slice(1).map((p, i) => (
            <div key={i} style={{ fontSize: 11, color: MUTED }}>{p}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// A timed task/event row in "Today's Scaffolded Steps" — a colored timeline dot (solid
// for the first/soonest item, a paler ring for the rest) connected by a line down to the
// next row, per category color. Figma's dashboard mockup carries this same treatment.
function TimelineRow({ item, col, isFirst, isLast, isPast }) {
  return (
    <div style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 14, opacity: isPast ? 0.45 : 1 }}>
      <div style={{ width: 62, fontSize: 11.5, color: MUTED, flexShrink: 0, paddingTop: 8 }}>{decimalToTimeLabel(item.start)}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 8, background: isPast ? "transparent" : isFirst ? col.accent : col.bg, border: isPast ? `1.5px solid ${BORDER}` : isFirst ? "none" : `1.5px solid ${col.border}` }} />
        {!isLast && <div style={{ flex: 1, width: 1.5, background: col.border, marginTop: 2 }} />}
      </div>
      <div style={{ flex: 1, background: SURFACE, borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: col.accent, textTransform: "uppercase" }}>{item.category}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
        <StepNotes notes={item.notes} title={item.title} />
      </div>
      {item.duration != null && <div style={{ fontSize: 11, color: MUTED, flexShrink: 0, paddingTop: 8 }}>{Math.round(item.duration)}m</div>}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardView({ profile, events, tasks, habits, eduItems, onSetHabitDone, onToggleDone, setView, onSelectDay, onStartFocus, onAddTask, onReorderTasks, autoOpenBrainDump, onAutoOpenBrainDumpHandled, hasActiveFocusSession, focusSlotRef }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [focusMinutes, setFocusMinutes] = useState(
    profile?.workStyle === "Short focused bursts" ? 15 : profile?.workStyle === "Long deep sessions" ? 50 : 25
  );
  // Drag-to-reorder "Anytime today" — which task is currently being dragged, so the row
  // it started from can dim itself while it's in flight.
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const todayISO = toISO(new Date());

  // Tasks always come first and are ordered by how urgent they are — a timed task is
  // more pressing the sooner today it's due, so those sort by start time ascending;
  // untimed ones (no fixed slot, so nothing to rank them against each other by) follow
  // after. Events are fixed appointments, not something to act on, so they're kept as
  // their own list below the tasks rather than interleaved by time with them.
  const todaysTimedTasks = tasks.filter((t) => t.date === todayISO && t.start != null && !t.done && !t.groupId && !t.eduId).sort((a, b) => a.start - b.start);
  // A "break it down" project always collapses to ONE row here — the earliest step
  // that's still undone, whether that step's own work day is today or has already
  // slipped by — never two rows for the same project because a later step also
  // happens to be scheduled for today. Same collapsing Tasks' Today section gives it.
  const activeGroupSteps = {};
  tasks.forEach((t) => {
    if (!t.groupId || t.done) return;
    (activeGroupSteps[t.groupId] ||= []).push(t);
  });
  const groupItems = Object.values(activeGroupSteps)
    .map((steps) => steps.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0])
    .filter((next) => next && next.date && next.date <= todayISO)
    // Which STEP is next is picked by its own work day (just above) — but the row
    // itself sorts/shows a badge for the project's overall due date instead, same as
    // eduSessionItems below, so both land by how urgent the real deadline actually is.
    .map((next) => ({ ...next, date: next.groupDueDate || next.date }));
  // Same idea for Education work sessions ("Work on X"/"Study X") — only the most
  // recent due-or-overdue, still-undone session per assignment shows, never a pile of
  // rows with the same title for every day that slipped by.
  const activeEduSessions = {};
  tasks.forEach((t) => {
    if (!t.eduId || t.groupId || t.done) return;
    (activeEduSessions[t.eduId] ||= []).push(t);
  });
  const eduSessionItems = Object.values(activeEduSessions)
    .map((sessions) => sessions.filter((t) => t.date && t.date <= todayISO).sort((a, b) => a.date.localeCompare(b.date)))
    .map((due) => due[due.length - 1])
    .filter(Boolean)
    // Same swap as groupItems above — the session's own work day picked it, but the
    // assignment/test's real due date is what the row sorts and shows a badge by.
    .map((t) => ({ ...t, date: (eduItems || []).find((e) => e.id === t.eduId)?.dueDate || t.date }));
  // A plain due-dated task (no breakdown, not from Education, not recurring) shouldn't
  // just sit invisible until the exact day it's due — same "shows up early, dimmed,
  // until it's close" rule TodaySection already gives it on the Tasks page. And once its
  // due date has passed without being done, it carries forward onto today instead of
  // vanishing on a date that's scrolled by, matching the same treatment Calendar gives
  // an overdue item. Either way it lands in "Anytime today," since a specific time slot
  // from its original day doesn't apply once it's showing early or carried over.
  const todaysUntimed = [
    ...tasks.filter((t) => t.date === todayISO && t.start == null && !t.done && !t.groupId && !t.eduId),
    ...tasks.filter((t) => {
      if (t.done || t.groupId || t.eduId || t.isRecurring || !t.date || t.date === todayISO) return false;
      return t.date < todayISO || inLeadWindow(t.date, defaultLeadDays(t), t.done);
    }),
    ...groupItems,
    ...eduSessionItems,
    // How close a step's own due date is comes first — overdue/carried-over items
    // lead, then today's, then whatever's shown early because it's coming up soon —
    // so the list itself shows what's actually urgent instead of urgency living only
    // in a separate panel. Manual drag order (see moveUntimed/onReorderTasks) only
    // breaks ties between steps that are equally due, the same day.
  ].sort((a, b) => {
    const ad = a.date || "9999-99-99";
    const bd = b.date || "9999-99-99";
    if (ad !== bd) return ad.localeCompare(bd);
    if (a.orderIndex != null && b.orderIndex != null) return a.orderIndex - b.orderIndex;
    if (a.orderIndex != null) return -1;
    if (b.orderIndex != null) return 1;
    return 0;
  });
  const todaysEvents = events.filter((e) => e.date === todayISO && e.start != null).sort((a, b) => a.start - b.start);

  // Dragging one "Anytime today" row onto another moves the dragged one to sit right
  // before the drop target, then persists the WHOLE visible list's new order (not just
  // the two rows involved) — matches moveAction's own reindex-everything behavior, so a
  // partial reorder never leaves some items floating on manual order and others still on
  // date order in a way that's hard to predict.
  const dropUntimedOn = (targetId) => {
    if (!draggedTaskId || draggedTaskId === targetId) return;
    const ids = todaysUntimed.map((t) => t.id);
    const from = ids.indexOf(draggedTaskId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedTaskId);
    onReorderTasks?.(ids);
  };

  // "Do you have enough time today?" — free time left in your usual active window (the
  // same start/end hours "What now?" reminders already use, defaulting to 9am–9pm if
  // that's never been set) minus whatever's still ahead on today's schedule, compared
  // against how long the rest of "Anytime today" will actually take. No separate
  // difficulty rating exists (or needs to) — a task's own picked duration already stands
  // in for how big a lift it is.
  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;
  const dayStart = profile?.whatnowWindowStart ?? 9;
  const dayEnd = profile?.whatnowWindowEnd ?? 21;
  const windowHoursLeft = Math.max(0, dayEnd - Math.max(nowDecimal, dayStart));
  const committedMin = [...todaysTimedTasks, ...todaysEvents]
    .filter((item) => item.start >= nowDecimal)
    .reduce((sum, item) => sum + (item.duration || 60), 0);
  const freeHoursLeft = Math.max(0, windowHoursLeft - committedMin / 60);
  // A task with no picked duration still needs an estimate to be part of this math —
  // 30 min is a reasonable "quick thing" default, same ballpark as the shortest preset
  // in the duration picker.
  const untimedNeededMin = todaysUntimed.reduce((sum, t) => sum + (t.duration ?? 30), 0);
  const fitsInTime = untimedNeededMin / 60 <= freeHoursLeft;
  // Plenty of time: just point at whatever's already first (manual order, or date).
  // Tight: lead with the quickest thing first — an actual win banked now beats staring
  // at the biggest task while the clock runs out.
  const suggestedNext = fitsInTime
    ? todaysUntimed[0]
    : [...todaysUntimed].sort((a, b) => (a.duration ?? 30) - (b.duration ?? 30))[0];

  // Finished today, across whatever kind of item it was — its own quiet "wins" list
  // below Habits, and the count the Scaffolded Steps header shows next to free time.
  const doneTodayTasks = tasks.filter((t) => t.date === todayISO && t.done);
  const scaffoldedTotalCount = todaysTimedTasks.length + todaysUntimed.length + doneTodayTasks.length;
  const [showBrainDump, setShowBrainDump] = useState(false);
  // Right after onboarding, the very first Dashboard visit opens Brain Dump on its own —
  // the second of the two "Up next" steps the onboarding Done screen just promised.
  useEffect(() => {
    if (autoOpenBrainDump) {
      setShowBrainDump(true);
      onAutoOpenBrainDumpHandled?.();
    }
  }, [autoOpenBrainDump, onAutoOpenBrainDumpHandled]);
  const weekStart = startOfWeek(new Date());
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const firstName = (profile?.name || "").trim().split(" ")[0];
  // "This week" strip's per-day load dots — how many tasks/events actually land on
  // that day, capped at 3 dots so a heavy day doesn't sprawl sideways.
  const dayLoad = (iso) => Math.min(3, tasks.filter((t) => !t.done && t.date === iso).length + events.filter((e) => e.date === iso).length);

  return (
    <div className="dv-root" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ ...flatSection, padding: "14px 24px 20px", marginBottom: 20, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: PRIMARY_DARK, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Today's plan</div>
          <div style={{ fontFamily: serifFont, fontSize: 26, color: INK, letterSpacing: -0.3 }}>
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", flexShrink: 0 }}>
          <button
            onClick={() => setShowBrainDump(true)}
            className="hoverable"
            style={{ ...ghostBtn, flexShrink: 0 }}
          >
            Brain dump
          </button>
        </div>
      </div>

      {showBrainDump && <BrainDumpModal onClose={() => setShowBrainDump(false)} onAddTask={onAddTask} tasks={tasks} events={events} />}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28, flex: 1, minHeight: 0 }} className="dashboard-grid">
        <style>{`
          @media (max-width: 900px) {
            .dashboard-grid { grid-template-columns: 1fr !important; flex: none !important; min-height: 0 !important; }
            /* Below the breakpoint where the dashboard stops being a single fixed-height
               screen (see App.jsx's ".dashboard-wrap" comment), the whole page scrolls
               normally instead of each column scrolling on its own — so both need to fall
               back to natural content height here, leaving .dashboard-wrap as the one
               real scroll container. */
            .dv-root, .dv-col { flex: none !important; min-height: 0 !important; overflow: visible !important; }
          }
        `}</style>

        <div className="dv-col" style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0, flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div style={{ ...flatSection, padding: "0 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>This week</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {weekDays.map((d) => {
                const iso = toISO(d);
                const isToday = iso === todayISO;
                const load = dayLoad(iso);
                return (
                  <button
                    key={iso}
                    onClick={() => { onSelectDay(iso); setView("calendar"); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 2px",
                      borderRadius: 10, background: isToday ? "#DDE1EE" : "transparent", border: `1px solid ${isToday ? "#B1BBDD" : "transparent"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: MUTED }}>{dayLabel(d).slice(0, 1).toUpperCase()}</div>
                    <div style={{ fontFamily: serifFont, fontSize: 17, color: isToday ? PRIMARY_DARK : INK }}>{d.getDate()}</div>
                    <div style={{ display: "flex", gap: 2, height: 4, alignItems: "center" }}>
                      {Array.from({ length: load }).map((_, i) => (
                        <div key={i} style={{ width: 4, height: 4, borderRadius: 2, background: isToday ? PRIMARY_DARK : "#C3CAD3" }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...dividedSection, padding: "20px 20px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>Today's Scaffolded Steps</div>
              <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>
                {scaffoldedTotalCount > 0 && `${doneTodayTasks.length} of ${scaffoldedTotalCount} done · `}
                {freeHoursLeft > 0 ? `≈${freeHoursLeft % 1 === 0 ? freeHoursLeft : freeHoursLeft.toFixed(1)}h free left today` : "No free time left today"}
              </div>
            </div>
            {todaysTimedTasks.length === 0 && todaysUntimed.length === 0 && todaysEvents.length === 0 ? (
              <EmptyState text="Nothing scheduled for today yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {todaysTimedTasks.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {todaysTimedTasks.map((item, i) => (
                      <TimelineRow key={item.id} item={item} col={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal} isFirst={i === 0} isLast={i === todaysTimedTasks.length - 1} isPast={item.start + (item.duration || 60) / 60 <= nowDecimal} />
                    ))}
                  </div>
                )}
                {todaysUntimed.length > 0 && (
                  <div style={{ marginTop: todaysTimedTasks.length > 0 ? 10 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", marginBottom: 8 }}>Anytime today</div>
                    {suggestedNext && (
                      // Always the same calm primary tint, whether or not today's list
                      // fits in the time left — "tight today" already changes WHICH task
                      // gets suggested (the quickest one, not just the first), so the
                      // color doesn't also need to sound an alarm on top of that.
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, marginBottom: 8,
                          background: PRIMARY_TINT, border: `1px solid ${PRIMARY}`,
                        }}
                      >
                        {onToggleDone && (
                          <Checkbox checked={false} onClick={() => onToggleDone(suggestedNext.id, true)} color={{ border: PRIMARY_DARK }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {suggestedNext.title}{suggestedNext.duration != null ? ` · ${suggestedNext.duration}m` : ""}
                          </div>
                          <StepNotes notes={suggestedNext.notes} title={suggestedNext.title} color={PRIMARY_DARK} />
                        </div>
                        {suggestedNext.date && suggestedNext.date !== todayISO && (
                          <div style={{ flexShrink: 0 }}>
                            <UrgencyBadge iso={suggestedNext.date} done={false} leadDays={suggestedNext.groupId || suggestedNext.eduId ? null : defaultLeadDays(suggestedNext)} />
                          </div>
                        )}
                        {onStartFocus && (
                          <button
                            onClick={() => onStartFocus(suggestedNext.id, suggestedNext.title, focusMinutes)}
                            className="hoverable"
                            style={{
                              flexShrink: 0, padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                              background: "#fff", color: PRIMARY_DARK, fontSize: 12, fontWeight: 700,
                            }}
                          >
                            Start
                          </button>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {todaysUntimed.filter((t) => t.id !== suggestedNext?.id).map((t) => {
                        const col = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal;
                        const dragProps = onReorderTasks
                          ? {
                              draggable: true,
                              onDragStart: () => setDraggedTaskId(t.id),
                              onDragOver: (e) => e.preventDefault(),
                              onDrop: (e) => { e.preventDefault(); dropUntimedOn(t.id); },
                              onDragEnd: () => setDraggedTaskId(null),
                            }
                          : {};
                        return (
                          <div
                            key={t.id}
                            {...dragProps}
                            style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 14,
                              border: `1px solid ${BORDER}`, background: "#fff",
                              opacity: draggedTaskId === t.id ? 0.4 : 1,
                            }}
                          >
                            {onReorderTasks && (
                              <div title="Drag to reorder" style={{ display: "flex", flexShrink: 0, color: "#D1D5DB", cursor: "grab" }}>
                                <GripVertical size={14} strokeWidth={2} />
                              </div>
                            )}
                            {onToggleDone && <Checkbox checked={false} onClick={() => onToggleDone(t.id, true)} color={col} size={16} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                              <StepNotes notes={t.notes} title={t.title} />
                            </div>
                            {t.duration != null && <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{t.duration}m</div>}
                            {t.date && t.date !== todayISO && (
                              <div style={{ flexShrink: 0 }}><UrgencyBadge iso={t.date} done={t.done} leadDays={t.groupId || t.eduId ? null : defaultLeadDays(t)} /></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {todaysEvents.length > 0 && (
                  <div style={{ marginTop: todaysTimedTasks.length > 0 || todaysUntimed.length > 0 ? 4 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>Today's events</div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {todaysEvents.map((item, i) => (
                        <TimelineRow key={item.id} item={item} col={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal} isFirst={i === 0} isLast={i === todaysEvents.length - 1} isPast={item.start + (item.duration || 60) / 60 <= nowDecimal} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="dv-col" style={{ display: "flex", flexDirection: "column", gap: 9, minWidth: 0, flex: 1, minHeight: 0, overflowY: "auto" }}>
          {/* Sits FIRST in the right column now, ahead of Coming Up/Habits — that's "the
              corner" for Dashboard's own copy of the focus timer. When a session is
              already running, this becomes an empty slot: App.jsx portals the SAME
              floating-timer component (see FocusTimerModal's portalTarget) into it
              instead of leaving the idle picker showing underneath, so there's never two
              timers visible at once. Leaving Dashboard unmounts this slot, which is
              exactly what lets the timer reappear as the normal floating bottom-right
              card everywhere else. */}
          {hasActiveFocusSession ? (
            <div ref={focusSlotRef} style={{ flexShrink: 0 }} />
          ) : (
            <div style={{ ...cardStyle, boxShadow: "none", padding: "12px 14px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontFamily: serifFont, fontSize: 18, color: INK }}>Focus Timer</div>
                <div style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0 }}>
                  <Clock size={12} />
                </div>
              </div>

              <div style={{ position: "relative", width: 92, height: 92, margin: "0 auto 8px" }}>
                <svg width="92" height="92" viewBox="0 0 92 92">
                  <circle cx="46" cy="46" r="39" fill="none" stroke={PRIMARY_DARK} strokeWidth="7" />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: serifFont, fontSize: 20, color: INK, letterSpacing: 0.3 }}>{pad(focusMinutes)}:00</div>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: PRIMARY_DARK, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 }}>{focusMinutes} min</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 6 }}>
                {FOCUS_PRESETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setFocusMinutes(m)}
                    style={{
                      ...ghostBtn, padding: "5px 14px", background: "#fff",
                      borderColor: focusMinutes === m ? PRIMARY_DARK : BORDER,
                      color: focusMinutes === m ? PRIMARY_DARK : MUTED,
                      fontWeight: focusMinutes === m ? 700 : 600,
                    }}
                  >
                    {m}m
                  </button>
                ))}
              </div>

              {/* Starting a session is the highlighted suggestion card's job now (its own
                  Start button reads this exact duration) — this card is just the "how
                  long" picker, not a second place to press start for the same action. */}
            </div>
          )}

          {/* Deliberately the quietest thing in this column — a daily checklist matters,
              but it's not what the page is actually for, so it shouldn't visually compete
              with Focus Timer or the Scaffolded Steps for attention. */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "10px 14px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>Habits</div>
              {habits.length > 0 && (
                <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>
                  {habits.filter((h) => h.doneDates.includes(todayISO)).length} of {habits.length}
                </div>
              )}
            </div>
            {habits.length === 0 ? (
              <EmptyState text="No habits yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {habits.map((h) => {
                  const done = h.doneDates.includes(todayISO);
                  const streak = habitStreak(h.doneDates);
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Checkbox checked={done} onClick={() => onSetHabitDone(h.id, todayISO, !done)} color={{ border: PRIMARY_DARK }} size={15} />
                      <div style={{ flex: 1, fontSize: 12.5, color: done ? MUTED : INK, textDecoration: done ? "line-through" : "none" }}>{h.title}</div>
                      {streak > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3, color: MUTED, fontSize: 10, flexShrink: 0 }}>
                          <Flame size={9} color={MUTED} fill={MUTED} strokeWidth={0} /> {streak}d
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wins stack up here as they happen — empty (and hidden) first thing in the
              morning, so there's nothing to scroll past before you've done anything yet. */}
          {doneTodayTasks.length > 0 && (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "10px 14px", flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 8 }}>Done today</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {doneTodayTasks.map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Checkbox checked onClick={() => onToggleDone(t.id, false)} color={CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal} size={15} />
                    <div style={{ flex: 1, fontSize: 12.5, color: MUTED, textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

