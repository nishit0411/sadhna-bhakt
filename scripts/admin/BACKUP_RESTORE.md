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

Writes to `backups/<utc-timestamp>/`, e.g. `backups/2026-09-24T18-27-57-867Z/`:
- `auth_users.json` — id, email, created_at, email_confirmed_at, user_metadata
- `profiles.json`, `sadhana_records.json`, `autofill_templates.json` — every row, every column
- `manifest.json` — timestamp, source project URL, row counts per table

**Every run gets its own folder** — nothing is ever overwritten, so a bad
backup (wrong project, half-finished export) can't land on top of a good
one. Folders are ~20 KB each, so they take years to add up to anything;
delete old ones by hand whenever you like.

Prints row counts to the console when done. `backups/` is gitignored —
**this data never belongs in git** (real names, emails, Sadhana history).

A manual run like this only ever writes to this machine. Getting a copy
somewhere else, every day, without anyone having to remember, is the
GitHub Actions workflow described below.

## Running a restore

```bash
# 1. Dry run first — always. Reports what it would do, changes nothing.
npm run admin:restore -- backups/2026-09-24T18-27-57-867Z

# 2. Only once the dry run output looks right:
npm run admin:restore -- backups/2026-09-24T18-27-57-867Z --confirm
```

If the backup came from Google Drive rather than a local run, unpack it
first — see "Restoring from a Drive archive" below — and point the script
at the folder that comes out.

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

## Automated daily backup to Google Drive

