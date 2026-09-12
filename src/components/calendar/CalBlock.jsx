import { ROW_H } from "../../lib/constants";
import { decimalToTimeLabel } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";

export default function CalBlock({ item, color, done, isTask, onOpenFocus, onToggleDone, onEditEvent }) {
  const top = item.start * ROW_H;
  const height = Math.max((item.duration / 60) * ROW_H, 18);
  return (
    <div
      onClick={isTask ? onOpenFocus : () => onEditEvent(item)}
      draggable={isTask}
      onDragStart={isTask ? (e) => e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: item.id })) : undefined}
      style={{
        position: "absolute", top, left: 3, right: 3, height,
        background: isTask ? "#fff" : color.bg, border: `1.5px solid ${color.border}`, borderRadius: 12,
        padding: "3px 8px", overflow: "hidden", cursor: isTask ? "grab" : "pointer", opacity: done ? 0.5 : 1,
      }}
    >
      {isTask && (
        <div style={{ position: "absolute", top: 3, right: 3 }}>
          <Checkbox checked={done} onClick={(e) => { e.stopPropagation(); onToggleDone(); }} color={{ border: color.text }} size={12} />
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: color.text, textDecoration: done ? "line-through" : "none", lineHeight: 1.2, paddingRight: isTask ? 14 : 0 }}>
        {item.title}
      </div>
      {height > 30 && <div style={{ fontSize: 9.5, color: color.text, opacity: 0.8 }}>{decimalToTimeLabel(item.start)}</div>}
    </div>
  );
}
