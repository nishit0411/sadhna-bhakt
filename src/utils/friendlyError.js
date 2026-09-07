const PATTERNS = [
  { test: /current_password_incorrect/i, key: "errors.currentPasswordIncorrect" },
  { test: /already.*registered|already exists/i, key: "errors.emailAlreadyRegistered" },
  { test: /invalid login credentials/i, key: "errors.invalidCredentials" },
  { test: /email.*not.*confirm/i, key: "errors.emailNotConfirmed" },
  { test: /rate limit|too many requests/i, key: "errors.rateLimited" },
  { test: /network|fetch failed|failed to fetch/i, key: "errors.network" },
  { test: /password.*(least|character|short)/i, key: "errors.passwordTooWeak" },
  { test: /invalid.*(otp|token)|token.*expired|otp.*expired/i, key: "errors.invalidOtp" },
  { test: /session missing|auth session missing/i, key: "errors.sessionExpired" },
];

/**
 * Maps a raw Supabase/network error to a translated, user-safe message.
 * An error that doesn't match a known pattern always falls back to a
 * generic translated message — the raw `err.message` (which can be a
 * verbatim Postgres/GoTrue string) must never reach the user directly.
 */
export function friendlyErrorMessage(err, t, fallbackKey = "errors.generic") {
  const raw = err?.message ?? "";
  const match = PATTERNS.find((p) => p.test.test(raw));
  return t(match ? match.key : fallbackKey);
}
