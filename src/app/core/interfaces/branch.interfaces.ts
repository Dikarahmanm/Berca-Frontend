// src/app/core/interfaces/branch.interfaces.ts
// Multi-Branch System DTOs and Interfaces for Toko Eniwan POS
// Angular 20 with Signal-based reactive architecture

export interface BranchDto {
  id: number;
  branchCode: string;
  branchName: string;
  address: string;
  managerName: string;
  phone: string;
  email?: string;
  parentBranchId?: number;
  branchType: 'Head' | 'Branch' | 'SubBranch';
  isActive: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  operatingHours?: {
    open: string;
    close: string;
    timezone: string;
  };
  capacity?: {
    storageSpace: number; // in cubic meters
    maxProducts: number;
    refrigeratedSpace: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BranchAccessDto {
  branchId: number;
  branchCode: string;
  branchName: string;
  branchType: 'Head' | 'Branch' | 'SubBranch';
  isHeadOffice: boolean;
  level: number; // Hierarchy level for display (0 = Head, 1 = Branch, 2 = SubBranch)
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canTransfer: boolean;
  canApprove?: boolean;
  accessLevel: 'Full' | 'Limited' | 'ReadOnly';
  isActive: boolean;
  address: string;
  managerName: string;
  phone: string;
  parentBranchId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchHierarchyDto {
  branchId: number;
  branchName: string;
  branchCode: string;
  branchType: 'Head' | 'Branch' | 'SubBranch';
  level: number;
  parentBranchId?: number;
  children: BranchHierarchyDto[];
  isExpanded?: boolean;
}

export interface BranchSwitchContextDto {
  selectedBranchId: number | null;
  selectedBranchIds: number[];
  isMultiSelectMode: boolean;
  accessibleBranches: BranchAccessDto[];
  branchHierarchy: BranchHierarchyDto[];
  lastSwitchAt: string;
}

export interface BranchSummaryDto {
  branchId: number;
  branchName: string;
  branchCode: string;
  totalProducts: number;
  totalStockValue: number;
  dailySales: number;
  activeMembers: number;
  outstandingCredit: number;
  expiringProducts: number;
  lastSyncAt: string;
  status: 'online' | 'offline' | 'syncing';
}

export interface BranchUserRoleDto {
  branchId: number;
  branchName: string;
  role: 'Admin' | 'Manager' | 'BranchManager' | 'HeadManager' | 'User' | 'Cashier';
  permissions: string[];
  canSwitchToOtherBranches: boolean;
  defaultBranch: boolean;
}

export interface MultiBranchFilterDto {
  branchIds: number[];
  startDate?: string;
  endDate?: string;
  includeSubBranches: boolean;
  dataType: 'sales' | 'inventory' | 'members' | 'analytics' | 'all';
}

export interface BranchTransferRequestDto {
  sourceBranchId: number;
  targetBranchId: number;
  productId: number;
  quantity: number;
  reason: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  requestedBy: number;
  requiredBy?: string;
  notes?: string;
}

// TEMPORARY: Commented out until multi-branch-coordination.service interfaces are properly exported
// export type { 
//   BranchInventoryStatus,
//   InterBranchTransferRecommendation,
//   BranchCoordinationAnalytics,
//   BranchPerformanceMetric,
//   TransferRequest,
//   CrossBranchAnalyticsDto,
//   StockTransferOpportunityDto
// } from '../services/multi-branch-coordination.service';