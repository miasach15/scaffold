import { useState } from "react";
import { useAuth } from "../../hooks/AuthProvider";
import { PAPER_BG, PRIMARY, cardStyle } from "../../lib/constants";
import { inputStyle, primaryBtn, ghostBtn } from "../../lib/styles";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("sign-in"); // 'sign-in' | 'sign-up'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
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
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: PAPER_BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        input { font-family: inherit; }
        input:focus { outline: none; border-color: ${PRIMARY} !important; box-shadow: 0 0 0 3px rgba(110,147,183,0.16); }
      `}</style>
      <form onSubmit={submit} style={{ ...cardStyle, width: 380, maxWidth: "100%", padding: 28 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600, color: "#000000", marginBottom: 4, letterSpacing: -0.3 }}>Scaffold</div>
        <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 20 }}>
          {mode === "sign-in" ? "Welcome back." : "Create an account to save your data."}
        </div>

        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#93A0AD", display: "block", marginBottom: 4 }}>Email</label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ ...inputStyle, width: "100%", marginBottom: 12 }}
        />
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#93A0AD", display: "block", marginBottom: 4 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ ...inputStyle, width: "100%" }}
        />

        {error && <div style={{ fontSize: 12.5, color: "#B03A3A", marginTop: 10 }}>{error}</div>}
        {info && <div style={{ fontSize: 12.5, color: "#2C6B4C", marginTop: 10 }}>{info}</div>}

        <button type="submit" disabled={busy} className="btn-primary" style={{ ...primaryBtn, width: "100%", marginTop: 18, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Sign up"}
        </button>
        <button
          type="button"
          onClick={() => { setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in")); setError(""); setInfo(""); }}
          style={{ ...ghostBtn, width: "100%", marginTop: 8, border: "none", background: "none" }}
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
