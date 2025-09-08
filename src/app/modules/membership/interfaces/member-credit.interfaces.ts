// Member Credit Management Interfaces - Complete Type Definitions
// POS Toko Eniwan - Member Credit Integration

// ===== CORE CREDIT INTERFACES =====

export interface MemberCreditSummaryDto {
  memberId: number;
  memberName: string;
  memberNumber: string;
  phone: string;
  tier: number;
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  creditUtilization: number;
  status: number; // API returns number, not string
  statusDescription: string; // API includes this
  paymentTerms: number;
  lastPaymentDate?: string;
  nextPaymentDueDate?: string;
  daysOverdue: number;
  overdueAmount: number;
  creditScore: number;
  creditGrade: string; // API includes this
  paymentSuccessRate: number;
  paymentDelays: number;
  lifetimeDebt: number;
  recentTransactions: any[]; // API includes this
  remindersSent: number;
  lastReminderDate?: string;
  isEligible: boolean;
  isEligibleForCredit: boolean;
  riskLevel: string; // API returns string like "Very High"
  requiresAttention: boolean;
  formattedCreditLimit: string;
  formattedCurrentDebt: string;
  formattedAvailableCredit: string;
  paymentTermDays: number;
  totalDelayedPayments: number;
  nextPaymentDue?: string;
  lastCreditDate?: string;
  totalTransactions: number;
  totalCreditUsed: number;
  avgTransactionAmount?: number; // Optional property for average transaction calculation
  branchName?: string; // Optional property for branch information
}

export interface CreditTransactionDto {
  id: number;
  memberId: number;
  transactionType: 'Sale' | 'Payment' | 'Credit_Grant' | 'Credit_Adjustment' | 'Fee' | 'Interest';
  amount: number;
  description: string;
  referenceNumber: string;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod?: 'Cash' | 'Transfer' | 'Credit_Card' | 'E_Wallet' | 'Other';
  createdAt: string;
  createdBy: string;
  branchId: number;
  branchName: string;
  saleId?: number;
  notes?: string;
  dueDate?: string;
  isPaid: boolean;
  paidAt?: string;
}

export interface CreditEligibilityDto {
  memberId: number;
  memberName: string;
  isEligible: boolean;
  requestedAmount: number;
  approvedAmount: number;
  decisionReason: string;
  requirementsNotMet: string[];
  currentUtilization: number;
  creditScore: number;
  eligibilityScore: number; // Added missing property
  status: number;
  availableCredit: number;
  riskFactors: string[];
  riskLevel: string;
  requiresManagerApproval: boolean;
  recommendations: string[];
  suggestedCreditLimit: number;
  maxCreditLimit: number; // Added missing property
  recommendedLimit: number; // Added missing property
  nextReviewDate?: string; // Added missing property
  reasons?: string[]; // Added missing property
  requirements?: string[]; // Added missing property
  decisionDetails: string;
}

// ===== POS INTEGRATION INTERFACES =====

export interface POSMemberCreditDto {
  memberId: number;
  memberNumber: string;
  name: string;
  phone: string;
  email: string;
  tier: string;
  totalPoints: number;
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  creditStatus: string;
  creditScore: number;
  canUseCredit: boolean;
  isEligibleForCredit: boolean;
  maxTransactionAmount: number;
  statusMessage: string;
  statusColor: string;
  hasWarnings: boolean;
  warnings: string[];
  hasOverduePayments: boolean;
  nextPaymentDueDate?: string;
  daysUntilNextPayment: number;
  creditLimitDisplay: string;
  availableCreditDisplay: string;
  currentDebtDisplay: string;
  creditUtilization: number;
  lastCreditUsed?: string;
  lastPaymentDate?: string;
  totalCreditTransactions: number;
  paymentTermDays?: number; // Payment terms in days (30, 60, 90, etc.)
}

export interface CreditValidationRequestDto {
  memberId: number;
  requestedAmount: number;
  items: POSItemDto[];
  branchId: number;
  description: string;
  overrideWarnings: boolean;
  managerUserId: number;
}

export interface CreditValidationResultDto {
  isApproved: boolean;
  approvedAmount: number;
  availableCredit: number;
  decisionReason: string;
  warnings: string[];
  errors: string[];
  requiresManagerApproval: boolean;
  maxAllowedAmount: number;
  riskLevel: string;
  memberName: string;
  memberTier: string;
  creditScore: number;
  creditUtilization: number;
  validationTimestamp: string;
  validatedByUserId: number;
  validationId: string;
}

export interface CreateSaleWithCreditDto {
  memberId: number;
  items: POSItemDto[];
  totalAmount: number;
  creditAmount: number;
  cashAmount: number;
  paymentMethod: number;  // Numeric payment method ID
  branchId: number;
  cashierId: number;
  customerName?: string;  // Optional customer name
  notes?: string;         // Optional notes (was 'description')
  useCustomDueDate?: boolean; // NEW: Enable flexible due date feature
  customDueDate?: string;     // NEW: Custom due date (ISO format: YYYY-MM-DD)
}

