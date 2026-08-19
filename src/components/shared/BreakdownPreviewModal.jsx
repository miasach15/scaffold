import { formatShortDate } from "../../lib/dateHelpers";
import { ghostBtn, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";

// Shows the tasks a breakdown is about to create — with the dates they've been
// scheduled on — before anything actually lands in the Tasks list. Used by both the
// Assignment and plain-Task "break it down" flows.
export default function BreakdownPreviewModal({ heading, items, onConfirm, onCancel }) {
  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={{ ...modalStyle, maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 11.5, color: "#93A0AD", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Here's the plan</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{heading}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: "1px solid #ECECEC", background: "#FDFCFA" }}>
              <div style={{ flex: 1, fontSize: 13.5 }}>{it.title}</div>
              <div style={{ fontSize: 11.5, color: "#93A0AD", whiteSpace: "nowrap" }}>{formatShortDate(it.date)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} className="btn-ghost" style={ghostBtn}>Cancel</button>
          <button onClick={onConfirm} className="btn-primary" style={{ ...primaryBtn, flex: 1 }}>
            Add {items.length} task{items.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
