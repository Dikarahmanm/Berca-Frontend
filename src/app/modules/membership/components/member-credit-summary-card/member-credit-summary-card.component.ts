// Member Credit Summary Card Component
// POS Toko Eniwan - Phase 2 Implementation
// Reusable credit overview card for member credit information display

import { 
  Component, 
  input, 
  output, 
  computed, 
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Interfaces
import { MemberCreditSummaryDto } from '../../interfaces/member-credit.interfaces';
import { MemberDto } from '../../interfaces/membership.interfaces';

// Utilities
import {
  formatCurrency,
  formatPercentage,
  formatCreditStatus,
  formatRiskLevel,
  formatDaysOverdue
} from '../../utils/credit-utils';

export type CardSize = 'compact' | 'default' | 'detailed';
export type CardVariant = 'default' | 'warning' | 'danger' | 'success';

@Component({
  selector: 'app-member-credit-summary-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="credit-summary-card" 
         [class]="getCardClasses()"
         [attr.data-size]="size()"
         [attr.data-variant]="variant()">
      
      <!-- Card Header -->
      <div class="card-header">
        <div class="member-info">
          <div class="member-name">{{ member()?.name || 'Unknown Member' }}</div>
          <div class="member-details">
            <span class="member-number">{{ member()?.memberNumber }}</span>
            <span class="member-tier" [class]="'tier-' + (member()?.tier || '').toLowerCase()">
              {{ getTierIcon(member()?.tier) }} {{ member()?.tier }}
            </span>
          </div>
        </div>
        
        <div class="card-actions" *ngIf="showActions()">
          <button class="action-btn" (click)="onManageCredit()" title="Manage Credit">
            <span class="action-icon">💳</span>
          </button>
          <button class="action-btn" (click)="onViewTransactions()" title="View Transactions">
            <span class="action-icon">📋</span>
          </button>
        </div>
      </div>

      <!-- Credit Status Banner -->
      <div class="status-banner" [style.background-color]="getCreditStatusColor()">
        <div class="status-content">
          <div class="status-info">
            <span class="status-label">{{ creditSummary()?.statusDescription || 'N/A' }}</span>
            <span class="risk-label">{{ creditSummary()?.riskLevel || 'N/A' }} Risk</span>
          </div>
          <div class="credit-score">
            <div class="score-number">{{ creditSummary()?.creditScore || 0 }}</div>
            <div class="score-label">Score</div>
          </div>
        </div>
      </div>

      <!-- Credit Limits Section -->
      <div class="credit-limits">
        <div class="limit-row main-limit">
          <div class="limit-info">
            <span class="limit-label">Credit Limit</span>
            <span class="limit-value">{{ formatCurrency(creditSummary()?.creditLimit || 0) }}</span>
          </div>
        </div>
        
        <div class="limit-row">
          <div class="limit-info">
            <span class="limit-label">Current Debt</span>
            <span class="limit-value debt">{{ formatCurrency(creditSummary()?.currentDebt || 0) }}</span>
          </div>
        </div>
        
        <div class="limit-row">
          <div class="limit-info">
            <span class="limit-label">Available Credit</span>
            <span class="limit-value available">{{ formatCurrency(creditSummary()?.availableCredit || 0) }}</span>
          </div>
        </div>
      </div>

      <!-- Credit Utilization Bar -->
      <div class="utilization-section">
        <div class="utilization-header">
          <span class="utilization-label">Credit Utilization</span>
          <span class="utilization-percentage">{{ formatPercentage(creditSummary()?.creditUtilization || 0) }}</span>
        </div>
        <div class="utilization-bar">
          <div class="utilization-progress" 
               [style.width.%]="creditSummary()?.creditUtilization || 0"
               [class]="getUtilizationClass()">
          </div>
        </div>
        <div class="utilization-labels">
          <span class="utilization-min">0%</span>
          <span class="utilization-max">100%</span>
        </div>
      </div>

      <!-- Payment Information (shown in default and detailed sizes) -->
      <div class="payment-info" *ngIf="size() !== 'compact'">
        <div class="payment-row" *ngIf="(creditSummary()?.daysOverdue || 0) > 0">
          <div class="payment-alert">
            <span class="alert-icon">⚠️</span>
            <div class="alert-content">
              <div class="alert-title">Payment Overdue</div>
              <div class="alert-message">
                {{ getOverdueMessage() }}
              </div>
            </div>
          </div>
        </div>

        <div class="payment-row">
          <div class="payment-metric">
            <span class="metric-label">Payment Success Rate</span>
            <span class="metric-value">{{ formatPercentage(creditSummary()?.paymentSuccessRate || 0) }}</span>
          </div>
        </div>

        <div class="payment-row" *ngIf="creditSummary()?.nextPaymentDueDate">
          <div class="payment-metric">
            <span class="metric-label">Next Payment Due</span>
            <span class="metric-value">{{ formatDate(creditSummary()?.nextPaymentDueDate) }}</span>
          </div>
        </div>

        <div class="payment-row">
          <div class="payment-metric">
            <span class="metric-label">Payment Terms</span>
            <span class="metric-value">{{ creditSummary()?.paymentTerms || 0 }} days</span>
          </div>
        </div>
      </div>

      <!-- Detailed Information (shown only in detailed size) -->
      <div class="detailed-info" *ngIf="size() === 'detailed'">
        <div class="detail-section">
          <h4 class="detail-title">Additional Information</h4>
          
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Total Transactions</span>
              <span class="detail-value">{{ formatNumber(creditSummary()?.totalTransactions || 0) }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Average Transaction</span>
              <span class="detail-value">{{ formatCurrency(creditSummary()?.avgTransactionAmount || 0) }}</span>
            </div>

            <div class="detail-item" *ngIf="creditSummary()?.lastPaymentDate">
              <span class="detail-label">Last Payment</span>
              <span class="detail-value">{{ formatDate(creditSummary()?.lastPaymentDate) }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Max Transaction Allowed</span>
              <span class="detail-value">{{ formatCurrency(0) }} <!-- maxAllowedTransaction not available --></span>
            </div>

            <div class="detail-item" *ngIf="creditSummary()?.branchName">
              <span class="detail-label">Branch</span>
              <span class="detail-value">{{ creditSummary()?.branchName }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Credit Eligibility</span>
              <span class="detail-value" [class.eligible]="creditSummary()?.isEligibleForCredit" [class.not-eligible]="!creditSummary()?.isEligibleForCredit">
                {{ creditSummary()?.isEligibleForCredit ? '✅ Eligible' : '❌ Not Eligible' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Footer (shown when actions enabled) -->
      <div class="card-footer" *ngIf="showQuickActions() && (creditSummary()?.currentDebt || 0) > 0">
        <div class="quick-actions">
          <button class="quick-action-btn primary" (click)="onRecordPayment()" 
                  [disabled]="!canRecordPayment()">
            <span class="action-icon">💰</span>
            <span class="action-text">Record Payment</span>
          </button>
          
          <button class="quick-action-btn secondary" (click)="onSendReminder()"
                  *ngIf="(creditSummary()?.daysOverdue || 0) > 0">
            <span class="action-icon">📢</span>
            <span class="action-text">Send Reminder</span>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!creditSummary() && !loading()">
        <div class="empty-icon">💳</div>
        <div class="empty-title">No Credit Information</div>
        <div class="empty-message">Credit data is not available for this member</div>
        <button class="btn-setup-credit" (click)="onSetupCredit()" *ngIf="showActions()">
          Setup Credit Account
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading()">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading credit information...</div>
      </div>
    </div>
  `,
  styles: [`
    // Credit Summary Card Container
    .credit-summary-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-xl);
      overflow: hidden;
      transition: var(--transition);
      box-shadow: var(--shadow-sm);

      &:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--primary-light);
      }

      // Card Size Variants
      &[data-size="compact"] {
        min-height: 200px;
      }

      &[data-size="default"] {
        min-height: 300px;
      }

      &[data-size="detailed"] {
        min-height: 450px;
      }

      // Card Variant Colors
      &[data-variant="warning"] {
        border-left: 6px solid var(--warning);
      }

      &[data-variant="danger"] {
        border-left: 6px solid var(--error);
      }

      &[data-variant="success"] {
        border-left: 6px solid var(--success);
      }
    }

    // Card Header
    .card-header {
      padding: var(--s6);
      background: linear-gradient(135deg, var(--bg) 0%, var(--bg-secondary) 100%);
      border-bottom: 2px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      .member-info {
        flex: 1;

        .member-name {
          font-size: var(--text-lg);
          font-weight: var(--font-bold);
          color: var(--text);
          margin-bottom: var(--s2);
          line-height: 1.3;
        }

        .member-details {
          display: flex;
          gap: var(--s3);
          align-items: center;

          .member-number {
            background: var(--primary-light);
            color: var(--primary);
            font-size: var(--text-xs);
            font-weight: var(--font-medium);
            padding: var(--s1) var(--s2);
            border-radius: var(--radius-sm);
          }

          .member-tier {
            font-size: var(--text-xs);
            font-weight: var(--font-medium);
            padding: var(--s1) var(--s2);
            border-radius: var(--radius-sm);
            background: var(--bg-secondary);
            color: var(--text-secondary);

            &.tier-bronze { background: #f4f1ee; color: #8b5a2b; }
            &.tier-silver { background: #f5f5f5; color: #666; }
            &.tier-gold { background: #fffbf0; color: #b8860b; }
            &.tier-platinum { background: #f8f8f8; color: #5a5a5a; }
            &.tier-vip { background: #f3f0f8; color: #6a4c93; }
          }
        }
      }

      .card-actions {
        display: flex;
        gap: var(--s2);

        .action-btn {
          width: 36px;
          height: 36px;
          border: 2px solid var(--border);
          border-radius: var(--radius);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition);

          &:hover {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
          }

          .action-icon {
            font-size: var(--text-base);
          }
        }
      }
    }

    // Status Banner
    .status-banner {
      padding: var(--s4);
      color: white;
      position: relative;

      .status-content {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .status-info {
          display: flex;
          gap: var(--s4);
          align-items: center;

          .status-label {
            font-size: var(--text-base);
            font-weight: var(--font-bold);
          }

          .risk-label {
            font-size: var(--text-sm);
            font-weight: var(--font-medium);
            background: rgba(255, 255, 255, 0.2);
            padding: var(--s1) var(--s2);
            border-radius: var(--radius-sm);
          }
        }

        .credit-score {
          text-align: center;

          .score-number {
            font-size: var(--text-2xl);
            font-weight: var(--font-bold);
            line-height: 1;
          }

          .score-label {
            font-size: var(--text-xs);
            font-weight: var(--font-medium);
            opacity: 0.9;
          }
        }
      }
    }

    // Credit Limits
    .credit-limits {
      padding: var(--s6);

      .limit-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--s3) 0;
        border-bottom: 1px solid var(--border);

        &:last-child {
          border-bottom: none;
        }

        &.main-limit {
          .limit-value {
            font-size: var(--text-xl);
            font-weight: var(--font-bold);
            color: var(--primary);
          }
        }

        .limit-info {
          display: flex;
          justify-content: space-between;
          width: 100%;

          .limit-label {
            font-size: var(--text-sm);
            color: var(--text-secondary);
            font-weight: var(--font-medium);
          }

          .limit-value {
            font-size: var(--text-base);
            font-weight: var(--font-semibold);
            color: var(--text);

            &.debt {
              color: var(--error);
            }

            &.available {
              color: var(--success);
            }
          }
        }
      }
    }

    // Credit Utilization
    .utilization-section {
      padding: 0 var(--s6) var(--s6) var(--s6);

      .utilization-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--s3);

        .utilization-label {
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          color: var(--text-secondary);
        }

        .utilization-percentage {
          font-size: var(--text-base);
          font-weight: var(--font-bold);
          color: var(--text);
        }
      }

      .utilization-bar {
        background: var(--bg);
        border-radius: var(--radius);
        height: 12px;
        overflow: hidden;
        margin-bottom: var(--s2);

        .utilization-progress {
          height: 100%;
          border-radius: var(--radius);
          transition: var(--transition);

          &.low {
            background: var(--success);
          }

          &.medium {
            background: var(--warning);
          }

          &.high {
            background: var(--error);
          }

          &.critical {
            background: var(--error);
            animation: pulse 2s infinite;
          }
        }
      }

      .utilization-labels {
        display: flex;
        justify-content: space-between;
        font-size: var(--text-xs);
        color: var(--text-muted);
      }
    }

    // Payment Information
    .payment-info {
      padding: 0 var(--s6) var(--s6) var(--s6);
      border-top: 1px solid var(--border);
      margin-top: var(--s4);
      padding-top: var(--s4);

      .payment-row {
        margin-bottom: var(--s4);

        &:last-child {
          margin-bottom: 0;
        }
      }

      .payment-alert {
        display: flex;
        gap: var(--s3);
        align-items: flex-start;
        background: rgba(225, 90, 79, 0.1);
        border: 2px solid var(--error);
        border-radius: var(--radius);
        padding: var(--s4);

        .alert-icon {
          font-size: var(--text-lg);
          flex-shrink: 0;
        }

        .alert-content {
          flex: 1;

          .alert-title {
            font-size: var(--text-sm);
            font-weight: var(--font-bold);
            color: var(--error);
            margin-bottom: var(--s1);
          }

          .alert-message {
            font-size: var(--text-xs);
            color: var(--text);
          }
        }
      }

      .payment-metric {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .metric-label {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }

        .metric-value {
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          color: var(--text);
        }
      }
    }

    // Detailed Information
    .detailed-info {
      padding: var(--s6);
      border-top: 1px solid var(--border);
      background: var(--bg);

      .detail-title {
        font-size: var(--text-lg) !important;
        font-weight: var(--font-semibold) !important;
        color: var(--text) !important;
        margin: 0 0 var(--s4) 0 !important;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--s4);

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--s2) 0;

          .detail-label {
            font-size: var(--text-xs);
            color: var(--text-secondary);
            font-weight: var(--font-medium);
          }

          .detail-value {
            font-size: var(--text-sm);
            font-weight: var(--font-medium);
            color: var(--text);

            &.eligible {
              color: var(--success);
            }

            &.not-eligible {
              color: var(--error);
            }
          }
        }
      }
    }

    // Card Footer
    .card-footer {
      padding: var(--s6);
      background: var(--bg);
      border-top: 1px solid var(--border);

      .quick-actions {
        display: flex;
        gap: var(--s3);

        .quick-action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--s2);
          padding: var(--s3);
          border-radius: var(--radius);
          border: 2px solid transparent;
          cursor: pointer;
          transition: var(--transition);
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          min-height: 44px;

          &.primary {
            background: var(--primary);
            color: white;
            border-color: var(--primary);

            &:hover:not(:disabled) {
              background: var(--primary-hover);
              border-color: var(--primary-hover);
            }
          }

          &.secondary {
            background: var(--bg-secondary);
            color: var(--text);
            border-color: var(--border);

            &:hover:not(:disabled) {
              background: var(--primary-light);
              color: var(--primary);
              border-color: var(--primary);
            }
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .action-icon {
            font-size: var(--text-base);
          }

          .action-text {
            font-size: var(--text-sm);
          }
        }
      }
    }

    // Empty State
    .empty-state {
      padding: var(--s12);
      text-align: center;

      .empty-icon {
        font-size: 4rem;
        margin-bottom: var(--s4);
        opacity: 0.5;
      }

      .empty-title {
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        color: var(--text);
        margin-bottom: var(--s2);
      }

      .empty-message {
        font-size: var(--text-sm);
        color: var(--text-secondary);
        margin-bottom: var(--s6);
      }

      .btn-setup-credit {
        padding: var(--s3) var(--s6);
        background: var(--primary);
        color: white;
        border: 2px solid var(--primary);
        border-radius: var(--radius);
        font-size: var(--text-sm);
        font-weight: var(--font-medium);
        cursor: pointer;
        transition: var(--transition);

        &:hover {
          background: var(--primary-hover);
          border-color: var(--primary-hover);
        }
      }
    }

    // Loading State
    .loading-state {
      padding: var(--s12);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--border);
        border-top: 3px solid var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: var(--s4);
      }

      .loading-text {
        font-size: var(--text-sm);
        color: var(--text-secondary);
      }
    }

    // Animations
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    // Responsive Design
    @media (max-width: 640px) {
      .card-header {
        padding: var(--s4);

        .member-details {
          flex-direction: column;
          gap: var(--s2);
          align-items: flex-start;
        }
      }

      .status-banner {
        .status-content {
          flex-direction: column;
          gap: var(--s3);
          text-align: center;
        }
      }

      .credit-limits,
      .utilization-section,
      .payment-info,
      .detailed-info,
      .card-footer {
        padding: var(--s4);
      }

      .detail-grid {
        grid-template-columns: 1fr !important;
      }

      .quick-actions {
        flex-direction: column;

        .quick-action-btn {
          width: 100%;
        }
      }
    }
  `]
})
export class MemberCreditSummaryCardComponent {
  // Input signals
  readonly member = input<MemberDto | null>(null);
  readonly creditSummary = input<MemberCreditSummaryDto | null>(null);
  readonly size = input<CardSize>('default');
  readonly variant = input<CardVariant>('default');
  readonly showActions = input<boolean>(true);
  readonly showQuickActions = input<boolean>(true);
  readonly loading = input<boolean>(false);

  // Output events
  readonly manageCredit = output<MemberDto>();
  readonly viewTransactions = output<MemberDto>();
  readonly recordPayment = output<MemberDto>();
  readonly sendReminder = output<MemberDto>();
  readonly setupCredit = output<MemberDto>();

  // Computed properties
  readonly canRecordPayment = computed(() => {
    const summary = this.creditSummary();
    return summary && summary.currentDebt > 0;
  });

  // Event handlers
  onManageCredit(): void {
    const member = this.member();
    if (member) {
      this.manageCredit.emit(member);
    }
  }

  onViewTransactions(): void {
    const member = this.member();
    if (member) {
      this.viewTransactions.emit(member);
    }
  }

  onRecordPayment(): void {
    const member = this.member();
    if (member) {
      this.recordPayment.emit(member);
    }
  }

  onSendReminder(): void {
    const member = this.member();
    if (member) {
      this.sendReminder.emit(member);
    }
  }

  onSetupCredit(): void {
    const member = this.member();
    if (member) {
      this.setupCredit.emit(member);
    }
  }

  // Utility methods
  getCardClasses(): string {
    const classes = ['credit-summary-card'];
    const variant = this.variant();
    const summary = this.creditSummary();
    
    if (variant !== 'default') {
      classes.push(`variant-${variant}`);
    }

    // Auto-detect variant based on credit status if not explicitly set
    if (variant === 'default' && summary) {
      if (summary.statusDescription === 'Blocked') {
        classes.push('variant-danger');
      } else if (summary.statusDescription === 'Bad' || summary.daysOverdue > 30) {
        classes.push('variant-danger');
      } else if (summary.statusDescription === 'Warning' || summary.daysOverdue > 0) {
        classes.push('variant-warning');
      } else if (summary.statusDescription === 'Good') {
        classes.push('variant-success');
      }
    }

    return classes.join(' ');
  }

  getCreditStatusColor(): string {
    const summary = this.creditSummary();
    if (!summary) return '#6c757d';

    const statusColors: Record<string, string> = {
      'Good': '#52a573',
      'Warning': '#e6a855',
      'Bad': '#d66b2f',
      'Blocked': '#d44a3f'
    };

    return statusColors[summary.statusDescription] || '#6c757d';
  }

  getUtilizationClass(): string {
    const summary = this.creditSummary();
    if (!summary) return 'low';

    const utilization = summary.creditUtilization;
    if (utilization <= 30) return 'low';
    if (utilization <= 60) return 'medium';
    if (utilization <= 80) return 'high';
    return 'critical';
  }

  getOverdueMessage(): string {
    const summary = this.creditSummary();
    if (!summary || summary.daysOverdue <= 0) return '';

    const days = summary.daysOverdue;
    const amount = this.formatCurrency(summary.overdueAmount);

    if (days <= 7) {
      return `${amount} overdue for ${days} day(s)`;
    } else if (days <= 30) {
      return `${amount} overdue for ${days} days - Contact member`;
    } else {
      return `${amount} overdue for ${days} days - Urgent collection required`;
    }
  }

  getTierIcon(tier: string | undefined): string {
    const icons = {
      'Bronze': '🥉',
      'Silver': '🥈', 
      'Gold': '🥇',
      'Platinum': '💎',
      'VIP': '👑'
    };
    return icons[tier as keyof typeof icons] || '🥉';
  }

  // Formatting methods
  formatCurrency = formatCurrency;
  formatPercentage = formatPercentage;

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
  }
}