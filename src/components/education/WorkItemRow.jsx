import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { deleteBtn, ghostBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";

// A session's notes can be several AI-generated micro-steps joined into one comma
// list (see groupItemsByDate) when more than one landed on the same work day — reading
// all of them at once is exactly the "five things to start" overwhelm that makes
// starting harder, and one that just repeats the row's own title adds nothing at all.
// Only the next concrete thing shows by default — the rest are a click away instead of
// gone outright.
const stepParts = (subtitle, title) => {
  if (!subtitle) return [];
  return subtitle.split(",").map((s) => s.trim()).filter(Boolean).filter((p) => p.toLowerCase() !== (title || "").toLowerCase());
};

function StepNotes({ subtitle, title }) {
  const [expanded, setExpanded] = useState(false);
  const parts = stepParts(subtitle, title);
  if (parts.length === 0) return null;
  if (parts.length === 1) return <div style={{ fontSize: 10.5, color: "#93A0AD" }}>Next: {parts[0]}</div>;
  return (
    <div>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
        style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, color: "#93A0AD", maxWidth: "100%" }}
      >
        {expanded ? <ChevronDown size={10} strokeWidth={2.5} style={{ flexShrink: 0 }} /> : <ChevronRight size={10} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Next: {parts[0]}</span>
      </button>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3, paddingLeft: 14 }}>
          {parts.slice(1).map((p, i) => <div key={i} style={{ fontSize: 10, color: "#93A0AD" }}>{p}</div>)}
        </div>
      )}
    </div>
  );
}

export default function WorkItemRow({ item }) {
  const col = item.col;
  const tinted = !item.done;
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, marginBottom: 10, background: "#fff", border: `1px solid ${tinted ? col.border : "#EDEDED"}` }}>
      <Checkbox
        checked={item.done}
        onClick={item.onToggleDone}
        color={col}
        title={item.onFocus ? "Marks today's session done — not the whole assignment" : undefined}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.onFocus ? (
          <button onClick={item.onFocus} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, fontSize: 13.5, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1, color: "#000000" }}>{item.title}</button>
        ) : (
          <div style={{ fontSize: 13.5, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>{item.title}</div>
        )}
        {item.onFocus ? (
          <StepNotes subtitle={item.subtitle} title={item.title} />
        ) : (
          item.subtitle && <div style={{ fontSize: 10.5, color: "#93A0AD" }}>{item.subtitle}</div>
        )}
      </div>
      {item.timeLabel && <div style={{ fontSize: 10.5, color: "#93A0AD", whiteSpace: "nowrap" }}>{item.timeLabel}</div>}
      {confirmDelete ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => item.onRemove("one")} style={{ ...ghostBtn, fontSize: 10.5, padding: "4px 8px" }}>This one</button>
          <button onClick={() => item.onRemove("following")} style={{ ...ghostBtn, fontSize: 10.5, padding: "4px 8px" }}>+ following</button>
          <button onClick={() => setConfirmDelete(false)} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: "#93A0AD", fontSize: 14, padding: "0 2px" }}>×</button>
        </div>
      ) : (
        <button onClick={() => (item.hasFollowing ? setConfirmDelete(true) : item.onRemove("one"))} className="btn-delete" style={deleteBtn}>×</button>
      )}
    </div>
  );
}
