// ===== ADD STOCK TO BATCH MODAL COMPONENT =====
// src/app/modules/inventory/components/add-stock-to-batch-modal/add-stock-to-batch-modal.component.ts

import { Component, Inject, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { ProductBatch, AddStockToBatchRequest } from '../../interfaces/inventory.interfaces';

export interface AddStockToBatchModalData {
  batch: ProductBatch;
  productName: string;
  availableBatches?: ProductBatch[]; // Other batches for reference
}

export interface AddStockToBatchResult {
  success: boolean;
  updatedBatch?: ProductBatch;
  message?: string;
}

@Component({
  selector: 'app-add-stock-to-batch-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="add-stock-modal">
      <!-- Modal Header -->
      <div mat-dialog-title class="modal-header">
        <div class="header-content">
          <mat-icon class="header-icon">inventory_2</mat-icon>
          <div class="header-text">
            <h2 class="modal-title">Add Stock to Batch</h2>
            <p class="modal-subtitle">{{ data.productName }}</p>
          </div>
        </div>
        <button 
          mat-icon-button 
          mat-dialog-close
          class="close-btn"
          [disabled]="loading()"
          matTooltip="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Batch Information Card -->
      <div class="batch-info-card">
        <div class="batch-header">
          <div class="batch-details">
            <h3 class="batch-number">{{ data.batch.batchNumber }}</h3>
            <div class="batch-meta">
              <span class="current-stock">
                <mat-icon>inventory</mat-icon>
                Current Stock: {{ data.batch.currentQuantity | number }} {{ getUnitDisplay() }}
              </span>
              <span 
                class="batch-status" 
                [class]="getBatchStatusClass(data.batch.status)">
                {{ formatBatchStatus(data.batch.status) }}
              </span>
            </div>
          </div>
          
          <!-- Expiry Information -->
          <div class="expiry-info" *ngIf="data.batch.expiryDate">
            <div class="expiry-date">
              <mat-icon [style.color]="getExpiryStatusColor(data.batch.status)">
                {{ getExpiryIcon(data.batch.status) }}
              </mat-icon>
              <div class="expiry-details">
                <span class="expiry-label">Expires</span>
                <span class="expiry-value">{{ formatExpiryDate(data.batch.expiryDate) }}</span>
                <span class="days-left" [class]="getExpiryStatusClass(data.batch.status)">
                  {{ formatDaysToExpiry(data.batch.daysToExpiry) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cost Information -->
        <div class="cost-info">
          <div class="cost-item">
            <span class="cost-label">Unit Cost:</span>
            <span class="cost-value">{{ formatCurrency(data.batch.unitCost) }}</span>
          </div>
          <div class="cost-item" *ngIf="estimatedTotalCost() > 0">
            <span class="cost-label">Estimated Total:</span>
            <span class="cost-value total-cost">{{ formatCurrency(estimatedTotalCost()) }}</span>
          </div>
        </div>
      </div>

      <!-- Add Stock Form -->
      <form [formGroup]="stockForm" (ngSubmit)="onSubmit()" class="stock-form">
        <mat-dialog-content>
          <!-- Quantity Input -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Quantity to Add *</mat-label>
              <input 
                matInput
                type="number"
                min="1"
                step="1"
                formControlName="quantity"
                placeholder="Enter quantity"
                (input)="onQuantityChange()"
                [class.error]="stockForm.get('quantity')?.invalid && stockForm.get('quantity')?.touched">
              <mat-icon matSuffix>add_box</mat-icon>
              <mat-hint>{{ getUnitDisplay() }} to be added to this batch</mat-hint>
              <mat-error *ngIf="stockForm.get('quantity')?.hasError('required')">
                Quantity is required
              </mat-error>
              <mat-error *ngIf="stockForm.get('quantity')?.hasError('min')">
                Quantity must be at least 1
              </mat-error>
              <mat-error *ngIf="stockForm.get('quantity')?.hasError('pattern')">
                Please enter a valid number
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Unit Cost Input (Optional Override) -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Unit Cost (Optional)</mat-label>
              <input 
                matInput
                type="number"
                min="0"
                step="0.01"
                formControlName="unitCost"
                placeholder="Override unit cost"
                (input)="onQuantityChange()">
              <mat-icon matSuffix>attach_money</mat-icon>
              <mat-hint>Leave blank to use existing unit cost ({{ formatCurrency(data.batch.unitCost) }})</mat-hint>
              <mat-error *ngIf="stockForm.get('unitCost')?.hasError('min')">
                Unit cost cannot be negative
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Reference Number -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Reference Number</mat-label>
              <input 
                matInput
                formControlName="referenceNumber"
                placeholder="PO number, invoice, etc.">
              <mat-icon matSuffix>receipt_long</mat-icon>
              <mat-hint>Purchase order, invoice, or reference number</mat-hint>
            </mat-form-field>
          </div>

          <!-- Notes -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes</mat-label>
              <textarea 
                matInput
                formControlName="notes"
                rows="3"
                placeholder="Additional notes about this stock addition">
              </textarea>
              <mat-icon matSuffix>note_add</mat-icon>
              <mat-hint>Optional notes about the stock addition</mat-hint>
            </mat-form-field>
          </div>

          <!-- Summary Card -->
          <div class="summary-card" *ngIf="stockForm.get('quantity')?.value > 0">
            <h4 class="summary-title">
              <mat-icon>summarize</mat-icon>
              Addition Summary
            </h4>
            <div class="summary-content">
              <div class="summary-row">
                <span class="summary-label">Current Stock:</span>
                <span class="summary-value">{{ data.batch.currentQuantity | number }} {{ getUnitDisplay() }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Adding:</span>
                <span class="summary-value add-value">+{{ stockForm.get('quantity')?.value | number }} {{ getUnitDisplay() }}</span>
              </div>
              <div class="summary-row total-row">
                <span class="summary-label">New Total:</span>
                <span class="summary-value total-value">{{ getNewTotalStock() | number }} {{ getUnitDisplay() }}</span>
              </div>
              <div class="summary-row" *ngIf="estimatedTotalCost() > 0">
                <span class="summary-label">Addition Cost:</span>
                <span class="summary-value cost-value">{{ formatCurrency(estimatedTotalCost()) }}</span>
              </div>
            </div>
          </div>

          <!-- Warnings -->
          <div class="warnings" *ngIf="showExpiryWarning()">
            <div class="warning-item expiry-warning">
              <mat-icon>warning</mat-icon>
              <div class="warning-content">
                <span class="warning-title">Batch Expiry Notice</span>
                <span class="warning-message">
                  This batch {{ formatExpiryWarning() }}. Consider the shelf life before adding large quantities.
                </span>
              </div>
            </div>
          </div>
        </mat-dialog-content>

        <!-- Modal Actions -->
        <mat-dialog-actions class="modal-actions">
          <div class="actions-content">
            <div class="action-buttons">
              <button 
                mat-button 
                type="button"
                mat-dialog-close
                [disabled]="loading()"
                class="cancel-btn">
                Cancel
              </button>
              <button 
                mat-raised-button 
                color="primary"
                type="submit"
                [disabled]="stockForm.invalid || loading()"
                class="submit-btn">
                <mat-icon *ngIf="!loading()">add_box</mat-icon>
                <mat-spinner 
                  *ngIf="loading()" 
                  diameter="20" 
                  color="accent">
                </mat-spinner>
                {{ loading() ? 'Adding Stock...' : 'Add Stock' }}
              </button>
            </div>
          </div>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .add-stock-modal {
      width: 100%;
      max-width: 600px;
      min-height: 400px;
    }

    /* Header Styles */
    .modal-header {
      display: flex;
      justify-content: between;
      align-items: center;
      padding: var(--s6);
      border-bottom: 2px solid var(--border);
      margin: calc(-1 * var(--s6));
      margin-bottom: var(--s6);
      background: var(--bg-primary);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: var(--s4);
      flex: 1;
    }

    .header-icon {
      color: var(--primary);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .header-text {
      flex: 1;
    }

    .modal-title {
      margin: 0;
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      color: var(--text);
    }

    .modal-subtitle {
      margin: var(--s1) 0 0 0;
      font-size: var(--text-sm);
      color: var(--text-secondary);
      font-weight: var(--font-medium);
    }

    .close-btn {
      width: 40px;
      height: 40px;
      color: var(--text-secondary);
    }

    /* Batch Info Card */
    .batch-info-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s5);
      margin-bottom: var(--s6);
    }

    .batch-header {
      display: flex;
      justify-content: between;
      align-items: flex-start;
      gap: var(--s4);
      margin-bottom: var(--s4);
    }

    .batch-details {
      flex: 1;
    }

    .batch-number {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin: 0 0 var(--s2) 0;
    }

    .batch-meta {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .current-stock {
      display: flex;
      align-items: center;
      gap: var(--s2);
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .current-stock mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .batch-status {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      
      &.status-good {
        background: rgba(75, 191, 123, 0.1);
        color: var(--success);
      }
      
      &.status-warning {
        background: rgba(255, 184, 77, 0.1);
        color: var(--warning);
      }
      
      &.status-critical {
        background: rgba(255, 145, 77, 0.1);
        color: var(--primary);
      }
      
      &.status-expired {
        background: rgba(225, 90, 79, 0.1);
        color: var(--error);
      }
    }

    /* Expiry Info */
    .expiry-info {
      min-width: 180px;
    }

    .expiry-date {
      display: flex;
      align-items: flex-start;
      gap: var(--s2);
    }

    .expiry-details {
      display: flex;
      flex-direction: column;
    }

    .expiry-label {
      font-size: var(--text-xs);
      color: var(--text-muted);
      font-weight: var(--font-medium);
    }

    .expiry-value {
      font-size: var(--text-sm);
      color: var(--text);
      font-weight: var(--font-medium);
    }

    .days-left {
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      
      &.expiry-good { color: var(--success); }
      &.expiry-warning { color: var(--warning); }
      &.expiry-critical { color: var(--primary); }
      &.expiry-expired { color: var(--error); }
    }

    /* Cost Info */
    .cost-info {
      display: flex;
      justify-content: between;
      gap: var(--s4);
      padding-top: var(--s3);
      border-top: 1px solid var(--border);
    }

    .cost-item {
      display: flex;
      flex-direction: column;
      gap: var(--s1);
    }

    .cost-label {
      font-size: var(--text-xs);
      color: var(--text-muted);
      font-weight: var(--font-medium);
    }

    .cost-value {
      font-size: var(--text-sm);
      color: var(--text);
      font-weight: var(--font-semibold);
      
      &.total-cost {
        color: var(--primary);
        font-size: var(--text-base);
      }
    }

    /* Form Styles */
    .stock-form {
      width: 100%;
    }

    .form-row {
      margin-bottom: var(--s4);
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      &.error .mat-mdc-form-field-outline {
        border-color: var(--error) !important;
      }
    }

    /* Summary Card */
    .summary-card {
      background: var(--bg-primary);
      border: 2px solid var(--primary);
      border-radius: var(--radius-lg);
      padding: var(--s5);
      margin: var(--s6) 0;
    }

    .summary-title {
      display: flex;
      align-items: center;
      gap: var(--s2);
      margin: 0 0 var(--s4) 0;
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      color: var(--primary);
    }

    .summary-title mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .summary-content {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
    }

    .summary-row {
      display: flex;
      justify-content: between;
      align-items: center;
      
      &.total-row {
        padding-top: var(--s3);
        border-top: 1px solid var(--border);
        font-weight: var(--font-semibold);
      }
    }

    .summary-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .summary-value {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text);
      
      &.add-value { color: var(--success); }
      &.total-value { color: var(--primary); font-size: var(--text-base); }
      &.cost-value { color: var(--text); }
    }

    /* Warnings */
    .warnings {
      margin: var(--s6) 0;
    }

    .warning-item {
      display: flex;
      gap: var(--s3);
      padding: var(--s4);
      border-radius: var(--radius-lg);
      
      &.expiry-warning {
        background: rgba(255, 184, 77, 0.1);
        border: 1px solid var(--warning);
      }
    }

    .warning-item mat-icon {
      color: var(--warning);
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .warning-content {
      display: flex;
      flex-direction: column;
      gap: var(--s1);
    }

    .warning-title {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--warning);
    }

    .warning-message {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-normal);
    }

    /* Modal Actions */
    .modal-actions {
      padding: var(--s6);
      margin: 0 calc(-1 * var(--s6)) calc(-1 * var(--s6));
      border-top: 2px solid var(--border);
      background: var(--bg-primary);
    }

    .actions-content {
      width: 100%;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: var(--s3);
      align-items: center;
    }

    .cancel-btn {
      min-width: 100px;
      height: 44px;
      color: var(--text-secondary);
    }

    .submit-btn {
      min-width: 140px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--s2);
      
      mat-spinner {
        margin-right: var(--s2);
      }
    }

    /* Mobile Responsive */
    @media (max-width: 640px) {
      .add-stock-modal {
        max-width: 100%;
        margin: 0;
      }

      .batch-header {
        flex-direction: column;
        align-items: stretch;
      }

      .cost-info {
        flex-direction: column;
        gap: var(--s3);
      }

      .action-buttons {
        flex-direction: column-reverse;
        width: 100%;
      }

      .cancel-btn,
      .submit-btn {
        width: 100%;
      }
    }
  `]
})
export class AddStockToBatchModalComponent {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  
  // Signals for reactive state
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Form
  stockForm: FormGroup;

  // Computed properties
  estimatedTotalCost = computed(() => {
    const quantity = this.stockForm?.get('quantity')?.value || 0;
    const unitCost = this.stockForm?.get('unitCost')?.value || this.data.batch.unitCost;
    return quantity * unitCost;
  });

  constructor(
    public dialogRef: MatDialogRef<AddStockToBatchModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddStockToBatchModalData
  ) {
    this.stockForm = this.fb.group({
      quantity: ['', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      unitCost: [''],
      referenceNumber: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    console.log('🆕 AddStockToBatchModal initialized with data:', this.data);
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.stockForm.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const formValues = this.stockForm.value;
      const request: AddStockToBatchRequest = {
        quantity: parseInt(formValues.quantity),
        unitCost: formValues.unitCost ? parseFloat(formValues.unitCost) : undefined,
        referenceNumber: formValues.referenceNumber || undefined,
        notes: formValues.notes || undefined
      };

      console.log('📦 Adding stock to batch:', { batchId: this.data.batch.id, request });

      const updatedBatch = await firstValueFrom(
        this.inventoryService.addStockToBatch(this.data.batch.id, request)
      );

      console.log('✅ Stock added successfully:', updatedBatch);

      const result: AddStockToBatchResult = {
        success: true,
        updatedBatch,
        message: `Successfully added ${request.quantity} units to batch ${this.data.batch.batchNumber}`
      };

      this.dialogRef.close(result);

    } catch (error: any) {
      console.error('❌ Failed to add stock to batch:', error);
      this.errorMessage.set(error.message || 'Failed to add stock to batch');
      this.loading.set(false);
    }
  }

  /**
   * Handle quantity change for real-time updates
   */
  onQuantityChange(): void {
    // Trigger computed properties to update
    // The estimatedTotalCost computed will automatically recalculate
  }

  /**
   * Get new total stock after addition
   */
  getNewTotalStock(): number {
    const currentStock = this.data.batch.currentQuantity;
    const additionalStock = parseInt(this.stockForm.get('quantity')?.value || '0');
    return currentStock + additionalStock;
  }

  /**
   * Get unit display text
   */
  getUnitDisplay(): string {
    // Would need to get unit from product data
    return 'units'; // Default, could be enhanced with actual unit from product
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format expiry date
   */
  formatExpiryDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Format days to expiry
   */
  formatDaysToExpiry(days?: number): string {
    if (days === undefined) return 'Unknown';
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Expires today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  /**
   * Get batch status display text
   */
  formatBatchStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Good': 'Good',
      'Warning': 'Warning',
      'Critical': 'Critical',
      'Expired': 'Expired'
    };
    return statusMap[status] || status;
  }

  /**
   * Get batch status CSS class
   */
  getBatchStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Good': 'status-good',
      'Warning': 'status-warning',
      'Critical': 'status-critical',
      'Expired': 'status-expired'
    };
    return statusClasses[status] || 'status-good';
  }

  /**
   * Get expiry status CSS class
   */
  getExpiryStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Good': 'expiry-good',
      'Warning': 'expiry-warning',
      'Critical': 'expiry-critical',
      'Expired': 'expiry-expired'
    };
    return statusClasses[status] || 'expiry-good';
  }

  /**
   * Get expiry status color
   */
  getExpiryStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'Good': '#4BBF7B',
      'Warning': '#FFB84D',
      'Critical': '#FF914D',
      'Expired': '#E15A4F'
    };
    return statusColors[status] || '#4BBF7B';
  }

  /**
   * Get expiry icon
   */
  getExpiryIcon(status: string): string {
    const statusIcons: { [key: string]: string } = {
      'Good': 'check_circle',
      'Warning': 'warning',
      'Critical': 'error',
      'Expired': 'dangerous'
    };
    return statusIcons[status] || 'schedule';
  }

  /**
   * Check if should show expiry warning
   */
  showExpiryWarning(): boolean {
    const batch = this.data.batch;
    return batch.status === 'Warning' || batch.status === 'Critical' || batch.status === 'Expired';
  }

  /**
   * Format expiry warning text
   */
  formatExpiryWarning(): string {
    const batch = this.data.batch;
    const days = batch.daysToExpiry;
    
    if (batch.status === 'Expired') {
      return 'has expired';
    }
    
    if (batch.status === 'Critical') {
      return `expires in ${days || 0} days`;
    }
    
    if (batch.status === 'Warning') {
      return `expires in ${days || 0} days`;
    }
    
    return 'may expire soon';
  }
}