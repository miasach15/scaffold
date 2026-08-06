import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { LIFESTYLE_PAGE_META, PRIMARY } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";

const CORE_STEPS = [
  { view: "calendar", selector: '[data-tour="calendar-allday"]', title: "All-day row", desc: "Click anywhere in this row to add an event that isn't tied to a specific time." },
  { view: "calendar", selector: '[data-tour="calendar-grid"]', title: "Time grid", desc: "Click any slot to add a timed event. Drag a task onto a new day or time to reschedule it." },
  { view: "calendar", selector: '[data-tour="calendar-nav"]', title: "Move around", desc: "Jump back to this week, or step to the previous/next week." },
  { view: "tasks", selector: '[data-tour="tasks-add"]', title: "Add a task", desc: "Type a task, optionally give it a date, and hit Add." },
  { view: "tasks", selector: '[data-tour="tasks-category"]', title: "Categorize it", desc: "Tag each task Education, Personal, Health, or People — click a task's colored dot any time to change it." },
  { view: "goals", selector: '[data-tour="goals-add"]', title: "Set a goal", desc: "Give it a category and, if you want, a deadline. Then break it into milestones and small next actions." },
  { view: "goals", selector: '[data-tour="goals-filter"]', title: "Filter by category", desc: "Focus on one category of goals at a time." },
  { view: "habits", selector: '[data-tour="habits-add"]', title: "Track a habit", desc: "Add your own, or tap a suggestion below to get started fast." },
  { view: "habits", selector: '[data-tour="habits-markdone"]', title: "Mark it done", desc: "Tap to check off today. Click a habit's name to see a full calendar of which days you've kept it up, and toggle any past day." },
  { view: "journal", selector: '[data-tour="journal-prompt"]', title: "Prompts", desc: "Pick a category for a writing prompt, shuffle for a new one, or skip to free write." },
  { view: "education", selector: '[data-tour="education-add"]', title: "Add work", desc: "Log an assignment, test, or homework with its due date — study sessions can be broken out from there." },
];

export default function TourOverlay({ setView, enabledPages, onFinish }) {
  const lifestyleSteps = LIFESTYLE_PAGE_META
    .filter((p) => enabledPages.includes(p.key))
    .map((p) => ({ view: p.key, title: p.label, desc: p.tagline }));
  const steps = [...CORE_STEPS, ...lifestyleSteps];
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);

  const step = steps[i];
  const isLast = i === steps.length - 1;

  useEffect(() => {
    setView(step.view);
    setRect(null);
    if (!step.selector) return undefined;

    let cancelled = false;
    const measure = () => {
      const el = document.querySelector(step.selector);
      if (!el || cancelled) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const findAndScroll = setTimeout(() => {
      const el = document.querySelector(step.selector);
      if (!el || cancelled) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(measure, 280);
    }, 60);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelled = true;
      clearTimeout(findAndScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [i]);

  return (
    <>
      {rect && (
        <div
          style={{
            position: "fixed", top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12,
            borderRadius: 12, border: `2px solid ${PRIMARY}`, boxShadow: "0 0 0 9999px rgba(15,23,42,0.45)",
            pointerEvents: "none", zIndex: 99, transition: "all .25s ease",
          }}
        />
      )}
      <div
        style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100,
          background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(15,23,42,0.18)",
          padding: "18px 22px", width: 380, maxWidth: "calc(100vw - 32px)", border: "1px solid #E2E8F0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: PRIMARY, textTransform: "uppercase", letterSpacing: 0.4 }}>
            <Sparkles size={13} strokeWidth={2.3} /> {i + 1} of {steps.length}
          </div>
          <button onClick={onFinish} style={{ background: "none", border: "none", fontSize: 12.5, color: "#9CA3AF", cursor: "pointer" }}>Skip tour</button>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{step.title}</div>
        <div style={{ fontSize: 13, color: "#5A6472", marginBottom: 16, lineHeight: 1.45 }}>{step.desc}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {i > 0 && <button onClick={() => setI((n) => n - 1)} style={ghostBtn}>Back</button>}
          <button onClick={() => (isLast ? onFinish() : setI((n) => n + 1))} style={primaryBtn}>{isLast ? "Done" : "Next"}</button>
        </div>
      </div>
    </>
  );
}
