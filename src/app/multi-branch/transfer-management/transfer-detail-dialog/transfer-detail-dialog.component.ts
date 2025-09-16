import { Component, Inject, OnInit, Optional, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { InventoryTransferService } from '../../../core/services/inventory-transfer.service';
import {
  InventoryTransferDto,
  TransferStatus,
  TransferPriority,
  TransferItemDto,
  TransferStatusHistory,
  TransferApprovalRequestDto,
  TransferItemApprovalDto,
  TransferShipmentRequestDto,
  TransferReceiptRequestDto
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

            <!-- Action Buttons (Dynamic like Facture Management) -->
            <div class="action-buttons">
              <!-- Approve button for Pending transfers -->
              @if (transfer()?.canApprove) {
                <button class="btn btn-success btn-sm" (click)="onApprove()" [disabled]="loading()">
                  @if (loading()) {
                    <span class="loading-spinner" style="width: 12px; height: 12px; margin-right: 4px;"></span>
                  }
                  ✅ Approve Transfer
                </button>
              }

              <!-- Reject button for Pending transfers -->
              @if (transfer()?.canReject) {
                <button class="btn btn-danger btn-sm" (click)="onReject()" [disabled]="loading()">
                  @if (loading()) {
                    <span class="loading-spinner" style="width: 12px; height: 12px; margin-right: 4px;"></span>
                  }
                  ❌ Reject Transfer
                </button>
              }

              <!-- Ship button for Approved transfers -->
              @if (transfer()?.canShip) {
                <button class="btn btn-primary btn-sm" (click)="onShip()" [disabled]="loading()">
                  @if (loading()) {
                    <span class="loading-spinner" style="width: 12px; height: 12px; margin-right: 4px;"></span>
                  }
                  🚚 Mark as Shipped
                </button>
              }

              <!-- Receive button for InTransit/Delivered transfers -->
              @if (transfer()?.canReceive) {
                <button class="btn btn-success btn-sm" (click)="onReceive()" [disabled]="loading()">
                  @if (loading()) {
                    <span class="loading-spinner" style="width: 12px; height: 12px; margin-right: 4px;"></span>
                  }
                  📦 Confirm Delivery
                </button>
              }

              <!-- Cancel button for cancellable transfers -->
              @if (transfer()?.canCancel) {
                <button class="btn btn-outline btn-sm" (click)="onCancel()" [disabled]="loading()">
                  @if (loading()) {
                    <span class="loading-spinner" style="width: 12px; height: 12px; margin-right: 4px;"></span>
                  }
                  🚫 Cancel Transfer
                </button>
              }

              <!-- Print button - always available -->
              <button class="btn btn-secondary btn-sm" (click)="onPrint()">
                🖨️ Print Transfer
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
                <div class="value">{{ transfer()!.items.length || 0 }} items</div>
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
          <h3 class="section-title">Transfer Items ({{ transfer()!.items.length || 0 }})</h3>

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

  // Input properties for page usage
  transferInput = input<InventoryTransferDto | null>(null, { alias: 'transfer' });
  showAsPage = input<boolean>(false);

  // Output event for transfer updates
  transferUpdated = output<InventoryTransferDto>();

  itemsDisplayedColumns = ['product', 'quantities', 'cost', 'notes'];

  // Expose enums for template use
  TransferStatus = TransferStatus;
  TransferPriority = TransferPriority;

  constructor(
    @Optional() private dialogRef: MatDialogRef<TransferDetailDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: { transferId: number } | null,
    private transferService: InventoryTransferService
  ) {}

  ngOnInit(): void {
    // Check if being used as page component with input transfer
    const inputTransfer = this.transferInput();
    if (inputTransfer) {
      this.transfer.set(inputTransfer);
    } else {
      // Used as modal dialog - load from transferId
      this.loadTransferDetail();
    }
  }

  public loadTransferDetail(): void {
    if (!this.data?.transferId) return;

    this.loading.set(true);
    this.error.set(null);

    this.transferService.getTransferById(this.data.transferId)
      .subscribe({
        next: (transfer: any) => {
          // Convert numeric status to string enum and map data structure
          const mappedTransfer = this.mapTransferStatus(transfer);
          this.transfer.set(mappedTransfer);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Failed to load transfer detail:', error);
          this.error.set('Gagal memuat detail transfer');
          this.loading.set(false);
        }
      });
  }

  private mapTransferStatus(transfer: any): InventoryTransferDto {
    console.log('🔍 Mapping status - Raw transfer.status:', transfer.status, 'Type:', typeof transfer.status);

    // Backend can return either number or string status - handle both
    let mappedStatus: TransferStatus;

    if (typeof transfer.status === 'string') {
      // Backend returns string enum values directly
      mappedStatus = transfer.status as TransferStatus;
      console.log('✅ Using string status directly:', mappedStatus);
    } else {
      // Backend returns numeric values - map them
      const statusMapping: Record<number, TransferStatus> = {
        0: TransferStatus.Pending,
        1: TransferStatus.Approved,
        2: TransferStatus.InTransit,
        3: TransferStatus.Completed,
        4: TransferStatus.Cancelled,
        5: TransferStatus.Rejected
      };
      mappedStatus = statusMapping[transfer.status as number] || TransferStatus.Pending;
      console.log('✅ Mapped numeric status:', transfer.status, '→', mappedStatus);
    }

    // Calculate permission flags based on status (like facture management)
    const permissionFlags = this.calculatePermissionFlags(mappedStatus);

    // Map items from transferItems and add proper structure
    const items = (transfer.transferItems || []).map((item: any) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      productBarcode: item.product.barcode,
      unit: item.product.unit,
      requestedQuantity: item.quantity,
      approvedQuantity: item.quantity, // Assuming approved same as requested for now
      shippedQuantity: item.quantity,
      receivedQuantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
      sourceStockBefore: item.sourceStockBefore,
      sourceStockAfter: item.sourceStockAfter,
      destinationStockBefore: item.destinationStockBefore,
      destinationStockAfter: item.destinationStockAfter,
      expiryDate: item.expiryDate,
      batchNumber: item.batchNumber,
      qualityNotes: item.qualityNotes,
      isExpired: item.isExpired,
      isNearExpiry: item.isNearExpiry
    }));

    return {
      ...transfer,
      status: mappedStatus,
      items: items,
      // Add permission flags (like facture management)
      canApprove: permissionFlags.canApprove,
      canReject: permissionFlags.canReject,
      canShip: permissionFlags.canShip,
      canReceive: permissionFlags.canReceive,
      canCancel: permissionFlags.canCancel,
      // Map other fields properly
      sourceBranchName: transfer.sourceBranch?.branchName || 'Unknown Branch',
      destinationBranchName: transfer.destinationBranch?.branchName || 'Unknown Branch',
      requestedByName: transfer.requestedBy?.username || 'Unknown User',
      approvedByName: transfer.approvedBy?.username || null,
      shippedByName: transfer.shippedBy?.username || null,
      receivedByName: transfer.receivedBy?.username || null,
      totalCost: transfer.totalValue || transfer.estimatedCost || 0,
      requestedAt: transfer.createdAt,
      notes: transfer.notes || transfer.requestReason || ''
    };
  }

  private calculatePermissionFlags(status: TransferStatus) {
    return {
      canApprove: status === TransferStatus.Pending,
      canReject: status === TransferStatus.Pending,
      canShip: status === TransferStatus.Approved,
      canReceive: status === TransferStatus.InTransit,  // ✅ Fixed: Only InTransit can be received
      canCancel: status !== TransferStatus.Completed && status !== TransferStatus.Cancelled && status !== TransferStatus.Rejected
    };
  }

  onClose(): void {
    // Only close dialog if used as modal, not page
    if (this.dialogRef && !this.showAsPage()) {
      this.dialogRef.close({
        updated: true,
        transfer: this.transfer(),
        message: 'Transfer data may have been updated'
      });
    }
  }

  onPrint(): void {
    if (this.transfer()) {
      this.transferService.printTransfer(this.transfer()!.id);
    }
  }

  // Workflow action methods (Dynamic like Facture Management)
  onApprove(): void {
    const currentTransfer = this.transfer();
    if (!currentTransfer) return;

    // ✅ Guard against double-click and wrong status
    if (this.loading() || currentTransfer.status !== TransferStatus.Pending) {
      console.warn('Cannot approve: transfer is', currentTransfer.status, 'or already processing');
      return;
    }

    console.log('🔄 Approving transfer:', currentTransfer.transferNumber, 'Status:', currentTransfer.status);

    // Include item approvals - approve all requested quantities by default
    const itemApprovals: TransferItemApprovalDto[] = currentTransfer.items.map(item => ({
      transferItemId: item.id,
      approvedQuantity: item.requestedQuantity, // Approve full requested quantity
      notes: 'Approved'
    }));

    const approvalRequest: TransferApprovalRequestDto = {
      approved: true,
      approvalNotes: 'Transfer approved',
      itemApprovals: itemApprovals,
      managerOverride: false
    };

    console.log('📤 Sending approval request:', approvalRequest);

    this.loading.set(true);
    this.transferService.approveTransfer(currentTransfer.id, approvalRequest)
      .subscribe({
        next: (updatedTransfer: InventoryTransferDto) => {
          console.log('✅ Approval successful! Raw backend response:', updatedTransfer);
          console.log('🔍 Status from backend:', updatedTransfer.status, 'Type:', typeof updatedTransfer.status);

          // Map the updated transfer to include new permission flags
          const mappedTransfer = this.mapTransferStatus(updatedTransfer);
          console.log('🔄 Mapped transfer with new status:', mappedTransfer.status, 'Permissions:', {
            canApprove: mappedTransfer.canApprove,
            canShip: mappedTransfer.canShip,
            canReceive: mappedTransfer.canReceive,
            canCancel: mappedTransfer.canCancel
          });

          // Force UI update by triggering change detection
          this.transfer.set(mappedTransfer);
          console.log('📱 Transfer signal updated, current value:', this.transfer());

          // Emit update event for page usage
          this.transferUpdated.emit(mappedTransfer);

          this.loading.set(false);
          this.showSuccessMessage('Transfer approved successfully');
          // ✅ NO AUTO-CLOSE: Stay in modal, show next available buttons
        },
        error: (error: any) => {
          console.error('❌ Failed to approve transfer:', error);
          this.loading.set(false);
          this.showErrorMessage('Failed to approve transfer');
        }
      });
  }

  onReject(): void {
    if (!this.transfer()) return;

    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (!rejectionReason) return;

    const approvalRequest = {
      approved: false,
      approvalNotes: rejectionReason,
      managerOverride: false
    };

    this.loading.set(true);
    this.transferService.approveTransfer(this.transfer()!.id, approvalRequest)
      .subscribe({
        next: (updatedTransfer: InventoryTransferDto) => {
          // Map the updated transfer to include new permission flags
          const mappedTransfer = this.mapTransferStatus(updatedTransfer);
          this.transfer.set(mappedTransfer);
          this.loading.set(false);
          this.showSuccessMessage('Transfer rejected');
          // ✅ NO AUTO-CLOSE: Stay in modal, workflow completed (no more buttons)
        },
        error: (error: any) => {
          console.error('Failed to reject transfer:', error);
          this.loading.set(false);
          this.showErrorMessage('Failed to reject transfer');
        }
      });
  }

  onShip(): void {
    if (!this.transfer()) return;

    const shipmentRequest = {
      shipmentNotes: 'Transfer shipped',
      estimatedDeliveryDate: this.transfer()!.estimatedDeliveryDate,
      trackingNumber: `TRK-${this.transfer()!.transferNumber}`,
      courierName: 'Internal Courier',
      itemShipments: []
    };

    this.loading.set(true);
    this.transferService.shipTransfer(this.transfer()!.id, shipmentRequest)
      .subscribe({
        next: (updatedTransfer: InventoryTransferDto) => {
          console.log('🚚 Ship successful! Raw backend response:', updatedTransfer);
          console.log('🔍 Status from backend:', updatedTransfer.status, 'Type:', typeof updatedTransfer.status);

          // Map the updated transfer to include new permission flags
          const mappedTransfer = this.mapTransferStatus(updatedTransfer);
          console.log('🔄 Mapped transfer with new status:', mappedTransfer.status, 'Permissions:', {
            canApprove: mappedTransfer.canApprove,
            canShip: mappedTransfer.canShip,
            canReceive: mappedTransfer.canReceive,
            canCancel: mappedTransfer.canCancel
          });

          // Force UI update by triggering change detection
          this.transfer.set(mappedTransfer);
          console.log('📱 Transfer signal updated, current value:', this.transfer());

          // Emit update event for page usage
          this.transferUpdated.emit(mappedTransfer);

          this.loading.set(false);
          this.showSuccessMessage('Transfer marked as shipped');
          // ✅ NO AUTO-CLOSE: Stay in modal, show Receive button next
        },
        error: (error: any) => {
          console.error('Failed to mark transfer as shipped:', error);
          this.loading.set(false);
          this.showErrorMessage('Failed to mark transfer as shipped');
        }
      });
  }

  onReceive(): void {
    if (!this.transfer()) return;

    const receiptRequest = {
      receiptNotes: 'Transfer received and confirmed',
      actualDeliveryDate: new Date(),
      qualityCheckPassed: true,
      itemReceipts: []
    };

    this.loading.set(true);
    this.transferService.receiveTransfer(this.transfer()!.id, receiptRequest)
      .subscribe({
        next: (updatedTransfer: InventoryTransferDto) => {
          // Map the updated transfer to include new permission flags
          const mappedTransfer = this.mapTransferStatus(updatedTransfer);
          this.transfer.set(mappedTransfer);
          this.loading.set(false);
          this.showSuccessMessage('Transfer delivery confirmed - Workflow completed!');
          // ✅ NO AUTO-CLOSE: Stay in modal, workflow completed (no more buttons)
        },
        error: (error: any) => {
          console.error('Failed to confirm delivery:', error);
          this.loading.set(false);
          this.showErrorMessage('Failed to confirm delivery');
        }
      });
  }

  onCancel(): void {
    if (!this.transfer()) return;

    const cancelReason = prompt('Please provide a reason for cancellation:');
    if (!cancelReason) return;

    this.loading.set(true);
    this.transferService.cancelTransfer(this.transfer()!.id, cancelReason)
      .subscribe({
        next: (updatedTransfer: InventoryTransferDto) => {
          // Map the updated transfer to include new permission flags
          const mappedTransfer = this.mapTransferStatus(updatedTransfer);
          this.transfer.set(mappedTransfer);
          this.loading.set(false);
          this.showSuccessMessage('Transfer cancelled');
          // ✅ NO AUTO-CLOSE: Stay in modal, workflow completed (no more buttons)
        },
        error: (error: any) => {
          console.error('Failed to cancel transfer:', error);
          this.loading.set(false);
          this.showErrorMessage('Failed to cancel transfer');
        }
      });
  }

  // Permission checking methods (Simplified - now using data flags like facture)
  // These methods are now deprecated in favor of direct flag checking:
  // transfer()!.canApprove, transfer()!.canShip, etc.

  // Notification methods
  private showSuccessMessage(message: string): void {
    // For now, use alert - can be replaced with proper notification system
    alert(message);
  }

  private showErrorMessage(message: string): void {
    // For now, use alert - can be replaced with proper notification system
    alert(message);
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