import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, CheckSquare, Target, Repeat, BookOpen, GraduationCap, Film, BookMarked, UtensilsCrossed, Rocket, Luggage, Gift, StickyNote, ChevronDown, Settings, Plus } from "lucide-react";
import { LIFESTYLE_PAGE_META, PRIMARY_TINT } from "../../lib/constants";
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
        color: active ? "#000000" : "#93897A", background: active ? PRIMARY_TINT : "transparent", border: "none",
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={15} strokeWidth={2.3} />}
      {label}
    </button>
  );
}

export default function TopNav({ view, setView, onOpenWeeklyReview, onOpenManagePages, onOpenSettings, onSignOut, enabledPages }) {
  const primary = [
    { key: "calendar", label: "Calendar", icon: CalendarIcon },
    { key: "tasks", label: "Tasks", icon: CheckSquare },
    { key: "goals", label: "Goals", icon: Target },
    { key: "habits", label: "Habits", icon: Repeat },
    { key: "journal", label: "Journal", icon: BookOpen },
  ];
  const lifestyle = LIFESTYLE_PAGE_META.filter((p) => enabledPages.includes(p.key));
  const lifestyleActive = lifestyle.some((p) => p.key === view);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <div style={{ borderBottom: "1px solid rgba(226,226,226,0.7)", position: "sticky", top: 0, background: "rgba(250,250,250,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 20 }}>
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

        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              padding: "8px 14px", fontSize: 14, fontWeight: 500, borderRadius: 999, marginBottom: 8,
              color: lifestyleActive ? "#000000" : "#93897A", background: lifestyleActive ? PRIMARY_TINT : "transparent", border: "none",
              display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}
          >
            Lifestyle
            <ChevronDown size={14} strokeWidth={2.3} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, boxShadow: "0 12px 32px rgba(15,23,42,0.12)", padding: 6, minWidth: 210, zIndex: 30 }}>
              {lifestyle.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "#9CA3AF", padding: "8px 10px" }}>No lifestyle pages turned on yet.</div>
              ) : (
                lifestyle.map((p) => {
                  const Icon = LIFESTYLE_ICONS[p.key];
                  const active = view === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => { setView(p.key); setMenuOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                        padding: "8px 10px", borderRadius: 8, border: "none", fontSize: 13.5, fontWeight: 500,
                        color: active ? "#000000" : "#3A3A3A", background: active ? PRIMARY_TINT : "transparent",
                      }}
                    >
                      <Icon size={15} strokeWidth={2.3} />
                      {p.label}
                    </button>
                  );
                })
              )}
              <div style={{ height: 1, background: "#F0F0F0", margin: "6px 4px" }} />
              <button
                onClick={() => { onOpenManagePages(); setMenuOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", fontSize: 13.5, fontWeight: 500, color: "#93897A", background: "none" }}
              >
                <Plus size={15} strokeWidth={2.3} />
                Add or remove pages
              </button>
            </div>
          )}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, paddingBottom: 8 }}>
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
