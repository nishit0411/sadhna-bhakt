import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck, ServerOff, ArrowLeft } from "lucide-react";
import { requestPasswordReset } from "../../services/authService";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { useTranslation } from "../../i18n/LanguageContext";
import Logo from "../../components/layout/Logo";
import LanguageSwitcher from "../../components/layout/LanguageSwitcher";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError(t("auth.emailRequired"));
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
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
          {!isSupabaseConfigured ? (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-beige-100 text-brown-500">
                <ServerOff className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-maroon-600">{t("forgotPassword.title")}</h1>
              <p className="mt-2 text-sm text-brown-600">{t("forgotPassword.mockModeMessage")}</p>
            </>
          ) : sent ? (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage-50 text-sage-600">
                <MailCheck className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-maroon-600">{t("forgotPassword.sentTitle")}</h1>
              <p className="mt-2 text-sm text-brown-600">{t("forgotPassword.sentMessage")}</p>
            </>
          ) : (
            <>
              <h1 className="text-left font-display text-2xl font-semibold text-maroon-600">{t("forgotPassword.title")}</h1>
              <p className="mt-1 text-left text-sm text-brown-500">{t("forgotPassword.subtitle")}</p>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 text-left" noValidate>
                <Input
                  label={t("auth.emailLabel")}
                  name="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  error={error}
                  required
                />
                <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
                  {t("forgotPassword.sendButton")}
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
      </div>
    </div>
  );
}
