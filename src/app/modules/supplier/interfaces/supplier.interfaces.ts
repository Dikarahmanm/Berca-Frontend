// ==================== CORE API RESPONSE WRAPPER ==================== //

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
  errors?: string[];
}

// ==================== SUPPLIER CORE INTERFACES ==================== //

export interface SupplierDto {
  id: number;
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: number; // days
  creditLimit: number;
  isActive: boolean;
  branchId?: number;
  branchName?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  
  // Computed fields
  totalFactures?: number;
  outstandingAmount?: number;
  lastFactureDate?: Date;
  averagePaymentDays?: number;
}

export interface CreateSupplierDto {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: number; // 1-365 days
  creditLimit: number;
  branchId?: number;
  supplierCode?: string; // Auto-generated if not provided
}

export interface UpdateSupplierDto {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: number;
  creditLimit: number;
}

export interface SupplierStatusDto {
  isActive: boolean;
  reason?: string;
}

export interface SupplierSummaryDto {
  id: number;
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  paymentTerms: number;
  creditLimit: number;
  isActive: boolean;
  branchId?: number;
  branchName?: string;
}

// ==================== SUPPLIER QUERY & PAGINATION ==================== //

export interface SupplierQueryDto {
  search?: string;
  branchId?: number;
  isActive?: boolean;
  minPaymentTerms?: number;
  maxPaymentTerms?: number;
  minCreditLimit?: number;
  maxCreditLimit?: number;
  page: number;
  pageSize: number; // max 100
  sortBy: string; // 'companyName' | 'supplierCode' | 'createdAt' | 'paymentTerms' | 'creditLimit'
  sortOrder: 'asc' | 'desc';
}

export interface SupplierQueryParams extends SupplierQueryDto {
  // Backend model for service layer
}

export interface SupplierPagedResponseDto {
  suppliers: SupplierDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ==================== SUPPLIER ANALYTICS ==================== //

export interface SupplierStatsDto {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  averagePaymentTerms: number;
  totalCreditLimit: number;
  suppliersWithOutstandingFactures: number;
  topSuppliersByFactureCount: SupplierRankingDto[];
  topSuppliersByAmount: SupplierRankingDto[];
  suppliersByBranch: SupplierBranchStatsDto[];
}

export interface SupplierRankingDto {
  supplierId: number;
  companyName: string;
  count: number;
  totalAmount: number;
}

export interface SupplierBranchStatsDto {
  branchId: number;
  branchName: string;
  supplierCount: number;
  activeCount: number;
}

export interface SupplierAlertDto {
  supplierId: number;
  companyName: string;
  alertType: 'OVERDUE_PAYMENTS' | 'CREDIT_LIMIT_EXCEEDED' | 'INACTIVE_LONG_TIME' | 'MISSING_CONTACT_INFO';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  actionRequired: string;
  daysOverdue?: number;
  outstandingAmount?: number;
  recommendedAction: string;
}