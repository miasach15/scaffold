import { useEffect, useState } from "react";
import { BatteryLow, Clock, Play, Sparkles } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { EDU_TYPE_COLORS, cardStyle, serifFont } from "../../lib/constants";
import { addDays, daysUntil, defaultLeadDays, inLeadWindow, toISO } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";
import WhatNowModal from "./WhatNowModal";

const VISIBLE_CAP = 5; // more than this and it stops being a glance — collapse the rest behind "Show more"
const LOW_ENERGY_KEY = "scaffold-low-energy";

// A deliberately calm, low-chrome view of what's on your plate — no category cycling,
// no delete buttons, nothing but a checkbox and a title. How something ends up here,
// and whether it's bold or dimmed:
//   1. No due date at all — persists every day, dimmed, until you finish it. No due date
//      means no urgency to signal, so it never bolds on its own.
//   2. A plain due date (no breakdown) — persists every day too (defaultLeadDays), dimmed
//      until today falls within its urgency window (2 days by default, or "days needed"
//      if you set one), then bolds with an "Urgent"/"Overdue" tag.
//   3. A "break it down" task (has multiple steps) — persists every day as ONE row for
//      the whole project, always bold, showing how many steps are left and what's next.
//      A multi-step project deserves daily attention regardless of how many days remain,
//      unlike a single plain task. Checking it off completes the next remaining step.
//   4. An Education deadline or goal action — only shows up once actually due/overdue
//      (today or earlier); these already have their own per-day/per-deadline scheduling.
// The full Tasks list below has all the editing controls; this is just the glance one.
export default function TodaySection({ tasks, onToggleDone, onOpenDetail, onOpenFocus, onSetDate, eduItems, onSetEduDone, onGoToEducation, goalChips, onToggleGoalChip, onGoToGoals }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [expanded, setExpanded] = useState(false);
  const [whatNowOpen, setWhatNowOpen] = useState(false);
  // Persisted, not just session state — a low-energy day doesn't end when you close a
  // tab, so this should still be on next time you open the app rather than silently
  // reverting and putting the big stuff back in front of you.
  const [lowEnergy, setLowEnergy] = useState(() => {
    try {
      return localStorage.getItem(LOW_ENERGY_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LOW_ENERGY_KEY, lowEnergy ? "1" : "0");
    } catch {
      /* private-browsing or storage disabled — just won't persist across reloads */
    }
  }, [lowEnergy]);
  const todayISO = toISO(new Date());
  const tomorrowISO = toISO(addDays(new Date(), 1));
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  // Only a task/step you own gets a "Not today" button — pushing its date forward is
  // safe since it's self-imposed. Education deadlines and goal actions are external
  // commitments; snoozing those would just be lying to yourself about when they're due,
  // so they don't get one.
  const taskItems = tasks
    .filter((t) => !t.done && !t.groupId && (!t.date || defaultLeadDays(t) || t.date <= todayISO))
    .map((t) => ({
      id: t.id, title: t.title, date: t.date, leadDays: defaultLeadDays(t), isGroup: false, focusId: t.id,
      col: CATEGORY_COLORS[t.category || "Personal"] || CATEGORY_COLORS.Personal,
      onToggle: () => onToggleDone(t.id, true), onOpen: () => onOpenDetail(t.id),
      onSnooze: t.date && onSetDate ? () => onSetDate(t.id, tomorrowISO) : null,
    }));

  // A "break it down" task always has 2+ steps (a single-step breakdown never gets
  // grouped in the first place — see confirmPlan), so every group here genuinely has
  // "multiple subtasks" and stays bold the whole time it's active, not just near its due
  // date. Shown as one row for the whole project; checking it off completes the earliest
  // remaining step, and the sublabel names what that step is. Snoozing pushes just that
  // next step's work day forward, not the project's own due date.
  const byGroup = {};
  tasks.forEach((t) => {
    if (!t.groupId || t.done) return;
    (byGroup[t.groupId] ||= []).push(t);
  });
  const groupItems = Object.entries(byGroup).map(([groupId, steps]) => {
    const remaining = steps.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const next = remaining[0];
    const groupTitle = steps.find((s) => s.groupTitle)?.groupTitle || next.title;
    const groupDueDate = steps.find((s) => s.groupDueDate)?.groupDueDate || null;
    return {
      id: `group-${groupId}`, title: groupTitle, date: groupDueDate, leadDays: null, isGroup: true, focusId: next.id,
      subLabel: `${remaining.length} step${remaining.length === 1 ? "" : "s"} left${next.date ? ` · next: ${next.title}` : ""}`,
      col: CATEGORY_COLORS[next.category || "Personal"] || CATEGORY_COLORS.Personal,
      onToggle: () => onToggleDone(next.id, true), onOpen: () => onOpenDetail(next.id),
      onSnooze: next.date && onSetDate ? () => onSetDate(next.id, tomorrowISO) : null,
    };
  });

  // Education deadlines and goal actions aren't real Tasks rows, so there's no Focus
  // Timer target for them (focusId stays null — no Start button shows for these).
  const eduDeadlineItems = (eduItems || [])
    .filter((e) => !e.done && e.dueDate && e.dueDate <= todayISO)
    .map((e) => ({ id: `edu-${e.id}`, title: e.title, date: e.dueDate, leadDays: null, isGroup: false, focusId: null, onSnooze: null, col: EDU_TYPE_COLORS[e.type] || EDU_TYPE_COLORS.Homework, onToggle: () => onSetEduDone(e.id, true), onOpen: onGoToEducation }));

  const goalItems = (goalChips || [])
    .filter((c) => !c.done && c.date && c.date <= todayISO)
    .map((c) => ({ id: `goal-${c.id}`, title: c.title, date: c.date, leadDays: null, isGroup: false, focusId: null, onSnooze: null, col: CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Personal, onToggle: () => onToggleGoalChip(c), onOpen: onGoToGoals }));

  // Ordered by actual urgency, not just raw date order — overdue first, then due today,
  // then anything in its urgent window (including a multi-step group, which is always
  // "active" regardless of how far its due date is), then everything else with a date
  // that isn't urgent yet, then undated reminders last. Within a tier, soonest date first.
  const urgencyTier = (it) => {
    const overdue = it.date && it.date < todayISO;
    const dueToday = it.date === todayISO;
    const urgent = it.isGroup || inLeadWindow(it.date, it.leadDays, false);
    if (overdue) return 0;
    if (dueToday) return 1;
    if (urgent) return 2;
    if (it.date) return 3;
    return 4;
  };
  const sortedAll = [...taskItems, ...groupItems, ...eduDeadlineItems, ...goalItems].sort((a, b) => {
    const diff = urgencyTier(a) - urgencyTier(b);
    if (diff !== 0) return diff;
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
  // Low energy mode hides multi-step projects specifically — a group is guaranteed 2+
  // steps by construction (see confirmPlan), so it's the one category that's honestly
  // never "quick." Nothing that's actually due gets hidden — this only trims what's
  // heaviest, not what's real.
  const allRelevant = lowEnergy ? sortedAll.filter((it) => !it.isGroup) : sortedAll;
  const relevant = expanded ? allRelevant : allRelevant.slice(0, VISIBLE_CAP);
  const hiddenCount = allRelevant.length - relevant.length;
  const hiddenForEnergy = lowEnergy ? sortedAll.length - allRelevant.length : 0;

  return (
    <div style={{ ...cardStyle, padding: "26px 28px", marginBottom: 22, boxShadow: "0 4px 18px rgba(15,23,42,0.04)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: serifFont, fontSize: 26, fontWeight: 500, color: "#000000" }}>Today</div>
          <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 20 }}>{dateLabel}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setLowEnergy((x) => !x)}
            className="hoverable"
            title="Hides multi-step projects — just the quick, one-shot stuff for a day when even small things feel big"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "7px 12px 7px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              background: lowEnergy ? "var(--primary-tint, #E7E3FC)" : "#fff",
              border: `1.5px solid ${lowEnergy ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
              color: lowEnergy ? "var(--primary-dark, #5849C4)" : "#93A0AD",
            }}
          >
            <BatteryLow size={13} strokeWidth={2.3} /> Low energy
          </button>
          {allRelevant.length > 0 && (
            <button
              onClick={() => setWhatNowOpen(true)}
              className="hoverable"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #E5E9ED",
                borderRadius: 999, padding: "7px 13px 7px 10px", fontSize: 12.5, fontWeight: 700, color: "var(--primary-dark, #5849C4)", cursor: "pointer",
              }}
              title="Picks the one most pressing thing and hides everything else"
            >
              <Sparkles size={13} strokeWidth={2.3} /> What should I do right now?
            </button>
          )}
        </div>
      </div>

      {lowEnergy && hiddenForEnergy > 0 && (
        <div style={{ fontSize: 11.5, color: "#B4BCC5", marginTop: -14, marginBottom: 14 }}>
          {hiddenForEnergy} bigger {hiddenForEnergy === 1 ? "project" : "projects"} hidden while low energy is on.
        </div>
      )}

      {allRelevant.length === 0 ? (
        <div style={{ fontSize: 15, color: sortedAll.length > 0 ? "#93A0AD" : "#8FCBA3", padding: "8px 0 4px" }}>
          {sortedAll.length > 0 ? "Everything left today is a bigger project — turn off Low energy to see it." : "Nothing on your plate — nice work."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {relevant.map((it) => {
            const overdue = it.date && it.date < todayISO;
            const dueToday = it.date === todayISO;
            const urgent = inLeadWindow(it.date, it.leadDays, false);
            const waitingOnWindow = !it.isGroup && it.date && it.leadDays && !overdue && !dueToday && !urgent; // has a date+leadDays but the window hasn't opened yet
            const active = it.isGroup || overdue || dueToday || urgent; // full-priority state
            let tagLabel = null;
            if (overdue) tagLabel = "Overdue";
            else if (urgent && !dueToday) tagLabel = `Urgent — ${daysUntil(it.date)}d left`;
            return (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, opacity: active ? 1 : 0.65 }}>
                <Checkbox checked={false} onClick={it.onToggle} color={it.col} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    onClick={it.onOpen}
                    style={{
                      display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0,
                      fontSize: active ? 16.5 : 15, fontWeight: active ? 500 : 400,
                      color: overdue ? "#B03A3A" : urgent ? "#B0631F" : "#000000",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}
                  >
                    {it.title}
                  </button>
                  {it.isGroup && <div style={{ fontSize: 11, color: "#B4BCC5", marginTop: 1 }}>{it.subLabel}</div>}
                </div>
                {tagLabel && (
                  <div style={{ fontSize: 11, color: overdue ? "#B03A3A" : "#B0631F", whiteSpace: "nowrap", fontWeight: 700, flexShrink: 0 }}>{tagLabel}</div>
                )}
                {waitingOnWindow && (
                  <div style={{ fontSize: 11, color: "#B4BCC5", whiteSpace: "nowrap", flexShrink: 0 }}>due {it.date}</div>
                )}
                {it.onSnooze && (
                  <button
                    onClick={it.onSnooze}
                    title="Push this to tomorrow"
                    className="hoverable"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: "#fff", border: "1.5px solid #E5E9ED", color: "#7B8794", flexShrink: 0, cursor: "pointer" }}
                  >
                    <Clock size={12} strokeWidth={2.3} />
                  </button>
                )}
                {it.focusId && onOpenFocus && (
                  <button
                    onClick={() => onOpenFocus(it.focusId, it.title)}
                    title="Start a focus timer on this now"
                    className="hoverable"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: "#fff", border: "1.5px solid #E5E9ED", color: "#7B8794", flexShrink: 0, cursor: "pointer" }}
                  >
                    <Play size={11} strokeWidth={2.5} fill="currentColor" />
                  </button>
                )}
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, fontSize: 12.5, color: "#93A0AD", fontWeight: 600, cursor: "pointer" }}
            >
              Show {hiddenCount} more
            </button>
          )}
          {expanded && allRelevant.length > VISIBLE_CAP && (
            <button
              onClick={() => setExpanded(false)}
              style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, fontSize: 12.5, color: "#93A0AD", fontWeight: 600, cursor: "pointer" }}
            >
              Show less
            </button>
          )}
        </div>
      )}

      {whatNowOpen && <WhatNowModal items={allRelevant} onClose={() => setWhatNowOpen(false)} onOpenFocus={onOpenFocus} />}
    </div>
  );
}
