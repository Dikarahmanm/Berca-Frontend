// transfer-workflow-confirmation.component.ts
import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { InventoryTransferDto, TransferItemDto } from '../../../core/models/inventory-transfer.models';

export interface WorkflowConfirmationData {
  action: 'approve' | 'reject' | 'ship' | 'receive' | 'cancel';
  transfer: InventoryTransferDto;
}

@Component({
  selector: 'app-transfer-workflow-confirmation',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="workflow-confirmation-modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ getActionTitle() }}</h2>
        <div class="transfer-info">
          <span class="transfer-number">{{ data.transfer.transferNumber }}</span>
          <span class="transfer-route">{{ data.transfer.sourceBranchName }} → {{ data.transfer.destinationBranchName }}</span>
        </div>
      </div>

      <div class="modal-body">
        <!-- Approval Confirmation -->
        @if (data.action === 'approve') {
          <div class="confirmation-content">
            <div class="warning-box">
              <h4>📋 Transfer Details</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Total Items:</label>
                  <span>{{ data.transfer.items.length }} products</span>
                </div>
                <div class="detail-item">
                  <label>Total Cost:</label>
                  <span>{{ formatCurrency(data.transfer.totalCost) }}</span>
                </div>
                <div class="detail-item">
                  <label>Expected Delivery:</label>
                  <span>{{ formatDate(data.transfer.estimatedDeliveryDate) }}</span>
                </div>
                <div class="detail-item">
                  <label>Priority:</label>
                  <span class="priority-badge">{{ getPriorityText(data.transfer.priority) }}</span>
                </div>
              </div>
            </div>

            <div class="items-summary">
              <h4>📦 Items to Transfer</h4>
              <div class="items-list">
                @for (item of data.transfer.items; track item.id) {
                  <div class="item-row">
                    <span class="item-name">{{ item.productName }}</span>
                    <span class="item-qty">{{ item.requestedQuantity }} {{ item.unit || 'pcs' }}</span>
                    <span class="item-cost">{{ formatCurrency(item.totalCost) }}</span>
                  </div>
                }
              </div>
            </div>

            <form [formGroup]="approvalForm">
              <div class="form-group">
                <label>Approval Notes</label>
                <textarea formControlName="notes" placeholder="Add any notes about this approval..." rows="3"></textarea>
              </div>
            </form>
          </div>
        }

        <!-- Shipping Confirmation -->
        @if (data.action === 'ship') {
          <div class="confirmation-content">
            <div class="warning-box">
              <h4>🚚 Shipping Information</h4>
              <p>Transfer akan dikirim ke {{ data.transfer.destinationBranchName }}</p>
            </div>

            <form [formGroup]="shippingForm">
              <div class="form-group">
                <label>Courier Service *</label>
                <input type="text" formControlName="courierName" placeholder="e.g., JNE, TIKI, GoSend">
              </div>

              <div class="form-group">
                <label>Driver Name *</label>
                <input type="text" formControlName="driverName" placeholder="Enter driver full name">
              </div>

              <div class="form-group">
                <label>Driver Phone *</label>
                <input type="tel" formControlName="driverPhone" placeholder="e.g., 081234567890">
              </div>

              <div class="form-group">
                <label>Vehicle/Transport Info</label>
                <input type="text" formControlName="vehicleInfo" placeholder="License plate, vehicle type, etc.">
              </div>

              <div class="form-group">
                <label>Tracking Number *</label>
                <input type="text" formControlName="trackingNumber" placeholder="TRK-TRANSFER-XXXX">
                <small class="form-text">Auto-generated tracking number. You can edit if needed. Format: TRK-XXXX-XXXX</small>
                <div class="validation-error" *ngIf="shippingForm.get('trackingNumber')?.invalid && shippingForm.get('trackingNumber')?.touched">
                  Please enter a valid tracking number
                </div>
              </div>

              <div class="form-group">
                <label>Shipping Notes</label>
                <textarea formControlName="notes" placeholder="Special instructions, delivery notes..." rows="3"></textarea>
              </div>

              <div class="form-group">
                <label>Expected Delivery Date</label>
                <input type="date" formControlName="deliveryDate" [value]="getDefaultDeliveryDate()">
              </div>
            </form>
          </div>
        }

        <!-- Receive Confirmation -->
        @if (data.action === 'receive') {
          <div class="confirmation-content">
            <div class="warning-box">
              <h4>📦 Delivery Confirmation</h4>
              <p>Verifikasi items yang diterima:</p>
            </div>

            <form [formGroup]="receiveForm">
              <div class="items-verification">
                <h4>✅ Verify Received Items</h4>
                @for (item of data.transfer.items; track item.id; let i = $index) {
                  <div class="verification-item">
                    <div class="item-header">
                      <span class="item-name">{{ item.productName }}</span>
                      <span class="expected-qty">Expected: {{ item.requestedQuantity }} {{ item.unit || 'pcs' }}</span>
                    </div>

                    <div class="verification-controls">
                      <div class="qty-breakdown">
                        <div class="qty-input">
                          <label>Actually Received (Good):</label>
                          <input
                            type="number"
                            [formControlName]="'item_' + i + '_received'"
                            [min]="0"
                            [max]="item.requestedQuantity"
                            (input)="updateTotalForItem(i)"
                            placeholder="0">
                        </div>

                        <div class="qty-input">
                          <label>Damaged (Unusable):</label>
                          <input
                            type="number"
                            [formControlName]="'item_' + i + '_damaged'"
                            [min]="0"
                            [max]="item.requestedQuantity"
                            (input)="updateTotalForItem(i)"
                            placeholder="0">
                        </div>

                        <div class="qty-input">
                          <label>Lost/Missing:</label>
                          <input
                            type="number"
                            [formControlName]="'item_' + i + '_lost'"
                            [min]="0"
                            [max]="item.requestedQuantity"
                            (input)="updateTotalForItem(i)"
                            placeholder="0">
                        </div>
                      </div>

                      <div class="qty-summary">
                        <div class="summary-row">
                          <span>Shipped: {{ item.requestedQuantity }}</span>
                          <span class="total-accounted" [class.valid]="isItemTotalValid(i)" [class.invalid]="!isItemTotalValid(i)">
                            Accounted: {{ getItemTotal(i) }}
                          </span>
                        </div>
                        <div class="validation-message" *ngIf="!isItemTotalValid(i)">
                          ⚠️ Total must equal shipped quantity ({{ item.requestedQuantity }})
                        </div>
                      </div>
                    </div>

                    <div class="item-notes">
                      <input
                        type="text"
                        [formControlName]="'item_' + i + '_notes'"
                        placeholder="Notes about this item (optional)">
                    </div>
                  </div>
                }
              </div>

              <div class="form-group">
                <label>Overall Condition</label>
                <div class="radio-group">
                  <label><input type="radio" formControlName="overallCondition" value="excellent"> Excellent</label>
                  <label><input type="radio" formControlName="overallCondition" value="good" checked> Good</label>
                  <label><input type="radio" formControlName="overallCondition" value="damaged"> Some Damage</label>
                </div>
              </div>

              <div class="form-group">
                <label>Receiver Notes</label>
                <textarea formControlName="notes" placeholder="Any issues, damages, or special notes..." rows="3"></textarea>
              </div>

              <div class="final-confirmation">
                <label>
                  <input type="checkbox" formControlName="finalConfirm" required>
                  <strong>I confirm that I have received and verified all items listed above</strong>
                </label>
              </div>
            </form>
          </div>
        }

        <!-- Reject/Cancel Confirmation -->
        @if (data.action === 'reject' || data.action === 'cancel') {
          <div class="confirmation-content">
            <div class="warning-box danger">
              <h4>⚠️ {{ data.action === 'reject' ? 'Reject' : 'Cancel' }} Transfer</h4>
              <p>Transfer akan {{ data.action === 'reject' ? 'ditolak' : 'dibatalkan' }}. Tindakan ini tidak dapat diurungkan.</p>
            </div>

            <form [formGroup]="rejectForm">
              <div class="form-group">
                <label>Reason for {{ data.action === 'reject' ? 'Rejection' : 'Cancellation' }} *</label>
                <textarea
                  formControlName="reason"
                  placeholder="Please provide a clear reason..."
                  rows="4"
                  required></textarea>
              </div>
            </form>
          </div>
        }
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-outline" (click)="onCancel()">Cancel</button>
        <button
          type="button"
          [class]="getConfirmButtonClass()"
          (click)="onConfirm()"
          [disabled]="!isFormValid()">
          {{ getConfirmButtonText() }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .workflow-confirmation-modal {
      width: 100%;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #333;
    }

    .transfer-info {
      display: flex;
      gap: 12px;
      font-size: 14px;
      color: #666;
    }

    .transfer-number {
      font-weight: 500;
      color: #2563eb;
    }

    .modal-body {
      padding: 24px;
    }

    .warning-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .warning-box.danger {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .warning-box h4 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-item label {
      font-weight: 500;
      color: #666;
    }

    .priority-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      background: #e0f2fe;
      color: #0277bd;
    }

    .items-summary {
      margin-bottom: 20px;
    }

    .items-list {
      max-height: 150px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }

    .item-row:last-child {
      border-bottom: none;
    }

    .item-name {
      font-weight: 500;
      flex: 1;
    }

    .item-qty, .item-cost {
      color: #666;
      margin-left: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #374151;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .items-verification {
      margin-bottom: 20px;
    }

    .items-verification h4 {
      color: #16a34a;
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 600;
    }

    .verification-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      transition: border-color 0.2s;
    }

    .verification-item:hover {
      border-color: #cbd5e1;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    .item-header .item-name {
      font-weight: 600;
      color: #1e293b;
      font-size: 15px;
    }

    .item-header .expected-qty {
      background: #f1f5f9;
      color: #475569;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
    }

    .verification-controls {
      display: flex;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 12px;
      padding: 12px 0;
    }

    .qty-breakdown {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      flex: 1;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .qty-summary {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 180px;
      padding: 12px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
    }

    .total-accounted.valid {
      color: #16a34a;
    }

    .total-accounted.invalid {
      color: #dc2626;
      font-weight: 600;
    }

    .validation-message {
      font-size: 12px;
      color: #dc2626;
      font-weight: 500;
      text-align: center;
      padding: 4px 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 4px;
    }

    .qty-input {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 120px;
    }

    .qty-input label {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0;
    }

    .qty-input input {
      width: 80px;
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 14px;
      text-align: center;
      font-weight: 500;
    }

    .qty-input input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    .condition-check {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .condition-check label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0;
      cursor: pointer;
    }

    .condition-check input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: #16a34a;
      margin: 0;
    }

    .item-notes {
      margin-top: 8px;
    }

    .item-notes input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 13px;
      color: #6b7280;
    }

    .item-notes input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    .item-notes input::placeholder {
      color: #9ca3af;
      font-style: italic;
    }

    .radio-group {
      display: flex;
      gap: 20px;
      margin-top: 8px;
    }

    .radio-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 0;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .radio-group label:hover {
      background-color: #f9fafb;
      border-color: #d1d5db;
    }

    .radio-group input[type="radio"] {
      width: 16px;
      height: 16px;
      accent-color: #2563eb;
      margin: 0;
    }

    .radio-group input[type="radio"]:checked + label {
      background-color: #eff6ff;
      border-color: #2563eb;
      color: #1d4ed8;
    }

    .final-confirmation {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0284c7;
      border-radius: 8px;
      padding: 16px;
      margin-top: 20px;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.1);
    }

    .final-confirmation label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 0;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      color: #0c4a6e;
      line-height: 1.4;
    }

    .final-confirmation input[type="checkbox"] {
      width: 20px;
      height: 20px;
      accent-color: #0284c7;
      margin: 0;
      margin-top: 2px;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-outline {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .btn-outline:hover {
      background: #f9fafb;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover {
      background: #059669;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-text {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
      display: block;
    }

    .validation-error {
      font-size: 12px;
      color: #dc2626;
      margin-top: 4px;
      display: block;
    }

    .form-group input:invalid {
      border-color: #dc2626;
      box-shadow: 0 0 0 1px #dc262620;
    }

    .form-group input:valid {
      border-color: #10b981;
    }
  `]
})
export class TransferWorkflowConfirmationComponent {
  approvalForm!: FormGroup;
  shippingForm!: FormGroup;
  receiveForm!: FormGroup;
  rejectForm!: FormGroup;

  // Store tracking number to prevent constant regeneration
  trackingNumber = signal<string>('');

  constructor(
    private dialogRef: MatDialogRef<TransferWorkflowConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkflowConfirmationData,
    private fb: FormBuilder
  ) {
    // Generate tracking number once and store it
    this.trackingNumber.set(this.generateTrackingNumber());
    this.initForms();
  }

  initForms(): void {
    // Approval form
    this.approvalForm = this.fb.group({
      notes: ['']
    });

    // Shipping form
    this.shippingForm = this.fb.group({
      courierName: ['', Validators.required],
      driverName: ['', Validators.required],
      driverPhone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
      vehicleInfo: [''],
      trackingNumber: [this.trackingNumber(), [Validators.required, this.trackingNumberValidator]],
      notes: [''],
      deliveryDate: [this.getDefaultDeliveryDate()]
    });

    // Receive form - dynamic based on items
    const receiveControls: any = {
      overallCondition: ['good'],
      notes: [''],
      finalConfirm: [false, Validators.requiredTrue]
    };

    // Add controls for each item - received, damaged, lost quantities
    this.data.transfer.items.forEach((item, index) => {
      receiveControls['item_' + index + '_received'] = [item.requestedQuantity, [Validators.required, Validators.min(0)]];
      receiveControls['item_' + index + '_damaged'] = [0, [Validators.min(0)]];
      receiveControls['item_' + index + '_lost'] = [0, [Validators.min(0)]];
      receiveControls['item_' + index + '_notes'] = [''];
    });

    this.receiveForm = this.fb.group(receiveControls);

    // Reject/Cancel form
    this.rejectForm = this.fb.group({
      reason: ['', Validators.required]
    });
  }

  getActionTitle(): string {
    switch (this.data.action) {
      case 'approve': return 'Approve Transfer';
      case 'reject': return 'Reject Transfer';
      case 'ship': return 'Ship Transfer';
      case 'receive': return 'Confirm Delivery';
      case 'cancel': return 'Cancel Transfer';
      default: return 'Confirm Action';
    }
  }

  getConfirmButtonText(): string {
    switch (this.data.action) {
      case 'approve': return 'Approve Transfer';
      case 'reject': return 'Reject Transfer';
      case 'ship': return 'Ship Transfer';
      case 'receive': return 'Confirm Delivery';
      case 'cancel': return 'Cancel Transfer';
      default: return 'Confirm';
    }
  }

  getConfirmButtonClass(): string {
    switch (this.data.action) {
      case 'approve': return 'btn btn-success';
      case 'reject': return 'btn btn-danger';
      case 'ship': return 'btn btn-primary';
      case 'receive': return 'btn btn-success';
      case 'cancel': return 'btn btn-danger';
      default: return 'btn btn-primary';
    }
  }

  isFormValid(): boolean {
    switch (this.data.action) {
      case 'approve': return this.approvalForm.valid;
      case 'reject': return this.rejectForm.valid;
      case 'ship': return this.shippingForm.valid;
      case 'receive': return this.receiveForm.valid;
      case 'cancel': return this.rejectForm.valid;
      default: return true;
    }
  }

  generateTrackingNumber(): string {
    return `TRK-${this.data.transfer.transferNumber}-${Date.now().toString().slice(-4)}`;
  }

  // Custom validator for tracking number format
  trackingNumberValidator(control: any) {
    if (!control.value) return null;

    // Basic format validation: should start with letters/numbers and contain hyphens/numbers
    const trackingPattern = /^[A-Z0-9]+-[A-Z0-9-]+$/i;

    if (!trackingPattern.test(control.value)) {
      return { invalidFormat: true };
    }

    // Length validation (minimum 8 characters)
    if (control.value.length < 8) {
      return { tooShort: true };
    }

    return null;
  }

  getDefaultDeliveryDate(): string {
    if (this.data.transfer.estimatedDeliveryDate) {
      return new Date(this.data.transfer.estimatedDeliveryDate).toISOString().split('T')[0];
    }
    // Default to 3 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return defaultDate.toISOString().split('T')[0];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('id-ID');
  }

  getPriorityText(priority: number): string {
    switch (priority) {
      case 0: return 'Low';
      case 1: return 'Normal';
      case 2: return 'High';
      case 3: return 'Emergency';
      default: return 'Normal';
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    if (!this.isFormValid()) return;

    let result: any = { action: this.data.action };

    switch (this.data.action) {
      case 'approve':
        result = {
          ...result,
          approved: true,
          approvalNotes: this.approvalForm.value.notes || 'Transfer approved',
          managerOverride: false
        };
        break;

      case 'reject':
        result = {
          ...result,
          approved: false,
          approvalNotes: this.rejectForm.value.reason,
          managerOverride: false
        };
        break;

      case 'ship':
        result = {
          ...result,
          courierName: this.shippingForm.value.courierName,
          driverName: this.shippingForm.value.driverName,
          driverPhone: this.shippingForm.value.driverPhone,
          vehicleInfo: this.shippingForm.value.vehicleInfo,
          trackingNumber: this.shippingForm.value.trackingNumber,
          shipmentNotes: this.shippingForm.value.notes,
          estimatedDeliveryDate: this.shippingForm.value.deliveryDate
        };
        break;

      case 'receive':
        const itemReceipts = this.data.transfer.items.map((item, index) => ({
          transferItemId: item.id,
          actualReceivedQuantity: this.receiveForm.value['item_' + index + '_received'] || 0,
          damageQuantity: this.receiveForm.value['item_' + index + '_damaged'] || 0,
          lostQuantity: this.receiveForm.value['item_' + index + '_lost'] || 0,
          receivedQuantity: this.receiveForm.value['item_' + index + '_received'] || 0,
          notes: this.receiveForm.value['item_' + index + '_notes'] || ''
        }));

        result = {
          ...result,
          itemReceipts,
          overallCondition: this.receiveForm.value.overallCondition,
          receiptNotes: this.receiveForm.value.notes,
          actualDeliveryDate: new Date().toISOString()
        };
        break;

      case 'cancel':
        result = {
          ...result,
          cancelReason: this.rejectForm.value.reason
        };
        break;
    }

    this.dialogRef.close({
      confirmed: true,
      formData: result
    });
  }

  // Helper methods for damage/loss quantity management
  updateTotalForItem(index: number): void {
    // Trigger form validation to update the UI
    this.receiveForm.updateValueAndValidity();
  }

  isItemTotalValid(index: number): boolean {
    const item = this.data.transfer.items[index];
    const received = this.receiveForm.get('item_' + index + '_received')?.value || 0;
    const damaged = this.receiveForm.get('item_' + index + '_damaged')?.value || 0;
    const lost = this.receiveForm.get('item_' + index + '_lost')?.value || 0;

    const total = received + damaged + lost;
    return total === item.requestedQuantity;
  }

  getItemTotal(index: number): number {
    const received = this.receiveForm.get('item_' + index + '_received')?.value || 0;
    const damaged = this.receiveForm.get('item_' + index + '_damaged')?.value || 0;
    const lost = this.receiveForm.get('item_' + index + '_lost')?.value || 0;

    return received + damaged + lost;
  }
}