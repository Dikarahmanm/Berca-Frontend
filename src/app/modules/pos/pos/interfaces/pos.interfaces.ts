// ===== BACKEND DTO INTERFACES - EXACT MATCH =====
// These interfaces must match exactly with backend schema

export interface ProductDto {
  id: number;
  name: string;
  barcode: string;
  stock: number;
  buyPrice: number;
  sellPrice: number;
  categoryId: number;
  categoryName: string;
  isActive: boolean;
  minStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSaleRequest {
  items: CreateSaleItemRequest[];
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  memberId?: number;
  customerName?: string;
  notes?: string;
  redeemedPoints?: number;
}

export interface CreateSaleItemRequest {
  productId: number;
  quantity: number;
  sellPrice: number;
  discount: number;
}

export interface SaleDto {
  id: number;
  saleNumber: string;
  saleDate: Date;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  memberId?: number;
  memberName?: string;
  memberNumber?: string;
  customerName?: string;
  cashierId: number;
  cashierName: string;
  status: string;
  notes?: string;
  receiptPrinted: boolean;
  receiptPrintedAt?: Date;
  items: SaleItemDto[];
  createdAt: Date;
  totalItems: number;
  totalProfit: number;
  discountPercentage: number;
  redeemedPoints: number;
}

export interface SaleItemDto {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  productBarcode: string;
  quantity: number;
  sellPrice: number;
  buyPrice: number;
  discount: number;
  subtotal: number;
  totalProfit: number;
}

export interface ReceiptDataDto {
  sale: SaleDto;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  footerMessage?: string;
}

// ===== FRONTEND SPECIFIC INTERFACES =====

// Compatibility aliases
export interface Product extends ProductDto {}
export interface Sale extends SaleDto {}
export interface SaleItem extends SaleItemDto {}
export interface ReceiptData extends ReceiptDataDto {}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // Individual item discount percentage
  subtotal: number;
}

export interface Customer {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
  membershipNumber?: string;
  points?: number;
}

// ===== UI INTERFACES =====

export interface PaymentData {
  method: 'cash' | 'card' | 'digital';
  amountPaid: number;
  change: number;
  reference?: string;
}

// ===== API RESPONSE INTERFACES =====

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}