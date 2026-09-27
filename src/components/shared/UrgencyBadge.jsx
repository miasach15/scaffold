import { TONE } from "../../lib/constants";
import { urgencyInfo } from "../../lib/dateHelpers";

// Always plain text, never a colored pill — a filled oval reads as its own little alert
// no matter which color it's filled with, which is more visual weight than "due
// tomorrow"/"carried over" need. urgencyInfo still returns its full set of "danger"/
// "warn"/etc tone values unchanged, since other code (see TodaySection's own `urgent`
// check) relies on that exact value to decide bold/priority treatment — only the color
// this badge itself renders with is flattened.
export default function UrgencyBadge({ iso, done, leadDays }) {
  const u = urgencyInfo(iso, done, leadDays);
  if (!u) return null;
  return (
    <div style={{ fontSize: 11, fontWeight: 400, color: TONE.neutral.text, whiteSpace: "nowrap" }}>
      {u.label}
    </div>
  );
}
