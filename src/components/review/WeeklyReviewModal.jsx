import { ListChecks } from "lucide-react";
import { EDU_TYPE_COLORS, HABIT_COLOR, PRIMARY, TASK_COLOR, serifFont } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { addDays, startOfWeek, toISO } from "../../lib/dateHelpers";
import { ghostBtn, modalStyle, overlayStyle } from "../../lib/styles";
import { EmptyState } from "../shared/Misc";

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

export default function WeeklyReviewModal({ tasks, goals, habits, eduItems, journalEntries, onClose }) {
  const CATEGORY_COLORS = useCategoryColors();
  const weekStart = toISO(startOfWeek(new Date()));
  const weekEnd = toISO(addDays(startOfWeek(new Date()), 6));
  const inWeek = (iso) => iso && iso >= weekStart && iso <= weekEnd;

  const tasksDone = tasks.filter((t) => t.done && inWeek(t.date));
  const eduDone = eduItems.filter((e) => e.done && inWeek(e.dueDate));
  const actionsDone = [];
  goals.forEach((g) => g.milestones.forEach((m) => m.actions.forEach((a) => {
    if (a.done && inWeek(a.dueDate)) actionsDone.push({ goal: g.title, title: a.title });
  })));
  const habitStats = habits.map((h) => ({ title: h.title, count: h.doneDates.filter((d) => inWeek(d)).length })).filter((h) => h.count > 0);
  const entriesThisWeek = journalEntries.filter((e) => inWeek(e.date));

  const totalWins = tasksDone.length + eduDone.length + actionsDone.length;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 420, maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: serifFont, fontSize: 24, fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}><ListChecks size={20} color={PRIMARY} strokeWidth={2} /> Weekly Review</div>
        <div style={{ fontSize: 12.5, color: "#93A0AD", marginBottom: 16 }}>{weekStart} to {weekEnd}</div>

        {totalWins === 0 && habitStats.length === 0 && entriesThisWeek.length === 0 ? (
          <EmptyState text="Nothing marked done this week yet. Come back once you've checked a few things off." />
        ) : (
          <>
            {tasksDone.length > 0 && (
              <ReviewSection title={`Tasks completed (${tasksDone.length})`} items={tasksDone.map((t) => t.title)} color={TASK_COLOR} />
            )}
            {actionsDone.length > 0 && (
              <ReviewSection title={`Goal actions completed (${actionsDone.length})`} items={actionsDone.map((a) => `${a.title} — ${a.goal}`)} color={CATEGORY_COLORS.Personal} />
            )}
            {eduDone.length > 0 && (
              <ReviewSection title={`Education items completed (${eduDone.length})`} items={eduDone.map((e) => `${e.type}: ${e.title}`)} color={EDU_TYPE_COLORS.Assignment} />
            )}
            {habitStats.length > 0 && (
              <ReviewSection title="Habits kept up" items={habitStats.map((h) => `${h.title} — ${h.count}x this week`)} color={HABIT_COLOR} />
            )}
            {entriesThisWeek.length > 0 && (
              <div style={{ fontSize: 13, color: "#5A6472", marginBottom: 6 }}>{entriesThisWeek.length} journal {entriesThisWeek.length === 1 ? "entry" : "entries"} written this week.</div>
            )}
          </>
        )}

        <button onClick={onClose} style={{ ...ghostBtn, width: "100%", marginTop: 12 }}>Close</button>
      </div>
    </div>
  );
}
