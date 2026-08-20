import { Check } from "lucide-react";

export default function Checkbox({ checked, onClick, color }) {
  return (
    <button onClick={onClick} style={{ width: 20, height: 20, borderRadius: 999, border: `2px solid ${checked ? color.border : "#D1D5DB"}`, background: checked ? color.border : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {checked && <Check size={13} strokeWidth={3} color="#fff" />}
    </button>
  );
}
