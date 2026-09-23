import { useEffect, useState } from "react";
import { UserPlus, GraduationCap, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import * as mentorService from "../../services/mentorService";
import { deleteUserAccount } from "../../services/adminUserService";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { INITIATION_STAGES } from "../Register";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import FormInput from "../../components/FormInput";
import FormSelect from "../../components/FormSelect";
import GenderSelector from "../../components/GenderSelector";

const EMPTY_FORM = { firstName: "", lastName: "", email: "", dob: "" };

// Mirrors authService.mapProfileRow's shape -> profiles' snake_case columns,
// same mapping authService.updateProfile uses for a devotee's own edits.
const EDIT_EMPTY_FORM = {
  firstName: "",
  lastName: "",
  dob: "",
  spiritualName: "",
  gurudevName: "",
  dikshaStage: "",
  initiationDate: "",
  initiationYear: "",
  sex: "",
  city: "",
  centre: "",
  mobileNumber: "",
};

function buildEditForm(mentor) {
  return {
    firstName: mentor.firstName ?? "",
    lastName: mentor.lastName ?? "",
    dob: mentor.dob ?? "",
    spiritualName: mentor.spiritualName ?? "",
    gurudevName: mentor.gurudevName ?? "",
    dikshaStage: mentor.dikshaStage ?? "",
    initiationDate: mentor.initiationDate ?? "",
    initiationYear: mentor.initiationYear ?? "",
    sex: mentor.sex ?? "",
    city: mentor.city ?? "",
    centre: mentor.centre ?? "",
    mobileNumber: mentor.phone ?? "",
  };
}

export default function MentorManagement() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [mentors, setMentors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addErrors, setAddErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const [editingMentor, setEditingMentor] = useState(null);
  const [editForm, setEditForm] = useState(EDIT_EMPTY_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [deletingMentor, setDeletingMentor] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadMentors() {
    setIsLoading(true);
    mentorService
      .getAllMentors()
      .then((list) => {
        setMentors(list);
        setLoadError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message || friendlyErrorMessage(err, t, "errors.loadFailed"));
        setIsLoading(false);
      });
  }

  useEffect(loadMentors, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openAdd() {
    setAddForm(EMPTY_FORM);
    setAddErrors({});
    setIsAddOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    const next = {};
    if (!addForm.firstName.trim()) next.firstName = t("mentor.errFirstName");
    if (!addForm.lastName.trim()) next.lastName = t("mentor.errLastName");
    if (!addForm.email.trim()) next.email = t("mentor.errEmail");
    if (!addForm.dob) next.dob = t("mentor.errDob");
    setAddErrors(next);
    if (Object.keys(next).length) return;

    setIsCreating(true);
    try {
      const result = await mentorService.createMentor(addForm);
      setIsAddOpen(false);
      setCreatedCredentials({ email: result.email, password: result.password });
      loadMentors();
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    } finally {
      setIsCreating(false);
    }
  }

  function openEdit(mentor) {
    setEditingMentor(mentor);
    setEditForm(buildEditForm(mentor));
    setEditErrors({});
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    const next = {};
    if (!editForm.firstName.trim()) next.firstName = t("mentor.errFirstName");
    if (!editForm.lastName.trim()) next.lastName = t("mentor.errLastName");
    setEditErrors(next);
    if (Object.keys(next).length) return;

    setIsSaving(true);
    try {
      // Every field here comes from editForm, which openEdit() seeded from
      // the mentor's existing row — an untouched field is resaved as its
      // own current value, not blanked, since nothing here defaults to "".
      await mentorService.updateMentor(editingMentor.id, {
        first_name: editForm.firstName.trim(),
        last_name: editForm.lastName.trim(),
        date_of_birth: editForm.dob || null,
        spiritual_name: editForm.spiritualName.trim() || null,
        gurudev_name: editForm.gurudevName.trim() || null,
        diksha_stage: editForm.dikshaStage || null,
        initiation_date: editForm.initiationDate || null,
        initiation_year: editForm.initiationYear.trim() || null,
        sex: editForm.sex || null,
        city: editForm.city.trim() || null,
        centre: editForm.centre.trim() || null,
        mobile_number: editForm.mobileNumber.trim() || null,
      });
      setEditingMentor(null);
      loadMentors();
      addToast(t("mentor.updated"));
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(mentor) {
    try {
      await mentorService.updateMentor(mentor.id, { active: !mentor.active });
      loadMentors();
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteUserAccount(deletingMentor.id);
      setDeletingMentor(null);
      loadMentors();
      addToast(t("mentor.deleted"));
    } catch (err) {
      addToast(friendlyErrorMessage(err, t), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <LoadingState fullHeight label={t("mentor.loading")} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("mentor.managementTitle")}
        subtitle={t("mentor.managementSubtitle")}
        action={
          <Button icon={UserPlus} onClick={openAdd}>
            {t("mentor.addMentor")}
          </Button>
        }
      />

      {loadError && (
        <Card className="border-2 border-clay-400 bg-clay-100/40">
          <p className="text-sm font-medium text-clay-600">{loadError}</p>
        </Card>
      )}

      {!mentors.length ? (
        <EmptyState icon={GraduationCap} title={t("mentor.noneTitle")} description={t("mentor.noneDesc")} />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
                  <th className="px-4 py-3">{t("common.name")}</th>
                  <th className="px-4 py-3">{t("common.email")}</th>
                  <th className="px-4 py-3">{t("mentor.table.mentees")}</th>
                  <th className="px-4 py-3">{t("common.status")}</th>
                  <th className="px-4 py-3 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {mentors.map((m) => (
                  <tr key={m.id} className="border-b border-brown-900/5 bg-cream-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-brown-900">{m.name}</td>
                    <td className="px-4 py-3 text-brown-700">{m.email}</td>
                    <td className="px-4 py-3 text-brown-700">{m.menteeCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          m.active ? "bg-sage-100 text-sage-600" : "bg-beige-300 text-brown-700"
                        }`}
                      >
                        {m.active ? t("mentor.active") : t("mentor.inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" icon={m.active ? EyeOff : Eye} onClick={() => toggleActive(m)}>
                          {m.active ? t("mentor.deactivate") : t("mentor.activate")}
                        </Button>
                        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(m)}>
                          {t("common.edit")}
                        </Button>
                        <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeletingMentor(m)}>
                          {t("common.delete")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title={t("mentor.addMentor")} size="sm">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label={t("mentor.firstName")}
            required
            value={addForm.firstName}
            onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
            error={addErrors.firstName}
          />
          <Input
            label={t("mentor.lastName")}
            required
            value={addForm.lastName}
            onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
            error={addErrors.lastName}
          />
          <Input
            label={t("register.emailAddress")}
            required
            type="email"
            value={addForm.email}
            onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
            error={addErrors.email}
          />
          <Input
            label={t("register.dob")}
            required
            type="date"
            helperText={t("mentor.dobHelper")}
            value={addForm.dob}
            onChange={(e) => setAddForm((f) => ({ ...f, dob: e.target.value }))}
            error={addErrors.dob}
          />
          <Button type="submit" isLoading={isCreating} className="mt-1">
            {t("mentor.createButton")}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={Boolean(createdCredentials)} onClose={() => setCreatedCredentials(null)} title={t("mentor.createdTitle")} size="sm">
        {createdCredentials && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-brown-700">{t("mentor.createdBody")}</p>
            <div className="rounded-xl bg-beige-100 p-4 text-sm">
              <p>
                <span className="font-medium text-brown-700">{t("register.emailAddress")}:</span> {createdCredentials.email}
              </p>
              <p className="mt-1">
                <span className="font-medium text-brown-700">{t("mentor.initialPassword")}:</span>{" "}
                <span className="font-mono text-maroon-600">{createdCredentials.password}</span>
              </p>
            </div>
            <p className="text-xs text-brown-500">{t("mentor.createdWarning")}</p>
            <Button onClick={() => setCreatedCredentials(null)}>{t("common.done")}</Button>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(editingMentor)} onClose={() => setEditingMentor(null)} title={t("mentor.editMentor")} size="lg">
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
          <p className="text-xs text-brown-500">{t("mentor.editEmailNote")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div data-error={Boolean(editErrors.firstName)}>
              <FormInput
                label={t("mentor.firstName")}
                required
                value={editForm.firstName}
                onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                error={editErrors.firstName}
              />
            </div>
            <div data-error={Boolean(editErrors.lastName)}>
              <FormInput
                label={t("mentor.lastName")}
                required
                value={editForm.lastName}
                onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                error={editErrors.lastName}
              />
            </div>
            <FormInput
              label={t("register.dob")}
              type="date"
              value={editForm.dob}
              onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
            />
            <FormInput
              label={t("register.spiritualName")}
              value={editForm.spiritualName}
              onChange={(e) => setEditForm((f) => ({ ...f, spiritualName: e.target.value }))}
            />
            <FormInput
              label={t("register.gurudevName")}
              value={editForm.gurudevName}
              onChange={(e) => setEditForm((f) => ({ ...f, gurudevName: e.target.value }))}
            />
            <FormSelect
              label={t("register.dikshaStage")}
              placeholder={t("register.dikshaStagePlaceholder")}
              options={INITIATION_STAGES}
              value={editForm.dikshaStage}
              onChange={(e) => setEditForm((f) => ({ ...f, dikshaStage: e.target.value }))}
            />
            <FormInput
              label={t("register.initiationDate")}
              type="date"
              value={editForm.initiationDate}
              onChange={(e) => setEditForm((f) => ({ ...f, initiationDate: e.target.value }))}
            />
            <FormInput
              label={t("register.yearOnly")}
              type="text"
              inputMode="numeric"
              value={editForm.initiationYear}
              onChange={(e) => setEditForm((f) => ({ ...f, initiationYear: e.target.value }))}
            />
            <GenderSelector
              label={t("register.sex")}
              value={editForm.sex}
              onChange={(v) => setEditForm((f) => ({ ...f, sex: v }))}
              maleLabel={t("register.male")}
              femaleLabel={t("register.female")}
            />
            <FormInput
              label={t("register.city")}
              value={editForm.city}
              onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
            />
            <FormInput
              label={t("register.centre")}
              value={editForm.centre}
              onChange={(e) => setEditForm((f) => ({ ...f, centre: e.target.value }))}
            />
            <FormInput
              label={t("register.mobileNumber")}
              value={editForm.mobileNumber}
              onChange={(e) => setEditForm((f) => ({ ...f, mobileNumber: e.target.value }))}
            />
          </div>
          <Button type="submit" isLoading={isSaving} className="mt-1">
            {t("common.save")}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={Boolean(deletingMentor)} onClose={() => setDeletingMentor(null)} title={t("mentor.deleteTitle")} size="sm">
        {deletingMentor && (
          <>
            <p className="text-sm text-brown-700">{t("mentor.deleteBody", { name: deletingMentor.name })}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeletingMentor(null)} disabled={isDeleting}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" className="!bg-clay-600 hover:!bg-clay-600/90" isLoading={isDeleting} onClick={handleDelete}>
                {t("mentor.deleteButton")}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
