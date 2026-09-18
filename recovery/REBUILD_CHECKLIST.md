# Supabase Rebuild Checklist

Follow in order. Check items off as you go. Nothing here can be scripted for
you end-to-end — a few steps require the Supabase/Vercel dashboards directly.

## 1. Create the new Supabase project

- [ ] Go to https://supabase.com/dashboard → your org (`sadhna-bhakt`) → **New project**
- [ ] Name it (e.g. `sadhna-bhakt` again, or `sadhna-bhakt-v2`)
- [ ] Set a strong **database password** and save it somewhere safe (a password manager, not this repo) — you likely won't need it directly (the app only uses the API keys below), but Supabase asks for it once and doesn't show it again
- [ ] Pick a region close to your users (e.g. Mumbai/Singapore for an Indian user base)
- [ ] Free plan is fine to start
- [ ] Wait ~2 minutes for provisioning to finish

## 2. Record credentials

Go to **Project Settings → API** on the new project and copy:

- [ ] **Project URL** → this is `VITE_SUPABASE_URL` / `SUPABASE_URL`
- [ ] **anon / publishable key** → this is `VITE_SUPABASE_ANON_KEY`
- [ ] **service_role / secret key** → this is `SUPABASE_SERVICE_ROLE_KEY`

Treat the service_role key like a root password — it bypasses RLS entirely.
Never put it in a `VITE_`-prefixed variable, never commit it, never paste it
into client-side code.

## 3. Update local `.env` files

- [ ] `.env` (project root) — set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] `.env.admin.save` (project root, gitignored) — replace with the new `SUPABASE_SERVICE_ROLE_KEY` (used by the one-off scripts in `scripts/admin/`)
- [ ] Use `recovery/.env.rebuild.template` in this folder as a fill-in-the-blanks guide

## 4. Run the schema

- [ ] Open the new project → **SQL Editor → New query**
- [ ] Paste the entire contents of `supabase/schema.sql` top to bottom
- [ ] Click **Run**
- [ ] Confirm no errors in the output panel
- [ ] Go to **Table Editor** and confirm `profiles`, `sadhana_records`, `autofill_templates` all exist

## 5. Reconfigure Auth settings (NOT covered by schema.sql — easy to forget)

`schema.sql` only rebuilds the Postgres schema. These project-level Auth
settings live outside it and must be redone by hand on the new project:

- [ ] **Authentication → URL Configuration → Site URL** → set to `https://kanishthbhakta.in`
- [ ] **Authentication → URL Configuration → Redirect URLs** → add `https://kanishthbhakta.in/**` (the app's password-reset link uses `#/reset-password` off your live origin — without this allow-list entry, Supabase will silently reject the redirect)
- [ ] **Authentication → Providers → Email** → confirm it's enabled, and **"Confirm email"** is turned ON (the app explicitly checks `email_confirmed_at` and will misbehave if this is off)
- [ ] If you had customized the auth email templates (confirmation/reset wording) before, re-create that customization — it does not survive a project deletion and isn't in `schema.sql`
- [ ] If you had custom rate limits or a custom SMTP sender configured, re-add those too

## 6. Promote yourself to admin

- [ ] Register a normal account through the live app (once redeployed — see step 8) using your own email
- [ ] Back in the SQL Editor, run:
  ```sql
  update public.profiles set role = 'admin' where email = 'you@example.com';
  ```
  (this exact line is commented out at the bottom of `schema.sql`, section 8 — uncomment and run it with your real email)

## 7. (Optional) Load the recovered devotee names

- [ ] Run `scripts/admin/recovered_devotees_staging.sql` in the SQL Editor — creates a `recovered_devotees_staging` reference table from the last surviving CSV export, for your own tracking as you re-invite people. Not real accounts — just a checklist table you can drop once done.

## 8. Update Vercel environment variables

See `recovery/VERCEL_SETUP.md` for exact steps. In short:

- [ ] Update all 4 vars in Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Trigger a fresh deployment (env var changes do **not** auto-redeploy existing deployments — this bit us before)

## 9. Test the live app

- [ ] Work through `recovery/POST_REBUILD_TESTS.md` completely before telling anyone to come back

## 10. Re-invite devotees

- [ ] Send the email in `recovery/RE_INVITATION_EMAIL.md` to the ~53 recovered names/contacts
- [ ] Everyone must register fresh — there is no way to restore their old password or history
