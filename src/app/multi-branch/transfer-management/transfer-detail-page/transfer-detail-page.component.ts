// transfer-detail-page.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryTransferService } from '../../../core/services/inventory-transfer.service';
import { InventoryTransferDto, TransferStatus } from '../../../core/models/inventory-transfer.models';
import { TransferDetailDialogComponent } from '../transfer-detail-dialog/transfer-detail-dialog.component';

@Component({
  selector: 'app-transfer-detail-page',
  standalone: true,
  imports: [CommonModule, TransferDetailDialogComponent],
  template: `
    <div class="transfer-detail-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <button
            class="btn btn-ghost btn-sm"
            (click)="goBack()"
            style="padding: 8px 12px; margin-right: 16px;">
            ← Back to Transfers
          </button>
          <div class="breadcrumb">
            <span class="breadcrumb-item">Transfers</span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item active">{{ transferNumber() }}</span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading transfer details...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-container">
          <div class="error-message">
            <h3>Error Loading Transfer</h3>
            <p>{{ error() }}</p>
            <button class="btn btn-primary" (click)="loadTransferDetail()">
              Try Again
            </button>
          </div>
        </div>
      }

      <!-- Transfer Detail Content -->
      @if (!loading() && !error() && transfer()) {
        <div class="detail-container">
          <!-- Use existing dialog content as page content -->
          <app-transfer-detail-dialog
            [transfer]="transfer()"
            [showAsPage]="true"
            (transferUpdated)="onTransferUpdated($event)">
          </app-transfer-detail-dialog>
        </div>
      }
    </div>
  `,
  styles: [`
    .transfer-detail-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .header-left {
      display: flex;
      align-items: center;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: #666;
    }

    .breadcrumb-item {
      color: #666;
    }

    .breadcrumb-item.active {
      color: #333;
      font-weight: 500;
    }

    .breadcrumb-separator {
      margin: 0 8px;
      color: #ccc;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn-ghost {
      background: transparent;
      color: #666;
      border: 1px solid #ddd;
    }

    .btn-ghost:hover {
      background: #f5f5f5;
      color: #333;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      text-align: center;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
    }

    .error-message h3 {
      color: #dc2626;
      margin-bottom: 8px;
    }

    .error-message p {
      color: #7f1d1d;
      margin-bottom: 16px;
    }

    .detail-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
  `]
})
export class TransferDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transferService = inject(InventoryTransferService);

  // Signals
  transfer = signal<InventoryTransferDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  transferNumber = signal<string>('');

  ngOnInit(): void {
    const transferId = this.route.snapshot.paramMap.get('id');
    console.log('🔍 Transfer Detail Page - ID from route:', transferId);
    if (transferId) {
      this.loadTransferDetail(Number(transferId));
    } else {
      this.error.set('Invalid transfer ID');
      this.loading.set(false);
    }
  }

  loadTransferDetail(transferId?: number): void {
    const id = transferId || Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Invalid transfer ID');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.transferService.getTransferById(id)
      .subscribe({
        next: (transfer: any) => {
          console.log('🔍 Raw transfer data from API:', transfer);
          console.log('🔍 Transfer items count:', transfer.transferItems?.length || 0);

          // Use same mapping logic as dialog
          const mappedTransfer = this.mapTransferStatus(transfer);
          console.log('🔍 Mapped transfer:', mappedTransfer);
          console.log('🔍 Mapped items count:', mappedTransfer.items?.length || 0);

          this.transfer.set(mappedTransfer);
          this.transferNumber.set(mappedTransfer.transferNumber);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Failed to load transfer detail:', error);
          this.error.set('Failed to load transfer details. Please try again.');
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

    // Calculate permission flags based on status
    const permissionFlags = this.calculatePermissionFlags(mappedStatus);

    // Map items from transferItems
    const items = (transfer.transferItems || []).map((item: any) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      productCode: item.product.barcode,
      unit: item.product.unit,
      requestedQuantity: item.quantity,
      approvedQuantity: item.approvedQuantity || item.quantity,
      shippedQuantity: item.shippedQuantity || item.quantity,
      receivedQuantity: item.actualReceivedQuantity || item.receivedQuantity || item.quantity,
      actualReceivedQuantity: item.actualReceivedQuantity || item.receivedQuantity || item.quantity,
      damageQuantity: item.damageQuantity || 0,
      lostQuantity: item.lostQuantity || 0,
      damageValue: (item.damageQuantity || 0) * (item.unitCost || 0),
      lossValue: (item.lostQuantity || 0) * (item.unitCost || 0),
      unitCost: item.unitCost,
      totalCost: (item.unitCost || 0) * (item.quantity || 0),
      actualTotalCost: (item.unitCost || 0) * (item.actualReceivedQuantity || item.receivedQuantity || item.quantity),
      sourceStockBefore: item.sourceStockBefore,
      sourceStockAfter: item.sourceStockAfter,
      destinationStockBefore: item.destinationStockBefore,
      destinationStockAfter: item.destinationStockAfter,
      qualityNotes: item.qualityNotes || ''
    }));

    return {
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      sourceBranchId: transfer.sourceBranchId,
      destinationBranchId: transfer.destinationBranchId,
      status: mappedStatus,
      items: items,
      // Add permission flags
      canApprove: permissionFlags.canApprove,
      canReject: permissionFlags.canReject,
      canShip: permissionFlags.canShip,
      canReceive: permissionFlags.canReceive,
      canCancel: permissionFlags.canCancel,
      // Map other fields
      sourceBranchName: transfer.sourceBranch?.branchName || 'Unknown Branch',
      destinationBranchName: transfer.destinationBranch?.branchName || 'Unknown Branch',
      requestedByName: transfer.requestedBy?.username || 'Unknown User',
      approvedByName: transfer.approvedBy?.username || null,
      shippedByName: transfer.shippedBy?.username || null,
      receivedByName: transfer.receivedBy?.username || null,
      type: transfer.type || 0,
      priority: transfer.priority || 0,
      requestReason: transfer.requestReason || '',
      notes: transfer.notes || '',
      requestedAt: transfer.requestedAt || transfer.createdAt,
      approvedAt: transfer.approvedAt,
      rejectedAt: transfer.rejectedAt,
      shippedAt: transfer.shippedAt,
      receivedAt: transfer.receivedAt,
      estimatedDeliveryDate: transfer.estimatedDeliveryDate,
      actualDeliveryDate: transfer.actualDeliveryDate,
      estimatedCost: transfer.estimatedCost || 0,
      actualCost: transfer.actualCost || 0,
      approvalNotes: transfer.approvalNotes,
      shipmentNotes: transfer.shipmentNotes,
      receiptNotes: transfer.receiptNotes,
      trackingNumber: transfer.trackingNumber,
      courierName: transfer.courierName,
      driverName: transfer.driverName,
      driverPhone: transfer.driverPhone,
      // Add missing required properties
      requestedById: transfer.requestedBy?.id || 0,
      totalCost: this.calculateTotalCost(items),
      statusHistory: []
    } as InventoryTransferDto;
  }

  private calculatePermissionFlags(status: TransferStatus) {
    return {
      canApprove: status === TransferStatus.Pending,
      canReject: status === TransferStatus.Pending,
      canShip: status === TransferStatus.Approved,
      canReceive: status === TransferStatus.InTransit,
      canCancel: status !== TransferStatus.Completed && status !== TransferStatus.Cancelled && status !== TransferStatus.Rejected
    };
  }

  private calculateTotalCost(items: any[]): number {
    return items.reduce((total, item) => {
      const itemTotal = (item.unitCost || 0) * (item.quantity || item.requestedQuantity || 0);
      return total + itemTotal;
    }, 0);
  }

  onTransferUpdated(updatedTransfer: InventoryTransferDto): void {
    this.transfer.set(updatedTransfer);
    console.log('📱 Transfer updated in page:', updatedTransfer.status);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/transfers']);
  }
}