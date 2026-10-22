import { BORDER, MUTED, PRIMARY_DARK, SURFACE } from "./constants";

export const inputStyle = { padding: "9px 11px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none" };
export const labelStyle = { fontSize: 11.5, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 };
// Bigger, rounder hit targets than a typical web button — minHeight matches the ~40-44px
// touch-target floor the rest of the app already uses for anything tappable (see
// TodaySection's overdue-row controls), so every shared button reads as genuinely easy
// to hit, not just visually soft.
export const ghostBtn = { padding: "10px 16px", borderRadius: 12, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 13, fontWeight: 600, color: MUTED, whiteSpace: "nowrap", minHeight: 40 };
// Flat, not a gradient — a solid-color button reads as a real, considered product;
// a diagonal gradient slapped on every button is the single most obvious "made by an
// AI, in a hurry" tell there is.
export const primaryBtn = { padding: "11px 20px", borderRadius: 12, border: "none", background: PRIMARY_DARK, color: "#fff", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", minHeight: 40 };
export const suggestionChip = { padding: "7px 13px", borderRadius: 999, border: `1px dashed ${BORDER}`, background: SURFACE, fontSize: 12, fontWeight: 600, color: MUTED };
export const deleteBtn = { border: "none", background: "none", fontSize: 16, color: "#9CA3AF", padding: "6px 8px", borderRadius: 8, cursor: "pointer" };
export const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: `1px solid ${BORDER}` };
export const overlayStyle = { position: "fixed", inset: 0, background: "rgba(26,26,46,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 };
export const modalStyle = { background: SURFACE, borderRadius: 14, padding: 20, width: 360, maxWidth: "100%", boxShadow: "0 20px 50px rgba(26,26,46,0.18)" };

// Spread onto every native `<input type="date">` — blocks typing a date out by hand (no
// keyboard entry, no paste) while leaving the calendar-picker icon fully clickable. A lot
// of people don't realize that icon opens a picker and try to type the date instead,
// which is slower and easy to fumble; this makes the icon the only way in.
export const noTypeDateProps = {
  onKeyDown: (e) => { if (e.key !== "Tab") e.preventDefault(); },
  onPaste: (e) => e.preventDefault(),
};
