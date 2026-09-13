import { useState } from "react";
import { Bell, Download, Moon, Settings as SettingsIcon, Sun } from "lucide-react";
import { CATEGORY_COLOR_SWATCHES, PRIMARY, THEME_PRESETS, TONE, serifFont } from "../../lib/constants";
import { downloadJSON, exportAllData } from "../../lib/exportData";
import { toISO } from "../../lib/dateHelpers";
import { ghostBtn, inputStyle, modalStyle, overlayStyle } from "../../lib/styles";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import CategoryEditor from "../shared/CategoryEditor";

const HOUR_LABEL = (h) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);

export default function SettingsModal({ themeColor, onSetTheme, categoryColors, onSetCategoryColor, categoryKeys, onRenameCategory, onAddCategory, onRemoveCategory, protectedCategory, onReplayTour, darkMode, onToggleDarkMode, userId, whatnowNotifications, whatnowIntervalMinutes, whatnowWindowStart, whatnowWindowEnd, onUpdateProfile, onDeleteAccount, onClose }) {
  const resolvedColors = useCategoryColors();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const push = usePushNotifications(userId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
    setDeleteError(null);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
      // No further cleanup needed on success — onDeleteAccount signs out, and the app
      // swaps back to the sign-in screen on its own once the session clears.
    } catch (e) {
      setDeleteError(e.message || "Couldn't delete your account. Try again.");
      setDeleting(false);
    }
  };

  const toggleWhatnow = async () => {
    if (whatnowNotifications) {
      await push.unsubscribe();
      onUpdateProfile({ whatnowNotifications: false });
      return;
    }
    const ok = await push.subscribe();
    if (ok) onUpdateProfile({ whatnowNotifications: true });
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const data = await exportAllData(userId);
      downloadJSON(data, `scaffold-backup-${toISO(new Date())}.json`);
    } catch (e) {
      setExportError(e.message || "Export failed. Try again.");
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
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: theme.primaryDark, boxShadow: active ? `0 0 0 3px ${theme.primaryTint}` : "none" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: active ? theme.primaryDark : "#4A5568" }}>{theme.label}</span>
              </button>
            );
          })}
        </div>

        {categoryKeys && (
          <>
            <div style={{ fontSize: 12.5, color: "#9CA3AF", margin: "22px 0 10px" }}>
              Categories: rename, add, or remove your own. Click the pencil to rename, × to remove.
            </div>
            <CategoryEditor
              categoryKeys={categoryKeys}
              categoryColors={resolvedColors}
              onRename={onRenameCategory}
              onAdd={onAddCategory}
              onRemove={onRemoveCategory}
              protectedKey={protectedCategory}
            />
          </>
        )}

        <div style={{ fontSize: 12.5, color: "#9CA3AF", margin: "22px 0 10px" }}>Category colors: used across the calendar, goals, and onboarding.</div>

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

        {onUpdateProfile && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 12.5, color: "#9CA3AF", marginBottom: 10 }}>
              "What now?" reminders: a push notification to your phone/desktop pointing at whatever's most worth doing right now.
            </div>
            <button
              onClick={toggleWhatnow}
              disabled={push.busy}
              style={{
                ...ghostBtn, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                opacity: push.busy ? 0.6 : 1,
                border: `1px solid ${whatnowNotifications ? PRIMARY : "#E2E8F0"}`,
                color: whatnowNotifications ? PRIMARY : "#4A5568",
              }}
            >
              <Bell size={14} strokeWidth={2.3} />
              {push.busy ? "Working on it..." : whatnowNotifications ? "Turn off reminders" : "Turn on reminders"}
            </button>
            {!push.supported && (
              <div style={{ fontSize: 11.5, color: "#B4BCC5", marginTop: 6 }}>
                Not supported in this browser (or the app isn't set up for push yet).
              </div>
            )}
            {push.error && <div style={{ fontSize: 11.5, color: "#B03A3A", marginTop: 6 }}>{push.error}</div>}

            {whatnowNotifications && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#5A6472" }}>Every</span>
                <select
                  value={whatnowIntervalMinutes}
                  onChange={(e) => onUpdateProfile({ whatnowIntervalMinutes: Number(e.target.value) })}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 7px" }}
                >
                  {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60}h`}</option>)}
                </select>
                <span style={{ fontSize: 12, color: "#5A6472" }}>between</span>
                <select
                  value={whatnowWindowStart}
                  onChange={(e) => onUpdateProfile({ whatnowWindowStart: Number(e.target.value) })}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 7px" }}
                >
                  {Array.from({ length: 24 }, (_, h) => h).map((h) => <option key={h} value={h}>{HOUR_LABEL(h)}</option>)}
                </select>
                <span style={{ fontSize: 12, color: "#5A6472" }}>and</span>
                <select
                  value={whatnowWindowEnd}
                  onChange={(e) => onUpdateProfile({ whatnowWindowEnd: Number(e.target.value) })}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 7px" }}
                >
                  {Array.from({ length: 24 }, (_, h) => h).map((h) => <option key={h} value={h}>{HOUR_LABEL(h)}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

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

        {onDeleteAccount && (
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${TONE.danger.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TONE.danger.text, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Danger zone</div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ ...ghostBtn, width: "100%", color: TONE.danger.text, borderColor: TONE.danger.border }}
              >
                Delete account
              </button>
            ) : (
              <div style={{ background: TONE.danger.bg, border: `1px solid ${TONE.danger.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12.5, color: TONE.danger.text, lineHeight: 1.5, marginBottom: 10 }}>
                  This permanently deletes your account and everything in it — every task, event, goal, habit, journal entry, class, grade, all of it. This can't be undone. Download a backup above first if you want to keep a copy.
                </div>
                <div style={{ fontSize: 11.5, color: TONE.danger.text, marginBottom: 6 }}>Type DELETE to confirm:</div>
                <input
                  autoFocus
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  disabled={deleting}
                  style={{ ...inputStyle, width: "100%", marginBottom: 10 }}
                />
                {deleteError && <div style={{ fontSize: 12, color: TONE.danger.text, marginBottom: 10 }}>{deleteError}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={cancelDelete} disabled={deleting} style={{ ...ghostBtn, flex: 1, opacity: deleting ? 0.6 : 1 }}>Cancel</button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE" || deleting}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, color: "#fff",
                      background: TONE.danger.text, cursor: deleteConfirmText.trim().toUpperCase() === "DELETE" && !deleting ? "pointer" : "default",
                      opacity: deleteConfirmText.trim().toUpperCase() === "DELETE" && !deleting ? 1 : 0.5,
                    }}
                  >
                    {deleting ? "Deleting..." : "Permanently delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} style={{ ...ghostBtn, width: "100%", marginTop: 8 }}>Done</button>
      </div>
    </div>
  );
}
