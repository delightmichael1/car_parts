"use client";

import { useMemo, useState } from "react";
import {
  MdAdd,
  MdBlock,
  MdCategory,
  MdCheckCircle,
  MdDelete,
  MdEdit,
  MdCreateNewFolder,
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
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/shared/FormFields";
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { Category } from "@/types/types";

const NO_PARENT = "__none__";

type CategoryPayload = {
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
};

export default function CategoriesPage() {
  const { secureAxios } = useAxios();
  const [query, setQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [presetParent, setPresetParent] = useState<string | undefined>(
    undefined,
  );
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const response = await client.get<{
        categories: Category[];
        total: number;
      }>("/categories");
      return response.data;
    },
    () => "We couldn't load categories right now.",
  );

  const categories = useMemo(() => data?.categories ?? [], [data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((category) =>
      [category.name, category.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [categories, query]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const category of categories) map.set(category.id, category);
    return map;
  }, [categories]);

  const activeCount = categories.filter((category) => category.isActive).length;
  const rootCount = categories.filter((category) => !category.parentId).length;

  const openCreate = () => {
    setEditing(null);
    setPresetParent(undefined);
    setIsEditorOpen(true);
  };

  const openChild = (parent: Category) => {
    setEditing(null);
    setPresetParent(parent.id);
    setIsEditorOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setPresetParent(undefined);
    setIsEditorOpen(true);
  };

  const toggleActive = async (category: Category) => {
    const activating = !category.isActive;
    try {
      await secureAxios.patch(`/categories/${category.id}`, {
        isActive: activating,
      });
      toast.success(
        activating ? "Category activated" : "Category deactivated",
        {
          description: `${category.name} is now ${
            activating ? "available" : "hidden"
          } across the app.`,
        },
      );
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't update the category", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  const remove = async (category: Category) => {
    try {
      await secureAxios.delete(`/categories/${category.id}`);
      toast.success("Category removed", {
        description: `${category.name} was deleted.`,
      });
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't delete the category", {
        description: apiErrorMessage(error, "Try again"),
      });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <OperationsPage
        title="Categories"
        description="Organise your catalog into a hierarchy the POS and product form can browse."
        action={{ label: "Add category", href: undefined }}
        actionOnClick={openCreate}
      >
        {isLoading ? (
          <LoadingState label="Loading categories…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total categories"
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
                value={String(categories.length - activeCount)}
                note="Hidden from pickers"
              />
              <MetricCard
                label="Top-level"
                value={String(rootCount)}
                note="No parent category"
              />
            </div>

            <label className="flex min-h-11 max-w-md items-center gap-3 rounded-2xl bg-black/5 px-4">
              <MdCategory className="h-4 w-4 text-secondary/45" />
              <span className="sr-only">Search categories</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or description"
                aria-label="Search categories"
                variant="secondary"
                className="w-full border-transparent bg-transparent px-0 py-0 text-sm shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
              />
            </label>

            <DataTable
              headers={["Category", "Parent", "Status", "Added", "Actions"]}
              empty={
                <EmptyState
                  title={query ? "No matching categories" : "No categories yet"}
                  description={
                    query
                      ? "Try a different search term."
                      : "Add your first category to structure the product catalog."
                  }
                />
              }
              rows={filtered.map((category) => [
                <div key="name" className="min-w-0">
                  <p className="truncate font-medium text-secondary">
                    {category.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-secondary/45">
                    {category.description || "—"}
                  </p>
                </div>,
                <span key="parent" className="text-secondary/70">
                  {category.parentId
                    ? (categoryById.get(category.parentId)?.name ?? "—")
                    : "—"}
                </span>,
                <StatusBadge
                  key="status"
                  tone={category.isActive ? "emerald" : "slate"}
                >
                  {category.isActive ? "Active" : "Inactive"}
                </StatusBadge>,
                <span key="added" className="text-secondary/70">
                  {formatDate(category.createdAt ?? category.updatedAt ?? "")}
                </span>,
                <div key="actions" className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(category)}
                    className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold text-secondary/60 transition hover:bg-black/10"
                  >
                    <MdEdit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openChild(category)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-secondary transition hover:brightness-95"
                  >
                    <MdCreateNewFolder className="h-3.5 w-3.5" />
                    Sub
                  </button>
                  {category.isActive ? (
                    <button
                      type="button"
                      onClick={() => toggleActive(category)}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-500/20"
                    >
                      <MdBlock className="h-3.5 w-3.5" />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleActive(category)}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-600/20"
                    >
                      <MdCheckCircle className="h-3.5 w-3.5" />
                      Activate
                    </button>
                  )}
                  {pendingDelete === category.id ? (
                    <button
                      type="button"
                      onClick={() => remove(category)}
                      className="rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700"
                    >
                      Confirm?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(category.id)}
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
        <CategoryModal
          category={editing}
          categories={categories}
          presetParent={presetParent}
          onClose={() => setIsEditorOpen(false)}
          onSubmit={async (payload) => {
            if (editing) {
              await secureAxios.patch(`/categories/${editing.id}`, {
                ...payload,
                parentId: payload.parentId || undefined,
              });
              toast.success("Category updated", {
                description: `${payload.name} was updated.`,
              });
            } else {
              await secureAxios.post("/categories", {
                ...payload,
                parentId: payload.parentId || undefined,
              });
              toast.success("Category added", {
                description: `${payload.name} is now part of the catalog.`,
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

function CategoryModal({
  category,
  categories,
  presetParent,
  onClose,
  onSubmit,
}: {
  category: Category | null;
  categories: Category[];
  presetParent?: string;
  onClose: () => void;
  onSubmit: (payload: CategoryPayload) => Promise<void>;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [parentId, setParentId] = useState<string>(
    (category?.parentId ?? presetParent) || NO_PARENT,
  );
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = useMemo(() => {
    const excluded = new Set<string>();
    if (category) {
      excluded.add(category.id);
      collectDescendants(categories, category.id, excluded);
    }
    return flattenCategories(categories).filter(
      (node) => !excluded.has(node.id),
    );
  }, [categories, category]);

  const submit = async () => {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        parentId: parentId === NO_PARENT ? undefined : parentId,
        isActive,
      });
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't save the category."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdCategory className="h-5 w-5" />}
      title={category ? "Edit category" : "Add a category"}
      subtitle={
        category
          ? "Update the name, nesting, or availability."
          : "Top-level groups hold the product catalog; add children for finer fitment."
      }
      footer={
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
        >
          <MdAdd />
          {isSubmitting
            ? "Saving…"
            : category
              ? "Save changes"
              : "Add category"}
        </button>
      }
    >
      <Field label="Name" required>
        <TextInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Brake Parts"
        />
      </Field>

      <Field
        label="Parent category"
        hint={
          category
            ? "Your own subcategories are excluded to avoid cycles."
            : "Leave as No parent for a top-level group."
        }
        className="text-black!"
      >
        <SelectInput
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          className="text-black!"
        >
          <option value={NO_PARENT} className="text-black!">
            No parent
          </option>
          {parentOptions.map((node) => (
            <option key={node.id} value={node.id} className="text-black!">
              {"\u00A0\u00A0".repeat(node.depth)}
              {node.name}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="Description">
        <TextAreaInput
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional notes about this group…"
          className="text-black resize-none"
        />
      </Field>

      <Checkbox
        isSelected={isActive}
        onChange={setIsActive}
        variant="secondary"
      >
        <Checkbox.Content className="text-black">
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

function flattenCategories(
  categories: Category[],
  parentId: string | null = null,
  depth = 0,
): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  const nodes = categories
    .filter((category) => (category.parentId ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenCategories(categories, node.id, depth + 1));
  }
  return result;
}

function collectDescendants(
  categories: Category[],
  id: string,
  acc: Set<string>,
): void {
  for (const category of categories) {
    if (category.parentId === id && !acc.has(category.id)) {
      acc.add(category.id);
      collectDescendants(categories, category.id, acc);
    }
  }
}
