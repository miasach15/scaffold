import { useState } from "react";
import { StickyNote } from "lucide-react";

// A literal sticky note in the corner — collapsed to a small tab by default so it's not
// sitting in the way, click it to open. Once open, type directly onto it and hit Enter —
// no "Add" button. Always Personal category (kept simple); review what's captured on the
// Tasks page's Quick capture section, or add Education stuff from that page directly.
export default function StickyNoteCorner({ onCapture }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onCapture(text, "Personal");
    setText("");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Sticky note — jot something down"
        style={{
          position: "fixed", bottom: "calc(20px + env(safe-area-inset-bottom))", right: "calc(20px + env(safe-area-inset-right))", zIndex: 80, width: 44, height: 44, borderRadius: "10px 10px 3px 10px",
          background: "#FFF7D6", border: "1px solid #EFD98A", boxShadow: "0 6px 16px rgba(0,0,0,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#8A6F1F",
        }}
      >
        <StickyNote size={18} strokeWidth={2} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", bottom: "calc(20px + env(safe-area-inset-bottom))", right: "calc(20px + env(safe-area-inset-right))", zIndex: 80, width: 190, height: 190,
        background: "#FFF7D6", border: "1px solid #EFD98A", borderRadius: 3,
        boxShadow: "0 10px 24px rgba(0,0,0,0.16)", transform: "rotate(-2deg)",
        display: "flex", flexDirection: "column", padding: "12px 12px 10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
        <button
          onClick={() => setOpen(false)}
          title="Close"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8A6F1F", opacity: 0.6, fontSize: 14, lineHeight: 1, padding: 2 }}
        >
          ×
        </button>
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Jot something down..."
        style={{
          flex: 1, width: "100%", resize: "none", border: "none", outline: "none", background: "transparent",
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, lineHeight: 1.5, color: "#6B5A1F",
        }}
      />
    </div>
  );
}
