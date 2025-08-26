// src/app/dashboard/dashboard-analytics/dashboard-analytics.component.ts
// ✅ SMART ANALYTICS INTEGRATION: Enhanced Dashboard Analytics
// Following Project Guidelines: Signal-based, Performance Optimized, Comprehensive Analytics

import { Component, OnInit, OnDestroy, HostListener, signal, computed, inject } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, combineLatest, of, interval } from 'rxjs';
import { takeUntil, startWith, map, catchError } from 'rxjs/operators';
import { DateRangeUtil } from '../../shared/utils/date-range.util';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

// ===== ENHANCED IMPORTS: Smart Analytics Services =====
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

import { 
  ExpiryAnalyticsService,
  ComprehensiveExpiryAnalyticsDto,
  CategoryExpiryStatsDto
} from '../../core/services/expiry-analytics.service';
import { SmartFifoRecommendationDto } from '../../core/interfaces/smart-analytics.interfaces';

import {
  SmartNotificationsService,
  SmartNotificationDto
} from '../../core/services/smart-notifications.service';

import {
  MultiBranchCoordinationService,
  CrossBranchAnalyticsDto,
  StockTransferOpportunityDto
} from '../../core/services/multi-branch-coordination.service';

// Import Modal Components
import { ProductQuickViewModalComponent, ProductQuickViewData } from '../../shared/components/product-quick-view-modal/product-quick-view-modal.component';
import { TransactionQuickViewModalComponent, TransactionQuickViewData } from '../../shared/components/transaction-quick-view-modal/transaction-quick-view-modal.component';
import { QuickRestockModalComponent, QuickRestockData } from '../../shared/components/quick-restock-modal/quick-restock-modal.component';

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
    MatTooltipModule,
    MatExpansionModule,
    FormsModule
  ],
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.scss']
})
export class DashboardAnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ===== DEPENDENCY INJECTION: Smart Analytics Services =====
  private expiryAnalyticsService = inject(ExpiryAnalyticsService);
  private smartNotificationsService = inject(SmartNotificationsService);
  private multiBranchService = inject(MultiBranchCoordinationService);

  // ===== EXISTING DATA OBSERVABLES =====
  kpis$: Observable<DashboardKPIDto | null>;
  quickStats$: Observable<QuickStatsDto | null>;
  
  // ===== EXISTING CHART DATA SIGNALS =====
  salesChartData = signal<ChartDataDto[]>([]);
  revenueChartData = signal<ChartDataDto[]>([]);
  topProducts = signal<TopProductDto[]>([]);
  worstProducts = signal<WorstPerformingProductDto[]>([]);
  categorySales = signal<CategorySalesDto[]>([]);
  recentTransactions = signal<RecentTransactionDto[]>([]);
  lowStockAlerts = signal<LowStockProductDto[]>([]);

  // ===== SMART ANALYTICS DATA SIGNALS =====
  smartAnalyticsData = signal<ComprehensiveExpiryAnalyticsDto | null>(null);
  fifoRecommendations = signal<SmartFifoRecommendationDto[]>([]);
  categoryExpiryStats = signal<CategoryExpiryStatsDto[]>([]);
  smartNotifications = signal<SmartNotificationDto[]>([]);
  crossBranchAnalytics = signal<CrossBranchAnalyticsDto | null>(null);
  transferOpportunities = signal<StockTransferOpportunityDto[]>([]);

  // ===== EXISTING DATA SIGNALS =====
  currentKPIs = signal<DashboardKPIDto | null>(null);
  currentQuickStats = signal<QuickStatsDto | null>(null);

  // ===== ENHANCED UI STATE SIGNALS =====
  isLoading = signal<boolean>(true);
  isSmartAnalyticsLoading = signal<boolean>(false);
  selectedPeriod = signal<'today' | 'week' | 'month' | 'year'>('month');
  selectedChartPeriod = signal<'daily' | 'weekly' | 'monthly'>('daily');
  selectedWorstCategory = signal<string>('all');
  selectedAnalyticsTab = signal<number>(0);
  showAdvancedAnalytics = signal<boolean>(false);
  refreshInterval: any;

  // ===== COMPUTED PROPERTIES: Smart Analytics =====
  readonly criticalFifoRecommendations = computed(() => 
    this.fifoRecommendations().filter(r => r.priority === 'CRITICAL').slice(0, 5)
  );

  readonly highRiskCategoryStats = computed(() =>
    this.categoryExpiryStats()
      .filter(c => c.riskScore >= 70) // High risk threshold
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 3)
  );

  readonly criticalTransferOpportunities = computed(() =>
    this.transferOpportunities()
      .filter(t => t.urgency === 'CRITICAL')
      .sort((a, b) => b.potentialSavings - a.potentialSavings)
      .slice(0, 3)
  );

  readonly unreadSmartNotifications = computed(() =>
    this.smartNotifications().filter(n => !n.isRead).length
  );

  readonly totalPotentialSavings = computed(() =>
    this.smartAnalyticsData()?.potentialLossValue || 0
  );

  readonly expiringProductsCount = computed(() => {
    const data = this.smartAnalyticsData();
    return (data?.expiringIn7Days || 0) + (data?.expiringIn30Days || 0);
  });

  readonly crossBranchSummary = computed(() => {
    const analytics = this.crossBranchAnalytics();
    return analytics ? {
      totalBranches: analytics.totalBranches,
      transferOpportunities: this.transferOpportunities().length,
      potentialSavings: this.transferOpportunities().reduce((sum, t) => sum + t.potentialSavings, 0)
    } : null;
  });

  // Chart colors
  readonly chartColors = {
    primary: '#FF914D',
    success: '#4BBF7B', 
    warning: '#FFB84D',
    error: '#E15A4F',
    info: '#4FC3F7',
    surface: 'rgba(255,255,255,0.25)',
    critical: '#D32F2F',
    high: '#FF5722',
    medium: '#FF9800',
    low: '#8BC34A'
  };

  readonly pieColors = ['#FF914D', '#4BBF7B', '#FFB84D', '#E15A4F', '#4FC3F7', '#9C27B0', '#607D8B', '#795548'];

