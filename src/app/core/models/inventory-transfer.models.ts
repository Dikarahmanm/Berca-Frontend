// ==================== ENUMS ==================== //

export enum TransferStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  InTransit = 'InTransit',
  Delivered = 'Delivered',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export enum TransferPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Emergency = 3
}

export enum TransferType {
  Regular = 0,
  Emergency = 1,
  Rebalancing = 2,
  Bulk = 3
}

export enum MutationType {
  Transfer = 'Transfer',
  Adjustment = 'Adjustment',
  Sale = 'Sale',
  Purchase = 'Purchase',
  Return = 'Return'
}

export enum UrgencyLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export enum RebalancingAction {
  Transfer = 'Transfer',
  Redistribute = 'Redistribute',
  Consolidate = 'Consolidate'
}

export enum ImplementationDifficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard'
}

// ==================== CORE TRANSFER MODELS ==================== //

export interface InventoryTransferDto {
  id: number;
  transferNumber: string;
  sourceBranchId: number;
  sourceBranchName: string;
  destinationBranchId: number;
  destinationBranchName: string;
  status: TransferStatus;
  priority: TransferPriority;
  requestedById: number;
  requestedByName: string;
  requestedAt: Date;
  approvedById?: number;
  approvedByName?: string;
  approvedAt?: Date;
  shippedById?: number;
  shippedByName?: string;
  shippedAt?: Date;
  receivedById?: number;
  receivedByName?: string;
  receivedAt?: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  totalCost: number;
  notes?: string;
  cancellationReason?: string;
  items: TransferItemDto[];
  statusHistory: TransferStatusHistory[];

  // Workflow permission flags (like facture management)
  canApprove?: boolean;
  canReject?: boolean;
  canShip?: boolean;
  canReceive?: boolean;
  canCancel?: boolean;
}

export interface TransferItemDto {
  id: number;
  productId: number;
  productName: string;
  productCode: string;
  productImageUrl?: string;
  categoryName?: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  shippedQuantity?: number;
  receivedQuantity?: number;
  damageQuantity?: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface TransferStatusHistory {
  id: number;
  transferId: number;
  fromStatus: TransferStatus;
  toStatus: TransferStatus;
  changedById: number;
  changedByName: string;
  changedByRole?: string;
  changedAt: Date;
  reason?: string;
  notes?: string;
  additionalData?: Record<string, any>;
}

export interface InventoryTransferSummaryDto {
  id: number;
  transferNumber: string;
  sourceBranchName: string;
  destinationBranchName: string;
  status: TransferStatus;
  priority: TransferPriority;
  requestedAt: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  totalItems: number;
  totalCost: number;
  requestedByName: string;
  daysInTransit?: number;
  isOverdue?: boolean;
  canCancel?: boolean;
  canApprove?: boolean;
  canShip?: boolean;
  canReceive?: boolean;
}

// ==================== REQUEST/RESPONSE DTOS ==================== //

export interface CreateInventoryTransferRequestDto {
  sourceBranchId: number;
  destinationBranchId: number;
  type: TransferType;
  priority: TransferPriority;
  requestReason: string;
  notes?: string;
  estimatedCost: number;
  estimatedDeliveryDate?: Date;
  transferItems: CreateTransferItemDto[];
}

export interface CreateTransferItemDto {
  productId: number;
  quantity: number;
  expiryDate?: Date;
  batchNumber?: string;
  qualityNotes?: string;
}

export interface BulkTransferRequestDto {
  transfers: CreateInventoryTransferRequestDto[];
  notes?: string;
  processingMode?: 'Sequential' | 'Parallel';
}

export interface TransferApprovalRequestDto {
  approved: boolean;
  approvalNotes?: string;
  itemApprovals?: TransferItemApprovalDto[];
  managerOverride?: boolean;
}

export interface TransferItemApprovalDto {
  transferItemId: number;
  approvedQuantity: number;
  notes?: string;
  substitueProductId?: number;
}

export interface TransferShipmentRequestDto {
  shipmentNotes?: string;
  itemShipments?: TransferItemShipmentDto[];
  estimatedDeliveryDate?: Date;
  trackingNumber?: string;
  courierName?: string;
}

export interface TransferItemShipmentDto {
  transferItemId: number;
  shippedQuantity: number;
  notes?: string;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface TransferReceiptRequestDto {
  receiptNotes?: string;
  itemReceipts?: TransferItemReceiptDto[];
  actualDeliveryDate?: Date;
  qualityCheckPassed?: boolean;
}

export interface TransferItemReceiptDto {
  transferItemId: number;
  receivedQuantity: number;
  damageQuantity?: number;
  notes?: string;
  qualityGrade?: 'A' | 'B' | 'C' | 'Rejected';
  damageReason?: string;
}

// ==================== QUERY PARAMETERS ==================== //

export interface InventoryTransferQueryParams {
  page?: number;
  pageSize?: number;
  status?: TransferStatus[];
  priority?: TransferPriority[];
  sourceBranchId?: number;
  destinationBranchId?: number;
  requestedFromDate?: Date;
  requestedToDate?: Date;
  searchTerm?: string;
  sortBy?: TransferSortField;
  sortOrder?: 'asc' | 'desc';
  includeItems?: boolean;
  includeHistory?: boolean;
  onlyOverdue?: boolean;
  onlyEmergency?: boolean;
}

export enum TransferSortField {
  TransferNumber = 'transferNumber',
  RequestedAt = 'requestedAt',
  EstimatedDelivery = 'estimatedDeliveryDate',
  ActualDelivery = 'actualDeliveryDate',
  TotalCost = 'totalCost',
  Priority = 'priority',
  Status = 'status',
  SourceBranch = 'sourceBranchName',
  DestinationBranch = 'destinationBranchName'
}

// ==================== ANALYTICS & REPORTING ==================== //

export interface TransferAnalyticsDto {
  analysisDate: Date;
  analysisRange: {
    startDate: Date;
    endDate: Date;
  };
  totalTransfers: number;
  pendingTransfers: number;
  approvedTransfers: number;
  inTransitTransfers: number;
  completedTransfers: number;
  cancelledTransfers: number;
  rejectedTransfers: number;
  totalTransferValue: number;
  averageTransferValue: number;
  averageProcessingTime: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  cancelationRate: number;
  approvalRate: number;

