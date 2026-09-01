import { BORDER, MUTED, PRIMARY_DARK } from "./constants";

export const inputStyle = { padding: "8px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none" };
export const labelStyle = { fontSize: 11.5, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 };
export const ghostBtn = { padding: "8px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", fontSize: 13, fontWeight: 600, color: MUTED, whiteSpace: "nowrap" };
// Flat, not a gradient — a solid-color button reads as a real, considered product;
// a diagonal gradient slapped on every button is the single most obvious "made by an
// AI, in a hurry" tell there is.
export const primaryBtn = { padding: "9px 18px", borderRadius: 10, border: "none", background: PRIMARY_DARK, color: "#fff", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" };
export const suggestionChip = { padding: "5px 11px", borderRadius: 999, border: `1px dashed ${BORDER}`, background: "#fff", fontSize: 12, fontWeight: 600, color: MUTED };
export const deleteBtn = { border: "none", background: "none", fontSize: 16, color: "#C7BCAE", padding: "0 4px" };
export const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: `1px solid ${BORDER}` };
export const overlayStyle = { position: "fixed", inset: 0, background: "rgba(54,48,43,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 };
export const modalStyle = { background: "#fff", borderRadius: 14, padding: 20, width: 360, maxWidth: "100%", boxShadow: "0 20px 50px rgba(54,48,43,0.18)" };
