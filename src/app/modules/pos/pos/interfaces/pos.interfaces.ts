// ✅ UPDATED: src/app/modules/pos/pos/interfaces/pos.interfaces.ts
// ===== BACKEND DTO INTERFACES - EXACT MATCH =====

export interface ProductDto {
  id: number;
  name: string;
  barcode: string;
  description?: string;
  stock: number;
  buyPrice: number;
  sellPrice: number;
  categoryId: number;
  categoryName?: string;
  isActive: boolean;
  minStock: number;
  minimumStock?: number; // Compatibility with inventory interface
  unit: string;
  createdAt: string;
  updatedAt: string;
  expiryDate?: string;
}

export interface CreateSaleRequest {
  items: CreateSaleItemRequest[];
  paymentMethod: string;
  paymentReference?: string;
  amountPaid: number;
  memberId?: number;
  customerName?: string;
  notes?: string;
  discountAmount: number;
  taxAmount: number;
  subTotal: number;
  discountPercentage?: number;
  total: number;
  paidAmount: number;           // Backend field name
  changeAmount: number;
  redeemedPoints?: number;
}

// ✅ ALIGNED WITH BACKEND: Complete item format matching Swagger
export interface CreateSaleItemRequest {
  productId: number;
  quantity: number;
  discount: number;           // Discount percentage (0-100)
  sellPrice: number;          // Price per unit (from Product)
  discountAmount: number;     // Calculated discount amount
  notes?: string;             // Optional item notes
  unitPrice: number;          // Unit price (same as sellPrice typically)
  totalPrice: number;         // Total price for this item
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
  unitPrice: number;     // ✅ Backend uses unitPrice in response
  sellPrice?: number;    // ✅ For compatibility
  buyPrice?: number;     // ✅ For compatibility  
  discountAmount: number; // ✅ Backend uses discountAmount in response
  discount?: number;     // ✅ For compatibility (percentage)
  subtotal: number;
  totalProfit?: number;
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
  method: 'cash' | 'card' | 'digital' | 'credit';
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