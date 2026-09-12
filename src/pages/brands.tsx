"use client";

import { useMemo, useState } from "react";
import {
  MdAdd,
  MdBlock,
  MdCheckCircle,
  MdDelete,
  MdEdit,
  MdFactory,
} from "react-icons/md";
import { Checkbox, Input, toast } from "@heroui/react";
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
import { AppModal } from "@/components/shared/AppModal";
import {
  Field,
  TextAreaInput,
  TextInput,
} from "@/components/shared/FormFields";
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { Brand } from "@/types/types";

export default function BrandsPage() {
  const { secureAxios } = useAxios();
  const [query, setQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const response = await client.get<{ brands: Brand[]; total: number }>(
        "/brands",
      );
      return response.data;
    },
    () => "We couldn't load brands right now.",
  );

  const brands = useMemo(() => data?.brands ?? [], [data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return brands;
    return brands.filter((brand) =>
      [brand.name, brand.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [brands, query]);

  const activeCount = brands.filter((brand) => brand.isActive).length;
  const inactiveCount = brands.length - activeCount;
  const latest = useMemo(
    () =>
      [...brands].sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )[0],
    [brands],
  );

  const openCreate = () => {
    setEditing(null);
    setIsEditorOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setIsEditorOpen(true);
  };

  const toggleActive = async (brand: Brand) => {
    const activating = !brand.isActive;
    try {
      await secureAxios.patch(`/brands/${brand.id}`, {
        isActive: activating,
      });
      toast.success(activating ? "Brand activated" : "Brand deactivated", {
        description: `${brand.name} is now ${
          activating ? "available" : "hidden"
        } across the app.`,
      });
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't update the brand", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  const remove = async (brand: Brand) => {
    try {
      await secureAxios.delete(`/brands/${brand.id}`);
      toast.success("Brand removed", {
        description: `${brand.name} was deleted.`,
      });
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't delete the brand", {
        description: apiErrorMessage(error, "Try again"),
      });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <OperationsPage
        title="Brands"
        description="The manufacturers behind your parts — keep the list tidy for the POS and catalog."
        action={{ label: "Add brand", href: undefined }}
        actionOnClick={openCreate}
      >
        {isLoading ? (
          <LoadingState label="Loading brands…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total brands"
                value={String(data?.total ?? 0)}
                note={`${filtered.length} shown`}
              />
              <MetricCard
                label="Active"
                value={String(activeCount)}
                note="Available in catalog & POS"
              />
              <MetricCard
                label="Inactive"
                value={String(inactiveCount)}
                note="Hidden from pickers"
              />
              <MetricCard
                label="Latest brand"
                value={latest?.name ?? "—"}
                note={latest ? formatDate(latest.createdAt!) : "No brands yet"}
              />
            </div>

            <label className="flex min-h-11 max-w-md items-center gap-3 rounded-2xl bg-black/5 px-4">
              <MdFactory className="h-4 w-4 text-secondary/45" />
              <span className="sr-only">Search brands</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or description"
                aria-label="Search brands"
                variant="secondary"
                className="w-full border-transparent bg-transparent px-0 py-0 text-sm shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
              />
            </label>

            <DataTable
              headers={["Brand", "Description", "Status", "Added", "Actions"]}
              empty={
                <EmptyState
                  title={query ? "No matching brands" : "No brands yet"}
                  description={
                    query
                      ? "Try a different search term."
                      : "Add the manufacturers your parts come from so the POS and catalog can filter by them."
                  }
                />
              }
              rows={filtered.map((brand) => [
                <span key="name" className="font-medium text-secondary">
                  {brand.name}
                </span>,
                <span key="description" className="text-secondary/70">
                  {brand.description || "—"}
                </span>,
                <StatusBadge
                  key="status"
                  tone={brand.isActive ? "emerald" : "slate"}
                >
                  {brand.isActive ? "Active" : "Inactive"}
                </StatusBadge>,
                <span key="added" className="text-secondary/70">
                  {formatDate(brand.createdAt ?? brand.updatedAt ?? "")}
                </span>,
                <div key="actions" className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(brand)}
                    className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold text-secondary/60 transition hover:bg-black/10"
                  >
                    <MdEdit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {brand.isActive ? (
                    <button
                      type="button"
                      onClick={() => toggleActive(brand)}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-500/20"
                    >
                      <MdBlock className="h-3.5 w-3.5" />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleActive(brand)}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-600/20"
                    >
                      <MdCheckCircle className="h-3.5 w-3.5" />
                      Activate
                    </button>
                  )}
                  {pendingDelete === brand.id ? (
                    <button
                      type="button"
                      onClick={() => remove(brand)}
                      className="rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700"
                    >
                      Confirm?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(brand.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-500/20"
                    >
                      <MdDelete className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>,
              ])}
            />
          </div>
        )}
      </OperationsPage>

      {isEditorOpen ? (
        <BrandModal
          brand={editing}
          onClose={() => setIsEditorOpen(false)}
          onSubmit={async (payload) => {
            if (editing) {
              await secureAxios.patch(`/brands/${editing.id}`, payload);
              toast.success("Brand updated", {
                description: `${payload.name} was updated.`,
              });
            } else {
              await secureAxios.post("/brands", payload);
              toast.success("Brand added", {
                description: `${payload.name} is now available across the app.`,
              });
            }
            setIsEditorOpen(false);
            refetch();
          }}
        />
      ) : null}
    </DashboardLayout>
  );
}

function BrandModal({
  brand,
  onClose,
  onSubmit,
}: {
  brand: Brand | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description?: string;
    isActive: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(brand?.name ?? "");
  const [description, setDescription] = useState(brand?.description ?? "");
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("Brand name is required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        isActive,
      });
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't save the brand."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdFactory className="h-5 w-5" />}
      title={brand ? "Edit brand" : "Add a brand"}
      subtitle={
        brand
          ? "Update the manufacturer details."
          : "Brands show up in the product form and the POS filters."
      }
      footer={
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
        >
          <MdAdd />
          {isSubmitting ? "Saving…" : brand ? "Save changes" : "Add brand"}
        </button>
      }
    >
      <Field label="Name" required>
        <TextInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Bosch, Toyota Genuine, Kubota"
        />
      </Field>

      <Field label="Description">
        <TextAreaInput
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional notes about this manufacturer…"
        />
      </Field>

      <Checkbox
        isSelected={isActive}
        onChange={setIsActive}
        variant="secondary"
      >
        <Checkbox.Content className={"text-black"}>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Active (shown in catalog & POS)
        </Checkbox.Content>
      </Checkbox>

      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : null}
    </AppModal>
  );
}
