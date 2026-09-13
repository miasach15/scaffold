import { ROW_H } from "../../lib/constants";
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
        background: "#fff", borderLeft: `3px solid ${accent}`, borderRadius: 8,
        boxShadow: "0 1px 2px rgba(26,26,46,0.06)",
        padding: "6px 10px", overflow: "hidden", cursor: isTask ? "grab" : "pointer", opacity: done ? 0.5 : 1,
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
      {height > 30 && item.duration != null && (
        <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>
          {Math.round(item.duration)}m{item.category ? ` · ${item.category}` : ""}
        </div>
      )}
    </div>
  );
}
