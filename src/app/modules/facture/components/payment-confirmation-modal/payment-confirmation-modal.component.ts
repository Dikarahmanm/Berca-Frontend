import { Component, input, output, signal, computed, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FactureDto, FacturePaymentDto, ConfirmPaymentDto } from '../../interfaces/facture.interfaces';

export interface PaymentConfirmationData {
  paymentId: number;
  confirmedAmount: number;
  supplierAckReference: string;
  notes?: string;
}

@Component({
  selector: 'app-payment-confirmation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="isVisible()" class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold text-gray-900">Confirm Payment Receipt</h3>
            <button 
              type="button" 
              class="modal-close-btn"
              (click)="close.emit()"
              [disabled]="isLoading()"
              aria-label="Close modal">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="text-sm text-gray-600 mt-2">
            Payment Amount: <strong>{{ formatCurrency(payment()!.amount || 0) }}</strong> for Facture #{{ facture()!.internalReferenceNumber }}
          </div>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <!-- Success Message -->
          <div class="success-message mb-6">
            <div class="flex items-center">
              <div class="success-icon">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div class="ml-3">
                <h4 class="text-lg font-medium text-gray-900">Payment Processed Successfully</h4>
                <p class="text-sm text-gray-600">Ready to confirm payment receipt from supplier</p>
              </div>
            </div>
          </div>

          <!-- Confirmation Form -->
          <form [formGroup]="confirmForm" (ngSubmit)="onSubmit()">
            
            <!-- Question -->
            <div class="mb-4">
              <p class="text-md font-medium text-gray-800 mb-2">
                Have you received confirmation from the supplier?
              </p>
              <p class="text-sm text-gray-600">
                Please ensure the supplier has confirmed this payment before proceeding.
              </p>
            </div>

            <!-- Supplier Acknowledgment Reference -->
            <div class="form-group">
              <label for="supplierAckReference" class="form-label required">
                Supplier Acknowledgment Reference
              </label>
              <input 
                id="supplierAckReference"
                type="text" 
                formControlName="supplierAckReference"
                placeholder="e.g., REF-12345, Email receipt ID, etc."
                class="form-input"
                [class.error]="confirmForm.get('supplierAckReference')?.invalid && confirmForm.get('supplierAckReference')?.touched">
              
              <div *ngIf="confirmForm.get('supplierAckReference')?.invalid && confirmForm.get('supplierAckReference')?.touched" 
                   class="form-error">
                Supplier acknowledgment reference is required
              </div>
              
              <small class="text-gray-600">
                Can be a reference number, email ID, or other confirmation proof from supplier
              </small>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <div class="flex gap-3 justify-end">
            <button 
              type="button"
              (click)="close.emit()"
              [disabled]="isLoading()"
              class="btn btn-outline">
              Cancel
            </button>
            
            <button 
              type="submit"
              (click)="onSubmit()"
              [disabled]="confirmForm.invalid || isLoading()"
              class="btn btn-primary">
              <span *ngIf="isLoading()" class="loading-spinner"></span>
              <span *ngIf="!isLoading()">Confirm Payment</span>
              <span *ngIf="isLoading()">Confirming...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Modal Styles - Same pattern as other modals */
    .modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(0, 0, 0, 0.5) !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 1rem !important;
      animation: fadeIn 0.2s ease-out !important;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from { 
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .modal-container {
      background: white !important;
      border-radius: 0.75rem !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
      width: 100% !important;
      max-width: 32rem !important;
      max-height: 90vh !important;
      overflow-y: auto !important;
      animation: slideIn 0.2s ease-out !important;
      margin: 0 !important;
    }

    .modal-header {
      padding: 1.5rem !important;
      border-bottom: 1px solid #e5e7eb !important;
      background: white !important;
      border-top-left-radius: 0.75rem !important;
      border-top-right-radius: 0.75rem !important;
    }

    .modal-close-btn {
      padding: 0.25rem !important;
      border-radius: 9999px !important;
      transition: background-color 0.15s ease !important;
      color: #6b7280 !important;
      background: none !important;
      border: none !important;
      cursor: pointer !important;
    }

    .modal-close-btn:hover:not(:disabled) {
      background-color: #f3f4f6 !important;
      color: #374151 !important;
    }

    .modal-close-btn:disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
    }

    .modal-body {
      padding: 1.5rem !important;
      background: white !important;
    }

    .modal-footer {
      padding: 1.5rem !important;
      border-top: 1px solid #e5e7eb !important;
      background: #f9fafb !important;
      border-bottom-left-radius: 0.75rem !important;
      border-bottom-right-radius: 0.75rem !important;
    }

    /* Success Message */
    .success-message {
      padding: 1rem !important;
      background: #f0fdf4 !important;
      border: 1px solid #bbf7d0 !important;
      border-radius: 0.5rem !important;
    }

    .success-icon {
      width: 2rem !important;
      height: 2rem !important;
      background: #dcfce7 !important;
      border-radius: 9999px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #059669 !important;
      flex-shrink: 0 !important;
    }

    /* Form Styles - Same as other modals */
    .form-group {
      margin-bottom: 1rem !important;
    }

    .form-label {
      display: block !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      color: #374151 !important;
      margin-bottom: 0.5rem !important;
    }

    .form-label.required::after {
      content: ' *' !important;
      color: #ef4444 !important;
    }

    .form-input {
      width: 100% !important;
      padding: 0.75rem !important;
      border: 1px solid #d1d5db !important;
      border-radius: 0.5rem !important;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
      font-size: 0.875rem !important;
      background: white !important;
      color: #111827 !important;
      transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    .form-input:focus {
      outline: none !important;
      border-color: #e47a3f !important;
      box-shadow: 0 0 0 3px rgba(228, 122, 63, 0.1) !important;
    }

    .form-input.error {
      border-color: #ef4444 !important;
    }

    .form-error {
      color: #ef4444 !important;
      font-size: 0.75rem !important;
      margin-top: 0.25rem !important;
    }

    /* Button Styles - Same as other modals */
    .btn {
      padding: 0.75rem 1rem !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      border-radius: 0.5rem !important;
      border: 1px solid transparent !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      min-height: 2.75rem !important;
    }

    .btn-primary {
      background-color: #e47a3f !important;
      color: white !important;
      border-color: #e47a3f !important;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #d66b2f !important;
      border-color: #d66b2f !important;
    }

    .btn-outline {
      background-color: white !important;
      color: #374151 !important;
      border-color: #d1d5db !important;
    }

    .btn-outline:hover:not(:disabled) {
      background-color: #f3f4f6 !important;
    }

    .btn:disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
    }

    .loading-spinner {
      display: inline-block !important;
      width: 1rem !important;
      height: 1rem !important;
      border: 2px solid transparent !important;
      border-top: 2px solid currentColor !important;
      border-radius: 50% !important;
      animation: spin 1s linear infinite !important;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Utility Classes */
    .flex { display: flex !important; }
    .items-center { align-items: center !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-end { justify-content: flex-end !important; }
    .gap-3 { gap: 0.75rem !important; }
    .ml-3 { margin-left: 0.75rem !important; }
    .mb-4 { margin-bottom: 1rem !important; }
    .mb-6 { margin-bottom: 1.5rem !important; }
    .mt-2 { margin-top: 0.5rem !important; }
    .w-5 { width: 1.25rem !important; }
    .h-5 { height: 1.25rem !important; }
    .w-6 { width: 1.5rem !important; }
    .h-6 { height: 1.5rem !important; }
    .text-xl { font-size: 1.25rem !important; }
    .text-lg { font-size: 1.125rem !important; }
    .text-md { font-size: 1rem !important; }
    .text-sm { font-size: 0.875rem !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-medium { font-weight: 500 !important; }
    .text-gray-900 { color: #111827 !important; }
    .text-gray-800 { color: #1f2937 !important; }
    .text-gray-600 { color: #4b5563 !important; }

    /* Mobile Responsive */
    @media (max-width: 640px) {
      .modal-overlay {
        padding: 0.5rem !important;
      }
      
      .modal-container {
        max-height: 95vh !important;
        margin: 0 !important;
        max-width: 100% !important;
      }
      
      .modal-header, .modal-body, .modal-footer {
        padding: 1rem !important;
      }

      .btn {
        min-height: 3rem !important;
        padding: 0.875rem 1.25rem !important;
      }
    }
  `]
})
export class PaymentConfirmationModalComponent implements OnInit {
  // Input properties
  facture = input.required<FactureDto>();
  payment = input.required<FacturePaymentDto>();
  isVisible = input.required<boolean>();
  isLoading = input<boolean>(false);

  // Output events
  close = output<void>();
  confirmPayment = output<PaymentConfirmationData>();

  // Form and services
  private fb = inject(FormBuilder);
  confirmForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.confirmForm = this.fb.group({
      supplierAckReference: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  onSubmit(): void {
    if (this.confirmForm.invalid || this.isLoading()) return;

    const formData = this.confirmForm.value;
    const payment = this.payment();

    if (!payment) return;

    const confirmationData: PaymentConfirmationData = {
      paymentId: payment.id,
      confirmedAmount: payment.amount, // Use the original payment amount
      supplierAckReference: formData.supplierAckReference,
      notes: undefined // Simplified, no notes needed
    };

    console.log('💚 Confirming payment:', confirmationData);
    this.confirmPayment.emit(confirmationData);
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget && !this.isLoading()) {
      this.close.emit();
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  }
}