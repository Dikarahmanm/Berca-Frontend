// Member Credit Management Interfaces - Complete Type Definitions
// POS Toko Eniwan - Member Credit Integration

// ===== CORE CREDIT INTERFACES =====

export interface MemberCreditSummaryDto {
  memberId: number;
  memberName: string;
  memberNumber: string;
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  creditStatus: 'Good' | 'Warning' | 'Bad' | 'Blocked';
  creditScore: number;
  paymentSuccessRate: number;
  isEligibleForCredit: boolean;
  creditUtilization: number;
  paymentTerms: number;
  daysOverdue: number;
  overdueAmount: number;
  nextPaymentDueDate?: string;
  lastPaymentDate?: string;
  totalTransactions: number;
  avgTransactionAmount: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  createdAt: string;
  updatedAt: string;
  branchId?: number;
  branchName?: string;
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
  isEligible: boolean;
  eligibilityScore: number;
  maxCreditLimit: number;
  recommendedLimit: number;
  reasons: string[];
  requirements: string[];
  riskFactors: string[];
  canIncrease: boolean;
  nextReviewDate?: string;
}

// ===== POS INTEGRATION INTERFACES =====

export interface POSMemberCreditDto {
  memberId: number;
  name: string;
  memberNumber: string;
  phone: string;
  email?: string;
  availableCredit: number;
  creditLimit: number;
  currentDebt: number;
  canUseCredit: boolean;
  statusMessage: string;
  maxAllowedTransaction: number;
  creditStatus: 'Good' | 'Warning' | 'Bad' | 'Blocked';
  paymentTerms: number;
  daysOverdue: number;
  memberType: string;
  joinDate: string;
  lastTransactionDate?: string;
}

export interface CreditValidationRequestDto {
  memberId: number;
  requestedAmount: number;
  items: POSItemDto[];
  branchId: number;
  checkCreditLimit: boolean;
  applyDiscounts: boolean;
}

export interface CreditValidationResultDto {
  isValid: boolean;
  canProceed: boolean;
  validationMessages: string[];
  warnings: string[];
  maxAllowedAmount: number;
  recommendedPaymentSplit?: {
    creditAmount: number;
    cashAmount: number;
    reason: string;
  };
  member: POSMemberCreditDto;
  creditImpact: {
    newDebt: number;
    newAvailableCredit: number;
    newUtilization: number;
    riskLevel: string;
  };
}

export interface CreateSaleWithCreditDto {
  memberId: number;
  items: POSItemDto[];
  totalAmount: number;
  creditAmount: number;
  cashAmount: number;
  paymentMethod: 'Credit' | 'Mixed' | 'Cash';
  branchId: number;
  salesPersonId?: number;
  notes?: string;
  referenceNumber?: string;
  applyMemberDiscount: boolean;
  taxAmount: number;
  discountAmount: number;
}

export interface POSItemDto {
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  categoryId?: number;
  categoryName?: string;
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
  memberId: number;
  amount: number;
  creditType: 'Initial_Limit' | 'Limit_Increase' | 'Bonus_Credit' | 'Adjustment';
  description: string;
  branchId: number;
  approvedBy?: string;
  expiryDate?: string;
  notes?: string;
  requiresApproval: boolean;
}

export interface CreditPaymentRequestDto {
  memberId: number;
  amount: number;
  paymentMethod: 'Cash' | 'Transfer' | 'Credit_Card' | 'E_Wallet' | 'Other';
  referenceNumber: string;
  branchId: number;
  receivedBy?: string;
  notes?: string;
  partialPayment: boolean;
  allocateToOldest: boolean;
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
  memberId: number;
  newLimit: number;
  reason: string;
  branchId: number;
  approvedBy: string;
  effectiveDate?: string;
  requiresReview: boolean;
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

export interface CreditAnalyticsDto {
  summary: {
    totalMembers: number;
    activeCreditMembers: number;
    totalCreditLimit: number;
    totalOutstandingDebt: number;
    totalOverdueAmount: number;
    avgCreditUtilization: number;
    paymentSuccessRate: number;
    badDebtRate: number;
  };
  creditStatus: {
    good: number;
    warning: number;
    bad: number;
    blocked: number;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  monthlyTrends: {
    month: string;
    newCreditMembers: number;
    creditSales: number;
    payments: number;
    outstandingDebt: number;
    overdueAmount: number;
  }[];
  topMembers: {
    highest_debt: CreditMemberSummaryDto[];
    highest_utilization: CreditMemberSummaryDto[];
    most_overdue: CreditMemberSummaryDto[];
    best_payers: CreditMemberSummaryDto[];
  };
  branchComparison?: BranchCreditComparisonDto[];
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