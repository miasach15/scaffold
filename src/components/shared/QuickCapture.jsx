import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { overlayStyle, modalStyle, primaryBtn, ghostBtn, inputStyle } from "../../lib/styles";

// Zero-friction capture: no date, no category, no picking a page — just type and save,
// for when you're mid-class or otherwise don't have time to file it properly. Review
// and turn it into a real task later from the Inbox section on the Tasks page.
export default function QuickCapture({ onCapture }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const save = () => {
    if (!text.trim()) return;
    onCapture(text);
    setText("");
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Quick capture — jot something down now, sort it out later"
        style={{
          position: "fixed", bottom: 22, right: 22, zIndex: 90, width: 50, height: 50, borderRadius: "50%",
          background: "var(--primary, #7B6EF0)", color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(15,23,42,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <NotebookPen size={20} strokeWidth={2.2} />
      </button>

      {open && (
        <div style={overlayStyle} onClick={() => setOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 11.5, color: "#93A0AD", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Quick capture</div>
            <div style={{ fontSize: 12, color: "#B4BCC5", marginBottom: 10 }}>No date, no category — just get it down. Sort it out later from the Inbox on the Tasks page.</div>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Write it down..."
              rows={3}
              style={{ ...inputStyle, width: "100%", resize: "vertical", fontSize: 14.5 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setOpen(false)} className="btn-ghost" style={ghostBtn}>Cancel</button>
              <button disabled={!text.trim()} onClick={save} className="btn-primary" style={{ ...primaryBtn, flex: 1, opacity: text.trim() ? 1 : 0.5 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
