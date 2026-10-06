import { useState } from "react";
import { useAuth } from "../../hooks/AuthProvider";
import { INK, MUTED, PAPER_BG, THEME_PRESETS, serifFont } from "../../lib/constants";
import { Monogram } from "../shared/Misc";
import IntroSplash from "./IntroSplash";

// The opening screens (this one + OnboardingQuiz) get their own accent — Sky — matching
// the dedicated "scaffold-opening" launch screen in Figma (monogram + tagline both use
// this same blue-purple), rather than the user's own chosen app theme, which doesn't
// exist yet at this point anyway. Background stays the app's normal PAPER_BG, same as
// that Figma screen's own near-white background.
const SKY = THEME_PRESETS.sky.primary;

// No wrapping card — a bordered, off-white box sitting on the page's own near-white
// background read as a second, slightly-mismatched surface rather than a deliberate
// one. The form just sits directly on the page instead, same instinct as the rest of
// the app's recent move away from stacking boxes on boxes.
const fieldLabel = { fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6 };
const fieldInput = { width: "100%", padding: "13px 16px", borderRadius: 14, border: "1.5px solid #E5E0EE", fontSize: 15, outline: "none", background: "#fff", color: INK, transition: "border-color .15s" };

export default function AuthScreen() {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [mode, setMode] = useState("sign-in"); // 'sign-in' | 'sign-up' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (mode === "forgot") {
      if (!email.trim()) {
        setError("Enter your email.");
        return;
      }
      setBusy(true);
      const { error: err } = await sendPasswordReset(email.trim());
      setBusy(false);
      if (err) {
        setError(err.message);
        return;
      }
      setInfo("If an account exists for that email, a reset link is on its way. Check your inbox.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Enter an email and password.");
      return;
    }
    setBusy(true);
    const { error: err } =
      mode === "sign-up" ? await signUp(email.trim(), password) : await signIn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (mode === "sign-up") {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: PAPER_BG, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {showIntro && <IntroSplash onDone={() => setShowIntro(false)} />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        input { font-family: inherit; }
        input:focus { outline: none; border-color: ${SKY} !important; }
        @media (max-width: 640px) {
          input { font-size: 16px !important; } /* prevents iOS auto-zoom-on-focus */
        }

        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-fade { opacity: 0; animation: authFadeUp 0.6s cubic-bezier(.16,1,.3,1) both; }

        @media (prefers-reduced-motion: reduce) {
          .auth-fade { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
      <form onSubmit={submit} className="auth-fade" style={{ width: 360, maxWidth: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 36 }}>
          <Monogram size={42} />
          <div style={{ fontFamily: serifFont, fontSize: 32, color: INK, letterSpacing: -0.5, marginTop: 10 }}>Scaffold</div>
          <div style={{ fontFamily: serifFont, fontStyle: "italic", fontSize: 15, color: MUTED, marginTop: 6 }}>
            {mode === "sign-in" ? "Good to see you again." : mode === "sign-up" ? "Let's get you set up." : "We'll email you a link to reset your password."}
          </div>
        </div>

        <div style={{ marginBottom: mode === "forgot" ? 0 : 16 }}>
          <label style={fieldLabel}>Email</label>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={fieldInput}
          />
        </div>
        {mode !== "forgot" && (
          <div>
            <label style={fieldLabel}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={fieldInput}
            />
          </div>
        )}

        {mode === "sign-in" && (
          <button type="button" onClick={() => switchMode("forgot")} style={{ border: "none", background: "none", padding: 0, marginTop: 10, fontSize: 12.5, color: MUTED, cursor: "pointer" }}>
            Forgot password?
          </button>
        )}

        {error && <div style={{ fontSize: 12.5, color: "#B03A3A", marginTop: 12 }}>{error}</div>}
        {info && <div style={{ fontSize: 12.5, color: "#2C6B4C", marginTop: 12 }}>{info}</div>}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary"
          style={{ display: "block", width: "100%", padding: "14px", borderRadius: 999, border: "none", background: SKY, color: "#fff", fontSize: 15, fontWeight: 700, marginTop: 24, opacity: busy ? 0.6 : 1, cursor: busy ? "default" : "pointer" }}
        >
          {busy ? "Please wait..." : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Sign up" : "Send reset link"}
        </button>

        {mode === "forgot" ? (
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            style={{ display: "block", width: "100%", textAlign: "center", border: "none", background: "none", padding: 0, marginTop: 16, fontSize: 13, color: MUTED, cursor: "pointer" }}
          >
            Back to sign in
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            style={{ display: "block", width: "100%", textAlign: "center", border: "none", background: "none", padding: 0, marginTop: 16, fontSize: 13, color: MUTED, cursor: "pointer" }}
          >
            {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        )}
      </form>
      <div style={{ position: "fixed", bottom: "calc(18px + env(safe-area-inset-bottom))", fontSize: 11.5, color: "#B4BCC5", display: "flex", gap: 12 }}>
        <a href="/terms.html" style={{ color: "inherit" }}>Terms</a>
        <a href="/privacy.html" style={{ color: "inherit" }}>Privacy</a>
      </div>
    </div>
  );
}
