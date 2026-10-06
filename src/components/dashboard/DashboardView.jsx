import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, GripVertical, MessageCircle, NotebookPen, Play } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { BORDER, INK, MUTED, PRIMARY, PRIMARY_DARK, SURFACE, serifFont } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";

// Flat experiment: no white card fill/border/shadow, sections just sit directly on the
// page's own background — one continuous surface instead of white boxes on gray.
const flatSection = { background: "transparent", border: "none", borderRadius: 0, boxShadow: "none" };
// The one lifted surface on the page — "Today's steps" is the reason Dashboard exists,
// so it's the only section that gets a border + shadow. Everything else (This week,
// Focus Timer, Habits, Done today) stays flat/bordered-once at most, so the hierarchy
// reads at a glance instead of every section competing as its own box. Plain white, not
// a tinted wash — an earlier cream tint here read as an unwanted yellow cast.
const HERO_BG = "#fff";
import { addDays, currentStreak as habitStreak, dayLabel, decimalToTimeLabel, defaultLeadDays, formatDuration, inLeadWindow, meaningfulFocusPresets, pad, startOfWeek, toISO } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";
import { EmptyState } from "../shared/Misc";
import BrainDumpModal from "./BrainDumpModal";
import CheckinModal from "./CheckinModal";
import WorkTitle from "../shared/WorkTitle";
import StepNotes from "../shared/StepNotes";

const CHECKIN_INTERVAL_MS = 60 * 60 * 1000;

