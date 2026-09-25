import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Trash2,
  Pencil,
  Save,
  X,
  TriangleAlert,
  Fingerprint,
} from "lucide-react";
import { listAllUsers, deleteUserAccount } from "../../services/adminUserService";
import { updateProfile, requestPasswordReset } from "../../services/authService";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { GURUDEV_OPTIONS, INITIATION_STAGES, PHONE_PATTERN } from "../Register";
import { formatMentorNames, MENTOR_OPTIONS } from "../../data/mentorList";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import FormInput from "../../components/FormInput";
import DobInput from "../../components/DobInput";
import FormSelect from "../../components/FormSelect";
import GenderSelector from "../../components/GenderSelector";
import CheckboxGroup from "../../components/sadhana/CheckboxGroup";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import LoadingState from "../../components/ui/LoadingState";

const PRESET_GURUDEVS = GURUDEV_OPTIONS.filter((g) => g !== "Other");

function splitGurudev(storedName) {
  if (!storedName) return { gurudevName: "", gurudevOther: "" };
  if (PRESET_GURUDEVS.includes(storedName)) return { gurudevName: storedName, gurudevOther: "" };
  return { gurudevName: "Other", gurudevOther: storedName };
}

function buildFormFromProfile(p) {
  const { gurudevName, gurudevOther } = splitGurudev(p?.gurudevName);
  return {
    firstName: p?.firstName ?? "",
    lastName: p?.lastName ?? "",
    dob: p?.dob ?? "",
    spiritualName: p?.spiritualName ?? "",
    gurudevName,
    gurudevOther,
    dikshaStage: p?.dikshaStage ?? "",
    initiationDateMode: p?.initiationYear && !p?.initiationDate ? "year" : "full",
    initiationDate: p?.initiationDate ?? "",
    initiationYear: p?.initiationYear ?? "",
    sex: p?.sex ?? "",
    city: p?.city ?? "",
    centre: p?.centre ?? "",
    mentor: p?.mentorNames ?? [],
    mentorOther: p?.mentorOther ?? "",
    mobileNumber: p?.mobileNumber ?? "",
  };
}

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => buildFormFromProfile(null));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function load() {
    setIsLoading(true);
    listAllUsers()
      .then(({ users }) => {
        const match = users.find((u) => u.id === id);
        if (!match) {
          setLoadError("This user could not be found.");
        } else {
          setUser(match);
          setForm(buildFormFromProfile(match.profile));
          setLoadError(null);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setLoadError(friendlyErrorMessage(err, t));
        setIsLoading(false);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id]);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleChange(e) {
    setField(e.target.name, e.target.value);
  }

  function validate() {
    const next = {};
    if (!form.firstName.trim()) next.firstName = "Please enter a first name.";
    if (!form.lastName.trim()) next.lastName = "Please enter a last name.";
    if (form.gurudevName === "Other" && !form.gurudevOther.trim()) next.gurudevOther = "Please specify the Gurudev name.";
    if (form.mentor.includes("Other") && !form.mentorOther.trim()) next.mentorOther = "Please specify the mentor name.";
    if (form.mobileNumber && !PHONE_PATTERN.test(form.mobileNumber.trim())) next.mobileNumber = "Please enter a valid mobile number.";
    return next;
  }

  async function handleSave() {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setIsSaving(true);
    try {
      await updateProfile(id, {
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
      addToast("Profile updated successfully.");
      setIsEditing(false);
      load();
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendPasswordReset() {
    setIsSendingReset(true);
    try {
      await requestPasswordReset(user.email);
      addToast("Password reset email sent successfully.");
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    } finally {
      setIsSendingReset(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteUserAccount(id);
      addToast("User deleted successfully.");
      navigate("/admin/users");
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }

  if (isLoading) return <LoadingState fullHeight label="Loading user…" />;

  if (loadError || !user) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-brown-500 hover:text-maroon-600">
          <ArrowLeft className="h-4 w-4" /> Back to User Management
        </Link>
        <Card className="text-center">
          <p className="text-sm font-medium text-clay-600">{loadError ?? "This user could not be found."}</p>
        </Card>
      </div>
    );
  }

  const verified = Boolean(user.emailConfirmedAt);

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-brown-500 hover:text-maroon-600">
        <ArrowLeft className="h-4 w-4" /> Back to User Management
      </Link>

      <PageHeader title={user.email} subtitle={`Role: ${user.profile?.role ?? "devotee"}`} />

      <Card>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <Fingerprint className="h-[18px] w-[18px]" />
          </span>
          <h2 className="font-display text-lg font-semibold text-maroon-600">Authentication Information</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="User ID" value={user.id} disabled />
          <Input label="Email" value={user.email} disabled />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brown-700">Email Status</label>
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                verified ? "border-sage-300 bg-sage-50 text-sage-600" : "border-clay-300 bg-clay-100 text-clay-600"
              }`}
            >
              {verified ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {verified ? "Verified" : "Unverified"}
            </span>
          </div>
          <Input label="Auth Provider" value={user.provider} disabled className="capitalize" />
          <Input label="Created" value={formatDateTime(user.createdAt) ?? "—"} disabled />
          <Input label="Last Login" value={user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "Never logged in"} disabled />
          <Input label="Account Status" value={user.banned ? "Suspended" : "Active"} disabled />
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
              <Pencil className="h-[18px] w-[18px]" />
            </span>
            <h2 className="font-display text-lg font-semibold text-maroon-600">Profile Information</h2>
          </div>
          {user.profile &&
            (!isEditing ? (
              <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setForm(buildFormFromProfile(user.profile));
                    setErrors({});
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" icon={Save} isLoading={isSaving} onClick={handleSave}>
                  Save
                </Button>
              </div>
            ))}
        </div>

        {!user.profile ? (
          <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-clay-300 bg-clay-100/40 px-4 py-6">
            <TriangleAlert className="h-6 w-6 shrink-0 text-clay-600" />
            <div>
              <p className="font-medium text-clay-600">⚠ Profile Missing</p>
              <p className="mt-1 text-sm text-brown-600">
                This Auth account has no matching <code>profiles</code> row. It will be recovered automatically from
                this account's own signup data the next time this user successfully logs in — nothing to do here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div data-error={Boolean(errors.firstName)}>
              <FormInput label="First Name" name="firstName" value={form.firstName} onChange={handleChange} error={errors.firstName} disabled={!isEditing} />
            </div>
            <div data-error={Boolean(errors.lastName)}>
              <FormInput label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} error={errors.lastName} disabled={!isEditing} />
            </div>
            <DobInput label="Date of Birth" name="dob" value={form.dob} onChange={handleChange} disabled={!isEditing} invalidMessage="Please enter a valid date as DD/MM/YYYY." />
            <FormInput label="Spiritual Name" name="spiritualName" value={form.spiritualName} onChange={handleChange} disabled={!isEditing} />
            {isEditing ? (
              <GenderSelector label="Sex" value={form.sex} onChange={(v) => setField("sex", v)} />
            ) : (
              <Input label="Sex" value={form.sex} disabled />
            )}
            <FormSelect
              label="Srila Gurudev Name"
              name="gurudevName"
              placeholder="Select Srila Gurudev's name"
              options={GURUDEV_OPTIONS}
              value={form.gurudevName}
              onChange={handleChange}
              disabled={!isEditing}
            />
            {form.gurudevName === "Other" && (
              <div data-error={Boolean(errors.gurudevOther)}>
                <FormInput
                  label="Gurudev Name (Other)"
                  name="gurudevOther"
                  value={form.gurudevOther}
                  onChange={handleChange}
                  error={errors.gurudevOther}
                  disabled={!isEditing}
                />
              </div>
            )}
            <FormSelect
              label="Diksha Stage"
              name="dikshaStage"
              placeholder="Select Diksha stage"
              options={INITIATION_STAGES}
              value={form.dikshaStage}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <FormInput
              label="Initiation Date"
              type={form.initiationDateMode === "full" ? "date" : "text"}
              name={form.initiationDateMode === "full" ? "initiationDate" : "initiationYear"}
              value={form.initiationDateMode === "full" ? form.initiationDate : form.initiationYear}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <FormInput label="City" name="city" value={form.city} onChange={handleChange} disabled={!isEditing} />
            <FormInput label="Centre / Temple" name="centre" value={form.centre} onChange={handleChange} disabled={!isEditing} />
            <div data-error={Boolean(errors.mobileNumber)}>
              <FormInput
                label="Mobile Number"
                name="mobileNumber"
                value={form.mobileNumber}
                onChange={handleChange}
                error={errors.mobileNumber}
                disabled={!isEditing}
              />
            </div>
            <div className="sm:col-span-2">
              {isEditing ? (
                <>
                  <label className="mb-2 block text-sm font-medium text-brown-700">Mentor(s)</label>
                  <CheckboxGroup
                    name="mentor"
                    options={MENTOR_OPTIONS}
                    values={form.mentor}
                    onChange={(v) => setField("mentor", v)}
                    otherValue="Other"
                    otherText={form.mentorOther}
                    onOtherTextChange={(v) => setField("mentorOther", v)}
                    otherLabel="Please specify the mentor's name"
                    otherPlaceholder="Write the name"
                  />
                  {errors.mentorOther && <p className="mt-2 text-xs text-clay-600">{errors.mentorOther}</p>}
                </>
              ) : (
                <Input label="Mentor(s)" value={formatMentorNames(form.mentor, form.mentorOther)} disabled />
              )}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-100 text-maroon-600">
            <KeyRound className="h-[18px] w-[18px]" />
          </span>
          <h2 className="font-display text-lg font-semibold text-maroon-600">Account Actions</h2>
        </div>
        <div className="flex flex-col divide-y divide-brown-900/5">
          <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brown-800">Update Password</p>
              <p className="text-xs text-brown-500">Sends a password-reset email to {user.email} via Supabase Auth.</p>
            </div>
            <Button variant="outline" size="sm" isLoading={isSendingReset} onClick={handleSendPasswordReset}>
              Send Reset Email
            </Button>
          </div>
          <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-clay-600">Delete User</p>
              <p className="text-xs text-brown-500">Permanently removes this Auth account and all associated data.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Trash2}
              className="!border-clay-400 !text-clay-600 hover:!bg-clay-100"
              onClick={() => setIsDeleteOpen(true)}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Card>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete this user?" size="sm">
        <p className="text-sm text-brown-700">
          This will permanently delete <span className="font-medium text-brown-900">{user.email}</span>'s Supabase
          Auth account, their profile, and their submitted Sadhana records. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="!bg-clay-600 hover:!bg-clay-600/90"
            isLoading={isDeleting}
            onClick={handleDelete}
          >
            Delete User
          </Button>
        </div>
      </Modal>
    </div>
  );
}
