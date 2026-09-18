# Post-Rebuild Test Checklist

Work through all of these on the live site (kanishthbhakta.in) after
redeploying with the new Supabase credentials, before telling devotees to
come back.

## Database structure

- [ ] Supabase Table Editor shows `profiles`, `sadhana_records`, `autofill_templates`
- [ ] `profiles` table has all expected columns (id, email, first_name, last_name, role, mentor_names, etc. — compare against `supabase/schema.sql` section 1)
- [ ] Authentication → Policies shows RLS **enabled** on all 3 tables (not just policies existing — the "Enable RLS" toggle itself)
- [ ] Database → Functions shows all 6 functions (`is_admin`, `handle_new_user`, `set_updated_at`, `prevent_role_self_escalation`, `prevent_duplicate_email`, `sync_profile_email`)

## Registration

- [ ] Go to `/#/register`, fill out the form with a throwaway test email, submit
- [ ] Confirmation email arrives (check spam too)
- [ ] Clicking the confirmation link logs the account in / marks it verified
- [ ] A matching row appears in `profiles` with the right name/fields
- [ ] Registering the **same email again** is correctly rejected as already registered

## Login

- [ ] Log in with the test account's correct password → succeeds, lands on `/devotee/dashboard`
- [ ] Log in with a **wrong** password → clear error, no access granted
- [ ] Log in with an **unconfirmed** email → blocked with a clear message, not silently let in

## Password reset

- [ ] "Forgot password" sends a reset email
- [ ] Clicking the link lands on `/#/reset-password` (not a Supabase error page — this is the setting from step 5 of the rebuild checklist)
- [ ] Setting a new password works, and you can log in with it afterward
- [ ] You are NOT left logged in via the recovery session before actually setting a new password

## Admin access

- [ ] Log in as the account you promoted to `role = 'admin'`
- [ ] `/admin/dashboard` loads with real (not mock) data
- [ ] `/admin/devotees` lists the test account you registered
- [ ] Admin → User Management loads the full user list (this is the endpoint that needs `SUPABASE_SERVICE_ROLE_KEY` wired correctly server-side — if this page errors, check Vercel env vars first)
- [ ] A **non-admin** account cannot reach `/admin/*` by typing the URL directly — gets redirected instead

## Sadhana flow (core feature)

- [ ] As the devotee test account, submit a daily Sadhana entry
- [ ] It appears correctly in `sadhana_records` with the right `devotee_id` and date
- [ ] `total_mala` is correctly auto-calculated (on_asan + without_asan) — try to submit a mismatched value directly via devtools and confirm the DB still computes it correctly regardless
- [ ] Submitting for the same date twice updates the existing row rather than creating a duplicate (the `unique (devotee_id, date)` constraint)
- [ ] Dashboard charts (Activity Consistency, Japa Rounds) render with this data

## RLS isolation (security — do not skip)

- [ ] Register a **second** throwaway devotee account
- [ ] Confirm devotee #1 cannot see devotee #2's Sadhana data anywhere in the UI
- [ ] Open browser DevTools while logged in as devotee #1, try querying `sadhana_records` or `profiles` directly via the Supabase JS client for devotee #2's id — should return zero rows, not an error and not real data
