import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KeyRound, ServerOff, ShieldAlert } from "lucide-react";
import { confirmPasswordReset } from "../../services/authService";
import { supabase, isSupabaseConfigured, PASSWORD_RECOVERY_FLAG_KEY } from "../../lib/supabaseClient";
import { useTranslation } from "../../i18n/LanguageContext";
import Logo from "../../components/layout/Logo";
import LanguageSwitcher from "../../components/layout/LanguageSwitcher";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

// How long to wait for Supabase's recovery-session detection before
// concluding the link is invalid/expired. Token exchange is normally
// near-instant; this only matters for a genuinely bad link.
const RECOVERY_DETECTION_TIMEOUT_MS = 4000;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState(isSupabaseConfigured ? "checking" : "unavailable");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    if (sessionStorage.getItem(PASSWORD_RECOVERY_FLAG_KEY) === "1") {
      setStatus("ready");
      return;
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem(PASSWORD_RECOVERY_FLAG_KEY, "1");
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, RECOVERY_DETECTION_TIMEOUT_MS);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.password) nextErrors.password = t("resetPassword.errPassword");
    else if (form.password.length < 6) nextErrors.password = t("resetPassword.errPasswordInvalid");
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = t("resetPassword.errMismatch");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(form.password);
      sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG_KEY);
      navigate("/login", { state: { passwordResetSuccess: true } });
    } catch (err) {
      setErrors({ password: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream-50 px-4 py-10">
      <div className="devotional-pattern pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
        </div>

        <Card className="px-7 py-7 text-center sm:px-8 sm:py-8" padded={false}>
          {status === "unavailable" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-beige-100 text-brown-500">
                <ServerOff className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-maroon-600">{t("resetPassword.title")}</h1>
              <p className="mt-2 text-sm text-brown-600">{t("forgotPassword.mockModeMessage")}</p>
            </>
          )}

          {status === "checking" && (
            <>
              <h1 className="font-display text-xl font-semibold text-maroon-600">{t("resetPassword.checkingTitle")}</h1>
              <p className="mt-2 text-sm text-brown-600">{t("resetPassword.checkingMessage")}</p>
            </>
          )}

          {status === "invalid" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clay-100 text-clay-600">
                <ShieldAlert className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-maroon-600">{t("resetPassword.invalidTitle")}</h1>
              <p className="mt-2 text-sm text-brown-600">{t("resetPassword.invalidMessage")}</p>
              <Link to="/forgot-password">
                <Button size="lg" className="mt-6 w-full">
                  {t("resetPassword.requestNewLinkButton")}
                </Button>
              </Link>
            </>
          )}

          {status === "ready" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
                <KeyRound className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-maroon-600">{t("resetPassword.title")}</h1>
              <p className="mt-2 text-sm text-brown-600">{t("resetPassword.subtitle")}</p>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 text-left" noValidate>
                <Input
                  label={t("resetPassword.newPasswordLabel")}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("resetPassword.newPasswordPlaceholder")}
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                  required
                />
                <Input
                  label={t("resetPassword.confirmPasswordLabel")}
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  required
                />
                <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
                  {t("resetPassword.submitButton")}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
