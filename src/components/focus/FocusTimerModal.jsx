import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Pause, Pencil, Play, RotateCcw, X } from "lucide-react";
import { BORDER, CATEGORY_COLOR_SWATCHES, INK, MUTED, PRIMARY, PRIMARY_DARK, SURFACE, THEME_PRESETS, TONE, serifFont } from "../../lib/constants";
import { addDays, pad, toISO } from "../../lib/dateHelpers";
import { compareTaskPriority } from "../../lib/taskPriority";
import { ghostBtn, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import Checkbox from "../shared/Checkbox";
import ModalPortal from "../shared/ModalPortal";
import StepNotes from "../shared/StepNotes";

// Brand-kit coral (Figma "Brand & Identity" → Coral Main #FF9286, same hue the
// celebration screen's quote below already uses) — only a FALLBACK now, for a task
// whose category string doesn't resolve to anything in CATEGORY_COLORS (see catColor
// below, which is what the duration dial and "Mark complete" actually use day to day).
// The dial used to always render in this coral regardless of what the task was, which
// read as an arbitrary color choice rather than something tied to the task itself — it
// now picks up the task's own category color instead, same color that card/row already
// wears everywhere else in the app. Kept local to this modal rather than changing the
// shared TASK_COLOR constant, so Weekly Review's and Onboarding's own "this is a Task"
// legend color is untouched.
const ACCENT = { ...CATEGORY_COLOR_SWATCHES.coral, accent: THEME_PRESETS.coral.primary };

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

// One focus block on whatever task you opened this for, picked on a dial rather than a
// fixed-count round. 25 minutes is the classic length when nothing else suggests a
// number; a task's own estimate overrides it, snapped to the dial's 5-minute steps and
// capped at the dial's own 60-minute range so a much longer task still starts at a
// realistic length — running past it is always just "+10 more minutes" away (see the
// time's-up prompt) rather than needing a bigger block up front.
const DEFAULT_FOCUS_MIN = 25;
const DIAL_MIN = 5;
const DIAL_MAX = 60;
const DIAL_STEP = 5;
const snapToDial = (mins) => Math.min(DIAL_MAX, Math.max(DIAL_MIN, Math.round(mins / DIAL_STEP) * DIAL_STEP));
const BREAK_MIN = 10;
const ADD_TIME_MIN = 10;

// The drag-to-set duration dial a work block starts on — minutes map to a clock face
// (60/0 at top, 15 right, 30 bottom, 45 left, going clockwise), same convention an
// analog clock's minute hand already uses, so there's nothing new to learn about which
// way it turns. Center shows the whole-minute number, not a running countdown — this
// only ever renders before a block has started (see its one call site below).
function DurationDial({ minutes, onChange, size, color }) {
  const trackRef = useRef(null);
  const stroke = Math.round(size * 0.075);
  const r = (size - stroke) / 2;
  // The tick marks and clock-number labels draw OUTSIDE the ring (see `ticks`/`labels`
  // below), reaching out to r + stroke/2 + 16. Sizing the wrapper box to just `size` left
  // no room for that — the labels landed on top of whatever sat above/below the dial
  // (the task title, the Start button). `box` reserves that space so the dial's real
  // footprint, including labels, is what pushes neighboring elements away.
  const pad = Math.max(28, Math.round(size * 0.2));
  const box = size + pad * 2;
  const cx = box / 2;
  const cy = box / 2;
  const fraction = minutes / 60;
  const circumference = 2 * Math.PI * r;

  // Clockwise-from-top angle (degrees) -> screen position, and the reverse for turning a
  // pointer position back into minutes. Kept as plain sin/cos here (not the SVG
  // rotate(-90deg)-plus-dashoffset trick the running countdown ring below uses) because
  // the handle dot and the four clock numbers need real x/y points, not just a stroke
  // length.
  const pointAt = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  };
  const minutesFromClient = (clientX, clientY) => {
    const rect = trackRef.current.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    const raw = (deg / 360) * 60 || 60; // dead-on-top (deg=0) reads as a full 60, not 0
    return snapToDial(raw);
  };

  const handleMove = (e) => {
    const p = "touches" in e ? e.touches[0] : e;
    if (!p) return;
    onChange(minutesFromClient(p.clientX, p.clientY));
  };
  const startDrag = (e) => {
    e.preventDefault();
    handleMove(e);
    const onMove = (ev) => handleMove(ev);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  const handlePos = pointAt(fraction * 360);
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30); // every 5 minutes
  const labels = [[15, 90], [30, 180], [45, 270], [60, 0]];

  return (
    <div style={{ position: "relative", width: box, height: box, margin: "0 auto", touchAction: "none" }}>
      <svg
        ref={trackRef}
        width={box} height={box} viewBox={`0 0 ${box} ${box}`}
        onMouseDown={startDrag} onTouchStart={startDrag}
        style={{ cursor: "grab", display: "block" }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color.bg} strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r} fill="none" stroke={color.accent} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {ticks.map((deg) => {
          const inner = pointAt(deg);
          const outer = { x: cx + (r + stroke / 2 + 5) * Math.sin((deg * Math.PI) / 180), y: cy - (r + stroke / 2 + 5) * Math.cos((deg * Math.PI) / 180) };
          const onFilled = ((deg / 360) * 60 || 60) <= minutes;
          return <line key={deg} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={onFilled ? "#fff" : color.border} strokeWidth={1.5} strokeLinecap="round" />;
        })}
        <circle cx={handlePos.x} cy={handlePos.y} r={stroke * 0.62} fill={color.accent} stroke="#fff" strokeWidth={2.5} style={{ cursor: "grab" }} />
      </svg>
      {labels.map(([m, deg]) => {
        const p = pointAt(deg);
        const labelR = r + stroke / 2 + 16;
        const lx = cx + labelR * Math.sin((deg * Math.PI) / 180);
        const ly = cy - labelR * Math.cos((deg * Math.PI) / 180);
        return (
          <div key={m} style={{ position: "absolute", left: lx, top: ly, transform: "translate(-50%, -50%)", fontSize: 11.5, fontWeight: 600, color: MUTED, pointerEvents: "none" }}>
            {m}
          </div>
        );
      })}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ fontFamily: serifFont, fontSize: size * 0.24, color: INK, lineHeight: 1 }}>{minutes}</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: MUTED, marginTop: 4 }}>MINS</div>
      </div>
    </div>
  );
}

