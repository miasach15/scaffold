import { useEffect, useMemo, useState } from "react";
import { Clock, Flame, GripVertical, Play } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { BORDER, cardStyle, INK, MUTED, PRIMARY, PRIMARY_DARK, PRIMARY_TINT, SURFACE, TONE, serifFont } from "../../lib/constants";
import { ghostBtn, inputStyle, noTypeDateProps } from "../../lib/styles";
const FOCUS_PRESETS = [15, 25, 50];

// Flat experiment: no white card fill/border/shadow, sections just sit directly on the
// page's own background — one continuous surface instead of white boxes on gray.
const flatSection = { background: "transparent", border: "none", borderRadius: 0, boxShadow: "none" };
// A plain hairline between sections — no fill, so it reads as a divider on the same flat
// background rather than a boxed-off panel. Applied to every section after the first one
// in each column.
const dividedSection = { ...flatSection, borderTop: `1px solid ${BORDER}`, paddingTop: 20 };
import { addDays, currentStreak as habitStreak, dayLabel, decimalToTimeInput, decimalToTimeLabel, defaultLeadDays, inLeadWindow, pad, startOfWeek, timeToDecimal, toISO } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";
import { EmptyState } from "../shared/Misc";
import BrainDumpModal from "./BrainDumpModal";

// A timed task/event row in "Today's Scaffolded Steps" — a colored timeline dot (solid
// for the first/soonest item, a paler ring for the rest) connected by a line down to the
// next row, per category color. Figma's dashboard mockup carries this same treatment.
function TimelineRow({ item, col, isFirst, isLast }) {
  return (
    <div style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 14 }}>
      <div style={{ width: 62, fontSize: 11.5, color: MUTED, flexShrink: 0, paddingTop: 8 }}>{decimalToTimeLabel(item.start)}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 8, background: isFirst ? col.accent : col.bg, border: isFirst ? "none" : `1.5px solid ${col.border}` }} />
        {!isLast && <div style={{ flex: 1, width: 1.5, background: col.border, marginTop: 2 }} />}
      </div>
      <div style={{ flex: 1, background: SURFACE, borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: col.accent, textTransform: "uppercase" }}>{item.category}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
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

