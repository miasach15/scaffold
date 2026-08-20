import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StickyNote } from "lucide-react";
import { ghostBtn } from "../../lib/styles";

// A small sticky-note-style reminders button — shows everything waiting in the Quick
// Capture inbox (both the Tasks Inbox and the Education reminder) in one place, so you
// don't have to go check each page to notice something's pending. Always visible with a
// badge count; click it anywhere to see and act on what's there.
export default function ReminderNotes({ items, onTurnIntoTask, onGoToEducation, onDiscard }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
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

  const count = items.length;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title="Reminders — things you jotted down with Quick Capture"
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
            position: "fixed", top: pos.top, left: pos.left, width: 320, maxWidth: "calc(100vw - 16px)", maxHeight: "70vh", overflowY: "auto",
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, boxShadow: "0 12px 32px rgba(15,23,42,0.14)", padding: 12, zIndex: 1000,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#000000", marginBottom: 8 }}>Reminders</div>
          {count === 0 ? (
            <div style={{ fontSize: 12.5, color: "#B4BCC5", padding: "6px 0" }}>Nothing pending — you're all caught up.</div>
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
