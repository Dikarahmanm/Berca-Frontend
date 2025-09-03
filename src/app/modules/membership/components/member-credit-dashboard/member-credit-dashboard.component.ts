// Enhanced Member Credit Dashboard Component - Full Featured

import { Component, input, output, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { NgxChartsModule } from '@swimlane/ngx-charts'; // Temporarily disabled for compatibility
import { MemberCreditService } from '../../services/member-credit.service';
import { 
  MemberCreditSummaryDto as MemberCreditDto, 
  CreditTransactionDto,
  CreditAnalyticsDto 
} from '../../interfaces/member-credit.interfaces';

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
  memberId: number;
  memberName: string;
  memberCode: string;
  creditLimit: number;
  currentDebt: number;
  utilizationRate: number;
  lastActivity: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
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
              <button class="btn btn-sm btn-outline" (click)="viewAllMembers()">
                View All
              </button>
            </div>
            
            <div class="table-content">
              <div class="member-list">
                <div 
                  class="member-item" 
                  *ngFor="let member of topMembers(); trackBy: trackByMember"
                  [class]="'risk-' + member.riskLevel.toLowerCase()">
                  <div class="member-info">
                    <div class="member-name">{{ member.memberName }}</div>
                    <div class="member-code">{{ member.memberCode }}</div>
                  </div>
                  <div class="member-stats">
                    <div class="stat-item">
                      <span class="stat-label">Debt:</span>
                      <span class="stat-value debt">{{ formatCurrency(member.currentDebt) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Limit:</span>
                      <span class="stat-value limit">{{ formatCurrency(member.creditLimit) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Usage:</span>
                      <span class="stat-value usage">{{ member.utilizationRate.toFixed(1) }}%</span>
                    </div>
                  </div>
                  <div class="member-risk">
                    <span class="risk-badge" [class]="'risk-' + member.riskLevel.toLowerCase()">
                      {{ member.riskLevel }}
                    </span>
                  </div>
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
      // Load all dashboard data in parallel
      const [metricsData, trendsData, topMembersData] = await Promise.all([
        this.loadMetrics(),
        this.loadCreditTrends(),
        this.loadTopMembers()
      ]);

      // Update risk distribution based on loaded data
      this.updateRiskDistribution();
      
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      this.error.set('Failed to load dashboard data');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      // Simulate API call - replace with actual service call
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
      
      this.metrics.set(mockMetrics);
    } catch (error) {
      throw new Error('Failed to load metrics');
    }
  }

  private async loadCreditTrends(): Promise<void> {
    try {
      // Simulate API call - replace with actual service call
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
      
      this.creditTrendsData.set(mockTrends);
    } catch (error) {
      throw new Error('Failed to load credit trends');
    }
  }

  private async loadTopMembers(): Promise<void> {
    try {
      // Simulate API call - replace with actual service call
      const mockMembers: TopMember[] = [
        {
          memberId: 1,
          memberName: 'John Doe',
          memberCode: 'M001',
          creditLimit: 2000000,
          currentDebt: 1500000,
          utilizationRate: 75.0,
          lastActivity: '2024-12-01',
          riskLevel: 'High'
        },
        {
          memberId: 2,
          memberName: 'Jane Smith',
          memberCode: 'M002',
          creditLimit: 1500000,
          currentDebt: 800000,
          utilizationRate: 53.3,
          lastActivity: '2024-12-02',
          riskLevel: 'Medium'
        },
        {
          memberId: 3,
          memberName: 'Bob Wilson',
          memberCode: 'M003',
          creditLimit: 1000000,
          currentDebt: 950000,
          utilizationRate: 95.0,
          lastActivity: '2024-11-28',
          riskLevel: 'Critical'
        }
      ];
      
      this.topMembers.set(mockMembers);
    } catch (error) {
      throw new Error('Failed to load top members');
    }
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
    console.log('View overdue accounts');
  }

  viewHighRiskMembers(): void {
    console.log('View high risk members');
  }

  sendPaymentReminders(): void {
    console.log('Send payment reminders');
  }

  generateReport(): void {
    console.log('Generate report');
  }

  goToMembershipManagement(): void {
    console.log('Navigate to membership management');
  }

  // Utility methods
  trackByMember = (index: number, member: TopMember): number => member.memberId;

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}