import { useEffect, useRef, useState } from "react";
import { GripHorizontal } from "lucide-react";
import { PRIMARY } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";

// Short on purpose — one line per step, nothing to hold in your head at once. Ordered to
// match the sidebar's own nav order, ending on Settings.
const STEPS = [
  { type: "view", view: "dashboard", title: "Dashboard", bullets: ["Today's plan, top goal, habits, and what's due soon, in one place."] },
  { type: "view", view: "calendar", title: "Calendar", bullets: ["Click a day to add something. Drag a task to move it."] },
  { type: "view", view: "calendar", title: "Sticky Note", bullets: ["Jot anything in the corner note. It lands in your Tasks Inbox to sort later."] },
  { type: "view", view: "tasks", title: "Tasks", bullets: ["Today's list is just today. Stuck? \"What should I do right now?\" picks for you."] },
  { type: "view", view: "education", title: "Education", bullets: ["Add homework or a test with a due date. It'll split the work into sessions."] },
  { type: "view", view: "goals", title: "Goals", bullets: ["For bigger projects. Give it an end date and it builds the steps."] },
  { type: "view", view: "habits", title: "Habits", bullets: ["Add one, check it off each day. Missing a day doesn't reset anything."] },
  { type: "view", view: "grades", title: "Grades", bullets: ["Track scores per class — total points or your own weighted categories."] },
  { type: "view", view: "journal", title: "Journal", bullets: ["Pick a prompt or free write, whichever's easier that day."] },
  { type: "modal", modal: "weeklyReview", title: "Weekly Review", bullets: ["A look back at what you finished this week."] },
  { type: "modal", modal: "settings", title: "Settings", bullets: ["Accent color, category colors, reminders, and this tour again — all here."] },
];

export default function TourOverlay({ setView, onOpenSettings, onOpenWeeklyReview, onCloseModals, onFinish }) {
  const steps = STEPS;
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

  // The Settings step opens a centered modal full of color pickers — the tooltip's usual
  // bottom-center spot sits right on top of it. Docking to the side instead keeps the
  // modal clear on any normal desktop width; below 900px there's no room beside a
  // (near-)full-width modal, so it falls back to the same bottom-anchored spot every
  // other step uses.
  const isSettingsStep = step.type === "modal" && step.modal === "settings";

  return (
    <>
      {/* Below 861px, Sidebar's fixed-height bottom tab bar (see Sidebar.jsx) sits right
          where this tooltip's default bottom-anchored position would otherwise crowd it. */}
      <style>{`
        @media (max-width: 860px) {
          .tour-box-mobile-lift { bottom: calc(84px + env(safe-area-inset-bottom)) !important; }
        }
        @media (max-width: 900px) {
          .tour-box-side-dock {
            top: auto !important; right: auto !important; transform: translateX(-50%) !important;
            left: 50% !important; bottom: calc(84px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>
      <div
      ref={boxRef}
      className={dragPos ? undefined : isSettingsStep ? "tour-box-side-dock" : "tour-box-mobile-lift"}
      style={
        dragPos
          ? { position: "fixed", top: dragPos.top, left: dragPos.left, zIndex: 200, background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(15,23,42,0.18)", padding: "18px 22px", width: 340, maxWidth: "calc(100vw - 32px)", border: "1px solid #E2E8F0" }
          : isSettingsStep
          ? { position: "fixed", top: "50%", right: 24, transform: "translateY(-50%)", zIndex: 200, background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(15,23,42,0.18)", padding: "18px 22px", width: 300, maxWidth: "calc(100vw - 32px)", border: "1px solid #E2E8F0" }
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
