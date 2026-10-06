import { useState } from "react";
import { Mic, Square } from "lucide-react";
import { useCategoryColors, useCategoryKeys } from "../../hooks/CategoryColorsContext";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { MUTED, PRIMARY_DARK, SURFACE } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";
import { DatePickerButton } from "../shared/Misc";
import { uid } from "../../lib/id";
import { dayBefore, decimalToTimeInput, distributeDatesByLoad, groupItemsByDate, timeToDecimal, toISO } from "../../lib/dateHelpers";
import { supabase } from "../../lib/supabase";
import ModalPortal from "../shared/ModalPortal";

// A periodic "what's going on with today" prompt (see DashboardView's hourly timer,
// plus a manual trigger for whenever you want it). Marking things done or pushing a
// date is applied right away — low-ambiguity once something's matched to an existing
// item. Anything NEW that comes up goes through the exact same review-before-confirm
// step Brain Dump already uses instead of landing silently: you pick the category,
// fix up the type (task vs. calendar event) or date if the AI guessed wrong, and
// optionally break a task into steps — nothing's actually added until you confirm.
export default function CheckinModal({ openItems, tasks, events, onClose, onMarkDone, onChangeDates, onAddTasks, onAddEvents }) {
  const CATEGORY_COLORS = useCategoryColors();
  const categoryKeys = useCategoryKeys();
  const [report, setReport] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState("input"); // "input" | "drafts" | "result"
  const [drafts, setDrafts] = useState([]);
  const [summary, setSummary] = useState("");
  const { supported: speechSupported, listening, toggle: toggleListening } = useSpeechToText((phrase) => {
    setReport((r) => (r && !/[\s.]$/.test(r) ? r + " " : r) + phrase);
  });

  const submit = async () => {
    if (!report.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("parse-progress-checkin", {
        body: {
          report: report.trim(),
          today: toISO(new Date()),
          items: openItems.map((t) => ({ id: t.id, title: t.title, date: t.date || null })),
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data.doneIds?.length) onMarkDone(data.doneIds);
      if (data.dateChanges?.length) onChangeDates(data.dateChanges);
      setSummary(data.summary);
      if (data.newItems?.length) {
        setDrafts(data.newItems.map((it) => ({
          id: uid(),
          title: it.title,
          type: it.type === "event" ? "event" : "task",
          category: "Personal",
          date: it.date || "",
          start: it.start ?? null,
          duration: it.duration ?? null,
          breakdown: false,
          scheduleMode: "every",
          pickDaysCount: "",
        })));
        setStage("drafts");
      } else {
        setStage("result");
      }
    } catch (e) {
      setError(e.message || "Couldn't check that in. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateDraft = (id, patch) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDraft = (id) => setDrafts((ds) => ds.filter((d) => d.id !== id));

  // Mirrors Brain Dump's own addAsBreakdown — same edge function, same load-balanced
  // date spread, same single-step-collapses-to-a-plain-task rule.
  const addAsBreakdown = async (d) => {
    const { data, error: fnError } = await supabase.functions.invoke("generate-task-plan", {
      body: { title: d.title, details: "", dueDate: d.date },
    });
    if (fnError) throw fnError;
    if (data?.error) throw new Error(data.error);
    const stepTitles = (data?.steps || []).map((s) => s.title).filter(Boolean);
    if (stepTitles.length === 0) {
      onAddTasks([{ title: d.title, date: d.date, duration: d.duration, category: d.category }]);
      return;
    }
    const todayISO = toISO(new Date());
    const startISO = d.date > todayISO ? todayISO : d.date;
    const lastWorkDay = dayBefore(d.date);
    const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
    const maxDays = d.scheduleMode === "pick" && Number(d.pickDaysCount) >= 1 ? Number(d.pickDaysCount) : null;
    const dates = distributeDatesByLoad(startISO, endISO, stepTitles.length, tasks, events, maxDays);
    const grouped = groupItemsByDate(stepTitles.map((title, i) => ({ title, date: dates[i] })), d.title);
    const groupId = grouped.length > 1 ? uid() : null;
    onAddTasks(grouped.map((it) => ({
      title: it.title, date: it.date, category: d.category,
      groupId, groupTitle: groupId ? d.title : null, groupDueDate: groupId ? d.date : null, groupDueStart: null,
      notes: it.notes || null,
    })));
  };

  const confirmDrafts = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const eventDrafts = drafts.filter((d) => d.type === "event");
      if (eventDrafts.length) {
        onAddEvents(eventDrafts.map((d) => ({
          title: d.title, date: d.date || toISO(new Date()), start: d.start ?? 9, duration: d.duration ?? 60, category: d.category,
        })));
      }
      for (const d of drafts.filter((d) => d.type === "task")) {
        if (d.breakdown && d.date) await addAsBreakdown(d);
        else onAddTasks([{ title: d.title, date: d.date || null, duration: d.duration, category: d.category }]);
      }
      setStage("result");
    } catch (e) {
      setError(e.message || "Couldn't add everything. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div style={overlayStyle} onClick={onClose}>
        <div style={{ ...modalStyle, width: 460, maxHeight: "82vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 13, color: MUTED, fontWeight: 700, marginBottom: 4, flexShrink: 0 }}>Quick check-in</div>

          {stage === "result" ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Got it.</div>
              <div style={{ fontSize: 13, color: "#2A2A2A", lineHeight: 1.5, marginBottom: 18 }}>{summary}</div>
              <button onClick={onClose} className="btn-primary" style={{ ...primaryBtn, width: "100%" }}>Back to it</button>
            </>
          ) : stage === "drafts" ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, flexShrink: 0 }}>New since you mentioned it</div>
              <div style={{ fontSize: 12, color: "#93A0AD", marginBottom: 12, flexShrink: 0 }}>Pick a category, fix anything that looks off, and confirm. {summary}</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, overflowY: "auto", minHeight: 0 }}>
                {drafts.map((d) => (
                  <div key={d.id} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ECECEC", background: SURFACE }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <input
                        value={d.title}
                        onChange={(e) => updateDraft(d.id, { title: e.target.value })}
                        style={{ ...inputStyle, flex: 1, border: "none", background: "transparent", padding: "2px", fontSize: 13.5, fontWeight: 600 }}
                      />
                      <button onClick={() => removeDraft(d.id)} className="btn-delete" style={deleteBtn}>×</button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      {["task", "event"].map((t) => (
                        <button
                          key={t}
                          onClick={() => updateDraft(d.id, { type: t })}
                          style={{
                            padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                            border: `1px solid ${d.type === t ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                            background: "#fff",
                            color: d.type === t ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                          }}
                          title={t === "event" ? "A fixed-time thing (goes on the calendar at a specific time)" : "Flexible work (fits in wherever there's time)"}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      {categoryKeys.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateDraft(d.id, { category: c })}
                          style={{
                            padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${d.category === c ? CATEGORY_COLORS[c].border : "#E5E9ED"}`,
                            background: d.category === c ? CATEGORY_COLORS[c].bg : "#fff",
                            color: d.category === c ? CATEGORY_COLORS[c].text : "#93A0AD",
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <DatePickerButton
                        value={d.date}
                        onChange={(e) => updateDraft(d.id, { date: e.target.value, breakdown: e.target.value ? d.breakdown : false })}
                        title={d.type === "event" ? "When this happens" : "Optional: leave blank to skip a due date"}
                        placeholder={d.type === "event" ? "Today" : "No due date"}
                        style={{ padding: "3px 8px", fontSize: 11.5 }}
                      />
                      {d.type === "event" && (
                        <input
                          type="time"
                          value={decimalToTimeInput(d.start ?? 9)}
                          onChange={(e) => updateDraft(d.id, { start: timeToDecimal(e.target.value) })}
                          style={{ ...inputStyle, fontSize: 11.5, padding: "3px 8px", width: 100 }}
                        />
                      )}
                      {d.type === "task" && d.date && (
                        <button
                          onClick={() => updateDraft(d.id, { breakdown: !d.breakdown })}
                          style={{
                            padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${d.breakdown ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                            background: "#fff",
                            color: d.breakdown ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                            marginLeft: "auto",
                          }}
                          title="Splits this into named steps leading up to the due date"
                        >
                          Break it into steps
                        </button>
                      )}
                    </div>

                    {d.type === "task" && d.date && d.breakdown && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => updateDraft(d.id, { scheduleMode: "every" })}
                            style={{
                              padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                              border: `1px solid ${d.scheduleMode === "every" ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                              background: "#fff",
                              color: d.scheduleMode === "every" ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                            }}
                          >
                            Every day
                          </button>
                          <button
                            onClick={() => updateDraft(d.id, { scheduleMode: "pick" })}
                            style={{
                              padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                              border: `1px solid ${d.scheduleMode === "pick" ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                              background: "#fff",
                              color: d.scheduleMode === "pick" ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                            }}
                          >
                            Pick days
                          </button>
                        </div>
                        {d.scheduleMode === "pick" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              placeholder="Days"
                              value={d.pickDaysCount}
                              onChange={(e) => updateDraft(d.id, { pickDaysCount: e.target.value })}
                              style={{ ...inputStyle, width: 60, fontSize: 11.5, padding: "3px 6px" }}
                            />
                            <span style={{ fontSize: 11, color: "#93A0AD" }}>days you're free</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && <div style={{ fontSize: 12, color: "#B03A3A", marginBottom: 10, flexShrink: 0 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={onClose} disabled={submitting} className="btn-ghost" style={{ ...ghostBtn, opacity: submitting ? 0.6 : 1 }}>Cancel</button>
                <button
                  onClick={confirmDrafts}
                  disabled={drafts.length === 0 || submitting}
                  className="btn-primary"
                  style={{ ...primaryBtn, flex: 1, opacity: drafts.length === 0 || submitting ? 0.5 : 1 }}
                >
                  {submitting ? "Adding..." : `Add ${drafts.length} thing${drafts.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>What's going on?</div>
              <div style={{ fontSize: 12, color: "#93A0AD", marginBottom: 12 }}>Mark things done, add something new, push a deadline back, just say it.</div>
              <div style={{ position: "relative" }}>
                <textarea
                  autoFocus
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  }}
                  placeholder="Finished the lab writeup, push the essay to Friday, and add picking up groceries..."
                  rows={4}
                  style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit", paddingRight: speechSupported ? 40 : undefined }}
                />
                {speechSupported && (
                  <button
                    onClick={toggleListening}
                    title={listening ? "Stop listening" : "Talk it out instead of typing"}
                    style={{
                      position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${listening ? PRIMARY_DARK : "#E5E9ED"}`, background: listening ? PRIMARY_DARK : "#fff", color: listening ? "#fff" : "#93A0AD", cursor: "pointer",
                    }}
                  >
                    {listening ? <Square size={12} strokeWidth={2.5} fill="currentColor" /> : <Mic size={14} strokeWidth={2.2} />}
                  </button>
                )}
              </div>
              {error && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: 8 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={onClose} disabled={submitting} className="btn-ghost" style={{ ...ghostBtn, opacity: submitting ? 0.6 : 1 }}>Skip</button>
                <button
                  onClick={submit}
                  disabled={!report.trim() || submitting}
                  className="btn-primary"
                  style={{ ...primaryBtn, flex: 1, opacity: !report.trim() || submitting ? 0.5 : 1 }}
                >
                  {submitting ? "Updating..." : "Update my day"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
