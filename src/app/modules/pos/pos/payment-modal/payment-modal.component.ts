// src/app/modules/pos/pos/payment-modal/payment-modal.component.ts
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PaymentData {
  method: 'cash' | 'card' | 'digital' | 'credit';
  amountPaid: number;
  change: number;
  reference?: string;
}

@Component({
  selector: 'app-payment-modal',
  template: `
    <div class="payment-modal">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25z" />
          </svg>
          Proses Pembayaran
        </h2>

        <button class="close-btn" (click)="onCancel()" title="Tutup (ESC)">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <!-- Total Display -->
      <div class="total-display">
        <div class="total-card">
          <span class="total-label">Total Pembayaran</span>
          <span class="total-amount">{{formatCurrency(totalAmount)}}</span>
        </div>
      </div>

      <!-- Payment Methods -->
      <div class="payment-methods">
        <h3 class="section-title">Pilih Metode Pembayaran</h3>

        <div class="method-grid">
          <div *ngFor="let method of paymentMethods" 
               class="method-card"
               [class.selected]="selectedMethod === method.id" 
               (click)="selectPaymentMethod(method.id)">

            <div class="method-icon">
              <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path [attr.d]="method.iconPath"></path>
              </svg>
            </div>

            <div class="method-info">
              <div class="method-label">{{method.label}}</div>
              <div class="method-description">{{method.description}}</div>
            </div>

            <div class="method-indicator">
              <div class="indicator-dot" [class.active]="selectedMethod === method.id"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Amount Section -->
      <div class="amount-section" *ngIf="selectedMethod === 'cash'">
        <h3 class="section-title">Jumlah Uang Diterima</h3>

        <!-- Quick Amount Buttons -->
        <div class="quick-amounts">
          <button *ngFor="let amount of quickAmounts" 
                  class="quick-btn"
                  (click)="selectQuickAmount(amount)">
            {{formatCurrency(amount)}}
          </button>
          <button class="quick-btn exact-btn" (click)="selectExactAmount()">
            Uang Pas
          </button>
        </div>

        <!-- Amount Input -->
        <div class="amount-input-group">
          <label for="amountInput">Masukkan Jumlah</label>
          <div class="amount-input-wrapper">
            <span class="currency-symbol">Rp</span>
            <input #amountInput
                   type="number"
                   class="amount-input"
                   [(ngModel)]="amountPaid"
                   (ngModelChange)="calculateChange()"
                   [min]="totalAmount"
                   placeholder="0">
          </div>
        </div>

        <!-- Change Display -->
        <div class="change-display" *ngIf="change >= 0">
          <div class="change-card" [class.error]="change < 0">
            <span class="change-label">Kembalian</span>
            <span class="change-amount">{{formatCurrency(change)}}</span>
          </div>
        </div>

        <!-- Insufficient Amount Warning -->
        <div class="warning-message" *ngIf="amountPaid > 0 && amountPaid < totalAmount">
          <svg class="warning-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
          Jumlah pembayaran kurang dari total
        </div>
      </div>

      <!-- Non-Cash Payment Reference -->
      <div class="reference-section" *ngIf="selectedMethod !== 'cash'">
        <div class="amount-input-group">
          <label for="referenceInput">Nomor Referensi (Opsional)</label>
          <input #referenceInput
                 type="text"
                 class="reference-input"
                 [(ngModel)]="paymentReference"
                 placeholder="Masukkan nomor referensi">
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="modal-actions">
        <button class="cancel-btn" (click)="onCancel()" [disabled]="isProcessing">
          Batal
        </button>
        <button class="process-btn" 
                (click)="processPayment()" 
                [disabled]="!canProcessPayment() || isProcessing">
          <span *ngIf="!isProcessing">Proses Pembayaran</span>
          <span *ngIf="isProcessing" class="processing">
            <svg class="spinner" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            Memproses...
          </span>
        </button>
      </div>

      <!-- Keyboard Shortcuts -->
      <div class="shortcuts-info">
        <small>
          <strong>Shortcut:</strong> 
          Enter: Proses | ESC: Batal | 1-{{ hasMember ? '4' : '3' }}: Metode{{ selectedMethod === 'cash' ? ' | 5-7: Jumlah Cepat' : '' }}
        </small>
      </div>
    </div>
  `,
  styleUrls: ['./payment-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PaymentModalComponent implements OnInit, OnDestroy {
  @ViewChild('amountInput') amountInput!: ElementRef<HTMLInputElement>;
  @ViewChild('referenceInput') referenceInput!: ElementRef<HTMLInputElement>;

  @Input() totalAmount: number = 0;
  @Input() isVisible: boolean = false;
  @Input() hasMember: boolean = false;
  
  @Output() paymentComplete = new EventEmitter<PaymentData>();
  @Output() paymentCancelled = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Payment state
  selectedMethod: 'cash' | 'card' | 'digital' | 'credit' = 'cash';
  amountPaid: number = 0;
  change: number = 0;
  paymentReference: string = '';
  isProcessing: boolean = false;
  
  // Quick amount buttons (in IDR)
  quickAmounts: number[] = [50000, 100000, 200000, 500000];

  // Payment methods configuration
  get paymentMethods(): Array<{
    id: 'cash' | 'card' | 'digital' | 'credit';
    label: string;
    description: string;
    iconPath: string;
  }> {
    const baseMethods: Array<{
      id: 'cash' | 'card' | 'digital' | 'credit';
      label: string;
      description: string;
      iconPath: string;
    }> = [
      {
        id: 'cash',
        label: 'Tunai',
        description: 'Pembayaran dengan uang tunai',
        iconPath: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z'
      },
      {
        id: 'card',
        label: 'Kartu',
        description: 'Kartu debit/kredit',
        iconPath: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z'
      },
      {
        id: 'digital',
        label: 'Digital',
        description: 'E-wallet, QRIS, dll',
        iconPath: 'M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H11V13H9V11M15,11H17V13H19V11H17V9H15V11M19,19H17V17H15V15H13V17H15V19H17V21H19V19M21,17H19V19H21V17M7,15H9V17H7V15M3,19H5V21H3V19M5,3H9V7H7V5H5V3M17,3H21V7H19V5H17V3M11,11H13V13H11V11Z'
      }
    ];

    // Add credit option only for members
    if (this.hasMember) {
      baseMethods.push({
        id: 'credit',
        label: 'Hutang',
        description: 'Pembayaran kredit/hutang',
        iconPath: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z'
      });
    }

    return baseMethods;
  }

  constructor() {}

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
    if (this.selectedMethod === 'cash') {
      this.amountPaid = this.totalAmount;
      this.calculateChange();
    }

    // Focus appropriate input
    this.focusInput();
  }

  private focusInput() {
    setTimeout(() => {
      if (this.selectedMethod === 'cash' && this.amountInput) {
        this.amountInput.nativeElement.focus();
        this.amountInput.nativeElement.select();
      } else if (this.selectedMethod !== 'cash' && this.referenceInput) {
        this.referenceInput.nativeElement.focus();
      }
    }, 200);
  }

  // ===== PAYMENT METHOD SELECTION =====

  selectPaymentMethod(method: 'cash' | 'card' | 'digital' | 'credit') {
    this.selectedMethod = method;
    
    if (method === 'cash') {
      this.amountPaid = this.totalAmount;
      this.paymentReference = '';
      this.calculateChange();
    } else {
      // For non-cash payments, set exact amount
      this.amountPaid = this.totalAmount;
      this.change = 0;
    }

    this.focusInput();
  }

  // ===== AMOUNT HANDLING =====

  selectQuickAmount(amount: number) {
    this.amountPaid = amount;
    this.calculateChange();
  }

  selectExactAmount() {
    this.amountPaid = this.totalAmount;
    this.calculateChange();
  }

  calculateChange() {
    if (this.selectedMethod === 'cash') {
      this.change = this.amountPaid - this.totalAmount;
    } else {
      this.change = 0;
    }
  }

  // ===== VALIDATION =====

  canProcessPayment(): boolean {
    if (this.selectedMethod === 'cash') {
      return this.amountPaid >= this.totalAmount;
    }
    return true; // Non-cash payments are always valid
  }

  // ===== PAYMENT PROCESSING =====

  processPayment() {
    if (!this.canProcessPayment()) {
      return;
    }

    this.isProcessing = true;

    // Simulate processing delay
    setTimeout(() => {
      const paymentData: PaymentData = {
        method: this.selectedMethod,
        amountPaid: this.amountPaid,
        change: this.change,
        reference: this.paymentReference || undefined
      };

      this.paymentComplete.emit(paymentData);
      this.isProcessing = false;
    }, 1000);
  }

  onCancel() {
    if (this.isProcessing) return;
    this.paymentCancelled.emit();
  }

  // ===== KEYBOARD SHORTCUTS =====

  @HostListener('window:keydown', ['$event'])
handleKeyboardShortcuts(event: KeyboardEvent) {
  if (!this.isVisible || this.isProcessing) return;

  // ✅ FIX: Better input detection
  const isTypingInInput = (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    document.activeElement?.tagName === 'INPUT'
  );

  // ✅ FIX: Allow normal typing in input fields
  if (isTypingInInput) {
    // Only handle specific keys that should work even in inputs
    if (event.key === 'Enter') {
      event.preventDefault();
      this.processPayment();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
    return; // Let other keys work normally in inputs
  }

  // Handle shortcuts only when not typing
  switch (event.key) {
    case '1':
      if (!event.ctrlKey && !event.altKey) {
        event.preventDefault();
        this.selectPaymentMethod('cash');
      }
      break;
    
    case '2':
      if (!event.ctrlKey && !event.altKey) {
        event.preventDefault();
        this.selectPaymentMethod('card');
      }
      break;
    
    case '3':
      if (!event.ctrlKey && !event.altKey) {
        event.preventDefault();
        this.selectPaymentMethod('digital');
      }
      break;
    
    case '4':
      if (this.hasMember && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        this.selectPaymentMethod('credit');
      } else if (this.selectedMethod === 'cash' && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        this.selectQuickAmount(this.quickAmounts[0]);
      }
      break;
    
    case '5':
      if (this.selectedMethod === 'cash' && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        this.selectQuickAmount(this.quickAmounts[1]);
      }
      break;
    
    case '6':
      if (this.selectedMethod === 'cash' && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        this.selectQuickAmount(this.quickAmounts[2]);
      }
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
    this.selectedMethod = 'cash';
    this.amountPaid = this.totalAmount;
    this.change = 0;
    this.paymentReference = '';
    this.isProcessing = false;
    this.calculateChange();
  }
}