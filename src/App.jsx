import { useMemo, useState } from "react";
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

import { addDays, decimalToTimeLabel, repeatDates, startOfWeek, timeToDecimal, toISO } from "./lib/dateHelpers";
import { PAPER_BG, PRIMARY } from "./lib/constants";

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
  const { events, addEvents } = useEvents(userId);
  const { tasks, addTask, toggleTaskDone, removeTask, removeTasksByEduId, rescheduleTask } = useTasks(userId);
  const { goals, addGoal, removeGoal, addMilestone, removeMilestone, addAction, toggleAction, removeAction } = useGoals(userId);
  const { habits, addHabit, addHabitsBulk, removeHabit, toggleToday } = useHabits(userId);
  const { entries: journalEntries, addEntry: addJournalEntry, removeEntry: removeJournalEntry } = useJournal(userId);
  const { eduItems, addEduItems, toggleDone: toggleEduDone, removeItem: removeEduItemRaw } = useEduItems(userId);

  const [view, setView] = useState("calendar");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [modal, setModal] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  const openFocus = (id, title) => setFocusTask({ id, title });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const dueChips = useMemo(() => {
    const chips = [];
    goals.forEach((g) => {
      const allActions = g.milestones.flatMap((m) => m.actions);
      const allActionsDone = allActions.length > 0 && allActions.every((a) => a.done);
      if (g.deadline) chips.push({ id: g.id, kind: "goal-deadline", title: g.title, date: g.deadline, done: allActionsDone, category: g.category, goalId: g.id });
      g.milestones.forEach((m) => {
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
    if (chip.kind === "goal") toggleAction(chip.goalId, chip.milestoneId, chip.id);
    else if (chip.kind === "edu") toggleEduDone(chip.id);
    else if (chip.kind === "task") toggleTaskDone(chip.id);
  };

  const todayISO = toISO(new Date());

  const todayPriorities = useMemo(() => {
    const items = [];
    dueChips.forEach((c) => {
      if (c.done || c.date > todayISO) return;
      let label = c.title;
      if (c.kind === "goal-deadline") label = `Goal due: ${c.title}`;
      else if (c.kind === "edu") label = `${c.type}${c.subject ? ` (${c.subject})` : ""}: ${c.title}`;
      const colorKind = c.kind === "goal-deadline" ? "goal" : c.kind;
      items.push({ key: `chip-${c.kind}-${c.id}`, title: label, tag: null, overdue: c.date < todayISO, colorKind, category: c.category, type: c.type, onClick: () => onChipClick(c) });
    });
    tasks.forEach((t) => {
      if (t.done || t.start == null || !t.date || t.date > todayISO) return;
      items.push({ key: `task-${t.id}`, title: t.title, tag: decimalToTimeLabel(t.start), overdue: t.date < todayISO, colorKind: "task", priority: t.priority || "Low", onClick: () => toggleTaskDone(t.id), onFocus: () => openFocus(t.id, t.title) });
    });
    items.sort((a, b) => (a.overdue === b.overdue ? 0 : a.overdue ? -1 : 1));
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueChips, tasks, todayISO]);

  const todayEvents = useMemo(() => events.filter((e) => e.date === todayISO).sort((a, b) => a.start - b.start), [events, todayISO]);

  const completeOnboarding = async (answers) => {
    await updateProfile({ name: answers.name, focusAreas: answers.focusAreas, workStyle: answers.workStyle, onboarded: true });
    if (answers.habitPicks.length > 0) await addHabitsBulk(answers.habitPicks);
  };

  const removeEduItem = async (id) => {
    await removeTasksByEduId(id);
    await removeEduItemRaw(id);
  };

  const addEduItem = (title, type, subject, dueDate, repeat) => {
    addEduItems({ title, type, subject, occurrences: repeatDates(dueDate, repeat) });
  };

  const addEduSession = (eduId, sessionTitle, date, time, duration, isAllDay) => {
    addTask({ title: sessionTitle, date, start: isAllDay ? null : timeToDecimal(time), duration: isAllDay ? null : duration, eduId, priority: "Low" });
  };

  if (profileLoading || !profile) return <FullScreenMessage text="Loading your data..." />;
  if (!profile.onboarded) return <OnboardingQuiz onComplete={completeOnboarding} />;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: `radial-gradient(circle at 15% 0%, #FDFBF8 0%, ${PAPER_BG} 45%)`, minHeight: "100vh", color: "#000000" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; transition: transform .12s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease, opacity .15s ease; }
        button:active:not(:disabled) { transform: scale(0.97); }
        button:disabled { cursor: default; }
        input, select, textarea { font-family: inherit; transition: border-color .15s ease, box-shadow .15s ease; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: ${PRIMARY} !important; box-shadow: 0 0 0 3px rgba(110,147,183,0.16); }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #E7E1D8; border-radius: 4px; }
        .btn-primary:hover:not(:disabled) { box-shadow: 0 3px 10px rgba(110,147,183,0.35); transform: translateY(-1px); }
        .btn-ghost:hover:not(:disabled) { background: #FAF7F2 !important; border-color: #D9D2C6 !important; }
        .btn-delete { border-radius: 999px !important; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; }
        .btn-delete:hover:not(:disabled) { background: #FBEAEA !important; color: #B03A3A !important; }
        .hoverable:hover { box-shadow: 0 4px 16px rgba(90,70,50,0.09) !important; transform: translateY(-1px); }
      `}</style>

      <TopNav view={view} setView={setView} onOpenWeeklyReview={() => setShowWeeklyReview(true)} onSignOut={onSignOut} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 60px" }}>
        {view === "calendar" && (
          <CalendarView
            days={days}
            weekStart={weekStart}
            setWeekStart={setWeekStart}
            events={events}
            tasks={tasks}
            dueChips={dueChips}
            todayPriorities={todayPriorities}
            todayEvents={todayEvents}
            onCellClick={(date, hour) => setModal({ date, hour })}
            onToggleTask={toggleTaskDone}
            onChipClick={onChipClick}
            onOpenFocus={openFocus}
            onRescheduleTask={rescheduleTask}
            profileName={profile.name}
          />
        )}
        {view === "tasks" && (
          <TasksView tasks={tasks} onAddTask={addTask} onToggleDone={toggleTaskDone} onRemove={removeTask} onOpenFocus={openFocus} />
        )}
        {view === "goals" && (
          <GoalsView
            goals={goals}
            defaultCategory={["Personal", "Health", "People"].find((c) => profile.focusAreas.includes(c)) || "Personal"}
            onAddGoal={addGoal}
            onRemoveGoal={removeGoal}
            onAddMilestone={addMilestone}
            onRemoveMilestone={removeMilestone}
            onAddAction={addAction}
            onToggleAction={toggleAction}
            onRemoveAction={removeAction}
          />
        )}
        {view === "habits" && (
          <HabitsView habits={habits} onAddHabit={addHabit} onRemoveHabit={removeHabit} onToggleToday={toggleToday} />
        )}
        {view === "journal" && (
          <JournalView entries={journalEntries} onAddEntry={addJournalEntry} onRemoveEntry={removeJournalEntry} />
        )}
        {view === "education" && (
          <EducationView
            eduItems={eduItems}
            tasks={tasks}
            onAddEduItem={addEduItem}
            onToggleEduDone={toggleEduDone}
            onRemoveEduItem={removeEduItem}
            onAddSession={addEduSession}
            onRemoveSession={removeTask}
            onToggleSessionDone={toggleTaskDone}
            onOpenFocus={openFocus}
          />
        )}
      </div>

      {modal && (
        <QuickAddModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={(item) => {
            const occurrences = repeatDates(item.date, item.repeat);
            addEvents(occurrences.map((d) => ({ title: item.title, date: d, start: item.start, duration: item.duration, category: item.category || "Personal" })));
            setModal(null);
          }}
        />
      )}

      {focusTask && (
        <FocusTimerModal
          task={focusTask}
          onClose={() => setFocusTask(null)}
          onComplete={() => { toggleTaskDone(focusTask.id); setFocusTask(null); }}
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
    </div>
  );
}
