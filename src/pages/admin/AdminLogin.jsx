import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import Logo from "../../components/layout/Logo";
import Button from "../../components/ui/Button";

// Matches the footer/quote-section dark palette from Landing.jsx, kept
// local here since this page intentionally looks nothing like the public
// devotee Login screen — a distinct, visibly "admin" surface.
const CHARCOAL = "#2a231d";
const GOLD = "#b6924f";
const GOLD_SOFT = "#e3cd9a";
const BURGUNDY_DEEP = "#2e0d17";

/**
 * A dedicated admin sign-in surface, visually separate from the public
 * devotee Login page. Authentication itself is identical Supabase Auth
 * (signInWithPassword) — what's different here is that after a successful
 * sign-in, this page checks the resulting profile's `role` (read from the
 * `profiles` table, which only an authenticated user's own row — or an
 * admin — can even SELECT under RLS) and immediately signs back out and
 * rejects anyone whose role isn't "admin". The email is never used as an
 * authorization check by itself; the database role is the source of truth.
 */
export default function AdminLogin() {
  const { login, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined, form: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.email) nextErrors.email = t("auth.emailRequired");
    if (!form.password) nextErrors.password = t("auth.passwordRequired");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      const user = await login(form);
      if (user.role !== "admin") {
        await logout();
        setErrors({ form: t("adminLogin.notAuthorized") });
        return;
      }
      addToast(`${t("common.hareKrishna")}, ${user.name.split(" ")[0]} 🙏`);
      navigate("/admin/dashboard");
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10" style={{ backgroundColor: CHARCOAL }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "28px 28px" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <div className="mt-5 flex items-center gap-2" style={{ color: GOLD_SOFT }}>
            <ShieldCheck className="h-4 w-4" />
            <p className="font-display text-xs uppercase tracking-[0.3em]">{t("adminLogin.eyebrow")}</p>
          </div>
        </div>

        <div
          className="rounded-2xl border px-7 py-7 sm:px-8 sm:py-8"
          style={{ backgroundColor: BURGUNDY_DEEP, borderColor: `${GOLD}33` }}
        >
          <h1 className="font-display text-2xl font-semibold" style={{ color: GOLD_SOFT }}>
            {t("adminLogin.title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#cfc4b3" }}>
            {t("adminLogin.subtitle")}
          </p>

          {errors.form && (
            <p className="mt-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: "#3d0f1c", color: "#f0a8a8" }}>
              {errors.form}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="admin-email" className="text-sm font-medium" style={{ color: "#cfc4b3" }}>
                {t("auth.emailLabel")}
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder={t("auth.emailPlaceholder")}
                value={form.email}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
                style={{ borderColor: errors.email ? "#cc4a3d" : `${GOLD}44`, color: "#f7f2e7" }}
              />
              {errors.email && <p className="mt-1.5 text-xs" style={{ color: "#e0938a" }}>{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="admin-password" className="text-sm font-medium" style={{ color: "#cfc4b3" }}>
                {t("auth.passwordLabel")}
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder={t("auth.passwordPlaceholder")}
                value={form.password}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
                style={{ borderColor: errors.password ? "#cc4a3d" : `${GOLD}44`, color: "#f7f2e7" }}
              />
              {errors.password && <p className="mt-1.5 text-xs" style={{ color: "#e0938a" }}>{errors.password}</p>}
              <Link to="/forgot-password" className="mt-1.5 inline-block text-xs font-medium hover:underline" style={{ color: GOLD_SOFT }}>
                {t("auth.forgotPasswordLink")}
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              className="mt-1 w-full"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #8a6a2c)`, color: CHARCOAL }}
            >
              {t("adminLogin.submitButton")}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "#7d7264" }}>
          {t("adminLogin.notAdmin")}{" "}
          <Link to="/login" className="font-medium hover:underline" style={{ color: GOLD_SOFT }}>
            {t("adminLogin.userLoginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
