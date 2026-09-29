import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { onSaveError } from "../../lib/saveErrors";

// Self-contained — mount it once (see App.jsx) with no props. It listens for
// reportSaveError() calls from any data hook and shows itself; nothing else needs to
// know it exists.
export default function SaveErrorToast() {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return onSaveError((msg) => {
      setMessage(msg);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMessage(null), 6000);
    });
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!message) return null;

  return (
    <>
      {/* Same mobile lift as UndoToast, for the same reason — the bottom tab bar would
          otherwise sit on top of this. */}
      <style>{`
        @media (max-width: 860px) {
          .save-error-toast-mobile-lift { bottom: calc(78px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
      <div
        className="save-error-toast-mobile-lift"
        style={{
          position: "fixed", bottom: "calc(22px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", zIndex: 200,
          display: "flex", alignItems: "center", gap: 10, background: "#3A2020", color: "#fff",
          padding: "10px 10px 10px 14px", borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", maxWidth: "calc(100vw - 32px)",
        }}
      >
        <WifiOff size={15} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <span>{message}</span>
        <button
          onClick={() => { clearTimeout(timerRef.current); setMessage(null); }}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1, padding: "0 2px", cursor: "pointer", flexShrink: 0 }}
        >
          ×
        </button>
      </div>
    </>
  );
}
