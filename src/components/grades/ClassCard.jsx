import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
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

// The one grade calculation every class uses — no separate "total points" vs "weighted
// categories" mode to pick between first. By default every item just counts by its own
// raw points (a 100-point test naturally outweighs a 10-point quiz) — give a category or
// an individual item its own weight (see useEduItems' setGradeCategory/setItemWeight)
// and THAT counts for exactly that share instead, with whatever's left over still
// counting by points same as always. A class with nothing weighted at all behaves
// exactly like plain total points; add one weight anywhere and everything else keeps
// working the same way around it, instead of needing to convert the whole class over.
function classPercent(items, categories) {
  const scored = items.filter((i) => i.scoreEarned != null && i.scorePossible > 0);
  if (scored.length === 0) return null;
  const catStats = categories
    .map((cat) => {
      const inCat = scored.filter((i) => i.gradeCategoryId === cat.id && i.itemWeight == null);
      if (inCat.length === 0) return null;
      const earned = inCat.reduce((s, i) => s + i.scoreEarned, 0);
      const possible = inCat.reduce((s, i) => s + i.scorePossible, 0);
      return possible > 0 ? { weight: cat.weight, pct: (earned / possible) * 100 } : null;
    })
    .filter(Boolean);
  const ownWeightStats = scored
    .filter((i) => i.itemWeight != null && i.itemWeight > 0)
    .map((i) => ({ weight: i.itemWeight, pct: (i.scoreEarned / i.scorePossible) * 100 }));
  const explicitWeight = catStats.reduce((s, c) => s + c.weight, 0) + ownWeightStats.reduce((s, c) => s + c.weight, 0);

  // Everything else — no category, no own weight — pools together and counts by its own
  // raw points, automatically filling whatever share of the grade the stats above
  // haven't already claimed (100% of it, if nothing above exists at all — same result
  // as the old, separate "total points" mode).
  const natural = scored.filter((i) => i.itemWeight == null && !categories.some((c) => c.id === i.gradeCategoryId));
  const naturalEarned = natural.reduce((s, i) => s + i.scoreEarned, 0);
  const naturalPossible = natural.reduce((s, i) => s + i.scorePossible, 0);
  const naturalWeight = Math.max(0, 100 - explicitWeight);
  const naturalStat = naturalPossible > 0 && naturalWeight > 0 ? { weight: naturalWeight, pct: (naturalEarned / naturalPossible) * 100 } : null;

  const allStats = [...catStats, ...ownWeightStats, ...(naturalStat ? [naturalStat] : [])];
  const totalWeight = allStats.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0) return null;
  return round1(allStats.reduce((s, c) => s + c.pct * (c.weight / totalWeight), 0));
}

