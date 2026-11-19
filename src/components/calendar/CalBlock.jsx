import { ROW_H, SURFACE } from "../../lib/constants";
import { decimalToTimeLabel } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";

// col/cols (see layoutOverlaps) place this block in a side-by-side column among whatever
// else overlaps it at the same time, instead of every block defaulting to the full column
// width and just stacking on top of each other. cols=1 (the normal, non-overlapping case)
// renders exactly as before.
export default function CalBlock({ item, color, done, isTask, onOpenFocus, onToggleDone, onEditEvent, col = 0, cols = 1, beginPress, guardClick, draggable, dragKind }) {
  const top = item.start * ROW_H;
  const height = Math.max((item.duration / 60) * ROW_H, 18);
  const accent = color.accent || color.border;
  const widthPct = 100 / cols;
  // Draggable covers both tasks and plain events now — Google-Calendar-style drag to
  // reschedule to a different day/hour in the grid (see useDragReschedule). Due-chips
  // rendered through here stay click-only (neither isTask nor draggable passed). A plain
  // tap still runs the normal click action (open the focus timer for a task, open the
  // edit modal for an event); a real drag reschedules instead, via pointer events so this
  // works with touch too, not just a mouse.
  const canDrag = isTask || draggable;
  const handleClick = isTask ? onOpenFocus : () => onEditEvent(item);
  return (
    <div
      onClick={canDrag ? guardClick(handleClick) : handleClick}
      onPointerDown={canDrag ? (e) => beginPress(e, { kind: dragKind || (isTask ? "task" : "event"), id: item.id, title: item.title }, handleClick) : undefined}
      style={{
        position: "absolute", top, left: `calc(${col * widthPct}% + 3px)`, width: `calc(${widthPct}% - 6px)`, height,
        background: SURFACE, border: `1.5px solid ${accent}`, borderRadius: 10,
        padding: "6px 10px 6px 9px", overflow: "hidden", cursor: canDrag ? "grab" : "pointer", opacity: done ? 0.5 : 1,
        touchAction: canDrag ? "none" : undefined,
        userSelect: canDrag ? "none" : undefined, WebkitUserSelect: canDrag ? "none" : undefined,
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
          {item.category ? ` · ${item.category}` : ""}
        </div>
      )}
    </div>
  );
}
