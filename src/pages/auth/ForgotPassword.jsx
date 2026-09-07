import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MailCheck, ServerOff, ArrowLeft, KeyRound } from "lucide-react";
import { requestPasswordReset, verifyPasswordResetOtp, confirmPasswordReset } from "../../services/authService";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import Logo from "../../components/layout/Logo";
import LanguageSwitcher from "../../components/layout/LanguageSwitcher";
import DeveloperCredit from "../../components/layout/DeveloperCredit";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Supabase's own error text for an SMTP/email-transport failure ("Error
 * sending recovery email") is accurate but not something a devotee should
 * have to parse — swapped for a plain-language, translated message.
 */
function isEmailSendFailure(err) {
  return /error sending|sending.*email|smtp/i.test(err?.message ?? "");
}

/**
 * Forgot Password → Enter email → Enter 6-digit code → Set new password →
 * Login. This is the only place in the app an OTP is required — normal
 * login never involves one. Everything happens in-app (no email link
 * click needed); ResetPassword.jsx remains as a fallback for anyone who
 * clicks the link in the same email instead of typing the code.
 *
 * Requires the Supabase "Reset Password" email template to include
 * {{ .Token }} (Authentication -> Emails -> Templates) — without it, the
 * email carries no code and step 2 has nothing to enter.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState("email"); // email | otp | password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setErrors({ email: t("auth.emailRequired") });
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    } catch (err) {
      setErrors({ email: isEmailSendFailure(err) ? t("forgotPassword.errSendFailed") : friendlyErrorMessage(err, t) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (cooldown > 0) return;
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setErrors({});
    } catch (err) {
      setErrors({ otp: isEmailSendFailure(err) ? t("forgotPassword.errSendFailed") : friendlyErrorMessage(err, t) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    if (!code.trim()) {
      setErrors({ otp: t("forgotPassword.errOtpRequired") });
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await verifyPasswordResetOtp(email.trim(), code.trim());
      setStep("password");
    } catch {
      setErrors({ otp: t("forgotPassword.errOtpInvalid") });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePasswordChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  }

  async function handlePasswordSubmit(e) {
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
      navigate("/login", { state: { passwordResetSuccess: true } });
    } catch (err) {
      setErrors({ password: friendlyErrorMessage(err, t) });
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
          {!isSupabaseConfigured && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-beige-100 text-brown-500">
                <ServerOff className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-maroon-600">{t("forgotPassword.title")}</h1>
              <p className="mt-2 text-sm text-brown-600">{t("forgotPassword.mockModeMessage")}</p>
            </>
          )}

          {isSupabaseConfigured && step === "email" && (
            <>
              <h1 className="text-left font-display text-2xl font-semibold text-maroon-600">{t("forgotPassword.title")}</h1>
              <p className="mt-1 text-left text-sm text-brown-500">{t("forgotPassword.subtitle")}</p>

              <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-4 text-left" noValidate>
                <Input
                  label={t("auth.emailLabel")}
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors({});
                  }}
                  error={errors.email}
                  required
                />
                <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
                  {t("forgotPassword.sendButton")}
                </Button>
              </form>
            </>
          )}

          {isSupabaseConfigured && step === "otp" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage-50 text-sage-600">
                <MailCheck className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-maroon-600">{t("forgotPassword.otpTitle")}</h1>
              <p className="mt-2 text-sm text-brown-600">{t("forgotPassword.otpSubtitle", { email })}</p>
              <p className="mt-1 text-xs text-brown-500">{t("forgotPassword.otpOrLinkHint")}</p>

              <form onSubmit={handleOtpSubmit} className="mt-6 flex flex-col gap-4 text-left" noValidate>
                <Input
                  label={t("forgotPassword.otpLabel")}
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={t("forgotPassword.otpPlaceholder")}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/[^0-9]/g, ""));
                    setErrors((prev) => ({ ...prev, otp: undefined }));
                  }}
                  error={errors.otp}
                  required
                />
                <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
                  {t("forgotPassword.verifyButton")}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setErrors({});
                  }}
                  className="font-medium text-brown-500 hover:underline"
                >
                  {t("forgotPassword.changeEmail")}
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={cooldown > 0 || isSubmitting}
                  className="font-medium text-maroon-600 hover:underline disabled:cursor-not-allowed disabled:text-brown-400 disabled:no-underline"
                >
                  {cooldown > 0 ? t("forgotPassword.resendIn", { seconds: cooldown }) : t("forgotPassword.resendCode")}
                </button>
              </div>
            </>
          )}

          {isSupabaseConfigured && step === "password" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
                <KeyRound className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-maroon-600">{t("resetPassword.title")}</h1>
              <p className="mt-2 text-sm text-brown-600">{t("resetPassword.subtitle")}</p>

              <form onSubmit={handlePasswordSubmit} className="mt-6 flex flex-col gap-4 text-left" noValidate>
                <Input
                  label={t("resetPassword.newPasswordLabel")}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("resetPassword.newPasswordPlaceholder")}
                  value={form.password}
                  onChange={handlePasswordChange}
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
                  onChange={handlePasswordChange}
                  error={errors.confirmPassword}
                  required
                />
                <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
                  {t("resetPassword.submitButton")}
                </Button>
              </form>
            </>
          )}

          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-maroon-600 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("forgotPassword.backToLogin")}
          </Link>
        </Card>

        <DeveloperCredit className="mt-6" />
      </div>
    </div>
  );
}