`.github/workflows/backup.yml` runs `backup.mjs` every night at 20:30 UTC
(02:00 IST), packs the output into a single `.tar.gz`, optionally encrypts
it, and uploads it to a `sadhna-bhakt-backups` folder in Google Drive using
[rclone](https://rclone.org). Archives older than 180 days are pruned, but
only after the new upload has been verified — a failed backup can never
delete good ones.

You can also trigger it by hand any time from the repo's **Actions** tab →
**Daily backup** → **Run workflow**. Do that before any risky change in the
Supabase dashboard.

### Setup, once

**1. Create your own Google OAuth client ID.**

rclone ships with a shared client ID, and older guides (including an earlier
version of this file) tell you to leave `client_id` blank to use it. **That
is no longer an option worth taking** — Google is retiring rclone's shared
client during 2026, and rclone 1.75+ actively refuses to use it without an
explicit override. A backup job that stops working on an unannounced date
is not a backup job, so make your own. It's free and takes a few minutes.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and
   create a project (any name — `sadhna-bhakt-backup` is fine).
2. **APIs & Services → Library**, search **Google Drive API**, click
   **Enable**.
3. **OAuth consent screen** (newer consoles call this **Google Auth
   Platform → Branding**). Pick **External**, fill in an app name, your own
   email for user support, and your own email as developer contact. Save.
4. **Publish the app.** Under **Audience** (or the consent screen's
   publishing section), if the status says **Testing**, click **Publish
   app**. This matters more than it looks: while an app is in Testing,
   **Google expires its refresh tokens after 7 days**, so your backups
   would authenticate fine now and start failing silently next week.
5. **Credentials → Create credentials → OAuth client ID**. Application
   type: **Desktop app**. Create, then copy the **Client ID** and **Client
   secret**.

Because the app is published but unverified, the sign-in screen in step 2
below will warn you that "Google hasn't verified this app". That's expected
for an app you made for yourself — click **Advanced** → **Go to … (unsafe)**
to continue.

**2. Connect rclone to Google Drive, on your Mac.**

```bash
brew install rclone
rclone config
```

Answer the prompts:

| Prompt | Answer |
| --- | --- |
| `n/s/q>` | `n` (new remote) |
| `name>` | `gdrive` — or any name, but it must match `DRIVE_PATH` in the workflow (see below) |
| `Storage>` | `drive` (the number varies between rclone versions — type `drive`, not a number) |
| `client_id>` | the Client ID from step 1 |
| `client_secret>` | the Client secret from step 1 |
| `scope>` | `3` — *access to files created by rclone only* |
| `service_account_file>` | leave blank — see the warning below |
| `Edit advanced config?` | `n` |
| `Use web browser to automatically authenticate?` | `y`, then sign in and allow |
| `Configure this as a Shared Drive (Team Drive)?` | `n` |
| `Keep this remote?` | `y`, then `q` to quit |

The workflow points at `gdrive:sadhna-bhakt-backups` via the `DRIVE_PATH`
env var at the top of `.github/workflows/backup.yml`. If you named the
remote something else, edit that line to match — the part before the `:` is
the remote name, the part after is the folder in Drive.

> **Do not use a service account here.** It's the option that looks more
> "proper" for automation, and it does not work with a personal Google
> account: service accounts have no Drive storage quota of their own, so
> uploads fail with `storageQuotaExceeded` even though your own account has
> 2 TB free. The browser sign-in above is the correct choice.

Scope `3` (`drive.file`) means rclone can only ever see and touch files it
created itself — it has no access to the rest of your Drive. That's
deliberate: a leaked config can't read your other files, and can't delete
them either. The trade-off is that **rclone can't see a folder you made
yourself in the Drive UI**, so let the workflow create
`sadhna-bhakt-backups` on its first run rather than pre-creating it.

Test it before going further:

```bash
echo hello > /tmp/rclone-test.txt
rclone copy /tmp/rclone-test.txt gdrive:sadhna-bhakt-backups/
rclone lsf gdrive:sadhna-bhakt-backups/          # should list rclone-test.txt
rclone delete gdrive:sadhna-bhakt-backups/rclone-test.txt
```

**3. Turn the rclone config into one line of base64.**

Ask rclone where its config actually lives rather than assuming — depending
on your machine it's either `~/.config/rclone/rclone.conf` or the legacy
`~/.rclone.conf`:

```bash
base64 < "$(rclone config file | tail -n1)" | tr -d '\n' | pbcopy
```

That file contains a Google OAuth refresh token — treat it like a password.
It's now on your clipboard, ready to paste in the next step.

**4. Add the repository secrets.**

GitHub → your repo → **Settings** → **Secrets and variables** → **Actions**
→ **New repository secret**, for each of:

| Secret | Value | Required |
| --- | --- | --- |
| `SUPABASE_URL` | `https://xxxx.supabase.co` — same value as in `.env.admin` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key from Supabase → Settings → API | yes |
| `RCLONE_CONFIG_BASE64` | the base64 blob from step 3 | yes |
| `BACKUP_PASSPHRASE` | a long random passphrase — see below | optional |

**5. Run it once by hand** (Actions → Daily backup → Run workflow) and
confirm the archive appears in Drive. Don't wait for the first scheduled
run to find out whether it works.

### Encryption is optional, and cuts both ways

Set `BACKUP_PASSPHRASE` and every archive is AES256-encrypted on the runner
before it's uploaded, so what sits in Drive is unreadable without the
passphrase. Leave it unset and archives upload as plain `.tar.gz` (the
workflow logs a warning each run so this stays a decision, not an
oversight).

Encrypting protects you if your Google account is ever compromised. It also
means **a lost passphrase is a lost backup** — there is no recovery, the
data is simply gone. If you turn it on, store the passphrase somewhere that
is not this repo, not your laptop, and not the same Google account as the
backups: a password manager is the right place. Given the data involved
(real names, emails, personal Sadhana history), encryption is worth it —
but only if you're confident about keeping the passphrase.

### Restoring from a Drive archive

```bash
# 1. Download the archive you want (list first to find its name)
rclone lsf gdrive:sadhna-bhakt-backups/
rclone copy gdrive:sadhna-bhakt-backups/2026-09-24T18-27-57-867Z.tar.gz.gpg .

# 2. Decrypt, only if BACKUP_PASSPHRASE was set (needs `brew install gnupg`)
gpg --decrypt --output 2026-09-24T18-27-57-867Z.tar.gz \
    2026-09-24T18-27-57-867Z.tar.gz.gpg

# 3. Unpack into backups/
mkdir -p backups && tar -xzf 2026-09-24T18-27-57-867Z.tar.gz -C backups

# 4. Restore as usual — dry run first
npm run admin:restore -- backups/2026-09-24T18-27-57-867Z
```

### Things that will bite you eventually

- **GitHub disables scheduled workflows after 60 days with no repository
  activity.** It emails you first. If this project goes quiet for two
  months, the nightly backup silently stops. Any push, or one manual **Run
  workflow**, resets the clock — so does glancing at the Actions tab
  monthly, which is a good habit anyway.
- **Scheduled runs are best-effort.** GitHub delays them under load, often
  by tens of minutes. Fine for a nightly backup; don't read the cron time
  as a guarantee.
- **The workflow fails loudly if the export looks empty.** It refuses to
  upload or prune when `profiles` comes back below `MIN_PROFILES` (default
  1). This is the guard against the nastiest failure mode: backups that
  keep "succeeding" while exporting nothing, quietly aging out the last
  good copies. If it fires, the export is broken — fix that before
  touching the threshold.
- **The Google token can be revoked.** Changing your Google password,
  revoking rclone under [Google account permissions](https://myaccount.google.com/permissions),
  or six months of disuse will all break it. The fix is to re-run
  `rclone config` and update `RCLONE_CONFIG_BASE64`. If uploads start
  failing with an auth error about a week after setup, the cause is almost
  certainly that the OAuth app was left in **Testing** status — publish it
  (setup step 1.4) and re-authenticate.
- **Failures email you, silence doesn't.** GitHub notifies you when a
  workflow fails, which covers the loud cases — but not a workflow that
  was disabled for inactivity. Check the Actions tab now and then.

### Still worth doing by hand

- **Before anything risky in the Supabase dashboard** (schema changes, bulk
  edits, anything with a delete button), trigger a manual run first.
- **Test a restore into a throwaway Supabase project, once.** An untested
  backup isn't a backup. You now have off-site copies; the only remaining
  question is whether they actually restore, and the time to find out is
  not during an outage.

## If a project is lost again

1. Get your most recent backup: the newest archive in the
   `sadhna-bhakt-backups` folder in Google Drive, unpacked per "Restoring
   from a Drive archive" above. (A recent local `backups/<timestamp>/`
   folder does just as well if you have one.)
2. Follow `recovery/REBUILD_CHECKLIST.md` through creating the new project
   and running `supabase/schema.sql`
3. Run `node scripts/admin/restore.mjs backups/<that-timestamp>` (dry run first)
4. Once it looks right, re-run with `--confirm`
5. Update `.env` and Vercel env vars to the new project (see
   `recovery/VERCEL_SETUP.md`)
6. Redeploy
7. Work through `recovery/POST_REBUILD_TESTS.md`
8. Tell everyone to reset their password (see warning above) — the app's
   normal "Forgot password" flow is all they need, no re-registration
   required this time since their profile and Sadhana history are back
