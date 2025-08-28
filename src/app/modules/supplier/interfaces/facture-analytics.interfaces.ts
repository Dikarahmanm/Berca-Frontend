// Interfaces untuk Facture Analytics API endpoints
// Digunakan untuk dashboard supplier dengan data outstanding factures

export interface OutstandingFactureDto {
  id: number;
  supplierInvoiceNumber: string;
  internalReferenceNumber: string;
  supplierName: string;
  branchName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: number;
  statusDisplay: string;
  paymentPriority: number;
  priorityDisplay: string;
  daysOverdue: number;
  daysUntilDue: number;
  isOverdue: boolean;
  totalAmountDisplay: string;
  outstandingAmountDisplay: string;
  createdAt: string;
}

export interface TopOutstandingFactureDto {
  id: number;
  supplierInvoiceNumber: string;
  internalReferenceNumber: string;
  outstandingAmount: number;
  daysOverdue: number;
  dueDate: string;
  priority: number;
}

export interface TopSupplierByFacturesDto {
  supplierId: number;
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  totalOutstandingFactures: number;
  totalOutstandingAmount: number;
  oldestOutstandingDays: number;
  averagePaymentDelayDays: number;
  oldestFactureDueDate: string;
  overdueCount: number;
  overdueAmount: number;
  paymentRisk: string;
  topOutstandingFactures: TopOutstandingFactureDto[];
}

export interface BranchSpendingCategoryDto {
  category: string;
  amount: number;
  facturesCount: number;
  percentage: number;
}

export interface BranchTopSupplierDto {
  supplierId: number;
  supplierCode: string;
  companyName: string;
  monthlySpending: number;
  facturesCount: number;
  outstandingAmount: number;
}

export interface SuppliersByBranchDto {
  branchId: number;
  branchCode: string;
  branchName: string;
  city: string;
  totalSuppliers: number;
  activeSuppliers: number;
  totalOutstanding: number;
  averageFactureAmount: number;
  totalFacturesThisMonth: number;
  paymentComplianceRate: number;
  topSuppliers: BranchTopSupplierDto[];
  spendingByCategory: BranchSpendingCategoryDto[];
}

export interface SupplierAlertDto {
  id: number;
  alertType: string;
  priority: string;
  title: string;
  message: string;
  supplierId: number;
  supplierName: string;
  factureId: number;
  factureReference: string;
  amount: number;
  createdAt: string;
  dueDate: string;
  daysOverdue: number;
  actionRequired: string;
  isRead: boolean;
  branchId: number;
  branchName: string;
}

export interface AlertsByCategoryDto {
  category: string;
  count: number;
  priority: string;
}

export interface SupplierAlertsResponseDto {
  criticalAlerts: SupplierAlertDto[];
  warningAlerts: SupplierAlertDto[];
  infoAlerts: SupplierAlertDto[];
  summary: {
    totalCriticalAlerts: number;
    totalWarningAlerts: number;
    totalInfoAlerts: number;
    unreadAlerts: number;
    totalAmountAtRisk: number;
    suppliersWithAlerts: number;
    lastUpdated: string;
    alertsByCategory: AlertsByCategoryDto[];
  };
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// Query parameters for API calls
export interface OutstandingFacturesQueryParams {
  branchId?: number;
  supplierId?: number;
  limit?: number;
}

export interface TopSuppliersByFacturesQueryParams {
  branchId?: number;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface SuppliersByBranchQueryParams {
  branchId?: number;
}

export interface SupplierAlertsQueryParams {
  branchId?: number;
  priorityFilter?: string;
}