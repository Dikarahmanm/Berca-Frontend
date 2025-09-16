import { Component, Inject, OnInit, Optional, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

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
import { TransferWorkflowConfirmationComponent } from '../transfer-workflow-confirmation/transfer-workflow-confirmation.component';

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
                <div class="timeline-meta" *ngIf="transfer()!.requestedAt">
                  {{ formatDateTime(transfer()!.requestedAt!) }} by {{ transfer()!.requestedByName }}
                </div>
                <div class="timeline-meta" *ngIf="!transfer()!.requestedAt">
                  Requested by {{ transfer()!.requestedByName }}
                </div>
                <div class="timeline-notes" *ngIf="transfer()!.notes">
                  <strong>Request Notes:</strong> {{ transfer()!.notes }}
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
                <div class="timeline-notes" *ngIf="transfer()!.approvalNotes">
                  <strong>Notes:</strong> {{ transfer()!.approvalNotes }}
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
                <div class="timeline-notes" *ngIf="transfer()!.shipmentNotes">
                  <strong>Shipping Notes:</strong> {{ transfer()!.shipmentNotes }}
                </div>
                <div class="timeline-shipping-info" *ngIf="transfer()!.trackingNumber || transfer()!.courierName">
                  <div *ngIf="transfer()!.trackingNumber" class="shipping-detail">
                    <strong>Tracking:</strong> {{ transfer()!.trackingNumber }}
                  </div>
                  <div *ngIf="transfer()!.courierName" class="shipping-detail">
                    <strong>Courier:</strong> {{ transfer()!.courierName }}
                  </div>
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
                <div class="timeline-notes" *ngIf="transfer()!.receiptNotes">
                  <strong>Delivery Notes:</strong> {{ transfer()!.receiptNotes }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Delivery Information Section (shown after shipping) -->
        @if (isShippingCompleted() && (transfer()!.trackingNumber || transfer()!.courierName)) {
          <div class="info-section">
            <h3 class="section-title">🚚 Delivery Information</h3>
            <div class="delivery-info-grid">
              <div class="delivery-column">
                @if (transfer()!.trackingNumber) {
                  <div class="delivery-item">
                    <label>Tracking Number</label>
                    <div class="value tracking-number">{{ transfer()!.trackingNumber }}</div>
                  </div>
                }
                @if (transfer()!.courierName) {
                  <div class="delivery-item">
                    <label>Courier Service</label>
                    <div class="value">{{ transfer()!.courierName }}</div>
                  </div>
                }
                @if (transfer()!.driverName) {
                  <div class="delivery-item">
                    <label>Driver Name</label>
                    <div class="value">{{ transfer()!.driverName }}</div>
                  </div>
                }
                @if (transfer()!.driverPhone) {
                  <div class="delivery-item">
                    <label>Driver Phone</label>
                    <div class="value">{{ transfer()!.driverPhone }}</div>
                  </div>
                }
              </div>
              <div class="delivery-column">
                @if (transfer()!.estimatedDeliveryDate) {
                  <div class="delivery-item">
                    <label>Estimated Delivery</label>
                    <div class="value">{{ formatDateTime(transfer()!.estimatedDeliveryDate!) }}</div>
                  </div>
                }
                @if (transfer()!.actualDeliveryDate) {
                  <div class="delivery-item">
                    <label>Actual Delivery</label>
                    <div class="value text-success">{{ formatDateTime(transfer()!.actualDeliveryDate!) }}</div>
                  </div>
                }
              </div>
            </div>
            @if (transfer()!.shipmentNotes) {
              <div class="delivery-notes">
                <label>Shipping Notes</label>
                <div class="notes-content-small">{{ transfer()!.shipmentNotes }}</div>
              </div>
            }
          </div>
        }

        <!-- Loss Summary Section (shown only if there are losses) -->
        @if (getTotalDamageValue() > 0 || getTotalLossValue() > 0) {
          <div class="info-section loss-summary">
            <h3 class="section-title text-danger">⚠️ Loss Summary</h3>
            <div class="financial-grid">
              <div class="financial-column">
                @if (getTotalDamageQuantity() > 0) {
                  <div class="financial-item">
                    <label class="text-danger">Total Damaged Items</label>
                    <div class="value damage-value">{{ getTotalDamageQuantity() }} units</div>
                  </div>
                }
                @if (getTotalLostQuantity() > 0) {
                  <div class="financial-item">
                    <label class="text-danger">Total Lost Items</label>
                    <div class="value lost-value">{{ getTotalLostQuantity() }} units</div>
                  </div>
                }
              </div>
              <div class="financial-column">
                @if (getTotalDamageValue() > 0) {
                  <div class="financial-item">
                    <label class="text-danger">Damage Cost</label>
                    <div class="value text-danger font-bold">{{ formatCurrency(getTotalDamageValue()) }}</div>
                  </div>
                }
                @if (getTotalLossValue() > 0) {
                  <div class="financial-item">
                    <label class="text-danger">Loss Cost</label>
                    <div class="value text-danger font-bold">{{ formatCurrency(getTotalLossValue()) }}</div>
                  </div>
                }
                <div class="financial-item total-loss">
                  <label class="text-danger font-bold">Total Loss Value</label>
                  <div class="value text-danger font-bold text-lg">{{ formatCurrency(getTotalDamageValue() + getTotalLossValue()) }}</div>
                </div>
              </div>
            </div>
          </div>
        }

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
                    <th class="text-center">Damaged</th>
                    <th class="text-center">Lost</th>
                    <th class="text-right">Unit Cost</th>
                    <th class="text-right">Total Cost</th>
                    <th class="text-right">Loss Value</th>
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
                      @if ((item.receivedQuantity || 0) !== (item.requestedQuantity || 0)) {
                        <div class="quantity-difference" [class.text-success]="(item.receivedQuantity || 0) > (item.requestedQuantity || 0)" [class.text-danger]="(item.receivedQuantity || 0) < (item.requestedQuantity || 0)">
                          ({{ (item.receivedQuantity || 0) > (item.requestedQuantity || 0) ? '+' : '' }}{{ (item.receivedQuantity || 0) - (item.requestedQuantity || 0) }})
                        </div>
                      }
                    </td>

                    <td class="text-center">
                      <div class="quantity-value damage-value" *ngIf="item.damageQuantity && item.damageQuantity > 0">
                        {{ item.damageQuantity }}
                      </div>
                      <div class="no-damage" *ngIf="!item.damageQuantity || item.damageQuantity === 0">-</div>
                    </td>

                    <td class="text-center">
                      <div class="quantity-value lost-value" *ngIf="item.lostQuantity && item.lostQuantity > 0">
                        {{ item.lostQuantity }}
                      </div>
                      <div class="no-loss" *ngIf="!item.lostQuantity || item.lostQuantity === 0">-</div>
                    </td>

                    <td class="text-right">{{ formatCurrency(item.unitCost) }}</td>

                    <td class="text-right font-semibold">{{ formatCurrency(item.totalCost) }}</td>

                    <td class="text-right">
                      @if ((item.damageValue || 0) + (item.lossValue || 0) > 0) {
                        <span class="text-danger font-semibold">{{ formatCurrency((item.damageValue || 0) + (item.lossValue || 0)) }}</span>
                      } @else {
                        <span class="text-success">-</span>
                      }
                    </td>
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

        <!-- Notes Section -->
        <div class="info-section">
          <h3 class="section-title">Notes</h3>
          <div class="notes-content">
            {{ transfer()!.notes || 'No additional notes' }}
          </div>
        </div>
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
    private transferService: InventoryTransferService,
    private dialog: MatDialog
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
      totalCost: this.calculateTotalCost(items),
      requestedAt: transfer.createdAt,
      notes: transfer.notes || transfer.requestReason || '',
      approvalNotes: transfer.approvalNotes,
      shipmentNotes: transfer.shipmentNotes,
      receiptNotes: transfer.receiptNotes,
      trackingNumber: transfer.trackingNumber,
      courierName: transfer.courierName,
      driverName: transfer.driverName,
      driverPhone: transfer.driverPhone
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

  private calculateTotalCost(items: any[]): number {
    return items.reduce((total, item) => {
      const itemTotal = (item.unitCost || 0) * (item.quantity || item.requestedQuantity || 0);
      return total + itemTotal;
    }, 0);
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
      this.generatePrintDocument();
    }
  }

  private generatePrintDocument(): void {
    const transfer = this.transfer()!;
    const printContent = this.createPrintHTML(transfer);

    // Create print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to print the transfer document');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  private createPrintHTML(transfer: InventoryTransferDto): string {
    const currentDate = new Date().toLocaleDateString('id-ID');
    const totalItems = transfer.items.length;
    const totalQuantity = transfer.items.reduce((sum, item) => sum + item.requestedQuantity, 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Transfer Document - ${transfer.transferNumber}</title>
        <style>
          @media print {
            @page {
              margin: 15mm;
              size: A4;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              margin: 0;
              padding: 0;
            }
            .no-print { display: none !important; }
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }

          .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }

          .document-title {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
            margin: 10px 0;
          }

          .transfer-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
          }

          .info-section {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
          }

          .info-title {
            font-weight: bold;
            font-size: 14px;
            color: #2563eb;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            padding: 2px 0;
          }

          .info-label {
            font-weight: 500;
            color: #555;
          }

          .info-value {
            font-weight: bold;
            color: #000;
          }

          .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-in-transit { background: #dbeafe; color: #1e40af; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .status-rejected { background: #fee2e2; color: #991b1b; }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
          }

          .items-table th,
          .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }

          .items-table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #333;
          }

          .items-table tr:nth-child(even) {
            background: #f8f9fa;
          }

          .text-right {
            text-align: right;
          }

          .text-center {
            text-align: center;
          }

          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #666;
          }

          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
            margin-top: 40px;
          }

          .signature-box {
            text-align: center;
            border: 1px solid #ddd;
            padding: 15px;
            min-height: 80px;
          }

          .signature-title {
            font-weight: bold;
            margin-bottom: 50px;
          }

          .print-button {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 20px 0;
          }

          @media print {
            .print-button { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ Print Document</button>

        <div class="header">
          <div class="company-name">TOKO ENIWAN</div>
          <div class="document-title">INVENTORY TRANSFER DOCUMENT</div>
          <div style="font-size: 14px; margin-top: 5px;">Transfer #${transfer.transferNumber}</div>
        </div>

        <div class="transfer-info">
          <div class="info-section">
            <div class="info-title">📤 FROM (SOURCE)</div>
            <div class="info-row">
              <span class="info-label">Branch:</span>
              <span class="info-value">${transfer.sourceBranchName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Requested By:</span>
              <span class="info-value">${transfer.requestedByName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Request Date:</span>
              <span class="info-value">${this.formatDateTime(transfer.requestedAt)}</span>
            </div>
          </div>

          <div class="info-section">
            <div class="info-title">📥 TO (DESTINATION)</div>
            <div class="info-row">
              <span class="info-label">Branch:</span>
              <span class="info-value">${transfer.destinationBranchName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value">
                <span class="status-badge status-${transfer.status.toLowerCase()}">${transfer.status}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Print Date:</span>
              <span class="info-value">${currentDate}</span>
            </div>
          </div>
        </div>

        <div class="info-section" style="margin: 20px 0;">
          <div class="info-title">📊 TRANSFER SUMMARY</div>
          <div class="info-row">
            <span class="info-label">Total Items:</span>
            <span class="info-value">${totalItems} products</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total Quantity:</span>
            <span class="info-value">${totalQuantity} units</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total Cost:</span>
            <span class="info-value">${this.formatCurrency(transfer.totalCost)}</span>
          </div>
          ${transfer.estimatedDeliveryDate ? `
          <div class="info-row">
            <span class="info-label">Est. Delivery:</span>
            <span class="info-value">${this.formatDateTime(transfer.estimatedDeliveryDate)}</span>
          </div>
          ` : ''}
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 35%;">Product Name</th>
              <th style="width: 15%;">Code</th>
              <th style="width: 10%;">Unit</th>
              <th style="width: 10%;">Qty</th>
              <th style="width: 12%;">Unit Cost</th>
              <th style="width: 13%;">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            ${transfer.items.map((item, index) => `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.productCode}</td>
                <td class="text-center">${item.unit || 'pcs'}</td>
                <td class="text-center">${item.requestedQuantity}</td>
                <td class="text-right">${this.formatCurrency(item.unitCost)}</td>
                <td class="text-right">${this.formatCurrency(item.totalCost)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #e5e7eb; font-weight: bold;">
              <td colspan="4" class="text-right">TOTAL:</td>
              <td class="text-center">${totalQuantity}</td>
              <td></td>
              <td class="text-right">${this.formatCurrency(transfer.totalCost)}</td>
            </tr>
          </tfoot>
        </table>

        ${transfer.notes ? `
        <div class="info-section">
          <div class="info-title">📝 NOTES</div>
          <p>${transfer.notes}</p>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-title">Prepared By</div>
            <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 5px;">
              ${transfer.requestedByName}
            </div>
          </div>

          <div class="signature-box">
            <div class="signature-title">Approved By</div>
            <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 5px;">
              ${transfer.approvedByName || '________________'}
            </div>
          </div>

          <div class="signature-box">
            <div class="signature-title">Received By</div>
            <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 5px;">
              ${transfer.receivedByName || '________________'}
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>Note:</strong> This document is computer-generated and serves as an official record of inventory transfer.</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString('id-ID')} | <strong>System:</strong> Toko Eniwan POS</p>
        </div>
      </body>
      </html>
    `;
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

    // Open confirmation modal
    const dialogRef = this.dialog.open(TransferWorkflowConfirmationComponent, {
      width: '600px',
      data: {
        action: 'approve',
        transfer: currentTransfer
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed) {
        this.performApproval(currentTransfer, result.formData);
      }
    });
  }

  private performApproval(transfer: InventoryTransferDto, formData: any): void {
    console.log('🔄 Approving transfer:', transfer.transferNumber, 'Status:', transfer.status);
    console.log('📝 Form data received:', formData);

    // Include item approvals - approve all requested quantities by default
    const itemApprovals: TransferItemApprovalDto[] = transfer.items.map(item => ({
      transferItemId: item.id,
      approvedQuantity: item.requestedQuantity, // Approve full requested quantity
      notes: 'Approved'
    }));

    const approvalRequest: TransferApprovalRequestDto = {
      approved: formData.approved || true,
      approvalNotes: formData.approvalNotes || 'Transfer approved',
      itemApprovals: itemApprovals,
      managerOverride: formData.managerOverride || false
    };

    console.log('📤 Sending approval request:', approvalRequest);

    this.loading.set(true);
    this.transferService.approveTransfer(transfer.id, approvalRequest)
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
    const currentTransfer = this.transfer();
    if (!currentTransfer) return;

    // Open confirmation modal
    const dialogRef = this.dialog.open(TransferWorkflowConfirmationComponent, {
      width: '600px',
      data: {
        action: 'reject',
        transfer: currentTransfer
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed) {
        this.performRejection(currentTransfer, result.formData);
      }
    });
  }

  private performRejection(transfer: InventoryTransferDto, formData: any): void {
    console.log('📝 Rejection form data received:', formData);

    const approvalRequest = {
      approved: formData.approved || false,
      approvalNotes: formData.approvalNotes || 'Transfer rejected',
      managerOverride: formData.managerOverride || false
    };

    this.loading.set(true);
    this.transferService.approveTransfer(transfer.id, approvalRequest)
      .subscribe({
        next: (updatedTransfer: InventoryTransferDto) => {
          // Map the updated transfer to include new permission flags
          const mappedTransfer = this.mapTransferStatus(updatedTransfer);
          this.transfer.set(mappedTransfer);
          this.transferUpdated.emit(mappedTransfer);
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
    const currentTransfer = this.transfer();
    if (!currentTransfer) return;

    // Open confirmation modal
    const dialogRef = this.dialog.open(TransferWorkflowConfirmationComponent, {
      width: '700px',
      data: {
        action: 'ship',
        transfer: currentTransfer
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed) {
        this.performShipping(currentTransfer, result.formData);
      }
    });
  }

  private performShipping(transfer: InventoryTransferDto, formData: any): void {
    console.log('📝 Shipping form data received:', formData);

    const shipmentRequest = {
      shipmentNotes: formData.shipmentNotes || formData.notes || 'Transfer shipped',
      estimatedDeliveryDate: formData.estimatedDeliveryDate || formData.deliveryDate || transfer.estimatedDeliveryDate,
      trackingNumber: formData.trackingNumber || `TRK-${transfer.transferNumber}`,
      courierName: formData.courierName || 'Internal Courier',
      driverName: formData.driverName || '',
      driverPhone: formData.driverPhone || '',
      itemShipments: []
    };

    this.loading.set(true);
    this.transferService.shipTransfer(transfer.id, shipmentRequest)
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
    const currentTransfer = this.transfer();
    if (!currentTransfer) return;

    // Open confirmation modal
    const dialogRef = this.dialog.open(TransferWorkflowConfirmationComponent, {
      width: '800px',
      data: {
        action: 'receive',
        transfer: currentTransfer
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed) {
        this.performReceiving(currentTransfer, result.formData);
      }
    });
  }

  private performReceiving(transfer: InventoryTransferDto, formData: any): void {
    console.log('📝 Receiving form data received:', formData);

    const receiptRequest = {
      receiptNotes: formData.receiptNotes || formData.notes || 'Transfer received and confirmed',
      actualDeliveryDate: formData.actualDeliveryDate || new Date(),
      qualityCheckPassed: formData.qualityCheckPassed || formData.qualityConfirmed || true,
      itemReceipts: formData.itemReceipts || formData.itemVerifications || []
    };

    this.loading.set(true);
    this.transferService.receiveTransfer(transfer.id, receiptRequest)
      .subscribe({
        next: (updatedTransfer: InventoryTransferDto) => {
          // Map the updated transfer to include new permission flags
          const mappedTransfer = this.mapTransferStatus(updatedTransfer);
          this.transfer.set(mappedTransfer);
          this.transferUpdated.emit(mappedTransfer);
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
    const currentTransfer = this.transfer();
    if (!currentTransfer) return;

    // Open confirmation modal
    const dialogRef = this.dialog.open(TransferWorkflowConfirmationComponent, {
      width: '600px',
      data: {
        action: 'cancel',
        transfer: currentTransfer
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed) {
        this.performCancellation(currentTransfer, result.formData);
      }
    });
  }

  private performCancellation(transfer: InventoryTransferDto, formData: any): void {
    console.log('📝 Cancellation form data received:', formData);

    this.loading.set(true);
    this.transferService.cancelTransfer(transfer.id, formData.cancelReason || formData.reason || 'Transfer cancelled')
      .subscribe({
        next: (updatedTransfer: InventoryTransferDto) => {
          // Map the updated transfer to include new permission flags
          const mappedTransfer = this.mapTransferStatus(updatedTransfer);
          this.transfer.set(mappedTransfer);
          this.transferUpdated.emit(mappedTransfer);
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

  getTotalDamageQuantity(): number {
    return this.transfer()?.items?.reduce((sum, item) => sum + (item.damageQuantity || 0), 0) || 0;
  }

  getTotalLostQuantity(): number {
    return this.transfer()?.items?.reduce((sum, item) => sum + (item.lostQuantity || 0), 0) || 0;
  }

  getTotalDamageValue(): number {
    return this.transfer()?.items?.reduce((sum, item) => sum + (item.damageValue || 0), 0) || 0;
  }

  getTotalLossValue(): number {
    return this.transfer()?.items?.reduce((sum, item) => sum + (item.lossValue || 0), 0) || 0;
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

  formatDateTime(date: Date | string | null | undefined): string {
    console.log('🔍 formatDateTime called with:', date, 'type:', typeof date);

    if (!date) {
      console.log('🔍 Date is falsy, returning N/A');
      return 'N/A';
    }

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    console.log('🔍 Date object:', dateObj, 'isValid:', !isNaN(dateObj.getTime()));

    if (isNaN(dateObj.getTime())) {
      console.log('🔍 Invalid date, returning Invalid Date');
      return 'Invalid Date';
    }

    const formatted = new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);

    console.log('🔍 Formatted date:', formatted);
    return formatted;
  }
}