/**
 * Authentication service — dual-mode.
 *
 * When `isSupabaseConfigured` is true (VITE_SUPABASE_URL/ANON_KEY set),
 * every function talks to real Supabase Auth + the `profiles` table.
 * Otherwise everything falls back to the original mock/localStorage
 * behavior. No other file needs to know which mode is active — the
 * exported function names and return shapes are identical either way.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
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
    mentor: row.mentor_name ?? "",
    role: row.role,
    avatarColor: row.avatar_color ?? "maroon",
    initials,
    joinedOn: row.created_at,
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
          spiritual_name: form.spiritualName || null,
          gurudev_name: form.gurudevName || null,
          diksha_stage: form.dikshaStage || null,
          initiation_date: form.initiationDateMode === "full" ? form.initiationDate || null : null,
          initiation_year: form.initiationDateMode === "year" ? form.initiationYear || null : null,
          sex: form.sex || null,
          city: form.city || null,
          mentor_name: form.mentorName || null,
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
  const completedProfile = { ...form, mobileNumber: `+91 ${form.mobileNumber.trim()}` };
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

export async function updateProfile(userId, updates) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: updates.name?.split(" ")[0],
        last_name: updates.name?.split(" ").slice(1).join(" "),
        mobile_number: updates.phone,
        centre: updates.centre,
        mentor_name: updates.mentor,
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