export default function DashboardView({ profile, events, tasks, habits, dueChips, onSetHabitDone, setView, onSelectDay, onStartFocus, onAddTask, onSetDate, onSetStart, onUpdateGroupDueDate, onUpdateEduDeadline, onReorderTasks, autoOpenBrainDump, onAutoOpenBrainDumpHandled, hasActiveFocusSession, focusSlotRef, educationCategory }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [focusMinutes, setFocusMinutes] = useState(
    profile?.workStyle === "Short focused bursts" ? 15 : profile?.workStyle === "Long deep sessions" ? 50 : 25
  );
  // Drag-to-reorder "Anytime today" — which task is currently being dragged, so the row
  // it started from can dim itself while it's in flight.
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const todayISO = toISO(new Date());
  // A focus session always has to be about something real, and specifically something
  // due today — not the whole task list. Timed tasks sort first by their time slot,
  // untimed ones after, matching how "Today's Scaffolded Steps" orders things below.
  const focusableTasks = useMemo(
    () => tasks.filter((t) => !t.done && t.date === todayISO).sort((a, b) => (a.start ?? 99) - (b.start ?? 99)),
    [tasks, todayISO]
  );
  const [focusTaskId, setFocusTaskId] = useState(null);
  useEffect(() => {
    if (!focusableTasks.some((t) => t.id === focusTaskId)) setFocusTaskId(focusableTasks[0]?.id || null);
  }, [focusableTasks, focusTaskId]);
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
    .filter((next) => next && next.date && next.date <= todayISO);
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
    .filter(Boolean);
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
    // Manually moved items (see moveUntimed/onReorderTasks) sort by that order first —
    // same "indexed items float to the top, everything else falls back to date" rule
    // goal_actions' own moveAction already uses — anything not yet touched just keeps
    // sorting by date underneath whatever's been deliberately placed.
  ].sort((a, b) => {
    if (a.orderIndex != null && b.orderIndex != null) return a.orderIndex - b.orderIndex;
    if (a.orderIndex != null) return -1;
    if (b.orderIndex != null) return 1;
    return (a.date || "").localeCompare(b.date || "");
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

  // Just real due dates here — goal deadlines/milestones/actions aren't included; those
  // live on the Goals page. Within tasks: only a standalone one-time task or a "break it
  // down" project's own overall due date, never one of its individual steps — those are
  // work days, not deadlines, and would otherwise flood this list with entries for the
  // same project. Education
  // items (tests, homework, assignments alike) are real deadlines and belong here too;
  // an Education-generated "work on X" session task is excluded the same way a
  // breakdown step is, for the same reason.
  const upcoming = useMemo(
    () =>
      dueChips
        .filter((c) => !c.done && c.date >= todayISO)
        .filter((c) => (c.kind === "task" && !c.groupId && !c.eduId) || c.kind === "task-group-due" || c.kind === "edu" || c.kind === "goal")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4),
    [dueChips, todayISO]
  );

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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>This week</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {weekDays.map((d) => {
                const iso = toISO(d);
                const isToday = iso === todayISO;
                return (
                  <button
                    key={iso}
                    onClick={() => { onSelectDay(iso); setView("calendar"); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 2px",
                      borderRadius: 10, background: isToday ? "#DDE1EE" : "transparent", border: `1px solid ${isToday ? "#B1BBDD" : "transparent"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED }}>{dayLabel(d).slice(0, 1).toUpperCase()}</div>
                    <div style={{ fontFamily: serifFont, fontSize: 19, color: isToday ? PRIMARY_DARK : INK }}>{d.getDate()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...dividedSection, padding: "20px 20px 0", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 12 }}>Today's Scaffolded Steps</div>
            {todaysTimedTasks.length === 0 && todaysUntimed.length === 0 && todaysEvents.length === 0 ? (
              <EmptyState text="Nothing scheduled for today yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {todaysTimedTasks.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {todaysTimedTasks.map((item, i) => (
                      <TimelineRow key={item.id} item={item} col={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal} isFirst={i === 0} isLast={i === todaysTimedTasks.length - 1} />
                    ))}
                  </div>
                )}
                {todaysUntimed.length > 0 && (
                  <div style={{ marginTop: todaysTimedTasks.length > 0 ? 10 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", marginBottom: 8 }}>Anytime today</div>
                    {suggestedNext && (
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, marginBottom: 8,
                          background: fitsInTime ? PRIMARY_TINT : TONE.warn.bg,
                          border: `1px solid ${fitsInTime ? PRIMARY : TONE.warn.border}`,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: fitsInTime ? PRIMARY_DARK : TONE.warn.text, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>
                            {fitsInTime ? "You've got time today — start with" : "Tight today — quick win first"}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {suggestedNext.title}{suggestedNext.duration != null ? ` · ${suggestedNext.duration}m` : ""}
                          </div>
                        </div>
                        {onStartFocus && (
                          <button
                            onClick={() => onStartFocus(suggestedNext.id, suggestedNext.title, suggestedNext.duration || undefined)}
                            className="hoverable"
                            style={{
                              flexShrink: 0, padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                              background: "#fff", color: fitsInTime ? PRIMARY_DARK : TONE.warn.text, fontSize: 12, fontWeight: 700,
                            }}
                          >
                            Start
                          </button>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {todaysUntimed.map((t) => {
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
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: col.accent, flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: INK, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                            {t.date && t.date !== todayISO && (
                              <div style={{ flexShrink: 0 }}><UrgencyBadge iso={t.date} done={t.done} leadDays={defaultLeadDays(t)} /></div>
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
                        <TimelineRow key={item.id} item={item} col={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal} isFirst={i === 0} isLast={i === todaysEvents.length - 1} />
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
            <div style={{ ...cardStyle, padding: "12px 14px", flexShrink: 0 }}>
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

              {focusableTasks.length > 0 ? (
                <select
                  value={focusTaskId || ""}
                  onChange={(e) => setFocusTaskId(e.target.value)}
                  title="What this session is for"
                  style={{ ...inputStyle, width: "100%", marginBottom: 5 }}
                >
                  {focusableTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 12, color: MUTED, textAlign: "center", marginBottom: 5 }}>Nothing due today to focus on yet.</div>
              )}

              <button
                onClick={() => {
                  const t = focusableTasks.find((x) => x.id === focusTaskId);
                  if (t) onStartFocus(t.id, t.title, focusMinutes);
                }}
                disabled={!focusTaskId}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "9px", borderRadius: 14, border: "none", background: PRIMARY_TINT, color: PRIMARY_DARK,
                  fontSize: 14.5, fontWeight: 500, opacity: focusTaskId ? 1 : 0.4, cursor: focusTaskId ? "pointer" : "default",
                }}
              >
                <Play size={16} color={PRIMARY_DARK} />
                Start Session
              </button>
            </div>
          )}

          <div style={{ ...dividedSection, padding: "10px 20px 0", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 }}>Coming Up</div>
            {upcoming.length === 0 ? (
              <EmptyState text="Nothing due soon." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcoming.map((c) => (
                  <ComingUpRow key={c.id} chip={c} col={CATEGORY_COLORS[c.kind === "edu" ? educationCategory : c.category] || CATEGORY_COLORS.Personal} onSetDate={onSetDate} onSetStart={onSetStart} onUpdateGroupDueDate={onUpdateGroupDueDate} onUpdateEduDeadline={onUpdateEduDeadline} onGoToGoals={() => setView("goals")} />
                ))}
              </div>
            )}
          </div>

          <div style={{ ...dividedSection, padding: "10px 20px 0", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 5 }}>Habits Checklist</div>
            {habits.length === 0 ? (
              <EmptyState text="No habits yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {habits.map((h) => {
                  const done = h.doneDates.includes(todayISO);
                  const streak = habitStreak(h.doneDates);
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Checkbox checked={done} onClick={() => onSetHabitDone(h.id, todayISO, !done)} color={{ border: PRIMARY_DARK }} />
                      <div style={{ flex: 1, fontSize: 13, color: done ? MUTED : INK, textDecoration: done ? "line-through" : "none" }}>{h.title}</div>
                      {streak > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3, color: MUTED, fontSize: 10.5, flexShrink: 0 }}>
                          <Flame size={10} color={PRIMARY_DARK} fill={PRIMARY_DARK} strokeWidth={0} /> {streak}d
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// A Coming Up row's due date/time is its own click target, same inline native
// date/time editor every other due-date editor in the app uses — dispatched by chip
// kind since a plain task, a "break it down" group's overall due date, and an
// Education deadline each save through a different function (the last two also
// reflow their not-done steps/sessions to the new window).
function ComingUpRow({ chip, col, onSetDate, onSetStart, onUpdateGroupDueDate, onUpdateEduDeadline, onGoToGoals }) {
  const [editing, setEditing] = useState(false);
  const label = chip.subject || chip.category;
  // A goal action's date lives on the Goals page, not the tasks table — there's no
  // setter here that could safely edit it inline, so clicking opens Goals instead of
  // the date/time editor every other kind gets.
  const isGoalAction = chip.kind === "goal";
  const onSave = chip.kind === "task-group-due" ? onUpdateGroupDueDate : chip.kind === "edu" ? onUpdateEduDeadline : null;
  const handleDateChange = (date) => {
    if (!date) return;
    if (onSave) onSave(chip.id, date, chip.start);
    else onSetDate(chip.id, date);
  };
  const handleTimeChange = (time) => {
    const start = time ? timeToDecimal(time) : null;
    if (onSave) onSave(chip.id, chip.date, start);
    else onSetStart(chip.id, start);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "2px 0" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && <div style={{ fontSize: 10, fontWeight: 700, color: col?.accent || PRIMARY_DARK, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>{label}</div>}
        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chip.title}</div>
      </div>
      {isGoalAction ? (
        <button onClick={onGoToGoals} title="Open in Goals" style={{ background: "none", border: "none", padding: 0, flexShrink: 0, cursor: "pointer", display: "inline-flex" }}>
          <UrgencyBadge iso={chip.date} done={chip.done} leadDays={2} />
        </button>
      ) : editing ? (
        <div
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEditing(false); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
        >
          <input type="date" autoFocus value={chip.date} onChange={(e) => handleDateChange(e.target.value)} {...noTypeDateProps} style={{ ...inputStyle, width: 128, fontSize: 11.5, padding: "3px 6px" }} />
          <input type="time" value={decimalToTimeInput(chip.start)} onChange={(e) => handleTimeChange(e.target.value)} title="Optional: a specific time it's due" style={{ ...inputStyle, width: 92, fontSize: 11.5, padding: "3px 6px" }} />
        </div>
      ) : (
        <button onClick={() => setEditing(true)} title="Click to change" style={{ background: "none", border: "none", padding: 0, flexShrink: 0, cursor: "pointer", display: "inline-flex" }}>
          <UrgencyBadge iso={chip.date} done={chip.done} leadDays={2} />
        </button>
      )}
    </div>
  );
}
