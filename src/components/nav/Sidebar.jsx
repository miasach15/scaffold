import { useState } from "react";
import {
  Home, Calendar as CalendarIcon, CheckSquare, GraduationCap, Percent, Target, Repeat, BookOpen,
  Search, ListChecks, Settings, LogOut, Menu, X,
} from "lucide-react";
import { BORDER, INK, MUTED, PAPER_BG, PRIMARY_DARK, serifFont } from "../../lib/constants";
import { Monogram } from "../shared/Misc";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "calendar", label: "Calendar", icon: CalendarIcon },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "grades", label: "Grades", icon: Percent },
  { key: "goals", label: "Goals", icon: Target },
  { key: "habits", label: "Habits", icon: Repeat },
  { key: "journal", label: "Journal", icon: BookOpen },
];

// A little accent tag next to the wordmark, echoing the brand kit's "Rose Pink" —
// used nowhere else, so it's kept local rather than promoted to a shared constant.
const ACCENT_TAG_BG = "#FBCFE8";

function initialFrom(name, email) {
  const source = (name || "").trim() || (email || "").trim();
  return source ? source[0].toUpperCase() : "?";
}


export default function Sidebar({ view, setView, profile, email, onOpenWeeklyReview, onOpenSettings, onOpenSearch, onSignOut }) {
  const [open, setOpen] = useState(false);
  const displayName = profile?.name || (email ? email.split("@")[0] : "");

  const go = (key) => {
    setView(key);
    setOpen(false);
  };

  return (
    <>
      <style>{`
        .sb-topbar { display: none; }
        .sb-backdrop { display: none; }
        @media (max-width: 860px) {
          .sb-rail {
            position: fixed; top: 0; bottom: 0; left: 0; z-index: 200; width: 250px;
            transform: translateX(-100%); transition: transform .25s ease;
            padding-top: calc(24px + env(safe-area-inset-top));
            padding-bottom: calc(24px + env(safe-area-inset-bottom));
            padding-left: calc(24px + env(safe-area-inset-left));
          }
          .sb-rail.sb-open { transform: translateX(0); }
          .sb-topbar {
            display: flex; align-items: center; gap: 12px; flex-shrink: 0;
            padding: calc(14px + env(safe-area-inset-top)) 16px 14px;
            border-bottom: 1px solid ${BORDER}; background: ${PAPER_BG};
          }
          .sb-backdrop.sb-open {
            display: block; position: fixed; inset: 0; background: rgba(26,26,46,0.35); z-index: 190;
          }
          .sb-close-mobile-only { display: inline-flex !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-rail { transition-duration: 0.001ms !important; }
        }
      `}</style>

      <div className="sb-topbar">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          style={{ border: "none", background: "none", padding: 4, display: "inline-flex", color: INK }}
        >
          <Menu size={22} strokeWidth={2} />
        </button>
        <Monogram size={24} />
        <div style={{ fontFamily: serifFont, fontSize: 22, color: INK, letterSpacing: -0.2 }}>Scaffold</div>
      </div>

      <div className={`sb-backdrop${open ? " sb-open" : ""}`} onClick={() => setOpen(false)} />

      <div
        className={`sb-rail${open ? " sb-open" : ""}`}
        style={{
          width: 240, flexShrink: 0, background: PAPER_BG, borderRight: `1px solid ${BORDER}`,
          padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Monogram size={30} />
              <div style={{ fontFamily: serifFont, fontSize: 28, color: INK, letterSpacing: -0.3 }}>Scaffold</div>
              <div style={{ background: ACCENT_TAG_BG, padding: "3px 8px", borderRadius: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: INK }}>v1.0</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="sb-close-mobile-only"
              aria-label="Close menu"
              style={{ border: "none", background: "none", padding: 4, display: "none", color: MUTED }}
            >
              <X size={18} />
            </button>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {NAV_ITEMS.map((item) => {
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => go(item.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10,
                    border: active ? `1px solid rgba(33,64,163,0.2)` : "1px solid transparent",
                    background: active ? "rgba(33,64,163,0.08)" : "transparent",
                    color: active ? PRIMARY_DARK : MUTED, opacity: active ? 1 : 0.85,
                    fontSize: 14, fontWeight: active ? 700 : 500, textAlign: "left", width: "100%",
                  }}
                >
                  <item.icon size={18} strokeWidth={2} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onOpenSearch} title="Search everything (⌘K or /)" className="btn-ghost" style={iconBtnStyle}>
              <Search size={15} />
            </button>
            <button data-tour="nav-settings" onClick={onOpenSettings} title="Settings" className="btn-ghost" style={iconBtnStyle}>
              <Settings size={15} />
            </button>
            <button data-tour="nav-weekly-review" onClick={onOpenWeeklyReview} title="Weekly Review" className="btn-ghost" style={iconBtnStyle}>
              <ListChecks size={15} />
            </button>
            <button onClick={onSignOut} title="Sign out" className="btn-ghost" style={iconBtnStyle}>
              <LogOut size={15} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: "50%", background: PRIMARY_DARK, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}
            >
              {initialFrom(profile?.name, email)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName || "You"}
              </div>
              <div style={{ fontSize: 11, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {email}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const iconBtnStyle = {
  width: 32, height: 32, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
  borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: MUTED,
};
