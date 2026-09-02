import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { BORDER, INK, MUTED, PRIMARY_DARK, cardStyle, serifFont } from "../../lib/constants";
import { deleteBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { AddRow, EmptyState } from "../shared/Misc";
import { addDays, currentStreak, dayLabel, startOfWeek, toISO } from "../../lib/dateHelpers";
import HabitHistoryModal from "./HabitHistoryModal";

const STREAK_BG = "#DBEAFE";
const DONE_BG = "rgba(37,99,235,0.1)";

const navBtnStyle = {
  width: 26, height: 26, borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0,
};

export default function HabitsView({ habits, onAddHabit, onRemoveHabit, onSetDone }) {
  const [title, setTitle] = useState("");
  const [historyHabitId, setHistoryHabitId] = useState(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const todayISO = toISO(new Date());
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const addHabit = (t) => {
    onAddHabit(t !== undefined ? t : title);
    if (t === undefined) setTitle("");
  };

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
            <span style={{ fontSize: 12, fontWeight: 700, color: PRIMARY_DARK }}>Weekly Completion:</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: INK }}>{weeklyPct}%</span>
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
                      background: isToday ? "rgba(26,26,46,0.08)" : "transparent",
                      border: `1px solid ${isToday ? "rgba(26,26,46,0.25)" : "transparent"}`,
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED }}>{dayLabel(d).slice(0, 3).toUpperCase()}</div>
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
                  style={{ ...cardStyle, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
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
                        <span style={{ fontSize: 10, fontWeight: 800, color: INK }}>{streak} day streak</span>
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
                            border: done ? `2px solid ${PRIMARY_DARK}` : `1.5px solid ${BORDER}`,
                          }}
                        >
                          {done ? <Check size={14} color={PRIMARY_DARK} strokeWidth={3} /> : <div style={{ width: 6, height: 6, borderRadius: 3, background: BORDER }} />}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => onRemoveHabit(h.id)} className="btn-delete" style={deleteBtn}>×</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {historyHabit && (
        <HabitHistoryModal habit={historyHabit} onSetDone={onSetDone} onClose={() => setHistoryHabitId(null)} />
      )}
    </div>
  );
}
