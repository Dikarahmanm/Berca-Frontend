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
import { DateRangeUtil } from '../../shared/utils/date-range.util';

import { 
  DashboardService, 
  DashboardKPIDto, 
  ChartDataDto, 
  TopProductDto, 
  WorstPerformingProductDto,
  CategorySalesDto, 
  RecentTransactionDto,
  QuickStatsDto,
  LowStockProductDto
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
  worstProducts: WorstPerformingProductDto[] = [];
  categorySales: CategorySalesDto[] = [];
  recentTransactions: RecentTransactionDto[] = [];
  lowStockAlerts: LowStockProductDto[] = [];

  // Current data for calculations
  currentKPIs: DashboardKPIDto | null = null;
  currentQuickStats: QuickStatsDto | null = null;

  // UI state
  isLoading = true;
  selectedPeriod: 'today' | 'week' | 'month' | 'year' = 'month';
  selectedChartPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
  selectedWorstCategory: string = 'all';
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
    this.subscribeToData();
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
    
    // ✅ SYNCHRONIZED: Use same date range as Reports (current month)
    const { startDate, endDate } = DateRangeUtil.getCurrentMonthRange();
    
    console.log('📅 Analytics using synchronized date range:', { startDate, endDate });
    console.log('📅 Analytics sending to backend:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      localStart: startDate.toString(),
      localEnd: endDate.toString()
    });

    // Load all dashboard data with synchronized date range
    const kpis$ = this.dashboardService.getDashboardKPIs(startDate, endDate);
    const quickStats$ = this.dashboardService.getQuickStats();
    const salesChart$ = this.dashboardService.getSalesChartData(this.selectedChartPeriod, startDate, endDate);
    const revenueChart$ = this.dashboardService.getRevenueChartData('monthly', startDate, endDate);
    const topProducts$ = this.dashboardService.getTopSellingProducts(8, startDate, endDate);
    const worstProducts$ = this.dashboardService.getWorstPerformingProducts(8, startDate, endDate);
    const categorySales$ = this.dashboardService.getCategorySales(startDate, endDate);
    const recentTransactions$ = this.dashboardService.getRecentTransactions(8);
    const lowStockAlerts$ = this.dashboardService.getLowStockAlerts();

    combineLatest([
      kpis$,
      quickStats$,
      salesChart$,
      revenueChart$,
      topProducts$,
      worstProducts$,
      categorySales$,
      recentTransactions$,
      lowStockAlerts$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([kpis, quickStats, salesChart, revenueChart, topProducts, worstProducts, categorySales, recentTransactions, lowStockAlerts]) => {
        console.log('📊 Analytics KPI Data:', kpis);
        if (kpis) {
          console.log('📊 Analytics Monthly Revenue:', kpis.monthlyRevenue);
          console.log('📊 Analytics Monthly Transactions:', kpis.monthlyTransactions);
          console.log('📊 Analytics Total Profit:', kpis.totalProfit);
          console.log('📊 Analytics Today Revenue:', kpis.todayRevenue);
          console.log('📊 Analytics Yearly Revenue:', kpis.yearlyRevenue);
          console.log('✅ Backend Fix Applied - KPI now includes SaleItems and uses correct date parameters');
        }
        
        this.currentKPIs = kpis;
        this.currentQuickStats = quickStats;
        this.salesChartData = salesChart || [];
        this.revenueChartData = revenueChart || [];
        this.topProducts = topProducts || [];
        this.worstProducts = worstProducts || [];
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

  private subscribeToData() {
    // Subscribe to real-time KPIs
    this.kpis$.pipe(takeUntil(this.destroy$)).subscribe(kpis => {
      this.currentKPIs = kpis;
    });

    // Subscribe to real-time quick stats
    this.quickStats$.pipe(takeUntil(this.destroy$)).subscribe(stats => {
      this.currentQuickStats = stats;
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

  formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return 'Rp 0';
    return this.dashboardService.formatCurrency(value);
  }

  formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return this.dashboardService.formatNumber(value);
  }

  formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    return this.dashboardService.formatPercentage(value);
  }

  // ===== SAFE DATA ACCESS =====

  safeValue(value: any): number {
    return (value !== null && value !== undefined && !isNaN(value)) ? Number(value) : 0;
  }

  calculateProfitMargin(profit: number, revenue: number): number {
    if (!revenue || revenue === 0) return 0;
    return (profit / revenue) * 100;
  }

  // ===== NAVIGATION METHODS =====

  navigateToInventory() {
    // Navigate to inventory management with low stock filter
    console.log('Navigate to inventory with low stock filter');
  }

  navigateToReports() {
    console.log('Navigate to detailed reports');
  }

  navigateToProducts() {
    console.log('Navigate to product management');
  }

  navigateToTransactions() {
    console.log('Navigate to transactions');
  }

  viewTransactionDetails(transaction: RecentTransactionDto) {
    console.log('View transaction details:', transaction.id);
  }

  viewProductDetails(productId: number) {
    console.log('View product details:', productId);
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
      color: item.categoryColor || this.pieColors[index % this.pieColors.length]
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

  // ===== PERFORMANCE HELPERS =====

  getPerformanceCategoryColor(category: string): string {
    switch (category) {
      case 'Never Sold': return 'error';
      case 'Very Slow': return 'error'; 
      case 'Slow Moving': return 'warning';
      case 'Low Profit': return 'warning';
      case 'Declining': return 'error';
      default: return 'info';
    }
  }

  getPerformanceCategoryIcon(category: string): string {
    switch (category) {
      case 'Never Sold': return 'block';
      case 'Very Slow': return 'hourglass_empty';
      case 'Slow Moving': return 'schedule';
      case 'Low Profit': return 'trending_down';
      case 'Declining': return 'arrow_downward';
      default: return 'help_outline';
    }
  }

  getPerformanceScoreClass(score: number): string {
    if (score >= 90) return 'score-critical';    // Never Sold
    if (score >= 70) return 'score-very-bad';    // Very Slow
    if (score >= 50) return 'score-warning';     // Slow Moving
    if (score >= 30) return 'score-moderate';    // Low Profit
    if (score >= 10) return 'score-declining';   // Declining
    return 'score-good';
  }

  // Sort worst products by category priority
  getSortedWorstProducts(): WorstPerformingProductDto[] {
    const categoryPriority = {
      'Never Sold': 1,
      'Very Slow': 2, 
      'Slow Moving': 3,
      'Low Profit': 4,
      'Declining': 5
    };

    // Filter out "Good Performance" and apply category filter
    let filtered = this.worstProducts.filter(product => {
      const isNotGoodPerformance = product.performanceCategory !== 'Good Performance';
      const matchesFilter = this.selectedWorstCategory === 'all' || 
                           product.performanceCategory === this.selectedWorstCategory;
      return isNotGoodPerformance && matchesFilter;
    });

    return filtered.sort((a, b) => {
      const priorityA = categoryPriority[a.performanceCategory as keyof typeof categoryPriority] || 999;
      const priorityB = categoryPriority[b.performanceCategory as keyof typeof categoryPriority] || 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same category, sort by score descending (worse first)
      return b.performanceScore - a.performanceScore;
    });
  }

  // Get available worst performance categories
  getWorstCategories(): string[] {
    const categories = [...new Set(
      this.worstProducts
        .filter(p => p.performanceCategory !== 'Good Performance')
        .map(p => p.performanceCategory)
    )];
    return categories.sort((a, b) => {
      const priority = {
        'Never Sold': 1,
        'Very Slow': 2,
        'Slow Moving': 3,
        'Low Profit': 4,
        'Declining': 5
      };
      return (priority[a as keyof typeof priority] || 999) - (priority[b as keyof typeof priority] || 999);
    });
  }

  // Category filter handler
  onWorstCategoryChange() {
    // Category filter will be applied in getSortedWorstProducts()
  }

  // ===== TOP PRODUCTS HELPERS =====

  getTopProductScoreClass(score: number): string {
    if (score >= 10) return 'score-excellent';
    if (score >= 7) return 'score-very-good';
    if (score >= 5) return 'score-good';
    if (score >= 2) return 'score-average';
    return 'score-poor';
  }

  getProfitMarginClass(margin: number): string {
    if (margin >= 50) return 'margin-excellent';
    if (margin >= 30) return 'margin-good';
    if (margin >= 20) return 'margin-average';
    if (margin >= 10) return 'margin-low';
    return 'margin-poor';
  }
}