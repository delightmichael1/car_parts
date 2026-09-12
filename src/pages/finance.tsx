"use client";

import { useMemo } from "react";
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
import { formatDate, formatMoney } from "@/lib/format";
import { PaymentsResponse, SalesResponse } from "@/types/types";

export default function FinancePage() {
  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const [payments, sales] = await Promise.all([
        client.get<PaymentsResponse>("/payments", {
          params: { page: 1, limit: 100 },
        }),
        client.get<SalesResponse>("/sales", { params: { page: 1, limit: 100 } }),
      ]);
      return { payments: payments.data.payments, sales: sales.data.sales };
    },
    () => "We couldn't load your payments right now.",
  );

  const saleNumberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const sale of data?.sales ?? []) {
      map.set(sale.id, sale.saleNumber);
    }
    return map;
  }, [data]);

  const payments = useMemo(() => data?.payments ?? [], [data]);

  const totalCollected = payments.reduce(
    (sum, payment) => sum + Number.parseFloat(payment.amount),
    0,
  );

  const today = new Date().toDateString();
  const todayCollected = payments
    .filter((payment) => new Date(payment.createdAt).toDateString() === today)
    .reduce((sum, payment) => sum + Number.parseFloat(payment.amount), 0);

  const byMethod = useMemo(() => {
    const counts = new Map<string, number>();
    for (const payment of payments) {
      counts.set(
        payment.paymentMethod,
        (counts.get(payment.paymentMethod) ?? 0) + 1,
      );
    }
    return [...counts.entries()];
  }, [payments]);

  return (
    <DashboardLayout>
      <OperationsPage
        title="Finance"
        description="Follow every payment, balance, and settlement without losing the thread."
      >
        {isLoading ? (
          <LoadingState label="Loading payments…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total collected"
                value={formatMoney(String(totalCollected))}
                note={`${payments.length} payment${payments.length === 1 ? "" : "s"}`}
              />
              <MetricCard
                label="Collected today"
                value={formatMoney(String(todayCollected))}
                note="Today's receipts"
              />
              <MetricCard
                label="Average payment"
                value={
                  payments.length
                    ? formatMoney(String(totalCollected / payments.length))
                    : "$0.00"
                }
                note="Across all methods"
              />
              <MetricCard
                label="Most used method"
                value={byMethod[0]?.[0]?.replace("_", " ") ?? "—"}
                note={byMethod[0] ? `${byMethod[0][1]} payments` : "No payments yet"}
              />
            </div>

            <DataTable
              headers={["Payment", "Invoice", "Method", "Reference", "Amount", "Date"]}
              empty={
                <EmptyState
                  title="No payments recorded yet"
                  description="Payments collected from completed sales will appear here."
                />
              }
              rows={payments.map((payment) => [
                <span key="id" className="font-medium text-secondary">
                  {payment.id.slice(0, 8).toUpperCase()}
                </span>,
                <span key="sale" className="text-secondary/70">
                  {saleNumberById.get(payment.saleId) ?? payment.saleId}
                </span>,
                <StatusBadge key="method" tone="blue">
                  {payment.paymentMethod.replace("_", " ")}
                </StatusBadge>,
                <span key="ref" className="text-secondary/70">
                  {payment.reference || "—"}
                </span>,
                <span key="amount" className="font-semibold text-secondary">
                  {formatMoney(payment.amount)}
                </span>,
                <span key="date" className="text-secondary/70">
                  {formatDate(payment.createdAt)}
                </span>,
              ])}
            />
          </div>
        )}
      </OperationsPage>
    </DashboardLayout>
  );
}