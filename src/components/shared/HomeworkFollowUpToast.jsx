// A session finishing is ambiguous on its own — it could be the whole assignment, done
// in one sitting, or just that day's piece with more still to come. Rather than guess
// (see eduAutoComplete.js for why that used to go wrong), this asks directly, right after
// the checkbox pops. Same toast language as UndoToast, just two choices instead of one.
export default function HomeworkFollowUpToast({ title, onWholeThing, onJustToday }) {
  return (
    <>
      <style>{`
        @media (max-width: 860px) {
          .hw-followup-mobile-lift { bottom: calc(78px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
      <div
        className="hw-followup-mobile-lift"
        style={{
          position: "fixed", bottom: "calc(22px + env(safe-area-inset-bottom))", left: "50%", zIndex: 200,
          animation: "toastSlideIn 180ms ease-out both",
          display: "flex", alignItems: "center", gap: 10, background: "#232833", color: "#fff",
          padding: "10px 10px 10px 16px", borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", maxWidth: "calc(100vw - 32px)",
        }}
      >
        <span style={{ minWidth: 0 }}>Finished all of "{title}", or just today's part?</span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={onJustToday}
            style={{ background: "rgba(255,255,255,0.14)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12, padding: "6px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Just today
          </button>
          <button
            onClick={onWholeThing}
            style={{ background: "#fff", border: "none", borderRadius: 8, color: "#232833", fontWeight: 700, fontSize: 12, padding: "6px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            All done
          </button>
        </div>
      </div>
    </>
  );
}
