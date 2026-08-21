import { useState } from "react";
import { Play } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { EDU_TYPE_COLORS, cardStyle, serifFont } from "../../lib/constants";
import { daysUntil, defaultLeadDays, inLeadWindow, toISO } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";

const VISIBLE_CAP = 5; // more than this and it stops being a glance — collapse the rest behind "Show more"

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
export default function TodaySection({ tasks, onToggleDone, onOpenDetail, onOpenFocus, eduItems, onSetEduDone, onGoToEducation, goalChips, onToggleGoalChip, onGoToGoals }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [expanded, setExpanded] = useState(false);
  const todayISO = toISO(new Date());
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const taskItems = tasks
    .filter((t) => !t.done && !t.groupId && (!t.date || defaultLeadDays(t) || t.date <= todayISO))
    .map((t) => ({
      id: t.id, title: t.title, date: t.date, leadDays: defaultLeadDays(t), isGroup: false, focusId: t.id,
      col: CATEGORY_COLORS[t.category || "Personal"] || CATEGORY_COLORS.Personal,
      onToggle: () => onToggleDone(t.id, true), onOpen: () => onOpenDetail(t.id),
    }));

  // A "break it down" task always has 2+ steps (a single-step breakdown never gets
  // grouped in the first place — see confirmPlan), so every group here genuinely has
  // "multiple subtasks" and stays bold the whole time it's active, not just near its due
  // date. Shown as one row for the whole project; checking it off completes the earliest
  // remaining step, and the sublabel names what that step is.
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
    };
  });

  // Education deadlines and goal actions aren't real Tasks rows, so there's no Focus
  // Timer target for them (focusId stays null — no Start button shows for these).
  const eduDeadlineItems = (eduItems || [])
    .filter((e) => !e.done && e.dueDate && e.dueDate <= todayISO)
    .map((e) => ({ id: `edu-${e.id}`, title: e.title, date: e.dueDate, leadDays: null, isGroup: false, focusId: null, col: EDU_TYPE_COLORS[e.type] || EDU_TYPE_COLORS.Homework, onToggle: () => onSetEduDone(e.id, true), onOpen: onGoToEducation }));

  const goalItems = (goalChips || [])
    .filter((c) => !c.done && c.date && c.date <= todayISO)
    .map((c) => ({ id: `goal-${c.id}`, title: c.title, date: c.date, leadDays: null, isGroup: false, focusId: null, col: CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Personal, onToggle: () => onToggleGoalChip(c), onOpen: onGoToGoals }));

  // Overdue and due-soonest first; anything with no due date (a plain reminder, or a
  // breakdown whose group has no overall due date) sinks to the bottom instead of
  // interrupting the order.
  const allRelevant = [...taskItems, ...groupItems, ...eduDeadlineItems, ...goalItems].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
  const relevant = expanded ? allRelevant : allRelevant.slice(0, VISIBLE_CAP);
  const hiddenCount = allRelevant.length - relevant.length;

  return (
    <div style={{ ...cardStyle, padding: "26px 28px", marginBottom: 22, boxShadow: "0 4px 18px rgba(15,23,42,0.04)" }}>
      <div style={{ fontFamily: serifFont, fontSize: 26, fontWeight: 500, color: "#000000" }}>Today</div>
      <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 20 }}>{dateLabel}</div>

      {allRelevant.length === 0 ? (
        <div style={{ fontSize: 15, color: "#8FCBA3", padding: "8px 0 4px" }}>Nothing on your plate — nice work.</div>
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
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 14, opacity: active ? 1 : 0.65 }}>
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
    </div>
  );
}
