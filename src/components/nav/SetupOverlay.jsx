import { useEffect, useState } from "react";
import { PRIMARY } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";

// Three concrete things, in order, right after the tour ends — turning "okay, now what"
// into a short checklist instead of an empty app staring back at you. Each step opens
// the real thing (Settings, Calendar, Brain Dump) rather than just describing it; you
// do the thing, then move on. Skippable at every step — this is a nudge, not a gate.
const STEPS = [
  {
    key: "colors",
    title: "Make it yours",
    body: "Pick colors for your categories — whatever's calm to look at. There's no wrong answer.",
    cta: "Next: your schedule",
  },
  {
    key: "calendar",
    title: "What's already set in stone?",
    body: "Add what's already on the calendar for the next two weeks — classes, practice, appointments. Click any day to add one.",
    cta: "Next: brain dump",
  },
  {
    key: "braindump",
    title: "Get it out of your head",
    body: "Now list anything else coming up — assignments, errands, whatever's floating around. One line each. Sort it out later.",
    cta: "Done",
  },
];

export default function SetupOverlay({ setView, onOpenSettings, onCloseSettings, onOpenBrainDump, onFinish }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;

  useEffect(() => {
    if (step.key === "colors") onOpenSettings();
    else if (step.key === "calendar") { onCloseSettings(); setView("calendar"); }
    else if (step.key === "braindump") onOpenBrainDump();
  }, [i]);

  const finish = () => {
    onCloseSettings();
    onFinish();
  };

  return (
    <div
      style={{
        position: "fixed", top: "calc(20px + env(safe-area-inset-top))", left: "50%", transform: "translateX(-50%)",
        zIndex: 200, background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(15,23,42,0.18)",
        padding: "18px 22px", width: 360, maxWidth: "calc(100vw - 32px)", border: "1px solid #E2E8F0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: PRIMARY, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Quick setup — {i + 1} of {STEPS.length}
        </div>
        <button onClick={finish} style={{ background: "none", border: "none", fontSize: 12.5, color: "#9CA3AF", cursor: "pointer" }}>Skip setup</button>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "#EEF0F4", marginBottom: 14, overflow: "hidden" }}>
        <div
          style={{
            height: "100%", width: "100%", background: PRIMARY, borderRadius: 2,
            transform: `scaleX(${(i + 1) / STEPS.length})`, transformOrigin: "left",
            transition: "transform .2s ease",
          }}
        />
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>{step.title}</div>
      <div style={{ fontSize: 15, color: "#2A2A2A", lineHeight: 1.4, marginBottom: 18 }}>{step.body}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {i > 0 && <button onClick={() => setI((n) => n - 1)} style={ghostBtn}>Back</button>}
        <button onClick={() => (isLast ? finish() : setI((n) => n + 1))} style={primaryBtn}>{step.cta}</button>
      </div>
    </div>
  );
}
