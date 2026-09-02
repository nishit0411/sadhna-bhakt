import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Whether real Supabase credentials are configured. Every service file
 * checks this and falls back to the mock/localStorage implementation when
 * it's false, so the app keeps working exactly as before until `.env` is
 * filled in — no other code needs to change when that happens.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

/**
 * A password-reset email link lands the user back on this app with
 * Supabase's recovery tokens already in the URL. supabase-js parses those
 * asynchronously and fires a one-time "PASSWORD_RECOVERY" auth event — but
 * ResetPassword.jsx might not have mounted (and subscribed) yet when that
 * fires, since HashRouter's own routing races it. Catching the event here,
 * at module load (before React even renders), and stashing it in
 * sessionStorage lets ResetPassword.jsx reliably tell "the user really did
 * just click a recovery link" apart from "the user already has a normal
 * logged-in session and navigated here directly".
 */
export const PASSWORD_RECOVERY_FLAG_KEY = "sadhana_bhakti_password_recovery";

if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      sessionStorage.setItem(PASSWORD_RECOVERY_FLAG_KEY, "1");
    }
  });
}
