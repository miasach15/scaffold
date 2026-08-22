// A literal path toward the goal — one stop per milestone, ending at a flag for the
// goal itself. Built for a visual, at-a-glance sense of "where am I, how far have I
// come, what's the very next stop" instead of reading a percentage or a checklist —
// the same idea as a game's level path (Duolingo, etc), which tends to land better for
// ADHD/visual learners than a plain progress bar.
export default function GoalPath({ milestones, col }) {
  const n = milestones.length;
  if (n === 0) return null;

  const isDone = (m) => m.actions.length > 0 && m.actions.every((a) => a.done);
  const doneCount = milestones.filter(isDone).length;
  const currentIndex = milestones.findIndex((m) => !isDone(m)); // -1 means every milestone is done
  const atFlag = currentIndex === -1;

  const W = 640, H = 108, PAD = 34;
  const xStep = n > 0 ? (W - PAD * 2) / n : 0;
  const yFor = (i) => (i % 2 === 0 ? H * 0.34 : H * 0.7);
  const nodeX = (i) => PAD + i * xStep;
  const points = [...milestones.map((_, i) => ({ x: nodeX(i), y: yFor(i) })), { x: nodeX(n), y: yFor(n) }];

  const travelEnd = atFlag ? n : currentIndex; // segments up to this index are "already walked"

  const caption = atFlag
    ? milestones.length > 0
      ? "Every milestone's done — you're on the home stretch."
      : ""
    : `${doneCount} of ${n} milestone${n === 1 ? "" : "s"} done — next stop: ${milestones[currentIndex].title}`;

  return (
    <div style={{ marginBottom: 4 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1];
          const walked = i + 1 <= travelEnd;
          return (
            <line
              key={i}
              x1={p.x} y1={p.y} x2={next.x} y2={next.y}
              stroke={walked ? col.text : "#DADAD8"}
              strokeWidth={walked ? 3 : 2}
              strokeDasharray={walked ? undefined : "5 6"}
              strokeLinecap="round"
              opacity={walked ? 0.8 : 1}
            />
          );
        })}

        {milestones.map((m, i) => {
          const p = points[i];
          const done = isDone(m);
          const current = i === currentIndex;
          return (
            <g key={m.id}>
              {current && <circle cx={p.x} cy={p.y} r={16} fill="none" stroke={col.text} strokeWidth={2} opacity={0.28} />}
              <circle
                cx={p.x} cy={p.y} r={current ? 11 : 9.5}
                fill={done ? col.text : "#fff"}
                stroke={done ? col.text : current ? col.text : "#DADAD8"}
                strokeWidth={current ? 2.5 : 2}
              />
              {done && (
                <path
                  d={`M ${p.x - 4} ${p.y} l 2.6 2.8 l 5.4 -6`}
                  fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                />
              )}
              {current && !done && <circle cx={p.x} cy={p.y} r={3.5} fill={col.text} />}
            </g>
          );
        })}

        {/* Flag node — the goal itself, at the end of the path */}
        <g>
          {(() => {
            const p = points[n];
            return (
              <>
                <circle cx={p.x} cy={p.y} r={12} fill={atFlag ? col.text : "#fff"} stroke={col.text} strokeWidth={2.5} />
                <path
                  d={`M ${p.x - 3} ${p.y + 5} L ${p.x - 3} ${p.y - 5} L ${p.x + 4} ${p.y - 2.5} L ${p.x - 3} ${p.y}`}
                  fill={atFlag ? "#fff" : col.text} stroke="none"
                />
              </>
            );
          })()}
        </g>
      </svg>
      {caption && <div style={{ fontSize: 11.5, color: col.text, opacity: 0.85, fontWeight: 600, marginTop: -2 }}>{caption}</div>}
    </div>
  );
}
