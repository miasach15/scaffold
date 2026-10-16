export default function Swatch({ color, size = 26 }) {
  const fill = typeof color === "string" ? color : color.accent;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: fill, flexShrink: 0 }} />;
}
