import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { reportSaveError } from "../lib/saveErrors";

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  subject: row.subject,
  dueDate: row.due_date,
  dueStart: row.due_start == null ? null : Number(row.due_start),
  done: row.done,
  scoreEarned: row.score_earned == null ? null : Number(row.score_earned),
  scorePossible: row.score_possible == null ? null : Number(row.score_possible),
  gradeCategoryId: row.grade_category_id,
  itemWeight: row.item_weight == null ? null : Number(row.item_weight),
  // "This deadline can move if it needs to" — softens this item's own urgency once it's
  // close/overdue instead of spiking it the same way a fixed deadline does (see
  // inLeadWindow/urgency sort in DashboardView and EducationView).
  flexible: !!row.flexible,
  // Belongs to the NEXT grading term even though it's already showing up before the
  // current one has been ended — see Grades' ClassCard/GradesView and
  // migration_edu_next_term.sql.
  nextTerm: !!row.next_term,
});

export function useEduItems(userId) {
  const [eduItems, setEduItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("edu_items").select("*").eq("user_id", userId).order("due_date");
    setEduItems((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // occurrences: array of due-date ISO strings. Returns the inserted rows (id + due_date)
  // so callers can schedule linked work sessions off the real generated ids — an empty
  // array means the insert actually failed (e.g. a schema mismatch), which matters here
  // specifically: a caller that went on to add work-session tasks referencing one of
  // these ids would hit a foreign-key error and silently lose those too, on top of the
  // item itself vanishing the moment the page next reloads from the database.
  const addEduItems = useCallback(
    async ({ title, type, subject, occurrences, dueStart = null, flexible = false }) => {
      if (!userId || !title.trim() || occurrences.length === 0) return [];
      const rows = occurrences.map((d) => ({
        id: uid(),
        user_id: userId,
        title: title.trim(),
        type,
        subject: subject.trim() || null,
        due_date: d,
        due_start: dueStart,
        done: false,
        flexible,
      }));
      setEduItems((e) => [...e, ...rows.map(fromRow)]);
      const { error } = await supabase.from("edu_items").insert(rows);
      if (error) {
        console.error("Failed to save edu item(s) — reverting:", error);
        reportSaveError();
        setEduItems((e) => e.filter((x) => !rows.some((r) => r.id === x.id)));
        return [];
      }
      return rows.map((r) => ({ id: r.id, dueDate: r.due_date }));
    },
    [userId]
  );

  // Changing the due date/time here doesn't touch any linked work-session tasks by
  // itself — see App.jsx's updateEduDeadline, which calls this and then reflows them.
  const setDeadline = useCallback(async (id, dueDate, dueStart) => {
    let prevItem;
    setEduItems((e) => e.map((x) => {
      if (x.id !== id) return x;
      prevItem = x;
      return { ...x, dueDate, dueStart };
    }));
    const { error } = await supabase.from("edu_items").update({ due_date: dueDate, due_start: dueStart }).eq("id", id);
    if (error) {
      reportSaveError();
      if (prevItem) {
        console.error("Failed to save deadline change — reverting:", error);
        setEduItems((e) => e.map((x) => (x.id === id ? prevItem : x)));
      }
    }
  }, []);

  const setDone = useCallback(async (id, done) => {
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, done } : x)));
    const { error } = await supabase.from("edu_items").update({ done }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  const removeItem = useCallback(async (id) => {
    setEduItems((e) => e.filter((x) => x.id !== id));
    const { error } = await supabase.from("edu_items").delete().eq("id", id); // cascades to linked tasks server-side
    if (error) reportSaveError();
  }, []);

  // Re-inserts the exact rows a delete removed, same ids and all — see useTasks.js's
  // restoreTasks for why: the delete itself now commits right away, so Undo has to be a
  // real write of its own rather than just cancelling a pending one. Caller inserts these
  // before any linked task rows (see App.jsx's undoEduDelete) — tasks.edu_id references
  // edu_items(id), so the parent row has to exist first.
  const restoreItems = useCallback(
    async (items) => {
      if (!userId || items.length === 0) return;
      const rows = items.map((it) => ({
        id: it.id,
        user_id: userId,
        title: it.title,
        type: it.type,
        subject: it.subject,
        due_date: it.dueDate,
        due_start: it.dueStart,
        done: it.done,
        score_earned: it.scoreEarned,
        score_possible: it.scorePossible,
        grade_category_id: it.gradeCategoryId,
        item_weight: it.itemWeight,
        flexible: it.flexible,
      }));
      setEduItems((e) => [...e, ...rows.map(fromRow)]);
      const { error } = await supabase.from("edu_items").insert(rows);
      if (error) {
        reportSaveError();
        setEduItems((e) => e.filter((x) => !rows.some((r) => r.id === x.id)));
      }
    },
    [userId]
  );

  // Either value can be null to clear it — e.g. entering just "18" out of nothing yet,
  // or clearing a mis-entered score back to blank.
  const setScore = useCallback(async (id, scoreEarned, scorePossible) => {
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, scoreEarned, scorePossible } : x)));
    const { error } = await supabase.from("edu_items").update({ score_earned: scoreEarned, score_possible: scorePossible }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  // categoryId null = "no category" (excluded from a weighted class's percent until assigned).
  // Picking a real category clears any standalone item weight — the two are mutually
  // exclusive paths to the same "how much does this count" question.
  const setGradeCategory = useCallback(async (id, categoryId) => {
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, gradeCategoryId: categoryId, itemWeight: categoryId != null ? null : x.itemWeight } : x)));
    const { error } = await supabase.from("edu_items").update({ grade_category_id: categoryId, item_weight: categoryId != null ? null : undefined }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  // A standalone weight for one item, bypassing categories entirely — e.g. "this final
  // is just 20% of the class" without ever setting up a Final category. Setting a real
  // weight clears any category this item was in, same mutual-exclusion rule as above.
  const setItemWeight = useCallback(async (id, weight) => {
    const w = weight === null || weight === "" ? null : Number(weight);
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, itemWeight: w, gradeCategoryId: w != null ? null : x.gradeCategoryId } : x)));
    const { error } = await supabase.from("edu_items").update({ item_weight: w, grade_category_id: w != null ? null : undefined }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  const setFlexible = useCallback(async (id, flexible) => {
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, flexible } : x)));
    const { error } = await supabase.from("edu_items").update({ flexible }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  const setNextTerm = useCallback(async (id, nextTerm) => {
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, nextTerm } : x)));
    const { error } = await supabase.from("edu_items").update({ next_term: nextTerm }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  // Ending a term (see useGrades' endTerm) moves the term boundary itself to today —
  // everything from here on counts fresh regardless of a next_term flag, so the flags
  // that got this class's items here safely are no longer needed once that happens.
  // Left set, they'd just as wrongly exclude the SAME items from the term they were
  // actually flagged for.
  const clearNextTermFlags = useCallback(async (itemIds) => {
    if (itemIds.length === 0) return;
    setEduItems((e) => e.map((x) => (itemIds.includes(x.id) ? { ...x, nextTerm: false } : x)));
    const { error } = await supabase.from("edu_items").update({ next_term: false }).in("id", itemIds);
    if (error) reportSaveError();
  }, []);

  // Picking "No subject" at creation time (or just not knowing yet) shouldn't be
  // permanent — this is the same free-text field addEduItems sets, just editable after
  // the fact. Doesn't touch grade_category_id/item_weight even if the new subject
  // doesn't match the class those were set up under — same as renaming a class's own
  // subject text elsewhere wouldn't retroactively touch any item's grading setup.
  const setSubject = useCallback(async (id, subject) => {
    const trimmed = (subject || "").trim() || null;
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, subject: trimmed } : x)));
    const { error } = await supabase.from("edu_items").update({ subject: trimmed }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  return { eduItems, loading, addEduItems, setDone, removeItem, restoreItems, setScore, setGradeCategory, setItemWeight, setDeadline, setFlexible, setNextTerm, clearNextTermFlags, setSubject };
}
