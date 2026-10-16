export default function PriorityBand({ label, count, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: color.text, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color.text }} />
      {label} ({count})
    </div>
  );
}
