// src/app/modules/pos/pos/payment-modal/payment-modal.component.ts
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// NEW: Credit integration imports
import { MemberCreditService } from '../../../membership/services/member-credit.service';
import { 
  POSMemberCreditDto,
  CreditValidationRequestDto,
  CreditValidationResultDto,
  CreateSaleWithCreditDto,
  POSItemDto
} from '../../../membership/interfaces/member-credit.interfaces';
import { validateCreditTransaction, formatCurrency as formatCreditCurrency } from '../../../membership/utils/credit-utils';

// Services
import { ToastService } from '../../../../shared/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';

// Enhanced interfaces for better type safety
export interface PaymentMethod {
  id: 'cash' | 'card' | 'digital' | 'credit';
  label: string;
  description: string;
  iconPath: string;
  enabled: boolean;
}

export interface PaymentData {
  method: 'cash' | 'card' | 'digital' | 'credit';
  amountPaid: number;
  change: number;
  reference?: string;
}

export interface PaymentValidation {
  isValid: boolean;
  errorMessage?: string;
}

export interface QuickAmount {
  value: number;
  label: string;
  isExact?: boolean;
}

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="payment-modal-container">
      <!-- Enhanced Header -->
      <div class="modal-header">
        <div class="header-content">
          <div class="header-icon">
            💳
          </div>
          <div class="header-info">
            <h2 class="modal-title">Proses Pembayaran</h2>
            <p class="modal-subtitle">Pilih metode dan jumlah pembayaran</p>
            @if (branchContext && branchContext.branchName) {
              <div class="branch-context-info">
                <span class="branch-indicator">🏪 {{ branchContext.branchName }}</span>
                @if (!branchContext.canProcessTransaction) {
                  <span class="warning-badge">⚠ Read Only Mode</span>
                }
              </div>
            }
          </div>
        </div>
        <button class="btn btn-outline close-btn" (click)="onCancel()" title="Tutup (ESC)">
          ✕
        </button>
      </div>

      <!-- Enhanced Total Display -->
      <div class="total-section">
        <div class="total-card">
          <div class="total-header">
            <span class="total-label">Total Pembayaran</span>
            @if (memberDiscountSignal() > 0) {
            <span class="member-badge">Member Discount</span>
            }
          </div>
          <div class="total-amount">{{ formatCurrency(totalAmount) }}</div>
          @if (memberDiscountSignal() > 0) {
          <div class="total-breakdown">
            <div class="breakdown-row">
              <span>Subtotal:</span>
              <span>{{ formatCurrency(totalAmount + memberDiscountSignal()) }}</span>
            </div>
            <div class="breakdown-row discount">
              <span>Member Discount:</span>
              <span>-{{ formatCurrency(memberDiscountSignal()) }}</span>
            </div>
          </div>
          }
        </div>
      </div>

      <!-- Enhanced Payment Methods -->
      <div class="payment-methods-section">
        <h3 class="section-title">Metode Pembayaran</h3>
        
        <div class="methods-grid">
          @for (method of availablePaymentMethods(); track method.id) {
          <button 
            class="method-card"
            [class.selected]="selectedMethod() === method.id"
            [disabled]="!method.enabled"
            (click)="selectPaymentMethod(method.id)">
            
            <div class="method-icon">{{ getMethodIcon(method.id) }}</div>
            
            <div class="method-content">
              <div class="method-label">{{ method.label }}</div>
              <div class="method-description">{{ method.description }}</div>
            </div>
            
            <div class="method-indicator">
              <div class="radio-dot" [class.active]="selectedMethod() === method.id"></div>
            </div>
          </button>
          }
        </div>
      </div>

      <!-- Enhanced Cash Amount Section -->
      @if (selectedMethod() === 'cash') {
      <div class="amount-section">
        <h3 class="section-title">Jumlah Uang Diterima</h3>
        
        <!-- Quick Amount Buttons -->
        <div class="quick-amounts-grid">
          @for (quickAmount of quickAmounts(); track quickAmount.value) {
          <button 
            class="quick-amount-btn"
            [class.exact]="quickAmount.isExact"
            [class.selected]="amountPaid() === quickAmount.value"
            (click)="selectQuickAmount(quickAmount.value)">
            {{ quickAmount.label }}
          </button>
          }
        </div>
        
        <!-- Amount Input -->
        <div class="form-field">
          <label>Masukkan Jumlah</label>
          <div class="amount-input-wrapper">
            <span class="currency-prefix">Rp</span>
            <input 
              #amountInput
              type="number"
              class="form-control amount-input"
              [value]="amountPaid()"
              (input)="updateAmountPaid(+$any($event.target).value)"
              [min]="totalAmount"
              [class.error]="!isAmountValid()"
              placeholder="Masukkan jumlah...">
          </div>
        </div>
        
        <!-- Change Display -->
        @if (calculatedChange() >= 0) {
        <div class="change-display">
          <div class="change-card" [class.positive]="calculatedChange() > 0">
            <div class="change-header">
              <span class="change-label">Kembalian</span>
              @if (calculatedChange() > 0) {
              <span class="change-badge">{{ formatCurrency(calculatedChange()) }}</span>
              } @else {
              <span class="change-badge exact">Uang Pas</span>
              }
            </div>
          </div>
        </div>
        }
        
        <!-- Validation Messages -->
        @if (!isAmountValid() && amountPaid() > 0) {
        <div class="validation-message error">
          <span class="validation-icon">⚠️</span>
          <span>Jumlah pembayaran kurang dari total</span>
        </div>
        }
      </div>
      }

      <!-- Enhanced Non-Cash Reference Section -->
      @if (selectedMethod() !== 'cash' && selectedMethod() !== 'credit') {
      <div class="reference-section">
        <div class="form-field">
          <label>Nomor Referensi (Opsional)</label>
          <input 
            #referenceInput
            type="text"
            class="form-control"
            [value]="paymentReference()"
            (input)="updatePaymentReference($any($event.target).value)"
            [placeholder]="getReferencePlaceholder()"
            maxlength="50">
          <small class="form-hint">{{ getReferenceHint() }}</small>
        </div>
      </div>
      }

      <!-- NEW: Credit Validation Section -->
      @if (selectedMethod() === 'credit') {
      <div class="credit-section">
        <h3 class="section-title">Informasi Kredit Member</h3>
        
        <!-- Member Credit Summary -->
        @if (memberCredit()) {
        <div class="credit-summary-card">
          <div class="credit-info">
            <div class="credit-info-row">
              <span class="info-label">Limit Kredit:</span>
              <span class="info-value">{{ formatCurrency(memberCredit()!.creditLimit) }}</span>
            </div>
            <div class="credit-info-row">
              <span class="info-label">Hutang Saat Ini:</span>
              <span class="info-value debt">{{ formatCurrency(memberCredit()!.currentDebt) }}</span>
            </div>
            <div class="credit-info-row highlight">
              <span class="info-label">Sisa Limit:</span>
              <span class="info-value available">{{ formatCurrency(creditAvailableLimit()) }}</span>
            </div>
          </div>
        </div>
        }

        <!-- Credit Validation Status -->
        @if (creditValidationLoading()) {
        <div class="validation-message loading">
          <div class="loading-spinner-small"></div>
          <span>Memvalidasi limit kredit...</span>
        </div>
        } @else if (creditValidation()) {
        <div class="validation-message" [class.success]="isCreditValid()" [class.error]="!isCreditValid()">
          <span class="validation-icon">{{ isCreditValid() ? '✅' : '❌' }}</span>
          <span>{{ creditValidationMessage() }}</span>
        </div>
        }

        <!-- NEW: Manager Approval Section -->
        @if (requiresManagerApproval()) {
        <div class="manager-approval-section">
          <div class="approval-card warning">
            <div class="approval-header">
              <span class="approval-icon">🔐</span>
              <span class="approval-title">Manager Approval Required</span>
            </div>
            <div class="approval-details">
              <p class="approval-reason">{{ creditValidation()?.decisionReason }}</p>
              @if (creditValidation()?.warnings && creditValidation()!.warnings.length > 0) {
              <ul class="approval-warnings">
                <li *ngFor="let warning of creditValidation()!.warnings">{{ warning }}</li>
              </ul>
              }
            </div>
            @if (canManagerApprove()) {
            <div class="approval-actions">
              <button 
                class="btn btn-warning"
                (click)="openManagerApprovalDialog()"
                [disabled]="managerApprovalLoading()">
                @if (managerApprovalLoading()) {
                <div class="loading-spinner-small"></div>
                <span>Processing...</span>
                } @else {
                <span>🔓 Manager Override</span>
                }
              </button>
            </div>
            } @else {
            <div class="approval-notice">
              <p class="notice-text">🔒 Manager approval is required to proceed with this transaction.</p>
            </div>
            }
          </div>
        </div>
        }

        <!-- NEW: Flexible Due Date Section -->
        <div class="due-date-section">
          <h4 class="section-subtitle">Payment Due Date</h4>
          
          <div class="due-date-options">
            <div class="form-field checkbox-field">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  [checked]="useCustomDueDate()"
                  (change)="onCustomDueDateToggle($event)">
                <span class="checkbox-text">Use custom due date</span>
              </label>
            </div>

            @if (useCustomDueDate()) {
            <div class="form-field">
              <label>Custom Due Date</label>
              <input 
                type="date"
                class="form-control"
                [value]="customDueDate()"
                (input)="onCustomDueDateChange($event)"
                [min]="getTomorrowDate()"
                [max]="getMaxDueDate()">
              @if (dueDateValidationMessage()) {
              <div class="validation-message error">
                <span class="validation-icon">⚠️</span>
                <span>{{ dueDateValidationMessage() }}</span>
              </div>
              }
            </div>
            }
          </div>

          <div class="due-date-summary">
            <div class="summary-row">
              <span class="summary-label">Payment Terms:</span>
              <span class="summary-value">{{ memberCredit()?.paymentTermDays || 30 }} days</span>
            </div>
            <div class="summary-row highlight">
              <span class="summary-label">Due Date:</span>
              <span class="summary-value">{{ formatDueDate(actualDueDate()) }}</span>
            </div>
          </div>
        </div>

        <!-- Transaction Amount Display for Credit -->
        <div class="credit-transaction-info">
          <div class="transaction-card">
            <div class="transaction-header">
              <span class="transaction-label">Jumlah Hutang Baru</span>
            </div>
            <div class="transaction-amount">{{ formatCurrency(totalAmount) }}</div>
            <div class="transaction-note">
              <small>Jatuh tempo: {{ formatDueDate(actualDueDate()) }}</small>
            </div>
          </div>
        </div>
      </div>
      }

      <!-- Enhanced Action Buttons -->
      <div class="action-buttons">
        <button 
          class="btn btn-outline"
          (click)="onCancel()" 
          [disabled]="isProcessing()">
          Batal
        </button>
        
        <button 
          class="btn btn-primary"
          (click)="processPayment()" 
          [disabled]="!canProcessPayment() || isProcessing()">
          @if (!isProcessing()) {
          <span>Proses Pembayaran</span>
          } @else {
          <div class="processing-state">
            <div class="loading-spinner"></div>
            <span>Memproses...</span>
          </div>
          }
        </button>
      </div>

      <!-- Enhanced Keyboard Shortcuts -->
      <div class="shortcuts-section">
        <div class="shortcuts-title">Keyboard Shortcuts:</div>
        <div class="shortcuts-list">
          <div class="shortcut-item">
            <kbd>Enter</kbd>
            <span>Proses Pembayaran</span>
          </div>
          <div class="shortcut-item">
            <kbd>Esc</kbd>
            <span>Batal</span>
          </div>
          <div class="shortcut-item">
            <kbd>1-{{ availablePaymentMethods().length }}</kbd>
            <span>Pilih Metode</span>
          </div>
          @if (selectedMethod() === 'cash') {
          <div class="shortcut-item">
            <kbd>Q</kbd>
            <span>Uang Pas</span>
          </div>
          }
        </div>
      </div>
    </div>

    <!-- NEW: Manager Approval Dialog Modal -->
    @if (showManagerApprovalDialog()) {
    <div class="modal-overlay" (click)="closeManagerApprovalDialog()">
      <div class="approval-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Manager Approval Required</h3>
          <button class="close-btn" (click)="closeManagerApprovalDialog()">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="approval-summary">
            <div class="summary-title">🔐 Transaction Requires Manager Override</div>
            <div class="summary-details">
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value">{{ formatCurrency(totalAmount) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Member:</span>
                <span class="value">{{ creditValidation()?.memberName }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Risk Level:</span>
                <span class="value risk">{{ creditValidation()?.riskLevel }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Reason:</span>
                <span class="value">{{ creditValidation()?.decisionReason }}</span>
              </div>
            </div>
          </div>

          @if (creditValidation()?.warnings && creditValidation()!.warnings.length > 0) {
          <div class="warnings-section">
            <div class="warnings-title">⚠️ Risk Factors:</div>
            <ul class="warnings-list">
              <li *ngFor="let warning of creditValidation()!.warnings">{{ warning }}</li>
            </ul>
          </div>
          }
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-outline" (click)="closeManagerApprovalDialog()" [disabled]="managerApprovalLoading()">
            Cancel
          </button>
          <button 
            class="btn btn-warning" 
            (click)="managerApproveCredit()"
            [disabled]="managerApprovalLoading()">
            @if (managerApprovalLoading()) {
            <div class="loading-spinner"></div>
            <span>Approving...</span>
            } @else {
            <span>🔓 Override & Approve</span>
            }
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styleUrls: ['./payment-modal.component.scss']
})
export class PaymentModalComponent implements OnInit, OnDestroy {
  @ViewChild('amountInput') amountInput!: ElementRef<HTMLInputElement>;
  @ViewChild('referenceInput') referenceInput!: ElementRef<HTMLInputElement>;

  @Input() totalAmount: number = 0;
  @Input() selectedItems: any[] = [];
  @Input() isVisible: boolean = false;
  @Input() hasMember: boolean = false;
  @Input() memberDiscount: number = 0;
  
  @Input() memberId?: number; // NEW: Member ID for credit validation
  @Input() memberCreditData?: POSMemberCreditDto; // NEW: Member credit info
  @Input() branchContext?: { branchId: number | null, branchName: string, canProcessTransaction: boolean } = undefined; // NEW: Branch context
  
  @Output() paymentComplete = new EventEmitter<PaymentData>();
  @Output() paymentCancelled = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private memberCreditService = inject(MemberCreditService); // NEW: Credit service injection
  private toastService = inject(ToastService); // NEW: Toast service injection
  private authService = inject(AuthService); // NEW: Auth service injection

  // Signal-based state management
  selectedMethod = signal<'cash' | 'card' | 'digital' | 'credit'>('cash');
  amountPaid = signal<number>(0);
  paymentReference = signal<string>('');
  isProcessing = signal<boolean>(false);
  
  // NEW: Credit-specific signals
  memberCredit = signal<POSMemberCreditDto | null>(null);
  creditValidation = signal<CreditValidationResultDto | null>(null);
  creditValidationLoading = signal<boolean>(false);
  
  // NEW: Manager Approval signals (simplified)
  showManagerApprovalDialog = signal<boolean>(false);
  managerApprovalLoading = signal<boolean>(false);
  
  // NEW: Flexible Due Date signals
  useCustomDueDate = signal<boolean>(false);
  customDueDate = signal<string>('');
  
  // Computed properties
  calculatedChange = computed(() => {
    if (this.selectedMethod() === 'cash') {
      return Math.max(0, this.amountPaid() - this.totalAmount);
    }
    return 0;
  });

  isAmountValid = computed(() => {
    if (this.selectedMethod() === 'cash') {
      return this.amountPaid() >= this.totalAmount;
    }
    return true;
  });

  // Removed duplicate - using the more comprehensive version below

  // NEW: Credit-specific computed properties
  isCreditValid = computed(() => {
    if (this.selectedMethod() !== 'credit') return true;
    
    const validation = this.creditValidation();
    return validation ? validation.isApproved : false;
  });

  creditAvailableLimit = computed(() => {
    const member = this.memberCredit();
    if (!member) return 0;
    return member.creditLimit - member.currentDebt;
  });

  creditValidationMessage = computed(() => {
    const validation = this.creditValidation();
    const messages: string[] = [];
    if (validation?.warnings) messages.push(...validation.warnings);
    if (validation?.errors) messages.push(...validation.errors);
    return messages.join(', ') || validation?.decisionReason || '';
  });

  // Quick amounts configuration with enhanced options
  quickAmounts = computed(() => {
    const baseAmounts: QuickAmount[] = [
      { value: 50000, label: this.formatCurrency(50000) },
      { value: 100000, label: this.formatCurrency(100000) },
      { value: 200000, label: this.formatCurrency(200000) },
      { value: 500000, label: this.formatCurrency(500000) },
      { value: this.totalAmount, label: 'Uang Pas', isExact: true }
    ];
    
    // Add smart amounts based on total
    const smartAmounts = this.generateSmartAmounts();
    return [...smartAmounts, ...baseAmounts].filter((amount, index, arr) => 
      arr.findIndex(a => a.value === amount.value) === index
    ).sort((a, b) => a.value - b.value);
  });

  // Enhanced payment methods with signals
  availablePaymentMethods = computed(() => {
    const baseMethods: PaymentMethod[] = [
      {
        id: 'cash',
        label: 'Tunai',
        description: 'Pembayaran dengan uang tunai',
        iconPath: '',
        enabled: true
      },
      {
        id: 'card',
        label: 'Kartu',
        description: 'Debit/Kredit/ATM',
        iconPath: '',
        enabled: true
      },
      {
        id: 'digital',
        label: 'Digital',
        description: 'E-wallet, QRIS, Transfer',
        iconPath: '',
        enabled: true
      }
    ];

    // Add credit option only for members with credit info
    if (this.hasMember && this.memberCredit()) {
      const availableLimit = this.creditAvailableLimit();
      
      baseMethods.push({
        id: 'credit',
        label: 'Hutang',
        description: `Sisa limit: ${this.formatCurrency(availableLimit)}`,
        iconPath: '',
        enabled: availableLimit >= this.totalAmount
      });
    }

    return baseMethods;
  });

  // Member discount signal
  memberDiscountSignal = signal<number>(0);
  
  // NEW: Manager Approval computed properties (simplified)
  requiresManagerApproval = computed(() => {
    const validation = this.creditValidation();
    return validation?.requiresManagerApproval || false;
  });
  
  canManagerApprove = computed(() => {
    const user = this.authService.getCurrentUser();
    const userRole = user?.role;
    return ['Admin', 'Manager', 'BranchManager', 'HeadManager'].includes(userRole || '');
  });
  
  canProcessPayment = computed(() => {
    // NEW: Check branch permissions first
    if (this.branchContext && !this.branchContext.canProcessTransaction) {
      return false;
    }
    
    if (this.selectedMethod() === 'credit') {
      const validation = this.creditValidation();
      
      // If requires manager approval but not approved yet, can't process
      if (validation?.requiresManagerApproval && !validation.isApproved) {
        return false;
      }

      // Check custom due date validation for credit
      if (this.useCustomDueDate() && !this.isCustomDueDateValid()) {
        return false;
      }
      
      return this.isAmountValid() && 
             !this.isProcessing() && 
             !this.creditValidationLoading() &&
             this.isCreditValid();
    }
    
    return this.isAmountValid() && !this.isProcessing();
  });

  // NEW: Due Date computed properties
  defaultDueDate = computed(() => {
    const member = this.memberCredit();
    if (!member) return '';
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (member.paymentTermDays || 30));
    return dueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  });

  actualDueDate = computed(() => {
    return this.useCustomDueDate() ? this.customDueDate() : this.defaultDueDate();
  });

  isCustomDueDateValid = computed(() => {
    if (!this.useCustomDueDate()) return true;
    
    const customDate = this.customDueDate();
    if (!customDate) return false;
    
    const selectedDate = new Date(customDate);
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 180); // 6 bulan
    
    return selectedDate > today && selectedDate <= maxDate;
  });

  dueDateValidationMessage = computed(() => {
    if (!this.useCustomDueDate() || this.isCustomDueDateValid()) return '';
    
    const customDate = this.customDueDate();
    if (!customDate) return 'Custom due date is required';
    
    const selectedDate = new Date(customDate);
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 180);
    
    if (selectedDate <= today) return 'Due date must be in the future';
    if (selectedDate > maxDate) return 'Due date cannot be more than 6 months from today';
    
    return '';
  });

  constructor() {
    // Effects for reactive updates
    effect(() => {
      // Auto-calculate change when amount or method changes
      if (this.selectedMethod() === 'cash') {
        this.calculatedChange();
      }
    });

    effect(() => {
      // Focus input when method changes
      if (this.selectedMethod()) {
        this.focusInput();
      }
    });

    effect(() => {
      // Initialize member discount from input
      this.memberDiscountSignal.set(this.memberDiscount || 0);
    });

    // NEW: Effect for credit data initialization
    effect(() => {
      if (this.memberCreditData) {
        this.memberCredit.set(this.memberCreditData);
      }
    });

    // NEW: Effect for credit validation when method or amount changes
    effect(() => {
      if (this.selectedMethod() === 'credit' && this.memberId) {
        this.validateCreditTransaction();
      }
    });
  }

  ngOnInit() {
    this.initializePayment();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALIZATION =====

  private initializePayment() {
    // Set default amount for cash payment
    if (this.selectedMethod() === 'cash') {
      this.amountPaid.set(this.totalAmount);
    }

    // NEW: Initialize member credit data if provided
    if (this.memberCreditData) {
      this.memberCredit.set(this.memberCreditData);
    }

    // Focus appropriate input
    this.focusInput();
  }

  private focusInput() {
    setTimeout(() => {
      if (this.selectedMethod() === 'cash' && this.amountInput) {
        this.amountInput.nativeElement.focus();
        this.amountInput.nativeElement.select();
      } else if (this.selectedMethod() !== 'cash' && this.referenceInput) {
        this.referenceInput.nativeElement.focus();
      }
    }, 200);
  }

  // ===== PAYMENT METHOD SELECTION =====

  selectPaymentMethod(method: 'cash' | 'card' | 'digital' | 'credit') {
    this.selectedMethod.set(method);
    
    if (method === 'cash') {
      this.amountPaid.set(this.totalAmount);
      this.paymentReference.set('');
    } else {
      // For non-cash payments, set exact amount
      this.amountPaid.set(this.totalAmount);
    }

    // NEW: Handle credit method selection
    if (method === 'credit') {
      this.paymentReference.set(''); // Clear reference for credit
      if (this.memberId) {
        this.validateCreditTransaction();
      }
    }

    this.focusInput();
  }

  // ===== AMOUNT HANDLING =====

  selectQuickAmount(amount: number) {
    this.amountPaid.set(amount);
  }

  updateAmountPaid(amount: number) {
    this.amountPaid.set(amount || 0);
  }

  updatePaymentReference(reference: string) {
    this.paymentReference.set(reference);
  }

  // NEW: Credit validation method
  private async validateCreditTransaction() {
    if (!this.memberId || this.selectedMethod() !== 'credit') {
      return;
    }

    this.creditValidationLoading.set(true);
    
    try {
      const validationRequest: CreditValidationRequestDto = {
        memberId: this.memberId,
        requestedAmount: this.totalAmount,
        items: this.selectedItems || [],
        branchId: 1, // Default branch ID
        description: 'POS Credit Transaction',
        overrideWarnings: false,
        managerUserId: 0
      };

      // Real API call for credit validation
      const validationResult = await this.memberCreditService.validateMemberCreditForPOS(validationRequest).toPromise();

      if (validationResult) {
        this.creditValidation.set(validationResult);
      } else {
        throw new Error('No validation result received');
      }
    } catch (error) {
      console.error('Credit validation failed:', error);
      this.creditValidation.set({
        isApproved: false,
        approvedAmount: 0,
        availableCredit: 0,
        decisionReason: 'Gagal memvalidasi kredit. Silakan coba lagi.',
        warnings: [],
        errors: ['Gagal memvalidasi kredit. Silakan coba lagi.'],
        requiresManagerApproval: false,
        maxAllowedAmount: 0,
        riskLevel: 'High',
        memberName: '',
        memberTier: '',
        creditScore: 0,
        creditUtilization: 0,
        validationTimestamp: new Date().toISOString(),
        validatedByUserId: 0,
        validationId: ''
      });
    } finally {
      this.creditValidationLoading.set(false);
    }
  }

  // Generate smart amount suggestions based on total
  private generateSmartAmounts(): QuickAmount[] {
    const total = this.totalAmount;
    const smartAmounts: QuickAmount[] = [];
    
    // Round up to nearest 5000, 10000, 50000
    const roundUp5k = Math.ceil(total / 5000) * 5000;
    const roundUp10k = Math.ceil(total / 10000) * 10000;
    const roundUp50k = Math.ceil(total / 50000) * 50000;
    
    if (roundUp5k > total && roundUp5k <= total + 50000) {
      smartAmounts.push({ value: roundUp5k, label: this.formatCurrency(roundUp5k) });
    }
    
    if (roundUp10k > total && roundUp10k <= total + 100000 && roundUp10k !== roundUp5k) {
      smartAmounts.push({ value: roundUp10k, label: this.formatCurrency(roundUp10k) });
    }
    
    if (roundUp50k > total && roundUp50k <= total + 200000 && roundUp50k !== roundUp10k) {
      smartAmounts.push({ value: roundUp50k, label: this.formatCurrency(roundUp50k) });
    }
    
    return smartAmounts;
  }

  // ===== UTILITY METHODS =====

  getMethodIcon(method: string): string {
    const icons = {
      cash: '💵',
      card: '💳',
      digital: '📱',
      credit: '📋'
    };
    return icons[method as keyof typeof icons] || '💰';
  }

  getReferencePlaceholder(): string {
    const placeholders = {
      card: 'Nomor kartu (4 digit terakhir)',
      digital: 'ID transaksi / nomor HP',
      credit: 'Nomor faktur atau catatan'
    };
    return placeholders[this.selectedMethod() as keyof typeof placeholders] || 'Masukkan referensi...';
  }

  getReferenceHint(): string {
    const hints = {
      card: 'Opsional: untuk tracking transaksi kartu',
      digital: 'Opsional: ID transaksi dari aplikasi',
      credit: 'Opsional: nomor faktur untuk pelacakan'
    };
    return hints[this.selectedMethod() as keyof typeof hints] || 'Referensi opsional untuk tracking';
  }

  // NEW: Get formatted credit due date (30 days from now)
  getCreditDueDate(): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // ===== PAYMENT PROCESSING =====

  async processPayment() {
    if (!this.canProcessPayment()) {
      return;
    }

    this.isProcessing.set(true);

    try {
      // NEW: Handle credit payment processing
      if (this.selectedMethod() === 'credit' && this.memberId) {
        await this.processCreditPayment();
      } else {
        // Handle regular payment methods
        await this.processRegularPayment();
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      // You might want to show an error message to the user here
      this.isProcessing.set(false);
    }
  }

  // NEW: Process credit payment
  private async processCreditPayment() {
    if (!this.memberId || !this.memberCredit()) {
      throw new Error('Member credit data not available');
    }

    try {
      // Transform selectedItems to match backend POSItemDto format
      const transformedItems: POSItemDto[] = (this.selectedItems || []).map((item: any) => ({
        productId: item.productId || item.id,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.price || 0,
        discountAmount: item.discountAmount || 0
      }));

      // For credit payment, the amount paid should be the credit amount
      const creditAmount = this.amountPaid();
      const cashAmount = this.totalAmount - creditAmount;
      
      const creditSaleData: CreateSaleWithCreditDto = {
        memberId: this.memberId,
        items: transformedItems,
        totalAmount: this.totalAmount,
        creditAmount: creditAmount,
        cashAmount: Math.max(0, cashAmount), // Ensure non-negative
        paymentMethod: cashAmount > 0 ? 6 : 5, // Mixed (6) or Credit only (5) payment method
        branchId: 1, // Default branch ID
        cashierId: 1, // Default cashier ID
        customerName: this.memberCredit()?.name || 'Credit Customer',
        notes: cashAmount > 0 ? `Mixed payment: Credit ${this.formatCurrency(creditAmount)}, Cash ${this.formatCurrency(cashAmount)}` : `Full credit payment: ${this.formatCurrency(creditAmount)}`,
        useCustomDueDate: this.useCustomDueDate(), // Flexible due date feature
        customDueDate: this.useCustomDueDate() ? this.customDueDate() : undefined // Custom due date if enabled
      };

      // Log the request data for debugging
      console.log('🚀 [POS Credit Payment] Sending request:', creditSaleData);

      // Create credit sale transaction
      const response = await this.memberCreditService.createSaleWithCredit(creditSaleData).toPromise();
      
      if (response) {
        const paymentData: PaymentData = {
          method: 'credit',
          amountPaid: this.amountPaid(),
          change: 0, // No change for credit payments
          reference: response.saleId?.toString() || this.paymentReference()
        };

        // Simulate processing time for UX
        setTimeout(() => {
          this.paymentComplete.emit(paymentData);
          this.isProcessing.set(false);
        }, 1500);
      } else {
        throw new Error('Credit payment failed');
      }
    } catch (error) {
      console.error('Credit payment processing failed:', error);
      throw error;
    }
  }

  // Process regular (non-credit) payments
  private async processRegularPayment() {
    // Simulate processing delay with better UX
    setTimeout(() => {
      const paymentData: PaymentData = {
        method: this.selectedMethod(),
        amountPaid: this.amountPaid(),
        change: this.calculatedChange(),
        reference: this.paymentReference() || undefined
      };

      this.paymentComplete.emit(paymentData);
      this.isProcessing.set(false);
    }, 1500); // Slightly longer for better perceived quality
  }

  onCancel() {
    if (this.isProcessing()) return;
    this.paymentCancelled.emit();
  }

  // ===== KEYBOARD SHORTCUTS =====

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (!this.isVisible || this.isProcessing()) return;

    // Better input detection
    const isTypingInInput = (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      document.activeElement?.tagName === 'INPUT'
    );

    // Allow normal typing in input fields
    if (isTypingInInput) {
      // Only handle specific keys that should work even in inputs
      if (event.key === 'Enter') {
        event.preventDefault();
        this.processPayment();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.onCancel();
      }
      return;
    }

    // Enhanced keyboard shortcuts
    const methods = this.availablePaymentMethods();
    
    switch (event.key) {
      case '1':
      case '2':
      case '3':
      case '4':
        const methodIndex = parseInt(event.key) - 1;
        if (methodIndex < methods.length && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          this.selectPaymentMethod(methods[methodIndex].id);
        }
        break;
        
      case 'q':
      case 'Q':
        if (this.selectedMethod() === 'cash' && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          this.selectQuickAmount(this.totalAmount);
        }
        break;
        
      case 'Enter':
        event.preventDefault();
        this.processPayment();
        break;
        
      case 'Escape':
        event.preventDefault();
        this.onCancel();
        break;
    }
  }

  // ===== MANAGER APPROVAL METHODS (Using Existing Endpoint) =====

  /**
   * Show manager approval dialog
   */
  openManagerApprovalDialog(): void {
    if (!this.requiresManagerApproval() || !this.canManagerApprove()) return;
    this.showManagerApprovalDialog.set(true);
  }

  /**
   * Close manager approval dialog
   */
  closeManagerApprovalDialog(): void {
    this.showManagerApprovalDialog.set(false);
  }

  // ===== FLEXIBLE DUE DATE METHODS =====

  /**
   * Toggle custom due date option
   */
  onCustomDueDateToggle(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.useCustomDueDate.set(checkbox.checked);
    
    if (checkbox.checked && !this.customDueDate()) {
      // Set default to tomorrow when enabling custom date
      this.customDueDate.set(this.getTomorrowDate());
    }
  }

  /**
   * Handle custom due date change
   */
  onCustomDueDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.customDueDate.set(input.value);
  }

  /**
   * Get tomorrow's date in YYYY-MM-DD format
   */
  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  /**
   * Get maximum due date (6 months from today)
   */
  getMaxDueDate(): string {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 180);
    return maxDate.toISOString().split('T')[0];
  }

  /**
   * Format due date for display
   */
  formatDueDate(dateString: string): string {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Manager approve credit using existing endpoint with overrideWarnings: true
   */
  async managerApproveCredit(): Promise<void> {
    if (!this.canManagerApprove() || !this.memberId) return;

    this.managerApprovalLoading.set(true);

    try {
      // Use existing validation endpoint with overrideWarnings: true (manager approval)
      const transformedItems: POSItemDto[] = (this.selectedItems || []).map((item: any) => ({
        productId: item.productId || item.id,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.price || 0,
        discountAmount: item.discountAmount || 0
      }));

      const validationRequest: CreditValidationRequestDto = {
        memberId: this.memberId,
        requestedAmount: this.totalAmount,
        items: transformedItems,
        branchId: 1, // Default branch
        description: 'Manager approved credit transaction',
        overrideWarnings: true, // KEY: Manager approval override
        managerUserId: 1 // Current manager user ID
      };

      // Call existing endpoint with manager override
      const approvedValidation = await this.memberCreditService.validateMemberCreditForPOS(validationRequest).toPromise();

      if (approvedValidation && approvedValidation.isApproved) {
        // Update validation result with approved status
        this.creditValidation.set(approvedValidation);
        
        this.toastService.showSuccess(
          '✅ Credit Approved',
          'Manager has approved the credit transaction',
          'OK'
        );
        
        this.closeManagerApprovalDialog();
      } else {
        throw new Error('Manager approval failed');
      }
      
    } catch (error: any) {
      console.error('Manager approval failed:', error);
      this.toastService.showError(
        '❌ Manager Approval Failed',
        error.message || 'Failed to approve credit transaction',
        'Try Again'
      );
    } finally {
      this.managerApprovalLoading.set(false);
    }
  }

  // ===== UTILITY METHODS =====

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Reset component state
   */
  reset() {
    this.selectedMethod.set('cash');
    this.amountPaid.set(this.totalAmount);
    this.paymentReference.set('');
    this.isProcessing.set(false);
    
    // NEW: Reset credit-specific state
    this.creditValidation.set(null);
    this.creditValidationLoading.set(false);
    
    // NEW: Reset manager approval state
    this.showManagerApprovalDialog.set(false);
    this.managerApprovalLoading.set(false);
  }
}