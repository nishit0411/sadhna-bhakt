import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight, TriangleAlert, Eye } from "lucide-react";
import { listAllUsers } from "../../services/adminUserService";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";

const PAGE_SIZE = 20;

function displayName(user) {
  const p = user.profile;
  if (!p) return user.email;
  const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return name || user.email;
}

function initialsOf(user) {
  const name = displayName(user);
  return name === user.email ? name[0]?.toUpperCase() : name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function VerifiedBadge({ confirmedAt }) {
  const verified = Boolean(confirmedAt);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        verified ? "bg-sage-100 text-sage-600" : "bg-clay-100 text-clay-600"
      }`}
    >
      {verified ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        isAdmin ? "bg-maroon-100 text-maroon-600" : "bg-beige-300 text-brown-700"
      }`}
    >
      {role ?? "devotee"}
    </span>
  );
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [users, setUsers] = useState([]);
  const [orphanedProfiles, setOrphanedProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [profileFilter, setProfileFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    listAllUsers()
      .then(({ users: list, orphanedProfiles: orphans }) => {
        if (!active) return;
        setUsers(list);
        setOrphanedProfiles(orphans ?? []);
        setLoadError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        // This is an admin-only diagnostic tool, not a devotee-facing page —
        // showing the real error (rather than routing it through
        // friendlyErrorMessage's sanitizing) is the right tradeoff here so
        // an admin can actually see *why* the server rejected the request.
        setLoadError(err.message || friendlyErrorMessage(err, t, "errors.loadFailed"));
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesName = displayName(u).toLowerCase().includes(q);
        if (!matchesEmail && !matchesName) return false;
      }
      if (roleFilter !== "all" && (u.profile?.role ?? "devotee") !== roleFilter) return false;
      if (verifiedFilter === "verified" && !u.emailConfirmedAt) return false;
      if (verifiedFilter === "unverified" && u.emailConfirmedAt) return false;
      if (profileFilter === "exists" && !u.profile) return false;
      if (profileFilter === "missing" && u.profile) return false;
      return true;
    });
  }, [users, search, roleFilter, verifiedFilter, profileFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  if (isLoading) return <LoadingState fullHeight label="Loading users…" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="User Management" subtitle="Every registered Supabase Auth account, merged with its profile." />

      {loadError && (
        <Card className="border-2 border-clay-400 bg-clay-100/40">
          <p className="text-sm font-medium text-clay-600">{loadError}</p>
        </Card>
      )}

      {orphanedProfiles.length > 0 && (
        <Card className="flex items-start gap-3 border-2 border-dashed border-saffron-300 bg-saffron-50">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-saffron-600" />
          <div>
            <p className="font-display text-base font-semibold text-maroon-600">
              {orphanedProfiles.length} orphaned profile{orphanedProfiles.length > 1 ? "s" : ""} found
            </p>
            <p className="mt-1 text-sm text-brown-600">
              These have a row in <code>profiles</code> but no matching Supabase Auth account — the reverse
              inconsistency. Nothing was deleted automatically.
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {orphanedProfiles.map((p) => (
                <li key={p.id} className="rounded-full bg-beige-100 px-3 py-1 text-xs font-medium text-brown-700">
                  {p.name || p.email}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => updateFilter(setSearch)(e.target.value)}
          />
        </div>
        <div className="min-w-[160px]">
          <Select label="Role" value={roleFilter} onChange={(e) => updateFilter(setRoleFilter)(e.target.value)}>
            <option value="all">All Users</option>
            <option value="admin">Admins</option>
            <option value="devotee">Devotees</option>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <Select label="Email status" value={verifiedFilter} onChange={(e) => updateFilter(setVerifiedFilter)(e.target.value)}>
            <option value="all">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Select label="Profile" value={profileFilter} onChange={(e) => updateFilter(setProfileFilter)(e.target.value)}>
            <option value="all">All</option>
            <option value="exists">Profile Exists</option>
            <option value="missing">Profile Missing</option>
          </Select>
        </div>
      </Card>

      {!filtered.length ? (
        <EmptyState icon={Search} title="No users match these filters" description="Try a different search or filter." />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Email Verified</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => (
                  <tr
                    key={u.id}
                    className="cursor-pointer border-b border-brown-900/5 bg-cream-50 transition-colors last:border-0 hover:bg-beige-100"
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maroon-100 text-xs font-semibold text-maroon-600">
                          {initialsOf(u)}
                        </span>
                        <span className="font-medium text-brown-900">{displayName(u)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brown-700">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.profile?.role} />
                    </td>
                    <td className="px-4 py-3">
                      <VerifiedBadge confirmedAt={u.emailConfirmedAt} />
                    </td>
                    <td className="px-4 py-3 text-brown-700">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-brown-700">{u.lastSignInAt ? formatDate(u.lastSignInAt) : "Never logged in"}</td>
                    <td className="px-4 py-3">
                      {u.profile ? (
                        <span className="text-xs font-medium text-sage-600">✅ Exists</span>
                      ) : (
                        <span className="text-xs font-medium text-clay-600">⚠ Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/users/${u.id}`);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-brown-900/5 px-4 py-3">
              <p className="text-xs text-brown-500">
                Page {currentPage} of {totalPages} · {filtered.length} user{filtered.length === 1 ? "" : "s"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronRight}
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
