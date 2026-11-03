import { useState } from "react";
import { ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { AddRow, EmptyState, SectionHeader } from "../shared/Misc";
import ClassCard, { classPercent } from "./ClassCard";

const NO_SUBJECT_KEY = "";
const NO_SUBJECT_LABEL = "No subject";

export default function GradesView({
  eduItems,
  classes,
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
  onEnsureClass,
}) {
  const [newClassName, setNewClassName] = useState("");
  const [endingTerm, setEndingTerm] = useState(false);
  const [termLabelDraft, setTermLabelDraft] = useState("");

  const itemsBySubject = (key) => eduItems.filter((e) => (e.subject || NO_SUBJECT_KEY) === key);

  // Every class's current percent, the exact same math each ClassCard shows for itself
  // (classPercent, scoped to that class's active-term items) — computed once here so one
  // "End term" button can lock in every class at once instead of making you click through
  // each card. A class with nothing scored this term yet is left out: there's nothing real
  // to lock in, and endTerm requires a finalPercent.
  const classPercents = {};
  classes.forEach((c) => {
    const currentTermItems = c.currentTermStartedAt
      ? itemsBySubject(c.subject).filter((i) => !i.dueDate || i.dueDate >= c.currentTermStartedAt)
      : itemsBySubject(c.subject);
    classPercents[c.id] = classPercent(currentTermItems.filter((i) => i.done), c.categories || []);
  });
  const classesWithGrades = classes.filter((c) => classPercents[c.id] != null);

  const confirmEndAllTerms = () => {
    const label = termLabelDraft.trim() || null;
    classesWithGrades.forEach((c) => {
      onEndTerm(c.id, { label, finalPercent: classPercents[c.id], startedAt: c.currentTermStartedAt ?? null });
    });
    setEndingTerm(false);
    setTermLabelDraft("");
  };

  const subjectKeys = Array.from(new Set([
    ...eduItems.map((e) => e.subject || NO_SUBJECT_KEY),
    ...classes.map((c) => c.subject),
  ]));
  // Only show "No subject" if there's actually something ungraded sitting there.
  const orderedKeys = subjectKeys
    .filter((k) => k !== NO_SUBJECT_KEY || itemsBySubject(k).length > 0)
    .sort((a, b) => {
      if (a === NO_SUBJECT_KEY) return 1;
      if (b === NO_SUBJECT_KEY) return -1;
      return a.localeCompare(b);
    });

  const addClass = () => {
    if (!newClassName.trim()) return;
    onEnsureClass(newClassName.trim());
    setNewClassName("");
  };

  return (
    <div>
      <SectionHeader
        title="Grades"
        subtitle="Every class just counts by points, until you give a category or an assignment its own weight."
        right={
          classesWithGrades.length > 0 && !endingTerm && (
            <button
              onClick={() => setEndingTerm(true)}
              title="Lock in every class's current grade and start a new term, for all of them at once"
              style={{ background: "none", border: "1px solid #D9D3E6", borderRadius: 999, cursor: "pointer", color: "#4A5568", padding: "6px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}
            >
              End term
            </button>
          )
        }
      />

      {endingTerm && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", background: "#F7F5FB", border: "1px solid #E4DFF0", borderRadius: 12, padding: "10px 12px", marginBottom: 16 }}>
          <span style={{ fontSize: 12.5, color: "#4A5568" }}>
            End the term for every class at its current grade and start fresh —
          </span>
          <input
            placeholder="label (optional, e.g. Semester 1)" aria-label="Term label" value={termLabelDraft}
            onChange={(e) => setTermLabelDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmEndAllTerms()}
            style={{ ...inputStyle, flex: "1 1 160px", fontSize: 12.5, padding: "6px 9px" }}
            autoFocus
          />
          <button onClick={confirmEndAllTerms} className="btn-primary" style={{ ...primaryBtn, fontSize: 12, padding: "7px 12px" }}>Confirm</button>
          <button onClick={() => { setEndingTerm(false); setTermLabelDraft(""); }} style={{ ...ghostBtn, fontSize: 12, padding: "7px 12px" }}>Cancel</button>
        </div>
      )}

      <AddRow>
        <input
          placeholder="Add a class (e.g. AP Bio)..." aria-label="New class name" value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addClass()}
          style={{ ...inputStyle, flex: 1, maxWidth: 280 }}
        />
        <button onClick={addClass} className="btn-primary" style={primaryBtn}>Add</button>
      </AddRow>

      {orderedKeys.length === 0 ? (
        <EmptyState text="No classes yet. Add one above, or it'll show up automatically once you enter a subject on a School item." icon="notes-book" />
      ) : (
        orderedKeys.map((key) => (
          <ClassCard
            key={key || "__none__"}
            subject={key}
            label={key || NO_SUBJECT_LABEL}
            cls={classes.find((c) => c.subject === key)}
            items={itemsBySubject(key)}
            educationCategory={educationCategory}
            onAddManualGrade={onAddManualGrade}
            onAddCategory={onAddCategory}
            onRenameCategory={onRenameCategory}
            onSetCategoryWeight={onSetCategoryWeight}
            onRemoveCategory={onRemoveCategory}
            onRemoveClass={onRemoveClass}
            onSetScore={onSetScore}
            onSetItemCategory={onSetItemCategory}
            onSetItemWeight={onSetItemWeight}
            onRemoveItem={onRemoveItem}
          />
        ))
      )}
    </div>
  );
}
