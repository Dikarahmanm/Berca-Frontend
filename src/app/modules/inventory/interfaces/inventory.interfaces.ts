export interface Product {
  id: number;
  name: string;
  barcode: string;
  description?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number; // ✅ FIXED: Ensure this matches backend
  unit: string;
  isActive: boolean;
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
  createdAt: Date;
  updatedAt: Date;
  // ✅ NEW: Add expiry date property
  expiryDate?: string;
  // Computed properties
  profitMargin?: number;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
}

export interface CreateProductRequest {
  name: string;
  barcode: string;
  description?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number; // ✅ FIXED: Include minimumStock
  unit: string;
  categoryId: number;
  isActive: boolean;
  // ✅ NEW: Add expiry date property
  expiryDate?: string;
}

export interface UpdateProductRequest {
  name: string;
  barcode: string;
  description?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number; // ✅ FIXED: Include minimumStock
  unit: string;
  categoryId: number;
  isActive: boolean;
  // ✅ NEW: Add expiry date property
  expiryDate?: string;
}

export interface StockUpdateRequest {
  mutationType: MutationType; // ✅ FIXED: Use correct property name
  quantity: number;
  notes: string;
  referenceNumber?: string;
  unitCost?: number;
}

export interface ProductListResponse {
  products: Product[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface ProductFilter {
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  minStock?: number;
  maxStock?: number;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryMutation {
  id: number;
  productId: number;
  productName: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  notes: string;
  referenceNumber?: string;
  unitCost?: number;
  totalCost?: number;
  createdAt: Date;
  createdBy?: string;
}

export enum MutationType {
  StockIn = 'StockIn',
  StockOut = 'StockOut',
  Sale = 'Sale',
  Return = 'Return',
  Adjustment = 'Adjustment',
  Transfer = 'Transfer',
  Damaged = 'Damaged',
  Expired = 'Expired'
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}