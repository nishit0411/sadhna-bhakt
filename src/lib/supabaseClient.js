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
