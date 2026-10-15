import { useState } from "react";
import { ChevronDown, ChevronRight, Flag, Plus } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { formatShortDate } from "../../lib/dateHelpers";
import { deleteBtn, ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";
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
  cls, // { id, gradingMode, categories, currentTermStartedAt, pastTerms } — undefined/default when never configured
  items, // all edu items for this subject, every term
  educationCategory,
  onAddManualGrade,
  onSetGradingMode,
  onEndTerm,
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
  const [endingTerm, setEndingTerm] = useState(false);
  const [termLabelDraft, setTermLabelDraft] = useState("");
  // A hypothetical "what if I got X on this" — scratch state only, never saved. Lets you
  // actually go try different scores on whatever's still upcoming and see what the class
  // grade would become, rather than this app guessing a number for you.
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfScores, setWhatIfScores] = useState({}); // itemId -> { earned, possible, categoryId }

  const gradingMode = cls?.gradingMode || "points";
  const categories = cls?.categories || [];
  const weighted = gradingMode === "weighted" && categories.length > 0;
  const weightSum = categories.reduce((s, c) => s + c.weight, 0);

  // Only items from the ACTIVE term count toward the current grade — see onEndTerm below.
  // No boundary ever set means every item still counts, same as before terms existed.
  const currentTermItems = cls?.currentTermStartedAt
    ? items.filter((i) => !i.dueDate || i.dueDate >= cls.currentTermStartedAt)
    : items;
  const gradedItems = currentTermItems.filter((i) => i.done).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const pendingItems = currentTermItems.filter((i) => !i.done && i.dueDate);
  const overallPct = weighted ? weightedPercent(gradedItems, categories) : pointsPercent(gradedItems);

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

  const confirmEndTerm = () => {
    if (!cls || overallPct == null) return;
    onEndTerm(cls.id, { label: termLabelDraft.trim() || null, finalPercent: overallPct, startedAt: cls.currentTermStartedAt ?? null });
    setEndingTerm(false);
    setTermLabelDraft("");
  };

  const setWhatIf = (id, field, value) => setWhatIfScores((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  const clearWhatIf = () => setWhatIfScores({});
  // Each pending item only counts toward the hypothetical grade once BOTH its earned and
  // possible fields are actually filled in — same "doesn't count until it's really there"
  // rule the real grade already follows for anything not yet scored.
  const whatIfExtras = pendingItems
    .map((it) => {
      const w = whatIfScores[it.id];
      if (!w || w.earned === "" || w.earned == null || w.possible === "" || w.possible == null) return null;
      return { ...it, scoreEarned: Number(w.earned), scorePossible: Number(w.possible), gradeCategoryId: w.categoryId ?? it.gradeCategoryId };
    })
    .filter(Boolean);
  const hasWhatIfInput = whatIfExtras.length > 0;
  const whatIfItems = [...gradedItems, ...whatIfExtras];
  const whatIfPct = weighted ? weightedPercent(whatIfItems, categories) : pointsPercent(whatIfItems);

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

          {/* "What if" — your own hand on the numbers, never a guess this app makes for
              you. Nothing here is saved; it only exists to answer "what would I need". */}
          {pendingItems.length > 0 && (
            <div style={{ marginTop: 14, borderTop: "1px solid #F0F0F0", paddingTop: 12 }}>
              <button
                onClick={() => setWhatIfOpen((x) => !x)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12.5, fontWeight: 700, color: col.text, display: "flex", alignItems: "center", gap: 4 }}
              >
                {whatIfOpen ? <ChevronDown size={13} strokeWidth={2.3} /> : <ChevronRight size={13} strokeWidth={2.3} />}
                What if?
              </button>
              {whatIfOpen && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: "#93A0AD", marginBottom: 8 }}>
                    Try a score on anything still upcoming and see what the class grade would become — nothing here is saved.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {pendingItems.map((it) => {
                      const w = whatIfScores[it.id] || {};
                      const needsCategory = weighted && !it.gradeCategoryId && w.categoryId == null;
                      return (
                        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <div style={{ flex: "1 1 140px", fontSize: 12.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
                          {weighted && (
                            <select
                              value={w.categoryId ?? it.gradeCategoryId ?? ""}
                              onChange={(e) => setWhatIf(it.id, "categoryId", e.target.value || null)}
                              aria-label={`${it.title} category`}
                              style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: 110, color: needsCategory ? "#B03A3A" : undefined }}
                            >
                              <option value="">No category</option>
                              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          )}
                          <input
                            type="number" placeholder="earned" aria-label={`${it.title} hypothetical score earned`} value={w.earned ?? ""}
                            onChange={(e) => setWhatIf(it.id, "earned", e.target.value)}
                            style={{ ...inputStyle, width: 60, fontSize: 12, padding: "4px 6px" }}
                          />
                          <span style={{ fontSize: 12, color: "#93A0AD" }}>/</span>
                          <input
                            type="number" placeholder="of" aria-label={`${it.title} hypothetical score possible`} value={w.possible ?? ""}
                            onChange={(e) => setWhatIf(it.id, "possible", e.target.value)}
                            style={{ ...inputStyle, width: 60, fontSize: 12, padding: "4px 6px" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "#93A0AD" }}>Would become </span>
                      <span style={{ fontWeight: 700, color: col.text }}>{whatIfPct != null ? `${whatIfPct}%` : "–"}</span>
                    </div>
                    {hasWhatIfInput && (
                      <button onClick={clearWhatIf} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#93A0AD", textDecoration: "underline" }}>Clear</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ending a term locks in the REAL grade right now (not a guess) as a finished
              term you can look back on, then starts a fresh one — see onEndTerm. */}
          {cls && (
            <div style={{ marginTop: 14, borderTop: "1px solid #F0F0F0", paddingTop: 12 }}>
              {endingTerm ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#4A5568" }}>End this term at <strong>{overallPct}%</strong> and start fresh —</span>
                  <input
                    placeholder="label (optional, e.g. Semester 1)" aria-label="Term label" value={termLabelDraft}
                    onChange={(e) => setTermLabelDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmEndTerm()}
                    style={{ ...inputStyle, flex: "1 1 160px", fontSize: 12, padding: "5px 8px" }}
                    autoFocus
                  />
                  <button onClick={confirmEndTerm} className="btn-primary" style={{ ...primaryBtn, fontSize: 11.5, padding: "6px 10px" }}>Confirm</button>
                  <button onClick={() => { setEndingTerm(false); setTermLabelDraft(""); }} style={{ ...ghostBtn, fontSize: 11.5, padding: "6px 10px" }}>Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setEndingTerm(true)}
                  disabled={overallPct == null}
                  title={overallPct == null ? "Nothing scored yet this term" : "Lock in this term's grade and start a new one"}
                  style={{ ...ghostBtn, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5, opacity: overallPct == null ? 0.5 : 1 }}
                >
                  <Flag size={12} strokeWidth={2.3} /> End term
                </button>
              )}
              {cls.pastTerms?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#93A0AD", marginBottom: 6 }}>Past terms</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {cls.pastTerms.map((t) => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "#4A5568" }}>
                        <span>{t.label || `Ended ${formatShortDate(t.endedAt)}`}</span>
                        <span style={{ fontWeight: 700, color: col.text }}>{t.finalPercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
