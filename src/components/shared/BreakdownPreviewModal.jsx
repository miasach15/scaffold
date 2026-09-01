import { formatShortDate } from "../../lib/dateHelpers";
import { deleteBtn, ghostBtn, inputStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";

// Shows the tasks a breakdown is about to create — with the dates they've been
// scheduled on — before anything actually lands in the Tasks list. You can rename or
// remove any row here; nothing is added until you confirm. Used by both the Assignment
// and plain-Task "break it down" flows.
export default function BreakdownPreviewModal({ heading, items, onChangeItems, onConfirm, onCancel }) {
  const updateTitle = (i, title) => {
    const next = items.slice();
    next[i] = { ...next[i], title };
    onChangeItems(next);
  };
  const removeItem = (i) => onChangeItems(items.filter((_, idx) => idx !== i));

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={{ ...modalStyle, maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 11.5, color: "#93A0AD", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Here's the plan</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{heading}</div>
        <div style={{ fontSize: 11.5, color: "#B4BCC5", marginBottom: 12 }}>Edit or remove anything before it's added: one task per day.</div>

        {items.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#B4BCC5", marginBottom: 18, padding: "10px 0" }}>Nothing left to add. Cancel, or go back and try again.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ padding: "4px 4px 4px 10px", borderRadius: 10, border: "1px solid #ECECEC", background: "#FDFCFA" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    value={it.title}
                    onChange={(e) => updateTitle(i, e.target.value)}
                    style={{ ...inputStyle, flex: 1, border: "none", background: "transparent", padding: "6px 2px", fontSize: 13.5 }}
                  />
                  <div style={{ fontSize: 11, color: "#93A0AD", whiteSpace: "nowrap" }}>{formatShortDate(it.date)}</div>
                  <button onClick={() => removeItem(i)} className="btn-delete" style={deleteBtn}>×</button>
                </div>
                {it.notes && <div style={{ fontSize: 11, color: "#B4BCC5", padding: "0 2px 6px" }}>Also that day: {it.notes}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} className="btn-ghost" style={ghostBtn}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={items.length === 0}
            className="btn-primary"
            style={{ ...primaryBtn, flex: 1, opacity: items.length === 0 ? 0.5 : 1 }}
          >
            Add {items.length} task{items.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
