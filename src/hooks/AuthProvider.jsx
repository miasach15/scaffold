import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not yet loaded
  // Set when the user arrives via a "reset your password" email link — we intercept
  // and show a "set a new password" screen instead of dropping them into the app.
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
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
