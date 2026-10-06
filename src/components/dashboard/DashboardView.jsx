import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, GripVertical, MessageCircle, NotebookPen } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { BORDER, INK, MUTED, PRIMARY_DARK, serifFont } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";
const FOCUS_PRESETS = [15, 25, 50];

// Flat experiment: no white card fill/border/shadow, sections just sit directly on the
// page's own background — one continuous surface instead of white boxes on gray. The one
// lifted surface on the page is the "Up next" hero (see NextActionHero) — everything else
// (This week, the rest of today's list, Habits, Done today) stays flat/bordered-once at
// most, so the hierarchy reads at a glance instead of every section competing as its own box.
const flatSection = { background: "transparent", border: "none", borderRadius: 0, boxShadow: "none" };
import { addDays, currentStreak as habitStreak, dayLabel, decimalToTimeLabel, defaultLeadDays, formatDuration, inLeadWindow, startOfWeek, toISO } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";
import { EmptyState } from "../shared/Misc";
import BrainDumpModal from "./BrainDumpModal";
import CheckinModal from "./CheckinModal";
import WorkTitle from "../shared/WorkTitle";
import StepNotes from "../shared/StepNotes";

const CHECKIN_INTERVAL_MS = 60 * 60 * 1000;

// A timed task/event row — category shown as a colored bar on the left edge (not a
// repeated all-caps text label; the row sits in a list that's already grouped/colored by
// category elsewhere, so spelling it out again in text on every row was pure repetition).
function TimelineRow({ item, col, isLast, isPast }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: isLast ? "none" : `1px solid ${BORDER}`, opacity: isPast ? 0.45 : 1 }}>
      <div style={{ width: 54, fontSize: 11.5, color: MUTED, flexShrink: 0 }}>{decimalToTimeLabel(item.start)}</div>
      <div style={{ width: 3, borderRadius: 2, background: col.accent, flexShrink: 0, alignSelf: "stretch" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <WorkTitle title={item.title} mutedColor={MUTED} />
        </div>
        <StepNotes notes={item.notes} title={item.title} duration={item.duration} />
      </div>
      {item.duration != null && <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{formatDuration(item.duration)}</div>}
    </div>
  );
}

