"use client";

import { useEffect, useMemo, useState } from "react";
import { MdSearch } from "react-icons/md";
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
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { PaymentModal } from "@/components/shared/PaymentModal";
import { apiErrorMessage } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/format";
import { Customer, Sale, SalesResponse } from "@/types/types";

type StatusFilter = "ALL" | "DRAFT" | "COMPLETED" | "CANCELLED";

export default function OperationsPageView() {
  const { secureAxios } = useAxios();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [payingSale, setPayingSale] = useState<Sale | null>(null);

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const [sales, customers] = await Promise.all([
        client.get<SalesResponse>("/sales", {
          params: { page, limit: 10 },
        }),
        client.get<{ customers: Customer[] }>("/customers", {
          params: { page: 1, limit: 100 },
        }),
      ]);
      return { ...sales.data, customers: customers.data.customers };
    },
    () => "We couldn't load your transactions right now.",
  );

  useEffect(() => {
    refetch();
  }, [page, refetch]);

  const sales = useMemo(() => data?.sales ?? [], [data]);
  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of data?.customers ?? []) {
      map.set(customer.id, customer);
    }
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sales.filter((sale) => {
      if (statusFilter !== "ALL" && sale.status !== statusFilter) return false;
      if (!term) return true;
      return (
        sale.saleNumber.toLowerCase().includes(term) ||
        (customerById.get(sale.customerId ?? "")?.name ?? "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [sales, query, statusFilter, customerById]);

  const drafts = sales.filter((sale) => sale.status === "DRAFT").length;
  const completed = sales.filter((sale) => sale.status === "COMPLETED").length;
  const outstanding = sales
    .filter((sale) => sale.status === "COMPLETED")
    .reduce((sum, sale) => sum + Number.parseFloat(sale.balance), 0);

  const saleStatusTone = (status: Sale["status"]) => {
    if (status === "COMPLETED") return "emerald";
    if (status === "CANCELLED") return "slate";
    return "amber";
  };

  const paymentTone = (paymentStatus: Sale["paymentStatus"]) => {
    if (paymentStatus === "PAID") return "emerald";
    if (paymentStatus === "PARTIALLY_PAID") return "amber";
    return "rose";
  };

  const completeSale = async (sale: Sale) => {
    try {
      await secureAxios.post(`/sales/${sale.id}/complete`);
      toast.success("Sale completed", {
        description: `${sale.saleNumber} is now completed and stock was deducted.`,
      });
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't complete the sale", {
        description: apiErrorMessage(error, "Check stock levels and try again"),
      });
    }
  };

  const cancelSale = async (sale: Sale) => {
    try {
      await secureAxios.post(`/sales/${sale.id}/cancel`);
      toast.success("Sale cancelled", {
        description: `${sale.saleNumber} has been cancelled.`,
      });
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't cancel the sale", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  const statusButtons = (
    ["ALL", "DRAFT", "COMPLETED", "CANCELLED"] as const
  ).map((key) => (
    <button
      key={key}
      type="button"
      onClick={() => setStatusFilter(key)}
      className={`rounded-full px-4 py-2 text-xs font-medium transition ${
        statusFilter === key
          ? "bg-secondary text-white shadow-sm"
          : "text-secondary/55 hover:text-secondary"
      }`}
    >
      {key === "ALL" ? "All" : key[0] + key.slice(1).toLowerCase()}
    </button>
  ));

  return (
    <DashboardLayout>
      <OperationsPage
        title="Transactions"
        description="Review sales, payments, and order progress in one clear view."
        action={{ label: "Open POS", href: "/pos" }}
      >
        {isLoading ? (
          <LoadingState label="Loading transactions…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total transactions"
                value={String(data?.total ?? 0)}
                note={`${filtered.length} shown`}
              />
              <MetricCard
                label="Draft sales"
                value={String(drafts)}
                note="Awaiting completion"
              />
              <MetricCard
                label="Completed"
                value={String(completed)}
                note="Stock deducted"
              />
              <MetricCard
                label="Outstanding"
                value={formatMoney(outstanding)}
                note="Unpaid balance"
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-1 overflow-x-auto rounded-full bg-black/5 p-1">
                {statusButtons}
              </div>
              <label className="flex min-h-11 max-w-md flex-1 items-center gap-3 rounded-2xl bg-black/5 px-4">
                <MdSearch className="h-4 w-4 text-secondary/45" />
                <span className="sr-only">Search sales</span>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by invoice or customer…"
                  aria-label="Search sales"
                  variant="secondary"
                  className="w-full rounded-none border-transparent bg-transparent px-0 py-0 text-sm shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
                />
              </label>
            </div>

            <DataTable
              headers={[
                "Invoice",
                "Customer",
                "Date",
                "Status",
                "Payment",
                "Tax",
                "Discount",
                "Total",
                "Actions",
              ]}
              empty={
                <EmptyState
                  title="No transactions found"
                  description={
                    query || statusFilter !== "ALL"
                      ? "Try a different filter or search term."
                      : "Head to the POS to create your first sale."
                  }
                  action={
                    query || statusFilter !== "ALL"
                      ? undefined
                      : { href: "/pos", label: "Open POS" }
                  }
                />
              }
              itemsPerPage={data?.limit}
              page={page}
              setPage={setPage}
              totalPages={Math.ceil((data?.total ?? 0) / (data?.limit ?? 1))}
              totalItems={data?.total}
              rows={filtered.map((sale) => [
                <div key="number" className="min-w-0">
                  <p className="truncate font-medium text-secondary">
                    {sale.saleNumber}
                  </p>
                  <p className="mt-0.5 text-[11px] text-secondary/45">
                    {sale.items.length} item{sale.items.length === 1 ? "" : "s"}
                  </p>
                </div>,
                <span key="customer" className="text-secondary/70">
                  {customerById.get(sale.customerId ?? "")?.name ?? "Walk-in"}
                </span>,
                <span key="date" className="text-secondary/70">
                  {formatDate(sale.createdAt)}
                </span>,
                <StatusBadge key="status" tone={saleStatusTone(sale.status)}>
                  {sale.status}
                </StatusBadge>,
                <StatusBadge
                  key="payment"
                  tone={paymentTone(sale.paymentStatus)}
                >
                  {sale.paymentStatus.replace("_", " ")}
                </StatusBadge>,
                <div key="tax" className="text-danger">
                  {formatMoney(sale.tax)}
                </div>,
                <div key="discount" className="text-warning">
                  {formatMoney(sale.discount)}
                </div>,
                <div key="total" className="">
                  <p className="font-semibold text-secondary">
                    {formatMoney(sale.total)}
                  </p>
                  {sale.status === "COMPLETED" &&
                  sale.paymentStatus !== "PAID" ? (
                    <p className="text-[11px] text-secondary/45">
                      {formatMoney(sale.balance)} due
                    </p>
                  ) : null}
                </div>,
                <div key="actions" className="flex flex-wrap gap-2">
                  {sale.status === "DRAFT" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => completeSale(sale)}
                        className="rounded-full bg-emerald-600/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-600/20"
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelSale(sale)}
                        className="rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold text-secondary/60 transition hover:bg-black/10"
                      >
                        Cancel
                      </button>
                    </>
                  ) : sale.status === "COMPLETED" &&
                    sale.paymentStatus !== "PAID" ? (
                    <button
                      type="button"
                      onClick={() => setPayingSale(sale)}
                      className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-secondary transition hover:brightness-95"
                    >
                      Record payment
                    </button>
                  ) : (
                    <span className="text-xs text-secondary/40">—</span>
                  )}
                </div>,
              ])}
            />
          </div>
        )}
      </OperationsPage>

      {payingSale ? (
        <PaymentModal
          sale={payingSale}
          onClose={() => setPayingSale(null)}
          onPaid={async (amount, method, reference, notes) => {
            await secureAxios.post("/payments", {
              saleId: payingSale.id,
              amount,
              paymentMethod: method,
              reference: reference || undefined,
              notes: notes || undefined,
            });
            setPayingSale(null);
            refetch();
          }}
        />
      ) : null}
    </DashboardLayout>
  );
}
