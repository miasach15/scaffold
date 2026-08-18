import { useMemo, useState } from "react";
import { Repeat, History, Shuffle } from "lucide-react";
import { HABIT_COLOR, SUGGESTED_HABITS, cardStyle } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle, primaryBtn, suggestionChip } from "../../lib/styles";
import { AddRow, EmptyState, SectionHeader } from "../shared/Misc";
import Swatch from "../shared/Swatch";
import { toISO } from "../../lib/dateHelpers";
import HabitHistoryModal from "./HabitHistoryModal";

const SUGGESTIONS_SHOWN = 6;

export default function HabitsView({ habits, onAddHabit, onRemoveHabit, onSetDoneToday, onSetDone }) {
  const [title, setTitle] = useState("");
  const [historyHabitId, setHistoryHabitId] = useState(null);
  const [shuffleKey, setShuffleKey] = useState(0);
  const todayISO = toISO(new Date());

  const addHabit = (t) => {
    onAddHabit(t !== undefined ? t : title);
    if (t === undefined) setTitle("");
  };

  const addedTitles = new Set(habits.map((h) => h.title.toLowerCase()));
  const pool = SUGGESTED_HABITS.filter((s) => !addedTitles.has(s.toLowerCase()));
  const available = useMemo(() => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, SUGGESTIONS_SHOWN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleKey, pool.length]);
  const historyHabit = habits.find((h) => h.id === historyHabitId) || null;

  return (
    <div>
      <SectionHeader title="Habits" subtitle="Progress over perfection. Missing a day doesn't reset anything." Icon={Repeat} tint={HABIT_COLOR} />

      <div data-tour="habits-add">
        <AddRow>
          <input placeholder="Add a custom habit..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addHabit()} />
          <button onClick={() => addHabit()} className="btn-primary" style={primaryBtn}>Add</button>
        </AddRow>
      </div>

      {available.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 20 }}>
          <span style={{ fontSize: 11.5, color: "#B4BCC5", alignSelf: "center", marginRight: 2 }}>Suggested:</span>
          {available.map((s) => (
            <button key={s} onClick={() => addHabit(s)} style={suggestionChip}>+ {s}</button>
          ))}
          {pool.length > SUGGESTIONS_SHOWN && (
            <button
              onClick={() => setShuffleKey((k) => k + 1)}
              title="Show different suggestions"
              style={{ ...ghostBtn, padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5 }}
            >
              <Shuffle size={12} strokeWidth={2.3} /> Shuffle
            </button>
          )}
        </div>
      )}

      {habits.length === 0 ? (
        <EmptyState text="No habits in your list yet. Add one above or tap a suggestion." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {habits.map((h) => {
            const doneToday = h.doneDates.includes(todayISO);
            return (
              <div key={h.id} className="hoverable" style={{ ...cardStyle, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <Swatch color={doneToday ? HABIT_COLOR : { bg: "#F1F3F5", border: "#DCE1E6" }} />
                <button
                  onClick={() => setHistoryHabitId(h.id)}
                  title="View history"
                  style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0 }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{h.title}</div>
                  <div style={{ fontSize: 11.5, color: "#8B95A1", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                    <History size={11} strokeWidth={2.3} /> {h.doneDates.length} day{h.doneDates.length === 1 ? "" : "s"} total — view history
                  </div>
                </button>
                <button
                  data-tour="habits-markdone"
                  onClick={() => onSetDoneToday(h.id, !doneToday)}
                  style={{
                    padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                    border: `1.5px solid ${doneToday ? HABIT_COLOR.border : "#E2E8F0"}`,
                    background: doneToday ? HABIT_COLOR.bg : "#fff",
                    color: doneToday ? HABIT_COLOR.text : "#8A93A0",
                  }}
                >
                  {doneToday ? "✓ Done today" : "Mark done"}
                </button>
                <button onClick={() => onRemoveHabit(h.id)} className="btn-delete" style={deleteBtn}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {historyHabit && (
        <HabitHistoryModal habit={historyHabit} onSetDone={onSetDone} onClose={() => setHistoryHabitId(null)} />
      )}
    </div>
  );
}
