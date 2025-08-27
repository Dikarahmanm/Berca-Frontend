import { Component, input, output, signal, inject, computed, ChangeDetectionStrategy, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FactureDto, FacturePaymentDto, ProcessPaymentDto, ConfirmPaymentDto, PaymentMethod } from '../../interfaces/facture.interfaces';

@Component({
  selector: 'app-receive-payment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="isVisible()" class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold text-gray-900">Receive Payment</h3>
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
            Facture #{{ facture()?.internalReferenceNumber }} - {{ formatCurrency(facture()?.outstandingAmount || 0) }} Outstanding
          </div>
        </div>

        <div class="modal-body">
          <!-- Payment Selection -->
          <div class="form-group" *ngIf="scheduledPayments().length > 0">
            <label class="form-label required">Select Payment to Process</label>
            <div class="payment-list">
              <div 
                *ngFor="let payment of scheduledPayments(); trackBy: trackByPayment"
                class="payment-card"
                [class.selected]="selectedPayment()?.id === payment.id"
                (click)="selectPayment(payment)">
                
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="payment-method-badge">{{ getPaymentMethodDisplay(payment.paymentMethod) }}</span>
                      <span class="status-badge" [class]="getStatusBadgeClass(payment.statusDisplay)">
                        {{ payment.statusDisplay }}
                      </span>
                    </div>
                    
                    <div class="payment-details">
                      <div class="text-lg font-semibold text-gray-900">{{ payment.amountDisplay }}</div>
                      <div class="text-sm text-gray-600">Scheduled: {{ formatDate(payment.scheduledDate) }}</div>
                      <div *ngIf="payment.ourPaymentReference" class="text-sm text-gray-600">
                        Ref: {{ payment.ourPaymentReference }}
                      </div>
                      <div *ngIf="payment.bankAccount" class="text-sm text-gray-600">
                        Account: {{ payment.bankAccount }}
                      </div>
                    </div>
                  </div>
                  
                  <div class="radio-selection">
                    <input 
                      type="radio" 
                      [checked]="selectedPayment()?.id === payment.id"
                      class="form-radio">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No Scheduled Payments -->
          <div *ngIf="scheduledPayments().length === 0" class="empty-state">
            <div class="text-center py-8">
              <div class="text-4xl mb-4">💳</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No Scheduled Payments</h3>
              <p class="text-gray-600 mb-4">There are no scheduled payments available for processing.</p>
              <button class="btn btn-primary" (click)="onClose()">Close</button>
            </div>
          </div>

          <!-- Payment Processing Form -->
          <form *ngIf="selectedPayment()" [formGroup]="receiveForm" (ngSubmit)="onSubmit()" class="mt-6">
            <div class="border-t border-gray-200 pt-6">
              <h4 class="text-md font-medium text-gray-900 mb-4">Payment Processing Details</h4>

              <!-- Confirmation Amount -->
              <div class="form-group">
                <label for="confirmedAmount" class="form-label required">Confirmed Amount</label>
                <div class="relative">
                  <span class="absolute left-3 top-half translate-y-center text-gray-500">Rp</span>
                  <input
                    id="confirmedAmount"
                    type="number"
                    formControlName="confirmedAmount"
                    class="form-input pl-10"
                    placeholder="0"
                    min="0"
                    step="0.01">
                </div>
                <div *ngIf="receiveForm.get('confirmedAmount')?.invalid && receiveForm.get('confirmedAmount')?.touched" class="form-error">
                  <div *ngIf="receiveForm.get('confirmedAmount')?.errors?.['required']">Confirmed amount is required</div>
                  <div *ngIf="receiveForm.get('confirmedAmount')?.errors?.['min']">Amount must be greater than 0</div>
                </div>
              </div>

              <!-- Payment Reference -->
              <div class="form-group" *ngIf="needsBankDetails()">
                <label for="transferReference" class="form-label">Transfer Reference</label>
                <input
                  id="transferReference"
                  type="text"
                  formControlName="transferReference"
                  class="form-input"
                  placeholder="Bank transfer reference number">
              </div>

              <!-- Check Number -->
              <div class="form-group" *ngIf="selectedPayment()?.paymentMethod === PaymentMethod.CHECK">
                <label for="checkNumber" class="form-label">Check Number</label>
                <input
                  id="checkNumber"
                  type="text"
                  formControlName="checkNumber"
                  class="form-input"
                  placeholder="Check number">
              </div>

              <!-- Fields for PROCESS PAYMENT (status 0 -> 1) -->
              <ng-container *ngIf="selectedPayment()?.status === 0">
                <!-- Payment Reference for Processing -->
                <div class="form-group">
                  <label for="confirmationReference" class="form-label">Payment Reference</label>
                  <input
                    id="confirmationReference"
                    type="text"
                    formControlName="confirmationReference"
                    class="form-input"
                    placeholder="Internal payment reference number">
                  <small class="text-gray-600">Optional: Internal tracking reference for this payment</small>
                </div>
              </ng-container>

              <!-- Fields for CONFIRM PAYMENT (status 1/2 -> 3) -->
              <ng-container *ngIf="selectedPayment()?.status === 1 || selectedPayment()?.status === 2">
                <!-- Confirmation Reference -->
                <div class="form-group">
                  <label for="confirmationReference" class="form-label">Confirmation Reference</label>
                  <input
                    id="confirmationReference"
                    type="text"
                    formControlName="confirmationReference"
                    class="form-input"
                    placeholder="Internal confirmation reference">
                  <small class="text-gray-600">Optional: Internal confirmation tracking reference</small>
                </div>

                <!-- Supplier Acknowledgement Reference -->
                <div class="form-group">
                  <label for="supplierAckReference" class="form-label required">Supplier Acknowledgement Reference</label>
                  <input
                    id="supplierAckReference"
                    type="text"
                    formControlName="supplierAckReference"
                    class="form-input"
                    placeholder="Supplier's acknowledgement/receipt reference number"
                    [class.error]="receiveForm.get('supplierAckReference')?.invalid && receiveForm.get('supplierAckReference')?.touched">
                  <div *ngIf="receiveForm.get('supplierAckReference')?.invalid && receiveForm.get('supplierAckReference')?.touched" class="error-message">
                    Supplier acknowledgement reference is required for confirmation
                  </div>
                  <small class="text-gray-600">Required: Reference number from supplier confirming payment receipt</small>
                </div>
              </ng-container>

              <!-- Notes -->
              <div class="form-group">
                <label for="notes" class="form-label">Processing Notes</label>
                <textarea
                  id="notes"
                  formControlName="notes"
                  rows="3"
                  class="form-input"
                  placeholder="Additional notes about payment processing..."></textarea>
              </div>

              <!-- File Upload (Future Enhancement) -->
              <div class="form-group">
                <label class="form-label">Payment Confirmation File</label>
                <div class="file-upload-placeholder">
                  <div class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <div class="text-gray-500 text-sm">
                      📁 File upload coming soon
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer" *ngIf="selectedPayment()">
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
              [disabled]="!receiveForm.valid || isLoading() || selectedPayment()?.status === 3">
              <span *ngIf="isLoading()" class="loading-spinner"></span>
              <span *ngIf="!isLoading()">{{ currentAction().action }}</span>
              <span *ngIf="isLoading()">{{ currentAction().processing }}</span>
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
      max-width: 42rem !important;
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

    .modal-footer {
      padding: 1.5rem !important;
      border-top: 1px solid #e5e7eb !important;
      background: #f9fafb !important;
      border-bottom-left-radius: 0.75rem !important;
      border-bottom-right-radius: 0.75rem !important;
    }

    .payment-list {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.75rem !important;
      max-height: 300px !important;
      overflow-y: auto !important;
    }

    .payment-card {
      padding: 1rem !important;
      border: 2px solid #e5e7eb !important;
      border-radius: 0.5rem !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      background: white !important;
    }

    .payment-card:hover {
      border-color: #d1d5db !important;
      background: #f9fafb !important;
    }

    .payment-card.selected {
      border-color: #e47a3f !important;
      background: #fef7f2 !important;
    }

    .payment-method-badge {
      display: inline-block !important;
      padding: 0.25rem 0.5rem !important;
      background: #e5e7eb !important;
      color: #374151 !important;
      font-size: 0.75rem !important;
      font-weight: 500 !important;
      border-radius: 0.375rem !important;
    }

    .status-badge {
      display: inline-block !important;
      padding: 0.25rem 0.5rem !important;
      font-size: 0.75rem !important;
      font-weight: 500 !important;
      border-radius: 0.375rem !important;
    }

    .status-badge.scheduled {
      background: #dbeafe !important;
      color: #1e40af !important;
    }

    .status-badge.pending {
      background: #fef3c7 !important;
      color: #92400e !important;
    }

    .status-badge.processing {
      background: #e0e7ff !important;
      color: #3730a3 !important;
    }

    .payment-details {
      margin-top: 0.5rem !important;
    }

    .radio-selection {
      margin-left: 1rem !important;
    }

    .form-radio {
      width: 1rem !important;
      height: 1rem !important;
      color: #e47a3f !important;
      border: 1px solid #d1d5db !important;
    }

    .empty-state {
      text-align: center !important;
      padding: 2rem !important;
    }

    .file-upload-placeholder {
      margin-top: 0.5rem !important;
    }

    /* Form Styles - Same as schedule modal */
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

    /* Utility classes */
    .flex { display: flex !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-end { justify-content: flex-end !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .gap-2 { gap: 0.5rem !important; }
    .gap-3 { gap: 0.75rem !important; }
    .mt-2 { margin-top: 0.5rem !important; }
    .mt-4 { margin-top: 1rem !important; }
    .mt-6 { margin-top: 1.5rem !important; }
    .mb-2 { margin-bottom: 0.5rem !important; }
    .mb-4 { margin-bottom: 1rem !important; }
    .pt-6 { padding-top: 1.5rem !important; }
    .py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
    .py-8 { padding-top: 2rem !important; padding-bottom: 2rem !important; }
    .text-xl { font-size: 1.25rem !important; }
    .text-lg { font-size: 1.125rem !important; }
    .text-md { font-size: 1rem !important; }
    .text-sm { font-size: 0.875rem !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-medium { font-weight: 500 !important; }
    .text-gray-900 { color: #111827 !important; }
    .text-gray-600 { color: #4b5563 !important; }
    .text-gray-500 { color: #6b7280 !important; }
    .border-t { border-top: 1px solid #e5e7eb !important; }
    .border-2 { border-width: 2px !important; }
    .border-dashed { border-style: dashed !important; }
    .border-gray-200 { border-color: #e5e7eb !important; }
    .border-gray-300 { border-color: #d1d5db !important; }
    .rounded-lg { border-radius: 0.5rem !important; }
    .w-5 { width: 1.25rem !important; }
    .h-5 { height: 1.25rem !important; }
    .relative { position: relative !important; }
    .absolute { position: absolute !important; }
    .left-3 { left: 0.75rem !important; }
    .top-half { top: 50% !important; }
    .translate-y-center { transform: translateY(-50%) !important; }
    .pl-10 { padding-left: 2.5rem !important; }
    .flex-1 { flex: 1 1 0% !important; }
    .text-center { text-align: center !important; }

    /* Responsive */
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
export class ReceivePaymentModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  // Inputs
  facture = input.required<FactureDto>();
  isVisible = input<boolean>(false);
  isLoading = input<boolean>(false);

  // Outputs
  close = output<void>();
  processPayment = output<ProcessPaymentDto>();
  confirmPayment = output<ConfirmPaymentDto>();

  // Internal state
  selectedPayment = signal<FacturePaymentDto | null>(null);
  lastProcessedPaymentId = signal<number | null>(null);
  receiveForm!: FormGroup;

  // Expose enum for template
  readonly PaymentMethod = PaymentMethod;

  // Computed properties
  readonly scheduledPayments = computed(() => {
    const facture = this.facture();
    if (!facture?.payments) return [];
    
    // Filter for payments that can be processed OR confirmed
    const filtered = facture.payments.filter(payment => 
      (payment.canProcess || payment.canConfirm) && 
      (payment.status === 0 || payment.status === 1 || payment.status === 2) // SCHEDULED, PENDING, or PROCESSING
    );
    
    console.log('🔍 Filtering payments:', facture.payments.map(p => ({
      id: p.id,
      status: p.status,
      statusDisplay: p.statusDisplay,
      canProcess: p.canProcess,
      canConfirm: p.canConfirm,
      included: (p.canProcess || p.canConfirm) && (p.status === 0 || p.status === 1 || p.status === 2)
    })));
    
    console.log('🔍 Final filtered payments count:', filtered.length);
    
    return filtered;
  });

  readonly needsBankDetails = computed(() => {
    const payment = this.selectedPayment();
    return payment?.paymentMethod === PaymentMethod.BANK_TRANSFER;
  });

  readonly currentAction = computed(() => {
    const payment = this.selectedPayment();
    if (!payment) return { action: 'Select Payment', processing: 'Processing...' };

    console.log('🔍 Current payment status:', payment.status, payment.statusDisplay);
    console.log('🔍 Payment capabilities - canProcess:', payment.canProcess, 'canConfirm:', payment.canConfirm);
    
    let actionResult;
    switch (payment.status) {
      case 0: // SCHEDULED
        actionResult = { action: 'Process Payment', processing: 'Processing...' };
        break;
      case 1: // PENDING  
      case 2: // PROCESSING
        actionResult = { action: 'Confirm Payment', processing: 'Confirming...' };
        break;
      case 3: // COMPLETED
        actionResult = { action: 'Payment Completed', processing: 'Completed' };
        break;
      default:
        actionResult = { action: 'Complete Payment', processing: 'Completing...' };
    }
    
    console.log('🔍 Button will show:', actionResult.action);
    return actionResult;
  });

  constructor() {
    // Auto-reselect payment after facture refresh
    effect(() => {
      const lastPaymentId = this.lastProcessedPaymentId();
      const payments = this.scheduledPayments();
      
      console.log('🔄 Effect triggered - lastPaymentId:', lastPaymentId, 'payments count:', payments.length);
      
      if (lastPaymentId && payments.length > 0) {
        const updatedPayment = payments.find(p => p.id === lastPaymentId);
        console.log('🔍 Looking for payment ID:', lastPaymentId, 'in payments:', payments.map(p => ({ id: p.id, status: p.status, canProcess: p.canProcess, canConfirm: p.canConfirm })));
        
        if (updatedPayment) {
          console.log('🔄 Auto-reselecting updated payment:', updatedPayment.id, 'status:', updatedPayment.status, 'statusDisplay:', updatedPayment.statusDisplay);
          console.log('🔍 Payment capabilities - canProcess:', updatedPayment.canProcess, 'canConfirm:', updatedPayment.canConfirm);
          this.selectedPayment.set(updatedPayment);
          this.updateFormForPayment(updatedPayment);
        } else {
          console.log('⚠️ Payment not found after refresh! Available payment IDs:', payments.map(p => p.id));
        }
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.receiveForm = this.fb.group({
      confirmedAmount: [0, [Validators.required, Validators.min(0.01)]],
      transferReference: [''],
      checkNumber: [''],
      confirmationReference: [''],
      supplierAckReference: [''], // Validation will be set dynamically based on payment status
      notes: ['']
    });
  }

  selectPayment(payment: FacturePaymentDto): void {
    this.selectedPayment.set(payment);
    this.lastProcessedPaymentId.set(payment.id);
    this.updateFormForPayment(payment);
  }

  private updateFormForPayment(payment: FacturePaymentDto): void {
    // Pre-fill the form with payment data
    this.receiveForm.patchValue({
      confirmedAmount: payment.amount,
      transferReference: payment.transferReference || '',
      checkNumber: payment.checkNumber || '',
      confirmationReference: payment.paymentReference || this.generateConfirmationReference(payment),
      supplierAckReference: payment.supplierAckReference || '',
      notes: payment.notes || ''
    });

    // Update validators based on payment method
    this.updateFormValidators(payment);
  }

  private updateFormValidators(payment: FacturePaymentDto): void {
    const transferRefControl = this.receiveForm.get('transferReference');
    const checkNumberControl = this.receiveForm.get('checkNumber');
    const supplierAckRefControl = this.receiveForm.get('supplierAckReference');

    // Clear all validators first
    transferRefControl?.clearValidators();
    checkNumberControl?.clearValidators();
    supplierAckRefControl?.clearValidators();

    // Set validators based on payment status and method
    if (payment.status === 0) { 
      // SCHEDULED - Processing step: validate payment method fields
      if (payment.paymentMethod === PaymentMethod.BANK_TRANSFER) {
        transferRefControl?.setValidators([Validators.required]);
      } else if (payment.paymentMethod === PaymentMethod.CHECK) {
        checkNumberControl?.setValidators([Validators.required]);
      }
    } else if (payment.status === 1 || payment.status === 2) { 
      // PENDING/PROCESSING - Confirmation step: require supplier acknowledgement
      supplierAckRefControl?.setValidators([Validators.required]);
    }

    // Update validity
    transferRefControl?.updateValueAndValidity();
    checkNumberControl?.updateValueAndValidity();
    supplierAckRefControl?.updateValueAndValidity();
  }

  private generateConfirmationReference(payment: FacturePaymentDto): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `CONF-${payment.id}-${date}`;
  }

  trackByPayment = (index: number, payment: FacturePaymentDto): number => payment.id;

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    this.selectedPayment.set(null);
    this.receiveForm.reset();
    this.close.emit();
  }

  onSubmit(): void {
    const selectedPayment = this.selectedPayment();
    if (!this.receiveForm.valid || !selectedPayment || this.isLoading()) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.receiveForm.controls).forEach(key => {
        this.receiveForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.receiveForm.value;

    // Store payment ID for auto-reselection after refresh
    this.lastProcessedPaymentId.set(selectedPayment.id);

    // Determine workflow step based on payment status
    if (selectedPayment.status === 0) { 
      // SCHEDULED: First step - Process the payment
      console.log('🔄 Processing SCHEDULED payment:', selectedPayment.id, 'status:', selectedPayment.status);
      const processData: ProcessPaymentDto = {
        paymentId: selectedPayment.id,
        bankAccount: selectedPayment.bankAccount,
        checkNumber: formValue.checkNumber || undefined,
        transferReference: formValue.transferReference || undefined,
        paymentReference: formValue.confirmationReference || undefined,
        notes: formValue.notes || undefined
      };

      this.processPayment.emit(processData);
      
    } else if (selectedPayment.status === 1 || selectedPayment.status === 2) { 
      // PENDING or PROCESSING: Second step - Confirm the payment
      console.log('✅ Confirming PENDING/PROCESSING payment:', selectedPayment.id, 'status:', selectedPayment.status);
      const confirmData: ConfirmPaymentDto = {
        paymentId: selectedPayment.id,
        confirmedAmount: parseFloat(formValue.confirmedAmount),
        confirmationReference: formValue.confirmationReference || undefined,
        supplierAckReference: formValue.supplierAckReference,
        notes: formValue.notes || undefined,
        confirmationFile: undefined // File upload to be implemented later
      };

      this.confirmPayment.emit(confirmData);
      
    } else {
      console.warn('⚠️ Unknown payment status:', selectedPayment.status, selectedPayment.statusDisplay);
      // For any other status, try to confirm directly
      const confirmData: ConfirmPaymentDto = {
        paymentId: selectedPayment.id,
        confirmedAmount: parseFloat(formValue.confirmedAmount),
        confirmationReference: formValue.confirmationReference || undefined,
        supplierAckReference: formValue.supplierAckReference,
        notes: formValue.notes || undefined,
        confirmationFile: undefined
      };

      this.confirmPayment.emit(confirmData);
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
    if (!date) return 'Not set';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID');
  }

  getPaymentMethodDisplay(method: number): string {
    const methods = {
      0: 'Bank Transfer',
      1: 'Check',
      2: 'Cash',
      3: 'Credit Card',
      4: 'Digital Wallet'
    };
    return methods[method as keyof typeof methods] || 'Unknown';
  }

  getStatusBadgeClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('scheduled')) return 'scheduled';
    if (statusLower.includes('pending')) return 'pending';
    if (statusLower.includes('processing')) return 'processing';
    return '';
  }
}