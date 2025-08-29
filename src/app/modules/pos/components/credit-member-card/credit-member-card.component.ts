import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { POSMemberCreditDto } from '../../../membership/interfaces/member-credit.interfaces';

@Component({
  selector: 'app-credit-member-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="credit-member-card" [class.warning]="isLowCredit()" [class.danger]="isOverLimit()">
      <!-- Header -->
      <div class="card-header">
        <div class="member-info">
          <div class="member-icon">👤</div>
          <div class="member-details">
            <h4 class="member-name">{{ memberCredit().name }}</h4>
            <p class="member-code">{{ memberCredit().memberNumber }}</p>
          </div>
        </div>
        <div class="credit-status-badge" 
             [class.active]="memberCredit().creditStatus === 'Good'" 
             [class.suspended]="memberCredit().creditStatus === 'Bad'"
             [class.inactive]="memberCredit().creditStatus === 'Blocked'">
          {{ memberCredit().creditStatus }}
        </div>
      </div>

      <!-- Credit Summary -->
      <div class="credit-summary">
        <div class="summary-row">
          <span class="label">Limit Kredit</span>
          <span class="value">{{ formatCurrency(memberCredit().creditLimit) }}</span>
        </div>
        
        <div class="summary-row debt">
          <span class="label">Hutang Saat Ini</span>
          <span class="value">{{ formatCurrency(memberCredit().currentDebt) }}</span>
        </div>
        
        <div class="summary-row available" [class.low]="isLowCredit()" [class.over]="isOverLimit()">
          <span class="label">Sisa Limit</span>
          <span class="value">{{ formatCurrency(availableCredit()) }}</span>
        </div>
      </div>

      <!-- Credit Usage Bar -->
      <div class="credit-usage">
        <div class="usage-label">
          <span>Penggunaan Kredit</span>
          <span class="usage-percentage">{{ usagePercentage() }}%</span>
        </div>
        <div class="usage-bar">
          <div class="usage-fill" 
               [style.width.%]="Math.min(usagePercentage(), 100)"
               [class.warning]="usagePercentage() >= 80"
               [class.danger]="usagePercentage() >= 100">
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="card-actions">
        <button class="btn btn-sm btn-outline" (click)="onViewHistory()">
          📊 Riwayat
        </button>
        <button class="btn btn-sm btn-outline" (click)="onViewDetails()">
          📋 Detail
        </button>
        @if (availableCredit() > 0) {
        <button class="btn btn-sm btn-primary" (click)="onUseCredit()">
          💳 Gunakan Kredit
        </button>
        } @else {
        <button class="btn btn-sm btn-secondary" disabled>
          ⚠️ Limit Terlampaui
        </button>
        }
      </div>

      <!-- Last Transaction Info -->
      @if (memberCredit().lastCreditUsed) {
      <div class="last-transaction">
        <small class="transaction-info">
          <span class="transaction-label">Kredit Terakhir:</span>
          <span class="transaction-date">{{ formatDate(memberCredit().lastCreditUsed!) }}</span>
        </small>
      </div>
      }

      <!-- Warning Messages -->
      @if (isOverLimit()) {
      <div class="warning-message danger">
        <span class="warning-icon">⚠️</span>
        <span>Limit kredit telah terlampaui</span>
      </div>
      } @else if (isLowCredit()) {
      <div class="warning-message warning">
        <span class="warning-icon">💡</span>
        <span>Sisa limit kredit rendah</span>
      </div>
      }
    </div>
  `,
  styles: [`
    .credit-member-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s4);
      transition: var(--transition);
      
      &.warning {
        border-color: var(--warning);
      }
      
      &.danger {
        border-color: var(--error);
      }
      
      &:hover {
        border-color: var(--primary);
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s4);
    }

    .member-info {
      display: flex;
      align-items: center;
      gap: var(--s3);
    }

    .member-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-light);
      border-radius: var(--radius);
      font-size: var(--text-xl);
    }

    .member-details {
      flex: 1;
    }

    .member-name {
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin: 0;
      line-height: var(--leading-tight);
    }

    .member-code {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: 0;
      line-height: var(--leading-normal);
    }

    .credit-status-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      text-transform: uppercase;
      
      &.active {
        background: var(--success);
        color: white;
      }
      
      &.suspended {
        background: var(--warning);
        color: white;
      }
      
      &.inactive {
        background: var(--text-muted);
        color: white;
      }
    }

    .credit-summary {
      margin-bottom: var(--s4);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s2) 0;
      border-bottom: 1px solid var(--border);
      
      &:last-child {
        border-bottom: none;
      }
      
      &.debt .value {
        color: var(--error);
        font-weight: var(--font-semibold);
      }
      
      &.available {
        background: var(--bg-secondary);
        margin: 0 calc(-1 * var(--s2));
        padding: var(--s2);
        border-radius: var(--radius);
        border-bottom: none;
        
        .value {
          color: var(--success);
          font-weight: var(--font-bold);
        }
        
        &.low .value {
          color: var(--warning);
        }
        
        &.over .value {
          color: var(--error);
        }
      }
    }

    .label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .value {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text);
    }

    .credit-usage {
      margin-bottom: var(--s4);
    }

    .usage-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s2);
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .usage-percentage {
      font-weight: var(--font-semibold);
      color: var(--text);
    }

    .usage-bar {
      height: 6px;
      background: var(--bg-secondary);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .usage-fill {
      height: 100%;
      background: var(--success);
      transition: var(--transition);
      
      &.warning {
        background: var(--warning);
      }
      
      &.danger {
        background: var(--error);
      }
    }

    .card-actions {
      display: flex;
      gap: var(--s2);
      margin-bottom: var(--s3);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--s1);
      padding: var(--s2) var(--s3);
      border: 2px solid transparent;
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      min-height: 32px;

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

      &.btn-secondary {
        background: var(--bg-secondary);
        color: var(--text-muted);
        border-color: var(--border);
        cursor: not-allowed;
      }

      &.btn-sm {
        padding: var(--s1) var(--s2);
        font-size: var(--text-xs);
        min-height: 28px;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .last-transaction {
      margin-bottom: var(--s2);
    }

    .transaction-info {
      display: flex;
      justify-content: space-between;
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    .transaction-date {
      font-weight: var(--font-medium);
    }

    .warning-message {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      
      &.warning {
        background: rgba(230, 168, 85, 0.1);
        color: var(--warning);
        border: 1px solid var(--warning);
      }
      
      &.danger {
        background: rgba(212, 74, 63, 0.1);
        color: var(--error);
        border: 1px solid var(--error);
      }
    }

    .warning-icon {
      font-size: var(--text-sm);
    }

    // Mobile responsive
    @media (max-width: 640px) {
      .credit-member-card {
        padding: var(--s3);
      }

      .card-actions {
        flex-wrap: wrap;
        gap: var(--s1);
      }

      .btn {
        flex: 1;
        min-width: 0;
      }

      .member-name {
        font-size: var(--text-sm);
      }

      .member-code {
        font-size: var(--text-xs);
      }
    }
  `]
})
export class CreditMemberCardComponent {
  // Input signals
  memberCredit = input.required<POSMemberCreditDto>();

  // Output events
  viewHistory = output<void>();
  viewDetails = output<void>();
  useCredit = output<void>();

  // Computed properties
  availableCredit = computed(() => {
    const credit = this.memberCredit();
    return Math.max(0, credit.creditLimit - credit.currentDebt);
  });

  usagePercentage = computed(() => {
    const credit = this.memberCredit();
    if (credit.creditLimit === 0) return 0;
    return Math.round((credit.currentDebt / credit.creditLimit) * 100);
  });

  isLowCredit = computed(() => {
    return this.usagePercentage() >= 80 && this.usagePercentage() < 100;
  });

  isOverLimit = computed(() => {
    return this.usagePercentage() >= 100;
  });

  // Make Math available in template
  Math = Math;

  // Event handlers
  onViewHistory(): void {
    this.viewHistory.emit();
  }

  onViewDetails(): void {
    this.viewDetails.emit();
  }

  onUseCredit(): void {
    this.useCredit.emit();
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}