import { useState } from "react";

// A literal sticky note sitting in the corner of the screen — no button to open it, no
// "Add" to submit. Type directly into it, hit Enter, it captures what you wrote and
// clears for the next thing. Always Personal category (keep it simple); review what's
// been captured on the Tasks page's Quick capture section (or Education's, if it's an
// assignment/test — add those from the Education page directly instead).
export default function StickyNoteCorner({ onCapture }) {
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onCapture(text, "Personal");
    setText("");
  };

  return (
    <div
      style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 80, width: 180, height: 180,
        background: "#FFF7D6", border: "1px solid #EFD98A", borderRadius: 3,
        boxShadow: "0 10px 24px rgba(0,0,0,0.16)", transform: "rotate(-2deg)",
        display: "flex", flexDirection: "column", padding: "14px 14px 12px",
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Jot something down..."
        style={{
          flex: 1, width: "100%", resize: "none", border: "none", outline: "none", background: "transparent",
          fontFamily: "'Inter', sans-serif", fontSize: 13.5, lineHeight: 1.5, color: "#6B5A1F",
        }}
      />
    </div>
  );
}
