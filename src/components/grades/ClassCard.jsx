import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, TrendingUp } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { deleteBtn, ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { projectTermPercent, projectYearPercent } from "../../lib/gradeProjection";
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
// semester (e.g. only Assessments entered so far) still shows a sensible number instead of
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
  educationCategory,
  onAddManualGrade,
  onSetGradingMode,
  onSetYearProjectionInputs,
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
  const col = CATEGORY_COLORS[educationCategory] || CATEGORY_COLORS.Personal;
  const [expanded, setExpanded] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState("");
  const [addingGrade, setAddingGrade] = useState(false);
  const [gradeTitle, setGradeTitle] = useState("");
  const [gradeEarned, setGradeEarned] = useState("");
  const [gradePossible, setGradePossible] = useState("");
  const [editingYearInputs, setEditingYearInputs] = useState(false);
  const [termWeightDraft, setTermWeightDraft] = useState("");
  const [priorGradeDraft, setPriorGradeDraft] = useState("");

  const gradingMode = cls?.gradingMode || "points";
  const categories = cls?.categories || [];
  const gradedItems = items.filter((i) => i.done).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const weighted = gradingMode === "weighted" && categories.length > 0;
  const overallPct = weighted ? weightedPercent(gradedItems, categories) : pointsPercent(gradedItems);
  const weightSum = categories.reduce((s, c) => s + c.weight, 0);

  // "Current grade" above only counts work that's actually been scored — these instead
  // answer "if I keep up this average, where do I land" once everything still open on the
  // calendar for this class actually happens (see lib/gradeProjection). The year number
  // additionally blends in how earlier terms went, once you've told it how (optional).
  const termProjection = projectTermPercent(gradedItems, categories, gradingMode);
  const yearProjection = projectYearPercent(termProjection, cls?.termWeightPercent ?? null, cls?.priorTermsGrade ?? null);
  const hasYearInputs = cls?.termWeightPercent != null && cls?.priorTermsGrade != null;
  const startEditingYearInputs = () => {
    setTermWeightDraft(cls?.termWeightPercent != null ? String(cls.termWeightPercent) : "");
    setPriorGradeDraft(cls?.priorTermsGrade != null ? String(cls.priorTermsGrade) : "");
    setEditingYearInputs(true);
  };
  const saveYearInputs = () => {
    const tw = termWeightDraft === "" ? null : Math.min(100, Math.max(0, Number(termWeightDraft)));
    const pg = priorGradeDraft === "" ? null : Number(priorGradeDraft);
    onSetYearProjectionInputs(subject, { termWeightPercent: tw, priorTermsGrade: pg });
    setEditingYearInputs(false);
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    onAddCategory(subject, newCatName, newCatWeight);
    setNewCatName(""); setNewCatWeight("");
  };

  // A grade you already have — handed back in class, posted to a portal — shouldn't
  // require pretending it was ever scheduled on the calendar just to log it here.
  const addManualGrade = () => {
    if (!gradeTitle.trim() || !gradePossible) return;
    onAddManualGrade(subject, gradeTitle.trim(), gradeEarned === "" ? null : Number(gradeEarned), Number(gradePossible));
    setGradeTitle(""); setGradeEarned(""); setGradePossible(""); setAddingGrade(false);
  };

  return (
    <div className="hoverable" style={{ border: `1px solid ${col.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 12, transition: "box-shadow .15s ease, transform .15s ease" }}>
      <div style={{ background: "#fff", borderBottom: `1px solid ${col.border}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", rowGap: 8 }}>
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
          {overallPct != null ? `${overallPct}%` : "–"}
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
          {termProjection != null && (
            <div style={{ border: `1px solid ${col.border}`, borderRadius: 12, padding: "9px 12px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: col.text }}>
                  <TrendingUp size={12} strokeWidth={2.3} /> Projected
                </div>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: "#93A0AD" }}>End of term </span>
                  <span style={{ fontWeight: 700, color: col.text }}>{termProjection}%</span>
                </div>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: "#93A0AD" }}>End of year </span>
                  <span style={{ fontWeight: 700, color: col.text }}>{yearProjection}%</span>
                </div>
                {!editingYearInputs && (
                  <button onClick={startEditingYearInputs} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#93A0AD", textDecoration: "underline", marginLeft: "auto" }}>
                    {hasYearInputs ? "Edit year weighting" : "Set up year weighting"}
                  </button>
                )}
              </div>
              {!hasYearInputs && !editingYearInputs && (
                <div style={{ fontSize: 10.5, color: "#B4BCC5", marginTop: 4 }}>
                  End of year assumes this term is the whole picture. Add how much it's worth and how earlier terms went for a real year estimate.
                </div>
              )}
              {editingYearInputs && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <span style={{ fontSize: 11.5, color: "#4A5568" }}>This term is</span>
                  <input
                    type="number" min={0} max={100} value={termWeightDraft} aria-label="This term's weight toward the year, percent"
                    onChange={(e) => setTermWeightDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveYearInputs()}
                    style={{ ...inputStyle, width: 56, fontSize: 12, padding: "4px 6px" }}
                  />
                  <span style={{ fontSize: 11.5, color: "#4A5568" }}>% of the year. Earlier terms averaged</span>
                  <input
                    type="number" min={0} max={100} value={priorGradeDraft} aria-label="Average grade from earlier terms, percent"
                    onChange={(e) => setPriorGradeDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveYearInputs()}
                    style={{ ...inputStyle, width: 56, fontSize: 12, padding: "4px 6px" }}
                  />
                  <span style={{ fontSize: 11.5, color: "#4A5568" }}>%.</span>
                  <button onClick={saveYearInputs} className="btn-primary" style={{ ...primaryBtn, fontSize: 11.5, padding: "5px 10px" }}>Save</button>
                  <button onClick={() => setEditingYearInputs(false)} style={{ ...ghostBtn, fontSize: 11.5, padding: "5px 10px" }}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {gradingMode === "weighted" && (
            <div style={{ marginBottom: 14 }}>
              {categories.length === 0 ? (
                <div style={{ fontSize: 12, color: "#B4BCC5", marginBottom: 8 }}>No categories yet. Add one below (e.g. Assessments, Homework, Participation) and give it a weight.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {categories.map((cat) => {
                    const inCat = gradedItems.filter((i) => i.gradeCategoryId === cat.id && i.scoreEarned != null && i.scorePossible > 0);
                    const catPct = inCat.length > 0 ? pointsPercent(inCat) : null;
                    return (
                      <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          value={cat.name}
                          aria-label="Category name"
                          onChange={(e) => onRenameCategory(cls.id, cat.id, e.target.value)}
                          style={{ ...inputStyle, flex: 1, fontSize: 12.5, padding: "5px 8px" }}
                        />
                        <input
                          type="number" min={0} max={100} value={cat.weight}
                          aria-label={`${cat.name} weight percent`}
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
                    Weights add up to {weightSum}%{weightSum !== 100 ? " (that's fine, the grade is calculated from whatever's set up so far)" : ""}.
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  placeholder="Category name..." aria-label="New category name" value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  style={{ ...inputStyle, flex: 1, fontSize: 12.5 }}
                />
                <input
                  type="number" min={0} max={100} placeholder="weight %" aria-label="New category weight percent" value={newCatWeight}
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
            <EmptyState text="Nothing completed in this class yet. Finished assignments and tests will show up here to score, or add one below if it was never on the calendar to begin with." />
          ) : (
            <div>
              {gradedItems.map((item) => (
                <GradeRow
                  key={item.id}
                  item={item}
                  col={col}
                  categories={weighted ? categories : null}
                  onSetScore={onSetScore}
                  onSetCategory={onSetItemCategory}
                  onRemove={onRemoveItem}
                />
              ))}
            </div>
          )}

          {/* For a grade that was never scheduled on the calendar — handed back in class,
              posted to a portal — rather than requiring it to have gone through Education's
              "add an assignment" flow first. */}
          {addingGrade ? (
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <input
                placeholder="What was it? (e.g. Ch. 4 quiz)" aria-label="Assignment or test name" value={gradeTitle}
                onChange={(e) => setGradeTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManualGrade()}
                style={{ ...inputStyle, flex: "1 1 160px", fontSize: 12.5 }}
                autoFocus
              />
              <input
                type="number" placeholder="Score" aria-label="Points earned" value={gradeEarned}
                onChange={(e) => setGradeEarned(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManualGrade()}
                style={{ ...inputStyle, width: 70, fontSize: 12.5 }}
              />
              <span style={{ alignSelf: "center", fontSize: 12.5, color: "#93A0AD" }}>out of</span>
              <input
                type="number" placeholder="Total" aria-label="Points possible" value={gradePossible}
                onChange={(e) => setGradePossible(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManualGrade()}
                style={{ ...inputStyle, width: 70, fontSize: 12.5 }}
              />
              <button onClick={addManualGrade} className="btn-primary" style={{ ...primaryBtn, fontSize: 12.5, padding: "8px 14px" }}>Add</button>
              <button onClick={() => { setAddingGrade(false); setGradeTitle(""); setGradeEarned(""); setGradePossible(""); }} style={{ ...ghostBtn, fontSize: 12.5 }}>Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingGrade(true)}
              style={{ ...ghostBtn, fontSize: 12.5, marginTop: gradedItems.length > 0 ? 10 : 0, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Plus size={12} strokeWidth={2.5} /> Add a grade
            </button>
          )}
        </div>
      )}
    </div>
  );
}
