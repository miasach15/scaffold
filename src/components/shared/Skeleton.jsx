// A gray placeholder block that pulses gently while real content (tasks, events,
// habits — whatever a hook's own `loading` flag is still true for) hasn't actually
// arrived yet, instead of either a blank gap or a flash of the wrong "nothing here"
// empty state in the moment before real data lands. `.skeleton-block`'s own pulse
// animation lives in App.jsx's shared <style> block, same place every other global
// CSS rule in this app already does, and backs off to a static tone under
// prefers-reduced-motion.
export default function Skeleton({ width = "100%", height = 14, radius = 8, style }) {
  return <div className="skeleton-block" style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }} />;
}
