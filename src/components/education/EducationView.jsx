import { useMemo, useState } from "react";
import { GraduationCap, Sparkles } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { addDays, dateRangeISO, dayBefore, decimalToTimeLabel, toISO } from "../../lib/dateHelpers";
import { supabase } from "../../lib/supabase";
import { inputStyle, primaryBtn } from "../../lib/styles";
import { EmptyState, FilterPill, SectionHeader, SubHeader } from "../shared/Misc";
import EduItemRow from "./EduItemRow";
import WorkItemRow from "./WorkItemRow";

export default function EducationView({
  eduItems,
  tasks,
  onAddEduItem,
  onSetEduDone,
  onRemoveEduItem,
  onAddSession,
  onRemoveSession,
  onSetSessionDone,
  onOpenFocus,
}) {
  const CATEGORY_COLORS = useCategoryColors();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Assignment");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [repeat, setRepeat] = useState("None");
  const [workMode, setWorkMode] = useState("days"); // "days" (pick a count) or "everyday"
  const [workDays, setWorkDays] = useState(3);
  const [useAI, setUseAI] = useState(false); // break it down with AI, applied on top of whichever schedule above is picked
  const [assignmentDetails, setAssignmentDetails] = useState("");
  const [breakingDown, setBreakingDown] = useState(false);
  const [breakdownError, setBreakdownError] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState("All");

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
    setTitle(""); setDueDate(""); setRepeat("None"); setAssignmentDetails("");
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
      if (steps.length === 0) throw new Error("No steps came back — try adding more detail.");
      onAddEduItem(title.trim(), type, subject, dueDate, "None", { steps });
      resetAddForm();
    } catch (e) {
      setBreakdownError(e.message || "Couldn't reach the planner. It may not be set up yet.");
    } finally {
      setBreakingDown(false);
    }
  };

  const add = () => {
    if (!title.trim() || !dueDate) return;
    if (type === "Assignment" && useAI) { breakDownAssignment(); return; }
    const schedule = type === "Assignment" ? (workMode === "everyday" ? "everyday" : workDays) : null;
    onAddEduItem(title.trim(), type, subject, dueDate, repeat, schedule);
    resetAddForm();
  };

  // one-click quick add from the day picker: Tests get a timed study session, Assignments get an all-day sub-task
  const quickAddSession = (eduId, date) => {
    const item = eduItems.find((e) => e.id === eduId);
    if (!item || !date) return;
    const sessionTitle = item.type === "Test" ? `Study: ${item.title}` : `Work on: ${item.title}`;
    onAddSession(eduId, sessionTitle, date, "17:00", 60, item.type === "Assignment");
  };

  // No stored series id for repeating edu items — treat same title/type/subject with a
  // due date on or after this one's as "the rest of the series" for delete-all-following.
  const eduHasFollowing = (item) =>
    eduItems.some((e) => e.id !== item.id && e.title === item.title && e.type === item.type && e.subject === item.subject && e.dueDate >= item.dueDate);

  const bySubject = (e) => subjectFilter === "All" || e.subject === subjectFilter;
  const todayISOlocal = toISO(new Date());
  const tomorrowISO = toISO(addDays(new Date(), 1));
  // Assignments/Tests always stay in Upcoming unless actually due that day. Only Homework gets
  // pulled in automatically the day before it's due, since it has no breakdown of its own.
  const dueTodayItems = eduItems.filter((e) => e.dueDate === todayISOlocal && !e.done && bySubject(e));
  const homeworkDueTomorrow = eduItems.filter((e) => e.type === "Homework" && e.dueDate === tomorrowISO && !e.done && bySubject(e));
  const seenTodayIds = new Set();
  const todayTag = {};
  const today_ = [];
  [[dueTodayItems, "Due today"], [homeworkDueTomorrow, "Due tomorrow"]].forEach(([list, tag]) => {
    list.forEach((e) => {
      if (seenTodayIds.has(e.id)) return;
      seenTodayIds.add(e.id);
      todayTag[e.id] = tag;
      today_.push(e);
    });
  });
  const todayIds = seenTodayIds;

  const upcomingTests = eduItems.filter((e) => e.type === "Test" && !e.done && !todayIds.has(e.id) && bySubject(e)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const upcomingAssignments = eduItems.filter((e) => e.type === "Assignment" && !e.done && !todayIds.has(e.id) && bySubject(e)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const sessionRows = tasks.filter((t) => t.eduId).map((t) => {
    const parent = eduItems.find((e) => e.id === t.eduId);
    if (subjectFilter !== "All" && parent?.subject !== subjectFilter) return null;
    return {
      key: `s-${t.id}`, title: t.title, subtitle: parent ? parent.title : null,
      done: t.done, date: t.date, dateLabel: t.start != null ? `${t.date} · ${decimalToTimeLabel(t.start)}` : `${t.date} · all-day`,
      colorKind: "task",
      onToggleDone: () => onSetSessionDone(t.id, !t.done), onFocus: () => onOpenFocus(t.id, t.title),
      onRemove: () => onRemoveSession(t.id),
    };
  }).filter(Boolean);
  const homeworkRows = eduItems.filter((e) => e.type === "Homework" && bySubject(e)).map((e) => ({
    key: `h-${e.id}`, title: e.title, subtitle: e.subject || "Homework",
    done: e.done, date: e.dueDate, dateLabel: e.dueDate,
    colorKind: "edu", eduType: "Homework",
    onToggleDone: () => onSetEduDone(e.id, !e.done), onFocus: null,
    hasFollowing: eduHasFollowing(e),
    onRemove: (mode) => onRemoveEduItem(e.id, mode),
  }));
  const leftNotDone = [...sessionRows, ...homeworkRows].filter((i) => !i.done);
  const leftDone = [...sessionRows, ...homeworkRows].filter((i) => i.done);
  const leftTodayItems = leftNotDone.filter((i) => i.date === todayISOlocal);
  const leftUpcomingItems = [...leftNotDone.filter((i) => i.date !== todayISOlocal), ...leftDone].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return (
    <div>
      <SectionHeader title="Education" subtitle="Assignments, tests, and homework in one place." Icon={GraduationCap} tint={CATEGORY_COLORS.Education} />
      <div data-tour="education-add" style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <input placeholder="Title..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, width: 130 }}>
          <option>Assignment</option><option>Test</option><option>Homework</option>
        </select>
        <input list="subjects-datalist" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle, width: 120 }} />
        <datalist id="subjects-datalist">
          {knownSubjects.map((s) => <option key={s} value={s} />)}
        </datalist>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, width: 150 }} />
        <select value={repeat} onChange={(e) => setRepeat(e.target.value)} style={{ ...inputStyle, width: 140 }} title="Repeat">
          <option value="None">Doesn't repeat</option>
          <option value="Daily">Every day</option>
          <option value="Weekdays">Every weekday</option>
          <option value="Weekly">Every week</option>
        </select>
        {type === "Assignment" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#4A5568" }}>
            <span>Work on it:</span>
            {["days", "everyday"].map((m) => (
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
            {workMode === "days" && (
              <input
                type="number" min={1} max={30} value={workDays}
                onChange={(e) => setWorkDays(Math.max(1, Number(e.target.value) || 1))}
                title="We'll spread that many 'Work on' tasks evenly between today and the due date"
                style={{ ...inputStyle, width: 55, padding: "6px 8px" }}
              />
            )}
          </div>
        )}
        <button onClick={add} disabled={breakingDown} className="btn-primary" style={{ ...primaryBtn, opacity: breakingDown ? 0.6 : 1 }}>
          {type === "Assignment" && useAI ? (breakingDown ? "Breaking it down..." : "Break it down for me") : "Add"}
        </button>
      </div>

      {type === "Assignment" && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setUseAI((x) => !x)}
            style={{
              padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
              border: `1px solid ${useAI ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
              background: useAI ? "var(--primary-tint, #E7E3FC)" : "#fff",
              color: useAI ? "var(--primary-dark, #5849C4)" : "#93A0AD",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}
          >
            <Sparkles size={11} strokeWidth={2.3} /> Break it down with AI
          </button>
          {useAI && (
            <div style={{ marginTop: 8 }}>
              <textarea
                value={assignmentDetails}
                onChange={(e) => setAssignmentDetails(e.target.value)}
                placeholder="Paste or describe the assignment instructions — we'll turn them into ordered work steps leading up to the due date."
                rows={3}
                style={{ ...inputStyle, width: "100%", resize: "vertical" }}
              />
              {breakdownError && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: 6 }}>{breakdownError}</div>}
            </div>
          )}
        </div>
      )}

      <SubHeader>Today</SubHeader>
      {today_.length === 0 && leftTodayItems.length === 0 ? (
        <EmptyState text="Nothing due today, no homework due tomorrow, and nothing scheduled for today." />
      ) : (
        <div style={{ marginBottom: 4 }}>
          {today_.map((e) => (
            <EduItemRow key={e.id} item={e} onToggleDone={onSetEduDone} onRemove={onRemoveEduItem} onAddSession={quickAddSession} tag={todayTag[e.id]} hasFollowing={eduHasFollowing(e)} />
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22, marginTop: 16 }}>
        <div>
          <SubHeader>Upcoming Tasks</SubHeader>
          {leftUpcomingItems.length === 0 ? (
            <EmptyState text="Nothing to work on yet. Break down a test or assignment on the right, or add homework above." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {leftUpcomingItems.map((it) => <WorkItemRow key={it.key} item={it} />)}
            </div>
          )}
        </div>
        <div>
          <SubHeader>Upcoming Tests</SubHeader>
          {upcomingTests.length === 0 ? (
            <EmptyState text="No upcoming tests." />
          ) : (
            <div>{upcomingTests.map((e) => <EduItemRow key={e.id} item={e} onToggleDone={onSetEduDone} onRemove={onRemoveEduItem} onAddSession={quickAddSession} hasFollowing={eduHasFollowing(e)} />)}</div>
          )}
          <div style={{ marginTop: 18 }}>
            <SubHeader>Upcoming Assignments</SubHeader>
            {upcomingAssignments.length === 0 ? (
              <EmptyState text="No upcoming assignments." />
            ) : (
              <div>{upcomingAssignments.map((e) => <EduItemRow key={e.id} item={e} onToggleDone={onSetEduDone} onRemove={onRemoveEduItem} onAddSession={quickAddSession} hasFollowing={eduHasFollowing(e)} />)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
