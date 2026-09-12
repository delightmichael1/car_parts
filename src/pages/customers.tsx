"use client";

import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  StatusBadge,
} from "@/components/shared/PageState";
import { Input } from "@heroui/react";
import { MdSearch } from "react-icons/md";
import { formatMoney } from "@/lib/format";
import { CustomersResponse } from "@/types/types";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import { useApiResource } from "@/hooks/useApiResource";
import { OperationsPage } from "@/components/shared/OperationsPage";

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const response = await client.get<CustomersResponse>("/customers", {
        params: { page: page, limit: 10 },
      });
      return response.data;
    },
    () => "We couldn't load your customers right now.",
  );

  useEffect(() => {
    refetch();
  }, [page, refetch]);

  const customers = useMemo(() => data?.customers ?? [], [data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.customerCode, customer.name, customer.phone, customer.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [customers, query]);

  const businesses = customers.filter(
    (customer) => customer.customerType === "BUSINESS",
  ).length;
  const creditCustomers = customers.filter(
    (customer) => customer.creditAllowed,
  ).length;

  return (
    <DashboardLayout>
      <OperationsPage
        title="Customers"
        description="Build lasting relationships with a complete view of every buyer."
        action={{ label: "Add customer", href: "/customers/new" }}
      >
        {isLoading ? (
          <LoadingState label="Loading customers…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total customers"
                value={String(data?.total ?? 0)}
                note={`${filtered.length} shown`}
              />
              <MetricCard
                label="Business accounts"
                value={String(businesses)}
                note="Corporate buyers"
              />
              <MetricCard
                label="Credit allowed"
                value={String(creditCustomers)}
                note="Can buy on account"
              />
              <MetricCard
                label="Avg. credit limit"
                value={
                  creditCustomers
                    ? formatMoney(
                        customers
                          .filter((customer) => customer.creditAllowed)
                          .reduce(
                            (sum, customer) =>
                              sum + Number.parseFloat(customer.creditLimit),
                            0,
                          ) / creditCustomers,
                      )
                    : "$0.00"
                }
                note="Where credit is enabled"
              />
            </div>

            <label className="flex min-h-11 max-w-md items-center gap-3 rounded-2xl bg-black/5 px-4">
              <MdSearch className="h-4 w-4 text-secondary/45" />
              <span className="sr-only">Search customers</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, code, phone, or email"
                aria-label="Search customers"
                variant="secondary"
                className="w-full border-transparent bg-transparent px-0 py-0 text-sm shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
              />
            </label>

            <DataTable
              headers={["Customer", "Contact", "Type", "Credit", "Status"]}
              empty={
                <EmptyState
                  title={query ? "No matching customers" : "No customers yet"}
                  description={
                    query
                      ? "Try a different search term or clear the filter."
                      : "Add your first customer to start building the directory."
                  }
                  action={
                    query
                      ? undefined
                      : { href: "/customers/new", label: "Add a customer" }
                  }
                />
              }
              itemsPerPage={data?.limit}
              page={page}
              setPage={setPage}
              totalPages={Math.ceil((data?.total ?? 0) / (data?.limit ?? 1))}
              totalItems={data?.total}
              rows={filtered.map((customer) => [
                <div key="name" className="min-w-0">
                  <p className="truncate font-medium text-secondary">
                    {customer.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-secondary/45">
                    {customer.customerCode}
                  </p>
                </div>,
                <div key="contact" className="min-w-0">
                  <p className="truncate text-secondary/70">
                    {customer.phone || "—"}
                  </p>
                  <p className="truncate text-[11px] text-secondary/45">
                    {customer.email || ""}
                  </p>
                </div>,
                <span key="type" className="text-secondary/70">
                  {customer.customerType === "BUSINESS"
                    ? "Business"
                    : "Individual"}
                </span>,
                <span key="credit" className="text-secondary/70">
                  {customer.creditAllowed
                    ? formatMoney(customer.creditLimit)
                    : "No credit"}
                </span>,
                <StatusBadge
                  key="status"
                  tone={customer.isActive ? "emerald" : "slate"}
                >
                  {customer.isActive ? "Active" : "Inactive"}
                </StatusBadge>,
              ])}
            />
          </div>
        )}
      </OperationsPage>
    </DashboardLayout>
  );
}
