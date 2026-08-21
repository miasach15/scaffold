import { useState } from "react";
import { Download, Moon, Settings as SettingsIcon, Sun } from "lucide-react";
import { CATEGORY_COLOR_SWATCHES, PRIMARY, THEME_PRESETS, serifFont } from "../../lib/constants";
import { downloadJSON, exportAllData } from "../../lib/exportData";
import { toISO } from "../../lib/dateHelpers";
import { ghostBtn, modalStyle, overlayStyle } from "../../lib/styles";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import CategoryEditor from "../shared/CategoryEditor";

export default function SettingsModal({ themeColor, onSetTheme, categoryColors, onSetCategoryColor, categoryKeys, onRenameCategory, onAddCategory, onRemoveCategory, onReplayTour, darkMode, onToggleDarkMode, userId, onClose }) {
  const resolvedColors = useCategoryColors();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const data = await exportAllData(userId);
      downloadJSON(data, `scaffold-backup-${toISO(new Date())}.json`);
    } catch (e) {
      setExportError(e.message || "Export failed — try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 440, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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

        {categoryKeys && (
          <>
            <div style={{ fontSize: 12.5, color: "#9CA3AF", margin: "22px 0 10px" }}>
              Categories — rename, add, or remove your own. Click the pencil to rename, × to remove.
            </div>
            <CategoryEditor
              categoryKeys={categoryKeys}
              categoryColors={resolvedColors}
              onRename={onRenameCategory}
              onAdd={onAddCategory}
              onRemove={onRemoveCategory}
            />
          </>
        )}

        <div style={{ fontSize: 12.5, color: "#9CA3AF", margin: "22px 0 10px" }}>Category colors — used across the calendar, goals, and onboarding.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {(categoryKeys || []).map((cat) => {
            const activeKey = categoryColors?.[cat];
            return (
              <div key={cat}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#4A5568", marginBottom: 6 }}>{cat}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(CATEGORY_COLOR_SWATCHES).map(([key, swatch]) => {
                    const active = activeKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => onSetCategoryColor(cat, key)}
                        title={key}
                        style={{
                          width: 26, height: 26, borderRadius: "50%", cursor: "pointer",
                          background: swatch.bg, border: `2px solid ${active ? swatch.border : "transparent"}`,
                          boxShadow: active ? `0 0 0 2px ${swatch.bg}` : "none",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            style={{ ...ghostBtn, width: "100%", marginTop: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            {darkMode ? <Sun size={14} strokeWidth={2.3} /> : <Moon size={14} strokeWidth={2.3} />}
            {darkMode ? "Switch to light mode" : "Switch to dark mode"}
          </button>
        )}
        <button onClick={onReplayTour} style={{ ...ghostBtn, width: "100%", marginTop: 8 }}>Replay page tour</button>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{ ...ghostBtn, width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: exporting ? 0.6 : 1 }}
        >
          <Download size={14} strokeWidth={2.3} />
          {exporting ? "Gathering everything..." : "Download a backup of everything"}
        </button>
        {exportError && <div style={{ fontSize: 12, color: "#B03A3A", marginTop: 6, textAlign: "center" }}>{exportError}</div>}
        <button onClick={onClose} style={{ ...ghostBtn, width: "100%", marginTop: 8 }}>Done</button>
      </div>
    </div>
  );
}
