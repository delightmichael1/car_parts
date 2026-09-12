"use client";

import {
  DataTable,
  EmptyState,
  ErrorState,
  MetricCard,
  StatusBadge,
  LoadingState,
} from "@/components/shared/PageState";
import { useEffect, useState } from "react";
import { toast } from "@heroui/react";
import { formatDate } from "@/lib/format";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import DashboardLayout from "@/layout/DashboardLayout";
import { useApiResource } from "@/hooks/useApiResource";
import { Field, TextInput } from "@/components/shared/FormFields";
import { OperationsPage } from "@/components/shared/OperationsPage";
import { MdLock, MdDevices, MdLogout, MdDelete } from "react-icons/md";
import { AuditLog, AuditLogsResponse, DeviceSummary } from "@/types/types";
import useUserStore from "@/stores/userStore";

export default function SecurityPage() {
  const { secureAxios } = useAxios();
  const [page, setPage] = useState(1);
  const role = useUserStore((state) => state.role);
  const shouldAdmin = ["admin", "super_admin"].some((perm) =>
    role?.permissions?.some((rolePerm) => rolePerm === perm),
  );

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      if (shouldAdmin) {
        const response = await client.get<AuditLogsResponse>("/audit", {
          params: { page, limit: 10 },
        });
        return response.data;
      }
    },
    () => "We couldn't load the audit log right now.",
  );

  useEffect(() => {
    refetch();
  }, [page, refetch]);

  const {
    data: devices,
    isLoading: isLoadingDevices,
    error: devicesError,
    refetch: refetchDevices,
  } = useApiResource(
    async (client) => {
      const response = await client.get<DeviceSummary[]>("/user/devices");
      return response.data;
    },
    () => "We couldn't load your devices right now.",
  );

  const logs = data?.logs ?? [];
  const emergencyCount = logs.filter((log) => log.isEmergency).length;

  const signOutDevice = async (device: DeviceSummary) => {
    try {
      await secureAxios.post("/user/signout-device", null, {
        params: { deviceId: device.deviceId },
      });
      toast.success("Device signed out", {
        description: `${device.deviceName || device.model || "This device"} is now offline.`,
      });
      refetchDevices();
    } catch (error: unknown) {
      toast.danger("Couldn't sign out the device", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  const removeDevice = async (device: DeviceSummary) => {
    try {
      await secureAxios.delete(`/user/device/${device.deviceId}`);
      toast.success("Device removed", {
        description: "This device is no longer trusted on your account.",
      });
      refetchDevices();
    } catch (error: unknown) {
      toast.danger("Couldn't remove the device", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  return (
    <DashboardLayout>
      <OperationsPage
        title="Security & audit"
        description="A clear record of sensitive actions, your trusted devices, and your password."
      >
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <LoadingState label="Loading the audit log…" />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Audit events"
                  value={String(data?.total ?? 0)}
                  note={`${logs.length} shown`}
                />
                <MetricCard
                  label="Break-glass actions"
                  value={String(emergencyCount)}
                  note="In the current view"
                />
                <MetricCard
                  label="Trusted devices"
                  value={String(devices?.length ?? 0)}
                  note="Linked to your account"
                />
                <MetricCard
                  label="Online now"
                  value={String(
                    (devices ?? []).filter((device) => device.online).length,
                  )}
                  note="Across your devices"
                />
              </div>

              <DataTable
                headers={["Actor", "Action", "Resource", "When", "Type"]}
                empty={
                  <EmptyState
                    title="No audit events yet"
                    description="Sensitive actions across the workspace will appear here."
                  />
                }
                itemsPerPage={data?.limit}
                page={page}
                setPage={setPage}
                totalPages={data?.totalPages}
                totalItems={(data?.totalPages ?? 1) * (data?.limit ?? 1)}
                rows={logs.map((log: AuditLog) => [
                  <div key="actor" className="min-w-0">
                    <p className="truncate font-medium text-secondary">
                      {log.actorId && typeof log.actorId !== "string"
                        ? `${log.actorId.first_name ?? ""} ${log.actorId.last_name ?? ""}`.trim() ||
                          log.actorId.email
                        : "System"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-secondary/45">
                      {typeof log.actorId !== "string"
                        ? log.actorId?.email
                        : (log.actorId ?? "")}
                    </p>
                  </div>,
                  <span key="action" className="text-secondary/70 capitalize">
                    {log.action.replaceAll("_", " ").toLowerCase()}
                  </span>,
                  <span key="resource" className="text-secondary/70 capitalize">
                    {log.resourceType ?? "—"}
                  </span>,
                  <span key="date" className="text-secondary/70">
                    {formatDate(log.createdAt)}
                  </span>,
                  <StatusBadge
                    key="type"
                    tone={log.isEmergency ? "rose" : "slate"}
                  >
                    {log.isEmergency ? "Break-glass" : "Standard"}
                  </StatusBadge>,
                ])}
              />
            </div>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <MdDevices className="h-5 w-5 text-secondary/45" />
              <h2 className="text-lg font-semibold text-secondary">
                Your devices
              </h2>
            </div>
            {isLoadingDevices ? (
              <LoadingState label="Loading devices…" />
            ) : devicesError ? (
              <ErrorState message={devicesError} onRetry={refetchDevices} />
            ) : (
              <DataTable
                headers={["Device", "Model", "Platform", "Status", "Actions"]}
                empty={
                  <EmptyState
                    title="No devices linked"
                    description="Devices you sign in from will appear here."
                  />
                }
                rows={(devices ?? []).map((device) => [
                  <span key="name" className="font-medium text-secondary">
                    {device.deviceName || "Device"}
                  </span>,
                  <span key="model" className="text-secondary/70">
                    {device.model || "—"}
                  </span>,
                  <span key="platform" className="text-secondary/70">
                    {[device.platform, device.os].filter(Boolean).join(" · ") ||
                      "—"}
                  </span>,
                  <StatusBadge
                    key="status"
                    tone={device.online ? "emerald" : "slate"}
                  >
                    {device.online ? "Online" : "Offline"}
                  </StatusBadge>,
                  <div key="actions" className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => signOutDevice(device)}
                      className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold text-secondary/60 transition hover:bg-black/10"
                    >
                      <MdLogout className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDevice(device)}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-500/20"
                    >
                      <MdDelete className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>,
                ])}
              />
            )}
          </section>

          <ChangePasswordCard />
        </div>
      </OperationsPage>
    </DashboardLayout>
  );
}

function ChangePasswordCard() {
  const { secureAxios } = useAxios();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!oldPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await secureAxios.post("/user/change-password", {
        oldPassword,
        newPassword,
      });
      toast.success("Password changed", {
        description: "Use your new password next time you sign in.",
      });
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't change the password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-[22px] border border-black/5 bg-card p-4">
      <div className="flex items-center gap-2">
        <MdLock className="h-5 w-5 text-secondary/45" />
        <h2 className="text-lg font-semibold text-secondary">
          Change password
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Current password" required>
          <TextInput
            type="password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            placeholder="Current password"
          />
        </Field>

        <Field label="New password" required hint="At least 6 characters">
          <TextInput
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
          />
        </Field>

        <Field label="Confirm new password" required>
          <TextInput
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Repeat new password"
          />
        </Field>
      </div>

      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={isSubmitting}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        <MdLock />
        {isSubmitting ? "Changing…" : "Change password"}
      </button>
    </section>
  );
}
