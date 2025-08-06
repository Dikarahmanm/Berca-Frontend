// src/app/core/services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../../environment/environment';

// ===== INTERFACES =====

export interface DashboardKPIDto {
  todaySales: number;
  monthlySales: number;
  totalOrders: number;
  averageOrderValue: number;
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
  todayTransactions: number;
  todayRevenue: number;
  averageTransactionValue: number;
  topSellingProduct: string;
  lowStockAlerts: number;
  activeMembers: number;
}

export interface TopProductDto {
  productId: number;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
  category: string;
  profitMargin: number;
}

export interface CategorySalesDto {
  categoryId: number;
  categoryName: string;
  totalSales: number;
  totalRevenue: number;
  percentage: number;
  color: string;
}

export interface RecentTransactionDto {
  id: number;
  saleNumber: string;
  total: number;
  itemCount: number;
  customerName?: string;
  memberName?: string;
  saleDate: Date;
  status: string;
}

export interface SalesReportDto {
  startDate: Date;
  endDate: Date;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  transactionCount: number;
  averageTransactionValue: number;
  topProducts: TopProductDto[];
  salesByCategory: CategorySalesDto[];
  dailySales: ChartDataDto[];
}

export interface InventoryReportDto {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  categoriesCount: number;
  topValueCategories: CategorySalesDto[];
  lowStockProducts: any[];
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
    
    return this.http.get<any>(`${this.apiUrl}/sales-chart`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  getRevenueChartData(period: 'monthly' | 'yearly' = 'monthly', startDate?: Date, endDate?: Date): Observable<ChartDataDto[]> {
    let params = new HttpParams().set('period', period);
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/revenue-chart`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  // ===== PRODUCT ANALYTICS =====

  getTopSellingProducts(count: number = 10, startDate?: Date, endDate?: Date): Observable<TopProductDto[]> {
    let params = new HttpParams().set('count', count.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/top-products`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  getCategorySales(startDate?: Date, endDate?: Date): Observable<CategorySalesDto[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/category-sales`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  getLowStockAlerts(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/low-stock-alerts`).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  // ===== TRANSACTIONS =====

  getRecentTransactions(count: number = 10): Observable<RecentTransactionDto[]> {
    const params = new HttpParams().set('count', count.toString());
    
    return this.http.get<any>(`${this.apiUrl}/recent-transactions`, { params }).pipe(
      map(response => response.success ? response.data : []),
      shareReplay(1)
    );
  }

  // ===== REPORTS =====

  generateSalesReport(startDate: Date, endDate: Date): Observable<SalesReportDto> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    
    return this.http.get<any>(`${this.apiUrl}/sales-report`, { params }).pipe(
      map(response => response.success ? response.data : null)
    );
  }

  generateInventoryReport(): Observable<InventoryReportDto> {
    return this.http.get<any>(`${this.apiUrl}/inventory-report`).pipe(
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