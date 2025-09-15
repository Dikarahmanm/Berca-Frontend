import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { InventoryTransferService } from '../../../core/services/inventory-transfer.service';
import {
  InventoryTransferDto,
  TransferStatus,
  TransferPriority,
  TransferItemDto,
  TransferStatusHistory
} from '../../../core/models/inventory-transfer.models';

@Component({
  selector: 'app-transfer-detail-dialog',
  standalone: true,
  imports: [
    CommonModule
  ],
  template: `
    <div class="transfer-detail-container">
      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-container">
        <div class="loading-spinner"></div>
        <p class="text-secondary mt-2">Loading transfer details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error() && !loading()" class="error-container">
        <div class="error-message">
          <h4>Error Loading Transfer</h4>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" (click)="loadTransferDetail()">Try Again</button>
        </div>
      </div>

      <!-- Transfer Detail -->
      <div *ngIf="transfer() && !loading()" class="transfer-detail">
        <!-- Header -->
        <div class="detail-header">
          <div class="header-left">
            <button class="btn btn-outline btn-sm" (click)="onClose()">
              ← Close
            </button>
            <div class="header-info">
              <h1 class="transfer-title">{{ transfer()!.transferNumber }}</h1>
              <p class="transfer-subtitle">
                {{ transfer()!.sourceBranchName }} → {{ transfer()!.destinationBranchName }}
              </p>
            </div>
          </div>

          <div class="header-right">
            <div class="status-badges">
              <span class="status-badge" [class]="getStatusClass(transfer()!.status)">
                {{ getStatusDisplayText(transfer()!.status) }}
              </span>
              <span class="priority-badge" [class]="getPriorityClass(transfer()!.priority)">
                {{ getPriorityDisplayText(transfer()!.priority) }}
              </span>
              @if (isOverdue()) {
                <span class="overdue-badge">
                  Overdue
                </span>
              }
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <button class="btn btn-secondary btn-sm" (click)="onPrint()">
                Print Transfer
              </button>
            </div>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="info-section">
          <h3 class="section-title">Transfer Summary</h3>
          <div class="financial-grid">
            <div class="financial-column">
              <div class="financial-item">
                <label>Total Items</label>
                <div class="value">{{ transfer()!.items?.length || 0 }} items</div>
              </div>
              <div class="financial-item">
                <label>Total Quantity</label>
                <div class="value">{{ getTotalRequestedQuantity() }}</div>
              </div>
            </div>
            <div class="financial-column">
              <div class="financial-item">
                <label>Total Cost</label>
                <div class="value text-primary">{{ formatCurrency(transfer()!.totalCost) }}</div>
              </div>
              <div class="financial-item">
                <label>Priority</label>
                <div class="value">
                  <span class="priority-badge" [class]="getPriorityClass(transfer()!.priority)">
                    {{ getPriorityDisplayText(transfer()!.priority) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Workflow Timeline -->
        <div class="info-section">
          <h3 class="section-title">Workflow Timeline</h3>
          <div class="timeline">
            <div class="timeline-item completed">
              <div class="timeline-icon">📥</div>
              <div class="timeline-content">
                <div class="timeline-title">Transfer Requested</div>
                <div class="timeline-meta">
                  {{ formatDateTime(transfer()!.requestedAt) }} by {{ transfer()!.requestedByName }}
                </div>
              </div>
            </div>

            <div class="timeline-item"
                 [class.completed]="isApprovalCompleted()"
                 [class.current]="isApprovalCurrent()">
              <div class="timeline-icon">✅</div>
              <div class="timeline-content">
                <div class="timeline-title">Transfer Approval</div>
                <div class="timeline-meta" *ngIf="transfer()!.approvedAt">
                  {{ formatDateTime(transfer()!.approvedAt!) }} by {{ transfer()!.approvedByName }}
                </div>
                <div class="timeline-meta" *ngIf="isApprovalCurrent() && !transfer()!.approvedAt">
                  Pending approval
                </div>
              </div>
            </div>

            <div class="timeline-item"
                 [class.completed]="isShippingCompleted()"
                 [class.current]="isShippingCurrent()">
              <div class="timeline-icon">🚚</div>
              <div class="timeline-content">
                <div class="timeline-title">In Transit</div>
                <div class="timeline-meta" *ngIf="transfer()!.shippedAt">
                  {{ formatDateTime(transfer()!.shippedAt!) }} by {{ transfer()!.shippedByName }}
                </div>
                <div class="timeline-meta" *ngIf="isShippingCurrent() && !transfer()!.shippedAt">
                  Ready for shipping
                </div>
              </div>
            </div>

            <div class="timeline-item"
                 [class.completed]="isReceiptCompleted()"
                 [class.current]="isReceiptCurrent()">
              <div class="timeline-icon">📦</div>
              <div class="timeline-content">
                <div class="timeline-title">Delivery Complete</div>
                <div class="timeline-meta" *ngIf="transfer()!.receivedAt">
                  {{ formatDateTime(transfer()!.receivedAt!) }} by {{ transfer()!.receivedByName }}
                </div>
                <div class="timeline-meta" *ngIf="isReceiptCurrent() && !transfer()!.receivedAt">
                  Awaiting delivery confirmation
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Transfer Items -->
        <div class="info-section">
          <h3 class="section-title">Transfer Items ({{ transfer()!.items?.length || 0 }})</h3>

          <!-- Desktop Table View -->
          <div class="desktop-view">
            <div class="items-table">
              <table class="w-full">
                <thead>
                  <tr class="table-header">
                    <th class="text-left">Product</th>
                    <th class="text-center">Requested</th>
                    <th class="text-center">Approved</th>
                    <th class="text-center">Shipped</th>
                    <th class="text-center">Received</th>
                    <th class="text-right">Unit Cost</th>
                    <th class="text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of transfer()!.items; trackBy: trackByItem" class="table-row">
                    <td class="item-description">
                      <div class="item-name">{{ item.productName }}</div>
                      <div class="item-code">Code: {{ item.productCode }}</div>
                      <div *ngIf="item.notes" class="item-notes">{{ item.notes }}</div>
                    </td>

                    <td class="text-center">
                      <div class="quantity-value">{{ item.requestedQuantity }}</div>
                    </td>

                    <td class="text-center">
                      <div class="quantity-value" [class.has-approved]="item.approvedQuantity">
                        {{ item.approvedQuantity || '-' }}
                      </div>
                    </td>

                    <td class="text-center">
                      <div class="quantity-value" [class.has-shipped]="item.shippedQuantity">
                        {{ item.shippedQuantity || '-' }}
                      </div>
                    </td>

                    <td class="text-center">
                      <div class="quantity-value" [class.has-received]="item.receivedQuantity">
                        {{ item.receivedQuantity || '-' }}
                      </div>
                    </td>

                    <td class="text-right">{{ formatCurrency(item.unitCost) }}</td>

                    <td class="text-right font-semibold">{{ formatCurrency(item.totalCost) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Mobile Card View -->
          <div class="mobile-view">
            <div *ngFor="let item of transfer()!.items; trackBy: trackByItem" class="item-card">
              <div class="item-header">
                <div class="item-title">{{ item.productName }}</div>
                <div class="item-code">{{ item.productCode }}</div>
              </div>

              <div class="item-details">
                <div class="detail-row">
                  <span>Requested:</span>
                  <span>{{ item.requestedQuantity }}</span>
                </div>

                <div class="detail-row" *ngIf="item.approvedQuantity">
                  <span>Approved:</span>
                  <span class="text-success">{{ item.approvedQuantity }}</span>
                </div>

                <div class="detail-row" *ngIf="item.shippedQuantity">
                  <span>Shipped:</span>
                  <span class="text-warning">{{ item.shippedQuantity }}</span>
                </div>

                <div class="detail-row" *ngIf="item.receivedQuantity">
                  <span>Received:</span>
                  <span class="text-info">{{ item.receivedQuantity }}</span>
                </div>

                <div class="detail-row">
                  <span>Unit Cost:</span>
                  <span>{{ formatCurrency(item.unitCost) }}</span>
                </div>

                <div class="detail-row">
                  <span>Total Cost:</span>
                  <span class="font-semibold">{{ formatCurrency(item.totalCost) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        @if (transfer()!.notes) {
          <!-- Notes Section -->
          <div class="info-section">
            <h3 class="section-title">Notes</h3>
            <div class="notes-content">
              {{ transfer()!.notes }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./transfer-detail-dialog.component.scss']
})
export class TransferDetailDialogComponent implements OnInit {
  transfer = signal<InventoryTransferDto | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  itemsDisplayedColumns = ['product', 'quantities', 'cost', 'notes'];

  constructor(
    private dialogRef: MatDialogRef<TransferDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { transferId: number },
    private transferService: InventoryTransferService
  ) {}

  ngOnInit(): void {
    this.loadTransferDetail();
  }

  public loadTransferDetail(): void {
    if (!this.data.transferId) return;

    this.loading.set(true);
    this.error.set(null);

    this.transferService.getTransferById(this.data.transferId)
      .subscribe({
        next: (transfer) => {
          this.transfer.set(transfer);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Failed to load transfer detail:', error);
          this.error.set('Gagal memuat detail transfer');
          this.loading.set(false);
        }
      });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onPrint(): void {
    if (this.transfer()) {
      this.transferService.printTransfer(this.transfer()!.id);
    }
  }

  // Helper methods
  getTotalRequestedQuantity(): number {
    return this.transfer()?.items?.reduce((sum, item) => sum + item.requestedQuantity, 0) || 0;
  }

  getTotalApprovedQuantity(): number {
    return this.transfer()?.items?.reduce((sum, item) => sum + (item.approvedQuantity || 0), 0) || 0;
  }

  getStatusClass(status: TransferStatus): string {
    const statusClasses = {
      [TransferStatus.Pending]: 'status-pending',
      [TransferStatus.Approved]: 'status-approved',
      [TransferStatus.Rejected]: 'status-rejected',
      [TransferStatus.InTransit]: 'status-in-transit',
      [TransferStatus.Delivered]: 'status-delivered',
      [TransferStatus.Completed]: 'status-completed',
      [TransferStatus.Cancelled]: 'status-cancelled'
    };
    return statusClasses[status] || 'status-pending';
  }

  getPriorityClass(priority: TransferPriority): string {
    const priorityClasses = {
      [TransferPriority.Low]: 'priority-low',
      [TransferPriority.Normal]: 'priority-normal',
      [TransferPriority.High]: 'priority-high',
      [TransferPriority.Emergency]: 'priority-emergency'
    };
    return priorityClasses[priority] || 'priority-normal';
  }

  getStatusDisplayText(status: TransferStatus): string {
    return this.transferService.getStatusDisplayText(status);
  }

  getPriorityDisplayText(priority: TransferPriority): string {
    return this.transferService.getPriorityDisplayText(priority);
  }

  isOverdue(): boolean {
    const transfer = this.transfer();
    if (!transfer?.estimatedDeliveryDate) return false;
    const now = new Date();
    const estimated = new Date(transfer.estimatedDeliveryDate);
    return now > estimated && transfer.status !== TransferStatus.Completed;
  }

  // Timeline status helpers
  isApprovalCompleted(): boolean {
    const status = this.transfer()?.status;
    return status === TransferStatus.Approved ||
           status === TransferStatus.InTransit ||
           status === TransferStatus.Delivered ||
           status === TransferStatus.Completed;
  }

  isApprovalCurrent(): boolean {
    return this.transfer()?.status === TransferStatus.Pending;
  }

  isShippingCompleted(): boolean {
    const status = this.transfer()?.status;
    return status === TransferStatus.InTransit ||
           status === TransferStatus.Delivered ||
           status === TransferStatus.Completed;
  }

  isShippingCurrent(): boolean {
    return this.transfer()?.status === TransferStatus.Approved;
  }

  isReceiptCompleted(): boolean {
    return this.transfer()?.status === TransferStatus.Completed;
  }

  isReceiptCurrent(): boolean {
    const status = this.transfer()?.status;
    return status === TransferStatus.InTransit || status === TransferStatus.Delivered;
  }

  trackByItem(index: number, item: TransferItemDto): number {
    return item.id;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
}