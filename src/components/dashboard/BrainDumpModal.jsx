import { useState } from "react";
import { useCategoryColors, useCategoryKeys } from "../../hooks/CategoryColorsContext";
import { SURFACE } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";
import { uid } from "../../lib/id";
import { dayBefore, distributeDatesByLoad, groupItemsByDate, toISO } from "../../lib/dateHelpers";
import { supabase } from "../../lib/supabase";

// A raw brain-dump line is spoken, not written — "i have to like buy school supplies" —
// so every line gets cleaned up into an actual task title: drop the "i have to"/"i need
// to"/etc. lead-in, drop mid-sentence filler words, trim, and sentence-case what's left.
// Deterministic on purpose (no AI round-trip) so it's instant and always applies.
const LEAD_INS = [
  /^i\s+(?:really\s+)?(?:have|need|gotta|got)\s+to\s+/i,
  /^i\s+(?:really\s+)?should\s+/i,
  /^i\s+want\s+to\s+/i,
  /^(?:have|need|gotta|got)\s+to\s+/i,
  /^should\s+/i,
  /^to\s*-?\s*do:?\s+/i,
  /^remember\s+to\s+/i,
  /^don'?t\s+forget\s+to\s+/i,
];
const FILLER_WORDS = /\b(?:like|um+|uh+|you\s+know|kinda|sorta|literally|basically)\b\s*/gi;

