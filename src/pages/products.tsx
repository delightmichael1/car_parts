"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdSearch } from "react-icons/md";
import { Input } from "@heroui/react";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAxios } from "@/hooks/useAxios";
import { formatMoney } from "@/lib/format";
import { LowStockProduct, Product, ProductsResponse } from "@/types/types";

const PAGE_SIZE = 25;

export default function ProductsPage() {
  const { secureAxios } = useAxios();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const secureAxiosRef = useRef(secureAxios);
  useEffect(() => {
    secureAxiosRef.current = secureAxios;
  });

  const load = useCallback(async () => {
    try {
      const response = await secureAxiosRef.current.get<ProductsResponse>(
        "/products",
        {
          params: {
            page,
            limit: PAGE_SIZE,
            active: true,
            search: debouncedQuery || undefined,
          },
        },
      );
      setProducts((current) =>
        page === 1
          ? response.data.products
          : [...current, ...response.data.products],
      );
      setTotal(response.data.total);
    } catch {
      setError("We couldn't load the product catalog right now.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [page, debouncedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = () => {
    setIsLoadingMore(true);
    setPage((current) => current + 1);
  };

  const { data: stock } = useApiResource(
    async (client) => {
      const [low, out] = await Promise.all([
        client.get<{ products: LowStockProduct[]; total: number }>(
          "/inventory/low-stock",
          { params: { page: 1, limit: 1 } },
        ),
        client.get<{ products: LowStockProduct[]; total: number }>(
          "/inventory/out-of-stock",
          { params: { page: 1, limit: 1 } },
        ),
      ]);
      return { low: low.data.total, out: out.data.total };
    },
    () => "We couldn't load stock totals right now.",
  );

  const stockTone = (product: Product): "emerald" | "amber" | "rose" => {
    if (product.quantity <= 0) return "rose";
    if (product.quantity <= product.minimumStockLevel) return "amber";
    return "emerald";
  };

  const stockLabel = (product: Product) => {
    if (product.quantity <= 0) return "Out of stock";
    if (product.quantity <= product.minimumStockLevel) return "Low stock";
    return "In stock";
  };

  const avgPrice = useMemo(
    () =>
      products.length
        ? formatMoney(
            products.reduce(
              (sum, product) =>
                sum + Number.parseFloat(product.sellingPrice),
              0,
            ) / products.length,
          )
        : "$0.00",
    [products],
  );

  const hasMore = products.length < total;

  return (
    <DashboardLayout>
      <OperationsPage
        title="Product catalog"
        description="Keep every part, fitment, and price ready for the next customer."
        action={{ label: "Add product", href: "/products/new" }}
      >
        {isLoading ? (
          <LoadingState label="Loading the catalog…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Catalog items"
                value={String(total)}
                note={`${products.length} shown`}
              />
              <MetricCard
                label="Low stock"
                value={String(stock?.low ?? 0)}
                note="Needs attention"
              />
              <MetricCard
                label="Out of stock"
                value={String(stock?.out ?? 0)}
                note="Reorder required"
              />
              <MetricCard
                label="Avg. price"
                value={avgPrice}
                note="Across shown items"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex min-h-11 max-w-md items-center gap-3 rounded-2xl bg-black/5 px-4">
                <MdSearch className="h-4 w-4 text-secondary/45" />
                <span className="sr-only">Search products</span>
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by SKU, name, or part number"
                  aria-label="Search products"
                  variant="secondary"
                  className="w-full border-transparent bg-transparent px-0 py-0 text-sm shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
                />
              </label>

              <DataTable
                headers={["Product", "Category", "Stock", "Price", "Status"]}
                empty={
                  <EmptyState
                    title={query ? "No matching parts" : "No products yet"}
                    description={
                      query
                        ? "Try a different search term or clear the filter."
                        : "Add your first part to start building the catalog."
                    }
                    action={
                      query
                        ? undefined
                        : { href: "/products/new", label: "Add a product" }
                    }
                  />
                }
                rows={products.map((product) => [
                  <div key="name" className="min-w-0">
                    <p className="truncate font-medium text-secondary">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-secondary/45">
                      SKU: {product.sku}
                      {product.partNumber ? ` · ${product.partNumber}` : ""}
                    </p>
                  </div>,
                  <span key="category" className="text-secondary/70">
                    {product.category?.name ?? "—"}
                  </span>,
                  <span key="stock" className="text-secondary/70">
                    {product.quantity} unit
                    {product.quantity === 1 ? "" : "s"}
                  </span>,
                  <span key="price" className="font-semibold text-secondary">
                    {formatMoney(product.sellingPrice)}
                  </span>,
                  <StatusBadge key="status" tone={stockTone(product)}>
                    {stockLabel(product)}
                  </StatusBadge>,
                ])}
              />

              {hasMore ? (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex min-h-12 items-center justify-center rounded-2xl bg-black/5 text-sm font-semibold text-secondary transition hover:bg-black/10 disabled:opacity-60"
                >
                  {isLoadingMore
                    ? "Loading…"
                    : `Load more (${total - products.length} remaining)`}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </OperationsPage>
    </DashboardLayout>
  );
}