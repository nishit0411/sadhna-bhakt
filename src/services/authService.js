/**
 * Authentication service — dual-mode.
 *
 * When `isSupabaseConfigured` is true (VITE_SUPABASE_URL/ANON_KEY set),
 * every function talks to real Supabase Auth + the `profiles` table.
 * Otherwise everything falls back to the original mock/localStorage
 * behavior. No other file needs to know which mode is active — the
 * exported function names and return shapes are identical either way.
 */
import { supabase, isSupabaseConfigured, PASSWORD_RECOVERY_FLAG_KEY } from "../lib/supabaseClient";
import { MOCK_DEVOTEES, CURRENT_DEVOTEE_ID, CURRENT_ADMIN_ID } from "../data/mockDevotees";
import { dobToPassword } from "../utils/dateHelpers";

const SESSION_KEY = "sadhana_bhakti_session";
const PROFILE_OVERRIDES_KEY = "sadhana_bhakti_profile_overrides";
const MOCK_DELAY = 500;

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findByEmail(email) {
  return MOCK_DEVOTEES.find((d) => d.email.toLowerCase() === email.trim().toLowerCase());
}

function getOverrides() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_OVERRIDES_KEY)) ?? {};
  } catch {
    return {};
  }
}

function withOverrides(user) {
  if (!user) return user;
  const overrides = getOverrides();
  return { ...user, ...(overrides[user.id] ?? {}) };
}

/** Maps a `profiles` table row (snake_case) to the shape the UI expects. */
export function mapProfileRow(row) {
  if (!row) return null;
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email;
  const initials =
    ((row.first_name?.[0] ?? "") + (row.last_name?.[0] ?? "")).toUpperCase() || row.email[0].toUpperCase();

  return {
    id: row.id,
    name,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.mobile_number ?? "",
    centre: row.centre ?? "",
    mentor: row.mentor_names ?? [],
    mentorOther: row.mentor_other ?? "",
    mentorId: row.mentor_id ?? null,
    active: row.active ?? true,
    displayOrder: row.display_order ?? null,
    role: row.role,
    avatarColor: row.avatar_color ?? "maroon",
    initials,
    joinedOn: row.created_at,
    dob: row.date_of_birth ?? null,
    dikshaStage: row.diksha_stage ?? null,
    initiationDate: row.initiation_date ?? null,
    initiationYear: row.initiation_year ?? null,
    spiritualName: row.spiritual_name ?? "",
    gurudevName: row.gurudev_name ?? "",
    city: row.city ?? "",
    sex: row.sex ?? null,
  };
}

/**
 * Rebuilds a missing profiles row for an already-authenticated auth.users
 * account, from that same account's own signup metadata — the exact data
 * handle_new_user() would have used originally. This is the recovery path
 * for an orphaned account (auth.users exists, profiles doesn't): never
 * created by this app auto-creating a second Auth account, and never
 * requiring service-role/admin access — RLS's "profiles_insert_own" policy
 * (id = auth.uid()) allows a user to create only their own row, using
 * only the anon key and their own session, exactly like every other
 * client-side call in this file.
 */
async function recoverMissingProfile(userId) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const meta = authData.user?.user_metadata ?? {};

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email: authData.user.email,
      first_name: meta.first_name ?? "",
      last_name: meta.last_name ?? "",
      date_of_birth: meta.date_of_birth || null,
      spiritual_name: meta.spiritual_name || null,
      gurudev_name: meta.gurudev_name || null,
      diksha_stage: meta.diksha_stage || null,
      initiation_date: meta.initiation_date || null,
      initiation_year: meta.initiation_year || null,
      sex: meta.sex || null,
      city: meta.city || null,
      centre: meta.centre || null,
      mentor_names: meta.mentor_names ?? [],
      mentor_other: meta.mentor_other || null,
      mobile_number: meta.mobile_number || null,
      mentor_id: meta.mentor_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapProfileRow(data);
}

async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    // PGRST116 = PostgREST's "no row found" for .single() — a real
    // auth.users account with no matching profiles row. Recover it
    // instead of leaving the user stuck; any other error (RLS denial,
    // network failure, etc.) still propagates normally.
    if (error.code === "PGRST116") {
      return recoverMissingProfile(userId);
    }
    throw error;
  }
  return mapProfileRow(data);
}

export async function login({ email, password }) {
  if (!email || !password) {
    throw new Error("Please enter both email and password.");
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Enforced explicitly here rather than trusted to the project's
    // "Confirm email" dashboard setting alone — email_confirmed_at on the
    // real Supabase Auth user is the source of truth, checked every time,
    // regardless of how that setting is configured.
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      const err = new Error("email_not_confirmed");
      err.code = "email_not_confirmed";
      throw err;
    }

    // A fresh, successful password-based sign-in supersedes any recovery
    // flow that was left dangling in this tab (e.g. the user abandoned a
    // password-reset link without finishing it) — clear it so it can't
    // wrongly block this legitimate session later (see getSession below).
    sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG_KEY);

    return fetchProfile(data.user.id);
  }

  await delay();
  const user = findByEmail(email) ?? MOCK_DEVOTEES.find((d) => d.id === CURRENT_DEVOTEE_ID);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  return withOverrides(user);
}

