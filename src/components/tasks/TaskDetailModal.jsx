import { useState } from "react";
import { TONE } from "../../lib/constants";
import { decimalToTimeLabel, formatShortDate } from "../../lib/dateHelpers";
import { ghostBtn, inputStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";

// Click any task, anywhere (Tasks page or Calendar), to land here — shows the full,
// untruncated title and lets you rename it, since chips elsewhere often clip it.
export default function TaskDetailModal({ task, onClose, onRename, onToggleDone, onRemove, onOpenFocus }) {
  const [titleDraft, setTitleDraft] = useState(task.title);

  const save = () => {
    if (titleDraft.trim() && titleDraft.trim() !== task.title) onRename(task.id, titleDraft);
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 11.5, color: "#93A0AD", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Task</div>
        <textarea
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
            if (e.key === "Escape") onClose();
          }}
          rows={2}
          style={{ ...inputStyle, width: "100%", resize: "vertical", fontSize: 15, fontWeight: 600 }}
        />
        <div style={{ fontSize: 12.5, color: "#8B95A1", marginTop: 10 }}>
          {task.date ? formatShortDate(task.date) : "No date"}
          {task.start != null ? ` · ${decimalToTimeLabel(task.start)}` : ""}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button onClick={() => { onRemove(task.id); onClose(); }} className="btn-ghost" style={{ ...ghostBtn, color: TONE.danger.text, borderColor: TONE.danger.border }}>Delete</button>
          <button onClick={() => { onToggleDone(task.id, !task.done); onClose(); }} className="btn-ghost" style={ghostBtn}>{task.done ? "Mark not done" : "Mark done"}</button>
          {onOpenFocus && <button onClick={() => { onOpenFocus(task.id, task.title); onClose(); }} className="btn-ghost" style={ghostBtn}>Start focus</button>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={onClose} className="btn-ghost" style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
          <button disabled={!titleDraft.trim()} onClick={save} className="btn-primary" style={{ ...primaryBtn, flex: 1, opacity: titleDraft.trim() ? 1 : 0.5 }}>Save</button>
        </div>
      </div>
    </div>
  );
}
