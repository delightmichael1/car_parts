"use client";

import { ReactNode, useMemo, useState } from "react";
import { MdDownload } from "react-icons/md";
import {
  DateField,
  DateRangePicker,
  Label,
  RangeCalendar,
} from "@heroui/react";
import type { DateValue } from "@internationalized/date";
import { parseDate } from "@internationalized/date";
import DashboardLayout from "@/layout/DashboardLayout";
import { OperationsPage } from "@/components/shared/OperationsPage";
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
} from "@/components/shared/PageState";
import { useApiResource } from "@/hooks/useApiResource";
import { downloadCSV } from "@/lib/csv";
import { formatDate, formatMoney } from "@/lib/format";
import {
  BalanceSheetResponse,
  CashbookResponse,
  DashboardProductSummary,
  InventoryReportResponse,
  JournalResponse,
  ProfitLossSummary,
  ProductsReportResponse,
  SalesRepsReportResponse,
  SalesReportResponse,
} from "@/types/types";

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const PRESETS: { label: string; from: () => string; to: () => string }[] = [
  {
    label: "Today",
    from: () => toISODate(new Date()),
    to: () => toISODate(new Date()),
  },
  {
    label: "7 days",
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return toISODate(d);
    },
    to: () => toISODate(new Date()),
  },
  {
    label: "30 days",
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return toISODate(d);
    },
    to: () => toISODate(new Date()),
  },
  {
    label: "90 days",
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 89);
      return toISODate(d);
    },
    to: () => toISODate(new Date()),
  },
  {
    label: "This month",
    from: () =>
      toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: () => toISODate(new Date()),
  },
  { label: "All time", from: () => "", to: () => "" },
];

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rangeKey = `${from}|${to}`;

  // DateRangePicker's `value` is { start: DateValue; end: DateValue } | null
  // (from @internationalized/date), while the rest of this page — query
  // params, rangeKey, CSV filenames, rangeLabel — all work off plain
  // "YYYY-MM-DD" strings. These two convert between the two without
  // touching anything downstream of `from`/`to`.
  const rangeValue = useMemo(() => {
    if (!from || !to) return null;
    try {
      return { start: parseDate(from), end: parseDate(to) };
    } catch {
      return null;
    }
  }, [from, to]);

  const handleRangeChange = (
    value: { start: DateValue; end: DateValue } | null,
  ) => {
    if (!value) {
      setFrom("");
      setTo("");
      return;
    }
    setFrom(value.start.toString());
    setTo(value.end.toString());
  };

  const { data, isLoading, error, refetch } = useApiResource(
    async (client, key) => {
      const [fromParam, toParam] = String(key ?? "|").split("|");
      const params = {
        from: fromParam || undefined,
        to: toParam || undefined,
      };
      const [
        sales,
        products,
        inventory,
        salesReps,
        pnl,
        cashbook,
        journal,
        balanceSheet,
      ] = await Promise.all([
        client.get<SalesReportResponse>("/reports/sales", { params }),
        client
          .get<ProductsReportResponse>("/reports/products", { params })
          .catch(() => null),
        client
          .get<InventoryReportResponse>("/reports/inventory")
          .catch(() => null),
        client
          .get<SalesRepsReportResponse>("/reports/sales-reps", { params })
          .catch(() => null),
        client
          .get<{
            summary: ProfitLossSummary;
          }>("/reports/profit-loss", { params })
          .catch(() => null),
        client
          .get<CashbookResponse>("/reports/cashbook", { params })
          .catch(() => null),
        client
          .get<JournalResponse>("/reports/journal", { params })
          .catch(() => null),
        client
          .get<BalanceSheetResponse>("/reports/balance-sheet", { params })
          .catch(() => null),
      ]);
      return {
        sales: sales.data.summary,
        products: products?.data?.products ?? [],
        inventory: inventory?.data?.summary ?? null,
        salesReps: salesReps?.data?.salesReps ?? [],
        pnl: pnl?.data?.summary ?? null,
        cashbook: cashbook?.data ?? null,
        journal: journal?.data ?? null,
        balanceSheet: balanceSheet?.data ?? null,
      };
    },
    () => "We couldn't load your reports right now.",
    rangeKey,
  );

  const rangeLabel = useMemo(() => {
    if (from && to)
      return `${formatDate(`${from}T00:00:00Z`)} – ${formatDate(`${to}T00:00:00Z`)}`;
    if (from) return `From ${formatDate(`${from}T00:00:00Z`)}`;
    if (to) return `Up to ${formatDate(`${to}T00:00:00Z`)}`;
    return "All time";
  }, [from, to]);

  return (
    <DashboardLayout>
      <OperationsPage
        title="Reports"
        description="Performance and financial statements, filtered to the period you need."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-3xl border border-black/5 bg-card p-4">
            <div className="flex flex-wrap items-end gap-3">
              <DateRangePicker
                aria-label="Report date range"
                className="w-72 "
                value={rangeValue}
                onChange={handleRangeChange}
              >
                <Label className="text-sm font-medium text-secondary">
                  Date range
                </Label>
                <DateField.Group
                  fullWidth
                  variant="secondary"
                  className="max-h-11 rounded-full"
                >
                  <DateField.Input slot="start">
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                  <DateRangePicker.RangeSeparator />
                  <DateField.Input slot="end">
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                  <DateField.Suffix>
                    <DateRangePicker.Trigger>
                      <DateRangePicker.TriggerIndicator />
                    </DateRangePicker.Trigger>
                  </DateField.Suffix>
                </DateField.Group>
                <DateRangePicker.Popover>
                  <RangeCalendar aria-label="Report date range">
                    <RangeCalendar.Header>
                      <RangeCalendar.YearPickerTrigger>
                        <RangeCalendar.YearPickerTriggerHeading />
                        <RangeCalendar.YearPickerTriggerIndicator />
                      </RangeCalendar.YearPickerTrigger>
                      <RangeCalendar.NavButton slot="previous" />
                      <RangeCalendar.NavButton slot="next" />
                    </RangeCalendar.Header>
                    <RangeCalendar.Grid>
                      <RangeCalendar.GridHeader>
                        {(day) => (
                          <RangeCalendar.HeaderCell>
                            {day}
                          </RangeCalendar.HeaderCell>
                        )}
                      </RangeCalendar.GridHeader>
                      <RangeCalendar.GridBody>
                        {(date) => <RangeCalendar.Cell date={date} />}
                      </RangeCalendar.GridBody>
                    </RangeCalendar.Grid>
                    <RangeCalendar.YearPickerGrid>
                      <RangeCalendar.YearPickerGridBody>
                        {({ year }) => (
                          <RangeCalendar.YearPickerCell year={year} />
                        )}
                      </RangeCalendar.YearPickerGridBody>
                    </RangeCalendar.YearPickerGrid>
                  </RangeCalendar>
                </DateRangePicker.Popover>
              </DateRangePicker>

              <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setFrom(preset.from());
                      setTo(preset.to());
                    }}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                      from === preset.from() && to === preset.to()
                        ? "bg-secondary text-white"
                        : "bg-black/5 text-secondary/60 hover:bg-black/10"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-secondary/45">
              Showing:{" "}
              <span className="font-semibold text-secondary">{rangeLabel}</span>
            </p>
          </div>

          {isLoading ? (
            <LoadingState label="Preparing reports…" />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Sales count"
                  value={String(data?.sales.count ?? 0)}
                  note="Completed sales"
                />
                <MetricCard
                  label="Revenue"
                  value={formatMoney(data?.sales.revenue)}
                  note="Completed only"
                />
                <MetricCard
                  label="Tax collected"
                  value={formatMoney(data?.sales.tax)}
                  note="Included in revenue"
                />
                <MetricCard
                  label="Discounts given"
                  value={formatMoney(data?.sales.discount)}
                  note="Across all sales"
                />
              </div>

              {data?.pnl ? (
                <ReportSection
                  title="Profit & Loss"
                  note={rangeLabel}
                  onDownload={() => downloadProfitLoss(data.pnl!, rangeLabel)}
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      label="Net sales"
                      value={formatMoney(data.pnl.sales)}
                      note={`${data.pnl.saleCount} sales`}
                    />
                    <MetricCard
                      label="Cost of goods sold"
                      value={formatMoney(data.pnl.cogs)}
                      note="Captured at sale time"
                    />
                    <MetricCard
                      label="Gross profit"
                      value={formatMoney(data.pnl.grossProfit)}
                      note="Sales − COGS"
                    />
                    <MetricCard
                      label="Net profit"
                      value={formatMoney(data.pnl.netProfit)}
                      note="No other expenses tracked"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MetricCard
                      label="Discounts"
                      value={formatMoney(data.pnl.discounts)}
                      note="Given in period"
                    />
                    <MetricCard
                      label="Tax collected"
                      value={formatMoney(data.pnl.tax)}
                      note="Passthrough"
                    />
                    <MetricCard
                      label="Total collected"
                      value={formatMoney(data.pnl.totalCollected)}
                      note="Sales + tax"
                    />
                  </div>
                </ReportSection>
              ) : null}

              {data?.inventory ? (
                <ReportSection title="Inventory" note="Current snapshot">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <MetricCard
                      label="Inventory value (cost)"
                      value={formatMoney(data.inventory.costValue)}
                      note={`${data.inventory.products} products`}
                    />
                    <MetricCard
                      label="Inventory value (retail)"
                      value={formatMoney(data.inventory.sellingValue)}
                      note={`${data.inventory.units} units`}
                    />
                    <MetricCard
                      label="Low / out of stock"
                      value={`${data.inventory.lowStock} / ${data.inventory.outOfStock}`}
                      note="Needs attention"
                    />
                  </div>
                </ReportSection>
              ) : null}

              <ReportSection
                title="Top products"
                note="By quantity sold"
                onDownload={() =>
                  downloadCSV(
                    `top-products-${rangeLabel}.csv`,
                    ["Product", "SKU", "Quantity", "Revenue"],
                    (data?.products ?? []).map((product) => [
                      product.productName,
                      product.sku,
                      product.quantity,
                      product.revenue,
                    ]),
                  )
                }
              >
                <DataTable
                  headers={["Product", "SKU", "Quantity", "Revenue"]}
                  empty={
                    <EmptyState
                      title="No sales yet"
                      description="Top products will appear here once sales are completed."
                    />
                  }
                  rows={(data?.products ?? []).map(
                    (product: DashboardProductSummary) => [
                      <span key="name" className="font-medium text-secondary">
                        {product.productName}
                      </span>,
                      <span key="sku" className="text-secondary/70">
                        {product.sku}
                      </span>,
                      <span key="qty" className="text-secondary/70">
                        {product.quantity}
                      </span>,
                      <span
                        key="revenue"
                        className="font-semibold text-secondary"
                      >
                        {formatMoney(product.revenue)}
                      </span>,
                    ],
                  )}
                />
              </ReportSection>

              <ReportSection
                title="Sales by representative"
                note="Completed sales"
                onDownload={() =>
                  downloadCSV(
                    `sales-by-rep-${rangeLabel}.csv`,
                    ["Representative", "Sales", "Revenue"],
                    (data?.salesReps ?? []).map((rep) => [
                      rep.repName || "—",
                      rep.count,
                      rep.revenue,
                    ]),
                  )
                }
              >
                <DataTable
                  headers={["Representative", "Sales", "Revenue"]}
                  empty={
                    <EmptyState
                      title="No rep sales in this period"
                      description="Once sales are completed, each rep's totals appear here."
                    />
                  }
                  rows={(data?.salesReps ?? []).map((rep) => [
                    <span key="name" className="font-medium text-secondary">
                      {rep.repName || "—"}
                    </span>,
                    <span key="count" className="text-secondary/70">
                      {rep.count}
                    </span>,
                    <span
                      key="revenue"
                      className="font-semibold text-secondary"
                    >
                      {formatMoney(rep.revenue)}
                    </span>,
                  ])}
                />
              </ReportSection>

              {data?.cashbook ? (
                <ReportSection
                  title="Cash receipts book"
                  note={rangeLabel}
                  onDownload={() =>
                    downloadCashbook(data.cashbook!, rangeLabel)
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      label="Opening balance"
                      value={formatMoney(data.cashbook.openingBalance)}
                      note="Before period"
                    />
                    <MetricCard
                      label="Received"
                      value={formatMoney(data.cashbook.totalIn)}
                      note="Money in"
                    />
                    <MetricCard
                      label="Paid out"
                      value={formatMoney(data.cashbook.totalOut)}
                      note="No expenses tracked"
                    />
                    <MetricCard
                      label="Closing balance"
                      value={formatMoney(data.cashbook.closingBalance)}
                      note="End of period"
                    />
                  </div>
                  <DataTable
                    headers={[
                      "Date",
                      "Invoice",
                      "Customer",
                      "Method",
                      "Reference",
                      "Amount",
                      "Balance",
                    ]}
                    empty={
                      <EmptyState
                        title="No receipts in this period"
                        description="Payments received will appear here."
                      />
                    }
                    rows={data.cashbook.entries.map((entry) => [
                      <span key="date" className="text-secondary/70">
                        {formatDate(entry.date)}
                      </span>,
                      <span key="inv" className="font-medium text-secondary">
                        {entry.saleNumber || "—"}
                      </span>,
                      <span key="cust" className="text-secondary/70">
                        {entry.customerName || "—"}
                      </span>,
                      <span key="method" className="text-secondary/70">
                        {entry.method || "—"}
                      </span>,
                      <span key="ref" className="text-secondary/70">
                        {entry.reference || "—"}
                      </span>,
                      <span key="amt" className="font-semibold text-secondary">
                        {formatMoney(entry.amount)}
                      </span>,
                      <span key="bal" className="text-secondary/70">
                        {formatMoney(entry.runningBalance)}
                      </span>,
                    ])}
                  />
                  {data.cashbook.truncated ? (
                    <p className="text-xs text-amber-700">
                      Showing the latest {data.cashbook.entries.length} receipts
                      — download the CSV for the full view.
                    </p>
                  ) : null}
                </ReportSection>
              ) : null}

              {data?.journal ? (
                <ReportSection
                  title="General journal"
                  note={rangeLabel}
                  onDownload={() => downloadJournal(data.journal!, rangeLabel)}
                >
                  <DataTable
                    headers={[
                      "Date",
                      "Type",
                      "Reference",
                      "Account",
                      "Debit",
                      "Credit",
                    ]}
                    empty={
                      <EmptyState
                        title="No entries in this period"
                        description="Sales and payments will post journal entries here."
                      />
                    }
                    rows={data.journal.entries.map((entry) => [
                      <span key="date" className="text-secondary/70">
                        {formatDate(entry.date)}
                      </span>,
                      <span key="type" className="text-secondary/70">
                        {entry.type}
                      </span>,
                      <span key="ref" className="font-medium text-secondary">
                        {entry.reference}
                      </span>,
                      <span key="account" className="text-secondary/70">
                        {entry.account}
                      </span>,
                      <span
                        key="debit"
                        className="font-semibold text-secondary"
                      >
                        {entry.debit && entry.debit !== "0"
                          ? formatMoney(entry.debit)
                          : ""}
                      </span>,
                      <span
                        key="credit"
                        className="font-semibold text-secondary"
                      >
                        {entry.credit && entry.credit !== "0"
                          ? formatMoney(entry.credit)
                          : ""}
                      </span>,
                    ])}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      label="Total debits"
                      value={formatMoney(data.journal.totalDebit)}
                      note="Must equal credits"
                    />
                    <MetricCard
                      label="Total credits"
                      value={formatMoney(data.journal.totalCredit)}
                      note="Balanced"
                    />
                  </div>
                  {data.journal.truncated ? (
                    <p className="text-xs text-amber-700">
                      Entries truncated for display — download the CSV for the
                      full journal.
                    </p>
                  ) : null}
                </ReportSection>
              ) : null}

              {data?.balanceSheet ? (
                <ReportSection
                  title="Balance sheet"
                  note={`As of ${formatDate(data.balanceSheet.asOf)}`}
                  onDownload={() =>
                    downloadBalanceSheet(data.balanceSheet!, rangeLabel)
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <MetricCard
                      label="Cash"
                      value={formatMoney(data.balanceSheet.cash)}
                      note="Cumulative receipts"
                    />
                    <MetricCard
                      label="Inventory"
                      value={formatMoney(data.balanceSheet.inventory)}
                      note="At cost"
                    />
                    <MetricCard
                      label="Accounts receivable"
                      value={formatMoney(data.balanceSheet.accountsReceivable)}
                      note="Outstanding on sales"
                    />
                    <MetricCard
                      label="Tax payable"
                      value={formatMoney(data.balanceSheet.taxPayable)}
                      note="Collected, not remitted"
                    />
                    <MetricCard
                      label="Retained earnings"
                      value={formatMoney(data.balanceSheet.retainedEarnings)}
                      note="Balancing figure"
                    />
                    <MetricCard
                      label="Total assets"
                      value={formatMoney(data.balanceSheet.totalAssets)}
                      note="Cash + inventory + AR"
                    />
                  </div>
                </ReportSection>
              ) : null}
            </div>
          )}
        </div>
      </OperationsPage>
    </DashboardLayout>
  );
}

