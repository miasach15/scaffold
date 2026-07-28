import { useState } from "react";
import { CATEGORY_COLORS, HABIT_COLOR, PAPER_BG, PRIMARY, SUGGESTED_HABITS, cardStyle } from "../../lib/constants";
import { ghostBtn, primaryBtn, inputStyle } from "../../lib/styles";

export default function OnboardingQuiz({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [focusAreas, setFocusAreas] = useState([]);
  const [habitPicks, setHabitPicks] = useState([]);
  const [workStyle, setWorkStyle] = useState("Mix of both");

  const toggleFocus = (c) => setFocusAreas((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]));
  const toggleHabit = (h) => setHabitPicks((hs) => (hs.includes(h) ? hs.filter((x) => x !== h) : [...hs, h]));

  const steps = ["Name", "Focus", "Habits", "Style", "Done"];
  const finish = () => onComplete({ name: name.trim(), focusAreas, habitPicks, workStyle });
  const skip = () => onComplete({ name: "", focusAreas: [], habitPicks: [], workStyle: "Mix of both" });

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: PAPER_BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; transition: transform .12s ease, box-shadow .15s ease, background-color .15s ease; }
        button:active:not(:disabled) { transform: scale(0.97); }
        input { font-family: inherit; }
        input:focus { outline: none; border-color: ${PRIMARY} !important; box-shadow: 0 0 0 3px rgba(110,147,183,0.16); }
      `}</style>
      <div style={{ ...cardStyle, width: 440, maxWidth: "100%", padding: 28 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600, color: "#000000", marginBottom: 4, letterSpacing: -0.3 }}>Scaffold</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? PRIMARY : "#EDE7DC" }} />
          ))}
        </div>

        {step === 0 && (
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>What should we call you?</div>
            <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 14 }}>Just for a personal touch, totally optional.</div>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ ...inputStyle, width: "100%" }} onKeyDown={(e) => e.key === "Enter" && setStep(1)} />
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>What do you want to focus on right now?</div>
            <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 14 }}>Pick as many as you like, this shapes your Goals suggestions.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Education", "Personal", "Health", "People"].map((c) => (
                <button
                  key={c}
                  onClick={() => toggleFocus(c)}
                  style={{
                    padding: "9px 16px", borderRadius: 999, fontSize: 13.5, fontWeight: 700,
                    border: `1.5px solid ${focusAreas.includes(c) ? CATEGORY_COLORS[c].border : "#E5E9ED"}`,
                    background: focusAreas.includes(c) ? CATEGORY_COLORS[c].bg : "#fff",
                    color: focusAreas.includes(c) ? CATEGORY_COLORS[c].text : "#93A0AD",
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
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Any habits you want to start with?</div>
            <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 14 }}>These'll already be in your Habits list. You can always add more later.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTED_HABITS.map((h) => (
                <button
                  key={h}
                  onClick={() => toggleHabit(h)}
                  style={{
                    padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${habitPicks.includes(h) ? HABIT_COLOR.border : "#E5E9ED"}`,
                    background: habitPicks.includes(h) ? HABIT_COLOR.bg : "#fff",
                    color: habitPicks.includes(h) ? HABIT_COLOR.text : "#93A0AD",
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
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>How do you like to work?</div>
            <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 14 }}>Sets your default Focus Timer length.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Short focused bursts", "Mix of both", "Long deep sessions"].map((w) => (
                <button
                  key={w}
                  onClick={() => setWorkStyle(w)}
                  style={{
                    padding: "12px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "left",
                    border: `1.5px solid ${workStyle === w ? PRIMARY : "#E5E9ED"}`,
                    background: workStyle === w ? "#E7E3FC" : "#fff",
                    color: "#000000",
                  }}
                >
                  {w} <span style={{ float: "right", fontWeight: 400, color: "#93A0AD" }}>{w === "Short focused bursts" ? "15 min" : w === "Long deep sessions" ? "50 min" : "25 min"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>{name ? `You're all set, ${name}.` : "You're all set."}</div>
            <div style={{ fontSize: 13.5, color: "#5A6472", lineHeight: 1.6, marginBottom: 6 }}>
              {focusAreas.length > 0 && <>Focusing on {focusAreas.join(", ")}. </>}
              {habitPicks.length > 0 && <>Starting with {habitPicks.length} habit{habitPicks.length === 1 ? "" : "s"}. </>}
              Focus sessions default to {workStyle === "Short focused bursts" ? "15" : workStyle === "Long deep sessions" ? "50" : "25"} minutes.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {step > 0 && <button onClick={() => setStep((s) => s - 1)} style={ghostBtn}>Back</button>}
          <div style={{ flex: 1 }} />
          {step < 4 ? (
            <button onClick={() => setStep((s) => s + 1)} style={primaryBtn}>Next</button>
          ) : (
            <button onClick={finish} style={primaryBtn}>Get started</button>
          )}
        </div>
        {step < 4 && (
          <button onClick={skip} style={{ ...ghostBtn, border: "none", background: "none", marginTop: 10, fontSize: 12, color: "#B4AA98", padding: 0 }}>Skip for now</button>
        )}
      </div>
    </div>
  );
}
