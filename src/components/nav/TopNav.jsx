import { Calendar as CalendarIcon, CheckSquare, Target, Repeat, BookOpen, GraduationCap, Film, BookMarked, UtensilsCrossed, Rocket, Luggage, Gift, StickyNote, Plus } from "lucide-react";
import { LIFESTYLE_PAGE_META } from "../../lib/constants";
import { ghostBtn } from "../../lib/styles";

const LIFESTYLE_ICONS = {
  movies: Film,
  books: BookMarked,
  restaurants: UtensilsCrossed,
  bucket: Rocket,
  packing: Luggage,
  gifts: Gift,
  notes: StickyNote,
};

function NavTab({ active, onClick, label, Icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px", fontSize: 14, fontWeight: 500, borderRadius: 999, marginBottom: 8,
        color: active ? "#000000" : "#93897A", background: active ? "#E7E3FC" : "transparent", border: "none",
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={15} strokeWidth={2.3} />}
      {label}
    </button>
  );
}

export default function TopNav({ view, setView, onOpenWeeklyReview, onOpenManagePages, onSignOut, enabledPages }) {
  const primary = [
    { key: "calendar", label: "Calendar", icon: CalendarIcon },
    { key: "tasks", label: "Tasks", icon: CheckSquare },
    { key: "goals", label: "Goals", icon: Target },
    { key: "habits", label: "Habits", icon: Repeat },
    { key: "journal", label: "Journal", icon: BookOpen },
  ];
  const lifestyle = LIFESTYLE_PAGE_META.filter((p) => enabledPages.includes(p.key));

  return (
    <div style={{ borderBottom: "1px solid rgba(239,233,224,0.7)", position: "sticky", top: 0, background: "rgba(250,248,244,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 20 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 21, color: "#000000", fontWeight: 600, letterSpacing: -0.3, marginRight: 8 }}>
          Scaffold
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {primary.map((p) => (
            <NavTab key={p.key} active={view === p.key} onClick={() => setView(p.key)} label={p.label} Icon={p.icon} />
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 4px" }} />
        <NavTab active={view === "education"} onClick={() => setView("education")} label="Education" Icon={GraduationCap} />
        {lifestyle.length > 0 && (
          <>
            <div style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 4px" }} />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {lifestyle.map((p) => (
                <NavTab key={p.key} active={view === p.key} onClick={() => setView(p.key)} label={p.label} Icon={LIFESTYLE_ICONS[p.key]} />
              ))}
            </div>
          </>
        )}
        <button onClick={onOpenManagePages} title="Add or remove pages" style={{ border: "1px dashed #D5DAE0", background: "none", borderRadius: 999, width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#93897A", marginBottom: 8 }}>
          <Plus size={14} />
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, paddingBottom: 8 }}>
          <button onClick={onOpenWeeklyReview} className="btn-ghost" style={ghostBtn}>Weekly Review</button>
          <button onClick={onSignOut} className="btn-ghost" style={ghostBtn}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
