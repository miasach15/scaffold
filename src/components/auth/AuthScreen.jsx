import { useState } from "react";
import { useAuth } from "../../hooks/AuthProvider";
import { PAPER_BG, PRIMARY, cardStyle } from "../../lib/constants";
import { inputStyle, primaryBtn, ghostBtn } from "../../lib/styles";

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
      setInfo("If an account exists for that email, a reset link is on its way — check your inbox.");
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
      `}</style>
      <form onSubmit={submit} style={{ ...cardStyle, width: 380, maxWidth: "100%", padding: 28 }}>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 22, fontWeight: 600, color: "#000000", marginBottom: 4, letterSpacing: -0.3 }}>Scaffold</div>
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
      <div style={{ position: "fixed", bottom: "calc(18px + env(safe-area-inset-bottom))", fontSize: 11.5, color: "#B4BCC5", display: "flex", gap: 12 }}>
        <a href="/terms.html" style={{ color: "inherit" }}>Terms</a>
        <a href="/privacy.html" style={{ color: "inherit" }}>Privacy</a>
      </div>
    </div>
  );
}
