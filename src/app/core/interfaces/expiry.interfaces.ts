// src/app/core/interfaces/expiry.interfaces.ts - Complete Expiry Management Interfaces
// Angular 20 TypeScript interfaces for comprehensive expiry and batch management

// ===== ENUMS =====

export enum ExpiryStatus {
  GOOD = 'Good',
  WARNING = 'Warning',
  CRITICAL = 'Critical',
  EXPIRED = 'Expired'
}

export enum ExpiryUrgency {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum DisposalMethod {
  MANUAL = 'Manual',
  RETURN_TO_SUPPLIER = 'Return to Supplier',
  DONATE = 'Donate',
  DESTROY = 'Destroy'
}

export enum BatchStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  DISPOSED = 'DISPOSED',
  EXPIRED = 'EXPIRED'
}

// ===== CORE EXPIRY INTERFACES =====

export interface ExpiringProduct {
  productId: number;
  productName: string;
  productBarcode: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  batchId: number;
  batchNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
  expiryStatus: ExpiryStatus;
  currentStock: number;
  availableStock: number;
  valueAtRisk: number;
  costPerUnit: number;
  urgencyLevel: ExpiryUrgency;
  branchId?: number;
  branchName?: string;
  supplierName?: string;
  isBlocked: boolean;
  blockReason?: string;
  lastUpdated: string;
}

export interface ExpiredProduct {
  productId: number;
  productName: string;
  productBarcode: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  batchId: number;
  batchNumber: string;
  expiryDate: string;
  daysOverdue: number;
  currentStock: number;
  lossValue: number;
  costPerUnit: number;
  branchId?: number;
  branchName?: string;
  supplierName?: string;
  isDisposed: boolean;
  disposedAt?: string;
  disposedBy?: string;
  disposalMethod?: DisposalMethod;
  disposalReason?: string;
  disposalNotes?: string;
}

export interface ProductBatch {
  id: number;
  productId: number;
  productName: string;
  productBarcode: string;
  batchNumber: string;
  expiryDate?: string;
  productionDate?: string;
  currentStock: number;
  initialStock: number;
  availableStock: number;
  reservedStock: number;
  costPerUnit: number;
  totalValue: number;
  supplierName?: string;
  purchaseOrderNumber?: string;
  notes?: string;
  status: BatchStatus;
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;
  isDisposed: boolean;
  disposalDate?: string;
  disposalMethod?: DisposalMethod;
  disposalReason?: string;
  disposalNotes?: string;
  disposedBy?: string;
  createdAt: string;
  updatedAt: string;
  branchId?: number;
  branchName?: string;
}

// ===== ANALYTICS INTERFACES =====

export interface ExpiryAnalytics {
  totalProductsWithExpiry: number;
  expiringProducts: number;
  expiredProducts: number;
  criticalProducts: number;
  totalStockValue: number;
  expiringStockValue: number;
  expiredStockValue: number;
  totalWasteValue: number;
  potentialLossValue: number;
  wastePercentage: number;
  expiryRate: number;
  averageDaysToExpiry: number;
  topExpiringCategories: CategoryExpiryStats[];
  expiryTrends: ExpiryTrendData[];
  branchComparison?: BranchExpiryStats[];
  monthlyWasteTrend: MonthlyWasteData[];
  urgencyBreakdown: UrgencyBreakdown;
}

export interface CategoryExpiryStats {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  requiresExpiryDate: boolean;
  totalProducts: number;
  expiringProducts: number;
  expiredProducts: number;
  criticalProducts: number;
  totalStockValue: number;
  wasteValue: number;
  averageDaysToExpiry: number;
  expiryRate: number;
  trendDirection: 'improving' | 'stable' | 'worsening';
}

