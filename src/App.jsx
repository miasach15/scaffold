import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useAuth } from "./hooks/AuthProvider";
import { useProfile } from "./hooks/useProfile";
import { useEvents } from "./hooks/useEvents";
import { useTasks } from "./hooks/useTasks";
import { useGoals } from "./hooks/useGoals";
import { useHabits } from "./hooks/useHabits";
import { useJournal } from "./hooks/useJournal";
import { useEduItems } from "./hooks/useEduItems";
import { useInbox } from "./hooks/useInbox";

import AuthScreen from "./components/auth/AuthScreen";
import ResetPasswordScreen from "./components/auth/ResetPasswordScreen";
import OnboardingQuiz from "./components/onboarding/OnboardingQuiz";
import TopNav from "./components/nav/TopNav";
import CalendarView from "./components/calendar/CalendarView";
import MonthView from "./components/calendar/MonthView";
import QuickAddModal from "./components/calendar/QuickAddModal";
import TasksView from "./components/tasks/TasksView";
import FocusTimerModal from "./components/focus/FocusTimerModal";
import TaskDetailModal from "./components/tasks/TaskDetailModal";
import StickyNoteCorner from "./components/shared/StickyNoteCorner";
import UndoToast from "./components/shared/UndoToast";
import SearchModal from "./components/shared/SearchModal";
import { useUndoableDelete } from "./hooks/useUndoableDelete";
import { useDarkMode } from "./hooks/useDarkMode";
import WeeklyReviewModal from "./components/review/WeeklyReviewModal";
import SettingsModal from "./components/nav/SettingsModal";
import TourOverlay from "./components/nav/TourOverlay";
import { CategoryColorsProvider } from "./hooks/CategoryColorsContext";

// These pages aren't needed for first paint (the app opens on Calendar) — loading them
// as separate chunks keeps the initial bundle smaller. Calendar/Tasks stay eager since
// they're where the app actually starts.
const GoalsView = lazy(() => import("./components/goals/GoalsView"));
const HabitsView = lazy(() => import("./components/habits/HabitsView"));
const JournalView = lazy(() => import("./components/journal/JournalView"));
const EducationView = lazy(() => import("./components/education/EducationView"));

import { addDays, dateRangeISO, dayBefore, distributeDatesByLoad, repeatDates, startOfWeek, timeToDecimal, toISO } from "./lib/dateHelpers";
import { CATEGORY_COLOR_SWATCHES, DEFAULT_CATEGORY_COLOR_KEYS, DEFAULT_THEME, FALLBACK_CATEGORY_COLOR_ROTATION, PAPER_BG, PRIMARY, THEME_PRESETS } from "./lib/constants";

export default function App() {
  const { user, loading: authLoading, signOut, passwordRecovery } = useAuth();
  // Applied at this level (not inside ScaffoldApp) so it covers the auth/reset screens too.
  const { darkMode, toggleDarkMode } = useDarkMode();

  if (authLoading) return <FullScreenMessage text="Loading..." />;
  if (passwordRecovery) return <ResetPasswordScreen />;
  if (!user) return <AuthScreen />;
  return <ScaffoldApp userId={user.id} onSignOut={signOut} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
}

function FullScreenMessage({ text }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: PAPER_BG, color: "#93A0AD", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {text}
    </div>
  );
}

