// src/app/dashboard/dashboard-analytics/dashboard-analytics.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';

// Recharts for data visualization
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { 
  DashboardService, 
  DashboardKPIDto, 
  ChartDataDto, 
  TopProductDto, 
  CategorySalesDto, 
  RecentTransactionDto,
  QuickStatsDto 
} from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatBadgeModule,
    FormsModule
  ],
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.scss']
})
export class DashboardAnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data observables
  kpis$: Observable<DashboardKPIDto | null>;
  quickStats$: Observable<QuickStatsDto | null>;
  
  // Chart data
  salesChartData: ChartDataDto[] = [];
  revenueChartData: ChartDataDto[] = [];
  topProducts: TopProductDto[] = [];
  categorySales: CategorySalesDto[] = [];
  recentTransactions: RecentTransactionDto[] = [];
  lowStockAlerts: any[] = [];

  // UI state
  isLoading = true;
  selectedPeriod: 'today' | 'week' | 'month' | 'year' = 'month';
  selectedChartPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
  refreshInterval: any;

  // Chart colors
  readonly chartColors = {
    primary: '#FF914D',
    success: '#4BBF7B', 
    warning: '#FFB84D',
    error: '#E15A4F',
    info: '#4FC3F7',
    surface: 'rgba(255,255,255,0.25)'
  };

  readonly pieColors = ['#FF914D', '#4BBF7B', '#FFB84D', '#E15A4F', '#4FC3F7', '#9C27B0', '#607D8B', '#795548'];

  constructor(private dashboardService: DashboardService) {
    this.kpis$ = this.dashboardService.kpi$;
    this.quickStats$ = this.dashboardService.quickStats$;
  }

  ngOnInit() {
    this.loadDashboardData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // ===== DATA LOADING =====

  loadDashboardData() {
    this.isLoading = true;
    const { startDate, endDate } = this.dashboardService.getDateRange(this.selectedPeriod);

    // Load all dashboard data
    const kpis$ = this.dashboardService.getDashboardKPIs(startDate, endDate);
    const quickStats$ = this.dashboardService.getQuickStats();
    const salesChart$ = this.dashboardService.getSalesChartData(this.selectedChartPeriod, startDate, endDate);
    const revenueChart$ = this.dashboardService.getRevenueChartData('monthly', startDate, endDate);
    const topProducts$ = this.dashboardService.getTopSellingProducts(8, startDate, endDate);
    const categorySales$ = this.dashboardService.getCategorySales(startDate, endDate);
    const recentTransactions$ = this.dashboardService.getRecentTransactions(8);
    const lowStockAlerts$ = this.dashboardService.getLowStockAlerts();

    combineLatest([
      kpis$,
      quickStats$,
      salesChart$,
      revenueChart$,
      topProducts$,
      categorySales$,
      recentTransactions$,
      lowStockAlerts$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([kpis, quickStats, salesChart, revenueChart, topProducts, categorySales, recentTransactions, lowStockAlerts]) => {
        this.salesChartData = salesChart || [];
        this.revenueChartData = revenueChart || [];
        this.topProducts = topProducts || [];
        this.categorySales = categorySales || [];
        this.recentTransactions = recentTransactions || [];
        this.lowStockAlerts = lowStockAlerts || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  // ===== REAL-TIME UPDATES =====

  setupRealTimeUpdates() {
    // Refresh data every 3 minutes
    this.refreshInterval = setInterval(() => {
      this.dashboardService.refreshAllData();
      this.loadDashboardData();
    }, 3 * 60 * 1000);
  }

  // ===== EVENT HANDLERS =====

  onPeriodChange() {
    this.loadDashboardData();
  }

  onChartPeriodChange() {
    this.loadDashboardData();
  }

  refreshData() {
    this.dashboardService.refreshAllData();
    this.loadDashboardData();
  }

  // ===== CHART FORMATTERS =====

  formatCurrency = (value: number) => {
    return this.dashboardService.formatCurrency(value);
  }

  formatNumber = (value: number) => {
    return this.dashboardService.formatNumber(value);
  }

  formatPercentage = (value: number) => {
    return this.dashboardService.formatPercentage(value);
  }

  // ===== CUSTOM TOOLTIP FORMATTERS =====

  customTooltipFormatter = (value: any, name: string, props: any) => {
    if (name === 'value' || name === 'total' || name === 'revenue') {
      return [this.formatCurrency(value), name];
    }
    return [this.formatNumber(value), name];
  }

  // ===== PIE CHART HELPERS =====

  getPieChartData() {
    return this.categorySales.map((item, index) => ({
      name: item.categoryName,
      value: item.totalRevenue,
      color: this.pieColors[index % this.pieColors.length]
    }));
  }

  // ===== TABLE HELPERS =====

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'info';
    }
  }

  getStockStatusColor(stock: number, minStock: number): string {
    if (stock === 0) return 'error';
    if (stock <= minStock) return 'warning';
    return 'success';
  }

  // ===== NAVIGATION =====

  navigateToInventory() {
    // Navigate to inventory management
  }

  navigateToReports() {
    // Navigate to detailed reports
  }

  navigateToProducts() {
    // Navigate to product management
  }

  viewTransactionDetails(transaction: RecentTransactionDto) {
    // Navigate to transaction details
  }

  // ===== KPI CALCULATION HELPERS =====

  calculateGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  getGrowthIcon(growth: number): string {
    if (growth > 0) return 'trending_up';
    if (growth < 0) return 'trending_down';
    return 'trending_flat';
  }

  getGrowthClass(growth: number): string {
    if (growth > 0) return 'growth-positive';
    if (growth < 0) return 'growth-negative';  
    return 'growth-neutral';
  }
}