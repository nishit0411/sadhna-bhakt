import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, MailWarning } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { quickLoginIds, resendVerificationEmail } from "../../services/authService";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { useTranslation } from "../../i18n/LanguageContext";
import Logo from "../../components/layout/Logo";
import LanguageSwitcher from "../../components/layout/LanguageSwitcher";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

/** Supabase throws this (message text or `.code`, depending on version) when signing in before the email link is confirmed. */
function isUnconfirmedEmailError(err) {
  return err?.code === "email_not_confirmed" || /email.*not.*confirm/i.test(err?.message ?? "");
}

export default function Login() {
  const { login, loginAs } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [isResending, setIsResending] = useState(false);
  const [resetSuccess] = useState(Boolean(location.state?.passwordResetSuccess));

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setUnverifiedEmail(null);
  }

  function goToDashboard(user) {
    navigate(user.role === "admin" ? "/admin/dashboard" : "/devotee/dashboard");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.email) nextErrors.email = t("auth.emailRequired");
    if (!form.password) nextErrors.password = t("auth.passwordRequired");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setUnverifiedEmail(null);
    setIsSubmitting(true);
    try {
      const user = await login(form);
      addToast(`${t("common.hareKrishna")}, ${user.name.split(" ")[0]} 🙏`);
      goToDashboard(user);
    } catch (err) {
      if (isUnconfirmedEmailError(err)) {
        setUnverifiedEmail(form.email);
      } else {
        addToast(err.message, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    setIsResending(true);
    try {
      await resendVerificationEmail(unverifiedEmail);
      addToast(t("auth.resendSuccess"));
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setIsResending(false);
    }
  }

  async function handleOtpContinue() {
    if (!form.email) {
      setErrors((prev) => ({ ...prev, email: t("auth.emailRequired") }));
      return;
    }
    setIsOtpSubmitting(true);
    try {
      const user = await login({ email: form.email, password: "otp-continue" });
      addToast(`${t("common.hareKrishna")}, ${user.name.split(" ")[0]} 🙏`);
      goToDashboard(user);
    } finally {
      setIsOtpSubmitting(false);
    }
  }

  async function handleDemoLogin(role) {
    const ids = quickLoginIds();
    const user = await loginAs(role === "admin" ? ids.admin : ids.devotee);
    addToast(`${t("auth.demoLogin")}: ${user.name}`);
    goToDashboard(user);
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
          <p className="mt-4 text-sm text-brown-500">"{t("auth.quote")}"</p>
        </div>

        <Card className="px-7 py-7 sm:px-8 sm:py-8" padded={false}>
          <h1 className="font-display text-2xl font-semibold text-maroon-600">{t("auth.welcomeBack")}</h1>
          <p className="mt-1 text-sm text-brown-500">{t("auth.continueJourney")}</p>

          {resetSuccess && (
            <p className="mt-4 rounded-xl bg-sage-50 px-4 py-3 text-sm font-medium text-sage-600">
              {t("auth.passwordResetSuccess")}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <Input
              label={t("auth.emailLabel")}
              name="email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            <div>
              <Input
                label={t("auth.passwordLabel")}
                name="password"
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
              <Link to="/forgot-password" className="mt-1.5 inline-block text-xs font-medium text-maroon-600 hover:underline">
                {t("auth.forgotPasswordLink")}
              </Link>
            </div>

            <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-1 w-full">
              {t("auth.loginButton")}
            </Button>
          </form>

          {unverifiedEmail && (
            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-saffron-300 bg-saffron-50 p-4 text-sm">
              <div className="flex items-start gap-2 text-brown-700">
                <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-maroon-500" />
                <p>{t("auth.unverifiedEmailMessage")}</p>
              </div>
              <Button variant="outline" size="sm" isLoading={isResending} onClick={handleResendVerification} className="self-start">
                {t("auth.resendVerificationButton")}
              </Button>
            </div>
          )}

          {!isSupabaseConfigured && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-brown-400">
                <span className="h-px flex-1 bg-brown-900/10" /> {t("auth.or")} <span className="h-px flex-1 bg-brown-900/10" />
              </div>

              <Button
                variant="secondary"
                size="lg"
                icon={Mail}
                className="w-full"
                isLoading={isOtpSubmitting}
                onClick={handleOtpContinue}
              >
                {t("auth.continueWithOtp")}
              </Button>

              <div className="mt-6 rounded-xl bg-beige-100 p-4 text-center">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brown-500">{t("auth.demoLogin")}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDemoLogin("devotee")}>
                    {t("auth.asDevotee")}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDemoLogin("admin")}>
                    {t("auth.asAdmin")}
                  </Button>
                </div>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-brown-500">
            {t("auth.newHere")}{" "}
            <Link to="/register" className="font-medium text-maroon-600 hover:underline">
              {t("auth.createAccount")}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
