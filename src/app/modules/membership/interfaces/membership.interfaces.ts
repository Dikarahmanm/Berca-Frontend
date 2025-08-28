// src/app/modules/membership/interfaces/membership.interfaces.ts
// ✅ Complete Interface Definitions - Backend Integration Ready

// Enhanced Member DTO with Credit Integration
export interface MemberDto {
  id: number;
  memberNumber: string;
  name: string;
  email: string;
  phone: string;
  tier: MemberTier;
  availablePoints: number;
  totalPoints: number;
  usedPoints: number; // <--- for member-points.component
  totalSpent: number;
  totalTransactions: number;
  lastTransactionDate: string | null;
  averageTransactionValue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  joinDate?: string; // <--- for membership-form.component
  address?: string; // <--- for membership-form.component
  dateOfBirth?: string; // <--- for membership-form.component
  gender?: GenderOption; // <--- for membership-form.component
  
  // ===== NEW: Credit Integration Fields =====
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  creditStatus: 'Good' | 'Warning' | 'Bad' | 'Blocked';
  creditScore: number;
  nextPaymentDueDate?: string;
  isEligibleForCredit: boolean;
  creditUtilization: number;
  paymentTerms: number;
  daysOverdue: number;
  overdueAmount: number;
  creditEnabled: boolean;
  lastPaymentDate?: string;
  paymentSuccessRate: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  maxAllowedTransaction: number;
}

// Create Member Request
export interface CreateMemberRequest {
  name: string;
  email?: string;
  phone: string;
  initialPoints?: number;
  tier?: MemberTier;
  isActive?: boolean;
  address?: string;
  dateOfBirth?: string;
  gender?: GenderOption;
}

// Update Member Request
export interface UpdateMemberRequest {
  name?: string;
  email?: string;
  phone?: string;
  tier?: MemberTier;
  isActive?: boolean;
  address?: string;
  dateOfBirth?: string;
  gender?: GenderOption;
}

// Search Response from Backend
export interface MemberSearchResponse {
  members: MemberDto[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

// Enhanced Search/Filter Parameters with Credit Integration
export interface MemberFilter {
  search?: string;
  isActive?: boolean;
  tier?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  
  // ===== NEW: Credit Filters =====
  creditStatus?: 'Good' | 'Warning' | 'Bad' | 'Blocked' | '';
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical' | '';
  hasCredit?: boolean;
  isOverdue?: boolean;
  minCreditLimit?: number;
  maxCreditLimit?: number;
  minDebt?: number;
  maxDebt?: number;
  minUtilization?: number;
  maxUtilization?: number;
  daysOverdueMin?: number;
  daysOverdueMax?: number;
  hasPaymentsDue?: boolean;
}

// Points Management
export interface MemberPointHistoryDto {
  id: number;
  memberId: number;
  pointsDelta: number;
  transactionType: 'Earned' | 'Redeemed' | 'Expired' | 'Manual';
  description: string;
  saleId?: number;
  referenceNumber?: string;
  createdAt: string;
  createdBy: string;
}

export interface AddPointsRequest {
  points: number;
  description: string;
  saleId?: number;
  referenceNumber?: string;
}

export interface RedeemPointsRequest {
  points: number;
  description: string;
  saleId?: number;
  referenceNumber?: string;
}

export interface MemberPointsFilter {
  page?: number;
  pageSize?: number;
  transactionType?: string;
  startDate?: Date;
  endDate?: Date;
}

// Statistics and Reports
export interface MemberStatsDto {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalSpent: number;
  averageSpentPerMember: number;
  tierDistribution: TierDistribution[];
  monthlyStats: MonthlyMemberStats[];
  currentTier?: MemberTier; // <--- for member-points.component
}

export interface TierDistribution {
  tier: string;
  count: number;
  percentage: number;
}

export interface MonthlyMemberStats {
  month: string;
  newMembers: number;
  totalSpent: number;
  pointsEarned: number;
  pointsRedeemed: number;
}

export interface TopMemberDto {
  id: number;
  memberNumber: string;
  memberName: string;
  tier: MemberTier;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  lastTransactionDate: string | null | undefined;
  pointsEarned: number;
  rank: number;
}

// Chart Data for Analytics (for ngx-charts, etc)
export interface ChartDataItem {
  name: string;
  value: number;
  extra?: any;
}

// Retain MemberChartData for other chart libs if needed
export interface MemberChartData {
  name: string;
  value: number;
  labels: string[];
  data: number[];
  backgroundColor?: string[];
  borderColor?: string[];
  label?: string;
}

// Form Mode as union type (for object assignment in component)
export type MemberFormMode = 'create' | 'edit' | 'view';

// Gender Option as interface (for select options with label/icon)
export interface GenderOption {
  value: string;
  label: string;
  icon: string;
}

export const GENDER_OPTIONS: GenderOption[] = [
  { value: 'Male', label: 'Male', icon: 'man' },
  { value: 'Female', label: 'Female', icon: 'woman' },
  { value: 'Other', label: 'Other', icon: 'person' },
];

export interface TopMembersFilter {
  count?: number;
  startDate?: Date;
  endDate?: Date;
  tier?: string;
}

// Tier Information
export interface TierInfo {
  name: string;
  color: string;
  icon: string;
  minSpent: number;
  maxSpent?: number;
  pointMultiplier: number;
  benefits: string[];
}

// Form Validation
export interface MemberFormData {
  name: string;
  email: string;
  phone: string;
  tier: string;
  initialPoints: number;
  isActive: boolean;
}

export interface MemberFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  tier?: string;
  initialPoints?: string;
  general?: string;
}

// UI State Management
export interface MemberListState {
  members: MemberDto[];
  selectedMembers: MemberDto[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: MemberFilter;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  sorting: {
    column: string;
    direction: 'asc' | 'desc';
  };
}

// Bulk Operations
export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
  message: string;
}

export interface BulkUpdateRequest {
  memberIds: number[];
  operation: 'activate' | 'deactivate' | 'updateTier' | 'addPoints';
  data?: any;
}

// Export/Import
export interface MemberExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeInactive: boolean;
  includePII: boolean;
  columns: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface MemberImportData {
  name: string;
  email?: string;
  phone: string;
  tier?: string;
  initialPoints?: number;
  isActive?: boolean;
}

export interface MemberImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: MemberImportError[];
  summary: string;
}

