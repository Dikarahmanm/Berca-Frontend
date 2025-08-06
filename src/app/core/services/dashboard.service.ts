// src/app/core/services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../../environment/environment';

// ===== INTERFACES =====

export interface DashboardKPIDto {
  todayRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  todayTransactions: number;
  monthlyTransactions: number;
  averageTransactionValue: number;
  totalProfit: number;
  totalProducts: number;
  lowStockProducts: number;
  totalMembers: number;
  inventoryValue: number;
}

export interface ChartDataDto {
  label: string;
  value: number;
  date?: Date;
  color?: string;
}

export interface QuickStatsDto {
  todayRevenue: number;
  todayTransactions: number;
  revenueGrowthPercentage: number;
  pendingOrders: number;
  lowStockAlerts: number;
  activeMembers: number;
}

export interface TopProductDto {
  productId: number;
  productName: string;
  productBarcode: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalProfit: number;
  transactionCount: number;
  weightedScore: number;
  profitMargin: number;
  averageQuantityPerTransaction: number;
}

export interface WorstPerformingProductDto {
  productId: number;
  productName: string;
  productBarcode: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalProfit: number;
  transactionCount: number;
  daysWithoutSale: number;
  currentStock: number;
  performanceScore: number;
  performanceCategory: string;
}

export interface CategorySalesDto {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  totalQuantitySold: number;
  totalRevenue: number;
  productCount: number;
  transactionCount: number;
}

export interface LowStockProductDto {
  id: number;
  name: string;
  barcode: string;
  description: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number;
  unit: string;
  imageUrl: string;
  isActive: boolean;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  createdAt: Date;
  updatedAt: Date;
  profitMargin: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface RecentTransactionDto {
  id: number;
  saleNumber: string;
  saleDate: Date;
  total: number;
  paymentMethod: string;
  customerName: string;
  cashierName: string;
  itemCount: number;
}

export interface SalesReportDto {
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalTransactions: number;
  totalItemsSold: number;
  averageTransactionValue: number;
  paymentMethodBreakdown: {
    paymentMethod: string;
    total: number;
    transactionCount: number;
    percentage: number;
  }[];
  generatedAt: Date;
}

export interface InventoryReportDto {
  totalProducts: number;
  totalInventoryValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  categoryBreakdown: {
    categoryName: string;
    categoryColor: string;
    productCount: number;
    totalValue: number;
    lowStockCount: number;
  }[];
  generatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/Dashboard`;
  
  // Real-time data subjects
  private kpiSubject = new BehaviorSubject<DashboardKPIDto | null>(null);
  private quickStatsSubject = new BehaviorSubject<QuickStatsDto | null>(null);
  
  // Observables
  public kpi$ = this.kpiSubject.asObservable();
  public quickStats$ = this.quickStatsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startRealTimeUpdates();
  }

  // ===== KPI & STATS =====

  getDashboardKPIs(startDate?: Date, endDate?: Date): Observable<DashboardKPIDto> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/kpis`, { params }).pipe(
      map(response => response.success ? response.data : null),
      shareReplay(1)
    );
  }

  getQuickStats(): Observable<QuickStatsDto> {
    return this.http.get<any>(`${this.apiUrl}/quick-stats`).pipe(
      map(response => response.success ? response.data : null),
      shareReplay(1)
    );
  }

  // ===== CHARTS DATA =====

  getSalesChartData(period: 'daily' | 'weekly' | 'monthly' = 'daily', startDate?: Date, endDate?: Date): Observable<ChartDataDto[]> {
    let params = new HttpParams().set('period', period);
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/charts/sales`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  getRevenueChartData(period: 'monthly' | 'yearly' = 'monthly', startDate?: Date, endDate?: Date): Observable<ChartDataDto[]> {
    let params = new HttpParams().set('period', period);
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/charts/revenue`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  // ===== PRODUCT ANALYTICS =====

  getTopSellingProducts(count: number = 10, startDate?: Date, endDate?: Date): Observable<TopProductDto[]> {
    let params = new HttpParams().set('count', count.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/products/top-selling`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  getWorstPerformingProducts(count: number = 10, startDate?: Date, endDate?: Date): Observable<WorstPerformingProductDto[]> {
    let params = new HttpParams().set('count', count.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/products/worst-performing`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  getCategorySales(startDate?: Date, endDate?: Date): Observable<CategorySalesDto[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/categories/sales`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  getLowStockAlerts(): Observable<LowStockProductDto[]> {
    return this.http.get<any>(`${this.apiUrl}/products/low-stock`).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  // ===== TRANSACTIONS =====

  getRecentTransactions(count: number = 10): Observable<RecentTransactionDto[]> {
    const params = new HttpParams().set('count', count.toString());
    
    return this.http.get<any>(`${this.apiUrl}/transactions/recent`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  // ===== REPORTS =====

  generateSalesReport(startDate: Date, endDate: Date): Observable<SalesReportDto> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/reports/sales`, { params }).pipe(
      map(response => response.success ? response.data : null)
    );
  }

  generateInventoryReport(): Observable<InventoryReportDto> {
    return this.http.get<any>(`${this.apiUrl}/reports/inventory`).pipe(
      map(response => response.success ? response.data : null)
    );
  }

  // ===== REAL-TIME UPDATES =====

  private startRealTimeUpdates(): void {
    // Update KPIs every 5 minutes
    interval(5 * 60 * 1000).pipe(
      switchMap(() => this.getDashboardKPIs())
    ).subscribe(kpis => this.kpiSubject.next(kpis));

    // Update quick stats every 2 minutes  
    interval(2 * 60 * 1000).pipe(
      switchMap(() => this.getQuickStats())
    ).subscribe(stats => this.quickStatsSubject.next(stats));
  }

  // ===== UTILITY METHODS =====

  refreshAllData(): void {
    this.getDashboardKPIs().subscribe(kpis => this.kpiSubject.next(kpis));
    this.getQuickStats().subscribe(stats => this.quickStatsSubject.next(stats));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  formatPercentage(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  // ===== DATE HELPERS =====

  getDateRange(period: 'today' | 'week' | 'month' | 'year'): { startDate: Date, endDate: Date } {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }
}