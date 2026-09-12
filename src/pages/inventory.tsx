"use client";

import { useEffect, useMemo, useState } from "react";
import { MdInventory, MdAdd, MdTune } from "react-icons/md";
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
import { TextInput } from "@/components/shared/FormFields";
import { AsyncProductSelect } from "@/components/shared/AsyncProductSelect";
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import {
  LowStockResponse,
  MovementsResponse,
  ProductsResponse,
} from "@/types/types";

export default function InventoryPage() {
  const { secureAxios } = useAxios();
  const [page, setPage] = useState(1);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const [products, lowStock, outOfStock, movements] = await Promise.all([
        client.get<ProductsResponse>("/products", {
          params: { page: 1, limit: 1000 },
        }),
        client.get<LowStockResponse>("/inventory/low-stock", {
          params: { page: 1, limit: 100 },
        }),
        client.get<LowStockResponse>("/inventory/out-of-stock", {
          params: { page: 1, limit: 100 },
        }),
        client.get<MovementsResponse>("/inventory/movements", {
          params: { page, limit: 10 },
        }),
      ]);
      return {
        products: products.data.products,
        limit: movements.data.limit,
        total: movements.data.total,
        lowStock: lowStock.data.products,
        lowStockTotal: lowStock.data.total,
        outOfStock: outOfStock.data.products,
        outOfStockTotal: outOfStock.data.total,
        movements: movements.data.movements,
      };
    },
    () => "We couldn't load your inventory right now.",
  );

  useEffect(() => {
    refetch();
  }, [page, refetch]);

  const productById = useMemo(() => {
    const map = new Map<string, { name: string; sku: string }>();
    for (const product of data?.products ?? []) {
      map.set(product.id, { name: product.name, sku: product.sku });
    }
    return map;
  }, [data]);

  const totalUnits =
    data?.products.reduce((sum, product) => sum + product.quantity, 0) ?? 0;

  return (
    <DashboardLayout>
      <OperationsPage
        title="Inventory control"
        description="Know what is moving, what is low, and what needs to be received next."
        action={{ label: "Receive stock", href: undefined }}
        actionOnClick={() => setIsStockInOpen(true)}
        secondaryAction={{ label: "Adjust stock" }}
        secondaryActionOnClick={() => setIsAdjustOpen(true)}
      >
        {isLoading ? (
          <LoadingState label="Loading inventory…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Products"
                value={String(data?.products.length ?? 0)}
                note="In the catalog"
              />
              <MetricCard
                label="Total units"
                value={String(totalUnits)}
                note="Across all parts"
              />
              <MetricCard
                label="Low stock"
                value={String(data?.lowStockTotal ?? 0)}
                note="Needs attention"
              />
              <MetricCard
                label="Out of stock"
                value={String(data?.outOfStockTotal ?? 0)}
                note="Reorder required"
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-secondary">
                  Low stock
                </h2>
                <DataTable
                  headers={["Product", "Available", "Reorder at", "Status"]}
                  empty={
                    <EmptyState
                      title="Nothing is running low"
                      description="Products at or below their reorder level will show up here."
                    />
                  }
                  rows={(data?.lowStock ?? []).map((product) => [
                    <div key="name" className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="mt-0.5 text-[11px] text-secondary/45">
                        {product.sku}
                      </p>
                    </div>,
                    <span key="qty" className="text-secondary/70">
                      {product.quantity}
                    </span>,
                    <span key="min" className="text-secondary/70">
                      {product.minimumStockLevel}
                    </span>,
                    <StatusBadge
                      key="status"
                      tone={product.quantity <= 0 ? "rose" : "amber"}
                    >
                      {product.quantity <= 0 ? "Out of stock" : "Low"}
                    </StatusBadge>,
                  ])}
                />
              </section>

              <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-secondary">
                  Out of stock
                </h2>
                <DataTable
                  headers={["Product", "SKU", "Reorder at", "Status"]}
                  empty={
                    <EmptyState
                      title="Everything is in stock"
                      description="Parts with zero quantity will appear here."
                    />
                  }
                  rows={(data?.outOfStock ?? []).map((product) => [
                    <div key="name" className="min-w-0">
                      <p className="truncate font-medium text-secondary">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-secondary/45">
                        {product.sku}
                      </p>
                    </div>,
                    <span key="sku" className="text-secondary/70">
                      {product.sku}
                    </span>,
                    <span key="min" className="text-secondary/70">
                      {product.minimumStockLevel}
                    </span>,
                    <StatusBadge key="status" tone="rose">
                      Out of stock
                    </StatusBadge>,
                  ])}
                />
              </section>
            </div>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-secondary">
                  Movement history
                </h2>
                <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-medium text-secondary/55">
                  Latest 25
                </span>
              </div>
              <DataTable
                headers={["Product", "Type", "Change", "Reason", "Date"]}
                empty={
                  <EmptyState
                    title="No movements yet"
                    description="Stock-in and sale activity will appear here as inventory changes."
                  />
                }
                itemsPerPage={data?.limit}
                page={page}
                setPage={setPage}
                totalPages={Math.ceil((data?.total ?? 0) / (data?.limit ?? 1))}
                totalItems={data?.total}
                rows={(data?.movements ?? []).map((movement) => {
                  const product = productById.get(movement.productId);
                  return [
                    <span key="product" className="font-medium text-secondary">
                      {product?.name ?? movement.productId}
                    </span>,
                    <StatusBadge
                      key="type"
                      tone={
                        movement.movementType === "SALE"
                          ? "rose"
                          : movement.movementType === "ADJUSTMENT"
                            ? "blue"
                            : movement.movementType === "RETURN"
                              ? "amber"
                              : "emerald"
                      }
                    >
                      {movement.movementType.replace("_", " ")}
                    </StatusBadge>,
                    <span
                      key="change"
                      className={`font-semibold ${
                        movement.movementType === "SALE"
                          ? "text-rose-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {movement.quantityBefore} → {movement.quantityAfter}
                    </span>,
                    <span key="reason" className="text-secondary/70">
                      {movement.reason || "—"}
                    </span>,
                    <span key="date" className="text-secondary/70">
                      {formatDate(movement.createdAt)}
                    </span>,
                  ];
                })}
              />
            </section>
          </div>
        )}
      </OperationsPage>

      {isStockInOpen ? (
        <StockInModal
          onClose={() => setIsStockInOpen(false)}
          onSubmit={async (productId, quantity, reason) => {
            await secureAxios.post("/inventory/stock-in", {
              productId,
              quantity,
              reason,
            });
            setIsStockInOpen(false);
            refetch();
          }}
        />
      ) : null}

      {isAdjustOpen ? (
        <AdjustStockModal
          onClose={() => setIsAdjustOpen(false)}
          onSubmit={async (productId, quantity, reason) => {
            await secureAxios.post("/inventory/adjust", {
              productId,
              quantity,
              reason,
            });
            setIsAdjustOpen(false);
            refetch();
          }}
        />
      ) : null}
    </DashboardLayout>
  );
}

function StockInModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (
    productId: string,
    quantity: number,
    reason: string,
  ) => Promise<void>;
}) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const qty = Number.parseInt(quantity, 10);
    if (!productId) {
      setError("Choose a product to receive.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required for stock-in.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(productId, qty, reason.trim());
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't receive stock."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdInventory className="h-5 w-5" />}
      title="Receive stock"
      subtitle="Adds quantity and records a stock-in movement."
      footer={
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
        >
          <MdAdd />
          {isSubmitting ? "Receiving…" : "Receive stock"}
        </button>
      }
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        Product
        <AsyncProductSelect
          value={productId}
          onChange={(id) => setProductId(id)}
          placeholder="Search products…"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        Quantity
        <TextInput
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          type="number"
          min={1}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        Reason <span className="text-primary">*</span>
        <TextInput
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. New shipment received"
        />
      </label>

      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : null}
    </AppModal>
  );
}

function AdjustStockModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (
    productId: string,
    quantity: number,
    reason: string,
  ) => Promise<void>;
}) {
  const [productId, setProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    quantity: number;
  } | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!productId) {
      setError("Choose a product to adjust.");
      return;
    }
    const qty = Number.parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty < 0) {
      setError("Enter the corrected on-hand count (0 or more).");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required for an adjustment.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(productId, qty, reason.trim());
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't adjust stock."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdTune className="h-5 w-5" />}
      title="Adjust stock"
      subtitle="Set the corrected on-hand count after a physical count."
      footer={
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
        >
          <MdTune />
          {isSubmitting ? "Adjusting…" : "Apply adjustment"}
        </button>
      }
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        Product
        <AsyncProductSelect
          value={productId}
          onChange={(id, product) => {
            setProductId(id);
            setSelectedProduct(product);
            setQuantity("");
          }}
          placeholder="Search products…"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        Corrected on-hand count <span className="text-primary">*</span>
        <TextInput
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          type="number"
          min={0}
          placeholder={
            selectedProduct != null
              ? `Currently ${selectedProduct.quantity}`
              : "e.g. 42"
          }
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        Reason <span className="text-primary">*</span>
        <TextInput
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Physical stock count correction"
        />
      </label>

      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : null}
    </AppModal>
  );
}
