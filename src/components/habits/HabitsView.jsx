import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flame, Shuffle } from "lucide-react";
import { BORDER, INK, MUTED, PRIMARY, PRIMARY_DARK, SECONDARY, SUGGESTED_HABITS, cardStyle, monoFont, serifFont } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle, primaryBtn, suggestionChip } from "../../lib/styles";
import { AddRow, EmptyState } from "../shared/Misc";
import { addDays, currentStreak, dayLabel, startOfWeek, toISO } from "../../lib/dateHelpers";
import HabitHistoryModal from "./HabitHistoryModal";

const SUGGESTIONS_SHOWN = 6;
const STREAK_BG = "#CDE2F5";
const DONE_BG = "rgba(89,87,177,0.1)";

const navBtnStyle = {
  width: 26, height: 26, borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0,
};

export default function HabitsView({ habits, onAddHabit, onRemoveHabit, onSetDone }) {
  const [title, setTitle] = useState("");
  const [historyHabitId, setHistoryHabitId] = useState(null);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const todayISO = toISO(new Date());
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

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

  const totalCells = habits.length * 7;
  const doneCells = habits.reduce((sum, h) => sum + weekDays.filter((d) => h.doneDates.includes(toISO(d))).length, 0);
  const weeklyPct = totalCells > 0 ? Math.round((doneCells / totalCells) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 2 }}>
        <div style={{ fontFamily: serifFont, fontSize: 40, color: INK }}>Habits</div>
        {habits.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: monoFont, fontSize: 12, fontWeight: 700, color: PRIMARY_DARK }}>Weekly Completion:</span>
            <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 800, color: INK }}>{weeklyPct}%</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13.5, color: MUTED, marginBottom: 20 }}>Progress over perfection. Missing a day doesn't reset anything.</div>

      <div data-tour="habits-add">
        <AddRow>
          <input placeholder="Add a custom habit..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addHabit()} />
          <button onClick={() => addHabit()} className="btn-primary" style={primaryBtn}>Add</button>
        </AddRow>
      </div>

      {available.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 20 }}>
          <span style={{ fontSize: 11.5, color: MUTED, alignSelf: "center", marginRight: 2 }}>Suggested:</span>
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
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button onClick={() => setWeekStart((w) => addDays(w, -7))} title="Previous week" style={navBtnStyle}><ChevronLeft size={14} /></button>
            <div style={{ flex: "1 1 200px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, flex: "3 1 320px" }}>
              {weekDays.map((d) => {
                const iso = toISO(d);
                const isToday = iso === todayISO;
                return (
                  <div
                    key={iso}
                    style={{
                      textAlign: "center", padding: "6px 2px", borderRadius: 10,
                      background: isToday ? "rgba(42,42,53,0.08)" : "transparent",
                      border: `1px solid ${isToday ? "rgba(42,42,53,0.25)" : "transparent"}`,
                    }}
                  >
                    <div style={{ fontFamily: monoFont, fontSize: 10.5, fontWeight: 700, color: MUTED }}>{dayLabel(d).slice(0, 3).toUpperCase()}</div>
                    <div style={{ fontFamily: serifFont, fontSize: 20, color: INK }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setWeekStart((w) => addDays(w, 7))} title="Next week" style={navBtnStyle}><ChevronRight size={14} /></button>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: 14 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {habits.map((h) => {
              const streak = currentStreak(h.doneDates);
              return (
                <div
                  key={h.id}
                  className="hoverable"
                  style={{ ...cardStyle, border: `1px solid ${SECONDARY}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
                >
                  <button
                    onClick={() => setHistoryHabitId(h.id)}
                    title="View history"
                    style={{ flex: "1 1 200px", textAlign: "left", background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", gap: 5, cursor: "pointer" }}
                  >
                    <div style={{ fontFamily: serifFont, fontSize: 20, color: INK }}>{h.title}</div>
                    {streak > 0 && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: STREAK_BG, borderRadius: 20, padding: "2px 8px", width: "fit-content" }}>
                        <Flame size={10} color={INK} fill={INK} strokeWidth={0} />
                        <span style={{ fontFamily: monoFont, fontSize: 10, fontWeight: 800, color: INK }}>{streak} day streak</span>
                      </div>
                    )}
                  </button>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, flex: "3 1 320px" }}>
                    {weekDays.map((d) => {
                      const iso = toISO(d);
                      const done = h.doneDates.includes(iso);
                      return (
                        <button
                          key={iso}
                          onClick={() => onSetDone(h.id, iso, !done)}
                          title={iso}
                          style={{
                            height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                            background: done ? DONE_BG : "transparent",
                            border: done ? `2px solid ${PRIMARY}` : `1.5px solid ${SECONDARY}`,
                          }}
                        >
                          {done ? <Check size={14} color={PRIMARY_DARK} strokeWidth={3} /> : <div style={{ width: 6, height: 6, borderRadius: 3, background: SECONDARY }} />}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => onRemoveHabit(h.id)} className="btn-delete" style={deleteBtn}>×</button>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
            <div style={{ fontFamily: serifFont, fontStyle: "italic", fontSize: 18, color: PRIMARY, opacity: 0.7 }}>
              every check counts. no streaks lost here, just fresh starts.
            </div>
          </div>
        </>
      )}

      {historyHabit && (
        <HabitHistoryModal habit={historyHabit} onSetDone={onSetDone} onClose={() => setHistoryHabitId(null)} />
      )}
    </div>
  );
}
