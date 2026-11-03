import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { reportSaveError } from "../lib/saveErrors";
import { toISO } from "../lib/dateHelpers";

const categoryFromRow = (row) => ({ id: row.id, name: row.name, weight: Number(row.weight) || 0, orderIndex: row.order_index });
const termFromRow = (row) => ({ id: row.id, classId: row.class_id, label: row.label, finalPercent: Number(row.final_percent), startedAt: row.started_at, endedAt: row.ended_at });
const classFromRow = (row) => ({
  id: row.id,
  subject: row.subject,
  // Where the ACTIVE term began — see migration_grade_terms.sql. null means no boundary
  // has ever been set, so every item counts (same as before this existed).
  currentTermStartedAt: row.current_term_started_at || null,
  categories: (row.grade_categories || [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map(categoryFromRow),
  pastTerms: (row.grade_terms || [])
    .slice()
    .sort((a, b) => (b.ended_at || "").localeCompare(a.ended_at || "")) // most recently ended first
    .map(termFromRow),
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
      .select("*, grade_categories(*), grade_terms(*)")
      .eq("user_id", userId)
      .order("subject");
    setClasses((data || []).map(classFromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Returns the class row for `subject`, creating one (no categories yet, everything
  // counts by points) the first time it's touched — e.g. adding its first category.
  //
  // Doesn't add it to `classes` until the insert actually confirms — a category added
  // right after (addCategory below) references this class's id as a foreign key, and
  // showing it as selectable before the row genuinely exists server-side is exactly how
  // a quick "add a category to a class I just created" ends in a save error. `pendingRef`
  // covers the same case one level up: two calls for the same never-before-seen subject
  // in quick succession (e.g. the user clicks "+ Add category" twice) share the one
  // in-flight insert instead of each kicking off its own and racing to create the class
  // twice.
  const pendingRef = useRef({});
  const ensureClass = useCallback(
    async (subject) => {
      const existing = classes.find((c) => c.subject === subject);
      if (existing) return existing;
      if (pendingRef.current[subject]) return pendingRef.current[subject];
      const row = { id: uid(), user_id: userId, subject, grading_mode: "points" };
      const created = { id: row.id, subject, currentTermStartedAt: null, categories: [], pastTerms: [] };
      const promise = (async () => {
        const { error } = await supabase.from("grade_classes").insert(row);
        delete pendingRef.current[subject];
        if (error) { reportSaveError(); return null; }
        setClasses((cs) => [...cs, created]);
        return created;
      })();
      pendingRef.current[subject] = promise;
      return promise;
    },
    [userId, classes]
  );

  // Locks in the class's REAL current grade (not a guess) as a finished term, then moves
  // the active-term boundary to today — every item due before today now belongs to that
  // archived term and stops counting toward the class's current grade; anything due today
  // or later starts the new term fresh. `finalPercent`/`startedAt` are computed by the
  // caller (ClassCard) from the exact same math the current-grade number already uses.
  const endTerm = useCallback(
    async (classId, { label, finalPercent, startedAt }) => {
      const endedAt = toISO(new Date());
      const row = { id: uid(), user_id: userId, class_id: classId, label: label || null, final_percent: finalPercent, started_at: startedAt || null, ended_at: endedAt };
      setClasses((cs) => cs.map((c) => (c.id !== classId ? c : {
        ...c,
        currentTermStartedAt: endedAt,
        pastTerms: [termFromRow(row), ...c.pastTerms],
      })));
      const { error: insertError } = await supabase.from("grade_terms").insert(row);
      const { error: updateError } = await supabase.from("grade_classes").update({ current_term_started_at: endedAt }).eq("id", classId);
      if (insertError || updateError) reportSaveError();
    },
    [userId]
  );

  // Same ordering fix as ensureClass above, and for the same reason: this category
  // becomes selectable on an item's own category dropdown the moment it's in `classes`,
  // so it can't go in until the insert actually confirms — not before, the way it used
  // to, which meant selecting a just-added category fast enough could reference an id
  // that didn't exist in the database yet.
  const addCategory = useCallback(
    async (subject, name, weight) => {
      if (!name.trim()) return;
      const cls = await ensureClass(subject);
      if (!cls) return; // ensureClass already reported the save error
      const row = { id: uid(), user_id: userId, class_id: cls.id, name: name.trim(), weight: Number(weight) || 0, order_index: cls.categories.length };
      const { error } = await supabase.from("grade_categories").insert(row);
      if (error) { reportSaveError(); return; }
      setClasses((cs) => cs.map((c) => (c.id !== cls.id ? c : { ...c, categories: [...c.categories, categoryFromRow(row)] })));
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

  return { classes, loading, ensureClass, endTerm, addCategory, renameCategory, setCategoryWeight, removeCategory, removeClass };
}
