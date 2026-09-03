import { useState } from "react";
import { useAuth } from "../../hooks/AuthProvider";
import { INK, MUTED, PAPER_BG, THEME_PRESETS, cardStyle, serifFont } from "../../lib/constants";
import { Monogram } from "../shared/Misc";
import { inputStyle, primaryBtn, ghostBtn } from "../../lib/styles";

// The opening screens (this one + OnboardingQuiz) get their own accent — Sky — matching
// the dedicated "scaffold-opening" launch screen in Figma (monogram + tagline both use
// this same blue-purple), rather than the user's own chosen app theme, which doesn't
// exist yet at this point anyway. Background stays the app's normal PAPER_BG, same as
// that Figma screen's own near-white background.
const SKY = THEME_PRESETS.sky.primary;

export default function AuthScreen() {
  const { signIn, signUp, sendPasswordReset } = useAuth();
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
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: PAPER_BG, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        input { font-family: inherit; }
        input:focus { outline: none; border-color: ${SKY} !important; box-shadow: 0 0 0 3px rgba(130,144,216,0.14); }
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
      <form onSubmit={submit} className="auth-fade" style={{ ...cardStyle, width: 380, maxWidth: "100%", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Monogram size={26} color={SKY} />
          <div style={{ fontFamily: serifFont, fontSize: 24, color: INK, letterSpacing: -0.3 }}>Scaffold</div>
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
          {mode === "sign-in" ? "Welcome back." : mode === "sign-up" ? "Create an account to save your data." : "We'll email you a link to reset your password."}
        </div>

        <label style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Email</label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ ...inputStyle, width: "100%", marginBottom: mode === "forgot" ? 0 : 12 }}
        />
        {mode !== "forgot" && (
          <>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...inputStyle, width: "100%" }}
            />
          </>
        )}

        {mode === "sign-in" && (
          <button type="button" onClick={() => switchMode("forgot")} style={{ ...ghostBtn, border: "none", background: "none", padding: 0, marginTop: 8, fontSize: 12, color: MUTED }}>
            Forgot password?
          </button>
        )}

        {error && <div style={{ fontSize: 12.5, color: "#B03A3A", marginTop: 10 }}>{error}</div>}
        {info && <div style={{ fontSize: 12.5, color: "#2C6B4C", marginTop: 10 }}>{info}</div>}

        <button type="submit" disabled={busy} className="btn-primary" style={{ ...primaryBtn, background: SKY, width: "100%", marginTop: 18, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Please wait..." : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Sign up" : "Send reset link"}
        </button>

        {mode === "forgot" ? (
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            style={{ ...ghostBtn, width: "100%", marginTop: 8, border: "none", background: "none" }}
          >
            Back to sign in
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            style={{ ...ghostBtn, width: "100%", marginTop: 8, border: "none", background: "none" }}
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
