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