constructor(
  private dashboardService: DashboardService,
  private router: Router,
  private dialog: MatDialog,
  private snackBar: MatSnackBar
) {
  this.kpis$ = this.dashboardService.kpi$;
  this.quickStats$ = this.dashboardService.quickStats$;
}

  ngOnInit() {
    this.loadDashboardData();
    this.loadSmartAnalyticsData();
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
    this.isLoading.set(true);
    console.log('🔄 Starting dashboard data load...');
    
    // ✅ SYNCHRONIZED: Use same date range as Reports (current month)
    const { startDate, endDate } = DateRangeUtil.getCurrentMonthRange();
    
    console.log('📅 Analytics using synchronized date range:', { startDate, endDate });
    console.log('📅 Analytics sending to backend:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      localStart: startDate.toString(),
      localEnd: endDate.toString()
    });

    // Load all dashboard data with synchronized date range and individual error handling
    console.log('🔄 Creating observables...');
    const kpis$ = this.dashboardService.getDashboardKPIs(startDate, endDate).pipe(
      map((data: any) => { console.log('✅ KPIs loaded:', data); return data; }),
      catchError((error: any) => { console.error('❌ KPIs error:', error); return of(null); })
    );
    const quickStats$ = this.dashboardService.getQuickStats().pipe(
      map((data: any) => { console.log('✅ Quick stats loaded:', data); return data; }),
      catchError((error: any) => { console.error('❌ Quick stats error:', error); return of(null); })
    );
    const salesChart$ = this.dashboardService.getSalesChartData(this.selectedChartPeriod(), startDate, endDate).pipe(
      map((data: any) => { console.log('✅ Sales chart loaded:', data); return data; }),
      catchError((error: any) => { console.error('❌ Sales chart error:', error); return of([]); })
    );
    const revenueChart$ = this.dashboardService.getRevenueChartData('monthly', startDate, endDate).pipe(
      map((data: any) => { console.log('✅ Revenue chart loaded:', data); return data; }),
      catchError((error: any) => { console.error('❌ Revenue chart error:', error); return of([]); })
    );
    const topProducts$ = this.dashboardService.getTopSellingProducts(8, startDate, endDate).pipe(
      map((data: any) => { console.log('✅ Top products loaded:', data); return data; }),
      catchError((error: any) => { console.error('❌ Top products error:', error); return of([]); })
    );
    const worstProducts$ = this.dashboardService.getWorstPerformingProducts(8, startDate, endDate).pipe(
      map((data: any) => { console.log('✅ Worst products loaded:', data); return data; }),
      catchError((error: any) => { console.error('❌ Worst products error:', error); return of([]); })
    );
    const categorySales$ = this.dashboardService.getCategorySales(startDate, endDate).pipe(
      map((data: any) => { console.log('✅ Category sales loaded:', data); return data; }),
      catchError((error: any) => { console.error('❌ Category sales error:', error); return of([]); })
    );
    const recentTransactions$ = this.dashboardService.getRecentTransactions(8).pipe(
      map((data: any) => { console.log('✅ Recent transactions loaded:', data); return data; }),
      catchError((error: any) => { console.error('❌ Recent transactions error:', error); return of([]); })
    );
    const lowStockAlerts$ = this.dashboardService.getLowStockAlerts().pipe(
      map((data: any) => { console.log('✅ Low stock alerts loaded:', data); return data; }),
      catchError((error: any) => { console.error('❌ Low stock alerts error:', error); return of([]); })
    );

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
        console.log('📊 Analytics Data Loaded Successfully');
        console.log('📊 KPIs:', kpis);
        console.log('📊 Quick Stats:', quickStats);
        console.log('📊 Sales Chart:', salesChart);
        console.log('📊 Top Products:', topProducts);
        console.log('📊 Category Sales:', categorySales);
        
        // Set data with proper type checking
        this.currentKPIs.set(kpis);
        this.currentQuickStats.set(quickStats);
        this.salesChartData.set(Array.isArray(salesChart) ? salesChart : []);
        this.revenueChartData.set(Array.isArray(revenueChart) ? revenueChart : []);
        this.topProducts.set(Array.isArray(topProducts) ? topProducts : []);
        this.worstProducts.set(Array.isArray(worstProducts) ? worstProducts : []);
        this.categorySales.set(Array.isArray(categorySales) ? categorySales : []);
        this.recentTransactions.set(Array.isArray(recentTransactions) ? recentTransactions : []);
        this.lowStockAlerts.set(Array.isArray(lowStockAlerts) ? lowStockAlerts : []);
        
        // Always set loading to false, even if data is null/empty
        this.isLoading.set(false);
        
        // Log final state
        console.log('📊 Final loading state:', this.isLoading());
        console.log('📊 Final KPIs state:', this.currentKPIs());
      },
      error: (error) => {
        console.error('❌ Error loading dashboard data:', error);
        console.error('❌ Error details:', error.message, error.status);
        
        // Set empty data and stop loading
        this.currentKPIs.set(null);
        this.currentQuickStats.set(null);
        this.salesChartData.set([]);
        this.revenueChartData.set([]);
        this.topProducts.set([]);
        this.worstProducts.set([]);
        this.categorySales.set([]);
        this.recentTransactions.set([]);
        this.lowStockAlerts.set([]);
        this.isLoading.set(false);
        
        // Show user-friendly error
        this.showError('Gagal memuat data analytics. Silakan coba refresh halaman.');
      }
    });
  }

  // ===== SMART ANALYTICS DATA LOADING =====

  async loadSmartAnalyticsData(): Promise<void> {
    console.log('🧠 Loading smart analytics data...');
    this.isSmartAnalyticsLoading.set(true);

    try {
      // Load all smart analytics data in parallel
      const [
        comprehensiveAnalytics,
        smartNotifications,
        crossBranchAnalytics
      ] = await Promise.allSettled([
        this.expiryAnalyticsService.getComprehensiveAnalytics(),
        this.smartNotificationsService.getSmartNotifications(),
        this.multiBranchService.getCrossBranchAnalytics()
      ]);

      // Process comprehensive expiry analytics
      if (comprehensiveAnalytics.status === 'fulfilled') {
        this.smartAnalyticsData.set(comprehensiveAnalytics.value);
        this.fifoRecommendations.set(comprehensiveAnalytics.value.recommendations || []);
        this.categoryExpiryStats.set(comprehensiveAnalytics.value.categoryBreakdown || []);
        console.log('✅ Smart expiry analytics loaded:', comprehensiveAnalytics.value);
      } else {
        console.error('❌ Failed to load expiry analytics:', comprehensiveAnalytics.reason);
      }

      // Process smart notifications
      if (smartNotifications.status === 'fulfilled') {
        this.smartNotifications.set(smartNotifications.value);
        console.log('✅ Smart notifications loaded:', smartNotifications.value.length, 'notifications');
      } else {
        console.error('❌ Failed to load smart notifications:', smartNotifications.reason);
      }

      // Process cross-branch analytics
      if (crossBranchAnalytics.status === 'fulfilled') {
        this.crossBranchAnalytics.set(crossBranchAnalytics.value);
        // Map InterBranchTransferRecommendation to StockTransferOpportunityDto
        const transferOpportunities = crossBranchAnalytics.value.transferRecommendations?.map(rec => ({
          id: rec.id,
          productName: rec.productName,
          fromBranchName: rec.fromBranchName,
          toBranchName: rec.toBranchName,
          quantity: rec.recommendedQuantity,
          urgency: this.mapExpiryUrgencyToString(rec.priority),
          potentialSavings: rec.estimatedSaving,
          transferCost: rec.transferCost,
          netBenefit: rec.netBenefit
        })) || [];
        this.transferOpportunities.set(transferOpportunities);
        console.log('✅ Cross-branch analytics loaded:', crossBranchAnalytics.value);
      } else {
        console.error('❌ Failed to load cross-branch analytics:', crossBranchAnalytics.reason);
      }

      console.log('🧠 Smart analytics data loading completed');

    } catch (error) {
      console.error('❌ Error loading smart analytics:', error);
      this.showError('Gagal memuat smart analytics. Menggunakan data dasar saja.');
    } finally {
      this.isSmartAnalyticsLoading.set(false);
    }
  }

  private subscribeToData() {
    // Subscribe to real-time KPIs
    this.kpis$.pipe(takeUntil(this.destroy$)).subscribe(kpis => {
      this.currentKPIs.set(kpis);
    });

    // Subscribe to real-time quick stats
    this.quickStats$.pipe(takeUntil(this.destroy$)).subscribe(stats => {
      this.currentQuickStats.set(stats);
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
    this.loadSmartAnalyticsData();
  }

  // ===== SMART ANALYTICS EVENT HANDLERS =====

  async onExecuteFifoRecommendation(recommendation: SmartFifoRecommendationDto): Promise<void> {
    console.log('⚡ Executing FIFO recommendation:', recommendation.productId);
    
    try {
      await this.expiryAnalyticsService.executeRecommendation(
        recommendation.productId,
        recommendation.batchId,
        recommendation.recommendedAction,
        recommendation.discountPercentage
      );

      this.showSuccess(`Aksi ${recommendation.recommendedAction} berhasil dijalankan untuk ${recommendation.productName}`);
      await this.loadSmartAnalyticsData(); // Refresh data
    } catch (error) {
      console.error('❌ Error executing recommendation:', error);
      this.showError(`Gagal menjalankan aksi untuk ${recommendation.productName}`);
    }
  }

  async onExecuteTransferOpportunity(opportunity: StockTransferOpportunityDto): Promise<void> {
    console.log('🚚 Executing transfer opportunity:', opportunity.id);
    
    try {
      await this.multiBranchService.executeTransferOpportunity(opportunity.id);
      
      this.showSuccess(`Transfer ${opportunity.productName} dari ${opportunity.fromBranchName} ke ${opportunity.toBranchName} berhasil diinisiasi`);
      await this.loadSmartAnalyticsData(); // Refresh data
    } catch (error) {
      console.error('❌ Error executing transfer:', error);
      this.showError(`Gagal menjalankan transfer untuk ${opportunity.productName}`);
    }
  }


  onAnalyticsTabChange(tabIndex: number): void {
    this.selectedAnalyticsTab.set(tabIndex);
    console.log('📊 Analytics tab changed:', tabIndex);
    
    // Load specific data based on tab
    switch (tabIndex) {
      case 1: // Expiry Analytics
        this.expiryAnalyticsService.refreshData();
        break;
      case 2: // Cross-Branch Analytics
        this.multiBranchService.refreshData();
        break;
      case 3: // Smart Notifications
        this.smartNotificationsService.refreshNotifications();
        break;
    }
  }

  // ===== SMART ANALYTICS NAVIGATION =====

  navigateToExpiryManagement(): void {
    console.log('🔄 Navigating to expiry management');
    this.router.navigate(['/dashboard/inventory'], {
      queryParams: { filter: 'expiring', view: 'expiry-analytics' }
    });
  }

  navigateToMultiBranchCoordination(): void {
    console.log('🔄 Navigating to multi-branch coordination');
    this.router.navigate(['/dashboard/multi-branch']);
  }

  navigateToSmartNotifications(): void {
    console.log('🔄 Navigating to smart notifications');
    this.router.navigate(['/dashboard/notifications'], {
      queryParams: { type: 'smart' }
    });
  }

  // ===== SMART ANALYTICS HELPERS =====

  getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'CRITICAL': return this.chartColors.critical;
      case 'HIGH': return this.chartColors.high;
      case 'MEDIUM': return this.chartColors.medium;
      case 'LOW': return this.chartColors.low;
      default: return this.chartColors.info;
    }
  }

  getUrgencyIcon(urgency: string): string {
    switch (urgency) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'check_circle';
      default: return 'help_outline';
    }
  }

  getRecommendationActionIcon(action: string): string {
    switch (action) {
      case 'SELL_FIRST': return 'shopping_cart';
      case 'DISCOUNT': return 'local_offer';
      case 'TRANSFER': return 'swap_horiz';
      case 'DISPOSE': return 'delete';
      case 'DONATE': return 'volunteer_activism';
      case 'RETURN_TO_SUPPLIER': return 'keyboard_return';
      default: return 'help_outline';
    }
  }

  formatDaysUntilExpiry(days: number): string {
    if (days < 0) return 'Sudah kedaluwarsa';
    if (days === 0) return 'Kedaluwarsa hari ini';
    if (days === 1) return '1 hari lagi';
    if (days < 7) return `${days} hari lagi`;
    if (days < 30) return `${Math.floor(days / 7)} minggu lagi`;
    return `${Math.floor(days / 30)} bulan lagi`;
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
  console.log('🔄 Navigating to inventory with low stock filter');
  this.router.navigate(['/dashboard/inventory'], {
    queryParams: { filter: 'low-stock' }
  }).then(success => {
    if (!success) {
      this.showError('Gagal membuka halaman inventory');
    }
  }).catch(error => {
    console.error('Navigation error:', error);
    this.showError('Error navigasi ke inventory');
  });
}

