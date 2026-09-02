import { useState } from "react";
import { useCategoryColors, useCategoryKeys } from "../../hooks/CategoryColorsContext";
import { deleteBtn, ghostBtn, inputStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";
import { uid } from "../../lib/id";

// Two steps: dump everything on your mind with no structure required, then sort it —
// one row per line, each gets its own category and (optional) due date before anything
// actually becomes a task. Nothing is added until "Add N tasks" is confirmed, same as
// BreakdownPreviewModal's review-before-confirm pattern.
export default function BrainDumpModal({ onClose, onAddTask }) {
  const CATEGORY_COLORS = useCategoryColors();
  const categoryKeys = useCategoryKeys();
  const [dump, setDump] = useState("");
  const [drafts, setDrafts] = useState(null); // null = still on the dump step

  const organize = () => {
    const lines = dump.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setDrafts(lines.map((text) => ({ id: uid(), title: text, category: "Personal", date: "" })));
  };

  const updateDraft = (id, patch) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDraft = (id) => setDrafts((ds) => ds.filter((d) => d.id !== id));

  const addAll = () => {
    drafts.forEach((d) => onAddTask({ title: d.title, date: d.date || null, start: null, duration: null, category: d.category }));
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 460, maxHeight: "82vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 11.5, color: "#93A0AD", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4, flexShrink: 0 }}>Brain dump</div>

        {drafts === null ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Get it all out</div>
            <div style={{ fontSize: 12, color: "#93A0AD", marginBottom: 12 }}>Type or paste everything on your mind, one thing per line. Sort it into real tasks after.</div>
            <textarea
              autoFocus
              value={dump}
              onChange={(e) => setDump(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) organize();
              }}
              placeholder={"Finish lab report\nCall the dentist\nBuy mom a gift\n..."}
              rows={8}
              style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={onClose} className="btn-ghost" style={ghostBtn}>Cancel</button>
              <button
                onClick={organize}
                disabled={!dump.trim()}
                className="btn-primary"
                style={{ ...primaryBtn, flex: 1, opacity: dump.trim() ? 1 : 0.5 }}
              >
                Sort it out
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, flexShrink: 0 }}>Pick a category and due date</div>
            <div style={{ fontSize: 12, color: "#93A0AD", marginBottom: 12, flexShrink: 0 }}>Leave a due date blank to let it sit in Today until you get to it.</div>

            {drafts.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#B4BCC5", marginBottom: 18, padding: "10px 0" }}>Nothing left to add. Cancel, or go back and dump more.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, overflowY: "auto", minHeight: 0 }}>
                {drafts.map((d) => (
                  <div key={d.id} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ECECEC", background: "#FDFCFA" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <input
                        value={d.title}
                        onChange={(e) => updateDraft(d.id, { title: e.target.value })}
                        style={{ ...inputStyle, flex: 1, border: "none", background: "transparent", padding: "2px", fontSize: 13.5, fontWeight: 600 }}
                      />
                      <button onClick={() => removeDraft(d.id)} className="btn-delete" style={deleteBtn}>×</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {categoryKeys.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateDraft(d.id, { category: c })}
                          style={{
                            padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${d.category === c ? CATEGORY_COLORS[c].border : "#E5E9ED"}`,
                            background: d.category === c ? CATEGORY_COLORS[c].bg : "#fff",
                            color: d.category === c ? CATEGORY_COLORS[c].text : "#93A0AD",
                          }}
                        >
                          {c}
                        </button>
                      ))}
                      <input
                        type="date"
                        value={d.date}
                        onChange={(e) => updateDraft(d.id, { date: e.target.value })}
                        title="Optional: leave blank to skip a due date"
                        style={{ ...inputStyle, padding: "3px 6px", fontSize: 11.5, marginLeft: "auto" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => setDrafts(null)} className="btn-ghost" style={ghostBtn}>Back</button>
              <button
                onClick={addAll}
                disabled={drafts.length === 0}
                className="btn-primary"
                style={{ ...primaryBtn, flex: 1, opacity: drafts.length === 0 ? 0.5 : 1 }}
              >
                Add {drafts.length} task{drafts.length === 1 ? "" : "s"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
