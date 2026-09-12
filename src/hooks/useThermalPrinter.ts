/**
 * useThermalPrinter
 *
 * Focused hook for thermal printing POS receipts.
 * Supports:
 *  - Native Bluetooth via capacitor-thermal-printer (ESC/POS)
 *  - Desktop WebUSB via direct raw ESC/POS byte transfers
 *  - Web fallback: opens a 58 mm–styled print window
 */

import { useState } from "react";
import { toast } from "@heroui/react";
import { format } from "date-fns";
import useDashboardStore from "@/stores/useDashboardStore";
import { isWebUsbSupported, printToUsbDevice } from "@/lib/usbPrinter";
import {
  connectWebBluetoothPrinter,
  disconnectWebBluetoothPrinter,
  isWebBluetoothSupported,
  printToWebBluetooth,
} from "@/lib/bluetoothPrinter";
import {
  buildPOSReceiptBytes,
  buildTransactionReceiptBytes,
} from "@/lib/escpos";

// ─── Types ────────────────────────────────────────────────────────────────────

export type POSReceiptSale = {
  saleId: string;
  total: number;
  change: number;
  currency: string;
  paymentMethod: string;
  clientName?: string;
  timestamp: Date;
  amountTendered?: number;
  items: {
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    dosage?: string;
  }[];
};

export type TransactionReceiptData = {
  transactionId?: string;
  clientName: string;
  clientId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  type: string;
  status: string;
  comment?: string;
  timestamp: Date;
  orgName?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_WIDTH = 32; // 58 mm paper ≈ 32 chars at 12 cpi

const pad = (left: string, right: string, total = LINE_WIDTH): string => {
  const gap = Math.max(1, total - left.length - right.length);
  return left + " ".repeat(gap) + right;
};

const centre = (text: string, total = LINE_WIDTH): string => {
  const spaces = Math.max(0, Math.floor((total - text.length) / 2));
  return " ".repeat(spaces) + text;
};

const divider = (char = "-", count = LINE_WIDTH): string => char.repeat(count);

// ─── Web print helper ─────────────────────────────────────────────────────────

const openWebPrintWindow = (textLines: string[], title: string) => {
  const escaped = textLines
    .map((l) =>
      l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Courier New", Courier, monospace;
      font-size: 11px;
      line-height: 1.45;
      background: #fff;
      color: #000;
      padding: 8px;
      width: 58mm;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-all;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 4mm; size: 58mm auto; }
    }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); window.close(); }, 300);
    };
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=300,height=600");
  if (w) {
    w.document.write(html);
    w.document.close();
  } else {
    toast.warning("Pop-up blocked", {
      description: "Allow pop-ups for this site to use browser printing.",
    });
  }
};

// ─── Receipt builders ─────────────────────────────────────────────────────────

const buildPOSReceiptLines = (
  sale: POSReceiptSale,
  orgName: string,
): string[] => {
  const lines: string[] = [];

  lines.push(divider("="));
  lines.push(centre(orgName));
  lines.push(centre("Point of Sale Receipt"));
  lines.push(divider("="));
  lines.push(format(sale.timestamp, "dd MMM yyyy · HH:mm"));

  if (sale.clientName) {
    lines.push(`Client: ${sale.clientName}`);
  }

  lines.push(divider("-"));

  for (const item of sale.items) {
    lines.push(item.itemName);
    const qty = `  ${item.quantity} x ${sale.currency} ${item.unitPrice.toFixed(
      2,
    )}`;
    const total = `${sale.currency} ${item.total.toFixed(2)}`;
    lines.push(pad(qty, total));
  }

  lines.push(divider("-"));
  lines.push(pad("TOTAL", `${sale.currency} ${sale.total.toFixed(2)}`));

  if (sale.paymentMethod === "cash") {
    const tendered = sale.amountTendered ?? sale.total + sale.change;
    lines.push(pad("Tendered", `${sale.currency} ${tendered.toFixed(2)}`));
    lines.push(pad("Change", `${sale.currency} ${sale.change.toFixed(2)}`));
  }

  const methodLabel =
    sale.paymentMethod === "medical_aid"
      ? "Medical Aid"
      : sale.paymentMethod.charAt(0).toUpperCase() +
        sale.paymentMethod.slice(1);

  lines.push(`Payment: ${methodLabel}`);

  lines.push(divider("-"));
  lines.push(`Ref: #${sale.saleId.slice(-8).toUpperCase()}`);
  lines.push(divider("="));
  lines.push(centre("Thank you for your business!"));
  lines.push(divider("="));
  lines.push("");

  return lines;
};

