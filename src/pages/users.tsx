"use client";

import { ReactNode, useMemo, useState } from "react";
import {
  MdAdd,
  MdGroup,
  MdLockReset,
  MdEdit,
  MdBlock,
  MdCheckCircle,
} from "react-icons/md";
import { Input, toast } from "@heroui/react";
import DashboardLayout from "@/layout/DashboardLayout";
import { OperationsPage } from "@/components/shared/OperationsPage";
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  StatusBadge,
} from "@/components/shared/PageState";
import { Field, SelectInput, TextInput } from "@/components/shared/FormFields";
import { AppModal } from "@/components/shared/AppModal";
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { Role, RolesResponse, User, UsersResponse } from "@/types/types";

export default function UsersPage() {
  const { secureAxios } = useAxios();
  const [query, setQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const [users, roles] = await Promise.all([
        client.get<UsersResponse>("/user/users", {
          params: { page: 1, limit: 100 },
        }),
        client.get<RolesResponse>("/user/roles"),
      ]);
      return { users: users.data.users ?? [], roles: roles.data.roles ?? [] };
    },
    () => "We couldn't load your team right now.",
  );

  const users = useMemo(() => data?.users ?? [], [data]);
  const roles = useMemo(() => data?.roles ?? [], [data]);

  const roleById = useMemo(() => {
    const map = new Map<string, Role>();
    for (const role of roles) map.set(role.id, role);
    return map;
  }, [roles]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.first_name, user.last_name, user.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [users, query]);

  const onlineCount = users.filter((user) => user.online).length;
  const activeCount = users.filter((user) => user.status !== "suspended").length;

  const changeRole = async (user: User, roleId: string) => {
    if (roleId === user.role_id) return;
    try {
      await secureAxios.post("/user/roles", { id: user.id, roleId });
      toast.success("Role updated", {
        description: `${user.first_name} ${user.last_name} is now ${
          roleById.get(roleId)?.name ?? roleId
        }.`,
      });
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't change the role", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  const toggleStatus = async (user: User) => {
    const next = user.status === "suspended" ? "active" : "suspended";
    try {
      await secureAxios.patch(`/user/status/${user.id}`, { status: next });
      toast.success(next === "suspended" ? "Account suspended" : "Account active", {
        description:
          next === "suspended"
            ? `${user.first_name} ${user.last_name} can no longer sign in.`
            : `${user.first_name} ${user.last_name} can sign in again.`,
      });
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't update the account", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  return (
    <DashboardLayout>
      <OperationsPage
        title="Users"
        description="Manage who works in the workspace and what they can do."
        action={{ label: "Add user", href: undefined }}
        actionOnClick={() => {
          setEditing(null);
          setIsEditorOpen(true);
        }}
      >
        {isLoading ? (
          <LoadingState label="Loading your team…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Team members"
                value={String(users.length)}
                note={`${roles.length} roles available`}
              />
              <MetricCard
                label="Online now"
                value={String(onlineCount)}
                note="Across all devices"
              />
              <MetricCard
                label="Active accounts"
                value={String(activeCount)}
                note="Not suspended"
              />
              <MetricCard
                label="Suspended"
                value={String(users.length - activeCount)}
                note="Blocked from signing in"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex min-h-11 max-w-md items-center gap-3 rounded-2xl bg-black/5 px-4">
                <MdGroup className="h-4 w-4 text-secondary/45" />
                <span className="sr-only">Search users</span>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or email"
                  aria-label="Search users"
                  variant="secondary"
                  className="w-full border-transparent bg-transparent px-0 py-0 text-sm shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
                />
              </label>

              <DataTable
                headers={["User", "Role", "Status", "Online", "Joined", "Actions"]}
                empty={
                  <EmptyState
                    title={query ? "No matching users" : "No users yet"}
                    description={
                      query
                        ? "Try a different search term."
                        : "Add your first team member to start collaborating."
                    }
                  />
                }
                rows={filtered.map((user) => [
                  <div key="user" className="min-w-0">
                    <p className="truncate font-medium text-secondary">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-secondary/45">
                      {user.email}
                    </p>
                  </div>,
                  <SelectInput
                    key="role"
                    value={user.role_id}
                    onChange={(event) => changeRole(user, event.target.value)}
                    className="gap-0"
                    triggerClassName="min-h-9! rounded-xl! border! border-black/10! bg-white! px-3! text-xs!"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </SelectInput>,
                  <StatusBadge
                    key="status"
                    tone={user.status === "suspended" ? "rose" : "emerald"}
                  >
                    {user.status}
                  </StatusBadge>,
                  <span key="online" className="text-secondary/70">
                    {user.online ? "Online" : "Offline"}
                  </span>,
                  <span key="joined" className="text-secondary/70">
                    {formatDate(user.created_at)}
                  </span>,
                  <div key="actions" className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(user);
                        setIsEditorOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold text-secondary/60 transition hover:bg-black/10"
                    >
                      <MdEdit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetting(user)}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-600/20"
                    >
                      <MdLockReset className="h-3.5 w-3.5" />
                      Reset password
                    </button>
                    {user.status === "suspended" ? (
                      <button
                        type="button"
                        onClick={() => toggleStatus(user)}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-600/20"
                      >
                        <MdCheckCircle className="h-3.5 w-3.5" />
                        Activate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleStatus(user)}
                        className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-500/20"
                      >
                        <MdBlock className="h-3.5 w-3.5" />
                        Suspend
                      </button>
                    )}
                  </div>,
                ])}
              />
            </div>
          </div>
        )}
      </OperationsPage>

      {isEditorOpen ? (
        <UserModal
          user={editing}
          roles={roles}
          onClose={() => setIsEditorOpen(false)}
          onSubmit={async (payload) => {
            if (editing) {
              await secureAxios.patch(`/user/admin-update/${editing.id}`, {
                first_name: payload.first_name,
                last_name: payload.last_name,
                email: payload.email,
                phone: payload.phone,
                countryCode: payload.countryCode,
              });
              toast.success("User updated", {
                description: `${payload.first_name} ${payload.last_name} was updated.`,
              });
            } else {
              await secureAxios.post("/user/signup", {
                first_name: payload.first_name,
                last_name: payload.last_name,
                email: payload.email,
                phone: payload.phone,
                countryCode: payload.countryCode,
                role_id: payload.roleId,
                password: payload.password,
              });
              toast.success("Account created", {
                description: `${payload.email} will receive their password by email.`,
              });
            }
            setIsEditorOpen(false);
            refetch();
          }}
        />
      ) : null}

      {resetting ? (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSubmit={async (newPassword) => {
            await secureAxios.patch(`/user/admin-reset-password/${resetting.id}`, {
              newPassword,
            });
            toast.success("Password reset", {
              description: `${resetting.email} will receive the new password by email.`,
            });
            setResetting(null);
            refetch();
          }}
        />
      ) : null}
    </DashboardLayout>
  );
}

type UserPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  countryCode: string;
  roleId: string;
  password: string;
};

function UserModal({
  user,
  roles,
  onClose,
  onSubmit,
}: {
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSubmit: (payload: UserPayload) => Promise<void>;
}) {
  const [first_name, setFirstName] = useState(user?.first_name ?? "");
  const [last_name, setLastName] = useState(user?.last_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [countryCode, setCountryCode] = useState(user?.countryCode ?? "");
  const [roleId, setRoleId] = useState(
    user?.role_id && roles.some((role) => role.id === user.role_id)
      ? user.role_id
      : roles[0]?.id ?? "",
  );
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!first_name.trim() || !last_name.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!roleId) {
      setError("Choose a role.");
      return;
    }
    if (!user && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        countryCode: countryCode.trim(),
        roleId,
        password,
      });
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't save the user."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserModalShell
      title={user ? "Edit user" : "Add a user"}
      subtitle={
        user
          ? "Update this team member's details."
          : "A password will be emailed to them automatically."
      }
      onClose={onClose}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" required>
          <TextInput
            value={first_name}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="e.g. Tendai"
          />
        </Field>

        <Field label="Last name" required>
          <TextInput
            value={last_name}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="e.g. Moyo"
          />
        </Field>

        <Field label="Email" required className="sm:col-span-2">
          <TextInput
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="rep@business.co.zw"
          />
        </Field>

        <Field label="Phone">
          <TextInput
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+263 77 000 0000"
          />
        </Field>

        <Field label="Country code">
          <TextInput
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            placeholder="+263"
          />
        </Field>

        <Field label="Role" required>
          <SelectInput
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
          >
            <option value="">Select a role…</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        {user ? null : (
          <Field label="Temporary password" required hint="At least 6 characters">
            <TextInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Set an initial password"
            />
          </Field>
        )}
      </div>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={isSubmitting}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
      >
        <MdAdd />
        {isSubmitting
          ? "Saving…"
          : user
            ? "Save changes"
            : "Create account"}
      </button>
    </UserModalShell>
  );
}

function ResetPasswordModal({
  user,
  onClose,
  onSubmit,
}: {
  user: User;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(password);
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't reset the password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserModalShell
      title="Reset password"
      subtitle={`Set a new password for ${user.email}. It will be emailed to them.`}
      onClose={onClose}
    >
      <Field label="New password" required hint="At least 6 characters">
        <TextInput
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="New password"
        />
      </Field>

      <Field label="Confirm password" required>
        <TextInput
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Repeat the new password"
        />
      </Field>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={isSubmitting}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
      >
        <MdLockReset />
        {isSubmitting ? "Resetting…" : "Reset password"}
      </button>
    </UserModalShell>
  );
}

function UserModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdGroup className="h-5 w-5" />}
      title={title}
      subtitle={subtitle}
    >
      {children}
    </AppModal>
  );
}