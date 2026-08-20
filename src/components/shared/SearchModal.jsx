import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { overlayStyle } from "../../lib/styles";

const TYPE_LABEL = { task: "Task", edu: "Education", goal: "Goal", milestone: "Milestone", action: "Goal step", habit: "Habit", journal: "Journal", event: "Calendar" };

// A single client-side search across everything already loaded into the app — tasks,
// Education items, goals/milestones/actions, habits, journal entries, and calendar
// events. Nothing new is fetched; this just filters what's already in memory, so it's
// instant. Picking a result jumps to the page it lives on (and, for tasks, opens the
// detail modal directly since that's a click away either way).
export default function SearchModal({ tasks, eduItems, goals, habits, journalEntries, events, onClose, onGoTo, onOpenTask }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    const out = [];
    (tasks || []).forEach((t) => {
      if (t.title.toLowerCase().includes(query)) out.push({ type: "task", id: t.id, title: t.title, sub: t.date || "No date", onClick: () => { onOpenTask(t.id); onClose(); } });
    });
    (eduItems || []).forEach((e) => {
      if (e.title.toLowerCase().includes(query)) out.push({ type: "edu", id: e.id, title: e.title, sub: [e.subject, e.type].filter(Boolean).join(" · "), onClick: () => { onGoTo("education"); onClose(); } });
    });
    (goals || []).forEach((g) => {
      if (g.title.toLowerCase().includes(query)) out.push({ type: "goal", id: g.id, title: g.title, sub: g.category, onClick: () => { onGoTo("goals"); onClose(); } });
      (g.milestones || []).forEach((m) => {
        if (m.title.toLowerCase().includes(query)) out.push({ type: "milestone", id: m.id, title: m.title, sub: g.title, onClick: () => { onGoTo("goals"); onClose(); } });
        (m.actions || []).forEach((a) => {
          if (a.title.toLowerCase().includes(query)) out.push({ type: "action", id: a.id, title: a.title, sub: `${g.title} · ${m.title}`, onClick: () => { onGoTo("goals"); onClose(); } });
        });
      });
    });
    (habits || []).forEach((h) => {
      if (h.title.toLowerCase().includes(query)) out.push({ type: "habit", id: h.id, title: h.title, sub: "Habit", onClick: () => { onGoTo("habits"); onClose(); } });
    });
    (journalEntries || []).forEach((j) => {
      const haystack = `${j.prompt || ""} ${j.text || ""}`.toLowerCase();
      if (haystack.includes(query)) out.push({ type: "journal", id: j.id, title: (j.text || j.prompt || "Journal entry").slice(0, 70), sub: j.date, onClick: () => { onGoTo("journal"); onClose(); } });
    });
    (events || []).forEach((e) => {
      if (e.title.toLowerCase().includes(query)) out.push({ type: "event", id: e.id, title: e.title, sub: e.date, onClick: () => { onGoTo("calendar"); onClose(); } });
    });
    return out.slice(0, 40);
  }, [q, tasks, eduItems, goals, habits, journalEntries, events, onGoTo, onOpenTask, onClose]);

  return (
    <div style={{ ...overlayStyle, alignItems: "flex-start", paddingTop: "12vh" }} onClick={onClose}>
      <div
        style={{ background: "#fff", borderRadius: 16, width: 540, maxWidth: "100%", maxHeight: "68vh", boxShadow: "0 24px 60px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #EFEFEF", flexShrink: 0 }}>
          <Search size={16} color="#93A0AD" strokeWidth={2.2} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Search tasks, goals, education, habits, journal, calendar..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 15, fontFamily: "inherit", background: "transparent" }}
          />
          <button onClick={onClose} title="Close (Esc)" style={{ background: "none", border: "none", cursor: "pointer", color: "#B4BCC5", display: "flex" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: results.length ? 6 : 0 }}>
          {q.trim().length < 2 ? (
            <div style={{ padding: 28, fontSize: 13, color: "#B4BCC5", textAlign: "center" }}>Type at least 2 characters to search everything.</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 28, fontSize: 13, color: "#B4BCC5", textAlign: "center" }}>Nothing matches "{q}".</div>
          ) : (
            results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={r.onClick}
                className="hoverable"
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "none", background: "none", cursor: "pointer" }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: "#93A0AD", background: "#F1F3F5", padding: "3px 7px", borderRadius: 5, flexShrink: 0, whiteSpace: "nowrap" }}>{TYPE_LABEL[r.type]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                  {r.sub && <div style={{ fontSize: 11.5, color: "#B4BCC5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
