import { useState } from "react";
import { useAuth } from "../../hooks/AuthProvider";
import { PAPER_BG, PRIMARY, cardStyle } from "../../lib/constants";
import { inputStyle, primaryBtn } from "../../lib/styles";

// Shown when someone arrives via a "reset your password" email link — AuthProvider
// intercepts the PASSWORD_RECOVERY auth event and routes here instead of the app.
export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error: err } = await updatePassword(password);
    setBusy(false);
    if (err) setError(err.message);
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: PAPER_BG, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        input { font-family: inherit; }
        input:focus { outline: none; border-color: ${PRIMARY} !important; box-shadow: 0 0 0 3px rgba(110,147,183,0.16); }
        @media (max-width: 640px) {
          input { font-size: 16px !important; }
        }
      `}</style>
      <form onSubmit={submit} style={{ ...cardStyle, width: 380, maxWidth: "100%", padding: 28 }}>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 22, fontWeight: 600, color: "#000000", marginBottom: 4, letterSpacing: -0.3 }}>Set a new password</div>
        <div style={{ fontSize: 13, color: "#93A0AD", marginBottom: 20 }}>Choose a new password for your Scaffold account.</div>

        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#93A0AD", display: "block", marginBottom: 4 }}>New password</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ ...inputStyle, width: "100%", marginBottom: 12 }}
        />
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#93A0AD", display: "block", marginBottom: 4 }}>Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          style={{ ...inputStyle, width: "100%" }}
        />

        {error && <div style={{ fontSize: 12.5, color: "#B03A3A", marginTop: 10 }}>{error}</div>}

        <button type="submit" disabled={busy} className="btn-primary" style={{ ...primaryBtn, width: "100%", marginTop: 18, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Saving..." : "Save new password"}
        </button>
      </form>
    </div>
  );
}