export default function FocusTimerModal({ task, tasks, eduItems, profile, setView, onToggleStepDone, onClose, onComplete, defaultMinutes, onOpenDetail, onSwitchTask, portalTarget }) {
  const CATEGORY_COLORS = useCategoryColors();
  const catColor = CATEGORY_COLORS[task.category] || ACCENT;
  const initial = snapToDial(defaultMinutes || DEFAULT_FOCUS_MIN) * 60;
  const [totalSeconds, setTotalSeconds] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  // Whether the timer's currently running the work block or a break — `totalSeconds`/
  // `remaining` above are reused for both, so the work length gets stashed separately
  // (workSecondsRef) to restore once a break ends and work resumes.
  const [phase, setPhase] = useState("work"); // "work" | "break"
  const workSecondsRef = useRef(initial);
  // The floating card is anchored bottom-right, so its one resize handle sits at the
  // opposite (top-left) corner — pulling it away from the anchor grows the card, same
  // direction the cursor actually moves. `null` means "default size, not resized yet".
  const [boxSize, setBoxSize] = useState(null);
  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = boxSize?.width ?? 340;
    const startHeight = boxSize?.height ?? e.currentTarget.parentElement.getBoundingClientRect().height;
    const onMove = (ev) => {
      const width = Math.min(Math.max(300, startWidth + (startX - ev.clientX)), window.innerWidth - 40);
      const height = Math.min(Math.max(280, startHeight + (startY - ev.clientY)), window.innerHeight - 40);
      setBoxSize({ width, height });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
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
  // The wall-clock moment the countdown should hit 0 — set whenever running starts (or
  // resumes). Background/inactive tabs get their setInterval throttled by the browser
  // (sometimes down to once a minute or less), so counting down by decrementing once per
  // tick would drift or stall while the tab isn't in front. Deriving `remaining` from
  // real elapsed time against this fixed timestamp means whatever tick DOES get through
  // — even a late one — snaps the displayed time (and the end-of-session chime/
  // notification below, which fires off `remaining` reaching 0) back to correct.
  const endTimeRef = useRef(null);

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
    if (!running) return;
    const tick = () => {
      const secsLeft = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setRemaining(secsLeft);
      if (secsLeft <= 0) setRunning(false);
    };
    tick(); // correct immediately on start/resume rather than waiting a full second
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // A throttled background tab's setInterval can go quiet for a while — catching up the
  // instant the tab (or window) becomes visible again means the countdown and the
  // end-of-session chime/notification are never stuck waiting on the next lucky tick.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !running || endTimeRef.current == null) return;
      const secsLeft = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setRemaining(secsLeft);
      if (secsLeft <= 0) setRunning(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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
    if (!running) {
      ensureAudioCtx();
      endTimeRef.current = Date.now() + remaining * 1000;
    }
    setRunning((r) => !r);
  };

  const setPreset = (mins) => {
    setRunning(false);
    setTotalSeconds(mins * 60);
    setRemaining(mins * 60);
    prevRemainingRef.current = mins * 60;
    endTimeRef.current = null;
    workSecondsRef.current = mins * 60;
  };
  const reset = () => {
    setRunning(false);
    setRemaining(totalSeconds);
    prevRemainingRef.current = totalSeconds;
    endTimeRef.current = null;
  };
  // Ran out the clock mid-task — rather than another full lap of the same length, this
  // just tacks on a bit more time and keeps the same countdown going, so a task that
  // genuinely just needed a few more minutes doesn't get treated the same as one that
  // needs a real break.
  const addMoreTime = () => {
    ensureAudioCtx();
    const addSecs = ADD_TIME_MIN * 60;
    setTotalSeconds((s) => s + addSecs);
    setRemaining(addSecs);
    prevRemainingRef.current = addSecs;
    endTimeRef.current = Date.now() + addSecs * 1000;
    setRunning(true);
  };
  // A work block just ended (or you chose to step away) — hand off to a break instead of
  // straight back to the same countdown.
  const startBreak = () => {
    ensureAudioCtx();
    setPhase("break");
    setTotalSeconds(BREAK_MIN * 60);
    setRemaining(BREAK_MIN * 60);
    prevRemainingRef.current = BREAK_MIN * 60;
    endTimeRef.current = Date.now() + BREAK_MIN * 60 * 1000;
    setRunning(true);
  };
  // Break's over (or skipped) — back to the same task, same length work block as before.
  const backToWork = () => {
    ensureAudioCtx();
    setPhase("work");
    const secs = workSecondsRef.current;
    setTotalSeconds(secs);
    setRemaining(secs);
    prevRemainingRef.current = secs;
    endTimeRef.current = Date.now() + secs * 1000;
    setRunning(true);
  };
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const finished = remaining === 0;

  // The countdown in the browser tab's own title (next to the favicon) — so it's
  // visible at a glance even on another tab, not just while this modal is in front.
  // The true original title is captured once on mount/restored once on unmount, rather
  // than inside the per-tick effect below, so a brief in-between tick's title never
  // ends up "stuck" as what gets restored when the timer closes.
  const originalTitleRef = useRef(document.title);
  useEffect(() => {
    return () => { document.title = originalTitleRef.current; };
  }, []);
  useEffect(() => {
    document.title = finished ? `Done · ${originalTitleRef.current}` : `${mm}:${pad(ss)} · ${originalTitleRef.current}`;
  }, [mm, ss, finished]);

  // The rest of this task's breakdown (if it's one step of a "break it down" group) —
  // shown as a checklist so you can see the whole thing and check off steps without
  // leaving the timer.
  const steps = task.groupId ? (tasks || []).filter((t) => t.groupId === task.groupId).sort((a, b) => (a.date || "").localeCompare(b.date || "")) : [];

  // Which other still-open task to offer switching to once a lap finishes without the
  // current one being done — same soonest-first pick as the celebration screen's own
  // "Up next" below, just triggered by running out of time instead of marking complete.
  // A homework/assignment's own session task doesn't get flagged done just because its
  // parent Education item was marked done directly (see shouldAutoCompleteEduItem) — so
  // without this check, a session for something already turned in can still surface here
  // as if it were live work waiting on you.
  const otherTask = useMemo(() => {
    if (!finished || task.done) return null;
    const doneEduIds = new Set((eduItems || []).filter((e) => e.done).map((e) => e.id));
    return [...(tasks || [])]
      .filter((t) => !t.done && t.id !== task.id && !(t.eduId && doneEduIds.has(t.eduId)))
      .sort((a, b) => {
        const ad = a.date || "9999-99-99", bd = b.date || "9999-99-99";
        if (ad !== bd) return ad.localeCompare(bd);
        return (a.start ?? 99) - (b.start ?? 99);
      })[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, task.done, task.id, tasks, eduItems]);

  useEffect(() => {
    if (celebrating) playSuccessChime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrating]);

  const markComplete = () => {
    ensureAudioCtx();
    setRunning(false);
    setCompletedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    onComplete(investedMin);
    setCelebrating(true);
  };

  const takeBreak = () => {
    setCelebrating(false);
    ensureAudioCtx();
    setTotalSeconds(300);
    setRemaining(300);
    prevRemainingRef.current = 300;
    endTimeRef.current = Date.now() + 300 * 1000;
    setRunning(true);
  };

  const continueToDashboard = () => {
    setView?.("dashboard");
    onClose();
  };

  const investedMin = Math.round(Math.max(0, totalSeconds - remaining) / 60);
  const stepsDoneInfo = task.groupId ? { done: steps.filter((s) => s.done).length, total: steps.length } : null;
  // How many tasks you've actually finished today — real data, not a made-up daily quota.
  const todayISO = toISO(new Date());
  const completedTodayCount = (tasks || []).filter((t) => t.done && t.date === todayISO).length;
  const firstName = (profile?.name || "").trim().split(" ")[0];
  // The next thing worth focusing on, by the exact same priority Dashboard/Tasks use
  // (compareTaskPriority) — not just whatever has the nearest raw date, which used to
  // pick an arbitrary later step of a multi-session project instead of its real next
  // step, and ignored assignment/test/homework priority entirely. A multi-step
  // breakdown collapses to its one earliest undone step (same as Dashboard's
  // groupItems); a multi-session assignment/test collapses to its most due-or-overdue
  // undone session, or its soonest upcoming one if none are due yet (same as
  // eduSessionItems) — otherwise this could surface some other session of the SAME
  // assignment Dashboard already represents as a single different row.
  const nextTask = useMemo(() => {
    if (!celebrating) return null;
    const doneEduIds = new Set((eduItems || []).filter((e) => e.done).map((e) => e.id));
    const activeGroupSteps = {};
    const activeEduSessions = {};
    const plain = [];
    (tasks || []).forEach((t) => {
      if (t.done || t.id === task.id) return;
      if (t.groupId) { (activeGroupSteps[t.groupId] ||= []).push(t); return; }
      if (t.eduId) {
        if (doneEduIds.has(t.eduId)) return;
        (activeEduSessions[t.eduId] ||= []).push(t);
        return;
      }
      plain.push(t);
    });
    const groupItems = Object.values(activeGroupSteps).map((steps) => {
      const sorted = steps.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      const next = sorted[0];
      return { ...next, date: next.groupDueDate || next.date };
    });
    const eduSessionItems = Object.values(activeEduSessions)
      .map((sessions) => sessions.slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")))
      .map((sorted) => {
        const due = sorted.filter((t) => t.date && t.date <= todayISO);
        return due.length > 0 ? due[due.length - 1] : sorted[0];
      })
      .filter(Boolean)
      .map((t) => {
        const parent = (eduItems || []).find((e) => e.id === t.eduId);
        const dueDate = parent?.dueDate || t.date;
        const sortDate = parent?.flexible ? toISO(addDays(new Date(dueDate + "T00:00:00"), 1)) : dueDate;
        return { ...t, date: dueDate, sortDate };
      });
    return [...plain, ...groupItems, ...eduSessionItems].sort((a, b) => compareTaskPriority(a, b, todayISO))[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrating, tasks, eduItems, task.id, todayISO]);

  if (!celebrating) {
    // Rendered either as a fixed bottom-right floating card (the default, everywhere
    // except Dashboard), or portaled into Dashboard's own focus-timer slot as a plain
    // in-flow card — same single component instance either way, so the running timer's
    // state never resets when `portalTarget` flips (see App.jsx's dashboardFocusSlot).
    // Embedded (portalTarget) uses tighter sizing throughout — this card replaces
    // Dashboard's own compact idle picker the instant a session starts, so without this
    // it visibly balloons in that same slot right when you press Start.
    const compact = !!portalTarget;
    const ringSize = compact ? 106 : 148;
    const ringRadius = compact ? 44 : 64;
    const ringStroke = compact ? 6 : 9;
    const card = (
      <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: portalTarget ? "0 4px 24px rgba(26,26,46,0.05)" : "0 20px 50px rgba(26,26,46,0.18)", padding: compact ? "14px 16px" : "18px 20px", height: portalTarget ? undefined : "100%", overflowY: portalTarget ? undefined : "auto", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 12.5, color: PRIMARY, fontWeight: 700 }}>{phase === "work" ? "Focus Session" : "Break"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {task.id && onOpenDetail && (
                <button
                  onClick={() => { onOpenDetail(task.id); onClose(); }}
                  title="Edit this task"
                  style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 2, display: "flex" }}
                >
                  <Pencil size={13} strokeWidth={2.2} />
                </button>
              )}
              <button onClick={onClose} title="Close" style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 2, display: "flex" }}>
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
            <div style={{ fontFamily: serifFont, fontSize: compact ? 17 : 19, color: INK, lineHeight: 1.2, minWidth: 0 }}>{task.title}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: catColor.text, textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
              {task.category}
            </div>
          </div>

          {phase === "work" && !running && !finished ? (
            // Idle and nothing started yet — drag the dial to set the block's length
            // instead of picking from a row of preset lengths.
            <div style={{ margin: compact ? "10px auto 2px" : "16px auto 4px" }}>
              <DurationDial minutes={Math.round(totalSeconds / 60)} onChange={(m) => setPreset(m)} size={compact ? 140 : 190} color={catColor} />
            </div>
          ) : (
            <div style={{ position: "relative", width: ringSize, height: ringSize, margin: compact ? "10px auto 2px" : "16px auto 4px" }}>
              <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke={BORDER} strokeWidth={ringStroke} />
                <circle
                  cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke={phase === "work" ? PRIMARY_DARK : TONE.soon.text} strokeWidth={ringStroke} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * ringRadius}
                  strokeDashoffset={2 * Math.PI * ringRadius * (1 - (totalSeconds > 0 ? remaining / totalSeconds : 0))}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: serifFont, fontSize: compact ? 22 : 34, color: INK, letterSpacing: 0.5 }}>
                  {pad(mm)}:{pad(ss)}
                </div>
              </div>
            </div>
          )}
          {!compact && (task.notes ? (
            <div style={{ marginBottom: 14 }}>
              <StepNotes notes={task.notes} title={task.title} taskId={task.id} color={MUTED} fontSize={12.5} align="center" />
            </div>
          ) : (
            <div style={{ marginBottom: 14 }} />
          ))}

          {finished && phase === "break" ? (
            // The break ran out — come back to the same task, or use the break as the
            // natural jumping-off point to switch to something else instead.
            <>
              <div style={{ textAlign: "center", fontSize: 13, color: TONE.soon.text, fontWeight: 700, marginTop: compact ? 8 : 0, marginBottom: compact ? 10 : 12 }}>
                Break's over.
              </div>
              <button
                onClick={backToWork}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
                  padding: compact ? "10px" : "13px", borderRadius: 999, border: "none", background: PRIMARY_DARK, color: "#fff",
                  fontSize: 14.5, fontWeight: 500, cursor: "pointer", marginBottom: compact ? 8 : 12,
                }}
              >
                <Play size={16} color="#fff" /> Back to it
              </button>
              {otherTask && (
                <button
                  onClick={() => onSwitchTask?.(otherTask.id, otherTask.title)}
                  style={{
                    display: "block", width: "100%", textAlign: "center", marginBottom: compact ? 8 : 12,
                    padding: compact ? "8px" : "10px", borderRadius: 14, border: `1px solid ${BORDER}`, background: "#fff", color: PRIMARY_DARK,
                    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Switch to "{otherTask.title}" instead
                </button>
              )}
            </>
          ) : finished && !task.done ? (
            // A work block runs out on its own on purpose — the point of a period is that
            // it ends, not that it quietly offers to keep going. A short block only works
            // if the rest after it is just as real, so the break leads here, not "switch
            // to the next thing" — that's still one tap away, just not the default.
            // "+10 more minutes" is still here for the time it's genuinely almost done,
            // just not the first thing offered either.
            <>
              <div style={{ textAlign: "center", fontSize: 13, color: TONE.warn.text, fontWeight: 700, marginTop: compact ? 8 : 0, marginBottom: compact ? 10 : 12 }}>
                Time's up on {task.title}. Take the break.
              </div>
              <button
                onClick={startBreak}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
                  padding: compact ? "10px" : "13px", borderRadius: 999, border: "none", background: PRIMARY_DARK, color: "#fff",
                  fontSize: 14.5, fontWeight: 500, cursor: "pointer", marginBottom: 8,
                }}
              >
                Take a {BREAK_MIN}m break
              </button>
              <div style={{ display: "flex", gap: 8, marginBottom: compact ? 8 : 10 }}>
                {otherTask ? (
                  <button
                    onClick={() => onSwitchTask?.(otherTask.id, otherTask.title)}
                    style={{ ...ghostBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff" }}
                  >
                    Switch to "{otherTask.title}" instead
                  </button>
                ) : null}
                <button
                  onClick={reset}
                  title="Restart this lap"
                  style={{ width: 48, flexShrink: 0, borderRadius: 14, border: `1px solid ${BORDER}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <RotateCcw size={16} color={MUTED} strokeWidth={2.2} />
                </button>
              </div>
              <button
                onClick={addMoreTime}
                style={{ display: "block", width: "100%", background: "none", border: "none", padding: compact ? "0 0 8px" : "0 0 10px", fontSize: 12.5, fontWeight: 600, color: MUTED, cursor: "pointer", textDecoration: "underline" }}
              >
                Almost done — just add {ADD_TIME_MIN} more minutes
              </button>
            </>
          ) : (
            <>
              {finished ? (
                <div style={{ textAlign: "center", fontSize: 13.5, color: TONE.warn.text, fontWeight: 700, marginTop: compact ? 8 : 0, marginBottom: compact ? 10 : 14 }}>Time's up. Nice focus session.</div>
              ) : phase === "work" ? null : (
                <div style={{ textAlign: "center", fontSize: 12.5, color: MUTED, marginTop: compact ? 8 : 0, marginBottom: compact ? 10 : 14 }}>
                  Break — back to it after.
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginBottom: compact ? 8 : 12 }}>
                <button
                  onClick={toggleRunning}
                  disabled={finished}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: compact ? "10px" : "13px", borderRadius: 999, border: "none", background: phase === "work" ? PRIMARY_DARK : TONE.soon.text, color: "#fff",
                    fontSize: 14.5, fontWeight: 500, opacity: finished ? 0.4 : 1, cursor: finished ? "default" : "pointer",
                  }}
                >
                  {running ? <Pause size={16} color="#fff" /> : <Play size={16} color="#fff" />}
                  {running ? (phase === "work" ? "Pause Session" : "Pause Break") : (phase === "work" ? "Start Session" : "Start Break")}
                </button>
                <button
                  onClick={reset}
                  title="Reset"
                  style={{ width: 48, flexShrink: 0, borderRadius: 14, border: `1px solid ${BORDER}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <RotateCcw size={16} color={MUTED} strokeWidth={2.2} />
                </button>
              </div>
            </>
          )}

          {task.id && (
            <button onClick={markComplete} style={{ display: "block", width: "100%", background: "none", border: "none", padding: compact ? "0 0 8px" : "0 0 12px", fontSize: 12.5, fontWeight: 600, color: PRIMARY_DARK, cursor: "pointer" }}>
              Mark complete
            </button>
          )}

          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: compact ? 8 : 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: MUTED }}>Completed today: {completedTodayCount}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: PRIMARY_DARK }}>{investedMin}m this session</div>
          </div>

          {!compact && steps.length > 0 && (
            <div style={{ textAlign: "left", borderTop: "1px solid #F0F0F0", marginTop: 12, paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 700, marginBottom: 8 }}>
                Whole breakdown
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {steps.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Checkbox checked={s.done} onClick={() => onToggleStepDone(s.id, !s.done)} color={{ border: PRIMARY_DARK }} />
                    <div style={{ flex: 1, fontSize: 13, textDecoration: s.done ? "line-through" : "none", opacity: s.done ? 0.5 : 1, fontWeight: s.id === task.id ? 700 : 400 }}>
                      {s.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    );

    if (portalTarget) return createPortal(card, portalTarget);
    return (
      <div
        style={{
          position: "fixed", bottom: "calc(20px + env(safe-area-inset-bottom))", right: 20, zIndex: 150,
          width: boxSize?.width ?? 340, height: boxSize?.height, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 40px)",
        }}
      >
        <div
          onMouseDown={startResize}
          title="Drag to resize"
          style={{
            position: "absolute", top: -6, left: -6, width: 16, height: 16, borderRadius: "50%",
            background: "#fff", border: `1.5px solid ${BORDER}`, cursor: "nwse-resize", zIndex: 1,
            boxShadow: "0 1px 4px rgba(15,23,42,0.15)",
          }}
        />
        {card}
      </div>
    );
  }

  return (
    <ModalPortal>
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 440, maxWidth: "94vw", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: PRIMARY_DARK, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Check size={28} color="#fff" strokeWidth={2.5} />
            </div>
            <div style={{ color: PRIMARY_DARK, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              Task completed
            </div>
            <div style={{ fontFamily: serifFont, fontSize: 28, color: INK, marginBottom: 6, lineHeight: 1.15 }}>
              Fantastic effort{firstName ? `, ${firstName}` : ""}
            </div>
            <div style={{ fontFamily: serifFont, fontStyle: "italic", fontSize: 16, color: "#FF9286", marginBottom: 20 }}>
              "you did it, one step closer"
            </div>

            <div style={{ textAlign: "left", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8, fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: PRIMARY_DARK, textTransform: "uppercase" }}>{task.category}</div>
                <div style={{ color: MUTED, whiteSpace: "nowrap" }}>Completed today at {completedAt}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 12 }}>{task.title}</div>
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: "flex", gap: 28 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 2 }}>Time invested</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{investedMin > 0 ? `${investedMin} minute${investedMin === 1 ? "" : "s"}` : "Under a minute"}</div>
                </div>
                {stepsDoneInfo && (
                  <div>
                    <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 2 }}>Steps done</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{stepsDoneInfo.done}/{stepsDoneInfo.total} steps done</div>
                  </div>
                )}
              </div>
            </div>

            {/* A small, physical-feeling tally of the actual wins today — same idea as
                Dashboard's own checked-off "Done today" list, just surfaced right at the
                moment one of them happens, instead of only as a number buried in a footer. */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: Math.min(completedTodayCount, 8) }).map((_, i) => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: catColor.accent }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>
                {completedTodayCount} focus win{completedTodayCount === 1 ? "" : "s"} today{completedTodayCount > 8 ? ` (+${completedTodayCount - 8})` : ""}
              </div>
            </div>

            {nextTask && (
              <div style={{ textAlign: "left", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: PRIMARY_DARK, marginBottom: 3 }}>Up next</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextTask.title}</div>
                </div>
                {nextTask.duration != null && (
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: PRIMARY_DARK, border: `1px solid ${BORDER}`, padding: "4px 10px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap" }}>
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
      </div>
    </div>
    </ModalPortal>
  );
}
