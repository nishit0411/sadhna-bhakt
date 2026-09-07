/**
 * Admin Supabase client — service-role key, server-side/CLI use only.
 *
 * NEVER import this from `src/` — it must never end up in the Vite bundle.
 * Run scripts in this folder with Node directly, e.g.:
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/admin/find-duplicate-emails.mjs
 *
 * Get the service role key from Supabase Dashboard → Project Settings →
 * API → "service_role" secret. Keep it out of git and out of chat/logs —
 * export it in your shell or put it in an untracked .env.admin file
 * (already covered by .gitignore's `.env*` pattern) and source it before
 * running these scripts.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY in the environment.\n" +
      "These admin scripts need the service-role key — the anon key in .env is not enough.",
  );
  process.exit(1);
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Pages through every auth.users row via the Admin API. */
export async function listAllAuthUsers() {
  const perPage = 1000;
  let page = 1;
  const users = [];
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }
  return users;
}
