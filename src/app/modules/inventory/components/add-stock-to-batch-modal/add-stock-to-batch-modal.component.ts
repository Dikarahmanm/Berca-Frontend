// ✅ REDESIGNED: Context-First Add Stock to Batch Modal
// Simplified modal strategy with primary action focus and expandable secondary options

import { Component, Inject, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { firstValueFrom } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { ProductBatch, AddStockToBatchRequest } from '../../interfaces/inventory.interfaces';

export interface AddStockToBatchModalData {
  batch: ProductBatch;
  productName: string;
  productUnit: string;
  availableBatches?: ProductBatch[];
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
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="simplified-modal">
      <!-- ✅ CONTEXT HEADER: Always Visible Batch Info -->
      <div class="batch-context-header">
        <div class="context-main">
          <div class="batch-identity">
            <h2 class="batch-number">{{ data.batch.batchNumber }}</h2>
            <p class="product-name">{{ data.productName }}</p>
          </div>
          
          <div class="batch-status">
            <div class="status-indicator" [class]="getBatchStatusClass()">
              <span class="status-icon">{{ getStatusIcon() }}</span>
              <span class="status-text">{{ formatBatchStatus() }}</span>
            </div>
          </div>
        </div>
        
        <div class="context-details">
          <div class="detail-item">
            <span class="detail-label">Current Stock</span>
            <span class="detail-value">{{ formatStock(data.batch.currentQuantity) }}</span>
          </div>
          
          <div class="detail-item" *ngIf="data.batch.expiryDate">
            <span class="detail-label">Expires</span>
            <span class="detail-value" [class]="getExpiryStatusClass()">
              {{ formatExpiryInfo() }}
            </span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">Unit Cost</span>
            <span class="detail-value">{{ formatCurrency(data.batch.unitCost) }}</span>
          </div>
        </div>
        
        <button 
          class="close-button" 
          (click)="onCancel()"
          [disabled]="loading()"
          matTooltip="Close">
          <span class="close-icon">×</span>
        </button>
      </div>

      <!-- ✅ PRIMARY ACTION: Prominent Quantity Input -->
      <div class="primary-action-section">
        <div class="action-header">
          <h3 class="action-title">Add Stock to Batch</h3>
          <p class="action-subtitle">Enter the quantity you want to add to this batch</p>
        </div>
        
        <form [formGroup]="stockForm" class="quantity-form">
          <!-- Large, Focused Quantity Input -->
          <div class="quantity-input-container">
            <label class="quantity-label">Quantity to Add</label>
            <div class="quantity-input-group">
              <input 
                type="number" 
                formControlName="quantity"
                class="quantity-input"
                [class.error]="isQuantityInvalid()"
                placeholder="0"
                min="1"
                step="1"
                (input)="onQuantityChange()"
                #quantityInput>
              <span class="unit-label">{{ data.productUnit }}</span>
            </div>
            
            <div class="quantity-feedback">
              <div *ngIf="isQuantityInvalid()" class="error-message">
                <span class="error-icon">⚠</span>
                {{ getQuantityError() }}
              </div>
              
              <div *ngIf="isQuantityValid()" class="success-hint">
                <span class="success-icon">✓</span>
                Ready to add {{ stockForm.get('quantity')?.value }} {{ data.productUnit }}
              </div>
            </div>
          </div>

          <!-- ✅ REAL-TIME CALCULATION: New Total Preview -->
          <div class="calculation-preview" *ngIf="isQuantityValid()" [@slideDown]>
            <div class="calculation-card">
              <div class="calc-row">
                <span class="calc-label">Current Stock:</span>
                <span class="calc-value">{{ formatStock(data.batch.currentQuantity) }}</span>
              </div>
              <div class="calc-row addition">
                <span class="calc-label">Adding:</span>
                <span class="calc-value">+{{ formatStock(stockForm.get('quantity')?.value || 0) }}</span>
              </div>
              <div class="calc-row total">
                <span class="calc-label">New Total:</span>
                <span class="calc-value">{{ formatStock(getNewTotalStock()) }}</span>
              </div>
              <div class="calc-row cost" *ngIf="getTotalCost() > 0">
                <span class="calc-label">Addition Cost:</span>
                <span class="calc-value">{{ formatCurrency(getTotalCost()) }}</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- ✅ SECONDARY OPTIONS: Expandable Advanced Settings -->
      <div class="secondary-options">
        <button 
          type="button" 
          class="options-toggle"
          (click)="toggleAdvancedOptions()"
          [class.expanded]="showAdvancedOptions()">
          <span class="toggle-icon">{{ showAdvancedOptions() ? '▼' : '▶' }}</span>
          <span class="toggle-text">Advanced Options</span>
          <span class="toggle-hint">(Cost, Reference, Notes)</span>
        </button>
        
        <div class="advanced-options" *ngIf="showAdvancedOptions()" [@slideDown]>
          <form [formGroup]="stockForm" class="advanced-form">
            <!-- Unit Cost Override -->
            <div class="advanced-field">
              <label class="field-label">Unit Cost Override</label>
              <div class="input-group">
                <span class="input-prefix">Rp</span>
                <input 
                  type="number" 
                  formControlName="unitCost"
                  class="form-input"
                  placeholder="{{ data.batch.unitCost }}"
                  min="0"
                  step="100"
                  (input)="onQuantityChange()">
              </div>
              <div class="field-hint">
                Leave blank to use existing cost ({{ formatCurrency(data.batch.unitCost) }})
              </div>
            </div>

            <!-- Reference Number -->
            <div class="advanced-field">
              <label class="field-label">Reference Number</label>
              <input 
                type="text" 
                formControlName="referenceNumber"
                class="form-input"
                placeholder="PO number, invoice, etc.">
              <div class="field-hint">Purchase order, invoice, or reference number</div>
            </div>

            <!-- Notes -->
            <div class="advanced-field">
              <label class="field-label">Notes</label>
              <textarea 
                formControlName="notes"
                class="form-textarea"
                placeholder="Additional notes about this stock addition..."
                rows="3"></textarea>
              <div class="field-hint">Optional notes about the stock addition</div>
            </div>
          </form>
        </div>
      </div>

      <!-- ✅ EXPIRY WARNING: Context-Aware Alert -->
      <div class="expiry-warning" *ngIf="shouldShowExpiryWarning()" [@slideDown]>
        <div class="warning-content">
          <span class="warning-icon">⚠</span>
          <div class="warning-text">
            <span class="warning-title">Expiry Notice</span>
            <span class="warning-message">{{ getExpiryWarningText() }}</span>
          </div>
        </div>
      </div>

      <!-- ✅ ACTION BUTTONS: Clear, Prominent Actions -->
      <div class="action-buttons">
        <button 
          type="button" 
          class="btn btn-secondary"
          (click)="onCancel()"
          [disabled]="loading()">
          Cancel
        </button>
        
        <button 
          type="button" 
          class="btn btn-primary"
          (click)="onSubmit()"
          [disabled]="!isFormValid() || loading()">
          <span *ngIf="loading()" class="spinner"></span>
          <span *ngIf="!loading()" class="btn-icon">📦</span>
          <span>{{ loading() ? 'Adding...' : 'Add Stock' }}</span>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./add-stock-to-batch-modal.component.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: '0', overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: '1' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: '0', opacity: '0', overflow: 'hidden' }))
      ])
    ])
  ]
})
export class AddStockToBatchModalComponent {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  
  // ✅ Signal-based state management
  loading = signal(false);
  showAdvancedOptions = signal(false);
  