navigateToReports() {
  console.log('🔄 Navigating to reports');
  this.router.navigate(['/dashboard/reports']).then(success => {
    if (!success) {
      this.showError('Gagal membuka halaman reports');
    }
  }).catch(error => {
    console.error('Navigation error:', error);
    this.showError('Error navigasi ke reports');
  });
}

navigateToProducts() {
  console.log('🔄 Navigating to product management');
  this.router.navigate(['/dashboard/inventory']).then(success => {
    if (!success) {
      this.showError('Gagal membuka halaman produk');
    }
  }).catch(error => {
    console.error('Navigation error:', error);
    this.showError('Error navigasi ke produk');
  });
}

navigateToTransactions() {
  console.log('🔄 Navigating to POS transactions');
  this.router.navigate(['/dashboard/pos']).then(success => {
    if (!success) {
      this.showError('Gagal membuka halaman transaksi');
    }
  }).catch(error => {
    console.error('Navigation error:', error);
    this.showError('Error navigasi ke transaksi');
  });
}

// ===== DETAIL VIEW METHODS =====

viewTransactionDetails(transaction: RecentTransactionDto) {
  console.log('🔍 Viewing transaction details:', transaction.id);
  
  if (!transaction.id) {
    this.showError('ID transaksi tidak valid');
    return;
  }

  // Navigate to transaction detail page
  this.router.navigate(['/dashboard/pos/transaction', transaction.id]).then(success => {
    if (!success) {
      this.showError(`Gagal membuka detail transaksi ${transaction.saleNumber}`);
    }
  }).catch(error => {
    console.error('Navigation error:', error);
    this.showError('Error membuka detail transaksi');
  });
}

