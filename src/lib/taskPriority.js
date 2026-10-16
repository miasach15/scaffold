import { addDays, toISO } from "./dateHelpers";

// Homework first, then working on an assignment (a breakdown/project step, or an
// Education "Work on" session), then studying (an Education "Study" session) — the
// default order for anything not otherwise urgent (see isUrgentSoon below). Reads
// whatever signal the caller's own item shape happens to carry: the resolved Education
// type directly ("Homework"/"Assignment"/"Assessment", for a deadline row that has one
// but no session title of its own), a groupId (a breakdown project step reads the same
// as "working on an assignment" even with no title prefix), or the title itself (the
// "Finish:"/"Work on:"/"Study:" prefixes addEduItem already gives every work session).
// Anything matching none of those — a plain task, a goal milestone — sorts after all
// three.
export function taskKindRank({ eduType, groupId, title } = {}) {
  if (eduType === "Homework") return 0;
  if (eduType === "Assessment") return 2;
  if (eduType === "Assignment" || groupId) return 1;
  const t = title || "";
  if (t.startsWith("Finish: ")) return 0;
  if (t.startsWith("Study: ")) return 2;
  if (t.startsWith("Work on: ")) return 1;
  return 3;
}

// Overdue, due today, or due tomorrow — "a test/assignment is due the next day" — jumps
// ahead of the kind-based order below; nothing about "homework first" should bury
// something that's actually about to be late.
export function isUrgentSoon(dateISO, todayISO) {
  if (!dateISO) return false;
  return dateISO <= toISO(addDays(new Date(todayISO + "T00:00:00"), 1));
}

// The one shared ordering every "what's on my plate" list (Dashboard's Anytime today,
// Tasks' Today glance, Tasks' Upcoming list) sorts by, so a manual drag read on one page
// lands in the same place on the others. Expects each item to carry `date` (or
// `sortDate`, when the day it's scheduled differs from the day it's actually due),
// `duration`, and whatever taskKindRank above needs (`title`/`groupId`/`eduType`) — plus,
// for a manually dragged item, `orderIndex`/`orderSetDate`. A fresh drag from earlier
// today always wins outright; short of that: urgent (due today/tomorrow/overdue) before
// anything else, then homework/assignment-work/studying in that order, then by due date,
// then by duration (the quicker thing first).
export function compareTaskPriority(a, b, todayISO) {
  const aFresh = a.orderIndex != null && a.orderSetDate === todayISO;
  const bFresh = b.orderIndex != null && b.orderSetDate === todayISO;
  if (aFresh && bFresh) return a.orderIndex - b.orderIndex;
  if (aFresh) return -1;
  if (bFresh) return 1;

  const ad = a.sortDate || a.date || null;
  const bd = b.sortDate || b.date || null;
  const aUrgent = isUrgentSoon(ad, todayISO);
  const bUrgent = isUrgentSoon(bd, todayISO);
  if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
  if (aUrgent && bUrgent && ad !== bd) return ad.localeCompare(bd);

  const rankDiff = taskKindRank(a) - taskKindRank(b);
  if (rankDiff !== 0) return rankDiff;

  if (ad !== bd) {
    if (!ad) return 1;
    if (!bd) return -1;
    return ad.localeCompare(bd);
  }
  return (a.duration ?? 30) - (b.duration ?? 30);
}

// How many of this specific assignment's/project's own work sessions have already come
// and gone (scheduled on or before today) without being finished — a rough "how long has
// she been stuck on this one thing" signal, not a count of everything left to do on it.
// Three or more means it's been multiple separate sessions with no real progress, which
// is worth a nudge to switch to something else for a while rather than grinding on the
// same assignment again.
export const STALE_SESSION_THRESHOLD = 3;
export function staleSessionCount(tasks, { eduId, groupId }, todayISO) {
  if (!eduId && !groupId) return 0;
  return (tasks || []).filter(
    (t) => !t.done && t.date && t.date <= todayISO && ((eduId && t.eduId === eduId) || (groupId && t.groupId === groupId))
  ).length;
}
