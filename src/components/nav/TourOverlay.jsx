import { useEffect, useRef, useState } from "react";
import { GripHorizontal } from "lucide-react";
import { PRIMARY } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";

// Four steps, each explaining what Scaffold actually DOES for you rather than walking
// through pages one by one (the old 11-step version was a page-by-page tour and read
// like a feature list, not the reason the app exists).
const STEPS = [
  {
    view: "dashboard", title: "Capture everything",
    bullets: ["Brain dump or the sticky note catches whatever's on your mind — a task, a test, an errand — the moment you think of it. Sort it out later, not right now."],
  },
  {
    view: "education", title: "Scaffold breaks it down",
    bullets: ["Add an assignment with a due date, and it splits into work sessions leading up to it — no more staring down one big deadline."],
  },
  {
    view: "calendar", title: "Your workload is placed realistically",
    bullets: ["Every session lands on a day based on how busy you already are — nothing crammed on top of what's already there."],
  },
  {
    view: "tasks", title: "Ask \"What should I do now?\"",
    bullets: ["Don't know where to start? One button picks the next thing for you, every time."],
  },
];

export default function TourOverlay({ setView, onCloseModals, onFinish }) {
  const steps = STEPS;
  const [i, setI] = useState(0);
  const step = steps[i];
  const isLast = i === steps.length - 1;

  // Drag support — the box defaults to bottom-center, which can sit over page content on
  // a small screen. Dragging it by the grip moves it out of the way; once moved, it stays
  // put for the rest of the tour instead of snapping back each step.
  const [dragPos, setDragPos] = useState(null); // null = default bottom-center position
  const boxRef = useRef(null);
  const startDrag = (e) => {
    const rect = boxRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origLeft = rect.left;
    const origTop = rect.top;
    const onMove = (ev) => {
      const left = Math.min(Math.max(8, origLeft + (ev.clientX - startX)), window.innerWidth - rect.width - 8);
      const top = Math.min(Math.max(8, origTop + (ev.clientY - startY)), window.innerHeight - rect.height - 8);
      setDragPos({ left, top });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    onCloseModals();
    setView(step.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const finish = () => {
    onCloseModals();
    onFinish();
  };

  return (
    <>
      {/* Below 861px, Sidebar's fixed-height bottom tab bar (see Sidebar.jsx) sits right
          where this tooltip's default bottom-anchored position would otherwise crowd it. */}
      <style>{`
        @media (max-width: 860px) {
          .tour-box-mobile-lift { bottom: calc(84px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
      <div
      ref={boxRef}
      className={dragPos ? undefined : "tour-box-mobile-lift"}
      style={
        dragPos
          ? { position: "fixed", top: dragPos.top, left: dragPos.left, zIndex: 200, background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(15,23,42,0.18)", padding: "18px 22px", width: 340, maxWidth: "calc(100vw - 32px)", border: "1px solid #E2E8F0" }
          : { position: "fixed", bottom: "calc(28px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(15,23,42,0.18)", padding: "18px 22px", width: 340, maxWidth: "calc(100vw - 32px)", border: "1px solid #E2E8F0" }
      }
    >
      <div
        onMouseDown={startDrag}
        title="Drag to move this out of the way"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, cursor: "grab" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: PRIMARY, textTransform: "uppercase", letterSpacing: 0.4 }}>
          <GripHorizontal size={13} strokeWidth={2.3} color="#B4BCC5" />
          {i + 1} of {steps.length}
        </div>
        <button onClick={finish} style={{ background: "none", border: "none", fontSize: 12.5, color: "#9CA3AF", cursor: "pointer" }}>Skip tour</button>
      </div>
      {/* A bar reads as "almost there" at a glance, without having to do the math on
          "3 of 4" — a small thing, but one less thing to process. */}
      <div style={{ height: 4, borderRadius: 2, background: "#EEF0F4", marginBottom: 14, overflow: "hidden" }}>
        <div
          style={{
            height: "100%", width: "100%", background: PRIMARY, borderRadius: 2,
            transform: `scaleX(${(i + 1) / steps.length})`, transformOrigin: "left",
            transition: "transform .2s ease",
          }}
        />
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>{step.title}</div>
      <ul style={{ margin: 0, marginBottom: 18, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
        {step.bullets.map((b, idx) => (
          <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 15, color: "#2A2A2A", lineHeight: 1.4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIMARY, marginTop: 7, flexShrink: 0 }} />
            {b}
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {i > 0 && <button onClick={() => setI((n) => n - 1)} style={ghostBtn}>Back</button>}
        <button onClick={() => (isLast ? finish() : setI((n) => n + 1))} style={primaryBtn}>{isLast ? "Done" : "Next"}</button>
      </div>
      </div>
    </>
  );
}
