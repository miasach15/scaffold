import { useEffect, useRef, useState } from "react";
import { TASK_COLOR, TONE } from "../../lib/constants";
import { pad } from "../../lib/dateHelpers";
import { ghostBtn, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";

export default function FocusTimerModal({ task, onClose, onComplete, defaultMinutes }) {
  const initial = (defaultMinutes || 25) * 60;
  const [totalSeconds, setTotalSeconds] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

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

  const setPreset = (mins) => {
    setRunning(false);
    setTotalSeconds(mins * 60);
    setRemaining(mins * 60);
  };
  const reset = () => { setRunning(false); setRemaining(totalSeconds); };
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const pct = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
  const finished = remaining === 0;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 320, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 11.5, color: "#93A0AD", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Focus session</div>
        <div style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 18px", color: "#000000" }}>{task.title}</div>

        <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 18px" }}>
          <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
            <defs>
              <linearGradient id="focusRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F0B9CE" />
                <stop offset="100%" stopColor="#B5AEEA" />
              </linearGradient>
            </defs>
            <circle cx="80" cy="80" r="70" fill="none" stroke="#EDEDED" strokeWidth="10" />
            <circle
              cx="80" cy="80" r="70" fill="none" stroke={finished ? TONE.warn.text : "url(#focusRingGradient)"} strokeWidth="10"
              strokeDasharray={2 * Math.PI * 70}
              strokeDashoffset={2 * Math.PI * 70 * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset .3s linear" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, color: "#000000" }}>
            {pad(mm)}:{pad(ss)}
          </div>
        </div>

        {finished ? (
          <div style={{ fontSize: 13.5, color: TONE.warn.text, fontWeight: 700, marginBottom: 14 }}>Time's up. Nice focus session.</div>
        ) : (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
            {[15, 25, 50].map((m) => (
              <button key={m} onClick={() => setPreset(m)} style={{ ...ghostBtn, padding: "6px 12px", background: totalSeconds === m * 60 ? TASK_COLOR.bg : "#fff", borderColor: totalSeconds === m * 60 ? TASK_COLOR.border : "#E2E8F0", color: totalSeconds === m * 60 ? TASK_COLOR.text : "#4A5568" }}>{m}m</button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={() => setRunning((r) => !r)} disabled={finished} style={{ ...primaryBtn, flex: 1, opacity: finished ? 0.4 : 1 }}>{running ? "Pause" : "Start"}</button>
          <button onClick={reset} className="btn-ghost" style={ghostBtn}>Reset</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ ...ghostBtn, flex: 1 }}>Close</button>
          <button onClick={onComplete} style={{ ...ghostBtn, flex: 1, background: TASK_COLOR.bg, borderColor: TASK_COLOR.border, color: TASK_COLOR.text, fontWeight: 700 }}>Mark complete</button>
        </div>
      </div>
    </div>
  );
}