  // Branch Performance
  topSourceBranches: BranchTransferStatsDto[];
  topDestinationBranches: BranchTransferStatsDto[];
  mostEfficientRoutes: RoutePerformanceDto[];

  // Trends & Patterns
  transferTrends: TransferTrendDto[];
  busyDays: DayOfWeekStats[];
  seasonalPatterns: MonthlyStats[];

  // Recent Activity
  recentTransfers: InventoryTransferSummaryDto[];
  urgentTransfers: InventoryTransferSummaryDto[];

  // AI Insights
  aiInsights?: TransferInsightDto[];
  recommendations?: TransferRecommendationDto[];
}

export interface BranchTransferStatsDto {
  branchId: number;
  branchName: string;
  branchCode: string;
  region?: string;
  outgoingTransfers: number;
  incomingTransfers: number;
  outgoingValue: number;
  incomingValue: number;
  netTransferValue: number;
  averageProcessingTime: number;
  averageDeliveryTime: number;
  successRate: number;
  onTimeRate: number;
  cancelationRate: number;
  topProducts: ProductTransferStatsDto[];
  efficiency: {
    score: number;
    ranking: number;
    totalBranches: number;
  };
}

export interface ProductTransferStatsDto {
  productId: number;
  productName: string;
  productCode: string;
  transferCount: number;
  totalQuantity: number;
  averageQuantity: number;
  totalValue: number;
  lastTransferDate: Date;
}

export interface RoutePerformanceDto {
  routeId: string;
  sourceBranchId: number;
  sourceBranchName: string;
  destinationBranchId: number;
  destinationBranchName: string;
  distance: number;
  transferCount: number;
  averageDeliveryTime: number;
  onTimeRate: number;
  averageCost: number;
  efficiencyScore: number;
  lastTransferDate: Date;
}

export interface TransferTrendDto {
  date: Date;
  transferCount: number;
  transferValue: number;
  averageValue: number;
  completionRate: number;
  onTimeRate: number;
  emergencyTransfers: number;
  canceledTransfers: number;
}

export interface DayOfWeekStats {
  dayOfWeek: number;
  dayName: string;
  transferCount: number;
  averageValue: number;
  peakHours: number[];
}

export interface MonthlyStats {
  month: number;
  monthName: string;
  year: number;
  transferCount: number;
  totalValue: number;
  growthRate: number;
}

export interface TransferInsightDto {
  id: string;
  type: 'Efficiency' | 'Cost' | 'Performance' | 'Risk' | 'Opportunity';
  title: string;
  description: string;
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
  actionable: boolean;
  metadata?: Record<string, any>;
}

export interface TransferRecommendationDto {
  id: string;
  type: 'Route' | 'Timing' | 'Quantity' | 'Product' | 'Branch';
  title: string;
  description: string;
  expectedBenefit: string;
  implementation: string;
  priority: number;
  estimatedSavings?: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

// ==================== EMERGENCY & OPTIMIZATION ==================== //

export interface EmergencyTransferSuggestionDto {
  id: string;
  productId: number;
  productName: string;
  productCode: string;
  productImageUrl?: string;
  categoryName: string;
  destinationBranchId: number;
  destinationBranchName: string;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  suggestedQuantity: number;
  urgencyLevel: UrgencyLevel;
  estimatedStockoutDate: Date;
  businessImpact: number;
  suggestedSourceBranches: AvailableSourceDto[];
  alternativeProducts?: AlternativeProductDto[];
  autoCreateTransfer?: boolean;
}

export interface AvailableSourceDto {
  branchId: number;
  branchName: string;
  branchCode: string;
  region?: string;
  availableQuantity: number;
  reservedQuantity: number;
  distance: number;
  estimatedCost: number;
  estimatedDeliveryTime: number;
  reliability: number;
  confidence: number;
  preferredSupplier: boolean;
  lastSuccessfulTransfer?: Date;
}

export interface AlternativeProductDto {
  productId: number;
  productName: string;
  productCode: string;
  similarity: number;
  availableQuantity: number;
  priceDifference: number;
  customerAcceptance: number;
}

export interface StockRebalancingSuggestionDto {
  id: string;
  productId: number;
  productName: string;
  productCode: string;
  categoryName: string;
  suggestions: RebalancingActionDto[];
  totalImpact: number;
  priority: number;
  estimatedSavings: number;
  implementationComplexity: ImplementationDifficulty;
  deadline?: Date;
}

export interface RebalancingActionDto {
  actionId: string;
  action: RebalancingAction;
  sourceBranchId: number;
  sourceBranchName: string;
  destinationBranchId: number;
  destinationBranchName: string;
  quantity: number;
  reason: string;
  expectedImpact: number;
  cost: number;
  deliveryTime: number;
  riskLevel: number;
  dependencies?: string[];
}

export interface TransferEfficiencyDto {
  transferId?: number;
  routeId: string;
  sourceBranchId: number;
  sourceBranchName: string;
  destinationBranchId: number;
  destinationBranchName: string;
  currentRoute: RouteDetailDto;
  suggestedRoute: RouteDetailDto;
  currentCost: number;
  suggestedCost: number;
  potentialSavings: number;
  efficiencyGain: number;
  timeImprovement: number;
  implementationDifficulty: ImplementationDifficulty;
  requiredInfrastructure?: string[];
  estimatedROI?: number;
}

export interface RouteDetailDto {
  routeDescription: string;
  distance: number;
  estimatedTime: number;
  waypoints?: string[];
  transportMode: 'Road' | 'Rail' | 'Air' | 'Sea' | 'Combined';
  reliability: number;
}

// ==================== VALIDATION & BUSINESS RULES ==================== //

export interface TransferValidationResult {
  isValid: boolean;
  validationErrors: ValidationErrorDto[];
  warnings: ValidationWarningDto[];
  blockers: ValidationBlockerDto[];
  canProceedWithWarnings: boolean;
}

export interface ValidationErrorDto {
  code: string;
  field: string;
  message: string;
  severity: 'Error' | 'Warning' | 'Info';
  suggestedFix?: string;
}

export interface ValidationWarningDto {
  code: string;
  message: string;
  impact: string;
  canOverride: boolean;
  requiresApproval: boolean;
}

export interface ValidationBlockerDto {
  code: string;
  message: string;
  reason: string;
  resolution: string;
  estimatedTime?: number;
}

// ==================== COST CALCULATION ==================== //

export interface TransferCostCalculationDto {
  calculationId: string;
  requestDetails: {
    sourceBranchId: number;
    destinationBranchId: number;
    items: CreateTransferItemDto[];
    priority: TransferPriority;
  };
  costBreakdown: CostBreakdownDto;
  totalCost: number;
  estimatedDeliveryDate: Date;
  alternativeOptions?: CostAlternativeDto[];
  validUntil: Date;
}

export interface CostBreakdownDto {
  baseCost: number;
  transportationCost: number;
  handlingCost: number;
  insuranceCost: number;
  priorityPremium: number;
  distancePremium: number;
  fuelSurcharge: number;
  adminFee: number;
  taxes: number;
  discounts: number;
}

export interface CostAlternativeDto {
  alternativeId: string;
  description: string;
  totalCost: number;
  estimatedDeliveryDate: Date;
  costSavings: number;
  deliveryDelayDays: number;
  reliability: number;
  recommended: boolean;
}

// ==================== NOTIFICATION & ALERTS ==================== //

export interface TransferNotificationDto {
  id: string;
  transferId: number;
  transferNumber: string;
  type: TransferNotificationType;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  title: string;
  message: string;
  recipients: NotificationRecipientDto[];
  scheduledAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export enum TransferNotificationType {
  TransferRequested = 'TransferRequested',
  TransferApproved = 'TransferApproved',
  TransferRejected = 'TransferRejected',
  TransferShipped = 'TransferShipped',
  TransferDelivered = 'TransferDelivered',
  TransferReceived = 'TransferReceived',
  TransferCompleted = 'TransferCompleted',
  TransferCancelled = 'TransferCancelled',
  TransferOverdue = 'TransferOverdue',
  TransferDelayed = 'TransferDelayed',
  EmergencyTransferNeeded = 'EmergencyTransferNeeded'
}

export interface NotificationRecipientDto {
  userId: number;
  userName: string;
  email: string;
  role: string;
  notificationMethod: 'Email' | 'SMS' | 'Push' | 'InApp';
  deliveryStatus: 'Pending' | 'Sent' | 'Delivered' | 'Read' | 'Failed';
}

// ==================== API RESPONSE WRAPPER ==================== //

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
  timestamp?: Date;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ==================== UI HELPER MODELS ==================== //

export interface TransferStatusBadge {
  text: string;
  class: string;
  icon: string;
  color: string;
}

export interface TransferPriorityBadge {
  text: string;
  class: string;
  icon: string;
  color: string;
}

export interface TransferActionButton {
  label: string;
  action: string;
  icon: string;
  class: string;
  disabled: boolean;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

// ==================== FORM MODELS ==================== //

export interface TransferFormData {
  sourceBranchId: number | null;
  destinationBranchId: number | null;
  priority: TransferPriority;
  estimatedDeliveryDate: Date | null;
  notes: string;
  items: TransferFormItemData[];
}

export interface TransferFormItemData {
  productId: number | null;
  productName: string;
  productCode: string;
  requestedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  notes: string;
  batchNumber: string;
  expiryDate: Date | null;
  isValid: boolean;
  validationErrors: string[];
}

export interface ApprovalFormData {
  transferId: number;
  approved: boolean;
  approvalNotes: string;
  itemApprovals: ItemApprovalFormData[];
  managerOverride: boolean;
}

export interface ItemApprovalFormData {
  transferItemId: number;
  productName: string;
  requestedQuantity: number;
  approvedQuantity: number;
  notes: string;
  substitueProductId: number | null;
  isValid: boolean;
}

export interface ShipmentFormData {
  transferId: number;
  shipmentNotes: string;
  estimatedDeliveryDate: Date | null;
  trackingNumber: string;
  courierName: string;
  itemShipments: ItemShipmentFormData[];
}

export interface ItemShipmentFormData {
  transferItemId: number;
  productName: string;
  approvedQuantity: number;
  shippedQuantity: number;
  notes: string;
  batchNumber: string;
  expiryDate: Date | null;
  isValid: boolean;
}

export interface ReceiptFormData {
  transferId: number;
  receiptNotes: string;
  actualDeliveryDate: Date | null;
  qualityCheckPassed: boolean;
  itemReceipts: ItemReceiptFormData[];
}

export interface ItemReceiptFormData {
  transferItemId: number;
  productName: string;
  shippedQuantity: number;
  receivedQuantity: number;
  damageQuantity: number;
  notes: string;
  qualityGrade: 'A' | 'B' | 'C' | 'Rejected';
  damageReason: string;
  isValid: boolean;
}