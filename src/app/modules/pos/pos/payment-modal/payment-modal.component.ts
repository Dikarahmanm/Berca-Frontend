// src/app/modules/pos/payment-modal/payment-modal.component.ts
import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface PaymentData {
  method: 'cash' | 'card' | 'digital';
  amountPaid: number;
  change: number;
}

@Component({
  selector: 'app-payment-modal',
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class PaymentModalComponent implements OnInit {
  @ViewChild('amountInput') amountInput!: ElementRef<HTMLInputElement>;

  @Input() totalAmount: number = 0;
  @Input() isVisible: boolean = false;
  
  @Output() paymentComplete = new EventEmitter<PaymentData>();
  @Output() paymentCancelled = new EventEmitter<void>();

  // Form
  paymentForm!: FormGroup;

  // UI State
  selectedMethod: 'cash' | 'card' | 'digital' = 'cash';
  isProcessing = false;
  
  // Quick amount buttons
  quickAmounts = [50000, 100000, 200000, 500000];

  // Payment methods
  paymentMethods = [
    {
      id: 'cash' as const,
      label: 'Tunai',
      icon: 'payments',
      description: 'Pembayaran dengan uang tunai'
    },
    {
      id: 'card' as const,
      label: 'Kartu',
      icon: 'credit_card',
      description: 'Kartu debit/kredit'
    },
    {
      id: 'digital' as const,
      label: 'Digital',
      icon: 'qr_code',
      description: 'E-wallet, QRIS, dll'
    }
  ];

  constructor(private fb: FormBuilder) {
    this.initForm();
  }

  ngOnInit() {
    this.focusAmountInput();
  }

  /**
   * Initialize payment form
   */
  private initForm() {
    this.paymentForm = this.fb.group({
      amountPaid: [0, [Validators.required, Validators.min(0)]]
    });

    // Auto-set amount when total changes
    this.paymentForm.get('amountPaid')?.setValue(this.totalAmount);
  }

  /**
   * Focus amount input
   */
  private focusAmountInput() {
    setTimeout(() => {
      if (this.amountInput) {
        this.amountInput.nativeElement.focus();
        this.amountInput.nativeElement.select();
      }
    }, 200);
  }

  /**
   * Select payment method
   */
  selectPaymentMethod(method: 'cash' | 'card' | 'digital') {
    this.selectedMethod = method;
    
    // For non-cash payments, set exact amount
    if (method !== 'cash') {
      this.paymentForm.get('amountPaid')?.setValue(this.totalAmount);
    }
  }

  /**
   * Set quick amount
   */
  setQuickAmount(amount: number) {
    this.paymentForm.get('amountPaid')?.setValue(amount);
  }

  /**
   * Set exact amount
   */
  setExactAmount() {
    this.paymentForm.get('amountPaid')?.setValue(this.totalAmount);
  }

  /**
   * Calculate change
   */
  getChange(): number {
    const amountPaid = this.paymentForm.get('amountPaid')?.value || 0;
    return Math.max(0, amountPaid - this.totalAmount);
  }

  /**
   * Check if payment amount is sufficient
   */
  isSufficientAmount(): boolean {
    const amountPaid = this.paymentForm.get('amountPaid')?.value || 0;
    return amountPaid >= this.totalAmount;
  }

  /**
   * Process payment
   */
  async processPayment() {
    if (!this.paymentForm.valid || !this.isSufficientAmount()) {
      return;
    }

    this.isProcessing = true;

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const amountPaid = this.paymentForm.get('amountPaid')?.value || 0;
      const paymentData: PaymentData = {
        method: this.selectedMethod,
        amountPaid,
        change: this.getChange()
      };

      this.paymentComplete.emit(paymentData);
      
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Terjadi kesalahan saat memproses pembayaran');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cancel payment
   */
  cancelPayment() {
    this.paymentCancelled.emit();
  }

  /**
   * Handle keyboard shortcuts
   */
  onKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        if (this.isSufficientAmount() && !this.isProcessing) {
          this.processPayment();
        }
        break;
      case 'Escape':
        this.cancelPayment();
        break;
      case 'F1':
        event.preventDefault();
        this.selectPaymentMethod('cash');
        break;
      case 'F2':
        event.preventDefault();
        this.selectPaymentMethod('card');
        break;
      case 'F3':
        event.preventDefault();
        this.selectPaymentMethod('digital');
        break;
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get selected payment method info
   */
  getSelectedPaymentMethod() {
    return this.paymentMethods.find(method => method.id === this.selectedMethod);
  }

  /**
   * Handle amount input change
   */
  onAmountChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value) || 0;
    this.paymentForm.get('amountPaid')?.setValue(value);
  }

  /**
   * Add amount to current input
   */
  addAmount(amount: number) {
    const currentAmount = this.paymentForm.get('amountPaid')?.value || 0;
    this.paymentForm.get('amountPaid')?.setValue(currentAmount + amount);
  }

  /**
   * Clear amount input
   */
  clearAmount() {
    this.paymentForm.get('amountPaid')?.setValue(0);
    this.focusAmountInput();
  }
}