import { Calendar as CalendarIcon, CheckSquare, Target, Repeat, BookOpen, GraduationCap, Percent, Settings, Search } from "lucide-react";
import { PRIMARY_TINT } from "../../lib/constants";
import { ghostBtn } from "../../lib/styles";

function NavTab({ active, onClick, label, Icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px", fontSize: 14, fontWeight: 500, borderRadius: 999, marginBottom: 6,
        color: active ? "#000000" : "#93897A", background: active ? PRIMARY_TINT : "transparent", border: "none",
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={15} strokeWidth={2.3} />}
      {label}
    </button>
  );
}

export default function TopNav({ view, setView, onOpenWeeklyReview, onOpenSettings, onOpenSearch, onSignOut }) {
  const primary = [
    { key: "calendar", label: "Calendar", icon: CalendarIcon },
    { key: "tasks", label: "Tasks", icon: CheckSquare },
    { key: "education", label: "Education", icon: GraduationCap },
    { key: "grades", label: "Grades", icon: Percent },
    { key: "goals", label: "Goals", icon: Target },
    { key: "habits", label: "Habits", icon: Repeat },
    { key: "journal", label: "Journal", icon: BookOpen },
  ];

  return (
    <div style={{ borderBottom: "1px solid rgba(226,226,226,0.7)", position: "sticky", top: 0, background: "rgba(250,250,250,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 20 }}>
      <div style={{ padding: "10px 20px 0", display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 21, color: "#000000", fontWeight: 600, letterSpacing: -0.3, flexShrink: 0 }}>
          Scaffold
        </div>
        <div className="topnav-scroll" style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "nowrap", overflowX: "auto", minWidth: 0 }}>
          {primary.map((p) => (
            <NavTab key={p.key} active={view === p.key} onClick={() => setView(p.key)} label={p.label} Icon={p.icon} />
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, paddingBottom: 6, flexShrink: 0 }}>
          <button onClick={onOpenSearch} title="Search everything (⌘K or /)" className="btn-ghost" style={{ ...ghostBtn, width: 34, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Search size={15} />
          </button>
          <button data-tour="nav-settings" onClick={onOpenSettings} title="Settings" className="btn-ghost" style={{ ...ghostBtn, width: 34, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Settings size={15} />
          </button>
          <button data-tour="nav-weekly-review" onClick={onOpenWeeklyReview} className="btn-ghost" style={ghostBtn}>Weekly Review</button>
          <button onClick={onSignOut} className="btn-ghost" style={ghostBtn}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
