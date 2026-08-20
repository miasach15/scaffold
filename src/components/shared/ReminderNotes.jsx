import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StickyNote } from "lucide-react";
import { CATEGORY_KEYS } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";

// A sticky-note-style reminders widget — click it, type directly into it, pick a
// category, done. No separate capture modal. Personal/Health/People land in the Tasks
// Inbox; Education leaves a reminder on the Education page instead. Also shows and lets
// you act on everything already waiting, so it's both the write and the review surface.
export default function ReminderNotes({ items, onCapture, onTurnIntoTask, onGoToEducation, onDiscard }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Personal");
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: Math.max(8, r.right - 320) });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const save = () => {
    if (!text.trim()) return;
    onCapture(text, category);
    setText("");
    setCategory("Personal");
  };

  const count = items.length;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title="Sticky note — jot something down, or see what's waiting"
        className="btn-ghost"
        style={{ ...ghostBtn, position: "relative", width: 34, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <StickyNote size={15} />
        {count > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4, minWidth: 15, height: 15, borderRadius: 999, background: "#E8608F", color: "#fff",
            fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1,
          }}>
            {count}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, width: 320, maxWidth: "calc(100vw - 16px)", maxHeight: "80vh", overflowY: "auto",
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, boxShadow: "0 12px 32px rgba(15,23,42,0.14)", padding: 12, zIndex: 1000,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#000000", marginBottom: 6 }}>Sticky note</div>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            placeholder="Write it down..."
            rows={2}
            style={{ ...inputStyle, width: "100%", resize: "vertical", fontSize: 13.5 }}
          />
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
            {CATEGORY_KEYS.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  padding: "4px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                  border: `1.5px solid ${category === c ? CATEGORY_COLORS[c].border : "#E5E9ED"}`,
                  background: category === c ? CATEGORY_COLORS[c].bg : "#fff",
                  color: category === c ? CATEGORY_COLORS[c].text : "#93A0AD",
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            disabled={!text.trim()}
            onClick={save}
            className="btn-primary"
            style={{ ...primaryBtn, width: "100%", marginTop: 8, padding: "7px", fontSize: 12.5, opacity: text.trim() ? 1 : 0.5 }}
          >
            Add
          </button>

          <div style={{ height: 1, background: "#F0F0F0", margin: "12px 0 10px" }} />

          {count === 0 ? (
            <div style={{ fontSize: 12.5, color: "#B4BCC5", padding: "2px 0" }}>Nothing pending — you're all caught up.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((it) => (
                <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", borderRadius: 10, border: "1px solid #EDEDED", background: "#FDFCFA" }}>
                  <div style={{ flex: 1, fontSize: 12.5, minWidth: 0, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{it.text}</div>
                  {it.category === "Education" ? (
                    <button onClick={() => { onGoToEducation(); setOpen(false); }} style={{ ...ghostBtn, fontSize: 11, padding: "5px 8px", whiteSpace: "nowrap" }}>Go to Education</button>
                  ) : (
                    <button onClick={() => onTurnIntoTask(it)} style={{ ...ghostBtn, fontSize: 11, padding: "5px 8px", whiteSpace: "nowrap" }}>Turn into task</button>
                  )}
                  <button onClick={() => onDiscard(it.id)} style={{ background: "none", border: "none", fontSize: 15, color: "#C2C9D1", padding: "0 2px", cursor: "pointer" }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
