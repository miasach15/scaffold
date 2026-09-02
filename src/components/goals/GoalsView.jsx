import { useState } from "react";
import { Target } from "lucide-react";
import { BORDER } from "../../lib/constants";
import { useCategoryColors, useCategoryKeys } from "../../hooks/CategoryColorsContext";
import { supabase } from "../../lib/supabase";
import { inputStyle, primaryBtn } from "../../lib/styles";
import { AddRow, EmptyState, FilterPill, SectionHeader } from "../shared/Misc";
import GoalCard from "./GoalCard";

export default function GoalsView({ goals, defaultCategory, onAddGoal, onRemoveGoal, onRenameGoal, onSetGoalDeadline, onAddMilestone, onRemoveMilestone, onRenameMilestone, onSetMilestoneDueDate, onAddAction, onMoveAction, onSetActionDone, onRemoveAction, onRenameAction, onSetActionDueDate }) {
  const CATEGORY_COLORS = useCategoryColors();
  // Goals used to hardcode Personal/Health/People (deliberately leaving out Education,
  // since Education had its own separate system) — now that categories are user-defined,
  // that exclusion doesn't make sense anymore; a goal can be any category the user has.
  const categoryKeys = useCategoryKeys();
  const [filter, setFilter] = useState("All");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(defaultCategory || "Personal");
  const [deadline, setDeadline] = useState("");
  const [outcome, setOutcome] = useState("");
  const [outcomeDeadline, setOutcomeDeadline] = useState("");
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState(null);

  const addGoal = (t, cat, useDeadline = true) => {
    const tt = (t !== undefined ? t : title).trim();
    const c = cat || category;
    if (!tt) return;
    const d = useDeadline ? deadline || null : null;
    onAddGoal(tt, c, d);
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
      if (milestones.length === 0) throw new Error("No plan came back. Try rephrasing.");

      const goalId = await onAddGoal(desc, category, outcomeDeadline || null);
      for (const m of milestones) {
        if (!m.title) continue;
        const milestoneId = await onAddMilestone(goalId, m.title);
        for (const a of m.actions || []) {
          if (a.title) await onAddAction(goalId, milestoneId, a.title, null);
        }
      }
      // With an end date given, spread dates across every milestone and action that
      // just got created undated — same cascade as setting/changing a goal's deadline
      // manually.
      if (outcomeDeadline && onSetGoalDeadline) await onSetGoalDeadline(goalId, outcomeDeadline);
      setOutcome("");
      setOutcomeDeadline("");
    } catch (e) {
      setPlanError(e.message || "Couldn't reach the planner. It may not be set up yet.");
    } finally {
      setPlanning(false);
    }
  };

  const filtered = filter === "All" ? goals : goals.filter((g) => g.category === filter);

  return (
    <div>
      <SectionHeader title="Goals" subtitle="The big things you're building: a business, an app, a nonprofit, a real project. Broken into a clear, day-by-day path." Icon={Target} tint={CATEGORY_COLORS.People} />

      <div style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
          Describe what you're building, we'll break it down
        </div>
        <textarea
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="e.g. Launch a small tutoring business by the end of the school year"
          rows={2}
          style={{ ...inputStyle, width: "100%", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: 130 }}>
            {categoryKeys.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input
            type="date"
            value={outcomeDeadline}
            onChange={(e) => setOutcomeDeadline(e.target.value)}
            title="Give it an end date and every milestone/action gets a date spread automatically around your existing events and tasks, instead of landing undated"
            style={{ ...inputStyle, width: 150 }}
          />
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
        {["All", ...categoryKeys].map((c) => (
          <FilterPill key={c} label={c} active={filter === c} color={CATEGORY_COLORS[c]} onClick={() => setFilter(c)} />
        ))}
      </div>

      <div data-tour="goals-add">
        <AddRow>
          <input placeholder="Or add a goal manually (a real project, not a quick errand)..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addGoal()} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: 130 }}>
            {categoryKeys.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} title="Goal deadline (optional)" style={{ ...inputStyle, width: 150 }} />
          <button onClick={() => addGoal()} className="btn-primary" style={primaryBtn}>Add</button>
        </AddRow>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No goals here yet. This is the place for the big stuff: a business, an app, a nonprofit, a real project. Small errands belong on Tasks." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onRemoveGoal={onRemoveGoal}
              onRenameGoal={onRenameGoal}
              onSetGoalDeadline={onSetGoalDeadline}
              onAddMilestone={onAddMilestone}
              onRemoveMilestone={onRemoveMilestone}
              onRenameMilestone={onRenameMilestone}
              onSetMilestoneDueDate={onSetMilestoneDueDate}
              onAddAction={onAddAction}
              onMoveAction={onMoveAction}
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
