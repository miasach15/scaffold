import { useState } from "react";
import { CheckSquare } from "lucide-react";
import { CATEGORY_KEYS, TASK_COLOR } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { timeToDecimal } from "../../lib/dateHelpers";
import { inputStyle, primaryBtn } from "../../lib/styles";
import { AddRow, EmptyState, List, SectionHeader, SubHeader } from "../shared/Misc";
import TaskRow from "./TaskRow";

export default function TasksView({ tasks, onAddTask, onToggleDone, onSetCategory, onRemove, onOpenFocus }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("Personal");

  const add = () => {
    if (!title.trim()) return;
    const hasTime = date && time;
    onAddTask({
      title: title.trim(),
      date: date || null,
      start: hasTime ? timeToDecimal(time) : null,
      duration: hasTime ? 60 : null,
      category,
    });
    setTitle(""); setDate(""); setTime("");
  };

  // Done tasks drop off the list entirely rather than sticking around struck through.
  const scheduled = tasks.filter((t) => t.date && !t.done).sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? -1) - (b.start ?? -1));
  const unscheduled = tasks.filter((t) => !t.date && !t.done);

  return (
    <div>
      <SectionHeader title="Tasks" subtitle="Everything you need to get done." Icon={CheckSquare} tint={TASK_COLOR} />
      <div data-tour="tasks-add">
        <AddRow>
          <input placeholder="Add a task..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && add()} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: 150 }} />
          <button onClick={add} className="btn-primary" style={primaryBtn}>Add</button>
        </AddRow>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
        {date && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#4A5568" }}>
            <span>Time (optional):</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputStyle, width: 112, padding: "4px 8px", fontSize: 12.5 }} />
            <span style={{ fontSize: 11, color: "#B4BCC5" }}>Leave blank for an all-day task</span>
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
      </div>

      {unscheduled.length > 0 && (
        <>
          <SubHeader>Backlog</SubHeader>
          <List>{unscheduled.map((t) => <TaskRow key={t.id} t={t} onToggleDone={onToggleDone} onSetCategory={onSetCategory} onRemove={onRemove} onOpenFocus={onOpenFocus} />)}</List>
        </>
      )}

      <SubHeader>Scheduled</SubHeader>
      {scheduled.length === 0 ? (
        <EmptyState text="No scheduled tasks yet. Add one above or click a cell on the Calendar." />
      ) : (
        <List>{scheduled.map((t) => <TaskRow key={t.id} t={t} onToggleDone={onToggleDone} onSetCategory={onSetCategory} onRemove={onRemove} onOpenFocus={onOpenFocus} showDate />)}</List>
      )}
    </div>
  );
}
