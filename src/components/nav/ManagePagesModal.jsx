import { LayoutGrid } from "lucide-react";
import { LIFESTYLE_COLORS, LIFESTYLE_PAGE_META, PRIMARY, serifFont } from "../../lib/constants";
import { ghostBtn, modalStyle, overlayStyle } from "../../lib/styles";

export default function ManagePagesModal({ enabledPages, onTogglePage, onClose }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: serifFont, fontSize: 22, fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <LayoutGrid size={19} color={PRIMARY} strokeWidth={2} /> Lifestyle Pages
        </div>
        <div style={{ fontSize: 12.5, color: "#93A0AD", marginBottom: 16 }}>Optional pages beyond your core Calendar/Tasks/Goals — a movie watchlist, packing lists, and more. Turn any of these on or off anytime; nothing gets deleted when you turn one off.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "55vh", overflowY: "auto" }}>
          {LIFESTYLE_PAGE_META.map((p) => {
            const active = enabledPages.includes(p.key);
            const col = LIFESTYLE_COLORS[p.key];
            return (
              <button
                key={p.key}
                onClick={() => onTogglePage(p.key)}
                style={{
                  padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 700, textAlign: "left",
                  border: `1.5px solid ${active ? col.border : "#E5E9ED"}`,
                  background: active ? col.bg : "#fff",
                  color: active ? col.text : "#000000",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                }}
              >
                <span>
                  {p.label}
                  <div style={{ fontWeight: 400, fontSize: 11.5, color: active ? col.text : "#93A0AD", opacity: 0.85, marginTop: 1 }}>{p.tagline}</div>
                </span>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{active ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>

        <button onClick={onClose} style={{ ...ghostBtn, width: "100%", marginTop: 16 }}>Done</button>
      </div>
    </div>
  );
}
