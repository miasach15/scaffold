import { useEffect, useRef, useState } from "react";
import { GripHorizontal } from "lucide-react";
import { PRIMARY } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";

// Short on purpose — one idea per step, at most two lines, nothing to hold in your
// head at once. A long tour is exactly the kind of thing that gets abandoned halfway.
const CORE_STEPS = [
  { type: "view", view: "dashboard", title: "Welcome to Scaffold", bullets: [
    "Nothing here keeps score. What you don't finish just carries forward to today, no red marks.",
  ] },
  { type: "view", view: "dashboard", title: "Dashboard", bullets: ["This is home base: today's plan, top goal, habits, what's due soon, all in one glance."] },
  { type: "view", view: "calendar", title: "Calendar", bullets: ["Click a day to add something. Drag a task to move it. Today's always highlighted."] },
  { type: "view", view: "calendar", title: "Sticky Note", bullets: ["That note in the corner: jot anything, hit Enter, sort it out later from your Tasks Inbox."] },
  { type: "view", view: "tasks", title: "Tasks", bullets: ["Today's list is just today. Stuck? Tap \"What should I do right now?\" and let it pick for you."] },
  { type: "view", view: "goals", title: "Goals", bullets: ["For the big stuff: a real project, not a quick errand. Give it an end date; it builds the steps."] },
  { type: "view", view: "habits", title: "Habits", bullets: ["Add one, tap it done each day. Missing a day doesn't reset anything."] },
  { type: "view", view: "journal", title: "Journal", bullets: ["Pick a prompt or free write. Whatever's easiest that day."] },
  { type: "view", view: "education", title: "Education", bullets: ["Add homework or a test with a due date. It can break the work into smaller sessions for you."] },
  { type: "view", view: "grades", title: "Grades", bullets: ["Track scores per class, your way: total points or your own weighted categories."] },
];

const MODAL_STEPS = [
  { type: "modal", modal: "settings", title: "Settings", bullets: ["Colors, reminders, and this tour again, all live here whenever you need them."] },
  { type: "modal", modal: "weeklyReview", title: "Weekly Review", bullets: ["A look back at what you finished this week. Wins only, no guilt trip."] },
];

export default function TourOverlay({ setView, onOpenSettings, onOpenWeeklyReview, onCloseModals, onFinish }) {
  const steps = [...CORE_STEPS, ...MODAL_STEPS];
  const [i, setI] = useState(0);
  const step = steps[i];
  const isLast = i === steps.length - 1;

  // Drag support — the box defaults to bottom-center, which can sit over whatever modal
  // a step opens (e.g. Settings). Dragging it by the grip moves it out of the way; once
  // moved, it stays put for the rest of the tour instead of snapping back each step.
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
    if (step.type === "modal") {
      if (step.modal === "settings") onOpenSettings();
      else if (step.modal === "weeklyReview") onOpenWeeklyReview();
    } else {
      setView(step.view);
    }
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
          "8 of 12" — a small thing, but one less thing to process. */}
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
