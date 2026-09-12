"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@heroui/react";
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
import { apiErrorMessage } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/format";
import { Customer, Quotation, QuotationsResponse } from "@/types/types";

type QuotationFilter =
  | "ALL"
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

const FILTERS: QuotationFilter[] = [
  "ALL",
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "CONVERTED",
  "REJECTED",
  "EXPIRED",
];

export default function QuotationsPage() {
  const { secureAxios } = useAxios();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<QuotationFilter>("ALL");

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const [quotations, customers] = await Promise.all([
        client.get<QuotationsResponse>("/quotations", {
          params: { page: 1, limit: 100 },
        }),
        client.get<{ customers: Customer[] }>("/customers", {
          params: { page: 1, limit: 100 },
        }),
      ]);
      return { ...quotations.data, customers: customers.data.customers };
    },
    () => "We couldn't load your quotations right now.",
  );

  useEffect(() => {
    refetch();
  }, [page, refetch]);

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of data?.customers ?? []) {
      map.set(customer.id, customer);
    }
    return map;
  }, [data]);

  const quotations = useMemo(() => data?.quotations ?? [], [data]);

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? quotations
        : quotations.filter((quotation) => quotation.status === filter),
    [quotations, filter],
  );

  const openValue = quotations
    .filter(
      (quotation) =>
        quotation.status === "DRAFT" || quotation.status === "SENT",
    )
    .reduce((sum, quotation) => sum + Number.parseFloat(quotation.total), 0);
  const accepted = quotations.filter(
    (quotation) => quotation.status === "ACCEPTED",
  ).length;
  const converted = quotations.filter(
    (quotation) => quotation.status === "CONVERTED",
  ).length;

  const toneFor = (status: Quotation["status"]) => {
    if (status === "ACCEPTED" || status === "CONVERTED") return "emerald";
    if (status === "DRAFT") return "amber";
    if (status === "SENT") return "blue";
    if (status === "REJECTED") return "rose";
    return "slate";
  };

  const transition = async (
    quotation: Quotation,
    path: string,
    successTitle: string,
    successDescription: string,
  ) => {
    try {
      await secureAxios.post(`/quotations/${quotation.id}/${path}`);
      toast.success(successTitle, { description: successDescription });
      refetch();
    } catch (error: unknown) {
      toast.danger("Action failed", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  const convert = async (quotation: Quotation) => {
    try {
      const { data: response } = await secureAxios.post<{
        saleId: string;
        saleNumber: string;
      }>(`/quotations/${quotation.id}/convert`);
      toast.success("Converted to sale", {
        description: `${quotation.quotationNumber} became ${response.saleNumber}. Complete it in Sales to deduct stock.`,
      });
      refetch();
    } catch (error: unknown) {
      toast.danger("Couldn't convert", {
        description: apiErrorMessage(error, "Try again"),
      });
    }
  };

  return (
    <DashboardLayout>
      <OperationsPage
        title="Quotations"
        description="Turn fitment requests into confident, trackable offers."
        action={{ label: "New quotation", href: "/quotations/new" }}
      >
        {isLoading ? (
          <LoadingState label="Loading quotations…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Open quotes"
                value={String(quotations.length)}
                note={formatMoney(openValue) + " open value"}
              />
              <MetricCard
                label="Accepted"
                value={String(accepted)}
                note="Ready to convert"
              />
              <MetricCard
                label="Converted"
                value={String(converted)}
                note="Became sales"
              />
              <MetricCard
                label="Expired"
                value={String(
                  quotations.filter(
                    (quotation) => quotation.status === "EXPIRED",
                  ).length,
                )}
                note="Past their validity"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-full bg-black/5 p-1">
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition ${
                    filter === key
                      ? "bg-secondary text-white shadow-sm"
                      : "text-secondary/55 hover:text-secondary"
                  }`}
                >
                  {key === "ALL" ? "All" : key[0] + key.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <DataTable
              headers={[
                "Quote",
                "Customer",
                "Created",
                "Valid until",
                "Total",
                "Status",
                "Actions",
              ]}
              empty={
                <EmptyState
                  title="No quotations found"
                  description="Create a quotation to start tracking offers."
                  action={{ href: "/quotations/new", label: "New quotation" }}
                />
              }
              itemsPerPage={data?.limit}
              page={page}
              setPage={setPage}
              totalPages={Math.ceil((data?.total ?? 0) / (data?.limit ?? 1))}
              totalItems={data?.total}
              rows={filtered.map((quotation) => [
                <div key="number" className="min-w-0">
                  <p className="truncate font-medium text-secondary">
                    {quotation.quotationNumber}
                  </p>
                  <p className="mt-0.5 text-[11px] text-secondary/45">
                    {quotation.items.length} item
                    {quotation.items.length === 1 ? "" : "s"}
                  </p>
                </div>,
                <span key="customer" className="text-secondary/70">
                  {customerById.get(quotation.customerId ?? "")?.name ?? "—"}
                </span>,
                <span key="created" className="text-secondary/70">
                  {formatDate(quotation.createdAt)}
                </span>,
                <span key="valid" className="text-secondary/70">
                  {quotation.validUntil
                    ? formatDate(quotation.validUntil)
                    : "—"}
                </span>,
                <span key="total" className="font-semibold text-secondary">
                  {formatMoney(quotation.total)}
                </span>,
                <StatusBadge key="status" tone={toneFor(quotation.status)}>
                  {quotation.status}
                </StatusBadge>,
                <div key="actions" className="flex flex-wrap gap-2">
                  {quotation.status === "DRAFT" ? (
                    <button
                      type="button"
                      onClick={() =>
                        transition(
                          quotation,
                          "send",
                          "Quotation sent",
                          `${quotation.quotationNumber} is now with the customer.`,
                        )
                      }
                      className="rounded-full bg-blue-600/10 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-600/20"
                    >
                      Send
                    </button>
                  ) : quotation.status === "SENT" ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          transition(
                            quotation,
                            "accept",
                            "Quotation accepted",
                            `${quotation.quotationNumber} was accepted.`,
                          )
                        }
                        className="rounded-full bg-emerald-600/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-600/20"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          transition(
                            quotation,
                            "reject",
                            "Quotation rejected",
                            `${quotation.quotationNumber} was rejected.`,
                          )
                        }
                        className="rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold text-secondary/60 transition hover:bg-black/10"
                      >
                        Reject
                      </button>
                    </>
                  ) : quotation.status === "ACCEPTED" ? (
                    <button
                      type="button"
                      onClick={() => convert(quotation)}
                      className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-secondary transition hover:brightness-95"
                    >
                      Convert to sale
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
    </DashboardLayout>
  );
}
