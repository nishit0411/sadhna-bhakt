/**
 * Admin Supabase client — service-role key, server-side/CLI use only.
 *
 * NEVER import this from `src/` — it must never end up in the Vite bundle.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment.
 * If a gitignored `.env.admin` file exists at the project root (plain
 * KEY=value lines, same format as `.env`), it's loaded automatically —
 * so day-to-day you just run e.g. `npm run admin:backup` with nothing to
 * export by hand. An already-exported shell variable always wins over the
 * file, so a one-off override still works without editing anything:
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/admin/find-duplicate-emails.mjs
 *
 * Get the service role key from Supabase Dashboard → Project Settings →
 * API → "service_role" secret. Keep it out of git and out of chat/logs.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const envAdminPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".env.admin");
if (existsSync(envAdminPath)) {
  // Doesn't override anything already set in the real environment.
  process.loadEnvFile(envAdminPath);
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Either export them in your shell, or create a `.env.admin` file at the\n" +
      "project root (gitignored) with:\n\n" +
      "  SUPABASE_URL=https://xxxx.supabase.co\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=eyJ...\n",
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
