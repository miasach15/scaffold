import { Settings as SettingsIcon } from "lucide-react";
import { PRIMARY, THEME_PRESETS, serifFont } from "../../lib/constants";
import { ghostBtn, modalStyle, overlayStyle } from "../../lib/styles";

export default function SettingsModal({ themeColor, onSetTheme, onClose }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: serifFont, fontSize: 22, fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <SettingsIcon size={19} color={PRIMARY} strokeWidth={2} /> Settings
        </div>
        <div style={{ fontSize: 12.5, color: "#9CA3AF", marginBottom: 18 }}>Pick an accent color for buttons, highlights, and the calendar.</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
          {Object.entries(THEME_PRESETS).map(([key, theme]) => {
            const active = themeColor === key;
            return (
              <button
                key={key}
                onClick={() => onSetTheme(key)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  padding: "12px 8px", borderRadius: 12, border: `1.5px solid ${active ? theme.primary : "#E5E7EB"}`,
                  background: active ? theme.primaryTint : "#fff",
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`, boxShadow: active ? `0 0 0 3px ${theme.primaryTint}` : "none" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: active ? theme.primaryDark : "#4A5568" }}>{theme.label}</span>
              </button>
            );
          })}
        </div>

        <button onClick={onClose} style={{ ...ghostBtn, width: "100%", marginTop: 20 }}>Done</button>
      </div>
    </div>
  );
}
