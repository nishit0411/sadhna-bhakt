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

async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return mapProfileRow(data);
}

export async function login({ email, password }) {
  if (!email || !password) {
    throw new Error("Please enter both email and password.");
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
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
          mentor_names: form.mentorNames ?? [],
          mentor_other: form.mentorOther || null,
          mobile_number: form.mobileNumber || null,
        },
      },
    });
    if (error) throw error;

    // If the Supabase project has "Confirm email" turned on, there is no
    // session yet — the caller (Register.jsx) checks for this and shows a
    // "check your email" state instead of continuing straight to the app.
    if (!data.session) {
      return { pendingEmailConfirmation: true, email: form.email };
    }
    return fetchProfile(data.user.id);
  }

  await delay(500);
  // `password` never has a real value in mock mode (the field isn't shown
  // when Supabase isn't configured) but is stripped before persisting
  // regardless — nothing resembling a password belongs in localStorage.
  const { password: _password, ...formWithoutPassword } = form;
  const completedProfile = { ...formWithoutPassword, mobileNumber: `+91 ${form.mobileNumber.trim()}` };
  localStorage.setItem("devoteeProfile", JSON.stringify(completedProfile));
  return completedProfile;
}

export async function logout() {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signOut();
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
