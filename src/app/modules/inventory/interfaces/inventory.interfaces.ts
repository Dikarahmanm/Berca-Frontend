export interface Product {
  id: number;
  name: string;
  barcode: string;
  description?: string;                    // ✅ ADDED: Missing from original
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number;                    // ✅ FIXED: minStock -> minimumStock
  unit: string;                           // ✅ ADDED: Missing from original
  imageUrl?: string;                      // ✅ ADDED: Missing from original
  isActive: boolean;
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
  createdAt: Date;
  updatedAt: Date;
  profitMargin: number;                   // ✅ ADDED: Missing computed property
  isLowStock: boolean;                    // ✅ ADDED: Missing computed property
  isOutOfStock: boolean;                  // ✅ ADDED: Missing computed property
}

export interface CreateProductRequest {
  name: string;
  barcode: string;
  description?: string;                   // ✅ ADDED
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number;                   // ✅ FIXED: minStock -> minimumStock
  unit: string;                          // ✅ ADDED
  categoryId: number;
  isActive: boolean;
}

export interface UpdateProductRequest {
  name: string;
  barcode: string;
  description?: string;                   // ✅ ADDED
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number;                   // ✅ FIXED: minStock -> minimumStock
  unit: string;                          // ✅ ADDED
  categoryId: number;
  isActive: boolean;
}

export interface ProductListResponse {
  products: Product[];                    // ✅ FIXED: Products -> products (lowercase)
  totalItems: number;                     // ✅ FIXED: totalProducts -> totalItems
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface StockUpdateRequest {
  quantity: number;
  type: MutationType;
  notes: string;
  referenceNumber?: string;
  unitCost?: number;
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
  type: string;                          // Backend returns string, not enum
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
  Damaged = 'Damaged',
  Expired = 'Expired'
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}