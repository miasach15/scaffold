import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { decimalToTimeLabel } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import TaskRow from "./TaskRow";

// A "break it down" task collapses to one row here — the Tasks list should show one
// task, not one row per day you're working on it. Click to expand and see (and check
// off) the individual steps, each still showing its own date.
export default function GroupedTaskRow({ groupTitle, groupDueDate, groupDueStart, remainingItems, doneCount, total, onToggleDone, onSetCategory, onRemove, onOpenDetail, onSetDate }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [expanded, setExpanded] = useState(false);
  const category = remainingItems[0]?.category || "Personal";
  const col = CATEGORY_COLORS[category] || CATEGORY_COLORS.Personal;

  return (
    <div style={{ marginBottom: 6 }}>
      <button
        onClick={() => setExpanded((x) => !x)}
        className="hoverable"
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, width: "100%",
          background: "#fff", border: `1.5px solid ${col.border}`, textAlign: "left", cursor: "pointer",
        }}
      >
        {expanded ? <ChevronDown size={15} strokeWidth={2.3} color="#93A0AD" /> : <ChevronRight size={15} strokeWidth={2.3} color="#93A0AD" />}
        <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{groupTitle}</div>
        {groupDueDate && <UrgencyBadge iso={groupDueDate} done={false} />}
        {groupDueDate && (
          <div style={{ fontSize: 12, color: "#93A0AD", whiteSpace: "nowrap" }}>{groupDueDate}{groupDueStart != null ? ` · ${decimalToTimeLabel(groupDueStart)}` : ""}</div>
        )}
        <div style={{ fontSize: 11, color: "#93A0AD", whiteSpace: "nowrap" }}>{doneCount}/{total} steps done</div>
      </button>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, marginLeft: 22 }}>
          {remainingItems.map((t) => (
            <TaskRow key={t.id} t={t} onToggleDone={onToggleDone} onSetCategory={onSetCategory} onRemove={onRemove} onOpenDetail={onOpenDetail} onSetDate={onSetDate} showDate />
          ))}
        </div>
      )}
    </div>
  );
}
