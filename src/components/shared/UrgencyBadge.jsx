import { TONE } from "../../lib/constants";
import { urgencyInfo } from "../../lib/dateHelpers";

export default function UrgencyBadge({ iso, done }) {
  const u = urgencyInfo(iso, done);
  if (!u) return null;
  const t = TONE[u.tone];
  const plain = u.tone === "neutral";
  return (
    <div style={{ fontSize: 11, fontWeight: plain ? 400 : 700, color: t.text, background: plain ? "transparent" : t.bg, border: plain ? "none" : `1px solid ${t.border}`, padding: plain ? 0 : "2px 7px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {u.label}
    </div>
  );
}
