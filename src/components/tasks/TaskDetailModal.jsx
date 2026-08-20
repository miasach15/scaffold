import { useState } from "react";
import { Plus } from "lucide-react";
import { TONE } from "../../lib/constants";
import { decimalToTimeLabel, formatShortDate } from "../../lib/dateHelpers";
import { ghostBtn, inputStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";

// Click any task, anywhere (Tasks page or Calendar), to land here — shows the full,
// untruncated title and lets you rename it, since chips elsewhere often clip it.
export default function TaskDetailModal({ task, onClose, onRename, onToggleDone, onRemove, onOpenFocus, onSetDate, onSetNotes }) {
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [notesDraft, setNotesDraft] = useState(task.notes || "");
  const [editingDate, setEditingDate] = useState(false);

  const save = () => {
    if (titleDraft.trim() && titleDraft.trim() !== task.title) onRename(task.id, titleDraft);
    if (onSetNotes && notesDraft !== (task.notes || "")) onSetNotes(task.id, notesDraft);
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
        <div style={{ marginTop: 10 }}>
          {editingDate ? (
            <input
              type="date"
              autoFocus
              value={task.date || ""}
              onChange={(e) => { onSetDate(task.id, e.target.value); setEditingDate(false); }}
              onBlur={() => setEditingDate(false)}
              style={{ ...inputStyle, width: 150, fontSize: 12.5, padding: "5px 8px" }}
            />
          ) : task.date ? (
            <div onClick={() => onSetDate && setEditingDate(true)} title={onSetDate ? "Click to change date" : undefined} style={{ fontSize: 12.5, color: "#8B95A1", cursor: onSetDate ? "pointer" : "default" }}>
              {formatShortDate(task.date)}{task.start != null ? ` · ${decimalToTimeLabel(task.start)}` : ""}{task.leadDays ? ` · needs ${task.leadDays} day${task.leadDays === 1 ? "" : "s"}` : ""}
            </div>
          ) : onSetDate ? (
            <button
              onClick={() => setEditingDate(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 3, background: "#fff", border: "1.5px dashed #D1D5DB",
                borderRadius: 999, padding: "4px 10px 4px 7px", fontSize: 12, fontWeight: 700, color: "#93A0AD", cursor: "pointer",
              }}
            >
              <Plus size={12} strokeWidth={2.5} />
              Add date
            </button>
          ) : (
            <div style={{ fontSize: 12.5, color: "#8B95A1" }}>No date</div>
          )}
        </div>

        {onSetNotes && (
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 9.5, color: "#93A0AD", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Notes</label>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Anything extra — e.g. other steps that landed on this same day"
              rows={2}
              style={{ ...inputStyle, width: "100%", resize: "vertical", fontSize: 12.5, marginTop: 3 }}
            />
          </div>
        )}

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
