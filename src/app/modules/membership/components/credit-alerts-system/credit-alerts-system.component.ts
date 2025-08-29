import { Component, input, output, signal, computed, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { interval, Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MemberCreditService } from '../../services/member-credit.service';
import { formatCurrency } from '../../utils/credit-utils';
// import { StateService } from '../../../core/services/state.service'; // Temporarily disabled

export interface CreditAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  memberId: number;
  memberName: string;
  memberCode: string;
  triggerValue: number;
  threshold: number;
  createdAt: string;
  resolvedAt?: string;
  isResolved: boolean;
  requiresAction: boolean;
  actionTaken?: string;
  assignedTo?: string;
  dueDate?: string;
  escalationLevel: number;
  metadata: AlertMetadata;
}

export type AlertType = 
  | 'credit_limit_exceeded' 
  | 'high_utilization' 
  | 'overdue_payment' 
  | 'payment_failure' 
  | 'suspicious_activity' 
  | 'credit_limit_approach' 
  | 'multiple_failed_payments' 
  | 'debt_aging' 
  | 'inactive_account'
  | 'risk_level_change';

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AlertMetadata {
  creditLimit?: number;
  currentDebt?: number;
  utilizationRate?: number;
  overdueDays?: number;
  failedAttempts?: number;
  lastPaymentDate?: string;
  previousRiskLevel?: string;
  currentRiskLevel?: string;
  relatedTransactionId?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  isActive: boolean;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  description: string;
  cooldownPeriod: number; // minutes
  escalationRules: EscalationRule[];
  notificationChannels: string[];
  autoActions: AutoAction[];
}

export interface AlertCondition {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains';
  value: any;
  unit?: string;
}

export interface EscalationRule {
  level: number;
  delayMinutes: number;
  assignTo: string;
  notifyChannels: string[];
  autoActions: string[];
}

export interface AutoAction {
  type: 'suspend_credit' | 'reduce_limit' | 'require_approval' | 'send_reminder' | 'schedule_call';
  parameters: Record<string, any>;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  alertsByType: Record<AlertType, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  averageResolutionTime: number;
  escalatedAlerts: number;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack';
  isActive: boolean;
  configuration: Record<string, any>;
}

