import { Component, input, output, signal, computed, inject, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemberCreditService } from '../../../membership/services/member-credit.service';
import { 
  CreditValidationRequestDto, 
  CreditValidationResultDto, 
  POSMemberCreditDto 
} from '../../../membership/interfaces/member-credit.interfaces';
import { validateCreditTransaction } from '../../../membership/utils/credit-utils';

export interface ValidationRequest {
  memberId: number;
  amount: number;
  description?: string;
  items?: any[];
}

@Component({
  selector: 'app-pos-credit-validation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="credit-validation-container">
      <!-- Validation Header -->
      <div class="validation-header">
        <div class="header-icon" [class.success]="isValid()" [class.error]="!isValid() && hasValidated()">
          {{ validationIcon() }}
        </div>
        <div class="header-content">
          <h3 class="validation-title">{{ validationTitle() }}</h3>
          <p class="validation-subtitle">{{ validationSubtitle() }}</p>
        </div>
      </div>

      <!-- Loading State -->
      @if (isValidating()) {
      <div class="validation-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">Memvalidasi limit kredit...</p>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
      </div>
      }

      <!-- Validation Results -->
      @if (!isValidating() && validationResult()) {
      <div class="validation-results">
        <!-- Main Status -->
        <div class="status-card" 
             [class.success]="isValid()" 
             [class.error]="!isValid()" 
             [class.warning]="isNearLimit()">
          <div class="status-icon">
            {{ statusIcon() }}
          </div>
          <div class="status-content">
            <div class="status-title">{{ statusTitle() }}</div>
            <div class="status-message">{{ getValidationMessages() }}</div>
          </div>
        </div>

        <!-- Credit Details -->
        @if (memberCredit()) {
        <div class="credit-details">
          <div class="detail-row">
            <span class="detail-label">Limit Kredit</span>
            <span class="detail-value">{{ formatCurrency(memberCredit()!.creditLimit) }}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Hutang Saat Ini</span>
            <span class="detail-value current-debt">{{ formatCurrency(memberCredit()!.currentDebt) }}</span>
          </div>
          
          <div class="detail-row highlight">
            <span class="detail-label">Sisa Limit</span>
            <span class="detail-value available-limit" 
                  [class.low]="isNearLimit()" 
                  [class.critical]="!isValid()">
              {{ formatCurrency(validationResult()!.availableCredit || 0) }}
            </span>
          </div>

          <div class="detail-separator"></div>
          
          <div class="detail-row transaction">
            <span class="detail-label">Jumlah Transaksi</span>
            <span class="detail-value transaction-amount">{{ formatCurrency(validationRequest().amount) }}</span>
          </div>
          
          @if (isValid()) {
          <div class="detail-row remaining">
            <span class="detail-label">Sisa Setelah Transaksi</span>
            <span class="detail-value remaining-limit">
              {{ formatCurrency(remainingAfterTransaction()) }}
            </span>
          </div>
          }
        </div>
        }

        <!-- Progress Indicators -->
        <div class="progress-indicators">
          <div class="progress-item">
            <div class="progress-label">Penggunaan Kredit</div>
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" 
                     [style.width.%]="currentUsagePercentage()"
                     [class.warning]="currentUsagePercentage() >= 80"
                     [class.danger]="currentUsagePercentage() >= 100">
                </div>
              </div>
              <span class="progress-text">{{ currentUsagePercentage() }}%</span>
            </div>
          </div>

          @if (isValid()) {
          <div class="progress-item">
            <div class="progress-label">Setelah Transaksi</div>
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" 
                     [style.width.%]="afterTransactionUsagePercentage()"
                     [class.warning]="afterTransactionUsagePercentage() >= 80"
                     [class.danger]="afterTransactionUsagePercentage() >= 100">
                </div>
              </div>
              <span class="progress-text">{{ afterTransactionUsagePercentage() }}%</span>
            </div>
          </div>
          }
        </div>

        <!-- Risk Assessment -->
        @if (riskLevel() !== 'None') {
        <div class="risk-assessment">
          <div class="risk-card" 
               [class.low]="riskLevel() === 'Low'" 
               [class.medium]="riskLevel() === 'Medium'" 
               [class.high]="riskLevel() === 'High'">
            <div class="risk-icon">{{ riskIcon() }}</div>
            <div class="risk-content">
              <div class="risk-title">{{ riskTitle() }}</div>
              <div class="risk-message">{{ riskMessage() }}</div>
            </div>
          </div>
        </div>
        }

        <!-- Action Buttons -->
        <div class="validation-actions">
          @if (isValid()) {
          <button class="btn btn-primary" (click)="onApprove()">
            ✅ Setujui Transaksi
          </button>
          <button class="btn btn-outline" (click)="onRevalidate()">
            🔄 Validasi Ulang
          </button>
          } @else {
          <button class="btn btn-secondary" disabled>
            ❌ Transaksi Ditolak
          </button>
          <button class="btn btn-outline" (click)="onRevalidate()">
            🔄 Coba Lagi
          </button>
          }
        </div>
      </div>
      }

      <!-- Error State -->
      @if (validationError()) {
      <div class="validation-error">
        <div class="error-card">
          <div class="error-icon">⚠️</div>
          <div class="error-content">
            <div class="error-title">Gagal Memvalidasi</div>
            <div class="error-message">{{ validationError() }}</div>
          </div>
        </div>
        <div class="error-actions">
          <button class="btn btn-primary" (click)="onRevalidate()">
            🔄 Coba Lagi
          </button>
          <button class="btn btn-outline" (click)="onCancel()">
            Batal
          </button>
        </div>
      </div>
      }
    </div>
  `,
  styles: [`
    .credit-validation-container {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s4);
      max-width: 480px;
      margin: 0 auto;
    }

    .validation-header {
      display: flex;
      align-items: center;
      gap: var(--s3);
      margin-bottom: var(--s4);
      padding-bottom: var(--s3);
      border-bottom: 2px solid var(--border);
    }

    .header-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius);
      font-size: var(--text-2xl);
      background: var(--bg-secondary);
      
      &.success {
        background: var(--success);
        color: white;
      }
      
      &.error {
        background: var(--error);
        color: white;
      }
    }

    .validation-title {
      font-size: var(--text-lg);
      font-weight: var(--font-bold);
      color: var(--text);
      margin: 0 0 var(--s1) 0;
    }

    .validation-subtitle {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: 0;
    }

    .validation-loading {
      text-align: center;
      padding: var(--s6) 0;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto var(--s3) auto;
    }

    .loading-text {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin-bottom: var(--s4);
    }

    .loading-progress {
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: var(--bg-secondary);
      border-radius: var(--radius);
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: var(--primary);
      transition: var(--transition);
      
      &.warning {
        background: var(--warning);
      }
      
      &.danger {
        background: var(--error);
      }
    }

    .loading-progress .progress-fill {
      width: 100%;
      animation: loading 2s ease-in-out infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes loading {
      0%, 100% { transform: scaleX(0.3) translateX(-50%); }
      50% { transform: scaleX(1) translateX(0); }
    }

    .validation-results {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .status-card {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s4);
      border-radius: var(--radius-lg);
      margin-bottom: var(--s4);
      
      &.success {
        background: rgba(82, 165, 115, 0.1);
        border: 2px solid var(--success);
      }
      
      &.error {
        background: rgba(212, 74, 63, 0.1);
        border: 2px solid var(--error);
      }
      
      &.warning {
        background: rgba(230, 168, 85, 0.1);
        border: 2px solid var(--warning);
      }
    }

    .status-icon {
      font-size: var(--text-2xl);
    }

    .status-title {
      font-size: var(--text-base);
      font-weight: var(--font-bold);
      margin-bottom: var(--s1);
    }

    .status-message {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .credit-details {
      background: var(--bg-secondary);
      border-radius: var(--radius);
      padding: var(--s4);
      margin-bottom: var(--s4);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s2) 0;
      
      &.highlight {
        background: var(--surface);
        margin: var(--s2) calc(-1 * var(--s2));
        padding: var(--s2);
        border-radius: var(--radius);
        font-weight: var(--font-semibold);
      }
      
      &.transaction {
        border-top: 2px solid var(--border);
        padding-top: var(--s3);
        margin-top: var(--s2);
      }
      
      &.remaining {
        background: rgba(82, 165, 115, 0.1);
        margin: var(--s2) calc(-1 * var(--s2));
        padding: var(--s2);
        border-radius: var(--radius);
        color: var(--success);
        font-weight: var(--font-bold);
      }
    }

    .detail-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .detail-value {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      
      &.current-debt {
        color: var(--error);
      }
      
      &.available-limit {
        color: var(--success);
        
        &.low {
          color: var(--warning);
        }
        
        &.critical {
          color: var(--error);
        }
      }
      
      &.transaction-amount {
        color: var(--primary);
        font-weight: var(--font-bold);
      }
    }

    .detail-separator {
      height: 1px;
      background: var(--border);
      margin: var(--s2) 0;
    }

    .progress-indicators {
      margin-bottom: var(--s4);
    }

    .progress-item {
      margin-bottom: var(--s3);
      
      &:last-child {
        margin-bottom: 0;
      }
    }

    .progress-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-bottom: var(--s2);
    }

    .progress-bar-container {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-secondary);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .progress-text {
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      color: var(--text-secondary);
      min-width: 40px;
      text-align: right;
    }

    .risk-assessment {
      margin-bottom: var(--s4);
    }

    .risk-card {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s3);
      border-radius: var(--radius);
      
      &.low {
        background: rgba(75, 191, 123, 0.1);
        border: 1px solid var(--success);
      }
      
      &.medium {
        background: rgba(230, 168, 85, 0.1);
        border: 1px solid var(--warning);
      }
      
      &.high {
        background: rgba(212, 74, 63, 0.1);
        border: 1px solid var(--error);
      }
    }

    .risk-icon {
      font-size: var(--text-lg);
    }

    .risk-title {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      margin-bottom: var(--s1);
    }

    .risk-message {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .validation-actions, .error-actions {
      display: flex;
      gap: var(--s3);
      margin-top: var(--s4);
    }

    .validation-error {
      text-align: center;
      padding: var(--s4) 0;
    }

    .error-card {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s4);
      background: rgba(212, 74, 63, 0.1);
      border: 2px solid var(--error);
      border-radius: var(--radius-lg);
      margin-bottom: var(--s4);
      text-align: left;
    }

    .error-icon {
      font-size: var(--text-2xl);
    }

    .error-title {
      font-size: var(--text-base);
      font-weight: var(--font-bold);
      color: var(--error);
      margin-bottom: var(--s1);
    }

    .error-message {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--s2);
      padding: var(--s3) var(--s4);
      border: 2px solid transparent;
      border-radius: var(--radius);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      min-height: 44px;
      flex: 1;

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

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    // Mobile responsive
    @media (max-width: 640px) {
      .credit-validation-container {
        padding: var(--s3);
        margin: 0 var(--s2);
      }

      .validation-actions, .error-actions {
        flex-direction: column;
        gap: var(--s2);
      }

      .btn {
        width: 100%;
      }

      .progress-bar-container {
        flex-direction: column;
        align-items: stretch;
        gap: var(--s1);
      }

      .progress-text {
        text-align: center;
      }
    }
  `]
})
export class POSCreditValidationComponent {
  private memberCreditService = inject(MemberCreditService);

  // Input signals
  validationRequest = input.required<ValidationRequest>();
  memberCredit = input<POSMemberCreditDto | null>(null);
  autoValidate = input<boolean>(true);

  // Output events
  validationComplete = output<CreditValidationResultDto>();
  approved = output<CreditValidationResultDto>();
  rejected = output<CreditValidationResultDto>();
  cancelled = output<void>();

  // Internal state signals
  isValidating = signal<boolean>(false);
  validationResult = signal<CreditValidationResultDto | null>(null);
  validationError = signal<string | null>(null);
  hasValidated = signal<boolean>(false);

  // Computed properties
  isValid = computed(() => {
    const result = this.validationResult();
    const member = this.memberCredit();
    
    if (!result) return false;
    
    // If backend says not approved, check if it's due to overdue payments with zero debt
    if (!result.isApproved && member && member.currentDebt === 0) {
      // Check if the only issue is overdue payments
      const hasOnlyOverdueIssues = result.errors?.every(error => 
        error.toLowerCase().includes('overdue')
      ) ?? false;
      
      const hasNonOverdueErrors = result.errors?.some(error => 
        !error.toLowerCase().includes('overdue')
      ) ?? false;
      
      // If only overdue errors and member has no debt, consider it valid
      if (hasOnlyOverdueIssues && !hasNonOverdueErrors) {
        console.log('🔧 POS Credit Validation: Overriding validation for member with zero debt');
        return true;
      }
    }
    
    return result.isApproved;
  });

  currentUsagePercentage = computed(() => {
    const member = this.memberCredit();
    if (!member || member.creditLimit === 0) return 0;
    return Math.min(100, Math.round((member.currentDebt / member.creditLimit) * 100));
  });

  afterTransactionUsagePercentage = computed(() => {
    const member = this.memberCredit();
    const request = this.validationRequest();
    if (!member || member.creditLimit === 0) return 0;
    
    const newDebt = member.currentDebt + request.amount;
    return Math.min(100, Math.round((newDebt / member.creditLimit) * 100));
  });

  remainingAfterTransaction = computed(() => {
    const result = this.validationResult();
    const request = this.validationRequest();
    if (!result) return 0;
    
    return Math.max(0, (result.availableCredit || 0) - request.amount);
  });

  isNearLimit = computed(() => {
    return this.afterTransactionUsagePercentage() >= 80 && this.isValid();
  });

  riskLevel = computed((): 'None' | 'Low' | 'Medium' | 'High' => {
    const afterUsage = this.afterTransactionUsagePercentage();
    if (afterUsage >= 95) return 'High';
    if (afterUsage >= 85) return 'Medium';
    if (afterUsage >= 75) return 'Low';
    return 'None';
  });

  validationIcon = computed(() => {
    if (this.isValidating()) return '🔍';
    if (!this.hasValidated()) return '💳';
    return this.isValid() ? '✅' : '❌';
  });

  validationTitle = computed(() => {
    if (this.isValidating()) return 'Validasi Kredit';
    if (!this.hasValidated()) return 'Siap Validasi';
    return this.isValid() ? 'Validasi Berhasil' : 'Validasi Gagal';
  });

  validationSubtitle = computed(() => {
    if (this.isValidating()) return 'Memeriksa limit kredit member...';
    if (!this.hasValidated()) return 'Siap untuk memvalidasi transaksi kredit';
    return this.isValid() ? 'Transaksi dapat dilanjutkan' : 'Transaksi tidak dapat diproses';
  });

  statusIcon = computed(() => {
    if (this.isValid()) return '✅';
    if (this.isNearLimit()) return '⚠️';
    return '❌';
  });

  statusTitle = computed(() => {
    if (this.isValid() && this.isNearLimit()) return 'Limit Hampir Habis';
    if (this.isValid()) return 'Transaksi Disetujui';
    return 'Transaksi Ditolak';
  });

  riskIcon = computed(() => {
    const level = this.riskLevel();
    switch (level) {
      case 'Low': return '💡';
      case 'Medium': return '⚠️';
      case 'High': return '🚨';
      default: return '';
    }
  });

  riskTitle = computed(() => {
    const level = this.riskLevel();
    switch (level) {
      case 'Low': return 'Risiko Rendah';
      case 'Medium': return 'Risiko Sedang';
      case 'High': return 'Risiko Tinggi';
      default: return '';
    }
  });

  riskMessage = computed(() => {
    const level = this.riskLevel();
    switch (level) {
      case 'Low': return 'Penggunaan kredit dalam batas aman';
      case 'Medium': return 'Penggunaan kredit mendekati limit, perlu perhatian';
      case 'High': return 'Penggunaan kredit sangat tinggi, risiko gagal bayar';
      default: return '';
    }
  });

  constructor() {
    // Auto-validate when request changes
    effect(() => {
      if (this.autoValidate() && this.validationRequest()) {
        this.validateCredit();
      }
    });
  }

  // Validation methods
  async validateCredit(): Promise<void> {
    const request = this.validationRequest();
    if (!request) return;

    this.isValidating.set(true);
    this.validationError.set(null);
    this.validationResult.set(null);

    try {
      const validationRequest: CreditValidationRequestDto = {
        memberId: request.memberId,
        requestedAmount: request.amount,
        items: request.items || [],
        branchId: 1, // Default branch ID
        description: request.description || 'POS Transaction',
        overrideWarnings: false,
        managerUserId: 0
      };

      // Real API call for credit validation
      const result = await this.memberCreditService.validateMemberCreditForPOS(validationRequest).toPromise();

      if (result) {
        this.validationResult.set(result);
        this.hasValidated.set(true);
        this.validationComplete.emit(result);
      } else {
        throw new Error('No validation result received');
      }
    } catch (error: any) {
      console.error('Credit validation failed:', error);
      this.validationError.set(error.message || 'Gagal memvalidasi kredit');
    } finally {
      this.isValidating.set(false);
    }
  }

  // Event handlers
  onApprove(): void {
    const result = this.validationResult();
    if (result && result.isApproved) {
      this.approved.emit(result);
    }
  }

  onRevalidate(): void {
    this.validateCredit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  // Utility methods
  getValidationMessages(): string {
    const result = this.validationResult();
    const member = this.memberCredit();
    if (!result) return '';
    
    const messages: string[] = [];
    
    // Filter out overdue payment warnings if member has no debt
    if (result.warnings && result.warnings.length > 0) {
      const filteredWarnings = result.warnings.filter(warning => {
        // If member has no current debt, ignore overdue payment warnings
        if (member && member.currentDebt === 0 && 
            warning.toLowerCase().includes('overdue')) {
          console.log('🔧 POS Credit Validation: Ignoring overdue warning for member with zero debt:', warning);
          return false;
        }
        return true;
      });
      messages.push(...filteredWarnings);
    }
    
    // Filter out overdue payment errors if member has no debt
    if (result.errors && result.errors.length > 0) {
      const filteredErrors = result.errors.filter(error => {
        // If member has no current debt, ignore overdue payment errors
        if (member && member.currentDebt === 0 && 
            error.toLowerCase().includes('overdue')) {
          console.log('🔧 POS Credit Validation: Ignoring overdue error for member with zero debt:', error);
          return false;
        }
        return true;
      });
      messages.push(...filteredErrors);
    }
    
    return messages.join(', ') || result.decisionReason || '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}