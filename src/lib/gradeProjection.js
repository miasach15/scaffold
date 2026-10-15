const round1 = (n) => Math.round(n * 10) / 10;

function pointsPercentFor(items) {
  const scored = items.filter((i) => i.scoreEarned != null && i.scorePossible > 0);
  if (scored.length === 0) return null;
  const earned = scored.reduce((s, i) => s + i.scoreEarned, 0);
  const possible = scored.reduce((s, i) => s + i.scorePossible, 0);
  return possible > 0 ? (earned / possible) * 100 : null;
}

// Projects where this class's grade lands once everything currently on the calendar for
// it is actually done, assuming each not-yet-graded item performs at the same rate as
// whatever's already been scored. In a weighted class, a category with no scores yet
// (e.g. a final exam that hasn't happened) is assumed to land at the OVERALL average
// across every category, rather than being left out — ClassCard's own "current grade"
// renormalizes against only the categories that have scores so far, which reads as your
// grade RIGHT NOW; this is deliberately a different number, meant to answer "if I keep
// up this average, where do I end up" once the empty categories fill in too.
export function projectTermPercent(items, categories, gradingMode) {
  const graded = items.filter((i) => i.scoreEarned != null && i.scorePossible > 0);
  if (graded.length === 0) return null;
  const overallAvg = pointsPercentFor(graded);
  if (gradingMode !== "weighted" || categories.length === 0) {
    // Assuming future items keep the same earned/possible rate as the historical
    // average IS that average, unchanged — "you're on track for X%."
    return overallAvg != null ? round1(overallAvg) : null;
  }
  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0) return overallAvg != null ? round1(overallAvg) : null;
  const blended = categories.reduce((sum, cat) => {
    const inCat = graded.filter((i) => i.gradeCategoryId === cat.id);
    const catPct = inCat.length > 0 ? pointsPercentFor(inCat) : overallAvg;
    return catPct == null ? sum : sum + catPct * (cat.weight / totalWeight);
  }, 0);
  return round1(blended);
}

// Blends this term's own projection with how earlier terms already went, weighted by how
// much of the year this term is worth (see useGrades' setYearProjectionInputs). Falls
// back to the term projection alone whenever either input hasn't been set — "the year" is
// just "whatever's on the calendar" until you say otherwise.
export function projectYearPercent(termPercent, termWeightPercent, priorTermsGrade) {
  if (termPercent == null) return null;
  if (termWeightPercent == null || priorTermsGrade == null) return termPercent;
  const w = Math.min(100, Math.max(0, termWeightPercent)) / 100;
  return round1(priorTermsGrade * (1 - w) + termPercent * w);
}
