"use client";

import { ReactNode, useMemo, useState } from "react";
import { MdAdd, MdDelete, MdDirectionsCar, MdEdit, MdLink } from "react-icons/md";
import { Input, toast } from "@heroui/react";
import DashboardLayout from "@/layout/DashboardLayout";
import { OperationsPage } from "@/components/shared/OperationsPage";
import { DataTable, EmptyState, ErrorState, LoadingState, MetricCard, StatusBadge } from "@/components/shared/PageState";
import { Field, SelectInput, TextAreaInput, TextInput } from "@/components/shared/FormFields";
import { AsyncProductSelect } from "@/components/shared/AsyncProductSelect";
import { AppModal } from "@/components/shared/AppModal";
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import {
  PartCompatibility,
  Product,
  ProductsResponse,
  Vehicle,
  VehicleType,
} from "@/types/types";

const VEHICLE_TYPES: VehicleType[] = ["CAR", "TRUCK", "TRACTOR", "EQUIPMENT"];

const TYPE_LABELS: Record<VehicleType, string> = {
  CAR: "Car",
  TRUCK: "Truck",
  TRACTOR: "Tractor",
  EQUIPMENT: "Equipment",
};

export default function VehiclesPage() {
  const { secureAxios } = useAxios();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<VehicleType | "ALL">("ALL");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [fitmentsFor, setFitmentsFor] = useState<Vehicle | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const [vehicles, products, counts] = await Promise.all([
        client.get<{ vehicles: Vehicle[]; total: number }>("/vehicles"),
        client.get<ProductsResponse>("/products", {
          params: { page: 1, limit: 100 },
        }),
        client.get<{ counts: { vehicleId: string; count: number }[] }>(
          "/compatibilities/counts",
        ),
      ]);
      return {
        vehicles: vehicles.data.vehicles,
        total: vehicles.data.total,
        products: products.data.products,
        counts: counts.data.counts,
      };
    },
    () => "We couldn't load your vehicle fleet right now.",
  );

  const vehicles = useMemo(() => data?.vehicles ?? [], [data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (typeFilter !== "ALL" && vehicle.vehicleType !== typeFilter) {
        return false;
      }
      if (!term) return true;
      return [vehicle.make, vehicle.model, vehicle.engine, vehicle.variant]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [vehicles, query, typeFilter]);

  const fitmentCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of data?.counts ?? []) {
      counts.set(item.vehicleId, item.count);
    }
    return counts;
  }, [data]);

  const fitmentTotal = useMemo(
    () =>
      (data?.counts ?? []).reduce((sum, item) => sum + item.count, 0),
    [data],
  );

  const openCreate = () => {
    setEditing(null);
    setIsEditorOpen(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditing(vehicle);
    setIsEditorOpen(true);
  };

  const remove = async (vehicle: Vehicle) => {
    try {
      await secureAxios.delete(`/vehicles/${vehicle.id}`);
      toast.success("Vehicle removed", {
        description: `${vehicle.make} ${vehicle.model} was deleted.`,
      });
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't delete the vehicle", {
        description: apiErrorMessage(error, "Try again"),
      });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <OperationsPage
        title="Vehicles"
        description="The models you fit parts to — and the parts that fit them."
        action={{ label: "Add vehicle", href: undefined }}
        actionOnClick={openCreate}
      >
        {isLoading ? (
          <LoadingState label="Loading vehicles…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Vehicles"
                value={String(data?.total ?? 0)}
                note={`${filtered.length} shown`}
              />
              <MetricCard
                label="Cars"
                value={String(
                  vehicles.filter((vehicle) => vehicle.vehicleType === "CAR")
                    .length,
                )}
                note="Car fitments"
              />
              <MetricCard
                label="Trucks & tractors"
                value={String(
                  vehicles.filter((vehicle) =>
                    ["TRUCK", "TRACTOR", "EQUIPMENT"].includes(
                      vehicle.vehicleType,
                    ),
                  ).length,
                )}
                note="Agri & fleet"
              />
              <MetricCard
                label="Total fitments"
                value={String(fitmentTotal)}
                note="Part–vehicle links"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="flex min-h-11 max-w-md flex-1 items-center gap-3 rounded-2xl bg-black/5 px-4">
                  <MdDirectionsCar className="h-4 w-4 text-secondary/45" />
                  <span className="sr-only">Search vehicles</span>
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by make, model, or engine"
                    aria-label="Search vehicles"
                    variant="secondary"
                    className="w-full border-transparent bg-transparent px-0 py-0 text-sm shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
                  />
                </label>

                <div className="flex gap-1 overflow-x-auto rounded-full bg-black/5 p-1">
                  {(["ALL", ...VEHICLE_TYPES] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTypeFilter(key)}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition ${
                        typeFilter === key
                          ? "bg-secondary text-white shadow-sm"
                          : "text-secondary/55 hover:text-secondary"
                      }`}
                    >
                      {key === "ALL"
                        ? "All"
                        : TYPE_LABELS[key as VehicleType]}
                    </button>
                  ))}
                </div>
              </div>

              <DataTable
                headers={["Vehicle", "Type", "Years", "Engine", "Fitments", "Actions"]}
                empty={
                  <EmptyState
                    title={query ? "No matching vehicles" : "No vehicles yet"}
                    description={
                      query
                        ? "Try a different search term or clear the filter."
                        : "Add the vehicles you service so parts can be matched to them."
                    }
                  />
                }
                rows={filtered.map((vehicle) => [
                  <div key="vehicle" className="min-w-0">
                    <p className="truncate font-medium text-secondary">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-secondary/45">
                      {[vehicle.engine, vehicle.variant]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>,
                  <StatusBadge key="type" tone="blue">
                    {TYPE_LABELS[vehicle.vehicleType]}
                  </StatusBadge>,
                  <span key="years" className="text-secondary/70">
                    {vehicle.yearFrom || vehicle.yearTo
                      ? `${vehicle.yearFrom ?? "—"} – ${vehicle.yearTo ?? "—"}`
                      : "—"}
                  </span>,
                  <span key="engine" className="text-secondary/70">
                    {vehicle.engine || "—"}
                  </span>,
                  <span key="fitments" className="font-semibold text-secondary">
                    {fitmentCount.get(vehicle.id) ?? 0}
                  </span>,
                  <div key="actions" className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFitmentsFor(vehicle)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-secondary transition hover:brightness-95"
                    >
                      <MdLink className="h-3.5 w-3.5" />
                      Fitments
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(vehicle)}
                      className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold text-secondary/60 transition hover:bg-black/10"
                    >
                      <MdEdit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    {pendingDelete === vehicle.id ? (
                      <button
                        type="button"
                        onClick={() => remove(vehicle)}
                        className="rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700"
                      >
                        Confirm?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(vehicle.id)}
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
          </div>
        )}
      </OperationsPage>

      {isEditorOpen ? (
        <VehicleModal
          vehicle={editing}
          onClose={() => setIsEditorOpen(false)}
          onSubmit={async (payload) => {
            if (editing) {
              await secureAxios.patch(`/vehicles/${editing.id}`, payload);
              toast.success("Vehicle updated", {
                description: `${payload.make} ${payload.model} was updated.`,
              });
            } else {
              await secureAxios.post("/vehicles", payload);
              toast.success("Vehicle added", {
                description: `${payload.make} ${payload.model} is now on the fleet.`,
              });
            }
            setIsEditorOpen(false);
            refetch();
          }}
        />
      ) : null}

      {fitmentsFor ? (
        <FitmentsModal
          vehicle={fitmentsFor}
          products={data?.products ?? []}
          onClose={() => setFitmentsFor(null)}
          onChanged={refetch}
        />
      ) : null}
    </DashboardLayout>
  );
}

type VehiclePayload = {
  vehicleType: VehicleType;
  make: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  engine?: string;
  variant?: string;
  description?: string;
};

function VehicleModal({
  vehicle,
  onClose,
  onSubmit,
}: {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSubmit: (payload: VehiclePayload) => Promise<void>;
}) {
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    vehicle?.vehicleType ?? "CAR",
  );
  const [make, setMake] = useState(vehicle?.make ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [yearFrom, setYearFrom] = useState(
    vehicle?.yearFrom != null ? String(vehicle.yearFrom) : "",
  );
  const [yearTo, setYearTo] = useState(
    vehicle?.yearTo != null ? String(vehicle.yearTo) : "",
  );
  const [engine, setEngine] = useState(vehicle?.engine ?? "");
  const [variant, setVariant] = useState(vehicle?.variant ?? "");
  const [description, setDescription] = useState(vehicle?.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!make.trim()) {
      setError("Make is required.");
      return;
    }
    if (!model.trim()) {
      setError("Model is required.");
      return;
    }
    const from = yearFrom ? Number.parseInt(yearFrom, 10) : undefined;
    const to = yearTo ? Number.parseInt(yearTo, 10) : undefined;
    if (
      from !== undefined &&
      to !== undefined &&
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      from > to
    ) {
      setError("Year from can't be after year to.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        vehicleType,
        make: make.trim(),
        model: model.trim(),
        yearFrom: from,
        yearTo: to,
        engine: engine.trim() || undefined,
        variant: variant.trim() || undefined,
        description: description.trim() || undefined,
      });
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't save the vehicle."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      title={vehicle ? "Edit vehicle" : "Add a vehicle"}
      subtitle={
        vehicle
          ? "Update the model details and fitment range."
          : "Register the vehicles your parts are made to fit."
      }
      onClose={onClose}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Vehicle type">
          <SelectInput
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value as VehicleType)}
          >
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Variant">
          <TextInput
            value={variant}
            onChange={(event) => setVariant(event.target.value)}
            placeholder="e.g. 4x4 Double Cab"
          />
        </Field>

        <Field label="Make" required>
          <TextInput
            value={make}
            onChange={(event) => setMake(event.target.value)}
            placeholder="e.g. Toyota"
          />
        </Field>

        <Field label="Model" required>
          <TextInput
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="e.g. Hilux"
          />
        </Field>

        <Field label="Year from" hint="Optional">
          <TextInput
            type="number"
            min={1900}
            max={2100}
            value={yearFrom}
            onChange={(event) => setYearFrom(event.target.value)}
            placeholder="2016"
          />
        </Field>

        <Field label="Year to" hint="Optional">
          <TextInput
            type="number"
            min={1900}
            max={2100}
            value={yearTo}
            onChange={(event) => setYearTo(event.target.value)}
            placeholder="2020"
          />
        </Field>

        <Field label="Engine" className="sm:col-span-2">
          <TextInput
            value={engine}
            onChange={(event) => setEngine(event.target.value)}
            placeholder="e.g. 2.8 GD-6"
          />
        </Field>
      </div>

      <Field label="Description">
        <TextAreaInput
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional notes about this vehicle…"
        />
      </Field>

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
          : vehicle
            ? "Save changes"
            : "Add vehicle"}
      </button>
    </ModalShell>
  );
}

function FitmentsModal({
  vehicle,
  products,
  onClose,
  onChanged,
}: {
  vehicle: Vehicle;
  products: Product[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { secureAxios } = useAxios();
  const [productId, setProductId] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useApiResource(
    async (client, key) => {
      const vehicleId = String(key ?? "");
      const response = await client.get<{
        compatibilities: PartCompatibility[];
      }>("/compatibilities", {
        params: { vehicleId, page: 1, limit: 100 },
      });
      return response.data.compatibilities;
    },
    () => "We couldn't load fitments right now.",
    vehicle.id,
  );

  const compatibilities = useMemo(() => data ?? [], [data]);
  const productName = (productId: string) =>
    products.find((product) => product.id === productId)?.name ?? productId;

  const linkedIds = useMemo(
    () => new Set(compatibilities.map((compatibility) => compatibility.productId)),
    [compatibilities],
  );

  const add = async () => {
    if (!productId) {
      setError("Choose a product to link.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await secureAxios.post("/compatibilities", {
        productId,
        vehicleId: vehicle.id,
        notes: notes.trim() || undefined,
      });
      toast.success("Part linked", {
        description: `${selectedProductName} now fits the ${vehicle.make} ${vehicle.model}.`,
      });
      setProductId("");
      setSelectedProductName("");
      setNotes("");
      refetch();
      onChanged();
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't link the part."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (compatibility: PartCompatibility) => {
    try {
      await secureAxios.delete(`/compatibilities/${compatibility.id}`);
      toast.success("Link removed", {
        description: "The part was unlinked from this vehicle.",
      });
      refetch();
      onChanged();
    } catch (error: unknown) {
      toast.danger("Couldn't remove the link", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  return (
    <ModalShell
      title={`Fitments · ${vehicle.make} ${vehicle.model}`}
      subtitle="Link the parts that are verified to fit this vehicle."
      onClose={onClose}
    >
      {isLoading ? (
        <LoadingState label="Loading fitments…" />
      ) : (
        <DataTable
          headers={["Part", "Notes", "Actions"]}
          empty={
            <EmptyState
              title="No parts linked yet"
              description="Add a product below to mark it as compatible with this vehicle."
            />
          }
          rows={compatibilities.map((compatibility) => [
            <span key="product" className="font-medium text-secondary">
              {productName(compatibility.productId)}
            </span>,
            <span key="notes" className="text-secondary/70">
              {compatibility.notes || "—"}
            </span>,
            <button
              key="remove"
              type="button"
              onClick={() => remove(compatibility)}
              className="rounded-full bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-500/20"
            >
              Remove
            </button>,
          ])}
        />
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4">
        <Field label="Add a compatible part">
          <AsyncProductSelect
            value={productId}
            onChange={(id, product) => {
              setProductId(id);
              setSelectedProductName(product?.name ?? "");
            }}
            exclude={linkedIds}
            placeholder="Search products to link…"
          />
        </Field>

        <Field label="Notes">
          <TextInput
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. Fits 4x4 models from 2016"
          />
        </Field>

        {error ? (
          <p className="text-xs font-medium text-rose-600">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={add}
          disabled={isSubmitting}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-secondary transition hover:brightness-95 disabled:opacity-60"
        >
          <MdAdd />
          {isSubmitting ? "Linking…" : "Link part"}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
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
      icon={<MdDirectionsCar className="h-5 w-5" />}
      title={title}
      subtitle={subtitle}
      size="lg"
    >
      {children}
    </AppModal>
  );
}