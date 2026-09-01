import { useState } from "react";
import { Calendar as CalendarIcon, Target, Repeat, BookOpen } from "lucide-react";
import { useAuth } from "../../hooks/AuthProvider";
import { PAPER_BG, PRIMARY, PRIMARY_TINT, cardStyle, serifFont } from "../../lib/constants";
import { inputStyle, primaryBtn, ghostBtn } from "../../lib/styles";

const MODULE_PREVIEWS = [
  { icon: CalendarIcon, label: "Today", sub: "3 events, 2 tasks", rot: "-1.1deg" },
  { icon: Target, label: "Goals", sub: "Finish the draft", rot: "0.9deg" },
  { icon: Repeat, label: "Habits", sub: "12 day streak", rot: "-0.8deg" },
  { icon: BookOpen, label: "Journal", sub: "Evening reflection", rot: "1deg" },
];

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
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: PAPER_BG, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        input { font-family: inherit; }
        input:focus { outline: none; border-color: ${PRIMARY} !important; box-shadow: 0 0 0 3px rgba(110,147,183,0.16); }
        @media (max-width: 640px) {
          input { font-size: 16px !important; } /* prevents iOS auto-zoom-on-focus */
        }

        .auth-shell { display: flex; gap: 36px; width: 100%; max-width: 940px; align-items: center; }
        .auth-showcase { flex: 1 1 380px; background: ${PRIMARY_TINT}; border-radius: 24px; padding: 44px 40px; display: flex; flex-direction: column; gap: 24px; }
        .auth-modules { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
        .auth-module-card { background: #fff; border: 1px solid #ECECEC; border-radius: 14px; padding: 11px 14px; display: flex; align-items: center; gap: 10px; width: fit-content; box-shadow: 0 6px 24px rgba(15,23,42,0.05); }
        .auth-formwrap { flex: 1 1 380px; max-width: 400px; }

        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(14px) rotate(var(--rot, 0deg)); }
          to { opacity: 1; transform: translateY(0) rotate(var(--rot, 0deg)); }
        }
        .auth-fade { opacity: 0; animation: authFadeUp 0.55s cubic-bezier(.16,1,.3,1) both; }

        @media (prefers-reduced-motion: reduce) {
          .auth-fade { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }

        @media (max-width: 860px) {
          .auth-shell { flex-direction: column; max-width: 420px; }
          .auth-showcase { padding: 24px 22px; width: 100%; }
          .auth-modules { flex-direction: row; flex-wrap: wrap; gap: 8px; }
          .auth-module-card { --rot: 0deg !important; }
          .auth-module-sub { display: none; }
          .auth-form-title { display: none; }
        }
      `}</style>
      <div className="auth-shell">
        <div className="auth-showcase">
          <div className="auth-fade" style={{ fontFamily: serifFont, fontStyle: "italic", fontWeight: 600, fontSize: 38, color: "#000000", letterSpacing: -0.3 }}>
            Scaffold
          </div>
          <div className="auth-fade" style={{ animationDelay: "70ms", fontSize: 14.5, color: "#5A6472", lineHeight: 1.5, maxWidth: 260 }}>
            A calm place to plan your day, your goals, and everything in between.
          </div>
          <div className="auth-modules">
            {MODULE_PREVIEWS.map((m, i) => (
              <div
                key={m.label}
                className="auth-fade auth-module-card"
                style={{ "--rot": m.rot, animationDelay: `${160 + i * 90}ms` }}
              >
                <m.icon size={16} strokeWidth={2} color={PRIMARY} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#000000" }}>{m.label}</div>
                  <div className="auth-module-sub" style={{ fontSize: 11.5, color: "#93A0AD" }}>{m.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-formwrap">
      <form onSubmit={submit} className="auth-fade" style={{ ...cardStyle, animationDelay: "90ms", width: "100%", padding: 28 }}>
        <div className="auth-form-title" style={{ fontFamily: serifFont, fontStyle: "italic", fontSize: 24, fontWeight: 600, color: "#000000", marginBottom: 4, letterSpacing: -0.3 }}>Scaffold</div>
        <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 20 }}>
          {mode === "sign-in" ? "Welcome back." : mode === "sign-up" ? "Create an account to save your data." : "We'll email you a link to reset your password."}
        </div>

        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#93A0AD", display: "block", marginBottom: 4 }}>Email</label>
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
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#93A0AD", display: "block", marginBottom: 4 }}>Password</label>
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
          <button type="button" onClick={() => switchMode("forgot")} style={{ ...ghostBtn, border: "none", background: "none", padding: 0, marginTop: 8, fontSize: 12, color: "#93A0AD" }}>
            Forgot password?
          </button>
        )}

        {error && <div style={{ fontSize: 12.5, color: "#B03A3A", marginTop: 10 }}>{error}</div>}
        {info && <div style={{ fontSize: 12.5, color: "#2C6B4C", marginTop: 10 }}>{info}</div>}

        <button type="submit" disabled={busy} className="btn-primary" style={{ ...primaryBtn, width: "100%", marginTop: 18, opacity: busy ? 0.6 : 1 }}>
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
        </div>
      </div>
      <div style={{ position: "fixed", bottom: "calc(18px + env(safe-area-inset-bottom))", fontSize: 11.5, color: "#B4BCC5", display: "flex", gap: 12 }}>
        <a href="/terms.html" style={{ color: "inherit" }}>Terms</a>
        <a href="/privacy.html" style={{ color: "inherit" }}>Privacy</a>
      </div>
    </div>
  );
}
