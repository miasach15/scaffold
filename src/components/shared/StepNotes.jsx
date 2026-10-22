import { useEffect, useState } from "react";
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

// Crossing off one mini-step doesn't mark the real task done (that's still the row's own
// checkbox, and still means "the whole packed day's work") — this is just a personal
// tally so a long packed-day list doesn't make you re-read what you already did. Kept in
// localStorage, keyed by task id + the step's own text, rather than rewriting the shared
// `notes` string itself — that string is also what groupItemsByDate builds, what the
// overdue-absorb merge dedupes against, and what Education's own notes editor treats as
// plain freeform text, so marking it up in place risked breaking all three. The tradeoff:
// this is per-device, not synced — crossed-off steps won't follow to another browser.
const STORAGE_KEY = "scaffold-checked-ministeps";

function loadChecked(taskId) {
  if (!taskId) return new Set();
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return new Set(all[taskId] || []);
  } catch {
    return new Set();
  }
}
function saveChecked(taskId, set) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (set.size === 0) delete all[taskId];
    else all[taskId] = Array.from(set);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // private browsing or storage disabled — crossing out just won't persist this time
  }
}

export default function StepNotes({ notes, title, taskId, color, fontSize = 11.5, align }) {
  const [expanded, setExpanded] = useState(false);
  const [checked, setChecked] = useState(() => loadChecked(taskId));
  useEffect(() => setChecked(loadChecked(taskId)), [taskId]);

  const parts = stepParts(notes, title);
  // Crossing one off removes it from the list entirely rather than leaving it behind
  // struck through — once it's done, it's not part of "what's left" anymore.
  const remaining = parts.filter((p) => !checked.has(p));
  if (remaining.length === 0) return null;
  const baseColor = color || MUTED;

  const toggle = (part) => {
    if (!taskId) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      saveChecked(taskId, next);
      return next;
    });
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
