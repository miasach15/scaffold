import { useEffect, useState } from "react";
import { ChevronsRight } from "lucide-react";
import { BORDER, SURFACE } from "../../lib/constants";
import { formatShortDate } from "../../lib/dateHelpers";
import { deleteBtn, ghostBtn, inputStyle } from "../../lib/styles";

// A completed Education item with an optional score — click "Add score" (or the
// existing score) to edit earned/possible inline, e.g. 18/20 or 92/100. If the class has
// any categories set up, a dropdown lets you pick which one this item counts toward, and
// a separate field lets it skip categories entirely and carry its own weight instead —
// picking one clears the other, enforced in useEduItems. Neither is required — with
// nothing picked, the item just counts by its own points (see ClassCard's classPercent).
// `col` comes from the class card above (the user's actual School category color), same
// live color Education's own rows already use — not a fixed color that ignores it.
export default function GradeRow({ item, col, categories, onSetScore, onSetCategory, onSetItemWeight, onSetNextTerm, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [earned, setEarned] = useState(item.scoreEarned ?? "");
  const [possible, setPossible] = useState(item.scorePossible ?? "");

  useEffect(() => {
    setEarned(item.scoreEarned ?? "");
    setPossible(item.scorePossible ?? "");
  }, [item.scoreEarned, item.scorePossible]);

  const hasScore = item.scoreEarned != null && item.scorePossible != null && item.scorePossible > 0;
  const pct = hasScore ? Math.round((item.scoreEarned / item.scorePossible) * 1000) / 10 : null;
  const weightedModeOn = categories != null;
  const hasCategories = weightedModeOn && categories.length > 0;

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
    <div className="hoverable" style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12, background: SURFACE }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{item.title}</div>
          <div style={{ display: "flex", gap: 7, marginTop: 3, alignItems: "center" }}>
            <div style={{ fontSize: 11.5, color: col.text, fontWeight: 600 }}>{item.type}</div>
            <div style={{ fontSize: 11.5, color: "#B4BCC5" }}>{formatShortDate(item.dueDate)}</div>
          </div>
        </div>

        {/* Everything after the title wraps together as one group — previously each
            piece (category select, own weight, score, delete) could wrap independently,
            which stranded the delete button alone on its own line once the own-weight
            field made the row too tight to fit on narrower screens. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0 }}>
          {hasCategories && (
            <select
              value={item.gradeCategoryId || ""}
              onChange={(e) => onSetCategory(item.id, e.target.value || null)}
              title="Which category this counts toward"
              aria-label="Grade category"
              style={{ ...inputStyle, fontSize: 13, padding: "7px 9px", width: 118 }}
            >
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {weightedModeOn && (
            <>
              {hasCategories && <span style={{ fontSize: 12, color: "#C2C9D1", flexShrink: 0 }}>or</span>}
              <input
                type="number" min={0} max={100}
                value={item.itemWeight ?? ""}
                onChange={(e) => onSetItemWeight(item.id, e.target.value)}
                placeholder="own wt %"
                title="Give this one assignment its own weight instead of a category"
                aria-label="Own weight percent"
                style={{ ...inputStyle, width: 72, fontSize: 13, padding: "7px 9px" }}
              />
            </>
          )}

          {editing ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="number" placeholder="earned" aria-label="Points earned" value={earned}
                onChange={(e) => setEarned(e.target.value)}
                style={{ ...inputStyle, width: 66, padding: "7px 9px", fontSize: 13.5 }}
              />
              <span style={{ fontSize: 13.5, color: "#93A0AD" }}>/</span>
              <input
                type="number" placeholder="of" aria-label="Points possible" value={possible}
                onChange={(e) => setPossible(e.target.value)}
                style={{ ...inputStyle, width: 66, padding: "7px 9px", fontSize: 13.5 }}
              />
              <button onClick={save} className="btn-primary" style={{ ...ghostBtn, fontSize: 13, padding: "7px 11px", fontWeight: 700 }}>Save</button>
              <button onClick={cancel} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: "#93A0AD", fontSize: 16, padding: "0 3px" }}>×</button>
            </div>
          ) : hasScore ? (
            <button
              onClick={() => setEditing(true)}
              title="Click to edit score"
              style={{ background: col.bg, border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: col.text }}>{pct}%</span>
              <span style={{ fontSize: 11, color: "#93A0AD" }}>{item.scoreEarned}/{item.scorePossible}</span>
            </button>
          ) : (
            <button onClick={() => setEditing(true)} style={{ ...ghostBtn, fontSize: 13, padding: "7px 12px", whiteSpace: "nowrap" }}>+ Add score</button>
          )}

          {onSetNextTerm && (
            <button
              onClick={() => onSetNextTerm(item.id, true)}
              title="Actually for next term — don't count it toward this one"
              aria-label="Move to next term"
              className="btn-nextterm"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#93A0AD", padding: 4, display: "flex" }}
            >
              <ChevronsRight size={15} strokeWidth={2.25} />
            </button>
          )}
          <button onClick={() => onRemove(item.id, "one")} className="btn-delete" style={deleteBtn}>×</button>
        </div>
      </div>
    </div>
  );
}
