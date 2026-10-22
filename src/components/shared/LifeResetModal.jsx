import { useMemo, useState } from "react";
import { Wind } from "lucide-react";
import { BORDER, INK, MUTED, PRIMARY, PRIMARY_DARK, serifFont } from "../../lib/constants";
import { modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";
import { toISO } from "../../lib/dateHelpers";
import ModalPortal from "./ModalPortal";
import BrainDumpModal from "../dashboard/BrainDumpModal";

// A short, guided sequence for when the day's gotten away from you and the whole list
// feels like too much — a handful of small, mostly non-app steps plus two real hooks
// into things the app can actually do for you (a brain dump, a focus session on the
// smallest thing due today). Nothing here is saved; it's a walkthrough, not a record.
const TOTAL_STEPS = 7;

export default function LifeResetModal({ tasks, events, onAddTask, onStartFocus, setView, onClose }) {
  const [step, setStep] = useState(0);
  const [showBrainDump, setShowBrainDump] = useState(false);
  const todayISO = toISO(new Date());

  const todaysOpenTasks = useMemo(
    () => tasks.filter((t) => t.date === todayISO && !t.done),
    [tasks, todayISO]
  );
  const smallestTask = useMemo(() => {
    if (todaysOpenTasks.length === 0) return null;
    return [...todaysOpenTasks].sort((a, b) => (a.duration || 999) - (b.duration || 999))[0];
  }, [todaysOpenTasks]);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const startSmallWin = () => {
    if (!smallestTask) return;
    onClose();
    if (smallestTask.duration) onStartFocus(smallestTask.id, smallestTask.title, smallestTask.duration);
    else setView("tasks");
  };

  return (
    <ModalPortal>
      <div style={overlayStyle} onClick={onClose}>
        <div style={{ ...modalStyle, width: 400 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Wind size={18} color={PRIMARY} strokeWidth={2} />
            <div style={{ fontFamily: serifFont, fontSize: 20, fontWeight: 500 }}>Life reset</div>
          </div>
          <div style={{ display: "flex", gap: 4, margin: "14px 0 18px" }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? PRIMARY : BORDER }} />
            ))}
          </div>

          {step === 0 && (
            <StepBody
              title="Take a breath"
              body="Before anything else, just pause for a second. Nothing to check off here — only here when you're ready."
              onNext={next}
            />
          )}

          {step === 1 && (
            <>
              <StepBody
                title="Get it off your mind"
                body="Whatever's rattling around up there, get it out of your head and onto the page. You can sort it into real tasks after."
                primaryLabel="Open brain dump"
                onNext={() => setShowBrainDump(true)}
              />
              <button onClick={next} style={{ ...skipLinkStyle, marginTop: 8 }}>My mind's already clear</button>
            </>
          )}

          {step === 2 && (
            <StepBody
              title="Look at today, not the whole list"
              body={
                todaysOpenTasks.length === 0
                  ? "Nothing's sitting on today. Good a place as any to start fresh."
                  : `You have ${todaysOpenTasks.length} thing${todaysOpenTasks.length === 1 ? "" : "s"} on today. That's it — not the whole week.`
              }
              onNext={next}
            />
          )}

          {step === 3 && (
            <StepBody
              title="Tidy one small spot"
              body="Clear one surface — your desk, your nightstand, whatever's closest. Two minutes, not a deep clean."
              onNext={next}
            />
          )}

          {step === 4 && (
            <StepBody
              title="Drink some water"
              body="Have a glass of water, or something to eat, if you haven't already."
              onNext={next}
            />
          )}

          {step === 5 && (
            <>
              <StepBody
                title="Pick one small thing"
                body={
                  smallestTask
                    ? `Try this one: "${smallestTask.title}". Small enough to just start.`
                    : "Nothing queued for today — that's fine too. Come back to this once something's on the list."
                }
                primaryLabel={smallestTask ? "Start it" : "Continue"}
                onNext={smallestTask ? startSmallWin : next}
              />
              {smallestTask && <button onClick={next} style={{ ...skipLinkStyle, marginTop: 8 }}>Not that one</button>}
            </>
          )}

          {step === 6 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>That's the reset</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginBottom: 18 }}>
                However much of that you did, it counts. Go easy on yourself the rest of the day.
              </div>
              <button onClick={onClose} className="btn-primary" style={{ ...primaryBtn, width: "100%" }}>Done</button>
            </div>
          )}
        </div>
      </div>

      {showBrainDump && (
        <BrainDumpModal
          onClose={() => { setShowBrainDump(false); next(); }}
          onAddTask={onAddTask}
          tasks={tasks}
          events={events}
        />
      )}
    </ModalPortal>
  );
}

const skipLinkStyle = {
  display: "block", background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 600,
  color: "#93A0AD", textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer",
};

function StepBody({ title, body, primaryLabel = "Continue", onNext }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: INK }}>{title}</div>
      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginBottom: 18 }}>{body}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onNext} className="btn-primary" style={{ ...primaryBtn, flex: 1 }}>{primaryLabel}</button>
      </div>
    </div>
  );
}
