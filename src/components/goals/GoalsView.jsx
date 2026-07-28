import { useState } from "react";
import { Target } from "lucide-react";
import { CATEGORY_COLORS, SUGGESTED_GOALS } from "../../lib/constants";
import { inputStyle, primaryBtn, suggestionChip } from "../../lib/styles";
import { AddRow, EmptyState, FilterPill, SectionHeader } from "../shared/Misc";
import GoalCard from "./GoalCard";

export default function GoalsView({ goals, defaultCategory, onAddGoal, onRemoveGoal, onAddMilestone, onRemoveMilestone, onAddAction, onToggleAction, onRemoveAction }) {
  const [filter, setFilter] = useState("All");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(defaultCategory || "Personal");
  const [deadline, setDeadline] = useState("");

  const addGoal = (t, cat, useDeadline = true) => {
    const tt = (t !== undefined ? t : title).trim();
    const c = cat || category;
    if (!tt) return;
    onAddGoal(tt, c, useDeadline ? deadline || null : null);
    if (t === undefined) { setTitle(""); setDeadline(""); }
  };

  const filtered = filter === "All" ? goals : goals.filter((g) => g.category === filter);
  const suggestions = SUGGESTED_GOALS[category] || [];

  return (
    <div>
      <SectionHeader title="Goals" subtitle="Goal, then milestones, then the next small action." Icon={Target} tint={CATEGORY_COLORS.People} />

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["All", "Personal", "Health", "People"].map((c) => (
          <FilterPill key={c} label={c} active={filter === c} color={CATEGORY_COLORS[c]} onClick={() => setFilter(c)} />
        ))}
      </div>

      <AddRow>
        <input placeholder="Add a goal..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addGoal()} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: 130 }}>
          <option>Personal</option><option>Health</option><option>People</option>
        </select>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} title="Goal deadline (optional)" style={{ ...inputStyle, width: 150 }} />
        <button onClick={() => addGoal()} className="btn-primary" style={primaryBtn}>Add</button>
      </AddRow>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        <span style={{ fontSize: 11.5, color: "#B4BCC5", alignSelf: "center", marginRight: 2 }}>Suggested for {category}:</span>
        {suggestions.map((s) => (
          <button key={s} onClick={() => addGoal(s, category, false)} style={suggestionChip}>+ {s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No goals here yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onRemoveGoal={onRemoveGoal}
              onAddMilestone={onAddMilestone}
              onRemoveMilestone={onRemoveMilestone}
              onAddAction={onAddAction}
              onToggleAction={onToggleAction}
              onRemoveAction={onRemoveAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
