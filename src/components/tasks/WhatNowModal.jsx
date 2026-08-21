import { useState } from "react";
import { Play, SkipForward, X } from "lucide-react";
import { serifFont } from "../../lib/constants";
import { ghostBtn, overlayStyle, primaryBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";

// Picks the single most pressing thing from an already-sorted queue and shows just
// that — nothing else on screen. Even a capped 5-item list is still a decision; this
// makes the decision for you. "Something else" skips to the next item for this session
// only (doesn't change anything about the task itself), "Not today" actually pushes its
// date forward, and completing it moves straight to whatever's next.
export default function WhatNowModal({ items, onClose, onOpenFocus }) {
  const [skipped, setSkipped] = useState(() => new Set());
  const queue = items.filter((it) => !skipped.has(it.id));
  const item = queue[0];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={{ background: "#fff", borderRadius: 20, padding: "24px 26px 26px", width: 380, maxWidth: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} title="Close" style={{ background: "none", border: "none", color: "#C2C9D1", cursor: "pointer", padding: 4, display: "flex" }}>
            <X size={16} />
          </button>
        </div>

        {!item ? (
          <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
            <div style={{ fontFamily: serifFont, fontSize: 20, fontWeight: 600, marginBottom: 6 }}>That's everything.</div>
            <div style={{ fontSize: 13.5, color: "#8FCBA3", marginBottom: 20 }}>Nothing left on your plate right now.</div>
            <button onClick={onClose} style={{ ...primaryBtn, width: "100%" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#93A0AD", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", marginTop: -4, marginBottom: 16 }}>
              Do this next
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <Checkbox checked={false} onClick={item.onToggle} color={item.col} />
            </div>
            <div style={{ fontFamily: serifFont, fontSize: 21, fontWeight: 600, textAlign: "center", lineHeight: 1.3, marginBottom: item.subLabel ? 4 : 24 }}>
              {item.title}
            </div>
            {item.subLabel && <div style={{ fontSize: 12.5, color: "#93A0AD", textAlign: "center", marginBottom: 24 }}>{item.subLabel}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {item.focusId && onOpenFocus && (
                <button
                  onClick={() => onOpenFocus(item.focusId, item.title)}
                  style={{ ...primaryBtn, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Play size={13} strokeWidth={2.5} fill="currentColor" /> Start focus timer
                </button>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                {item.onSnooze && (
                  <button onClick={item.onSnooze} style={{ ...ghostBtn, flex: 1 }}>Not today</button>
                )}
                <button
                  onClick={() => setSkipped((s) => new Set([...s, item.id]))}
                  style={{ ...ghostBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                  <SkipForward size={13} strokeWidth={2.3} /> Something else
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
