import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { LIFESTYLE_PAGE_META, PRIMARY } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";

const CORE_STEPS = [
  { key: "calendar", title: "Calendar", desc: "Your week at a glance. Click a slot to add an event, and drag tasks to reschedule them." },
  { key: "tasks", title: "Tasks", desc: "A simple running list for anything that doesn't need a fixed time on the calendar." },
  { key: "goals", title: "Goals", desc: "Set a goal, break it into milestones, and break those into small next actions." },
  { key: "habits", title: "Habits", desc: "Track the things you're trying to keep up with, one day at a time." },
  { key: "journal", title: "Journal", desc: "Prompted or freeform writing, whenever you want a quiet place to reflect." },
  { key: "education", title: "Education", desc: "Assignments, tests, and homework in one place, with built-in study sessions." },
];

export default function TourOverlay({ setView, enabledPages, onFinish }) {
  const lifestyleSteps = LIFESTYLE_PAGE_META
    .filter((p) => enabledPages.includes(p.key))
    .map((p) => ({ key: p.key, title: p.label, desc: p.tagline }));
  const steps = [...CORE_STEPS, ...lifestyleSteps];
  const [i, setI] = useState(0);

  useEffect(() => {
    setView(steps[i].key);
  }, [i]);

  const step = steps[i];
  const isLast = i === steps.length - 1;

  return (
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
  );
}
