import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { CATEGORY_KEYS } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { overlayStyle, modalStyle, primaryBtn, ghostBtn, inputStyle } from "../../lib/styles";

// Zero-friction capture: no date, just type, pick a category, save — for when you're
// mid-class or otherwise don't have time to file it properly. Never navigates you away
// from what you're doing — it just leaves a reminder waiting for you: Education captures
// show up at the top of the Education page, everything else in the Inbox at the top of
// the Tasks page. A floating button so it's reachable from any page without leaving.
export default function QuickCapture({ onCapture }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Personal");

  const save = () => {
    if (!text.trim()) return;
    onCapture(text, category);
    setText("");
    setCategory("Personal");
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
            <div style={{ fontSize: 12, color: "#B4BCC5", marginBottom: 10 }}>No date needed — just get it down. It'll be waiting for you: Education captures at the top of the Education page, everything else in the Inbox at the top of Tasks.</div>
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
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {CATEGORY_KEYS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                    border: `1.5px solid ${category === c ? CATEGORY_COLORS[c].border : "#E5E9ED"}`,
                    background: category === c ? CATEGORY_COLORS[c].bg : "#fff",
                    color: category === c ? CATEGORY_COLORS[c].text : "#93A0AD",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
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
