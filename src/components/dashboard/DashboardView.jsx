import { useMemo, useState } from "react";
import { Clock, Flame, RotateCw } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { BORDER, INK, MUTED, PRIMARY_DARK, cardStyle, serifFont } from "../../lib/constants";
import { primaryBtn } from "../../lib/styles";
import { addDays, currentStreak as habitStreak, dayLabel, decimalToTimeLabel, pad, startOfWeek, toISO } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardView({ profile, events, tasks, goals, habits, dueChips, onSetHabitDone, setView, onSelectDay, onStartFocus }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [focusMinutes, setFocusMinutes] = useState(
    profile?.workStyle === "Short focused bursts" ? 15 : profile?.workStyle === "Long deep sessions" ? 50 : 25
  );
  const todayISO = toISO(new Date());
  const weekStart = startOfWeek(new Date());
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const firstName = (profile?.name || "").trim().split(" ")[0];

  const todaysEvents = events.filter((e) => e.date === todayISO && e.start != null);
  const todaysTimedTasks = tasks.filter((t) => t.date === todayISO && t.start != null && !t.done);
  const todaysUntimed = tasks.filter((t) => t.date === todayISO && t.start == null && !t.done);
  const timeline = [...todaysEvents, ...todaysTimedTasks].sort((a, b) => a.start - b.start);

  const activeGoal = useMemo(() => {
    const withProgress = goals
      .map((g) => {
        const actions = g.milestones.flatMap((m) => m.actions);
        const done = actions.filter((a) => a.done).length;
        const total = actions.length;
        return { goal: g, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
      })
      .filter((g) => g.total > 0 && g.pct < 100);
    if (withProgress.length === 0) return null;
    return withProgress.sort((a, b) => b.pct - a.pct)[0];
  }, [goals]);

  const upcoming = useMemo(
    () => dueChips.filter((c) => !c.done && c.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4),
    [dueChips, todayISO]
  );

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ ...cardStyle, padding: "14px 24px", marginBottom: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: serifFont, fontSize: 26, color: INK, letterSpacing: -0.3 }}>
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </div>
        <div style={{ display: "inline-flex", background: "#EFF6FF", color: PRIMARY_DARK, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" }}>
          Ready to build?
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, flex: 1, minHeight: 0 }} className="dashboard-grid">
        <style>{`@media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr !important; } }`}</style>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, minHeight: 0 }}>
          <div style={{ ...cardStyle, padding: "14px 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>This week</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {weekDays.map((d) => {
                const iso = toISO(d);
                const isToday = iso === todayISO;
                return (
                  <button
                    key={iso}
                    onClick={() => { onSelectDay(iso); setView("calendar"); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 2px",
                      borderRadius: 10, background: isToday ? "#EFF6FF" : "transparent", border: `1px solid ${isToday ? "#BFDBFE" : "transparent"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED }}>{dayLabel(d).slice(0, 1).toUpperCase()}</div>
                    <div style={{ fontFamily: serifFont, fontSize: 19, color: isToday ? PRIMARY_DARK : INK }}>{d.getDate()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 20, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 12, flexShrink: 0 }}>Today's Scaffolded Steps</div>
            {timeline.length === 0 && todaysUntimed.length === 0 ? (
              <div style={{ fontSize: 12.5, color: MUTED }}>Nothing scheduled for today yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", minHeight: 0 }}>
                {timeline.map((item) => {
                  const col = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal;
                  return (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 62, fontSize: 11.5, color: MUTED, flexShrink: 0 }}>{decimalToTimeLabel(item.start)}</div>
                      <div style={{ flex: 1, background: "#F5F7FA", borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: col.text, textTransform: "uppercase" }}>{item.category}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                      </div>
                      {item.duration != null && <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{Math.round(item.duration * 60)}m</div>}
                    </div>
                  );
                })}
                {todaysUntimed.length > 0 && (
                  <div style={{ marginTop: timeline.length > 0 ? 4 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>Anytime today</div>
                    {todaysUntimed.map((t) => {
                      const col = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal;
                      return (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                          <div style={{ width: 6, height: 6, borderRadius: 3, background: col.border, flexShrink: 0 }} />
                          <div style={{ fontSize: 13, color: INK }}>{t.title}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, minHeight: 0 }}>
          <div style={{ ...cardStyle, padding: "16px 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontFamily: serifFont, fontSize: 18, color: INK }}>Focus Timer</div>
              <div style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0 }}>
                <Clock size={13} />
              </div>
            </div>

            <div style={{ position: "relative", width: 108, height: 108, margin: "0 auto 12px" }}>
              <svg width={108} height={108} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={54} cy={54} r={46} fill="none" stroke="#EFEAE3" strokeWidth={10} />
                <circle
                  cx={54} cy={54} r={46} fill="none" stroke={PRIMARY_DARK} strokeWidth={10} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46} strokeDashoffset={2 * Math.PI * 46 * 0.04}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                <div style={{ fontFamily: serifFont, fontSize: 24, color: INK }}>{pad(focusMinutes)}:00</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: PRIMARY_DARK, textTransform: "uppercase", letterSpacing: 0.5 }}>{focusMinutes} min focus</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onStartFocus(focusMinutes)} className="btn-primary" style={{ ...primaryBtn, flex: 1, padding: "9px 0", fontSize: 13 }}>
                Start
              </button>
              <button
                onClick={() => setFocusMinutes((m) => (m === 15 ? 25 : m === 25 ? 50 : 15))}
                title="Change length"
                style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0 }}
              >
                <RotateCw size={14} />
              </button>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: "14px 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>Goal Progress</div>
              <button onClick={() => setView("goals")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: PRIMARY_DARK, padding: 0 }}>View All</button>
            </div>
            {activeGoal ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeGoal.goal.title}</div>
                  <div style={{ fontWeight: 700, color: PRIMARY_DARK, flexShrink: 0, marginLeft: 8 }}>{activeGoal.pct}%</div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#DBEAFE", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${activeGoal.pct}%`, background: PRIMARY_DARK, borderRadius: 3 }} />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: MUTED }}>No goals in progress yet.</div>
            )}
          </div>

          <div style={{ ...cardStyle, padding: 20, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 10, flexShrink: 0 }}>Habits Checklist</div>
            {habits.length === 0 ? (
              <div style={{ fontSize: 12.5, color: MUTED }}>No habits yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", minHeight: 0 }}>
                {habits.map((h) => {
                  const done = h.doneDates.includes(todayISO);
                  const streak = habitStreak(h.doneDates);
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Checkbox checked={done} onClick={() => onSetHabitDone(h.id, todayISO, !done)} color={{ border: PRIMARY_DARK }} />
                      <div style={{ flex: 1, fontSize: 13, color: done ? MUTED : INK, textDecoration: done ? "line-through" : "none" }}>{h.title}</div>
                      {streak > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3, color: MUTED, fontSize: 10.5, flexShrink: 0 }}>
                          <Flame size={10} color={PRIMARY_DARK} fill={PRIMARY_DARK} strokeWidth={0} /> {streak}d
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, padding: 20, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 10, flexShrink: 0 }}>Coming Up</div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 12.5, color: MUTED }}>Nothing due soon.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", minHeight: 0 }}>
                {upcoming.map((c) => {
                  const label = c.subject || c.category;
                  const col = label ? CATEGORY_COLORS[label] || CATEGORY_COLORS.Personal : null;
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        {label && <div style={{ fontSize: 10, fontWeight: 700, color: col?.text || PRIMARY_DARK, textTransform: "uppercase" }}>{label}</div>}
                        <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                      </div>
                      <div style={{ flexShrink: 0 }}><UrgencyBadge iso={c.date} done={c.done} leadDays={2} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
