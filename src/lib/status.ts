import { Sale } from "@/types/types";

export function saleStatusTone(status: Sale["status"]) {
  if (status === "COMPLETED") return "emerald";
  if (status === "CANCELLED") return "slate";
  return "amber";
}

export function paymentTone(paymentStatus: Sale["paymentStatus"]) {
  if (paymentStatus === "PAID") return "emerald";
  if (paymentStatus === "PARTIALLY_PAID") return "amber";
  return "rose";
}
