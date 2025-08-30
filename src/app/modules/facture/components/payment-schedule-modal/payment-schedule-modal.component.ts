import { Component, input, output, signal, inject, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SchedulePaymentDto, PaymentMethod, FactureDto } from '../../interfaces/facture.interfaces';

@Component({
  selector: 'app-payment-schedule-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="isVisible()" class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold text-gray-900">Schedule Payment</h3>
            <button 
              type="button" 
              class="modal-close-btn"
              (click)="onClose()"
              aria-label="Close modal">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="text-sm text-gray-600 mt-2">
            Facture #{{ facture()!.internalReferenceNumber }} - {{ formatCurrency(facture()!.outstandingAmount || 0) }} Outstanding
          </div>
        </div>

        <form [formGroup]="scheduleForm" (ngSubmit)="onSubmit()" class="modal-body">
          <!-- Payment Amount -->
          <div class="form-group">
            <label for="amount" class="form-label required">Payment Amount</label>
            <div class="relative">
              <span class="absolute left-3 top-half translate-y-center text-gray-500">Rp</span>
              <input
                id="amount"
                type="number"
                formControlName="amount"
                class="form-input pl-10"
                placeholder="0"
                min="0"
                [max]="facture()!.outstandingAmount || 999999999"
                step="0.01">
            </div>
            <div *ngIf="scheduleForm.get('amount')?.invalid && scheduleForm.get('amount')?.touched" class="form-error">
              <div *ngIf="scheduleForm.get('amount')?.errors?.['required']">Payment amount is required</div>
              <div *ngIf="scheduleForm.get('amount')?.errors?.['min']">Amount must be greater than 0</div>
              <div *ngIf="scheduleForm.get('amount')?.errors?.['max']">Amount cannot exceed outstanding balance</div>
            </div>
          </div>

          <!-- Payment Date -->
          <div class="form-group">
            <label for="paymentDate" class="form-label required">Payment Date</label>
            <input
              id="paymentDate"
              type="date"
              formControlName="paymentDate"
              class="form-input"
              [min]="todayDate()">
            <div *ngIf="scheduleForm.get('paymentDate')?.invalid && scheduleForm.get('paymentDate')?.touched" class="form-error">
              <div *ngIf="scheduleForm.get('paymentDate')?.errors?.['required']">Payment date is required</div>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="form-group">
            <label for="paymentMethod" class="form-label required">Payment Method</label>
            <select
              id="paymentMethod"
              formControlName="paymentMethod"
              class="form-input">
              <option value="">Select payment method</option>
              <option [value]="PaymentMethod.BANK_TRANSFER">Bank Transfer</option>
              <option [value]="PaymentMethod.CHECK">Check</option>
              <option [value]="PaymentMethod.CASH">Cash</option>
              <option [value]="PaymentMethod.CREDIT_CARD">Credit Card</option>
              <option [value]="PaymentMethod.DIGITAL_WALLET">Digital Wallet</option>
            </select>
            <div *ngIf="scheduleForm.get('paymentMethod')?.invalid && scheduleForm.get('paymentMethod')?.touched" class="form-error">
              <div *ngIf="scheduleForm.get('paymentMethod')?.errors?.['required']">Payment method is required</div>
            </div>
          </div>

          <!-- Bank Account (conditional) -->
          <div *ngIf="showBankAccount()" class="form-group">
            <label for="bankAccount" class="form-label">Bank Account</label>
            <input
              id="bankAccount"
              type="text"
              formControlName="bankAccount"
              class="form-input"
              placeholder="Account number or details">
          </div>

          <!-- Payment Reference -->
          <div class="form-group">
            <label for="ourPaymentReference" class="form-label">Our Payment Reference</label>
            <input
              id="ourPaymentReference"
              type="text"
              formControlName="ourPaymentReference"
              class="form-input"
              placeholder="Internal reference number">
          </div>

          <!-- Recurring Payment -->
          <div class="form-group">
            <div class="flex items-center">
              <input
                id="isRecurring"
                type="checkbox"
                formControlName="isRecurring"
                class="form-checkbox">
              <label for="isRecurring" class="ml-2 text-sm font-medium text-gray-700">
                Set as recurring payment
              </label>
            </div>
          </div>

          <!-- Recurrence Pattern (conditional) -->
          <div *ngIf="scheduleForm.get('isRecurring')?.value" class="form-group">
            <label for="recurrencePattern" class="form-label">Recurrence Pattern</label>
            <select
              id="recurrencePattern"
              formControlName="recurrencePattern"
              class="form-input">
              <option value="">Select pattern</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          <!-- Notes -->
          <div class="form-group">
            <label for="notes" class="form-label">Notes</label>
            <textarea
              id="notes"
              formControlName="notes"
              rows="3"
              class="form-input"
              placeholder="Additional notes for this payment..."></textarea>
          </div>
        </form>

        <div class="modal-footer">
          <div class="flex gap-3 justify-end">
            <button
              type="button"
              class="btn btn-outline"
              (click)="onClose()"
              [disabled]="isLoading()">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              (click)="onSubmit()"
              [disabled]="!scheduleForm.valid || isLoading()">
              <span *ngIf="isLoading()" class="loading-spinner"></span>
              <span *ngIf="!isLoading()">Schedule Payment</span>
              <span *ngIf="isLoading()">Scheduling...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
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

    .modal-close-btn:hover {
      background-color: #f3f4f6 !important;
      color: #374151 !important;
    }

    .modal-body {
      padding: 1.5rem !important;
      background: white !important;
    }

    .modal-body .form-group {
      margin-bottom: 1rem !important;
    }

    .modal-footer {
      padding: 1.5rem !important;
      border-top: 1px solid #e5e7eb !important;
      background: #f9fafb !important;
      border-bottom-left-radius: 0.75rem !important;
      border-bottom-right-radius: 0.75rem !important;
    }

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

    .form-input:invalid,
    .form-input.ng-invalid.ng-touched {
      border-color: #ef4444 !important;
    }

    .form-input:invalid:focus,
    .form-input.ng-invalid.ng-touched:focus {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }

    .form-checkbox {
      width: 1rem !important;
      height: 1rem !important;
      color: #e47a3f !important;
      border: 1px solid #d1d5db !important;
      border-radius: 0.25rem !important;
    }

    .form-checkbox:focus {
      box-shadow: 0 0 0 3px rgba(228, 122, 63, 0.1) !important;
    }

    .form-error {
      color: #ef4444 !important;
      font-size: 0.75rem !important;
      margin-top: 0.25rem !important;
    }

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

    .btn-primary:focus {
      box-shadow: 0 0 0 3px rgba(228, 122, 63, 0.3) !important;
    }

    .btn-outline {
      background-color: white !important;
      color: #374151 !important;
      border-color: #d1d5db !important;
    }

    .btn-outline:hover:not(:disabled) {
      background-color: #f3f4f6 !important;
    }

    .btn-outline:focus {
      box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.3) !important;
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

    /* Responsive */
    @media (max-width: 640px) {
      .modal-overlay {
        padding: 0.5rem !important;
      }
      
      .modal-container {
        max-height: 95vh !important;
        margin: 0 !important;
      }
      
      .modal-header, .modal-body, .modal-footer {
        padding: 1rem !important;
      }

      .btn {
        min-height: 3rem !important;
        padding: 0.875rem 1.25rem !important;
      }
    }

    /* Utility classes */
    .flex {
      display: flex !important;
    }

    .justify-between {
      justify-content: space-between !important;
    }

    .justify-end {
      justify-content: flex-end !important;
    }

    .items-center {
      align-items: center !important;
    }

    .gap-2 {
      gap: 0.5rem !important;
    }

    .gap-3 {
      gap: 0.75rem !important;
    }

    .ml-2 {
      margin-left: 0.5rem !important;
    }

    .mt-2 {
      margin-top: 0.5rem !important;
    }

    .text-xl {
      font-size: 1.25rem !important;
    }

    .text-sm {
      font-size: 0.875rem !important;
    }

    .font-semibold {
      font-weight: 600 !important;
    }

    .font-medium {
      font-weight: 500 !important;
    }

    .text-gray-900 {
      color: #111827 !important;
    }

    .text-gray-600 {
      color: #4b5563 !important;
    }

    .text-gray-500 {
      color: #6b7280 !important;
    }

    .text-gray-700 {
      color: #374151 !important;
    }

    .w-5 {
      width: 1.25rem !important;
    }

    .h-5 {
      height: 1.25rem !important;
    }

    .relative {
      position: relative !important;
    }

    .absolute {
      position: absolute !important;
    }

    .left-3 {
      left: 0.75rem !important;
    }

    .top-half {
      top: 50% !important;
    }

    .transform {
      transform: translateY(-50%) !important;
    }

    .translate-y-center {
      transform: translateY(-50%) !important;
    }

    .pl-10 {
      padding-left: 2.5rem !important;
    }
  `]
})
export class PaymentScheduleModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  // Inputs
  facture = input.required<FactureDto>();
  isVisible = input<boolean>(false);
  isLoading = input<boolean>(false);

  // Outputs
  close = output<void>();
  schedulePayment = output<SchedulePaymentDto>();

  // Form
  scheduleForm!: FormGroup;

  // Expose enum for template
  readonly PaymentMethod = PaymentMethod;

  // Computed properties
  readonly todayDate = computed(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  readonly showBankAccount = computed(() => {
    const method = this.scheduleForm?.get('paymentMethod')?.value;
    return method === PaymentMethod.BANK_TRANSFER || method === PaymentMethod.CHECK;
  });

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    const facture = this.facture();
    
    this.scheduleForm = this.fb.group({
      amount: [facture?.outstandingAmount || 0, [
        Validators.required,
        Validators.min(0.01),
        Validators.max(facture?.outstandingAmount || 999999999)
      ]],
      paymentDate: [this.getDefaultPaymentDate(), Validators.required],
      paymentMethod: ['', Validators.required],
      bankAccount: [''],
      ourPaymentReference: [this.generatePaymentReference()],
      isRecurring: [false],
      recurrencePattern: [''],
      notes: ['']
    });

    // Add conditional validation for recurrence pattern
    this.scheduleForm.get('isRecurring')?.valueChanges.subscribe(isRecurring => {
      const recurrenceControl = this.scheduleForm.get('recurrencePattern');
      if (isRecurring) {
        recurrenceControl?.setValidators([Validators.required]);
      } else {
        recurrenceControl?.clearValidators();
      }
      recurrenceControl?.updateValueAndValidity();
    });
  }

  private getDefaultPaymentDate(): string {
    const facture = this.facture();
    if (facture?.dueDate) {
      return new Date(facture.dueDate).toISOString().split('T')[0];
    }
    
    // Default to 30 days from today
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }

  private generatePaymentReference(): string {
    const facture = this.facture();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PAY-${facture?.internalReferenceNumber}-${date}`;
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (this.scheduleForm.valid && !this.isLoading()) {
      const formValue = this.scheduleForm.value;
      const facture = this.facture();
      
      const scheduleData: SchedulePaymentDto = {
        factureId: facture.id,
        paymentDate: new Date(formValue.paymentDate),
        amount: parseFloat(formValue.amount),
        paymentMethod: parseInt(formValue.paymentMethod),
        bankAccount: formValue.bankAccount || undefined,
        ourPaymentReference: formValue.ourPaymentReference || undefined,
        notes: formValue.notes || undefined,
        isRecurring: formValue.isRecurring || false,
        recurrencePattern: formValue.recurrencePattern || undefined
      };

      this.schedulePayment.emit(scheduleData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.scheduleForm.controls).forEach(key => {
        this.scheduleForm.get(key)?.markAsTouched();
      });
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}