/**
 * Creates a real account (Supabase mode) or replicates the frontend-only
 * profile flow (mock mode, unchanged from before). `form` matches the
 * Register page's field names exactly.
 */
export async function register(form) {
  if (isSupabaseConfigured) {
    // Self-registration has no password field — the account's initial
    // password is always the devotee's own date of birth (DDMMYYYY),
    // changeable afterward from Profile. dob is required client-side
    // (Register.jsx's validate()) whenever Supabase is configured.
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: dobToPassword(form.dob),
      options: {
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          date_of_birth: form.dob || null,
          spiritual_name: form.spiritualName || null,
          gurudev_name: form.gurudevName || null,
          diksha_stage: form.dikshaStage || null,
          initiation_date: form.initiationDateMode === "full" ? form.initiationDate || null : null,
          initiation_year: form.initiationDateMode === "year" ? form.initiationYear || null : null,
          sex: form.sex || null,
          city: form.city || null,
          centre: form.centre || null,
          // Mentor is stored as names, not an account reference: the list
          // Register.jsx offers deliberately includes people who have no
          // account yet. handle_new_user() copies these two straight across,
          // and resolves mentor_id itself when the single chosen name does
          // match an active mentor (schema.sql §19).
          mentor_names: form.mentor ?? [],
          mentor_other: form.mentor?.includes("Other") ? form.mentorOther?.trim() || null : null,
          mobile_number: form.mobileNumber || null,
        },
      },
    });
    if (error) throw error;

    // Whether an email is "already registered" is decided at the database
    // level (see supabase/schema.sql's prevent_duplicate_email trigger on
    // auth.users, which raises a real error here whenever Supabase does
    // attempt a duplicate insert) — not by inspecting signUp()'s response
    // shape client-side. An earlier version of this function tried to
    // additionally detect Supabase's "Prevent email enumeration" fake-success
    // response via `data.user.identities.length === 0`, but that signal
    // isn't reliably distinguishable from a normal pending-confirmation
    // response across Supabase versions/configs, and a false positive
    // there would incorrectly reject a genuinely new registration — worse
    // than the enumeration-protection case it was trying to catch. Removed.

    // If the Supabase project has "Confirm email" turned on, there is no
    // session yet — the caller (Register.jsx) checks for this and shows a
    // "check your email" state instead of continuing straight to the app.
    if (!data.session) {
      return { pendingEmailConfirmation: true, email: form.email };
    }
    return fetchProfile(data.user.id);
  }

  await delay(500);
  const completedProfile = { ...form, mobileNumber: `+91 ${form.mobileNumber.trim()}` };
  localStorage.setItem("devoteeProfile", JSON.stringify(completedProfile));
  return completedProfile;
}

export async function logout() {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signOut();
    sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG_KEY);
    if (error) throw error;
    return;
  }

  await delay(200);
  localStorage.removeItem(SESSION_KEY);
}

export async function getSession() {
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;

    // A password-recovery link establishes a real, valid Supabase session
    // — indistinguishable from a normal login at the session-object level
    // — purely so ResetPassword.jsx/ForgotPassword.jsx can call
    // updateUser({ password }). It must never double as "signed in" for
    // the rest of the app: treating it as no session here is what keeps
    // ProtectedRoute (which only checks "is there a user") from letting a
    // recovery-in-progress visitor straight into the Dashboard without
    // ever setting a new password. The flag is set by the PASSWORD_RECOVERY
    // listener in supabaseClient.js — registered at module load, so it has
    // already run by the time this fires from AuthContext's own listener.
    if (sessionStorage.getItem(PASSWORD_RECOVERY_FLAG_KEY) === "1") return null;

    // Same explicit check as login() — a session that predates email
    // confirmation (or one from before "Confirm email" was ever enabled)
    // must not silently keep granting access on every page load/refresh.
    if (!data.session.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return null;
    }

    try {
      return await fetchProfile(data.session.user.id);
    } catch {
      return null;
    }
  }

  await delay(150);
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const { userId } = JSON.parse(raw);
    return withOverrides(MOCK_DEVOTEES.find((d) => d.id === userId)) ?? null;
  } catch {
    return null;
  }
}

/** Mock-only: instant "log in as" for the Login page's Demo buttons. */
export function quickLoginIds() {
  return { devotee: CURRENT_DEVOTEE_ID, admin: CURRENT_ADMIN_ID };
}

