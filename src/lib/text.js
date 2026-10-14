// Every Education work-session task is titled "Work on: <assignment>"/"Study: <test>"/
// "Finish: <homework>" (see App.jsx's addEduItem) so a missed day and today's session
// read as the same thing. Reading the prefix on every single row is noise once you
// already know what it means — this splits it out so a caller can render it smaller/
// muted next to the actual subject instead of matching weight with it.
const WORK_PREFIX_RE = /^(Work on|Study|Finish): (.+)$/;

export function splitWorkPrefix(title) {
  const m = WORK_PREFIX_RE.exec(title || "");
  if (!m) return { prefix: null, subject: title };
  return { prefix: `${m[1]}: `, subject: m[2] };
}

// An AI-generated step title (see generate-assignment-plan/generate-task-plan) is
// supposed to never contain a comma — titles from the SAME day get comma-joined into one
// task's notes elsewhere (groupItemsByDate), so a comma INSIDE a single title (e.g. "Revise,
// format, and submit") gets misread as three separate steps once joined, and shows up
// fragmented. The prompt already asks for this, but this is the backstop for whenever a
// comma slips through anyway.
export function sanitizeStepTitle(title) {
  return (title || "").replace(/,/g, "").replace(/\s+/g, " ").trim();
}
