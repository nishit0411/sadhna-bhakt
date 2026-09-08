import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Users, ShieldCheck, ShieldOff } from "lucide-react";
import { getAllMentors, createMentor, updateMentorDetails } from "../../services/mentorService";
import * as devoteeService from "../../services/devoteeService";
import { deleteUserAccount } from "../../services/adminUserService";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";

const ADD_MENTOR_INITIAL = { firstName: "", lastName: "", email: "", password: "", mobileNumber: "" };

function AddMentorModal({ isOpen, onClose, onCreated, addToast }) {
  const [form, setForm] = useState(ADD_MENTOR_INITIAL);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  }

  function handleClose() {
    setForm(ADD_MENTOR_INITIAL);
    setErrors({});
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.firstName.trim()) next.firstName = "Please enter the mentor's name.";
    if (!form.email.trim()) next.email = "Please enter an email address.";
    if (!form.password || form.password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setIsSubmitting(true);
    try {
      await createMentor(form);
      addToast("Mentor account created successfully.");
      handleClose();
      onCreated();
    } catch (err) {
      setErrors({ email: err.message || "Failed to create mentor account." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Mentor">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First Name" name="firstName" required value={form.firstName} onChange={handleChange} error={errors.firstName} />
          <Input label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} />
        </div>
        <Input label="Email" name="email" type="email" required value={form.email} onChange={handleChange} error={errors.email} />
        <Input
          label="Password"
          name="password"
          type="password"
          required
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          helperText="At least 6 characters. Share this with the mentor securely."
        />
        <Input label="Mobile Number (optional)" name="mobileNumber" value={form.mobileNumber} onChange={handleChange} />
        <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2 w-full">
          Create Mentor Account
        </Button>
      </form>
    </Modal>
  );
}

function EditMentorModal({ mentor, onClose, onSaved, addToast }) {
  const [form, setForm] = useState(() => ({
    firstName: mentor?.firstName ?? "",
    lastName: mentor?.lastName ?? "",
    mobileNumber: mentor?.phone ?? "",
  }));
  const [isSaving, setIsSaving] = useState(false);

  if (!mentor) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateMentorDetails(mentor.id, { ...form, active: mentor.active });
      addToast("Mentor updated successfully.");
      onSaved();
    } catch (err) {
      addToast(err.message || "Failed to update mentor.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={Boolean(mentor)} onClose={onClose} title="Edit Mentor">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First Name" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
          <Input label="Last Name" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
        </div>
        <Input label="Email" value={mentor.email} disabled helperText="Email can't be changed here." />
        <Input label="Mobile Number" value={form.mobileNumber} onChange={(e) => setForm((p) => ({ ...p, mobileNumber: e.target.value }))} />
        <Button type="submit" size="lg" isLoading={isSaving} className="mt-2 w-full">
          Save Changes
        </Button>
      </form>
    </Modal>
  );
}

export default function MentorManagement() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();

  const [mentors, setMentors] = useState([]);
  const [devotees, setDevotees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMentor, setEditingMentor] = useState(null);
  const [menteesModalMentor, setMenteesModalMentor] = useState(null);
  const [deletingMentor, setDeletingMentor] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function load() {
    setIsLoading(true);
    Promise.all([getAllMentors(), devoteeService.getDevoteeDirectory()])
      .then(([mentorList, devoteeList]) => {
        setMentors(mentorList);
        setDevotees(devoteeList);
        setIsLoading(false);
      })
      .catch((err) => {
        addToast(friendlyErrorMessage(err, t, "errors.loadFailed"), "error");
        setIsLoading(false);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const menteesByMentor = useMemo(() => {
    const map = new Map();
    devotees.forEach((d) => {
      if (!d.mentorId) return;
      if (!map.has(d.mentorId)) map.set(d.mentorId, []);
      map.get(d.mentorId).push(d);
    });
    return map;
  }, [devotees]);

  async function handleToggleActive(mentor) {
    try {
      await updateMentorDetails(mentor.id, {
        firstName: mentor.firstName,
        lastName: mentor.lastName,
        mobileNumber: mentor.phone,
        active: !mentor.active,
      });
      addToast(mentor.active ? "Mentor deactivated." : "Mentor activated.");
      load();
    } catch (err) {
      addToast(err.message || "Failed to update mentor.", "error");
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteUserAccount(deletingMentor.id);
      addToast("Mentor deleted successfully. Their mentees are now unassigned.");
      setDeletingMentor(null);
      load();
    } catch (err) {
      addToast(err.message || "Failed to delete mentor.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <LoadingState fullHeight label="Loading mentors…" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mentor Management"
        subtitle="Create and manage mentor accounts; see how many devotees each one guides."
        action={
          <Button icon={Plus} onClick={() => setIsAddOpen(true)}>
            Add Mentor
          </Button>
        }
      />

      {!mentors.length ? (
        <EmptyState icon={Users} title="No mentors yet" description="Add your first mentor to get started." />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
                  <th className="px-4 py-3">Mentor</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Mentees</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mentors.map((m) => (
                  <tr key={m.id} className="border-b border-brown-900/5 bg-cream-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-brown-900">{m.name}</td>
                    <td className="px-4 py-3 text-brown-700">{m.email}</td>
                    <td className="px-4 py-3 text-brown-700">{m.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        className="font-medium text-maroon-600 hover:underline"
                        onClick={() => setMenteesModalMentor(m)}
                      >
                        {(menteesByMentor.get(m.id) ?? []).length} devotee{(menteesByMentor.get(m.id) ?? []).length === 1 ? "" : "s"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          m.active ? "bg-sage-100 text-sage-600" : "bg-clay-100 text-clay-600"
                        }`}
                      >
                        {m.active ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                        {m.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditingMentor(m)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(m)}>
                          {m.active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          className="!text-clay-600 hover:!bg-clay-100"
                          onClick={() => setDeletingMentor(m)}
                        >
                          Delete
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

      <AddMentorModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onCreated={load} addToast={addToast} />
      <EditMentorModal mentor={editingMentor} onClose={() => setEditingMentor(null)} onSaved={() => { setEditingMentor(null); load(); }} addToast={addToast} />

      <Modal
        isOpen={Boolean(menteesModalMentor)}
        onClose={() => setMenteesModalMentor(null)}
        title={menteesModalMentor ? `${menteesModalMentor.name}'s Devotees` : ""}
      >
        {menteesModalMentor && (menteesByMentor.get(menteesModalMentor.id) ?? []).length === 0 ? (
          <p className="text-sm text-brown-500">No devotees assigned to this mentor yet.</p>
        ) : (
          <ul className="flex max-h-96 flex-col divide-y divide-brown-900/5 overflow-y-auto">
            {(menteesByMentor.get(menteesModalMentor?.id) ?? []).map((d) => (
              <li key={d.id}>
                <button
                  className="flex w-full items-center justify-between gap-3 py-3 text-left hover:text-maroon-600"
                  onClick={() => navigate(`/admin/users/${d.id}`)}
                >
                  <span>
                    <span className="block text-sm font-medium text-brown-900">{d.name}</span>
                    <span className="block text-xs text-brown-500">{d.email}</span>
                  </span>
                  <span className="text-xs text-brown-400">{d.city}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal isOpen={Boolean(deletingMentor)} onClose={() => setDeletingMentor(null)} title="Delete this mentor?" size="sm">
        <p className="text-sm text-brown-700">
          This will permanently delete <span className="font-medium text-brown-900">{deletingMentor?.email}</span>'s Auth
          account. Their {(menteesByMentor.get(deletingMentor?.id) ?? []).length} assigned devotee(s) will become
          unassigned, not deleted. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeletingMentor(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="primary" className="!bg-clay-600 hover:!bg-clay-600/90" isLoading={isDeleting} onClick={handleDelete}>
            Delete Mentor
          </Button>
        </div>
      </Modal>
    </div>
  );
}
