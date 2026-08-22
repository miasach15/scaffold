import { useId } from "react";

function starPoints(cx, cy, outerR, innerR) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

// A literal path toward the goal — one stop per milestone, ending at a star for the
// goal itself. Built for a visual, at-a-glance sense of "where am I, how far have I
// come, what's the very next stop" instead of reading a percentage or a checklist —
// the same idea as a game's level path (Duolingo, etc), which tends to land better for
// ADHD/visual learners than a plain progress bar. Curved, gradient, a little glow on
// wherever you currently are — meant to feel alive, not like a corporate flowchart.
export default function GoalPath({ milestones, col }) {
  const n = milestones.length;
  const rawId = useId();
  const gid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  if (n === 0) return null;

  const isDone = (m) => m.actions.length > 0 && m.actions.every((a) => a.done);
  const doneCount = milestones.filter(isDone).length;
  const currentIndex = milestones.findIndex((m) => !isDone(m)); // -1 means every milestone is done
  const atFlag = currentIndex === -1;

  const W = 640, H = 118, PAD = 36;
  const xStep = (W - PAD * 2) / n;
  const yFor = (i) => (i % 2 === 0 ? H * 0.36 : H * 0.7);
  const nodeX = (i) => PAD + i * xStep;
  const points = [...milestones.map((_, i) => ({ x: nodeX(i), y: yFor(i) })), { x: nodeX(n), y: yFor(n) }];
  const travelEnd = atFlag ? n : currentIndex; // segments up to this index are "already walked"

  // Smooth horizontal-tangent S-curves through the zigzag points, instead of straight
  // segments — reads as a flowing path rather than a plain diagram line.
  const curveTo = (p, next) => {
    const midX = p.x + (next.x - p.x) / 2;
    return `C ${midX} ${p.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  };
  let walkedD = `M ${points[0].x} ${points[0].y}`;
  let remainD = "";
  for (let i = 0; i < points.length - 1; i++) {
    const seg = curveTo(points[i], points[i + 1]);
    if (i + 1 <= travelEnd) walkedD += ` ${seg}`;
    else {
      if (!remainD) remainD = `M ${points[i].x} ${points[i].y}`;
      remainD += ` ${seg}`;
    }
  }

  const caption = atFlag
    ? "Every milestone's done — you're on the home stretch."
    : `${doneCount} of ${n} milestone${n === 1 ? "" : "s"} done — next stop: ${milestones[currentIndex].title}`;

  const dropShadow = { filter: "drop-shadow(0 2px 3px rgba(15,23,42,0.16))" };

  return (
    <div style={{ marginBottom: 4 }}>
      <style>{`
        @keyframes glowPulse-${gid} { 0%, 100% { transform: scale(1); opacity: .38; } 50% { transform: scale(1.3); opacity: .12; } }
        .glow-${gid} { animation: glowPulse-${gid} 1.9s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={`grad-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={col.border} />
            <stop offset="100%" stopColor={col.text} />
          </linearGradient>
        </defs>

        {remainD && <path d={remainD} fill="none" stroke="#DCE1E6" strokeWidth={3} strokeDasharray="1 10" strokeLinecap="round" />}
        {walkedD !== `M ${points[0].x} ${points[0].y}` && (
          <path d={walkedD} fill="none" stroke={`url(#grad-${gid})`} strokeWidth={5} strokeLinecap="round" style={dropShadow} />
        )}

        {milestones.map((m, i) => {
          const p = points[i];
          const done = isDone(m);
          const current = i === currentIndex;
          return (
            <g key={m.id} style={dropShadow}>
              {current && <circle cx={p.x} cy={p.y} r={17} fill={col.text} className={`glow-${gid}`} />}
              <circle
                cx={p.x} cy={p.y} r={current ? 13 : 11}
                fill={done ? `url(#grad-${gid})` : "#fff"}
                stroke={done ? "none" : current ? col.text : "#DCE1E6"}
                strokeWidth={current ? 2.5 : 2}
              />
              {done && (
                <path
                  d={`M ${p.x - 4.5} ${p.y} l 3 3.2 l 6 -6.8`}
                  fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
                />
              )}
              {current && !done && <circle cx={p.x} cy={p.y} r={4} fill={col.text} />}
            </g>
          );
        })}

        {/* Finish — a star instead of a flag, at the end of the path */}
        {(() => {
          const p = points[n];
          return (
            <g style={dropShadow}>
              {atFlag && <circle cx={p.x} cy={p.y} r={20} fill={col.text} className={`glow-${gid}`} />}
              <circle cx={p.x} cy={p.y} r={15} fill={atFlag ? `url(#grad-${gid})` : "#fff"} stroke={col.text} strokeWidth={2.5} />
              <polygon points={starPoints(p.x, p.y, 7.5, 3.2)} fill={atFlag ? "#fff" : col.border} />
            </g>
          );
        })()}
      </svg>
      {caption && <div style={{ fontSize: 11.5, color: col.text, opacity: 0.85, fontWeight: 600, marginTop: -2 }}>{caption}</div>}
    </div>
  );
}
