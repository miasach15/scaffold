import { TONE } from "../../lib/constants";
import { urgencyInfo } from "../../lib/dateHelpers";

export default function UrgencyBadge({ iso, done, leadDays }) {
  const u = urgencyInfo(iso, done, leadDays);
  if (!u) return null;
  // "danger" (red, then amber) still read as an alert for something that's often still a
  // day or two out — any distinct color here feels overwhelming for what's meant to be a
  // quiet early nudge. Shown fully plain instead, same as "In N days" gets — urgencyInfo
  // itself keeps returning "danger" unchanged, since other code (see TodaySection's own
  // `urgent` check) still relies on that exact value to decide bold/priority treatment,
  // not just this badge's color.
  const displayTone = u.tone === "danger" ? "neutral" : u.tone;
  const t = TONE[displayTone];
  // "soon" (In 1-3 days) gets the same plain treatment as "neutral" ("In N days" beyond
  // that) — a bordered pill next to the plain-text urgent/neutral badges reads as its own,
  // inconsistent level of alarm rather than just a slightly nearer date.
  const plain = displayTone === "neutral" || displayTone === "soon";
  return (
    <div style={{ fontSize: 11, fontWeight: plain ? 400 : 700, color: t.text, background: plain ? "transparent" : t.bg, border: plain ? "none" : `1px solid ${t.border}`, padding: plain ? 0 : "2px 7px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {u.label}
    </div>
  );
}
