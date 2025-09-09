import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MultiBranchCoordinationService, BranchPerformance } from '../../core/services/multi-branch-coordination.service';
import { StateService } from '../../core/services/state.service';
import { Branch } from '../../core/models/branch.models';
import { Subscription, interval } from 'rxjs';

// Performance Analytics Interfaces
export interface PerformanceComparison {
  branchId: number;
  branchName: string;
  currentPeriod: BranchPerformanceMetrics;
  previousPeriod: BranchPerformanceMetrics;
  growth: PerformanceGrowth;
  rank: number;
  percentile: number;
}

export interface BranchPerformanceMetrics {
  revenue: number;
  profitMargin: number;
  inventoryTurnover: number;
  stockoutEvents: number;
  wastePercentage: number;
  customerSatisfaction: number;
  operationalEfficiency: number;
}

export interface PerformanceGrowth {
  revenueGrowth: number;
  profitGrowth: number;
  efficiencyGrowth: number;
  satisfactionGrowth: number;
}

export interface PerformanceChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    type?: string;
  }[];
}

@Component({
  selector: 'app-branch-performance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './branch-performance.component.html',
  styleUrls: ['./branch-performance.component.scss']
})
export class BranchPerformanceComponent implements OnInit, OnDestroy {
  // Service data signals
  branchPerformances = computed(() => this.coordinationService.branchPerformances());
  availableBranches = computed(() => this.stateService.availableBranches());
  currentUser = computed(() => this.stateService.user());

  // Component state signals
  private readonly _isLoading = signal<boolean>(false);
  private readonly _selectedPeriod = signal<'7d' | '30d' | '90d' | '1y'>('30d');
  private readonly _selectedMetric = signal<string>('revenue');
  private readonly _comparisonMode = signal<'all' | 'top5' | 'bottom5'>('all');
  private readonly _chartType = signal<'bar' | 'line' | 'radar'>('bar');

  // Component state getters
  isLoading = this._isLoading.asReadonly();
  selectedPeriod = this._selectedPeriod.asReadonly();
  selectedMetric = this._selectedMetric.asReadonly();
  comparisonMode = this._comparisonMode.asReadonly();
  chartType = this._chartType.asReadonly();

  // Computed performance analytics
  performanceComparisons = computed(() => {
    const performances = this.branchPerformances();
    return performances.map((perf, index) => ({
      branchId: perf.branchId,
      branchName: perf.branchName,
      currentPeriod: {
        revenue: perf.revenue,
        profitMargin: perf.profitMargin,
        inventoryTurnover: perf.inventoryTurnover,
        stockoutEvents: perf.stockoutEvents,
        wastePercentage: perf.wastePercentage,
        customerSatisfaction: 85 + Math.random() * 10, // Mock data
        operationalEfficiency: 75 + Math.random() * 20  // Mock data
      },
      previousPeriod: {
        revenue: perf.revenue * (0.85 + Math.random() * 0.3),
        profitMargin: perf.profitMargin * (0.9 + Math.random() * 0.2),
        inventoryTurnover: perf.inventoryTurnover * (0.8 + Math.random() * 0.4),
        stockoutEvents: perf.stockoutEvents + Math.floor(Math.random() * 5),
        wastePercentage: perf.wastePercentage + (Math.random() * 2 - 1),
        customerSatisfaction: 80 + Math.random() * 10,
        operationalEfficiency: 70 + Math.random() * 20
      },
      growth: {
        revenueGrowth: perf.trends.revenueGrowth,
        profitGrowth: perf.trends.profitTrend,
        efficiencyGrowth: perf.trends.efficiencyTrend,
        satisfactionGrowth: Math.random() * 10 - 5 // Mock data
      },
      rank: perf.rank,
      percentile: Math.round((1 - (perf.rank - 1) / performances.length) * 100)
    })).sort((a, b) => a.rank - b.rank);
  });

  filteredComparisons = computed(() => {
    const comparisons = this.performanceComparisons();
    const mode = this._comparisonMode();
    
    switch (mode) {
      case 'top5':
        return comparisons.slice(0, 5);
      case 'bottom5':
        return comparisons.slice(-5).reverse();
      default:
        return comparisons;
    }
  });

