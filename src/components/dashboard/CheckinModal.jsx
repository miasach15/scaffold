import { useState } from "react";
import { Mic, Square } from "lucide-react";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { MUTED, PRIMARY_DARK } from "../../lib/constants";
import { ghostBtn, inputStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";
import { supabase } from "../../lib/supabase";
import ModalPortal from "../shared/ModalPortal";

// A periodic "what did you actually get done" prompt (see DashboardView's hourly timer,
// plus a manual trigger for whenever you want it) — the point isn't a status report for
// its own sake, it's that marking things done here is what lets the rest of the day's
// plan (the remaining-time math, "done around X") reflect what's REALLY left instead of
// a schedule that's quietly gone stale since this morning.
export default function CheckinModal({ openItems, onClose, onMarkDone }) {
  const [report, setReport] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { doneIds, summary } once submitted
  const { supported: speechSupported, listening, toggle: toggleListening } = useSpeechToText((phrase) => {
    setReport((r) => (r && !/[\s.]$/.test(r) ? r + " " : r) + phrase);
  });

  const submit = async () => {
    if (!report.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("parse-progress-checkin", {
        body: { report: report.trim(), items: openItems.map((t) => ({ id: t.id, title: t.title })) },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data.doneIds?.length) onMarkDone(data.doneIds);
      setResult(data);
    } catch (e) {
      setError(e.message || "Couldn't check that in. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div style={overlayStyle} onClick={onClose}>
        <div style={{ ...modalStyle, width: 420 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 13, color: MUTED, fontWeight: 700, marginBottom: 4 }}>Quick check-in</div>

          {result ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Got it.</div>
              <div style={{ fontSize: 13, color: "#2A2A2A", lineHeight: 1.5, marginBottom: 18 }}>{result.summary}</div>
              <button onClick={onClose} className="btn-primary" style={{ ...primaryBtn, width: "100%" }}>Back to it</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>What got done?</div>
              <div style={{ fontSize: 12, color: "#93A0AD", marginBottom: 12 }}>Say or type it — finished stuff gets checked off, your day updates to match.</div>
              <div style={{ position: "relative" }}>
                <textarea
                  autoFocus
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  }}
                  placeholder="Finished the lab writeup, still working on the reading..."
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
