import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { BORDER, INK, MUTED, PRIMARY_DARK, SUGGESTED_HABITS, serifFont } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle, primaryBtn, suggestionChip } from "../../lib/styles";
import { AddRow, EmptyState, SectionHeader } from "../shared/Misc";
import { addDays, currentStreak, dayLabel, startOfWeek, toISO } from "../../lib/dateHelpers";
import HabitHistoryModal from "./HabitHistoryModal";

const STREAK_BG = "#DDE1EE";
const DONE_BG = "rgba(74,91,168,0.1)";
const SUGGESTIONS_CAP = 8; // the full list is 30+ — a wall of chips isn't a suggestion, it's a chore

const navBtnStyle = {
  width: 26, height: 26, borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0,
};

export default function HabitsView({ habits, onAddHabit, onRemoveHabit, onSetDone }) {
  const [title, setTitle] = useState("");
  const [historyHabitId, setHistoryHabitId] = useState(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const todayISO = toISO(new Date());
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const addHabit = (t) => {
    onAddHabit(t !== undefined ? t : title);
    if (t === undefined) setTitle("");
  };

  // Whatever's already in the list doesn't need suggesting again.
  const availableSuggestions = useMemo(
    () => SUGGESTED_HABITS.filter((h) => !habits.some((x) => x.title === h)),
    [habits]
  );
  const visibleSuggestions = showAllSuggestions ? availableSuggestions : availableSuggestions.slice(0, SUGGESTIONS_CAP);

  const historyHabit = habits.find((h) => h.id === historyHabitId) || null;

  const totalCells = habits.length * 7;
  const doneCells = habits.reduce((sum, h) => sum + weekDays.filter((d) => h.doneDates.includes(toISO(d))).length, 0);
  const weeklyPct = totalCells > 0 ? Math.round((doneCells / totalCells) * 100) : 0;

  return (
    <div>
      <SectionHeader
        title="Habits"
        subtitle="Progress over perfection — missing a day doesn't reset anything."
        right={habits.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: PRIMARY_DARK }}>Weekly Completion:</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: INK }}>{weeklyPct}%</span>
          </div>
        )}
      />

      <div data-tour="habits-add">
        <AddRow>
          <input placeholder="Add a custom habit..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addHabit()} />
          <button onClick={() => addHabit()} className="btn-primary" style={primaryBtn}>Add</button>
        </AddRow>
      </div>

      {availableSuggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {visibleSuggestions.map((h) => (
            <button key={h} onClick={() => addHabit(h)} className="hoverable" style={suggestionChip}>+ {h}</button>
          ))}
          {!showAllSuggestions && availableSuggestions.length > SUGGESTIONS_CAP && (
            <button onClick={() => setShowAllSuggestions(true)} className="hoverable" style={{ ...ghostBtn, padding: "5px 11px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <ChevronDown size={12} strokeWidth={2.5} /> {availableSuggestions.length - SUGGESTIONS_CAP} more
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

          <div style={{ display: "flex", flexDirection: "column" }}>
            {habits.map((h, i) => {
              const streak = currentStreak(h.doneDates);
              return (
                <div
                  key={h.id}
                  className="hoverable"
                  style={{
                    borderTop: i === 0 ? "none" : `1px solid ${BORDER}`, padding: "16px 0",
                    display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                  }}
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
