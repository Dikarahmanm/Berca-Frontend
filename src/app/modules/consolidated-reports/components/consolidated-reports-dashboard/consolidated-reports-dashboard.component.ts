// src/app/modules/consolidated-reports/components/consolidated-reports-dashboard/consolidated-reports-dashboard.component.ts
// Main dashboard for consolidated multi-branch reporting

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { StateService } from '../../../../core/services/state.service';
import { BranchAnalyticsService } from '../../../../core/services/branch-analytics.service';

export interface ReportCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  summary?: {
    total: number;
    change: string;
    trend: 'up' | 'down' | 'stable';
  };
  quickActions?: QuickAction[];
}

export interface QuickAction {
  label: string;
  icon: string;
  action: () => void;
  color?: string;
}

export interface ReportSummary {
  totalRevenue: number;
  totalTransactions: number;
  totalProfit: number;
  activeReports: number;
  lastUpdated: string;
  trends: {
    revenue: { value: number; trend: 'up' | 'down' | 'stable' };
    transactions: { value: number; trend: 'up' | 'down' | 'stable' };
    profit: { value: number; trend: 'up' | 'down' | 'stable' };
  };
}

@Component({
  selector: 'app-consolidated-reports-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTabsModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './consolidated-reports-dashboard.component.html',
  styleUrls: ['./consolidated-reports-dashboard.component.scss']
})
export class ConsolidatedReportsDashboardComponent implements OnInit {
  private stateService = inject(StateService);
  private analyticsService = inject(BranchAnalyticsService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Signals for reactive state
  selectedPeriod = signal<string>('30d');
  selectedBranches = signal<number[]>([]);
  isLoading = signal<boolean>(false);

  // User context and permissions
  readonly user = this.stateService.user;
  readonly accessibleBranches = this.stateService.accessibleBranches;
  readonly analyticsOverview = this.analyticsService.analyticsOverview;
  readonly branchPerformances = this.analyticsService.branchPerformances;

  // Filter form
  filterForm: FormGroup = this.fb.group({
    period: [this.selectedPeriod()],
    branches: [this.selectedBranches()],
    reportType: ['all']
  });

  // Computed properties
  readonly reportSummary = computed((): ReportSummary => {
    const overview = this.analyticsOverview();
    const performances = this.branchPerformances();
    
    if (!overview) {
      return this.getDefaultReportSummary();
    }

    const totalProfit = performances.reduce((sum, p) => 
      sum + (p.revenue * (p.profitMargin / 100)), 0
    );

    return {
      totalRevenue: overview.totalRevenue,
      totalTransactions: overview.totalTransactions,
      totalProfit: totalProfit,
      activeReports: 8, // Mock data - in real app, would come from service
      lastUpdated: overview.lastUpdated,
      trends: {
        revenue: { value: 12.3, trend: 'up' },
        transactions: { value: 8.7, trend: 'up' },
        profit: { value: 15.2, trend: 'up' }
      }
    };
  });

  readonly reportCards = computed((): ReportCard[] => {
    const overview = this.analyticsOverview();
    
    return [
      {
        title: 'Sales Reports',
        description: 'Consolidated sales performance across all branches',
        icon: 'point_of_sale',
        route: '/dashboard/consolidated-reports/sales',
        color: 'primary',
        summary: {
          total: overview?.totalRevenue || 0,
          change: '+12.3%',
          trend: 'up'
        },
        quickActions: [
          { 
            label: 'Daily Sales', 
            icon: 'today', 
            action: () => this.generateQuickReport('daily-sales')
          },
          { 
            label: 'Monthly', 
            icon: 'calendar_month', 
            action: () => this.generateQuickReport('monthly-sales')
          }
        ]
      },
      {
        title: 'Inventory Reports',
        description: 'Stock levels, turnover, and inventory analysis',
        icon: 'inventory_2',
        route: '/dashboard/consolidated-reports/inventory',
        color: 'success',
        summary: {
          total: overview?.totalStockValue || 0,
          change: '+5.7%',
          trend: 'up'
        },
        quickActions: [
          { 
            label: 'Stock Levels', 
            icon: 'storage', 
            action: () => this.generateQuickReport('stock-levels')
          },
          { 
            label: 'Low Stock', 
            icon: 'warning', 
            action: () => this.generateQuickReport('low-stock')
          }
        ]
      },
      {
        title: 'Financial Reports',
        description: 'Profit & loss, cash flow, and financial metrics',
        icon: 'account_balance',
        route: '/dashboard/consolidated-reports/financial',
        color: 'info',
        summary: {
          total: this.reportSummary().totalProfit,
          change: '+15.2%',
          trend: 'up'
        },
        quickActions: [
          { 
            label: 'P&L Statement', 
            icon: 'trending_up', 
            action: () => this.generateQuickReport('pnl')
          },
          { 
            label: 'Cash Flow', 
            icon: 'account_balance_wallet', 
            action: () => this.generateQuickReport('cash-flow')
          }
        ]
      },
      {
        title: 'Operational Reports',
        description: 'Operations efficiency and performance metrics',
        icon: 'settings',
        route: '/dashboard/consolidated-reports/operational',
        color: 'warning',
        summary: {
          total: overview?.averagePerformanceScore || 0,
          change: '+3.2%',
          trend: 'up'
        },
        quickActions: [
          { 
            label: 'Efficiency', 
            icon: 'speed', 
            action: () => this.generateQuickReport('efficiency')
          },
          { 
            label: 'Utilization', 
            icon: 'pie_chart', 
            action: () => this.generateQuickReport('utilization')
          }
        ]
      },
      {
        title: 'Performance Reports',
        description: 'Branch performance comparison and analytics',
        icon: 'analytics',
        route: '/dashboard/consolidated-reports/performance',
        color: 'error',
        summary: {
          total: this.branchPerformances().length,
          change: 'Stable',
          trend: 'stable'
        },
        quickActions: [
          { 
            label: 'Rankings', 
            icon: 'leaderboard', 
            action: () => this.generateQuickReport('rankings')
          },
          { 
            label: 'Benchmarks', 
            icon: 'compare', 
            action: () => this.generateQuickReport('benchmarks')
          }
        ]
      },
      {
        title: 'Custom Reports',
        description: 'Build and customize your own reports',
        icon: 'build',
        route: '/dashboard/consolidated-reports/custom-builder',
        color: 'secondary',
        quickActions: [
          { 
            label: 'New Report', 
            icon: 'add', 
            action: () => this.createCustomReport()
          },
          { 
            label: 'Templates', 
            icon: 'file_copy', 
            action: () => this.viewReportTemplates()
          }
        ]
      }
    ];
  });

  readonly quickStats = computed(() => {
    const summary = this.reportSummary();
    const overview = this.analyticsOverview();
    
    return [
      {
        title: 'Total Branches',
        value: overview?.totalBranches.toString() || '0',
        icon: 'store',
        color: 'primary'
      },
      {
        title: 'Reports Generated',
        value: '147', // Mock data
        icon: 'description',
        color: 'success'
      },
      {
        title: 'Scheduled Reports',
        value: '12', // Mock data
        icon: 'schedule',
        color: 'warning'
      },
      {
        title: 'Exported Today',
        value: '23', // Mock data
        icon: 'file_download',
        color: 'info'
      }
    ];
  });

  ngOnInit(): void {
    this.setupFormSubscriptions();
    this.initializeDashboard();
  }

  private setupFormSubscriptions(): void {
    this.filterForm.get('period')?.valueChanges.subscribe(value => {
      this.selectedPeriod.set(value);
      this.refreshReports();
    });

    this.filterForm.get('branches')?.valueChanges.subscribe(value => {
      this.selectedBranches.set(value || []);
      this.refreshReports();
    });
  }

  private initializeDashboard(): void {
    console.log('📊 Consolidated Reports Dashboard initialized');
    this.refreshReports();
  }

  // Action methods
  refreshReports(): void {
    this.isLoading.set(true);
    
    // Simulate loading delay
    setTimeout(() => {
      this.isLoading.set(false);
      console.log(`🔄 Reports refreshed for period: ${this.selectedPeriod()}`);
    }, 1000);
  }

  navigateToReport(route: string): void {
    this.router.navigate([route]);
  }

  generateQuickReport(reportType: string): void {
    console.log(`📈 Generating quick report: ${reportType}`);
    // TODO: Implement quick report generation
  }

  createCustomReport(): void {
    this.router.navigate(['/dashboard/consolidated-reports/custom-builder']);
  }

  viewReportTemplates(): void {
    this.router.navigate(['/dashboard/consolidated-reports/custom-builder'], {
      queryParams: { view: 'templates' }
    });
  }

  scheduleReport(): void {
    this.router.navigate(['/dashboard/consolidated-reports/scheduler']);
  }

  exportReports(): void {
    this.router.navigate(['/dashboard/consolidated-reports/export-manager']);
  }

  // Branch selection methods
  selectAllBranches(): void {
    const allBranchIds = this.accessibleBranches().map(b => b.branchId);
    this.selectedBranches.set(allBranchIds);
    this.filterForm.patchValue({ branches: allBranchIds });
  }

  clearBranchSelection(): void {
    this.selectedBranches.set([]);
    this.filterForm.patchValue({ branches: [] });
  }

  toggleBranchSelection(branchId: number): void {
    const selected = this.selectedBranches();
    const newSelection = selected.includes(branchId)
      ? selected.filter(id => id !== branchId)
      : [...selected, branchId];
    
    this.selectedBranches.set(newSelection);
    this.filterForm.patchValue({ branches: newSelection });
  }

  // Period change handler
  onPeriodChange(period: string): void {
    this.selectedPeriod.set(period);
    this.refreshReports();
  }

  // Quick action handlers
  executeQuickAction(action: QuickAction, event: Event): void {
    event.stopPropagation();
    action.action();
  }

  openCustomReportBuilder(): void {
    this.router.navigate(['/dashboard/consolidated-reports/custom-builder']);
  }

  openReportScheduler(): void {
    this.router.navigate(['/dashboard/consolidated-reports/scheduler']);
  }

  openExportManager(): void {
    this.router.navigate(['/dashboard/consolidated-reports/export-manager']);
  }

  viewReportHistory(): void {
    this.router.navigate(['/dashboard/consolidated-reports/history']);
  }

  // TrackBy function for reports
  trackByReport = (index: number, report: ReportCard): string => report.route;

  // Utility methods
  private getDefaultReportSummary(): ReportSummary {
    return {
      totalRevenue: 0,
      totalTransactions: 0,
      totalProfit: 0,
      activeReports: 0,
      lastUpdated: new Date().toISOString(),
      trends: {
        revenue: { value: 0, trend: 'stable' },
        transactions: { value: 0, trend: 'stable' },
        profit: { value: 0, trend: 'stable' }
      }
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('id-ID');
  }

  getBranchName(branchId: number): string {
    const branch = this.accessibleBranches().find(b => b.branchId === branchId);
    return branch?.branchName || 'Unknown Branch';
  }

  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    const icons = {
      'up': 'trending_up',
      'down': 'trending_down',
      'stable': 'trending_flat'
    };
    return icons[trend];
  }

  getTrendColor(trend: 'up' | 'down' | 'stable'): string {
    const colors = {
      'up': 'success',
      'down': 'error',
      'stable': 'secondary'
    };
    return colors[trend];
  }

  // TrackBy functions for performance
  trackByReportCard = (index: number, card: ReportCard): string => card.route;
  trackByQuickStat = (index: number, stat: any): string => stat.title;
  trackByBranch = (index: number, branch: any): number => branch.branchId;
}