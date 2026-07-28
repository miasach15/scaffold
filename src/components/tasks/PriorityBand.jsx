export default function PriorityBand({ label, count, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: color.bg, color: color.text, padding: "7px 12px", borderRadius: 10, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color.text }} />
      {label} ({count})
    </div>
  );
}
