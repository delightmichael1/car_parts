"use client";

import { useState } from "react";
import Link from "next/link";
import { Spinner } from "@heroui/react";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { formatDate, formatMoney } from "@/lib/format";
import { Sale } from "@/types/types";
import {
  MdAdd,
  MdArrowOutward,
  MdChevronRight,
  MdFilterList,
  MdInventory2,
  MdShoppingBag,
  MdTrendingUp,
} from "react-icons/md";
import Image from "next/image";

type Period = "today" | "month" | "all";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Today",
  month: "This month",
  all: "All time",
};

function EmptyState({
  title,
  description,
  action,
  svgName,
}: {
  title: string;
  description: string;
  svgName?: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-black/10 bg-white/70 px-4 py-5 text-center">
      {svgName && (
        <Image
          src={`/svgs/${svgName}`}
          alt="image"
          width={0}
          height={0}
          sizes="100vw"
          className="mx-auto w-40 h-fit"
        />
      )}
      <p className="text-sm font-semibold text-secondary">{title}</p>
      <p className="mt-1 text-xs leading-5 text-secondary/55">{description}</p>
      <Link
        href={action.href}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-secondary px-4 py-2 text-xs font-medium text-white transition hover:bg-secondary/90"
      >
        {action.label}
      </Link>
    </div>
  );
}

