import { useState } from "react";
import { CheckSquare } from "lucide-react";
import { PRIORITY_COLORS, TASK_COLOR } from "../../lib/constants";
import { inputStyle, primaryBtn } from "../../lib/styles";
import { AddRow, EmptyState, List, SectionHeader, SubHeader } from "../shared/Misc";
import TaskRow from "./TaskRow";
import PriorityBand from "./PriorityBand";

export default function TasksView({ tasks, onAddTask, onToggleDone, onRemove, onOpenFocus }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [priority, setPriority] = useState("Low");

  const add = () => {
    if (!title.trim()) return;
    onAddTask({
      title: title.trim(),
      date: date || null,
      start: date && !allDay ? 9 : null,
      duration: date && !allDay ? 60 : null,
      priority,
    });
    setTitle(""); setDate(""); setPriority("Low");
  };

  const scheduled = tasks.filter((t) => t.date).sort((a, b) => a.date.localeCompare(b.date));
  const unscheduled = tasks.filter((t) => !t.date);

  return (
    <div>
      <SectionHeader title="Tasks" subtitle="Everything you need to get done." Icon={CheckSquare} tint={TASK_COLOR} />
      <AddRow>
        <input placeholder="Add a task..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: 150 }} />
        <button onClick={add} className="btn-primary" style={primaryBtn}>Add</button>
      </AddRow>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
        {date && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#4A5568" }}>
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            All-day (shows in "Tasks" on the Calendar instead of a time slot)
          </label>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#93A0AD" }}>Priority:</span>
          {["Low", "Medium", "Urgent"].map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              style={{
                padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                border: `1px solid ${priority === p ? PRIORITY_COLORS[p].border : "#E5E9ED"}`,
                background: priority === p ? PRIORITY_COLORS[p].bg : "#fff",
                color: priority === p ? PRIORITY_COLORS[p].text : "#93A0AD",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <>
          <SubHeader>Backlog</SubHeader>
          <List>{unscheduled.map((t) => <TaskRow key={t.id} t={t} onToggleDone={onToggleDone} onRemove={onRemove} onOpenFocus={onOpenFocus} />)}</List>
        </>
      )}

      <SubHeader>Scheduled</SubHeader>
      {scheduled.length === 0 ? (
        <EmptyState text="No scheduled tasks yet. Add one above or click a cell on the Calendar." />
      ) : (
        ["Urgent", "Medium", "Low"].map((level) => {
          const group = scheduled.filter((t) => (t.priority || "Low") === level);
          if (group.length === 0) return null;
          return (
            <div key={level} style={{ marginBottom: 16 }}>
              <PriorityBand label={level} count={group.length} color={PRIORITY_COLORS[level]} />
              <List>{group.map((t) => <TaskRow key={t.id} t={t} onToggleDone={onToggleDone} onRemove={onRemove} onOpenFocus={onOpenFocus} showDate />)}</List>
            </div>
          );
        })
      )}
    </div>
  );
}
