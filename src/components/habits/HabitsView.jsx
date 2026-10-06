import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { BORDER, INK, MUTED, PRIMARY_DARK, SUGGESTED_HABITS, serifFont } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle, primaryBtn, suggestionChip } from "../../lib/styles";
import { AddRow, EmptyState, SectionHeader } from "../shared/Misc";
import { addDays, currentStreak, dayLabel, startOfWeek, toISO } from "../../lib/dateHelpers";
import HabitHistoryModal from "./HabitHistoryModal";

const SUGGESTIONS_CAP = 8; // the full list is 30+ — a wall of chips isn't a suggestion, it's a chore

const navBtnStyle = {
  width: 26, height: 26, borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0,
};

// A warm paper-and-ink ledger instead of the app's usual lavender/white cards — filled
// vs. hollow dots in thin-ruled rows, like a printed habit tracker. Scoped to this one
// table (cream background, a warmer neutral border) rather than changing the shared
// BORDER/SURFACE tokens everywhere else.
const PAPER = "#FBF7EE";
const INK_BORDER = "#DED5C2";

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
          <input placeholder="Add a custom habit..." aria-label="New habit" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addHabit()} />
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button onClick={() => setWeekStart((w) => addDays(w, -7))} title="Previous week" style={navBtnStyle}><ChevronLeft size={14} /></button>
            <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic", fontFamily: serifFont }}>
              Week of {weekDays[0].toLocaleDateString(undefined, { month: "long", day: "numeric" })}
            </div>
            <button onClick={() => setWeekStart((w) => addDays(w, 7))} title="Next week" style={navBtnStyle}><ChevronRight size={14} /></button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <div style={{ background: PAPER, border: `1px solid ${INK_BORDER}`, borderRadius: 3, minWidth: 560 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 260px) repeat(7, 52px)", borderBottom: `1px solid ${INK_BORDER}` }}>
                <div style={{ padding: "12px 18px", fontFamily: serifFont, fontSize: 12.5, fontStyle: "italic", color: MUTED }}>Habit</div>
                {weekDays.map((d) => {
                  const iso = toISO(d);
                  const isToday = iso === todayISO;
                  return (
                    <div key={iso} style={{ textAlign: "center", padding: "10px 4px", borderLeft: `1px solid ${INK_BORDER}` }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, color: isToday ? INK : MUTED, textTransform: "uppercase" }}>{dayLabel(d).slice(0, 2)}</div>
                      <div style={{ fontFamily: serifFont, fontSize: 14, color: isToday ? INK : MUTED, marginTop: 1 }}>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {habits.map((h, i) => {
                const streak = currentStreak(h.doneDates);
                return (
                  <div
                    key={h.id}
                    className="habit-row"
                    style={{ display: "grid", gridTemplateColumns: "minmax(140px, 260px) repeat(7, 52px)", borderBottom: i === habits.length - 1 ? "none" : `1px solid ${INK_BORDER}` }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 10px 18px", minWidth: 0 }}>
                      <button
                        onClick={() => setHistoryHabitId(h.id)}
                        title="View history"
                        style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "baseline", gap: 7 }}
                      >
                        <span style={{ fontFamily: serifFont, fontSize: 15, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</span>
                        {streak > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                            <Flame size={9} color={MUTED} fill={MUTED} strokeWidth={0} />
                            <span style={{ fontSize: 10, fontStyle: "italic", color: MUTED, fontFamily: serifFont }}>{streak}d</span>
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => onRemoveHabit(h.id)}
                        className="habit-row-delete"
                        style={{ ...deleteBtn, flexShrink: 0, opacity: 0, transition: "opacity .15s" }}
                      >
                        ×
                      </button>
                    </div>
                    {weekDays.map((d) => {
                      const iso = toISO(d);
                      const done = h.doneDates.includes(iso);
                      return (
                        <button
                          key={iso}
                          onClick={() => onSetDone(h.id, iso, !done)}
                          title={iso}
                          className="habit-dot-btn"
                          style={{
                            borderLeft: `1px solid ${INK_BORDER}`, background: "none", border: "none", borderLeftWidth: 1, borderLeftStyle: "solid", borderLeftColor: INK_BORDER,
                            display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0", cursor: "pointer", outline: "none",
                          }}
                        >
                          <span
                            style={{
                              width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                              border: `1.5px solid ${INK}`,
                              background: done ? INK : "transparent",
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <style>{`
            .habit-row:hover .habit-row-delete { opacity: 1 !important; }
            .habit-dot-btn:focus-visible span { box-shadow: 0 0 0 2px ${PAPER}, 0 0 0 3.5px ${INK}; }
          `}</style>
        </>
      )}

      {historyHabit && (
        <HabitHistoryModal habit={historyHabit} onSetDone={onSetDone} onClose={() => setHistoryHabitId(null)} />
      )}
    </div>
  );
}
