import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

// Remembers, per browser, that someone has registered or signed in here
// before — used only to decide whether to keep showing "Create an account"
// on this device, never as an authorization signal.
const HAS_ACCOUNT_KEY = "sadhanaBhakti:hasAccount";

function markHasAccount() {
  try {
    localStorage.setItem(HAS_ACCOUNT_KEY, "true");
  } catch {
    // Storage unavailable (private mode, etc.) — the register link will
    // just keep showing, which is the safe fallback.
  }
}

function clearHasAccount() {
  try {
    localStorage.removeItem(HAS_ACCOUNT_KEY);
  } catch {
    // Nothing to clean up if storage was never usable.
  }
}

function readHasAccount() {
  try {
    return localStorage.getItem(HAS_ACCOUNT_KEY) === "true";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccountOnDevice, setHasAccountOnDevice] = useState(readHasAccount);

  useEffect(() => {
    authService
      .getSession()
      .then((sessionUser) => {
        setUser(sessionUser);
        if (sessionUser) {
          markHasAccount();
          setHasAccountOnDevice(true);
        }
      })
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
    markHasAccount();
    setHasAccountOnDevice(true);
    return loggedInUser;
  }, []);

  const register = useCallback(async (form) => {
    const result = await authService.register(form);
    markHasAccount();
    setHasAccountOnDevice(true);
    if (result?.pendingEmailConfirmation) return result;
    setUser(result);
    return result;
  }, []);

  const loginAs = useCallback(async (userId) => {
    const loggedInUser = await authService.loginAs(userId);
    setUser(loggedInUser);
    markHasAccount();
    setHasAccountOnDevice(true);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    clearHasAccount();
    setHasAccountOnDevice(false);
  }, []);

  // Signs the just-registered user back out so they land on the Login page
  // as a fresh sign-in, without forgetting that this device already has an
  // account — unlike logout(), which intentionally clears that.
  const endSessionAfterRegistration = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // The account was already created successfully at this point — a
      // sign-out hiccup (network blip, etc.) shouldn't strand the new
      // devotee on the register page. Clearing local state below is enough
      // for the Login page to treat them as signed out either way.
    }
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
    hasAccountOnDevice,
    login,
    register,
    loginAs,
    logout,
    endSessionAfterRegistration,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
