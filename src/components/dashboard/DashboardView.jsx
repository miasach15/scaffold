import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Flame, GripVertical, MessageCircle, NotebookPen, Play, SkipForward } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { BORDER, INK, MUTED, PRIMARY, PRIMARY_DARK, SURFACE, TONE, serifFont } from "../../lib/constants";
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
import { addDays, currentStreak as habitStreak, decimalToTimeLabel, defaultLeadDays, formatShortDate, inLeadWindow, pad, toISO } from "../../lib/dateHelpers";
import { compareTaskPriority, staleSessionCount, STALE_SESSION_THRESHOLD } from "../../lib/taskPriority";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";
import { EmptyState } from "../shared/Misc";
import FreehandIcon from "../shared/FreehandIcon";
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
        <StepNotes notes={item.notes} title={item.title} taskId={item.id} />
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardView({ profile, events, tasks, habits, eduItems, onSetHabitDone, onToggleDone, setView, onSelectDay, onStartFocus, onAddTask, onAddEvents, onSetDate, onPushTomorrow, onReorderTasks, autoOpenBrainDump, onAutoOpenBrainDumpHandled, hasActiveFocusSession, focusSlotRef, suppressCheckin, onCheckOffStep, goalActionChips, goalMilestoneChips, onToggleGoalChip }) {
  const CATEGORY_COLORS = useCategoryColors();
  // Reordering "Anytime today" uses pointer events, not native HTML5 drag-and-drop —
  // native drag doesn't work at all on touch in most mobile browsers, and gives no
  // feedback on where a card will land until you actually release it. This tracks the
  // dragged row's live position as the pointer moves and reflows the list immediately;
  // the new order is only persisted (via onReorderTasks) once, on release.
  const [draggingId, setDraggingId] = useState(null);
  const [liveOrder, setLiveOrder] = useState(null); // ids in their current on-screen order, only while dragging
  // "Anytime today" stays a glance, not a wall — capped at UNTIMED_VISIBLE_CAP unless
  // expanded. A must-show item (overdue/due today/tomorrow/the day after, or a
  // breakdown's own row — always real current work) is never one of the ones the cap
  // trims off; it only ever limits how many less-pressing items pad the list out
  // alongside them.
  const [untimedExpanded, setUntimedExpanded] = useState(false);
  // "Looking ahead" (right column, below Habits) opens at a 3-day glance, same
  // show-more idea as "Anytime today" above — full week only once asked for.
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  // Which date chip is open, if any — null means just the dates show, no list under
  // them. Picking the same one again closes it; picking a different one swaps to it.
  const [selectedUpcomingDay, setSelectedUpcomingDay] = useState(null);
  // A carried-over breakdown's extra steps (see groupItems' otherSteps) stay hidden
  // behind the dropdown by default — clicking it to expand adds the id here.
  const [expandedBreakdowns, setExpandedBreakdowns] = useState(() => new Set());
  const toggleBreakdownExpanded = (id) => setExpandedBreakdowns((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const dragRef = useRef(null); // mutable { id, order, grabOffsetY } for the active gesture, so the move/up listeners don't need to resubscribe on every reflow
  const rowElsRef = useRef({}); // task id -> row DOM node, for hit-testing during drag
  // Every OTHER row's bounding-rect top right before a reorder actually happens, so the
  // layout effect below can animate each one in from where it WAS instead of just
  // snapping to its new slot (a "FLIP" — see apple-design's momentum/continuity notes).
  const prevRowRectsRef = useRef({});
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
        const rects = {};
        others.forEach((id) => {
          if (id === cur.id) return;
          const el = rowElsRef.current[id];
          if (el) rects[id] = el.getBoundingClientRect().top;
        });
        prevRowRectsRef.current = rects;
        cur.order = others;
        setLiveOrder(others);
      }
      // The dragged row follows the pointer 1:1, respecting where it was actually
      // grabbed (apple-design §2) — recomputed fresh against the row's CURRENT flow
      // position every move (not a fixed drag-start baseline), so a mid-drag reorder
      // above never causes it to visually jump.
      const draggedEl = rowElsRef.current[cur.id];
      if (draggedEl) {
        draggedEl.style.transform = ""; // measure its flow position, not wherever last frame's transform put it
        const flowTop = draggedEl.getBoundingClientRect().top;
        draggedEl.style.transform = `translateY(${y - cur.grabOffsetY - flowTop}px)`;
      }
    };
    const handleUp = () => {
      const cur = dragRef.current;
      if (cur) {
        const el = rowElsRef.current[cur.id];
        if (el) { el.style.transition = ""; el.style.transform = ""; el.style.zIndex = ""; }
      }
      dragRef.current = null;
      setDraggingId(null);
      setLiveOrder(null);
      // Goal rows (synthetic "goal-" ids) can ride along in the drag for visual
      // positioning, but they aren't real tasks — only the real task ids get persisted.
      if (cur) onReorderTasksRef.current?.(cur.order.filter((id) => !String(id).startsWith("goal-")));
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  // The "play" half of FLIP: right after liveOrder changes (so after React has already
  // reflowed every row into its new slot, but before the browser paints), snap each
  // non-dragged row back to where it visually WAS, then transition it to its real
  // (identity) position — it reads as sliding into place instead of teleporting there.
  useLayoutEffect(() => {
    if (!liveOrder) return;
    const prevRects = prevRowRectsRef.current;
    liveOrder.forEach((id) => {
      if (id === draggingId) return; // the dragged row is handled separately, via direct pointer tracking above
      const el = rowElsRef.current[id];
      const prevTop = prevRects[id];
      if (!el || prevTop == null) return;
      const newTop = el.getBoundingClientRect().top;
      const delta = prevTop - newTop;
      if (!delta) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;
      // Forces a reflow so the browser registers the starting transform above before
      // animating away from it.
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight;
      el.style.transition = "transform 180ms ease";
      el.style.transform = "";
    });
  }, [liveOrder, draggingId]);

  const todayISO = toISO(new Date());

  // Same "only show up once actually due/overdue" rule TodaySection gives goal actions
  // on the Tasks page — a goal action due next month has no business cluttering
  // Dashboard today. A milestone's own deadline counts too (it's a real deadline, not a
  // day-to-day step), but it has no independently-settable "done" (derived from its
  // actions), so its row just opens Goals rather than offering a checkbox that would
  // silently no-op.
  const dueGoalActions = (goalActionChips || []).filter((c) => !c.done && c.date && c.date <= todayISO);
  const dueGoalMilestones = (goalMilestoneChips || []).filter((c) => !c.done && c.date && c.date <= todayISO);
  // Folded into "Anytime today" as plain rows (not a separate labeled section) — same
  // synthetic-item trick TodaySection already uses to merge goal chips into its own
  // unified list. `goalKind` distinguishes the two for the checkbox handler below; a
  // "goal-" id prefix is also how the drag-persist filter (see handleUp) knows to leave
  // these out of what actually gets saved as a task order.
  const goalUntimedItems = [
    ...dueGoalMilestones.map((c) => ({ id: `goal-${c.id}`, title: c.title, date: c.date, duration: null, notes: null, category: c.category, isGoalItem: true, goalKind: "milestone", goalChip: c })),
    ...dueGoalActions.map((c) => ({ id: `goal-${c.id}`, title: c.title, date: c.date, duration: null, notes: null, category: c.category, isGoalItem: true, goalKind: "action", goalChip: c })),
  ];

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
    .map((steps) => {
      const sorted = steps.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      return { next: sorted[0], otherSteps: sorted.slice(1) };
    })
    .filter(({ next }) => next && next.date && next.date <= todayISO)
    // Which STEP is next is picked by its own work day (just above) — but the row
    // itself normally sorts/shows a badge for the project's overall due date instead,
    // same as eduSessionItems below, so both land by how urgent the real deadline
    // actually is. A next step whose own work day has already passed means the whole
    // breakdown has carried over, though — in that case the row sorts/shows a badge for
    // TODAY instead of the (possibly days-out) project deadline, so it reads as the
    // overdue thing it actually is and sits near the top with everything else that's
    // overdue/due today, rather than ranking by a calm future due date and reading as
    // "moved to the bottom" once nothing else is boosting it up there. The normal "just
    // show the next step" row can also hide real progress on later steps you already did
    // while this one sat untouched, so carried-over groups surface every remaining step
    // (not just the next one) to check off.
    .map(({ next, otherSteps }) => {
      const carriedOver = !!next.date && next.date < todayISO;
      return { ...next, date: carriedOver ? todayISO : (next.groupDueDate || next.date), carriedOver, otherSteps: carriedOver ? otherSteps : [] };
    });
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
    ...goalUntimedItems,
    // A manually dragged order wins outright, regardless of which of these is due
    // sooner — dragging is how you say "I want to do this one first," not just a way
    // to break ties between two things due the same day. But that override only holds
    // for TODAY's own drag (orderSetDate === todayISO) — otherwise a single drag from a
    // week ago would keep outranking everything by due date forever, including a
    // brand-new task that's due today and has never been touched. Short of a drag,
    // compareTaskPriority (src/lib/taskPriority.js) is the same ordering Tasks' Today
    // glance and Upcoming list also sort by — homework, then assignment work, then
    // studying, unless something's actually due today/tomorrow, which jumps the queue
    // regardless of kind.
  ].sort((a, b) => compareTaskPriority(a, b, todayISO));
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
  // A fresh drag (today's own) already won the sort above and sits at todaysUntimed[0] —
  // that's an explicit "I want this one first," which outranks the tight-schedule
  // heuristic same as it outranks due-date order. Without this check, dragging anything
  // into place on a packed day got silently undone the instant the quick-lead reorder ran
  // on the next render, right after the drag released.
  const topIsFreshDrag = todaysUntimed[0]?.orderIndex != null && todaysUntimed[0]?.orderSetDate === todayISO;
  const baseUntimedOrder = fitsInTime || topIsFreshDrag
    ? todaysUntimed
    : (() => {
        const quick = [...todaysUntimed].sort((a, b) => (a.duration ?? 30) - (b.duration ?? 30))[0];
        return quick ? [quick, ...todaysUntimed.filter((t) => t.id !== quick.id)] : todaysUntimed;
      })();
  const untimedById = new Map(todaysUntimed.map((t) => [t.id, t]));
  const displayUntimed = liveOrder ? liveOrder.map((id) => untimedById.get(id)).filter(Boolean) : baseUntimedOrder;
  // The same task the top "Anytime today" row highlights — the Focus Session widget
  // below is tied to this one task, same as that row's own Start button. A goal item
  // has no real task behind it (no Focus Timer target, nothing to drag), so it never
  // becomes the hero even if it happens to sort first.
  const heroTask = displayUntimed.find((t) => !t.isGoalItem) || null;
  const UNTIMED_VISIBLE_CAP = 5;
  const untimedMustShowCutoff = toISO(addDays(new Date(todayISO + "T00:00:00"), 2));
  let untimedShownCount = 0;
  const visibleUntimed = untimedExpanded
    ? displayUntimed
    : displayUntimed.filter((t) => {
        const mustShow = !!t.groupId || !!t.carriedOver || (t.date && t.date <= untimedMustShowCutoff);
        if (mustShow) { untimedShownCount++; return true; }
        if (untimedShownCount < UNTIMED_VISIBLE_CAP) { untimedShownCount++; return true; }
        return false;
      });
  const hiddenUntimedCount = displayUntimed.length - visibleUntimed.length;
  const startDrag = (id) => (e) => {
    if (!onReorderTasks) return;
    e.preventDefault();
    const order = baseUntimedOrder.map((t) => t.id);
    // Where WITHIN the row it was actually grabbed — stays constant for the whole drag,
    // so the row tracks the finger from that exact point instead of snapping its top
    // edge to the pointer (apple-design §2).
    const el = rowElsRef.current[id];
    const grabOffsetY = el ? e.clientY - el.getBoundingClientRect().top : 0;
    dragRef.current = { id, order, grabOffsetY };
    setDraggingId(id);
    setLiveOrder(order);
  };

  // Finished today, across whatever kind of item it was — its own quiet "wins" list
  // below Habits, and the count "Today's steps" shows next to the finish-time estimate.
  const doneTodayTasks = tasks.filter((t) => t.date === todayISO && t.done);
  // "Looking ahead" — a read-only glance at what's coming, not another queue to manage:
  // no drag, no Start button, no carry-forward collapsing (that's specifically a "today"
  // concept for stuff that already slipped by, and none of these days have happened
  // yet). Just, per day, whatever's actually scheduled: plain tasks/breakdown steps/edu
  // sessions whose own date is that day, anything due that day without a session landing
  // on it too (so a deadline several days out that has no work session yet still shows),
  // and events.
  const UPCOMING_DEFAULT_DAYS = 3;
  const UPCOMING_MAX_DAYS = 7;
  const upcomingDays = Array.from({ length: upcomingExpanded ? UPCOMING_MAX_DAYS : UPCOMING_DEFAULT_DAYS }, (_, i) => {
    const date = addDays(new Date(todayISO + "T00:00:00"), i + 1);
    const iso = toISO(date);
    const dayTasks = tasks.filter((t) => t.date === iso && !t.done && !(t.eduId && doneEduIds.has(t.eduId))).sort((a, b) => (a.start ?? 99) - (b.start ?? 99));
    const eduIdsWithSessionThatDay = new Set(dayTasks.map((t) => t.eduId).filter(Boolean));
    const dueWithoutSession = (eduItems || []).filter((e) => e.dueDate === iso && !e.done && !eduIdsWithSessionThatDay.has(e.id));
    const dayEvents = events.filter((e) => e.date === iso).sort((a, b) => (a.start ?? 99) - (b.start ?? 99));
    return { iso, date, dayTasks, dueWithoutSession, dayEvents };
  });
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
  const firstName = (profile?.name || "").trim().split(" ")[0];

  return (
    <div className="dv-root" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ ...flatSection, padding: "14px 0 20px", marginBottom: 20, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: serifFont, fontSize: 26, color: INK, letterSpacing: -0.3 }}>
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
          <button
            onClick={() => setShowBrainDump(true)}
            className="hoverable"
            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, border: "none", background: "none", cursor: "pointer", color: INK, fontSize: 13.5, fontWeight: 500, padding: 0 }}
          >
            <NotebookPen size={16} strokeWidth={1.8} /> Brain dump
          </button>
          {hasCheckinWorthyItems && (
            <button
              onClick={() => setShowCheckin(true)}
              className="hoverable"
              style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, border: "none", background: "none", cursor: "pointer", color: INK, fontSize: 13.5, fontWeight: 500, padding: 0 }}
              title="Say what you got done (updates the rest of today's plan to match)"
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
          <div style={{ background: HERO_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "26px 26px 24px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontFamily: serifFont, fontSize: 29, color: INK, letterSpacing: -0.4 }}>Today's steps</div>
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
                  <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Nothing here yet. Start with whatever's actually on your mind.</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setShowBrainDump(true)} className="hoverable" style={primaryBtn}>
                      Add something that's stressing you out
                    </button>
                    <button onClick={() => setView("education")} style={ghostBtn}>
                      Plan my first assignment
                    </button>
                  </div>
                </div>
              ) : scaffoldedTotalCount > 0 ? (
                // Everything that WAS on today's list is finished, not "nothing was ever
                // scheduled" — different moment, worth a small win instead of a flat
                // empty-state line.
                <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
                  <FreehandIcon name="fireworks-2" size={52} color={PRIMARY} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>That's everything for today.</div>
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
                      {visibleUntimed.map((t) => {
                        const isTop = !!heroTask && t.id === heroTask.id;
                        const col = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal;
                        const hasOtherSteps = t.carriedOver && t.otherSteps?.length > 0;
                        const stepsExpanded = expandedBreakdowns.has(t.id);
                        // Several of this same assignment's own sessions already came and went
                        // undone — not "a lot left to do," specifically "stuck on this one
                        // thing a while" — worth a nudge to switch to something else for now.
                        const stuckOnThis = staleSessionCount(tasks, { eduId: t.eduId, groupId: t.groupId }, todayISO) >= STALE_SESSION_THRESHOLD;
                        return (
                          <div key={t.id}>
                          <div
                            ref={(el) => { if (el) rowElsRef.current[t.id] = el; else delete rowElsRef.current[t.id]; }}
                            style={{
                              display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: isTop ? 10 : 8, rowGap: 8, padding: "10px 12px", borderRadius: 14,
                              background: "#fff",
                              border: isTop ? `1.5px solid ${PRIMARY}` : "none",
                              // Lifted, not faded — it's being carried, not discarded. zIndex
                              // keeps it drawn over whatever row it's currently passing over
                              // while following the pointer (see startDrag/handleMove above).
                              boxShadow: draggingId === t.id ? "0 10px 24px rgba(15,23,42,0.18)" : "none",
                              zIndex: draggingId === t.id ? 2 : "auto",
                              position: draggingId === t.id ? "relative" : undefined,
                            }}
                          >
                            {/* Kept together, and never squeezed below 170px — on a narrow
                                phone the trailing controls (badge/skip/Start) wrap to their
                                own line below instead of all fighting the title for space on
                                one line, which is what was cutting titles down to a few
                                characters before the ellipsis. */}
                            <div style={{ display: "flex", alignItems: "center", gap: isTop ? 10 : 8, flex: "1 1 170px", minWidth: 0 }}>
                              {onReorderTasks && !t.isGoalItem && (
                                <div
                                  onPointerDown={startDrag(t.id)}
                                  title="Drag to reorder (the top spot is what Start launches)"
                                  style={{ display: "flex", flexShrink: 0, color: isTop ? PRIMARY_DARK : "#D1D5DB", cursor: "grab", touchAction: "none", padding: 5, margin: -5 }}
                                >
                                  <GripVertical size={14} strokeWidth={2} />
                                </div>
                              )}
                              {t.isGoalItem ? (
                                <Checkbox
                                  checked={false}
                                  onClick={() => (t.goalKind === "milestone" ? setView("goals") : onToggleGoalChip?.(t.goalChip))}
                                  color={isTop ? { border: PRIMARY_DARK } : col}
                                  size={isTop ? undefined : 16}
                                />
                              ) : onToggleDone && (
                                <Checkbox checked={false} onClick={() => onToggleDone(t.id, true)} color={isTop ? { border: PRIMARY_DARK } : col} size={isTop ? undefined : 16} />
                              )}
                              <div
                                style={{ flex: 1, minWidth: 0, cursor: t.isGoalItem ? "pointer" : undefined }}
                                onClick={t.isGoalItem ? () => setView("goals") : undefined}
                              >
                                <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {t.isGoalItem && <span style={{ color: col.accent, fontWeight: 700 }}>Goal: </span>}
                                  <WorkTitle title={t.title} mutedColor={isTop ? PRIMARY_DARK : MUTED} />
                                </div>
                                <StepNotes notes={t.notes} title={t.title} taskId={t.id} color={isTop ? PRIMARY_DARK : undefined} />
                                {stuckOnThis && (
                                  <div style={{ fontSize: 11, color: TONE.warn.text, marginTop: 1 }}>
                                    Been at this a few sessions now — maybe switch to something else for a bit.
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: "auto" }}>
                              {t.date && (
                                <div style={{ flexShrink: 0 }}><UrgencyBadge iso={t.date} done={t.done} leadDays={t.groupId || t.eduId ? null : defaultLeadDays(t)} /></div>
                              )}
                              {onPushTomorrow && !t.isGoalItem && (
                                <button
                                  onClick={() => onPushTomorrow(t.id)}
                                  title="Not getting to this tonight? Push it to tomorrow."
                                  style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 2, display: "flex", flexShrink: 0 }}
                                >
                                  <SkipForward size={14} strokeWidth={2.2} />
                                </button>
                              )}
                              {hasOtherSteps && (
                                <button
                                  onClick={() => toggleBreakdownExpanded(t.id)}
                                  title={stepsExpanded ? "Hide the other steps" : "Show every step — check off any you already did"}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 2, display: "flex", flexShrink: 0 }}
                                >
                                  {stepsExpanded ? <ChevronUp size={15} strokeWidth={2.2} /> : <ChevronDown size={15} strokeWidth={2.2} />}
                                </button>
                              )}
                              {isTop && onStartFocus && (
                                <button
                                  onClick={() => onStartFocus(t.id, t.title)}
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
                          </div>
                          {hasOtherSteps && stepsExpanded && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, marginLeft: 34, paddingLeft: 10, borderLeft: `2px solid ${BORDER}` }}>
                              {/* Every step in a breakdown shares the same uniform title (see
                                  the group's own title rule) — the actual distinguishing content
                                  for THIS day lives in notes instead, so that's what shows here,
                                  not a repeat of the same title on every row. */}
                              {t.otherSteps.map((s) => (
                                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <Checkbox checked={false} onClick={() => onCheckOffStep?.(s.id)} color={col} size={14} title="Already did this? Check it off." />
                                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {s.notes || s.title}
                                  </div>
                                  {/* An overdue/today step just reads as part of today's carried-
                                      over list already — printing its original, now-past work day
                                      ("Fri, Oct 9") next to it reads like it's still due then, not
                                      today. Only a step scheduled for the future (you got ahead on
                                      it) gets its real date shown. */}
                                  {s.date && s.date > todayISO && <div style={{ fontSize: 10.5, color: MUTED, whiteSpace: "nowrap", flexShrink: 0 }}>{formatShortDate(s.date)}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                          </div>
                        );
                      })}
                    </div>
                    {hiddenUntimedCount > 0 && (
                      <button
                        onClick={() => setUntimedExpanded(true)}
                        style={{ alignSelf: "flex-start", background: "none", border: "none", padding: "6px 0 0", fontSize: 12, color: MUTED, fontWeight: 600, cursor: "pointer" }}
                      >
                        Show {hiddenUntimedCount} more
                      </button>
                    )}
                    {untimedExpanded && displayUntimed.length > UNTIMED_VISIBLE_CAP && (
                      <button
                        onClick={() => setUntimedExpanded(false)}
                        style={{ alignSelf: "flex-start", background: "none", border: "none", padding: "6px 0 0", fontSize: 12, color: MUTED, fontWeight: 600, cursor: "pointer" }}
                      >
                        Show less
                      </button>
                    )}
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

          {/* No card at all — border+background were still reading as an equal peer to
              Today's steps no matter how much the content inside shrank, since two
              same-shaped boxes side by side register as "two cards of comparable
              importance" regardless of their internal sizing. Sitting flush in the
              column, same as Habits/Done today below, is what actually settles that:
              Today's steps is the one real card on this page (see HERO_BG above, now
              with a bigger title and a stronger shadow on top of that). The bound task's
              own category color is still the one accent used throughout. No duration
              picker here anymore — every round is a fixed 20 minutes (see
              FocusTimerModal's BLOCK_MIN), auto-chained up to a budget that scales with
              the task's own estimate, so there's nothing to choose up front. Pressing
              Start calls the exact same onStartFocus the row's own Start button does —
              this is just a second way in. */}
          {!hasActiveFocusSession && (() => {
            const col = heroTask ? CATEGORY_COLORS[heroTask.category] || CATEGORY_COLORS.Personal : null;
            const accent = col ? col.accent : MUTED;
            return (
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>Focus session</div>
                {heroTask ? (
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{heroTask.title}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: col.accent, textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {heroTask.category}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: MUTED }}>Nothing to start yet.</div>
                )}

                <div style={{ position: "relative", width: 106, height: 106, margin: "10px auto 9px" }}>
                  <svg width="106" height="106" viewBox="0 0 106 106">
                    <circle cx="53" cy="53" r="44" fill="none" stroke={accent} strokeWidth="6" opacity={0.85} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontFamily: serifFont, fontSize: 22, color: INK }}>{pad(20)}:00</div>
                  </div>
                </div>

                {heroTask && (
                  <button
                    onClick={() => onStartFocus(heroTask.id, heroTask.title)}
                    className="hoverable"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5, width: "100%",
                      padding: "7px", borderRadius: 999, border: `1px solid ${accent}`, background: "#fff", color: accent,
                      fontSize: 11.5, fontWeight: 700, cursor: "pointer",
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

          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, flexShrink: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, marginBottom: 8 }}>Looking ahead</div>
            {/* Just the dates, nothing else, until you actually tap one — this used to
                dump every day's full list on the page unasked, which is exactly the
                "don't show me unless I click" complaint this re-does. Picking a date
                again (same one) closes it back up. */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {upcomingDays.map(({ iso, date, dayTasks, dueWithoutSession, dayEvents }, i) => {
                const itemCount = dayTasks.length + dueWithoutSession.length + dayEvents.length;
                const label = i === 0 ? "Tmrw" : date.toLocaleDateString(undefined, { weekday: "short" });
                const selected = selectedUpcomingDay === iso;
                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedUpcomingDay(selected ? null : iso)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 42,
                      padding: "6px 8px", borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${selected ? PRIMARY_DARK : BORDER}`,
                      background: selected ? PRIMARY_DARK : "#fff",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: selected ? "#fff" : INK }}>{label}</span>
                    <span style={{ fontSize: 9.5, color: selected ? "rgba(255,255,255,0.8)" : MUTED }}>{date.getDate()}</span>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", marginTop: 1, background: itemCount > 0 ? (selected ? "#fff" : PRIMARY_DARK) : "transparent" }} />
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setUpcomingExpanded((v) => !v)}
              style={{ alignSelf: "flex-start", background: "none", border: "none", padding: "6px 0 0", fontSize: 12, color: MUTED, fontWeight: 600, cursor: "pointer" }}
            >
              {upcomingExpanded ? "Show less" : "Show the rest of the week"}
            </button>

            {selectedUpcomingDay && (() => {
              const day = upcomingDays.find((d) => d.iso === selectedUpcomingDay);
              if (!day) return null;
              const { dayTasks, dueWithoutSession, dayEvents } = day;
              const itemCount = dayTasks.length + dueWithoutSession.length + dayEvents.length;
              return (
                <div style={{ marginTop: 10, background: SURFACE, borderRadius: 12, padding: "10px 12px" }}>
                  {itemCount === 0 ? (
                    <div style={{ fontSize: 12, color: MUTED }}>Nothing yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {dayTasks.map((t) => {
                        const col = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal;
                        return (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: INK }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: col.accent, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                          </div>
                        );
                      })}
                      {dueWithoutSession.map((e) => (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: TONE.warn.text }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: TONE.warn.text, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Due: {e.title}</div>
                        </div>
                      ))}
                      {dayEvents.map((e) => (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: MUTED }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${MUTED}`, flexShrink: 0, boxSizing: "border-box" }} />
                          <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}{e.start != null ? ` · ${decimalToTimeLabel(e.start)}` : ""}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { onSelectDay?.(selectedUpcomingDay); setView("calendar"); }}
                    style={{ display: "block", background: "none", border: "none", padding: "8px 0 0", fontSize: 11.5, color: PRIMARY_DARK, fontWeight: 600, cursor: "pointer" }}
                  >
                    Open in Calendar
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

