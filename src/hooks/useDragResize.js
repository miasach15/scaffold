import { useCallback, useRef, useState } from "react";

// Drag-to-resize a CalBlock's bottom edge — a Google-Calendar-style "literally extend
// it on the calendar" alternative to typing an end time in the edit modal. Pointer
// events, not native HTML5 drag or mouse-only events, for the same reason
// useDragReschedule uses them: this needs to work from a touch gesture too, not just a
// mouse. Reports a live height in pixels while actively dragging (so the block can
// resize in real time under the finger/cursor) and the final duration in MINUTES once
// released — the caller converts that to whatever it actually persists.
const MIN_HEIGHT_PX = 18; // same floor CalBlock already clamps a block's rendered height to

export function useDragResize(onResize) {
  const [resize, setResize] = useState(null); // { id, height } while a resize is in progress
  const stateRef = useRef(null);

  const beginResize = useCallback(
    (e, item, startHeight, rowH) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation(); // never also trigger the block's own move-to-reschedule drag
      const startY = e.clientY;
      const pointerId = e.pointerId;

      const onMove = (ev) => {
        if (ev.pointerId !== pointerId) return;
        ev.preventDefault();
        const dy = ev.clientY - startY;
        const height = Math.max(MIN_HEIGHT_PX, startHeight + dy);
        const next = { id: item.id, height };
        stateRef.current = next;
        setResize(next);
      };

      const end = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        const final = stateRef.current;
        setResize(null);
        stateRef.current = null;
        // Only commit if the pointer actually moved — a plain tap on the handle
        // shouldn't silently reset the duration to whatever MIN_HEIGHT_PX rounds to.
        if (final) {
          // Snapped to the nearest 5 minutes — a pixel-precise "47 minutes" isn't a
          // number anyone actually meant to drag to.
          const rawMinutes = (final.height / rowH) * 60;
          const minutes = Math.max(5, Math.round(rawMinutes / 5) * 5);
          onResize(item.id, minutes);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    },
    [onResize]
  );

  return { resize, beginResize };
}
