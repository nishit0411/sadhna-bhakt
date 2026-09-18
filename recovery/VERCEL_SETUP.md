# Vercel Environment Variable Setup

## Option A — Dashboard (recommended, no local setup needed)

1. Go to https://vercel.com/dashboard → your project (`sadhna-bhakt` / whatever it's named there)
2. **Settings → Environment Variables**
3. For each of the 4 variables below, click into it and **update the value**
   (or **Add New** if it doesn't exist yet). Set each for **Production**,
   **Preview**, and **Development** environments (all three checkboxes),
   unless you specifically want different values per environment.

   | Name | Value comes from | Exposed to browser? |
   |---|---|---|
   | `VITE_SUPABASE_URL` | New project's Project URL | Yes (by design — `VITE_` prefix) |
   | `VITE_SUPABASE_ANON_KEY` | New project's anon/publishable key | Yes (by design — RLS protects it) |
   | `SUPABASE_URL` | Same value as `VITE_SUPABASE_URL` | **No** — server-only, used by `/api/*` |
   | `SUPABASE_SERVICE_ROLE_KEY` | New project's service_role/secret key | **Never** — server-only, bypasses RLS |

4. Save.

5. **Trigger a fresh deployment** — this is the step that's easy to miss.
   Updating an env var in the dashboard does **not** rebuild or redeploy
   anything already live; the running deployment keeps using the old
   (now-dead) values until a new deployment is built. Either:
   - **Deployments** tab → find the latest deployment → **⋯ → Redeploy**, or
   - Push any commit to `main` (an empty one works: see Option B below)

## Option B — CLI

```bash
# from the project root, logged in via `vercel login` once
vercel env rm VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_URL production
# (paste the value when prompted; repeat rm+add for each of the 4 vars
#  and for preview/development if you use them)

# then force a redeploy so the new values actually take effect
git commit --allow-empty -m "Trigger redeploy for new Supabase project"
git push origin main
```

## Verify it worked

After the new deployment finishes, open the live site and try to register
a new account. If you see a real Supabase error (not "works instantly with
no network calls," which would mean it's silently still in mock/localStorage
mode) and the row shows up in the new project's Table Editor, the vars are
wired correctly.
