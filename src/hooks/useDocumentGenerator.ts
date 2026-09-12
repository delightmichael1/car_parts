// hooks/useDocumentGenerator.ts
import { useState } from "react";
import { toast } from "@heroui/react";
import useDashboardStore from "@/stores/useDashboardStore";
import { Payment } from "@/types/types";
import { buildTransactionReceiptBytes } from "@/lib/escpos";
import { printToWebBluetooth } from "@/lib/bluetoothPrinter";
import { printToUsbDevice } from "@/lib/usbPrinter";

interface DocumentOptions {
  title?: string;
  logoUrl?: string;
  organizationName?: string;
  organizationAddress?: string;
  footer?: string;
}

// Capacitor imports (these will be available when running in Capacitor)
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => "ios" | "android" | "web";
    };
  }
}

export const useDocumentGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const bluetoothDevice = useDashboardStore((state) => state.connectedPrinter);
  const connectedWebBluetoothPrinter = useDashboardStore(
    (state) => state.connectedWebBluetoothPrinter,
  );
  const connectedUsbPrinter = useDashboardStore(
    (state) => state.connectedUsbPrinter,
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const generateReceiptHTML = (
    transaction: Payment,
    options: DocumentOptions = {},
  ) => {
    const {
      title = "Payment Receipt",
      logoUrl = "/images/logo.png",
      organizationName = "Automotive Parts",
      organizationAddress = "123 Healthcare St, Medical City, MC 12345",
      footer = "Thank you for your payment. Keep this receipt for your records.",
    } = options;
    const patient =
      typeof transaction.saleId === "object" ? transaction.saleId : null;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 20px;
          }
          
          .receipt {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          
          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
          }
          
          .organization-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          .organization-address {
            font-size: 14px;
            opacity: 0.9;
          }
          
          .content {
            padding: 30px;
          }
          
          .receipt-title {
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 30px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .transaction-summary {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
          }
          
          .amount {
            font-size: 48px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
          }
          
          .status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .status.completed {
            background: #d1fae5;
            color: #065f46;
          }
          
          .status.pending {
            background: #fef3c7;
            color: #92400e;
          }
          
          .status.failed {
            background: #fee2e2;
            color: #991b1b;
          }
          
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .detail-item {
            padding: 15px;
            background: #f9fafb;
            border-radius: 6px;
            border-left: 4px solid #667eea;
          }
          
          .detail-label {
            font-size: 12px;
            font-weight: bold;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }
          
          .detail-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          }
          
          .comment-section {
            background: #fffbeb;
            border: 1px solid #fed7aa;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .comment-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 10px;
          }
          
          .comment-text {
            color: #451a03;
            line-height: 1.6;
          }
          
          .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          
          .print-date {
            margin-top: 20px;
            font-size: 12px;
            color: #9ca3af;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            .receipt {
              border: none;
              box-shadow: none;
            }
          }
          
          @media (max-width: 600px) {
            .details-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="logo">
              ${organizationName.charAt(0)}
            </div>
            <div class="organization-name">${organizationName}</div>
            <div class="organization-address">${organizationAddress}</div>
          </div>
          
          <div class="content">
            <div class="receipt-title">${title}</div>
            
            <div class="transaction-summary">
              <div class="amount">${formatCurrency(Number(transaction.amount))}</div>
            </div>
            
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Transaction ID</div>
                <div class="detail-value">${transaction.id}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Transaction Date</div>
                <div class="detail-value">${formatDateTime(
                  transaction.createdAt,
                )}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Payment Method</div>
                <div class="detail-value">${transaction.paymentMethod.toUpperCase()}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Received by</div>
                <div class="detail-value">${transaction.receivedBy}</div>
              </div>
            </div>
            
            ${
              transaction.reference
                ? `
              <div class="comment-section">
                <div class="comment-title">Transaction Notes:</div>
                <div class="comment-text">${transaction.reference}</div>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="footer">
            <div>${footer}</div>
            <div class="print-date">
              Generated on ${new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Thermal printer function using capacitor-thermal-printer
  const printReceipt = async (
    transaction: Payment,
    options: DocumentOptions = {},
  ) => {
    const isNative = Boolean(window.Capacitor?.isNativePlatform());
    const hasThermalPrinter =
      Boolean(bluetoothDevice) ||
      Boolean(connectedWebBluetoothPrinter) ||
      Boolean(connectedUsbPrinter);

    // On native builds a printer must be selected; on web the browser dialog
    // is the fallback when no raw (BLE/USB) printer is connected.
    if (!hasThermalPrinter && isNative) {
      return toast.warning("Warning", {
        description: "Please select a printer first",
      });
    }
    setIsGenerating(true);

    try {
      // Check if running in Capacitor
      if (isNative) {
        // Import the capacitor-thermal-printer plugin
        const { CapacitorThermalPrinter } =
          await import("capacitor-thermal-printer");

        const {
          organizationName = "Automotive Parts",
          organizationAddress = "123 Healthcare St, Medical City, MC 12345",
          logoUrl = "/images/logo.png",
        } = options;

        try {
          // Build thermal receipt using fluent API
          await CapacitorThermalPrinter.begin()
            .align("center")

            // Organization logo (if provided)
            // .image(logoUrl) // Uncomment if you have a logo URL

            // Header
            .bold()
            .text(`${organizationName}\n`)
            .clearFormatting()
            .text(`${organizationAddress}\n`)
            .text("================================\n")

            // Title
            .bold()
            .underline()
            .doubleWidth()
            .text("PAYMENT RECEIPT\n")
            .clearFormatting()
            .text("================================\n")

            // Amount (large and centered)
            .doubleWidth()
            .bold()
            .text(`${formatCurrency(Number(transaction.amount))}\n`)
            .clearFormatting()

            .text("\n")

            // Transaction details (left aligned)
            .align("left")
            .text("--------------------------------\n")
            .text(`Transaction ID: ${transaction.id}\n`)
            .text(`Date: ${formatDateTime(transaction.createdAt)}\n`)
            .text(
              `Payment Method: ${transaction.paymentMethod.toUpperCase()}\n`,
            )
            .text(`Received by: ${transaction.receivedBy}\n`)

            // Footer
            .text("================================\n")
            .align("center")
            .text("Thank you for your payment!\n")
            .text("Keep this receipt for your records\n")
            .text("\n")
            .text(`Generated: ${new Date().toLocaleString()}\n`)

            // Optional QR code with transaction details
            .qr(
              `Transaction: ${transaction.id}, Amount: ${formatCurrency(
                Number(transaction.amount),
              )}`,
            )

            // Cut paper and print
            .cutPaper()
            .write();

          toast.success("Receipt Printed", {
            description: "Receipt sent to thermal printer successfully",
          });
        } catch (thermalError) {
          console.log("Thermal printing error:", thermalError);
          toast.warning("Printer Unavailable", {
            description: `Could not print the receipt, printer not available.`,
          });
        }
      } else if (connectedWebBluetoothPrinter || connectedUsbPrinter) {
        // Raw ESC/POS to a connected BLE or USB printer
        const bytes = buildTransactionReceiptBytes({
          transactionId: transaction.id,
          orgName: options.organizationName ?? "Automotive Parts",
          clientName: "",
          clientId: "",
          amount: Number(transaction.amount),
          currency: "USD",
          paymentMethod: transaction.paymentMethod,
          type: "Payment",
          status: "PAID",
          comment: transaction.reference,
          timestamp: new Date(transaction.createdAt),
        });

        if (connectedWebBluetoothPrinter) {
          await printToWebBluetooth(connectedWebBluetoothPrinter, bytes);
        } else if (connectedUsbPrinter) {
          await printToUsbDevice(connectedUsbPrinter, bytes);
        }

        toast.success("Receipt Printed", {
          description: "Receipt sent to thermal printer successfully",
        });
      } else {
        // Web browser - use thermal-optimized print dialog
        const thermalHTML = generateThermalReceiptHTML(transaction, options);

        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(thermalHTML);
          printWindow.document.close();

          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);

          toast.success("Print Dialog", {
            description:
              "Please select your thermal printer from the print dialog",
          });
        } else {
          console.log("Unable to open print dialog", thermalHTML);
          throw new Error("Unable to open print dialog");
        }
      }
    } catch (error: any) {
      console.log("Error printing receipt:", error);
      toast.danger("Print Error", {
        description:
          error.message || "Failed to print receipt to thermal printer",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Test print function for printer setup/testing
  const testPrint = async () => {
    setIsGenerating(true);

    try {
      if (!window.Capacitor?.isNativePlatform()) {
        throw new Error("Test print only available on mobile devices");
      }

      const { CapacitorThermalPrinter } =
        await import("capacitor-thermal-printer");

      await CapacitorThermalPrinter.begin()
        .align("center")
        .bold()
        .text("PRINTER TEST\n")
        .clearFormatting()
        .text("================================\n")
        .text("If you can read this,\n")
        .text("your thermal printer is working!\n")
        .text("================================\n")
        .text(`Test Date: ${new Date().toLocaleString()}\n`)
        .cutPaper()
        .write();

      toast.success("Test Print Sent", {
        description: "Test receipt sent to thermal printer",
      });
    } catch (error: any) {
      console.log("Test print error:", error);
      toast.danger("Test Print Failed", {
        description: error.message || "Failed to send test print",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Print daily summary/report
  const printDailySummary = async (transactions: Payment[], date: string) => {
    setIsGenerating(true);

    try {
      if (!window.Capacitor?.isNativePlatform()) {
        throw new Error("Daily summary print only available on mobile devices");
      }

      const { CapacitorThermalPrinter } =
        await import("capacitor-thermal-printer");

      const totalAmount = transactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );
      const completedTransactions = transactions;
      const completedAmount = completedTransactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );

      await CapacitorThermalPrinter.begin()
        .align("center")
        .bold()
        .doubleWidth()
        .text("DAILY SUMMARY\n")
        .clearFormatting()
        .text("================================\n")
        .text(`Date: ${date}\n`)
        .text("================================\n")

        .align("left")
        .text(`Total Transactions: ${transactions.length}\n`)
        .text(`Completed: ${completedTransactions.length}\n`)
        .text("--------------------------------\n")

        .bold()
        .text(`Total Amount: ${formatCurrency(totalAmount)}\n`)
        .text(`Completed Amount: ${formatCurrency(completedAmount)}\n`)
        .clearFormatting()

        .align("center")
        .text("================================\n")
        .text(`Generated: ${new Date().toLocaleString()}\n`)
        .cutPaper()
        .write();

      toast.success("Daily Summary Printed", {
        description: "Daily summary sent to thermal printer",
      });
    } catch (error: any) {
      console.log("Daily summary print error:", error);
      toast.danger("Summary Print Failed", {
        description: error.message || "Failed to print daily summary",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate thermal receipt as plain text for POS apps
  const generateThermalReceiptText = (
    transaction: Payment,
    options: DocumentOptions = {},
  ) => {
    const {
      organizationName = "Automotive Parts",
      organizationAddress = "123 Healthcare St, Medical City, MC 12345",
    } = options;

    let receipt = "";
    receipt += "================================\n";
    receipt += `${organizationName}\n`;
    receipt += `${organizationAddress}\n`;
    receipt += "================================\n";
    receipt += "\n";
    receipt += "        PAYMENT RECEIPT\n";
    receipt += "\n";
    receipt += `Amount: ${formatCurrency(Number(transaction.amount))}\n`;
    receipt += "\n";
    receipt += "--------------------------------\n";
    receipt += `Transaction ID: ${transaction.id}\n`;
    receipt += `Date: ${formatDateTime(transaction.createdAt)}\n`;
    receipt += `Method: ${transaction.paymentMethod.toUpperCase()}\n`;
    receipt += `Received by: ${transaction.receivedBy}\n`;

    if (transaction.reference) {
      receipt += "--------------------------------\n";
      receipt += `Reference: ${transaction.reference}\n`;
    }

    receipt += "================================\n";
    receipt += "    Thank you for your payment!\n";
    receipt += `Generated: ${new Date().toLocaleString()}\n`;
    receipt += "================================\n";
    receipt += "\n\n\n"; // Extra lines for paper cut

    return receipt;
  };

  // Generate thermal receipt HTML for web printing
  const generateThermalReceiptHTML = (
    transaction: Payment,
    options: DocumentOptions = {},
  ) => {
    const {
      organizationName = "Automotive Parts",
      organizationAddress = "123 Healthcare St, Medical City, MC 12345",
    } = options;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { 
              size: 80mm auto; 
              margin: 0; 
            }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              margin: 0; 
              padding: 2mm;
              width: 76mm;
              background: white;
              color: black;
              line-height: 1.2;
            }
            .center { text-align: center; }
            .left { text-align: left; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .large { font-size: 16px; }
            .line { 
              border-bottom: 1px dashed #000; 
              margin: 5px 0;
              width: 100%;
            }
            .row { 
              display: flex; 
              justify-content: space-between; 
              margin: 2px 0; 
            }
            .amount { 
              font-size: 20px; 
              font-weight: bold; 
              text-align: center; 
              margin: 10px 0; 
            }
            .spacer { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="line"></div>
          
          <div class="center bold">
            ${organizationName}
          </div>
          <div class="center">
            ${organizationAddress}
          </div>
          
          <div class="line"></div>
          
          <div class="spacer"></div>
          
          <div class="center bold large">
            PAYMENT RECEIPT
          </div>
          
          <div class="spacer"></div>
          
          <div class="amount">
            ${formatCurrency(Number(transaction.amount))}
          </div>
          
          <div class="spacer"></div>
          <div class="line"></div>
          
          <div class="row">
            <span>Transaction ID:</span>
            <span>${transaction.id}</span>
          </div>
          
          <div class="row">
            <span>Date:</span>
            <span>${formatDateTime(transaction.createdAt)}</span>
          </div>
          
          <div class="row">
            <span>Method:</span>
            <span>${transaction.paymentMethod.toUpperCase()}</span>
          </div>
          
          <div class="row">
            <span>Received by:</span>
            <span>${transaction.receivedBy}</span>
          </div>
          
          ${
            transaction.reference
              ? `
            <div class="line"></div>
            <div>Reference: ${transaction.reference}</div>
          `
              : ""
          }
          
          <div class="line"></div>
          
          <div class="center">
            Thank you for your payment!
          </div>
          
          <div class="center">
            ${new Date().toLocaleString()}
          </div>
          
          <div class="spacer"></div>
          <div class="spacer"></div>
          <div class="spacer"></div>
        </body>
      </html>
    `;
  };

  return {
    printReceipt, // Direct thermal printing using capacitor-thermal-printer fluent API
    testPrint, // Test thermal printer functionality
    printDailySummary, // Print daily transaction summary
    generateReceiptHTML,
    generateThermalReceiptHTML,
    generateThermalReceiptText,
    isGenerating,
  };
};

export default useDocumentGenerator;
