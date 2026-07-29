import { useState } from "react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { deleteBtn, inputStyle, ghostBtn } from "../../lib/styles";
import { ProgressBar } from "../shared/Misc";
import UrgencyBadge from "../shared/UrgencyBadge";
import MilestoneBlock from "./MilestoneBlock";

export default function GoalCard({ goal, onRemoveGoal, onAddMilestone, onRemoveMilestone, onAddAction, onSetActionDone, onRemoveAction }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const col = CATEGORY_COLORS[goal.category];
  const allActions = goal.milestones.flatMap((m) => m.actions);
  const doneCount = allActions.filter((a) => a.done).length;
  const total = allActions.length;
  const allDone = total > 0 && doneCount === total;

  const addMilestone = () => {
    if (!milestoneTitle.trim()) return;
    onAddMilestone(goal.id, milestoneTitle.trim());
    setMilestoneTitle("");
  };

  return (
    <div className="hoverable" style={{ border: `1px solid ${col.border}`, borderRadius: 12, overflow: "hidden", transition: "box-shadow .15s ease, transform .15s ease" }}>
      <div style={{ background: col.bg, padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: col.text }}>{goal.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <div style={{ fontSize: 11, color: col.text, opacity: 0.75, fontWeight: 600 }}>{goal.category}</div>
              {goal.deadline && <div style={{ fontSize: 11, color: col.text, opacity: 0.75 }}>· deadline {goal.deadline}</div>}
              {goal.deadline && <UrgencyBadge iso={goal.deadline} done={allDone} />}
            </div>
          </div>
          <button onClick={() => onRemoveGoal(goal.id)} style={{ ...deleteBtn, color: col.text }}>×</button>
        </div>
        {total > 0 && (
          <div style={{ marginTop: 8 }}>
            <ProgressBar done={doneCount} total={total} color={col} track="rgba(255,255,255,0.55)" />
          </div>
        )}
      </div>
      <div style={{ padding: "10px 14px" }}>
        {goal.milestones.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#B4BCC5", marginBottom: 8 }}>No milestones yet. Add the first big step below.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
            {goal.milestones.map((m) => (
              <MilestoneBlock
                key={m.id}
                milestone={m}
                col={col}
                onAddAction={(t, d) => onAddAction(goal.id, m.id, t, d)}
                onSetActionDone={(aid, done) => onSetActionDone(goal.id, m.id, aid, done)}
                onRemoveAction={(aid) => onRemoveAction(goal.id, m.id, aid)}
                onRemoveMilestone={() => onRemoveMilestone(goal.id, m.id)}
              />
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <input placeholder="Add a milestone..." value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 13 }} onKeyDown={(e) => e.key === "Enter" && addMilestone()} />
          <button onClick={addMilestone} style={{ ...ghostBtn, fontSize: 13 }}>Add milestone</button>
        </div>
        <div style={{ fontSize: 11, color: "#B4BCC5", marginTop: 6 }}>Next actions with a due date show up on the Calendar automatically.</div>
      </div>
    </div>
  );
}
