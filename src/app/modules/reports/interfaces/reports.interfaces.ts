// src/app/modules/reports/interfaces/reports.interfaces.ts
// ✅ Reports Interface - Sesuai Backend API DTOs

export interface SalesReportDto {
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalTransactions: number;
  totalItemsSold: number;
  totalProfit?: number; // ✅ NEW: From backend response
  averageOrderValue: number;
  topSellingProducts: TopSellingProductDto[];
  paymentMethodBreakdown: PaymentMethodBreakdownDto[];
  salesTrend: SalesTrendDto[];
  categoryPerformance: CategoryPerformanceDto[];
  generatedAt: Date;
}

export interface TopSellingProductDto {
  productName: string;
  categoryName?: string;
  totalSold: number;
  totalRevenue: number;
  percentage: number;
}

export interface CategoryPerformanceDto {
  categoryName: string;
  categoryColor: string;
  totalRevenue: number;
  totalItemsSold: number;
  productCount: number;
  averagePrice: number;
  growthPercentage: number;
}

export interface SalesTrendDto {
  date: string;
  sales: number;
  transactions: number;
}

export interface PaymentMethodBreakdownDto {
  methodName: string;
  transactionCount: number;
  totalAmount: number;
  percentage: number;
}

export interface InventoryReportDto {
  totalProducts: number;
  totalInventoryValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  categoryBreakdown: CategoryBreakdownDto[];
  generatedAt: Date;
}

export interface CategoryBreakdownDto {
  categoryName: string;
  categoryColor: string;
  productCount: number;
  totalValue: number;
  lowStockCount: number;
}

export interface FinancialReportDto {
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossProfitMargin: number;
  totalTax: number;
  netProfit: number;
  monthlyBreakdown: MonthlyProfitDto[];
  generatedAt: Date;
}

export interface MonthlyProfitDto {
  year: number;
  month: number;
  monthName: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CustomerReportDto {
  startDate: Date;
  endDate: Date;
  totalActiveMembers: number;
  newMembersThisPeriod: number;
  averageOrderValue: number;
  totalMemberRevenue: number;
  guestRevenue: number;
  topCustomers: TopCustomerDto[];
  loyaltyAnalysis: MemberLoyaltyDto[];
  generatedAt: Date;
}

export interface TopCustomerDto {
  memberId?: number;
  memberName: string;
  memberPhone: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: Date;
}

export interface MemberLoyaltyDto {
  tierName: string;
  memberCount: number;
  totalRevenue: number;
  averageSpent: number;
  retentionRate: number;
}

export interface ReportExportDto {
  reportType: string;
  format: string;
  startDate: Date;
  endDate: Date;
  filePath: string;
  downloadUrl?: string; // ✅ NEW: Full download URL from backend
  generatedAt: Date;
}

// Filter interfaces for reports
export interface ReportDateFilter {
  startDate: Date;
  endDate: Date;
}

export interface ReportExportRequest {
  startDate: Date;
  endDate: Date;
  format: 'PDF' | 'EXCEL';
}

// API Response wrappers
export interface SalesReportApiResponse {
  success: boolean;
  message: string;
  data: SalesReportDto;
  timestamp: Date;
  errors?: string[];
}

export interface InventoryReportApiResponse {
  success: boolean;
  message: string;
  data: InventoryReportDto;
  timestamp: Date;
  errors?: string[];
}

export interface FinancialReportApiResponse {
  success: boolean;
  message: string;
  data: FinancialReportDto;
  timestamp: Date;
  errors?: string[];
}

export interface CustomerReportApiResponse {
  success: boolean;
  message: string;
  data: CustomerReportDto;
  timestamp: Date;
  errors?: string[];
}

export interface ReportExportApiResponse {
  success: boolean;
  message: string;
  data: ReportExportDto;
  timestamp: Date;
  errors?: string[];
}