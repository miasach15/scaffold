import { useState } from "react";
import { BORDER, CATEGORY_COLOR_SWATCHES, DEFAULT_CATEGORY_KEYS, FALLBACK_CATEGORY_COLOR_ROTATION, HABIT_COLOR, INK, MUTED, PAPER_BG, PRIMARY_DARK, SUGGESTED_HABITS, cardStyle, serifFont } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { Monogram } from "../shared/Misc";
import { ghostBtn, primaryBtn, inputStyle } from "../../lib/styles";
import CategoryEditor from "../shared/CategoryEditor";

export default function OnboardingQuiz({ onComplete }) {
  // No CategoryColorsProvider exists yet at this point (onboarding happens before one is
  // ever set up), so this is just the plain default palette — fine for the original 4,
  // but a brand-new custom category needs its own fallback color below.
  const CATEGORY_COLORS = useCategoryColors();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [categoryKeys, setCategoryKeys] = useState(DEFAULT_CATEGORY_KEYS);
  const [focusAreas, setFocusAreas] = useState([]);
  const [habitPicks, setHabitPicks] = useState([]);

  const colorFor = (key, i) => CATEGORY_COLORS[key] || CATEGORY_COLOR_SWATCHES[FALLBACK_CATEGORY_COLOR_ROTATION[i % FALLBACK_CATEGORY_COLOR_ROTATION.length]];
  const categoryColorMap = Object.fromEntries(categoryKeys.map((k, i) => [k, colorFor(k, i)]));

  const renameCategory = (oldKey, newKey) => {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed === oldKey || categoryKeys.includes(trimmed)) return;
    setCategoryKeys((ks) => ks.map((k) => (k === oldKey ? trimmed : k)));
    setFocusAreas((f) => f.map((k) => (k === oldKey ? trimmed : k)));
  };
  const addCategory = (name2) => {
    const trimmed = name2.trim();
    if (!trimmed || categoryKeys.includes(trimmed)) return;
    setCategoryKeys((ks) => [...ks, trimmed]);
  };
  const removeCategory = (key) => {
    if (categoryKeys.length <= 1) return;
    setCategoryKeys((ks) => ks.filter((k) => k !== key));
    setFocusAreas((f) => f.filter((k) => k !== key));
  };

  const toggleFocus = (c) => setFocusAreas((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]));
  const toggleHabit = (h) => setHabitPicks((hs) => (hs.includes(h) ? hs.filter((x) => x !== h) : [...hs, h]));

  const steps = ["Name", "Focus", "Habits", "Done"];
  const lastStep = steps.length - 1;
  const finish = () => onComplete({ name: name.trim(), categoryKeys, focusAreas, habitPicks, workStyle: "Mix of both" });
  const skip = () => onComplete({ name: "", categoryKeys: DEFAULT_CATEGORY_KEYS, focusAreas: [], habitPicks: [], workStyle: "Mix of both" });

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: PAPER_BG, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; transition: transform .12s ease, box-shadow .15s ease, background-color .15s ease; }
        button:active:not(:disabled) { transform: scale(0.97); }
        input { font-family: inherit; }
        input:focus { outline: none; border-color: ${PRIMARY_DARK} !important; box-shadow: 0 0 0 3px rgba(60,95,208,0.14); }

        @keyframes onboardIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .onboard-card { animation: onboardIn 0.5s cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .onboard-card { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
      <div className="onboard-card" style={{ ...cardStyle, width: 460, maxWidth: "100%", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Monogram size={26} />
          <div style={{ fontFamily: serifFont, fontSize: 22, color: INK, letterSpacing: -0.3 }}>Scaffold</div>
        </div>
        <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? PRIMARY_DARK : BORDER, transition: "background-color .2s ease" }} />
          ))}
        </div>

        {step === 0 && (
          <div>
            <div style={{ fontFamily: serifFont, fontSize: 24, color: INK, marginBottom: 6 }}>What should we call you?</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Just for a personal touch, totally optional.</div>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ ...inputStyle, width: "100%" }} onKeyDown={(e) => e.key === "Enter" && setStep(1)} />
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontFamily: serifFont, fontSize: 24, color: INK, marginBottom: 6 }}>Your categories</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>These are yours to change: rename, add, or remove to fit your life. Not everyone needs "Education", and yours might need one this doesn't have.</div>
            <CategoryEditor categoryKeys={categoryKeys} categoryColors={categoryColorMap} onRename={renameCategory} onAdd={addCategory} onRemove={removeCategory} />

            <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, margin: "18px 0 8px" }}>Focus on right now</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>Pick as many as you like. This shapes your Goals suggestions.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {categoryKeys.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleFocus(c)}
                  style={{
                    padding: "9px 16px", borderRadius: 999, fontSize: 13.5, fontWeight: 700,
                    border: `1.5px solid ${focusAreas.includes(c) ? categoryColorMap[c].border : BORDER}`,
                    background: focusAreas.includes(c) ? categoryColorMap[c].bg : "#fff",
                    color: focusAreas.includes(c) ? categoryColorMap[c].text : MUTED,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontFamily: serifFont, fontSize: 24, color: INK, marginBottom: 6 }}>Any habits you want to start with?</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>These'll already be in your Habits list. You can always add more later.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTED_HABITS.map((h) => (
                <button
                  key={h}
                  onClick={() => toggleHabit(h)}
                  style={{
                    padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${habitPicks.includes(h) ? HABIT_COLOR.border : BORDER}`,
                    background: habitPicks.includes(h) ? HABIT_COLOR.bg : "#fff",
                    color: habitPicks.includes(h) ? HABIT_COLOR.text : MUTED,
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontFamily: serifFont, fontSize: 24, color: INK, marginBottom: 6 }}>{name ? `You're all set, ${name}.` : "You're all set."}</div>
            <div style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, marginBottom: 6 }}>
              {focusAreas.length > 0 && <>Focusing on {focusAreas.join(", ")}. </>}
              {habitPicks.length > 0 && <>Starting with {habitPicks.length} habit{habitPicks.length === 1 ? "" : "s"}. </>}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {step > 0 && <button onClick={() => setStep((s) => s - 1)} style={ghostBtn}>Back</button>}
          <div style={{ flex: 1 }} />
          {step < lastStep ? (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary" style={primaryBtn}>Next</button>
          ) : (
            <button onClick={finish} className="btn-primary" style={primaryBtn}>Get started</button>
          )}
        </div>
        {step < lastStep && (
          <button onClick={skip} style={{ ...ghostBtn, border: "none", background: "none", marginTop: 10, fontSize: 12, color: MUTED, padding: 0 }}>Skip for now</button>
        )}
      </div>
    </div>
  );
}
