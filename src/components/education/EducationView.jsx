import { useMemo, useState } from "react";
import { GraduationCap } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { addDays, decimalToTimeLabel, toISO } from "../../lib/dateHelpers";
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
  const [subjectFilter, setSubjectFilter] = useState("All");

  const knownSubjects = useMemo(() => Array.from(new Set(eduItems.map((e) => e.subject).filter(Boolean))), [eduItems]);

  const add = () => {
    if (!title.trim() || !dueDate) return;
    onAddEduItem(title.trim(), type, subject, dueDate, repeat);
    setTitle(""); setDueDate(""); setRepeat("None");
  };

  // one-click quick add from the day picker: Tests get a timed study session, Assignments get an all-day sub-task
  const quickAddSession = (eduId, date) => {
    const item = eduItems.find((e) => e.id === eduId);
    if (!item || !date) return;
    const sessionTitle = item.type === "Test" ? `Study: ${item.title}` : `Work on: ${item.title}`;
    onAddSession(eduId, sessionTitle, date, "17:00", 60, item.type === "Assignment");
  };

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
    onToggleDone: () => onSetEduDone(e.id, !e.done), onFocus: null, onRemove: () => onRemoveEduItem(e.id),
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
        <button onClick={add} className="btn-primary" style={primaryBtn}>Add</button>
      </div>

      <SubHeader>Today</SubHeader>
      {today_.length === 0 && leftTodayItems.length === 0 ? (
        <EmptyState text="Nothing due today, no homework due tomorrow, and nothing scheduled for today." />
      ) : (
        <div style={{ marginBottom: 4 }}>
          {today_.map((e) => (
            <EduItemRow key={e.id} item={e} onToggleDone={onSetEduDone} onRemove={onRemoveEduItem} onAddSession={quickAddSession} tag={todayTag[e.id]} />
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
            <div>{upcomingTests.map((e) => <EduItemRow key={e.id} item={e} onToggleDone={onSetEduDone} onRemove={onRemoveEduItem} onAddSession={quickAddSession} />)}</div>
          )}
          <div style={{ marginTop: 18 }}>
            <SubHeader>Upcoming Assignments</SubHeader>
            {upcomingAssignments.length === 0 ? (
              <EmptyState text="No upcoming assignments." />
            ) : (
              <div>{upcomingAssignments.map((e) => <EduItemRow key={e.id} item={e} onToggleDone={onSetEduDone} onRemove={onRemoveEduItem} onAddSession={quickAddSession} />)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