viewProductDetails(productId: number) {
  console.log('🔍 Viewing product details:', productId);
  
  if (!productId) {
    this.showError('ID produk tidak valid');
    return;
  }

  // Show loading
  this.showInfo('Memuat detail produk...');

  // Navigate to product edit form
  this.router.navigate(['/dashboard/inventory/edit', productId]).then(success => {
    if (success) {
      this.snackBar.dismiss(); // Close loading message
    } else {
      this.showError(`Gagal membuka detail produk ID: ${productId}`);
    }
  }).catch(error => {
    console.error('Navigation error:', error);
    this.showError('Error membuka detail produk');
  });
}
showProductQuickView(productId: number) {
  console.log('📄 Opening product quick view modal:', productId);
  
  // Open a quick view modal (you can create this component)
  const dialogRef = this.dialog.open(ProductQuickViewModalComponent, {
    width: '600px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    data: { productId }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result === 'edit') {
      this.viewProductDetails(productId);
    } else if (result === 'stock') {
      this.manageProductStock(productId);
    }
  });
}

showTransactionQuickView(transaction: RecentTransactionDto) {
    console.log('📄 Opening transaction quick view modal:', transaction.id);
    
    const dialogRef = this.dialog.open(TransactionQuickViewModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      maxHeight: '80vh',
      data: { transaction } as TransactionQuickViewData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'detail') {
        this.viewTransactionDetails(transaction);
      } else if (result === 'receipt') {
        this.printReceipt(transaction.id);
      }
    });
  }
