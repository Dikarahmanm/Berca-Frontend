import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MultiBranchCoordinationService, BranchPerformance } from '../../../core/services/multi-branch-coordination.service';
import { StateService } from '../../../core/services/state.service';
import { Branch } from '../../../core/models/branch.models';
import { Subscription, interval } from 'rxjs';

// Analytics Interfaces
export interface NetworkAnalytics {
  totalRevenue: number;
  revenueGrowth: number;
  totalTransactions: number;
  transactionGrowth: number;
  avgOrderValue: number;
  orderValueGrowth: number;
  customerSatisfaction: number;
  satisfactionGrowth: number;
  operationalEfficiency: number;
  efficiencyGrowth: number;
  inventoryTurnover: number;
  turnoverGrowth: number;
}

export interface TrendAnalysis {
  period: string;
  revenue: number[];
  transactions: number[];
  customers: number[];
  efficiency: number[];
  satisfaction: number[];
  labels: string[];
}

export interface RegionalComparison {
  region: string;
  branches: number;
  revenue: number;
  revenuePerBranch: number;
  growth: number;
  marketShare: number;
  performance: number;
  topBranch: string;
  challenges: string[];
}

export interface ForecastData {
  metric: string;
  currentValue: number;
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
  };
  confidence: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  factors: string[];
}

export interface ExecutiveSummary {
  period: string;
  keyMetrics: {
    totalRevenue: number;
    revenueGrowth: number;
    networkEfficiency: number;
    customerSatisfaction: number;
  };
  achievements: string[];
  challenges: string[];
  recommendations: string[];
  nextActions: string[];
}

export interface CompetitiveAnalysis {
  marketPosition: number;
  marketShare: number;
  competitorComparison: {
    name: string;
    marketShare: number;
    strength: string;
    weakness: string;
  }[];
  opportunities: string[];
  threats: string[];
}

@Component({
  selector: 'app-multi-branch-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-branch-analytics.component.html',
  styleUrls: ['./multi-branch-analytics.component.scss']
})
export class MultiBranchAnalyticsComponent implements OnInit, OnDestroy {
  // Service dependencies
  branchPerformances = computed(() => this.coordinationService.branchPerformances());
  availableBranches = computed(() => this.stateService.availableBranches());
  currentUser = computed(() => this.stateService.user());

  // Component state signals
  private readonly _isLoading = signal<boolean>(false);
  private readonly _selectedPeriod = signal<'1M' | '3M' | '6M' | '1Y'>('3M');
  private readonly _selectedView = signal<'overview' | 'trends' | 'regional' | 'forecast' | 'executive'>('overview');
  private readonly _selectedRegion = signal<string>('all');
  private readonly _networkAnalytics = signal<NetworkAnalytics | null>(null);
  private readonly _trendAnalysis = signal<TrendAnalysis | null>(null);
  private readonly _regionalData = signal<RegionalComparison[]>([]);
  private readonly _forecastData = signal<ForecastData[]>([]);
  private readonly _executiveSummary = signal<ExecutiveSummary | null>(null);
  private readonly _competitiveAnalysis = signal<CompetitiveAnalysis | null>(null);

  // Component state getters
  isLoading = this._isLoading.asReadonly();
  selectedPeriod = this._selectedPeriod.asReadonly();
  selectedView = this._selectedView.asReadonly();
  selectedRegion = this._selectedRegion.asReadonly();
  networkAnalytics = this._networkAnalytics.asReadonly();
  trendAnalysis = this._trendAnalysis.asReadonly();
  regionalData = this._regionalData.asReadonly();
  forecastData = this._forecastData.asReadonly();
  executiveSummary = this._executiveSummary.asReadonly();
  competitiveAnalysis = this._competitiveAnalysis.asReadonly();

  // Computed analytics
  filteredRegionalData = computed(() => {
    const data = this._regionalData();
    const region = this._selectedRegion();
    
    if (region === 'all') return data;
    return data.filter(d => d.region === region);
  });

  totalBranches = computed(() => this.availableBranches().length);

  averageMetrics = computed(() => {
    const analytics = this._networkAnalytics();
    const branches = this.totalBranches();
    
    if (!analytics || branches === 0) return null;

    return {
      revenuePerBranch: analytics.totalRevenue / branches,
      transactionsPerBranch: analytics.totalTransactions / branches,
      avgEfficiency: analytics.operationalEfficiency,
      avgSatisfaction: analytics.customerSatisfaction
    };
  });

