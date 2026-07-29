import { PRIMARY, PRIMARY_DARK } from "./constants";

export const inputStyle = { padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, outline: "none" };
export const labelStyle = { fontSize: 11.5, fontWeight: 600, color: "#93A0AD", display: "block", marginBottom: 4 };
export const ghostBtn = { padding: "8px 14px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#4A5568", whiteSpace: "nowrap" };
export const primaryBtn = { padding: "9px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`, color: "#fff", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" };
export const suggestionChip = { padding: "5px 11px", borderRadius: 999, border: "1px dashed #D5DAE0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#6B7280" };
export const deleteBtn = { border: "none", background: "none", fontSize: 16, color: "#C2C9D1", padding: "0 4px" };
export const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: "1px solid #F4F6F8" };
export const overlayStyle = { position: "fixed", inset: 0, background: "rgba(15,23,32,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 };
export const modalStyle = { background: "#fff", borderRadius: 14, padding: 20, width: 360, maxWidth: "100%", boxShadow: "0 20px 50px rgba(0,0,0,0.15)" };
