"use client";

import { AppModal } from "./AppModal";
import { StatusBadge } from "./PageState";
import { MdReceiptLong } from "react-icons/md";
import { Customer, Sale } from "@/types/types";
import { formatDate, formatMoney } from "@/lib/format";
import { saleStatusTone, paymentTone } from "@/lib/status";

export function SaleDetailsModal({
  sale,
  customer,
  onClose,
  onComplete,
  onCancel,
  onRecordPayment,
}: {
  sale: Sale;
  customer?: Customer;
  onClose: () => void;
  onComplete?: (sale: Sale) => void;
  onCancel?: (sale: Sale) => void;
  onRecordPayment?: (sale: Sale) => void;
}) {
  const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdReceiptLong className="h-5 w-5" />}
      title={sale.saleNumber}
      subtitle={`${formatDate(sale.createdAt)} · ${totalItems} item${totalItems === 1 ? "" : "s"}`}
      size="lg"
    >
      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={saleStatusTone(sale.status)}>
          {sale.status}
        </StatusBadge>
        <StatusBadge tone={paymentTone(sale.paymentStatus)}>
          {sale.paymentStatus.replace("_", " ")}
        </StatusBadge>
        {sale.quotationId ? (
          <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-medium text-secondary/55">
            From quotation
          </span>
        ) : null}
      </div>

      {/* Customer */}
      <div className="rounded-2xl bg-black/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary/45">
          Customer
        </p>
        {customer ? (
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="font-semibold text-secondary">{customer.name}</p>
            <p className="text-xs text-secondary/55">{customer.customerCode}</p>
            {customer.phone ? (
              <p className="text-xs text-secondary/55">{customer.phone}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-1.5 font-semibold text-secondary">
            Walk-in customer
          </p>
        )}
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary/45">
          Items
        </p>
        <div className="overflow-hidden rounded-2xl border border-black/5">
          {sale.items.map((item, index) => (
            <div
              key={`${item.productId}-${index}`}
              className={`flex items-start justify-between gap-3 px-4 py-3 ${
                index !== sale.items.length - 1 ? "border-b border-black/5" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-secondary">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-secondary/45">
                  {item.sku}
                  {item.partNumber ? ` · ${item.partNumber}` : ""}
                </p>
                <p className="mt-1 text-xs text-secondary/60">
                  {item.quantity} × {formatMoney(item.unitPrice)}
                  {Number.parseFloat(item.discount) > 0
                    ? ` − ${formatMoney(item.discount)} discount`
                    : ""}
                </p>
              </div>
              <p className="shrink-0 font-semibold text-secondary">
                {formatMoney(item.subtotal)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="flex flex-col gap-1.5 rounded-2xl bg-black/5 p-4 text-sm">
        <div className="flex items-center justify-between text-secondary/60">
          <span>Subtotal</span>
          <span>{formatMoney(sale.subtotal)}</span>
        </div>
        {Number.parseFloat(sale.discount) > 0 ? (
          <div className="flex items-center justify-between text-warning">
            <span>Discount</span>
            <span>− {formatMoney(sale.discount)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between text-secondary/60">
          <span>
            Tax ({(Number.parseFloat(sale.taxRate) * 100).toFixed(0)}%)
          </span>
          <span>{formatMoney(sale.tax)}</span>
        </div>
        <div className="my-1 h-px bg-black/10" />
        <div className="flex items-center justify-between text-base font-semibold text-secondary">
          <span>Total</span>
          <span>{formatMoney(sale.total)}</span>
        </div>
        {sale.status === "COMPLETED" ? (
          <>
            <div className="flex items-center justify-between text-secondary/60">
              <span>Amount paid</span>
              <span>{formatMoney(sale.amountPaid)}</span>
            </div>
            <div className="flex items-center justify-between font-medium text-secondary">
              <span>Balance due</span>
              <span>{formatMoney(sale.balance)}</span>
            </div>
          </>
        ) : null}
      </div>

      {sale.notes ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary/45">
            Notes
          </p>
          <p className="mt-1 text-sm text-secondary/70">{sale.notes}</p>
        </div>
      ) : null}

      {/* Contextual actions — same operations as the table row, so this
          modal can fully replace needing to close it and act from the list. */}
      {sale.status === "DRAFT" && (onComplete || onCancel) ? (
        <div className="flex gap-2">
          {onComplete ? (
            <button
              type="button"
              onClick={() => onComplete(sale)}
              className="flex-1 rounded-2xl bg-emerald-600/10 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-600/20"
            >
              Complete sale
            </button>
          ) : null}
          {onCancel ? (
            <button
              type="button"
              onClick={() => onCancel(sale)}
              className="flex-1 rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-secondary/60 transition hover:bg-black/10"
            >
              Cancel sale
            </button>
          ) : null}
        </div>
      ) : null}

      {sale.status === "COMPLETED" &&
      sale.paymentStatus !== "PAID" &&
      onRecordPayment ? (
        <button
          type="button"
          onClick={() => onRecordPayment(sale)}
          className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-secondary transition hover:brightness-95"
        >
          Record payment
        </button>
      ) : null}
    </AppModal>
  );
}
