import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MUTED } from "../../lib/constants";

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

export default function StepNotes({ notes, title, duration, color, fontSize = 11.5, align }) {
  const [expanded, setExpanded] = useState(false);
  const parts = stepParts(notes, title);
  if (parts.length === 0) return null;
  // Splitting the row's own duration evenly across its steps gives a real estimate for
  // just the next one ("Next: problem 4 · 15m") instead of one lump number for the whole
  // session.
  const perStepMin = parts.length > 1 && duration != null ? Math.max(1, Math.round(duration / parts.length)) : null;
  const baseColor = color || MUTED;
  return (
    <div style={{ marginTop: 1, textAlign: align }}>
      {parts.length > 1 ? (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 2, background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize, color: baseColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
          }}
        >
          {expanded ? <ChevronDown size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} /> : <ChevronRight size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Next: {parts[0]}{perStepMin ? ` · ${perStepMin}m` : ""}</span>
        </button>
      ) : (
        <div style={{ fontSize, color: baseColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Next: {parts[0]}</div>
      )}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3, paddingLeft: align === "center" ? 0 : 15, textAlign: "left" }}>
          {parts.slice(1).map((p, i) => (
            <div key={i} style={{ fontSize: fontSize - 0.5, color: MUTED, textAlign: align }}>{p}{perStepMin ? ` · ${perStepMin}m` : ""}</div>
          ))}
        </div>
      )}
    </div>
  );
}
