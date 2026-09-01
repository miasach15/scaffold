import { Undo2 } from "lucide-react";

export default function UndoToast({ label, onUndo }) {
  return (
    <div
      style={{
        position: "fixed", bottom: "calc(22px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", zIndex: 200,
        display: "flex", alignItems: "center", gap: 12, background: "#232833", color: "#fff",
        padding: "10px 10px 10px 16px", borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
        fontSize: 13.5, fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <span>{label}</span>
      <button
        onClick={onUndo}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.14)",
          border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "6px 10px", cursor: "pointer",
        }}
      >
        <Undo2 size={13} strokeWidth={2.3} /> Undo
      </button>
    </div>
  );
}