// A timed task/event row in "Today's Scaffolded Steps" — a colored timeline dot (solid
// for the first/soonest item, a paler ring for the rest) connected by a line down to the
// next row, per category color. Figma's dashboard mockup carries this same treatment.
function TimelineRow({ item, col, isFirst, isLast, isPast }) {
  return (
    <div style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 14, opacity: isPast ? 0.45 : 1 }}>
      <div style={{ width: 62, fontSize: 11.5, color: MUTED, flexShrink: 0, paddingTop: 8 }}>{decimalToTimeLabel(item.start)}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 8, background: isPast ? "transparent" : isFirst ? col.accent : "#fff", border: isPast ? `1.5px solid ${BORDER}` : isFirst ? "none" : `1.5px solid ${col.border}` }} />
        {!isLast && <div style={{ flex: 1, width: 1.5, background: col.border, marginTop: 2 }} />}
      </div>
      <div style={{ flex: 1, background: SURFACE, borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: col.accent, textTransform: "uppercase" }}>{item.category}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <WorkTitle title={item.title} mutedColor={MUTED} />
        </div>
        <StepNotes notes={item.notes} title={item.title} duration={item.duration} />
      </div>
      {item.duration != null && <div style={{ fontSize: 11, color: MUTED, flexShrink: 0, paddingTop: 8 }}>{formatDuration(item.duration)}</div>}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardView({ profile, events, tasks, habits, eduItems, onSetHabitDone, onToggleDone, setView, onSelectDay, onStartFocus, onAddTask, onAddEvents, onSetDate, onReorderTasks, autoOpenBrainDump, onAutoOpenBrainDumpHandled, hasActiveFocusSession, focusSlotRef, suppressCheckin }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [focusMinutes, setFocusMinutes] = useState(
    profile?.workStyle === "Short focused bursts" ? 15 : profile?.workStyle === "Long deep sessions" ? 50 : 25
  );
  // Reordering "Anytime today" uses pointer events, not native HTML5 drag-and-drop —
  // native drag doesn't work at all on touch in most mobile browsers, and gives no
  // feedback on where a card will land until you actually release it. This tracks the
  // dragged row's live position as the pointer moves and reflows the list immediately;
  // the new order is only persisted (via onReorderTasks) once, on release.
  const [draggingId, setDraggingId] = useState(null);
  const [liveOrder, setLiveOrder] = useState(null); // ids in their current on-screen order, only while dragging
  const dragRef = useRef(null); // mutable { id, order } for the active gesture, so the move/up listeners don't need to resubscribe on every reflow
  const rowElsRef = useRef({}); // task id -> row DOM node, for hit-testing during drag
  const onReorderTasksRef = useRef(onReorderTasks);
  onReorderTasksRef.current = onReorderTasks;

  useEffect(() => {
    const handleMove = (e) => {
      const cur = dragRef.current;
      if (!cur) return;
      const y = e.clientY;
      const others = cur.order.filter((id) => id !== cur.id);
      let insertAt = others.length;
      for (let i = 0; i < others.length; i++) {
        const el = rowElsRef.current[others[i]];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (y < rect.top + rect.height / 2) { insertAt = i; break; }
      }
      others.splice(insertAt, 0, cur.id);
      if (others.length !== cur.order.length || !others.every((id, i) => id === cur.order[i])) {
        cur.order = others;
        setLiveOrder(others);
      }
    };
    const handleUp = () => {
      const cur = dragRef.current;
      dragRef.current = null;
      setDraggingId(null);
      setLiveOrder(null);
      if (cur) onReorderTasksRef.current?.(cur.order);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

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
  // A session whose assignment is already done (marked complete directly, or every
  // session finishing auto-completes it — see App.jsx's setTaskDone) shouldn't keep
  // showing as something to do just because that one particular session row never got
  // individually checked off.
  const doneEduIds = new Set((eduItems || []).filter((e) => e.done).map((e) => e.id));
  const activeEduSessions = {};
  tasks.forEach((t) => {
    if (!t.eduId || t.groupId || t.done || doneEduIds.has(t.eduId)) return;
    (activeEduSessions[t.eduId] ||= []).push(t);
  });
  const eduSessionItems = Object.values(activeEduSessions)
    .map((sessions) => sessions.filter((t) => t.date && t.date <= todayISO).sort((a, b) => a.date.localeCompare(b.date)))
    .map((due) => due[due.length - 1])
    .filter(Boolean)
    // Same swap as groupItems above — the session's own work day picked it, but the
    // assignment/test's real due date is what the row sorts and shows a badge by. A
    // flexible deadline (see Education's "This deadline can move if it needs to") sorts
    // as if it were a day later than it really is, so it doesn't outrank an equally-close
    // fixed deadline — sortDate is separate from date so the badge itself still shows the
    // real due date, not the nudged one.
    .map((t) => {
      const parent = (eduItems || []).find((e) => e.id === t.eduId);
      const dueDate = parent?.dueDate || t.date;
      const sortDate = parent?.flexible ? toISO(addDays(new Date(dueDate + "T00:00:00"), 1)) : dueDate;
      return { ...t, date: dueDate, sortDate };
    });
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
    // A manually dragged order wins outright, regardless of which of these is due
    // sooner — dragging is how you say "I want to do this one first," not just a way
    // to break ties between two things due the same day. But that override only holds
    // for TODAY's own drag (orderSetDate === todayISO) — otherwise a single drag from a
    // week ago would keep outranking everything by due date forever, including a
    // brand-new task that's due today and has never been touched. Due date decides the
    // order for anything not freshly dragged, with overdue/carried-over items leading,
    // then today's, then anything shown early because it's coming up soon.
  ].sort((a, b) => {
    const aFresh = a.orderIndex != null && a.orderSetDate === todayISO;
    const bFresh = b.orderIndex != null && b.orderSetDate === todayISO;
    if (aFresh && bFresh) return a.orderIndex - b.orderIndex;
    if (aFresh) return -1;
    if (bFresh) return 1;
    const ad = a.sortDate || a.date || "9999-99-99";
    const bd = b.sortDate || b.date || "9999-99-99";
    return ad.localeCompare(bd);
  });
  const todaysEvents = events.filter((e) => e.date === todayISO && e.start != null).sort((a, b) => a.start - b.start);

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
  // Three empty calendar hours aren't automatically three productive ones — the after-
  // school buffer (Settings > Pace & capacity) is a flat tax on the day's usable window,
  // covering the energy dip/commute time that's never really available for schoolwork,
  // no matter what time it is when this is checked.
  const bufferHours = (profile?.afterSchoolBufferMinutes ?? 0) / 60;
  const windowHoursLeft = Math.max(0, dayEnd - Math.max(nowDecimal, dayStart) - bufferHours);
  // A different buffer from the one above — not once at the start of the day, but
  // around EVERY fixed commitment still ahead: walking out of one thing and into the
  // next isn't instant, so each remaining task/event "costs" its own length plus this
  // padding before and after, not just its bare duration.
  const transitionBufferMin = profile?.transitionBufferMinutes ?? 0;
  const committedMin = [...todaysTimedTasks, ...todaysEvents]
    .filter((item) => item.start + (item.duration || 60) / 60 > nowDecimal)
    .reduce((sum, item) => sum + (item.duration || 60) + transitionBufferMin * 2, 0);
  const freeHoursLeft = Math.max(0, windowHoursLeft - committedMin / 60);
  // A task with no picked duration still needs an estimate to be part of this math — 30
  // min is a reasonable "quick thing" default, same ballpark as the shortest preset in
  // the duration picker, scaled by the student's own pace setting like every other
  // estimate this default feeds into.
  const defaultTaskMin = Math.round(30 * (profile?.paceMultiplier ?? 1));
  const untimedNeededMin = todaysUntimed.reduce((sum, t) => sum + (t.duration ?? defaultTaskMin), 0);
  const fitsInTime = untimedNeededMin / 60 <= freeHoursLeft;
  // Plenty of time: just point at whatever's already first (manual order, or date).
  // Tight: lead with the quickest thing first — an actual win banked now beats staring
  // at the biggest task while the clock runs out. Either way, row 0 of this list IS "the
  // suggestion" — highlighted with its own Start button below — so dragging a different
  // row into that spot is how you change what starts right now.
  const baseUntimedOrder = fitsInTime
    ? todaysUntimed
    : (() => {
        const quick = [...todaysUntimed].sort((a, b) => (a.duration ?? 30) - (b.duration ?? 30))[0];
        return quick ? [quick, ...todaysUntimed.filter((t) => t.id !== quick.id)] : todaysUntimed;
      })();
  const untimedById = new Map(todaysUntimed.map((t) => [t.id, t]));
  const displayUntimed = liveOrder ? liveOrder.map((id) => untimedById.get(id)).filter(Boolean) : baseUntimedOrder;
  // The same task the top "Anytime today" row highlights — the Focus Session widget
  // below is tied to this one task, same as that row's own Start button.
  const heroTask = displayUntimed[0] || null;
  // Defaults the picker to THIS task's own recommended length (see
  // meaningfulFocusPresets) whenever the suggested task changes, instead of always
  // landing on a generic pace-based number unrelated to what's actually being started.
  // Only on an actual task change (not every render) so picking a different preset by
  // hand isn't immediately overwritten.
  useEffect(() => {
    if (heroTask?.duration) setFocusMinutes(heroTask.duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroTask?.id]);
  const startDrag = (id) => (e) => {
    if (!onReorderTasks) return;
    e.preventDefault();
    const order = baseUntimedOrder.map((t) => t.id);
    dragRef.current = { id, order };
    setDraggingId(id);
    setLiveOrder(order);
  };

  // Finished today, across whatever kind of item it was — its own quiet "wins" list
  // below Habits, and the count "Today's steps" shows next to the finish-time estimate.
  const doneTodayTasks = tasks.filter((t) => t.date === todayISO && t.done);
  const remainingStepCount = todaysTimedTasks.length + todaysUntimed.length;
  const scaffoldedTotalCount = remainingStepCount + doneTodayTasks.length;
  // "No free time left today" reads like the app assigning you a full evening of work —
  // same numbers, but framed as when you'll be DONE reads as Scaffold helping you get
  // through today rather than filling it up. Just summing durations (flexible work +
  // fixed commitments) silently assumes they compress together with no gaps — a fixed
  // commitment starts at its own clock time regardless of whether flexible work is done
  // by then, so a gap before it (e.g. free until 7:30, tutoring not until 8) still passes
  // for real and has to be counted. This walks the clock forward instead: flexible work
  // fills the gap before each upcoming fixed slot, and a slot always starts on time even
  // if there's dead air first.
  // Same transitionBufferMinutes as the free-time check above, but applied precisely
  // here instead of as a flat per-item tax: pad the slot itself — start earlier (prep
  // time flexible work can't eat into) and end later (decompression before the next
  // gap starts counting) — so the walk-forward naturally leaves room on both sides of
  // every commitment instead of assuming you can work right up to the door and start
  // the next thing the instant one ends.
  const transitionBufferHours = transitionBufferMin / 60;
  const fixedSlotsToday = [...todaysTimedTasks, ...todaysEvents]
    .filter((item) => item.start + (item.duration || 60) / 60 > nowDecimal)
    .map((item) => ({ start: item.start - transitionBufferHours, end: item.start + (item.duration || 60) / 60 + transitionBufferHours }))
    .sort((a, b) => a.start - b.start);
  const estimatedFinishDecimal = (() => {
    let cursor = nowDecimal;
    let remaining = untimedNeededMin / 60; // hours of flexible work still to place
    // Every fixed slot has to be walked past, whether or not flexible work is still
    // left to place — a slot fully absorbing the remaining work doesn't mean the day's
    // done, it just means the NEXT obligation (the fixed slot itself) hasn't happened yet.
    for (const slot of fixedSlotsToday) {
      const gap = Math.max(0, slot.start - cursor);
      const used = Math.min(remaining, gap);
      cursor += used;
      remaining -= used;
      cursor = Math.max(cursor, slot.end); // the commitment happens regardless of what's left
    }
    return cursor + remaining;
  })();
  // A brand-new account, not just a light day — nothing in Tasks, Education, Habits, or
  // Calendar yet at all. The empty "Today's steps" card otherwise just reads as
  // unfinished; a guided first action gives it somewhere to go instead.
  const isFirstUse = tasks.length === 0 && eduItems.length === 0 && habits.length === 0 && events.length === 0;
  const [showBrainDump, setShowBrainDump] = useState(false);
  // Right after onboarding, the very first Dashboard visit opens Brain Dump on its own —
  // the second of the two "Up next" steps the onboarding Done screen just promised.
  useEffect(() => {
    if (autoOpenBrainDump) {
      setShowBrainDump(true);
      onAutoOpenBrainDumpHandled?.();
    }
  }, [autoOpenBrainDump, onAutoOpenBrainDumpHandled]);

  // A schedule nobody's checked in on since this morning is just a guess by afternoon —
  // this is what keeps "done around X" honest instead of quietly going stale. Fires on
  // its own every hour Dashboard's actually open; the header button next to it covers
  // checking in early instead of waiting the full hour out.
  const [showCheckin, setShowCheckin] = useState(false);
  const openTodayItems = [...todaysTimedTasks, ...todaysUntimed].filter((t) => t.id);
  // Whether there's anything to check in ABOUT today — not just open tasks, since a day
  // with only an event left (tutoring, practice) is still worth checking in on. Tasks
  // alone being empty used to hide the button/skip the auto-prompt even with an event
  // still ahead.
  const hasCheckinWorthyItems = openTodayItems.length > 0 || todaysEvents.length > 0;
  // Refs so the interval (set up once) always reads the CURRENT values instead of
  // whatever they were on the render that first mounted it — otherwise an hour from now
  // it'd still be checking against an empty "today" list from this exact moment, or
  // popping up on top of a modal that happened to open later.
  const hasCheckinWorthyItemsRef = useRef(hasCheckinWorthyItems);
  hasCheckinWorthyItemsRef.current = hasCheckinWorthyItems;
  const suppressCheckinRef = useRef(suppressCheckin);
  suppressCheckinRef.current = suppressCheckin;
  useEffect(() => {
    const timer = setInterval(() => {
      if (!hasCheckinWorthyItemsRef.current || suppressCheckinRef.current) return;
      setShowCheckin(true);
    }, CHECKIN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
  // Browsing which week this widget shows is local to Dashboard — it's just a peek, not
  // the same "which day is selected" state Calendar owns; jumping back to this week is
  // just clicking the range label once you've moved off it.
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekRangeLabel = (() => {
    const start = weekDays[0], end = weekDays[6];
    const startMonth = start.toLocaleDateString(undefined, { month: "long" });
    const endMonth = end.toLocaleDateString(undefined, { month: "long" });
    return startMonth === endMonth ? `${startMonth} ${start.getDate()}–${end.getDate()}` : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
  })();
  const firstName = (profile?.name || "").trim().split(" ")[0];
  // "This week" strip's per-day load dots — how many tasks/events actually land on
  // that day, capped at 3 dots so a heavy day doesn't sprawl sideways.
  const dayLoad = (iso) => Math.min(3, tasks.filter((t) => !t.done && t.date === iso).length + events.filter((e) => e.date === iso).length);

  return (
    <div className="dv-root" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ ...flatSection, padding: "14px 0 20px", marginBottom: 20, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: serifFont, fontSize: 26, color: INK, letterSpacing: -0.3 }}>
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
          <button
            onClick={() => setShowBrainDump(true)}
            className="hoverable"
            style={{
              display: "flex", alignItems: "center", gap: 7, flexShrink: 0, border: `1px solid ${BORDER}`, cursor: "pointer",
              background: "#fff", color: INK, borderRadius: 999, padding: "8px 15px 8px 12px", fontSize: 13, fontWeight: 500,
            }}
          >
            <NotebookPen size={15} strokeWidth={1.8} color={MUTED} /> Brain dump
          </button>
          {hasCheckinWorthyItems && (
            <button
              onClick={() => setShowCheckin(true)}
              className="hoverable"
              style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, border: "none", background: "none", cursor: "pointer", color: INK, fontSize: 13.5, fontWeight: 500, padding: 0 }}
              title="Say what you got done — updates the rest of today's plan to match"
            >
              <MessageCircle size={16} strokeWidth={1.8} /> Check in
            </button>
          )}
        </div>
      </div>

      {showBrainDump && <BrainDumpModal onClose={() => setShowBrainDump(false)} onAddTask={onAddTask} tasks={tasks} events={events} />}
      {showCheckin && (
        <CheckinModal
          openItems={openTodayItems}
          tasks={tasks}
          events={events}
          onClose={() => setShowCheckin(false)}
          onMarkDone={(ids) => ids.forEach((id) => onToggleDone(id, true))}
          onChangeDates={(changes) => changes.forEach(({ id, newDate }) => onSetDate(id, newDate))}
          onAddTasks={(newTasks) => newTasks.forEach((t) => onAddTask(t))}
          onAddEvents={onAddEvents}
        />
      )}

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

        <div className="dv-col" style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0, flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div style={{ ...flatSection, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button
                onClick={() => setWeekOffset(0)}
                disabled={weekOffset === 0}
                title={weekOffset === 0 ? undefined : "Back to this week"}
                style={{ background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 700, color: INK, cursor: weekOffset === 0 ? "default" : "pointer", textDecoration: weekOffset === 0 ? "none" : "underline" }}
              >
                {weekRangeLabel}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={() => setWeekOffset((o) => o - 1)} title="Previous week" style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: MUTED, display: "flex" }}>
                    <ChevronLeft size={14} strokeWidth={2.3} />
                  </button>
                  <button onClick={() => setWeekOffset((o) => o + 1)} title="Next week" style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: MUTED, display: "flex" }}>
                    <ChevronRight size={14} strokeWidth={2.3} />
                  </button>
                </div>
              </div>
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
                      borderRadius: 10, background: "transparent", border: "none",
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

          <div style={{ background: HERO_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "22px 22px 20px", flexShrink: 0, boxShadow: "0 6px 24px rgba(26,26,46,0.06)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontFamily: serifFont, fontSize: 24, color: INK, letterSpacing: -0.3 }}>Today's steps</div>
              <div style={{ fontSize: 11.5, color: MUTED, flexShrink: 0 }}>
                {scaffoldedTotalCount > 0 && (
                  remainingStepCount > 0
                    ? `${remainingStepCount} step${remainingStepCount === 1 ? "" : "s"} left · done around ${decimalToTimeLabel(estimatedFinishDecimal)}`
                    // An event (tutoring, practice) still ahead isn't "all done" just because the tasks
                    // are — "Next:" (not "Then {title}") so a plain one-word event title like "school"
                    // reads as a schedule entry, not as a sentence fragment ("then school").
                    : (() => {
                        const upcomingEvent = todaysEvents.find((e) => e.start + (e.duration || 60) / 60 > nowDecimal);
                        return upcomingEvent ? `Next: ${upcomingEvent.title} at ${decimalToTimeLabel(upcomingEvent.start)}` : "All done for today";
                      })()
                )}
              </div>
            </div>
            {todaysTimedTasks.length === 0 && todaysUntimed.length === 0 && todaysEvents.length === 0 ? (
              isFirstUse ? (
                <div style={{ padding: "6px 0 4px" }}>
                  <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Nothing here yet — start with whatever's actually on your mind.</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setShowBrainDump(true)} className="hoverable" style={primaryBtn}>
                      Add something that's stressing you out
                    </button>
                    <button onClick={() => setView("education")} style={ghostBtn}>
                      Plan my first assignment
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState text="Nothing scheduled for today yet." />
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {todaysTimedTasks.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {todaysTimedTasks.map((item, i) => (
                      <TimelineRow key={item.id} item={item} col={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal} isFirst={i === 0} isLast={i === todaysTimedTasks.length - 1} isPast={item.start + (item.duration || 60) / 60 <= nowDecimal} />
                    ))}
                  </div>
                )}
                {displayUntimed.length > 0 && (
                  <div style={{ marginTop: todaysTimedTasks.length > 0 ? 10 : 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, marginBottom: 8 }}>Anytime today</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {displayUntimed.map((t, i) => {
                        const isTop = i === 0;
                        const col = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal;
                        return (
                          <div
                            key={t.id}
                            ref={(el) => { if (el) rowElsRef.current[t.id] = el; else delete rowElsRef.current[t.id]; }}
                            style={{
                              display: "flex", alignItems: "center", gap: isTop ? 10 : 8, padding: "10px 12px", borderRadius: 14,
                              background: "#fff",
                              border: isTop ? `1.5px solid ${PRIMARY}` : "none",
                              opacity: draggingId === t.id ? 0.4 : 1,
                            }}
                          >
                            {onReorderTasks && (
                              <div
                                onPointerDown={startDrag(t.id)}
                                title="Drag to reorder — the top spot is what Start launches"
                                style={{ display: "flex", flexShrink: 0, color: isTop ? PRIMARY_DARK : "#D1D5DB", cursor: "grab", touchAction: "none", padding: 5, margin: -5 }}
                              >
                                <GripVertical size={14} strokeWidth={2} />
                              </div>
                            )}
                            {onToggleDone && (
                              <Checkbox checked={false} onClick={() => onToggleDone(t.id, true)} color={isTop ? { border: PRIMARY_DARK } : col} size={isTop ? undefined : 16} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <WorkTitle title={t.title} mutedColor={isTop ? PRIMARY_DARK : MUTED} />{isTop && t.duration != null ? ` · ${formatDuration(t.duration)}` : ""}
                              </div>
                              <StepNotes notes={t.notes} title={t.title} color={isTop ? PRIMARY_DARK : undefined} duration={t.duration} />
                            </div>
                            {!isTop && t.duration != null && <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{formatDuration(t.duration)}</div>}
                            {t.date && (
                              <div style={{ flexShrink: 0 }}><UrgencyBadge iso={t.date} done={t.done} leadDays={t.groupId || t.eduId ? null : defaultLeadDays(t)} /></div>
                            )}
                            {isTop && onStartFocus && (
                              <button
                                onClick={() => onStartFocus(t.id, t.title, focusMinutes)}
                                className="hoverable"
                                style={{
                                  flexShrink: 0, padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                                  background: PRIMARY_DARK, color: "#fff", fontSize: 12, fontWeight: 700,
                                }}
                              >
                                Start
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {todaysEvents.length > 0 && (
                  <div style={{ marginTop: todaysTimedTasks.length > 0 || todaysUntimed.length > 0 ? 4 : 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, marginBottom: 6 }}>Today's events</div>
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

        <div className="dv-col" style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, flex: 1, minHeight: 0, overflowY: "auto" }}>
          {/* Sits FIRST in the right column now, ahead of Habits — that's "the corner"
              for Dashboard's own copy of the focus timer. When a session is already
              running, this becomes an empty slot: App.jsx portals the SAME
              floating-timer component (see FocusTimerModal's portalTarget) into it
              instead of leaving the idle picker showing underneath, so there's never two
              timers visible at once. Leaving Dashboard unmounts this slot, which is
              exactly what lets the timer reappear as the normal floating bottom-right
              card everywhere else. */}
          {hasActiveFocusSession && <div ref={focusSlotRef} style={{ flexShrink: 0 }} />}

          {/* A light card (border, no shadow/gradient/glow) — present enough to read as
              a real control, but deliberately lighter than Today's steps (which has both
              a border AND a shadow — see HERO_BG above) so it never reads as an equal
              peer. The bound task's own category color is the one accent used throughout
              (ring + the picked duration + the Start outline), not the app's theme
              purple, so it actually means something. The three durations aren't a flat
              15/25/50 either — they're scaled around THIS task's own estimated length
              (see meaningfulFocusPresets), with the middle one marked as the recommended
              one and pre-selected by default. Pressing Start calls the exact same
              onStartFocus the row's own Start button does — this is just a second way in. */}
          {!hasActiveFocusSession && (() => {
            const col = heroTask ? CATEGORY_COLORS[heroTask.category] || CATEGORY_COLORS.Personal : null;
            const accent = col ? col.accent : MUTED;
            const presets = meaningfulFocusPresets(heroTask?.duration);
            const recommendedIdx = heroTask?.duration ? 1 : -1;
            return (
              <div style={{ flexShrink: 0, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px 12px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>Focus session</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                    <svg width="56" height="56" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="23" fill="none" stroke={accent} strokeWidth="4" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontFamily: serifFont, fontSize: 11.5, color: INK }}>{pad(focusMinutes)}:00</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {heroTask ? (
                      <>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{heroTask.title}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: col.text, textTransform: "uppercase", letterSpacing: 0.3 }}>{heroTask.category}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12.5, color: MUTED }}>Nothing to start yet.</div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 10, marginBottom: 10 }}>
                  {presets.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => setFocusMinutes(m)}
                      title={i === recommendedIdx ? `${heroTask.title}'s recommended length` : undefined}
                      style={{
                        flex: 1, padding: "5px 0", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
                        border: `1px solid ${focusMinutes === m ? accent : BORDER}`,
                        background: focusMinutes === m ? (col ? col.bg : SURFACE) : "#fff",
                        color: focusMinutes === m ? accent : MUTED,
                      }}
                    >
                      {m}m{i === recommendedIdx ? " ★" : ""}
                    </button>
                  ))}
                </div>

                {heroTask && (
                  <button
                    onClick={() => onStartFocus(heroTask.id, heroTask.title, focusMinutes)}
                    className="hoverable"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
                      padding: "8px", borderRadius: 999, border: `1.5px solid ${accent}`, background: "#fff", color: accent,
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    <Play size={11} color={accent} /> Start to Focus
                  </button>
                )}
              </div>
            );
          })()}

          <div style={{ borderTop: hasActiveFocusSession ? "none" : `1px solid ${BORDER}`, paddingTop: hasActiveFocusSession ? 0 : 16, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED }}>Habits</div>
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
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, flexShrink: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, marginBottom: 8 }}>Done today</div>
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

