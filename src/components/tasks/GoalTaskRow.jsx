import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import Checkbox from "../shared/Checkbox";
import UrgencyBadge from "../shared/UrgencyBadge";

// Renders a goal milestone's target date or a goal's small action as a row on
// the Tasks page, so they show up alongside real tasks instead of only on
// the Goals page and the Calendar's "Due" row. Milestones aren't directly
// checkable (they're done once every action under them is), so onToggle is
// null for those and the checkbox renders as a static indicator.
export default function GoalTaskRow({ title, date, done, category, onToggle }) {
  const CATEGORY_COLORS = useCategoryColors();
  const col = CATEGORY_COLORS[category] || CATEGORY_COLORS.Personal;
  const tinted = !done;

  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 6, background: "#fff", border: `1.5px solid ${tinted ? col.border : "#EDEDED"}` }}>
      {onToggle ? (
        <Checkbox checked={done} onClick={onToggle} color={col} />
      ) : (
        <div title="Done once every small action under this milestone is done" style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${col.border}`, background: done ? col.border : "transparent", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, fontSize: 14, textDecoration: done ? "line-through" : "none", opacity: done ? 0.5 : 1, color: "#000000" }}>{title}</div>
      <div style={{ fontSize: 10, color: col.text, background: "#fff", border: `1px solid ${col.border}`, padding: "2px 6px", borderRadius: 5, fontWeight: 600, whiteSpace: "nowrap" }}>from Goals</div>
      <UrgencyBadge iso={date} done={done} />
      <div style={{ fontSize: 12, color: "#93A0AD" }}>{date}</div>
    </div>
  );
}
