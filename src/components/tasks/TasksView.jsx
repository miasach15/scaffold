import { useState } from "react";
import { CheckSquare, Sparkles, NotebookPen } from "lucide-react";
import { CATEGORY_KEYS, TASK_COLOR } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { dayBefore, distributeDatesByLoad, groupItemsByDate, timeToDecimal, toISO } from "../../lib/dateHelpers";
import { supabase } from "../../lib/supabase";
import { ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { AddRow, EmptyState, List, SectionHeader, SubHeader } from "../shared/Misc";
import BreakdownPreviewModal from "../shared/BreakdownPreviewModal";
import TodaySection from "./TodaySection";
import TaskRow from "./TaskRow";

export default function TasksView({ tasks, onAddTask, onToggleDone, onSetCategory, onRemove, onOpenTaskDetail, inboxItems, onTurnIntoTask, onDiscardInbox }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("Personal");
  const [useAI, setUseAI] = useState(false); // "Break it down" — for a task that's really a multi-day project
  const [details, setDetails] = useState("");
  const [breakingDown, setBreakingDown] = useState(false);
  const [breakdownError, setBreakdownError] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null); // { items } — shown for review before anything is added

  const resetForm = () => {
    setTitle(""); setDate(""); setTime(""); setDetails(""); setUseAI(false);
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
    if (!pendingPlan) return;
    pendingPlan.items.forEach((it) => onAddTask({ title: it.title, date: it.date, start: null, duration: null, category }));
    setPendingPlan(null);
    resetForm();
  };

  const add = () => {
    if (!title.trim()) return;
    if (useAI) { breakDownTask(); return; }
    const hasTime = date && time;
    let scheduledDate = date || null;
    if (date && !hasTime) {
      // No specific time given — the date is "needs to be done by", not "I'm doing it
      // then". Pick whichever day between now and then has the fewest tasks already.
      const todayISO = toISO(new Date());
      const startISO = date > todayISO ? todayISO : date;
      scheduledDate = distributeDatesByLoad(startISO, date, 1, tasks)[0];
    }
    onAddTask({
      title: title.trim(),
      date: scheduledDate,
      start: hasTime ? timeToDecimal(time) : null,
      duration: hasTime ? 60 : null,
      category,
    });
    resetForm();
  };

  // Done tasks drop off the list entirely rather than sticking around struck through.
  // One flat list — undated tasks (no due-by set) float to the top since they're the
  // ones still needing a date, rather than being split into a separate "Backlog".
  const activeTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date.localeCompare(b.date) || (a.start ?? -1) - (b.start ?? -1);
    });

  return (
    <div>
      <SectionHeader title="Tasks" subtitle="Everything you need to get done." Icon={CheckSquare} tint={TASK_COLOR} />

      <TodaySection tasks={tasks} onToggleDone={onToggleDone} onOpenDetail={onOpenTaskDetail} />
      <div data-tour="tasks-add">
        <AddRow>
          <input placeholder="Add a task..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1, alignSelf: "flex-end" }} onKeyDown={(e) => e.key === "Enter" && add()} />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2 }}>
            <label style={{ fontSize: 9.5, color: "#93A0AD", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Due by</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} title={useAI ? "Due date — we'll space steps out before it" : "Needs to be done by — we'll pick the actual day for you, unless you set a time"} style={{ ...inputStyle, width: 150 }} />
          </div>
          <button onClick={add} disabled={breakingDown} className="btn-primary" style={{ ...primaryBtn, opacity: breakingDown ? 0.6 : 1, alignSelf: "flex-end" }}>
            {useAI ? (breakingDown ? "Breaking it down..." : "Break it down for me") : "Add"}
          </button>
        </AddRow>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
        {date && !useAI && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#4A5568" }}>
            <span>Time (optional):</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputStyle, width: 112, padding: "4px 8px", fontSize: 12.5 }} />
            <span style={{ fontSize: 11, color: "#B4BCC5" }}>{time ? "Locked to this exact date & time" : "Leave blank and we'll pick the least busy day up to your date"}</span>
          </div>
        )}
        <div data-tour="tasks-category" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#93A0AD" }}>Category:</span>
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
        {date && (
          <button
            onClick={() => setUseAI((x) => !x)}
            style={{
              padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
              border: `1px solid ${useAI ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
              background: useAI ? "var(--primary-tint, #E7E3FC)" : "#fff",
              color: useAI ? "var(--primary-dark, #5849C4)" : "#93A0AD",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}
            title="For a bigger task that'll take more than one sitting — spreads it into several smaller tasks leading up to this date"
          >
            <Sparkles size={11} strokeWidth={2.3} /> Break it down
          </button>
        )}
      </div>

      {useAI && (
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional — any details that'll help break this down (e.g. what the deliverable is, who it's for)."
            rows={2}
            style={{ ...inputStyle, width: "100%", resize: "vertical" }}
          />
          <div style={{ fontSize: 11, color: "#B4BCC5", marginTop: 4 }}>We'll turn "{title || "your task"}" into a few smaller tasks spread out before {date || "the due date"}, instead of adding it as one task.</div>
          {breakdownError && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: 6 }}>{breakdownError}</div>}
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
      {activeTasks.length === 0 ? (
        <EmptyState text="No tasks yet. Add one above or click a cell on the Calendar." />
      ) : (
        <List>{activeTasks.map((t) => <TaskRow key={t.id} t={t} onToggleDone={onToggleDone} onSetCategory={onSetCategory} onRemove={onRemove} onOpenDetail={onOpenTaskDetail} showDate />)}</List>
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
