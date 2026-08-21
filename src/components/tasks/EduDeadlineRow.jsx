import { EDU_TYPE_COLORS } from "../../lib/constants";
import { formatShortDate } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";

// A homework/assignment/test deadline, shown alongside plain tasks in the Tasks list so
// "what's due" is all in one place — not the day-by-day "Work on"/"Study" sessions
// (those stay Calendar/Today-only), just the actual deadline itself.
export default function EduDeadlineRow({ item, onToggleDone, onOpen }) {
  const col = EDU_TYPE_COLORS[item.type] || EDU_TYPE_COLORS.Homework;
  const tinted = !item.done;

  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 6, background: "#fff", border: `1.5px solid ${tinted ? col.border : "#EDEDED"}` }}>
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
