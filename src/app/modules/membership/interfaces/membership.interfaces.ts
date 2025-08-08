// src/app/modules/membership/interfaces/membership.interfaces.ts
// ✅ Membership Interfaces - Sesuai Backend API DTOs

export interface MemberDto {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth: Date;
  gender: string;
  memberNumber: string;
  tier: string;
  joinDate: Date;
  isActive: boolean;
  totalPoints: number;
  usedPoints: number;
  availablePoints: number;
  totalSpent: number;
  totalTransactions: number;
  lastTransactionDate: Date | null;
  averageTransactionValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMemberRequest {
  name: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth: Date;
  gender: string;
}

export interface UpdateMemberRequest {
  name: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth: Date;
  gender: string;
  isActive: boolean;
}

export interface MemberSearchResponse {
  members: MemberDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface MemberPointHistoryDto {
  id: number;
  points: number;
  type: string;
  description: string;
  referenceNumber: string;
  createdAt: Date;
  isEarning: boolean;
  isRedemption: boolean;
}

export interface AddPointsRequest {
  points: number;
  description: string;
  saleId?: number;
  referenceNumber: string;
}

export interface RedeemPointsRequest {
  points: number;
  description: string;
  referenceNumber: string;
}

export interface MemberStatsDto {
  totalTransactions: number;
  totalSpent: number;
  averageTransactionValue: number;
  totalPoints: number;
  availablePoints: number;
  lastTransactionDate: Date | null;
  currentTier: string;
  nextTierRequirement: number;
  memberSince: Date;
}

export interface TopMemberDto {
  memberId: number;
  memberName: string;
  memberNumber: string;
  transactionCount: number;
  totalSpent: number;
  averageTransaction: number;
  lastTransactionDate: Date;
}

// API Response Wrappers
export interface MemberApiResponse {
  success: boolean;
  message: string;
  data: MemberDto;
  timestamp: Date;
  errors?: string[];
}

export interface MemberSearchApiResponse {
  success: boolean;
  message: string;
  data: MemberSearchResponse;
  timestamp: Date;
  errors?: string[];
}

export interface MemberPointHistoryApiResponse {
  success: boolean;
  message: string;
  data: MemberPointHistoryDto[];
  timestamp: Date;
  errors?: string[];
}

export interface MemberStatsApiResponse {
  success: boolean;
  message: string;
  data: MemberStatsDto;
  timestamp: Date;
  errors?: string[];
}

export interface TopMembersApiResponse {
  success: boolean;
  message: string;
  data: TopMemberDto[];
  timestamp: Date;
  errors?: string[];
}

export interface BooleanApiResponse {
  success: boolean;
  message: string;
  data: boolean;
  timestamp: Date;
  errors?: string[];
}

export interface NumberApiResponse {
  success: boolean;
  message: string;
  data: number;
  timestamp: Date;
  errors?: string[];
}

// Filter & Search interfaces
export interface MemberFilter {
  search?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
}

export interface MemberPointsFilter {
  page: number;
  pageSize: number;
}

export interface TopMembersFilter {
  count: number;
  startDate?: Date;
  endDate?: Date;
}

// UI State interfaces
export interface MemberTableColumn {
  key: keyof MemberDto | 'actions';
  label: string;
  sortable: boolean;
  type: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'badge' | 'actions';
}

export interface MemberFormMode {
  mode: 'create' | 'edit' | 'view';
  member?: MemberDto;
}

// Member Tier definitions
export interface MemberTier {
  name: string;
  minSpending: number;
  maxSpending: number | null;
  pointsMultiplier: number;
  benefits: string[];
  color: string;
  icon: string;
}

// Member Statistics for charts
export interface MemberChartData {
  name: string;
  value: number;
  extra?: any;
}

// Gender options
export interface GenderOption {
  value: string;
  label: string;
  icon: string;
}