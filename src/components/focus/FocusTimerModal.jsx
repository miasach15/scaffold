import { useEffect, useRef, useState } from "react";
import { INK, MUTED, TASK_COLOR, TONE } from "../../lib/constants";
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

export default function FocusTimerModal({ task, tasks, onToggleStepDone, onClose, onComplete, defaultMinutes }) {
  const initial = (defaultMinutes || 25) * 60;
  const [totalSeconds, setTotalSeconds] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  // Created inside the Start click (a real user gesture), not lazily when the timer
  // actually ends minutes later — some browsers (Safari especially) block audio that
  // isn't traceable back to a direct gesture, so creating it up front and just resuming
  // it at zero is far more reliable than creating it fresh at that point.
  const audioCtxRef = useRef(null);
  const prevRemainingRef = useRef(initial);

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

  const playChime = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      // A gentle two-note chime rather than a harsh alarm beep.
      [{ freq: 880, start: 0 }, { freq: 1174.66, start: 0.18 }].forEach(({ freq, start }) => {
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
      // Web Audio unavailable/blocked — the visual "Time's up" state still shows either way.
    }
  };

  const toggleRunning = () => {
    if (!running && !audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      } catch {
        /* Web Audio unavailable — timer still works, just silently */
      }
    }
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

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 320, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
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
            <button onClick={onComplete} style={{ ...ghostBtn, flex: 1, background: "#fff", borderColor: TASK_COLOR.border, color: TASK_COLOR.text, fontWeight: 700 }}>Mark complete</button>
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
      </div>
    </div>
  );
}
