import { ROW_H } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { decimalToTimeLabel } from "../../lib/dateHelpers";

export default function CalBlock({ item, color, done, isTask, onOpenFocus, onToggleDone }) {
  const CATEGORY_COLORS = useCategoryColors();
  const top = item.start * ROW_H;
  const height = Math.max((item.duration / 60) * ROW_H, 18);
  const categoryCol = isTask ? CATEGORY_COLORS[item.category || "Personal"] : null;
  const showCategory = isTask && categoryCol && !done;
  return (
    <div
      onClick={isTask ? onOpenFocus : undefined}
      draggable={isTask}
      onDragStart={isTask ? (e) => e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: item.id })) : undefined}
      style={{
        position: "absolute", top, left: 3, right: 3, height,
        background: color.bg, border: `1.5px solid ${showCategory ? categoryCol.border : color.border}`, borderRadius: 12,
        padding: "3px 8px", overflow: "hidden", cursor: isTask ? "grab" : "default", opacity: done ? 0.5 : 1,
        boxShadow: showCategory ? `inset 3px 0 0 ${categoryCol.border}` : "none",
      }}
    >
      {isTask && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
          style={{
            position: "absolute", top: 3, right: 3, width: 12, height: 12, borderRadius: 3,
            border: `1.5px solid ${color.text}`, background: done ? color.text : "transparent", padding: 0,
          }}
        />
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: color.text, textDecoration: done ? "line-through" : "none", lineHeight: 1.2, paddingRight: isTask ? 14 : 0 }}>
        {item.title}
      </div>
      {height > 30 && <div style={{ fontSize: 9.5, color: color.text, opacity: 0.8 }}>{decimalToTimeLabel(item.start)}</div>}
    </div>
  );
}
