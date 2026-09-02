// src/components/dashboard/DashboardHome.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Spinner, buttonVariants } from "@heroui/react";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { StatRing } from "./StatRing";
import { LowStockAlertCard } from "./LowStockAlertCard";
import { MiniCalendar } from "./MiniCalendar";
import { RecentSalesTable } from "./RecentSalesTable";
import { formatMoney } from "@/lib/format";

type Period = "today" | "month" | "all";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Today",
  month: "This month",
  all: "All time",
};

export default function DashboardHome() {
  const { summary, isLoading, error, refetch } = useDashboardSummary();
  const [period, setPeriod] = useState<Period>("month");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-foreground/60">
          {error ?? "Something went wrong."}
        </p>
        <Button variant="primary" onPress={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const periodData = summary[period];
  const allRevenue = Number.parseFloat(summary.all.revenue) || 1;
  const outstanding = Number.parseFloat(summary.outstanding) || 0;

  return (
    <div className="grid grid-cols-1 gap-4 py-4 lg:grid-cols-[280px_1fr_300px]">
      {/* Left column */}
      <div className="flex flex-col gap-4">
        <LowStockAlertCard
          lowStock={summary.lowStock}
          outOfStock={summary.outOfStock}
        />
        <MiniCalendar />
        <Link
          href="/products/new"
          className={
            buttonVariants({ variant: "primary" }) + " w-full justify-center"
          }
        >
          + Add new product
        </Link>
      </div>

      {/* Center column */}
      <Card className="min-w-0">
        <Card.Header className="flex-row items-center justify-between">
          <div>
            <Card.Title>Recent sales</Card.Title>
            <Card.Description>Your latest sales activity</Card.Description>
          </div>
          <div className="flex gap-1">
            {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={period === key ? "primary" : "tertiary"}
                onPress={() => setPeriod(key)}
              >
                {PERIOD_LABEL[key]}
              </Button>
            ))}
          </div>
        </Card.Header>
        <Card.Content>
          <RecentSalesTable sales={summary.recentSales} />
        </Card.Content>
        <Card.Footer>
          <Link
            href="/sales"
            className={buttonVariants({ variant: "tertiary" }) + " ml-auto"}
          >
            View all transactions
          </Link>
        </Card.Footer>
      </Card>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        <Card>
          <Card.Header>
            <Card.Title>Sales performance</Card.Title>
            <Card.Description>{PERIOD_LABEL[period]}</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            <StatRing
              label="Sales"
              value={Math.min(
                100,
                (periodData.count / (summary.all.count || 1)) * 100,
              )}
              amount={`${periodData.count} sale${periodData.count === 1 ? "" : "s"}`}
              color="accent"
            />
            <StatRing
              label="Revenue"
              value={Math.min(
                100,
                (Number.parseFloat(periodData.revenue) / allRevenue) * 100,
              )}
              amount={formatMoney(periodData.revenue)}
              color="success"
            />
            <StatRing
              label="Tax collected"
              value={Math.min(
                100,
                (Number.parseFloat(periodData.tax) /
                  (Number.parseFloat(periodData.revenue) || 1)) *
                  100,
              )}
              amount={formatMoney(periodData.tax)}
              color="warning"
            />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Outstanding balance</Card.Title>
            <Card.Description>Unpaid across completed sales</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col items-center gap-2">
            <StatRing
              label="Outstanding"
              value={Math.min(100, (outstanding / allRevenue) * 100)}
              amount={formatMoney(summary.outstanding)}
              color="danger"
            />
            <div className="mt-2 flex w-full justify-between text-xs text-foreground/60">
              <span>{summary.lowStock} low stock</span>
              <span>{summary.outOfStock} out of stock</span>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
