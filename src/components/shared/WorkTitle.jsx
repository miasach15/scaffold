import { splitWorkPrefix } from "../../lib/text";

// Renders a task/session title with its "Work on: "/"Study: "/"Finish: " prefix (see
// App.jsx's addEduItem) dimmed down instead of matching the subject's own weight —
// reading the same three words on every single row is noise once you already know
// what they mean. A title without one of these prefixes renders unchanged.
export default function WorkTitle({ title, mutedColor }) {
  const { prefix, subject } = splitWorkPrefix(title);
  return (
    <>
      {prefix && <span style={{ fontWeight: 400, color: mutedColor }}>{prefix}</span>}
      {subject}
    </>
  );
}