export interface MemberImportError {
  row: number;
  data: MemberImportData;
  error: string;
}

// Notification Integration
export interface MemberNotificationData {
  memberId: number;
  memberName: string;
  memberNumber: string;
  eventType: 'registration' | 'tierUpgrade' | 'pointsEarned' | 'pointsRedeemed' | 'statusChange';
  data: any;
}

// Analytics
export interface MemberAnalytics {
  membershipGrowth: GrowthMetrics[];
  tierProgression: TierProgression[];
  engagementMetrics: EngagementMetrics;
  revenueByTier: RevenueByTier[];
  churnAnalysis: ChurnAnalysis;
}

export interface GrowthMetrics {
  period: string;
  newMembers: number;
  activeMembers: number;
  churnedMembers: number;
  netGrowth: number;
}

export interface TierProgression {
  fromTier: string;
  toTier: string;
  count: number;
  averageDaysToUpgrade: number;
}

export interface EngagementMetrics {
  averageTransactionsPerMember: number;
  averagePointsEarnedPerMember: number;
  averagePointsRedeemedPerMember: number;
  pointRedemptionRate: number;
  memberRetentionRate: number;
}

export interface RevenueByTier {
  tier: string;
  memberCount: number;
  totalRevenue: number;
  averageRevenuePerMember: number;
  percentageOfTotalRevenue: number;
}

export interface ChurnAnalysis {
  totalChurned: number;
  churnRate: number;
  churnByTier: { tier: string; churnCount: number; churnRate: number; }[];
  commonChurnReasons: string[];
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: Date;
  errors?: string[];
}

// Service Method Return Types
export type MemberServiceResult<T> = Promise<ApiResponse<T>>;
export type MemberObservableResult<T> = Observable<T>;

// Utility Types
export type MemberTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'VIP';
export type MemberStatus = 'active' | 'inactive';
export type SortableColumns = keyof Pick<MemberDto, 'name' | 'memberNumber' | 'tier' | 'totalSpent' | 'availablePoints' | 'lastTransactionDate' | 'createdAt'>;

// Constants
export const MEMBER_TIERS: MemberTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'VIP'];

export const TIER_THRESHOLDS: Record<MemberTier, number> = {
  Bronze: 0,
  Silver: 500000,
  Gold: 1500000,
  Platinum: 5000000,
  VIP: 10000000
};

export const TIER_COLORS: Record<MemberTier, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  VIP: '#800080'
};

export const TIER_ICONS: Record<MemberTier, string> = {
  Bronze: '🥉',
  Silver: '🥈',
  Gold: '🥇',
  Platinum: '💎',
  VIP: '👑'
};

// Import/Export from RxJS for component usage
import { Observable } from 'rxjs';