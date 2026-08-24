import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

// A little satisfying "pop" the moment something flips to done — not just an instant
// state swap. Small positive feedback like this matters more than it sounds for ADHD
// motivation, where task completion often needs its own little reward to register.
export default function Checkbox({ checked, onClick, color }) {
  const [pop, setPop] = useState(false);
  const wasChecked = useRef(checked);

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
        width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? color.border : "#D1D5DB"}`,
        background: checked ? color.border : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", transform: pop ? "scale(1.3)" : "scale(1)",
        transition: "transform 240ms cubic-bezier(.34,1.56,.64,1), background-color 150ms, border-color 150ms",
      }}
    >
      {checked && <Check size={12} strokeWidth={3} color="#fff" />}
      {pop && (
        <span
          style={{
            position: "absolute", inset: -4, borderRadius: 6, border: `2px solid ${color.border}`,
            animation: "checkboxPingOut 420ms ease-out forwards", pointerEvents: "none",
          }}
        />
      )}
    </button>
  );
}
