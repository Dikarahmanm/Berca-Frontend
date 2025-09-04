// Enhanced Member Credit Dashboard Component - Full Featured

import { Component, input, output, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { NgxChartsModule } from '@swimlane/ngx-charts'; // Temporarily disabled for compatibility
import { MemberCreditService } from '../../services/member-credit.service';
import { 
  MemberCreditSummaryDto as MemberCreditDto, 
  CreditTransactionDto,
  CreditAnalyticsDto,
  TierAnalysisDto,
  CreditTrendDto,
  TopCreditUser,
  OverdueMemberDto,
  CreditPaymentRequestDto
} from '../../interfaces/member-credit.interfaces';
import { map, Observable } from 'rxjs';

export interface TopDebtor {
  rank: number;
  memberId: number;
  memberName: string;
  memberNumber: string;
  phone: string;
  totalDebt: number;
  overdueAmount: number;
  daysOverdue: number;
  lastPaymentDate: string | null;
  nextDueDate: string | null;
  creditLimit: number;
  availableCredit: number;
  statusDescription: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  formattedTotalDebt: string;
  formattedOverdueAmount: string;
  tier: string;
  requiresUrgentAction: boolean;
}

export interface PaymentModalData {
  member: TopDebtor | null;
  isOpen: boolean;
}

export interface CreditMetrics {
  totalMembers: number;
  totalCreditLimit: number;
  totalOutstandingDebt: number;
  totalAvailableCredit: number;
  averageCreditUtilization: number;
  membersWithDebt: number;
  overdueAccounts: number;
  highRiskAccounts: number;
}

export interface CreditTrend {
  name: string;
  series: Array<{
    name: string;
    value: number;
  }>;
}

export interface RiskDistribution {
  name: string;
  value: number;
}

export interface TopMember {
  tier: number;
  tierName: string;
  memberCount: number;
  averageCreditLimit: number;
  averageDebt: number;
  utilizationRate: number;
  creditScore: number;
  overdueRate: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  // Legacy support for individual member data
  memberId?: number;
  memberName?: string;
  memberCode?: string;
  creditLimit?: number;
  currentDebt?: number;
  lastActivity?: string;
}

@Component({
  selector: 'app-member-credit-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-credit-dashboard.component.html',
  styleUrls: ['./member-credit-dashboard.component.scss']
})
export class MemberCreditDashboardComponent implements OnInit {
  private memberCreditService = inject(MemberCreditService);
  private fb = inject(FormBuilder);

  // Signal-based state management
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedPeriod = signal('30d');
  readonly selectedChartType = signal<'line' | 'bar'>('line');

  // Data signals
  readonly metrics = signal<CreditMetrics>({
    totalMembers: 0,
    totalCreditLimit: 0,
    totalOutstandingDebt: 0,
    totalAvailableCredit: 0,
    averageCreditUtilization: 0,
    membersWithDebt: 0,
    overdueAccounts: 0,
    highRiskAccounts: 0
  });

  readonly creditTrendsData = signal<CreditTrend[]>([]);
  readonly riskDistributionData = signal<RiskDistribution[]>([]);
  readonly topMembers = signal<TopMember[]>([]);
  readonly topCreditUsers = signal<TierAnalysisDto[]>([]);

  // ===== NEW: Debt Management Signals =====
  readonly topDebtors = signal<TopDebtor[]>([]);
  readonly paymentModal = signal<PaymentModalData>({
    member: null,
    isOpen: false
  });
  readonly processingPayment = signal(false);
  
  // Modal management signals
  readonly overdueAccountsModal = signal<{isOpen: boolean, members: any[]}>({
    isOpen: false,
    members: []
  });
  readonly highRiskMembersModal = signal<{isOpen: boolean, members: any[]}>({
    isOpen: false,
    members: []
  });
  readonly reminderConfirmModal = signal<{isOpen: boolean, count: number}>({
    isOpen: false,
    count: 0
  });
  readonly reportModal = signal<{isOpen: boolean, generating: boolean}>({
    isOpen: false,
    generating: false
  });
  readonly memberDebtListModal = signal<{isOpen: boolean, members: any[], loading: boolean}>({
    isOpen: false,
    members: [],
    loading: false
  });

  // Member History Modal
  readonly memberHistoryModal = signal<{isOpen: boolean, member: any | null, loading: boolean}>({
    isOpen: false,
    member: null,
    loading: false
  });
  readonly memberTransactionHistory = signal<any[]>([]);

  // Payment Form
  readonly paymentForm = this.fb.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    paymentMethod: ['Cash', Validators.required],
    referenceNumber: [''],
    notes: ['']
  });

  // Chart configurations
  readonly chartColorScheme: any = {
    domain: ['#e47a3f', '#52a573', '#4b89e6', '#e6a855', '#d44a3f']
  };

  readonly riskColorScheme: any = {
    domain: ['#52a573', '#e6a855', '#f97316', '#d44a3f']
  };

  ngOnInit(): void {
    console.log('✅ MemberCreditDashboardComponent initialized successfully!');
    this.loadDashboardData();
    this.refreshDebtors(); // NEW: Load debt management data
  }

  // Data loading methods
  async loadDashboardData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      console.log('=================================================');
      console.log('🚀 MEMBER CREDIT DASHBOARD - LOADING DATA...');
      console.log('=================================================');
      
      // Load credit analytics from real backend
      await this.loadCreditAnalyticsFromBackend();
      
      // Load top credit users data (using tierAnalysis)
      this.loadTopCreditUsersData();
      
      // Load additional data in parallel
      await Promise.all([
        this.loadOverdueMembers(),
        this.loadApproachingLimitMembers()
      ]);

      console.log('✅ Dashboard data loaded successfully');
      
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error);
      this.error.set('Failed to load dashboard data: ' + error.message);
    } finally {
      this.loading.set(false);
    }
  }

  // Load Credit Analytics from real backend API
  private loadCreditAnalyticsFromBackend(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🚀 MEMBER CREDIT DASHBOARD: Starting to load credit analytics from backend...');
      console.log('📊 API URL: /api/MemberCredit/analytics');
      
      // Call real backend API: GET /api/MemberCredit/analytics
      this.memberCreditService.getCreditAnalytics().subscribe({
        next: (analytics: any) => {
          console.log('✅ Credit analytics loaded:', analytics);
          
          // Check if analytics is valid and has meaningful data
          if (!analytics || (typeof analytics === 'object' && Object.keys(analytics).length === 0)) {
            console.warn('⚠️ Analytics data is empty or invalid, using fallback');
            this.loadMockDataAsFallback();
            resolve();
            return;
          }

          // Handle different response formats from backend
          let analyticsData = analytics;
          if (analytics.data) {
            analyticsData = analytics.data; // Wrapped response
          }
          
          console.log('📊 Processing analytics data:', analyticsData);
          
          // Also check if backend returns valid response but with all zero values (no credit data exists yet)
          // We'll check this after extracting the values
          
          // Check for interface-style nested structure vs direct properties
          const isNestedStructure = analyticsData.summary && typeof analyticsData.summary === 'object';
          
          // Extract values using flexible approach for both structures
          let totalMembersWithCredit = 0;
          let totalCreditLimit = 0;
          let totalOutstandingDebt = 0;
          let totalAvailableCredit = 0;
          let averageCreditUtilization = 0;
          let overdueMembers = 0;
          
          if (isNestedStructure) {
            // Interface-style structure with nested summary
            totalMembersWithCredit = analyticsData.summary?.activeCreditMembers || analyticsData.summary?.totalMembers || 0;
            totalCreditLimit = analyticsData.summary?.totalCreditLimit || 0;
            totalOutstandingDebt = analyticsData.summary?.totalOutstandingDebt || 0;
            totalAvailableCredit = totalCreditLimit - totalOutstandingDebt;
            averageCreditUtilization = analyticsData.summary?.avgCreditUtilization || 0;
          } else {
            // Direct properties structure (real backend response)
            totalMembersWithCredit = analyticsData?.totalMembersWithCredit || 0;
            totalCreditLimit = analyticsData?.totalCreditLimit || 0;
            totalOutstandingDebt = analyticsData?.totalOutstandingDebt || 0;
            totalAvailableCredit = analyticsData?.totalAvailableCredit || 0;
            averageCreditUtilization = analyticsData?.averageCreditUtilization || 0;
            overdueMembers = analyticsData?.overdueMembers || 0;
          }
          
          // Also check if backend returns valid response but with all zero values (no credit data exists yet)
          const hasAnyMeaningfulData = totalMembersWithCredit > 0 || 
                                     totalCreditLimit > 0 || 
                                     totalOutstandingDebt > 0;

          if (!hasAnyMeaningfulData) {
            console.warn('⚠️ Analytics data contains only zero values, using demonstration data');
            this.loadMockDataAsFallback();
            resolve();
            return;
          }

          // Transform backend analytics to dashboard metrics - using flexible approach
          const dashboardMetrics: CreditMetrics = {
            totalMembers: totalMembersWithCredit,
            totalCreditLimit: totalCreditLimit,
            totalOutstandingDebt: totalOutstandingDebt,
            totalAvailableCredit: totalAvailableCredit,
            averageCreditUtilization: averageCreditUtilization,
            membersWithDebt: totalMembersWithCredit, // Members with credit are members with debt
            overdueAccounts: overdueMembers,
            highRiskAccounts: this.calculateHighRiskAccounts(analyticsData?.creditScoreDistribution || analyticsData?.riskDistribution)
          };
          
          this.metrics.set(dashboardMetrics);
          
          // Transform trends data using flexible approach for different backend structures
          let trendsData: CreditTrend[] = [];
          
          if (analyticsData?.creditTrends && Array.isArray(analyticsData.creditTrends) && analyticsData.creditTrends.length > 0) {
            // Direct creditTrends array (real backend)
            trendsData = [
              {
                name: 'Credit Usage',
                series: analyticsData.creditTrends.map((trend: any) => ({
                  name: this.formatDateForChart(trend.date),
                  value: trend.totalDebt || 0
                }))
              },
              {
                name: 'Payments',
                series: analyticsData.creditTrends.map((trend: any) => ({
                  name: this.formatDateForChart(trend.date),
                  value: trend.payments || 0
                }))
              },
              {
                name: 'New Credits',
                series: analyticsData.creditTrends.map((trend: any) => ({
                  name: this.formatDateForChart(trend.date),
                  value: trend.newCredit || 0
                }))
              }
            ];
            console.log('📈 Credit trends data loaded from real API:', trendsData);
          } else if (analyticsData?.monthlyTrends && Array.isArray(analyticsData.monthlyTrends) && analyticsData.monthlyTrends.length > 0) {
            // Interface-style monthlyTrends array
            trendsData = [
              {
                name: 'Credit Sales',
                series: analyticsData.monthlyTrends.map((trend: any) => ({
                  name: trend.month,
                  value: trend.creditSales || 0
                }))
              },
              {
                name: 'Payments',
                series: analyticsData.monthlyTrends.map((trend: any) => ({
                  name: trend.month,
                  value: trend.payments || 0
                }))
              }
            ];
            console.log('📈 Credit trends data loaded from interface structure:', trendsData);
          } else {
            console.log('📈 No credit trends data available, using empty array');
          }
          
          this.creditTrendsData.set(trendsData);
          
          // Transform top members if available - with safe property access
          let topMembersData: TopMember[] = [];
          
          if (analyticsData?.topMembers?.highest_debt && Array.isArray(analyticsData.topMembers.highest_debt)) {
            topMembersData = analyticsData.topMembers.highest_debt.map((user: any, index: number) => ({
              tier: index + 1,
              tierName: this.getTierNameFromDebt(user.currentDebt || 0),
              memberCount: 1,
              averageCreditLimit: user.creditLimit || 0,
              averageDebt: user.currentDebt || 0,
              utilizationRate: user.creditUtilization || user.utilizationRate || 0,
              creditScore: user.creditScore || 750,
              overdueRate: user.overdueRate || 0,
              riskLevel: user.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical' || 'Low',
              // Individual member properties (legacy support)
              memberId: user.memberId || user.id || 0,
              memberName: user.memberName || user.name || 'Unknown Member',
              memberCode: user.memberNumber || user.memberCode || `M${(user.memberId || user.id || 0).toString().padStart(3, '0')}`,
              creditLimit: user.creditLimit || 0,
              currentDebt: user.currentDebt || 0,
              lastActivity: user.lastTransactionDate || new Date().toISOString()
            }));
          } else if (analyticsData?.topMembers && Array.isArray(analyticsData.topMembers)) {
            // Fallback if topMembers is directly an array
            topMembersData = analyticsData.topMembers.slice(0, 5).map((user: any, index: number) => ({
              tier: index + 1,
              tierName: this.getTierNameFromDebt(user.currentDebt || 0),
              memberCount: 1,
              averageCreditLimit: user.creditLimit || 0,
              averageDebt: user.currentDebt || 0,
              utilizationRate: user.creditUtilization || user.utilizationRate || 0,
              creditScore: user.creditScore || 750,
              overdueRate: user.overdueRate || 0,
              riskLevel: user.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical' || 'Low',
              // Individual member properties (legacy support)
              memberId: user.memberId || user.id || 0,
              memberName: user.memberName || user.name || 'Unknown Member',
              memberCode: user.memberNumber || user.memberCode || `M${(user.memberId || user.id || 0).toString().padStart(3, '0')}`,
              creditLimit: user.creditLimit || 0,
              currentDebt: user.currentDebt || 0,
              lastActivity: user.lastTransactionDate || new Date().toISOString()
            }));
          }
          
          this.topMembers.set(topMembersData);
          console.log('👥 Top members data loaded:', topMembersData);
          
          // Update risk distribution based on available data structure
          let riskData: RiskDistribution[] = [];
          
          if (analyticsData?.creditScoreDistribution && typeof analyticsData.creditScoreDistribution === 'object') {
            // Direct creditScoreDistribution structure (real backend)
            riskData = [
              { name: 'Excellent', value: analyticsData.creditScoreDistribution.excellent || 0 },
              { name: 'Very Good', value: analyticsData.creditScoreDistribution.veryGood || 0 },
              { name: 'Good', value: analyticsData.creditScoreDistribution.good || 0 },
              { name: 'Fair', value: analyticsData.creditScoreDistribution.fair || 0 },
              { name: 'Poor', value: analyticsData.creditScoreDistribution.poor || 0 }
            ].filter(item => item.value > 0);
            console.log('🎯 Credit score distribution loaded from real API:', riskData);
          } else if (analyticsData?.riskDistribution && typeof analyticsData.riskDistribution === 'object') {
            // Interface-style riskDistribution structure
            riskData = [
              { name: 'Low', value: analyticsData.riskDistribution.low || 0 },
              { name: 'Medium', value: analyticsData.riskDistribution.medium || 0 },
              { name: 'High', value: analyticsData.riskDistribution.high || 0 },
              { name: 'Critical', value: analyticsData.riskDistribution.critical || 0 }
            ].filter(item => item.value > 0);
            console.log('🎯 Risk distribution loaded from interface structure:', riskData);
          } else {
            console.log('🎯 No risk distribution data available');
          }
          
          this.riskDistributionData.set(riskData);
          
          console.log('✅ Dashboard metrics updated from backend:', dashboardMetrics);
          resolve();
        },
        error: (error) => {
          console.error('❌ Failed to load credit analytics:', error);
          // Fall back to mock data if backend fails
          this.loadMockDataAsFallback();
          resolve();
        }
      });
    });
  }

  // Load overdue members from backend
  private loadOverdueMembers(): Promise<void> {
    return new Promise((resolve) => {
      console.log('⏰ Loading overdue members from backend...');
      
      this.memberCreditService.getOverdueMembers().subscribe({
        next: (overdueMembers) => {
          console.log('✅ Overdue members loaded:', overdueMembers);
          
          // Update metrics with overdue count - with safe length check
          this.metrics.update(current => ({
            ...current,
            overdueAccounts: Array.isArray(overdueMembers) ? overdueMembers.length : 0
          }));
          
          resolve();
        },
        error: (error) => {
          console.warn('⚠️ Failed to load overdue members:', error);
          resolve();
        }
      });
    });
  }

  // Load members approaching credit limit
  private loadApproachingLimitMembers(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🔥 Loading members approaching limit from backend...');
      
      this.memberCreditService.getApproachingLimitMembers().subscribe({
        next: (approachingMembers) => {
          console.log('✅ Approaching limit members loaded:', approachingMembers);
          
          // Update high risk accounts count - with safe length check
          this.metrics.update(current => ({
            ...current,
            highRiskAccounts: current.highRiskAccounts + (Array.isArray(approachingMembers) ? approachingMembers.length : 0)
          }));
          
          resolve();
        },
        error: (error) => {
          console.warn('⚠️ Failed to load approaching limit members:', error);
          resolve();
        }
      });
    });
  }

  // Fallback to mock data if backend is not available
  private loadMockDataAsFallback(): void {
    console.log('🔄 Loading mock data as fallback...');
    
    const mockMetrics: CreditMetrics = {
      totalMembers: 150,
      totalCreditLimit: 50000000,
      totalOutstandingDebt: 12500000,
      totalAvailableCredit: 37500000,
      averageCreditUtilization: 25.0,
      membersWithDebt: 45,
      overdueAccounts: 8,
      highRiskAccounts: 3
    };
    
    const mockTrends: CreditTrend[] = [
      {
        name: 'Credit Usage',
        series: [
          { name: 'Jan', value: 8000000 },
          { name: 'Feb', value: 9500000 },
          { name: 'Mar', value: 11000000 },
          { name: 'Apr', value: 12500000 },
          { name: 'May', value: 10800000 }
        ]
      },
      {
        name: 'Payments',
        series: [
          { name: 'Jan', value: 7500000 },
          { name: 'Feb', value: 8200000 },
          { name: 'Mar', value: 9800000 },
          { name: 'Apr', value: 11200000 },
          { name: 'May', value: 12000000 }
        ]
      }
    ];
    
    const mockMembers: TopMember[] = [
      {
        tier: 1,
        tierName: 'Platinum',
        memberCount: 5,
        averageCreditLimit: 2000000,
        averageDebt: 1500000,
        utilizationRate: 75.0,
        creditScore: 720,
        overdueRate: 5.0,
        riskLevel: 'High',
        memberId: 1,
        memberName: 'John Doe',
        memberCode: 'M001',
        creditLimit: 2000000,
        currentDebt: 1500000,
        lastActivity: '2024-12-01'
      },
      {
        tier: 2,
        tierName: 'Gold',
        memberCount: 8,
        averageCreditLimit: 1500000,
        averageDebt: 800000,
        utilizationRate: 53.3,
        creditScore: 780,
        overdueRate: 2.0,
        riskLevel: 'Medium',
        memberId: 2,
        memberName: 'Jane Smith',
        memberCode: 'M002',
        creditLimit: 1500000,
        currentDebt: 800000,
        lastActivity: '2024-12-02'
      },
      {
        tier: 3,
        tierName: 'Silver',
        memberCount: 12,
        averageCreditLimit: 1000000,
        averageDebt: 950000,
        utilizationRate: 95.0,
        creditScore: 650,
        overdueRate: 15.0,
        riskLevel: 'Critical',
        memberId: 3,
        memberName: 'Bob Wilson',
        memberCode: 'M003',
        creditLimit: 1000000,
        currentDebt: 950000,
        lastActivity: '2024-11-28'
      }
    ];
    
    this.metrics.set(mockMetrics);
    this.creditTrendsData.set(mockTrends);
    this.topMembers.set(mockMembers);
    this.updateRiskDistribution();
    
    console.log('✅ Mock data loaded as fallback');
  }

  private updateRiskDistribution(): void {
    const members = this.topMembers();
    const riskCounts = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0
    };

    members.forEach(member => {
      riskCounts[member.riskLevel]++;
    });

    const riskData: RiskDistribution[] = Object.entries(riskCounts)
      .filter(([_, count]) => count > 0)
      .map(([risk, count]) => ({
        name: risk,
        value: count
      }));

    this.riskDistributionData.set(riskData);
  }

  // Event handlers
  setSelectedPeriod(period: string): void {
    this.selectedPeriod.set(period);
    this.loadDashboardData();
  }

  setChartType(type: 'line' | 'bar'): void {
    this.selectedChartType.set(type);
  }

  onRefreshData(): void {
    this.loadDashboardData();
  }

  onExportReport(): void {
    console.log('Exporting credit report...');
    // Implement report export logic
  }

  onChartSelect(event: any): void {
    console.log('Chart selection:', event);
  }

  onRiskSelect(event: any): void {
    console.log('Risk selection:', event);
  }

  viewAllMembers(): void {
    // Navigate to members list
    console.log('Navigate to members list');
  }

  viewOverdueAccounts(): void {
    console.log('🔍 Loading overdue accounts...');
    
    this.memberCreditService.getOverdueMembers().subscribe({
      next: (overdueMembers) => {
        console.log('✅ Overdue members:', overdueMembers);
        
        const overdueCount = overdueMembers.length;
        const totalOverdueAmount = overdueMembers.reduce((sum, member) => 
          sum + (member.overdueAmount || 0), 0
        );
        
        console.log(`📊 Found ${overdueCount} overdue accounts with total debt: ${this.formatCurrency(totalOverdueAmount)}`);
        
        // Show overdue accounts in a modal
        this.showOverdueAccountsModal(overdueMembers);
      },
      error: (error) => {
        console.error('❌ Failed to load overdue accounts:', error);
        alert('Failed to load overdue accounts. Please try again.');
      }
    });
  }

  viewHighRiskMembers(): void {
    console.log('⚠️ Loading high risk members...');
    
    this.memberCreditService.getApproachingLimitMembers().subscribe({
      next: (highRiskMembers) => {
        console.log('✅ High risk members:', highRiskMembers);
        
        const riskCount = highRiskMembers.length;
        const totalRiskExposure = highRiskMembers.reduce((sum, member) => 
          sum + (member.currentDebt || 0), 0
        );
        
        console.log(`📊 Found ${riskCount} high risk members with total exposure: ${this.formatCurrency(totalRiskExposure)}`);
        
        // Show high risk members in a modal
        this.showHighRiskMembersModal(highRiskMembers);
      },
      error: (error) => {
        console.error('❌ Failed to load high risk members:', error);
        alert('Failed to load high risk members. Please try again.');
      }
    });
  }

  sendPaymentReminders(): void {
    console.log('📧 Preparing to send bulk payment reminders...');
    
    // Get overdue members count for confirmation
    this.memberCreditService.getOverdueMembers().subscribe({
      next: (overdueMembers) => {
        const overdueCount = overdueMembers.length;
        if (overdueCount > 0) {
          // Show confirmation modal
          this.reminderConfirmModal.set({
            isOpen: true,
            count: overdueCount
          });
        } else {
          alert('No overdue members found to send reminders to.');
        }
      },
      error: (error) => {
        console.error('❌ Failed to get overdue members for reminder:', error);
        alert('Failed to check overdue members. Please try again.');
      }
    });
  }

  confirmSendReminders(): void {
    console.log('📧 Sending bulk payment reminders...');
    
    this.memberCreditService.sendBulkReminders().subscribe({
      next: (response) => {
        console.log('✅ Bulk reminders sent:', response);
        
        const reminderCount = response.reminderCount || 0;
        const successCount = response.successCount || 0;
        const failureCount = response.failureCount || 0;
        
        console.log(`📊 Sent ${successCount}/${reminderCount} reminders successfully. ${failureCount} failed.`);
        
        // Close modal and show result
        this.reminderConfirmModal.set({ isOpen: false, count: 0 });
        alert(`Payment reminders sent to ${successCount} members successfully!`);
        
        // Refresh dashboard data to get updated counts
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('❌ Failed to send payment reminders:', error);
        this.reminderConfirmModal.set({ isOpen: false, count: 0 });
        alert('Failed to send payment reminders. Please try again.');
      }
    });
  }

  generateReport(): void {
    console.log('📋 Generating credit management report...');
    
    // Show report modal
    this.reportModal.set({
      isOpen: true,
      generating: true
    });
    
    // Get analytics data for the report
    this.memberCreditService.getCreditAnalytics().subscribe({
      next: (analytics) => {
        console.log('✅ Analytics data for report:', analytics);
        
        setTimeout(() => {
          // Simulate report generation time
          const reportData = {
            generatedAt: new Date().toISOString(),
            summary: {
              totalMembers: this.metrics().totalMembers,
              totalCreditLimit: this.metrics().totalCreditLimit,
              totalOutstandingDebt: this.metrics().totalOutstandingDebt,
              averageUtilization: this.metrics().averageCreditUtilization
            },
            riskDistribution: this.riskDistributionData(),
            topCreditUsers: this.topMembers(),
            trends: this.creditTrendsData(),
            topDebtors: this.topDebtors()
          };
          
          console.log('📊 Credit Report Data:', reportData);
          
          // Create and download a simple CSV report
          this.downloadCreditReport(reportData);
          
          // Update modal state
          this.reportModal.set({
            isOpen: true,
            generating: false
          });
          
          console.log('📄 Report generation complete');
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Failed to generate report:', error);
        this.reportModal.set({
          isOpen: false,
          generating: false
        });
        alert('Failed to generate report. Please try again.');
      }
    });
  }

  private downloadCreditReport(reportData: any): void {
    // Create CSV content
    let csvContent = "Credit Management Report\n";
    csvContent += `Generated At: ${new Date(reportData.generatedAt).toLocaleString('id-ID')}\n\n`;
    
    // Summary section
    csvContent += "SUMMARY\n";
    csvContent += `Total Members: ${reportData.summary.totalMembers}\n`;
    csvContent += `Total Credit Limit: ${this.formatCurrency(reportData.summary.totalCreditLimit)}\n`;
    csvContent += `Total Outstanding Debt: ${this.formatCurrency(reportData.summary.totalOutstandingDebt)}\n`;
    csvContent += `Average Utilization: ${reportData.summary.averageUtilization.toFixed(2)}%\n\n`;
    
    // Top Debtors section
    csvContent += "TOP DEBTORS\n";
    csvContent += "Rank,Member Name,Member Number,Total Debt,Overdue Amount,Days Overdue,Risk Level\n";
    reportData.topDebtors.forEach((debtor: TopDebtor) => {
      csvContent += `${debtor.rank},"${debtor.memberName}","${debtor.memberNumber}","${debtor.formattedTotalDebt}","${debtor.formattedOverdueAmount}",${debtor.daysOverdue},"${debtor.riskLevel}"\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `credit-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  goToMembershipManagement(): void {
    console.log('Navigate to membership management');
  }

  refreshTopCreditUsers(): void {
    console.log('🏆 Refreshing top credit users data...');
    this.loadTopCreditUsersData();
  }

  /**
   * Get Top Credit Users from analytics data
   * Transforms tierAnalysis[] from backend analytics to ranked credit users
   */
  private loadTopCreditUsersData(): void {
    this.memberCreditService.getTopCreditUsers().subscribe({
      next: (topUsers: TopCreditUser[]) => {
        console.log('🏆 Top credit users loaded:', topUsers);
        
        // Transform TopCreditUser[] to TierAnalysisDto[] for display
        const tierData: TierAnalysisDto[] = topUsers.map(user => ({
          tier: user.rank,
          tierName: user.tier,
          memberCount: user.totalTransactions || 1, // Use transactions as member count
          averageCreditLimit: user.creditLimit,
          averageDebt: user.currentDebt,
          averageUtilization: user.creditUtilization,
          averageCreditScore: user.creditScore,
          overdueRate: user.paymentSuccessRate ? 100 - user.paymentSuccessRate : 0
        }));
        
        this.topCreditUsers.set(tierData);
      },
      error: (error) => {
        console.error('❌ Failed to load top credit users:', error);
        this.topCreditUsers.set([]);
      }
    });
  }

  getRiskLevelFromTier(tier: TierAnalysisDto): 'Low' | 'Medium' | 'High' | 'Critical' {
    // Calculate risk level based on tier metrics
    const utilization = tier.averageUtilization;
    const overdueRate = tier.overdueRate;
    const creditScore = tier.averageCreditScore;

    if (overdueRate > 20 || utilization > 90 || creditScore < 600) {
      return 'Critical';
    } else if (overdueRate > 10 || utilization > 80 || creditScore < 700) {
      return 'High';
    } else if (overdueRate > 5 || utilization > 70 || creditScore < 750) {
      return 'Medium';
    } else {
      return 'Low';
    }
  }

  trackByTier = (index: number, tier: TierAnalysisDto): number => tier.tier;
  
  trackByMember = (index: number, member: TopMember): number => member.memberId || index;

  getHighRiskCount(): number {
    return this.topDebtors().filter(member => member.riskLevel === 'High' || member.riskLevel === 'Critical').length;
  }

  getTierNameFromDebt(debt: number): string {
    if (debt >= 2000000) return 'Platinum';
    if (debt >= 1500000) return 'Gold';
    if (debt >= 1000000) return 'Silver';
    if (debt >= 500000) return 'Bronze';
    return 'Basic';
  }
  
  trackByMemberId = (index: number, member: any): number => member.memberId || index;

  // ===== CREDIT UTILIZATION HELPERS =====
  getCreditUtilizationPercentage(member: any): number {
    const debt = member.currentDebt || member.totalDebt || 0;
    const limit = member.creditLimit || 0;
    return limit > 0 ? Math.round((debt / limit) * 100) : 0;
  }

  getCreditUtilizationClass(member: any): string {
    const percentage = this.getCreditUtilizationPercentage(member);
    if (percentage >= 90) return 'utilization-critical';
    if (percentage >= 75) return 'utilization-high';
    if (percentage >= 50) return 'utilization-medium';
    return 'utilization-low';
  }

  getMemberInitials(memberName: string): string {
    if (!memberName) return '?';
    const words = memberName.trim().split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  getTotalDebtAmount(): number {
    const members = this.memberDebtListModal().members || [];
    return members.reduce((total, member) => total + (member.currentDebt || member.totalDebt || 0), 0);
  }

  private calculateHighRiskAccounts(distributionData: any): number {
    if (!distributionData) return 0;
    
    // Handle different distribution structures
    if (distributionData.poor !== undefined) {
      // Credit score distribution - consider 'poor' as high risk
      return distributionData.poor || 0;
    } else if (distributionData.high !== undefined && distributionData.critical !== undefined) {
      // Risk distribution - consider 'high' and 'critical' as high risk
      return (distributionData.high || 0) + (distributionData.critical || 0);
    }
    
    return 0;
  }

  private formatDateForChart(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // ===== NEW: Debt Management Methods =====
  refreshDebtors(): void {
    this.loading.set(true);
    this.memberCreditService.getTopDebtors(undefined, 20).subscribe({
      next: (topDebtorsResponse) => {
        console.log('✅ Top debtors response received:', topDebtorsResponse);
        
        const debtors: TopDebtor[] = topDebtorsResponse.map((member, index) => ({
          rank: index + 1,
          memberId: member.memberId,
          memberName: member.memberName,
          memberNumber: member.memberNumber,
          phone: member.phone,
          totalDebt: member.totalDebt,
          overdueAmount: member.overdueAmount || 0,
          daysOverdue: member.daysOverdue || 0,
          lastPaymentDate: member.lastPaymentDate || null,
          nextDueDate: member.nextDueDate || null,
          creditLimit: member.creditLimit || 0,
          availableCredit: member.availableCredit || 0,
          statusDescription: member.statusDescription || 'Good',
          riskLevel: this.calculateRiskLevel(member),
          formattedTotalDebt: member.formattedTotalDebt || this.formatCurrency(member.totalDebt),
          formattedOverdueAmount: member.formattedOverdueAmount || this.formatCurrency(member.overdueAmount || 0),
          tier: this.getTierName(member.tier),
          requiresUrgentAction: member.requiresUrgentAction || member.daysOverdue >= 30
        }));

        // Already sorted by total debt descending from backend
        this.topDebtors.set(debtors);
        this.loading.set(false);
        
        console.log('💸 Top debtors loaded successfully:', debtors.length, 'members');
      },
      error: (error) => {
        console.error('❌ Error loading top debtors:', error);
        this.error.set('Failed to load top debtors data');
        this.loading.set(false);
      }
    });
  }

  // Helper method to calculate risk level from response data
  private calculateRiskLevel(member: any): 'Low' | 'Medium' | 'High' | 'Critical' {
    // Use backend risk flags if available
    if (member.isHighRisk) return 'High';
    if (member.requiresUrgentAction) return 'Critical';
    
    // Calculate based on days overdue and other factors
    const daysOverdue = member.daysOverdue || 0;
    const utilization = member.creditLimit > 0 ? (member.totalDebt / member.creditLimit) * 100 : 0;
    
    if (daysOverdue > 90 || utilization > 95) return 'Critical';
    if (daysOverdue > 60 || utilization > 85) return 'High';
    if (daysOverdue > 30 || utilization > 75) return 'Medium';
    return 'Low';
  }

  // Helper method to convert tier number to name
  private getTierName(tier: number): string {
    const tierNames = {
      0: 'Regular',
      1: 'Silver', 
      2: 'Gold',
      3: 'Platinum',
      4: 'Diamond'
    };
    return tierNames[tier as keyof typeof tierNames] || 'Regular';
  }

  // Top debtors summary calculation methods
  getTopDebtorsTotal(): number {
    return this.topDebtors().slice(0, 5).reduce((sum, debtor) => sum + debtor.totalDebt, 0);
  }

  getTopDebtorsAverage(): number {
    const top5 = this.topDebtors().slice(0, 5);
    if (top5.length === 0) return 0;
    return this.getTopDebtorsTotal() / top5.length;
  }

  getOverdueCount(): number {
    return this.topDebtors().filter(debtor => debtor.daysOverdue > 0).length;
  }

  openPaymentModal(debtor: TopDebtor): void {
    this.paymentModal.set({
      member: debtor,
      isOpen: true
    });
    
    // Update form validators with max amount
    const amountControl = this.paymentForm.get('amount');
    if (amountControl) {
      amountControl.setValidators([
        Validators.required, 
        Validators.min(1),
        Validators.max(debtor.totalDebt)
      ]);
      amountControl.updateValueAndValidity();
    }
    
    // Reset form with suggested amount (minimum payment)
    const suggestedAmount = Math.min(debtor.overdueAmount, debtor.totalDebt * 0.1);
    this.paymentForm.patchValue({
      amount: suggestedAmount > 0 ? suggestedAmount : Math.min(100000, debtor.totalDebt),
      paymentMethod: 'Cash',
      referenceNumber: '',
      notes: ''
    });
  }

  closePaymentModal(): void {
    this.paymentModal.set({
      member: null,
      isOpen: false
    });
    this.paymentForm.reset();
    this.processingPayment.set(false);
  }

  processPayment(): void {
    if (this.paymentForm.invalid || !this.paymentModal().member) {
      return;
    }

    const member = this.paymentModal().member!;
    const formValue = this.paymentForm.value;
    
    this.processingPayment.set(true);

    const paymentRequest: CreditPaymentRequestDto = {
      amount: formValue.amount || 0,
      paymentMethod: (formValue.paymentMethod as "Cash" | "Transfer" | "Credit_Card" | "E_Wallet" | "Other") || 'Cash',
      referenceNumber: formValue.referenceNumber || '',
      notes: formValue.notes || ''
    };

    this.memberCreditService.recordPayment(member.memberId, paymentRequest).subscribe({
      next: (response) => {
        console.log('Payment recorded successfully:', response);
        this.closePaymentModal();
        this.refreshDebtors(); // Refresh the list
        
        // Show success notification
        // TODO: Add notification service
        alert(`Payment of ${this.formatCurrency(formValue.amount || 0)} recorded successfully for ${member.memberName}`);
      },
      error: (error) => {
        console.error('Error processing payment:', error);
        this.processingPayment.set(false);
        alert('Failed to process payment. Please try again.');
      }
    });
  }

  // Utility methods for debt management
  trackByDebtorId(index: number, debtor: TopDebtor): string {
    return debtor.memberId.toString();
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('id-ID');
  }

  getDaysOverdueText(days: number): string {
    if (days <= 0) return 'Current';
    if (days === 1) return '1 day overdue';
    return `${days} days overdue`;
  }

  getRiskLevel(debtor: TopDebtor): 'low' | 'medium' | 'high' | 'critical' {
    if (debtor.daysOverdue >= 90) return 'critical';
    if (debtor.daysOverdue >= 60) return 'high';
    if (debtor.daysOverdue >= 30) return 'medium';
    return 'low';
  }

  getRiskColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  }

  // Additional utility methods for template
  getRankIconClass(index: number): string {
    if (index === 0) return 'rank-gold';
    if (index === 1) return 'rank-silver';
    if (index === 2) return 'rank-bronze';
    return 'rank-normal';
  }

  getRankIcon(index: number): string {
    if (index === 0) return '🏆';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return (index + 1).toString();
  }

  viewDebtorHistory(debtor: TopDebtor): void {
    // TODO: Implement view debtor history
    console.log('View history for debtor:', debtor);
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'warning': return 'status-warning';
      case 'bad': return 'status-bad';
      case 'blocked': return 'status-blocked';
      default: return 'status-good';
    }
  }

  isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  getCreditUtilization(debtor: TopDebtor): number {
    if (debtor.creditLimit <= 0) return 0;
    return Math.round((debtor.totalDebt / debtor.creditLimit) * 100);
  }

  getUtilizationClass(utilization: number): string {
    if (utilization >= 90) return 'utilization-critical';
    if (utilization >= 75) return 'utilization-high';
    if (utilization >= 50) return 'utilization-medium';
    return 'utilization-low';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  setFullPayment(): void {
    const member = this.paymentModal().member;
    if (member) {
      this.paymentForm.patchValue({
        amount: member.totalDebt
      });
    }
  }

  // Validate payment amount in real-time
  validatePaymentAmount(): void {
    const member = this.paymentModal().member;
    const amountControl = this.paymentForm.get('amount');
    
    if (member && amountControl) {
      const currentValue = amountControl.value || 0;
      
      // Ensure amount doesn't exceed total debt
      if (currentValue > member.totalDebt) {
        amountControl.setValue(member.totalDebt);
      }
      
      // Ensure amount is positive
      if (currentValue < 0) {
        amountControl.setValue(0);
      }
    }
  }

  // ===== MODAL MANAGEMENT METHODS =====
  
  showOverdueAccountsModal(members: any[]): void {
    this.overdueAccountsModal.set({
      isOpen: true,
      members: members
    });
  }

  closeOverdueAccountsModal(): void {
    this.overdueAccountsModal.set({
      isOpen: false,
      members: []
    });
  }

  showHighRiskMembersModal(members: any[]): void {
    this.highRiskMembersModal.set({
      isOpen: true,
      members: members
    });
  }

  closeHighRiskMembersModal(): void {
    this.highRiskMembersModal.set({
      isOpen: false,
      members: []
    });
  }

  closeReminderConfirmModal(): void {
    this.reminderConfirmModal.set({
      isOpen: false,
      count: 0
    });
  }

  closeReportModal(): void {
    this.reportModal.set({
      isOpen: false,
      generating: false
    });
  }

  // Helper method for payment actions from modals
  processPaymentFromModal(memberId: number, memberName: string): void {
    // Find the member in top debtors or create a minimal TopDebtor object
    const existingDebtor = this.topDebtors().find(d => d.memberId === memberId);
    
    if (existingDebtor) {
      this.openPaymentModal(existingDebtor);
    } else {
      // Create minimal debtor object for payment
      const minimalDebtor: TopDebtor = {
        rank: 0,
        memberId: memberId,
        memberName: memberName,
        memberNumber: `MBR${memberId.toString().padStart(3, '0')}`,
        phone: '',
        totalDebt: 0,
        overdueAmount: 0,
        daysOverdue: 0,
        lastPaymentDate: null,
        nextDueDate: null,
        creditLimit: 0,
        availableCredit: 0,
        statusDescription: 'Unknown',
        riskLevel: 'Medium',
        formattedTotalDebt: 'IDR 0',
        formattedOverdueAmount: 'IDR 0',
        tier: 'Regular',
        requiresUrgentAction: false
      };
      
      // Get member credit summary first
      this.memberCreditService.getCreditSummary(memberId).subscribe({
        next: (summary) => {
          if (summary) {
            minimalDebtor.totalDebt = summary.currentDebt;
            minimalDebtor.creditLimit = summary.creditLimit;
            minimalDebtor.availableCredit = summary.availableCredit;
            minimalDebtor.formattedTotalDebt = this.formatCurrency(summary.currentDebt);
          }
          this.openPaymentModal(minimalDebtor);
        },
        error: (error) => {
          console.error('Error getting member credit summary:', error);
          this.openPaymentModal(minimalDebtor);
        }
      });
    }
  }

  // ===== Quick Actions Methods =====
  
  openMemberDebtListModal(): void {
    this.memberDebtListModal.update(state => ({ ...state, isOpen: true, loading: true }));
    
    // Load all members with debt
    this.memberCreditService.getTopDebtors(undefined, 50).subscribe({
      next: (debtors) => {
        const members = debtors.map((member, index) => ({
          rank: index + 1,
          memberId: member.memberId,
          memberName: member.memberName,
          memberNumber: member.memberNumber,
          phone: member.phone,
          totalDebt: member.totalDebt,
          overdueAmount: member.overdueAmount || 0,
          daysOverdue: member.daysOverdue || 0,
          lastPaymentDate: member.lastPaymentDate,
          nextDueDate: member.nextDueDate,
          creditLimit: member.creditLimit,
          availableCredit: member.availableCredit,
          statusDescription: member.statusDescription,
          riskLevel: member.riskLevel,
          formattedTotalDebt: member.formattedTotalDebt || this.formatCurrency(member.totalDebt),
          formattedOverdueAmount: member.formattedOverdueAmount || this.formatCurrency(member.overdueAmount || 0),
          tier: member.tier,
          requiresUrgentAction: member.requiresUrgentAction
        }));
        
        this.memberDebtListModal.update(state => ({
          ...state,
          loading: false,
          members: members.filter(m => m.totalDebt > 0) // Only show members with debt
        }));
      },
      error: (error) => {
        console.error('Error loading member debt list:', error);
        this.memberDebtListModal.update(state => ({ ...state, loading: false, members: [] }));
      }
    });
  }

  closeMemberDebtListModal(): void {
    this.memberDebtListModal.update(state => ({ ...state, isOpen: false, members: [], loading: false }));
  }

  viewOverdueAccountsModal(): void {
    // Open existing overdue accounts modal
    const overdueMembers = this.topDebtors().filter(member => member.daysOverdue > 0);
    this.overdueAccountsModal.set({
      isOpen: true,
      members: overdueMembers
    });
  }

  viewHighRiskMembersModal(): void {
    // Open existing high risk members modal
    const highRiskMembers = this.topDebtors().filter(member => member.riskLevel === 'High' || member.riskLevel === 'Critical');
    this.highRiskMembersModal.set({
      isOpen: true,
      members: highRiskMembers
    });
  }

  generateReportsModal(): void {
    // Open existing generate reports modal
    this.reportModal.set({
      isOpen: true,
      generating: false
    });
  }

  // Payment from debt list modal
  openPaymentFromDebtList(member: any): void {
    // Convert member to TopDebtor format
    const debtor: TopDebtor = {
      rank: member.rank,
      memberId: member.memberId,
      memberName: member.memberName,
      memberNumber: member.memberNumber,
      phone: member.phone,
      totalDebt: member.totalDebt,
      overdueAmount: member.overdueAmount,
      daysOverdue: member.daysOverdue,
      lastPaymentDate: member.lastPaymentDate,
      nextDueDate: member.nextDueDate,
      creditLimit: member.creditLimit,
      availableCredit: member.availableCredit,
      statusDescription: member.statusDescription,
      riskLevel: member.riskLevel,
      formattedTotalDebt: member.formattedTotalDebt,
      formattedOverdueAmount: member.formattedOverdueAmount,
      tier: member.tier,
      requiresUrgentAction: member.requiresUrgentAction
    };

    // Close debt list modal and open payment modal
    this.closeMemberDebtListModal();
    this.openPaymentModal(debtor);
  }

  getTotalTransactionAmount(): string {
    const total = this.memberTransactionHistory().reduce((sum, transaction) => {
      return sum + (transaction.amount || 0);
    }, 0);
    return this.formatCurrency(total);
  }

  trackByTransactionId(index: number, transaction: any): string {
    return transaction.id?.toString() || transaction.transactionId?.toString() || index.toString();
  }

  getTransactionIcon(typeDescription: string): string {
    switch (typeDescription?.toLowerCase()) {
      case 'credit_purchase':
      case 'purchase':
        return '🛒';
      case 'payment':
      case 'credit_payment':
        return '💰';
      case 'credit_adjustment':
      case 'adjustment':
        return '⚖️';
      case 'credit_grant':
      case 'grant':
        return '🎁';
      case 'credit_limit_update':
        return '📊';
      default:
        return '📋';
    }
  }

  getTransactionTypeLabel(typeDescription: string): string {
    switch (typeDescription?.toLowerCase()) {
      case 'credit_purchase':
      case 'purchase':
        return 'Credit Purchase';
      case 'payment':
      case 'credit_payment':
        return 'Payment';
      case 'credit_adjustment':
      case 'adjustment':
        return 'Adjustment';
      case 'credit_grant':
      case 'grant':
        return 'Credit Grant';
      case 'credit_limit_update':
        return 'Limit Update';
      default:
        return typeDescription || 'Unknown';
    }
  }

  getTransactionTypeClass(typeDescription: string): string {
    switch (typeDescription?.toLowerCase()) {
      case 'credit_purchase':
      case 'purchase':
        return 'purchase';
      case 'payment':
      case 'credit_payment':
        return 'payment';
      case 'credit_adjustment':
      case 'adjustment':
        return 'adjustment';
      case 'credit_grant':
      case 'grant':
        return 'grant';
      default:
        return 'default';
    }
  }

  getTransactionAmountClass(typeDescription: string): string {
    switch (typeDescription?.toLowerCase()) {
      case 'credit_purchase':
      case 'purchase':
        return 'amount-negative';
      case 'payment':
      case 'credit_payment':
        return 'amount-positive';
      case 'credit_grant':
      case 'grant':
        return 'amount-positive';
      default:
        return 'amount-neutral';
    }
  }

  viewMemberHistory(memberId: number): void {
    // Find member data
    const member = this.memberDebtListModal().members.find(m => m.memberId === memberId);
    
    if (member) {
      this.memberHistoryModal.set({
        isOpen: true,
        member: member,
        loading: true
      });
      
      // Load transaction history
      this.loadMemberTransactionHistory(memberId);
    } else {
      console.error('Member not found for history:', memberId);
    }
  }

  loadMemberTransactionHistory(memberId: number): void {
    this.memberCreditService.getCreditHistory(memberId).subscribe({
      next: (transactions) => {
        this.memberTransactionHistory.set(transactions || []);
        this.memberHistoryModal.update(state => ({ ...state, loading: false }));
        console.log('Member transaction history loaded:', transactions);
      },
      error: (error) => {
        console.error('Error loading member transaction history:', error);
        this.memberTransactionHistory.set([]);
        this.memberHistoryModal.update(state => ({ ...state, loading: false }));
      }
    });
  }

  closeMemberHistoryModal(): void {
    this.memberHistoryModal.set({
      isOpen: false,
      member: null,
      loading: false
    });
    this.memberTransactionHistory.set([]);
  }

}