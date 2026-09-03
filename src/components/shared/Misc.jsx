import { PRIMARY_DARK, serifFont } from "../../lib/constants";

// The brand kit's monogram — three stacked bars (widening top to bottom) on a solid
// rounded badge, per its "Logo & Monogram" section. Shared so every wordmark
// (Sidebar, AuthScreen, Dashboard) uses the exact same mark.
export function Monogram({ size = 28, color = PRIMARY_DARK }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size * 0.2, background: color,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display: "block" }}>
        <rect x="13.5" y="10" width="13" height="4" rx="2" fill="#fff" />
        <rect x="9" y="18" width="22" height="4" rx="2" fill="#fff" />
        <rect x="5" y="27" width="30" height="4" rx="2" fill="#fff" />
      </svg>
    </div>
  );
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: serifFont, fontSize: 34, fontWeight: 500, color: "#000000", letterSpacing: -0.3, lineHeight: 1.1 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "#8B95A1", marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}
export function SubHeader({ children }) {
  return <div style={{ fontSize: 11.5, fontWeight: 600, color: "#6B7280", letterSpacing: 0.5, textTransform: "uppercase", margin: "18px 0 8px", background: "#EFEFEF", display: "inline-block", padding: "5px 12px", borderRadius: 999 }}>{children}</div>;
}
export function AddRow({ children }) {
  return <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>{children}</div>;
}
export function List({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>;
}
export function EmptyState({ text }) {
  return <div style={{ fontSize: 13, color: "#B4BCC5", padding: "14px 0" }}>{text}</div>;
}
export function ProgressBar({ done, total, color, track }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div style={{ height: 5, borderRadius: 3, background: track || "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color.text, borderRadius: 3, transition: "width .2s" }} />
      </div>
      <div style={{ fontSize: 10.5, color: color.text, opacity: 0.8, marginTop: 3, fontWeight: 600 }}>{done} of {total} done</div>
    </div>
  );
}
export function FilterPill({ label, active, color, onClick }) {
  const c = color || { bg: "#F1F3F5", border: "#E2E8F0", text: "#4A5568" };
  return (
    <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: `1px solid ${active ? c.border : "#E5E9ED"}`, background: active ? c.bg : "#fff", color: active ? c.text : "#93A0AD" }}>
      {label}
    </button>
  );
}
