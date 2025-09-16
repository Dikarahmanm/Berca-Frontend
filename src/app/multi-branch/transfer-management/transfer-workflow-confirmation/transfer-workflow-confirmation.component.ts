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
                <label>Courier/Driver Name *</label>
                <input type="text" formControlName="courierName" placeholder="Enter courier or driver name">
              </div>

              <div class="form-group">
                <label>Vehicle/Transport Info</label>
                <input type="text" formControlName="vehicleInfo" placeholder="License plate, vehicle type, etc.">
              </div>

              <div class="form-group">
                <label>Tracking Number</label>
                <input type="text" formControlName="trackingNumber" [value]="generateTrackingNumber()" readonly>
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
                      <div class="qty-input">
                        <label>Received Qty:</label>
                        <input
                          type="number"
                          [formControlName]="'item_' + i + '_qty'"
                          [value]="item.requestedQuantity"
                          min="0"
                          [max]="item.requestedQuantity">
                      </div>

                      <div class="condition-check">
                        <label>
                          <input type="checkbox" [formControlName]="'item_' + i + '_condition'" checked>
                          Good condition
                        </label>
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

    .verification-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .verification-controls {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 10px;
    }

    .qty-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .qty-input input {
      width: 80px;
    }

    .condition-check label {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .radio-group {
      display: flex;
      gap: 16px;
    }

    .radio-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 0;
    }

    .final-confirmation {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 12px;
      margin-top: 16px;
    }

    .final-confirmation label {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 0;
      cursor: pointer;
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
  `]
})
export class TransferWorkflowConfirmationComponent {
  approvalForm: FormGroup;
  shippingForm: FormGroup;
  receiveForm: FormGroup;
  rejectForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<TransferWorkflowConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkflowConfirmationData,
    private fb: FormBuilder
  ) {
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
      vehicleInfo: [''],
      trackingNumber: [this.generateTrackingNumber()],
      notes: [''],
      deliveryDate: [this.getDefaultDeliveryDate()]
    });

    // Receive form - dynamic based on items
    const receiveControls: any = {
      overallCondition: ['good'],
      notes: [''],
      finalConfirm: [false, Validators.requiredTrue]
    };

    // Add controls for each item
    this.data.transfer.items.forEach((item, index) => {
      receiveControls['item_' + index + '_qty'] = [item.requestedQuantity, [Validators.required, Validators.min(0)]];
      receiveControls['item_' + index + '_condition'] = [true];
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

  formatDate(date: string | Date | null): string {
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
          vehicleInfo: this.shippingForm.value.vehicleInfo,
          trackingNumber: this.shippingForm.value.trackingNumber,
          shipmentNotes: this.shippingForm.value.notes,
          estimatedDeliveryDate: this.shippingForm.value.deliveryDate
        };
        break;

      case 'receive':
        const itemReceipts = this.data.transfer.items.map((item, index) => ({
          transferItemId: item.id,
          receivedQuantity: this.receiveForm.value['item_' + index + '_qty'],
          condition: this.receiveForm.value['item_' + index + '_condition'] ? 'good' : 'damaged',
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

    this.dialogRef.close(result);
  }
}