import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, CheckSquare, Target, Repeat, BookOpen, GraduationCap, Film, BookMarked, UtensilsCrossed, Rocket, Luggage, Gift, StickyNote, ChevronDown, Settings, Search, Plus } from "lucide-react";
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

export default function TopNav({ view, setView, onOpenWeeklyReview, onOpenManagePages, onOpenSettings, onOpenSearch, onSignOut, enabledPages }) {
  const primary = [
    { key: "calendar", label: "Calendar", icon: CalendarIcon },
    { key: "tasks", label: "Tasks", icon: CheckSquare },
    { key: "education", label: "Education", icon: GraduationCap },
    { key: "goals", label: "Goals", icon: Target },
    { key: "habits", label: "Habits", icon: Repeat },
    { key: "journal", label: "Journal", icon: BookOpen },
  ];
  const lifestyle = LIFESTYLE_PAGE_META.filter((p) => enabledPages.includes(p.key));
  const lifestyleActive = lifestyle.some((p) => p.key === view);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);

  // The nav tabs sit in a horizontally-scrolling strip (so the whole bar stays on one
  // row on narrow screens); that container clips anything positioned outside its own
  // bounds, which was swallowing this dropdown. Render it into a portal instead, placed
  // with fixed coordinates from the button's own position, so it always shows up.
  const toggleMenu = () => {
    if (!menuOpen && menuBtnRef.current) {
      const r = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 6, left: r.left });
    }
    setMenuOpen((o) => !o);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && menuBtnRef.current && !menuBtnRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <div style={{ borderBottom: "1px solid rgba(226,226,226,0.7)", position: "sticky", top: 0, background: "rgba(250,250,250,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 20 }}>
      <div style={{ padding: "10px 20px 0", display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 21, color: "#000000", fontWeight: 600, letterSpacing: -0.3, flexShrink: 0 }}>
          Scaffold
        </div>
        <div className="topnav-scroll" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "nowrap", overflowX: "auto", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "nowrap", flexShrink: 0 }}>
            {primary.map((p) => (
              <NavTab key={p.key} active={view === p.key} onClick={() => setView(p.key)} label={p.label} Icon={p.icon} />
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 4px", flexShrink: 0 }} />

          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              ref={menuBtnRef}
              onClick={toggleMenu}
              style={{
                padding: "7px 14px", fontSize: 14, fontWeight: 500, borderRadius: 999, marginBottom: 6,
                color: lifestyleActive ? "#000000" : "#93897A", background: lifestyleActive ? PRIMARY_TINT : "transparent", border: "none",
                display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
              }}
            >
              Lifestyle
              <ChevronDown size={14} strokeWidth={2.3} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
            </button>
            {menuOpen && createPortal(
              <div ref={menuRef} style={{ position: "fixed", top: menuPos.top, left: menuPos.left, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, boxShadow: "0 12px 32px rgba(15,23,42,0.12)", padding: 6, minWidth: 210, zIndex: 1000 }}>
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
              </div>,
              document.body
            )}
          </div>
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
