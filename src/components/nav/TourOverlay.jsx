import { useEffect, useRef, useState } from "react";
import { GripHorizontal, Sparkles } from "lucide-react";
import { PRIMARY } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";

const CORE_STEPS = [
  { type: "view", view: "calendar", title: "Calendar", bullets: ["Click a day to add stuff", "Drag tasks to move them", "Today is highlighted for you"] },
  { type: "view", view: "calendar", title: "Sticky Note", bullets: ["That note in the corner — type directly onto it, no date needed", "Hit Enter and it's saved to your Tasks Inbox to sort out later", "Studying for something specific? Add it from the Education page instead"] },
  { type: "view", view: "tasks", title: "Tasks", bullets: ["Type a task, hit Add", "Tag it with a category", "Check it off when done"] },
  { type: "view", view: "goals", title: "Goals", bullets: ["Add a goal + deadline", "Break it into small steps", "Check off each step"] },
  { type: "view", view: "habits", title: "Habits", bullets: ["Add a habit to track", "Tap \"Mark done\" each day", "Click it to see history"] },
  { type: "view", view: "journal", title: "Journal", bullets: ["Pick a prompt, or free write", "Type your thoughts", "Save when you're done"] },
  { type: "view", view: "education", title: "Education", bullets: ["Add homework or a test", "Give it a due date", "Break it into study sessions"] },
];

const MODAL_STEPS = [
  { type: "modal", modal: "settings", title: "Settings", bullets: ["Pick your accent color", "Recolor each category", "Replay this tour anytime"] },
  { type: "modal", modal: "weeklyReview", title: "Weekly Review", bullets: ["See what you finished", "Covers tasks, goals, habits", "Open it anytime up top"] },
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
    <div
      ref={boxRef}
      style={
        dragPos
          ? { position: "fixed", top: dragPos.top, left: dragPos.left, zIndex: 200, background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(15,23,42,0.18)", padding: "18px 22px", width: 340, maxWidth: "calc(100vw - 32px)", border: "1px solid #E2E8F0" }
          : { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(15,23,42,0.18)", padding: "18px 22px", width: 340, maxWidth: "calc(100vw - 32px)", border: "1px solid #E2E8F0" }
      }
    >
      <div
        onMouseDown={startDrag}
        title="Drag to move this out of the way"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, cursor: "grab" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: PRIMARY, textTransform: "uppercase", letterSpacing: 0.4 }}>
          <GripHorizontal size={13} strokeWidth={2.3} color="#B4BCC5" />
          <Sparkles size={13} strokeWidth={2.3} /> {i + 1} of {steps.length}
        </div>
        <button onClick={finish} style={{ background: "none", border: "none", fontSize: 12.5, color: "#9CA3AF", cursor: "pointer" }}>Skip tour</button>
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>{step.title}</div>
      <ul style={{ margin: 0, marginBottom: 18, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
        {step.bullets.map((b, idx) => (
          <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14.5, color: "#2A2A2A", lineHeight: 1.35 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIMARY, marginTop: 6, flexShrink: 0 }} />
            {b}
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {i > 0 && <button onClick={() => setI((n) => n - 1)} style={ghostBtn}>Back</button>}
        <button onClick={() => (isLast ? finish() : setI((n) => n + 1))} style={primaryBtn}>{isLast ? "Done" : "Next"}</button>
      </div>
    </div>
  );
}
