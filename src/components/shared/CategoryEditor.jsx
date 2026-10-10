import { useState } from "react";
import { Lock, Pencil, Plus, X } from "lucide-react";
import { CATEGORY_COLOR_SWATCHES } from "../../lib/constants";
import { ghostBtn, inputStyle } from "../../lib/styles";

// A plain, uncolored color-wheel symbol — shown on the custom swatch before any custom
// color has been picked, instead of an actual colored preview (there's no color to
// preview yet). Same icon SettingsModal used to draw inline for its own (now-removed)
// always-visible swatch rows.
function ColorWheelIcon({ size = 14 }) {
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

// Rename, add, or remove categories — shown as editable pill chips in the user's own
// colors. Used in both Settings and the onboarding quiz so the same controls work
// everywhere the category set can be changed. protectedKey (optional) is a category that
// can be renamed but never removed — its × is replaced with a small lock instead.
// onSetCategoryColor (optional — Settings passes it, the onboarding quiz doesn't) turns
// each pill itself into the color picker: click it (not the rename/remove icons) and a
// swatch grid opens right below the WHOLE pill row (not floating off the clicked pill
// itself) — a floating popover anchored to one pill in a wrapped row has nowhere safe to
// go that doesn't overlap either the edge of the screen or whatever sits right below it
// (the "Add a category" row, and Settings' next section after that); sitting inline here
// instead pushes that content down the normal way, same as every other expand/collapse
// in the app (e.g. a carried-over breakdown's step list), so nothing ever gets covered.
export default function CategoryEditor({ categoryKeys, categoryColors, onRename, onAdd, onRemove, protectedKey, onSetCategoryColor }) {
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [colorPickerKey, setColorPickerKey] = useState(null);

  const startEdit = (key) => {
    setEditingKey(key);
    setDraft(key);
  };
  const saveEdit = () => {
    if (draft.trim() && draft.trim() !== editingKey) onRename(editingKey, draft);
    setEditingKey(null);
  };
  const addNew = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
  };

  const pickerCol = colorPickerKey ? categoryColors[colorPickerKey] || { text: "#4A5568" } : null;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {categoryKeys.map((key) => {
          const col = categoryColors[key] || { bg: "#F1F3F5", border: "#C9D0D8", text: "#4A5568" };
          return editingKey === key ? (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditingKey(null);
                }}
                onBlur={saveEdit}
                style={{ ...inputStyle, width: 110, fontSize: 12.5, padding: "4px 8px" }}
              />
            </div>
          ) : (
            <div
              key={key}
              onClick={() => onSetCategoryColor && setColorPickerKey((k) => (k === key ? null : key))}
              title={onSetCategoryColor ? "Click to change this category's color" : undefined}
              style={{
                display: "inline-flex", alignItems: "center", gap: 3, padding: "5px 6px 5px 12px", borderRadius: 999,
                border: `1.5px solid ${col.border}`, background: col.bg, color: col.text, fontSize: 12.5, fontWeight: 700,
                cursor: onSetCategoryColor ? "pointer" : "default",
                boxShadow: colorPickerKey === key ? `0 0 0 2px ${col.border}` : "none",
              }}
            >
              {key}
              <button onClick={(e) => { e.stopPropagation(); startEdit(key); }} title="Rename" style={{ background: "none", border: "none", cursor: "pointer", color: col.text, opacity: 0.6, padding: 3, display: "flex" }}>
                <Pencil size={11} strokeWidth={2.3} />
              </button>
              {key === protectedKey ? (
                <span title="Always here (this category can't be removed)" style={{ color: col.text, opacity: 0.5, padding: 3, display: "flex" }}>
                  <Lock size={11} strokeWidth={2.3} />
                </span>
              ) : (
                categoryKeys.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); onRemove(key); }} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: col.text, opacity: 0.6, padding: 3, display: "flex" }}>
                    <X size={12} strokeWidth={2.3} />
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {colorPickerKey && (
        <ColorSwatchGrid
          label={colorPickerKey}
          labelColor={pickerCol.text}
          activeColorKey={categoryColors?.[colorPickerKey]}
          onPick={(value) => onSetCategoryColor(colorPickerKey, value)}
        />
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <input
          placeholder="Add a category..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNew()}
          style={{ ...inputStyle, flex: 1, fontSize: 12.5 }}
        />
        <button onClick={addNew} style={{ ...ghostBtn, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Plus size={13} strokeWidth={2.3} /> Add
        </button>
      </div>
    </div>
  );
}

// The actual swatch grid — same 10 presets + 1 custom-color-wheel slot the old always-
// visible per-category row used to show, just tucked behind a click now instead of
// sitting on the page for every category at once. Renders inline, right below the pill
// row (see the comment above CategoryEditor), rather than floating over nearby content.
function ColorSwatchGrid({ label, labelColor, activeColorKey, onPick }) {
  const isCustom = typeof activeColorKey === "string" && activeColorKey.startsWith("custom:");
  const customHex = isCustom ? activeColorKey.slice(7) : "#8290D8";
  return (
    <div
      style={{
        marginTop: 8, background: "#FAFAFC", border: "1px solid #E5E0EE", borderRadius: 12,
        padding: 10, display: "flex", flexDirection: "column", gap: 8,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: labelColor }}>{label}'s color</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, width: "fit-content" }}>
        {Object.entries(CATEGORY_COLOR_SWATCHES).map(([key, swatch]) => {
          // The custom swatch takes over the Peach slot (rather than tacking on a 12th
          // dot) so the grid stays a clean 6x2 instead of an awkward leftover row.
          if (key === "peach") {
            return (
              <label
                key="custom"
                title="Custom color"
                style={{
                  position: "relative", width: 26, height: 26, borderRadius: "50%", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isCustom ? customHex : "#F3F4F6",
                  border: `2px solid ${isCustom ? customHex : "transparent"}`,
                  boxShadow: isCustom ? `0 0 0 2px ${customHex}33` : "none",
                }}
              >
                {!isCustom && <ColorWheelIcon size={14} />}
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => onPick(`custom:${e.target.value}`)}
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                />
              </label>
            );
          }
          const active = activeColorKey === key;
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
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
}
