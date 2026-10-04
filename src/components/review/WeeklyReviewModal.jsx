import { ListChecks } from "lucide-react";
import { BORDER, HABIT_COLOR, INK, MUTED, PRIMARY, PRIMARY_DARK, TASK_COLOR, serifFont } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { addDays, formatDuration, getLocalToday, startOfWeek, toISO } from "../../lib/dateHelpers";
import { ghostBtn, modalStyle, overlayStyle } from "../../lib/styles";
import { EmptyState } from "../shared/Misc";
import ModalPortal from "../shared/ModalPortal";

function StatTile({ value, label }) {
  return (
    <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
      <div style={{ fontFamily: serifFont, fontSize: 19, color: INK }}>{value}</div>
      <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function InsightCard({ title, body }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: PRIMARY_DARK, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{body}</div>
    </div>
  );
}

const CONFETTI_COLORS = ["#7B6EF0", "#F0923B", "#34A870", "#E8608F", "#2CAFA0", "#3E7BFA"];

function Confetti() {
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

function ReviewSection({ title, items, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#5A6472", marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: color.border, flexShrink: 0 }} />
            <div>{it}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeeklyReviewModal({ tasks, goals, habits, onClose }) {
  const CATEGORY_COLORS = useCategoryColors();
  const weekStart = toISO(startOfWeek(new Date()));
  const weekEnd = toISO(addDays(startOfWeek(new Date()), 6));
  const inWeek = (iso) => iso && iso >= weekStart && iso <= weekEnd;

  // Education deadlines (the assignment/test itself) used to get their own separate
  // "Education items completed" section here, alongside "Tasks completed" — but every
  // Education work session IS a task, so this just doubled up on the same underlying
  // work with a second, differently-worded list. One list now.
  const tasksDone = tasks.filter((t) => t.done && inWeek(t.date));
  const actionsDone = [];
  goals.forEach((g) => g.milestones.forEach((m) => m.actions.forEach((a) => {
    if (a.done && inWeek(a.dueDate)) actionsDone.push({ goal: g.title, title: a.title });
  })));
  const habitStats = habits.map((h) => ({ title: h.title, count: h.doneDates.filter((d) => inWeek(d)).length })).filter((h) => h.count > 0);

  const totalWins = tasksDone.length + actionsDone.length;
  const isSunday = new Date().getDay() === 0;

  // Time actually focused this week — only tasks finished through a Focus Session carry
  // a real actualMinutes (see setTaskDone), so this is real elapsed time, not a guess.
  const focusedMin = tasksDone.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
  const habitCheckIns = habitStats.reduce((sum, h) => sum + h.count, 0);

  // "How close were your estimates" — only over the subset of this week's finished tasks
  // that actually have both a planned duration AND a real tracked time, so it's never
  // computed from a guess on either side.
  const tracked = tasksDone.filter((t) => t.duration > 0 && t.actualMinutes != null);
  const paceInsight = (() => {
    if (tracked.length === 0) return null;
    const avgRatio = tracked.reduce((sum, t) => sum + t.actualMinutes / t.duration, 0) / tracked.length;
    if (avgRatio >= 0.85 && avgRatio <= 1.15) return "Your estimates were close to how long things actually took this week.";
    if (avgRatio > 1.15) return `Tracked sessions ran about ${Math.round((avgRatio - 1) * 100)}% longer than planned this week — worth padding your estimates a little.`;
    return `Tracked sessions wrapped up about ${Math.round((1 - avgRatio) * 100)}% faster than planned this week.`;
  })();

  // Reassurance, not a guilt count: nothing due this week (or earlier, still unfinished)
  // just vanishes — it's still sitting in Tasks/Dashboard waiting, same as always.
  const today = getLocalToday();
  const stillOpen = tasks.filter((t) => !t.done && (!t.date || t.date <= today)).length;

  return (
    <ModalPortal>
    <div style={overlayStyle} onClick={onClose}>
      {isSunday && <Confetti />}
      <div style={{ ...modalStyle, width: 420, maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: serifFont, fontSize: 24, fontWeight: 500, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}><ListChecks size={20} color={PRIMARY} strokeWidth={2} /> Weekly Review</div>
        <div style={{ fontSize: 12.5, color: "#93A0AD" }}>{weekStart} to {weekEnd}</div>
        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 16 }}>No streaks, no score — just what actually happened.</div>

        {totalWins === 0 && habitStats.length === 0 ? (
          <EmptyState text="Nothing marked done this week yet. Come back once you've checked a few things off." />
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: serifFont, fontSize: 32, color: INK, lineHeight: 1 }}>{totalWins}</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{totalWins === 1 ? "thing" : "things"} finished this week</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <StatTile value={tasksDone.length} label="tasks done" />
              <StatTile value={focusedMin > 0 ? formatDuration(focusedMin) : "—"} label="focused" />
              <StatTile value={habitCheckIns} label="habit check-ins" />
            </div>

            {paceInsight && <InsightCard title="A plan that learns your pace" body={paceInsight} />}
            {stillOpen > 0 && (
              <InsightCard
                title="Nothing waiting"
                body={stillOpen === 1 ? "1 open thing still has a place — it'll keep showing up on Dashboard until it's done, nothing's lost." : `${stillOpen} open things still have a place — they'll keep showing up on Dashboard until they're done, nothing's lost.`}
              />
            )}

            {tasksDone.length > 0 && (
              <ReviewSection title={`Tasks completed (${tasksDone.length})`} items={tasksDone.map((t) => t.title)} color={TASK_COLOR} />
            )}
            {actionsDone.length > 0 && (
              <ReviewSection title={`Goal actions completed (${actionsDone.length})`} items={actionsDone.map((a) => `${a.title} · ${a.goal}`)} color={CATEGORY_COLORS.Personal} />
            )}
            {habitStats.length > 0 && (
              <ReviewSection title="Habits kept up" items={habitStats.map((h) => `${h.title} · ${h.count}x this week`)} color={HABIT_COLOR} />
            )}
          </>
        )}

        <button onClick={onClose} style={{ ...ghostBtn, width: "100%", marginTop: 12 }}>Close</button>
      </div>
    </div>
    </ModalPortal>
  );
}
