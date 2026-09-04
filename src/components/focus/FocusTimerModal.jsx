import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { BORDER, INK, MUTED, PRIMARY, PRIMARY_DARK, PRIMARY_TINT, SURFACE, TASK_COLOR, TONE, serifFont } from "../../lib/constants";
import { pad } from "../../lib/dateHelpers";
import { ghostBtn, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";

// Fires a real system notification when a session ends — not just the in-app chime,
// which only helps if you happen to be looking at this tab. Reuses whatever Notification
// permission the browser already has (e.g. from turning on "What now?" reminders); if it's
// never been asked, this asks once. Silently does nothing if blocked — the chime still
// covers that case, this is a bonus, not a requirement.
async function notifySessionDone(title) {
  try {
    if (!("Notification" in window)) return;
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const payload = { body: `${title}. Nice focus session.`, icon: "/icon-192.png", tag: "focus-session" };
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) reg.showNotification("Focus session done", payload);
    else new Notification("Focus session done", payload);
  } catch {
    // Notifications unavailable/blocked — the in-app chime already covers this moment.
  }
}

export default function FocusTimerModal({ task, tasks, profile, setView, onToggleStepDone, onClose, onComplete, defaultMinutes }) {
  const initial = (defaultMinutes || 25) * 60;
  const [totalSeconds, setTotalSeconds] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  // The celebration screen replaces the timer face once you mark the task done — see
  // "Task Completed!" in the Figma kit. Distinct from `finished` (the timer running out
  // on its own): you can mark complete at any point, timer running or not.
  const [celebrating, setCelebrating] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);
  const intervalRef = useRef(null);
  // Created on the first Start (or Mark complete) click — a real user gesture, not
  // lazily when the timer actually ends minutes later — some browsers (Safari
  // especially) block audio that isn't traceable back to a direct gesture, so creating
  // it up front and just resuming it later is far more reliable than creating it fresh
  // at that point.
  const audioCtxRef = useRef(null);
  const prevRemainingRef = useRef(initial);

  const ensureAudioCtx = () => {
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      } catch {
        /* Web Audio unavailable — timer still works, just silently */
      }
    }
    return audioCtxRef.current;
  };

  useEffect(() => () => audioCtxRef.current?.close?.(), []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && prevRemainingRef.current !== 0) {
      playChime();
      notifySessionDone(task.title);
    }
    prevRemainingRef.current = remaining;
  }, [remaining, task.title]);

  // Shared tone player — a chime is just a short list of (frequency, start-offset) notes
  // played as gentle sine-wave blips rather than a harsh alarm beep.
  const playNotes = (notes) => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      notes.forEach(({ freq, start }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + 0.55);
      });
    } catch {
      // Web Audio unavailable/blocked — the visual state still shows either way.
    }
  };
  // A gentle descending-then-settled two-note chime for "time's up."
  const playChime = () => playNotes([{ freq: 880, start: 0 }, { freq: 1174.66, start: 0.18 }]);
  // A brighter three-note ascending run for "you did it" — distinct from the time's-up
  // chime so the two moments don't sound the same.
  const playSuccessChime = () => playNotes([{ freq: 523.25, start: 0 }, { freq: 659.25, start: 0.1 }, { freq: 783.99, start: 0.2 }]);

  const toggleRunning = () => {
    if (!running) ensureAudioCtx();
    setRunning((r) => !r);
  };

  const setPreset = (mins) => {
    setRunning(false);
    setTotalSeconds(mins * 60);
    setRemaining(mins * 60);
    prevRemainingRef.current = mins * 60;
  };
  const reset = () => { setRunning(false); setRemaining(totalSeconds); prevRemainingRef.current = totalSeconds; };
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const pct = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
  const finished = remaining === 0;

  // The rest of this task's breakdown (if it's one step of a "break it down" group) —
  // shown as a checklist so you can see the whole thing and check off steps without
  // leaving the timer.
  const steps = task.groupId ? (tasks || []).filter((t) => t.groupId === task.groupId).sort((a, b) => (a.date || "").localeCompare(b.date || "")) : [];

  useEffect(() => {
    if (celebrating) playSuccessChime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrating]);

  const markComplete = () => {
    ensureAudioCtx();
    setRunning(false);
    setCompletedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    onComplete();
    setCelebrating(true);
  };

  const takeBreak = () => {
    setCelebrating(false);
    ensureAudioCtx();
    setTotalSeconds(300);
    setRemaining(300);
    prevRemainingRef.current = 300;
    setRunning(true);
  };

  const continueToDashboard = () => {
    setView?.("dashboard");
    onClose();
  };

  const investedMin = Math.round(Math.max(0, totalSeconds - remaining) / 60);
  const stepsDoneInfo = task.groupId ? { done: steps.filter((s) => s.done).length, total: steps.length } : null;
  const firstName = (profile?.name || "").trim().split(" ")[0];
  // The next thing worth focusing on — soonest date, then soonest time of day, skipping
  // whatever's already done and the task that was just wrapped up.
  const nextTask = useMemo(() => {
    if (!celebrating) return null;
    return [...(tasks || [])]
      .filter((t) => !t.done && t.id !== task.id)
      .sort((a, b) => {
        const ad = a.date || "9999-99-99", bd = b.date || "9999-99-99";
        if (ad !== bd) return ad.localeCompare(bd);
        return (a.start ?? 99) - (b.start ?? 99);
      })[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrating, tasks, task.id]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: celebrating ? 440 : 320, maxWidth: "94vw", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        {celebrating ? (
          <div>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: PRIMARY_TINT, border: `2px solid ${PRIMARY}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Check size={28} color={PRIMARY_DARK} strokeWidth={2.5} />
            </div>
            <div style={{ display: "inline-block", background: PRIMARY_TINT, color: PRIMARY_DARK, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, padding: "5px 12px", borderRadius: 20, marginBottom: 16 }}>
              Task Completed!
            </div>
            <div style={{ fontFamily: serifFont, fontSize: 28, color: INK, marginBottom: 6, lineHeight: 1.15 }}>
              Fantastic effort{firstName ? `, ${firstName}` : ""}
            </div>
            <div style={{ fontFamily: serifFont, fontStyle: "italic", fontSize: 16, color: "#FF9286", marginBottom: 20 }}>
              "you did it — one step closer"
            </div>

            <div style={{ textAlign: "left", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8, fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: PRIMARY_DARK, textTransform: "uppercase" }}>{task.category}</div>
                <div style={{ color: MUTED, whiteSpace: "nowrap" }}>Completed today at {completedAt}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 12 }}>{task.title}</div>
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: "flex", gap: 28 }}>
                <div>
                  <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", marginBottom: 2 }}>Time invested</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{investedMin > 0 ? `${investedMin} minute${investedMin === 1 ? "" : "s"}` : "Under a minute"}</div>
                </div>
                {stepsDoneInfo && (
                  <div>
                    <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", marginBottom: 2 }}>Scaffold blocks</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{stepsDoneInfo.done}/{stepsDoneInfo.total} steps done</div>
                  </div>
                )}
              </div>
            </div>

            {nextTask && (
              <div style={{ textAlign: "left", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: PRIMARY_DARK, textTransform: "uppercase", marginBottom: 3 }}>Up next to focus on</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextTask.title}</div>
                </div>
                {nextTask.duration != null && (
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: PRIMARY_DARK, background: PRIMARY_TINT, padding: "4px 10px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap" }}>
                    Est. {Math.round(nextTask.duration)}m
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={takeBreak} style={{ ...ghostBtn, flex: 1, background: "#fff", fontWeight: 700 }}>Take a short break</button>
              <button onClick={continueToDashboard} style={{ ...primaryBtn, flex: 1 }}>Continue to Dashboard</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11.5, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Focus session</div>
            <div style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 18px", color: INK }}>{task.title}</div>

            <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 18px" }}>
              <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="80" cy="80" r="70" fill="none" stroke="#EDEDED" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r="70" fill="none" stroke={finished ? TONE.warn.text : TASK_COLOR.text} strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={2 * Math.PI * 70 * (1 - pct / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset .3s linear" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, color: INK }}>
                {pad(mm)}:{pad(ss)}
              </div>
            </div>

            {finished ? (
              <div style={{ fontSize: 13.5, color: TONE.warn.text, fontWeight: 700, marginBottom: 14 }}>Time's up. Nice focus session.</div>
            ) : (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
                {[15, 25, 50].map((m) => (
                  <button key={m} onClick={() => setPreset(m)} style={{ ...ghostBtn, padding: "6px 12px", background: "#fff", borderColor: totalSeconds === m * 60 ? TASK_COLOR.border : "#E2E8F0", color: totalSeconds === m * 60 ? TASK_COLOR.text : MUTED }}>{m}m</button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button onClick={toggleRunning} disabled={finished} style={{ ...primaryBtn, flex: 1, opacity: finished ? 0.4 : 1 }}>{running ? "Pause" : "Start"}</button>
              <button onClick={reset} className="btn-ghost" style={ghostBtn}>Reset</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: steps.length > 0 ? 16 : 0 }}>
              <button onClick={onClose} style={{ ...ghostBtn, flex: 1 }}>Close</button>
              {task.id && (
                <button onClick={markComplete} style={{ ...ghostBtn, flex: 1, background: "#fff", borderColor: TASK_COLOR.border, color: TASK_COLOR.text, fontWeight: 700 }}>Mark complete</button>
              )}
            </div>

            {steps.length > 0 && (
              <div style={{ textAlign: "left", borderTop: "1px solid #F0F0F0", paddingTop: 12 }}>
                <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                  Whole breakdown
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {steps.map((s) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Checkbox checked={s.done} onClick={() => onToggleStepDone(s.id, !s.done)} color={TASK_COLOR} />
                      <div style={{ flex: 1, fontSize: 13, textDecoration: s.done ? "line-through" : "none", opacity: s.done ? 0.5 : 1, fontWeight: s.id === task.id ? 700 : 400 }}>
                        {s.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
