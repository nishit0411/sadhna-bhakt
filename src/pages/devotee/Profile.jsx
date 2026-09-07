import { useState } from "react";
import { Bell, Cake, Heart, MapPin, Pencil, Phone, Save, Shield, Sparkles, User as UserIcon, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { changePassword, requestEmailChange } from "../../services/authService";
import { GURUDEV_OPTIONS, INITIATION_STAGES, YEAR_PATTERN, EMAIL_PATTERN, PHONE_PATTERN } from "../Register";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import FormInput from "../../components/FormInput";
import FormSelect from "../../components/FormSelect";
import GenderSelector from "../../components/GenderSelector";
import CheckboxGroup from "../../components/sadhana/CheckboxGroup";
import { MENTOR_OPTIONS, formatMentorNames } from "../../data/mentorList";
import { friendlyErrorMessage } from "../../utils/friendlyError";

const TONES = {
  maroon: "bg-maroon-500",
  saffron: "bg-saffron-500",
  sage: "bg-sage-500",
};

const PRESET_GURUDEVS = GURUDEV_OPTIONS.filter((g) => g !== "Other");
const CURRENT_YEAR = new Date().getFullYear();

/** Reconstructs the edit-form's gurudev fields from the single stored column — see buildFormFromUser below. */
function splitGurudev(storedName) {
  if (!storedName) return { gurudevName: "", gurudevOther: "" };
  if (PRESET_GURUDEVS.includes(storedName)) return { gurudevName: storedName, gurudevOther: "" };
  return { gurudevName: "Other", gurudevOther: storedName };
}

function buildFormFromUser(user) {
  const { gurudevName, gurudevOther } = splitGurudev(user.gurudevName);
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    dob: user.dob ?? "",
    spiritualName: user.spiritualName ?? "",
    gurudevName,
    gurudevOther,
    dikshaStage: user.dikshaStage ?? "",
    initiationDateMode: user.initiationYear && !user.initiationDate ? "year" : "full",
    initiationDate: user.initiationDate ?? "",
    initiationYear: user.initiationYear ?? "",
    sex: user.sex ?? "",
    city: user.city ?? "",
    centre: user.centre ?? "",
    mentor: user.mentor ?? [],
    mentorOther: user.mentorOther ?? "",
    mobileNumber: user.phone ?? "",
    email: user.email ?? "",
  };
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-brown-900/5 py-3.5 last:border-0">
      <div>
        <p className="text-sm font-medium text-brown-800">{label}</p>
        {description && <p className="text-xs text-brown-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-sage-500" : "bg-brown-900/15"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream-50 shadow-soft transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

const PASSWORD_MODAL_INITIAL = { currentPassword: "", newPassword: "", confirmPassword: "" };

function ChangePasswordModal({ isOpen, onClose, email, t, addToast }) {
  const [form, setForm] = useState(PASSWORD_MODAL_INITIAL);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  }

  function handleClose() {
    setForm(PASSWORD_MODAL_INITIAL);
    setErrors({});
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = t("profile.errCurrentPassword");
    if (!form.newPassword) next.newPassword = t("profile.errNewPassword");
    else if (form.newPassword.length < 6) next.newPassword = t("profile.errNewPasswordInvalid");
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = t("profile.errConfirmMismatch");
    setErrors(next);
    if (Object.keys(next).length) return;

    setIsSubmitting(true);
    try {
      await changePassword({ email, currentPassword: form.currentPassword, newPassword: form.newPassword });
      addToast(t("profile.passwordChanged"));
      handleClose();
    } catch (err) {
      if (err.message === "current_password_incorrect") {
        setErrors({ currentPassword: friendlyErrorMessage(err, t) });
      } else {
        setErrors({ newPassword: friendlyErrorMessage(err, t) });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("profile.changePasswordModalTitle")}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label={t("profile.currentPasswordLabel")}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          placeholder={t("profile.currentPasswordPlaceholder")}
          value={form.currentPassword}
          onChange={handleChange}
          error={errors.currentPassword}
          required
        />
        <Input
          label={t("profile.newPasswordLabel")}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder={t("profile.newPasswordPlaceholder")}
          value={form.newPassword}
          onChange={handleChange}
          error={errors.newPassword}
          required
        />
        <Input
          label={t("profile.confirmNewPasswordLabel")}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder={t("profile.confirmNewPasswordPlaceholder")}
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          required
        />
        <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2 w-full">
          {t("profile.update")}
        </Button>
      </form>
    </Modal>
  );
}

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();
  const { t, language } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => buildFormFromUser(user));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [prefs, setPrefs] = useState({ dailyReminder: true, weeklySummary: true, mentorUpdates: false });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const localeMap = { en: "en-IN", hi: "hi-IN", ru: "ru-RU" };

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
    if (form.gurudevName === "Other" && !form.gurudevOther.trim()) next.gurudevOther = t("register.errGurudevOther");
    if (form.mentor.includes("Other") && !form.mentorOther.trim()) next.mentorOther = t("register.errMentorOther");
    if (!form.city.trim()) next.city = t("register.errCity");
    if (!form.centre.trim()) next.centre = t("register.errCentre");
    if (!form.mobileNumber.trim()) next.mobileNumber = t("register.errMobile");
    else if (!PHONE_PATTERN.test(form.mobileNumber.trim())) next.mobileNumber = t("register.errMobileInvalid");
    if (!form.email.trim()) next.email = t("register.errEmail");
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = t("register.errEmailInvalid");
    return next;
  }

  async function handleSave() {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      const firstErrorField = document.querySelector("[data-error='true']");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSaving(true);
    try {
      const emailChanged = form.email.trim() !== user.email;
      if (emailChanged) {
        await requestEmailChange(form.email.trim());
      }
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dob: form.dob || null,
        spiritualName: form.spiritualName.trim() || null,
        gurudevName: form.gurudevName === "Other" ? form.gurudevOther.trim() : form.gurudevName || null,
        dikshaStage: form.dikshaStage || null,
        initiationDate: form.initiationDateMode === "full" ? form.initiationDate || null : null,
        initiationYear: form.initiationDateMode === "year" ? form.initiationYear || null : null,
        sex: form.sex || null,
        city: form.city.trim(),
        centre: form.centre.trim(),
        mentor: form.mentor,
        mentorOther: form.mentor.includes("Other") ? form.mentorOther.trim() : "",
        phone: form.mobileNumber.trim(),
      });
      addToast(emailChanged ? t("profile.emailChangePending") : t("profile.profileUpdated"), emailChanged ? "info" : "success");
      setIsEditing(false);
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setForm(buildFormFromUser(user));
    setErrors({});
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("profile.pageTitle")} subtitle={t("profile.subtitle")} />

      <Card className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-cream-50 ${TONES[user.avatarColor] ?? TONES.maroon}`}>
          {user.initials}
        </span>
        <div>
          <p className="font-display text-xl font-semibold text-brown-900">{user.name}</p>
          <p className="text-sm text-brown-500">{user.email}</p>
          <p className="mt-1 text-xs text-brown-400">
            {t("profile.devoteeSince")} {new Date(user.joinedOn).toLocaleDateString(localeMap[language], { month: "long", year: "numeric" })}
          </p>
        </div>
        {!isEditing ? (
          <Button variant="ghost" size="sm" icon={Pencil} className="sm:ml-auto" onClick={() => setIsEditing(true)}>
            {t("common.edit")}
          </Button>
        ) : (
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="ghost" size="sm" icon={X} onClick={handleCancel}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" size="sm" icon={Save} isLoading={isSaving} onClick={handleSave}>
              {t("common.save")}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <UserIcon className="h-[18px] w-[18px]" />
          </span>
          <h2 className="font-display text-lg font-semibold text-maroon-600">{t("register.personalInfoTitle")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div data-error={Boolean(errors.firstName)}>
            <FormInput
              label={t("register.firstName")}
              required
              name="firstName"
              icon={UserIcon}
              value={form.firstName}
              onChange={handleChange}
              error={errors.firstName}
              disabled={!isEditing}
            />
          </div>
          <div data-error={Boolean(errors.lastName)}>
            <FormInput
              label={t("register.lastName")}
              required
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              error={errors.lastName}
              disabled={!isEditing}
            />
          </div>
          <FormInput
            label={t("register.dob")}
            type="date"
            name="dob"
            icon={Cake}
            value={form.dob}
            onChange={handleChange}
            disabled={!isEditing}
          />
          <FormInput
            label={t("register.spiritualName")}
            name="spiritualName"
            value={form.spiritualName}
            onChange={handleChange}
            disabled={!isEditing}
          />
          <div data-error={Boolean(errors.sex)}>
            {isEditing ? (
              <GenderSelector
                label={t("register.sex")}
                required
                value={form.sex}
                onChange={(v) => setField("sex", v)}
                error={errors.sex}
                maleLabel={t("register.male")}
                femaleLabel={t("register.female")}
              />
            ) : (
              <Input label={t("register.sex")} value={form.sex} disabled />
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <h2 className="font-display text-lg font-semibold text-maroon-600">{t("register.spiritualInfoTitle")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label={t("register.gurudevName")}
            name="gurudevName"
            placeholder={t("register.gurudevNamePlaceholder")}
            options={GURUDEV_OPTIONS}
            value={form.gurudevName}
            onChange={handleChange}
            disabled={!isEditing}
          />
          {form.gurudevName === "Other" && (
            <div data-error={Boolean(errors.gurudevOther)}>
              <FormInput
                label={t("register.gurudevOtherLabel")}
                required
                name="gurudevOther"
                value={form.gurudevOther}
                onChange={handleChange}
                error={errors.gurudevOther}
                disabled={!isEditing}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            {isEditing ? (
              <>
                <label className="mb-2 block text-sm font-medium text-brown-700">{t("register.mentorName")}</label>
                <CheckboxGroup
                  name="mentor"
                  options={MENTOR_OPTIONS}
                  values={form.mentor}
                  onChange={(v) => setField("mentor", v)}
                  otherValue="Other"
                  otherText={form.mentorOther}
                  onOtherTextChange={(v) => setField("mentorOther", v)}
                  otherLabel={t("register.mentorOtherLabel")}
                  otherPlaceholder={t("register.mentorOtherPlaceholder")}
                />
                {errors.mentorOther && <p className="mt-2 text-xs text-clay-600">{errors.mentorOther}</p>}
              </>
            ) : (
              <Input label={t("register.mentorName")} value={formatMentorNames(form.mentor, form.mentorOther)} disabled />
            )}
          </div>
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
              disabled={!isEditing}
            />
          </div>
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-brown-700">{t("register.initiationDate")}</label>
              {isEditing && (
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
              )}
            </div>
            {form.initiationDateMode === "full" ? (
              <FormInput
                type="date"
                name="initiationDate"
                icon={Heart}
                value={form.initiationDate}
                onChange={handleChange}
                disabled={!isEditing}
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
                  disabled={!isEditing}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <MapPin className="h-[18px] w-[18px]" />
          </span>
          <h2 className="font-display text-lg font-semibold text-maroon-600">{t("register.locationContactTitle")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div data-error={Boolean(errors.city)}>
            <FormInput
              label={t("register.city")}
              required
              name="city"
              icon={MapPin}
              value={form.city}
              onChange={handleChange}
              error={errors.city}
              disabled={!isEditing}
            />
          </div>
          <div data-error={Boolean(errors.centre)}>
            <FormInput
              label={t("register.centre")}
              required
              name="centre"
              icon={MapPin}
              value={form.centre}
              onChange={handleChange}
              error={errors.centre}
              disabled={!isEditing}
            />
          </div>
          <div data-error={Boolean(errors.mobileNumber)}>
            <FormInput
              label={t("register.mobileNumber")}
              required
              name="mobileNumber"
              icon={Phone}
              value={form.mobileNumber}
              onChange={handleChange}
              error={errors.mobileNumber}
              disabled={!isEditing}
            />
          </div>
          <div data-error={Boolean(errors.email)}>
            <FormInput
              label={t("register.emailAddress")}
              required
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              helperText={isEditing ? t("profile.emailChangeHelper") : undefined}
              disabled={!isEditing || !isSupabaseConfigured}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <Bell className="h-[18px] w-[18px]" />
          </span>
          <h2 className="font-display text-lg font-semibold text-maroon-600">{t("profile.notificationPrefsTitle")}</h2>
        </div>
        <ToggleRow
          label={t("profile.dailyReminder")}
          description={t("profile.dailyReminderDesc")}
          checked={prefs.dailyReminder}
          onChange={() => setPrefs((p) => ({ ...p, dailyReminder: !p.dailyReminder }))}
        />
        <ToggleRow
          label={t("profile.weeklySummary")}
          description={t("profile.weeklySummaryDesc")}
          checked={prefs.weeklySummary}
          onChange={() => setPrefs((p) => ({ ...p, weeklySummary: !p.weeklySummary }))}
        />
        <ToggleRow
          label={t("profile.mentorUpdates")}
          description={t("profile.mentorUpdatesDesc")}
          checked={prefs.mentorUpdates}
          onChange={() => setPrefs((p) => ({ ...p, mentorUpdates: !p.mentorUpdates }))}
        />
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <Shield className="h-[18px] w-[18px]" />
          </span>
          <h2 className="font-display text-lg font-semibold text-maroon-600">{t("profile.accountSettingsTitle")}</h2>
        </div>
        <div className="flex flex-col divide-y divide-brown-900/5">
          <div className="flex items-center justify-between py-3.5">
            <p className="text-sm text-brown-700">{t("profile.changePassword")}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={!isSupabaseConfigured}
              onClick={() => setIsPasswordModalOpen(true)}
            >
              {t("profile.update")}
            </Button>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <p className="text-sm text-brown-700">{t("profile.exportData")}</p>
            <Button variant="outline" size="sm" onClick={() => addToast(t("profile.exportComingSoon"), "info")}>
              {t("profile.export")}
            </Button>
          </div>
        </div>
      </Card>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        email={user.email}
        t={t}
        addToast={addToast}
      />
    </div>
  );
}
