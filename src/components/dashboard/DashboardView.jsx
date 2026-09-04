import { useEffect, useMemo, useState } from "react";
import { Brain, Clock, Flame, RotateCw } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { BORDER, INK, MUTED, PRIMARY_DARK, SURFACE, serifFont } from "../../lib/constants";
import { ghostBtn, primaryBtn } from "../../lib/styles";

// Flat experiment: no white card fill/border/shadow, sections just sit directly on the
// page's own background — one continuous surface instead of white boxes on gray.
const flatSection = { background: "transparent", border: "none", borderRadius: 0, boxShadow: "none" };
// A plain hairline between sections — no fill, so it reads as a divider on the same flat
// background rather than a boxed-off panel. Applied to every section after the first one
// in each column.
const dividedSection = { ...flatSection, borderTop: `1px solid ${BORDER}`, paddingTop: 20 };
import { addDays, currentStreak as habitStreak, dayLabel, decimalToTimeLabel, defaultLeadDays, inLeadWindow, pad, startOfWeek, toISO } from "../../lib/dateHelpers";
import UrgencyBadge from "../shared/UrgencyBadge";
import Checkbox from "../shared/Checkbox";
import BrainDumpModal from "./BrainDumpModal";

// A timed task/event row in "Today's Scaffolded Steps" — a colored timeline dot (solid
// for the first/soonest item, a paler ring for the rest) connected by a line down to the
// next row, per category color. Figma's dashboard mockup carries this same treatment.
function TimelineRow({ item, col, isFirst, isLast }) {
  return (
    <div style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 14 }}>
      <div style={{ width: 62, fontSize: 11.5, color: MUTED, flexShrink: 0, paddingTop: 8 }}>{decimalToTimeLabel(item.start)}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 8, background: isFirst ? col.accent : col.bg, border: isFirst ? "none" : `1.5px solid ${col.border}` }} />
        {!isLast && <div style={{ flex: 1, width: 1.5, background: col.border, marginTop: 2 }} />}
      </div>
      <div style={{ flex: 1, background: SURFACE, borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: col.accent, textTransform: "uppercase" }}>{item.category}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
      </div>
      {item.duration != null && <div style={{ fontSize: 11, color: MUTED, flexShrink: 0, paddingTop: 8 }}>{Math.round(item.duration * 60)}m</div>}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardView({ profile, events, tasks, goals, habits, dueChips, onSetHabitDone, setView, onSelectDay, onStartFocus, onAddTask, autoOpenBrainDump, onAutoOpenBrainDumpHandled }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [focusMinutes, setFocusMinutes] = useState(
    profile?.workStyle === "Short focused bursts" ? 15 : profile?.workStyle === "Long deep sessions" ? 50 : 25
  );
  const [showBrainDump, setShowBrainDump] = useState(false);
  // Right after onboarding, the very first Dashboard visit opens Brain Dump on its own —
  // the second of the two "Up next" steps the onboarding Done screen just promised.
  useEffect(() => {
    if (autoOpenBrainDump) {
      setShowBrainDump(true);
      onAutoOpenBrainDumpHandled?.();
    }
  }, [autoOpenBrainDump, onAutoOpenBrainDumpHandled]);
  const todayISO = toISO(new Date());
  const weekStart = startOfWeek(new Date());
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const firstName = (profile?.name || "").trim().split(" ")[0];

  // Tasks always come first and are ordered by how urgent they are — a timed task is
  // more pressing the sooner today it's due, so those sort by start time ascending;
  // untimed ones (no fixed slot, so nothing to rank them against each other by) follow
  // after. Events are fixed appointments, not something to act on, so they're kept as
  // their own list below the tasks rather than interleaved by time with them.
  const todaysTimedTasks = tasks.filter((t) => t.date === todayISO && t.start != null && !t.done).sort((a, b) => a.start - b.start);
  // A plain due-dated task (no breakdown, not from Education, not recurring) shouldn't
  // just sit invisible until the exact day it's due — same "shows up early, dimmed,
  // until it's close" rule TodaySection already gives it on the Tasks page. And once its
  // due date has passed without being done, it carries forward onto today instead of
  // vanishing on a date that's scrolled by, matching the same treatment Calendar gives
  // an overdue item. Either way it lands in "Anytime today," since a specific time slot
  // from its original day doesn't apply once it's showing early or carried over.
  const todaysUntimed = [
    ...tasks.filter((t) => t.date === todayISO && t.start == null && !t.done),
    ...tasks.filter((t) => {
      if (t.done || t.groupId || t.eduId || t.isRecurring || !t.date || t.date === todayISO) return false;
      return t.date < todayISO || inLeadWindow(t.date, defaultLeadDays(t), t.done);
    }),
  ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const todaysEvents = events.filter((e) => e.date === todayISO && e.start != null).sort((a, b) => a.start - b.start);

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

  // Just real due dates here — goal deadlines/milestones/actions have their own "Goal
  // Progress" card above, so mixing them in here would just repeat that. And within
  // tasks: only a standalone one-time task or a "break it down" project's own overall
  // due date, never one of its individual steps — those are work days, not deadlines,
  // and would otherwise flood this list with entries for the same project. Education
  // items (tests, homework, assignments alike) are real deadlines and belong here too;
  // an Education-generated "work on X" session task is excluded the same way a
  // breakdown step is, for the same reason.
  const upcoming = useMemo(
    () =>
      dueChips
        .filter((c) => !c.done && c.date >= todayISO)
        .filter((c) => (c.kind === "task" && !c.groupId && !c.eduId) || c.kind === "task-group-due" || c.kind === "edu")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4),
    [dueChips, todayISO]
  );

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ ...flatSection, padding: "14px 24px 20px", marginBottom: 20, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontFamily: serifFont, fontSize: 26, color: INK, letterSpacing: -0.3 }}>
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </div>
        <button
          onClick={() => setShowBrainDump(true)}
          className="hoverable"
          style={{ ...ghostBtn, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
        >
          <Brain size={14} strokeWidth={2.2} /> Brain dump
        </button>
      </div>

      {showBrainDump && <BrainDumpModal onClose={() => setShowBrainDump(false)} onAddTask={onAddTask} tasks={tasks} events={events} />}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28, flex: 1, minHeight: 0 }} className="dashboard-grid">
        <style>{`@media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr !important; } }`}</style>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0, minHeight: 0 }}>
          <div style={{ ...flatSection, padding: "0 20px", flexShrink: 0 }}>
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
                      borderRadius: 10, background: isToday ? "#DDE1EE" : "transparent", border: `1px solid ${isToday ? "#B1BBDD" : "transparent"}`,
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

          <div style={{ ...dividedSection, padding: "20px 20px 0", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 12, flexShrink: 0 }}>Today's Scaffolded Steps</div>
            {todaysTimedTasks.length === 0 && todaysUntimed.length === 0 && todaysEvents.length === 0 ? (
              <div style={{ fontSize: 12.5, color: MUTED }}>Nothing scheduled for today yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", minHeight: 0 }}>
                {todaysTimedTasks.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {todaysTimedTasks.map((item, i) => (
                      <TimelineRow key={item.id} item={item} col={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal} isFirst={i === 0} isLast={i === todaysTimedTasks.length - 1} />
                    ))}
                  </div>
                )}
                {todaysUntimed.length > 0 && (
                  <div style={{ marginTop: todaysTimedTasks.length > 0 ? 4 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>Anytime today</div>
                    {todaysUntimed.map((t) => {
                      const col = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Personal;
                      return (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                          <div style={{ width: 6, height: 6, borderRadius: 3, background: col.border, flexShrink: 0 }} />
                          <div style={{ flex: 1, fontSize: 13, color: INK, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                          {t.date && t.date !== todayISO && (
                            <div style={{ flexShrink: 0 }}><UrgencyBadge iso={t.date} done={t.done} leadDays={defaultLeadDays(t)} /></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {todaysEvents.length > 0 && (
                  <div style={{ marginTop: todaysTimedTasks.length > 0 || todaysUntimed.length > 0 ? 4 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>Today's events</div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {todaysEvents.map((item, i) => (
                        <TimelineRow key={item.id} item={item} col={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal} isFirst={i === 0} isLast={i === todaysEvents.length - 1} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0, minHeight: 0 }}>
          <div style={{ ...flatSection, padding: "0 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontFamily: serifFont, fontSize: 21, color: INK }}>Focus Timer</div>
              <div style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0 }}>
                <Clock size={14} />
              </div>
            </div>

            <div style={{ position: "relative", width: 148, height: 148, margin: "0 auto 20px" }}>
              <svg width={148} height={148} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={74} cy={74} r={68} fill="none" stroke="#DDE1EE" strokeWidth={6} />
                <circle
                  cx={74} cy={74} r={68} fill="none" stroke={PRIMARY_DARK} strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 * 0.04}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
                <div style={{ fontFamily: serifFont, fontSize: 33, color: INK }}>{pad(focusMinutes)}:00</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: PRIMARY_DARK, textTransform: "uppercase", letterSpacing: 0.6 }}>{focusMinutes} min focus</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => onStartFocus(focusMinutes)} className="btn-primary" style={{ ...primaryBtn, flex: 1, padding: "12px 0", fontSize: 14.5 }}>
                Start
              </button>
              <button
                onClick={() => setFocusMinutes((m) => (m === 15 ? 25 : m === 25 ? 50 : 15))}
                title="Change length"
                style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${BORDER}`, background: SURFACE, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0 }}
              >
                <RotateCw size={16} />
              </button>
            </div>
          </div>

          <div style={{ ...dividedSection, padding: "20px 20px 0", flexShrink: 0 }}>
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
                <div style={{ height: 6, borderRadius: 3, background: "#DDE1EE", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${activeGoal.pct}%`, background: PRIMARY_DARK, borderRadius: 3 }} />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: MUTED }}>No goals in progress yet.</div>
            )}
          </div>

          <div style={{ ...dividedSection, padding: "20px 20px 0", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
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

          <div style={{ ...dividedSection, padding: "20px 20px 0", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
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
                        {label && <div style={{ fontSize: 10, fontWeight: 700, color: col?.accent || PRIMARY_DARK, textTransform: "uppercase" }}>{label}</div>}
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
