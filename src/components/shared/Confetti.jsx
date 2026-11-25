// Shared with WeeklyReviewModal's Sunday celebration — same burst, same colors, now also
// used for finishing an assignment (see App.jsx's setEduDoneWithCelebration).
const CONFETTI_COLORS = ["#7B6EF0", "#F0923B", "#34A870", "#E8608F", "#2CAFA0", "#3E7BFA"];

export default function Confetti() {
  const pieces = Array.from({ length: 46 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.35,
    duration: 1.6 + Math.random() * 1.1,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 5,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 200 }}>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute", top: 0, left: `${p.left}%`, width: p.size, height: p.size * 0.6,
            background: p.color, borderRadius: 2,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
