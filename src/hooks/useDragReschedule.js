import { useCallback, useRef, useState } from "react";

// Replaces native HTML5 drag-and-drop (draggable/onDragStart/onDragOver/onDrop) for
// Calendar's reschedule-by-dragging — the native API simply never fires from a touch
// gesture on iOS Safari (or most mobile browsers), so a real finger-drag silently did
// nothing there even though it worked fine with a mouse. Pointer Events fire the same
// way for mouse and touch, so this one implementation covers both.
//
// A single press-and-release under MOVE_THRESHOLD px is treated as a plain tap/click
// instead of a drag — same item (a CalBlock, a StripRow chip) still needs to open its
// edit modal on a normal click, not just reschedule itself.
const MOVE_THRESHOLD = 6;

// Drop targets tag themselves with data-drop-iso (and data-drop-hour for the hourly
// grid) — elementFromPoint + closest() is the standard way to hit-test during a
// pointer-driven drag, since the dragged element itself isn't a real drop target.
function hitTest(x, y) {
  const el = document.elementFromPoint(x, y);
  const dropEl = el ? el.closest("[data-drop-iso]") : null;
  if (!dropEl) return { overIso: null, overHour: null };
  const hourAttr = dropEl.getAttribute("data-drop-hour");
  return { overIso: dropEl.getAttribute("data-drop-iso"), overHour: hourAttr != null ? Number(hourAttr) : null };
}

export function useDragReschedule(onDrop) {
  // { kind, id, title, x, y, overIso, overHour } while a real drag (past the move
  // threshold) is in progress — null otherwise, including during a not-yet-a-drag press.
  const [drag, setDrag] = useState(null);
  const stateRef = useRef(null);
  // True from pointerdown until the browser's own trailing synthetic click event (fired
  // after every pointerup, mouse or touch) has been swallowed — without this, a tap
  // handled via the pointer path would ALSO fire the element's native onClick a moment
  // later and run the tap action twice.
  const pointerHandledRef = useRef(false);

  const beginPress = useCallback(
    (e, item, onTap) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Without this, moving the mouse even a pixel before the drag threshold kicks in
      // starts the browser's native text-selection drag on the block's own label —
      // preventDefault on the down event itself (not just once dragging is confirmed)
      // stops that selection from ever starting.
      e.preventDefault();
      pointerHandledRef.current = true;
      const startX = e.clientX;
      const startY = e.clientY;
      const pointerId = e.pointerId;
      let dragging = false;

      const onMove = (ev) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > MOVE_THRESHOLD) dragging = true;
        if (!dragging) return;
        ev.preventDefault();
        const { overIso, overHour } = hitTest(ev.clientX, ev.clientY);
        const next = { ...item, x: ev.clientX, y: ev.clientY, overIso, overHour };
        stateRef.current = next;
        setDrag(next);
      };

      const end = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        if (dragging) {
          const final = stateRef.current;
          setDrag(null);
          stateRef.current = null;
          if (final && final.overIso) onDrop(final.kind, final.id, final.overIso, final.overHour);
        } else {
          onTap?.();
        }
        // Swallow the trailing synthetic click, then release the guard for the next
        // independent interaction.
        setTimeout(() => { pointerHandledRef.current = false; }, 0);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    },
    [onDrop]
  );

  // Wrap an element's native onClick with this so keyboard activation (Enter/Space,
  // which never goes through pointerdown) still works, while a pointer-driven tap that
  // already ran via beginPress's onTap doesn't ALSO run the click handler a second time.
  // Always stops propagation (every caller wants that anyway, to keep a chip tap from
  // also triggering whatever its parent cell's own click does) — including on the
  // swallowed branch, since without it the trailing synthetic click would still bubble
  // even though this element's own handler no-ops.
  const guardClick = useCallback(
    (onClick) => (e) => {
      e.stopPropagation();
      if (pointerHandledRef.current) {
        pointerHandledRef.current = false;
        return;
      }
      onClick(e);
    },
    []
  );

  return { drag, beginPress, guardClick };
}