export interface CategoryWithExpiry {
  id: number;
  name: string;
  description?: string;
  color: string;
  requiresExpiryDate: boolean;
  defaultExpiryWarningDays: number;
  defaultShelfLifeDays?: number;
  productsCount: number;
  productsWithExpiryCount: number;
  expiringProductsCount: number;
  expiredProductsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpiryTrendData {
  date: string;
  expiringCount: number;
  expiredCount: number;
  wasteValue: number;
  totalValue: number;
  wastePercentage: number;
}

export interface BranchExpiryStats {
  branchId: number;
  branchName: string;
  totalProducts: number;
  expiringProducts: number;
  expiredProducts: number;
  wasteValue: number;
  wastePercentage: number;
  performanceRank: number;
}

export interface MonthlyWasteData {
  month: string;
  year: number;
  wasteValue: number;
  wastePercentage: number;
  itemsWasted: number;
}

export interface UrgencyBreakdown {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

// ===== FILTER INTERFACES =====

export interface ExpiringProductsFilter {
  categoryId?: number;
  branchId?: number;
  expiryStatus?: ExpiryStatus;
  urgencyLevel?: ExpiryUrgency;
  daysUntilExpiry?: number;
  minStock?: number;
  maxStock?: number;
  searchTerm?: string;
  includeBlocked?: boolean;
  sortBy?: 'expiryDate' | 'stock' | 'value' | 'productName' | 'daysUntilExpiry';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ExpiredProductsFilter {
  categoryId?: number;
  branchId?: number;
  daysOverdue?: number;
  minValue?: number;
  maxValue?: number;
  searchTerm?: string;
  includeDisposed?: boolean;
  disposalStatus?: 'pending' | 'disposed';
  disposalMethod?: DisposalMethod;
  sortBy?: 'expiryDate' | 'lossValue' | 'daysOverdue' | 'productName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ProductBatchFilter {
  productId?: number;
  categoryId?: number;
  branchId?: number;
  batchStatus?: BatchStatus;
  expiryStatus?: ExpiryStatus;
  searchTerm?: string;
  includeDisposed?: boolean;
  sortBy?: 'expiryDate' | 'batchNumber' | 'stock' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// ===== BATCH MANAGEMENT INTERFACES =====

export interface CreateProductBatch {
  productId: number;
  batchNumber: string;
  expiryDate?: string;
  productionDate?: string;
  initialStock: number;
  costPerUnit: number;
  supplierName?: string;
  purchaseOrderNumber?: string;
  notes?: string;
  branchId?: number;
}

export interface UpdateProductBatch {
  batchNumber?: string;
  expiryDate?: string;
  productionDate?: string;
  currentStock?: number;
  costPerUnit?: number;
  supplierName?: string;
  purchaseOrderNumber?: string;
  notes?: string;
  isBlocked?: boolean;
  blockReason?: string;
}

export interface BatchDisposalRequest {
  disposalMethod: DisposalMethod;
  reason: string;
  notes?: string;
  disposedBy?: string;
}

export interface BulkDisposeRequest {
  batchIds: number[];
  disposalMethod: DisposalMethod;
  reason: string;
  notes?: string;
  disposedBy?: string;
}

export interface BatchTransferRequest {
  fromBatchId: number;
  toBatchId: number;
  quantity: number;
  reason: string;
  notes?: string;
}

export interface BatchStockAdjustment {
  batchId: number;
  adjustmentType: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
  adjustedBy?: string;
}

// ===== FIFO & RECOMMENDATIONS =====

export interface FifoRecommendationDto {
  productId: number;
  productName: string;
  productBarcode: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  recommendedAction: 'sell_first' | 'discount' | 'transfer' | 'dispose';
  priority: ExpiryUrgency;
  totalAtRiskValue: number;
  batches: FifoBatchRecommendation[];
  suggestedDiscount?: number;
  alternativeActions?: string[];
  notes?: string;
}

export interface FifoBatchRecommendation {
  batchId: number;
  batchNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
  currentStock: number;
  recommendedQuantity: number;
  recommendedAction: string;
  urgencyLevel: ExpiryUrgency;
  valueAtRisk: number;
}

// ===== NOTIFICATION INTERFACES =====

export interface ExpiryNotification {
  id: number;
  type: 'expiry_warning' | 'expired_alert' | 'batch_blocked' | 'disposal_reminder';
  title: string;
  message: string;
  productId: number;
  productName: string;
  batchId?: number;
  batchNumber?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  priority: ExpiryUrgency;
  isRead: boolean;
  actionUrl?: string;
  actionRequired: boolean;
  createdAt: string;
  readAt?: string;
  branchId?: number;
  branchName?: string;
}

export interface NotificationPreferences {
  enableExpiryWarnings: boolean;
  warningDaysBefore: number;
  enableExpiredAlerts: boolean;
  enableBatchNotifications: boolean;
  enableDisposalReminders: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

// ===== BULK OPERATIONS =====

export interface BulkOperationRequest {
  type: 'dispose' | 'transfer' | 'discount' | 'block' | 'unblock';
  batchIds: number[];
  parameters: Record<string, any>;
  reason: string;
  notes?: string;
  performedBy?: string;
}

export interface BulkOperationResult {
  success: boolean;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  results: BulkItemResult[];
  summary: string;
  errors?: string[];
}

export interface BulkItemResult {
  batchId: number;
  batchNumber: string;
  productName: string;
  success: boolean;
  message?: string;
  error?: string;
}

export interface BulkPreviewResult {
  totalItems: number;
  estimatedValue: number;
  categoryBreakdown: CategoryBulkBreakdown[];
  warnings: string[];
  recommendations: string[];
}

export interface CategoryBulkBreakdown {
  categoryId: number;
  categoryName: string;
  itemCount: number;
  totalValue: number;
  averageDaysUntilExpiry: number;
}

// ===== RESPONSE WRAPPERS =====

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  validationErrors?: Record<string, string>;
  timestamp?: string;
}

// ===== FORM & VALIDATION =====

export interface ExpiryFormData {
  expiryDate?: Date | string;
  batchNumber?: string;
  productionDate?: Date | string;
  initialStock?: number;
  costPerUnit?: number;
  supplierName?: string;
  purchaseOrderNumber?: string;
  notes?: string;
}

export interface ExpiryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldErrors: Record<string, string>;
  recommendations?: string[];
}

export interface CategoryExpirySettings {
  categoryId: number;
  requiresExpiryDate: boolean;
  defaultExpiryWarningDays: number;
  defaultShelfLifeDays?: number;
  autoBlockExpired: boolean;
  autoDisposeAfterDays?: number;
  allowNegativeStock: boolean;
  updatedBy?: string;
}

// ===== DASHBOARD & REPORTING =====

export interface ExpiryDashboard {
  summary: ExpiryAnalytics;
  criticalItems: ExpiringProduct[];
  recentlyExpired: ExpiredProduct[];
  fifoRecommendations: FifoRecommendationDto[];
  notifications: ExpiryNotification[];
  trends: ExpiryTrendData[];
  lastUpdated: string;
}

export interface ExpiryReport {
  reportType: 'expiry_summary' | 'waste_analysis' | 'fifo_compliance' | 'category_performance';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters?: Record<string, any>;
  data: any;
  charts?: ChartData[];
  summary: ReportSummary;
  generatedAt: string;
  generatedBy?: string;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  data: any;
  options?: any;
}

export interface ReportSummary {
  totalValue: number;
  totalWaste: number;
  wastePercentage: number;
  keyFindings: string[];
  recommendations: string[];
}

// ===== MOBILE & UI STATE =====

export interface ExpiryUIState {
  selectedView: 'list' | 'grid' | 'analytics';
  selectedFilter: ExpiryStatus | 'all';
  selectedCategory: number | null;
  selectedBranch: number | null;
  showOnlyWarnings: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pageSize: number;
  currentPage: number;
}

export interface ExpiryListViewOptions {
  showBatchNumbers: boolean;
  showSupplierNames: boolean;
  showValues: boolean;
  showDaysUntilExpiry: boolean;
  groupByCategory: boolean;
  groupByBranch: boolean;
  highlightCritical: boolean;
}