export interface POSItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;  // Optional discount amount (was 'discount')
}

export interface POSCreditInfoDto {
  saleId: number;
  memberId: number;
  memberName: string;
  memberNumber: string;
  creditUsed: number;
  cashPaid: number;
  totalAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  availableCredit: number;
  nextPaymentDue?: string;
  paymentTerms: number;
  receiptMessage: string;
  creditTerms: string;
}

// ===== REQUEST/RESPONSE DTOs =====

export interface GrantCreditRequestDto {
  amount: number;
  description: string;
  saleId: number;
  branchId?: number;
  notes?: string;
  paymentTermDays?: number; // NEW: Custom payment terms (7, 14, 30, 60 days)
  dueDate?: string; // NEW: Specific due date (ISO format)
}

export interface CreditPaymentRequestDto {
  amount: number;
  paymentMethod: 'Cash' | 'Transfer' | 'Credit_Card' | 'E_Wallet' | 'Other';
  referenceNumber?: string;
  notes?: string;
}

export interface UpdateCreditStatusRequestDto {
  memberId: number;
  newStatus: 'Good' | 'Warning' | 'Bad' | 'Blocked';
  reason: string;
  branchId: number;
  updatedBy: string;
  effectiveDate?: string;
  reviewDate?: string;
  notes?: string;
}

export interface UpdateCreditLimitRequestDto {
  newCreditLimit: number; // Changed from newLimit to newCreditLimit
  reason: string;
  notes?: string;
}

export interface SendReminderRequestDto {
  memberId: number;
  reminderType: 'Payment_Due' | 'Payment_Overdue' | 'Credit_Limit' | 'Status_Change';
  message?: string;
  sendVia: 'SMS' | 'Email' | 'WhatsApp' | 'All';
  branchId: number;
  scheduledAt?: string;
}

// ===== ANALYTICS & REPORTING INTERFACES =====

// Real backend CreditAnalyticsDto structure
export interface CreditAnalyticsDto {
  // Real backend structure - direct properties
  analysisDate?: string;
  startDate?: string;
  endDate?: string;
  branchId?: number | null;
  branchName?: string | null;
  
  // Overall metrics (direct properties)
  totalMembersWithCredit?: number;
  totalCreditLimit?: number;
  totalOutstandingDebt?: number;
  totalAvailableCredit?: number;
  averageCreditUtilization?: number;
  overdueMembers?: number;
  membersWithActiveDebt?: number;
  criticalRiskMembers?: number;
  
  // Trend data for charts
  creditUsageTrends?: CreditTrendDto[];
  paymentTrends?: CreditTrendDto[];
  
  // Top users data
  topCreditUsers?: TopCreditUser[];
  
  // Tier analysis data (source for Top Credit Users)
  tierAnalysis?: TierAnalysisDto[];
  
  // Credit score distribution
  creditScoreDistribution?: {
    excellent: number;
    veryGood: number;
    good: number;
    fair: number;
    poor: number;
  };
  
  // Credit trends for charts
  creditTrends?: CreditTrendDto[];
  
  // Legacy interface structure support (for backward compatibility)
  summary?: {
    totalMembers: number;
    activeCreditMembers: number;
    totalCreditLimit: number;
    totalOutstandingDebt: number;
    totalOverdueAmount: number;
    avgCreditUtilization: number;
    paymentSuccessRate: number;
    badDebtRate: number;
  };
  creditStatus?: {
    good: number;
    warning: number;
    bad: number;
    blocked: number;
  };
  riskDistribution?: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  monthlyTrends?: {
    month: string;
    newCreditMembers: number;
    creditSales: number;
    payments: number;
    outstandingDebt: number;
    overdueAmount: number;
  }[];
  topMembers?: {
    highest_debt: CreditMemberSummaryDto[];
    highest_utilization: CreditMemberSummaryDto[];
    most_overdue: CreditMemberSummaryDto[];
    best_payers: CreditMemberSummaryDto[];
  };
  branchComparison?: BranchCreditComparisonDto[];
}

// Tier Analysis interface for Top Credit Users
export interface TierAnalysisDto {
  tier: number;
  tierName: string;
  memberCount: number;
  averageCreditLimit: number;
  averageDebt: number;
  averageUtilization: number;
  averageCreditScore: number;
  overdueRate: number;
}

