import { addDays, toISO } from "./dateHelpers";

// Working on an assignment (a breakdown/project step, or an Education "Work on"
// session) first, then studying (an Education "Study" session), then homework last —
// applied within BOTH the urgent tier and the regular one below (see
// compareTaskPriority), which is what actually produces "assignments due tomorrow, then
// tests due tomorrow, then homework due tomorrow, then upcoming assignments, then
// upcoming tests, then upcoming homework." Reads whatever signal the caller's own item
// shape happens to carry: the resolved Education type directly
// ("Homework"/"Assignment"/"Assessment", for a deadline row that has one but no session
// title of its own), a groupId (a breakdown project step reads the same as "working on
// an assignment" even with no title prefix), or the title itself (the
// "Finish:"/"Work on:"/"Study:" prefixes addEduItem already gives every work session).
// Anything matching none of those — a plain task, a goal milestone — sorts after all
// three.
export function taskKindRank({ eduType, groupId, title } = {}) {
  if (eduType === "Assignment" || groupId) return 0;
  if (eduType === "Assessment") return 1;
  if (eduType === "Homework") return 2;
  const t = title || "";
  if (t.startsWith("Work on: ")) return 0;
  if (t.startsWith("Study: ")) return 1;
  if (t.startsWith("Finish: ")) return 2;
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
// anything else, and — within BOTH the urgent tier and the regular one — assignments
// before tests before homework, then by due date, then by duration (the quicker thing
// first). Kind outranking date within a tier is deliberate: an assignment due in a week
// still sits above homework due in two days, same as an assignment due tomorrow sits
// above a test due tomorrow.
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
