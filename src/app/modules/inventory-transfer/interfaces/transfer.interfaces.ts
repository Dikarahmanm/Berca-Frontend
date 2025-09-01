// src/app/modules/inventory-transfer/interfaces/transfer.interfaces.ts
// Interface definitions for Inter-Branch Inventory Transfer System

export interface TransferRequestDto {
  id?: number;
  transferNumber?: string;
  sourceBranchId: number;
  sourceBranchName?: string;
  targetBranchId: number;
  targetBranchName?: string;
  requestedBy: number;
  requestedByName?: string;
  approvedBy?: number;
  approvedByName?: string;
  status: TransferStatus;
  priority: TransferPriority;
  reason: string;
  notes?: string;
  items: TransferItemDto[];
  totalItems: number;
  totalValue: number;
  requestDate: string;
  approvedDate?: string;
  shippedDate?: string;
  receivedDate?: string;
  completedDate?: string;
  trackingInfo?: TransferTrackingDto;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransferItemDto {
  id?: number;
  productId: number;
  productName: string;
  productCode: string;
  categoryName: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  shippedQuantity?: number;
  receivedQuantity?: number;
  unitPrice: number;
  totalValue: number;
  sourceStock: number;
  targetStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  expiryDate?: string;
  batchNumber?: string;
  notes?: string;
}

export interface TransferTrackingDto {
  currentStatus: TransferStatus;
  statusHistory: TransferStatusHistoryDto[];
  estimatedDelivery?: string;
  actualDelivery?: string;
  carrier?: string;
  trackingNumber?: string;
  shippingCost?: number;
  handledBy?: number;
  handledByName?: string;
  notes?: string;
}

export interface TransferStatusHistoryDto {
  id: number;
  status: TransferStatus;
  timestamp: string;
  handledBy: number;
  handledByName: string;
  notes?: string;
  location?: string;
}

export interface CreateTransferRequestDto {
  sourceBranchId: number;
  targetBranchId: number;
  priority: TransferPriority;
  reason: string;
  notes?: string;
  items: CreateTransferItemDto[];
}

export interface CreateTransferItemDto {
  productId: number;
  requestedQuantity: number;
  notes?: string;
}

export interface UpdateTransferStatusDto {
  status: TransferStatus;
  notes?: string;
  items?: UpdateTransferItemDto[];
}

export interface UpdateTransferItemDto {
  id: number;
  approvedQuantity?: number;
  shippedQuantity?: number;
  receivedQuantity?: number;
  notes?: string;
}

export interface BranchStockComparisonDto {
  productId: number;
  productName: string;
  productCode: string;
  categoryName: string;
  branchStocks: BranchStockInfoDto[];
  recommendations: TransferRecommendationDto[];
  averageStock: number;
  totalStock: number;
  stockImbalance: boolean;
  lastUpdated: string;
}

export interface BranchStockInfoDto {
  branchId: number;
  branchName: string;
  branchCode: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  stockStatus: StockStatus;
  daysOfStock: number;
  averageDailySales: number;
  lastSaleDate?: string;
  lastRestockDate?: string;
}

export interface TransferRecommendationDto {
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  productId: number;
  recommendedQuantity: number;
  urgencyLevel: UrgencyLevel;
  reason: string;
  expectedBenefit: string;
  estimatedCost: number;
  priority: number;
}

export interface TransferSummaryDto {
  totalRequests: number;
  pendingApprovals: number;
  inTransit: number;
  completed: number;
  rejected: number;
  totalValue: number;
  averageProcessingTime: number; // in hours
  topRequestingBranches: BranchTransferStatDto[];
  topSupplyingBranches: BranchTransferStatDto[];
  recentActivity: TransferActivityDto[];
}

export interface BranchTransferStatDto {
  branchId: number;
  branchName: string;
  requestCount: number;
  supplyCount: number;
  totalValue: number;
  successRate: number;
}

export interface TransferActivityDto {
  id: number;
  transferNumber: string;
  sourceBranchName: string;
  targetBranchName: string;
  status: TransferStatus;
  timestamp: string;
  handledBy: string;
  summary: string;
}

export interface TransferFilterDto {
  branchIds?: number[];
  status?: TransferStatus[];
  priority?: TransferPriority[];
  startDate?: string;
  endDate?: string;
  productIds?: number[];
  requestedBy?: number[];
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Enums
export type TransferStatus = 
  | 'Draft'
  | 'Requested' 
  | 'PendingApproval'
  | 'Approved'
  | 'Rejected'
  | 'InPreparation'
  | 'InTransit'
  | 'Delivered'
  | 'Received'
  | 'Completed'
  | 'Cancelled'
  | 'PartiallyReceived';

export type TransferPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type StockStatus = 
  | 'InStock'
  | 'LowStock' 
  | 'OutOfStock'
  | 'Overstock'
  | 'Critical';

export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';

// Helper functions for status and priority
export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  'Draft': 'Draft',
  'Requested': 'Requested',
  'PendingApproval': 'Pending Approval',
  'Approved': 'Approved',
  'Rejected': 'Rejected',
  'InPreparation': 'In Preparation',
  'InTransit': 'In Transit',
  'Delivered': 'Delivered',
  'Received': 'Received',
  'Completed': 'Completed',
  'Cancelled': 'Cancelled',
  'PartiallyReceived': 'Partially Received'
};

export const TRANSFER_PRIORITY_LABELS: Record<TransferPriority, string> = {
  'Low': 'Low',
  'Medium': 'Medium',
  'High': 'High',
  'Critical': 'Critical'
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  'InStock': 'In Stock',
  'LowStock': 'Low Stock',
  'OutOfStock': 'Out of Stock',
  'Overstock': 'Overstock',
  'Critical': 'Critical'
};