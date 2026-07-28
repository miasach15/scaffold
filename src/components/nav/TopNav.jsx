import { Calendar as CalendarIcon, CheckSquare, Target, Repeat, BookOpen, GraduationCap } from "lucide-react";
import { ghostBtn } from "../../lib/styles";

function NavTab({ active, onClick, label, Icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px", fontSize: 14, fontWeight: 500, borderRadius: 999, marginBottom: 8,
        color: active ? "#000000" : "#93897A", background: active ? "#E7E3FC" : "transparent", border: "none",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {Icon && <Icon size={15} strokeWidth={2.3} />}
      {label}
    </button>
  );
}

export default function TopNav({ view, setView, onOpenWeeklyReview, onSignOut }) {
  const primary = [
    { key: "calendar", label: "Calendar", icon: CalendarIcon },
    { key: "tasks", label: "Tasks", icon: CheckSquare },
    { key: "goals", label: "Goals", icon: Target },
    { key: "habits", label: "Habits", icon: Repeat },
    { key: "journal", label: "Journal", icon: BookOpen },
  ];
  return (
    <div style={{ borderBottom: "1px solid rgba(239,233,224,0.7)", position: "sticky", top: 0, background: "rgba(250,248,244,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 20 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 21, color: "#000000", fontWeight: 600, letterSpacing: -0.3, marginRight: 8 }}>
          Scaffold
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {primary.map((p) => (
            <NavTab key={p.key} active={view === p.key} onClick={() => setView(p.key)} label={p.label} Icon={p.icon} />
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 4px" }} />
        <NavTab active={view === "education"} onClick={() => setView("education")} label="Education" Icon={GraduationCap} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, paddingBottom: 8 }}>
          <button onClick={onOpenWeeklyReview} className="btn-ghost" style={ghostBtn}>Weekly Review</button>
          <button onClick={onSignOut} className="btn-ghost" style={ghostBtn}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