// Quick Actions
  addNewProduct() {
    console.log('➕ Adding new product');
    this.router.navigate(['/dashboard/inventory/add']).then(success => {
      if (!success) {
        this.showError('Gagal membuka form tambah produk');
      }
    }).catch(error => {
      console.error('Navigation error:', error);
      this.showError('Error membuka form produk');
    });
  }

  manageProductStock(productId: number) {
    console.log('📦 Managing product stock:', productId);
    this.router.navigate(['/dashboard/inventory/stock', productId]).then(success => {
      if (!success) {
        this.showError(`Gagal membuka manajemen stok untuk produk ID: ${productId}`);
      }
    }).catch(error => {
      console.error('Navigation error:', error);
      this.showError('Error membuka manajemen stok');
    });
  }

  restockProduct(productId: number, productName: string) {
    console.log('🔄 Quick restock for product:', productId);
    
    const dialogRef = this.dialog.open(QuickRestockModalComponent, {
      width: '400px',
      maxWidth: '90vw',
      data: { productId, productName } as QuickRestockData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.showSuccess(`Stok ${productName} berhasil ditambahkan`);
        this.refreshData();
      }
    });
  }

  printReceipt(transactionId: number) {
    console.log('🖨️ Printing receipt for transaction:', transactionId);
    this.router.navigate(['/dashboard/pos/receipt', transactionId]).then(success => {
      if (!success) {
        this.showError(`Gagal membuka receipt untuk transaksi ID: ${transactionId}`);
      }
    }).catch(error => {
      console.error('Navigation error:', error);
      this.showError('Error membuka receipt');
    });
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
    return this.categorySales().map((item, index) => ({
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
    let filtered = this.worstProducts().filter(product => {
      const isNotGoodPerformance = product.performanceCategory !== 'Good Performance';
      const matchesFilter = this.selectedWorstCategory() === 'all' || 
                           product.performanceCategory === this.selectedWorstCategory();
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
      this.worstProducts()
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

  // ===== MISSING METHODS =====
  
  exportAnalyticsData() {
    console.log('📁 Exporting analytics data');
    this.showInfo('Export feature akan segera tersedia');
  }

  filterProductsByCategory(categoryName: string) {
    console.log('🔍 Filtering products by category:', categoryName);
    this.router.navigate(['/dashboard/inventory'], { 
      queryParams: { category: categoryName } 
    });
  }

  showTransactionContextMenu(event: MouseEvent, transaction: RecentTransactionDto) {
    event.preventDefault();
    console.log('📋 Transaction context menu for:', transaction.id);
    this.showInfo('Context menu feature akan segera tersedia');
  }

  showStockContextMenu(event: MouseEvent, item: LowStockProductDto) {
    event.preventDefault();
    console.log('📦 Stock context menu for:', item.id);
    this.showInfo('Context menu feature akan segera tersedia');
  }

  // Context Menu
  showProductContextMenu(event: MouseEvent, productId: number, productName: string) {
    event.preventDefault();
    console.log('📋 Product context menu for:', productId);
    this.showInfo('Context menu feature akan segera tersedia');
  }

  // ===== NOTIFICATION METHODS =====

  private showError(message: string) {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showInfo(message: string) {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  // ===== KEYBOARD SHORTCUTS =====
  
  @HostListener('keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      this.refreshData();
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      this.addNewProduct();
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
      event.preventDefault();
      this.navigateToInventory();
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 't') {
      event.preventDefault();
      this.navigateToTransactions();
    }
  }

  // ===== SMART ANALYTICS UI METHODS =====
  
  onToggleAdvancedAnalytics(): void {
    this.showAdvancedAnalytics.update(show => !show);
    
    if (this.showAdvancedAnalytics() && !this.smartAnalyticsData() && !this.isSmartAnalyticsLoading()) {
      this.loadSmartAnalyticsData();
    }
  }

  formatExpiryDate(date: string): string {
    const expiryDate = new Date(date);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Kedaluwarsa ${Math.abs(diffDays)} hari lalu`;
    } else if (diffDays === 0) {
      return 'Kedaluwarsa hari ini';
    } else if (diffDays === 1) {
      return 'Kedaluwarsa besok';
    } else if (diffDays <= 7) {
      return `Kedaluwarsa dalam ${diffDays} hari`;
    } else if (diffDays <= 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Kedaluwarsa dalam ${weeks} minggu`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `Kedaluwarsa dalam ${months} bulan`;
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'EXPIRY_WARNING':
        return 'schedule';
      case 'LOW_STOCK':
        return 'inventory_2';
      case 'FIFO_RECOMMENDATION':
        return 'smart_toy';
      case 'TRANSFER_OPPORTUNITY':
        return 'swap_horiz';
      case 'DEBT_REMINDER':
        return 'account_balance_wallet';
      case 'FACTURE_OVERDUE':
        return 'receipt_long';
      case 'SYSTEM_ALERT':
        return 'settings';
      case 'PERFORMANCE_INSIGHT':
        return 'insights';
      default:
        return 'notifications';
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    try {
      const success = await this.smartNotificationsService.markAsRead(notificationId);
      if (success) {
        // Update local state - the service should handle this automatically via signals
        console.log(`✅ Marked notification ${notificationId} as read`);
      } else {
        this.showError('Gagal menandai notifikasi sebagai dibaca');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      this.showError('Error menandai notifikasi sebagai dibaca');
    }
  }

  getNotificationPriorityClass(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  formatNotificationTime(createdAt: string): string {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) {
      return 'Baru saja';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} menit lalu`;
    } else if (diffMinutes < 1440) {
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours} jam lalu`;
    } else {
      const diffDays = Math.floor(diffMinutes / 1440);
      return `${diffDays} hari lalu`;
    }
  }

  onExecuteAction(action: any): void {
    console.log('⚡ Executing recommended action:', action);
    // Implementation will depend on the specific action type
    this.showInfo('Fitur ini akan segera tersedia');
  }

  onViewDetails(item: any): void {
    console.log('🔍 Viewing item details:', item);
    // Implementation will depend on the specific item type
    this.showInfo('Membuka detail...');
  }

  // ===== HELPER METHODS =====
  
  private mapExpiryUrgencyToString(urgency: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Map ExpiryUrgency enum values to string literals
    switch (urgency) {
      case 0: case 'LOW': return 'LOW';
      case 1: case 'MEDIUM': return 'MEDIUM'; 
      case 2: case 'HIGH': return 'HIGH';
      case 3: case 'CRITICAL': return 'CRITICAL';
      default: return 'MEDIUM';
    }
  }
}