function ScaffoldApp({ userId, onSignOut, darkMode, onToggleDarkMode }) {
  const { profile, loading: profileLoading, updateProfile } = useProfile(userId);
  const { events, addEvents, updateEvent, removeEvent } = useEvents(userId);
  const { tasks, addTask, setTaskDone, setTaskCategory, renameTask, setTaskDate, setTaskStart, setTaskNotes, removeTask, removeTasksByEduId, rescheduleTask } = useTasks(userId);
  const { goals, addGoal, removeGoal, renameGoal, setGoalDeadline, addMilestone, removeMilestone, renameMilestone, setMilestoneDueDate, addAction, moveAction, setActionDone, removeAction, renameAction, setActionDueDate } = useGoals(userId, tasks);
  const { habits, addHabit, addHabitsBulk, removeHabit, setDone: setHabitDone, setDoneToday } = useHabits(userId);
  const { entries: journalEntries, addEntry: addJournalEntry, removeEntry: removeJournalEntry } = useJournal(userId);
  const { eduItems, addEduItems, setDone: setEduDone, removeItem: removeEduItemRaw } = useEduItems(userId);
  const { items: inboxItems, addItem: addInboxItem, removeItem: removeInboxItem } = useInbox(userId);

  const [view, setView] = useState("calendar");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [dayView, setDayViewRaw] = useState(null); // ISO date string, or null for week view
  const [monthView, setMonthView] = useState(null); // Date anchor, or null when not in month mode
  const [modal, setModal] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (profile && profile.onboarded && !profile.tourSeen && !tourStarted) {
      setTourOpen(true);
      setTourStarted(true);
    }
  }, [profile, tourStarted]);

  // Cmd/Ctrl+K opens search from anywhere; "/" does too, as long as you're not already
  // typing into something. Each modal still handles its own Escape-to-close.
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch(true);
      } else if (!typing && e.key === "/") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const finishTour = () => {
    setTourOpen(false);
    updateProfile({ tourSeen: true });
  };

  // Deleting a task doesn't happen instantly anymore — it disappears from the UI right
  // away, but the actual delete is held for a few seconds so a misclick (or change of
  // mind) can be undone. Only one delete is "in flight" at a time; starting another
  // commits the previous one immediately rather than juggling multiple toasts.
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null);
  const taskDeleteUndo = useUndoableDelete();
  const visibleTasks = pendingDeleteTaskId ? tasks.filter((t) => t.id !== pendingDeleteTaskId) : tasks;
  const requestRemoveTask = (id) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    setPendingDeleteTaskId(id);
    taskDeleteUndo.requestDelete(`"${t.title.length > 40 ? t.title.slice(0, 40) + "…" : t.title}" deleted`, () => {
      removeTask(id);
      setPendingDeleteTaskId((cur) => (cur === id ? null : cur));
    });
  };
  const undoTaskDelete = () => {
    if (taskDeleteUndo.undo()) setPendingDeleteTaskId(null);
  };

  const openFocus = (id, title) => setFocusTask({ id, title });
  const openTaskDetail = (id) => {
    const t = tasks.find((x) => x.id === id);
    if (t) setEditingTask(t);
  };
  const turnInboxIntoTask = (item) => {
    addTask({ title: item.text, date: null, start: null, duration: null, category: item.category || "Personal" });
    removeInboxItem(item.id);
  };

  // Quick Capture never navigates you away from what you're doing — it just gets saved,
  // and shows up as a reminder later: Education captures at the top of the Education
  // page, everything else in the Inbox at the top of the Tasks page.
  const handleQuickCapture = (text, category) => addInboxItem(text, category);
  const eduInboxItems = inboxItems.filter((it) => it.category === "Education");
  const otherInboxItems = inboxItems.filter((it) => it.category !== "Education");

  const days = useMemo(
    () => (dayView ? [new Date(dayView + "T00:00:00")] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))),
    [weekStart, dayView]
  );
  const setDayView = (iso) => { setMonthView(null); setDayViewRaw(iso); };
  const enterMonth = () => { setDayViewRaw(null); setMonthView(monthView || new Date()); };
  const exitMonth = () => setMonthView(null);

  const dueChips = useMemo(() => {
    const chips = [];
    goals.forEach((g) => {
      const allActions = g.milestones.flatMap((m) => m.actions);
      const allActionsDone = allActions.length > 0 && allActions.every((a) => a.done);
      if (g.deadline) chips.push({ id: g.id, kind: "goal-deadline", title: g.title, date: g.deadline, done: allActionsDone, category: g.category, goalId: g.id });
      g.milestones.forEach((m) => {
        if (m.dueDate) {
          const total = m.actions.length;
          const doneCount = m.actions.filter((a) => a.done).length;
          chips.push({ id: m.id, kind: "goal-milestone", title: m.title, date: m.dueDate, done: total > 0 && doneCount === total, category: g.category, goalId: g.id, milestoneId: m.id });
        }
        m.actions.forEach((a) => {
          if (a.dueDate) chips.push({ id: a.id, kind: "goal", title: a.title, date: a.dueDate, done: a.done, category: g.category, goalId: g.id, milestoneId: m.id });
        });
      });
    });
    eduItems.forEach((e) => {
      if (e.dueDate) chips.push({ id: e.id, kind: "edu", title: e.title, date: e.dueDate, done: e.done, type: e.type, subject: e.subject });
    });
    visibleTasks.forEach((t) => {
      if (t.date && t.start == null) chips.push({ id: t.id, kind: "task", title: t.title, date: t.date, done: t.done, category: t.category, groupId: t.groupId, eduId: t.eduId });
    });
    // One synthetic chip per "break it down" group, on its own overall due date — the
    // group's steps (above) are work days, not the deadline itself, so this is what
    // actually belongs in the calendar's "Due" row alongside everything else that's due.
    const seenGroups = new Set();
    visibleTasks.forEach((t) => {
      if (!t.groupId || !t.groupDueDate || seenGroups.has(t.groupId)) return;
      seenGroups.add(t.groupId);
      const groupTasks = visibleTasks.filter((x) => x.groupId === t.groupId);
      const groupDone = groupTasks.length > 0 && groupTasks.every((x) => x.done);
      chips.push({ id: t.groupId, kind: "task-group-due", title: t.groupTitle || t.title, date: t.groupDueDate, done: groupDone, category: t.category });
    });
    return chips;
  }, [goals, eduItems, visibleTasks]);

  // Only individual goal actions have an independently-settable "done" — a goal deadline
  // or milestone's done state is derived from whether all its actions are done, so those
  // stay Calendar-only. Actions with a due date surface in Tasks/Today alongside plain
  // tasks and Education deadlines, same shape as the chips the calendar already uses.
  const goalChips = useMemo(() => dueChips.filter((c) => c.kind === "goal"), [dueChips]);

  const onChipClick = (chip) => {
    if (chip.kind === "goal") setActionDone(chip.goalId, chip.milestoneId, chip.id, !chip.done);
    else if (chip.kind === "edu") setEduDone(chip.id, !chip.done);
    else if (chip.kind === "task") openTaskDetail(chip.id);
    // A group's due chip represents several rows at once — no single task to open, so
    // just jump to the Tasks page where the collapsed group row lives (expand it there).
    else if (chip.kind === "task-group-due") setView("tasks");
  };

  const completeOnboarding = async (answers) => {
    await updateProfile({ name: answers.name, categoryKeys: answers.categoryKeys, focusAreas: answers.focusAreas, workStyle: answers.workStyle, onboarded: true });
    if (answers.habitPicks.length > 0) await addHabitsBulk(answers.habitPicks);
  };

  // mode: "one" (default) or "following" — for repeating edu items (no stored series id),
  // "following" is found heuristically: same title/type/subject, due date on or after this one's.
  const removeEduItem = async (id, mode = "one") => {
    let ids = [id];
    if (mode === "following") {
      const item = eduItems.find((e) => e.id === id);
      if (item) {
        ids = eduItems
          .filter((e) => e.title === item.title && e.type === item.type && e.subject === item.subject && e.dueDate >= item.dueDate)
          .map((e) => e.id);
      }
    }
    for (const eid of ids) {
      await removeTasksByEduId(eid);
      await removeEduItemRaw(eid);
    }
  };

  // workDays: for Assignments, either a number of days (spreads that many "Work on: <title>"
  // tasks evenly up to the due date), "everyday" (one every day until due), or
  // {steps: [...]} — AI-generated step titles (from "Break it down for me"), spread the
  // same way but each task keeps its own step title instead of the generic "Work on:" one.
  const addEduItem = async (title, type, subject, dueDate, repeat, workDays) => {
    const rows = await addEduItems({ title, type, subject, occurrences: repeatDates(dueDate, repeat) });
    if (!rows || rows.length === 0) return;

    if (type === "Homework") {
      // A homework item gets a single reminder task the day before it's due.
      for (const row of rows) {
        const workDate = toISO(addDays(new Date(row.dueDate + "T00:00:00"), -1));
        addTask({ title: `Work on: ${title}`, date: workDate, start: null, duration: null, eduId: row.id, category: "Education" });
      }
    } else if ((type === "Assignment" || type === "Test") && workDays) {
      const workVerb = type === "Test" ? "Study" : "Work on";
      const todayISO = toISO(new Date());
      // The Education page previews an Assignment/Test's schedule in a modal before
      // adding anything — previewItems carries whatever the user edited/removed there,
      // used exactly as-is for the first occurrence.
      const hasPreview = typeof workDays === "object" && "previewItems" in workDays;
      const previewItems = hasPreview ? workDays.previewItems : null;
      const effectiveSchedule = hasPreview ? workDays.schedule : workDays;
      const isAiSteps = typeof effectiveSchedule === "object" && Array.isArray(effectiveSchedule.steps) && effectiveSchedule.steps.length > 0;
      rows.forEach((row, rowIdx) => {
        if (rowIdx === 0 && previewItems) {
          previewItems.forEach((it) => {
            addTask({ title: it.title, date: it.date, start: null, duration: null, eduId: row.id, category: "Education", notes: it.notes || null });
          });
          return;
        }
        const startISO = row.dueDate > todayISO ? todayISO : row.dueDate;
        // Work leads up to the due date but never lands on it — you shouldn't still be
        // working the day it's due.
        const lastWorkDay = dayBefore(row.dueDate);
        const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
        if (isAiSteps) {
          const dates = distributeDatesByLoad(startISO, endISO, effectiveSchedule.steps.length, tasks);
          effectiveSchedule.steps.forEach((stepTitle, i) => {
            addTask({ title: stepTitle, date: dates[i], start: null, duration: null, eduId: row.id, category: "Education" });
          });
        } else {
          const dates = effectiveSchedule === "everyday" ? dateRangeISO(startISO, endISO) : distributeDatesByLoad(startISO, endISO, effectiveSchedule, tasks);
          for (const d of dates) {
            addTask({ title: `${workVerb}: ${title}`, date: d, start: null, duration: null, eduId: row.id, category: "Education" });
          }
        }
      });
    }
  };

  const addEduSession = (eduId, sessionTitle, date, time, duration, isAllDay) => {
    addTask({ title: sessionTitle, date, start: isAllDay ? null : timeToDecimal(time), duration: isAllDay ? null : duration, eduId, category: "Education" });
  };

  if (profileLoading || !profile) return <FullScreenMessage text="Loading your data..." />;
  if (!profile.onboarded) return <OnboardingQuiz onComplete={completeOnboarding} />;

  const theme = THEME_PRESETS[profile.themeColor] || THEME_PRESETS[DEFAULT_THEME];

  const categoryKeys = profile.categoryKeys;
  const resolvedCategoryColors = {};
  categoryKeys.forEach((cat, i) => {
    // Explicit choice > one of the original 4's default > a rotating fallback for a
    // custom category that's never been recolored, so several new ones don't all end up
    // looking identical.
    const key = profile.categoryColors[cat] || DEFAULT_CATEGORY_COLOR_KEYS[cat] || FALLBACK_CATEGORY_COLOR_ROTATION[i % FALLBACK_CATEGORY_COLOR_ROTATION.length];
    resolvedCategoryColors[cat] = CATEGORY_COLOR_SWATCHES[key] || CATEGORY_COLOR_SWATCHES.gray;
  });
  // A handful of places across the app fall back to CATEGORY_COLORS.Personal when a
  // task/event's own category isn't recognized — safe when "Personal" is one of the
  // defaults, but a user can rename or remove it entirely now. Keep it defined as a
  // quiet safety net regardless, so nothing crashes; it just won't be offered as an
  // actual pickable category unless it's genuinely still in categoryKeys.
  if (!resolvedCategoryColors.Personal) resolvedCategoryColors.Personal = CATEGORY_COLOR_SWATCHES[DEFAULT_CATEGORY_COLOR_KEYS.Personal];

  const setCategoryColor = (category, swatchKey) => {
    updateProfile({ categoryColors: { ...profile.categoryColors, [category]: swatchKey } });
  };

  // Rename in place (keeps its color/order); the rename doesn't touch existing tasks/
  // events already tagged with the old name — those keep whatever they were tagged with
  // and just fall back to a default color since the old name is no longer in the active
  // list (still fully functional, just not offered as a pick going forward).
  const renameCategory = (oldKey, newKey) => {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed === oldKey || categoryKeys.includes(trimmed)) return;
    const nextKeys = categoryKeys.map((k) => (k === oldKey ? trimmed : k));
    const nextColors = { ...profile.categoryColors };
    if (nextColors[oldKey]) { nextColors[trimmed] = nextColors[oldKey]; delete nextColors[oldKey]; }
    updateProfile({ categoryKeys: nextKeys, categoryColors: nextColors });
  };
  const addCategory = (name) => {
    const trimmed = name.trim();
    if (!trimmed || categoryKeys.includes(trimmed)) return;
    updateProfile({ categoryKeys: [...categoryKeys, trimmed] });
  };
  const removeCategory = (key) => {
    if (categoryKeys.length <= 1) return; // always keep at least one category to assign things to
    updateProfile({ categoryKeys: categoryKeys.filter((k) => k !== key) });
  };

  return (
    <CategoryColorsProvider value={resolvedCategoryColors} keys={categoryKeys}>
    <div
      style={{
        "--primary": theme.primary,
        "--primary-dark": theme.primaryDark,
        "--primary-tint": theme.primaryTint,
        fontFamily: "'Inter', -apple-system, sans-serif", background: `radial-gradient(circle at 15% 0%, #FFFFFF 0%, ${PAPER_BG} 45%)`, height: "100vh", color: "#000000",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; transition: transform .12s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease, opacity .15s ease; }
        button:active:not(:disabled) { transform: scale(0.97); }
        button:disabled { cursor: default; }
        input, select, textarea { font-family: inherit; transition: border-color .15s ease, box-shadow .15s ease; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: ${PRIMARY} !important; box-shadow: 0 0 0 3px rgba(110,147,183,0.16); }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #D9D9D9; border-radius: 4px; }
        .topnav-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .topnav-scroll::-webkit-scrollbar { display: none; }
        .btn-primary:hover:not(:disabled) { box-shadow: 0 3px 10px rgba(110,147,183,0.35); transform: translateY(-1px); }
        .btn-ghost:hover:not(:disabled) { background: #F5F5F5 !important; border-color: #D1D5DB !important; }
        .btn-delete { border-radius: 999px !important; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; }
        .btn-delete:hover:not(:disabled) { background: #FBEAEA !important; color: #B03A3A !important; }
        .hoverable:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.08) !important; transform: translateY(-1px); }
        @keyframes checkboxPingOut { 0% { opacity: 0.55; transform: scale(0.8); } 100% { opacity: 0; transform: scale(1.9); } }
        @media (max-width: 640px) {
          input, select, textarea { font-size: 16px !important; } /* prevents iOS auto-zoom-on-focus */
        }
      `}</style>

      <TopNav
        view={view}
        setView={setView}
        onOpenWeeklyReview={() => setShowWeeklyReview(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSearch={() => setShowSearch(true)}
        onSignOut={onSignOut}
      />

      <div
        style={{
          maxWidth: view === "calendar" ? "none" : 1100, margin: "0 auto", width: "100%", padding: view === "calendar" ? "16px 24px 12px" : "20px 16px 60px",
          flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
          overflowY: view === "calendar" ? "hidden" : "auto",
        }}
      >
        <Suspense fallback={<div style={{ fontSize: 13, color: "#B4BCC5", padding: "40px 0", textAlign: "center" }}>Loading...</div>}>
        {view === "calendar" && monthView && (
          <MonthView
            monthDate={monthView}
            setMonthDate={setMonthView}
            events={events}
            dueChips={dueChips}
            onSelectDay={setDayView}
            onExitMonth={exitMonth}
          />
        )}
        {view === "calendar" && !monthView && (
          <CalendarView
            days={days}
            weekStart={weekStart}
            setWeekStart={setWeekStart}
            dayView={dayView}
            onSetDayView={setDayView}
            onEnterMonth={enterMonth}
            events={events}
            tasks={visibleTasks}
            dueChips={dueChips}
            onCellClick={(date, hour) => setModal({ date, hour })}
            onToggleTask={setTaskDone}
            onChipClick={onChipClick}
            onOpenTaskDetail={openTaskDetail}
            onRescheduleTask={rescheduleTask}
            onRescheduleEvent={(id, date) => updateEvent(id, { date })}
            onEditEvent={setEditingEvent}
          />
        )}
        {view === "tasks" && (
          <TasksView
            tasks={visibleTasks}
            onAddTask={addTask}
            onToggleDone={setTaskDone}
            onSetCategory={setTaskCategory}
            onRemove={requestRemoveTask}
            onOpenTaskDetail={openTaskDetail}
            onSetDate={setTaskDate}
            onSetStart={setTaskStart}
            onOpenFocus={openFocus}
            inboxItems={otherInboxItems}
            onTurnIntoTask={turnInboxIntoTask}
            onDiscardInbox={removeInboxItem}
            eduItems={eduItems}
            onSetEduDone={setEduDone}
            onGoToEducation={() => setView("education")}
            goalChips={goalChips}
            onToggleGoalChip={onChipClick}
            onGoToGoals={() => setView("goals")}
          />
        )}
        {view === "goals" && (
          <GoalsView
            goals={goals}
            defaultCategory={categoryKeys.find((c) => profile.focusAreas.includes(c)) || categoryKeys[0]}
            onAddGoal={addGoal}
            onRemoveGoal={removeGoal}
            onRenameGoal={renameGoal}
            onSetGoalDeadline={setGoalDeadline}
            onAddMilestone={addMilestone}
            onRemoveMilestone={removeMilestone}
            onRenameMilestone={renameMilestone}
            onSetMilestoneDueDate={setMilestoneDueDate}
            onAddAction={addAction}
            onMoveAction={moveAction}
            onSetActionDone={setActionDone}
            onRemoveAction={removeAction}
            onRenameAction={renameAction}
            onSetActionDueDate={setActionDueDate}
          />
        )}
        {view === "habits" && (
          <HabitsView habits={habits} onAddHabit={addHabit} onRemoveHabit={removeHabit} onSetDoneToday={setDoneToday} onSetDone={setHabitDone} />
        )}
        {view === "journal" && (
          <JournalView entries={journalEntries} onAddEntry={addJournalEntry} onRemoveEntry={removeJournalEntry} />
        )}
        {view === "education" && (
          <EducationView
            eduItems={eduItems}
            tasks={tasks}
            onAddEduItem={addEduItem}
            onSetEduDone={setEduDone}
            onRemoveEduItem={removeEduItem}
            onAddSession={addEduSession}
            onRemoveSession={removeTask}
            onSetSessionDone={setTaskDone}
            onOpenFocus={openFocus}
            inboxItems={eduInboxItems}
            onDiscardInbox={removeInboxItem}
          />
        )}
        </Suspense>
      </div>

      {showSettings && (
        <SettingsModal
          themeColor={profile.themeColor}
          onSetTheme={(key) => updateProfile({ themeColor: key })}
          categoryColors={profile.categoryColors}
          onSetCategoryColor={setCategoryColor}
          categoryKeys={categoryKeys}
          onRenameCategory={renameCategory}
          onAddCategory={addCategory}
          onRemoveCategory={removeCategory}
          onReplayTour={() => { setShowSettings(false); setView("calendar"); setTourOpen(true); }}
          darkMode={darkMode}
          onToggleDarkMode={onToggleDarkMode}
          userId={userId}
          onClose={() => setShowSettings(false)}
        />
      )}

      {modal && (
        <QuickAddModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={(item) => {
            const occurrences = repeatDates(item.date, item.repeat, item.customDays);
            addEvents(occurrences.map((d) => ({ title: item.title, date: d, start: item.start, duration: item.duration, category: item.category || "Personal" })));
            setModal(null);
          }}
        />
      )}

      {editingEvent && (
        <QuickAddModal
          event={editingEvent}
          hasFollowing={events.some((e) =>
            e.id !== editingEvent.id && e.title === editingEvent.title && e.category === editingEvent.category &&
            e.start === editingEvent.start && e.duration === editingEvent.duration && e.date >= editingEvent.date
          )}
          onClose={() => setEditingEvent(null)}
          onUpdate={({ id, repeat, customDays, ...patch }) => {
            updateEvent(id, patch);
            if (repeat && repeat !== "None") {
              const occurrences = repeatDates(patch.date, repeat, customDays).slice(1); // first date is this event itself
              if (occurrences.length > 0) {
                addEvents(occurrences.map((d) => ({ title: patch.title, date: d, start: patch.start, duration: patch.duration, category: patch.category })));
              }
            }
            setEditingEvent(null);
          }}
          onDelete={async (id, mode) => {
            if (mode === "following") {
              const ids = events
                .filter((e) => e.title === editingEvent.title && e.category === editingEvent.category &&
                  e.start === editingEvent.start && e.duration === editingEvent.duration && e.date >= editingEvent.date)
                .map((e) => e.id);
              for (const eid of ids) await removeEvent(eid);
            } else {
              await removeEvent(id);
            }
            setEditingEvent(null);
          }}
        />
      )}

      {focusTask && (
        <FocusTimerModal
          task={focusTask}
          onClose={() => setFocusTask(null)}
          onComplete={() => { setTaskDone(focusTask.id, true); setFocusTask(null); }}
          defaultMinutes={profile.workStyle === "Short focused bursts" ? 15 : profile.workStyle === "Long deep sessions" ? 50 : 25}
        />
      )}

      {editingTask && (
        <TaskDetailModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onRename={renameTask}
          onToggleDone={setTaskDone}
          onRemove={requestRemoveTask}
          onOpenFocus={openFocus}
          onSetDate={setTaskDate}
          onSetStart={setTaskStart}
          onSetNotes={setTaskNotes}
        />
      )}

      {showWeeklyReview && (
        <WeeklyReviewModal
          tasks={tasks}
          goals={goals}
          habits={habits}
          eduItems={eduItems}
          journalEntries={journalEntries}
          onClose={() => setShowWeeklyReview(false)}
        />
      )}

      {!tourOpen && <StickyNoteCorner onCapture={handleQuickCapture} />}

      {taskDeleteUndo.pending && <UndoToast label={taskDeleteUndo.pending.label} onUndo={undoTaskDelete} />}

      {showSearch && (
        <SearchModal
          tasks={visibleTasks}
          eduItems={eduItems}
          goals={goals}
          habits={habits}
          journalEntries={journalEntries}
          events={events}
          onClose={() => setShowSearch(false)}
          onGoTo={setView}
          onOpenTask={openTaskDetail}
        />
      )}

      {tourOpen && (
        <TourOverlay
          setView={setView}
          onOpenSettings={() => setShowSettings(true)}
          onOpenWeeklyReview={() => setShowWeeklyReview(true)}
          onCloseModals={() => { setShowSettings(false); setShowWeeklyReview(false); }}
          onFinish={finishTour}
        />
      )}
    </div>
    </CategoryColorsProvider>
  );
}
