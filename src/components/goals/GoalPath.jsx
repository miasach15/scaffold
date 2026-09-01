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
// ADHD/visual learners than a plain progress bar. Flat color, a static ring marks
// wherever you currently are — no gradient, nothing perpetually animating.
export default function GoalPath({ milestones, col }) {
  const n = milestones.length;
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

  return (
    <div style={{ marginBottom: 4 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        {remainD && <path d={remainD} fill="none" stroke="#DCE1E6" strokeWidth={3} strokeDasharray="1 10" strokeLinecap="round" />}
        {walkedD !== `M ${points[0].x} ${points[0].y}` && (
          <path d={walkedD} fill="none" stroke={col.text} strokeWidth={5} strokeLinecap="round" />
        )}

        {milestones.map((m, i) => {
          const p = points[i];
          const done = isDone(m);
          const current = i === currentIndex;
          return (
            <g key={m.id}>
              {current && <circle cx={p.x} cy={p.y} r={17} fill="none" stroke={col.text} strokeWidth={1.5} opacity={0.35} />}
              <circle
                cx={p.x} cy={p.y} r={current ? 13 : 11}
                fill={done ? col.text : "#fff"}
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
            <g>
              {atFlag && <circle cx={p.x} cy={p.y} r={20} fill="none" stroke={col.text} strokeWidth={1.5} opacity={0.35} />}
              <circle cx={p.x} cy={p.y} r={15} fill={atFlag ? col.text : "#fff"} stroke={col.text} strokeWidth={2.5} />
              <polygon points={starPoints(p.x, p.y, 7.5, 3.2)} fill={atFlag ? "#fff" : col.border} />
            </g>
          );
        })()}
      </svg>
      {caption && <div style={{ fontSize: 11.5, color: col.text, opacity: 0.85, fontWeight: 600, marginTop: -2 }}>{caption}</div>}
    </div>
  );
}
