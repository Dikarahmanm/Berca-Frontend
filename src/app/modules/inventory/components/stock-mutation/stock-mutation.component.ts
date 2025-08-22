// ✅ REDESIGNED: Batch-Aware Stock Mutation Component
// Unified interface with batch selection first and context-aware operations

import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription, firstValueFrom } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { ExpiryManagementService } from '../../../../core/services/expiry-management.service';
import { Product, InventoryMutation, StockUpdateRequest, MutationType, ProductBatch } from '../../interfaces/inventory.interfaces';

// Enhanced interfaces for batch-aware operations
export interface BatchOperation {
  type: 'add-stock' | 'remove-stock' | 'transfer' | 'dispose' | 'adjust';
  label: string;
  icon: string;
  description: string;
  color: string;
  fifoRecommended?: boolean;
}

export interface BatchRecommendation {
  batch: ProductBatch;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

export interface BatchOperationContext {
  selectedBatch: ProductBatch | null;
  operationType: string | null;
  targetBatch?: ProductBatch | null; // For transfers
  recommendations: BatchRecommendation[];
}

@Component({
  selector: 'app-stock-mutation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './stock-mutation.component.html',
  styleUrls: ['./stock-mutation.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-in', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class StockMutationComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private inventoryService = inject(InventoryService);
  private expiryService = inject(ExpiryManagementService);
  private snackBar = inject(MatSnackBar);

  // ✅ Signal-based state management
  private _product = signal<Product | null>(null);
  private _productBatches = signal<ProductBatch[]>([]);
  private _selectedBatch = signal<ProductBatch | null>(null);
  private _operationType = signal<string | null>(null);
  private _loading = signal(false);
  private _saving = signal(false);
  private _recentMutations = signal<InventoryMutation[]>([]);

  // Public readonly signals
  readonly product = this._product.asReadonly();
  readonly productBatches = this._productBatches.asReadonly();
  readonly selectedBatch = this._selectedBatch.asReadonly();
  readonly operationType = this._operationType.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly recentMutations = this._recentMutations.asReadonly();

  // Form management
  operationForm!: FormGroup;
  productId: number | null = null;
  private subscriptions = new Subscription();

  // ✅ BATCH OPERATION TYPES (Context-Aware)
  readonly batchOperations: BatchOperation[] = [
    {
      type: 'add-stock',
      label: 'Add Stock',
      icon: '📦',
      description: 'Increase stock quantity in selected batch',
      color: 'var(--success)',
      fifoRecommended: false
    },
    {
      type: 'remove-stock',
      label: 'Remove Stock',
      icon: '📤',
      description: 'Decrease stock using FIFO recommendation',
      color: 'var(--warning)',
      fifoRecommended: true
    },
    {
      type: 'transfer',
      label: 'Transfer Stock',
      icon: '🔄',
      description: 'Move stock between batches',
      color: 'var(--info)',
      fifoRecommended: false
    },
    {
      type: 'dispose',
      label: 'Dispose Batch',
      icon: '🗑️',
      description: 'Remove expired or damaged stock',
      color: 'var(--error)',
      fifoRecommended: false
    },
    {
      type: 'adjust',
      label: 'Adjust Stock',
      icon: '⚖️',
      description: 'Correct stock count for selected batch',
      color: 'var(--primary)',
      fifoRecommended: false
    }
  ];

  // ✅ Computed properties for batch recommendations
  readonly batchRecommendations = computed(() => {
    const operation = this._operationType();
    const batches = this._productBatches();
    
    return this.getBatchRecommendations(operation, batches);
  });

  readonly recommendedBatch = computed(() => {
    const recommendations = this.batchRecommendations();
    return recommendations.find(r => r.priority === 'high')?.batch || null;
  });

  readonly canProceedWithOperation = computed(() => {
    const batch = this._selectedBatch();
    const operation = this._operationType();
    const form = this.operationForm;
    
    return !!(batch && operation && form?.valid && !this._saving());
  });

  readonly operationContext = computed((): BatchOperationContext => {
    return {
      selectedBatch: this._selectedBatch(),
      operationType: this._operationType(),
      recommendations: this.batchRecommendations()
    };
  });

  readonly currentStepTitle = computed(() => {
    const batch = this._selectedBatch();
    const operation = this._operationType();
    
    if (!batch) return 'Select Batch';
    if (!operation) return 'Choose Operation';
    return 'Operation Details';
  });

  readonly currentStepDescription = computed(() => {
    const batch = this._selectedBatch();
    const operation = this._operationType();
    
    if (!batch) return 'Select which batch you want to operate on';
    if (!operation) return 'Choose the type of operation to perform';
    return 'Enter operation details and confirm';
  });

  constructor() {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.getProductId();
    this.loadProductData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ✅ INITIALIZATION METHODS

  private initializeForm(): void {
    this.operationForm = this.fb.group({
      quantity: ['', [Validators.required, Validators.min(1)]],
      notes: ['', [Validators.required, Validators.maxLength(500)]],
      referenceNumber: ['', [Validators.maxLength(50)]],
      unitCost: [0, [Validators.min(0)]],
      targetBatchId: [null] // For transfer operations
    });
  }

  private getProductId(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productId = parseInt(id, 10);
    }
  }

  private async loadProductData(): Promise<void> {
    if (!this.productId) {
      this.showError('Invalid product ID');
      this.goBack();
      return;
    }

    this._loading.set(true);

    try {
      // Load product and batches concurrently
      const [product, batches] = await Promise.all([
        firstValueFrom(this.inventoryService.getProduct(this.productId)),
        this.loadProductBatches(this.productId)
      ]);

      this._product.set(product);
      this._productBatches.set(batches);
      
      // Load recent mutations for context
      await this.loadRecentMutations();

    } catch (error: any) {
      console.error('❌ Failed to load product data:', error);
      this.showError('Failed to load product data: ' + error.message);
      this.goBack();
    } finally {
      this._loading.set(false);
    }
  }

  private async loadProductBatches(productId: number): Promise<ProductBatch[]> {
    try {
      const coreBatches = await firstValueFrom(
        this.expiryService.getProductBatches({ productId })
      );
      
      // Convert core ProductBatch to inventory ProductBatch interface
      const inventoryBatches: ProductBatch[] = (coreBatches || []).map(batch => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        productId: batch.productId,
        productName: batch.productName,
        initialQuantity: batch.initialStock,
        currentQuantity: batch.currentStock,
        unitCost: batch.costPerUnit,
        expiryDate: batch.expiryDate,
        manufacturingDate: batch.productionDate,
        supplierInfo: batch.supplierName,
        status: this.mapBatchStatus(batch.status, batch.expiryDate),
        daysToExpiry: batch.expiryDate ? Math.ceil((new Date(batch.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : undefined,
        isActive: !batch.isBlocked && !batch.isDisposed,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt
      }));
      
      return inventoryBatches;
    } catch (error) {
      console.error('❌ Failed to load batches:', error);
      return [];
    }
  }

  private async loadRecentMutations(): Promise<void> {
    if (!this.productId) return;

    try {
      const mutations = await firstValueFrom(
        this.inventoryService.getInventoryHistory(this.productId)
      );
      
      // Keep only recent 5 mutations for context
      this._recentMutations.set(mutations.slice(0, 5));
    } catch (error) {
      console.error('❌ Failed to load recent mutations:', error);
    }
  }

  // ✅ BATCH SELECTION METHODS

  selectBatch(batch: ProductBatch): void {
    this._selectedBatch.set(batch);
    this._operationType.set(null); // Reset operation when batch changes
    console.log('📦 Batch selected:', batch.batchNumber);
  }

  clearBatchSelection(): void {
    this._selectedBatch.set(null);
    this._operationType.set(null);
    this.operationForm.reset();
  }

  // ✅ OPERATION TYPE METHODS

  selectOperation(operationType: string): void {
    this._operationType.set(operationType);
    this.setupOperationForm(operationType);
    console.log('🔧 Operation selected:', operationType);
  }

  private setupOperationForm(operationType: string): void {
    const batch = this._selectedBatch();
    if (!batch) return;

    // Reset form and setup operation-specific defaults
    this.operationForm.reset();

    switch (operationType) {
      case 'add-stock':
        this.operationForm.patchValue({
          quantity: 1,
          notes: `Add stock to batch ${batch.batchNumber}`,
          unitCost: batch.unitCost
        });
        break;
        
      case 'remove-stock':
        this.operationForm.patchValue({
          quantity: 1,
          notes: `Remove stock from batch ${batch.batchNumber} (FIFO)`
        });
        // Set max quantity to available stock
        this.operationForm.get('quantity')?.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(batch.currentQuantity)
        ]);
        break;
        
      case 'dispose':
        this.operationForm.patchValue({
          quantity: batch.currentQuantity,
          notes: `Dispose expired/damaged batch ${batch.batchNumber}`
        });
        break;
        
      case 'adjust':
        this.operationForm.patchValue({
          notes: `Stock count adjustment for batch ${batch.batchNumber}`
        });
        break;
        
      case 'transfer':
        this.operationForm.patchValue({
          quantity: 1,
          notes: `Transfer stock from batch ${batch.batchNumber}`
        });
        break;
    }

    this.operationForm.updateValueAndValidity();
  }

  // ✅ BATCH RECOMMENDATION METHODS

  private getBatchRecommendations(operation: string | null, batches: ProductBatch[]): BatchRecommendation[] {
    if (!operation || !batches.length) return [];

    const recommendations: BatchRecommendation[] = [];

    switch (operation) {
      case 'add-stock':
        // Recommend batch with furthest expiry OR create new batch
        const latestExpiryBatch = batches
          .filter(b => b.status !== 'Expired')
          .sort((a, b) => {
            if (!a.expiryDate) return 1;
            if (!b.expiryDate) return -1;
            return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
          })[0];
        
        if (latestExpiryBatch) {
          recommendations.push({
            batch: latestExpiryBatch,
            reason: 'Furthest expiry date - best for new stock',
            priority: 'high',
            action: 'Add to this batch'
          });
        }
        break;

      case 'remove-stock':
        // Recommend FIFO (nearest expiry first)
        const fifoSortedBatches = batches
          .filter(b => b.currentQuantity > 0 && b.status !== 'Expired')
          .sort((a, b) => {
            if (!a.expiryDate) return 1;
            if (!b.expiryDate) return -1;
            return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          });

        fifoSortedBatches.slice(0, 2).forEach((batch, index) => {
          recommendations.push({
            batch,
            reason: index === 0 ? 'FIFO - expires soonest' : 'FIFO - next to expire',
            priority: index === 0 ? 'high' : 'medium',
            action: 'Remove from this batch'
          });
        });
        break;

      case 'dispose':
        // Recommend expired or near-expired batches
        const expiredBatches = batches
          .filter(b => b.status === 'Expired' || b.status === 'Critical')
          .sort((a, b) => {
            if (a.status === 'Expired' && b.status !== 'Expired') return -1;
            if (a.status !== 'Expired' && b.status === 'Expired') return 1;
            return 0;
          });

        expiredBatches.forEach((batch, index) => {
          recommendations.push({
            batch,
            reason: batch.status === 'Expired' ? 'Already expired' : 'Expires soon',
            priority: index === 0 ? 'high' : 'medium',
            action: 'Dispose this batch'
          });
        });
        break;

      case 'transfer':
        // Show available target batches
        const transferTargets = batches
          .filter(b => b.status !== 'Expired')
          .sort((a, b) => b.currentQuantity - a.currentQuantity);

        transferTargets.forEach((batch, index) => {
          recommendations.push({
            batch,
            reason: 'Available target for transfer',
            priority: index === 0 ? 'high' : 'medium',
            action: 'Transfer to this batch'
          });
        });
        break;
    }

    return recommendations;
  }

  selectRecommendedBatch(recommendation: BatchRecommendation): void {
    this.selectBatch(recommendation.batch);
    
    // Show helpful message about why this batch was recommended
    this.showInfo(`Recommended: ${recommendation.reason}`);
  }

  // ✅ OPERATION EXECUTION METHODS

  async executeOperation(): Promise<void> {
    if (!this.canProceedWithOperation()) return;

    const batch = this._selectedBatch()!;
    const operation = this._operationType()!;
    const formData = this.operationForm.value;

    this._saving.set(true);

    try {
      switch (operation) {
        case 'add-stock':
          await this.executeAddStock(batch, formData);
          break;
        case 'remove-stock':
          await this.executeRemoveStock(batch, formData);
          break;
        case 'transfer':
          await this.executeTransfer(batch, formData);
          break;
        case 'dispose':
          await this.executeDispose(batch, formData);
          break;
        case 'adjust':
          await this.executeAdjust(batch, formData);
          break;
      }

      this.showSuccess('Operation completed successfully');
      await this.refreshData();
      this.resetOperation();

    } catch (error: any) {
      console.error('❌ Operation failed:', error);
      this.showError('Operation failed: ' + error.message);
    } finally {
      this._saving.set(false);
    }
  }

  private async executeAddStock(batch: ProductBatch, formData: any): Promise<void> {
    const request = {
      quantity: parseInt(formData.quantity),
      unitCost: formData.unitCost || batch.unitCost,
      notes: formData.notes,
      referenceNumber: formData.referenceNumber
    };

    await firstValueFrom(
      this.inventoryService.addStockToBatch(batch.id, request)
    );
  }

  private async executeRemoveStock(batch: ProductBatch, formData: any): Promise<void> {
    // Use existing stock mutation API with negative quantity
    const request: StockUpdateRequest = {
      mutationType: MutationType.StockOut,
      quantity: -parseInt(formData.quantity),
      notes: formData.notes,
      referenceNumber: formData.referenceNumber
    };

    await firstValueFrom(
      this.inventoryService.updateStock(this.productId!, request)
    );
  }

  private async executeDispose(batch: ProductBatch, formData: any): Promise<void> {
    // Implement batch disposal logic
    const request: StockUpdateRequest = {
      mutationType: MutationType.Expired,
      quantity: -parseInt(formData.quantity),
      notes: `Disposed: ${formData.notes}`,
      referenceNumber: formData.referenceNumber
    };

    await firstValueFrom(
      this.inventoryService.updateStock(this.productId!, request)
    );
  }

  private async executeTransfer(batch: ProductBatch, formData: any): Promise<void> {
    // This would need a transfer API endpoint
    const request: StockUpdateRequest = {
      mutationType: MutationType.Transfer,
      quantity: -parseInt(formData.quantity),
      notes: `Transfer: ${formData.notes}`,
      referenceNumber: formData.referenceNumber
    };

    await firstValueFrom(
      this.inventoryService.updateStock(this.productId!, request)
    );
  }

  private async executeAdjust(batch: ProductBatch, formData: any): Promise<void> {
    const request: StockUpdateRequest = {
      mutationType: MutationType.Adjustment,
      quantity: parseInt(formData.quantity),
      notes: `Adjustment: ${formData.notes}`,
      referenceNumber: formData.referenceNumber
    };

    await firstValueFrom(
      this.inventoryService.updateStock(this.productId!, request)
    );
  }

  // ✅ UI HELPER METHODS

  resetOperation(): void {
    this._selectedBatch.set(null);
    this._operationType.set(null);
    this.operationForm.reset();
  }

  private async refreshData(): Promise<void> {
    await this.loadProductData();
  }

  getBatchStatusClass(batch: ProductBatch): string {
    return `status-${batch.status.toLowerCase()}`;
  }

  getBatchStatusIcon(batch: ProductBatch): string {
    const icons = {
      'Good': '✅',
      'Warning': '⚠️', 
      'Critical': '🚨',
      'Expired': '❌'
    };
    return icons[batch.status as keyof typeof icons] || '📦';
  }

  formatExpiryInfo(batch: ProductBatch): string {
    if (!batch.expiryDate) return 'No expiry date';
    
    const date = new Date(batch.expiryDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `${diffDays} days left`;
  }

  formatCurrency(amount: number | undefined | null): string {
    const safeAmount = amount ?? 0;
    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(safeAmount);
    } catch (error) {
      console.warn('⚠️ formatCurrency error:', error, 'amount:', amount);
      return `Rp ${safeAmount.toLocaleString()}`;
    }
  }

  formatStock(amount: number | undefined | null, unit: string | undefined | null): string {
    const safeAmount = amount ?? 0;
    const safeUnit = unit ?? '';
    try {
      return `${safeAmount.toLocaleString('id-ID')} ${safeUnit}`.trim();
    } catch (error) {
      console.warn('⚠️ formatStock error:', error, 'amount:', amount, 'unit:', unit);
      return `${safeAmount} ${safeUnit}`.trim();
    }
  }

  // ✅ TEMPLATE HELPER METHODS (to avoid arrow functions in templates)
  
  getOperationLabel(): string {
    const operationType = this._operationType();
    if (!operationType) return '';
    const operation = this.batchOperations.find(op => op.type === operationType);
    return operation?.label || '';
  }

  getOperationIcon(): string {
    const operationType = this._operationType();
    if (!operationType) return '';
    const operation = this.batchOperations.find(op => op.type === operationType);
    return operation?.icon || '';
  }

  private mapBatchStatus(batchStatus: any, expiryDate?: string): 'Good' | 'Warning' | 'Critical' | 'Expired' {
    // If batch is disposed or blocked, consider as expired
    if (batchStatus === 'DISPOSED' || batchStatus === 'EXPIRED' || batchStatus === 'BLOCKED') {
      return 'Expired';
    }

    // If no expiry date, consider as good
    if (!expiryDate) {
      return 'Good';
    }

    // Calculate days to expiry
    const daysToExpiry = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (daysToExpiry < 0) return 'Expired';
    if (daysToExpiry <= 3) return 'Critical';
    if (daysToExpiry <= 7) return 'Warning';
    return 'Good';
  }

  // ✅ TRACK BY METHODS

  trackByBatch = (index: number, batch: ProductBatch): number => batch.id;

  // ✅ VALIDATION METHODS

  getFieldError(fieldName: string): string {
    const control = this.operationForm.get(fieldName);
    if (!control?.errors || !control.touched) return '';

    const errors = control.errors;
    if (errors['required']) return `${fieldName} is required`;
    if (errors['min']) return `Minimum value is ${errors['min'].min}`;
    if (errors['max']) return `Maximum value is ${errors['max'].max}`;
    if (errors['maxlength']) return `Maximum length is ${errors['maxlength'].requiredLength}`;
    
    return 'Invalid value';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.operationForm.get(fieldName);
    return !!(control?.errors && control.touched);
  }

  // ✅ NAVIGATION METHODS

  goBack(): void {
    this.router.navigate(['/dashboard/inventory']);
  }

  editProduct(): void {
    this.router.navigate(['/dashboard/inventory/edit', this.productId]);
  }

  // ✅ NOTIFICATION METHODS

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }
}