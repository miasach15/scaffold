import { dayBefore } from "./dateHelpers";

// Decides whether finishing one linked session (a "Work on:"/"Study:"/"Finish:" task)
// should also mark its parent Education item done. See App.jsx's setTaskDone, which calls
// this once it already knows every CURRENTLY LINKED session is done.
//
// Homework's daily sessions are all created up front at add-time (see addEduItem) — one
// due tomorrow only ever gets a single session, and a day skipped for crowding means
// fewer sessions exist than the schedule actually implies. Treating "every session that
// happens to exist right now is done" as "the whole assignment is done" finishes it early
// in both cases, which then hides every later day's still-scheduled reminder (Today/
// Dashboard drop a whole item's sessions once its parent is done). So for Homework, only
// let completion through once the session actually completed is the guaranteed last-call
// reminder the night before it's due — anything earlier can't be trusted to be the last
// one really coming. Assignment/Assessment sessions aren't pre-scheduled this way (they're
// added one at a time, by hand or by AI breakdown), so "all currently linked" already means
// "all of them" for those types.
export function shouldAutoCompleteEduItem({ eduItemType, eduItemDueDate, sessionDate, allLinkedSessionsDone }) {
  if (!allLinkedSessionsDone) return false;
  if (eduItemType !== "Homework") return true;
  if (!sessionDate || !eduItemDueDate) return false;
  return sessionDate >= dayBefore(eduItemDueDate);
}
