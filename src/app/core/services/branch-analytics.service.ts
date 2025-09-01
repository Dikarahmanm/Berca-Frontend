// src/app/core/services/branch-analytics.service.ts
// Enhanced Branch Analytics Service with comprehensive insights and real-time monitoring
// Angular 20 with Signal-based reactive architecture

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { ApiResponse } from '../interfaces/expiry.interfaces';
import { BranchDto, BranchInventoryStatus } from './multi-branch-coordination.service';

// Branch Analytics Interfaces
export interface BranchAnalyticsOverview {
  totalBranches: number;
  activeBranches: number;
  totalRevenue: number;
  totalTransactions: number;
  averagePerformanceScore: number;
  topPerformingBranch: BranchPerformanceData;
  worstPerformingBranch: BranchPerformanceData;
  totalStockValue: number;
  totalWasteValue: number;
  wastePercentage: number;
  lastUpdated: string;
}

export interface BranchPerformanceData {
  branchId: number;
  branchCode: string;
  branchName: string;
  branchType: 'Head' | 'Branch' | 'SubBranch';
  performanceScore: number;
  revenue: number;
  transactions: number;
  profitMargin: number;
  stockTurnover: number;
  wasteValue: number;
  wastePercentage: number;
  customerSatisfaction: number;
  efficiency: number;
  utilizationRate: number;
  growthRate: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
  strongPoints: string[];
  improvementAreas: string[];
}

export interface BranchComparisonMetrics {
  branchId: number;
  branchName: string;
  metrics: {
    revenue: number;
    revenueRank: number;
    transactions: number;
    transactionsRank: number;
    profitMargin: number;
    profitMarginRank: number;
    efficiency: number;
    efficiencyRank: number;
    wasteReduction: number;
    wasteReductionRank: number;
    overallRank: number;
  };
}

export interface BranchEfficiencyMetrics {
  branchId: number;
  branchName: string;
  staffProductivity: number;
  inventoryTurnover: number;
  spaceUtilization: number;
  energyEfficiency: number;
  operationalCosts: number;
  profitPerSqm: number;
  customerThroughput: number;
  averageTransactionValue: number;
  overallEfficiency: number;
}

export interface BranchTrendAnalysis {
  branchId: number;
  branchName: string;
  trends: {
    revenue: TrendData;
    transactions: TrendData;
    profitMargin: TrendData;
    wastePercentage: TrendData;
    customerSatisfaction: TrendData;
  };
  predictions: {
    nextMonthRevenue: number;
    nextMonthTransactions: number;
    riskFactors: string[];
    opportunities: string[];
  };
}

export interface TrendData {
  current: number;
  previous: number;
  changePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  direction: 'up' | 'down' | 'flat';
  confidence: number;
}

export interface BranchAlertData {
  branchId: number;
  branchName: string;
  alerts: BranchAlert[];
  totalCriticalAlerts: number;
  totalWarnings: number;
  alertScore: number; // Lower is better
}

export interface BranchAlert {
  id: string;
  type: 'performance' | 'inventory' | 'financial' | 'operational' | 'compliance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  expectedValue: number;
  variance: number;
  recommendation: string;
  createdAt: string;
  resolved: boolean;
}

export interface BranchBenchmarkData {
  branchId: number;
  branchName: string;
  benchmarks: {
    vsIndustryAverage: BenchmarkComparison;
    vsTopPerformer: BenchmarkComparison;
    vsCompanyAverage: BenchmarkComparison;
  };
}

export interface BenchmarkComparison {
  revenue: BenchmarkMetric;
  profitMargin: BenchmarkMetric;
  efficiency: BenchmarkMetric;
  customerSatisfaction: BenchmarkMetric;
  overallPerformance: BenchmarkMetric;
}

export interface BenchmarkMetric {
  current: number;
  benchmark: number;
  variance: number;
  percentile: number;
  status: 'above' | 'below' | 'at' | 'target';
}

