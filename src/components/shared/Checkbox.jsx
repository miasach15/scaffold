export default function Checkbox({ checked, onClick, color }) {
  return (
    <button onClick={onClick} style={{ width: 20, height: 20, borderRadius: 999, border: `2px solid ${checked ? color.border : "#DCD5C8"}`, background: checked ? color.bg : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {checked && <div style={{ width: 9, height: 9, borderRadius: 999, background: color.text }} />}
    </button>
  );
}
