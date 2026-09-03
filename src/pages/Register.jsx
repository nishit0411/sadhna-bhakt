import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Sparkles, Heart, MapPin, Phone, Mail, ArrowRight, Cake } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useTranslation } from "../i18n/LanguageContext";
import Logo from "../components/layout/Logo";
import LanguageSwitcher from "../components/layout/LanguageSwitcher";
import DeveloperCredit from "../components/layout/DeveloperCredit";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import ProgressBar from "../components/ui/ProgressBar";
import FormSection from "../components/FormSection";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import GenderSelector from "../components/GenderSelector";

const INITIATION_STAGES = ["Initial", "Harinaam", "Gopal Mantra", "Diksha"];

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  dob: "",
  spiritualName: "",
  gurudevName: "",
  dikshaStage: "",
  initiationDateMode: "full",
  initiationDate: "",
  initiationYear: "",
  sex: "",
  city: "",
  mentorName: "",
  mobileNumber: "",
  email: "",
  password: "",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_PATTERN = /^(19|20)\d{2}$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{7,12}$/;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [pendingEmail, setPendingEmail] = useState(null);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleChange(e) {
    setField(e.target.name, e.target.value);
  }

  function validate() {
    const next = {};
    if (!form.firstName.trim()) next.firstName = t("register.errFirstName");
    if (!form.lastName.trim()) next.lastName = t("register.errLastName");
    if (!form.dikshaStage) next.dikshaStage = t("register.errDikshaStage");
    if (form.initiationDateMode === "year" && form.initiationYear && !YEAR_PATTERN.test(form.initiationYear)) {
      next.initiationYear = t("register.errInitiationYear");
    }
    if (!form.sex) next.sex = t("register.errSex");
    if (!form.city.trim()) next.city = t("register.errCity");
    if (!form.mobileNumber.trim()) next.mobileNumber = t("register.errMobile");
    else if (!PHONE_PATTERN.test(form.mobileNumber.trim())) next.mobileNumber = t("register.errMobileInvalid");
    if (!form.email.trim()) next.email = t("register.errEmail");
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = t("register.errEmailInvalid");
    if (isSupabaseConfigured) {
      if (!form.password) next.password = t("register.errPassword");
      else if (form.password.length < 6) next.password = t("register.errPasswordInvalid");
    }
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      const firstErrorField = document.querySelector("[data-error='true']");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register(form);
      if (result?.pendingEmailConfirmation) {
        setPendingEmail(result.email);
      } else {
        setProfile(result);
      }
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleContinue() {
    navigate("/devotee/dashboard");
  }

  if (pendingEmail) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream-50 px-4 py-10">
        <div className="devotional-pattern pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative w-full max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-saffron-100 text-3xl">📧</span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-maroon-600 sm:text-3xl">{t("register.checkEmailTitle")}</h1>
          <p className="mt-2 text-brown-600">{t("register.checkEmailBody", { email: pendingEmail })}</p>
          <Button size="lg" icon={ArrowRight} className="mt-6 w-full" onClick={() => navigate("/login")}>
            {t("register.backToLogin")}
          </Button>

          <DeveloperCredit className="mt-8" />
        </div>
      </div>
    );
  }

  if (profile) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream-50 px-4 py-10">
        <div className="devotional-pattern pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative w-full max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-saffron-100 text-3xl">🙏</span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-maroon-600 sm:text-3xl">{t("register.successTitle")}</h1>
          <p className="mt-2 text-brown-600">
            {t("register.successGreeting")} {profile.firstName} 🙏
          </p>

          <Card className="mt-6 px-7 py-6 text-left" padded={false}>
            <dl className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-brown-900/5 pb-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-brown-500">{t("common.name")}</dt>
                <dd className="font-medium text-brown-900">
                  {profile.firstName} {profile.lastName}
                </dd>
              </div>
              {profile.dob && (
                <div className="flex items-center justify-between border-b border-brown-900/5 pb-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-brown-500">{t("register.dob")}</dt>
                  <dd className="font-medium text-brown-900">{profile.dob}</dd>
                </div>
              )}
              {profile.spiritualName && (
                <div className="flex items-center justify-between border-b border-brown-900/5 pb-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-brown-500">{t("register.spiritualName")}</dt>
                  <dd className="font-medium text-brown-900">{profile.spiritualName}</dd>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-brown-900/5 pb-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-brown-500">{t("register.dikshaStage")}</dt>
                <dd className="font-medium text-brown-900">{profile.dikshaStage}</dd>
              </div>
              {(profile.initiationDate || profile.initiationYear) && (
                <div className="flex items-center justify-between border-b border-brown-900/5 pb-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-brown-500">{t("register.initiationDate")}</dt>
                  <dd className="font-medium text-brown-900">
                    {profile.initiationDateMode === "year" ? profile.initiationYear : profile.initiationDate}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-xs font-medium uppercase tracking-wide text-brown-500">{t("common.city")}</dt>
                <dd className="font-medium text-brown-900">{profile.city}</dd>
              </div>
            </dl>
          </Card>

          <Button size="lg" icon={ArrowRight} className="mt-6 w-full" onClick={handleContinue}>
            {t("register.continueButton")}
          </Button>

          <DeveloperCredit className="mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-cream-50 px-4 py-10 sm:py-14">
      <div className="devotional-pattern pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-3xl">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <p className="mt-5 text-sm text-saffron-600">{t("register.hareKrishna")}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-maroon-600 sm:text-4xl">{t("register.title")}</h1>
          <p className="mt-2 max-w-md text-brown-600">{t("register.subtitle")}</p>
        </div>

        <Card className="mb-5 flex items-center justify-between gap-4" padded={false}>
          <div className="flex flex-1 items-center gap-4 px-5 py-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-brown-500">
                <span>{t("register.stepLabel")}</span>
                <span>{t("register.stepCount")}</span>
              </div>
              <ProgressBar value={100} tone="saffron" className="mt-2" />
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <FormSection icon={User} title={t("register.personalInfoTitle")} description={t("register.personalInfoDesc")}>
            <div data-error={Boolean(errors.firstName)}>
              <FormInput
                label={t("register.firstName")}
                required
                name="firstName"
                icon={User}
                placeholder={t("register.firstNamePlaceholder")}
                value={form.firstName}
                onChange={handleChange}
                error={errors.firstName}
              />
            </div>
            <div data-error={Boolean(errors.lastName)}>
              <FormInput
                label={t("register.lastName")}
                required
                name="lastName"
                placeholder={t("register.lastNamePlaceholder")}
                value={form.lastName}
                onChange={handleChange}
                error={errors.lastName}
              />
            </div>
            <FormInput
              label={t("register.dob")}
              type="date"
              name="dob"
              icon={Cake}
              value={form.dob}
              onChange={handleChange}
            />
            <FormInput
              label={t("register.spiritualName")}
              name="spiritualName"
              placeholder={t("register.spiritualNamePlaceholder")}
              helperText={t("register.spiritualNameHelper")}
              value={form.spiritualName}
              onChange={handleChange}
            />
            <div data-error={Boolean(errors.sex)}>
              <GenderSelector
                label={t("register.sex")}
                required
                value={form.sex}
                onChange={(v) => setField("sex", v)}
                error={errors.sex}
                maleLabel={t("register.male")}
                femaleLabel={t("register.female")}
              />
            </div>
          </FormSection>

          <FormSection icon={Sparkles} title={t("register.spiritualInfoTitle")} description={t("register.spiritualInfoDesc")}>
            <FormInput
              label={t("register.gurudevName")}
              name="gurudevName"
              placeholder={t("register.gurudevNamePlaceholder")}
              value={form.gurudevName}
              onChange={handleChange}
            />
            <FormInput
              label={t("register.mentorName")}
              name="mentorName"
              placeholder={t("register.mentorNamePlaceholder")}
              value={form.mentorName}
              onChange={handleChange}
            />
            <div data-error={Boolean(errors.dikshaStage)}>
              <FormSelect
                label={t("register.dikshaStage")}
                required
                name="dikshaStage"
                placeholder={t("register.dikshaStagePlaceholder")}
                options={INITIATION_STAGES}
                value={form.dikshaStage}
                onChange={handleChange}
                error={errors.dikshaStage}
              />
            </div>
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-brown-700">{t("register.initiationDate")}</label>
                <div className="inline-flex rounded-full bg-cream-100 p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setField("initiationDateMode", "full")}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      form.initiationDateMode === "full" ? "bg-maroon-500 text-cream-50" : "text-brown-600"
                    }`}
                  >
                    {t("register.fullDate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setField("initiationDateMode", "year")}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      form.initiationDateMode === "year" ? "bg-maroon-500 text-cream-50" : "text-brown-600"
                    }`}
                  >
                    {t("register.yearOnly")}
                  </button>
                </div>
              </div>
              {form.initiationDateMode === "full" ? (
                <FormInput
                  type="date"
                  name="initiationDate"
                  icon={Heart}
                  value={form.initiationDate}
                  onChange={handleChange}
                />
              ) : (
                <div data-error={Boolean(errors.initiationYear)}>
                  <FormInput
                    type="text"
                    inputMode="numeric"
                    name="initiationYear"
                    icon={Heart}
                    placeholder={`e.g. ${CURRENT_YEAR}`}
                    value={form.initiationYear}
                    onChange={handleChange}
                    error={errors.initiationYear}
                  />
                </div>
              )}
            </div>
          </FormSection>

          <FormSection icon={MapPin} title={t("register.locationContactTitle")} description={t("register.locationContactDesc")}>
            <div data-error={Boolean(errors.city)}>
              <FormInput
                label={t("register.city")}
                required
                name="city"
                icon={MapPin}
                placeholder={t("register.cityPlaceholder")}
                value={form.city}
                onChange={handleChange}
                error={errors.city}
              />
            </div>
            <div data-error={Boolean(errors.mobileNumber)}>
              <FormInput
                label={t("register.mobileNumber")}
                required
                name="mobileNumber"
                icon={Phone}
                prefix="+91"
                inputMode="numeric"
                placeholder={t("register.mobileNumberPlaceholder")}
                value={form.mobileNumber}
                onChange={handleChange}
                error={errors.mobileNumber}
              />
            </div>
            <div className="sm:col-span-2" data-error={Boolean(errors.email)}>
              <FormInput
                label={t("register.emailAddress")}
                required
                type="email"
                name="email"
                autoComplete="username"
                icon={Mail}
                placeholder={t("register.emailAddressPlaceholder")}
                value={form.email}
                onChange={handleChange}
                error={errors.email}
              />
            </div>
            {isSupabaseConfigured && (
              <div className="sm:col-span-2" data-error={Boolean(errors.password)}>
                <FormInput
                  label={t("register.password")}
                  required
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder={t("register.passwordPlaceholder")}
                  helperText={t("register.passwordManagerHelper")}
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                />
              </div>
            )}
          </FormSection>

          <div className="flex flex-col items-center gap-2 pb-4">
            <Button type="submit" size="lg" icon={ArrowRight} isLoading={isSubmitting} className="w-full sm:w-auto sm:px-10">
              {t("register.submitButton")}
            </Button>
            <p className="text-center text-xs text-brown-500">{t("register.submitNote")}</p>
          </div>
        </form>

        <DeveloperCredit className="mt-8 pb-2" />
      </div>
    </div>
  );
}
