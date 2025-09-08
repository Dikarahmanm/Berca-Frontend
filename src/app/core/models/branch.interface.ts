// Branch Management Interfaces - Dynamic API Integration
// Sesuai dengan /api/Branch endpoints

export interface BranchDto {
  id: number;
  branchCode: string;
  branchName: string;
  branchType: number;
  branchTypeName: string;
  address: string;
  managerName: string;
  phone: string;
  email: string;
  city: string;
  province: string;
  postalCode: string;
  fullLocationName: string;
  openingDate: string;
  storeSize: string;
  employeeCount: number;
  isActive: boolean;
  isHeadOffice: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccessibleBranchDto {
  branchId: number;
  branchCode: string;
  branchName: string;
  branchType: string;
  parentBranchId?: number;
  isHeadOffice: boolean;
  level: number;
  address: string;
  managerName: string;
  phone: string;
  isActive: boolean;
  canRead: boolean;
  canWrite: boolean;
  canApprove: boolean;
  canTransfer: boolean;
  canManage?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SimpleBranchDto {
  branchId: number;
  branchName: string;
  branchCode: string;
  city: string;
  province: string;
  branchType: number;
  isActive: boolean;
}

export interface BranchPerformanceDto {
  branchId: number;
  branchName: string;
  city: string;
  province: string;
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  transactionCount: number;
  averageTransactionValue: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number;
  activeEmployees: number;
  memberCount: number;
  lastSaleDate: string;
}

export interface BranchUserSummaryDto {
  branchId: number;
  branchName: string;
  branchCode: string;
  city: string;
  province: string;
  branchType: number;
  isActive: boolean;
  totalUsers: number;
  activeUsers: number;
  userCountByRole: { [role: string]: number };
  createdAt: string;
  updatedAt: string;
}

export interface BranchAnalyticsDto {
  branchCountByStoreSize: { [size: string]: number };
  branchCountByRegion: { [region: string]: number };
  branchCountByType: { [type: string]: number };
  userCountByBranch: { [branchName: string]: number };
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  totalEmployees: number;
  averageEmployeesPerBranch: number;
  generatedAt: string;
}

export interface BranchComparisonDto {
  branches: BranchPerformanceDto[];
  totalConsolidated: BranchPerformanceDto;
  reportDate: string;
}

export interface CreateBranchDto {
  branchCode: string;
  branchName: string;
  branchType: number;
  address: string;
  managerName: string;
  phone: string;
  email: string;
  city: string;
  province: string;
  postalCode: string;
  openingDate: string;
  storeSize: string;
  employeeCount: number;
  isActive: boolean;
}

export interface UpdateBranchDto {
  branchCode: string;
  branchName: string;
  branchType: number;
  address: string;
  managerName: string;
  phone: string;
  email: string;
  city: string;
  province: string;
  postalCode: string;
  openingDate: string;
  storeSize: string;
  employeeCount: number;
  isActive: boolean;
}

export interface ToggleBranchStatusDto {
  branchId: number;
  isActive: boolean;
  reason: string;
}

export interface BranchQueryParams {
  search?: string;
  branchType?: number;
  city?: string;
  province?: string;
  isActive?: boolean;
  storeSize?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface BranchDetailDto extends BranchDto {
  assignedUsers: BranchUserDto[];
  usersWithAccess: BranchUserDto[];
  userCountByRole: { [role: string]: number };
  totalActiveUsers: number;
  totalInactiveUsers: number;
  canEdit: boolean;
  canDelete: boolean;
}

export interface BranchUserDto {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  branchId: number;
  branchName: string;
  branchCity: string;
  canAccessMultipleBranches: boolean;
  accessibleBranches: SimpleBranchDto[];
  isActive: boolean;
  assignedAt: string;
  lastUpdated: string;
}

// API Response wrappers
export interface BranchApiResponse {
  success: boolean;
  message?: string;
  data: BranchDto;
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface BranchListApiResponse {
  success: boolean;
  message?: string;
  data: BranchDto[];
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface AccessibleBranchListApiResponse {
  success: boolean;
  message?: string;
  data: AccessibleBranchDto[];
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface BranchDetailApiResponse {
  success: boolean;
  message?: string;
  data: BranchDetailDto;
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface BranchPerformanceListApiResponse {
  success: boolean;
  message?: string;
  data: BranchPerformanceDto[];
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface BranchComparisonApiResponse {
  success: boolean;
  message?: string;
  data: BranchComparisonDto;
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface BranchAnalyticsApiResponse {
  success: boolean;
  message?: string;
  data: BranchAnalyticsDto;
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface BranchUserSummaryListApiResponse {
  success: boolean;
  message?: string;
  data: BranchUserSummaryDto[];
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface BranchValidationApiResponse {
  success: boolean;
  message?: string;
  data: boolean;
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface SimpleBranchListApiResponse {
  success: boolean;
  message?: string;
  data: SimpleBranchDto[];
  timestamp: string;
  errors?: any;
  error?: any;
}

// Branch types enum for frontend
export enum BranchType {
  Head = 0,
  Branch = 1,
  SubBranch = 2
}

export const BranchTypeNames: { [key: number]: string } = {
  [BranchType.Head]: 'Head',
  [BranchType.Branch]: 'Branch',
  [BranchType.SubBranch]: 'SubBranch'
};

// Store sizes
export const StoreSizes = ['Small', 'Medium', 'Large', 'XLarge'] as const;
export type StoreSize = typeof StoreSizes[number];