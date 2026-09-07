import { useState } from "react";
import { Bell, Pencil, Save, Shield, User as UserIcon, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { changePassword } from "../../services/authService";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import CheckboxGroup from "../../components/sadhana/CheckboxGroup";
import { MENTOR_OPTIONS, formatMentorNames } from "../../data/mentorList";
import { formatDateDDMMYYYY } from "../../utils/dateFormatter";
import { friendlyErrorMessage } from "../../utils/friendlyError";

const TONES = {
  maroon: "bg-maroon-500",
  saffron: "bg-saffron-500",
  sage: "bg-sage-500",
};

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
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone,
    centre: user.centre,
    mentor: user.mentor ?? [],
    mentorOther: user.mentorOther ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [prefs, setPrefs] = useState({ dailyReminder: true, weeklySummary: true, mentorUpdates: false });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const localeMap = { en: "en-IN", hi: "hi-IN", ru: "ru-RU" };

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function setMentors(values) {
    setForm((prev) => ({ ...prev, mentor: values }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateProfile(form);
      addToast(t("profile.profileUpdated"));
      setIsEditing(false);
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      name: user.name,
      phone: user.phone,
      centre: user.centre,
      mentor: user.mentor ?? [],
      mentorOther: user.mentorOther ?? "",
    });
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
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
              <UserIcon className="h-[18px] w-[18px]" />
            </span>
            <h2 className="font-display text-lg font-semibold text-maroon-600">{t("profile.personalInfoTitle")}</h2>
          </div>
          {!isEditing ? (
            <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setIsEditing(true)}>
              {t("common.edit")}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={X} onClick={handleCancel}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" size="sm" icon={Save} isLoading={isSaving} onClick={handleSave}>
                {t("common.save")}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t("profile.fullName")} name="name" value={form.name} onChange={handleChange} disabled={!isEditing} />
          <Input label={t("profile.email")} value={user.email} disabled />
          <Input label={t("profile.phone")} name="phone" value={form.phone} onChange={handleChange} disabled={!isEditing} />
          <Input label={t("profile.centre")} name="centre" value={form.centre} onChange={handleChange} disabled={!isEditing} />
          {isEditing ? (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-brown-700">{t("profile.mentor")}</label>
              <CheckboxGroup
                name="mentor"
                options={MENTOR_OPTIONS}
                values={form.mentor}
                onChange={setMentors}
                otherValue="Other"
                otherText={form.mentorOther}
                onOtherTextChange={(v) => setForm((prev) => ({ ...prev, mentorOther: v }))}
                otherLabel={t("register.mentorOtherLabel")}
                otherPlaceholder={t("register.mentorOtherPlaceholder")}
              />
            </div>
          ) : (
            <Input
              label={t("profile.mentor")}
              value={formatMentorNames(user.mentor, user.mentorOther)}
              disabled
              className="sm:col-span-2"
            />
          )}
          {user.dob && <Input label={t("profile.dob")} value={formatDateDDMMYYYY(user.dob)} disabled />}
          {user.dikshaStage && <Input label={t("profile.dikshaStage")} value={user.dikshaStage} disabled />}
          {(user.initiationDate || user.initiationYear) && (
            <Input
              label={t("profile.initiationDate")}
              value={user.initiationDate ? formatDateDDMMYYYY(user.initiationDate) : user.initiationYear}
              disabled
            />
          )}
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
