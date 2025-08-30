import { Component, OnInit, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FactureDto, FactureItemDetailDto } from '../../interfaces/facture.interfaces';

export type WorkflowType = 'verify' | 'approve' | 'dispute' | 'cancel';

export interface VerifyItemFormData {
  itemId: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  verificationNotes: string;
  isVerified: boolean;
}

export interface VerifyFormData {
  factureId: number;
  verificationNotes: string;
  items: VerifyItemFormData[];
}

export interface ApprovalFormData {
  approvalNotes: string;
}

export interface DisputeFormData {
  factureId: number;
  disputeReason: string;
  additionalNotes: string;
  supportingDocuments: string;
}

export interface CancelFormData {
  cancellationReason: string;
}

@Component({
  selector: 'app-facture-workflow-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-container">
        
        <!-- Modal Header -->
        <div class="modal-header">
          <h3 class="modal-title">{{ getModalTitle() }}</h3>
          <button type="button" class="modal-close" (click)="onClose()">&times;</button>
        </div>

        <!-- Modal Content -->
        <div class="modal-content">
          <form [formGroup]="workflowForm()" (ngSubmit)="onSubmit()">
            
            <!-- Verify Modal -->
            <div *ngIf="workflowType() === 'verify'">
              <div class="form-section">
                <h4>Verification Notes</h4>
                <textarea 
                  class="form-control" 
                  formControlName="verificationNotes"
                  placeholder="Enter overall verification notes..."
                  rows="3">
                </textarea>
              </div>

              <div class="form-section">
                <h4>Item Verification</h4>
                <div class="items-container" formArrayName="items">
                  <div 
                    *ngFor="let itemForm of itemsFormArray().controls; let i = index" 
                    [formGroupName]="i" 
                    class="item-card">
                    
                    <div class="item-header">
                      <h5>{{ getItemDisplayName(i) }}</h5>
                      <span class="item-quantity">Ordered: {{ getItemOrderedQuantity(i) }}</span>
                    </div>

                    <div class="form-row">
                      <div class="form-field">
                        <label>Received Quantity *</label>
                        <input 
                          type="number" 
                          class="form-control"
                          formControlName="receivedQuantity"
                          [placeholder]="getItemOrderedQuantity(i).toString()"
                          step="0.01"
                          min="0">
                      </div>

                      <div class="form-field">
                        <label>Accepted Quantity *</label>
                        <input 
                          type="number" 
                          class="form-control"
                          formControlName="acceptedQuantity"
                          [placeholder]="getItemOrderedQuantity(i).toString()"
                          step="0.01"
                          min="0">
                      </div>
                    </div>

                    <div class="form-field">
                      <label>Item Notes</label>
                      <textarea 
                        class="form-control" 
                        formControlName="verificationNotes"
                        placeholder="Notes for this item..."
                        rows="2">
                      </textarea>
                    </div>

                    <div class="form-field">
                      <label class="checkbox-label">
                        <input type="checkbox" formControlName="isVerified">
                        <span class="checkmark"></span>
                        Mark as verified
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Approve Modal -->
            <div *ngIf="workflowType() === 'approve'">
              <div class="form-section">
                <h4>Approval Notes</h4>
                <p class="form-description">
                  Add notes for approving facture: <strong>{{ facture()!.supplierInvoiceNumber }}</strong>
                </p>
                <textarea 
                  class="form-control" 
                  formControlName="approvalNotes"
                  placeholder="Enter approval notes (optional)..."
                  rows="4">
                </textarea>
              </div>

              <div class="approval-summary">
                <h5>Approval Summary</h5>
                <div class="summary-item">
                  <span>Supplier:</span>
                  <span>{{ facture()!.supplierName }}</span>
                </div>
                <div class="summary-item">
                  <span>Total Amount:</span>
                  <span>{{ facture()!.totalAmountDisplay }}</span>
                </div>
                <div class="summary-item">
                  <span>Outstanding:</span>
                  <span>{{ facture()!.outstandingAmountDisplay }}</span>
                </div>
              </div>
            </div>

            <!-- Dispute Modal -->
            <div *ngIf="workflowType() === 'dispute'">
              <div class="form-section">
                <h4>Dispute Reason *</h4>
                <p class="form-description text-error">
                  Disputing facture: <strong>{{ facture()!.supplierInvoiceNumber }}</strong>
                </p>
                <textarea 
                  class="form-control" 
                  formControlName="disputeReason"
                  placeholder="Enter detailed reason for dispute (minimum 10 characters)..."
                  rows="4"
                  [class.error]="isFieldInvalid('disputeReason')">
                </textarea>
                <div *ngIf="isFieldInvalid('disputeReason')" class="error-message">
                  Dispute reason is required (minimum 10 characters)
                </div>
              </div>

              <div class="form-section">
                <h4>Additional Notes</h4>
                <textarea 
                  class="form-control" 
                  formControlName="additionalNotes"
                  placeholder="Additional notes or context..."
                  rows="3">
                </textarea>
              </div>

              <div class="form-section">
                <h4>Supporting Documents</h4>
                <input 
                  type="text" 
                  class="form-control"
                  formControlName="supportingDocuments"
                  placeholder="Document URLs or references">
                <small class="form-hint">
                  Enter URLs or file references that support your dispute
                </small>
              </div>
            </div>

            <!-- Cancel Modal -->
            <div *ngIf="workflowType() === 'cancel'">
              <div class="form-section">
                <h4>Cancellation Reason *</h4>
                <p class="form-description text-error">
                  <strong>⚠️ Warning:</strong> This will cancel facture: <strong>{{ facture()!.supplierInvoiceNumber }}</strong>
                </p>
                <textarea 
                  class="form-control" 
                  formControlName="cancellationReason"
                  placeholder="Enter detailed reason for cancellation..."
                  rows="4"
                  [class.error]="isFieldInvalid('cancellationReason')">
                </textarea>
                <div *ngIf="isFieldInvalid('cancellationReason')" class="error-message">
                  Cancellation reason is required
                </div>
              </div>

              <div class="cancel-warning">
                <p><strong>This action cannot be undone.</strong></p>
                <p>The facture will be marked as cancelled and removed from active processing.</p>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="onClose()">
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn"
                [class]="getSubmitButtonClass()"
                [disabled]="!workflowForm().valid || loading()">
                
                <span *ngIf="loading()" class="loading-spinner"></span>
                {{ getSubmitButtonText() }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease-out;
    }

    .modal-container {
      background: var(--surface);
      border-radius: var(--radius-lg);
      width: 90%;
      max-width: 700px;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: var(--shadow-xl);
      animation: slideUp 0.3s ease-out;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s6);
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: var(--s2);
      line-height: 1;
      color: var(--text-secondary);
      transition: var(--transition);
    }

    .modal-close:hover {
      color: var(--text);
    }

    .modal-content {
      padding: var(--s6);
      max-height: calc(90vh - 140px);
      overflow-y: auto;
    }

    .form-section {
      margin-bottom: var(--s6);
    }

    .form-section h4 {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      margin-bottom: var(--s3);
      color: var(--text);
    }

    .form-description {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-bottom: var(--s3);
    }

    .text-error {
      color: var(--error);
    }

    .form-field {
      margin-bottom: var(--s4);
    }

    .form-field label {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      margin-bottom: var(--s2);
      color: var(--text);
    }

    .form-control {
      width: 100%;
      padding: var(--s3);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      font-size: var(--text-base);
      transition: var(--transition);
      resize: vertical;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary);
    }

    .form-control.error {
      border-color: var(--error);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s4);
    }

    .form-hint {
      font-size: var(--text-xs);
      color: var(--text-muted);
      display: block;
      margin-top: var(--s1);
    }

    .error-message {
      color: var(--error);
      font-size: var(--text-sm);
      margin-top: var(--s1);
    }

    .items-container {
      space-y: var(--s4);
    }

    .item-card {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: var(--s4);
      margin-bottom: var(--s4);
      background: var(--bg-secondary);
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s3);
    }

    .item-header h5 {
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      margin: 0;
    }

    .item-quantity {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: var(--text-sm);
    }

    .checkbox-label input[type="checkbox"] {
      margin-right: var(--s2);
    }

    .approval-summary {
      background: var(--primary-light);
      padding: var(--s4);
      border-radius: var(--radius);
      border-left: 4px solid var(--primary);
    }

    .approval-summary h5 {
      margin-bottom: var(--s3);
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--s2);
      font-size: var(--text-sm);
    }

    .summary-item:last-child {
      margin-bottom: 0;
    }

    .cancel-warning {
      background: var(--error);
      background-opacity: 0.1;
      padding: var(--s4);
      border-radius: var(--radius);
      border-left: 4px solid var(--error);
    }

    .cancel-warning p {
      color: var(--error);
      font-size: var(--text-sm);
      margin: var(--s2) 0;
    }

    .cancel-warning p:first-child {
      font-weight: var(--font-semibold);
    }

    .modal-footer {
      display: flex;
      gap: var(--s3);
      justify-content: flex-end;
      padding-top: var(--s4);
      border-top: 1px solid var(--border);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s3) var(--s5);
      border: 2px solid transparent;
      border-radius: var(--radius);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      min-height: 44px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-outline {
      background: var(--surface);
      color: var(--text);
      border-color: var(--border);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--bg-secondary);
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }

    .btn-success {
      background: var(--success);
      color: white;
      border-color: var(--success);
    }

    .btn-error {
      background: var(--error);
      color: white;
      border-color: var(--error);
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .modal-container {
        width: 95%;
        max-height: 95vh;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .modal-content {
        padding: var(--s4);
      }

      .modal-header {
        padding: var(--s4);
      }
    }
  `]
})
export class FactureWorkflowModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  // Inputs
  facture = input.required<FactureDto>();
  workflowType = input.required<WorkflowType>();
  loading = input<boolean>(false);

  // Outputs
  close = output<void>();
  verify = output<VerifyFormData>();
  approve = output<ApprovalFormData>();
  dispute = output<DisputeFormData>();
  cancel = output<CancelFormData>();

  // Form state
  workflowForm = signal<FormGroup>(this.fb.group({}));

  // Computed properties
  itemsFormArray = computed(() => {
    const form = this.workflowForm();
    const itemsControl = form.get('items');
    return itemsControl as FormArray;
  });

  ngOnInit() {
    // Initialize form when inputs are available
    this.initializeForm();
  }

  private initializeForm(): void {
    const type = this.workflowType();
    let form: FormGroup;

    switch (type) {
      case 'verify':
        form = this.createVerifyForm();
        break;
      case 'approve':
        form = this.createApproveForm();
        break;
      case 'dispute':
        form = this.createDisputeForm();
        break;
      case 'cancel':
        form = this.createCancelForm();
        break;
      default:
        form = this.fb.group({});
    }

    this.workflowForm.set(form);
  }

  private createVerifyForm(): FormGroup {
    const items = this.facture()?.items || [];
    const itemForms = items.map(item => this.fb.group({
      itemId: [item.id, Validators.required],
      receivedQuantity: [item.quantity, [Validators.required, Validators.min(0)]],
      acceptedQuantity: [item.quantity, [Validators.required, Validators.min(0)]],
      verificationNotes: [''],
      isVerified: [false]
    }));

    return this.fb.group({
      factureId: [this.facture().id, Validators.required],
      verificationNotes: [''],
      items: this.fb.array(itemForms, Validators.required)
    });
  }

  private createApproveForm(): FormGroup {
    return this.fb.group({
      approvalNotes: ['']
    });
  }

  private createDisputeForm(): FormGroup {
    return this.fb.group({
      factureId: [this.facture().id, Validators.required],
      disputeReason: ['', [Validators.required, Validators.minLength(10)]],
      additionalNotes: [''],
      supportingDocuments: ['']
    });
  }

  private createCancelForm(): FormGroup {
    return this.fb.group({
      cancellationReason: ['', Validators.required]
    });
  }

  // Helper methods for template
  getModalTitle(): string {
    const titles = {
      verify: 'Verify Facture Items',
      approve: 'Approve Facture',
      dispute: 'Dispute Facture',
      cancel: 'Cancel Facture'
    };
    return titles[this.workflowType()];
  }

  getSubmitButtonText(): string {
    const texts = {
      verify: 'Verify Items',
      approve: 'Approve Facture',
      dispute: 'Submit Dispute',
      cancel: 'Cancel Facture'
    };
    return texts[this.workflowType()];
  }

  getSubmitButtonClass(): string {
    const classes = {
      verify: 'btn-primary',
      approve: 'btn-success',
      dispute: 'btn-error',
      cancel: 'btn-error'
    };
    return classes[this.workflowType()];
  }

  getItemDisplayName(index: number): string {
    const item = this.facture()?.items?.[index];
    return item?.supplierItemDescription || item?.itemDescription || `Item ${index + 1}`;
  }

  getItemOrderedQuantity(index: number): number {
    const item = this.facture()?.items?.[index];
    return item?.quantity || 0;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.workflowForm().get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // Event handlers
  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (this.workflowForm().invalid) {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.workflowForm());
      return;
    }

    const formValue = this.workflowForm().value;
    const type = this.workflowType();

    switch (type) {
      case 'verify':
        this.verify.emit(formValue as VerifyFormData);
        break;
      case 'approve':
        this.approve.emit(formValue as ApprovalFormData);
        break;
      case 'dispute':
        this.dispute.emit(formValue as DisputeFormData);
        break;
      case 'cancel':
        this.cancel.emit(formValue as CancelFormData);
        break;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      } else {
        control?.markAsTouched();
      }
    });
  }
}