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
  createdAt: string;
  updatedAt: string;
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
  mutationType: string;
  type: string;
  quantity: number;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  notes: string;
  referenceNumber?: string;
  unitCost?: number;
  totalCost?: number;
  mutationDate: string;
  createdAt: string;
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
  Expired = 'Expired',
  BatchCreation = 'BatchCreation', // ✅ NEW: For batch creation
  BatchStockIn = 'BatchStockIn'    // ✅ NEW: For adding stock to batch
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// ===== NEW: BATCH MANAGEMENT INTERFACES =====

export interface ProductBatch {
  id: number;
  batchNumber: string;
  productId: number;
  productName?: string;
  initialQuantity: number;
  currentQuantity: number;
  unitCost: number;
  expiryDate?: string;
  manufacturingDate?: string;
  supplierInfo?: string;
  status: 'Good' | 'Warning' | 'Critical' | 'Expired';
  daysToExpiry?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithBatchSummaryDto {
  id: number;
  name: string;
  barcode: string;
  description?: string;
  categoryName?: string;
  categoryColor?: string;
  unit: string;
  isActive: boolean;
  
  // Stock summary
  totalStock: number;
  minimumStock: number;
  isLowStock: boolean;
  
  // Batch summary
  totalBatches: number;
  batchesGood: number;
  batchesWarning: number;
  batchesCritical: number;
  batchesExpired: number;
  
  // Expiry info (legacy properties for backward compatibility)
  nearestExpiryDate?: string;
  daysToNearestExpiry?: number;
  expiryStatus: 'Good' | 'Warning' | 'Critical' | 'Expired';

  // ✅ NEW: Nearest expiry batch object from API
  nearestExpiryBatch?: {
    id: number;
    productId: number;
    productName: string;
    batchNumber: string;
    expiryDate: string;
    productionDate?: string;
    currentStock: number;
    initialStock: number;
    costPerUnit: number;
    supplierName?: string;
    purchaseOrderNumber?: string;
    notes?: string;
    isBlocked: boolean;
    blockReason?: string;
    isExpired: boolean;
    isDisposed: boolean;
    disposalDate?: string;
    disposalMethod?: string;
    branchId?: number;
    branchName?: string;
    createdAt: string;
    updatedAt: string;
    createdByUserName?: string;
    updatedByUserName?: string;
    daysUntilExpiry: number;
    expiryStatus: number; // 1=Good, 2=Warning, 3=Critical, 4=Expired
    availableStock: number;
  };

  // Recent batch info (legacy for backward compatibility)
  latestBatch?: {
    batchNumber: string;
    quantity: number;
    expiryDate?: string;
    status: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateBatchRequest {
  batchNumber?: string; // Optional - can be auto-generated
  initialQuantity: number;
  unitCost: number;
  expiryDate?: string;
  manufacturingDate?: string;
  supplierInfo?: string;
  notes?: string;
}

export interface AddStockToBatchRequest {
  quantity: number;
  unitCost?: number;
  notes?: string;
  referenceNumber?: string;
}

export interface BatchForPOSDto {
  id: number;
  batchNumber: string;
  availableQuantity: number;
  unitCost: number;
  sellPrice: number;
  expiryDate?: string;
  daysToExpiry?: number;
  status: 'Good' | 'Warning' | 'Critical' | 'Expired';
  isFifoRecommended: boolean; // True if this should be sold first
  priority: number; // 1 = highest priority (sell first)
}