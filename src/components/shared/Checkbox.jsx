import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

// A little satisfying "pop" the moment something flips to done — not just an instant
// state swap. Small positive feedback like this matters more than it sounds for ADHD
// motivation, where task completion often needs its own little reward to register.
// `size` defaults to the standard 18px list-row checkbox everywhere; a tighter spot
// (a calendar block, barely taller than that) can pass a smaller value and still get
// the same rounded-square/pop-on-complete language instead of a bespoke toggle.
export default function Checkbox({ checked, onClick, color, size = 18 }) {
  const [pop, setPop] = useState(false);
  const wasChecked = useRef(checked);
  const iconSize = Math.round(size * 0.67);
  const radius = Math.max(3, Math.round(size * 0.28));

  useEffect(() => {
    if (checked && !wasChecked.current) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 420);
      wasChecked.current = checked;
      return () => clearTimeout(t);
    }
    wasChecked.current = checked;
  }, [checked]);

  return (
    <button
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: radius, border: `1.5px solid ${checked ? color.border : "#D1D5DB"}`,
        background: checked ? color.border : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", transform: pop ? "scale(1.3)" : "scale(1)",
        transition: "transform 240ms cubic-bezier(.34,1.56,.64,1), background-color 150ms, border-color 150ms",
      }}
    >
      {checked && <Check size={iconSize} strokeWidth={3} color="#fff" />}
      {pop && (
        <span
          style={{
            position: "absolute", inset: -4, borderRadius: radius + 1, border: `2px solid ${color.border}`,
            animation: "checkboxPingOut 420ms ease-out forwards", pointerEvents: "none",
          }}
        />
      )}
    </button>
  );
}
