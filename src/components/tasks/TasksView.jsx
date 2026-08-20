import { useState } from "react";
import { CheckSquare, ChevronUp, Sparkles, NotebookPen, Plus } from "lucide-react";
import { CATEGORY_KEYS, TASK_COLOR } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { dayBefore, distributeDatesByLoad, groupItemsByDate, repeatDates, timeToDecimal, toISO } from "../../lib/dateHelpers";
import { uid } from "../../lib/id";
import { supabase } from "../../lib/supabase";
import { ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { AddRow, EmptyState, List, SectionHeader, SubHeader } from "../shared/Misc";
import BreakdownPreviewModal from "../shared/BreakdownPreviewModal";
import TodaySection from "./TodaySection";
import GroupedTaskRow from "./GroupedTaskRow";
import EduDeadlineRow from "./EduDeadlineRow";
import GoalDeadlineRow from "./GoalDeadlineRow";
import TaskRow from "./TaskRow";

const fieldLabelStyle = { fontSize: 10.5, color: "#93A0AD", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 };

export default function TasksView({ tasks, onAddTask, onToggleDone, onSetCategory, onRemove, onOpenTaskDetail, onSetDate, inboxItems, onTurnIntoTask, onDiscardInbox, eduItems, onSetEduDone, onGoToEducation, goalChips, onToggleGoalChip, onGoToGoals }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [leadDays, setLeadDays] = useState(""); // "days needed" — shows every day, urgent once inside the window
  const [repeat, setRepeat] = useState("None"); // ongoing recurring tasks (chores, gym days) — independent instances, not a group
  const [category, setCategory] = useState("Personal");
  const [showMore, setShowMore] = useState(false);
  const [useAI, setUseAI] = useState(false); // "Break it down" — for a task that's really a multi-day project
  const [details, setDetails] = useState("");
  const [breakingDown, setBreakingDown] = useState(false);
  const [breakdownError, setBreakdownError] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null); // { items } — shown for review before anything is added

  const resetForm = () => {
    setTitle(""); setDate(""); setTime(""); setLeadDays(""); setRepeat("None"); setDetails(""); setUseAI(false); setShowMore(false);
  };

  const breakDownTask = async () => {
    if (!title.trim() || !date || breakingDown) return;
    setBreakingDown(true);
    setBreakdownError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-task-plan", {
        body: { title: title.trim(), details: details.trim(), dueDate: date },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const steps = (data?.steps || []).map((s) => s.title).filter(Boolean);
      if (steps.length === 0) throw new Error("No steps came back — try adding a bit more detail.");

      const todayISO = toISO(new Date());
      const startISO = date > todayISO ? todayISO : date;
      const lastWorkDay = dayBefore(date);
      const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
      const dates = distributeDatesByLoad(startISO, endISO, steps.length, tasks);
      setPendingPlan({ items: groupItemsByDate(steps.map((stepTitle, i) => ({ title: stepTitle, date: dates[i] }))) });
    } catch (e) {
      setBreakdownError(e.message || "Couldn't reach the planner. It may not be set up yet.");
    } finally {
      setBreakingDown(false);
    }
  };

  const confirmPlan = () => {
    if (!pendingPlan || pendingPlan.items.length === 0) return;
    // More than one step — group them under one collapsed row in the Tasks list instead
    // of showing a row per day. A single-step "breakdown" just becomes a normal task.
    const groupId = pendingPlan.items.length > 1 ? uid() : null;
    const groupTitle = groupId ? title.trim() : null;
    pendingPlan.items.forEach((it) => onAddTask({ title: it.title, date: it.date, start: null, duration: null, category, groupId, groupTitle, notes: it.notes || null }));
    setPendingPlan(null);
    resetForm();
  };

  const add = () => {
    if (!title.trim()) return;
    if (useAI) { breakDownTask(); return; }
    const hasTime = date && time;
    // A recurring task (chores, gym days) creates independent instances on each
    // occurrence — not grouped like a breakdown, since each day stands on its own.
    if (date && repeat !== "None") {
      repeatDates(date, repeat).forEach((d) => {
        onAddTask({ title: title.trim(), date: d, start: hasTime ? timeToDecimal(time) : null, duration: hasTime ? 60 : null, category });
      });
      resetForm();
      return;
    }
    const lead = date && !time && Number(leadDays) > 1 ? Number(leadDays) : null;
    // The date is just the due date now, stored as-is — no picking a "work day" for you.
    // A task with a future (or no) due date just sits in Today until you get to it, unless
    // "days needed" is set — then it shows every day and goes urgent once you're that
    // close to the due date (see TodaySection / urgencyInfo).
    onAddTask({
      title: title.trim(),
      date: date || null,
      start: hasTime ? timeToDecimal(time) : null,
      duration: hasTime ? 60 : null,
      category,
      leadDays: lead,
    });
    resetForm();
  };

  // Tasks linked to an Education item (the auto-generated "Work on"/"Study" sessions for
  // assignments/tests/homework) stay out of the Upcoming Tasks list below — a week's
  // worth of near-identical "Work on: Essay" rows is exactly the clutter this list
  // shouldn't have. They still show up in Today (below) when they're due today, and
  // always on the Calendar for their actual day.
  const plainTasks = tasks.filter((t) => !t.eduId);

  // A "break it down" task collapses to one row (see GroupedTaskRow) instead of a row
  // per step — the Tasks list should show one task, not every day you're working on it.
  const byGroup = {};
  plainTasks.forEach((t) => {
    if (!t.groupId) return;
    (byGroup[t.groupId] ||= []).push(t);
  });
  const groupRows = Object.entries(byGroup)
    .map(([groupId, items]) => {
      const remainingItems = items.filter((t) => !t.done).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      return { groupId, groupTitle: items.find((t) => t.groupTitle)?.groupTitle || "Task", items, remainingItems, doneCount: items.filter((t) => t.done).length, total: items.length };
    })
    .filter((g) => g.remainingItems.length > 0); // whole group drops off once every step is done

  // Done tasks drop off the list entirely rather than sticking around struck through.
  const singleTasks = plainTasks.filter((t) => !t.groupId && !t.done);

  // Homework/assignment/test deadlines (not the day-by-day work sessions) show up here
  // too, so "what's due" is all in one place — homework, essays, everything.
  const eduDeadlines = (eduItems || []).filter((e) => e.dueDate && !e.done);

  // Goal actions with their own due date — not the goal or milestone itself (those are
  // aggregates with no independently-settable "done"), just the concrete steps.
  const goalDeadlines = (goalChips || []).filter((c) => !c.done);

  // Ordered by the day each is due, soonest first. Anything with no due date at all has
  // no "day due" to sort by, so it sinks to the bottom instead of breaking the order.
  const combined = [
    ...singleTasks.map((t) => ({ type: "single", date: t.date, task: t })),
    ...groupRows.map((g) => ({ type: "group", date: g.remainingItems[0]?.date || null, group: g })),
    ...eduDeadlines.map((e) => ({ type: "edu", date: e.dueDate, edu: e })),
    ...goalDeadlines.map((c) => ({ type: "goal", date: c.date, chip: c })),
  ].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return (
    <div>
      <SectionHeader title="Tasks" subtitle="Everything you need to get done." Icon={CheckSquare} tint={TASK_COLOR} />

      <TodaySection
        tasks={tasks}
        onToggleDone={onToggleDone}
        onOpenDetail={onOpenTaskDetail}
        eduItems={eduItems}
        onSetEduDone={onSetEduDone}
        onGoToEducation={onGoToEducation}
        goalChips={goalChips}
        onToggleGoalChip={onToggleGoalChip}
        onGoToGoals={onGoToGoals}
      />

      <div data-tour="tasks-add">
        <AddRow>
          <input
            autoFocus
            placeholder="Write a task and hit Enter..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={add} disabled={breakingDown} className="btn-primary" style={{ ...primaryBtn, opacity: breakingDown ? 0.6 : 1 }}>
            {useAI ? (breakingDown ? "Breaking it down..." : "Break it down for me") : "Add"}
          </button>
        </AddRow>
        <button
          onClick={() => setShowMore((x) => !x)}
          className="hoverable"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5, background: "#fff",
            border: "1.5px dashed #D1D5DB", borderRadius: 999, padding: "6px 12px 6px 9px",
            fontSize: 12, fontWeight: 700, color: "#7B8794", cursor: "pointer",
            marginBottom: showMore ? 10 : 16,
          }}
        >
          {showMore ? <ChevronUp size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
          {showMore ? "Hide options" : "Due date, category, or break it down for a bigger task"}
        </button>
      </div>

      {showMore && (
        <div style={{ background: "#FAFAF8", border: "1px solid #ECECEC", borderRadius: 14, padding: "16px 18px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={fieldLabelStyle}>Due by</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} title="Optional — a task with no due date just sits in Today until you finish it" style={{ ...inputStyle, width: 150 }} />
              {date && !useAI && (
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} title="Only if it's a real appointment at a specific time" style={{ ...inputStyle, width: 112, padding: "4px 8px", fontSize: 12.5 }} />
              )}
              {date && (
                <select value={repeat} onChange={(e) => setRepeat(e.target.value)} title="For an ongoing chore or routine — creates a separate task on each occurrence" style={{ ...inputStyle, width: 140 }}>
                  <option value="None">Doesn't repeat</option>
                  <option value="Daily">Every day</option>
                  <option value="Weekdays">Every weekday</option>
                  <option value="Weekly">Every week</option>
                </select>
              )}
            </div>
          </div>

          <div data-tour="tasks-category">
            <div style={fieldLabelStyle}>Category</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {CATEGORY_KEYS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                    border: `1px solid ${category === c ? CATEGORY_COLORS[c].border : "#E5E9ED"}`,
                    background: category === c ? CATEGORY_COLORS[c].bg : "#fff",
                    color: category === c ? CATEGORY_COLORS[c].text : "#93A0AD",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {date && !time && repeat === "None" && (
            <div>
              <div style={fieldLabelStyle}>Bigger than one sitting?</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: useAI ? 0.4 : 1 }}>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    placeholder="Days"
                    disabled={useAI}
                    value={leadDays}
                    onChange={(e) => setLeadDays(e.target.value)}
                    title="How many days you need to get it done — it'll show up every day and turn urgent once you're that close to the due date"
                    style={{ ...inputStyle, width: 70 }}
                  />
                  <span style={{ fontSize: 12, color: "#93A0AD" }}>days needed</span>
                </div>
                <span style={{ fontSize: 11, color: "#C2C9D1" }}>or</span>
                <button
                  onClick={() => setUseAI((x) => !x)}
                  style={{
                    padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                    border: `1px solid ${useAI ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                    background: useAI ? "var(--primary-tint, #E7E3FC)" : "#fff",
                    color: useAI ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                  title="Splits it into named steps leading up to this date, collapsed into one row you can expand"
                >
                  <Sparkles size={11} strokeWidth={2.3} /> Break it down for me
                </button>
              </div>

              {useAI && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Optional details to help break it down (what's the deliverable, who's it for)"
                    rows={2}
                    style={{ ...inputStyle, width: "100%", resize: "vertical" }}
                  />
                  {breakdownError && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: 6 }}>{breakdownError}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {inboxItems && inboxItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SubHeader>Quick capture ({inboxItems.length})</SubHeader>
          <div style={{ fontSize: 11.5, color: "#B4BCC5", marginTop: -4, marginBottom: 8 }}>Jotted down earlier — turn each into a real task, or discard it.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {inboxItems.map((it) => (
              <div key={it.id} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#fff", border: "1.5px solid #E5E9ED" }}>
                <NotebookPen size={15} strokeWidth={2.2} color="#B4BCC5" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 14, minWidth: 0, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{it.text}</div>
                <button onClick={() => onTurnIntoTask(it)} style={{ ...ghostBtn, fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>Turn into task</button>
                <button onClick={() => onDiscardInbox(it.id)} className="btn-delete" style={{ background: "none", border: "none", fontSize: 16, color: "#C2C9D1", padding: "0 4px" }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <SubHeader>Tasks</SubHeader>
      {combined.length === 0 ? (
        <EmptyState text="No tasks yet. Add one above or click a cell on the Calendar." />
      ) : (
        <List>
          {combined.map((item) => {
            if (item.type === "single") {
              return <TaskRow key={item.task.id} t={item.task} onToggleDone={onToggleDone} onSetCategory={onSetCategory} onRemove={onRemove} onOpenDetail={onOpenTaskDetail} onSetDate={onSetDate} showDate />;
            }
            if (item.type === "edu") {
              return <EduDeadlineRow key={`edu-${item.edu.id}`} item={item.edu} onToggleDone={onSetEduDone} onOpen={onGoToEducation} />;
            }
            if (item.type === "goal") {
              return <GoalDeadlineRow key={`goal-${item.chip.id}`} item={item.chip} onToggle={() => onToggleGoalChip(item.chip)} onOpen={onGoToGoals} />;
            }
            return (
              <GroupedTaskRow
                key={item.group.groupId}
                groupTitle={item.group.groupTitle}
                remainingItems={item.group.remainingItems}
                doneCount={item.group.doneCount}
                total={item.group.total}
                onToggleDone={onToggleDone}
                onSetCategory={onSetCategory}
                onRemove={onRemove}
                onOpenDetail={onOpenTaskDetail}
                onSetDate={onSetDate}
              />
            );
          })}
        </List>
      )}

      {pendingPlan && (
        <BreakdownPreviewModal
          heading={title || "Your task"}
          items={pendingPlan.items}
          onChangeItems={(items) => setPendingPlan((p) => ({ ...p, items }))}
          onConfirm={confirmPlan}
          onCancel={() => setPendingPlan(null)}
        />
      )}
    </div>
  );
}