function cleanupTaskTitle(raw) {
  let t = raw.trim();
  for (const re of LEAD_INS) {
    const stripped = t.replace(re, "");
    if (stripped !== t) { t = stripped; break; }
  }
  t = t.replace(FILLER_WORDS, "").replace(/\s{2,}/g, " ").trim().replace(/[.\s]+$/, "");
  if (!t) return raw.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Two steps: dump everything on your mind with no structure required, then sort it —
// one row per line, each gets its own category, an optional due date, and (once a date's
// set) the same "break it into steps" AI breakdown TasksView offers. Nothing is added
// until "Add N tasks" is confirmed, same as BreakdownPreviewModal's review-before-confirm
// pattern.
export default function BrainDumpModal({ onClose, onAddTask, tasks, events }) {
  const CATEGORY_COLORS = useCategoryColors();
  const categoryKeys = useCategoryKeys();
  const [dump, setDump] = useState("");
  const [drafts, setDrafts] = useState(null); // null = still on the dump step
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const organize = () => {
    const lines = dump.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setDrafts(lines.map((text) => ({ id: uid(), title: cleanupTaskTitle(text), category: "Personal", date: "", breakdown: false, scheduleMode: "every", pickDaysCount: "" })));
  };

  const updateDraft = (id, patch) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDraft = (id) => setDrafts((ds) => ds.filter((d) => d.id !== id));

  // Mirrors TasksView's breakDownTask + confirmPlan: same edge function, same
  // load-balanced date spread (with the same "pick days" = a count of your quietest
  // free days, not a choice of weekdays), same single-step-collapses-to-a-plain-task rule.
  const addAsBreakdown = async (d) => {
    const { data, error } = await supabase.functions.invoke("generate-task-plan", {
      body: { title: d.title, details: "", dueDate: d.date },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const stepTitles = (data?.steps || []).map((s) => s.title).filter(Boolean);
    if (stepTitles.length === 0) {
      onAddTask({ title: d.title, date: d.date, start: null, duration: null, category: d.category });
      return;
    }
    const todayISO = toISO(new Date());
    const startISO = d.date > todayISO ? todayISO : d.date;
    const lastWorkDay = dayBefore(d.date);
    const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
    const maxDays = d.scheduleMode === "pick" && Number(d.pickDaysCount) >= 1 ? Number(d.pickDaysCount) : null;
    const dates = distributeDatesByLoad(startISO, endISO, stepTitles.length, tasks, events, maxDays);
    const grouped = groupItemsByDate(stepTitles.map((title, i) => ({ title, date: dates[i] })));
    const groupId = grouped.length > 1 ? uid() : null;
    grouped.forEach((it) =>
      onAddTask({
        title: it.title, date: it.date, start: null, duration: null, category: d.category,
        groupId, groupTitle: groupId ? d.title : null, groupDueDate: groupId ? d.date : null, groupDueStart: null,
        notes: it.notes || null,
      })
    );
  };

  const addAll = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      for (const d of drafts) {
        if (d.breakdown && d.date) await addAsBreakdown(d);
        else onAddTask({ title: d.title, date: d.date || null, start: null, duration: null, category: d.category });
      }
      onClose();
    } catch (e) {
      setSubmitError(e.message || "Couldn't add everything. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 460, maxHeight: "82vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 11.5, color: "#93A0AD", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4, flexShrink: 0 }}>Brain dump</div>

        {drafts === null ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Get it all out</div>
            <div style={{ fontSize: 12, color: "#93A0AD", marginBottom: 12 }}>Type or paste everything on your mind, one thing per line. Sort it into real tasks after.</div>
            <textarea
              autoFocus
              value={dump}
              onChange={(e) => setDump(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) organize();
              }}
              placeholder={"Finish lab report\nCall the dentist\nBuy mom a gift\n..."}
              rows={8}
              style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={onClose} className="btn-ghost" style={ghostBtn}>Cancel</button>
              <button
                onClick={organize}
                disabled={!dump.trim()}
                className="btn-primary"
                style={{ ...primaryBtn, flex: 1, opacity: dump.trim() ? 1 : 0.5 }}
              >
                Sort it out
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, flexShrink: 0 }}>Pick a category and due date</div>
            <div style={{ fontSize: 12, color: "#93A0AD", marginBottom: 12, flexShrink: 0 }}>Leave a due date blank to let it sit in Today until you get to it. Set one to also break it into steps.</div>

            {drafts.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#B4BCC5", marginBottom: 18, padding: "10px 0" }}>Nothing left to add. Cancel, or go back and dump more.</div>
            ) : (
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
                      <input
                        type="date"
                        value={d.date}
                        onChange={(e) => updateDraft(d.id, { date: e.target.value, breakdown: e.target.value ? d.breakdown : false })}
                        title="Optional: leave blank to skip a due date"
                        style={{ ...inputStyle, padding: "3px 6px", fontSize: 11.5 }}
                      />
                      {d.date && (
                        <button
                          onClick={() => updateDraft(d.id, { breakdown: !d.breakdown })}
                          style={{
                            padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${d.breakdown ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                            background: d.breakdown ? "var(--primary-tint, #E7E3FC)" : "#fff",
                            color: d.breakdown ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                            marginLeft: "auto",
                          }}
                          title="Splits this into named steps leading up to the due date"
                        >
                          Break it into steps
                        </button>
                      )}
                    </div>
                    {d.date && d.breakdown && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => updateDraft(d.id, { scheduleMode: "every" })}
                            style={{
                              padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                              border: `1px solid ${d.scheduleMode === "every" ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                              background: d.scheduleMode === "every" ? "var(--primary-tint, #E7E3FC)" : "#fff",
                              color: d.scheduleMode === "every" ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                            }}
                            title="Steps can land on any day between now and the due date"
                          >
                            Every day
                          </button>
                          <button
                            onClick={() => updateDraft(d.id, { scheduleMode: "pick" })}
                            style={{
                              padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                              border: `1px solid ${d.scheduleMode === "pick" ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                              background: d.scheduleMode === "pick" ? "var(--primary-tint, #E7E3FC)" : "#fff",
                              color: d.scheduleMode === "pick" ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                            }}
                            title="Only use a set number of your least-busy days — this figures out which ones"
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
                              title="How many days you're free to spread this across — picks your quietest days automatically"
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
            )}

            {submitError && <div style={{ fontSize: 12, color: "#B03A3A", marginBottom: 10, flexShrink: 0 }}>{submitError}</div>}

            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => setDrafts(null)} disabled={submitting} className="btn-ghost" style={{ ...ghostBtn, opacity: submitting ? 0.6 : 1 }}>Back</button>
              <button
                onClick={addAll}
                disabled={drafts.length === 0 || submitting}
                className="btn-primary"
                style={{ ...primaryBtn, flex: 1, opacity: drafts.length === 0 || submitting ? 0.5 : 1 }}
              >
                {submitting ? "Adding..." : `Add ${drafts.length} task${drafts.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
