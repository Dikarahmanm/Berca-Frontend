// src/app/modules/pos/interfaces/pos.interfaces.ts
// ✅ Complete interfaces for POS module

export interface Product {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  description?: string;
  minStock?: number;
  supplier?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // Individual item discount percentage
  subtotal: number;
  notes?: string;
}

export interface Customer {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
  membershipNumber?: string;
  points?: number;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  items: CartItem[];
  subtotal: number;
  globalDiscount: number; // Global discount percentage
  discountAmount: number;
  tax: number;
  taxAmount: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: PaymentMethod;
  timestamp: Date;
  cashierName: string;
  cashierId: number;
  customer?: Customer;
  notes?: string;
  status: TransactionStatus;
}

export interface CartTotals {
  subtotal: number;
  globalDiscount: number;
  discountAmount: number;
  total: number;
  tax: number;
  taxAmount: number;
  grandTotal: number;
}

export interface PaymentData {
  amount: number;
  method: PaymentMethod;
  change: number;
  cardNumber?: string;
  digitalWalletId?: string;
  notes?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface PosSettings {
  taxRate: number; // Default: 0.1 (10%)
  defaultPaymentMethod: PaymentMethod;
  autoCalculateChange: boolean;
  printReceiptAutomatic: boolean;
  enableBarcodeScan: boolean;
  maxDiscountPercentage: number;
}

// Enums
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  DIGITAL = 'digital',
  BANK_TRANSFER = 'bank_transfer'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock'
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

// Search and filter interfaces
export interface ProductSearchParams {
  query?: string;
  categoryId?: number;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'name' | 'price' | 'stock' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionSearchParams {
  dateFrom?: Date;
  dateTo?: Date;
  paymentMethod?: PaymentMethod;
  status?: TransactionStatus;
  cashierId?: number;
  customerPhone?: string;
  minAmount?: number;
  maxAmount?: number;
}

// Receipt interface
export interface ReceiptData {
  transaction: Transaction;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  receiptNumber: string;
  qrCodeData?: string;
  footerMessage?: string;
}