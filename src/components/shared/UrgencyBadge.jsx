import { TONE } from "../../lib/constants";
import { urgencyInfo } from "../../lib/dateHelpers";

export default function UrgencyBadge({ iso, done, leadDays }) {
  const u = urgencyInfo(iso, done, leadDays);
  if (!u) return null;
  // "danger" (red) reads as an alarm for something that's often still a day or two out —
  // stressful for what's meant to be a helpful nudge, not a warning something's actually
  // gone wrong. Shown with "warn" (amber) instead here, the same calmer tone "Due today"/
  // "Due tomorrow" already use — urgencyInfo itself keeps returning "danger" unchanged,
  // since other code (see TodaySection's own `urgent` check) still relies on that exact
  // value to decide bold/priority treatment, not just this badge's color.
  const t = TONE[u.tone === "danger" ? "warn" : u.tone];
  const plain = u.tone === "neutral";
  return (
    <div style={{ fontSize: 11, fontWeight: plain ? 400 : 700, color: t.text, background: plain ? "transparent" : t.bg, border: plain ? "none" : `1px solid ${t.border}`, padding: plain ? 0 : "2px 7px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {u.label}
    </div>
  );
}
