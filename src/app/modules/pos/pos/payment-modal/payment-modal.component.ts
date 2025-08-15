// src/app/modules/pos/pos/payment-modal/payment-modal.component.ts
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
      @if (selectedMethod() !== 'cash') {
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
  `,
  styleUrls: ['./payment-modal.component.scss']
})
export class PaymentModalComponent implements OnInit, OnDestroy {
  @ViewChild('amountInput') amountInput!: ElementRef<HTMLInputElement>;
  @ViewChild('referenceInput') referenceInput!: ElementRef<HTMLInputElement>;

  @Input() totalAmount: number = 0;
  @Input() isVisible: boolean = false;
  @Input() hasMember: boolean = false;
  @Input() memberDiscount: number = 0;
  
  @Output() paymentComplete = new EventEmitter<PaymentData>();
  @Output() paymentCancelled = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Signal-based state management
  selectedMethod = signal<'cash' | 'card' | 'digital' | 'credit'>('cash');
  amountPaid = signal<number>(0);
  paymentReference = signal<string>('');
  isProcessing = signal<boolean>(false);
  
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

  canProcessPayment = computed(() => {
    return this.isAmountValid() && !this.isProcessing();
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

    // Add credit option only for members
    if (this.hasMember) {
      baseMethods.push({
        id: 'credit',
        label: 'Hutang',
        description: 'Pembayaran kredit member',
        iconPath: '',
        enabled: true
      });
    }

    return baseMethods;
  });

  // Member discount signal
  memberDiscountSignal = signal<number>(0);

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

  // ===== PAYMENT PROCESSING =====

  processPayment() {
    if (!this.canProcessPayment()) {
      return;
    }

    this.isProcessing.set(true);

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
  }
}