  performanceMetrics = computed(() => {
    const comparisons = this.performanceComparisons();
    if (comparisons.length === 0) return null;

    const metrics = {
      totalRevenue: comparisons.reduce((sum, comp) => sum + comp.currentPeriod.revenue, 0),
      avgProfitMargin: comparisons.reduce((sum, comp) => sum + comp.currentPeriod.profitMargin, 0) / comparisons.length,
      avgInventoryTurnover: comparisons.reduce((sum, comp) => sum + comp.currentPeriod.inventoryTurnover, 0) / comparisons.length,
      totalStockouts: comparisons.reduce((sum, comp) => sum + comp.currentPeriod.stockoutEvents, 0),
      avgWaste: comparisons.reduce((sum, comp) => sum + comp.currentPeriod.wastePercentage, 0) / comparisons.length,
      avgSatisfaction: comparisons.reduce((sum, comp) => sum + comp.currentPeriod.customerSatisfaction, 0) / comparisons.length,
      topPerformer: comparisons[0],
      worstPerformer: comparisons[comparisons.length - 1]
    };

    return metrics;
  });

  chartData = computed((): PerformanceChartData => {
    const comparisons = this.filteredComparisons();
    const metric = this._selectedMetric();
    
    if (comparisons.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = comparisons.map(comp => comp.branchName);
    
    switch (metric) {
      case 'revenue':
        return {
          labels,
          datasets: [{
            label: 'Revenue (IDR)',
            data: comparisons.map(comp => comp.currentPeriod.revenue),
            backgroundColor: 'rgba(37, 99, 235, 0.6)',
            borderColor: 'rgba(37, 99, 235, 1)',
          }]
        };
      
      case 'profit':
        return {
          labels,
          datasets: [{
            label: 'Profit Margin (%)',
            data: comparisons.map(comp => comp.currentPeriod.profitMargin),
            backgroundColor: 'rgba(16, 185, 129, 0.6)',
            borderColor: 'rgba(16, 185, 129, 1)',
          }]
        };
      
      case 'efficiency':
        return {
          labels,
          datasets: [
            {
              label: 'Inventory Turnover',
              data: comparisons.map(comp => comp.currentPeriod.inventoryTurnover),
              backgroundColor: 'rgba(245, 158, 11, 0.6)',
              borderColor: 'rgba(245, 158, 11, 1)',
            },
            {
              label: 'Operational Efficiency (%)',
              data: comparisons.map(comp => comp.currentPeriod.operationalEfficiency),
              backgroundColor: 'rgba(139, 92, 246, 0.6)',
              borderColor: 'rgba(139, 92, 246, 1)',
            }
          ]
        };
      
      case 'quality':
        return {
          labels,
          datasets: [
            {
              label: 'Customer Satisfaction (%)',
              data: comparisons.map(comp => comp.currentPeriod.customerSatisfaction),
              backgroundColor: 'rgba(34, 197, 94, 0.6)',
              borderColor: 'rgba(34, 197, 94, 1)',
            },
            {
              label: 'Waste Percentage (%)',
              data: comparisons.map(comp => comp.currentPeriod.wastePercentage),
              backgroundColor: 'rgba(239, 68, 68, 0.6)',
              borderColor: 'rgba(239, 68, 68, 1)',
            }
          ]
        };
      
      default:
        return { labels: [], datasets: [] };
    }
  });

  // Auto-refresh subscription
  private refreshInterval?: Subscription;
  private subscriptions = new Subscription();

  constructor(
    private coordinationService: MultiBranchCoordinationService,
    private stateService: StateService,
    private router: Router
  ) {
    // Auto-refresh effect
    effect(() => {
      const period = this._selectedPeriod();
      this.loadPerformanceData();
    });
  }

  ngOnInit() {
    this.loadPerformanceData();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
    this.subscriptions.unsubscribe();
  }

  // Data loading methods
  private loadPerformanceData() {
    this._isLoading.set(true);
    
    this.coordinationService.getBranchPerformances().subscribe({
      next: () => {
        this._isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load performance data:', error);
        this._isLoading.set(false);
      }
    });
  }

  private startAutoRefresh() {
    // Refresh every 2 minutes
    this.refreshInterval = interval(120000).subscribe(() => {
      this.loadPerformanceData();
    });
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  // Filter and view methods
  setPeriod(period: '7d' | '30d' | '90d' | '1y') {
    this._selectedPeriod.set(period);
  }

  setMetric(metric: string) {
    this._selectedMetric.set(metric);
  }

  setComparisonMode(mode: 'all' | 'top5' | 'bottom5') {
    this._comparisonMode.set(mode);
  }

  setChartType(type: 'bar' | 'line' | 'radar') {
    this._chartType.set(type);
  }

  // Event handlers for templates
  onComparisonModeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.setComparisonMode(target.value as 'all' | 'top5' | 'bottom5');
  }

  onMetricChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.setMetric(target.value);
  }

