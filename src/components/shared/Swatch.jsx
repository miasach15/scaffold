export default function Swatch({ color, size = 26 }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", background: color.bg, border: `2px solid ${color.border}`, flexShrink: 0 }} />;
}
