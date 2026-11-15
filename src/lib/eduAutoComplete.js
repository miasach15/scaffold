// Decides whether finishing every currently-linked session should also mark the parent
// Education item done. See App.jsx's setTaskDone, which calls this once it already knows
// every CURRENTLY LINKED session is done.
//
// Homework used to get an extra date-based guess here (only trust the night-before-due
// session, since its daily sessions are all pre-scheduled up front and "every session
// that happens to exist right now is done" doesn't necessarily mean the whole assignment
// is) — that guess is gone. A Homework session finishing is asked about directly instead
// (see setTaskDone's "whole thing or just today" follow-up prompt), since only the
// student actually knows which one it was. Assignment/Assessment sessions aren't
// pre-scheduled this way (they're added one at a time, by hand or by AI breakdown), so
// "all currently linked" already means "all of them" for those types.
export function shouldAutoCompleteEduItem({ allLinkedSessionsDone }) {
  return allLinkedSessionsDone;
}
