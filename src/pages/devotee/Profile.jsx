import { useState } from "react";
import { Bell, Pencil, Save, Shield, User as UserIcon, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { formatDateDDMMYYYY } from "../../utils/dateFormatter";

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

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();
  const { t, language } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, phone: user.phone, centre: user.centre, mentor: user.mentor });
  const [isSaving, setIsSaving] = useState(false);
  const [prefs, setPrefs] = useState({ dailyReminder: true, weeklySummary: true, mentorUpdates: false });

  const localeMap = { en: "en-IN", hi: "hi-IN", ru: "ru-RU" };

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateProfile(form);
      addToast(t("profile.profileUpdated"));
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setForm({ name: user.name, phone: user.phone, centre: user.centre, mentor: user.mentor });
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
          <Input label={t("profile.mentor")} name="mentor" value={form.mentor} onChange={handleChange} disabled={!isEditing} className="sm:col-span-2" />
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
            <Button variant="outline" size="sm" onClick={() => addToast(t("profile.passwordComingSoon"), "info")}>
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
    </div>
  );
}
