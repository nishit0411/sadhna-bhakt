# Backup & Restore

Two scripts, both service-role/CLI-only (never imported from `src/`):

- **`backup.mjs`** — read-only export of every row this app owns, to local JSON
- **`restore.mjs`** — recreates that data on a (normally fresh) Supabase project

Built after the original project was accidentally deleted with no backup in
place. This exists so that can't happen again.

## One-time credential setup

Create `.env.admin` at the project root (gitignored — see the check at the
bottom of this file) with:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

`scripts/admin/_client.mjs` loads this file automatically. After that,
every command below just works with nothing to export by hand. An
already-exported shell variable always takes priority over the file, so a
one-off override (e.g. testing against a different project) still works
without editing anything:

```bash
SUPABASE_URL=https://other-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
npm run admin:backup
```

## Running a backup

```bash
npm run admin:backup
```

Writes to `backups/YYYY-MM-DD/`:
- `auth_users.json` — id, email, created_at, email_confirmed_at, user_metadata
- `profiles.json`, `sadhana_records.json`, `autofill_templates.json` — every row, every column
- `manifest.json` — timestamp, source project URL, row counts per table

Prints row counts to the console when done. `backups/` is gitignored —
**this data never belongs in git** (real names, emails, Sadhana history).
Copy the folder somewhere durable yourself after each run — a different
disk, cloud storage, wherever — gitignoring it only stops it from ending
up in your repo, it does nothing to protect against losing this machine.

Re-running on the same day overwrites that day's folder. If you want more
than one snapshot per day, copy the folder aside first.

## Running a restore

```bash
# 1. Dry run first — always. Reports what it would do, changes nothing.
npm run admin:restore -- backups/2026-09-18

# 2. Only once the dry run output looks right:
npm run admin:restore -- backups/2026-09-18 --confirm
```

Make sure `.env.admin` points at the **new** project before running this — restoring into the project you just backed up from
is a harmless no-op (everything already exists, so everything gets
skipped), but pointing it at the wrong project by mistake is the kind of
error you want the dry run to catch first.

It's idempotent — re-running after a partial failure (a network blip
halfway through, say) skips everything already created and only fills in
what's missing. Safe to run more than once.

A full report — including the exact old-id → new-id mapping for every
user — is written to `scripts/admin/reports/restore/<timestamp>.json`
(gitignored, same as the duplicate-email reports).

## What is and is not recoverable

**Recoverable**, if a recent backup exists:
- Every profile field (name, spiritual name, initiation info, mentor,
  contact details, role, etc.)
- Every Sadhana record and autofill template
- The account's email address and email-confirmed status
- In most cases, the original account id (verified per-run, not assumed —
  see the comments in `restore.mjs` for why)

**Never recoverable, backup or no backup:**
- **Passwords.** Supabase never stores or exports a password in any
  reversible form — a backup made five minutes before deletion still
  can't give anyone their old password back. Every restored user gets a
  random temporary password that this script never logs, prints, or
  saves anywhere, specifically so no one is tempted to treat it as usable
  credentials.
- Anything created or changed **after** the most recent backup. A backup
  is only as good as how recently it was taken — see cadence below.

Because of the password point, **restoring always means everyone resets
their password** via the app's own "Forgot password" flow, using the
email address the backup recorded for them — there's no way around this,
backup or not.

## Suggested cadence

Run `backup.mjs` **at least daily**, and additionally right before any
risky manual operation in the Supabase dashboard (schema changes, bulk
edits, anything with a delete button). A cron job or a scheduled GitHub
Action calling this script is the natural next step if you want this to
stop being a "remember to run it" task — not built here since it needs
somewhere to durably store the output (this script only writes locally).

## If a project is lost again

1. Find your most recent `backups/YYYY-MM-DD/` folder (or wherever you
   copied it to, per the reminder above)
2. Follow `recovery/REBUILD_CHECKLIST.md` through creating the new project
   and running `supabase/schema.sql`
3. Run `node scripts/admin/restore.mjs backups/<that-date>` (dry run first)
4. Once it looks right, re-run with `--confirm`
5. Update `.env` and Vercel env vars to the new project (see
   `recovery/VERCEL_SETUP.md`)
6. Redeploy
7. Work through `recovery/POST_REBUILD_TESTS.md`
8. Tell everyone to reset their password (see warning above) — the app's
   normal "Forgot password" flow is all they need, no re-registration
   required this time since their profile and Sadhana history are back
