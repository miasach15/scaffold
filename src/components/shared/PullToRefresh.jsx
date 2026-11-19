import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { MUTED, PRIMARY_DARK } from "../../lib/constants";

// How far you have to pull before letting go actually reloads — short of that it just
// springs back, same as the native gesture this stands in for.
const THRESHOLD = 72;
// Past this, the indicator keeps growing but at a fraction of the raw drag distance —
// a flick shouldn't be able to drag the icon halfway down the screen.
const MAX_PULL = 120;
const RESISTANCE = 0.4;
// A trackpad's two-finger "swipe down" fires as a burst of wheel events with negative
// deltaY (same sign as scrolling content up) — there's no separate gesture to listen
// for, so this just treats "still getting negative deltaY after scrollTop already hit
// 0" as the same pull signal touch gives, and lets it decay if the burst pauses.
const WHEEL_DECAY_MS = 220;

// Walks up from the touched/wheeled element to whichever ancestor actually owns the
// scroll (the page has several independent scroll containers — Dashboard's two columns,
// Calendar's own grid, the shared content wrapper every other page uses — so this can't
// just hardcode one of them). Falls back to the document itself if none of them scroll.
function findScroller(el) {
  // A real pointer/wheel event's target is always an Element somewhere inside the page,
  // but this stays defensive against anything else (document, window, a text node) by
  // just falling back to the real scrolling root rather than calling getComputedStyle
  // on something it doesn't accept.
  let node = el instanceof Element ? el : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}
function atTop(el) {
  return findScroller(el).scrollTop <= 0;
}

// A pull-down-to-reload gesture for the whole app — standing in for the native one,
// which an installed PWA (standalone display mode) doesn't get on iOS/Android, and which
// a laptop trackpad never had in the first place. Wraps the whole app shell rather than
// one specific scroll container, since which element actually scrolls varies by page.
export default function PullToRefresh({ children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const touchRef = useRef({ startY: 0, armed: false, dragging: false });
  const wheelRef = useRef({ decayTimer: null });

  useEffect(() => {
    const wheelState = wheelRef.current;
    const setPullBoth = (v) => { pullRef.current = v; setPull(v); };
    const release = () => {
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPullBoth(THRESHOLD);
        window.location.reload();
      } else {
        setPullBoth(0);
      }
    };

    const onTouchStart = (e) => {
      if (refreshing || e.touches.length !== 1) return;
      touchRef.current = { startY: e.touches[0].clientY, armed: atTop(e.target), dragging: false };
    };
    const onTouchMove = (e) => {
      const st = touchRef.current;
      if (!st.armed || refreshing) return;
      const delta = e.touches[0].clientY - st.startY;
      if (delta <= 0) { st.dragging = false; setPullBoth(0); return; }
      if (!atTop(e.target)) { st.armed = false; st.dragging = false; setPullBoth(0); return; }
      st.dragging = true;
      setPullBoth(delta < MAX_PULL ? delta : MAX_PULL + (delta - MAX_PULL) * RESISTANCE);
      e.preventDefault();
    };
    const onTouchEnd = () => {
      if (touchRef.current.dragging) release();
      touchRef.current.armed = false;
      touchRef.current.dragging = false;
    };

    const onWheel = (e) => {
      if (refreshing || e.deltaY >= 0 || !atTop(e.target)) {
        clearTimeout(wheelState.decayTimer);
        if (pullRef.current > 0 && e.deltaY >= 0) setPullBoth(0);
        return;
      }
      setPullBoth(Math.min(MAX_PULL, pullRef.current + -e.deltaY * 0.6));
      clearTimeout(wheelState.decayTimer);
      wheelState.decayTimer = setTimeout(() => {
        if (pullRef.current >= THRESHOLD) release();
        else setPullBoth(0);
      }, WHEEL_DECAY_MS);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("wheel", onWheel);
      clearTimeout(wheelState.decayTimer);
    };
  }, [refreshing]);

  const progress = Math.min(1, pull / THRESHOLD);
  const visible = pull > 2 || refreshing;

  return (
    <>
      {visible && (
        // Just a bare spinner, no pill/label — the same plain "a wheel appears up top
        // and spins" an iOS/Mac app gives you, not a custom banner announcing itself.
        <div
          style={{
            position: "fixed", top: 14, left: "50%", transform: `translateX(-50%) translateY(${Math.min(pull, MAX_PULL) * 0.5}px)`,
            zIndex: 9999, pointerEvents: "none",
            opacity: Math.min(1, progress + 0.15), transition: refreshing ? "none" : "opacity 120ms ease",
          }}
        >
          <RotateCw
            size={18}
            color={progress >= 1 || refreshing ? PRIMARY_DARK : MUTED}
            style={{
              transform: refreshing ? "none" : `rotate(${progress * 220}deg)`,
              animation: refreshing ? "ptr-spin 0.7s linear infinite" : "none",
            }}
          />
        </div>
      )}
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
      {children}
    </>
  );
}
