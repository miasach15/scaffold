import { useEffect, useState } from "react";
import { BatteryLow, Clock, Play } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { EDU_TYPE_COLORS, TONE, cardStyle, serifFont } from "../../lib/constants";
import { addDays, defaultLeadDays, formatShortDate, urgencyInfo, toISO } from "../../lib/dateHelpers";
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
export default function TodaySection({ tasks, onToggleDone, onOpenDetail, onOpenFocus, onSetDate, eduItems, onSetEduDone, onGoToEducation, goalChips, onToggleGoalChip, onGoToGoals, educationCategory }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [expanded, setExpanded] = useState(false);
  const [whatNowOpen, setWhatNowOpen] = useState(false);
  // Checking something off here shouldn't yank it out of the list mid-glance — it stays
  // put, just visibly checked, so there's a moment of "yes, that's done" instead of it
  // vanishing instantly. This is session-local (resets on reload), not a real "recently
  // completed" log — once you leave and come back, done items fall out of Today as usual.
  const [justDone, setJustDone] = useState(() => new Set());
  const markJustDone = (id) => setJustDone((prev) => new Set(prev).add(id));
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
    .filter((t) => (!t.done || justDone.has(t.id)) && !t.groupId && (!t.date || defaultLeadDays(t) || t.date <= todayISO))
    .map((t) => ({
      id: t.id, title: t.title, date: t.date, leadDays: defaultLeadDays(t), isGroup: false, focusId: t.id, done: t.done,
      category: t.category || "Personal",
      col: CATEGORY_COLORS[t.category || "Personal"] || CATEGORY_COLORS.Personal,
      onToggle: () => { if (!t.done) markJustDone(t.id); onToggleDone(t.id, !t.done); }, onOpen: () => onOpenDetail(t.id),
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
      id: `group-${groupId}`, title: groupTitle, date: groupDueDate, leadDays: null, isGroup: true, focusId: next.id, done: false,
      subLabel: `${remaining.length} step${remaining.length === 1 ? "" : "s"} left${next.date ? ` · next: ${next.title}` : ""}`,
      category: next.category || "Personal",
      col: CATEGORY_COLORS[next.category || "Personal"] || CATEGORY_COLORS.Personal,
      onToggle: () => onToggleDone(next.id, true), onOpen: () => onOpenDetail(next.id),
      onSnooze: next.date && onSetDate ? () => onSetDate(next.id, tomorrowISO) : null,
    };
  });

  // Education deadlines and goal actions aren't real Tasks rows, so there's no Focus
  // Timer target for them (focusId stays null — no Start button shows for these).
  const eduDeadlineItems = (eduItems || [])
    .filter((e) => (!e.done || justDone.has(`edu-${e.id}`)) && e.dueDate && e.dueDate <= todayISO)
    .map((e) => ({
      id: `edu-${e.id}`, title: e.title, date: e.dueDate, leadDays: null, isGroup: false, focusId: null, onSnooze: null, done: e.done,
      category: educationCategory, col: EDU_TYPE_COLORS[e.type] || EDU_TYPE_COLORS.Homework,
      onToggle: () => { if (!e.done) markJustDone(`edu-${e.id}`); onSetEduDone(e.id, !e.done); }, onOpen: onGoToEducation,
    }));

  const goalItems = (goalChips || [])
    .filter((c) => (!c.done || justDone.has(`goal-${c.id}`)) && c.date && c.date <= todayISO)
    .map((c) => ({
      id: `goal-${c.id}`, title: c.title, date: c.date, leadDays: null, isGroup: false, focusId: null, onSnooze: null, done: c.done,
      category: c.category || "Personal", col: CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Personal,
      onToggle: () => { if (!c.done) markJustDone(`goal-${c.id}`); onToggleGoalChip(c); }, onOpen: onGoToGoals,
    }));

  // Date still wins outright — whatever's due soonest (or most overdue) goes on top no
  // matter what category it is. Category only breaks a tie when two things land on the
  // exact same date: Education first, then everything else, Personal last — a small
  // nudge for same-day ties, never enough to override actual proximity to the due date.
  const categoryRank = (it) => {
    if (it.category === educationCategory) return 0;
    if (it.category === "Personal") return 2;
    return 1;
  };
  const sortedAll = [...taskItems, ...groupItems, ...eduDeadlineItems, ...goalItems].sort((a, b) => {
    if (!a.date && !b.date) return categoryRank(a) - categoryRank(b);
    if (!a.date) return 1;
    if (!b.date) return -1;
    const dateDiff = a.date.localeCompare(b.date);
    if (dateDiff !== 0) return dateDiff;
    return categoryRank(a) - categoryRank(b);
  });
  // Low energy mode hides multi-step projects specifically — a group is guaranteed 2+
  // steps by construction (see confirmPlan), so it's the one category that's honestly
  // never "quick." Nothing that's actually due gets hidden — this only trims what's
  // heaviest, not what's real.
  const allRelevant = lowEnergy ? sortedAll.filter((it) => !it.isGroup) : sortedAll;
  const relevant = expanded ? allRelevant : allRelevant.slice(0, VISIBLE_CAP);
  const hiddenCount = allRelevant.length - relevant.length;
  const hiddenForEnergy = lowEnergy ? sortedAll.length - allRelevant.length : 0;
  // Items kept visible purely because they were just checked off (see justDone) don't
  // count as "still on your plate" — "What should I do right now?" should only ever
  // suggest something not actually done yet.
  const actionable = allRelevant.filter((it) => !it.done);

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
            title="Hides multi-step projects. Just the quick, one-shot stuff for a day when even small things feel big"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "7px 12px 7px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              background: lowEnergy ? "var(--primary-tint, #E7E3FC)" : "#fff",
              border: `1.5px solid ${lowEnergy ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
              color: lowEnergy ? "var(--primary-dark, #5849C4)" : "#93A0AD",
            }}
          >
            <BatteryLow size={13} strokeWidth={2.3} /> Low energy
          </button>
          {actionable.length > 0 && (
            <button
              onClick={() => setWhatNowOpen(true)}
              className="hoverable"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #E5E9ED",
                borderRadius: 999, padding: "7px 13px 7px 10px", fontSize: 12.5, fontWeight: 700, color: "var(--primary-dark, #5849C4)", cursor: "pointer",
              }}
              title="Picks the one most pressing thing and hides everything else"
            >
              What should I do right now?
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
          {sortedAll.length > 0 ? "Everything left today is a bigger project. Turn off Low energy to see it." : "Nothing on your plate. Nice work."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {relevant.map((it) => {
            const overdue = it.date && it.date < todayISO;
            const dueToday = it.date === todayISO;
            // Same urgencyInfo everything else in the app uses — so the label here reads
            // exactly like every other "N days overdue"/"Urgent — N days left" badge,
            // instead of a hand-rolled duplicate that drifted from it ("Overdue" with no
            // count, "Urgent — Nd left" abbreviated differently).
            const info = it.date ? urgencyInfo(it.date, false, it.leadDays) : null;
            const urgent = !overdue && !dueToday && info?.tone === "danger";
            const waitingOnWindow = !it.isGroup && it.date && it.leadDays && !overdue && !dueToday && !urgent; // has a date+leadDays but the window hasn't opened yet
            const active = it.isGroup || overdue || dueToday || urgent; // full-priority state
            const tagLabel = overdue || urgent ? info.label : null;
            return (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, opacity: it.done ? 0.5 : active ? 1 : 0.65 }}>
                <Checkbox checked={!!it.done} onClick={it.onToggle} color={it.col} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    onClick={it.onOpen}
                    style={{
                      display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0,
                      fontSize: active && !it.done ? 16.5 : 15, fontWeight: active && !it.done ? 500 : 400,
                      color: it.done ? "#000000" : overdue ? TONE.carried.text : urgent ? TONE.warn.text : "#000000",
                      textDecoration: it.done ? "line-through" : "none",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}
                  >
                    {it.title}
                  </button>
                  {it.isGroup && <div style={{ fontSize: 11, color: "#B4BCC5", marginTop: 1 }}>{it.subLabel}</div>}
                </div>
                {!it.done && tagLabel && (
                  <div style={{ fontSize: 11, color: overdue ? TONE.carried.text : TONE.warn.text, whiteSpace: "nowrap", fontWeight: 700, flexShrink: 0 }}>{tagLabel}</div>
                )}
                {!it.done && waitingOnWindow && (
                  <div style={{ fontSize: 11, color: "#B4BCC5", whiteSpace: "nowrap", flexShrink: 0 }}>due {formatShortDate(it.date)}</div>
                )}
                {!it.done && it.onSnooze && (
                  <button
                    onClick={it.onSnooze}
                    title="Push this to tomorrow"
                    className="hoverable"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: "#fff", border: "1.5px solid #E5E9ED", color: "#7B8794", flexShrink: 0, cursor: "pointer" }}
                  >
                    <Clock size={12} strokeWidth={2.3} />
                  </button>
                )}
                {!it.done && it.focusId && onOpenFocus && (
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

      {whatNowOpen && <WhatNowModal items={actionable} onClose={() => setWhatNowOpen(false)} onOpenFocus={onOpenFocus} />}
    </div>
  );
}
