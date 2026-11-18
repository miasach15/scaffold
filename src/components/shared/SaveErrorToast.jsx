import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { onSaveError } from "../../lib/saveErrors";

// Self-contained — mount it once (see App.jsx) with no props. It listens for
// reportSaveError() calls from any data hook and shows itself; nothing else needs to
// know it exists.
// How long the slide-out gets to finish before the toast actually unmounts — matches
// the "out" keyframe's own duration below.
const EXIT_MS = 180;

export default function SaveErrorToast() {
  const [message, setMessage] = useState(null);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const startClosing = () => {
    clearTimeout(timerRef.current);
    setClosing(true);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => { setMessage(null); setClosing(false); }, EXIT_MS);
  };

  useEffect(() => {
    return onSaveError((msg) => {
      clearTimeout(timerRef.current);
      clearTimeout(closeTimerRef.current);
      setClosing(false);
      setMessage(msg);
      timerRef.current = setTimeout(startClosing, 6000);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { clearTimeout(timerRef.current); clearTimeout(closeTimerRef.current); }, []);

  if (!message) return null;

  return (
    <>
      {/* Same mobile lift as UndoToast, for the same reason — the bottom tab bar would
          otherwise sit on top of this. Slide+fade both ways (see App.jsx's shared
          toastSlideIn/Out keyframes) instead of popping in/out. */}
      <style>{`
        @media (max-width: 860px) {
          .save-error-toast-mobile-lift { bottom: calc(78px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
      <div
        className="save-error-toast-mobile-lift"
        style={{
          position: "fixed", bottom: "calc(22px + env(safe-area-inset-bottom))", left: "50%", zIndex: 200,
          animation: `${closing ? "toastSlideOut" : "toastSlideIn"} ${EXIT_MS}ms ease-${closing ? "in" : "out"} both`,
          display: "flex", alignItems: "center", gap: 10, background: "#3A2020", color: "#fff",
          padding: "10px 10px 10px 14px", borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", maxWidth: "calc(100vw - 32px)",
        }}
      >
        <WifiOff size={15} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <span>{message}</span>
        <button
          onClick={startClosing}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1, padding: "0 2px", cursor: "pointer", flexShrink: 0 }}
        >
          ×
        </button>
      </div>
    </>
  );
}
