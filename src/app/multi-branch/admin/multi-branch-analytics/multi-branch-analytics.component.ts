import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MultiBranchCoordinationService } from '../../../core/services/multi-branch-coordination.service';
import { BranchAnalyticsService } from '../../../core/services/branch-analytics.service';
import { BranchService } from '../../../core/services/branch.service';
import { StateService } from '../../../core/services/state.service';
import { InventoryTransferService } from '../../../core/services/inventory-transfer.service';
import { HttpClient } from '@angular/common/http';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
}

interface AnalyticsSummary {
  totalBranches: number;
  activeBranches: number;
  totalTransfers: number;
  pendingTransfers: number;
  totalSales: number;
  averagePerformance: number;
}

interface BranchPerformanceData {
  branchId: number;
  branchName: string;
  salesTotal: number;
  transfersCount: number;
  performance: number;
}

@Component({
  selector: 'app-multi-branch-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatChipsModule,
    MatButtonToggleModule,
    MatTableModule,
    MatListModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './multi-branch-analytics.component.html',
  styleUrls: ['./multi-branch-analytics.component.scss']
})
export class MultiBranchAnalyticsComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  // Signals for reactive state management
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedPeriod = signal<string>('3M');
  selectedView = signal<string>('overview');

  // Analytics data signals
  summary = signal<AnalyticsSummary>({
    totalBranches: 0,
    activeBranches: 0,
    totalTransfers: 0,
    pendingTransfers: 0,
    totalSales: 0,
    averagePerformance: 0
  });

  branchPerformance = signal<BranchPerformanceData[]>([]);

  // View-specific data storage
  viewSpecificData: any = null;
  trendData: any = null;
  regionalData: any = null;
  executiveData: any = null;
  forecastData: any = null;

  // Computed values
  performanceStatus = computed(() => {
    const avg = this.summary().averagePerformance;
    if (avg >= 90) return { status: 'Excellent', class: 'excellent' };
    if (avg >= 75) return { status: 'Good', class: 'good' };
    if (avg >= 60) return { status: 'Fair', class: 'fair' };
    return { status: 'Poor', class: 'poor' };
  });

  // Real-time data getters
  getTrendMetrics() {
    // Use real trend data from API if available
    if (this.trendData?.metrics) {
      return this.trendData.metrics;
    }

    // Calculate trend metrics from real summary data
    const summary = this.summary();
    const branchPerformance = this.branchPerformance();

    if (branchPerformance.length > 0) {
      // Calculate average growth from branch performance
      const avgGrowth = branchPerformance.reduce((sum, branch) => sum + (branch.performance - 50), 0) / branchPerformance.length;
      const revenueGrowthValue = avgGrowth > 0 ? `+${avgGrowth.toFixed(1)}%` : `${avgGrowth.toFixed(1)}%`;
      const revenueGrowthTrend = avgGrowth > 0 ? 'positive' : avgGrowth < 0 ? 'negative' : 'neutral';

      // Calculate transfer efficiency (higher transfer count = better efficiency)
      const avgTransfers = branchPerformance.reduce((sum, branch) => sum + branch.transfersCount, 0) / branchPerformance.length;
      const transferEfficiency = Math.min(20, avgTransfers / 10); // Scale to percentage
      const transferValue = transferEfficiency > 0 ? `+${transferEfficiency.toFixed(1)}%` : '0%';

      return [
        {
          title: 'Revenue Growth',
          value: revenueGrowthValue,
          trend: revenueGrowthTrend,
          description: `Compared to previous ${this.selectedPeriod()}`
        },
        {
          title: 'Transfer Efficiency',
          value: transferValue,
          trend: 'positive',
          description: 'Based on transaction volume'
        },
        {
          title: 'Performance Index',
          value: `${summary.averagePerformance.toFixed(1)}%`,
          trend: summary.averagePerformance >= 60 ? 'positive' : 'negative',
          description: 'Overall network performance'
        }
      ];
    }

    // Fallback data when no real data is available
    return [
      { title: 'Revenue Growth', value: 'N/A', trend: 'neutral', description: 'No data available' },
      { title: 'Transfer Efficiency', value: 'N/A', trend: 'neutral', description: 'No data available' },
      { title: 'Performance Index', value: 'N/A', trend: 'neutral', description: 'No data available' }
    ];
  }

  getRegionalStats() {
    // Use real regional data from API if available
    if (this.regionalData?.regions) {
      return this.regionalData.regions;
    }

    // Generate regional data from real branch performance
    const branchPerformance = this.branchPerformance();

    if (branchPerformance.length > 0) {
      return branchPerformance.map(branch => {
        const performance = branch.performance;
        let status = 'poor';
        let description = 'Needs attention';

        if (performance >= 90) {
          status = 'excellent';
          description = 'Top performing region';
        } else if (performance >= 75) {
          status = 'good';
          description = performance >= 85 ? 'Steady growth' : 'Improving metrics';
        } else if (performance >= 60) {
          status = 'fair';
          description = 'Moderate performance';
        }

        return {
          name: branch.branchName,
          performance: Math.round(performance),
          status: status,
          description: description
        };
      }).sort((a, b) => b.performance - a.performance); // Sort by performance descending
    }

    // Fallback when no real data
    return [
      { name: 'No Data', performance: 0, status: 'poor', description: 'No branch data available' }
    ];
  }

  getForecastMetrics() {
    // Use real forecast data from API if available
    if (this.forecastData?.predictions) {
      return this.forecastData.predictions;
    }

    // Generate forecast based on current performance trends
    const summary = this.summary();
    const branchPerformance = this.branchPerformance();

    if (branchPerformance.length > 0 && summary.averagePerformance > 0) {
      // Calculate predicted revenue growth based on current performance
      const avgGrowth = branchPerformance.reduce((sum, branch) => sum + (branch.performance - 50), 0) / branchPerformance.length;
      const predictedRevenue = Math.max(-20, Math.min(30, avgGrowth * 1.2)); // Scale and cap forecast
      const revenueConfidence = Math.max(60, Math.min(95, 70 + Math.abs(avgGrowth) * 2)); // Higher confidence for more stable trends

      // Calculate performance outlook
      const performanceOutlook = Math.max(-10, Math.min(15, (summary.averagePerformance - 60) / 4));
      const performanceConfidence = Math.max(60, Math.min(90, 65 + summary.averagePerformance / 5));

      return [
        {
          title: 'Predicted Revenue Growth',
          value: predictedRevenue > 0 ? `+${predictedRevenue.toFixed(1)}%` : `${predictedRevenue.toFixed(1)}%`,
          confidence: `${Math.round(revenueConfidence)}%`,
          trend: predictedRevenue > 0 ? 'positive' : predictedRevenue < 0 ? 'negative' : 'neutral'
        },
        {
          title: 'Performance Outlook',
          value: performanceOutlook > 0 ? `+${performanceOutlook.toFixed(1)}%` : `${performanceOutlook.toFixed(1)}%`,
          confidence: `${Math.round(performanceConfidence)}%`,
          trend: performanceOutlook > 0 ? 'positive' : performanceOutlook < 0 ? 'negative' : 'neutral'
        }
      ];
    }

    // Fallback when no real data
    return [
      { title: 'Predicted Revenue Growth', value: 'N/A', confidence: '0%', trend: 'neutral' },
      { title: 'Performance Outlook', value: 'N/A', confidence: '0%', trend: 'neutral' }
    ];
  }

  getExecutiveInsights() {
    // Use real executive insights from API if available
    if (this.executiveData?.insights) {
      return this.executiveData.insights;
    }

    // Generate insights from real data
    const summary = this.summary();
    const branchPerformance = this.branchPerformance();
    const insights: string[] = [];

    if (branchPerformance.length > 0) {
      // Find top performing branch
      const topBranch = branchPerformance.reduce((prev, current) =>
        (prev.performance > current.performance) ? prev : current
      );
      insights.push(`${topBranch.branchName} leads with ${topBranch.performance.toFixed(1)}% performance score`);

      // Revenue insight
      if (summary.totalSales > 0) {
        const avgSalesPerBranch = summary.totalSales / branchPerformance.length;
        insights.push(`Average revenue per branch: ${this.formatCurrency(avgSalesPerBranch)}`);
      }

      // Performance trend insight
      if (summary.averagePerformance >= 75) {
        insights.push('Network performance showing strong results across regions');
      } else if (summary.averagePerformance >= 60) {
        insights.push('Network performance showing moderate growth potential');
      } else {
        insights.push('Network performance requires strategic attention');
      }

      // Find lowest performing branch
      const worstBranch = branchPerformance.reduce((prev, current) =>
        (prev.performance < current.performance) ? prev : current
      );
      if (worstBranch.performance < 60) {
        insights.push(`${worstBranch.branchName} requires strategic attention`);
      }

      // Transfer activity insight
      if (summary.totalTransfers > 0) {
        insights.push(`${summary.totalTransfers} active transfers with ${summary.pendingTransfers} pending approvals`);
      }
    } else {
      insights.push('No performance data available for analysis');
    }

    return insights;
  }

  getExecutiveRecommendations() {
    // Use real executive recommendations from API if available
    if (this.executiveData?.recommendations) {
      return this.executiveData.recommendations;
    }

    // Generate recommendations from real data
    const summary = this.summary();
    const branchPerformance = this.branchPerformance();
    const recommendations: string[] = [];

    if (branchPerformance.length > 0) {
      const topBranch = branchPerformance.reduce((prev, current) =>
        (prev.performance > current.performance) ? prev : current
      );
      const worstBranch = branchPerformance.reduce((prev, current) =>
        (prev.performance < current.performance) ? prev : current
      );

      // Best practice sharing
      if (topBranch.performance > 75) {
        recommendations.push(`Implement best practices from ${topBranch.branchName} to other branches`);
      }

      // Underperforming branch attention
      if (worstBranch.performance < 60) {
        recommendations.push(`Focus improvement efforts on ${worstBranch.branchName} performance`);
      }

      // Transfer optimization
      if (summary.pendingTransfers > summary.totalTransfers * 0.3) {
        recommendations.push('Optimize transfer approval process to reduce pending requests');
      } else {
        recommendations.push('Expand successful transfer optimization strategies');
      }

      // Growth opportunities
      if (summary.averagePerformance > 70) {
        recommendations.push('Consider capacity expansion in top-performing regions');
      } else {
        recommendations.push('Focus on operational efficiency improvements before expansion');
      }

      // Revenue optimization
      const salesGap = branchPerformance.some(b => b.salesTotal < topBranch.salesTotal * 0.5);
      if (salesGap) {
        recommendations.push('Address revenue gaps between high and low performing branches');
      }
    } else {
      recommendations.push('Establish performance monitoring and data collection systems');
    }

    return recommendations;
  }

  constructor(
    private coordinationService: MultiBranchCoordinationService,
    private branchAnalyticsService: BranchAnalyticsService,
    private branchService: BranchService,
    private transferService: InventoryTransferService,
    private stateService: StateService,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadAnalyticsData();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  onPeriodChange(period: string) {
    if (this.selectedPeriod() === period) {
      return; // Avoid unnecessary API calls if period hasn't changed
    }

    this.selectedPeriod.set(period);
    this.clearCachedData(); // Clear cached view-specific data
    this.loadAnalyticsData();
    this.showMessage(`Analytics updated for ${this.getPeriodLabel(period)}`, 'info');
  }

  onViewChange(view: string) {
    if (this.selectedView() === view) {
      return; // Avoid unnecessary processing if view hasn't changed
    }

    const previousView = this.selectedView();
    this.selectedView.set(view);

    // Only reload data if switching to views that require fresh data
    // or if we don't have cached data for this view
    const requiresRefresh = ['trends', 'forecast', 'executive'].includes(view) || !this.hasViewSpecificData(view);

    if (requiresRefresh) {
      this.loadAnalyticsData();
    }

    this.showMessage(`Switched to ${this.getViewLabel(view)} view`, 'info');
  }

  private clearCachedData(): void {
    // Clear view-specific cached data when period changes
    this.viewSpecificData = null;
    this.trendData = null;
    this.regionalData = null;
    this.executiveData = null;
    this.forecastData = null;
  }

  private hasViewSpecificData(view: string): boolean {
    switch (view) {
      case 'trends':
        return !!this.trendData;
      case 'regional':
        return !!this.regionalData;
      case 'executive':
        return !!this.executiveData;
      case 'forecast':
        return !!this.forecastData;
      default:
        return true; // Overview doesn't need specific data
    }
  }

  private getPeriodLabel(period: string): string {
    const labels = {
      '1M': '1 Month',
      '3M': '3 Months',
      '6M': '6 Months',
      '1Y': '1 Year'
    };
    return labels[period as keyof typeof labels] || period;
  }

  private getViewLabel(view: string): string {
    const labels = {
      'overview': 'Overview',
      'trends': 'Trends Analysis',
      'regional': 'Regional Performance',
      'executive': 'Executive Summary',
      'forecast': 'Performance Forecast'
    };
    return labels[view as keyof typeof labels] || view;
  }

  onRefreshData() {
    this.loadAnalyticsData();
  }

  onExportSummary() {
    this.showMessage('Export functionality will be implemented soon', 'info');
  }

  onDownloadReport() {
    this.showMessage('Download functionality will be implemented soon', 'info');
  }

  private loadAnalyticsData() {
    this.loading.set(true);
    this.error.set(null);

    // Get period parameters with proper filtering
    const { startDate, endDate } = this.getPeriodDates(this.selectedPeriod());
    const periodParams = new URLSearchParams({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      period: this.selectedPeriod(), // Add explicit period parameter
      filter: 'true' // Ensure backend filters data by period
    });

    // Enhanced view-specific parameter handling
    const currentView = this.selectedView();
    const viewParams = new URLSearchParams(periodParams);

    // Add view-specific parameters for better filtering
    switch (currentView) {
      case 'trends':
        viewParams.append('includeMetrics', 'growth,efficiency,performance');
        viewParams.append('granularity', 'monthly');
        break;
      case 'regional':
        viewParams.append('includeRegions', 'jakarta');
        viewParams.append('performanceThreshold', '0');
        break;
      case 'forecast':
        viewParams.append('forecastDays', this.getForecastDaysFromPeriod(this.selectedPeriod()));
        viewParams.append('includeConfidence', 'true');
        break;
      case 'executive':
        viewParams.append('includeSummary', 'true');
        viewParams.append('includeRecommendations', 'true');
        break;
    }

    // Load real data from backend APIs with enhanced period filtering
    const dashboardCall = this.http.get<ApiResponse<any>>(`/api/Analytics/dashboard?${periodParams}`).pipe(
      catchError(error => {
        console.warn('Dashboard analytics API not ready:', error);
        return of(null);
      })
    );

    const branchPerformanceCall = this.http.get<ApiResponse<any>>(`/api/Branch/performance?${periodParams}`).pipe(
      catchError(error => {
        console.warn('Branch performance API not ready:', error);
        return of(null);
      })
    );

    const transferAnalyticsCall = this.http.get<ApiResponse<any>>(`/api/InventoryTransfer/analytics?${periodParams}`).pipe(
      catchError(error => {
        console.warn('Transfer analytics API not ready:', error);
        return of(null);
      })
    );

    // Enhanced view-specific API calls with better parameter handling
    let viewSpecificCall: Observable<ApiResponse<any> | null> = of(null);
    switch (currentView) {
      case 'trends':
        viewSpecificCall = this.http.get<ApiResponse<any>>(`/api/ConsolidatedReport/trend-analysis?${viewParams}`).pipe(
          catchError(() => of(null))
        );
        break;
      case 'regional':
        viewSpecificCall = this.http.get<ApiResponse<any>>(`/api/Branch/analytics/regional?${viewParams}`).pipe(
          catchError(() => of(null))
        );
        break;
      case 'executive':
        viewSpecificCall = this.http.get<ApiResponse<any>>(`/api/ConsolidatedReport/executive-summary?${viewParams}`).pipe(
          catchError(() => of(null))
        );
        break;
      case 'forecast':
        viewSpecificCall = this.http.get<ApiResponse<any>>(`/api/Dashboard/analytics/predict-sales?${viewParams}`).pipe(
          catchError(() => of(null))
        );
        break;
    }

    forkJoin({
      dashboard: dashboardCall,
      branchPerformance: branchPerformanceCall,
      transferAnalytics: transferAnalyticsCall,
      viewSpecific: viewSpecificCall
    }).subscribe({
      next: (data) => {
        if (data.dashboard?.success && data.dashboard.data) {
          this.processRealDashboardData(data.dashboard.data);
        } else {
          this.loadMockData();
        }

        if (data.branchPerformance?.success && data.branchPerformance.data) {
          this.processRealBranchPerformance(data.branchPerformance.data);
        }

        if (data.transferAnalytics?.success && data.transferAnalytics.data) {
          this.processTransferData(data.transferAnalytics.data);
        }

        if (data.viewSpecific?.success && data.viewSpecific.data) {
          this.processViewSpecificData(data.viewSpecific.data);
        }

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading analytics data:', error);
        this.error.set('Failed to load analytics data');
        this.loadMockData();
        this.loading.set(false);
      }
    });
  }

  private loadMockData() {
    // Fallback data when real API is not available - will be replaced by real data when API is ready
    console.warn('Using fallback data - real API endpoints not responding');

    // Get total branches from branch performance data if available
    const branchPerformanceData = this.branchPerformance();
    const branchCount = branchPerformanceData.length || 0;
    const activeBranchCount = branchCount; // Assume all branches in performance data are active

    this.summary.set({
      totalBranches: branchCount,
      activeBranches: activeBranchCount,
      totalTransfers: 0, // Will be updated by real transfer data
      pendingTransfers: 0, // Will be updated by real transfer data
      totalSales: 0, // Will be updated by real sales data
      averagePerformance: 0 // Will be calculated from real branch performance
    });

    // Set empty performance data - will be populated by real API
    this.branchPerformance.set([]);
  }

  private processBranchData(branches: any[]) {
    // Process real branch data when available
    const summary = this.summary();
    summary.totalBranches = branches.length;
    summary.activeBranches = branches.filter(b => b.isActive).length;
    this.summary.set(summary);
  }

  private processTransferData(transferData: any) {
    // Process real transfer data when available
    if (transferData) {
      const summary = this.summary();
      summary.totalTransfers = transferData.totalTransfers || 0;
      summary.pendingTransfers = transferData.pendingTransfers || 0;
      this.summary.set(summary);
    }
  }

  private processRealDashboardData(dashboardData: any) {
    // Process real dashboard analytics data from AnalyticsController
    const branchPerformance = dashboardData.branchPerformance || [];
    const totalBranches = branchPerformance.length;
    const activeBranches = branchPerformance.filter((b: any) => b.statusText !== 'Declining').length;

    // Calculate average performance from real branch data
    let averagePerformance = 0;
    if (branchPerformance.length > 0) {
      // Use growth rate as performance indicator, convert to percentage scale
      const totalGrowth = branchPerformance.reduce((sum: number, branch: any) => sum + (branch.growth || 0), 0);
      averagePerformance = Math.max(0, Math.min(100, 50 + (totalGrowth / branchPerformance.length))); // Normalize to 0-100 scale
    }

    this.summary.set({
      totalBranches: totalBranches,
      activeBranches: activeBranches,
      totalTransfers: dashboardData.activeTransfers || 0,
      pendingTransfers: dashboardData.pendingApprovals || 0,
      totalSales: dashboardData.totalSales || 0,
      averagePerformance: Math.round(averagePerformance * 10) / 10 // Round to 1 decimal
    });

    // Process branch performance data with real sales and transfer data
    if (branchPerformance && Array.isArray(branchPerformance)) {
      this.branchPerformance.set(branchPerformance.map((branch: any) => ({
        branchId: branch.branchId,
        branchName: branch.branchName,
        salesTotal: branch.totalSales || 0,
        transfersCount: branch.transactionCount || 0, // Use transaction count as proxy for transfers
        performance: Math.max(0, Math.min(100, 50 + (branch.growth || 0))) // Convert growth to performance scale
      })));
    }
  }

  private processCoordinationData(coordinationData: any) {
    // Process multi-branch coordination data when available
    if (coordinationData?.data && Array.isArray(coordinationData.data)) {
      // Update performance metrics from coordination service
      const performanceData = coordinationData.data.map((branch: any) => ({
        branchId: branch.branchId,
        branchName: branch.branchName,
        salesTotal: branch.revenue || 0,
        transfersCount: branch.transferCount || 0,
        performance: Math.round(branch.score || 0)
      }));
      this.branchPerformance.set(performanceData);

      // Update summary metrics
      const summary = this.summary();
      summary.totalBranches = coordinationData.data.length;
      summary.activeBranches = coordinationData.data.filter((b: any) => b.score > 0).length;
      summary.averagePerformance = coordinationData.data.reduce((acc: number, branch: any) => acc + (branch.score || 0), 0) / coordinationData.data.length;
      summary.totalSales = coordinationData.data.reduce((acc: number, branch: any) => acc + (branch.revenue || 0), 0);
      this.summary.set(summary);
    }
  }

  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    // Reset time to start of day for consistent filtering
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    switch (period) {
      case '1M':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 3); // Default to 3 months
    }

    return { startDate, endDate };
  }

  private getForecastDaysFromPeriod(period: string): string {
    // Calculate forecast horizon based on selected period
    switch (period) {
      case '1M':
        return '30';   // 1 month forecast
      case '3M':
        return '90';   // 3 months forecast
      case '6M':
        return '180';  // 6 months forecast
      case '1Y':
        return '365';  // 1 year forecast
      default:
        return '90';   // Default 3 months
    }
  }

  private processRealBranchPerformance(data: any) {
    if (Array.isArray(data)) {
      const performanceData = data.map((branch: any) => ({
        branchId: branch.branchId || branch.id,
        branchName: branch.branchName || branch.name,
        salesTotal: branch.totalRevenue || branch.salesTotal || 0,
        transfersCount: branch.transferCount || 0,
        performance: Math.round(branch.performanceScore || branch.performance || 0)
      }));
      this.branchPerformance.set(performanceData);
    }
  }

  private processViewSpecificData(data: any) {
    // Store view-specific data for template rendering
    this.viewSpecificData = data;

    // Update computed values based on view type
    if (this.selectedView() === 'trends' && data.trends) {
      // Process trend data for trends view
      this.trendData = data.trends;
    } else if (this.selectedView() === 'regional' && data.regions) {
      // Process regional data for regional view
      this.regionalData = data.regions;
    } else if (this.selectedView() === 'executive' && data.summary) {
      // Process executive summary data
      this.executiveData = data.summary;
    } else if (this.selectedView() === 'forecast' && data.predictions) {
      // Process forecast data
      this.forecastData = data.predictions;
    }
  }

  private processRealTransferData(data: any) {
    const summary = this.summary();
    summary.totalTransfers = data.totalTransfers || 0;
    summary.pendingTransfers = data.pendingTransfers || 0;
    this.summary.set(summary);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: [`snackbar-${type}`]
    });
  }
}