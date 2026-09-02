import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService
      .getSession()
      .then(setUser)
      .finally(() => setIsLoading(false));

    // Keep the app's user in sync with Supabase's own session changes —
    // token refresh, sign-out in another tab, or the redirect back from an
    // email confirmation link.
    if (!isSupabaseConfigured) return;
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      authService.getSession().then(setUser);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (form) => {
    const result = await authService.register(form);
    if (result?.pendingEmailConfirmation) return result;
    setUser(result);
    return result;
  }, []);

  const loginAs = useCallback(async (userId) => {
    const loggedInUser = await authService.loginAs(userId);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const updated = await authService.updateProfile(user.id, updates);
    setUser(updated);
    return updated;
  }, [user]);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    isAdmin: user?.role === "admin",
    login,
    register,
    loginAs,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
