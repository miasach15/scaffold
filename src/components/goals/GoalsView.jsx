import { useState } from "react";
import { Target, Sparkles } from "lucide-react";
import { SUGGESTED_GOALS, cardStyle } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { supabase } from "../../lib/supabase";
import { inputStyle, primaryBtn, suggestionChip } from "../../lib/styles";
import { AddRow, EmptyState, FilterPill, SectionHeader } from "../shared/Misc";
import GoalCard from "./GoalCard";

export default function GoalsView({ goals, defaultCategory, onAddGoal, onRemoveGoal, onRenameGoal, onAddMilestone, onRemoveMilestone, onRenameMilestone, onSetMilestoneDueDate, onAddAction, onSetActionDone, onRemoveAction, onRenameAction, onSetActionDueDate }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [filter, setFilter] = useState("All");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(defaultCategory || "Personal");
  const [deadline, setDeadline] = useState("");
  const [outcome, setOutcome] = useState("");
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState(null);

  const addGoal = (t, cat, useDeadline = true) => {
    const tt = (t !== undefined ? t : title).trim();
    const c = cat || category;
    if (!tt) return;
    onAddGoal(tt, c, useDeadline ? deadline || null : null);
    if (t === undefined) { setTitle(""); setDeadline(""); }
  };

  const breakItDown = async () => {
    const desc = outcome.trim();
    if (!desc || planning) return;
    setPlanning(true);
    setPlanError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-goal-plan", {
        body: { outcome: desc, category },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const milestones = data?.milestones || [];
      if (milestones.length === 0) throw new Error("No plan came back — try rephrasing.");

      const goalId = await onAddGoal(desc, category, null);
      for (const m of milestones) {
        if (!m.title) continue;
        const milestoneId = await onAddMilestone(goalId, m.title);
        for (const a of m.actions || []) {
          if (a.title) await onAddAction(goalId, milestoneId, a.title, null);
        }
      }
      setOutcome("");
    } catch (e) {
      setPlanError(e.message || "Couldn't reach the planner. It may not be set up yet.");
    } finally {
      setPlanning(false);
    }
  };

  const filtered = filter === "All" ? goals : goals.filter((g) => g.category === filter);
  const suggestions = SUGGESTED_GOALS[category] || [];

  return (
    <div>
      <SectionHeader title="Goals" subtitle="Goal, then milestones, then the next small action." Icon={Target} tint={CATEGORY_COLORS.People} />

      <div style={{ ...cardStyle, padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
          <Sparkles size={14} color={CATEGORY_COLORS[category]?.text} strokeWidth={2.3} /> Describe the outcome, we'll break it down
        </div>
        <textarea
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="e.g. Run a 10k by next spring"
          rows={2}
          style={{ ...inputStyle, width: "100%", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: 130 }}>
            <option>Personal</option><option>Health</option><option>People</option>
          </select>
          <div style={{ flex: 1 }} />
          <button
            onClick={breakItDown}
            disabled={!outcome.trim() || planning}
            className="btn-primary"
            style={{ ...primaryBtn, opacity: outcome.trim() && !planning ? 1 : 0.5 }}
          >
            {planning ? "Breaking it down..." : "Break it down for me"}
          </button>
        </div>
        {planError && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: 8 }}>{planError}</div>}
      </div>

      <div data-tour="goals-filter" style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["All", "Personal", "Health", "People"].map((c) => (
          <FilterPill key={c} label={c} active={filter === c} color={CATEGORY_COLORS[c]} onClick={() => setFilter(c)} />
        ))}
      </div>

      <div data-tour="goals-add">
        <AddRow>
          <input placeholder="Or add a goal manually..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addGoal()} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: 130 }}>
            <option>Personal</option><option>Health</option><option>People</option>
          </select>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} title="Goal deadline (optional)" style={{ ...inputStyle, width: 150 }} />
          <button onClick={() => addGoal()} className="btn-primary" style={primaryBtn}>Add</button>
        </AddRow>
      </div>

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
              onRenameGoal={onRenameGoal}
              onAddMilestone={onAddMilestone}
              onRemoveMilestone={onRemoveMilestone}
              onRenameMilestone={onRenameMilestone}
              onSetMilestoneDueDate={onSetMilestoneDueDate}
              onAddAction={onAddAction}
              onSetActionDone={onSetActionDone}
              onRemoveAction={onRemoveAction}
              onRenameAction={onRenameAction}
              onSetActionDueDate={onSetActionDueDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
