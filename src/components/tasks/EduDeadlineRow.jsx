import { BORDER } from "../../lib/constants";
import { formatShortDate } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";

// A homework/assignment/assessment deadline, shown alongside plain tasks in the Tasks list so
// "what's due" is all in one place — not the day-by-day "Work on"/"Study" sessions
// (those stay Calendar/Today-only), just the actual deadline itself. `col` is your
// actual School category color (see TasksView), same as everywhere else on Education.
export default function EduDeadlineRow({ item, col, onToggleDone, onOpen }) {
  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: "#fff", border: `1px solid ${BORDER}` }}>
      <Checkbox checked={item.done} onClick={() => onToggleDone(item.id, !item.done)} color={col} />
      <div style={{ fontSize: 10, color: col.text, background: col.bg, padding: "2px 6px", borderRadius: 5, fontWeight: 700, flexShrink: 0 }}>{item.type}</div>
      <button
        onClick={onOpen}
        title="Go to Education"
        style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1, fontSize: 14, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {item.title}{item.subject ? ` (${item.subject})` : ""}
      </button>
      <div title={formatShortDate(item.dueDate)}>
        <UrgencyBadge iso={item.dueDate} done={item.done} leadDays={2} />
      </div>
    </div>
  );
}
