import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { BORDER } from "../../lib/constants";
import { formatShortDate } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";

// A milestone's own due date — a real deadline, unlike an action (which is just a day-to-
// day step and shows in Today instead). A milestone's "done" is derived from whether all
// its actions are done, not independently settable, so the checkbox just opens Goals too.
export default function GoalDeadlineRow({ item, onToggle, onOpen }) {
  const CATEGORY_COLORS = useCategoryColors();
  const col = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal;

  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: "#fff", border: `1px solid ${BORDER}` }}>
      <Checkbox checked={item.done} onClick={onToggle} color={col} />
      <div style={{ fontSize: 10, color: col.text, background: col.bg, padding: "2px 6px", borderRadius: 5, fontWeight: 700, flexShrink: 0 }}>Milestone</div>
      <button
        onClick={onOpen}
        title="Go to Goals"
        style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1, fontSize: 14, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {item.title}
      </button>
      <div title={formatShortDate(item.date)}>
        <UrgencyBadge iso={item.date} done={item.done} leadDays={2} />
      </div>
    </div>
  );
}
