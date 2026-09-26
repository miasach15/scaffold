import { useEffect, useState } from "react";
import { INK, PAPER_BG, serifFont } from "../../lib/constants";

const WORD = "Scaffold";
// Each letter's own animation-delay, staggered — the cascade is what makes it read as
// "coming in" rather than a plain fade. Tuned so the last letter lands, then there's a
// short beat to actually take in the full word, before the whole thing dissolves away.
const LETTER_MS = 70;
const LETTER_DURATION_MS = 700;
const HOLD_MS = 550;
const FADE_MS = 500;
const TOTAL_MS = WORD.length * LETTER_MS + LETTER_DURATION_MS + HOLD_MS + FADE_MS;

// A one-time animated entrance in front of the sign-in form (see AuthScreen) — "Scaffold"
// cascades in letter by letter, holds just long enough to read, then dissolves to reveal
// the real form underneath (already mounted the whole time, so there's no flash/reflow
// once this unmounts). Skippable by click/key for anyone who's seen it before, and skips
// itself instantly under prefers-reduced-motion.
export default function IntroSplash({ onDone }) {
  const [fadingOut, setFadingOut] = useState(false);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setSkip(true);
      onDone();
      return;
    }
    const fadeTimer = setTimeout(() => setFadingOut(true), TOTAL_MS - FADE_MS);
    const doneTimer = setTimeout(onDone, TOTAL_MS);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishNow = () => {
    setFadingOut(true);
    setTimeout(onDone, FADE_MS);
  };

  if (skip) return null;

  return (
    <div
      onClick={finishNow}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && finishNow()}
      title="Click to skip"
      style={{
        position: "fixed", inset: 0, zIndex: 1000, background: PAPER_BG,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", opacity: fadingOut ? 0 : 1, transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <style>{`
        @keyframes introLetterIn {
          0% { opacity: 0; transform: translateY(0.35em) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .intro-letter { display: inline-block; opacity: 0; animation: introLetterIn ${LETTER_DURATION_MS}ms cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .intro-letter { animation-duration: 1ms !important; animation-delay: 0ms !important; }
        }
      `}</style>
      <div style={{ fontFamily: serifFont, fontStyle: "italic", fontSize: "clamp(52px, 13vw, 150px)", color: INK, letterSpacing: -1 }}>
        {WORD.split("").map((ch, i) => (
          <span key={i} className="intro-letter" style={{ animationDelay: `${i * LETTER_MS}ms` }}>{ch}</span>
        ))}
      </div>
    </div>
  );
}