function ReportSection({
  title,
  note,
  onDownload,
  children,
}: {
  title: string;
  note: string;
  onDownload?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-secondary">{title}</h2>
          <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-medium text-secondary/55">
            {note}
          </span>
        </div>
        {onDownload ? (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-secondary/90"
          >
            <MdDownload className="h-3.5 w-3.5" />
            Download
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function downloadProfitLoss(pnl: ProfitLossSummary, range: string) {
  downloadCSV(
    `profit-loss-${range}.csv`,
    ["Metric", "Value"],
    [
      ["Net sales", pnl.sales],
      ["Discounts", pnl.discounts],
      ["Tax collected", pnl.tax],
      ["Cost of goods sold", pnl.cogs],
      ["Gross profit", pnl.grossProfit],
      ["Net profit", pnl.netProfit],
      ["Total collected", pnl.totalCollected],
      ["Sale count", pnl.saleCount],
    ],
  );
}

function downloadCashbook(cashbook: CashbookResponse, range: string) {
  downloadCSV(
    `cashbook-${range}.csv`,
    [
      "Date",
      "Invoice",
      "Customer",
      "Method",
      "Reference",
      "Amount",
      "Running balance",
    ],
    [
      ...cashbook.entries.map((entry) => [
        entry.date,
        entry.saleNumber ?? "",
        entry.customerName ?? "",
        entry.method ?? "",
        entry.reference ?? "",
        entry.amount,
        entry.runningBalance,
      ]),
      [],
      ["Opening balance", "", "", "", "", cashbook.openingBalance, ""],
      ["Closing balance", "", "", "", "", cashbook.closingBalance, ""],
    ],
  );
}

function downloadJournal(journal: JournalResponse, range: string) {
  downloadCSV(
    `journal-${range}.csv`,
    ["Date", "Type", "Reference", "Account", "Debit", "Credit"],
    [
      ...journal.entries.map((entry) => [
        entry.date,
        entry.type,
        entry.reference,
        entry.account,
        entry.debit,
        entry.credit,
      ]),
      [],
      ["Totals", "", "", "", journal.totalDebit, journal.totalCredit],
    ],
  );
}

function downloadBalanceSheet(
  balanceSheet: BalanceSheetResponse,
  range: string,
) {
  downloadCSV(
    `balance-sheet-${range}.csv`,
    ["Account", "Amount"],
    [
      ["Cash", balanceSheet.cash],
      ["Inventory", balanceSheet.inventory],
      ["Accounts receivable", balanceSheet.accountsReceivable],
      ["Total assets", balanceSheet.totalAssets],
      ["Tax payable", balanceSheet.taxPayable],
      ["Retained earnings", balanceSheet.retainedEarnings],
      ["Total liabilities & equity", balanceSheet.totalLiabilitiesAndEquity],
    ],
  );
}
