import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./hooks/AuthProvider";
import { useProfile } from "./hooks/useProfile";
import { useEvents } from "./hooks/useEvents";
import { useTasks } from "./hooks/useTasks";
import { useGoals } from "./hooks/useGoals";
import { useHabits } from "./hooks/useHabits";
import { useJournal } from "./hooks/useJournal";
import { useEduItems } from "./hooks/useEduItems";

import AuthScreen from "./components/auth/AuthScreen";
import OnboardingQuiz from "./components/onboarding/OnboardingQuiz";
import TopNav from "./components/nav/TopNav";
import CalendarView from "./components/calendar/CalendarView";
import QuickAddModal from "./components/calendar/QuickAddModal";
import TasksView from "./components/tasks/TasksView";
import GoalsView from "./components/goals/GoalsView";
import HabitsView from "./components/habits/HabitsView";
import JournalView from "./components/journal/JournalView";
import EducationView from "./components/education/EducationView";
import FocusTimerModal from "./components/focus/FocusTimerModal";
import WeeklyReviewModal from "./components/review/WeeklyReviewModal";
import ManagePagesModal from "./components/nav/ManagePagesModal";
import SettingsModal from "./components/nav/SettingsModal";
import TourOverlay from "./components/nav/TourOverlay";
import { CategoryColorsProvider } from "./hooks/CategoryColorsContext";
import MoviesView from "./components/lifestyle/MoviesView";
import BooksView from "./components/lifestyle/BooksView";
import RestaurantsView from "./components/lifestyle/RestaurantsView";
import BucketListView from "./components/lifestyle/BucketListView";
import PackingListsView from "./components/lifestyle/PackingListsView";
import GiftsView from "./components/lifestyle/GiftsView";
import NotesView from "./components/lifestyle/NotesView";

import { addDays, repeatDates, startOfWeek, timeToDecimal } from "./lib/dateHelpers";
import { CATEGORY_COLOR_SWATCHES, CATEGORY_KEYS, DEFAULT_CATEGORY_COLOR_KEYS, DEFAULT_THEME, PAPER_BG, PRIMARY, THEME_PRESETS } from "./lib/constants";

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();

  if (authLoading) return <FullScreenMessage text="Loading..." />;
  if (!user) return <AuthScreen />;
  return <ScaffoldApp userId={user.id} onSignOut={signOut} />;
}

function FullScreenMessage({ text }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: PAPER_BG, color: "#93A0AD", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {text}
    </div>
  );
}