export default function DashboardHome() {
  const { summary, isLoading, error, refetch } = useDashboardSummary();
  const [period, setPeriod] = useState<Period>("month");

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-[28px] bg-card/50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-[28px] bg-card/50 text-center">
        <p className="max-w-sm text-sm text-secondary/60">
          {error ?? "Something went wrong."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-white transition hover:bg-secondary/90"
        >
          Try again
        </button>
      </div>
    );
  }

  const periodData = summary[period];
  const allRevenue = Number.parseFloat(summary.all.revenue) || 1;
  const selectedRevenue = Number.parseFloat(periodData.revenue) || 0;
  const selectedTax = Number.parseFloat(periodData.tax) || 0;
  const outstanding = Number.parseFloat(summary.outstanding) || 0;
  const efficiency = Math.max(
    0,
    Math.min(100, 100 - (outstanding / allRevenue) * 100),
  );
  const topProducts = [...summary.topProducts]
    .sort(
      (left, right) =>
        Number.parseFloat(right.revenue) - Number.parseFloat(left.revenue),
    )
    .slice(0, 4);
  const recentMovements = summary.recentMovements.slice(0, 4);
  const recentSales = summary.recentSales.slice(0, 7);
  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const statusTone = (status: Sale["paymentStatus"]) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-500/10 text-emerald-700";
      case "PARTIALLY_PAID":
        return "bg-amber-500/10 text-amber-700";
      default:
        return "bg-rose-500/10 text-rose-700";
    }
  };

  const periodButtonClass = (key: Period) =>
    `rounded-full px-4 py-2 text-xs font-medium transition ${
      period === key
        ? "bg-secondary text-white shadow-sm"
        : "text-secondary/55 hover:text-secondary"
    }`;

  return (
    <div className="space-y-4 pb-2 md:space-y-5 px-5 md:pb-8 pt-4 w-full ">
      <div className="flex gap-2 overflow-x-auto rounded-full bg-black/5 p-1 md:hidden">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={periodButtonClass(key)}
          >
            {PERIOD_LABEL[key]}
          </button>
        ))}
      </div>

      <div className="hidden items-center justify-end gap-2 md:flex">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={periodButtonClass(key)}
          >
            {PERIOD_LABEL[key]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:hidden">
        <section className="rounded-[28px] bg-secondary p-4 text-white shadow-[0_24px_60px_rgba(8,15,23,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
                Sales overview
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                {formatMoney(periodData.revenue)}
              </h2>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Open performance details"
            >
              <MdArrowOutward className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] bg-white/6 p-3">
              <p className="text-[11px] text-white/50">Estimated tax</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {formatMoney(periodData.tax)}
              </p>
            </div>
            <div className="rounded-[20px] bg-white/6 p-3">
              <p className="text-[11px] text-white/50">Completed bookings</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {periodData.count} sale{periodData.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-[11px] text-white/45">
              <span>Balance efficiency</span>
              <span>{Math.round(efficiency)}%</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <DonutMeter value={efficiency} dark />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/70">
                  {formatMoney(summary.outstanding)} pending
                </p>
                <p className="mt-1 text-xs text-white/45">
                  Completed, pending payoff
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] bg-white/8 px-4 py-3">
            <div>
              <p className="text-[11px] text-white/45">Unpaid orders</p>
              <p className="text-sm font-semibold text-white">
                {formatMoney(summary.outstanding)}
              </p>
            </div>
            <Link
              href="/operations"
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-secondary transition hover:brightness-95"
            >
              Collect
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <section className="rounded-[24px] bg-card p-4 shadow-[0_18px_40px_rgba(8,15,23,0.08)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-secondary/45">Orders</p>
              <MdArrowOutward className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-secondary">
              {formatMoney(summary.outstanding)}
            </p>
            <p className="mt-2 text-xs text-secondary/45">Unpaid balance</p>
          </section>

          <section className="rounded-[24px] bg-card p-4 shadow-[0_18px_40px_rgba(8,15,23,0.08)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-secondary/45">Inventory</p>
              <MdInventory2 className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-secondary">
              {summary.lowStock + summary.outOfStock}
            </p>
            <p className="mt-2 text-xs text-secondary/45">
              Low {summary.lowStock} · Out {summary.outOfStock}
            </p>
          </section>
        </div>

        <section className="rounded-[24px] bg-card p-4 shadow-[0_18px_40px_rgba(8,15,23,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-secondary">
                Top Selling Products
              </h3>
              <p className="mt-1 text-xs text-secondary/45">
                Highest revenue items from the dashboard summary
              </p>
            </div>
            <span className="rounded-full bg-secondary/5 px-3 py-1 text-[11px] font-medium text-secondary/55">
              Top 4
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center gap-3 rounded-[18px] border border-black/5 bg-white px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/5 text-[11px] font-semibold text-secondary">
                    #{String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-secondary">
                      {product.productName}
                    </p>
                    <p className="truncate text-[11px] text-secondary/45">
                      SKU: {product.sku} · {product.quantity} units
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-secondary">
                    {formatMoney(product.revenue)}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                title="No top products yet"
                svgName="sale.svg"
                description="Once sales are completed, the best-selling products will appear here automatically."
                action={{ href: "/products/new", label: "Add a product" }}
              />
            )}
          </div>
        </section>

        <section className="rounded-[24px] bg-card p-4 shadow-[0_18px_40px_rgba(8,15,23,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-secondary">
                Recent Sales
              </h3>
              <p className="mt-1 text-xs text-secondary/45">
                Completed and pending transactions from the dashboard summary
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-secondary/5 px-3 py-1 text-[11px] font-medium text-secondary/55"
            >
              Filter <MdFilterList className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-[18px] border border-black/5 bg-white px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-secondary">
                        {sale.saleNumber}
                      </p>
                      <p className="mt-1 text-[11px] text-secondary/45">
                        {formatDate(sale.createdAt)} ·{" "}
                        {sale.items[0]?.productName ?? "Item"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-secondary">
                        {formatMoney(sale.total)}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusTone(sale.paymentStatus)}`}
                      >
                        {sale.paymentStatus.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                svgName="sale.svg"
                title="No completed sales yet"
                description="Completed sales will appear here once a draft sale is finalized."
                action={{ href: "/operations", label: "Create a sale" }}
              />
            )}
          </div>

          <Link
            href="/operations"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-3 text-sm font-medium text-white transition hover:bg-secondary/90"
          >
            View all transactions <MdChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <div className="hidden gap-4 md:grid lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          <section className="rounded-[28px] bg-secondary p-4 text-white shadow-[0_24px_60px_rgba(8,15,23,0.24)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
                  Update
                </p>
                <h3 className="mt-3 text-[18px] font-semibold tracking-tight">
                  Inventory at a glance
                </h3>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                aria-label="Open inventory update"
              >
                <MdArrowOutward className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-secondary shadow-sm">
                  <MdShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-white/50">
                    {PERIOD_LABEL[period]}
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">
                    {formatMoney(periodData.revenue)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[18px] bg-white/5 p-3">
                  <p className="text-[11px] text-white/45">Tax</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatMoney(periodData.tax)}
                  </p>
                </div>
                <div className="rounded-[18px] bg-white/5 p-3">
                  <p className="text-[11px] text-white/45">Completed</p>
                  <p className="mt-1 font-semibold text-white">
                    {periodData.count} sale{periodData.count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3 rounded-[18px] bg-black/20 px-3 py-3">
                <div>
                  <p className="text-[11px] text-white/45">Outstanding</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatMoney(summary.outstanding)}
                  </p>
                </div>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary">
                  {summary.lowStock} low stock
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] bg-card p-4 shadow-[0_18px_40px_rgba(8,15,23,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-secondary/45">Calendar</p>
                <h3 className="mt-1 text-lg font-semibold text-secondary">
                  {monthLabel}
                </h3>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-white transition hover:bg-secondary/90"
                aria-label="Add calendar item"
              >
                <MdAdd className="h-4.5 w-4.5" />
              </button>
            </div>
            <CalendarGrid />
          </section>

          <Link
            href="/products/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-secondary px-5 text-sm font-semibold text-white transition hover:bg-secondary/90"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-secondary">
              <MdAdd className="h-4 w-4" />
            </span>
            Add new product
          </Link>
        </div>

        <section className="min-w-0 rounded-[28px] bg-card p-4 shadow-[0_18px_40px_rgba(8,15,23,0.08)]">
          <div className="flex items-start justify-between gap-3 border-b border-black/5 pb-4">
            <div>
              <h3 className="text-[18px] font-semibold text-secondary">
                Recent Sales
              </h3>
              <p className="mt-1 text-xs text-secondary/45">
                Completed and pending transactions from the dashboard summary
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-secondary/45">
              <span className="rounded-full bg-secondary/5 px-2.5 py-1 text-secondary/80">
                {PERIOD_LABEL[period]}
              </span>
              <span>{summary.all.count} total sales</span>
              <span>{summary.lowStock} low stock</span>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[22px] border border-black/5 bg-white">
            <div className="grid grid-cols-[1.2fr_0.9fr_1fr_0.8fr] gap-3 border-b border-black/5 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-secondary/45">
              <span>Name</span>
              <span>Date</span>
              <span>Service</span>
              <span className="text-right">Amount</span>
            </div>

            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="grid grid-cols-[1.2fr_0.9fr_1fr_0.8fr] gap-3 border-b border-black/5 px-4 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-secondary">
                    {sale.saleNumber}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-secondary/45">
                    {sale.items.length} item{sale.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-sm text-secondary/70">
                  {formatDate(sale.createdAt)}
                </div>
                <div className="truncate text-sm text-secondary/70">
                  {sale.items[0]?.productName ?? "Service"}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-secondary">
                    {formatMoney(sale.total)}
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusTone(sale.paymentStatus)}`}
                  >
                    {sale.paymentStatus.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <div className="flex flex-col gap-3 p-8">
                <EmptyState
                  svgName="sale.svg"
                  title="No completed sales yet"
                  description="Completed sales will appear here once a draft sale is finalized."
                  action={{ href: "/operations", label: "Create a sale" }}
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-secondary/45">
              You can review recent sales and payment status in one place.
            </p>
            <Link
              href="/operations"
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-secondary/90"
            >
              View all transactions <MdChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-[24px] bg-card p-4 shadow-[0_18px_40px_rgba(8,15,23,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] text-secondary/45">Top products</p>
                <h3 className="mt-1 text-lg font-semibold text-secondary">
                  Best sellers
                </h3>
              </div>
              <MdTrendingUp className="mt-1 h-5 w-5 text-primary" />
            </div>

            <div className="mt-4 space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center gap-3 rounded-[18px] border border-black/5 bg-white px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/5 text-[11px] font-semibold text-secondary">
                    #{String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-secondary">
                      {product.productName}
                    </p>
                    <p className="truncate text-[11px] text-secondary/45">
                      SKU: {product.sku} · {product.quantity} units
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-secondary">
                    {formatMoney(product.revenue)}
                  </span>
                </div>
              ))}
              {topProducts.length === 0 && (
                <EmptyState
                  svgName="top-selling.svg"
                  title="No top products yet"
                  description="Once sales are completed, the best-selling products will appear here automatically."
                  action={{ href: "/products/new", label: "Add a product" }}
                />
              )}
            </div>
          </section>

          <section className="rounded-[24px] bg-secondary p-4 text-white shadow-[0_18px_40px_rgba(8,15,23,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Inventory movements
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  Recent stock changes
                </h3>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center">
              <DonutMeter
                value={efficiency}
                dark
                label={`${Math.round(efficiency)}%`}
              />
            </div>

            <div className="mt-5 space-y-3 rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/85">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/45">Low stock</span>
                <span className="font-semibold text-white">
                  {summary.lowStock}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/45">Out of stock</span>
                <span className="font-semibold text-white">
                  {summary.outOfStock}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/45">Outstanding balance</span>
                <span className="font-semibold text-white">
                  {formatMoney(summary.outstanding)}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {recentMovements.length > 0 ? (
                recentMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {movement.movementType.replace("_", " ")}
                        </p>
                        <p className="mt-1 text-[11px] text-white/45">
                          {movement.reason}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {movement.quantityBefore} → {movement.quantityAfter}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-5 text-center">
                  <Image
                    src={"/svgs/inventory.svg"}
                    alt="image"
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="mx-auto w-40 h-fit"
                  />
                  <p className="text-sm font-semibold text-white">
                    No stock movements yet
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/45">
                    Stock-in and adjustment activity will appear here once
                    inventory changes start.
                  </p>
                  <Link
                    href="/inventory"
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-secondary transition hover:brightness-95"
                  >
                    Open inventory
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DonutMeter({
  value,
  dark = false,
  label,
}: {
  value: number;
  dark?: boolean;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillColor = "var(--primary)";
  const trackColor = dark ? "rgba(255,255,255,0.12)" : "rgba(8,15,23,0.08)";

  return (
    <div
      className={`relative flex h-32 w-32 items-center justify-center rounded-full ${
        dark ? "bg-white/5" : "bg-primary/8"
      }`}
      style={{
        background: `conic-gradient(${fillColor} 0 ${clamped}%, ${trackColor} ${clamped}% 100%)`,
      }}
      aria-hidden="true"
    >
      <div
        className={`flex h-24 w-24 flex-col items-center justify-center rounded-full ${
          dark ? "bg-secondary text-white" : "bg-card text-secondary"
        }`}
      >
        <p
          className={`text-[10px] uppercase tracking-[0.18em] ${dark ? "text-white/45" : "text-secondary/45"}`}
        >
          {dark ? "Efficiency" : "Sales"}
        </p>
        <p className="mt-1 text-xl font-semibold tracking-tight">
          {label ?? `${Math.round(clamped)}%`}
        </p>
      </div>
    </div>
  );
}

function CalendarGrid() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(startWeekday).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="mt-4 rounded-[22px] bg-secondary p-4 text-white shadow-[0_18px_40px_rgba(8,15,23,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-white/45">{year}</p>
          <p className="mt-1 text-lg font-semibold">
            {today.toLocaleDateString("en-US", { month: "long" })}
          </p>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-secondary transition hover:bg-white/90"
        >
          <MdAdd className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-white/50">
        {weekdayLabels.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
        {cells.map((day, index) => (
          <span
            key={`${day ?? "blank"}-${index}`}
            className={`rounded-full py-1.5 ${
              day === today.getDate()
                ? "bg-primary font-semibold text-secondary"
                : "text-white/80"
            }`}
          >
            {day ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}
