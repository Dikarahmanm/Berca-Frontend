import { Component, input, output, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
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
  month: string;
  creditUsage: number;
  paymentAmount: number;
  newDebt: number;
  netChange: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
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
  imports: [CommonModule, FormsModule, NgxChartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="credit-dashboard-container">
      <!-- Header with Quick Actions -->
      <div class="dashboard-header">
        <div class="header-content">
          <h2 class="dashboard-title">Credit Management Dashboard</h2>
          <p class="dashboard-subtitle">Real-time analytics and member credit insights</p>
        </div>
        
        <div class="header-actions">
          <div class="date-range-selector">
            <label class="range-label">Periode:</label>
            <select 
              class="range-select"
              [value]="selectedPeriod()"
              (change)="setSelectedPeriod($any($event.target).value)">
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
              <option value="90d">90 Hari Terakhir</option>
              <option value="1y">1 Tahun Terakhir</option>
              <option value="all">Semua Periode</option>
            </select>
          </div>
          
          <button class="btn btn-outline" (click)="onRefreshData()">
            🔄 Refresh
          </button>
          
          <button class="btn btn-primary" (click)="onExportReport()">
            📊 Export Laporan
          </button>
        </div>
      </div>

      <!-- Key Metrics Cards -->
      @if (creditMetrics()) {
      <div class="metrics-grid">
        <div class="metric-card primary">
          <div class="metric-header">
            <div class="metric-icon">👥</div>
            <div class="metric-trend" [class.positive]="getGrowthTrend('members') > 0" [class.negative]="getGrowthTrend('members') < 0">
              {{ formatTrend(getGrowthTrend('members')) }}
            </div>
          </div>
          <div class="metric-body">
            <div class="metric-value">{{ creditMetrics()!.totalMembers.toLocaleString() }}</div>
            <div class="metric-label">Total Members</div>
          </div>
        </div>

        <div class="metric-card success">
          <div class="metric-header">
            <div class="metric-icon">💰</div>
            <div class="metric-trend" [class.positive]="getGrowthTrend('limit') > 0" [class.negative]="getGrowthTrend('limit') < 0">
              {{ formatTrend(getGrowthTrend('limit')) }}
            </div>
          </div>
          <div class="metric-body">
            <div class="metric-value">{{ formatCurrency(creditMetrics()!.totalCreditLimit) }}</div>
            <div class="metric-label">Total Credit Limit</div>
          </div>
        </div>

        <div class="metric-card warning">
          <div class="metric-header">
            <div class="metric-icon">📈</div>
            <div class="metric-trend" [class.positive]="getGrowthTrend('debt') < 0" [class.negative]="getGrowthTrend('debt') > 0">
              {{ formatTrend(getGrowthTrend('debt')) }}
            </div>
          </div>
          <div class="metric-body">
            <div class="metric-value">{{ formatCurrency(creditMetrics()!.totalOutstandingDebt) }}</div>
            <div class="metric-label">Outstanding Debt</div>
          </div>
        </div>

        <div class="metric-card info">
          <div class="metric-header">
            <div class="metric-icon">🎯</div>
            <div class="utilization-indicator">
              <div class="utilization-bar">
                <div class="utilization-fill" [style.width.%]="creditUtilizationPercentage()"></div>
              </div>
              <span class="utilization-text">{{ creditUtilizationPercentage() }}%</span>
            </div>
          </div>
          <div class="metric-body">
            <div class="metric-value">{{ formatCurrency(creditMetrics()!.totalAvailableCredit) }}</div>
            <div class="metric-label">Available Credit</div>
          </div>
        </div>
      </div>
      }

      <!-- Risk Analysis & Alerts -->
      <div class="risk-analysis-section">
        <div class="section-header">
          <h3 class="section-title">Risk Analysis & Alerts</h3>
          <div class="risk-filters">
            <button 
              class="risk-filter-btn" 
              [class.active]="selectedRiskFilter() === 'all'"
              (click)="setRiskFilter('all')">
              All
            </button>
            <button 
              class="risk-filter-btn critical" 
              [class.active]="selectedRiskFilter() === 'critical'"
              (click)="setRiskFilter('critical')">
              Critical ({{ riskDistribution().critical }})
            </button>
            <button 
              class="risk-filter-btn high" 
              [class.active]="selectedRiskFilter() === 'high'"
              (click)="setRiskFilter('high')">
              High ({{ riskDistribution().high }})
            </button>
            <button 
              class="risk-filter-btn medium" 
              [class.active]="selectedRiskFilter() === 'medium'"
              (click)="setRiskFilter('medium')">
              Medium ({{ riskDistribution().medium }})
            </button>
          </div>
        </div>

        <div class="risk-content">
          <!-- Risk Distribution Chart -->
          <div class="risk-chart-container">
            <div class="risk-chart">
              <div class="risk-segment critical" 
                   [style.width.%]="getRiskPercentage('critical')"
                   title="Critical Risk: {{ riskDistribution().critical }} members">
              </div>
              <div class="risk-segment high" 
                   [style.width.%]="getRiskPercentage('high')"
                   title="High Risk: {{ riskDistribution().high }} members">
              </div>
              <div class="risk-segment medium" 
                   [style.width.%]="getRiskPercentage('medium')"
                   title="Medium Risk: {{ riskDistribution().medium }} members">
              </div>
              <div class="risk-segment low" 
                   [style.width.%]="getRiskPercentage('low')"
                   title="Low Risk: {{ riskDistribution().low }} members">
              </div>
            </div>
            
            <div class="risk-legend">
              <div class="legend-item">
                <div class="legend-color low"></div>
                <span class="legend-text">Low Risk ({{ riskDistribution().low }})</span>
              </div>
              <div class="legend-item">
                <div class="legend-color medium"></div>
                <span class="legend-text">Medium Risk ({{ riskDistribution().medium }})</span>
              </div>
              <div class="legend-item">
                <div class="legend-color high"></div>
                <span class="legend-text">High Risk ({{ riskDistribution().high }})</span>
              </div>
              <div class="legend-item">
                <div class="legend-color critical"></div>
                <span class="legend-text">Critical Risk ({{ riskDistribution().critical }})</span>
              </div>
            </div>
          </div>

          <!-- High Priority Alerts -->
          @if (criticalAlerts().length > 0) {
          <div class="alerts-container">
            <h4 class="alerts-title">🚨 Critical Alerts</h4>
            <div class="alerts-list">
              @for (alert of criticalAlerts(); track alert.id) {
              <div class="alert-item" [class]="alert.severity">
                <div class="alert-icon">{{ getAlertIcon(alert.type) }}</div>
                <div class="alert-content">
                  <div class="alert-title">{{ alert.title }}</div>
                  <div class="alert-message">{{ alert.message }}</div>
                  <div class="alert-time">{{ formatRelativeTime(alert.createdAt) }}</div>
                </div>
                <div class="alert-actions">
                  <button class="alert-action-btn" (click)="viewAlertDetail(alert)">View</button>
                  <button class="alert-action-btn" (click)="dismissAlert(alert)">Dismiss</button>
                </div>
              </div>
              }
            </div>
          </div>
          }
        </div>
      </div>

      <!-- Credit Trends Analysis -->
      <div class="trends-section">
        <div class="section-header">
          <h3 class="section-title">Credit Trends Analysis</h3>
          <div class="chart-type-selector">
            <button 
              class="chart-type-btn"
              [class.active]="chartType() === 'line'"
              (click)="setChartType('line')">
              📈 Line Chart
            </button>
            <button 
              class="chart-type-btn"
              [class.active]="chartType() === 'bar'"
              (click)="setChartType('bar')">
              📊 Bar Chart
            </button>
          </div>
        </div>

        <div class="trends-chart-container">
          @if (chartType() === 'line') {
          <div class="line-chart">
            <div class="chart-grid">
              @for (trend of creditTrends(); track $index) {
              <div class="chart-point" 
                   [style.left.%]="($index / (creditTrends().length - 1)) * 100"
                   [style.bottom.%]="getChartPointHeight(trend.netChange)"
                   [title]="getChartTooltip(trend)">
                <div class="point-marker" [class.positive]="trend.netChange >= 0" [class.negative]="trend.netChange < 0"></div>
              </div>
              }
            </div>
            <div class="chart-labels">
              @for (trend of creditTrends(); track $index) {
              <div class="chart-label">{{ trend.month }}</div>
              }
            </div>
          </div>
          } @else {
          <div class="bar-chart">
            @for (trend of creditTrends(); track $index) {
            <div class="bar-group">
              <div class="bar-container">
                <div class="bar credit-usage" 
                     [style.height.%]="getBarHeight(trend.creditUsage)"
                     title="Credit Usage: {{ formatCurrency(trend.creditUsage) }}">
                </div>
                <div class="bar payments" 
                     [style.height.%]="getBarHeight(trend.paymentAmount)"
                     title="Payments: {{ formatCurrency(trend.paymentAmount) }}">
                </div>
                <div class="bar new-debt" 
                     [style.height.%]="getBarHeight(trend.newDebt)"
                     title="New Debt: {{ formatCurrency(trend.newDebt) }}">
                </div>
              </div>
              <div class="bar-label">{{ trend.month }}</div>
            </div>
            }
          </div>
          }

          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color credit-usage"></div>
              <span>Credit Usage</span>
            </div>
            <div class="legend-item">
              <div class="legend-color payments"></div>
              <span>Payments</span>
            </div>
            <div class="legend-item">
              <div class="legend-color new-debt"></div>
              <span>New Debt</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Members Analysis -->
      <div class="top-members-section">
        <div class="section-header">
          <h3 class="section-title">Member Performance Analysis</h3>
          <div class="members-filter">
            <select 
              class="members-filter-select"
              [value]="selectedMemberSort()"
              (change)="setMemberSort($any($event.target).value)">
              <option value="debt">Highest Debt</option>
              <option value="utilization">Highest Utilization</option>
              <option value="limit">Highest Limit</option>
              <option value="risk">Highest Risk</option>
              <option value="activity">Most Active</option>
            </select>
          </div>
        </div>

        <div class="members-grid">
          @for (member of topMembers(); track member.memberId) {
          <div class="member-card" [class]="member.riskLevel.toLowerCase()">
            <div class="member-header">
              <div class="member-avatar">
                <span class="avatar-initial">{{ getInitials(member.memberName) }}</span>
              </div>
              <div class="member-info">
                <div class="member-name">{{ member.memberName }}</div>
                <div class="member-code">{{ member.memberCode }}</div>
              </div>
              <div class="risk-badge" [class]="member.riskLevel.toLowerCase()">
                {{ member.riskLevel }}
              </div>
            </div>

            <div class="member-metrics">
              <div class="metric-row">
                <span class="metric-label">Credit Limit:</span>
                <span class="metric-value">{{ formatCurrency(member.creditLimit) }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Current Debt:</span>
                <span class="metric-value debt">{{ formatCurrency(member.currentDebt) }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Available:</span>
                <span class="metric-value available">{{ formatCurrency(member.creditLimit - member.currentDebt) }}</span>
              </div>
            </div>

            <div class="utilization-display">
              <div class="utilization-label">Utilization: {{ member.utilizationRate }}%</div>
              <div class="utilization-bar">
                <div class="utilization-fill" 
                     [style.width.%]="member.utilizationRate"
                     [class.warning]="member.utilizationRate >= 80"
                     [class.danger]="member.utilizationRate >= 95">
                </div>
              </div>
            </div>

            <div class="member-activity">
              <div class="activity-info">
                <span class="activity-label">Last Activity:</span>
                <span class="activity-value">{{ formatRelativeTime(member.lastActivity) }}</span>
              </div>
            </div>

            <div class="member-actions">
              <button class="btn btn-sm btn-outline" (click)="viewMemberDetail(member)">
                👁️ View
              </button>
              <button class="btn btn-sm btn-outline" (click)="viewMemberTransactions(member)">
                📋 History
              </button>
              @if (member.riskLevel === 'Critical' || member.riskLevel === 'High') {
              <button class="btn btn-sm btn-warning" (click)="contactMember(member)">
                📞 Contact
              </button>
              }
            </div>
          </div>
          }
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading dashboard data...</p>
      </div>
      }

      <!-- Error State -->
      @if (error()) {
      <div class="error-container">
        <div class="error-card">
          <span class="error-icon">⚠️</span>
          <div class="error-content">
            <div class="error-title">Failed to Load Dashboard</div>
            <div class="error-message">{{ error() }}</div>
          </div>
        </div>
        <button class="btn btn-primary" (click)="onRefreshData()">Try Again</button>
      </div>
      }
    </div>
  `,
  styles: [`
    .credit-dashboard-container {
      padding: var(--s4);
      max-width: 1400px;
      margin: 0 auto;
      min-height: 100vh;
      background: var(--bg);
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s6);
      padding: var(--s6);
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-xl);
    }

    .dashboard-title {
      font-size: var(--text-3xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0;
    }

    .dashboard-subtitle {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: var(--s1) 0 0 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--s4);
    }

    .date-range-selector {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .range-label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text);
    }

    .range-select, .members-filter-select {
      padding: var(--s2) var(--s3);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font-size: var(--text-sm);

      &:focus {
        outline: none;
        border-color: var(--primary);
      }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--s4);
      margin-bottom: var(--s6);
    }

    .metric-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s4);
      transition: var(--transition);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--border);
      }

      &.primary::before {
        background: var(--primary);
      }

      &.success::before {
        background: var(--success);
      }

      &.warning::before {
        background: var(--warning);
      }

      &.info::before {
        background: var(--info);
      }

      &:hover {
        transform: translateY(-2px);
        border-color: var(--primary);
      }
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s3);
    }

    .metric-icon {
      font-size: var(--text-2xl);
      opacity: 0.8;
    }

    .metric-trend {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);

      &.positive {
        background: rgba(82, 165, 115, 0.1);
        color: var(--success);
      }

      &.negative {
        background: rgba(212, 74, 63, 0.1);
        color: var(--error);
      }
    }

    .metric-value {
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin-bottom: var(--s1);
    }

    .metric-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .utilization-indicator {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .utilization-bar {
      width: 80px;
      height: 8px;
      background: var(--bg-secondary);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .utilization-fill {
      height: 100%;
      background: var(--info);
      transition: var(--transition);

      &.warning {
        background: var(--warning);
      }

      &.danger {
        background: var(--error);
      }
    }

    .utilization-text {
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      color: var(--text-secondary);
    }

    .risk-analysis-section, .trends-section, .top-members-section {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-xl);
      padding: var(--s6);
      margin-bottom: var(--s6);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s4);
      padding-bottom: var(--s3);
      border-bottom: 2px solid var(--border);
    }

    .section-title {
      font-size: var(--text-xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0;
    }

    .risk-filters {
      display: flex;
      gap: var(--s2);
    }

    .risk-filter-btn {
      padding: var(--s2) var(--s3);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--bg-secondary);
      }

      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      &.critical.active {
        background: var(--error);
        border-color: var(--error);
      }

      &.high.active {
        background: var(--warning);
        border-color: var(--warning);
      }

      &.medium.active {
        background: var(--info);
        border-color: var(--info);
      }
    }

    .risk-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s6);
    }

    .risk-chart-container {
      display: flex;
      flex-direction: column;
      gap: var(--s4);
    }

    .risk-chart {
      height: 40px;
      display: flex;
      border-radius: var(--radius);
      overflow: hidden;
      border: 2px solid var(--border);
    }

    .risk-segment {
      height: 100%;
      transition: var(--transition);

      &.low {
        background: var(--success);
      }

      &.medium {
        background: var(--info);
      }

      &.high {
        background: var(--warning);
      }

      &.critical {
        background: var(--error);
      }
    }

    .risk-legend {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--s2);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: var(--radius-sm);

      &.low {
        background: var(--success);
      }

      &.medium {
        background: var(--info);
      }

      &.high {
        background: var(--warning);
      }

      &.critical {
        background: var(--error);
      }
    }

    .legend-text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .alerts-container {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
    }

    .alerts-title {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--error);
      margin: 0;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .alert-item {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s3);
      border-radius: var(--radius);
      border: 2px solid var(--border);

      &.critical {
        background: rgba(212, 74, 63, 0.05);
        border-color: var(--error);
      }

      &.high {
        background: rgba(230, 168, 85, 0.05);
        border-color: var(--warning);
      }
    }

    .alert-icon {
      font-size: var(--text-lg);
    }

    .alert-content {
      flex: 1;
    }

    .alert-title {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      margin-bottom: var(--s1);
    }

    .alert-message {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      margin-bottom: var(--s1);
    }

    .alert-time {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    .alert-actions {
      display: flex;
      gap: var(--s2);
    }

    .alert-action-btn {
      padding: var(--s1) var(--s2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      font-size: var(--text-xs);
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }
    }

    .chart-type-selector {
      display: flex;
      gap: var(--s2);
    }

    .chart-type-btn {
      padding: var(--s2) var(--s3);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--bg-secondary);
      }

      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }
    }

    .trends-chart-container {
      position: relative;
      height: 300px;
      margin-bottom: var(--s4);
    }

    .line-chart {
      position: relative;
      height: 100%;
      background: var(--bg);
      border-radius: var(--radius);
      padding: var(--s4);
    }

    .chart-grid {
      position: relative;
      height: calc(100% - 40px);
      border-bottom: 2px solid var(--border);
    }

    .chart-point {
      position: absolute;
      transform: translate(-50%, 50%);
    }

    .point-marker {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 2px solid white;

      &.positive {
        background: var(--success);
      }

      &.negative {
        background: var(--error);
      }
    }

    .chart-labels {
      display: flex;
      justify-content: space-between;
      padding-top: var(--s2);
    }

    .chart-label {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      text-align: center;
    }

    .bar-chart {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      height: 100%;
      padding: var(--s4);
      background: var(--bg);
      border-radius: var(--radius);
      gap: var(--s2);
    }

    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      gap: var(--s2);
    }

    .bar-container {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 2px;
      height: 200px;
      width: 100%;
    }

    .bar {
      width: 20px;
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      transition: var(--transition);

      &.credit-usage {
        background: var(--primary);
      }

      &.payments {
        background: var(--success);
      }

      &.new-debt {
        background: var(--warning);
      }
    }

    .bar-label {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      text-align: center;
      writing-mode: horizontal-tb;
      transform: rotate(-45deg);
    }

    .chart-legend {
      display: flex;
      justify-content: center;
      gap: var(--s4);
      margin-top: var(--s3);
    }

    .chart-legend .legend-item {
      display: flex;
      align-items: center;
      gap: var(--s1);

      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: var(--radius-sm);

        &.credit-usage {
          background: var(--primary);
        }

        &.payments {
          background: var(--success);
        }

        &.new-debt {
          background: var(--warning);
        }
      }
    }

    .members-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--s4);
    }

    .member-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s4);
      transition: var(--transition);

      &:hover {
        transform: translateY(-2px);
        border-color: var(--primary);
      }

      &.high {
        border-left: 4px solid var(--warning);
      }

      &.critical {
        border-left: 4px solid var(--error);
      }
    }

    .member-header {
      display: flex;
      align-items: center;
      gap: var(--s3);
      margin-bottom: var(--s4);
    }

    .member-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: var(--font-bold);
    }

    .member-info {
      flex: 1;
    }

    .member-name {
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin-bottom: var(--s1);
    }

    .member-code {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .risk-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);

      &.low {
        background: rgba(82, 165, 115, 0.2);
        color: var(--success);
      }

      &.medium {
        background: rgba(75, 130, 246, 0.2);
        color: var(--info);
      }

      &.high {
        background: rgba(230, 168, 85, 0.2);
        color: var(--warning);
      }

      &.critical {
        background: rgba(212, 74, 63, 0.2);
        color: var(--error);
      }
    }

    .member-metrics {
      margin-bottom: var(--s4);
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s2) 0;
      border-bottom: 1px solid var(--border);

      &:last-child {
        border-bottom: none;
      }
    }

    .metric-row .metric-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .metric-row .metric-value {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);

      &.debt {
        color: var(--error);
      }

      &.available {
        color: var(--success);
      }
    }

    .utilization-display {
      margin-bottom: var(--s4);
    }

    .utilization-label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      margin-bottom: var(--s2);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .member-activity {
      margin-bottom: var(--s4);
      padding-top: var(--s3);
      border-top: 1px solid var(--border);
    }

    .activity-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .activity-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .activity-value {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text);
    }

    .member-actions {
      display: flex;
      gap: var(--s2);
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--s1);
      padding: var(--s2) var(--s3);
      border: 2px solid transparent;
      border-radius: var(--radius);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;

      &.btn-primary {
        background: var(--primary);
        color: white;
        border-color: var(--primary);

        &:hover:not(:disabled) {
          background: var(--primary-hover);
          border-color: var(--primary-hover);
        }
      }

      &.btn-outline {
        background: var(--surface);
        color: var(--text);
        border-color: var(--border);

        &:hover:not(:disabled) {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
      }

      &.btn-warning {
        background: var(--warning);
        color: white;
        border-color: var(--warning);

        &:hover:not(:disabled) {
          opacity: 0.9;
        }
      }

      &.btn-sm {
        padding: var(--s1) var(--s2);
        font-size: var(--text-xs);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border);
      border-top: 4px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: var(--s3);
    }

    .loading-text {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: 0;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--s4);
      padding: var(--s8);
    }

    .error-card {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s4);
      background: rgba(212, 74, 63, 0.1);
      border: 2px solid var(--error);
      border-radius: var(--radius-lg);
    }

    .error-icon {
      font-size: var(--text-2xl);
    }

    .error-title {
      font-weight: var(--font-semibold);
      color: var(--error);
      margin-bottom: var(--s1);
    }

    .error-message {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    // Mobile responsive
    @media (max-width: 768px) {
      .credit-dashboard-container {
        padding: var(--s2);
      }

      .dashboard-header {
        flex-direction: column;
        gap: var(--s3);
        align-items: stretch;
      }

      .header-actions {
        justify-content: space-between;
        flex-wrap: wrap;
      }

      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--s2);
      }

      .risk-content {
        grid-template-columns: 1fr;
      }

      .section-header {
        flex-direction: column;
        gap: var(--s2);
        align-items: stretch;
      }

      .members-grid {
        grid-template-columns: 1fr;
      }

      .member-actions {
        justify-content: space-between;
      }

      .btn {
        flex: 1;
      }
    }

    @media (max-width: 480px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .risk-filters {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--s2);
      }

      .chart-type-selector {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--s2);
      }
    }
  `]
})
export class MemberCreditDashboardComponent implements OnInit {
  private memberCreditService = inject(MemberCreditService);

  // Input signals
  branchId = input<number | null>(null);

  // Output events
  memberSelected = output<number>();
  alertActionRequired = output<any>();
  exportRequested = output<string>();

  // State signals
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedPeriod = signal<string>('30d');
  selectedRiskFilter = signal<string>('all');
  selectedMemberSort = signal<string>('debt');
  chartType = signal<'line' | 'bar'>('line');

  // Data signals
  creditMetrics = signal<CreditMetrics | null>(null);
  creditTrends = signal<CreditTrend[]>([]);
  topMembers = signal<TopMember[]>([]);
  criticalAlerts = signal<any[]>([]);
  previousMetrics = signal<CreditMetrics | null>(null);

  // Computed properties
  creditUtilizationPercentage = computed(() => {
    const metrics = this.creditMetrics();
    if (!metrics || metrics.totalCreditLimit === 0) return 0;
    return Math.round((metrics.totalOutstandingDebt / metrics.totalCreditLimit) * 100);
  });

  riskDistribution = computed((): RiskDistribution => {
    const members = this.topMembers();
    return members.reduce((acc, member) => {
      const risk = member.riskLevel.toLowerCase() as keyof RiskDistribution;
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, { low: 0, medium: 0, high: 0, critical: 0 });
  });

  filteredMembers = computed(() => {
    let members = this.topMembers();
    const riskFilter = this.selectedRiskFilter();
    
    if (riskFilter !== 'all') {
      members = members.filter(m => m.riskLevel.toLowerCase() === riskFilter);
    }

    const sortBy = this.selectedMemberSort();
    return members.sort((a, b) => {
      switch (sortBy) {
        case 'debt':
          return b.currentDebt - a.currentDebt;
        case 'utilization':
          return b.utilizationRate - a.utilizationRate;
        case 'limit':
          return b.creditLimit - a.creditLimit;
        case 'risk':
          const riskOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        case 'activity':
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        default:
          return 0;
      }
    }).slice(0, 12); // Show top 12 members
  });

  ngOnInit() {
    this.loadDashboardData();
  }

  // Data loading methods
  async loadDashboardData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await Promise.all([
        this.loadCreditMetrics(),
        this.loadCreditTrends(),
        this.loadTopMembers(),
        this.loadCriticalAlerts()
      ]);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      this.error.set('Failed to load dashboard data');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCreditMetrics(): Promise<void> {
    try {
      // Store previous metrics for trend calculation
      this.previousMetrics.set(this.creditMetrics());
      
      // Mock data - replace with actual service call
      const metrics: CreditMetrics = {
        totalMembers: 1250,
        totalCreditLimit: 500000000,
        totalOutstandingDebt: 275000000,
        totalAvailableCredit: 225000000,
        averageCreditUtilization: 55,
        membersWithDebt: 387,
        overdueAccounts: 23,
        highRiskAccounts: 45
      };
      
      this.creditMetrics.set(metrics);
    } catch (error) {
      console.error('Error loading credit metrics:', error);
    }
  }

  private async loadCreditTrends(): Promise<void> {
    try {
      // Mock data - replace with actual service call
      const trends: CreditTrend[] = [
        { month: 'Jan', creditUsage: 45000000, paymentAmount: 38000000, newDebt: 7000000, netChange: 7000000 },
        { month: 'Feb', creditUsage: 52000000, paymentAmount: 41000000, newDebt: 11000000, netChange: 11000000 },
        { month: 'Mar', creditUsage: 48000000, paymentAmount: 45000000, newDebt: 3000000, netChange: 3000000 },
        { month: 'Apr', creditUsage: 55000000, paymentAmount: 42000000, newDebt: 13000000, netChange: 13000000 },
        { month: 'May', creditUsage: 61000000, paymentAmount: 48000000, newDebt: 13000000, netChange: 13000000 },
        { month: 'Jun', creditUsage: 58000000, paymentAmount: 52000000, newDebt: 6000000, netChange: 6000000 }
      ];
      
      this.creditTrends.set(trends);
    } catch (error) {
      console.error('Error loading credit trends:', error);
    }
  }

  private async loadTopMembers(): Promise<void> {
    try {
      // Mock data - replace with actual service call
      const members: TopMember[] = [
        {
          memberId: 1,
          memberName: 'PT Sumber Rejeki Abadi',
          memberCode: 'M001',
          creditLimit: 50000000,
          currentDebt: 47500000,
          utilizationRate: 95,
          lastActivity: '2024-01-15T10:30:00Z',
          riskLevel: 'Critical'
        },
        {
          memberId: 2,
          memberName: 'CV Maju Bersama',
          memberCode: 'M002',
          creditLimit: 25000000,
          currentDebt: 22000000,
          utilizationRate: 88,
          lastActivity: '2024-01-14T14:20:00Z',
          riskLevel: 'High'
        },
        {
          memberId: 3,
          memberName: 'Toko Berkah Jaya',
          memberCode: 'M003',
          creditLimit: 15000000,
          currentDebt: 12000000,
          utilizationRate: 80,
          lastActivity: '2024-01-13T09:15:00Z',
          riskLevel: 'High'
        }
        // Add more mock members...
      ];
      
      this.topMembers.set(members);
    } catch (error) {
      console.error('Error loading top members:', error);
    }
  }

  private async loadCriticalAlerts(): Promise<void> {
    try {
      // Mock data - replace with actual service call
      const alerts = [
        {
          id: 1,
          type: 'credit_limit_exceeded',
          severity: 'critical',
          title: 'Credit Limit Exceeded',
          message: 'PT Sumber Rejeki Abadi has exceeded their credit limit by 5%',
          createdAt: '2024-01-15T08:00:00Z'
        },
        {
          id: 2,
          type: 'overdue_payment',
          severity: 'high',
          title: 'Overdue Payment',
          message: 'CV Maju Bersama has an overdue payment of Rp 2,500,000',
          createdAt: '2024-01-14T16:00:00Z'
        }
      ];
      
      this.criticalAlerts.set(alerts);
    } catch (error) {
      console.error('Error loading critical alerts:', error);
    }
  }

  // Event handlers
  onRefreshData(): void {
    this.loadDashboardData();
  }

  onExportReport(): void {
    this.exportRequested.emit('credit-dashboard-report');
  }

  setSelectedPeriod(period: string): void {
    this.selectedPeriod.set(period);
    this.loadDashboardData();
  }

  setRiskFilter(filter: string): void {
    this.selectedRiskFilter.set(filter);
  }

  setMemberSort(sort: string): void {
    this.selectedMemberSort.set(sort);
  }

  setChartType(type: 'line' | 'bar'): void {
    this.chartType.set(type);
  }

  viewMemberDetail(member: TopMember): void {
    this.memberSelected.emit(member.memberId);
  }

  viewMemberTransactions(member: TopMember): void {
    // Navigate to transaction history
  }

  contactMember(member: TopMember): void {
    // Open contact modal or initiate contact
  }

  viewAlertDetail(alert: any): void {
    // Open alert detail modal
  }

  dismissAlert(alert: any): void {
    this.criticalAlerts.update(alerts => alerts.filter(a => a.id !== alert.id));
  }

  // Utility methods
  getGrowthTrend(metric: string): number {
    const current = this.creditMetrics();
    const previous = this.previousMetrics();
    
    if (!current || !previous) return 0;

    switch (metric) {
      case 'members':
        return ((current.totalMembers - previous.totalMembers) / previous.totalMembers) * 100;
      case 'limit':
        return ((current.totalCreditLimit - previous.totalCreditLimit) / previous.totalCreditLimit) * 100;
      case 'debt':
        return ((current.totalOutstandingDebt - previous.totalOutstandingDebt) / previous.totalOutstandingDebt) * 100;
      default:
        return 0;
    }
  }

  formatTrend(trend: number): string {
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  }

  getRiskPercentage(level: keyof RiskDistribution): number {
    const distribution = this.riskDistribution();
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    return total > 0 ? (distribution[level] / total) * 100 : 0;
  }

  getChartPointHeight(value: number): number {
    const trends = this.creditTrends();
    const max = Math.max(...trends.map(t => Math.abs(t.netChange)));
    const min = Math.min(...trends.map(t => Math.abs(t.netChange)));
    
    if (max === min) return 50;
    
    return ((Math.abs(value) - min) / (max - min)) * 80 + 10;
  }

  getChartTooltip(trend: CreditTrend): string {
    return `${trend.month}: Credit Usage ${this.formatCurrency(trend.creditUsage)}, Payments ${this.formatCurrency(trend.paymentAmount)}, Net Change ${this.formatCurrency(trend.netChange)}`;
  }

  getBarHeight(value: number): number {
    const trends = this.creditTrends();
    const maxValue = Math.max(...trends.flatMap(t => [t.creditUsage, t.paymentAmount, t.newDebt]));
    return maxValue > 0 ? (value / maxValue) * 100 : 0;
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      credit_limit_exceeded: '🚨',
      overdue_payment: '⏰',
      high_utilization: '⚠️',
      suspicious_activity: '🔍'
    };
    return icons[type] || '🔔';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} menit yang lalu`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} jam yang lalu`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} hari yang lalu`;
    }
  }
}