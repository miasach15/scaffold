import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { deleteBtn, ghostBtn, inputStyle } from "../../lib/styles";
import { EmptyState } from "../shared/Misc";
import GradeRow from "./GradeRow";

const round1 = (n) => Math.round(n * 10) / 10;

function pointsPercent(items) {
  const scored = items.filter((i) => i.scoreEarned != null && i.scorePossible > 0);
  if (scored.length === 0) return null;
  const earned = scored.reduce((s, i) => s + i.scoreEarned, 0);
  const possible = scored.reduce((s, i) => s + i.scorePossible, 0);
  return possible > 0 ? round1((earned / possible) * 100) : null;
}

// Standard "current grade" math: only categories that actually have scored work in them
// count, and their weights are renormalized against each other — so a half-graded
// semester (e.g. only Tests entered so far) still shows a sensible number instead of
// being dragged down by empty categories.
function weightedPercent(items, categories) {
  const scored = items.filter((i) => i.scoreEarned != null && i.scorePossible > 0);
  const catStats = categories
    .map((cat) => {
      const inCat = scored.filter((i) => i.gradeCategoryId === cat.id);
      if (inCat.length === 0) return null;
      const earned = inCat.reduce((s, i) => s + i.scoreEarned, 0);
      const possible = inCat.reduce((s, i) => s + i.scorePossible, 0);
      return possible > 0 ? { weight: cat.weight, pct: (earned / possible) * 100 } : null;
    })
    .filter(Boolean);
  const totalWeight = catStats.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0) return null;
  return round1(catStats.reduce((s, c) => s + c.pct * (c.weight / totalWeight), 0));
}

export default function ClassCard({
  subject,
  label,
  cls, // { id, gradingMode, categories } — undefined/default when never configured
  items, // all edu items for this subject
  onSetGradingMode,
  onAddCategory,
  onRenameCategory,
  onSetCategoryWeight,
  onRemoveCategory,
  onRemoveClass,
  onSetScore,
  onSetItemCategory,
  onRemoveItem,
}) {
  const CATEGORY_COLORS = useCategoryColors();
  const col = CATEGORY_COLORS.Education;
  const [expanded, setExpanded] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState("");

  const gradingMode = cls?.gradingMode || "points";
  const categories = cls?.categories || [];
  const gradedItems = items.filter((i) => i.done).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const weighted = gradingMode === "weighted" && categories.length > 0;
  const overallPct = weighted ? weightedPercent(gradedItems, categories) : pointsPercent(gradedItems);
  const weightSum = categories.reduce((s, c) => s + c.weight, 0);

  const addCategory = () => {
    if (!newCatName.trim()) return;
    onAddCategory(subject, newCatName, newCatWeight);
    setNewCatName(""); setNewCatWeight("");
  };

  return (
    <div className="hoverable" style={{ border: `1px solid ${col.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 12, transition: "box-shadow .15s ease, transform .15s ease" }}>
      <div style={{ background: col.bg, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", rowGap: 8 }}>
        <button onClick={() => setExpanded((x) => !x)} title={expanded ? "Collapse" : "Expand"} style={{ background: "none", border: "none", cursor: "pointer", color: col.text, padding: 4, display: "flex" }}>
          {expanded ? <ChevronDown size={16} strokeWidth={2.3} /> : <ChevronRight size={16} strokeWidth={2.3} />}
        </button>
        <div style={{ flex: 1, minWidth: 80, fontWeight: 700, fontSize: 15, color: col.text }}>{label}</div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["points", "weighted"].map((m) => (
            <button
              key={m}
              onClick={() => onSetGradingMode(subject, m)}
              style={{
                padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                border: `1px solid ${gradingMode === m ? col.text : col.border}`,
                background: gradingMode === m ? "#fff" : "transparent",
                color: col.text, opacity: gradingMode === m ? 1 : 0.6,
              }}
            >
              {m === "points" ? "Total points" : "Weighted categories"}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: col.text, minWidth: 52, textAlign: "right" }}>
          {overallPct != null ? `${overallPct}%` : "—"}
        </div>

        {cls && (
          <button
            onClick={() => onRemoveClass(cls.id)}
            title={items.length > 0 ? "Remove this class's grading setup (it'll come back in Total points mode if you still have items in it)" : "Remove this class"}
            style={{ ...deleteBtn, color: col.text, opacity: 0.6 }}
          >
            ×
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ padding: "12px 14px" }}>
          {gradingMode === "weighted" && (
            <div style={{ marginBottom: 14 }}>
              {categories.length === 0 ? (
                <div style={{ fontSize: 12, color: "#B4BCC5", marginBottom: 8 }}>No categories yet — add one below (e.g. Tests, Homework, Participation) and give it a weight.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {categories.map((cat) => {
                    const inCat = gradedItems.filter((i) => i.gradeCategoryId === cat.id && i.scoreEarned != null && i.scorePossible > 0);
                    const catPct = inCat.length > 0 ? pointsPercent(inCat) : null;
                    return (
                      <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          value={cat.name}
                          onChange={(e) => onRenameCategory(cls.id, cat.id, e.target.value)}
                          style={{ ...inputStyle, flex: 1, fontSize: 12.5, padding: "5px 8px" }}
                        />
                        <input
                          type="number" min={0} max={100} value={cat.weight}
                          onChange={(e) => onSetCategoryWeight(cls.id, cat.id, e.target.value)}
                          style={{ ...inputStyle, width: 56, fontSize: 12.5, padding: "5px 8px" }}
                        />
                        <span style={{ fontSize: 11.5, color: "#93A0AD" }}>%</span>
                        <span style={{ fontSize: 11, color: "#93A0AD", width: 90 }}>
                          {catPct != null ? `${catPct}% (${inCat.length})` : "no scores yet"}
                        </span>
                        <button onClick={() => onRemoveCategory(cls.id, cat.id)} style={deleteBtn}>×</button>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 10.5, color: weightSum === 100 ? "#93A0AD" : "#B0873A" }}>
                    Weights add up to {weightSum}%{weightSum !== 100 ? " — that's fine, the grade is calculated from whatever's set up so far" : ""}.
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  placeholder="Category name..." value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  style={{ ...inputStyle, flex: 1, fontSize: 12.5 }}
                />
                <input
                  type="number" min={0} max={100} placeholder="weight %" value={newCatWeight}
                  onChange={(e) => setNewCatWeight(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  style={{ ...inputStyle, width: 90, fontSize: 12.5 }}
                />
                <button onClick={addCategory} style={{ ...ghostBtn, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Plus size={12} strokeWidth={2.5} /> Add category
                </button>
              </div>
            </div>
          )}

          {gradedItems.length === 0 ? (
            <EmptyState text="Nothing completed in this class yet — finished assignments and tests will show up here to score." />
          ) : (
            <div>
              {gradedItems.map((item) => (
                <GradeRow
                  key={item.id}
                  item={item}
                  categories={weighted ? categories : null}
                  onSetScore={onSetScore}
                  onSetCategory={onSetItemCategory}
                  onRemove={onRemoveItem}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