// The one dominant element on the page. Scaffold's actual job is getting you STARTED on
// something — not just displaying a schedule — so this replaces both the old "suggested
// row inside the list" and the separate, task-less Pomodoro ring with a single task-tied
// control: pick (or accept the suggested) task from a real dropdown, pick a duration,
// start. Everything else on the page is deliberately quieter so this is the one thing
// that visually leads.
function NextActionHero({ mode, heroTask, candidates, onPickTask, nextItem, nextItemIsTask, focusMinutes, setFocusMinutes, onStart, col, statusLine, onBrainDump, onPlanFirst }) {
  const shell = (children) => (
    <div style={{ position: "relative", border: `1px solid ${BORDER}`, borderLeft: col ? `4px solid ${col.accent}` : `1px solid ${BORDER}`, borderRadius: 20, padding: "22px 26px", background: "#fff" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: col ? col.text : MUTED, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Up next</div>
      {children}
    </div>
  );

  if (mode === "firstUse") {
    return shell(
      <>
        <div style={{ fontSize: 14, color: MUTED, marginBottom: 14 }}>Nothing here yet — start with whatever's actually on your mind.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onBrainDump} className="hoverable" style={primaryBtn}>Add something that's stressing you out</button>
          <button onClick={onPlanFirst} style={ghostBtn}>Plan my first assignment</button>
        </div>
      </>
    );
  }
  if (mode === "nothing") {
    return shell(<div style={{ fontFamily: serifFont, fontSize: 20, color: INK }}>Nothing on your plate today.</div>);
  }
  if (mode === "done") {
    return shell(<div style={{ fontFamily: serifFont, fontSize: 20, color: INK }}>That's everything for today — nice work.</div>);
  }
  if (mode === "pick") {
    return shell(
      <>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: serifFont, fontSize: 23, color: INK }}>Start on</div>
          <select
            value={heroTask.id}
            onChange={(e) => onPickTask(e.target.value)}
            aria-label="Task to start"
            style={{
              fontFamily: serifFont, fontSize: 23, color: INK, background: "none", border: "none",
              borderBottom: `2px solid ${col.accent}`, padding: "0 2px 2px", cursor: candidates.length > 1 ? "pointer" : "default",
              maxWidth: "100%",
            }}
          >
            {candidates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        {statusLine && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 8 }}>{statusLine}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {FOCUS_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => setFocusMinutes(m)}
                style={{
                  ...ghostBtn, padding: "6px 13px", background: "#fff",
                  borderColor: focusMinutes === m ? col.accent : BORDER,
                  color: focusMinutes === m ? col.text : MUTED,
                  fontWeight: focusMinutes === m ? 700 : 600,
                }}
              >
                {m}m
              </button>
            ))}
          </div>
          <button
            onClick={() => onStart(heroTask.id, heroTask.title, focusMinutes)}
            className="hoverable"
            style={{ padding: "11px 24px", borderRadius: 999, border: "none", background: PRIMARY_DARK, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Start {focusMinutes}m
          </button>
        </div>
      </>
    );
  }
  if (mode === "waiting") {
    return shell(
      <>
        <div style={{ fontFamily: serifFont, fontSize: 23, color: INK, marginBottom: 6 }}>{nextItem.title}</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: nextItemIsTask ? 18 : 0 }}>{decimalToTimeLabel(nextItem.start)}</div>
        {nextItemIsTask && (
          <button
            onClick={() => onStart(nextItem.id, nextItem.title, nextItem.duration || focusMinutes)}
            className="hoverable"
            style={{ padding: "11px 24px", borderRadius: 999, border: "none", background: PRIMARY_DARK, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Start now
          </button>
        )}
      </>
    );
  }
  return null;
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
  // being empty used to hide the button/skip the auto-prompt entirely even with an event
  // still ahead — same gap the "All done for today" bug (now fixed) had.
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

  // What the hero at the top of the page shows — a manual pick from the dropdown wins if
  // it's still among today's flexible tasks; otherwise the top of the (possibly dragged)
  // priority order. No reset effect needed: once the picked id drops out of today's list
  // (done, or a new day), this just falls back to the top of the list on its own.
  const [heroOverrideId, setHeroOverrideId] = useState(null);
  const heroCandidates = displayUntimed;
  const heroTask = heroCandidates.find((t) => t.id === heroOverrideId) || heroCandidates[0] || null;
  const nextTimedTask = !heroTask ? todaysTimedTasks.find((t) => t.start + (t.duration || 60) / 60 > nowDecimal) || null : null;
  const upcomingEvent = todaysEvents.find((e) => e.start + (e.duration || 60) / 60 > nowDecimal) || null;
  const nextEvent = !heroTask && !nextTimedTask ? upcomingEvent : null;
  const remainingAfterHero = Math.max(0, remainingStepCount - (heroTask ? 1 : 0));
  // "All done for today" used to fire the moment every TASK was done, even with an event
  // (tutoring, practice) still sitting there untouched later that day — this is what
  // actually checks for that instead of ignoring events entirely.
  const heroStatusLine = heroTask
    ? remainingAfterHero > 0
      ? `${remainingAfterHero} more after this · done around ${decimalToTimeLabel(estimatedFinishDecimal)}`
      : upcomingEvent
        ? `Then ${upcomingEvent.title} at ${decimalToTimeLabel(upcomingEvent.start)}`
        : "Last thing on your list today."
    : "";
  const hasAnythingToday = todaysTimedTasks.length > 0 || todaysUntimed.length > 0 || todaysEvents.length > 0;
  const heroMode = isFirstUse
    ? "firstUse"
    : heroTask
      ? "pick"
      : nextTimedTask || nextEvent
        ? "waiting"
        : hasAnythingToday
          ? "done" // had timed items today, all of them already past
          : scaffoldedTotalCount > 0
            ? "done" // had stuff today and finished all of it
            : "nothing"; // nothing was ever on the books today
  const heroCol = heroTask
    ? CATEGORY_COLORS[heroTask.category] || CATEGORY_COLORS.Personal
    : nextTimedTask || nextEvent
      ? CATEGORY_COLORS[(nextTimedTask || nextEvent).category] || CATEGORY_COLORS.Personal
      : null;

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

      <div style={{ ...flatSection, flexShrink: 0, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
            title={weekOffset === 0 ? undefined : "Back to this week"}
            style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 700, color: MUTED, cursor: weekOffset === 0 ? "default" : "pointer", textDecoration: weekOffset === 0 ? "none" : "underline" }}
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
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "5px 2px",
                  borderRadius: 10, background: "transparent", border: "none",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED }}>{dayLabel(d).slice(0, 1).toUpperCase()}</div>
                <div style={{ fontFamily: serifFont, fontSize: 16, color: isToday ? PRIMARY_DARK : INK }}>{d.getDate()}</div>
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

      {/* The one dominant element on the page — see NextActionHero above. When a session
          is already running, this becomes an empty slot instead: App.jsx portals the SAME
          floating-timer component (see FocusTimerModal's portalTarget) into it, so there's
          never two timers/pickers visible at once, and the running timer takes over the
          exact spot the "start" picker just occupied. */}
      <div style={{ flexShrink: 0, marginBottom: 24 }}>
        {hasActiveFocusSession ? (
          <div ref={focusSlotRef} />
        ) : (
          <NextActionHero
            mode={heroMode}
            heroTask={heroTask}
            candidates={heroCandidates}
            onPickTask={setHeroOverrideId}
            nextItem={nextTimedTask || nextEvent}
            nextItemIsTask={!!nextTimedTask}
            focusMinutes={focusMinutes}
            setFocusMinutes={setFocusMinutes}
            onStart={onStartFocus}
            col={heroCol}
            statusLine={heroStatusLine}
            onBrainDump={() => setShowBrainDump(true)}
            onPlanFirst={() => setView("education")}
          />
        )}
      </div>

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

        <div className="dv-col" style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, flex: 1, minHeight: 0, overflowY: "auto" }}>
          {hasAnythingToday ? (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED }}>Then today</div>
              {todaysTimedTasks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {todaysTimedTasks.map((item, i) => (
                    <TimelineRow key={item.id} item={item} col={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal} isLast={i === todaysTimedTasks.length - 1} isPast={item.start + (item.duration || 60) / 60 <= nowDecimal} />
                  ))}
                </div>
              )}
              {displayUntimed.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {displayUntimed.map((t, i) => {
                    const col = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal;
                    return (
                      <div
                        key={t.id}
                        ref={(el) => { if (el) rowElsRef.current[t.id] = el; else delete rowElsRef.current[t.id]; }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
                          borderBottom: i === displayUntimed.length - 1 ? "none" : `1px solid ${BORDER}`,
                          opacity: draggingId === t.id ? 0.4 : 1,
                        }}
                      >
                        <div style={{ width: 3, borderRadius: 2, background: col.accent, alignSelf: "stretch", flexShrink: 0 }} />
                        {onReorderTasks && (
                          <div
                            onPointerDown={startDrag(t.id)}
                            title="Drag to reorder — this decides what the hero above suggests next"
                            style={{ display: "flex", flexShrink: 0, color: "#D1D5DB", cursor: "grab", touchAction: "none", padding: 5, margin: -5 }}
                          >
                            <GripVertical size={14} strokeWidth={2} />
                          </div>
                        )}
                        {onToggleDone && <Checkbox checked={false} onClick={() => onToggleDone(t.id, true)} color={col} size={16} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <WorkTitle title={t.title} mutedColor={MUTED} />
                          </div>
                          <StepNotes notes={t.notes} title={t.title} duration={t.duration} />
                        </div>
                        {t.duration != null && <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{formatDuration(t.duration)}</div>}
                        {t.date && (
                          <div style={{ flexShrink: 0 }}><UrgencyBadge iso={t.date} done={t.done} leadDays={t.groupId || t.eduId ? null : defaultLeadDays(t)} /></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {todaysEvents.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {todaysEvents.map((item, i) => (
                    <TimelineRow key={item.id} item={item} col={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal} isLast={i === todaysEvents.length - 1} isPast={item.start + (item.duration || 60) / 60 <= nowDecimal} />
                  ))}
                </div>
              )}
            </>
          ) : (
            !isFirstUse && <EmptyState text="Nothing else scheduled for today." />
          )}
        </div>

        <div className="dv-col" style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0, flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {habits.map((h) => {
                  const done = h.doneDates.includes(todayISO);
                  const streak = habitStreak(h.doneDates);
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Checkbox checked={done} onClick={() => onSetHabitDone(h.id, todayISO, !done)} color={{ border: PRIMARY_DARK }} size={15} />
                      <div style={{ flex: 1, fontSize: 13, color: done ? MUTED : INK, textDecoration: done ? "line-through" : "none" }}>{h.title}</div>
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
              <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, marginBottom: 10 }}>Done today</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {doneTodayTasks.map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Checkbox checked onClick={() => onToggleDone(t.id, false)} color={CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal} size={15} />
                    <div style={{ flex: 1, fontSize: 13, color: MUTED, textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
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