// Top Credit User interface for processed analytics data
export interface TopCreditUser {
  rank: number;
  memberId: number;
  memberName: string;
  memberNumber: string;
  phone?: string;
  tier: string;
  creditLimit: number;
  currentDebt: number;
  creditUtilization: number;
  creditScore: number;
  lifetimeDebt?: number;
  totalTransactions?: number;
  paymentSuccessRate?: number;
  formattedCreditLimit: string;
  formattedCurrentDebt: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

// Credit Trend interface for charts
export interface CreditTrendDto {
  date: string;
  totalDebt?: number;
  payments?: number;
  newCredit?: number;
  creditUsage?: number;
}

export interface CreditMemberSummaryDto {
  memberId: number;
  memberName: string;
  memberNumber: string;
  creditLimit: number;
  currentDebt: number;
  creditUtilization: number;
  daysOverdue: number;
  overdueAmount: number;
  paymentSuccessRate: number;
  riskLevel: string;
  lastTransactionDate?: string;
}

export interface BranchCreditComparisonDto {
  branchId: number;
  branchName: string;
  totalMembers: number;
  creditMembers: number;
  totalDebt: number;
  overdueAmount: number;
  avgUtilization: number;
  paymentSuccessRate: number;
  performance: 'Excellent' | 'Good' | 'Average' | 'Poor';
}

export interface OverdueMemberDto {
  memberId: number;
  memberName: string;
  memberNumber: string;
  phone: string;
  email?: string;
  currentDebt: number;
  overdueAmount: number;
  daysOverdue: number;
  lastPaymentDate?: string;
  nextPaymentDueDate: string;
  riskLevel: 'Medium' | 'High' | 'Critical';
  remindersSent: number;
  lastReminderDate?: string;
  creditStatus: 'Warning' | 'Bad' | 'Blocked';
  branchName: string;
  actions: string[];
}

export interface ApproachingLimitMemberDto {
  memberId: number;
  memberName: string;
  memberNumber: string;
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  creditUtilization: number;
  daysUntilLimit: number;
  projectedLimitDate?: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendedAction: string;
  branchName: string;
}

// ===== SEARCH & FILTER INTERFACES =====

export interface MemberCreditSearchFiltersDto {
  search?: string;
  creditStatus?: 'Good' | 'Warning' | 'Bad' | 'Blocked' | '';
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical' | '';
  branchId?: number;
  minCreditLimit?: number;
  maxCreditLimit?: number;
  minDebt?: number;
  maxDebt?: number;
  isOverdue?: boolean;
  daysOverdueMin?: number;
  daysOverdueMax?: number;
  hasPaymentsDue?: boolean;
  isEligible?: boolean;
  memberType?: string;
  joinDateFrom?: string;
  joinDateTo?: string;
  lastTransactionFrom?: string;
  lastTransactionTo?: string;
  sortBy?: 'name' | 'memberNumber' | 'creditLimit' | 'currentDebt' | 'utilization' | 'daysOverdue' | 'joinDate';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface MemberCreditPagedResponseDto {
  members: MemberCreditSummaryDto[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  summary: {
    totalCreditLimit: number;
    totalCurrentDebt: number;
    totalOverdueAmount: number;
    avgUtilization: number;
  };
}

// ===== UTILITY TYPES =====

export interface CreditCalculationResult {
  creditUtilization: number;
  availableCredit: number;
  isOverdue: boolean;
  daysOverdue: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  creditScore: number;
  maxAllowedTransaction: number;
  recommendedCreditLimit: number;
}

export interface CreditStatusConfiguration {
  goodThreshold: number;
  warningThreshold: number;
  badThreshold: number;
  blockedThreshold: number;
  maxOverdueDays: number;
  maxUtilization: number;
  minCreditScore: number;
}

export interface BulkCreditAction {
  memberIds: number[];
  action: 'send_reminder' | 'update_status' | 'update_limit' | 'block' | 'unblock';
  parameters: any;
  branchId: number;
  performedBy: string;
  reason: string;
  scheduledAt?: string;
}

// ===== API RESPONSE WRAPPERS =====

export interface CreditApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  timestamp: string;
  requestId?: string;
}

export interface CreditValidationResponse extends CreditApiResponse<CreditValidationResultDto> {
  warnings?: string[];
}

export interface CreditTransactionResponse extends CreditApiResponse<CreditTransactionDto> {
  balanceInfo: {
    previousBalance: number;
    newBalance: number;
    availableCredit: number;
  };
}

// ===== CONSTANTS & ENUMS =====

export enum CreditTransactionType {
  SALE = 'Sale',
  PAYMENT = 'Payment',
  CREDIT_GRANT = 'Credit_Grant',
  CREDIT_ADJUSTMENT = 'Credit_Adjustment',
  FEE = 'Fee',
  INTEREST = 'Interest'
}

export enum CreditStatus {
  GOOD = 'Good',
  WARNING = 'Warning',
  BAD = 'Bad',
  BLOCKED = 'Blocked'
}

export enum PaymentMethod {
  CASH = 'Cash',
  TRANSFER = 'Transfer',
  CREDIT_CARD = 'Credit_Card',
  E_WALLET = 'E_Wallet',
  OTHER = 'Other'
}

export enum ReminderType {
  PAYMENT_DUE = 'Payment_Due',
  PAYMENT_OVERDUE = 'Payment_Overdue',
  CREDIT_LIMIT = 'Credit_Limit',
  STATUS_CHANGE = 'Status_Change'
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}