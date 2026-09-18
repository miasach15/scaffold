import { ROW_H } from "../../lib/constants";
import { decimalToTimeLabel } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";

export default function CalBlock({ item, color, done, isTask, onOpenFocus, onToggleDone, onEditEvent }) {
  const top = item.start * ROW_H;
  const height = Math.max((item.duration / 60) * ROW_H, 18);
  const accent = color.accent || color.border;
  return (
    <div
      onClick={isTask ? onOpenFocus : () => onEditEvent(item)}
      draggable={isTask}
      onDragStart={isTask ? (e) => e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: item.id })) : undefined}
      style={{
        position: "absolute", top, left: 3, right: 3, height,
        background: "#fff", border: `1.5px solid ${accent}`, borderLeft: `4px solid ${accent}`, borderRadius: 10,
        padding: "6px 10px 6px 9px", overflow: "hidden", cursor: isTask ? "grab" : "pointer", opacity: done ? 0.5 : 1,
      }}
    >
      {isTask && (
        <div style={{ position: "absolute", top: 5, right: 5 }}>
          <Checkbox checked={done} onClick={(e) => { e.stopPropagation(); onToggleDone(); }} color={{ border: accent }} size={12} />
        </div>
      )}
      <div style={{ fontSize: 11.5, fontWeight: 700, color: accent, textDecoration: done ? "line-through" : "none", lineHeight: 1.25, paddingRight: isTask ? 14 : 0 }}>
        {item.title}
      </div>
      {height > 30 && item.start != null && (
        <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>
          {decimalToTimeLabel(item.start)}
          {item.duration != null ? ` · ${Math.round(item.duration)}m${item.category ? ` · ${item.category}` : ""}` : ""}
        </div>
      )}
    </div>
  );
}
