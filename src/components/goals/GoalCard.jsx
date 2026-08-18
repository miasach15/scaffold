import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { deleteBtn, inputStyle, ghostBtn } from "../../lib/styles";
import { ProgressBar } from "../shared/Misc";
import UrgencyBadge from "../shared/UrgencyBadge";
import MilestoneBlock from "./MilestoneBlock";

export default function GoalCard({ goal, onRemoveGoal, onRenameGoal, onAddMilestone, onRemoveMilestone, onRenameMilestone, onAddAction, onSetActionDone, onRemoveAction, onRenameAction }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(goal.title);
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

  const startEditTitle = () => {
    setTitleDraft(goal.title);
    setEditingTitle(true);
  };
  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== goal.title) onRenameGoal(goal.id, titleDraft);
    setEditingTitle(false);
  };
  const cancelTitle = () => setEditingTitle(false);

  return (
    <div className="hoverable" style={{ border: `1px solid ${col.border}`, borderRadius: 12, overflow: "hidden", transition: "box-shadow .15s ease, transform .15s ease" }}>
      <div style={{ background: col.bg, padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingTitle ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") cancelTitle();
                  }}
                  style={{ ...inputStyle, fontSize: 15, fontWeight: 700, padding: "4px 8px", flex: 1, minWidth: 0 }}
                />
                <button onClick={saveTitle} title="Save" style={{ background: "none", border: "none", cursor: "pointer", color: col.text, padding: 4, display: "flex" }}><Check size={16} strokeWidth={2.5} /></button>
                <button onClick={cancelTitle} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: col.text, opacity: 0.7, padding: 4, display: "flex" }}><X size={16} strokeWidth={2.5} /></button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: col.text }}>{goal.title}</div>
                <button onClick={startEditTitle} title="Rename goal" style={{ background: "none", border: "none", cursor: "pointer", color: col.text, opacity: 0.55, padding: 2, display: "flex" }}><Pencil size={12.5} strokeWidth={2.3} /></button>
              </div>
            )}
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
                onRenameMilestone={(title) => onRenameMilestone(goal.id, m.id, title)}
                onRenameAction={(aid, title) => onRenameAction(goal.id, m.id, aid, title)}
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
