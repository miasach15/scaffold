import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { MUTED, PRIMARY_DARK } from "../../lib/constants";

// How far you have to pull before letting go actually reloads — short of that it springs
// back, same as the native gesture this stands in for. Deliberately a bit more than a
// token flick needs, so it doesn't trigger from an incidental overscroll.
const THRESHOLD = 110;
// The resistance curve (see rubberband below) asymptotes toward this instead of a hard
// cap — a flick shouldn't be able to drag the icon halfway down the screen, but it still
// keeps following the finger a little the whole way, never just stopping dead. Comfortably
// above THRESHOLD so there's real room to feel the pull get harder before it lets go.
const MAX_PULL = 170;
// A trackpad's two-finger "swipe down" fires as a burst of wheel events with negative
// deltaY (same sign as scrolling content up) — there's no separate gesture to listen
// for, so this just treats "still getting negative deltaY after scrollTop already hit
// 0" as the same pull signal touch gives, and lets it decay if the burst pauses.
const WHEEL_DECAY_MS = 220;

// Apple's rubber-banding (WWDC 2018, "Designing Fluid Interfaces") — resistance grows
// the further past the natural range you drag, instead of either following 1:1 forever
// or hard-stopping at a wall. `dimension` is the soft ceiling the curve bends toward.
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
// 1:1 up through THRESHOLD itself — no resistance before the point where releasing
// would actually trigger a reload, so "how far is enough" stays honest — then rubber-
// bands only the excess past it, so a long drag still keeps a little give instead of
// hard-stopping right at the threshold.
function pullDistance(rawDelta) {
  if (rawDelta <= THRESHOLD) return rawDelta;
  return THRESHOLD + rubberband(rawDelta - THRESHOLD, MAX_PULL - THRESHOLD);
}

// A critically-damped spring (damping ratio 1 — settles smoothly, no bounce, same
// default §4 of apple-design calls for on anything that isn't a momentum-carrying
// release) stepped by rAF. Interruptible by construction: calling `set` again just
// retargets from wherever the value currently sits, same as grabbing a moving element
// mid-flight — never restarts from 0.
function useSpring(onFrame) {
  const state = useRef({ value: 0, velocity: 0, target: 0, raf: null, response: 0.32 });
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const stop = () => {
    if (state.current.raf) cancelAnimationFrame(state.current.raf);
    state.current.raf = null;
  };
  // Jumps the live value with no animation (e.g. snapping straight to a drag's 1:1
  // position) — still leaves velocity alone so a spring kicked off right after inherits
  // whatever motion was already there.
  const setImmediate = (v) => {
    stop();
    state.current.value = v;
    state.current.target = v;
    onFrameRef.current(v);
  };
  const springTo = (target, response = 0.32) => {
    const s = state.current;
    s.target = target;
    s.response = response;
    if (s.raf) return; // already running — just retargeting, no restart
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const s2 = state.current;
      // Critically damped mass-spring-damper (mass 1): stiffness/damping derived from
      // Apple's "response" time-constant rather than raw physics units, per apple-design.
      const angularFreq = (2 * Math.PI) / s2.response;
      const stiffness = angularFreq * angularFreq;
      const damping = 2 * angularFreq; // damping ratio 1.0
      const force = -stiffness * (s2.value - s2.target) - damping * s2.velocity;
      s2.velocity += force * dt;
      s2.value += s2.velocity * dt;
      onFrameRef.current(s2.value);
      if (Math.abs(s2.value - s2.target) < 0.4 && Math.abs(s2.velocity) < 4) {
        s2.value = s2.target;
        s2.velocity = 0;
        onFrameRef.current(s2.value);
        s2.raf = null;
        return;
      }
      s2.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  };
  useEffect(() => stop, []);
  return { current: state.current, setImmediate, springTo, stop };
}

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
  const reducedMotionRef = useRef(false);

  const spring = useSpring((v) => { pullRef.current = v; setPull(v); });

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const wheelState = wheelRef.current;
    const setDirect = (v) => { pullRef.current = v; setPull(v); }; // 1:1 while actively dragging — no spring fighting the finger
    const release = () => {
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        // Settles at the resting height instead of snapping there, so the spinner
        // arrives rather than teleporting — then reload once it's actually visible.
        if (reducedMotionRef.current) spring.setImmediate(THRESHOLD);
        else spring.springTo(THRESHOLD, 0.28);
        setTimeout(() => window.location.reload(), 160);
      } else if (reducedMotionRef.current) {
        spring.setImmediate(0);
      } else {
        spring.springTo(0, 0.32);
      }
    };

    const onTouchStart = (e) => {
      if (refreshing || e.touches.length !== 1) return;
      spring.stop(); // grabbing it again mid-spring-back takes over from wherever it is
      touchRef.current = { startY: e.touches[0].clientY, armed: atTop(e.target), dragging: false };
    };
    const onTouchMove = (e) => {
      const st = touchRef.current;
      if (!st.armed || refreshing) return;
      const delta = e.touches[0].clientY - st.startY;
      if (delta <= 0) { st.dragging = false; setDirect(0); return; }
      if (!atTop(e.target)) { st.armed = false; st.dragging = false; setDirect(0); return; }
      st.dragging = true;
      setDirect(pullDistance(delta));
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
        if (pullRef.current > 0 && e.deltaY >= 0) release();
        wheelState.rawAccum = 0;
        return;
      }
      spring.stop();
      // rawAccum tracks the raw (pre-resistance) total, same role touch's `delta` plays,
      // so pullDistance's "1:1 up to THRESHOLD" curve applies identically to both inputs.
      wheelState.rawAccum = (wheelState.rawAccum || 0) + -e.deltaY * 0.6;
      setDirect(pullDistance(wheelState.rawAccum));
      clearTimeout(wheelState.decayTimer);
      wheelState.decayTimer = setTimeout(() => { wheelState.rawAccum = 0; release(); }, WHEEL_DECAY_MS);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            // Pinned high and dead-center — doesn't trail the finger down the screen,
            // just sits in one fixed spot the whole time and reports progress via
            // rotation/opacity/spin instead of position.
            position: "fixed", top: "calc(env(safe-area-inset-top) + 2px)", left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, pointerEvents: "none",
            opacity: Math.min(1, progress + 0.15),
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