export interface BranchCapacityPrediction {
  branchId: number;
  branchName: string;
  currentCapacity: number;
  projectedCapacity: number;
  utilizationForecast: CapacityForecast[];
  recommendations: CapacityRecommendation[];
  constraintAnalysis: CapacityConstraint[];
}

export interface CapacityForecast {
  date: string;
  predictedUtilization: number;
  confidence: number;
  factors: string[];
}

export interface CapacityRecommendation {
  type: 'expand' | 'optimize' | 'redistribute' | 'maintain';
  description: string;
  impact: number;
  cost: number;
  timeframe: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CapacityConstraint {
  type: 'physical' | 'regulatory' | 'financial' | 'operational';
  description: string;
  impact: 'blocking' | 'limiting' | 'minor';
  mitigation: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/BranchAnalytics`;

  // Signal-based state management
  private _analyticsOverview = signal<BranchAnalyticsOverview | null>(null);
  private _branchPerformances = signal<BranchPerformanceData[]>([]);
  private _branchComparisons = signal<BranchComparisonMetrics[]>([]);
  private _branchEfficiencies = signal<BranchEfficiencyMetrics[]>([]);
  private _branchTrends = signal<BranchTrendAnalysis[]>([]);
  private _branchAlerts = signal<BranchAlertData[]>([]);
  private _branchBenchmarks = signal<BranchBenchmarkData[]>([]);
  private _capacityPredictions = signal<BranchCapacityPrediction[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly analyticsOverview = this._analyticsOverview.asReadonly();
  readonly branchPerformances = this._branchPerformances.asReadonly();
  readonly branchComparisons = this._branchComparisons.asReadonly();
  readonly branchEfficiencies = this._branchEfficiencies.asReadonly();
  readonly branchTrends = this._branchTrends.asReadonly();
  readonly branchAlerts = this._branchAlerts.asReadonly();
  readonly branchBenchmarks = this._branchBenchmarks.asReadonly();
  readonly capacityPredictions = this._capacityPredictions.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed insights
  readonly topPerformingBranches = computed(() => 
    this._branchPerformances()
      .filter(branch => branch.performanceScore > 0)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 3)
  );

  readonly underperformingBranches = computed(() => 
    this._branchPerformances()
      .filter(branch => branch.performanceScore < 70)
      .sort((a, b) => a.performanceScore - b.performanceScore)
  );

  readonly criticalAlerts = computed(() => {
    const allAlerts = this._branchAlerts().flatMap(branch => 
      branch.alerts.filter(alert => 
        alert.severity === 'critical' && !alert.resolved
      )
    );
    return allAlerts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  readonly branchHealthScores = computed(() => 
    this._branchPerformances().map(branch => ({
      branchId: branch.branchId,
      branchName: branch.branchName,
      healthScore: this.calculateBranchHealthScore(branch),
      status: this.getBranchHealthStatus(branch)
    }))
  );

  readonly capacityUtilizationSummary = computed(() => {
    const predictions = this._capacityPredictions();
    if (predictions.length === 0) return null;

    const totalCurrent = predictions.reduce((sum, p) => sum + p.currentCapacity, 0);
    const avgUtilization = predictions.reduce((sum, p) => sum + (p.currentCapacity / 100), 0) / predictions.length;
    const overCapacityCount = predictions.filter(p => p.currentCapacity > 85).length;
    const underCapacityCount = predictions.filter(p => p.currentCapacity < 60).length;

    return {
      averageUtilization: avgUtilization,
      overCapacityBranches: overCapacityCount,
      underCapacityBranches: underCapacityCount,
      totalBranches: predictions.length,
      utilizationStatus: this.getUtilizationStatus(avgUtilization)
    };
  });

  readonly performanceTrends = computed(() => {
    const trends = this._branchTrends();
    if (trends.length === 0) return null;

    const improvingBranches = trends.filter(t => 
      t.trends.revenue.trend === 'increasing' && 
      t.trends.profitMargin.trend === 'increasing'
    ).length;

    const decliningBranches = trends.filter(t => 
      t.trends.revenue.trend === 'decreasing' || 
      t.trends.profitMargin.trend === 'decreasing'
    ).length;

    return {
      improvingBranches,
      decliningBranches,
      stableBranches: trends.length - improvingBranches - decliningBranches,
      overallTrend: improvingBranches > decliningBranches ? 'positive' : 
                   improvingBranches < decliningBranches ? 'negative' : 'stable'
    };
  });

  constructor() {
    this.initializeAnalyticsService();
    this.setupAnalyticsEffects();
  }

  private initializeAnalyticsService(): void {
    this.loadAnalyticsOverview();
    this.loadBranchPerformances();
    this.loadBranchComparisons();
    this.loadBranchEfficiencies();
    this.loadBranchTrends();
    this.loadBranchAlerts();
    this.loadBranchBenchmarks();
    this.loadCapacityPredictions();
  }

  private setupAnalyticsEffects(): void {
    // Auto-alert for critical performance issues
    effect(() => {
      const criticalAlerts = this.criticalAlerts();
      if (criticalAlerts.length > 0) {
        this.handleCriticalAlerts(criticalAlerts);
      }
    });

    // Monitor underperforming branches
    effect(() => {
      const underperforming = this.underperformingBranches();
      if (underperforming.length > 0) {
        this.handleUnderperformingBranches(underperforming);
      }
    });

    // Auto-refresh analytics every 10 minutes
    setInterval(() => {
      this.refreshAllAnalytics();
    }, 10 * 60 * 1000);
  }

  // ===== CORE ANALYTICS METHODS =====

  async loadAnalyticsOverview(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      console.log('📊 Loading branch analytics overview...');
      
      const response = await this.http.get<ApiResponse<BranchAnalyticsOverview>>(
        `${this.baseUrl}/overview`
      ).toPromise();

      if (response?.success && response.data) {
        this._analyticsOverview.set(response.data);
        console.log('✅ Analytics overview loaded successfully');
      } else {
        this._analyticsOverview.set(this.generateMockAnalyticsOverview());
        console.log('📝 Using mock analytics overview');
      }
    } catch (error: any) {
      console.error('❌ Error loading analytics overview:', error);
      this._error.set('Failed to load analytics overview');
      this._analyticsOverview.set(this.generateMockAnalyticsOverview());
    } finally {
      this._loading.set(false);
    }
  }

  async loadBranchPerformances(): Promise<void> {
    try {
      console.log('🎯 Loading branch performance data...');
      
      const response = await this.http.get<ApiResponse<BranchPerformanceData[]>>(
        `${this.baseUrl}/performances`
      ).toPromise();

      if (response?.success && response.data) {
        this._branchPerformances.set(response.data);
        console.log(`✅ Loaded ${response.data.length} branch performances`);
      } else {
        this._branchPerformances.set(this.generateMockBranchPerformances());
        console.log('📝 Using mock branch performance data');
      }
    } catch (error) {
      console.error('❌ Error loading branch performances:', error);
      this._branchPerformances.set(this.generateMockBranchPerformances());
    }
  }

  async loadBranchComparisons(): Promise<void> {
    try {
      console.log('📈 Loading branch comparison metrics...');
      
      const response = await this.http.get<ApiResponse<BranchComparisonMetrics[]>>(
        `${this.baseUrl}/comparisons`
      ).toPromise();

      if (response?.success && response.data) {
        this._branchComparisons.set(response.data);
        console.log('✅ Branch comparisons loaded');
      } else {
        this._branchComparisons.set(this.generateMockBranchComparisons());
        console.log('📝 Using mock comparison data');
      }
    } catch (error) {
      console.error('❌ Error loading branch comparisons:', error);
      this._branchComparisons.set(this.generateMockBranchComparisons());
    }
  }

  async loadBranchEfficiencies(): Promise<void> {
    try {
      console.log('⚡ Loading branch efficiency metrics...');
      
      const response = await this.http.get<ApiResponse<BranchEfficiencyMetrics[]>>(
        `${this.baseUrl}/efficiencies`
      ).toPromise();

      if (response?.success && response.data) {
        this._branchEfficiencies.set(response.data);
        console.log('✅ Branch efficiencies loaded');
      } else {
        this._branchEfficiencies.set(this.generateMockBranchEfficiencies());
        console.log('📝 Using mock efficiency data');
      }
    } catch (error) {
      console.error('❌ Error loading branch efficiencies:', error);
      this._branchEfficiencies.set(this.generateMockBranchEfficiencies());
    }
  }

  async loadBranchTrends(): Promise<void> {
    try {
      console.log('📊 Loading branch trend analysis...');
      
      const response = await this.http.get<ApiResponse<BranchTrendAnalysis[]>>(
        `${this.baseUrl}/trends`
      ).toPromise();

      if (response?.success && response.data) {
        this._branchTrends.set(response.data);
        console.log('✅ Branch trends loaded');
      } else {
        this._branchTrends.set(this.generateMockBranchTrends());
        console.log('📝 Using mock trend data');
      }
    } catch (error) {
      console.error('❌ Error loading branch trends:', error);
      this._branchTrends.set(this.generateMockBranchTrends());
    }
  }

  async loadBranchAlerts(): Promise<void> {
    try {
      console.log('🚨 Loading branch alerts...');
      
      const response = await this.http.get<ApiResponse<BranchAlertData[]>>(
        `${this.baseUrl}/alerts`
      ).toPromise();

      if (response?.success && response.data) {
        this._branchAlerts.set(response.data);
        console.log('✅ Branch alerts loaded');
      } else {
        this._branchAlerts.set(this.generateMockBranchAlerts());
        console.log('📝 Using mock alert data');
      }
    } catch (error) {
      console.error('❌ Error loading branch alerts:', error);
      this._branchAlerts.set(this.generateMockBranchAlerts());
    }
  }

  async loadBranchBenchmarks(): Promise<void> {
    try {
      console.log('🏆 Loading branch benchmarks...');
      
      const response = await this.http.get<ApiResponse<BranchBenchmarkData[]>>(
        `${this.baseUrl}/benchmarks`
      ).toPromise();

      if (response?.success && response.data) {
        this._branchBenchmarks.set(response.data);
        console.log('✅ Branch benchmarks loaded');
      } else {
        this._branchBenchmarks.set(this.generateMockBranchBenchmarks());
        console.log('📝 Using mock benchmark data');
      }
    } catch (error) {
      console.error('❌ Error loading branch benchmarks:', error);
      this._branchBenchmarks.set(this.generateMockBranchBenchmarks());
    }
  }

  async loadCapacityPredictions(): Promise<void> {
    try {
      console.log('🔮 Loading capacity predictions...');
      
      const response = await this.http.get<ApiResponse<BranchCapacityPrediction[]>>(
        `${this.baseUrl}/capacity-predictions`
      ).toPromise();

      if (response?.success && response.data) {
        this._capacityPredictions.set(response.data);
        console.log('✅ Capacity predictions loaded');
      } else {
        this._capacityPredictions.set(this.generateMockCapacityPredictions());
        console.log('📝 Using mock capacity prediction data');
      }
    } catch (error) {
      console.error('❌ Error loading capacity predictions:', error);
      this._capacityPredictions.set(this.generateMockCapacityPredictions());
    }
  }

  // ===== ANALYTICS COMPUTATION METHODS =====

  private calculateBranchHealthScore(branch: BranchPerformanceData): number {
    const weights = {
      performance: 0.25,
      profitMargin: 0.20,
      efficiency: 0.20,
      wasteReduction: 0.15,
      customerSatisfaction: 0.10,
      growth: 0.10
    };

    const wasteReductionScore = Math.max(0, 100 - branch.wastePercentage * 10);
    
    const healthScore = 
      branch.performanceScore * weights.performance +
      Math.min(100, branch.profitMargin * 2) * weights.profitMargin +
      branch.efficiency * weights.efficiency +
      wasteReductionScore * weights.wasteReduction +
      branch.customerSatisfaction * weights.customerSatisfaction +
      Math.min(100, Math.max(0, branch.growthRate * 10 + 50)) * weights.growth;

    return Math.round(healthScore);
  }

  private getBranchHealthStatus(branch: BranchPerformanceData): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const healthScore = this.calculateBranchHealthScore(branch);
    
    if (healthScore >= 90) return 'excellent';
    if (healthScore >= 80) return 'good';
    if (healthScore >= 70) return 'fair';
    if (healthScore >= 60) return 'poor';
    return 'critical';
  }

  private getUtilizationStatus(utilization: number): 'optimal' | 'over_capacity' | 'under_capacity' | 'critical' {
    if (utilization >= 95) return 'critical';
    if (utilization >= 85) return 'over_capacity';
    if (utilization >= 65 && utilization <= 84) return 'optimal';
    return 'under_capacity';
  }

  // ===== EVENT HANDLERS =====

  private handleCriticalAlerts(alerts: BranchAlert[]): void {
    console.log(`🚨 CRITICAL: ${alerts.length} branch alerts require immediate attention`);
    
    alerts.forEach(alert => {
      console.log(`⚠️ CRITICAL ALERT: ${alert.title} - ${alert.description}`);
    });
  }

  private handleUnderperformingBranches(branches: BranchPerformanceData[]): void {
    console.log(`📉 PERFORMANCE WARNING: ${branches.length} branches underperforming`);
    
    branches.forEach(branch => {
      console.log(`📉 ${branch.branchName}: Score ${branch.performanceScore}/100 - Areas for improvement: ${branch.improvementAreas.join(', ')}`);
    });
  }

  // ===== PUBLIC API METHODS =====

  refreshAllAnalytics(): void {
    console.log('🔄 Refreshing all branch analytics...');
    this.loadAnalyticsOverview();
    this.loadBranchPerformances();
    this.loadBranchComparisons();
    this.loadBranchEfficiencies();
    this.loadBranchTrends();
    this.loadBranchAlerts();
    this.loadBranchBenchmarks();
    this.loadCapacityPredictions();
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const response = await this.http.patch(`${this.baseUrl}/alerts/${alertId}/resolve`, {}).toPromise();
      
      // Update local state
      this._branchAlerts.update(branchAlerts => 
        branchAlerts.map(branch => ({
          ...branch,
          alerts: branch.alerts.map(alert => 
            alert.id === alertId ? { ...alert, resolved: true } : alert
          )
        }))
      );
      
      return true;
    } catch (error) {
      console.error('❌ Error resolving alert:', error);
      return false;
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  // ===== MOCK DATA GENERATORS =====

  private generateMockAnalyticsOverview(): BranchAnalyticsOverview {
    return {
      totalBranches: 4,
      activeBranches: 4,
      totalRevenue: 4250000000,
      totalTransactions: 12845,
      averagePerformanceScore: 82.5,
      topPerformingBranch: {
        branchId: 3,
        branchCode: 'BR003',
        branchName: 'Cabang Tangerang Selatan',
        branchType: 'Branch',
        performanceScore: 92,
        revenue: 1250000000,
        transactions: 3456,
        profitMargin: 18.5,
        stockTurnover: 8.2,
        wasteValue: 450000,
        wastePercentage: 0.8,
        customerSatisfaction: 4.7,
        efficiency: 89,
        utilizationRate: 0.78,
        growthRate: 12.3,
        rank: 1,
        trend: 'up',
        strongPoints: ['High customer satisfaction', 'Low waste percentage', 'Excellent location'],
        improvementAreas: []
      },
      worstPerformingBranch: {
        branchId: 4,
        branchCode: 'BR004',
        branchName: 'Cabang Depok Margonda',
        branchType: 'SubBranch',
        performanceScore: 68,
        revenue: 850000000,
        transactions: 2234,
        profitMargin: 12.2,
        stockTurnover: 5.8,
        wasteValue: 1200000,
        wastePercentage: 2.8,
        customerSatisfaction: 4.1,
        efficiency: 72,
        utilizationRate: 0.89,
        growthRate: -2.1,
        rank: 4,
        trend: 'down',
        strongPoints: ['Good location', 'High foot traffic'],
        improvementAreas: ['Reduce waste', 'Improve efficiency', 'Staff training needed']
      },
      totalStockValue: 354700000,
      totalWasteValue: 4390000,
      wastePercentage: 1.24,
      lastUpdated: new Date().toISOString()
    };
  }

  private generateMockBranchPerformances(): BranchPerformanceData[] {
    return [
      {
        branchId: 1,
        branchCode: 'HQ001',
        branchName: 'Cabang Utama Jakarta',
        branchType: 'Head',
        performanceScore: 88,
        revenue: 1450000000,
        transactions: 4123,
        profitMargin: 16.8,
        stockTurnover: 7.5,
        wasteValue: 890000,
        wastePercentage: 1.2,
        customerSatisfaction: 4.5,
        efficiency: 85,
        utilizationRate: 0.78,
        growthRate: 8.7,
        rank: 2,
        trend: 'up',
        strongPoints: ['Strong brand presence', 'High transaction volume', 'Good profit margins'],
        improvementAreas: ['Reduce waste further', 'Optimize space utilization']
      },
      {
        branchId: 2,
        branchCode: 'BR002',
        branchName: 'Cabang Bekasi Timur',
        branchType: 'Branch',
        performanceScore: 79,
        revenue: 1100000000,
        transactions: 3032,
        profitMargin: 15.2,
        stockTurnover: 6.8,
        wasteValue: 1250000,
        wastePercentage: 1.8,
        customerSatisfaction: 4.3,
        efficiency: 78,
        utilizationRate: 0.89,
        growthRate: 5.4,
        rank: 3,
        trend: 'stable',
        strongPoints: ['Steady growth', 'Good customer base'],
        improvementAreas: ['Improve efficiency', 'Better inventory management', 'Reduce waste']
      }
    ];
  }

  private generateMockBranchComparisons(): BranchComparisonMetrics[] {
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        metrics: {
          revenue: 1450000000,
          revenueRank: 2,
          transactions: 4123,
          transactionsRank: 1,
          profitMargin: 16.8,
          profitMarginRank: 2,
          efficiency: 85,
          efficiencyRank: 2,
          wasteReduction: 98.8,
          wasteReductionRank: 3,
          overallRank: 2
        }
      }
    ];
  }

  private generateMockBranchEfficiencies(): BranchEfficiencyMetrics[] {
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        staffProductivity: 85.2,
        inventoryTurnover: 7.5,
        spaceUtilization: 78.0,
        energyEfficiency: 82.5,
        operationalCosts: 45000000,
        profitPerSqm: 2850000,
        customerThroughput: 152.3,
        averageTransactionValue: 351500,
        overallEfficiency: 85
      }
    ];
  }

  private generateMockBranchTrends(): BranchTrendAnalysis[] {
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        trends: {
          revenue: { current: 1450000000, previous: 1340000000, changePercent: 8.2, trend: 'increasing', direction: 'up', confidence: 0.85 },
          transactions: { current: 4123, previous: 3856, changePercent: 6.9, trend: 'increasing', direction: 'up', confidence: 0.78 },
          profitMargin: { current: 16.8, previous: 16.2, changePercent: 3.7, trend: 'increasing', direction: 'up', confidence: 0.72 },
          wastePercentage: { current: 1.2, previous: 1.8, changePercent: -33.3, trend: 'decreasing', direction: 'down', confidence: 0.89 },
          customerSatisfaction: { current: 4.5, previous: 4.3, changePercent: 4.7, trend: 'increasing', direction: 'up', confidence: 0.65 }
        },
        predictions: {
          nextMonthRevenue: 1520000000,
          nextMonthTransactions: 4350,
          riskFactors: ['Seasonal demand fluctuation', 'Increased competition'],
          opportunities: ['New product categories', 'Extended operating hours', 'Digital payment adoption']
        }
      }
    ];
  }

  private generateMockBranchAlerts(): BranchAlertData[] {
    return [
      {
        branchId: 2,
        branchName: 'Cabang Bekasi Timur',
        alerts: [
          {
            id: 'alert-001',
            type: 'performance',
            severity: 'high',
            title: 'Declining Efficiency',
            description: 'Branch efficiency has dropped 8% over the last month',
            metric: 'efficiency',
            currentValue: 78,
            expectedValue: 85,
            variance: -8.2,
            recommendation: 'Review staff scheduling and workflow processes',
            createdAt: new Date().toISOString(),
            resolved: false
          }
        ],
        totalCriticalAlerts: 0,
        totalWarnings: 1,
        alertScore: 15
      }
    ];
  }

  private generateMockBranchBenchmarks(): BranchBenchmarkData[] {
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        benchmarks: {
          vsIndustryAverage: {
            revenue: { current: 1450000000, benchmark: 1200000000, variance: 20.8, percentile: 75, status: 'above' },
            profitMargin: { current: 16.8, benchmark: 14.5, variance: 15.9, percentile: 70, status: 'above' },
            efficiency: { current: 85, benchmark: 78, variance: 9.0, percentile: 68, status: 'above' },
            customerSatisfaction: { current: 4.5, benchmark: 4.2, variance: 7.1, percentile: 65, status: 'above' },
            overallPerformance: { current: 88, benchmark: 75, variance: 17.3, percentile: 72, status: 'above' }
          },
          vsTopPerformer: {
            revenue: { current: 1450000000, benchmark: 1550000000, variance: -6.5, percentile: 88, status: 'below' },
            profitMargin: { current: 16.8, benchmark: 18.5, variance: -9.2, percentile: 82, status: 'below' },
            efficiency: { current: 85, benchmark: 92, variance: -7.6, percentile: 85, status: 'below' },
            customerSatisfaction: { current: 4.5, benchmark: 4.7, variance: -4.3, percentile: 89, status: 'below' },
            overallPerformance: { current: 88, benchmark: 92, variance: -4.3, percentile: 86, status: 'below' }
          },
          vsCompanyAverage: {
            revenue: { current: 1450000000, benchmark: 1162500000, variance: 24.7, percentile: 100, status: 'above' },
            profitMargin: { current: 16.8, benchmark: 15.8, variance: 6.3, percentile: 75, status: 'above' },
            efficiency: { current: 85, benchmark: 81, variance: 4.9, percentile: 75, status: 'above' },
            customerSatisfaction: { current: 4.5, benchmark: 4.4, variance: 2.3, percentile: 75, status: 'above' },
            overallPerformance: { current: 88, benchmark: 82.5, variance: 6.7, percentile: 75, status: 'above' }
          }
        }
      }
    ];
  }

  private generateMockCapacityPredictions(): BranchCapacityPrediction[] {
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        currentCapacity: 78,
        projectedCapacity: 82,
        utilizationForecast: [
          { date: '2024-09-01', predictedUtilization: 79, confidence: 0.85, factors: ['Back-to-school season', 'New product launches'] },
          { date: '2024-10-01', predictedUtilization: 84, confidence: 0.78, factors: ['Holiday preparation', 'Increased demand'] }
        ],
        recommendations: [
          {
            type: 'optimize',
            description: 'Optimize current layout to increase capacity by 10%',
            impact: 10,
            cost: 25000000,
            timeframe: '2-3 weeks',
            priority: 'medium'
          }
        ],
        constraintAnalysis: [
          {
            type: 'physical',
            description: 'Limited floor space for expansion',
            impact: 'limiting',
            mitigation: 'Implement vertical storage solutions'
          }
        ]
      }
    ];
  }
}