  // Form setup
  stockForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<AddStockToBatchModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddStockToBatchModalData
  ) {
    // ✅ Simplified form with focus on primary action
    this.stockForm = this.fb.group({
      quantity: ['', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      unitCost: [''],
      referenceNumber: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    console.log('📦 Simplified AddStockModal initialized:', this.data);
    
    // Focus on quantity input for immediate use
    setTimeout(() => {
      const quantityInput = document.querySelector('.quantity-input') as HTMLInputElement;
      quantityInput?.focus();
    }, 100);
  }

  // ✅ FORM VALIDATION METHODS
  
  isQuantityValid(): boolean {
    const quantity = this.stockForm.get('quantity');
    return !!(quantity?.valid && quantity?.value > 0);
  }
  
  isQuantityInvalid(): boolean {
    const quantity = this.stockForm.get('quantity');
    return !!(quantity?.invalid && quantity?.touched);
  }
  
  getQuantityError(): string {
    const quantity = this.stockForm.get('quantity');
    if (quantity?.hasError('required')) return 'Quantity is required';
    if (quantity?.hasError('min')) return 'Quantity must be at least 1';
    if (quantity?.hasError('pattern')) return 'Please enter a valid number';
    return 'Invalid quantity';
  }
  
  isFormValid(): boolean {
    return this.stockForm.valid && this.isQuantityValid();
  }

  // ✅ REAL-TIME CALCULATION METHODS
  
  onQuantityChange(): void {
    // Trigger real-time updates for calculations
    const quantity = this.stockForm.get('quantity')?.value || 0;
    console.log('📊 Quantity changed:', quantity);
  }
  
  getNewTotalStock(): number {
    const current = this.data.batch.currentQuantity;
    const additional = parseInt(this.stockForm.get('quantity')?.value || '0');
    return current + additional;
  }
  
  getTotalCost(): number {
    const quantity = parseInt(this.stockForm.get('quantity')?.value || '0');
    const unitCost = parseFloat(this.stockForm.get('unitCost')?.value || this.data.batch.unitCost.toString());
    return quantity * unitCost;
  }

  // ✅ UI INTERACTION METHODS
  
  toggleAdvancedOptions(): void {
    this.showAdvancedOptions.update(show => !show);
    console.log('🔧 Advanced options toggled:', this.showAdvancedOptions());
  }
  
  // ✅ BATCH CONTEXT METHODS
  
  getBatchStatusClass(): string {
    const status = this.data.batch.status.toLowerCase();
    return `status-${status}`;
  }
  
  getStatusIcon(): string {
    const icons: { [key: string]: string } = {
      'good': '✅',
      'warning': '⚠️',
      'critical': '🚨',
      'expired': '❌'
    };
    return icons[this.data.batch.status.toLowerCase()] || '📦';
  }
  
  formatBatchStatus(): string {
    return this.data.batch.status;
  }
  
  getExpiryStatusClass(): string {
    const status = this.data.batch.status.toLowerCase();
    return `expiry-${status}`;
  }
  
  formatExpiryInfo(): string {
    if (!this.data.batch.expiryDate) return 'No expiry date';
    
    const date = new Date(this.data.batch.expiryDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `${diffDays} days left`;
  }

  // ✅ EXPIRY WARNING METHODS
  
  shouldShowExpiryWarning(): boolean {
    const status = this.data.batch.status.toLowerCase();
    return ['warning', 'critical', 'expired'].includes(status);
  }
  
  getExpiryWarningText(): string {
    const status = this.data.batch.status.toLowerCase();
    const quantity = this.stockForm.get('quantity')?.value || 0;
    
    if (status === 'expired') {
      return 'This batch has expired. Consider disposal instead of adding more stock.';
    }
    
    if (status === 'critical') {
      return `This batch expires soon. Consider the shelf life before adding ${quantity} units.`;
    }
    
    if (status === 'warning') {
      return `This batch will expire in a few days. Plan sales accordingly for ${quantity} additional units.`;
    }
    
    return 'Please consider expiry date when adding stock.';
  }

  // ✅ FORMATTING HELPER METHODS
  
  formatStock(amount: number): string {
    return `${amount.toLocaleString()} ${this.data.productUnit}`;
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // ✅ ACTION METHODS
  
  async onSubmit(): Promise<void> {
    if (!this.isFormValid() || this.loading()) return;

    this.loading.set(true);

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

      const result: AddStockToBatchResult = {
        success: true,
        updatedBatch,
        message: `Successfully added ${request.quantity} ${this.data.productUnit} to batch ${this.data.batch.batchNumber}`
      };

      this.dialogRef.close(result);

    } catch (error: any) {
      console.error('❌ Failed to add stock:', error);
      this.loading.set(false);
      // Could show error in modal instead of console
    }
  }
  
  onCancel(): void {
    if (this.loading()) return;
    this.dialogRef.close({ success: false });
  }
}