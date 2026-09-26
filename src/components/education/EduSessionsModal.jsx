import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { dateRangeISO, decimalToTimeLabel, formatShortDate, toISO } from "../../lib/dateHelpers";
import { deleteBtn, ghostBtn, inputStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";
import { EmptyState } from "../shared/Misc";
import Checkbox from "../shared/Checkbox";

// Opened by clicking a deadline row on Education — see which sessions are done, rename
// or remove any of them, add another, or hand the whole thing to AI to re-plan. The
// deadline's own due date/time is editable too (click it) — moving the date reflows
// every not-done session onto the new window (see App.jsx's updateEduDeadline). `col` is
// your actual School category color (see EducationView).
export default function EduSessionsModal({ item, col, sessions, onClose, onToggleSession, onRenameSession, onRemoveSession, onAddSession, onUpdateDeadline, onBreakDown, breakingDown, breakdownError }) {
  const todayISOlocal = toISO(new Date());
  const dateOptions = useMemo(() => dateRangeISO(todayISOlocal, item.dueDate), [item.dueDate, todayISOlocal]);
  const [newDate, setNewDate] = useState(dateOptions[0] || todayISOlocal);
  const [showAI, setShowAI] = useState(false);
  const [details, setDetails] = useState("");
  const [editingDeadline, setEditingDeadline] = useState(false);
  // Local text per session so typing doesn't fire a save on every keystroke — committed
  // on blur/Enter instead.
  const [drafts, setDrafts] = useState({});
  useEffect(() => {
    setDrafts(Object.fromEntries(sessions.map((s) => [s.id, s.title])));
  }, [sessions]);

  const commitRename = (id) => {
    const next = (drafts[id] || "").trim();
    if (next && next !== sessions.find((s) => s.id === id)?.title) onRenameSession(id, next);
  };

  const sorted = sessions.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const actionLabel = item.type === "Assessment" ? "session" : "sub-task";

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 420, maxHeight: "82vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 10.5, color: col.text, background: col.bg, display: "inline-block", padding: "2px 7px", borderRadius: 5, fontWeight: 700, marginBottom: 6 }}>{item.type}</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
        {onUpdateDeadline && editingDeadline ? (
          <div
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEditingDeadline(false); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}
          >
            <input
              type="date"
              autoFocus
              value={item.dueDate}
              onChange={(e) => e.target.value && onUpdateDeadline(item.id, e.target.value, item.dueStart)}
              style={{ ...inputStyle, width: 130, fontSize: 12, padding: "3px 6px" }}
            />
          </div>
        ) : (
          <button
            onClick={() => onUpdateDeadline && setEditingDeadline(true)}
            title={onUpdateDeadline ? "Click to change" : undefined}
            style={{ background: "none", border: "none", padding: 0, marginBottom: 16, cursor: onUpdateDeadline ? "pointer" : "default", textAlign: "left", fontSize: 12, color: "#93A0AD" }}
          >
            Due {formatShortDate(item.dueDate)}{item.dueStart != null ? ` · ${decimalToTimeLabel(item.dueStart)}` : ""}{item.subject ? ` · ${item.subject}` : ""}
          </button>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: "#93A0AD", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
          {item.type === "Assessment" ? "Study sessions" : "Sub-tasks"}
        </div>
        {item.type === "Homework" && (
          <div style={{ fontSize: 11.5, color: "#93A0AD", marginTop: -4, marginBottom: 8 }}>Homework only ever gets one reminder, the day before it's due — add more below if you need extra time on this one.</div>
        )}
        {sorted.length === 0 ? (
          <EmptyState text={`No ${actionLabel}s scheduled yet.`} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {sorted.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 4px 4px 10px", borderRadius: 10, border: "1px solid #ECECEC", background: s.done ? "#fff" : "#FDFCFA" }}>
                <Checkbox checked={s.done} onClick={() => onToggleSession(s.id, !s.done)} color={col} />
                <input
                  value={drafts[s.id] ?? s.title}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                  onBlur={() => commitRename(s.id)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  style={{ ...inputStyle, flex: 1, border: "none", background: "transparent", padding: "6px 2px", fontSize: 13.5, textDecoration: s.done ? "line-through" : "none", opacity: s.done ? 0.5 : 1 }}
                />
                <div style={{ fontSize: 11, color: "#93A0AD", whiteSpace: "nowrap" }}>{formatShortDate(s.date)}</div>
                <button onClick={() => onRemoveSession(s.id)} className="btn-delete" style={deleteBtn}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <select value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ ...inputStyle, fontSize: 12, flex: 1, padding: "6px 8px" }}>
            {dateOptions.map((d) => <option key={d} value={d}>{formatShortDate(d)}</option>)}
          </select>
          <button onClick={() => onAddSession(item.id, newDate)} className="btn-ghost" style={{ ...ghostBtn, fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>
            + Add {actionLabel}
          </button>
        </div>

        {item.type !== "Homework" && (
          <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 12, marginBottom: 14 }}>
            {!showAI ? (
              <button
                onClick={() => setShowAI(true)}
                className="hoverable"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px dashed #D1D5DB",
                  borderRadius: 999, padding: "5px 11px 5px 8px", fontSize: 11.5, fontWeight: 700, color: "#7B8794", cursor: "pointer",
                }}
              >
                <Plus size={12} strokeWidth={2.5} /> Break it down with AI
              </button>
            ) : (
              <>
                <div style={{ fontSize: 11.5, color: "#93A0AD", marginBottom: 6 }}>Replaces everything above with an AI-generated plan.</div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Paste or describe what's involved. We'll turn it into ordered steps leading up to the due date."
                  rows={3}
                  style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 8 }}
                />
                <button
                  onClick={() => onBreakDown(details)}
                  disabled={!details.trim() || breakingDown}
                  className="btn-primary"
                  style={{ ...primaryBtn, opacity: details.trim() && !breakingDown ? 1 : 0.5 }}
                >
                  {breakingDown ? "Breaking it down..." : "Replace with AI plan"}
                </button>
                {breakdownError && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: 6 }}>{breakdownError}</div>}
              </>
            )}
          </div>
        )}

        <button onClick={onClose} style={{ ...ghostBtn, width: "100%" }}>Done</button>
      </div>
    </div>
  );
}
