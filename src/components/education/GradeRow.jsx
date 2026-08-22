import { useEffect, useState } from "react";
import { EDU_TYPE_COLORS } from "../../lib/constants";
import { formatShortDate } from "../../lib/dateHelpers";
import { deleteBtn, ghostBtn, inputStyle } from "../../lib/styles";
import Swatch from "../shared/Swatch";

// A completed Education item with an optional score — click "Add score" (or the
// existing score) to edit earned/possible inline, e.g. 18/20 or 92/100.
export default function GradeRow({ item, onSetScore, onRemove }) {
  const col = EDU_TYPE_COLORS[item.type] || EDU_TYPE_COLORS.Homework;
  const [editing, setEditing] = useState(false);
  const [earned, setEarned] = useState(item.scoreEarned ?? "");
  const [possible, setPossible] = useState(item.scorePossible ?? "");

  useEffect(() => {
    setEarned(item.scoreEarned ?? "");
    setPossible(item.scorePossible ?? "");
  }, [item.scoreEarned, item.scorePossible]);

  const hasScore = item.scoreEarned != null && item.scorePossible != null && item.scorePossible > 0;
  const pct = hasScore ? Math.round((item.scoreEarned / item.scorePossible) * 1000) / 10 : null;

  const save = () => {
    const e = earned === "" ? null : Number(earned);
    const p = possible === "" ? null : Number(possible);
    onSetScore(item.id, e, p);
    setEditing(false);
  };

  const cancel = () => {
    setEarned(item.scoreEarned ?? "");
    setPossible(item.scorePossible ?? "");
    setEditing(false);
  };

  return (
    <div className="hoverable" style={{ border: `1px solid ${col.border}`, borderRadius: 14, padding: "10px 12px", marginBottom: 8, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Swatch color={col} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{item.title}</div>
          <div style={{ display: "flex", gap: 5, marginTop: 2, alignItems: "center" }}>
            <div style={{ fontSize: 10, color: col.text, background: col.bg, display: "inline-block", padding: "1px 6px", borderRadius: 5, fontWeight: 600 }}>{item.type}</div>
            {item.subject && <div style={{ fontSize: 10, color: "#93A0AD" }}>{item.subject}</div>}
            <div style={{ fontSize: 10, color: "#B4BCC5" }}>{formatShortDate(item.dueDate)}</div>
          </div>
        </div>

        {editing ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="number" placeholder="earned" value={earned}
              onChange={(e) => setEarned(e.target.value)}
              style={{ ...inputStyle, width: 60, padding: "5px 7px", fontSize: 12 }}
            />
            <span style={{ fontSize: 12, color: "#93A0AD" }}>/</span>
            <input
              type="number" placeholder="of" value={possible}
              onChange={(e) => setPossible(e.target.value)}
              style={{ ...inputStyle, width: 60, padding: "5px 7px", fontSize: 12 }}
            />
            <button onClick={save} className="btn-primary" style={{ ...ghostBtn, fontSize: 11.5, padding: "5px 9px", fontWeight: 700 }}>Save</button>
            <button onClick={cancel} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: "#93A0AD", fontSize: 14, padding: "0 2px" }}>×</button>
          </div>
        ) : hasScore ? (
          <button
            onClick={() => setEditing(true)}
            title="Click to edit score"
            style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0 }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: col.text }}>{pct}%</span>
            <span style={{ fontSize: 9.5, color: "#93A0AD" }}>{item.scoreEarned}/{item.scorePossible}</span>
          </button>
        ) : (
          <button onClick={() => setEditing(true)} style={{ ...ghostBtn, fontSize: 11.5, padding: "5px 10px", whiteSpace: "nowrap" }}>+ Add score</button>
        )}

        <button onClick={() => onRemove(item.id, "one")} className="btn-delete" style={deleteBtn}>×</button>
      </div>
    </div>
  );
}
