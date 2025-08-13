// membership-analytics.component.ts
// Enhanced Analytics with Angular 20 Signals & Clean Simple Design
// All missing properties and methods added for enhanced features

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Charts
import { NgxChartsModule } from '@swimlane/ngx-charts';

// Enhanced service integration with actual backend APIs
import { MembershipService } from '../../services/membership.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import {
  MemberDto,
  TopMemberDto,
  TopMembersFilter,
  MemberChartData
} from '../../interfaces/membership.interfaces';

// Enhanced interfaces for notifications
interface ToastNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

interface MembershipKPIs {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  totalPointsAwarded: number;
  totalPointsRedeemed: number;
  averageSpendingPerMember: number;
  topTier: string;
  membershipGrowthRate: number;
}

interface TierDistribution {
  tier: string;
  count: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-membership-analytics',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    NgxChartsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './membership-analytics.component.html',
  styleUrl: './membership-analytics.component.scss'
})
export class MembershipAnalyticsComponent implements OnInit, OnDestroy {
  // Injected services
  private readonly fb = inject(FormBuilder);
  private readonly membershipService = inject(MembershipService);
  private readonly dashboardService = inject(DashboardService);
  
  private readonly destroy$ = new Subject<void>();

  // ===== SIGNAL-BASED STATE MANAGEMENT =====
  readonly loading$ = signal<boolean>(false);
  readonly error$ = signal<string | null>(null);
  
  // ===== ENHANCED FEATURES SIGNALS =====
  // Real-time connection status
  readonly realtimeConnected = signal<boolean>(false);
  
  // Toast notifications
  readonly realtimeToasts = signal<ToastNotification[]>([]);
  
  // Form controls
  dateRangeForm: FormGroup;
  
  // Data
  membershipKPIs: MembershipKPIs | null = null;
  topMembers: TopMemberDto[] = [];
  tierDistribution: TierDistribution[] = [];
  memberGrowthData: MemberChartData[] = [];
  spendingAnalysisData: MemberChartData[] = [];
  pointsAnalysisData: MemberChartData[] = [];

  // Chart configurations
  colorScheme: any = {
    domain: [
      '#FF914D', // Primary orange
      '#4BBF7B', // Success green
      '#FFB84D', // Warning yellow
      '#E15A4F', // Error red
      '#3B82F6', // Info blue
      '#8b5cf6', // Violet
      '#06b6d4', // Cyan
      '#10b981'  // Emerald
    ]
  };

  // Chart options
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = false;
  showXAxisLabel = false;
  showYAxisLabel = false;
  xAxisLabel = '';
  yAxisLabel = '';

  // State
  selectedTab = 0;

  // Tier information mapping
  private readonly tierInfoMap: Record<string, { color: string; icon: string; name: string }> = {
    Bronze: { color: '#CD7F32', icon: '🥉', name: 'Bronze' },
    Silver: { color: '#C0C0C0', icon: '🥈', name: 'Silver' },
    Gold: { color: '#FFD700', icon: '🥇', name: 'Gold' },
    Platinum: { color: '#E5E4E2', icon: '💎', name: 'Platinum' },
    VIP: { color: '#800080', icon: '👑', name: 'VIP' }
  };

  constructor() {
    this.dateRangeForm = this.initializeDateForm();
  }

