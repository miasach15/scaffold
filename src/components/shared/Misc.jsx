import { useRef } from "react";
import { Calendar } from "lucide-react";
import { PRIMARY, BORDER, MUTED, serifFont } from "../../lib/constants";
import { formatShortDate } from "../../lib/dateHelpers";
import { noTypeDateProps } from "../../lib/styles";

// The brand kit's monogram — the "S" mark, transparent background. Shared so every
// wordmark (Sidebar, AuthScreen, OnboardingQuiz) uses the exact same mark.
// `recolor`: once signed in, the Sidebar's copy (top-left, every page) tracks the
// user's chosen accent color instead of staying the fixed brand purple/coral — masks the
// PNG's alpha channel with the current --primary CSS var so the whole mark becomes one
// solid theme color. The pre-login mark (AuthScreen/OnboardingQuiz) stays native-colored,
// since there's no "your color" yet at that point.
export function Monogram({ size = 28, recolor = false }) {
  if (recolor) {
    return (
      <div
        role="img"
        aria-label="Scaffold"
        style={{
          width: size, height: size, flexShrink: 0, background: PRIMARY,
          WebkitMaskImage: "url(/logo-mark.png)", maskImage: "url(/logo-mark.png)",
          WebkitMaskSize: "contain", maskSize: "contain",
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
          WebkitMaskPosition: "center", maskPosition: "center",
        }}
      />
    );
  }
  return <img src="/logo-mark.png" width={size} height={size} alt="" style={{ display: "block", flexShrink: 0 }} />;
}

// A date field that shows only a calendar icon (plus the picked date once there is one)
// instead of a typeable mm/dd/yyyy box — a lot of people don't realize that box has a
// clickable picker and just try to type the date out, which is slower and easy to get
// wrong. The real `<input type="date">` stays in the DOM (still needed for the native
// picker and for form semantics) but is fully invisible and un-clickable; the button
// calls `showPicker()` on it directly. Falls back to focusing it on browsers without
// `showPicker` (older Safari/Firefox) — typing is still blocked there too via
// `noTypeDateProps`, so at worst you fall back to the icon-only look without the popup.
export function DatePickerButton({ value, onChange, title, placeholder = "Add date", style, inputRef }) {
  const ownRef = useRef(null);
  const ref = inputRef || ownRef;
  const open = () => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); } catch { el.focus(); }
    } else {
      el.focus();
    }
  };
  return (
    <button
      type="button"
      onClick={open}
      title={title}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff",
        fontSize: 13, color: value ? "#1A1A2E" : MUTED, cursor: "pointer", whiteSpace: "nowrap",
        ...style,
      }}
    >
      <Calendar size={14} strokeWidth={2.2} color={PRIMARY} style={{ flexShrink: 0 }} />
      {value ? formatShortDate(value) : placeholder}
      <input
        ref={ref}
        type="date"
        value={value || ""}
        onChange={onChange}
        {...noTypeDateProps}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", border: "none", padding: 0 }}
      />
    </button>
  );
}

// `right` is an optional slot for a page-specific stat/badge next to the title (e.g.
// Habits' "Weekly Completion: N%") — every other page just leaves it out.
export function SectionHeader({ title, subtitle, right }) {
  return (
    <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <div>
        <div style={{ fontFamily: serifFont, fontSize: 34, fontWeight: 500, color: "#000000", letterSpacing: -0.3, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "#8B95A1", marginTop: 4 }}>{subtitle}</div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}
export function SubHeader({ children }) {
  return <div style={{ fontSize: 11.5, fontWeight: 600, color: "#6B7280", letterSpacing: 0.5, textTransform: "uppercase", margin: "18px 0 8px", background: "#EFEFEF", display: "inline-block", padding: "5px 12px", borderRadius: 999 }}>{children}</div>;
}
export function AddRow({ children }) {
  return <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>{children}</div>;
}
export function List({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>;
}
export function EmptyState({ text }) {
  return <div style={{ fontSize: 13, color: "#B4BCC5", padding: "14px 0" }}>{text}</div>;
}
export function ProgressBar({ done, total, color, track }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div style={{ height: 5, borderRadius: 3, background: track || "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color.text, borderRadius: 3, transition: "width .2s" }} />
      </div>
      <div style={{ fontSize: 10.5, color: color.text, opacity: 0.8, marginTop: 3, fontWeight: 600 }}>{done} of {total} done</div>
    </div>
  );
}
export function FilterPill({ label, active, color, onClick }) {
  const c = color || { bg: "#F1F3F5", border: "#E2E8F0", text: "#4A5568" };
  return (
    <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: `1px solid ${active ? c.border : "#E5E9ED"}`, background: active ? c.bg : "#fff", color: active ? c.text : "#93A0AD" }}>
      {label}
    </button>
  );
}