@Component({
  selector: 'app-credit-alerts-system',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alerts-system-container">
      <!-- Header with Real-time Stats -->
      <div class="system-header">
        <div class="header-content">
          <h2 class="system-title">Credit Alerts & Monitoring System</h2>
          <p class="system-subtitle">Real-time credit monitoring with automated alerts and actions</p>
        </div>
        
        <div class="system-status">
          <div class="status-indicator" [class.active]="isMonitoringActive()" [class.inactive]="!isMonitoringActive()">
            <div class="status-dot"></div>
            <span class="status-text">{{ isMonitoringActive() ? 'Monitoring Active' : 'Monitoring Inactive' }}</span>
          </div>
          
          <button class="btn btn-outline" (click)="toggleMonitoring()">
            {{ isMonitoringActive() ? '⏸️ Pause' : '▶️ Start' }} Monitoring
          </button>
        </div>
      </div>

      <!-- Alert Statistics Dashboard -->
      @if (alertStats()) {
      <div class="stats-dashboard">
        <div class="stats-grid">
          <div class="stat-card total">
            <div class="stat-header">
              <span class="stat-icon">📊</span>
              <span class="stat-label">Total Alerts</span>
            </div>
            <div class="stat-value">{{ alertStats()!.totalAlerts }}</div>
            <div class="stat-trend">
              <span class="trend-indicator positive">+12%</span>
              <span class="trend-text">vs last week</span>
            </div>
          </div>

          <div class="stat-card active">
            <div class="stat-header">
              <span class="stat-icon">🚨</span>
              <span class="stat-label">Active Alerts</span>
            </div>
            <div class="stat-value">{{ alertStats()!.activeAlerts }}</div>
            <div class="stat-breakdown">
              <div class="breakdown-item critical">
                <span class="breakdown-label">Critical:</span>
                <span class="breakdown-value">{{ alertStats()!.criticalAlerts }}</span>
              </div>
            </div>
          </div>

          <div class="stat-card resolution">
            <div class="stat-header">
              <span class="stat-icon">⏱️</span>
              <span class="stat-label">Avg Resolution Time</span>
            </div>
            <div class="stat-value">{{ formatDuration(alertStats()!.averageResolutionTime) }}</div>
            <div class="stat-trend">
              <span class="trend-indicator negative">+5min</span>
              <span class="trend-text">vs target</span>
            </div>
          </div>

          <div class="stat-card escalated">
            <div class="stat-header">
              <span class="stat-icon">⬆️</span>
              <span class="stat-label">Escalated</span>
            </div>
            <div class="stat-value">{{ alertStats()!.escalatedAlerts }}</div>
            <div class="stat-trend">
              <span class="trend-indicator positive">-8%</span>
              <span class="trend-text">vs last week</span>
            </div>
          </div>
        </div>
      </div>
      }

      <!-- Navigation Tabs -->
      <div class="nav-tabs">
        <button 
          class="nav-tab"
          [class.active]="activeTab() === 'alerts'"
          (click)="setActiveTab('alerts')">
          🚨 Active Alerts ({{ activeAlerts().length }})
        </button>
        <button 
          class="nav-tab"
          [class.active]="activeTab() === 'rules'"
          (click)="setActiveTab('rules')">
          ⚙️ Alert Rules
        </button>
        <button 
          class="nav-tab"
          [class.active]="activeTab() === 'history'"
          (click)="setActiveTab('history')">
          📋 Alert History
        </button>
        <button 
          class="nav-tab"
          [class.active]="activeTab() === 'settings'"
          (click)="setActiveTab('settings')">
          🔧 Settings
        </button>
      </div>

      <!-- Active Alerts Tab -->
      @if (activeTab() === 'alerts') {
      <div class="alerts-tab">
        <!-- Alert Filters -->
        <div class="alert-filters">
          <div class="filter-group">
            <select class="filter-select" [(ngModel)]="alertSeverityFilter">
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div class="filter-group">
            <select class="filter-select" [(ngModel)]="alertTypeFilter">
              <option value="">All Types</option>
              <option value="credit_limit_exceeded">Credit Limit Exceeded</option>
              <option value="high_utilization">High Utilization</option>
              <option value="overdue_payment">Overdue Payment</option>
              <option value="payment_failure">Payment Failure</option>
              <option value="suspicious_activity">Suspicious Activity</option>
            </select>
          </div>

          <div class="filter-group">
            <input 
              type="text" 
              class="filter-input" 
              placeholder="Search member or alert..."
              [(ngModel)]="alertSearchQuery">
          </div>

          <div class="filter-actions">
            <button class="btn btn-outline" (click)="refreshAlerts()">
              🔄 Refresh
            </button>
            <button class="btn btn-primary" (click)="markAllAsRead()" [disabled]="!hasUnreadAlerts()">
              ✅ Mark All Read
            </button>
          </div>
        </div>

        <!-- Alerts List -->
        <div class="alerts-list">
          @if (filteredAlerts().length === 0) {
          <div class="empty-alerts">
            <div class="empty-icon">🎉</div>
            <div class="empty-title">No Active Alerts</div>
            <div class="empty-message">All alerts have been resolved or no alerts match your filters.</div>
          </div>
          } @else {
          @for (alert of filteredAlerts(); track alert.id) {
          <div class="alert-card" 
               [class]="alert.severity.toLowerCase()"
               [class.unread]="!alert.isResolved"
               [class.requires-action]="alert.requiresAction">
            
            <div class="alert-header">
              <div class="alert-info">
                <div class="alert-type-icon">{{ getAlertTypeIcon(alert.type) }}</div>
                <div class="alert-details">
                  <div class="alert-title">{{ alert.title }}</div>
                  <div class="alert-member">
                    <span class="member-name">{{ alert.memberName }}</span>
                    <span class="member-code">({{ alert.memberCode }})</span>
                  </div>
                </div>
              </div>
              
              <div class="alert-meta">
                <div class="alert-severity" [class]="alert.severity.toLowerCase()">
                  {{ alert.severity }}
                </div>
                <div class="alert-time">
                  {{ formatRelativeTime(alert.createdAt) }}
                </div>
                @if (alert.escalationLevel > 0) {
                <div class="escalation-badge">
                  Level {{ alert.escalationLevel }}
                </div>
                }
              </div>
            </div>

            <div class="alert-body">
              <div class="alert-message">{{ alert.message }}</div>
              
              <!-- Alert-specific details -->
              @if (alert.type === 'credit_limit_exceeded') {
              <div class="alert-specifics">
                <div class="specific-item">
                  <span class="label">Credit Limit:</span>
                  <span class="value">{{ formatCurrency(alert.metadata.creditLimit!) }}</span>
                </div>
                <div class="specific-item">
                  <span class="label">Current Debt:</span>
                  <span class="value debt">{{ formatCurrency(alert.metadata.currentDebt!) }}</span>
                </div>
                <div class="specific-item">
                  <span class="label">Excess Amount:</span>
                  <span class="value excess">{{ formatCurrency(alert.metadata.currentDebt! - alert.metadata.creditLimit!) }}</span>
                </div>
              </div>
              }

              @if (alert.type === 'high_utilization') {
              <div class="alert-specifics">
                <div class="utilization-display">
                  <div class="utilization-label">
                    Credit Utilization: {{ alert.metadata.utilizationRate }}%
                  </div>
                  <div class="utilization-bar">
                    <div class="utilization-fill danger" 
                         [style.width.%]="alert.metadata.utilizationRate">
                    </div>
                  </div>
                </div>
              </div>
              }

              @if (alert.type === 'overdue_payment') {
              <div class="alert-specifics">
                <div class="specific-item">
                  <span class="label">Days Overdue:</span>
                  <span class="value overdue">{{ alert.metadata.overdueDays }} days</span>
                </div>
                <div class="specific-item">
                  <span class="label">Last Payment:</span>
                  <span class="value">{{ formatDate(alert.metadata.lastPaymentDate!) }}</span>
                </div>
              </div>
              }
            </div>

            <div class="alert-actions">
              @if (alert.requiresAction) {
              <div class="primary-actions">
                <button class="btn btn-sm btn-primary" (click)="resolveAlert(alert)">
                  ✅ Resolve
                </button>
                <button class="btn btn-sm btn-outline" (click)="assignAlert(alert)">
                  👤 Assign
                </button>
                <button class="btn btn-sm btn-outline" (click)="snoozeAlert(alert)">
                  ⏰ Snooze
                </button>
              </div>
              }

              <div class="secondary-actions">
                <button class="btn btn-xs btn-outline" (click)="viewMemberProfile(alert.memberId)">
                  👤 Member Profile
                </button>
                <button class="btn btn-xs btn-outline" (click)="viewAlertHistory(alert.memberId)">
                  📋 History
                </button>
                @if (alert.severity === 'Critical') {
                <button class="btn btn-xs btn-warning" (click)="escalateAlert(alert)">
                  ⬆️ Escalate
                </button>
                }
              </div>
            </div>

            @if (alert.assignedTo) {
            <div class="alert-assignment">
              <span class="assignment-label">Assigned to:</span>
              <span class="assignment-value">{{ alert.assignedTo }}</span>
            </div>
            }
          </div>
          }
          }
        </div>
      </div>
      }

      <!-- Alert Rules Tab -->
      @if (activeTab() === 'rules') {
      <div class="rules-tab">
        <div class="rules-header">
          <h3 class="rules-title">Alert Rules Configuration</h3>
          <button class="btn btn-primary" (click)="createNewRule()">
            ➕ Create New Rule
          </button>
        </div>

        <div class="rules-list">
          @for (rule of alertRules(); track rule.id) {
          <div class="rule-card" [class.inactive]="!rule.isActive">
            <div class="rule-header">
              <div class="rule-info">
                <div class="rule-name">{{ rule.name }}</div>
                <div class="rule-description">{{ rule.description }}</div>
              </div>
              
              <div class="rule-controls">
                <div class="rule-status">
                  <label class="toggle-switch">
                    <input 
                      type="checkbox" 
                      [checked]="rule.isActive"
                      (change)="toggleRuleStatus(rule, $event)">
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="status-label">{{ rule.isActive ? 'Active' : 'Inactive' }}</span>
                </div>
              </div>
            </div>

            <div class="rule-details">
              <div class="rule-conditions">
                <div class="conditions-title">Conditions:</div>
                <div class="conditions-list">
                  @for (condition of rule.conditions; track $index) {
                  <div class="condition-item">
                    <span class="condition-field">{{ condition.field }}</span>
                    <span class="condition-operator">{{ getOperatorLabel(condition.operator) }}</span>
                    <span class="condition-value">{{ condition.value }}{{ condition.unit || '' }}</span>
                  </div>
                  }
                </div>
              </div>

              <div class="rule-settings">
                <div class="setting-item">
                  <span class="setting-label">Severity:</span>
                  <span class="setting-value severity" [class]="rule.severity.toLowerCase()">{{ rule.severity }}</span>
                </div>
                <div class="setting-item">
                  <span class="setting-label">Cooldown:</span>
                  <span class="setting-value">{{ rule.cooldownPeriod }} minutes</span>
                </div>
                <div class="setting-item">
                  <span class="setting-label">Channels:</span>
                  <span class="setting-value">{{ rule.notificationChannels.join(', ') }}</span>
                </div>
              </div>
            </div>

            <div class="rule-actions">
              <button class="btn btn-sm btn-outline" (click)="editRule(rule)">
                ✏️ Edit
              </button>
              <button class="btn btn-sm btn-outline" (click)="testRule(rule)">
                🧪 Test
              </button>
              <button class="btn btn-sm btn-outline" (click)="duplicateRule(rule)">
                📋 Duplicate
              </button>
              <button class="btn btn-sm btn-error" (click)="deleteRule(rule)">
                🗑️ Delete
              </button>
            </div>
          </div>
          }
        </div>
      </div>
      }

      <!-- Alert History Tab -->
      @if (activeTab() === 'history') {
      <div class="history-tab">
        <div class="history-header">
          <h3 class="history-title">Alert History & Analytics</h3>
          <div class="history-filters">
            <select class="filter-select" [(ngModel)]="historyPeriod">
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button class="btn btn-outline" (click)="exportHistory()">
              📊 Export
            </button>
          </div>
        </div>

        <!-- History Timeline -->
        <div class="history-timeline">
          @for (historyItem of alertHistory(); track historyItem.id) {
          <div class="timeline-item resolved">
            <div class="timeline-marker" [class]="historyItem.severity.toLowerCase()">
              <span class="marker-icon">{{ getAlertTypeIcon(historyItem.type) }}</span>
            </div>
            
            <div class="timeline-content">
              <div class="timeline-header">
                <div class="timeline-title">{{ historyItem.title }}</div>
                <div class="timeline-time">{{ formatDateTime(historyItem.createdAt) }}</div>
              </div>
              
              <div class="timeline-details">
                <div class="detail-item">
                  <span class="detail-label">Member:</span>
                  <span class="detail-value">{{ historyItem.memberName }} ({{ historyItem.memberCode }})</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Resolution Time:</span>
                  <span class="detail-value">{{ calculateResolutionTime(historyItem) }}</span>
                </div>
                @if (historyItem.actionTaken) {
                <div class="detail-item">
                  <span class="detail-label">Action Taken:</span>
                  <span class="detail-value">{{ historyItem.actionTaken }}</span>
                </div>
                }
              </div>
            </div>
          </div>
          }
        </div>
      </div>
      }

      <!-- Settings Tab -->
      @if (activeTab() === 'settings') {
      <div class="settings-tab">
        <div class="settings-sections">
          <!-- Notification Settings -->
          <div class="settings-section">
            <h3 class="section-title">Notification Channels</h3>
            
            <div class="channels-list">
              @for (channel of notificationChannels(); track channel.id) {
              <div class="channel-card">
                <div class="channel-header">
                  <div class="channel-info">
                    <div class="channel-name">{{ channel.name }}</div>
                    <div class="channel-type">{{ channel.type.toUpperCase() }}</div>
                  </div>
                  
                  <div class="channel-toggle">
                    <label class="toggle-switch">
                      <input 
                        type="checkbox" 
                        [checked]="channel.isActive"
                        (change)="toggleChannelStatus(channel, $event)">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
                
                <div class="channel-config">
                  <!-- Channel-specific configuration would go here -->
                  @if (channel.type === 'email') {
                  <div class="config-item">
                    <span class="config-label">Recipients:</span>
                    <span class="config-value">{{ channel.configuration['recipients'] || 'Not configured' }}</span>
                  </div>
                  }
                  
                  @if (channel.type === 'sms') {
                  <div class="config-item">
                    <span class="config-label">Phone Numbers:</span>
                    <span class="config-value">{{ channel.configuration['phoneNumbers'] || 'Not configured' }}</span>
                  </div>
                  }
                </div>
              </div>
              }
            </div>
          </div>

          <!-- System Settings -->
          <div class="settings-section">
            <h3 class="section-title">System Configuration</h3>
            
            <form [formGroup]="systemSettingsForm" class="settings-form">
              <div class="form-group">
                <label class="form-label">Monitoring Interval (minutes)</label>
                <input 
                  type="number" 
                  class="form-control" 
                  formControlName="monitoringInterval"
                  min="1" 
                  max="60">
                <small class="form-hint">How often the system checks for alert conditions</small>
              </div>

              <div class="form-group">
                <label class="form-label">Default Alert Retention (days)</label>
                <input 
                  type="number" 
                  class="form-control" 
                  formControlName="alertRetentionDays"
                  min="7" 
                  max="365">
                <small class="form-hint">How long resolved alerts are kept in history</small>
              </div>

              <div class="form-group">
                <label class="form-label">Auto-escalation Enabled</label>
                <label class="toggle-switch">
                  <input type="checkbox" formControlName="autoEscalationEnabled">
                  <span class="toggle-slider"></span>
                </label>
                <small class="form-hint">Automatically escalate unresolved critical alerts</small>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-outline" (click)="resetSettings()">
                  🔄 Reset to Defaults
                </button>
                <button type="submit" class="btn btn-primary" (click)="saveSettings()">
                  💾 Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      }

      <!-- Loading Overlay -->
      @if (loading()) {
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">{{ loadingMessage() }}</div>
      </div>
      }
    </div>
  `,
  styles: [`
    .alerts-system-container {
      padding: var(--s4);
      max-width: 1400px;
      margin: 0 auto;
      position: relative;
    }

    .system-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s6);
      padding: var(--s6);
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-xl);
    }

    .system-title {
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0;
    }

    .system-subtitle {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: var(--s1) 0 0 0;
    }

    .system-status {
      display: flex;
      align-items: center;
      gap: var(--s4);
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: var(--s2);

      &.active .status-dot {
        background: var(--success);
        animation: pulse 2s infinite;
      }

      &.inactive .status-dot {
        background: var(--text-muted);
      }
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      transition: var(--transition);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .stats-dashboard {
      margin-bottom: var(--s6);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--s4);
    }

    .stat-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s4);
      position: relative;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        border-radius: var(--radius) var(--radius) 0 0;
      }

      &.total::before { background: var(--primary); }
      &.active::before { background: var(--error); }
      &.resolution::before { background: var(--info); }
      &.escalated::before { background: var(--warning); }
    }

    .stat-header {
      display: flex;
      align-items: center;
      gap: var(--s2);
      margin-bottom: var(--s3);
    }

    .stat-icon {
      font-size: var(--text-lg);
      opacity: 0.8;
    }

    .stat-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      font-weight: var(--font-medium);
    }

    .stat-value {
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--text);
      margin-bottom: var(--s2);
    }

    .stat-trend, .stat-breakdown {
      display: flex;
      align-items: center;
      gap: var(--s2);
      font-size: var(--text-xs);
    }

    .trend-indicator {
      font-weight: var(--font-semibold);

      &.positive { color: var(--success); }
      &.negative { color: var(--error); }
    }

    .breakdown-item {
      display: flex;
      justify-content: space-between;
      align-items: center;

      &.critical .breakdown-value {
        color: var(--error);
        font-weight: var(--font-bold);
      }
    }

    .nav-tabs {
      display: flex;
      border-bottom: 2px solid var(--border);
      margin-bottom: var(--s6);
    }

    .nav-tab {
      padding: var(--s3) var(--s4);
      border: none;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition);
      position: relative;

      &:hover {
        color: var(--text);
        background: var(--bg-secondary);
      }

      &.active {
        color: var(--primary);
        font-weight: var(--font-semibold);

        &::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary);
        }
      }
    }

    .alert-filters {
      display: flex;
      gap: var(--s3);
      align-items: center;
      margin-bottom: var(--s4);
      padding: var(--s4);
      background: var(--bg-secondary);
      border-radius: var(--radius);
    }

    .filter-select, .filter-input {
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

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
    }

    .alert-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s4);
      transition: var(--transition);
      position: relative;

      &.unread {
        border-left: 4px solid var(--info);
      }

      &.requires-action {
        box-shadow: 0 0 0 2px rgba(255, 145, 77, 0.2);
      }

      &.critical {
        border-left-color: var(--error);
        background: rgba(212, 74, 63, 0.02);
      }

      &.high {
        border-left-color: var(--warning);
        background: rgba(230, 168, 85, 0.02);
      }

      &:hover {
        border-color: var(--primary);
        transform: translateY(-1px);
      }
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--s3);
    }

    .alert-info {
      display: flex;
      gap: var(--s3);
      align-items: flex-start;
    }

    .alert-type-icon {
      font-size: var(--text-xl);
      padding: var(--s2);
      background: var(--bg-secondary);
      border-radius: var(--radius);
    }

    .alert-title {
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin-bottom: var(--s1);
    }

    .alert-member {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      display: flex;
      gap: var(--s2);
    }

    .alert-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--s1);
    }

    .alert-severity {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);

      &.critical {
        background: var(--error);
        color: white;
      }

      &.high {
        background: var(--warning);
        color: white;
      }

      &.medium {
        background: var(--info);
        color: white;
      }

      &.low {
        background: var(--text-muted);
        color: white;
      }
    }

    .alert-time {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    .escalation-badge {
      padding: var(--s1) var(--s2);
      background: var(--error);
      color: white;
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
    }

    .alert-message {
      font-size: var(--text-sm);
      color: var(--text);
      margin-bottom: var(--s3);
    }

    .alert-specifics {
      background: var(--bg);
      border-radius: var(--radius);
      padding: var(--s3);
      margin: var(--s3) 0;
    }

    .specific-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s1) 0;

      .label {
        font-size: var(--text-sm);
        color: var(--text-secondary);
      }

      .value {
        font-size: var(--text-sm);
        font-weight: var(--font-medium);

        &.debt { color: var(--error); }
        &.excess { color: var(--error); font-weight: var(--font-bold); }
        &.overdue { color: var(--warning); font-weight: var(--font-bold); }
      }
    }

    .utilization-display {
      .utilization-label {
        font-size: var(--text-sm);
        font-weight: var(--font-medium);
        margin-bottom: var(--s2);
      }

      .utilization-bar {
        height: 8px;
        background: var(--bg-secondary);
        border-radius: var(--radius);
        overflow: hidden;

        .utilization-fill {
          height: 100%;
          transition: var(--transition);

          &.danger {
            background: var(--error);
          }
        }
      }
    }

    .alert-actions {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
      margin-top: var(--s4);
    }

    .primary-actions, .secondary-actions {
      display: flex;
      gap: var(--s2);
      flex-wrap: wrap;
    }

    .alert-assignment {
      margin-top: var(--s3);
      padding-top: var(--s3);
      border-top: 1px solid var(--border);
      font-size: var(--text-sm);

      .assignment-label {
        color: var(--text-secondary);
        margin-right: var(--s1);
      }

      .assignment-value {
        font-weight: var(--font-medium);
        color: var(--primary);
      }
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
      }

      &.btn-error {
        background: var(--error);
        color: white;
        border-color: var(--error);
      }

      &.btn-sm {
        padding: var(--s1) var(--s2);
        font-size: var(--text-xs);
      }

      &.btn-xs {
        padding: calc(var(--s1) / 2) var(--s1);
        font-size: var(--text-xs);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .empty-alerts {
      text-align: center;
      padding: var(--s8);

      .empty-icon {
        font-size: 64px;
        margin-bottom: var(--s4);
      }

      .empty-title {
        font-size: var(--text-xl);
        font-weight: var(--font-bold);
        margin-bottom: var(--s2);
      }

      .empty-message {
        color: var(--text-secondary);
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
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    // Toggle Switch Styles
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 24px;

      input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--text-muted);
        transition: 0.4s;
        border-radius: 24px;

        &:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }
      }

      input:checked + .toggle-slider {
        background-color: var(--primary);
      }

      input:checked + .toggle-slider:before {
        transform: translateX(24px);
      }
    }

    // Mobile responsive
    @media (max-width: 768px) {
      .alerts-system-container {
        padding: var(--s2);
      }

      .system-header {
        flex-direction: column;
        gap: var(--s3);
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--s2);
      }

      .alert-filters {
        flex-direction: column;
        align-items: stretch;
      }

      .alert-header {
        flex-direction: column;
        gap: var(--s2);
      }

      .alert-meta {
        flex-direction: row;
        justify-content: space-between;
        align-self: stretch;
      }

      .primary-actions, .secondary-actions {
        justify-content: space-between;
      }

      .btn {
        flex: 1;
        min-width: 0;
      }
    }
  `]
})
export class CreditAlertsSystemComponent implements OnInit, OnDestroy {
  private memberCreditService = inject(MemberCreditService);
  // private stateService = inject(StateService); // Temporarily disabled
  private formBuilder = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // Output events
  memberProfileRequested = output<number>();
  alertEscalated = output<CreditAlert>();
  systemSettingsChanged = output<any>();

  // State signals
  activeTab = signal<'alerts' | 'rules' | 'history' | 'settings'>('alerts');
  loading = signal<boolean>(false);
  loadingMessage = signal<string>('');
  isMonitoringActive = signal<boolean>(true);
  
  // Alert data
  alerts = signal<CreditAlert[]>([]);
  alertHistory = signal<CreditAlert[]>([]);
  alertRules = signal<AlertRule[]>([]);
  alertStats = signal<AlertStats | null>(null);
  notificationChannels = signal<NotificationChannel[]>([]);
  
  // Filters
  alertSeverityFilter = signal<string>('');
  alertTypeFilter = signal<string>('');
  alertSearchQuery = signal<string>('');
  historyPeriod = signal<string>('30d');

  // Forms
  systemSettingsForm: FormGroup;

  // Computed properties
  activeAlerts = computed(() => this.alerts().filter(alert => !alert.isResolved));

  filteredAlerts = computed(() => {
    let filtered = this.activeAlerts();
    
    // Severity filter
    const severityFilter = this.alertSeverityFilter();
    if (severityFilter) {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    // Type filter
    const typeFilter = this.alertTypeFilter();
    if (typeFilter) {
      filtered = filtered.filter(alert => alert.type === typeFilter);
    }

    // Search query
    const searchQuery = this.alertSearchQuery().toLowerCase();
    if (searchQuery) {
      filtered = filtered.filter(alert => 
        alert.memberName.toLowerCase().includes(searchQuery) ||
        alert.memberCode.toLowerCase().includes(searchQuery) ||
        alert.title.toLowerCase().includes(searchQuery) ||
        alert.message.toLowerCase().includes(searchQuery)
      );
    }

    return filtered.sort((a, b) => {
      // Sort by severity (Critical > High > Medium > Low)
      const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      if (a.severity !== b.severity) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      
      // Then by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  hasUnreadAlerts = computed(() => this.activeAlerts().some(alert => alert.requiresAction));

  constructor() {
    this.systemSettingsForm = this.formBuilder.group({
      monitoringInterval: [5, [Validators.required, Validators.min(1), Validators.max(60)]],
      alertRetentionDays: [90, [Validators.required, Validators.min(7), Validators.max(365)]],
      autoEscalationEnabled: [true]
    });
  }

  ngOnInit() {
    this.loadInitialData();
    this.startRealTimeMonitoring();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data loading
  async loadInitialData(): Promise<void> {
    this.setLoading(true, 'Loading alerts system...');
    
    try {
      await Promise.all([
        this.loadAlerts(),
        this.loadAlertRules(),
        this.loadAlertStats(),
        this.loadNotificationChannels(),
        this.loadAlertHistory()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      this.setLoading(false);
    }
  }

  private async loadAlerts(): Promise<void> {
    // Mock data - replace with actual service call
    const mockAlerts: CreditAlert[] = [
      {
        id: '1',
        type: 'credit_limit_exceeded',
        severity: 'Critical',
        title: 'Credit Limit Exceeded',
        message: 'Member has exceeded their credit limit by Rp 5,000,000',
        memberId: 123,
        memberName: 'PT Sumber Rejeki Abadi',
        memberCode: 'M001',
        triggerValue: 55000000,
        threshold: 50000000,
        createdAt: '2024-01-15T10:30:00Z',
        isResolved: false,
        requiresAction: true,
        escalationLevel: 1,
        metadata: {
          creditLimit: 50000000,
          currentDebt: 55000000,
          utilizationRate: 110
        }
      },
      {
        id: '2',
        type: 'high_utilization',
        severity: 'High',
        title: 'High Credit Utilization',
        message: 'Credit utilization has reached 95% of the limit',
        memberId: 124,
        memberName: 'CV Maju Bersama',
        memberCode: 'M002',
        triggerValue: 95,
        threshold: 90,
        createdAt: '2024-01-15T09:15:00Z',
        isResolved: false,
        requiresAction: true,
        escalationLevel: 0,
        metadata: {
          creditLimit: 30000000,
          currentDebt: 28500000,
          utilizationRate: 95
        }
      }
    ];
    
    this.alerts.set(mockAlerts);
  }

  private async loadAlertRules(): Promise<void> {
    // Mock data - replace with actual service call
    const mockRules: AlertRule[] = [
      {
        id: 'rule1',
        name: 'Credit Limit Exceeded',
        type: 'credit_limit_exceeded',
        isActive: true,
        conditions: [
          { field: 'currentDebt', operator: 'gt', value: 'creditLimit', unit: 'IDR' }
        ],
        severity: 'Critical',
        description: 'Alert when member exceeds their credit limit',
        cooldownPeriod: 60,
        escalationRules: [
          { level: 1, delayMinutes: 30, assignTo: 'supervisor', notifyChannels: ['email', 'sms'], autoActions: [] }
        ],
        notificationChannels: ['email', 'push'],
        autoActions: [
          { type: 'suspend_credit', parameters: {} }
        ]
      },
      {
        id: 'rule2',
        name: 'High Credit Utilization',
        type: 'high_utilization',
        isActive: true,
        conditions: [
          { field: 'utilizationRate', operator: 'gte', value: 90, unit: '%' }
        ],
        severity: 'High',
        description: 'Alert when credit utilization reaches 90% or higher',
        cooldownPeriod: 120,
        escalationRules: [],
        notificationChannels: ['email'],
        autoActions: []
      }
    ];
    
    this.alertRules.set(mockRules);
  }

  private async loadAlertStats(): Promise<void> {
    // Mock data - replace with actual service call
    const mockStats: AlertStats = {
      totalAlerts: 156,
      activeAlerts: 23,
      resolvedAlerts: 133,
      criticalAlerts: 5,
      alertsByType: {
        credit_limit_exceeded: 12,
        high_utilization: 28,
        overdue_payment: 45,
        payment_failure: 23,
        suspicious_activity: 8,
        credit_limit_approach: 15,
        multiple_failed_payments: 10,
        debt_aging: 9,
        inactive_account: 4,
        risk_level_change: 2
      },
      alertsBySeverity: {
        Critical: 5,
        High: 18,
        Medium: 67,
        Low: 66
      },
      averageResolutionTime: 45, // minutes
      escalatedAlerts: 8
    };
    
    this.alertStats.set(mockStats);
  }

  private async loadNotificationChannels(): Promise<void> {
    // Mock data - replace with actual service call
    const mockChannels: NotificationChannel[] = [
      {
        id: 'email1',
        name: 'Email Notifications',
        type: 'email',
        isActive: true,
        configuration: {
          recipients: 'admin@company.com, manager@company.com'
        }
      },
      {
        id: 'sms1',
        name: 'SMS Alerts',
        type: 'sms',
        isActive: true,
        configuration: {
          phoneNumbers: '+62812345678, +62887654321'
        }
      },
      {
        id: 'push1',
        name: 'Push Notifications',
        type: 'push',
        isActive: true,
        configuration: {}
      }
    ];
    
    this.notificationChannels.set(mockChannels);
  }

  private async loadAlertHistory(): Promise<void> {
    // Mock resolved alerts
    const mockHistory: CreditAlert[] = [
      {
        id: 'h1',
        type: 'overdue_payment',
        severity: 'High',
        title: 'Overdue Payment Resolved',
        message: 'Payment received for overdue account',
        memberId: 125,
        memberName: 'Toko Berkah Jaya',
        memberCode: 'M003',
        triggerValue: 15,
        threshold: 7,
        createdAt: '2024-01-14T08:00:00Z',
        resolvedAt: '2024-01-14T14:30:00Z',
        isResolved: true,
        requiresAction: false,
        actionTaken: 'Payment received and processed',
        escalationLevel: 0,
        metadata: {
          overdueDays: 15,
          lastPaymentDate: '2024-01-14T14:30:00Z'
        }
      }
    ];
    
    this.alertHistory.set(mockHistory);
  }

  // Real-time monitoring
  private startRealTimeMonitoring(): void {
    if (!this.isMonitoringActive()) return;

    const monitoringInterval = this.systemSettingsForm.get('monitoringInterval')?.value || 5;
    
    interval(monitoringInterval * 60 * 1000) // Convert minutes to milliseconds
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.checkForNewAlerts())
      )
      .subscribe();
  }

  private async checkForNewAlerts(): Promise<void> {
    if (!this.isMonitoringActive()) return;

    try {
      // This would call the actual monitoring service
      // const newAlerts = await this.memberCreditService.checkAlertConditions();
      
      // For now, we'll simulate periodic checks
      console.log('Checking for new alerts...', new Date().toISOString());
    } catch (error) {
      console.error('Error checking for new alerts:', error);
    }
  }

  // Tab management
  setActiveTab(tab: 'alerts' | 'rules' | 'history' | 'settings'): void {
    this.activeTab.set(tab);
  }

  // Monitoring control
  toggleMonitoring(): void {
    this.isMonitoringActive.update(active => !active);
    
    if (this.isMonitoringActive()) {
      this.startRealTimeMonitoring();
      // this.stateService.addNotification({
      //   id: Date.now(),
      //   type: 'SYSTEM_STATUS',
      //   title: 'Monitoring Started',
      //   message: 'Credit monitoring system has been activated',
      //   priority: 'Medium',
      //   isRead: false,
      //   createdAt: new Date().toISOString()
      // });
    } else {
      // this.stateService.addNotification({
      //   id: Date.now(),
      //   type: 'SYSTEM_STATUS',
      //   title: 'Monitoring Paused',
      //   message: 'Credit monitoring system has been paused',
      //   priority: 'Medium',
      //   isRead: false,
      //   createdAt: new Date().toISOString()
      // });
    }
  }

  // Alert actions
  resolveAlert(alert: CreditAlert): void {
    alert.isResolved = true;
    alert.resolvedAt = new Date().toISOString();
    alert.requiresAction = false;
    alert.actionTaken = 'Resolved manually';
    
    this.alerts.update(alerts => [...alerts]);
    
    // this.stateService.addNotification({
    //   id: Date.now(),
    //   type: 'ALERT_RESOLVED',
    //   title: 'Alert Resolved',
    //   message: `Alert for ${alert.memberName} has been resolved`,
    //   priority: 'Low',
    //   isRead: false,
    //   createdAt: new Date().toISOString()
    // });
  }

  assignAlert(alert: CreditAlert): void {
    // Open assignment modal or dialog
    alert.assignedTo = 'Current User'; // This would be dynamic
    this.alerts.update(alerts => [...alerts]);
  }

  snoozeAlert(alert: CreditAlert): void {
    // Snooze alert for specified duration
    alert.requiresAction = false;
    this.alerts.update(alerts => [...alerts]);
  }

  // Settings
  saveSettings(): void {
    const settings = this.systemSettingsForm.value;
    this.systemSettingsChanged.emit(settings);
    
    // this.stateService.addNotification({
    //   id: Date.now(),
    //   type: 'SETTINGS_SAVED',
    //   title: 'Settings Saved',
    //   message: 'System settings have been updated successfully',
    //   priority: 'Low',
    //   isRead: false,
    //   createdAt: new Date().toISOString()
    // });
  }

  resetSettings(): void {
    this.systemSettingsForm.reset({
      monitoringInterval: 5,
      alertRetentionDays: 90,
      autoEscalationEnabled: true
    });
  }

  // History actions
  exportHistory(): void {
    // Export alert history to CSV/Excel
  }

  // Utility methods
  private setLoading(loading: boolean, message: string = ''): void {
    this.loading.set(loading);
    this.loadingMessage.set(message);
  }

  getAlertTypeIcon(type: AlertType): string {
    const icons: Record<AlertType, string> = {
      credit_limit_exceeded: '🚨',
      high_utilization: '📊',
      overdue_payment: '⏰',
      payment_failure: '❌',
      suspicious_activity: '🔍',
      credit_limit_approach: '⚠️',
      multiple_failed_payments: '🔄',
      debt_aging: '📅',
      inactive_account: '💤',
      risk_level_change: '📈'
    };
    return icons[type] || '🔔';
  }

  getOperatorLabel(operator: string): string {
    const labels: Record<string, string> = {
      gt: '>',
      gte: '≥',
      lt: '<',
      lte: '≤',
      eq: '=',
      neq: '≠',
      contains: 'contains'
    };
    return labels[operator] || operator;
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('id-ID');
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID');
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  calculateResolutionTime(alert: any): string {
    if (!alert?.resolvedAt) return 'Not resolved';
    
    const created = new Date(alert.createdAt).getTime();
    const resolved = new Date(alert.resolvedAt).getTime();
    const diffInMinutes = Math.floor((resolved - created) / (1000 * 60));
    
    return this.formatDuration(diffInMinutes);
  }

  // Missing action methods
  refreshAlerts(): void {
    this.loadAlerts();
  }

  markAllAsRead(): void {
    this.alerts.update(alerts => 
      alerts.map(alert => ({ ...alert, requiresAction: false }))
    );
  }

  viewMemberProfile(memberId: number): void {
    this.memberProfileRequested.emit(memberId);
  }

  viewAlertHistory(memberId: number): void {
    // Filter history for specific member
    const memberHistory = this.alertHistory().filter(alert => alert.memberId === memberId);
    // Could emit an event or navigate to member-specific history view
  }

  escalateAlert(alert: CreditAlert): void {
    alert.escalationLevel++;
    this.alertEscalated.emit(alert);
    this.alerts.update(alerts => [...alerts]);
  }

  // Alert rule management
  createNewRule(): void {
    // This would typically open a modal or navigate to rule creation
    const newRule: AlertRule = {
      id: Date.now().toString(),
      name: 'New Rule',
      type: 'credit_limit_exceeded',
      isActive: false,
      conditions: [],
      severity: 'Medium',
      description: '',
      cooldownPeriod: 60,
      escalationRules: [],
      notificationChannels: [],
      autoActions: []
    };
    
    this.alertRules.update(rules => [...rules, newRule]);
  }

  toggleRuleStatus(rule: AlertRule, event: any): void {
    rule.isActive = event.target.checked;
    this.alertRules.update(rules => [...rules]);
  }

  editRule(rule: AlertRule): void {
    // This would typically open a modal or navigate to rule editing
    console.log('Edit rule:', rule);
  }

  testRule(rule: AlertRule): void {
    // Test the rule against current data
    console.log('Test rule:', rule);
  }

  duplicateRule(rule: AlertRule): void {
    const duplicatedRule: AlertRule = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (Copy)`,
      isActive: false
    };
    
    this.alertRules.update(rules => [...rules, duplicatedRule]);
  }

  deleteRule(rule: AlertRule): void {
    this.alertRules.update(rules => rules.filter(r => r.id !== rule.id));
  }

  // Channel management
  toggleChannelStatus(channel: NotificationChannel, event: any): void {
    channel.isActive = event.target.checked;
    this.notificationChannels.update(channels => [...channels]);
  }
}