function ScaffoldApp({ userId, onSignOut }) {
  const { profile, loading: profileLoading, updateProfile } = useProfile(userId);
  const { events, addEvents, updateEvent, removeEvent } = useEvents(userId);
  const { tasks, addTask, setTaskDone, setTaskCategory, removeTask, removeTasksByEduId, rescheduleTask } = useTasks(userId);
  const { goals, addGoal, removeGoal, renameGoal, addMilestone, removeMilestone, renameMilestone, setMilestoneDueDate, addAction, moveAction, setActionDone, removeAction, renameAction, setActionDueDate } = useGoals(userId);
  const { habits, addHabit, addHabitsBulk, removeHabit, setDone: setHabitDone, setDoneToday } = useHabits(userId);
  const { entries: journalEntries, addEntry: addJournalEntry, removeEntry: removeJournalEntry } = useJournal(userId);
  const { eduItems, addEduItems, setDone: setEduDone, removeItem: removeEduItemRaw } = useEduItems(userId);

  const [view, setView] = useState("calendar");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [modal, setModal] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [showManagePages, setShowManagePages] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);

  useEffect(() => {
    if (profile && profile.onboarded && !profile.tourSeen && !tourStarted) {
      setTourOpen(true);
      setTourStarted(true);
    }
  }, [profile, tourStarted]);

  const finishTour = () => {
    setTourOpen(false);
    updateProfile({ tourSeen: true });
  };

  const openFocus = (id, title) => setFocusTask({ id, title });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

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
    tasks.forEach((t) => {
      if (t.date && t.start == null) chips.push({ id: t.id, kind: "task", title: t.title, date: t.date, done: t.done });
    });
    return chips;
  }, [goals, eduItems, tasks]);

  const onChipClick = (chip) => {
    if (chip.kind === "goal") setActionDone(chip.goalId, chip.milestoneId, chip.id, !chip.done);
    else if (chip.kind === "edu") setEduDone(chip.id, !chip.done);
    else if (chip.kind === "task") setTaskDone(chip.id, !chip.done);
  };

  const completeOnboarding = async (answers) => {
    await updateProfile({ name: answers.name, focusAreas: answers.focusAreas, workStyle: answers.workStyle, enabledPages: answers.lifestylePages, onboarded: true });
    if (answers.habitPicks.length > 0) await addHabitsBulk(answers.habitPicks);
  };

  const toggleLifestylePage = (key) => {
    const current = profile.enabledPages || [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    updateProfile({ enabledPages: next });
    if (current.includes(key) && view === key) setView("calendar");
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

  const addEduItem = (title, type, subject, dueDate, repeat) => {
    addEduItems({ title, type, subject, occurrences: repeatDates(dueDate, repeat) });
  };

  const addEduSession = (eduId, sessionTitle, date, time, duration, isAllDay) => {
    addTask({ title: sessionTitle, date, start: isAllDay ? null : timeToDecimal(time), duration: isAllDay ? null : duration, eduId, category: "Education" });
  };

  if (profileLoading || !profile) return <FullScreenMessage text="Loading your data..." />;
  if (!profile.onboarded) return <OnboardingQuiz onComplete={completeOnboarding} />;

  const theme = THEME_PRESETS[profile.themeColor] || THEME_PRESETS[DEFAULT_THEME];

  const resolvedCategoryColors = {};
  for (const cat of CATEGORY_KEYS) {
    const key = profile.categoryColors[cat] || DEFAULT_CATEGORY_COLOR_KEYS[cat];
    resolvedCategoryColors[cat] = CATEGORY_COLOR_SWATCHES[key] || CATEGORY_COLOR_SWATCHES[DEFAULT_CATEGORY_COLOR_KEYS[cat]];
  }

  const setCategoryColor = (category, swatchKey) => {
    updateProfile({ categoryColors: { ...profile.categoryColors, [category]: swatchKey } });
  };

  return (
    <CategoryColorsProvider value={resolvedCategoryColors}>
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
      `}</style>

      <TopNav
        view={view}
        setView={setView}
        onOpenWeeklyReview={() => setShowWeeklyReview(true)}
        onOpenManagePages={() => setShowManagePages(true)}
        onOpenSettings={() => setShowSettings(true)}
        onSignOut={onSignOut}
        enabledPages={profile.enabledPages}
      />

      <div
        style={{
          maxWidth: view === "calendar" ? "none" : 1100, margin: "0 auto", width: "100%", padding: view === "calendar" ? "16px 24px 12px" : "20px 16px 60px",
          flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
          overflowY: view === "calendar" ? "hidden" : "auto",
        }}
      >
        {view === "calendar" && (
          <CalendarView
            days={days}
            weekStart={weekStart}
            setWeekStart={setWeekStart}
            events={events}
            tasks={tasks}
            dueChips={dueChips}
            onCellClick={(date, hour) => setModal({ date, hour })}
            onToggleTask={setTaskDone}
            onChipClick={onChipClick}
            onOpenFocus={openFocus}
            onRescheduleTask={rescheduleTask}
            onEditEvent={setEditingEvent}
          />
        )}
        {view === "tasks" && (
          <TasksView tasks={tasks} onAddTask={addTask} onToggleDone={setTaskDone} onSetCategory={setTaskCategory} onRemove={removeTask} onOpenFocus={openFocus} />
        )}
        {view === "goals" && (
          <GoalsView
            goals={goals}
            defaultCategory={["Personal", "Health", "People"].find((c) => profile.focusAreas.includes(c)) || "Personal"}
            onAddGoal={addGoal}
            onRemoveGoal={removeGoal}
            onRenameGoal={renameGoal}
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
          />
        )}
        {view === "movies" && <MoviesView userId={userId} />}
        {view === "books" && <BooksView userId={userId} />}
        {view === "restaurants" && <RestaurantsView userId={userId} />}
        {view === "bucket" && <BucketListView userId={userId} />}
        {view === "packing" && <PackingListsView userId={userId} />}
        {view === "gifts" && <GiftsView userId={userId} />}
        {view === "notes" && <NotesView userId={userId} />}
      </div>

      {showManagePages && (
        <ManagePagesModal
          enabledPages={profile.enabledPages}
          onTogglePage={toggleLifestylePage}
          onClose={() => setShowManagePages(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          themeColor={profile.themeColor}
          onSetTheme={(key) => updateProfile({ themeColor: key })}
          categoryColors={profile.categoryColors}
          onSetCategoryColor={setCategoryColor}
          onReplayTour={() => { setShowSettings(false); setView("calendar"); setTourOpen(true); }}
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

      {tourOpen && (
        <TourOverlay
          setView={setView}
          enabledPages={profile.enabledPages}
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