export default function ClassCard({
  subject,
  label,
  cls, // { id, categories, currentTermStartedAt, pastTerms } — undefined/default when never configured
  items, // all edu items for this subject, every term
  educationCategory,
  onAddManualGrade,
  onEndTerm,
  onAddCategory,
  onRenameCategory,
  onSetCategoryWeight,
  onRemoveCategory,
  onRemoveClass,
  onSetScore,
  onSetItemCategory,
  onSetItemWeight,
  onRemoveItem,
}) {
  const CATEGORY_COLORS = useCategoryColors();
  const col = CATEGORY_COLORS[educationCategory] || CATEGORY_COLORS.Personal;
  const [expanded, setExpanded] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState("");
  const [addingGrade, setAddingGrade] = useState(false);
  const [gradeTitle, setGradeTitle] = useState("");
  const [gradeEarned, setGradeEarned] = useState("");
  const [gradePossible, setGradePossible] = useState("");
  const [endingTerm, setEndingTerm] = useState(false);
  const [termLabelDraft, setTermLabelDraft] = useState("");
  // "Try a scenario" bundles the two hypothetical calculators (to-hit-X% below, and
  // per-item what-if scores) behind one toggle instead of each having its own separate
  // always-on/click-to-open treatment — one clearly-labeled, closed-by-default section
  // instead of two different patterns competing for attention by default.
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [whatIfScores, setWhatIfScores] = useState({}); // itemId -> { earned, possible }
  // "To hit X% overall, what do I need to average on what's left" — the reverse of the
  // What-if calculator below (that one takes scores and shows a result; this takes a
  // target result and works backward to a score). Also scratch-only, never saved.
  const [targetPct, setTargetPct] = useState("");

  const categories = cls?.categories || [];
  const weightSum = categories.reduce((s, c) => s + c.weight, 0);

  // Only items from the ACTIVE term count toward the current grade — see onEndTerm below.
  // No boundary ever set means every item still counts, same as before terms existed.
  const currentTermItems = cls?.currentTermStartedAt
    ? items.filter((i) => !i.dueDate || i.dueDate >= cls.currentTermStartedAt)
    : items;
  const gradedItems = currentTermItems.filter((i) => i.done).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const pendingItems = currentTermItems.filter((i) => !i.done && i.dueDate);
  const overallPct = classPercent(gradedItems, categories);
  // Individually-weighted items (see itemWeight) count toward this same "does it add up
  // to 100%" sanity check, same as a named category does — whether they're graded yet or
  // not, same as categories aren't filtered down to only ones with scores either.
  const itemWeightSum = currentTermItems.reduce((s, i) => s + (i.itemWeight || 0), 0);
  const totalWeightSum = weightSum + itemWeightSum;

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
      return { ...it, scoreEarned: Number(w.earned), scorePossible: Number(w.possible) };
    })
    .filter(Boolean);
  const hasWhatIfInput = whatIfExtras.length > 0;
  const whatIfItems = [...gradedItems, ...whatIfExtras];
  const whatIfPct = classPercent(whatIfItems, categories);
  const categoryName = (id) => categories.find((c) => c.id === id)?.name;

  // Binary search for the single uniform percentage — applied evenly across every
  // pending item — that would land the real grade math at the typed target. Reuses
  // classPercent exactly as-is rather than deriving a separate formula, so it can never
  // drift from what the actual grade display means.
  const requiredAvgPct = useMemo(() => {
    const target = Number(targetPct);
    if (!targetPct || Number.isNaN(target) || pendingItems.length === 0) return null;
    let lo = 0, hi = 100;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const trial = [...gradedItems, ...pendingItems.map((it) => ({ ...it, scoreEarned: mid, scorePossible: 100 }))];
      const pct = classPercent(trial, categories) ?? 0;
      if (pct < target) lo = mid; else hi = mid;
    }
    return round1(hi);
  }, [targetPct, pendingItems, gradedItems, categories]);
  // Even a perfect score on everything left wouldn't reach it — worth saying outright
  // rather than showing "100%" looking like a normal, achievable answer.
  const targetUnreachable = requiredAvgPct != null && requiredAvgPct >= 99.95;

  return (
    <div className="hoverable" style={{ border: `1px solid ${col.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 12, transition: "box-shadow .15s ease, transform .15s ease" }}>
      <div style={{ background: "#fff", borderBottom: `1px solid ${col.border}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", rowGap: 8 }}>
        <button onClick={() => setExpanded((x) => !x)} title={expanded ? "Collapse" : "Expand"} style={{ background: "none", border: "none", cursor: "pointer", color: col.text, padding: 4, display: "flex" }}>
          {expanded ? <ChevronDown size={16} strokeWidth={2.3} /> : <ChevronRight size={16} strokeWidth={2.3} />}
        </button>
        <div style={{ flex: 1, minWidth: 80, fontWeight: 700, fontSize: 15, color: col.text }}>{label}</div>

        <div style={{ fontSize: 15, fontWeight: 700, color: col.text, minWidth: 52, textAlign: "right" }}>
          {overallPct != null ? `${overallPct}%` : "–"}
        </div>

        {cls && (
          <button
            onClick={() => setEndingTerm(true)}
            disabled={overallPct == null}
            title={overallPct == null ? "Nothing scored yet this term" : "Lock in this term's grade and start a new one"}
            style={{ background: "none", border: `1px solid ${col.border}`, borderRadius: 999, cursor: overallPct == null ? "default" : "pointer", color: col.text, opacity: overallPct == null ? 0.35 : 0.8, padding: "4px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}
          >
            End term
          </button>
        )}

        {cls && (
          <button
            onClick={() => onRemoveClass(cls.id)}
            title={items.length > 0 ? "Remove this class's categories and weights (it'll come back, with everything just counting by points, if you still have items in it)" : "Remove this class"}
            style={{ ...deleteBtn, color: col.text, opacity: 0.6 }}
          >
            ×
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ padding: "12px 14px" }}>
          <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#93A0AD", marginBottom: 8 }}>Categories</div>
              {categories.length === 0 ? (
                <div style={{ fontSize: 12, color: "#B4BCC5", marginBottom: 8 }}>Nothing set up — every assignment just counts by its own points for now. Add a category below (e.g. Assessments, Homework) to make a whole group count for more or less than its raw points, or give one assignment its own weight directly, further down.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {categories.map((cat) => {
                    const inCat = gradedItems.filter((i) => i.gradeCategoryId === cat.id && i.scoreEarned != null && i.scorePossible > 0);
                    const catPct = inCat.length > 0 ? pointsPercent(inCat) : null;
                    return (
                      <div key={cat.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                        {catPct != null && (
                          <div style={{ height: 4, borderRadius: 2, background: "#EDEDED", marginTop: 5, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, catPct)}%`, height: "100%", background: col.accent || col.text, borderRadius: 2 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 10.5, color: "#93A0AD" }}>
                    Categories add up to {weightSum}%{itemWeightSum > 0 ? `, plus ${itemWeightSum}% in individually-weighted assignments` : ""}.{" "}
                    {totalWeightSum < 100
                      ? `Everything else counts by points for the remaining ${round1(100 - totalWeightSum)}%.`
                      : "Nothing's left over for anything else to count by points."}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input
                  placeholder="Category name..." aria-label="New category name" value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  style={{ ...inputStyle, flex: "1 1 140px", fontSize: 12.5, minWidth: 0 }}
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

          <div style={{ fontSize: 11, fontWeight: 700, color: "#93A0AD", marginBottom: 8 }}>Grades</div>
          {gradedItems.length === 0 ? (
            <EmptyState text="Nothing completed in this class yet. Finished assignments and tests will show up here to score, or add one below if it was never on the calendar to begin with." />
          ) : (
            <div>
              {gradedItems.map((item) => (
                <GradeRow
                  key={item.id}
                  item={item}
                  col={col}
                  categories={categories}
                  onSetScore={onSetScore}
                  onSetCategory={onSetItemCategory}
                  onSetItemWeight={onSetItemWeight}
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

          {/* Categorizing upcoming work is real and saved, same as it is for completed items
              above — kept separate from What-if below, which is scratch-only. */}
          {pendingItems.length > 0 && (
            <div style={{ marginTop: 14, borderTop: "1px solid #F0F0F0", paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#93A0AD", marginBottom: 8 }}>Upcoming — optionally pick a category, or give it its own weight</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pendingItems.map((it) => {
                  return (
                    <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
                      {categories.length > 0 && (
                        <select
                          value={it.gradeCategoryId || ""}
                          onChange={(e) => onSetItemCategory(it.id, e.target.value || null)}
                          title="Which category this will count toward"
                          aria-label={`${it.title} category`}
                          style={{ ...inputStyle, fontSize: 11.5, padding: "5px 7px", width: 108 }}
                        >
                          <option value="">No category</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                      {categories.length > 0 && <span style={{ fontSize: 10.5, color: "#C2C9D1", flexShrink: 0 }}>or</span>}
                      <input
                        type="number" min={0} max={100}
                        value={it.itemWeight ?? ""}
                        onChange={(e) => onSetItemWeight(it.id, e.target.value)}
                        placeholder="own wt %"
                        title="Give this one assignment its own weight instead of a category"
                        aria-label={`${it.title} own weight percent`}
                        style={{ ...inputStyle, width: 64, fontSize: 11.5, padding: "5px 7px" }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Both hypothetical calculators — "what would I need to average" and "what if I
              got X on this" — live behind one toggle now instead of one always showing
              and the other needing its own separate click. Nothing in here is saved;
              it only exists to answer "what would it take". */}
          {pendingItems.length > 0 && (
            <div style={{ marginTop: 14, borderTop: "1px solid #F0F0F0", paddingTop: 12 }}>
              <button
                onClick={() => setScenarioOpen((x) => !x)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12.5, fontWeight: 700, color: col.text, display: "flex", alignItems: "center", gap: 4 }}
              >
                {scenarioOpen ? <ChevronDown size={13} strokeWidth={2.3} /> : <ChevronRight size={13} strokeWidth={2.3} />}
                Try a scenario
              </button>
              {scenarioOpen && (
                <div style={{ marginTop: 8 }}>
                  {overallPct != null && (
                    <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: col.text, textTransform: "uppercase", letterSpacing: 0.3, flexShrink: 0 }}>To hit</div>
                      <input
                        type="number" min={0} max={100} value={targetPct} placeholder={`${overallPct}`}
                        onChange={(e) => setTargetPct(e.target.value)}
                        aria-label="Target grade percent"
                        style={{ ...inputStyle, width: 56, fontSize: 13, padding: "5px 7px", textAlign: "center" }}
                      />
                      <div style={{ fontSize: 11, fontWeight: 700, color: col.text, textTransform: "uppercase", letterSpacing: 0.3, flexShrink: 0 }}>% overall —</div>
                      <div style={{ fontSize: 12.5, color: col.text, flex: 1, minWidth: 140 }}>
                        {requiredAvgPct == null
                          ? "type a target"
                          : targetUnreachable
                          ? "not reachable, even with a perfect score on everything left"
                          : <>average <strong>{requiredAvgPct}%</strong> on what's left</>}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#93A0AD", marginBottom: 8 }}>
                    Or try a real score on anything still upcoming and see what the class grade would become.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {pendingItems.map((it) => {
                      const w = whatIfScores[it.id] || {};
                      return (
                        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <div style={{ flex: "1 1 140px", fontSize: 12.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
                          <div style={{ fontSize: 11, width: 110, color: "#93A0AD" }}>
                            {it.itemWeight != null ? `own weight: ${it.itemWeight}%` : (categoryName(it.gradeCategoryId) || "by points")}
                          </div>
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
              term you can look back on, then starts a fresh one — see onEndTerm. The
              trigger itself is the "End term" button in the header, top right; this is
              just the confirm step once that's clicked, plus the archive of past terms. */}
          {cls && (endingTerm || cls.pastTerms?.length > 0) && (
            <div style={{ marginTop: 14, borderTop: "1px solid #F0F0F0", paddingTop: 12 }}>
              {endingTerm && (
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
              )}
              {cls.pastTerms?.length > 0 && (
                <div style={{ marginTop: endingTerm ? 10 : 0 }}>
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
