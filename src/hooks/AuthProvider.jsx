import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

// A one-time forced sign-out of every existing session, enforced here instead of by
// rotating Supabase's JWT key — the dashboard's key rotation keeps the previous signing
// key valid for a transition window on purpose (zero-downtime by design), so it doesn't
// actually invalidate anything already issued. This does it directly: any session whose
// last real sign-in (not a silent token refresh — last_sign_in_at only updates on an
// actual sign-in event) predates this cutoff gets signed out the moment the app loads,
// landing them back on the sign-in screen. Matches the same cutoff send-daily-agenda
// uses to decide who gets the daily email, so "signed back in" means the same thing in
// both places.
const SIGNIN_CUTOFF = new Date("2026-10-17T15:20:06Z");

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not yet loaded
  // Set when the user arrives via a "reset your password" email link — we intercept
  // and show a "set a new password" screen instead of dropping them into the app.
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    const applyCutoff = (s) => {
      if (s?.user?.last_sign_in_at && new Date(s.user.last_sign_in_at) < SIGNIN_CUTOFF) {
        supabase.auth.signOut();
        return null;
      }
      return s;
    };
    supabase.auth.getSession().then(({ data }) => setSession(applyCutoff(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(applyCutoff(newSession));
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = (email, password) => supabase.auth.signUp({ email, password });
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();
  const sendPasswordReset = (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  const updatePassword = async (password) => {
    const res = await supabase.auth.updateUser({ password });
    if (!res.error) setPasswordRecovery(false);
    return res;
  };

  const value = {
    session,
    user: session?.user ?? null,
    loading: session === undefined,
    passwordRecovery,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