  // Navigation methods
  viewBranchDetails(branchId: number) {
    this.router.navigate(['/branches/view', branchId]);
  }

  exportData() {
    const data = this.performanceComparisons();
    const csv = this.convertToCSV(data);
    this.downloadCSV(csv, `branch-performance-${this._selectedPeriod()}.csv`);
  }

  // Utility methods
  private convertToCSV(data: PerformanceComparison[]): string {
    if (data.length === 0) return '';
    
    const headers = [
      'Branch Name', 'Rank', 'Revenue', 'Profit Margin', 'Inventory Turnover',
      'Stockout Events', 'Waste %', 'Customer Satisfaction', 'Revenue Growth',
      'Profit Growth', 'Efficiency Growth'
    ];
    
    const rows = data.map(comp => [
      comp.branchName,
      comp.rank,
      comp.currentPeriod.revenue,
      comp.currentPeriod.profitMargin,
      comp.currentPeriod.inventoryTurnover,
      comp.currentPeriod.stockoutEvents,
      comp.currentPeriod.wastePercentage,
      comp.currentPeriod.customerSatisfaction,
      comp.growth.revenueGrowth,
      comp.growth.profitGrowth,
      comp.growth.efficiencyGrowth
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Formatting methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  // Growth indicator methods
  getGrowthClass(growth: number): string {
    if (growth > 5) return 'growth-excellent';
    if (growth > 0) return 'growth-positive';
    if (growth > -5) return 'growth-neutral';
    return 'growth-negative';
  }

  getGrowthIcon(growth: number): string {
    if (growth > 0) return 'icon-trending-up';
    if (growth < 0) return 'icon-trending-down';
    return 'icon-minus';
  }

  getPerformanceLevel(percentile: number): string {
    if (percentile >= 90) return 'Excellent';
    if (percentile >= 75) return 'Good';
    if (percentile >= 50) return 'Average';
    if (percentile >= 25) return 'Below Average';
    return 'Poor';
  }

  getPerformanceLevelClass(percentile: number): string {
    if (percentile >= 90) return 'level-excellent';
    if (percentile >= 75) return 'level-good';
    if (percentile >= 50) return 'level-average';
    if (percentile >= 25) return 'level-below-average';
    return 'level-poor';
  }

  // Chart utility methods (placeholder for chart library integration)
  renderChart() {
    // This would integrate with a charting library like Chart.js or D3.js
    console.log('Rendering chart with data:', this.chartData());
  }

  refreshData() {
    this.loadPerformanceData();
  }

  trackByBranchId(index: number, comparison: PerformanceComparison): number {
    return comparison.branchId;
  }

  getMaxValue(data: number[]): number {
    return Math.max(...data);
  }

  formatMetricValue(value: number): string {
    const metric = this._selectedMetric();
    switch (metric) {
      case 'revenue':
        return this.formatCurrency(value);
      case 'profit':
      case 'quality':
        return this.formatPercentage(value);
      default:
        return this.formatNumber(value);
    }
  }
}