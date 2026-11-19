import { useState } from "react";
import { Bell, Download, LogOut, Moon, Settings as SettingsIcon, Sun } from "lucide-react";
import { PRIMARY, SURFACE, THEME_PRESETS, TONE, serifFont } from "../../lib/constants";
import { downloadJSON, exportAllData } from "../../lib/exportData";
import { toISO } from "../../lib/dateHelpers";
import { ghostBtn, inputStyle, modalStyle, overlayStyle } from "../../lib/styles";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import CategoryEditor from "../shared/CategoryEditor";
import ModalPortal from "../shared/ModalPortal";
import { Switch } from "../shared/Misc";

function ToggleRow({ icon, label, on, onToggle, disabled }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "#2D3339" }}>
        {icon}
        {label}
      </div>
      <Switch on={on} onChange={onToggle} disabled={disabled} />
    </div>
  );
}

const HOUR_LABEL = (h) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);

// A plain, uncolored color-wheel symbol — shown on a custom swatch before any custom
// color has been picked, instead of an actual colored preview (there's no color to
// preview yet).
function ColorWheelIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" />
      <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" />
    </svg>
  );
}

const PACE_OPTIONS = [
  { value: 0.85, label: "Faster than average" },
  { value: 1, label: "About average" },
  { value: 1.25, label: "Takes me longer" },
  { value: 1.5, label: "Significantly longer (extended time)" },
];
const BUFFER_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
];
const TRANSITION_BUFFER_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 20, label: "20 min" },
];

