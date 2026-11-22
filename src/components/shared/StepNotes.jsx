import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MUTED } from "../../lib/constants";
import Checkbox from "./Checkbox";

// A session's notes can be several comma-joined micro-steps (see groupItemsByDate) when
// more than one landed on the same work day — reading all of them at once is exactly the
// "five things to start" overwhelm that makes starting harder, and one that just repeats
// the row's own title adds nothing at all. Only the next concrete thing shows by default;
// the rest are always still there, one click away, never gone — wherever a task's steps
// show up (Dashboard, Education, Tasks, the focus timer), it's this same component.
const stepParts = (notes, title) => {
  if (!notes) return [];
  return notes.split(",").map((s) => s.trim()).filter(Boolean).filter((p) => p.toLowerCase() !== (title || "").toLowerCase());
};

export default function StepNotes({ notes, title, taskId, checkedSteps, onCheckOffStep, color, fontSize = 11.5, align }) {
  const [expanded, setExpanded] = useState(false);

  const parts = stepParts(notes, title);
  // Crossing one off removes it from the list entirely rather than leaving it behind
  // struck through — once it's done, it's not part of "what's left" anymore. checkedSteps
  // is the task's own real, synced column (see App.jsx's requestNoteStepDone) — the same
  // immediate-commit-plus-undo treatment as every other mini-step check-off in the app, so
  // it follows the task to another device or reload instead of staying stuck there.
  const checked = checkedSteps || [];
  const remaining = parts.filter((p) => !checked.includes(p));
  if (remaining.length === 0) return null;
  const baseColor = color || MUTED;

  const toggle = (part) => {
    if (!taskId || !onCheckOffStep) return;
    onCheckOffStep(part);
  };

  return (
    <div style={{ marginTop: 1, textAlign: align }}>
      {remaining.length > 1 ? (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 2, background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize, color: baseColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
          }}
        >
          {expanded ? <ChevronDown size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} /> : <ChevronRight size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Next: {remaining[0]}</span>
        </button>
      ) : (
        <div style={{ fontSize, color: baseColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Next: {remaining[0]}</div>
      )}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, paddingLeft: align === "center" ? 0 : 15, textAlign: "left" }}>
          {remaining.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: align === "center" ? "center" : "flex-start" }}>
              {taskId && (
                <Checkbox checked={false} onClick={(e) => { e.stopPropagation(); toggle(p); }} color={{ border: baseColor }} size={12} />
              )}
              <span style={{ fontSize: fontSize - 0.5, color: MUTED }}>{p}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
