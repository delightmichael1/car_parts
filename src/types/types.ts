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
  role: Role | undefined;
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
  customerName: string;
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

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  isActive: boolean;
  children?: Category[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleType = "CAR" | "TRUCK" | "TRACTOR" | "EQUIPMENT";

export interface Vehicle {
  id: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  engine?: string;
  variant?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartCompatibility {
  id: string;
  productId: string;
  vehicleId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  partNumber?: string;
  oemNumber?: string;
  costPrice: string;
  sellingPrice: string;
  quantity: number;
  minimumStockLevel: number;
  unit?: string;
  isActive: boolean;
  category?: Category;
  brand?: Brand;
  createdAt: string;
  updatedAt: string;
}

export interface LowStockProduct {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  minimumStockLevel: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export type CustomerType = "INDIVIDUAL" | "BUSINESS";

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customerType: CustomerType;
  taxNumber?: string;
  creditAllowed: boolean;
  creditLimit: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Quotations
// ---------------------------------------------------------------------------

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export interface QuotationItem {
  productId: string;
  sku?: string;
  productName?: string;
  partNumber?: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  subtotal: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string | null;
  salesRepId: string;
  items: QuotationItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  taxRate: string;
  status: QuotationStatus;
  validUntil?: string;
  notes?: string;
  convertedSaleId?: string | null;
  customer?: Customer;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentMethod =
  | "CASH"
  | "ECOCASH"
  | "BANK_TRANSFER"
  | "CARD"
  | "OTHER";

export interface Payment {
  id: string;
  saleId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  receivedBy?: string;
  notes?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export type MovementType = "STOCK_IN" | "SALE" | "RETURN" | "ADJUSTMENT";

export interface Movement extends StockMovement {
  referenceType?: "SALE" | "QUOTATION" | "PRODUCT";
  referenceId?: string;
  performedBy?: string;
}

// ---------------------------------------------------------------------------
// Reports & audit
// ---------------------------------------------------------------------------

export interface ReportSummary {
  count: number;
  revenue: string;
  tax: string;
  discount: string;
}

export interface InventoryReportSummary {
  products: number;
  units: number;
  costValue: string;
  sellingValue: string;
  lowStock: number;
  outOfStock: number;
}

export interface SalesRepReport {
  salesRepId: string;
  repName: string;
  count: number;
  revenue: string;
}

export interface AuditLog {
  id: string;
  actorId?: string | User;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  isEmergency?: boolean;
  createdAt: string;
  actor?: User;
}

export interface SettingsItem {
  key: string;
  value: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Team & roles
// ---------------------------------------------------------------------------

export interface Role {
  id: string;
  name: string;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceSummary {
  deviceId: string;
  deviceName: string;
  model: string;
  platform: string;
  os: string;
  online: boolean;
  lastSeen?: string;
}

// ---------------------------------------------------------------------------
// List response envelopes (mirrors API.md)
// ---------------------------------------------------------------------------

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
}

export interface SalesResponse {
  sales: Sale[];
  total: number;
  page: number;
  limit: number;
}

export interface QuotationsResponse {
  quotations: Quotation[];
  total: number;
  limit: number;
}

export interface PaymentsResponse {
  payments: Payment[];
  total: number;
}

export interface MovementsResponse {
  movements: Movement[];
  total: number;
  page: number;
  limit: number;
}

export interface LowStockResponse {
  products: LowStockProduct[];
  total: number;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SettingsResponse {
  settings: SettingsItem[];
  total: number;
}

export interface VehiclesResponse {
  vehicles: Vehicle[];
  total: number;
  message?: string;
}

export interface CompatibilitiesResponse {
  compatibilities: PartCompatibility[];
  total: number;
  message?: string;
}

export interface RolesResponse {
  roles: Role[];
  total: number;
  message?: string;
}

export interface UsersResponse {
  users: User[];
  message?: string;
}

export interface SalesReportResponse {
  summary: ReportSummary;
  filters?: unknown;
  message?: string;
}

export interface ProductsReportResponse {
  products: DashboardProductSummary[];
  message?: string;
}

export interface InventoryReportResponse {
  summary: InventoryReportSummary;
  message?: string;
}

export interface SalesRepsReportResponse {
  salesReps: SalesRepReport[];
  message?: string;
}

export interface ProfitLossSummary {
  sales: string;
  discounts: string;
  tax: string;
  cogs: string;
  grossProfit: string;
  netProfit: string;
  totalCollected: string;
  saleCount: number;
  count?: number;
}

export interface CashbookEntry {
  date: string;
  saleNumber?: string;
  customerName?: string;
  method?: string;
  reference?: string;
  amount: string;
  runningBalance: string;
}

export interface CashbookResponse {
  openingBalance: string;
  totalIn: string;
  totalOut: string;
  closingBalance: string;
  entries: CashbookEntry[];
  truncated?: boolean;
}

export interface JournalEntry {
  date: string;
  type: string;
  reference: string;
  account: string;
  debit: string;
  credit: string;
}

export interface JournalResponse {
  entries: JournalEntry[];
  totalDebit: string;
  totalCredit: string;
  truncated?: boolean;
}

export interface BalanceSheetResponse {
  asOf: string;
  cash: string;
  inventory: string;
  accountsReceivable: string;
  totalAssets: string;
  taxPayable: string;
  retainedEarnings: string;
  totalLiabilitiesAndEquity: string;
}

// ---------------------------------------------------------------------------
// Online parts lookup (FAPI proxy)
// ---------------------------------------------------------------------------

export interface OnlinePart {
  article: string;
  description: string;
  brand: string;
  mfi: number;
}

export interface OnlineVehicleFit {
  make: string;
  model: string;
  yearFrom: number;
}

export interface OnlinePartDetail extends OnlinePart {
  attributes: Record<string, string>;
  fitments: OnlineVehicleFit[];
}