export default function SettingsModal({ themeColor, onSetTheme, onSetCategoryColor, categoryKeys, onRenameCategory, onAddCategory, onRemoveCategory, protectedCategory, onReplayTour, darkMode, onToggleDarkMode, userId, whatnowNotifications, whatnowIntervalMinutes, whatnowWindowStart, whatnowWindowEnd, startReminders, morningPush, morningPushHour, paceMultiplier, afterSchoolBufferMinutes, transitionBufferMinutes, onUpdateProfile, onSignOut, onDeleteAccount, onClose }) {
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

  // All three reminder kinds ride on the same underlying device subscription, so
  // turning one off should only drop the subscription itself once none still need it.
  const toggleWhatnow = async () => {
    if (whatnowNotifications) {
      onUpdateProfile({ whatnowNotifications: false });
      if (!startReminders && !morningPush) await push.unsubscribe();
      return;
    }
    const ok = await push.subscribe();
    if (ok) onUpdateProfile({ whatnowNotifications: true });
  };

  const toggleStartReminders = async () => {
    if (startReminders) {
      onUpdateProfile({ startReminders: false });
      if (!whatnowNotifications && !morningPush) await push.unsubscribe();
      return;
    }
    const ok = await push.subscribe();
    if (ok) onUpdateProfile({ startReminders: true });
  };

  const toggleMorningPush = async () => {
    if (morningPush) {
      onUpdateProfile({ morningPush: false });
      if (!whatnowNotifications && !startReminders) await push.unsubscribe();
      return;
    }
    const ok = await push.subscribe();
    if (ok) onUpdateProfile({ morningPush: true });
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
    <ModalPortal>
    <div className="sheet-overlay" style={overlayStyle} onClick={onClose}>
      <div className="sheet-surface" style={{ ...modalStyle, width: 440, maxHeight: "85dvh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: serifFont, fontSize: 22, fontWeight: 500, letterSpacing: -0.2, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <SettingsIcon size={19} color={PRIMARY} strokeWidth={2} /> Settings
        </div>
        <div style={{ fontSize: 12.5, color: "#9CA3AF", marginBottom: 18 }}>Accent color</div>

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
                  background: SURFACE,
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: theme.primaryDark }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: active ? theme.primaryDark : "#4A5568" }}>{theme.label}</span>
              </button>
            );
          })}
          {(() => {
            const isCustom = typeof themeColor === "string" && themeColor.startsWith("custom:");
            const customHex = isCustom ? themeColor.slice(7) : "#8290D8";
            return (
              // A label wrapping a real (visually hidden) <input type="color"> — clicking
              // anywhere in it opens the browser's native color picker (a color wheel on
              // most platforms) with no extra JS needed to trigger it; onChange is the
              // only handler this actually needs.
              <label
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  padding: "12px 8px", borderRadius: 12, border: `1.5px solid ${isCustom ? customHex : "#E5E7EB"}`,
                  background: SURFACE, cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: isCustom ? customHex : "#F3F4F6",
                  }}
                >
                  {!isCustom && <ColorWheelIcon size={16} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: isCustom ? customHex : "#4A5568" }}>Custom</span>
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => onSetTheme(`custom:${e.target.value}`)}
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                />
              </label>
            );
          })()}
        </div>

        {categoryKeys && (
          <>
            <div style={{ fontSize: 12.5, color: "#9CA3AF", margin: "22px 0 10px" }}>Categories</div>
            <CategoryEditor
              categoryKeys={categoryKeys}
              categoryColors={resolvedColors}
              onRename={onRenameCategory}
              onAdd={onAddCategory}
              onRemove={onRemoveCategory}
              onSetCategoryColor={onSetCategoryColor}
              protectedKey={protectedCategory}
            />
          </>
        )}

        {onUpdateProfile && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 12.5, color: "#9CA3AF", marginBottom: 10 }}>Notifications</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <ToggleRow icon={<Bell size={14} strokeWidth={2.3} color={morningPush ? PRIMARY : "#8A94A0"} />} label="Good morning plan" on={morningPush} onToggle={toggleMorningPush} disabled={push.busy} />
                {morningPush && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#5A6472" }}>Every day at</span>
                    <select
                      value={morningPushHour}
                      onChange={(e) => onUpdateProfile({ morningPushHour: Number(e.target.value) })}
                      style={{ ...inputStyle, fontSize: 12, padding: "5px 7px" }}
                    >
                      {Array.from({ length: 24 }, (_, h) => h).map((h) => <option key={h} value={h}>{HOUR_LABEL(h)}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <ToggleRow icon={<Bell size={14} strokeWidth={2.3} color={whatnowNotifications ? PRIMARY : "#8A94A0"} />} label="What now? nudges" on={whatnowNotifications} onToggle={toggleWhatnow} disabled={push.busy} />
                {whatnowNotifications && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
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

              <div>
                <ToggleRow icon={<Bell size={14} strokeWidth={2.3} color={startReminders ? PRIMARY : "#8A94A0"} />} label="Time to start" on={startReminders} onToggle={toggleStartReminders} disabled={push.busy} />
                {startReminders && (
                  <div style={{ fontSize: 11.5, color: "#B4BCC5", marginTop: 6 }}>
                    Right when something on your calendar with a set time begins.
                  </div>
                )}
              </div>
            </div>

            {!push.supported && (
              <div style={{ fontSize: 11.5, color: "#B4BCC5", marginTop: 12 }}>
                Not supported in this browser (or the app isn't set up for push yet).
              </div>
            )}
            {push.error && <div style={{ fontSize: 11.5, color: "#B03A3A", marginTop: 12 }}>{push.error}</div>}
          </div>
        )}

        {onUpdateProfile && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 12.5, color: "#9CA3AF", marginBottom: 10 }}>Pace &amp; capacity</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#5A6472", minWidth: 130 }}>How long things take you</span>
                <select
                  value={paceMultiplier ?? 1}
                  onChange={(e) => onUpdateProfile({ paceMultiplier: Number(e.target.value) })}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 7px", flex: 1, minWidth: 160 }}
                >
                  {PACE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#5A6472", minWidth: 130 }}>After-school buffer</span>
                <select
                  value={afterSchoolBufferMinutes ?? 0}
                  onChange={(e) => onUpdateProfile({ afterSchoolBufferMinutes: Number(e.target.value) })}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 7px", flex: 1, minWidth: 160 }}
                >
                  {BUFFER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#5A6472", minWidth: 130 }}>Buffer around each thing</span>
                <select
                  value={transitionBufferMinutes ?? 0}
                  onChange={(e) => onUpdateProfile({ transitionBufferMinutes: Number(e.target.value) })}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 7px", flex: 1, minWidth: 160 }}
                  title="Padding before and after every fixed task/event (travel time, prep, decompressing), factored into 'done around' and free-time math"
                >
                  {TRANSITION_BUFFER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {onToggleDarkMode && (
          <div style={{ marginTop: 22 }}>
            <ToggleRow
              icon={darkMode ? <Moon size={14} strokeWidth={2.3} color={PRIMARY} /> : <Sun size={14} strokeWidth={2.3} color="#8A94A0" />}
              label="Dark mode"
              on={darkMode}
              onToggle={onToggleDarkMode}
            />
          </div>
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

        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{ ...ghostBtn, width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            <LogOut size={14} strokeWidth={2.3} />
            Log out
          </button>
        )}

        {onDeleteAccount && (
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${TONE.danger.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TONE.danger.text, marginBottom: 8 }}>Danger zone</div>
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
                  Permanently deletes your account and everything in it. Can't be undone.
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
    </ModalPortal>
  );
}
