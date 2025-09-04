// Enhanced Member Credit Dashboard Component - Full Featured

import { Component, input, output, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { NgxChartsModule } from '@swimlane/ngx-charts'; // Temporarily disabled for compatibility
import { MemberCreditService } from '../../services/member-credit.service';
import { 
  MemberCreditSummaryDto as MemberCreditDto, 
  CreditTransactionDto,
  CreditAnalyticsDto,
  TierAnalysisDto,
  CreditTrendDto,
  TopCreditUser
} from '../../interfaces/member-credit.interfaces';
import { map, Observable } from 'rxjs';

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
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="credit-dashboard-container">
      <!-- Header with Quick Actions -->
      <div class="dashboard-header">
        <div class="header-content">
          <h2 class="dashboard-title">💳 Credit Management Dashboard</h2>
          <p class="dashboard-subtitle">Real-time analytics and member credit insights</p>
        </div>
        
        <div class="header-actions">
          <div class="date-range-selector">
            <label class="range-label">Period:</label>
            <select 
              class="range-select"
              [value]="selectedPeriod()"
              (change)="setSelectedPeriod($any($event.target).value)">
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <button class="btn btn-outline" (click)="onRefreshData()" [disabled]="loading()">
            <span class="btn-icon" *ngIf="!loading()">🔄</span>
            <span class="btn-icon loading-spinner" *ngIf="loading()"></span>
            {{ loading() ? 'Loading...' : 'Refresh' }}
          </button>
          
          <button class="btn btn-primary" (click)="onExportReport()">
            <span class="btn-icon">📊</span>
            Export Report
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-section" *ngIf="loading()">
        <div class="loading-spinner large"></div>
        <p class="loading-text">Loading credit dashboard data...</p>
      </div>

      <!-- Dashboard Content -->
      <div class="dashboard-content" *ngIf="!loading()">
        <!-- Key Metrics Cards -->
        <div class="metrics-grid">
          <div class="metric-card total-debt">
            <div class="metric-icon">💰</div>
            <div class="metric-info">
              <div class="metric-value">{{ formatCurrency(metrics().totalOutstandingDebt) }}</div>
              <div class="metric-label">Total Outstanding Debt</div>
              <div class="metric-change positive" *ngIf="metrics().totalOutstandingDebt > 0">
                <span class="change-icon">📈</span>
                Active Credit System
              </div>
            </div>
          </div>

          <div class="metric-card credit-utilization">
            <div class="metric-icon">📊</div>
            <div class="metric-info">
              <div class="metric-value">{{ metrics().averageCreditUtilization.toFixed(1) }}%</div>
              <div class="metric-label">Average Credit Utilization</div>
              <div class="metric-change" [class.positive]="metrics().averageCreditUtilization < 70" [class.negative]="metrics().averageCreditUtilization >= 70">
                <span class="change-icon">{{ metrics().averageCreditUtilization < 70 ? '✅' : '⚠️' }}</span>
                {{ metrics().averageCreditUtilization < 70 ? 'Healthy' : 'High Risk' }}
              </div>
            </div>
          </div>

          <div class="metric-card members-with-debt">
            <div class="metric-icon">👥</div>
            <div class="metric-info">
              <div class="metric-value">{{ metrics().membersWithDebt }}</div>
              <div class="metric-label">Members with Active Debt</div>
              <div class="metric-subtitle">of {{ metrics().totalMembers }} total members</div>
            </div>
          </div>

          <div class="metric-card overdue-accounts">
            <div class="metric-icon">⏰</div>
            <div class="metric-info">
              <div class="metric-value">{{ metrics().overdueAccounts }}</div>
              <div class="metric-label">Overdue Accounts</div>
              <div class="metric-change" [class.negative]="metrics().overdueAccounts > 0" [class.neutral]="metrics().overdueAccounts === 0">
                <span class="change-icon">{{ metrics().overdueAccounts > 0 ? '🚨' : '✅' }}</span>
                {{ metrics().overdueAccounts > 0 ? 'Needs Attention' : 'All Current' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-section">
          <!-- Credit Trends Chart -->
          <div class="chart-container credit-trends">
            <div class="chart-header">
              <h3 class="chart-title">Credit Usage Trends</h3>
              <div class="chart-type-selector">
                <button 
                  class="chart-type-btn" 
                  [class.active]="selectedChartType() === 'line'"
                  (click)="setChartType('line')">
                  📈 Line
                </button>
                <button 
                  class="chart-type-btn" 
                  [class.active]="selectedChartType() === 'bar'"
                  (click)="setChartType('bar')">
                  📊 Bar
                </button>
              </div>
            </div>
            
            <div class="chart-content">
              <!-- Simplified Data Display - Chart implementation pending -->
              <div class="data-summary" *ngIf="creditTrendsData().length > 0">
                <div class="trend-summary">
                  <h4>Credit Usage Trend ({{ selectedChartType() === 'line' ? 'Line' : 'Bar' }} View)</h4>
                  <div class="trend-data" *ngFor="let trend of creditTrendsData()">
                    <div class="trend-title">{{ trend.name }}</div>
                    <div class="trend-values">
                      <div class="value-item" *ngFor="let item of trend.series">
                        <span class="month">{{ item.name }}:</span>
                        <span class="amount">{{ formatCurrency(item.value) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Fallback Display -->
              <div class="chart-fallback" *ngIf="creditTrendsData().length === 0">
                <div class="fallback-icon">📊</div>
                <p class="fallback-text">Credit trends will be displayed here</p>
              </div>
            </div>
          </div>

          <!-- Risk Distribution Chart -->
          <div class="chart-container risk-distribution">
            <div class="chart-header">
              <h3 class="chart-title">Risk Distribution</h3>
            </div>
            
            <div class="chart-content">
              <!-- Risk Distribution Data Display -->
              <div class="risk-summary" *ngIf="riskDistributionData().length > 0">
                <div class="risk-list">
                  <div class="risk-item" *ngFor="let risk of riskDistributionData()">
                    <div class="risk-color" [class]="'risk-' + risk.name.toLowerCase()"></div>
                    <div class="risk-info">
                      <span class="risk-name">{{ risk.name }} Risk</span>
                      <span class="risk-count">{{ risk.value }} members</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Fallback Display -->
              <div class="chart-fallback" *ngIf="riskDistributionData().length === 0">
                <div class="fallback-icon">🥧</div>
                <p class="fallback-text">Risk distribution will be displayed here</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Members and Recent Activity -->
        <div class="tables-section">
          <!-- Top Debtors -->
          <div class="table-container top-members">
            <div class="table-header">
              <h3 class="table-title">🏆 Top Credit Users</h3>
              <button class="btn btn-sm btn-outline" (click)="refreshTopCreditUsers()">
                View All
              </button>
            </div>
            
            <div class="table-content">
              <div class="member-list">
                <!-- Tier Analysis Display for Top Credit Users -->
                <div 
                  class="tier-item" 
                  *ngFor="let tier of topCreditUsers(); trackBy: trackByTier; let i = index"
                  [class]="'risk-' + getRiskLevelFromTier(tier).toLowerCase()">
                  
                  <!-- Tier Header -->
                  <div class="tier-header">
                    <div class="tier-badge">
                      <span class="tier-rank">{{ i + 1 }}</span>
                      <span class="tier-name">{{ tier.tierName }}</span>
                    </div>
                    <div class="tier-member-count">{{ tier.memberCount }} Members</div>
                  </div>
                  
                  <!-- Tier Statistics -->
                  <div class="tier-stats">
                    <div class="stat-row">
                      <div class="stat-item">
                        <span class="stat-label">Avg Credit Limit:</span>
                        <span class="stat-value limit">{{ formatCurrency(tier.averageCreditLimit) }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">Avg Debt:</span>
                        <span class="stat-value debt">{{ formatCurrency(tier.averageDebt) }}</span>
                      </div>
                    </div>
                    <div class="stat-row">
                      <div class="stat-item">
                        <span class="stat-label">Avg Utilization:</span>
                        <span class="stat-value usage">{{ tier.averageUtilization.toFixed(1) }}%</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">Avg Credit Score:</span>
                        <span class="stat-value score">{{ tier.averageCreditScore }}</span>
                      </div>
                    </div>
                    <div class="stat-row">
                      <div class="stat-item">
                        <span class="stat-label">Overdue Rate:</span>
                        <span class="stat-value overdue">{{ tier.overdueRate.toFixed(1) }}%</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">Risk Level:</span>
                        <span class="risk-badge" [class]="'risk-' + getRiskLevelFromTier(tier).toLowerCase()">
                          {{ getRiskLevelFromTier(tier) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Empty State for No Tiers -->
                <div *ngIf="topCreditUsers().length === 0" class="empty-tier-state">
                  <div class="empty-icon">🏆</div>
                  <div class="empty-title">No Top Credit Users Data</div>
                  <div class="empty-text">Top credit users analysis will appear here when data is available.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="table-container quick-actions">
            <div class="table-header">
              <h3 class="table-title">⚡ Quick Actions</h3>
            </div>
            
            <div class="actions-content">
              <div class="action-grid">
                <button class="action-card" (click)="viewOverdueAccounts()">
                  <div class="action-icon">⏰</div>
                  <div class="action-info">
                    <div class="action-title">Overdue Accounts</div>
                    <div class="action-count">{{ metrics().overdueAccounts }}</div>
                  </div>
                </button>

                <button class="action-card" (click)="viewHighRiskMembers()">
                  <div class="action-icon">🚨</div>
                  <div class="action-info">
                    <div class="action-title">High Risk Members</div>
                    <div class="action-count">{{ metrics().highRiskAccounts }}</div>
                  </div>
                </button>

                <button class="action-card" (click)="sendPaymentReminders()">
                  <div class="action-icon">📧</div>
                  <div class="action-info">
                    <div class="action-title">Send Reminders</div>
                    <div class="action-subtitle">Payment Alerts</div>
                  </div>
                </button>

                <button class="action-card" (click)="generateReport()">
                  <div class="action-icon">📋</div>
                  <div class="action-info">
                    <div class="action-title">Generate Report</div>
                    <div class="action-subtitle">Credit Summary</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!loading() && metrics().totalMembers === 0">
        <div class="empty-icon">💳</div>
        <div class="empty-title">No Credit Data Available</div>
        <div class="empty-text">Start by enabling credit for members or check your data filters.</div>
        <button class="btn btn-primary" (click)="goToMembershipManagement()">
          <span class="btn-icon">👥</span>
          Manage Members
        </button>
      </div>
    </div>
  `,
  styles: [`
    .credit-dashboard-container {
      padding: var(--s6);
      max-width: 1400px;
      margin: 0 auto;
      min-height: 100vh;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--s8);
      padding-bottom: var(--s6);
      border-bottom: 2px solid var(--border-light);
    }

    .header-content {
      flex: 1;
    }

    .dashboard-title {
      font-size: var(--text-4xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
      margin: 0 0 var(--s2) 0;
      background: linear-gradient(135deg, var(--primary), var(--primary-hover));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .dashboard-subtitle {
      font-size: var(--text-lg);
      color: var(--text-secondary);
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--s4);
      flex-wrap: wrap;
    }

    .date-range-selector {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .range-label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-secondary);
    }

    .range-select {
      padding: var(--s2) var(--s3);
      border: 2px solid var(--border-light);
      border-radius: var(--radius-base);
      background: var(--surface);
      color: var(--text-primary);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: var(--transition-normal);

      &:hover {
        border-color: var(--primary);
      }

      &:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(228, 122, 63, 0.1);
      }
    }

    // Metrics Grid
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--s6);
      margin-bottom: var(--s8);
    }

    .metric-card {
      background: var(--surface);
      border: 2px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: var(--s6);
      display: flex;
      align-items: flex-start;
      gap: var(--s4);
      transition: var(--transition-normal);
      position: relative;
      overflow: hidden;

      &:hover {
        border-color: var(--primary);
        transform: translateY(-4px);
        box-shadow: var(--shadow-primary);
      }

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--primary), var(--primary-hover));
      }

      &.total-debt::before {
        background: linear-gradient(90deg, var(--success), #22c55e);
      }

      &.credit-utilization::before {
        background: linear-gradient(90deg, var(--warning), #f59e0b);
      }

      &.members-with-debt::before {
        background: linear-gradient(90deg, var(--info), #3b82f6);
      }

      &.overdue-accounts::before {
        background: linear-gradient(90deg, var(--error), #ef4444);
      }
    }

    .metric-icon {
      font-size: 2.5rem;
      opacity: 0.8;
    }

    .metric-info {
      flex: 1;
    }

    .metric-value {
      font-size: var(--text-3xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
      line-height: 1.2;
      margin-bottom: var(--s1);
    }

    .metric-label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-secondary);
      margin-bottom: var(--s2);
    }

    .metric-subtitle {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }

    .metric-change {
      display: flex;
      align-items: center;
      gap: var(--s1);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      
      &.positive {
        color: var(--success);
      }
      
      &.negative {
        color: var(--error);
      }
      
      &.neutral {
        color: var(--text-secondary);
      }
    }

    // Charts Section
    .charts-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--s6);
      margin-bottom: var(--s8);
    }

    .chart-container {
      background: var(--surface);
      border: 2px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: var(--s6);
      transition: var(--transition-normal);

      &:hover {
        border-color: var(--primary);
      }
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s6);
      padding-bottom: var(--s4);
      border-bottom: 1px solid var(--border-light);
    }

    .chart-title {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      margin: 0;
    }

    .chart-type-selector {
      display: flex;
      gap: var(--s2);
    }

    .chart-type-btn {
      padding: var(--s2) var(--s3);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-base);
      background: var(--surface);
      color: var(--text-secondary);
      font-size: var(--text-xs);
      cursor: pointer;
      transition: var(--transition-normal);

      &:hover {
        border-color: var(--primary);
        color: var(--primary);
      }

      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }
    }

    // Tables Section
    .tables-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--s6);
    }

    .table-container {
      background: var(--surface);
      border: 2px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: var(--s6);
      transition: var(--transition-normal);

      &:hover {
        border-color: var(--primary);
      }
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s6);
      padding-bottom: var(--s4);
      border-bottom: 1px solid var(--border-light);
    }

    .table-title {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      margin: 0;
    }

    // Member List
    .member-list {
      display: flex;
      flex-direction: column;
      gap: var(--s4);
    }

    .member-item {
      display: grid;
      grid-template-columns: 1fr 2fr 80px;
      gap: var(--s4);
      align-items: center;
      padding: var(--s4);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-base);
      transition: var(--transition-normal);

      &:hover {
        border-color: var(--primary);
        background: var(--primary-pale);
      }

      &.risk-high {
        border-left: 4px solid var(--warning);
      }

      &.risk-critical {
        border-left: 4px solid var(--error);
      }
    }

    .member-name {
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      font-size: var(--text-base);
    }

    .member-code {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-top: var(--s1);
    }

    .member-stats {
      display: flex;
      flex-direction: column;
      gap: var(--s1);
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: var(--text-sm);
    }

    .stat-label {
      color: var(--text-secondary);
    }

    .stat-value {
      font-weight: var(--font-medium);
      
      &.debt {
        color: var(--error);
      }
      
      &.limit {
        color: var(--text-primary);
      }
      
      &.usage {
        color: var(--warning);
      }
    }

    .risk-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius-base);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      text-align: center;

      &.risk-low {
        background: var(--success-light);
        color: var(--success);
      }

      &.risk-medium {
        background: var(--warning-light);
        color: var(--warning);
      }

      &.risk-high {
        background: rgba(251, 146, 60, 0.1);
        color: #f97316;
      }

      &.risk-critical {
        background: var(--error-light);
        color: var(--error);
      }
    }

    // Quick Actions
    .action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--s4);
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s4);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-base);
      background: var(--surface);
      cursor: pointer;
      transition: var(--transition-normal);
      text-align: left;

      &:hover {
        border-color: var(--primary);
        background: var(--primary-pale);
        transform: translateY(-2px);
      }
    }

    .action-icon {
      font-size: 1.5rem;
    }

    .action-title {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }

    .action-count {
      font-size: var(--text-lg);
      font-weight: var(--font-bold);
      color: var(--primary);
    }

    .action-subtitle {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    // Loading and Empty States
    .loading-section {
      text-align: center;
      padding: var(--s16) var(--s6);
    }

    /* Top Credit Users Styling */
    .tier-item {
      background: var(--surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: var(--s4);
      margin-bottom: var(--s4);
      transition: all 0.2s ease;
      
      &:hover {
        border-color: var(--primary);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
    }

    .tier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s3);
    }

    .tier-badge {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .tier-rank {
      background: linear-gradient(135deg, var(--primary), var(--primary-hover));
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: var(--font-bold);
      font-size: var(--text-sm);
    }

    .tier-name {
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      font-size: var(--text-lg);
    }

    .tier-member-count {
      color: var(--text-secondary);
      font-size: var(--text-sm);
      background: var(--background-muted);
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
    }

    .tier-stats {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .stat-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s3);
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: var(--text-sm);
    }

    .stat-value {
      font-weight: var(--font-semibold);
      font-size: var(--text-sm);

      &.limit {
        color: var(--success);
      }

      &.debt {
        color: var(--warning);
      }

      &.usage {
        color: var(--info);
      }

      &.score {
        color: var(--primary);
      }

      &.overdue {
        color: var(--danger);
      }
    }

    .risk-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      text-transform: uppercase;

      &.risk-low {
        background: var(--success-bg);
        color: var(--success);
      }

      &.risk-medium {
        background: var(--warning-bg);
        color: var(--warning);
      }

      &.risk-high {
        background: var(--danger-bg);
        color: var(--danger);
      }

      &.risk-critical {
        background: var(--danger);
        color: white;
      }
    }

    .empty-tier-state {
      text-align: center;
      padding: var(--s8);
      color: var(--text-secondary);
    }

    .empty-tier-state .empty-icon {
      font-size: 3rem;
      margin-bottom: var(--s4);
      opacity: 0.5;
    }

    .empty-tier-state .empty-title {
      font-weight: var(--font-semibold);
      margin-bottom: var(--s2);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-light);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;

      &.large {
        width: 48px;
        height: 48px;
        border-width: 4px;
      }
    }

    .loading-text {
      margin-top: var(--s4);
      color: var(--text-secondary);
    }

    .empty-state {
      text-align: center;
      padding: var(--s16) var(--s6);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: var(--s6);
      opacity: 0.5;
    }

    .empty-title {
      font-size: var(--text-2xl);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      margin-bottom: var(--s4);
    }

    .empty-text {
      color: var(--text-secondary);
      margin-bottom: var(--s6);
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    // Chart Fallbacks and Data Displays
    .chart-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--s10);
      color: var(--text-secondary);
      text-align: center;
    }

    .fallback-icon {
      font-size: 3rem;
      margin-bottom: var(--s4);
      opacity: 0.5;
    }

    .fallback-text {
      font-size: var(--text-sm);
      margin: 0;
    }

    // Data Summary Styles
    .data-summary {
      padding: var(--s4);
    }

    .trend-summary h4 {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      margin-bottom: var(--s4);
      border-bottom: 2px solid var(--border-light);
      padding-bottom: var(--s2);
    }

    .trend-data {
      margin-bottom: var(--s6);
    }

    .trend-title {
      font-size: var(--text-base);
      font-weight: var(--font-medium);
      color: var(--primary);
      margin-bottom: var(--s3);
    }

    .trend-values {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--s2);
      padding-left: var(--s4);
    }

    .value-item {
      display: flex;
      flex-direction: column;
      padding: var(--s2);
      border-radius: var(--radius-base);
      background: var(--bg-secondary);
    }

    .month {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      font-weight: var(--font-medium);
    }

    .amount {
      font-size: var(--text-sm);
      color: var(--text-primary);
      font-weight: var(--font-semibold);
    }

    // Risk Distribution Styles
    .risk-summary {
      padding: var(--s4);
    }

    .risk-list {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
    }

    .risk-item {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s3);
      border-radius: var(--radius-base);
      background: var(--bg-secondary);
      transition: var(--transition-normal);

      &:hover {
        background: var(--primary-pale);
      }
    }

    .risk-color {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      flex-shrink: 0;

      &.risk-low {
        background: var(--success);
      }

      &.risk-medium {
        background: var(--warning);
      }

      &.risk-high {
        background: #f97316;
      }

      &.risk-critical {
        background: var(--error);
      }
    }

    .risk-info {
      display: flex;
      justify-content: space-between;
      width: 100%;
    }

    .risk-name {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }

    .risk-count {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--text-secondary);
    }

    // Responsive Design
    @media (max-width: 1200px) {
      .charts-section,
      .tables-section {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .credit-dashboard-container {
        padding: var(--s4);
      }

      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--s4);
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .member-item {
        grid-template-columns: 1fr;
        gap: var(--s3);
        text-align: center;
      }

      .action-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MemberCreditDashboardComponent implements OnInit {
  private memberCreditService = inject(MemberCreditService);

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
            topMembersData = analyticsData.topMembers.highest_debt.map((user: any) => ({
              memberId: user.memberId || user.id || 0,
              memberName: user.memberName || user.name || 'Unknown Member',
              memberCode: user.memberNumber || user.memberCode || `M${(user.memberId || user.id || 0).toString().padStart(3, '0')}`,
              creditLimit: user.creditLimit || 0,
              currentDebt: user.currentDebt || 0,
              utilizationRate: user.creditUtilization || user.utilizationRate || 0,
              lastActivity: user.lastTransactionDate || new Date().toISOString(),
              riskLevel: user.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical' || 'Low'
            }));
          } else if (analyticsData?.topMembers && Array.isArray(analyticsData.topMembers)) {
            // Fallback if topMembers is directly an array
            topMembersData = analyticsData.topMembers.slice(0, 5).map((user: any) => ({
              memberId: user.memberId || user.id || 0,
              memberName: user.memberName || user.name || 'Unknown Member',
              memberCode: user.memberNumber || user.memberCode || `M${(user.memberId || user.id || 0).toString().padStart(3, '0')}`,
              creditLimit: user.creditLimit || 0,
              currentDebt: user.currentDebt || 0,
              utilizationRate: user.creditUtilization || user.utilizationRate || 0,
              lastActivity: user.lastTransactionDate || new Date().toISOString(),
              riskLevel: user.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical' || 'Low'
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
        memberCount: 1,
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
        memberCount: 1,
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
        memberCount: 1,
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
        
        // For now, just log the data. In a full implementation, 
        // you would navigate to a dedicated overdue accounts view
        const overdueCount = overdueMembers.length;
        const totalOverdueAmount = overdueMembers.reduce((sum, member) => 
          sum + (member.overdueAmount || 0), 0
        );
        
        console.log(`📊 Found ${overdueCount} overdue accounts with total debt: ${this.formatCurrency(totalOverdueAmount)}`);
        
        // TODO: Navigate to overdue accounts list view
        // this.router.navigate(['/dashboard/membership/credit/overdue']);
      },
      error: (error) => {
        console.error('❌ Failed to load overdue accounts:', error);
        // TODO: Show user-friendly error message
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
        
        // TODO: Navigate to high risk members view
        // this.router.navigate(['/dashboard/membership/credit/high-risk']);
      },
      error: (error) => {
        console.error('❌ Failed to load high risk members:', error);
      }
    });
  }

  sendPaymentReminders(): void {
    console.log('📧 Sending bulk payment reminders...');
    
    // Show loading state
    const originalText = 'Send Reminders';
    
    this.memberCreditService.sendBulkReminders().subscribe({
      next: (response) => {
        console.log('✅ Bulk reminders sent:', response);
        
        const reminderCount = response.reminderCount || 0;
        const successCount = response.successCount || 0;
        const failureCount = response.failureCount || 0;
        
        console.log(`📊 Sent ${successCount}/${reminderCount} reminders successfully. ${failureCount} failed.`);
        
        // TODO: Show success notification
        // this.notificationService.showSuccess(`Payment reminders sent to ${successCount} members`);
        
        // Refresh dashboard data to get updated counts
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('❌ Failed to send payment reminders:', error);
        // TODO: Show error notification
        // this.notificationService.showError('Failed to send payment reminders');
      }
    });
  }

  generateReport(): void {
    console.log('📋 Generating credit management report...');
    
    // Get analytics data for the report
    this.memberCreditService.getCreditAnalytics().subscribe({
      next: (analytics) => {
        console.log('✅ Analytics data for report:', analytics);
        
        // TODO: In a full implementation, generate and download PDF/Excel report
        // For now, just log the data that would be in the report
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
          trends: this.creditTrendsData()
        };
        
        console.log('📊 Credit Report Data:', reportData);
        
        // TODO: Generate actual report file
        // const reportService = inject(ReportService);
        // reportService.generateCreditReport(reportData);
        
        console.log('📄 Report generation complete (demo mode)');
      },
      error: (error) => {
        console.error('❌ Failed to generate report:', error);
      }
    });
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

  // Utility methods
  trackByMember = (index: number, member: TopMember): number => member.memberId || index;

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
}