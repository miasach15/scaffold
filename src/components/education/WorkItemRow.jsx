import { useState } from "react";
import { Pencil } from "lucide-react";
import { deleteBtn, ghostBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import WorkTitle from "../shared/WorkTitle";
import StepNotes from "../shared/StepNotes";

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
          <button onClick={item.onFocus} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, fontSize: 13.5, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1, color: "#000000" }}><WorkTitle title={item.title} mutedColor="#93A0AD" /></button>
        ) : (
          <div style={{ fontSize: 13.5, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}><WorkTitle title={item.title} mutedColor="#93A0AD" /></div>
        )}
        {item.onFocus ? (
          <StepNotes notes={item.subtitle} title={item.title} duration={item.duration} color="#93A0AD" fontSize={10.5} />
        ) : (
          item.subtitle && <div style={{ fontSize: 10.5, color: "#93A0AD" }}>{item.subtitle}</div>
        )}
      </div>
      {item.timeLabel ? (
        <div style={{ fontSize: 10.5, color: "#93A0AD", whiteSpace: "nowrap" }}>{item.timeLabel}</div>
      ) : item.duration != null ? (
        // These sessions are all-day (no timeLabel ever), so this slot was otherwise
        // always empty — the one place a single-step session's own duration can actually
        // show, now that sessions carry a real one (see App.jsx's addEduItem).
        <div style={{ fontSize: 10.5, color: "#93A0AD", whiteSpace: "nowrap" }}>{item.duration}m</div>
      ) : null}
      {confirmDelete ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => item.onRemove("one")} style={{ ...ghostBtn, fontSize: 10.5, padding: "4px 8px" }}>This one</button>
          <button onClick={() => item.onRemove("following")} style={{ ...ghostBtn, fontSize: 10.5, padding: "4px 8px" }}>+ following</button>
          <button onClick={() => setConfirmDelete(false)} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: "#93A0AD", fontSize: 14, padding: "0 2px" }}>×</button>
        </div>
      ) : (
        <>
          {item.onEditSteps && (
            <button
              onClick={item.onEditSteps}
              title="Edit this assignment's steps"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#B4BCC5", padding: 4, display: "flex", flexShrink: 0 }}
            >
              <Pencil size={13} strokeWidth={2.2} />
            </button>
          )}
          <button onClick={() => (item.hasFollowing ? setConfirmDelete(true) : item.onRemove("one"))} className="btn-delete" style={deleteBtn}>×</button>
        </>
      )}
    </div>
  );
}