export async function loginAs(userId) {
  if (isSupabaseConfigured) {
    throw new Error("Demo login isn't available once a real backend is connected — please sign in with a real account.");
  }

  await delay(300);
  const user = MOCK_DEVOTEES.find((d) => d.id === userId);
  if (!user) throw new Error("Unknown mock user.");
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  return withOverrides(user);
}

/** Re-sends the signup confirmation email. Supabase-only. */
export async function resendVerificationEmail(email) {
  if (!isSupabaseConfigured) {
    throw new Error("Email verification isn't available in mock mode.");
  }
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw error;
}

/**
 * Sends the password-reset email. `redirectTo` covers the link-click
 * fallback (ResetPassword.jsx, via {{ .ConfirmationURL }}); the primary
 * ForgotPassword.jsx flow uses the 6-digit {{ .Token }} the same email
 * carries — that variable MUST be added to Supabase's "Reset Password"
 * email template (Authentication -> Emails -> Templates) or there will
 * be no code for the user to enter on step 2.
 */
export async function requestPasswordReset(email) {
  if (!isSupabaseConfigured) {
    throw new Error("Password reset requires a live backend connection.");
  }
  const redirectTo = `${window.location.origin}${window.location.pathname}#/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/**
 * Verifies the 6-digit code from the password-reset email (Supabase's
 * recovery OTPs are always 6 digits — this is not configurable). Success
 * establishes a real (short-lived) recovery session — `confirmPasswordReset`
 * then sets the new password on it.
 */
export async function verifyPasswordResetOtp(email, token) {
  if (!isSupabaseConfigured) {
    throw new Error("Password reset requires a live backend connection.");
  }
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (error) throw error;
}

/**
 * Completes a password reset. Only valid once Supabase has established a
 * recovery session from the emailed link (see ResetPassword.jsx). Signs
 * the recovery session out afterward so the user lands back on Login and
 * signs in fresh with the new password.
 */
export async function confirmPasswordReset(newPassword) {
  if (!isSupabaseConfigured) {
    throw new Error("Password reset requires a live backend connection.");
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  await supabase.auth.signOut();
  // Both the OTP flow (ForgotPassword.jsx) and the magic-link flow
  // (ResetPassword.jsx) call this — clearing the flag here, once, means
  // neither caller can forget it and leave a stale "recovery in progress"
  // flag around for the rest of the browser tab's life.
  sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG_KEY);
}

/**
 * Voluntary password change from a signed-in session (Profile page) — not
 * the forgot-password/recovery flow above. Re-authenticates with the
 * current password first (supabase-js has no dedicated "confirm current
 * password" call) so a device left logged in can't have its password
 * changed by someone who doesn't actually know it; only then applies the
 * new one. Unlike confirmPasswordReset, this does NOT sign the user out —
 * they're already legitimately in their own session.
 */
export async function changePassword({ email, currentPassword, newPassword }) {
  if (!isSupabaseConfigured) {
    throw new Error("Password changes require a live backend connection.");
  }
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) {
    throw new Error("current_password_incorrect");
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Requests an email change via Supabase's own Auth flow — never writes
 * profiles.email directly (that would be a parallel, unverified path).
 * Supabase requires confirming the new address (and, if "Secure email
 * change" is on, the old one too) before auth.users.email actually
 * changes; a database trigger (see supabase/schema.sql,
 * "Keep profiles.email in sync") mirrors that change into profiles.email
 * once it really happens, so there is exactly one source of truth.
 */
export async function requestEmailChange(newEmail) {
  if (!isSupabaseConfigured) {
    throw new Error("Changing your email requires a live backend connection.");
  }
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}

/**
 * Updates every editable registration/profile field — Profile.jsx passes
 * the same camelCase shape for all of them. Deliberately excludes email:
 * that only ever changes via requestEmailChange's real Supabase Auth flow
 * (see above), never a direct write here.
 */
export async function updateProfile(userId, updates) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        date_of_birth: updates.dob || null,
        spiritual_name: updates.spiritualName || null,
        gurudev_name: updates.gurudevName || null,
        diksha_stage: updates.dikshaStage || null,
        initiation_date: updates.initiationDate || null,
        initiation_year: updates.initiationYear || null,
        sex: updates.sex || null,
        city: updates.city,
        centre: updates.centre,
        mobile_number: updates.phone,
        mentor_names: updates.mentor,
        mentor_other: updates.mentorOther || null,
      })
      .eq("id", userId);
    if (error) throw error;
    return fetchProfile(userId);
  }

  await delay(400);
  const overrides = getOverrides();
  overrides[userId] = { ...(overrides[userId] ?? {}), ...updates };
  localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(overrides));
  const base = MOCK_DEVOTEES.find((d) => d.id === userId);
  return withOverrides(base);
}
