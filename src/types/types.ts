export interface Device {
  id: string;
  model: string;
  platform: string;
  deviceName: string;
  operatingSystem: string;
}

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role_id: string;
  status: string;
  countryCode: string;
  created_at: string;
  updated_at: string;
  online: boolean;
};

export interface MoneySummary {
  count: number;
  revenue: string;
  tax: string;
}

export interface SaleItem {
  productId: string;
  sku: string;
  productName: string;
  partNumber?: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  subtotal: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  quotationId: string | null;
  customerId: string | null;
  salesRepId: string;
  items: SaleItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  taxRate: string;
  amountPaid: string;
  balance: string;
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  status: "DRAFT" | "COMPLETED" | "CANCELLED";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  movementType: "STOCK_IN" | "SALE" | "RETURN" | "ADJUSTMENT";
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  createdAt: string;
}

export interface DashboardProductSummary {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  revenue: string;
}

export interface DashboardSummary {
  today: MoneySummary;
  month: MoneySummary;
  all: MoneySummary;
  outstanding: string;
  lowStock: number;
  outOfStock: number;
  topProducts: DashboardProductSummary[];
  recentSales: Sale[];
  recentMovements: StockMovement[];
}
