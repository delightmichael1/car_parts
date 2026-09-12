"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { apiErrorMessage } from "@/lib/errors";
import { Keypad } from "@/components/pos/Keypad";
import { PaymentMethod, Sale } from "@/types/types";
import { MdPayments, MdFlashOn } from "react-icons/md";
import { AppModal } from "@/components/shared/AppModal";
import { SelectInput, TextInput } from "@/components/shared/FormFields";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { Chip } from "@heroui/react";
import { FiWifi, FiWifiOff } from "react-icons/fi";
import BluetoothPrintersModal from "../modals/BluetoothPrintersModal";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "ECOCASH",
  "BANK_TRANSFER",
  "CARD",
  "OTHER",
];

export function PaymentModal({
  sale,
  title = "Record payment",
  onClose,
  onPaid,
}: {
  sale: Sale;
  title?: string;
  onClose: () => void;
  onPaid: (
    amount: string,
    method: PaymentMethod,
    reference: string,
    notes: string,
  ) => Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(sale.balance);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

  const {
    printerConnected,
    connectedPrinterName,
    printTransactionReceipt,
    isPrinting,
  } = useThermalPrinter();

  const appendDigit = (digit: string) => {
    setError(null);
    setAmount((current) => {
      if (current === "0") return digit;
      const [, decimal] = current.split(".");
      if (decimal !== undefined && decimal.length >= 2) return current;
      const next = current === "" ? digit : current + digit;
      return next.length > 12 ? current : next;
    });
  };

  const toggleDecimal = () => {
    setError(null);
    setAmount((current) =>
      current.includes(".") ? current : current === "" ? "0." : current + ".",
    );
  };

  const backspace = () => {
    setError(null);
    setAmount((current) => current.slice(0, -1));
  };

  const clear = () => {
    setError(null);
    setAmount("");
  };

  const submit = async () => {
    const value = Number.parseFloat(amount);
    const balance = Number.parseFloat(sale.balance);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (value > balance + 0.0001) {
      setError("Amount exceeds the outstanding balance.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onPaid(amount, method, reference, notes);
      printTransactionReceipt({
        amount: value,
        clientId: sale.customerId ?? "",
        clientName: sale.customerName,
        currency: "usd",
        paymentMethod: method,
        status: sale.status,
        timestamp: new Date(),
        type: "sale",
      });
    } catch (error: unknown) {
      setError(apiErrorMessage(error, "Couldn't record the payment."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdPayments className="h-5 w-5" />}
      title={title}
      subtitle={`${sale.saleNumber} · ${formatMoney(sale.total)} · ${formatMoney(sale.balance)} outstanding`}
      size="md"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 p-4">
        <div className="min-w-0 flex-1 text-3xl font-bold tracking-tight text-secondary">
          {amount === "" ? "0.00" : formatMoney(amount)}
        </div>
        <button
          type="button"
          onClick={() => setAmount(sale.balance)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-secondary transition active:scale-95"
        >
          <MdFlashOn className="h-4 w-4" />
          Full balance
        </button>
      </div>

      <Keypad
        onDigit={appendDigit}
        onDecimal={toggleDecimal}
        onBackspace={backspace}
        onClear={clear}
        onSubmit={submit}
        submitLabel={
          isSubmitting ? "Recording…" : `Collect ${formatMoney(amount)} & Print`
        }
        allowDecimal
      />

      <div className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        <span>Printer</span>
        <button
          onClick={() => setPrinterModalOpen(true)}
          className="flex border-2 hover:border-primary items-center justify-between gap-4 px-4 py-4 rounded-xl border-white duration-300 bg-white"
        >
          <span>Status</span>
          <Chip
            size="sm"
            variant="soft"
            color={printerConnected ? "success" : "warning"}
            className="text-xs cursor-pointer"
          >
            {printerConnected ? <FiWifi size={10} /> : <FiWifiOff size={10} />}
            <span>
              {printerConnected
                ? (connectedPrinterName ?? "Connected")
                : "No Printer"}
            </span>
          </Chip>
        </button>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        Payment method
        <SelectInput
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((option) => (
            <option key={option} value={option}>
              {option.replace("_", " ")}
            </option>
          ))}
        </SelectInput>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        Reference (optional)
        <TextInput
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="e.g. ECO-123456"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
        Notes (optional)
        <TextInput
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. paid at the counter"
        />
      </label>

      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : null}
      <BluetoothPrintersModal
        isOpen={printerModalOpen}
        onOpenChange={() => setPrinterModalOpen(false)}
      />
    </AppModal>
  );
}
