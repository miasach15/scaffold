import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, NotebookPen, Plus } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { addDays, dateRangeISO, daysBeforeDue, dayBefore, decimalToTimeLabel, distributeDatesByLoad, groupItemsByDate, toISO } from "../../lib/dateHelpers";
import { supabase } from "../../lib/supabase";
import { ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { AddRow, EmptyState, FilterPill, SectionHeader, SubHeader } from "../shared/Misc";
import BreakdownPreviewModal from "../shared/BreakdownPreviewModal";
import EduItemRow from "./EduItemRow";
import EduSessionsModal from "./EduSessionsModal";
import WorkItemRow from "./WorkItemRow";

const toggleBtn = {
  display: "inline-flex", alignItems: "center", gap: 5, background: "#fff",
  border: "1.5px dashed #D1D5DB", borderRadius: 999, padding: "5px 11px 5px 8px",
  fontSize: 11.5, fontWeight: 700, color: "#7B8794", cursor: "pointer",
};

export default function EducationView({
  eduItems,
  tasks,
  events,
  onAddEduItem,
  onSetEduDone,
  onRemoveEduItem,
  onAddSession,
  onRemoveSession,
  onRenameSession,
  onSetSessionDone,
  onUpdateDeadline,
  onOpenFocus,
  inboxItems,
  onDiscardInbox,
  educationCategory,
}) {
  // One color for everything on this page — whatever you've actually set your School
  // category color to in Settings, not a fixed built-in tint.
  const CATEGORY_COLORS = useCategoryColors();
  const eduCol = CATEGORY_COLORS[educationCategory] || CATEGORY_COLORS.School || CATEGORY_COLORS.Personal;

  const [title, setTitle] = useState("");
  const [editingEduId, setEditingEduId] = useState(null);
  const [sessionBreakingDown, setSessionBreakingDown] = useState(false);
  const [sessionBreakdownError, setSessionBreakdownError] = useState(null);

  // A Quick Capture reminder — pulls the text into the add form above and clears the
  // reminder. The item isn't actually filed until you fill in the rest and hit Add.
  const fileCapture = (item) => {
    setTitle(item.text);
    onDiscardInbox(item.id);
  };

  const [type, setType] = useState("Assignment");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [workMode, setWorkMode] = useState("days"); // "days" (pick a count) or "everyday"
  const [workDays, setWorkDays] = useState(3);
  const [startFrom, setStartFrom] = useState("today"); // "today" or "tomorrow" — only matters in "every day" mode
  const [useAI, setUseAI] = useState(false); // break it down with AI, applied on top of whichever schedule above is picked
  const [assignmentDetails, setAssignmentDetails] = useState("");
  const [breakingDown, setBreakingDown] = useState(false);
  const [breakdownError, setBreakdownError] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null); // { schedule, repeatValue, items } — reviewed before anything is added
  const [addError, setAddError] = useState(null); // shown right under the add row when title/due date is missing — Add otherwise silently does nothing
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [showAllUpcoming, setShowAllUpcoming] = useState(false); // capped by default — a long flat list is its own kind of overwhelm
  // Checking something off in Today shouldn't yank it out of the list mid-glance — it
  // stays put, just visibly crossed off, same as Tasks' Today does. Session-local: once
  // you leave and come back, done items fall out of Today as usual.
  const [justDone, setJustDone] = useState(() => new Set());
  const markJustDone = (id) => setJustDone((prev) => new Set(prev).add(id));

  const knownSubjects = useMemo(() => Array.from(new Set(eduItems.map((e) => e.subject).filter(Boolean))), [eduItems]);

  // How many work days the currently-picked schedule implies — used only as a soft hint
  // for the AI so its step count roughly lines up with "every day" vs a chosen day count.
  const scheduleDayCount = () => {
    if (!dueDate) return null;
    if (workMode === "days") return workDays;
    const todayISO = toISO(new Date());
    const startISO = dueDate > todayISO ? todayISO : dueDate;
    const lastWorkDay = dayBefore(dueDate);
    const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
    return dateRangeISO(startISO, endISO).length;
  };

  const resetAddForm = () => {
    setTitle(""); setDueDate(""); setAssignmentDetails(""); setAddError(null);
  };

  const schedulable = type === "Assignment" || type === "Assessment";
  const workVerb = type === "Assessment" ? "Study" : "Work on";

  // Computes the same schedule App.jsx's addEduItem would, just for preview — the
  // actual insert happens only once the plan is confirmed in the modal.
  const previewSchedule = (schedule) => {
    const todayISO = toISO(new Date());
    const defaultStartISO = dueDate > todayISO ? todayISO : dueDate;
    // "Every day" mode normally starts today — "starting tomorrow" instead skips today
    // entirely, for whenever today's already spoken for and the first session shouldn't
    // land on it. Keyed off workMode (the user's actual choice), not the `schedule` value
    // itself — "Break it down with AI" still passes an AI-steps object even when workMode
    // is "everyday" (see the `add` comment: AI is "applied on top of" whichever mode is
    // picked), so checking schedule === "everyday" here would silently ignore the
    // tomorrow choice the moment AI is turned on. "Pick days" already lets the day-count
    // account for this on its own.
    const startISO = workMode === "everyday" && startFrom === "tomorrow"
      ? (toISO(addDays(new Date(), 1)) > dueDate ? dueDate : toISO(addDays(new Date(), 1)))
      : defaultStartISO;
    const lastWorkDay = dayBefore(dueDate);
    const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
    if (typeof schedule === "object" && Array.isArray(schedule.steps)) {
      const dates = distributeDatesByLoad(startISO, endISO, schedule.steps.length, tasks, events);
      // distributeDatesByLoad spreads steps evenly across the whole window rather than
      // packing from the front, so shifting the window's start to tomorrow isn't enough
      // by itself — force the actual first step onto it (same fix as Tasks' AI breakdown).
      if (workMode === "everyday" && startFrom === "tomorrow" && dates.length > 0) dates[0] = startISO;
      return groupItemsByDate(schedule.steps.map((t, i) => ({ title: t, date: dates[i] })), `${workVerb}: ${title.trim()}`);
    }
    // An assessment crams into the days right before it, not spread thin across however
    // far off it is; an assignment still spreads across your least-busy days either way.
    const dates = type === "Assessment"
      ? daysBeforeDue(dueDate, schedule)
      : schedule === "everyday" ? dateRangeISO(startISO, endISO) : distributeDatesByLoad(startISO, endISO, schedule, tasks, events);
    return groupItemsByDate(dates.map((d) => ({ title: `${workVerb}: ${title.trim()}`, date: d })));
  };

  const breakDownAssignment = async () => {
    if (!title.trim() || !dueDate || !assignmentDetails.trim() || breakingDown) return;
    setBreakingDown(true);
    setBreakdownError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-assignment-plan", {
        body: { title: title.trim(), details: assignmentDetails.trim(), dueDate, stepHint: scheduleDayCount() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const steps = (data?.steps || []).map((s) => s.title).filter(Boolean);
      if (steps.length === 0) throw new Error("No steps came back. Try adding more detail.");
      const schedule = { steps };
      setPendingPlan({ schedule, repeatValue: "None", items: previewSchedule(schedule) });
    } catch (e) {
      setBreakdownError(e.message || "Couldn't reach the planner. It may not be set up yet.");
    } finally {
      setBreakingDown(false);
    }
  };

  const add = () => {
    if (!title.trim() || !dueDate) {
      setAddError(!title.trim() ? "Give it a title first." : "Add a due date first.");
      return;
    }
    setAddError(null);
    if (schedulable && useAI) { breakDownAssignment(); return; }
    if (schedulable) {
      // An assessment never gets "every day" — it's always a day count, crammed right before it.
      const schedule = type !== "Assessment" && workMode === "everyday" ? "everyday" : workDays;
      setPendingPlan({ schedule, repeatValue: "None", items: previewSchedule(schedule) });
      return;
    }
    onAddEduItem(title.trim(), type, subject, dueDate, null, "None", null);
    resetAddForm();
  };

  const confirmPlan = () => {
    if (!pendingPlan || pendingPlan.items.length === 0) return;
    // previewItems carries whatever the user edited/removed in the modal — used exactly
    // as-is for the first occurrence; if this assignment repeats, later occurrences fall
    // back to auto-computing their own schedule from `schedule` since we only preview one.
    onAddEduItem(title.trim(), type, subject, dueDate, null, pendingPlan.repeatValue, { schedule: pendingPlan.schedule, previewItems: pendingPlan.items });
    setPendingPlan(null);
    resetAddForm();
  };

  // one-click quick add from the day picker: every quick-added session is all-day,
  // regardless of type — a timed default (previously 5pm for Assessments) just meant an
  // extra edit every time.
  const quickAddSession = (eduId, date) => {
    const item = eduItems.find((e) => e.id === eduId);
    if (!item || !date) return;
    const sessionTitle = item.type === "Assessment" ? `Study: ${item.title}` : `Work on: ${item.title}`;
    onAddSession(eduId, sessionTitle, date, "17:00", 60, true);
  };

  // Replaces every existing session/sub-task for this item with a fresh AI-generated
  // plan — same planner the "Break it down with AI" flow at creation uses.
  const breakDownExisting = async (item, details) => {
    if (!details.trim() || sessionBreakingDown) return;
    setSessionBreakingDown(true);
    setSessionBreakdownError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-assignment-plan", {
        body: { title: item.title, details: details.trim(), dueDate: item.dueDate, stepHint: null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const steps = (data?.steps || []).map((s) => s.title).filter(Boolean);
      if (steps.length === 0) throw new Error("No steps came back. Try adding more detail.");
      const todayISOForPlan = toISO(new Date());
      const startISO = item.dueDate > todayISOForPlan ? todayISOForPlan : item.dueDate;
      const lastWorkDay = dayBefore(item.dueDate);
      const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
      const dates = distributeDatesByLoad(startISO, endISO, steps.length, tasks, events);
      tasks.filter((t) => t.eduId === item.id).forEach((t) => onRemoveSession(t.id));
      steps.forEach((stepTitle, i) => onAddSession(item.id, stepTitle, dates[i], "17:00", 60, true));
    } catch (e) {
      setSessionBreakdownError(e.message || "Couldn't reach the planner. It may not be set up yet.");
    } finally {
      setSessionBreakingDown(false);
    }
  };

  // No stored series id for repeating edu items — treat same title/type/subject with a
  // due date on or after this one's as "the rest of the series" for delete-all-following.
  const eduHasFollowing = (item) =>
    eduItems.some((e) => e.id !== item.id && e.title === item.title && e.type === item.type && e.subject === item.subject && e.dueDate >= item.dueDate);

  const bySubject = (e) => subjectFilter === "All" || e.subject === subjectFilter;
  const todayISOlocal = toISO(new Date());
  // Everything only shows in Today once it's actually due today — a homework due
  // tomorrow belongs in Upcoming Homework, not here, same as a test or assignment due
  // tomorrow already only shows in Upcoming.
  const today_ = eduItems.filter((e) => e.dueDate === todayISOlocal && (!e.done || justDone.has(e.id)) && bySubject(e));
  const todayIds = new Set(today_.map((e) => e.id));
  const handleTodayToggle = (id, done) => {
    if (done) markJustDone(id);
    onSetEduDone(id, done);
  };

  // One flowing list instead of three separately-headed ones — each row still carries
  // its own Assessment/Assignment/Homework badge, so the type is still obvious at a glance.
  // A just-checked item stays visible (crossed off) for the rest of the session, same as
  // the Today rows above, instead of disappearing the instant it's checked.
  const handleUpcomingToggle = (id, done) => {
    if (done) markJustDone(id);
    onSetEduDone(id, done);
  };
  const upcoming = eduItems.filter((e) => (!e.done || justDone.has(e.id)) && !todayIds.has(e.id) && bySubject(e)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const UPCOMING_CAP = 5;
  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, UPCOMING_CAP);
  const hiddenUpcomingCount = upcoming.length - visibleUpcoming.length;

  const sessionRows = tasks.filter((t) => t.eduId).map((t) => {
    const parent = eduItems.find((e) => e.id === t.eduId);
    if (subjectFilter !== "All" && parent?.subject !== subjectFilter) return null;
    // Every session of the same assignment now shares one title ("Work on: X"/"Study: X"
    // — see App.jsx's addEduItem), on purpose, so a missed day and today's session read
    // as the same thing rather than as unrelated one-off tasks. Whatever used to make one
    // step's title distinct (an AI-generated step description, or a preview edit) lives
    // in notes now, so that's what the subtitle line shows instead of the old fallback
    // (the parent's own title, which the now-uniform title already says anyway).
    return {
      id: t.id, key: `s-${t.id}`, title: t.title, subtitle: t.notes || null,
      done: t.done, date: t.date, timeLabel: t.start != null ? decimalToTimeLabel(t.start) : null,
      col: eduCol, eduId: t.eduId,
      onToggleDone: () => { if (!t.done) markJustDone(t.id); onSetSessionDone(t.id, !t.done); }, onFocus: () => onOpenFocus(t.id, t.title),
      onRemove: () => onRemoveSession(t.id),
    };
  }).filter(Boolean);
  // Homework due today already gets its own row above (via today_/EduItemRow) — skip it
  // here so it doesn't show up a second time.
  const homeworkRows = eduItems.filter((e) => e.type === "Homework" && bySubject(e) && !todayIds.has(e.id)).map((e) => ({
    id: e.id, key: `h-${e.id}`, title: e.title, subtitle: e.subject || "Homework",
    done: e.done, date: e.dueDate, timeLabel: null,
    col: eduCol,
    onToggleDone: () => { if (!e.done) markJustDone(e.id); onSetEduDone(e.id, !e.done); }, onFocus: null,
    hasFollowing: eduHasFollowing(e),
    onRemove: (mode) => onRemoveEduItem(e.id, mode),
  }));
  // Only today's work sessions/homework show here — the full day-by-day breakdown of
  // every assignment would otherwise turn this into a long, noisy list. The actual
  // deadlines (Upcoming below) still show everything coming up. Just-checked items stay
  // visible (crossed off), same as the deadline rows above.
  //
  // A session's date is a work day, not a deadline — filtering to exactly today used to
  // mean a missed day's session just vanished from here without a trace (it never showed
  // as overdue, it just silently disappeared). Instead, sessions collapse per assignment
  // the same way Dashboard/TodaySection already do: only the latest still-undone
  // due-or-overdue one shows, so a skipped day rolls into the next one as a single row
  // instead of either disappearing or piling up as several separately-dated rows for the
  // same assignment.
  const notDoneSessionRows = sessionRows.filter((i) => !i.done || justDone.has(i.id));
  const sessionsByEdu = {};
  notDoneSessionRows.forEach((row) => { (sessionsByEdu[row.eduId] ||= []).push(row); });
  const leftTodaySessionItems = Object.values(sessionsByEdu).flatMap((sessions) => {
    const due = sessions.filter((s) => s.date && s.date <= todayISOlocal).sort((a, b) => a.date.localeCompare(b.date));
    return due.length > 0 ? [due[due.length - 1]] : [];
  });
  const leftTodayHomeworkItems = homeworkRows.filter((i) => (!i.done || justDone.has(i.id)) && i.date === todayISOlocal);
  const leftTodayItems = [...leftTodaySessionItems, ...leftTodayHomeworkItems];

  return (
    <div>
      <SectionHeader title="Education" subtitle="Assignments, tests, and homework in one place." />

      {inboxItems && inboxItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SubHeader>Quick capture ({inboxItems.length})</SubHeader>
          <div style={{ fontSize: 11.5, color: "#B4BCC5", marginTop: -4, marginBottom: 8 }}>Jotted down earlier. File each one in properly, or discard it.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {inboxItems.map((it) => (
              <div key={it.id} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#fff", border: "1.5px solid #E5E9ED" }}>
                <NotebookPen size={15} strokeWidth={2.2} color="#B4BCC5" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 14, minWidth: 0, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{it.text}</div>
                <button onClick={() => fileCapture(it)} style={{ ...ghostBtn, fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>File this</button>
                <button onClick={() => onDiscardInbox(it.id)} className="btn-delete" style={{ background: "none", border: "none", fontSize: 16, color: "#C2C9D1", padding: "0 4px" }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div data-tour="education-add">
        <AddRow>
          <input placeholder="Title..." value={title} onChange={(e) => { setTitle(e.target.value); setAddError(null); }} onKeyDown={(e) => e.key === "Enter" && add()} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <div style={{ display: "flex", gap: 6 }}>
            {["Assignment", "Assessment", "Homework"].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  padding: "8px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
                  border: `1px solid ${type === t ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                  background: type === t ? "var(--primary-tint, #E7E3FC)" : "#fff",
                  color: type === t ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <input list="subjects-datalist" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle, width: 130 }} />
          <datalist id="subjects-datalist">
            {knownSubjects.map((s) => <option key={s} value={s} />)}
          </datalist>
          <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setAddError(null); }} style={{ ...inputStyle, width: 150, border: addError === "Add a due date first." ? "1.5px solid #B03A3A" : undefined }} />
          <button onClick={add} disabled={breakingDown} className="btn-primary" style={{ ...primaryBtn, opacity: breakingDown ? 0.6 : 1 }}>
            {type === "Assignment" && useAI ? (breakingDown ? "Breaking it down..." : "Break it down for me") : schedulable ? "Review plan" : "Add"}
          </button>
        </AddRow>
        {addError && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: -2, marginBottom: 8 }}>{addError}</div>}
      </div>

      <div style={{ background: "#fff", border: "1px solid #ECECEC", borderRadius: 14, padding: "16px 18px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {type === "Homework" && (
            <div style={{ fontSize: 12.5, color: "#93A0AD" }}>Homework gets one reminder to work on it, the day before it's due — for something bigger that needs its own spread of sessions, use Assignment instead.</div>
          )}

          {schedulable && (
            <div>
              <div style={{ fontSize: 12.5, color: "#4A5568", marginBottom: 6 }}>{workVerb} it:</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {/* An assessment always crams into the N days right before it — no "every day" option, that's an assignment-only spread. */}
                {type !== "Assessment" && ["days", "everyday"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setWorkMode(m)}
                    style={{
                      padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                      border: `1px solid ${workMode === m ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                      background: workMode === m ? "var(--primary-tint, #E7E3FC)" : "#fff",
                      color: workMode === m ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                    }}
                  >
                    {m === "everyday" ? "Every day" : "Pick days"}
                  </button>
                ))}
                {(type === "Assessment" || workMode === "days") && (
                  <input
                    type="number" min={1} max={30} value={workDays}
                    onChange={(e) => setWorkDays(Math.max(1, Number(e.target.value) || 1))}
                    title={type === "Assessment" ? `We'll schedule that many '${workVerb}' sessions across the days right before the assessment` : `We'll spread that many '${workVerb}' tasks across your least-busy days between today and the due date`}
                    style={{ ...inputStyle, width: 55, padding: "6px 8px" }}
                  />
                )}
                {type === "Assessment" && <span style={{ fontSize: 12, color: "#93A0AD" }}>days before the assessment</span>}
              </div>
              {workMode === "everyday" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "#93A0AD" }}>Starting</span>
                  {["today", "tomorrow"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setStartFrom(f)}
                      style={{
                        padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, textTransform: "capitalize",
                        border: `1px solid ${startFrom === f ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                        background: startFrom === f ? "var(--primary-tint, #E7E3FC)" : "#fff",
                        color: startFrom === f ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {type === "Assignment" && (
            <div>
              <button onClick={() => setUseAI((x) => !x)} className="hoverable" style={toggleBtn}>
                {useAI ? <ChevronUp size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2.5} />}
                Break it down with AI
              </button>
              {useAI && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    value={assignmentDetails}
                    onChange={(e) => setAssignmentDetails(e.target.value)}
                    placeholder="Paste or describe the assignment instructions. We'll turn them into ordered work steps leading up to the due date."
                    rows={3}
                    style={{ ...inputStyle, width: "100%", resize: "vertical" }}
                  />
                  {breakdownError && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: 6 }}>{breakdownError}</div>}
                </div>
              )}
            </div>
          )}
      </div>

      <SubHeader>Today</SubHeader>
      {today_.length === 0 && leftTodayItems.length === 0 ? (
        <EmptyState text="Nothing due today, and nothing scheduled for today." />
      ) : (
        <div style={{ marginBottom: 4 }}>
          {today_.map((e) => (
            <EduItemRow key={e.id} item={e} col={eduCol} onToggleDone={handleTodayToggle} onRemove={onRemoveEduItem} onOpen={() => setEditingEduId(e.id)} hasFollowing={eduHasFollowing(e)} />
          ))}
          {leftTodayItems.map((it) => <WorkItemRow key={it.key} item={it} />)}
        </div>
      )}

      {knownSubjects.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 4px" }}>
          <FilterPill label="All" active={subjectFilter === "All"} onClick={() => setSubjectFilter("All")} />
          {knownSubjects.map((s) => (
            <FilterPill key={s} label={s} active={subjectFilter === s} onClick={() => setSubjectFilter(s)} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <SubHeader>Upcoming</SubHeader>
        {upcoming.length === 0 ? (
          <EmptyState text="Nothing upcoming." />
        ) : (
          <>
            <div>{visibleUpcoming.map((e) => <EduItemRow key={e.id} item={e} col={eduCol} onToggleDone={handleUpcomingToggle} onRemove={onRemoveEduItem} onOpen={() => setEditingEduId(e.id)} hasFollowing={eduHasFollowing(e)} />)}</div>
            {hiddenUpcomingCount > 0 && (
              <button onClick={() => setShowAllUpcoming(true)} className="hoverable" style={{ ...toggleBtn, marginTop: 2 }}>
                <ChevronDown size={13} strokeWidth={2.5} /> {hiddenUpcomingCount} more
              </button>
            )}
          </>
        )}
      </div>

      {pendingPlan && (
        <BreakdownPreviewModal
          heading={title || (type === "Assessment" ? "Your assessment" : "Your assignment")}
          items={pendingPlan.items}
          onChangeItems={(items) => setPendingPlan((p) => ({ ...p, items }))}
          onConfirm={confirmPlan}
          onCancel={() => setPendingPlan(null)}
        />
      )}

      {editingEduId && (() => {
        const editingItem = eduItems.find((e) => e.id === editingEduId);
        if (!editingItem) return null;
        return (
          <EduSessionsModal
            item={editingItem}
            col={eduCol}
            sessions={tasks.filter((t) => t.eduId === editingEduId)}
            onClose={() => { setEditingEduId(null); setSessionBreakdownError(null); }}
            onToggleSession={onSetSessionDone}
            onRenameSession={onRenameSession}
            onRemoveSession={onRemoveSession}
            onAddSession={quickAddSession}
            onUpdateDeadline={onUpdateDeadline}
            onBreakDown={(details) => breakDownExisting(editingItem, details)}
            breakingDown={sessionBreakingDown}
            breakdownError={sessionBreakdownError}
          />
        );
      })()}
    </div>
  );
}