  topPerformingRegions = computed(() => {
    return this._regionalData()
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 3);
  });

  keyInsights = computed(() => {
    const analytics = this._networkAnalytics();
    const trends = this._trendAnalysis();
    
    if (!analytics || !trends) return [];

    const insights = [];

    if (analytics.revenueGrowth > 10) {
      insights.push({
        type: 'positive',
        title: 'Strong Revenue Growth',
        description: `Revenue has grown by ${analytics.revenueGrowth.toFixed(1)}% this period`,
        impact: 'high'
      });
    }

    if (analytics.operationalEfficiency > 85) {
      insights.push({
        type: 'positive',
        title: 'Excellent Operational Efficiency',
        description: `Network efficiency is at ${analytics.operationalEfficiency.toFixed(1)}%`,
        impact: 'medium'
      });
    }

    if (analytics.customerSatisfaction < 80) {
      insights.push({
        type: 'warning',
        title: 'Customer Satisfaction Needs Attention',
        description: `Satisfaction score is ${analytics.customerSatisfaction.toFixed(1)}%, below target`,
        impact: 'high'
      });
    }

    if (analytics.inventoryTurnover < 6) {
      insights.push({
        type: 'warning',
        title: 'Low Inventory Turnover',
        description: `Turnover rate is ${analytics.inventoryTurnover.toFixed(1)}x, consider optimization`,
        impact: 'medium'
      });
    }

    return insights;
  });

  // Auto-refresh and subscriptions
  private refreshInterval?: Subscription;
  private subscriptions = new Subscription();

  constructor(
    private coordinationService: MultiBranchCoordinationService,
    private stateService: StateService,
    private router: Router
  ) {
    // Auto-refresh effect when period or view changes
    effect(() => {
      const period = this._selectedPeriod();
      const view = this._selectedView();
      this.loadAnalyticsData();
    });
  }

  ngOnInit() {
    this.loadAnalyticsData();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
    this.subscriptions.unsubscribe();
  }

  // Data loading methods
  private loadAnalyticsData() {
    this._isLoading.set(true);
    
    Promise.all([
      this.loadNetworkAnalytics(),
      this.loadTrendAnalysis(),
      this.loadRegionalData(),
      this.loadForecastData(),
      this.loadExecutiveSummary(),
      this.loadCompetitiveAnalysis()
    ]).finally(() => {
      this._isLoading.set(false);
    });
  }

  private async loadNetworkAnalytics() {
    // Mock network analytics data
    setTimeout(() => {
      const mockAnalytics: NetworkAnalytics = {
        totalRevenue: 12500000000, // IDR
        revenueGrowth: 15.3,
        totalTransactions: 45670,
        transactionGrowth: 12.8,
        avgOrderValue: 273500,
        orderValueGrowth: 2.1,
        customerSatisfaction: 87.2,
        satisfactionGrowth: 3.4,
        operationalEfficiency: 82.5,
        efficiencyGrowth: 5.7,
        inventoryTurnover: 8.3,
        turnoverGrowth: -2.1
      };
      
      this._networkAnalytics.set(mockAnalytics);
    }, 600);
  }

  private async loadTrendAnalysis() {
    // Mock trend analysis data
    setTimeout(() => {
      const period = this._selectedPeriod();
      const dataPoints = period === '1M' ? 30 : period === '3M' ? 12 : period === '6M' ? 24 : 12;
      
      const mockTrends: TrendAnalysis = {
        period: period,
        revenue: Array.from({ length: dataPoints }, (_, i) => 800000000 + (Math.sin(i * 0.5) + 1) * 200000000 + i * 50000000),
        transactions: Array.from({ length: dataPoints }, (_, i) => 3000 + Math.floor(Math.random() * 1000) + i * 50),
        customers: Array.from({ length: dataPoints }, (_, i) => 15000 + Math.floor(Math.random() * 2000) + i * 100),
        efficiency: Array.from({ length: dataPoints }, (_, i) => 75 + Math.random() * 15 + Math.sin(i * 0.3) * 5),
        satisfaction: Array.from({ length: dataPoints }, (_, i) => 80 + Math.random() * 10 + Math.sin(i * 0.4) * 3),
        labels: Array.from({ length: dataPoints }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (dataPoints - i));
          return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        })
      };
      
      this._trendAnalysis.set(mockTrends);
    }, 700);
  }

  private async loadRegionalData() {
    // Mock regional comparison data
    setTimeout(() => {
      const mockRegional: RegionalComparison[] = [
        {
          region: 'Jawa Timur',
          branches: 8,
          revenue: 4200000000,
          revenuePerBranch: 525000000,
          growth: 18.2,
          marketShare: 35.2,
          performance: 89.5,
          topBranch: 'Surabaya Central',
          challenges: ['Traffic congestion', 'High competition']
        },
        {
          region: 'Jawa Tengah',
          branches: 6,
          revenue: 3100000000,
          revenuePerBranch: 516666667,
          growth: 12.8,
          marketShare: 28.1,
          performance: 85.3,
          topBranch: 'Semarang Plaza',
          challenges: ['Supply chain delays', 'Staff retention']
        },
        {
          region: 'Jawa Barat',
          branches: 5,
          revenue: 3800000000,
          revenuePerBranch: 760000000,
          growth: 22.1,
          marketShare: 31.7,
          performance: 92.1,
          topBranch: 'Bandung Premium',
          challenges: ['High rental costs', 'Parking limitations']
        },
        {
          region: 'Jakarta',
          branches: 3,
          revenue: 2900000000,
          revenuePerBranch: 966666667,
          growth: 8.9,
          marketShare: 15.8,
          performance: 88.7,
          topBranch: 'Jakarta CBD',
          challenges: ['Premium pricing pressure', 'Market saturation']
        }
      ];
      
      this._regionalData.set(mockRegional);
    }, 800);
  }

  private async loadForecastData() {
    // Mock forecast data
    setTimeout(() => {
      const mockForecast: ForecastData[] = [
        {
          metric: 'Revenue',
          currentValue: 12500000000,
          forecast: {
            nextMonth: 13200000000,
            nextQuarter: 14800000000,
            nextYear: 18900000000
          },
          confidence: 87.5,
          trend: 'increasing',
          factors: ['Market expansion', 'New product launches', 'Seasonal trends']
        },
        {
          metric: 'Customer Satisfaction',
          currentValue: 87.2,
          forecast: {
            nextMonth: 88.1,
            nextQuarter: 89.5,
            nextYear: 91.2
          },
          confidence: 82.3,
          trend: 'increasing',
          factors: ['Service improvements', 'Staff training', 'Technology upgrades']
        },
        {
          metric: 'Operational Efficiency',
          currentValue: 82.5,
          forecast: {
            nextMonth: 83.2,
            nextQuarter: 85.1,
            nextYear: 88.7
          },
          confidence: 79.8,
          trend: 'increasing',
          factors: ['Process optimization', 'Automation', 'Supply chain efficiency']
        },
        {
          metric: 'Market Share',
          currentValue: 27.8,
          forecast: {
            nextMonth: 28.1,
            nextQuarter: 29.3,
            nextYear: 32.1
          },
          confidence: 74.2,
          trend: 'increasing',
          factors: ['Competitor analysis', 'Marketing campaigns', 'Geographic expansion']
        }
      ];
      
      this._forecastData.set(mockForecast);
    }, 900);
  }

  private async loadExecutiveSummary() {
    // Mock executive summary
    setTimeout(() => {
      const period = this._selectedPeriod();
      const periodText = period === '1M' ? 'Month' : period === '3M' ? 'Quarter' : period === '6M' ? 'Half-Year' : 'Year';
      
      const mockSummary: ExecutiveSummary = {
        period: `Last ${periodText}`,
        keyMetrics: {
          totalRevenue: 12500000000,
          revenueGrowth: 15.3,
          networkEfficiency: 82.5,
          customerSatisfaction: 87.2
        },
        achievements: [
          'Exceeded revenue targets by 15.3%',
          'Successfully opened 2 new branches',
          'Improved customer satisfaction by 3.4 points',
          'Reduced operational costs by 8.2%',
          'Launched successful digital transformation initiative'
        ],
        challenges: [
          'Supply chain disruptions affecting 3 branches',
          'Staff turnover rate increased to 12.5%',
          'Competition intensified in Jakarta region',
          'Rising operational costs in premium locations'
        ],
        recommendations: [
          'Invest in supply chain resilience and backup suppliers',
          'Implement comprehensive staff retention program',
          'Expand digital services to compete with online retailers',
          'Optimize inventory management across all branches',
          'Focus on customer experience differentiation'
        ],
        nextActions: [
          'Deploy new POS system to remaining 5 branches',
          'Launch employee satisfaction survey',
          'Negotiate long-term supplier contracts',
          'Pilot loyalty program in top 3 performing branches'
        ]
      };
      
      this._executiveSummary.set(mockSummary);
    }, 1000);
  }

  private async loadCompetitiveAnalysis() {
    // Mock competitive analysis
    setTimeout(() => {
      const mockCompetitive: CompetitiveAnalysis = {
        marketPosition: 2,
        marketShare: 27.8,
        competitorComparison: [
          {
            name: 'Competitor A',
            marketShare: 31.2,
            strength: 'Strong online presence',
            weakness: 'Limited physical locations'
          },
          {
            name: 'Competitor B',
            marketShare: 18.9,
            strength: 'Competitive pricing',
            weakness: 'Poor customer service'
          },
          {
            name: 'Competitor C',
            marketShare: 12.3,
            strength: 'Premium brand image',
            weakness: 'High price points'
          }
        ],
        opportunities: [
          'Growing e-commerce market',
          'Underserved rural markets',
          'Corporate partnership opportunities',
          'Sustainability-focused consumers'
        ],
        threats: [
          'Economic uncertainty',
          'New international competitors',
          'Changing consumer behavior',
          'Regulatory changes'
        ]
      };
      
      this._competitiveAnalysis.set(mockCompetitive);
    }, 1100);
  }

  private startAutoRefresh() {
    // Refresh every 5 minutes for analytics
    this.refreshInterval = interval(300000).subscribe(() => {
      this.loadAnalyticsData();
    });
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  // Action methods
  setPeriod(period: '1M' | '3M' | '6M' | '1Y') {
    this._selectedPeriod.set(period);
  }

  setView(view: 'overview' | 'trends' | 'regional' | 'forecast' | 'executive') {
    this._selectedView.set(view);
  }

  setRegion(region: string) {
    this._selectedRegion.set(region);
  }

  refreshData() {
    this.loadAnalyticsData();
  }

  // Export methods
  exportReport() {
    const reportData = {
      period: this._selectedPeriod(),
      analytics: this._networkAnalytics(),
      trends: this._trendAnalysis(),
      regional: this._regionalData(),
      forecast: this._forecastData(),
      executive: this._executiveSummary(),
      competitive: this._competitiveAnalysis(),
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-branch-analytics-${this._selectedPeriod()}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportExecutiveSummary() {
    const summary = this._executiveSummary();
    if (!summary) return;

    const csvContent = this.convertExecutiveSummaryToCSV(summary);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-summary-${this._selectedPeriod()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Utility methods
  private convertExecutiveSummaryToCSV(summary: ExecutiveSummary): string {
    const lines = [
      'Multi-Branch Network - Executive Summary',
      `Period: ${summary.period}`,
      '',
      'Key Metrics',
      `Total Revenue,${summary.keyMetrics.totalRevenue}`,
      `Revenue Growth,${summary.keyMetrics.revenueGrowth}%`,
      `Network Efficiency,${summary.keyMetrics.networkEfficiency}%`,
      `Customer Satisfaction,${summary.keyMetrics.customerSatisfaction}%`,
      '',
      'Achievements',
      ...summary.achievements.map(achievement => `"${achievement}"`),
      '',
      'Challenges',
      ...summary.challenges.map(challenge => `"${challenge}"`),
      '',
      'Recommendations',
      ...summary.recommendations.map(recommendation => `"${recommendation}"`),
      '',
      'Next Actions',
      ...summary.nextActions.map(action => `"${action}"`)
    ];

    return lines.join('\n');
  }

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

  getGrowthClass(growth: number): string {
    if (growth > 10) return 'growth-excellent';
    if (growth > 5) return 'growth-good';
    if (growth > 0) return 'growth-positive';
    if (growth > -5) return 'growth-neutral';
    return 'growth-negative';
  }

  getGrowthIcon(growth: number): string {
    if (growth > 0) return 'icon-trending-up';
    if (growth < 0) return 'icon-trending-down';
    return 'icon-minus';
  }

  getTrendIcon(trend: string): string {
    const trendMap: Record<string, string> = {
      increasing: 'icon-trending-up',
      stable: 'icon-minus',
      decreasing: 'icon-trending-down'
    };
    return trendMap[trend] || 'icon-help-circle';
  }

  getTrendClass(trend: string): string {
    const trendMap: Record<string, string> = {
      increasing: 'trend-positive',
      stable: 'trend-neutral',
      decreasing: 'trend-negative'
    };
    return trendMap[trend] || 'trend-unknown';
  }

  getInsightClass(type: string): string {
    const typeMap: Record<string, string> = {
      positive: 'insight-positive',
      warning: 'insight-warning',
      negative: 'insight-negative'
    };
    return typeMap[type] || 'insight-neutral';
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 90) return 'confidence-high';
    if (confidence >= 75) return 'confidence-medium';
    if (confidence >= 60) return 'confidence-low';
    return 'confidence-very-low';
  }

  // Navigation methods
  navigateToBranchDetails(branchName: string) {
    // Navigate to specific branch details
    this.router.navigate(['/branches'], { queryParams: { search: branchName } });
  }

  navigateToCoordination() {
    this.router.navigate(['/coordination']);
  }
}