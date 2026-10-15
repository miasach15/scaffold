import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { reportSaveError } from "../lib/saveErrors";

const categoryFromRow = (row) => ({ id: row.id, name: row.name, weight: Number(row.weight) || 0, orderIndex: row.order_index });
const classFromRow = (row) => ({
  id: row.id,
  subject: row.subject,
  gradingMode: row.grading_mode, // "points" | "weighted"
  // Both optional — see migration_grade_term_weight.sql. Left blank, the end-of-year
  // projection just falls back to the end-of-term one instead of needing these first.
  termWeightPercent: row.term_weight_percent != null ? Number(row.term_weight_percent) : null,
  priorTermsGrade: row.prior_terms_grade != null ? Number(row.prior_terms_grade) : null,
  categories: (row.grade_categories || [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map(categoryFromRow),
});

// Per-class grading setup — how each class (matched to edu_items.subject by name) turns
// its graded items into an overall percent. A class only gets a row here once you touch
// its settings; until then it's implicitly "points" mode with no categories.
export function useGrades(userId) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("grade_classes")
      .select("*, grade_categories(*)")
      .eq("user_id", userId)
      .order("subject");
    setClasses((data || []).map(classFromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Returns the class row for `subject`, creating one (points mode, no categories) the
  // first time it's touched — e.g. flipping a never-configured subject to "Weighted
  // categories" or adding its first category.
  const ensureClass = useCallback(
    async (subject) => {
      const existing = classes.find((c) => c.subject === subject);
      if (existing) return existing;
      const row = { id: uid(), user_id: userId, subject, grading_mode: "points" };
      const created = { id: row.id, subject, gradingMode: "points", categories: [] };
      setClasses((cs) => [...cs, created]);
      const { error } = await supabase.from("grade_classes").insert(row);
      if (error) reportSaveError();
      return created;
    },
    [userId, classes]
  );

  const setGradingMode = useCallback(
    async (subject, mode) => {
      const cls = await ensureClass(subject);
      setClasses((cs) => cs.map((c) => (c.id === cls.id ? { ...c, gradingMode: mode } : c)));
      const { error } = await supabase.from("grade_classes").update({ grading_mode: mode }).eq("id", cls.id);
      if (error) reportSaveError();
    },
    [ensureClass]
  );

  // The two optional inputs behind the end-of-year projection (see GradesView) — stored
  // on the class itself since they describe the class's overall year structure, not any
  // one category. null clears a field back to "not set" (falls back to end-of-term).
  const setYearProjectionInputs = useCallback(
    async (subject, { termWeightPercent, priorTermsGrade }) => {
      const cls = await ensureClass(subject);
      setClasses((cs) => cs.map((c) => (c.id !== cls.id ? c : { ...c, termWeightPercent, priorTermsGrade })));
      const { error } = await supabase.from("grade_classes").update({ term_weight_percent: termWeightPercent, prior_terms_grade: priorTermsGrade }).eq("id", cls.id);
      if (error) reportSaveError();
    },
    [ensureClass]
  );

  const addCategory = useCallback(
    async (subject, name, weight) => {
      if (!name.trim()) return;
      const cls = await ensureClass(subject);
      const row = { id: uid(), user_id: userId, class_id: cls.id, name: name.trim(), weight: Number(weight) || 0, order_index: cls.categories.length };
      setClasses((cs) => cs.map((c) => (c.id !== cls.id ? c : { ...c, categories: [...c.categories, categoryFromRow(row)] })));
      const { error } = await supabase.from("grade_categories").insert(row);
      if (error) reportSaveError();
    },
    [userId, ensureClass]
  );

  const renameCategory = useCallback(async (classId, categoryId, name) => {
    if (!name.trim()) return;
    setClasses((cs) => cs.map((c) => (c.id !== classId ? c : { ...c, categories: c.categories.map((cat) => (cat.id === categoryId ? { ...cat, name: name.trim() } : cat)) })));
    const { error } = await supabase.from("grade_categories").update({ name: name.trim() }).eq("id", categoryId);
    if (error) reportSaveError();
  }, []);

  const setCategoryWeight = useCallback(async (classId, categoryId, weight) => {
    const w = Number(weight) || 0;
    setClasses((cs) => cs.map((c) => (c.id !== classId ? c : { ...c, categories: c.categories.map((cat) => (cat.id === categoryId ? { ...cat, weight: w } : cat)) })));
    const { error } = await supabase.from("grade_categories").update({ weight: w }).eq("id", categoryId);
    if (error) reportSaveError();
  }, []);

  const removeCategory = useCallback(async (classId, categoryId) => {
    setClasses((cs) => cs.map((c) => (c.id !== classId ? c : { ...c, categories: c.categories.filter((cat) => cat.id !== categoryId) })));
    const { error } = await supabase.from("grade_categories").delete().eq("id", categoryId); // edu_items.grade_category_id nulls out server-side
    if (error) reportSaveError();
  }, []);

  // Removes a class's grading setup (mode + categories) — not its graded items, which
  // live on edu_items keyed by subject text, not this row. If the subject still has
  // items in it, the class reappears next load in default points mode; if not, it's
  // just gone, since there was nothing else to derive it from.
  const removeClass = useCallback(async (classId) => {
    setClasses((cs) => cs.filter((c) => c.id !== classId));
    const { error } = await supabase.from("grade_classes").delete().eq("id", classId); // cascades grade_categories, nulls edu_items.grade_category_id
    if (error) reportSaveError();
  }, []);

  return { classes, loading, ensureClass, setGradingMode, setYearProjectionInputs, addCategory, renameCategory, setCategoryWeight, removeCategory, removeClass };
}
