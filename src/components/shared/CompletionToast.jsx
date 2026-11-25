import { useEffect, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";
import { onCompletion } from "../../lib/completionCelebration";
import Confetti from "./Confetti";

// Self-contained — mount it once (see App.jsx), same pattern as SaveErrorToast: it
// listens for reportCompletion() from anywhere and shows itself, confetti included.
const EXIT_MS = 180;
const SHOW_MS = 2600;

export default function CompletionToast() {
  const [title, setTitle] = useState(null);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const startClosing = () => {
    clearTimeout(timerRef.current);
    setClosing(true);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => { setTitle(null); setClosing(false); }, EXIT_MS);
  };

  useEffect(() => {
    return onCompletion((t) => {
      clearTimeout(timerRef.current);
      clearTimeout(closeTimerRef.current);
      setClosing(false);
      setTitle(t);
      timerRef.current = setTimeout(startClosing, SHOW_MS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { clearTimeout(timerRef.current); clearTimeout(closeTimerRef.current); }, []);

  if (!title) return null;

  return (
    <>
      <Confetti />
      {/* Same mobile lift as every other bottom toast — the tab bar would otherwise sit
          on top of it. */}
      <style>{`
        @media (max-width: 860px) {
          .completion-toast-mobile-lift { bottom: calc(78px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
      <div
        className="completion-toast-mobile-lift"
        style={{
          position: "fixed", bottom: "calc(22px + env(safe-area-inset-bottom))", left: "50%", zIndex: 200,
          animation: `${closing ? "toastSlideOut" : "toastSlideIn"} ${EXIT_MS}ms ease-${closing ? "in" : "out"} both`,
          display: "flex", alignItems: "center", gap: 10, background: "var(--primary-dark, #5849C4)", color: "#fff",
          padding: "10px 16px", borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
          fontSize: 13.5, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", maxWidth: "calc(100vw - 32px)",
        }}
      >
        <PartyPopper size={15} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <span>"{title}" done</span>
      </div>
    </>
  );
}
