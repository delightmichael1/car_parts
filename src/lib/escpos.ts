/**
 * ESC/POS byte command builder for thermal printers.
 * Compatible with most ESC/POS USB/Bluetooth thermal printers.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const LINE_CHARS = 32; // 58 mm paper

export const pad = (
  left: string,
  right: string,
  total = LINE_CHARS,
): string => {
  const gap = Math.max(1, total - left.length - right.length);
  return left + " ".repeat(gap) + right;
};

export const centre = (text: string, total = LINE_CHARS): string => {
  const sp = Math.max(0, Math.floor((total - text.length) / 2));
  return " ".repeat(sp) + text;
};

export const divider = (ch = "-", n = LINE_CHARS): string => ch.repeat(n);

export class ESCPOSBuilder {
  private buf: number[] = [];

  /** Initialize / reset */
  init(): this {
    return this.b(ESC, 0x40);
  }

  /** Alignment */
  align(a: "left" | "center" | "right"): this {
    return this.b(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2);
  }

  /** Bold on/off */
  bold(on = true): this {
    return this.b(ESC, 0x45, on ? 1 : 0);
  }

  /** Double width+height on/off */
  doubleSize(on = true): this {
    return this.b(GS, 0x21, on ? 0x11 : 0x00);
  }

  /** Print a string (Latin-1 encoding) */
  text(str: string): this {
    for (const ch of str) {
      const code = ch.charCodeAt(0);
      this.buf.push(code < 256 ? code : 0x3f);
    }
    return this;
  }

  /** Print string + newline */
  line(str: string): this {
    return this.text(str).newline();
  }

  /** Newline */
  newline(): this {
    this.buf.push(LF);
    return this;
  }

  /** Feed N blank lines */
  feed(n = 3): this {
    for (let i = 0; i < n; i++) this.buf.push(LF);
    return this;
  }

  /** Full paper cut */
  cut(): this {
    return this.b(GS, 0x56, 0x42, 0x00);
  }

  /** Print raw byte values */
  raw(bytes: number[] | Uint8Array): this {
    for (const b of bytes) {
      this.buf.push(b);
    }
    return this;
  }

  /** Build the final Uint8Array */
  build(): Uint8Array {
    return new Uint8Array(this.buf);
  }

  private b(...bytes: number[]): this {
    this.buf.push(...bytes);
    return this;
  }
}

// ─── Receipt builders ─────────────────────────────────────────────────────────

export type POSReceiptData = {
  saleId: string;
  orgName: string;
  clientName?: string;
  timestamp: Date;
  items: {
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  total: number;
  change: number;
  amountTendered?: number;
  paymentMethod: string;
  currency: string;
};

export type TransactionReceiptESCData = {
  transactionId?: string;
  orgName: string;
  clientName: string;
  clientId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  type: string;
  status: string;
  comment?: string;
  timestamp: Date;
};

const fmtDate = (d: Date) =>
  `${d.getDate().toString().padStart(2, "0")} ${
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][d.getMonth()]
  } ${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

export const buildPOSReceiptBytes = (r: POSReceiptData): Uint8Array =>
  new ESCPOSBuilder()
    .init()
    .align("center")
    .bold()
    .line(r.orgName)
    .bold(false)
    .line("Point of Sale Receipt")
    .line(divider("="))
    .align("left")
    .line(fmtDate(r.timestamp))
    .text(r.clientName ? `Patient: ${r.clientName}\n` : "")
    .line(divider("-"))
    // items
    .raw(
      r.items.flatMap((item) => {
        const qtyLine = `  ${item.quantity} x ${r.currency} ${item.unitPrice.toFixed(2)}`;
        const totStr = `${r.currency} ${item.total.toFixed(2)}`;
        const row = pad(qtyLine, totStr);
        return [
          ...Array.from(item.itemName).map((c) => {
            const code = c.charCodeAt(0);
            return code < 256 ? code : 0x3f;
          }),
          0x0a,
          ...Array.from(row).map((c) => {
            const code = c.charCodeAt(0);
            return code < 256 ? code : 0x3f;
          }),
          0x0a,
        ];
      }),
    )
    .line(divider("-"))
    .bold()
    .line(pad("TOTAL", `${r.currency} ${r.total.toFixed(2)}`))
    .bold(false)
    .text(
      r.paymentMethod === "cash"
        ? pad(
            "Tendered",
            `${r.currency} ${(r.amountTendered ?? r.total + r.change).toFixed(2)}`,
          ) +
            "\n" +
            pad("Change", `${r.currency} ${r.change.toFixed(2)}`) +
            "\n"
        : "",
    )
    .line(`Payment: ${r.paymentMethod.replace("_", " ")}`)
    .line(divider("-"))
    .line(`Ref: #${r.saleId.slice(-8).toUpperCase()}`)
    .align("center")
    .line(divider("="))
    .line("Thank you for buying from us!")
    .line(divider("="))
    .feed(3)
    .cut()
    .build();

export const buildTransactionReceiptBytes = (
  r: TransactionReceiptESCData,
): Uint8Array =>
  new ESCPOSBuilder()
    .init()
    .align("center")
    .bold()
    .line(r.orgName)
    .bold(false)
    .line("Payment Receipt")
    .line(divider("="))
    .align("left")
    .line(fmtDate(r.timestamp))
    .line(divider("-"))
    .line(`Patient : ${r.clientName}`)
    .line(`ID      : ${r.clientId}`)
    .line(divider("-"))
    .line(pad("Type", r.type))
    .line(pad("Method", r.paymentMethod.replace("_", " ").toUpperCase()))
    .line(pad("Status", r.status.toUpperCase()))
    .line(divider("-"))
    .bold()
    .line(
      pad(
        "AMOUNT",
        `${r.currency.toUpperCase()} ${Number(r.amount).toFixed(2)}`,
      ),
    )
    .bold(false)
    .text(r.comment ? divider("-") + "\n" + `Note: ${r.comment}\n` : "")
    .text(
      r.transactionId
        ? `Ref: #${r.transactionId.slice(-8).toUpperCase()}\n`
        : "",
    )
    .align("center")
    .line(divider("="))
    .line("Thank you!")
    .line(divider("="))
    .feed(3)
    .cut()
    .build();