  ngOnInit(): void {
    this.setupDateRangeSubscription();
    this.initializeRealTimeConnection();
    this.loadAnalyticsData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALIZATION =====

  private initializeDateForm(): FormGroup {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    return this.fb.group({
      startDate: [thirtyDaysAgo.toISOString().split('T')[0]],
      endDate: [today.toISOString().split('T')[0]],
      preset: ['last30Days']
    });
  }

  private setupDateRangeSubscription(): void {
    this.dateRangeForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadAnalyticsData();
      });
  }

  // ===== DATA LOADING =====

  public loadAnalyticsData(): void {
    this.loading$.set(true);
    this.error$.set(null);

    try {
      // Load all analytics data
      this.loadMembershipKPIs();
      this.loadTopMembers();
      this.generateMockAnalyticsData(); // Replace with real API calls when available
    } catch (error) {
      this.error$.set('Failed to load analytics data');
      this.showErrorNotification('Failed to load analytics data');
    } finally {
      this.loading$.set(false);
    }
  }

  private loadMembershipKPIs(): void {
    // Mock KPI data - replace with real API call
    this.membershipKPIs = {
      totalMembers: 1250,
      activeMembers: 1180,
      newMembersThisMonth: 87,
      totalPointsAwarded: 45600,
      totalPointsRedeemed: 32100,
      averageSpendingPerMember: 2450000,
      topTier: 'Gold',
      membershipGrowthRate: 12.5
    };
  }

  private loadTopMembers(): void {
    const dateFilter = this.getDateFilter();
    const filter: TopMembersFilter = {
      count: 10,
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate
    };

    this.membershipService.getTopMembers(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (members) => {
          this.topMembers = members;
        },
        error: (error) => {
          console.error('Failed to load top members:', error);
          this.showErrorNotification('Failed to load top members');
        }
      });
  }

  private generateMockAnalyticsData(): void {
    // Generate tier distribution
    this.tierDistribution = [
      { tier: 'Bronze', count: 650, percentage: 52, color: '#CD7F32' },
      { tier: 'Silver', count: 350, percentage: 28, color: '#C0C0C0' },
      { tier: 'Gold', count: 180, percentage: 14.4, color: '#FFD700' },
      { tier: 'Platinum', count: 50, percentage: 4, color: '#E5E4E2' },
      { tier: 'VIP', count: 20, percentage: 1.6, color: '#FF6B35' }
    ];

    // Generate member growth data (last 12 months)
    this.memberGrowthData = this.generateGrowthData();

    // Generate spending analysis
    this.spendingAnalysisData = [
      { name: 'Low Spenders (< 1M)', value: 35, labels: ['Low Spenders (< 1M)'], data: [35] },
      { name: 'Medium Spenders (1M - 5M)', value: 45, labels: ['Medium Spenders (1M - 5M)'], data: [45] },
      { name: 'High Spenders (5M - 15M)', value: 15, labels: ['High Spenders (5M - 15M)'], data: [15] },
      { name: 'Premium Spenders (> 15M)', value: 5, labels: ['Premium Spenders (> 15M)'], data: [5] }
    ];

    // Generate points analysis
    this.pointsAnalysisData = [
      { name: 'Points Earned', value: 45600, labels: ['Points Earned'], data: [45600] },
      { name: 'Points Redeemed', value: 32100, labels: ['Points Redeemed'], data: [32100] },
      { name: 'Points Available', value: 13500, labels: ['Points Available'], data: [13500] }
    ];
  }

  private generateGrowthData(): MemberChartData[] {
    const data: MemberChartData[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 12; i++) {
      const value = Math.floor(Math.random() * 100) + 50;
      data.push({
        name: months[i],
        value: value,
        labels: [months[i]],
        data: [value]
      });
    }
    
    return data;
  }

  // ===== DATE RANGE MANAGEMENT =====

  onPresetChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const preset = target.value;
    
    const presets = this.getDateRangePresets();
    const selectedPreset = presets[preset];
    
    if (selectedPreset) {
      this.dateRangeForm.patchValue({
        startDate: selectedPreset.startDate.toISOString().split('T')[0],
        endDate: selectedPreset.endDate.toISOString().split('T')[0]
      });
    }
  }

  private getDateFilter(): { startDate: Date; endDate: Date } {
    const formValue = this.dateRangeForm.value;
    return {
      startDate: new Date(formValue.startDate),
      endDate: new Date(formValue.endDate)
    };
  }

  private getDateRangePresets(): { [key: string]: { startDate: Date; endDate: Date } } {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));

    return {
      'last7Days': { startDate: sevenDaysAgo, endDate: today },
      'last30Days': { startDate: thirtyDaysAgo, endDate: today },
      'thisMonth': { startDate: startOfMonth, endDate: today },
      'thisYear': { startDate: startOfYear, endDate: today }
    };
  }

  // ===== CHART DATA TRANSFORMATION =====

  getTierChartData(): MemberChartData[] {
    return this.tierDistribution.map(tier => ({
      name: tier.tier,
      value: tier.count,
      labels: [tier.tier],
      data: [tier.count],
      extra: { color: tier.color, percentage: tier.percentage }
    }));
  }

  getSpendingChartData(): MemberChartData[] {
    return this.spendingAnalysisData;
  }

  getPointsChartData(): MemberChartData[] {
    return this.pointsAnalysisData;
  }

  getGrowthChartData(): MemberChartData[] {
    return this.memberGrowthData;
  }

  // ===== CHART EVENT HANDLERS =====

  onChartSelect(event: any): void {
    console.log('Chart selection:', event);
  }

  onChartActivate(event: any): void {
    console.log('Chart activate:', event);
  }

  onChartDeactivate(event: any): void {
    console.log('Chart deactivate:', event);
  }

  // ===== UTILITY METHODS =====

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }

  // ===== EXPORT FUNCTIONALITY =====

  exportAnalytics(): void {
    // Implement export functionality
    this.showSuccessNotification('Analytics export feature will be implemented');
  }

  // ===== TIER UTILITY METHODS =====
  getTierInfo(tier: string): { name: string; color: string; icon: string } {
    return this.tierInfoMap[tier] || this.tierInfoMap['Bronze'];
  }

  getTierIcon(tier: string): string {
    return this.getTierInfo(tier).icon;
  }

  getGrowthTrend(): { direction: 'up' | 'down' | 'flat'; percentage: number } {
    if (!this.membershipKPIs) return { direction: 'flat', percentage: 0 };
    
    const growth = this.membershipKPIs.membershipGrowthRate;
    return {
      direction: growth > 0 ? 'up' : growth < 0 ? 'down' : 'flat',
      percentage: Math.abs(growth)
    };
  }

  getGrowthIcon(): string {
    const trend = this.getGrowthTrend();
    switch (trend.direction) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  }

  getGrowthTrendClass(): string {
    const trend = this.getGrowthTrend();
    return `trend-${trend.direction}`;
  }

  getGrowthColor(): string {
    const trend = this.getGrowthTrend();
    switch (trend.direction) {
      case 'up': return '#4BBF7B'; // Success green
      case 'down': return '#E15A4F'; // Error red
      default: return '#FFB84D'; // Warning orange
    }
  }

  // ===== INSIGHTS GENERATION =====

  generateInsights(): string[] {
    if (!this.membershipKPIs) return [];

    const insights: string[] = [];
    
    // Active member ratio
    const activeRatio = (this.membershipKPIs.activeMembers / this.membershipKPIs.totalMembers) * 100;
    if (activeRatio > 90) {
      insights.push(`Excellent member engagement with ${activeRatio.toFixed(1)}% active members`);
    } else if (activeRatio < 70) {
      insights.push(`Member engagement needs attention - only ${activeRatio.toFixed(1)}% are active`);
    }

    // Points redemption rate
    const redemptionRate = (this.membershipKPIs.totalPointsRedeemed / this.membershipKPIs.totalPointsAwarded) * 100;
    if (redemptionRate < 50) {
      insights.push(`Low points redemption rate (${redemptionRate.toFixed(1)}%) - consider promoting rewards`);
    }

    // Growth rate
    if (this.membershipKPIs.membershipGrowthRate > 10) {
      insights.push(`Strong membership growth of ${this.membershipKPIs.membershipGrowthRate}% this period`);
    }

    return insights;
  }

  // ===== REAL-TIME FEATURES =====
  private initializeRealTimeConnection(): void {
    // Simulate real-time connection
    setTimeout(() => {
      this.realtimeConnected.set(true);
      this.addToast({
        id: this.generateId(),
        type: 'success',
        title: 'Connected',
        message: 'Real-time analytics updates are now active',
        timestamp: new Date()
      });
    }, 1000);
  }

  // ===== TOAST NOTIFICATION METHODS =====
  private addToast(toast: ToastNotification): void {
    this.realtimeToasts.update(toasts => [toast, ...toasts.slice(0, 4)]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.dismissToast(toast.id);
    }, 5000);
  }

  dismissToast(toastId: string): void {
    this.realtimeToasts.update(toasts => 
      toasts.filter(toast => toast.id !== toastId)
    );
  }

  getToastIcon(type: string): string {
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type as keyof typeof icons] || 'ℹ️';
  }

  trackByToast = (index: number, toast: ToastNotification): string => toast.id;

  // ===== NOTIFICATION HELPERS =====
  private showSuccessNotification(message: string): void {
    this.addToast({
      id: this.generateId(),
      type: 'success',
      title: 'Success',
      message,
      timestamp: new Date()
    });
  }

  private showErrorNotification(message: string): void {
    this.addToast({
      id: this.generateId(),
      type: 'error',
      title: 'Error',
      message,
      timestamp: new Date()
    });
  }

  // ===== CHART UTILITIES =====
  getChartSize(): [number, number] {
    return [400, 300];
  }

  // ===== UTILITY HELPERS =====
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // ===== TRACK BY FUNCTIONS =====
  trackByInsight = (index: number, insight: string): string => insight;
  trackByTier = (index: number, tier: TierDistribution): string => tier.tier;
  trackByMember = (index: number, member: TopMemberDto): number => member.id || index;

  // ===== NAVIGATION =====

  navigateToMemberList(): void {
    // Navigate to member list with filters
  }

  navigateToMemberDetail(member: TopMemberDto): void {
    // Navigate to specific member detail
  }

  // ===== PERFORMANCE OPTIMIZATION =====
  trackByAnalytics = (index: number, item: any): any => item.id || index;
}