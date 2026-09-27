import { useState } from "react";
import { ChevronUp, Plus } from "lucide-react";
import { BORDER, INK, MUTED, SURFACE, serifFont } from "../../lib/constants";
import { useCategoryColors, useCategoryKeys } from "../../hooks/CategoryColorsContext";
import { supabase } from "../../lib/supabase";
import { inputStyle, primaryBtn } from "../../lib/styles";
import { DatePickerButton, EmptyState, FilterPill, SectionHeader } from "../shared/Misc";
import GoalCard from "./GoalCard";

const toggleBtn = {
  display: "inline-flex", alignItems: "center", gap: 5, background: "#fff",
  border: "1.5px dashed #D1D5DB", borderRadius: 999, padding: "5px 11px 5px 8px",
  fontSize: 11.5, fontWeight: 700, color: "#7B8794", cursor: "pointer",
};

// Shown in place of the textarea's own empty gray line — a concrete, already-broken-down
// goal so the reward for using "Break it down for me" is visible before typing anything,
// instead of only being explained in a subtitle. Purely illustrative: dates are just
// reasonable stand-ins spread up to the example's own "Nov 1", not tied to today's date.
const SAMPLE_GOAL_TITLE = "Learn to sew";
const SAMPLE_GOAL_DEADLINE = "Nov 1";
const SAMPLE_GOAL_STEPS = [
  { title: "Buy a beginner sewing machine", date: "Sep 5" },
  { title: "Watch 3 tutorial videos", date: "Sep 10" },
  { title: "Practice basic stitches on scrap fabric", date: "Sep 18" },
  { title: "Sew a simple tote bag", date: "Oct 2" },
  { title: "Try a beginner clothing pattern", date: "Oct 20" },
  { title: "Finish and wear your first project", date: "Nov 1" },
];

export default function GoalsView({ goals, defaultCategory, onAddGoal, onRemoveGoal, onRenameGoal, onSetGoalDeadline, onAddMilestone, onRemoveMilestone, onRenameMilestone, onSetMilestoneDueDate, onAddAction, onMoveAction, onSetActionDone, onRemoveAction, onRenameAction, onSetActionDueDate }) {
  const CATEGORY_COLORS = useCategoryColors();
  // Goals used to hardcode Personal/Health/Social (deliberately leaving out Education,
  // since Education had its own separate system) — now that categories are user-defined,
  // that exclusion doesn't make sense anymore; a goal can be any category the user has.
  const categoryKeys = useCategoryKeys();
  const [filter, setFilter] = useState("All");
  // One input feeds both the AI-breakdown path and the plain-add path — previously two
  // separate textboxes (and two separate deadline/category state pairs) for what is,
  // from the user's point of view, one action: describing a goal.
  const [outcome, setOutcome] = useState("");
  const [category, setCategory] = useState(defaultCategory || "Personal");
  const [deadline, setDeadline] = useState("");
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState(null);
  // Category + deadline stay tucked behind a toggle by default — one textarea and two
  // clear actions up front, not several decisions before you can start typing.
  const [showOptions, setShowOptions] = useState(false);

  const resetForm = () => {
    setOutcome("");
    setDeadline("");
  };

  // The small "Just add it" escape hatch — same input, no AI call, no milestones.
  const addGoalManually = () => {
    const tt = outcome.trim();
    if (!tt || planning) return;
    onAddGoal(tt, category, deadline || null);
    resetForm();
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

      const goalId = await onAddGoal(desc, category, deadline || null);
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
      if (deadline && onSetGoalDeadline) await onSetGoalDeadline(goalId, deadline);
      resetForm();
    } catch (e) {
      setPlanError(e.message || "Couldn't reach the planner. It may not be set up yet.");
    } finally {
      setPlanning(false);
    }
  };

  const filtered = filter === "All" ? goals : goals.filter((g) => g.category === filter);
  // A handful of big projects at once is plenty — past that it stops being a focused set
  // of things you're actually pushing on. The add card just quietly stops showing up
  // rather than surfacing a "you've hit your limit" message.
  const atGoalLimit = goals.length >= 5;
  const canAct = outcome.trim().length > 0 && !planning;
  // The sample breakdown is a first-time teaser only — it disappears the moment there's
  // a real goal to look at, or the moment someone starts typing their own.
  const showSample = outcome.trim().length === 0 && goals.length === 0;

  return (
    <div>
      <SectionHeader title="Goals" subtitle="Big projects, broken into a clear, day-by-day path." />

      {!atGoalLimit && (
        <div data-tour="goals-add" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>What's your goal?</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>
            Big projects live here — quick errands go on Tasks.
          </div>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="e.g. Launch a small tutoring business by the end of the school year"
            rows={2}
            style={{ ...inputStyle, width: "100%", resize: "vertical", background: "#fff" }}
          />

          {showSample && (
            <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10, border: `1px dashed ${BORDER}`, opacity: 0.55 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: MUTED, marginBottom: 6 }}>
                Example
              </div>
              <div style={{ fontFamily: serifFont, fontSize: 18, color: INK, marginBottom: 8 }}>
                {SAMPLE_GOAL_TITLE} — by {SAMPLE_GOAL_DEADLINE}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {SAMPLE_GOAL_STEPS.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, color: MUTED }}>
                    <span>{s.title}</span>
                    <span style={{ whiteSpace: "nowrap" }}>{s.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowOptions((x) => !x)} className="hoverable" style={toggleBtn}>
              {showOptions ? <ChevronUp size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2.5} />}
              {showOptions ? "Hide options" : "Category or deadline"}
            </button>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={addGoalManually}
              disabled={!canAct}
              style={{
                background: "none", border: "none", padding: "0 2px", fontSize: 13, fontWeight: 600,
                color: MUTED, textDecoration: "underline", textUnderlineOffset: 2,
                opacity: canAct ? 1 : 0.4, cursor: canAct ? "pointer" : "default",
              }}
            >
              Just add it
            </button>
            <button
              onClick={breakItDown}
              disabled={!canAct}
              className="btn-primary"
              style={{ ...primaryBtn, opacity: canAct ? 1 : 0.4, cursor: canAct ? "pointer" : "default" }}
            >
              {planning ? "Breaking it down..." : "Break it down for me"}
            </button>
          </div>

          {showOptions && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: 130, background: "#fff" }}>
                {categoryKeys.map((c) => <option key={c}>{c}</option>)}
              </select>
              <DatePickerButton
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                title="Give it a deadline and every milestone/action gets a date spread automatically around your existing events and tasks, instead of landing undated"
                placeholder="Deadline"
              />
            </div>
          )}
          {planError && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: 8 }}>{planError}</div>}
        </div>
      )}

      {goals.length > 0 && (
        <div data-tour="goals-filter" style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {["All", ...categoryKeys].map((c) => (
            <FilterPill key={c} label={c} active={filter === c} color={CATEGORY_COLORS[c]} onClick={() => setFilter(c)} />
          ))}
        </div>
      )}

      {goals.length > 0 && (
        filtered.length === 0 ? (
          <EmptyState text={`No ${filter} goals yet.`} />
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
        )
      )}
    </div>
  );
}
