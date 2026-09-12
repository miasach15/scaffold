import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, NotebookPen, Plus } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { dateRangeISO, daysBeforeDue, dayBefore, decimalToTimeLabel, distributeDatesByLoad, groupItemsByDate, toISO } from "../../lib/dateHelpers";
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
  // Type/subject/scheduling stay tucked behind a toggle by default — title and a due
  // date are the only two things you actually need to file something.
  const [showOptions, setShowOptions] = useState(false);
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
  const [useAI, setUseAI] = useState(false); // break it down with AI, applied on top of whichever schedule above is picked
  const [assignmentDetails, setAssignmentDetails] = useState("");
  const [breakingDown, setBreakingDown] = useState(false);
  const [breakdownError, setBreakdownError] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null); // { schedule, repeatValue, items } — reviewed before anything is added
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
    setTitle(""); setDueDate(""); setAssignmentDetails("");
  };

  const schedulable = type === "Assignment" || type === "Assessment";
  const workVerb = type === "Assessment" ? "Study" : "Work on";

  // Computes the same schedule App.jsx's addEduItem would, just for preview — the
  // actual insert happens only once the plan is confirmed in the modal.
  const previewSchedule = (schedule) => {
    const todayISO = toISO(new Date());
    const startISO = dueDate > todayISO ? todayISO : dueDate;
    const lastWorkDay = dayBefore(dueDate);
    const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
    if (typeof schedule === "object" && Array.isArray(schedule.steps)) {
      const dates = distributeDatesByLoad(startISO, endISO, schedule.steps.length, tasks, events);
      return groupItemsByDate(schedule.steps.map((t, i) => ({ title: t, date: dates[i] })), title.trim());
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
    if (!title.trim() || !dueDate) return;
    if (schedulable && useAI) { breakDownAssignment(); return; }
    if (schedulable) {
      // An assessment never gets "every day" — it's always a day count, crammed right before it.
      const schedule = type !== "Assessment" && workMode === "everyday" ? "everyday" : workDays;
      setPendingPlan({ schedule, repeatValue: "None", items: previewSchedule(schedule) });
      return;
    }
    onAddEduItem(title.trim(), type, subject, dueDate, "None", null);
    resetAddForm();
  };

  const confirmPlan = () => {
    if (!pendingPlan || pendingPlan.items.length === 0) return;
    // previewItems carries whatever the user edited/removed in the modal — used exactly
    // as-is for the first occurrence; if this assignment repeats, later occurrences fall
    // back to auto-computing their own schedule from `schedule` since we only preview one.
    onAddEduItem(title.trim(), type, subject, dueDate, pendingPlan.repeatValue, { schedule: pendingPlan.schedule, previewItems: pendingPlan.items });
    setPendingPlan(null);
    resetAddForm();
  };

  // one-click quick add from the day picker: Assessments get a timed study session, Assignments get an all-day sub-task
  const quickAddSession = (eduId, date) => {
    const item = eduItems.find((e) => e.id === eduId);
    if (!item || !date) return;
    const sessionTitle = item.type === "Assessment" ? `Study: ${item.title}` : `Work on: ${item.title}`;
    onAddSession(eduId, sessionTitle, date, "17:00", 60, item.type === "Assignment");
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
      steps.forEach((stepTitle, i) => onAddSession(item.id, stepTitle, dates[i], "17:00", 60, item.type === "Assignment"));
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
    // The title already says what it's for ("Work on: X") — only show the subtitle when
    // it actually adds something the title doesn't (a custom AI-written step name).
    const subtitle = parent && !t.title.includes(parent.title) ? parent.title : null;
    return {
      id: t.id, key: `s-${t.id}`, title: t.title, subtitle,
      done: t.done, date: t.date, timeLabel: t.start != null ? decimalToTimeLabel(t.start) : null,
      col: eduCol,
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
  const leftNotDone = [...sessionRows, ...homeworkRows].filter((i) => !i.done || justDone.has(i.id));
  const leftTodayItems = leftNotDone.filter((i) => i.date === todayISOlocal);

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
          <input placeholder="Title..." value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, width: 150 }} />
          <button onClick={add} disabled={breakingDown} className="btn-primary" style={{ ...primaryBtn, opacity: breakingDown ? 0.6 : 1 }}>
            {type === "Assignment" && useAI ? (breakingDown ? "Breaking it down..." : "Break it down for me") : schedulable ? "Review plan" : "Add"}
          </button>
        </AddRow>
      </div>
      <button onClick={() => setShowOptions((x) => !x)} className="hoverable" style={{ ...toggleBtn, marginBottom: showOptions ? 10 : 16 }}>
        {showOptions ? <ChevronUp size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
        {showOptions ? "Hide options" : "Type, subject, or how to work it"}
      </button>

      {showOptions && (
        <div style={{ background: "#fff", border: "1px solid #ECECEC", borderRadius: 14, padding: "16px 18px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, width: 130 }}>
              <option>Assignment</option><option>Assessment</option><option>Homework</option>
            </select>
            <input list="subjects-datalist" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle, width: 140 }} />
            <datalist id="subjects-datalist">
              {knownSubjects.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

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
      )}

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
            onBreakDown={(details) => breakDownExisting(editingItem, details)}
            breakingDown={sessionBreakingDown}
            breakdownError={sessionBreakdownError}
          />
        );
      })()}
    </div>
  );
}
