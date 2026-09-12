"use client";

import { useState } from "react";
import { MdCheck, MdEdit } from "react-icons/md";
import { toast } from "@heroui/react";
import DashboardLayout from "@/layout/DashboardLayout";
import { OperationsPage } from "@/components/shared/OperationsPage";
import { ErrorState, LoadingState } from "@/components/shared/PageState";
import { TextInput } from "@/components/shared/FormFields";
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import { SettingsItem, SettingsResponse } from "@/types/types";

const SETTING_LABELS: Record<string, string> = {
  COMPANY_NAME: "Company name",
  COMPANY_ADDRESS: "Company address",
  COMPANY_PHONE: "Company phone",
  COMPANY_EMAIL: "Company email",
  CURRENCY: "Currency",
  TAX_RATE: "Tax rate",
  INVOICE_PREFIX: "Invoice prefix",
  QUOTATION_PREFIX: "Quotation prefix",
};

const SETTING_HINTS: Record<string, string> = {
  TAX_RATE: "Non-negative decimal, e.g. 0.15 for 15%",
  CURRENCY: "e.g. USD, ZWL",
};

export default function SettingsPage() {
  const { secureAxios } = useAxios();

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const response = await client.get<SettingsResponse>("/settings");
      return response.data.settings;
    },
    () => "We couldn't load your settings right now.",
  );

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const settings = data ?? [];

  const save = async (setting: SettingsItem) => {
    const value = drafts[setting.key] ?? setting.value;
    if (setting.key === "TAX_RATE" && Number.isNaN(Number.parseFloat(value))) {
      toast.danger("Invalid tax rate", {
        description: "Enter a number like 0.15",
      });
      return;
    }
    setSaving((current) => ({ ...current, [setting.key]: true }));
    try {
      await secureAxios.put(`/settings/${setting.key}`, { value });
      toast.success("Setting updated", {
        description: `${SETTING_LABELS[setting.key] ?? setting.key} saved.`,
      });
      setDrafts((current) => ({ ...current, [setting.key]: value }));
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't save the setting", {
        description: apiErrorMessage(error, "Try again"),
      });
    } finally {
      setSaving((current) => ({ ...current, [setting.key]: false }));
    }
  };

  return (
    <DashboardLayout>
      <OperationsPage
        title="Settings"
        description="Company details and business rules used across invoices and quotations."
      >
        {isLoading ? (
          <LoadingState label="Loading settings…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : settings.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-black/10 bg-white/70 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-secondary">
              No settings found
            </p>
            <p className="mt-1 text-xs text-secondary/55">
              Settings managed by the backend will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {settings.map((setting) => {
              const currentValue = drafts[setting.key] ?? setting.value;
              const isDirty = currentValue !== setting.value;
              return (
                <div
                  key={setting.key}
                  className="flex flex-col gap-3 rounded-[20px] border border-black/5 bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-secondary">
                        {SETTING_LABELS[setting.key] ?? setting.key}
                      </p>
                      <p className="mt-0.5 text-[11px] text-secondary/45">
                        {setting.key}
                      </p>
                    </div>
                    <MdEdit className="mt-1 h-4 w-4 text-secondary/40" />
                  </div>

                  <TextInput
                    value={currentValue}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [setting.key]: event.target.value,
                      }))
                    }
                  />

                  {SETTING_HINTS[setting.key] ? (
                    <p className="text-[11px] text-secondary/45">
                      {SETTING_HINTS[setting.key]}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => save(setting)}
                    disabled={!isDirty || saving[setting.key]}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-secondary text-xs font-semibold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving[setting.key] ? (
                      "Saving…"
                    ) : (
                      <>
                        <MdCheck className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </OperationsPage>
    </DashboardLayout>
  );
}