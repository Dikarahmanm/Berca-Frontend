// src/app/modules/membership/components/membership-analytics/membership-analytics.component.ts
// ✅ Membership Analytics Component with Charts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

// Charts
import { NgxChartsModule } from '@swimlane/ngx-charts';

// Services and interfaces
import { MembershipService } from '../../services/membership.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import {
  MemberDto,
  TopMemberDto,
  TopMembersFilter,
  MemberChartData
} from '../../interfaces/membership.interfaces';

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
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    // Material modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
    // Charts
    NgxChartsModule
  ],
  templateUrl: './membership-analytics.component.html',
  styleUrls: ['./membership-analytics.component.scss']
})
export class MembershipAnalyticsComponent implements OnInit, OnDestroy {
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
      '#6366f1', // Purple
      '#8b5cf6', // Violet
      '#06b6d4', // Cyan
      '#10b981'  // Emerald
    ]
  };

  // Chart options
  showXAxis = true;
  showYAxis = true;
  gradient = true;
  showLegend = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = '';
  yAxisLabel = '';

  // State
  loading = false;
  error: string | null = null;
  selectedTab = 0;

  // Subscription management
  private subscriptions = new Subscription();

  constructor(
    private membershipService: MembershipService,
    private dashboardService: DashboardService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.dateRangeForm = this.initializeDateForm();
  }

  ngOnInit(): void {
    this.setupDateRangeSubscription();
    this.loadAnalyticsData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== INITIALIZATION =====

  private initializeDateForm(): FormGroup {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    return this.fb.group({
      startDate: [thirtyDaysAgo],
      endDate: [today],
      preset: ['last30Days']
    });
  }

  private setupDateRangeSubscription(): void {
    this.subscriptions.add(
      this.dateRangeForm.valueChanges.subscribe(() => {
        this.loadAnalyticsData();
      })
    );
  }

  // ===== DATA LOADING =====

  public loadAnalyticsData(): void {
    this.loading = true;
    this.error = null;

    // Load all analytics data
    this.loadMembershipKPIs();
    this.loadTopMembers();
    this.generateMockAnalyticsData(); // Replace with real API calls when available
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

    this.subscriptions.add(
      this.membershipService.getTopMembers(filter).subscribe({
        next: (members) => {
          this.topMembers = members;
        },
        error: (error) => {
          console.error('Failed to load top members:', error);
        }
      })
    );
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
      { name: 'Low Spenders (< 1M)', value: 35 },
      { name: 'Medium Spenders (1M - 5M)', value: 45 },
      { name: 'High Spenders (5M - 15M)', value: 15 },
      { name: 'Premium Spenders (> 15M)', value: 5 }
    ];

    // Generate points analysis
    this.pointsAnalysisData = [
      { name: 'Points Earned', value: 45600 },
      { name: 'Points Redeemed', value: 32100 },
      { name: 'Points Available', value: 13500 }
    ];

    this.loading = false;
  }

  private generateGrowthData(): MemberChartData[] {
    const data: MemberChartData[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 12; i++) {
      data.push({
        name: months[i],
        value: Math.floor(Math.random() * 100) + 50 // Random growth between 50-150
      });
    }
    
    return data;
  }

  // ===== DATE RANGE MANAGEMENT =====

  onPresetChange(preset: string): void {
    const presets = this.getDateRangePresets();
    const selectedPreset = presets[preset];
    
    if (selectedPreset) {
      this.dateRangeForm.patchValue({
        startDate: selectedPreset.startDate,
        endDate: selectedPreset.endDate
      });
    }
  }

  private getDateFilter(): { startDate: Date; endDate: Date } {
    const formValue = this.dateRangeForm.value;
    return {
      startDate: formValue.startDate,
      endDate: formValue.endDate
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

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }

  // ===== EXPORT FUNCTIONALITY =====

  exportAnalytics(): void {
    // Implement export functionality
    this.showSuccess('Analytics export feature will be implemented');
  }

  // ===== TIER HELPERS =====

  getTierInfo(tier: string): { name: string; color: string; icon: string } {
    return this.membershipService.getMemberTierInfo(tier);
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
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getGrowthColor(): string {
    const trend = this.getGrowthTrend();
    switch (trend.direction) {
      case 'up': return 'var(--clr-accent)';
      case 'down': return 'var(--clr-error)';
      default: return 'var(--clr-warning)';
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

  // ===== UI HELPERS =====

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // ===== NAVIGATION =====

  navigateToMemberList(): void {
    // Navigate to member list with filters
  }

  navigateToMemberDetail(member: TopMemberDto): void {
    // Navigate to specific member detail
  }
}