"use client";

import { useState } from "react";
import Link from "next/link";
import { MdSearch } from "react-icons/md";
import { Input } from "@heroui/react";
import DashboardLayout from "@/layout/DashboardLayout";
import { OperationsPage } from "@/components/shared/OperationsPage";
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/shared/PageState";
import { useApiResource } from "@/hooks/useApiResource";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Customer,
  CustomersResponse,
  Product,
  ProductsResponse,
  Sale,
  SalesResponse,
} from "@/types/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, error, refetch } = useApiResource(
    async (client, key) => {
      const term = String(key ?? "").trim();
      if (!term) {
        return { term: "", products: [], customers: [], sales: [] };
      }
      const [products, customers, sales] = await Promise.all([
        client
          .get<ProductsResponse>("/products", {
            params: { search: term, page: 1, limit: 20 },
          })
          .catch(() => null),
        client
          .get<CustomersResponse>("/customers", {
            params: { search: term, page: 1, limit: 20 },
          })
          .catch(() => null),
        client
          .get<SalesResponse>("/sales", {
            params: { saleNumber: term, page: 1, limit: 20 },
          })
          .catch(() => null),
      ]);
      return {
        term,
        products: products?.data?.products ?? [],
        customers: customers?.data?.customers ?? [],
        sales: sales?.data?.sales ?? [],
      };
    },
    () => "We couldn't search right now.",
    submitted,
  );

  const runSearch = () => {
    if (!query.trim()) return;
    setSubmitted(query.trim());
  };

  const resultCount = data
    ? data.products.length + data.customers.length + data.sales.length
    : 0;

  return (
    <DashboardLayout>
      <OperationsPage
        title="Search everything"
        description="Find parts, customers, quotations, and sales from one fast workspace."
      >
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-13 flex-1 items-center gap-3 rounded-2xl bg-black/5 px-4">
              <MdSearch className="h-5 w-5 text-secondary/45" />
              <span className="sr-only">Search</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") runSearch();
                }}
                placeholder="Search by SKU, name, customer, or invoice…"
                aria-label="Search"
                variant="secondary"
                className="w-full rounded-none border-transparent bg-transparent px-0 py-0 text-base shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
              />
            </label>
            <button
              type="button"
              onClick={runSearch}
              disabled={!query.trim()}
              className="min-h-13 rounded-2xl bg-secondary px-6 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-50"
            >
              Search
            </button>
          </div>

          {isLoading ? (
            <LoadingState label="Searching…" />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !submitted ? (
            <EmptyState
              title="Search the workspace"
              description="Try a part name or SKU, a customer name, or an invoice number like INV-000001."
            />
          ) : resultCount === 0 ? (
            <EmptyState
              title={`No results for "${submitted}"`}
              description="Check the spelling or try a different term."
            />
          ) : (
            <div className="flex flex-col gap-5">
              <p className="text-xs text-secondary/45">
                {resultCount} result{resultCount === 1 ? "" : "s"} for{" "}
                <span className="font-semibold text-secondary">
                  {submitted}
                </span>
              </p>

              {data!.products.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/55">
                    Products
                  </h2>
                  <DataTable
                    headers={["Product", "SKU", "Stock", "Price"]}
                    rows={(data!.products as Product[]).map((product) => [
                      <div key="name" className="min-w-0">
                        <p className="truncate font-medium text-secondary">
                          {product.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-secondary/45">
                          {product.category?.name ?? "Part"}
                        </p>
                      </div>,
                      <span key="sku" className="text-secondary/70">
                        {product.sku}
                      </span>,
                      <span key="stock" className="text-secondary/70">
                        {product.quantity}
                      </span>,
                      <span
                        key="price"
                        className="font-semibold text-secondary"
                      >
                        {formatMoney(product.sellingPrice)}
                      </span>,
                    ])}
                  />
                </section>
              ) : null}

              {data!.customers.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/55">
                    Customers
                  </h2>
                  <DataTable
                    headers={["Customer", "Code", "Phone", "Email"]}
                    rows={(data!.customers as Customer[]).map((customer) => [
                      <Link
                        key="name"
                        href="/customers"
                        className="truncate font-medium text-secondary hover:underline"
                      >
                        {customer.name}
                      </Link>,
                      <span key="code" className="text-secondary/70">
                        {customer.customerCode}
                      </span>,
                      <span key="phone" className="text-secondary/70">
                        {customer.phone || "—"}
                      </span>,
                      <span key="email" className="text-secondary/70">
                        {customer.email || "—"}
                      </span>,
                    ])}
                  />
                </section>
              ) : null}

              {data!.sales.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/55">
                    Sales
                  </h2>
                  <DataTable
                    headers={["Invoice", "Status", "Payment", "Total", "Date"]}
                    rows={(data!.sales as Sale[]).map((sale) => [
                      <span key="number" className="font-medium text-secondary">
                        {sale.saleNumber}
                      </span>,
                      <span key="status" className="text-secondary/70">
                        {sale.status}
                      </span>,
                      <span key="payment" className="text-secondary/70">
                        {sale.paymentStatus.replace("_", " ")}
                      </span>,
                      <span
                        key="total"
                        className="font-semibold text-secondary"
                      >
                        {formatMoney(sale.total)}
                      </span>,
                      <span key="date" className="text-secondary/70">
                        {formatDate(sale.createdAt)}
                      </span>,
                    ])}
                  />
                </section>
              ) : null}
            </div>
          )}
        </div>
      </OperationsPage>
    </DashboardLayout>
  );
}