const buildTransactionReceiptLines = (
  data: TransactionReceiptData,
): string[] => {
  const lines: string[] = [];

  lines.push(divider("="));
  lines.push(centre(data.orgName ?? "Automotive Parts"));
  lines.push(centre("Payment Receipt"));
  lines.push(divider("="));
  lines.push(format(data.timestamp, "dd MMM yyyy · HH:mm"));
  if (data.clientName) {
    lines.push(divider("-"));
    lines.push(`Client : ${data.clientName}`);
    lines.push(`ID      : ${data.clientId}`);
  }
  lines.push(divider("-"));
  lines.push(pad("Type", data.type));
  lines.push(pad("Method", data.paymentMethod.replace("_", " ").toUpperCase()));
  lines.push(pad("Status", data.status.toUpperCase()));
  lines.push(divider("-"));
  lines.push(
    pad(
      "AMOUNT",
      `${data.currency.toUpperCase()} ${Number(data.amount).toFixed(2)}`,
    ),
  );

  if (data.comment) {
    lines.push(divider("-"));
    lines.push(`Note: ${data.comment}`);
  }

  lines.push(divider("-"));

  if (data.transactionId) {
    lines.push(`Ref: #${data.transactionId.slice(-8).toUpperCase()}`);
  }

  lines.push(divider("="));
  lines.push(centre("Thank you!"));
  lines.push(divider("="));
  lines.push("");

  return lines;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useThermalPrinter = () => {
  const [isPrinting, setIsPrinting] = useState(false);

  const connectedUsbPrinter = useDashboardStore((s) => s.connectedUsbPrinter);
  const connectedPrinter = useDashboardStore((s) => s.connectedPrinter);
  const connectedWebBluetoothPrinter = useDashboardStore(
    (s) => s.connectedWebBluetoothPrinter,
  );
  const isPrinterConnected = useDashboardStore((s) => s.isPrinterConneted);

  const connectedPrinterName =
    connectedUsbPrinter?.productName ||
    connectedWebBluetoothPrinter?.name ||
    connectedPrinter?.name ||
    null;

  const printerConnected =
    (isPrinterConnected && !!connectedPrinter) ||
    !!connectedUsbPrinter ||
    !!connectedWebBluetoothPrinter;

  const printerType = connectedUsbPrinter
    ? "usb"
    : connectedWebBluetoothPrinter
      ? "bluetooth"
      : connectedPrinter
        ? "bluetooth"
        : null;

  // ── Warn if no printer ───────────────────────────────────────────────────
  const warnNoPrinter = () => {
    toast.warning("No printer connected", {
      description:
        "Open the Printer menu to connect a Bluetooth or USB thermal printer.",
    });
  };

  // ── Connect USB printer ──────────────────────────────────────────────────
  const connectUsbPrinter = async () => {
    if (!isWebUsbSupported()) {
      toast.danger("Not supported", {
        description:
          "WebUSB is not supported in this browser (use Chrome or Edge).",
      });
      return;
    }
    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      await device.open();
      if (!device.configuration) {
        await device.selectConfiguration(1);
      }
      useDashboardStore.setState((state) => {
        state.connectedUsbPrinter = device;
        state.isPrinterConneted = true;
      });
      toast.success("USB Printer Connected", {
        description: `Connected to ${device.productName || "USB Printer"}`,
      });
    } catch (err: any) {
      console.log("[useThermalPrinter] connectUsbPrinter error:", err);
      toast.danger("Connection Failed", {
        description: err?.message || "Failed to connect to USB printer.",
      });
    }
  };

  // ── Disconnect USB printer ───────────────────────────────────────────────
  const disconnectUsbPrinter = async () => {
    if (connectedUsbPrinter) {
      try {
        await connectedUsbPrinter.close();
      } catch (e) {}
    }
    useDashboardStore.setState((state) => {
      state.connectedUsbPrinter = undefined;
      if (!state.connectedPrinter) {
        state.isPrinterConneted = false;
      }
    });
    toast.warning("Printer Disconnected", {
      description: "USB printer disconnected successfully.",
    });
  };

  // ── Connect Web Bluetooth printer ────────────────────────────────────────
  const connectWebBluetooth = async () => {
    if (!isWebBluetoothSupported()) {
      toast.danger("Not supported", {
        description:
          "Web Bluetooth is not supported in this browser (use Chrome or Edge).",
      });
      return;
    }
    try {
      const printer = await connectWebBluetoothPrinter();
      useDashboardStore.setState((state) => {
        state.connectedWebBluetoothPrinter = printer;
        state.isPrinterConneted = true;
      });
      toast.success("Bluetooth printer connected", {
        description: `Connected to ${printer.name}.`,
      });
    } catch (err) {
      console.log("[useThermalPrinter] connectWebBluetooth error:", err);
      toast.danger("Connection failed", {
        description:
          err instanceof Error
            ? err.message
            : "Failed to connect to the Bluetooth printer.",
      });
    }
  };

  // ── Disconnect Web Bluetooth printer ─────────────────────────────────────
  const disconnectWebBluetooth = () => {
    if (connectedWebBluetoothPrinter) {
      disconnectWebBluetoothPrinter(connectedWebBluetoothPrinter);
    }
    useDashboardStore.setState((state) => {
      state.connectedWebBluetoothPrinter = undefined;
      if (!state.connectedPrinter && !state.connectedUsbPrinter) {
        state.isPrinterConneted = false;
      }
    });
    toast.warning("Printer disconnected", {
      description: "Bluetooth printer disconnected.",
    });
  };

  // ── Print POS receipt ────────────────────────────────────────────────────
  const printPOSReceipt = async (sale: POSReceiptSale, orgName?: string) => {
    setIsPrinting(true);
    const name = orgName ?? "Pharmacy / Clinic";
    const lines = buildPOSReceiptLines(sale, name);

    try {
      const isNative =
        typeof window !== "undefined" && window.Capacitor?.isNativePlatform();

      if (isNative) {
        if (!printerConnected || printerType !== "bluetooth") {
          warnNoPrinter();
          return;
        }

        const { CapacitorThermalPrinter } =
          await import("capacitor-thermal-printer");

        let builder = CapacitorThermalPrinter.begin()
          .align("center")
          .bold()
          .text(`${name}\n`)
          .clearFormatting()
          .text("Point of Sale Receipt\n")
          .text(`${divider("=")}\n`)
          .align("left")
          .text(`${format(sale.timestamp, "dd MMM yyyy · HH:mm")}\n`);

        if (sale.clientName) {
          builder = builder.text(`Client: ${sale.clientName}\n`);
        }

        builder = builder.text(`${divider("-")}\n`);

        for (const item of sale.items) {
          builder = builder
            .text(`${item.itemName}\n`)
            .text(
              `  ${item.quantity} x ${sale.currency} ${item.unitPrice.toFixed(
                2,
              )}`.padEnd(LINE_WIDTH - 8) +
                `${sale.currency} ${item.total.toFixed(2)}\n`,
            );
        }

        builder = builder
          .text(`${divider("-")}\n`)
          .bold()
          .text(
            pad("TOTAL", `${sale.currency} ${sale.total.toFixed(2)}`).padEnd(
              LINE_WIDTH,
            ) + "\n",
          )
          .clearFormatting();

        if (sale.paymentMethod === "cash") {
          const tendered = sale.amountTendered ?? sale.total + sale.change;
          builder = builder
            .text(
              pad("Tendered", `${sale.currency} ${tendered.toFixed(2)}`).padEnd(
                LINE_WIDTH,
              ) + "\n",
            )
            .text(
              pad(
                "Change",
                `${sale.currency} ${sale.change.toFixed(2)}`,
              ).padEnd(LINE_WIDTH) + "\n",
            );
        }

        const methodLabel =
          sale.paymentMethod === "medical_aid"
            ? "Medical Aid"
            : sale.paymentMethod.charAt(0).toUpperCase() +
              sale.paymentMethod.slice(1);

        builder = builder.text(`Payment: ${methodLabel}\n`);

        builder = builder
          .text(`${divider("-")}\n`)
          .text(`Ref: #${sale.saleId.slice(-8).toUpperCase()}\n`)
          .text(`${divider("=")}\n`)
          .align("center")
          .text("Thank you for your business!\n")
          .text(`${divider("=")}\n`)
          .cutPaper();

        await builder.write();

        toast.success("Receipt printed", {
          description: `Sent to Bluetooth printer: ${connectedPrinterName}`,
        });
      } else if (connectedWebBluetoothPrinter) {
        // Web Bluetooth (BLE) printing
        const bytes = buildPOSReceiptBytes({
          saleId: sale.saleId,
          orgName: name,
          clientName: sale.clientName,
          timestamp: sale.timestamp,
          items: sale.items.map((i) => ({
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
          total: sale.total,
          change: sale.change,
          amountTendered: sale.amountTendered,
          paymentMethod: sale.paymentMethod,
          currency: sale.currency,
        });

        await printToWebBluetooth(connectedWebBluetoothPrinter, bytes);

        toast.success("Receipt printed", {
          description: `Sent to Bluetooth printer: ${connectedPrinterName}`,
        });
      } else if (connectedUsbPrinter) {
        // Desktop WebUSB printing
        const bytes = buildPOSReceiptBytes({
          saleId: sale.saleId,
          orgName: name,
          clientName: sale.clientName,
          timestamp: sale.timestamp,
          items: sale.items.map((i) => ({
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
          total: sale.total,
          change: sale.change,
          amountTendered: sale.amountTendered,
          paymentMethod: sale.paymentMethod,
          currency: sale.currency,
        });

        await printToUsbDevice(connectedUsbPrinter, bytes);

        toast.success("Receipt printed", {
          description: `Sent to USB printer: ${connectedPrinterName}`,
        });
      } else {
        // Fallback print window
        openWebPrintWindow(lines, "POS Receipt");
        toast.success("Print dialog opened", {
          description: "Select your printer from the dialog",
        });
      }
    } catch (err: any) {
      console.log("[useThermalPrinter] printPOSReceipt error:", err);
      openWebPrintWindow(lines, "POS Receipt");
      toast.danger("Printer error — using browser print", {
        description:
          err?.message ?? "Please select your printer from the dialog",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // ── Print transaction receipt ─────────────────────────────────────────────
  const printTransactionReceipt = async (data: TransactionReceiptData) => {
    setIsPrinting(true);
    const lines = buildTransactionReceiptLines(data);

    try {
      const isNative =
        typeof window !== "undefined" && window.Capacitor?.isNativePlatform();

      if (isNative) {
        if (!printerConnected || printerType !== "bluetooth") {
          warnNoPrinter();
          return;
        }

        const { CapacitorThermalPrinter } =
          await import("capacitor-thermal-printer");

        let builder = CapacitorThermalPrinter.begin()
          .align("center")
          .bold()
          .text(`${data.orgName ?? "Automotive Parts"}\n`)
          .clearFormatting()
          .text("Payment Receipt\n")
          .text(`${divider("=")}\n`)
          .align("left")
          .text(`${format(data.timestamp, "dd MMM yyyy · HH:mm")}\n`)
          .text(data.clientName ? `${divider("-")}\n` : "")
          .text(data.clientName ? `Client : ${data.clientName}\n` : "")
          .text(data.clientName ? `ID      : ${data.clientId}\n` : "")
          .text(`${divider("-")}\n`)
          .text(pad("Type", data.type) + "\n")
          .text(
            pad("Method", data.paymentMethod.replace("_", " ").toUpperCase()) +
              "\n",
          )
          .text(pad("Status", data.status.toUpperCase()) + "\n")
          .text(`${divider("-")}\n`)
          .bold()
          .text(
            pad(
              "AMOUNT",
              `${data.currency.toUpperCase()} ${Number(data.amount).toFixed(
                2,
              )}`,
            ) + "\n",
          )
          .clearFormatting();

        if (data.comment) {
          builder = builder
            .text(`${divider("-")}\n`)
            .text(`Note: ${data.comment}\n`);
        }

        builder = builder.text(`${divider("-")}\n`);

        if (data.transactionId) {
          builder = builder.text(
            `Ref: #${data.transactionId.slice(-8).toUpperCase()}\n`,
          );
        }

        builder = builder
          .text(`${divider("=")}\n`)
          .align("center")
          .text("Thank you!\n")
          .text(`${divider("=")}\n`)
          .cutPaper();

        await builder.write();

        toast.success("Receipt printed", {
          description: `Sent to Bluetooth printer: ${connectedPrinterName}`,
        });
      } else if (connectedWebBluetoothPrinter) {
        // Web Bluetooth (BLE) printing
        const bytes = buildTransactionReceiptBytes({
          transactionId: data.transactionId,
          orgName: data.orgName ?? "Automotive Parts",
          clientName: data.clientName,
          clientId: data.clientId,
          amount: data.amount,
          currency: data.currency,
          paymentMethod: data.paymentMethod,
          type: data.type,
          status: data.status,
          comment: data.comment,
          timestamp: data.timestamp,
        });

        await printToWebBluetooth(connectedWebBluetoothPrinter, bytes);

        toast.success("Receipt printed", {
          description: `Sent to Bluetooth printer: ${connectedPrinterName}`,
        });
      } else if (connectedUsbPrinter) {
        // Desktop WebUSB printing
        const bytes = buildTransactionReceiptBytes({
          transactionId: data.transactionId,
          orgName: data.orgName ?? "Automotive Parts",
          clientName: data.clientName,
          clientId: data.clientId,
          amount: data.amount,
          currency: data.currency,
          paymentMethod: data.paymentMethod,
          type: data.type,
          status: data.status,
          comment: data.comment,
          timestamp: data.timestamp,
        });

        await printToUsbDevice(connectedUsbPrinter, bytes);

        toast.success("Receipt printed", {
          description: `Sent to USB printer: ${connectedPrinterName}`,
        });
      } else {
        openWebPrintWindow(lines, "Payment Receipt");
        toast.success("Print dialog opened", {
          description: "Select your printer from the dialog",
        });
      }
    } catch (err: any) {
      console.log("[useThermalPrinter] printTransactionReceipt error:", err);
      openWebPrintWindow(lines, "Payment Receipt");
      toast.warning("Printer error — using browser print", {
        description:
          err?.message ?? "Please select your printer from the dialog",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return {
    isPrinting,
    printerConnected,
    connectedPrinterName,
    printerType,
    connectedWebBluetoothPrinter,
    printPOSReceipt,
    printTransactionReceipt,
    connectUsbPrinter,
    disconnectUsbPrinter,
    connectWebBluetooth,
    disconnectWebBluetooth,
    warnNoPrinter,
  };
};
