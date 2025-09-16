import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs';

import { InventoryTransferService } from '../../../core/services/inventory-transfer.service';
import { BranchService } from '../../../core/services/branch.service';
import { ProductService, Product } from '../../../core/services/product.service';

import {
  CreateInventoryTransferRequestDto,
  CreateTransferItemDto,
  TransferPriority,
  TransferType,
  AvailableSourceDto
} from '../../../core/models/inventory-transfer.models';
import { Branch } from '../../../core/models/branch.models';

export interface TransferCreationDialogData {
  mode?: 'create' | 'emergency';
  preselectedProduct?: Product;
  preselectedDestination?: Branch;
  preselectedQuantity?: number;
}

@Component({
  selector: 'app-transfer-creation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './transfer-creation-dialog.component.html',
  styleUrls: ['./transfer-creation-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransferCreationDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private transferService = inject(InventoryTransferService);
  private branchService = inject(BranchService);
  private productService = inject(ProductService);
  private dialogRef = inject(MatDialogRef<TransferCreationDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as TransferCreationDialogData;
  private fb = inject(FormBuilder);
  // Note: Removed MatSnackBar dependency - will use custom notifications

  // Signals for reactive state
  loading = signal<boolean>(false);
  calculating = signal<boolean>(false);
  branches = signal<Branch[]>([]);
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  availableSources = signal<AvailableSourceDto[]>([]);
  estimatedCost = signal<number>(0);
  estimatedDelivery = signal<Date | null>(null);
  showProductDropdown: boolean[] = [];

  // Signal for form items to trigger reactivity
  formItemsChange = signal<number>(0);

  // Debounce calculation to prevent multiple calls
  private lastCalculationTime = 0;

  // Form
  transferForm!: FormGroup;

  // Priority enum
  TransferPriority = TransferPriority;

  // Table columns for items
  displayedColumns = ['product', 'quantity', 'availableStock', 'actions'];

  // Computed values
  totalItems = computed(() => {
    this.formItemsChange(); // Subscribe to changes
    return this.transferItemsArray?.length || 0;
  });
  totalQuantity = computed(() => {
    this.formItemsChange(); // Subscribe to changes
    if (!this.transferItemsArray) return 0;
    return this.transferItemsArray.controls.reduce((sum, control) =>
      sum + (control.get('quantity')?.value || 0), 0
    );
  });

  get transferItemsArray() {
    return this.transferForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadInitialData();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.transferForm = this.fb.group({
      sourceBranchId: [null, Validators.required],
      destinationBranchId: [this.data?.preselectedDestination?.id || null, Validators.required],
      priority: [this.data?.mode === 'emergency' ? TransferPriority.Emergency : TransferPriority.Normal, Validators.required],
      estimatedDeliveryDate: [null],
      notes: [''],
      items: this.fb.array([])
    });

    // Add initial item if preselected
    if (this.data?.preselectedProduct) {
      this.addTransferItem(this.data.preselectedProduct, this.data.preselectedQuantity || 1);
    }
  }

  private loadInitialData(): void {
    // Load branches
    this.branchService.getBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branches: any) => this.branches.set(branches),
        error: (error: any) => this.handleError('Failed to load branches', error)
      });

    // Load products
    this.productService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          const products = result.data?.products || [];
          this.products.set(products);
          this.filteredProducts.set(products);
        },
        error: (error: any) => this.handleError('Failed to load products', error)
      });
  }

  private setupFormSubscriptions(): void {
    // Watch source and destination changes to calculate costs
    const sourceBranch = this.transferForm.get('sourceBranchId');
    const destinationBranch = this.transferForm.get('destinationBranchId');

    if (sourceBranch && destinationBranch) {
      sourceBranch.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(() => this.calculateEstimates());

      destinationBranch.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(() => this.calculateEstimates());
    }

    // Watch items changes
    this.transferItemsArray.valueChanges
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Trigger reactivity for computed values
        this.formItemsChange.set(this.formItemsChange() + 1);
        this.calculateEstimates();
      });
  }

  private calculateEstimates(): void {
    const now = Date.now();

    // Debounce: prevent calls within 1 second of each other
    if (now - this.lastCalculationTime < 1000) {
      return;
    }
    this.lastCalculationTime = now;

    const sourceBranchId = this.transferForm.get('sourceBranchId')?.value;
    const destinationBranchId = this.transferForm.get('destinationBranchId')?.value;
    const priority = this.transferForm.get('priority')?.value;
    const items = this.transferItemsArray.value;

    // Validate required fields
    if (!sourceBranchId || !destinationBranchId) {
      this.estimatedCost.set(0);
      this.estimatedDelivery.set(null);
      return;
    }

    // Check if we have valid items with productId and quantity
    const validItems = items.filter((item: any) =>
      item.productId && item.quantity && item.quantity > 0
    );

    if (validItems.length === 0) {
      this.estimatedCost.set(0);
      this.estimatedDelivery.set(null);
      return;
    }

    // Prevent multiple simultaneous calculations
    if (this.calculating()) {
      return;
    }

    this.calculating.set(true);

    // Calculate cost only if we have valid items
    const transferItems: CreateTransferItemDto[] = validItems.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
      qualityNotes: item.notes || ''
    }));

    // Calculate cost locally based on selected items
    const localCost = this.calculateLocalCost(validItems);
    this.estimatedCost.set(localCost);

    // Skip delivery date estimation for now to avoid API errors
    // this.transferService.estimateDeliveryDate(sourceBranchId, destinationBranchId, priority)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (date) => this.estimatedDelivery.set(date),
    //     error: (error) => {
    //       console.error('Failed to estimate delivery date:', error);
    //       this.estimatedDelivery.set(null);
    //     }
    //   });

    // Set a default estimated delivery (3 days from now)
    const defaultDeliveryDate = new Date();
    defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 3);
    this.estimatedDelivery.set(defaultDeliveryDate);

    this.calculating.set(false);
  }

  // Product selection methods
  public filterProducts(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredProducts.set(this.products());
      return;
    }

    const filtered = this.products().filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
    );
    this.filteredProducts.set(filtered);
  }

  displayProductFn(product: any): string {
    if (typeof product === 'string') {
      return product;
    }
    return product ? `${product.name} (${product.barcode})` : '';
  }

  getProductDisplayName(product: Product): string {
    return `${product.name} (${product.barcode})`;
  }

  // Transfer item management
  public addTransferItem(product?: Product, quantity: number = 1): void {
    const itemForm = this.fb.group({
      productId: [product?.id || null, Validators.required],
      productName: [product ? this.getProductDisplayName(product) : '', Validators.required],
      productBarcode: [product?.barcode || ''],
      quantity: [quantity, [Validators.required, Validators.min(1)]],
      availableStock: [product?.stock || 0],
      notes: ['']
    });

    this.transferItemsArray.push(itemForm);
    // Initialize dropdown state for new item
    this.showProductDropdown[this.transferItemsArray.length - 1] = false;
    // Trigger reactivity
    this.formItemsChange.set(this.formItemsChange() + 1);

    console.log('📝 Added transfer item:', {
      productId: product?.id,
      productName: product?.name,
      quantity: quantity,
      totalItems: this.transferItemsArray.length
    });
  }

  public removeTransferItem(index: number): void {
    this.transferItemsArray.removeAt(index);
    // Remove dropdown state for this item
    this.showProductDropdown.splice(index, 1);
    // Trigger reactivity
    this.formItemsChange.set(this.formItemsChange() + 1);
    this.calculateEstimates();
  }

  public onProductSelected(product: Product, index: number): void {
    const itemControl = this.transferItemsArray.at(index);
    if (itemControl) {
      itemControl.patchValue({
        productId: product.id,
        productName: this.getProductDisplayName(product),
        productBarcode: product.barcode,
        availableStock: product.stock
      });
      this.calculateEstimates();
    }
  }

  // Available sources
  public checkAvailableSources(productId: number, requiredQuantity: number): void {
    const destinationBranchId = this.transferForm.get('destinationBranchId')?.value;

    if (!destinationBranchId) {
      this.showMessage('Please select destination branch first');
      return;
    }

    this.transferService.getAvailableSourceBranches(productId, destinationBranchId, requiredQuantity)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sources) => {
          this.availableSources.set(sources);
          if (sources.length > 0) {
            // Auto-select the best source branch
            const bestSource = sources[0];
            this.transferForm.patchValue({
              sourceBranchId: bestSource.branchId
            });
          }
        },
        error: (error) => this.handleError('Failed to check available sources', error)
      });
  }

  // Form submission
  public onSubmit(): void {
    if (this.transferForm.invalid) {
      this.markFormGroupTouched(this.transferForm);
      const errors = this.getFormValidationErrors();
      this.showMessage(`Please fix the following errors: ${errors.join(', ')}`, 'error');
      return;
    }

    if (this.transferItemsArray.length === 0) {
      this.showMessage('Please add at least one item to transfer', 'error');
      return;
    }

    // Additional business logic validation
    const formValue = this.transferForm.value;
    if (formValue.sourceBranchId === formValue.destinationBranchId) {
      this.showMessage('Source and destination branches cannot be the same', 'error');
      return;
    }

    // Validate transfer items
    const invalidItems = this.transferItemsArray.controls.filter(control => {
      const item = control.value;
      return !item.productId || !item.quantity || item.quantity <= 0;
    });

    if (invalidItems.length > 0) {
      this.showMessage('All transfer items must have valid products and quantities greater than 0', 'error');
      return;
    }

    // Filter only valid items for transfer
    const validTransferItems = formValue.items
      .filter((item: any) => {
        const hasValidProduct = item.productId && !isNaN(parseInt(item.productId.toString()));
        const hasValidQuantity = item.quantity && !isNaN(parseInt(item.quantity.toString())) && item.quantity > 0;
        return hasValidProduct && hasValidQuantity;
      })
      .map((item: any) => ({
        productId: parseInt(item.productId.toString()),
        quantity: parseInt(item.quantity.toString()),
        qualityNotes: item.notes || ''
      }));

    if (validTransferItems.length === 0) {
      this.showMessage('Please add at least one valid item with product and quantity', 'error');
      return;
    }

    // Prepare estimated delivery date properly
    let estimatedDeliveryDate: Date | undefined = undefined;
    if (formValue.estimatedDeliveryDate) {
      // Convert to Date object if date is provided
      estimatedDeliveryDate = new Date(formValue.estimatedDeliveryDate);
    } else if (this.estimatedDelivery()) {
      // Use calculated delivery date
      estimatedDeliveryDate = this.estimatedDelivery()!;
    }

    const transferRequest: CreateInventoryTransferRequestDto = {
      sourceBranchId: parseInt(formValue.sourceBranchId.toString()),
      destinationBranchId: parseInt(formValue.destinationBranchId.toString()),
      type: this.data?.mode === 'emergency' ? TransferType.Emergency : TransferType.Regular,
      priority: parseInt(formValue.priority.toString()),
      requestReason: `Transfer request from ${this.getBranchName(formValue.sourceBranchId)} to ${this.getBranchName(formValue.destinationBranchId)}`,
      notes: formValue.notes || '',
      estimatedCost: this.estimatedCost() || 0,
      estimatedDeliveryDate: estimatedDeliveryDate,
      transferItems: validTransferItems
    };

    // Debug: Log the request data
    console.log('🔍 Transfer Request Data:', JSON.stringify(transferRequest, null, 2));

    this.loading.set(true);

    this.transferService.createTransferRequest(transferRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transfer) => {
          this.loading.set(false);
          this.showMessage(`Transfer created successfully: ${transfer.transferNumber}`, 'success');
          this.dialogRef.close(transfer);
        },
        error: (error) => {
          this.loading.set(false);
          console.error('🚨 Transfer Creation Error:', error);
          console.error('🚨 Error Details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
          this.handleError('Failed to create transfer', error);
        }
      });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  // Utility methods
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private getFormValidationErrors(): string[] {
    const errors: string[] = [];
    Object.keys(this.transferForm.controls).forEach(key => {
      const control = this.transferForm.get(key);
      if (control && control.invalid && control.touched) {
        if (control.errors?.['required']) {
          errors.push(`${this.getFieldLabel(key)} is required`);
        }
        if (control.errors?.['min']) {
          errors.push(`${this.getFieldLabel(key)} must be greater than ${control.errors['min'].min}`);
        }
        if (control.errors?.['max']) {
          errors.push(`${this.getFieldLabel(key)} must be less than ${control.errors['max'].max}`);
        }
      }
    });
    return errors;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      sourceBranchId: 'Source Branch',
      destinationBranchId: 'Destination Branch',
      priority: 'Priority',
      expectedDeliveryDate: 'Expected Delivery Date',
      notes: 'Notes'
    };
    return labels[fieldName] || fieldName;
  }

  public calculateLocalCost(validItems: any[]): number {
    const availableProducts = this.products();
    let totalCost = 0;

    for (const item of validItems) {
      const product = availableProducts.find(p => p.id === item.productId);
      if (product && item.quantity) {
        // Use buyPrice as the unit cost for transfer estimation
        const unitCost = product.buyPrice || 0;
        const itemTotal = unitCost * item.quantity;
        totalCost += itemTotal;
      }
    }

    console.log('🧮 Local cost calculation:', {
      validItemsCount: validItems.length,
      totalCost: totalCost,
      itemDetails: validItems.map(item => {
        const product = availableProducts.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name,
          quantity: item.quantity,
          unitCost: product?.buyPrice || 0,
          itemTotal: (product?.buyPrice || 0) * item.quantity
        };
      })
    });

    return totalCost;
  }

  public formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  public formatDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }

  public handleError(message: string, error: any): void {
    console.error(message, error);

    // Extract more specific error message if available
    let errorMessage = message;
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.error?.errors && Array.isArray(error.error.errors)) {
      errorMessage = error.error.errors.join(', ');
    } else if (error?.status === 401) {
      errorMessage = 'You are not authorized to perform this action';
    } else if (error?.status === 403) {
      errorMessage = 'Access denied. Check your permissions';
    } else if (error?.status === 404) {
      errorMessage = 'Resource not found';
    } else if (error?.status === 422) {
      errorMessage = 'Validation failed. Please check your input';
    } else if (error?.status === 500) {
      errorMessage = 'Server error. Please try again later';
    } else if (error?.status === 0 || error?.status === undefined) {
      errorMessage = 'Network error. Please check your connection';
    }

    this.showMessage(errorMessage, 'error');
  }

  private getBranchName(branchId: number): string {
    const branch = this.branches().find(b => b.id === branchId);
    return branch ? branch.branchName : 'Unknown Branch';
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (type === 'success') {
      this.showSuccessModal(message);
    } else {
      // For now, use alert for error and info messages
      alert(message);
    }
  }

  private showSuccessModal(message: string): void {
    // Create success modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'success-modal-overlay';

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'success-modal';

    // Close modal function
    const closeModal = () => {
      if (overlay.parentNode) {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
      }
    };

    modal.innerHTML = `
      <div class="success-modal-content">
        <div class="success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#10B981"/>
            <path d="m9 12 2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3 class="success-title">Transfer Created Successfully!</h3>
        <p class="success-message">${message}</p>
        <button class="success-btn" type="button">
          Continue
        </button>
      </div>
    `;

    // Add event listeners
    const continueBtn = modal.querySelector('.success-btn');
    continueBtn?.addEventListener('click', closeModal);

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Escape key to close
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeyPress);
      }
    };
    document.addEventListener('keydown', handleKeyPress);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Auto-remove after 7 seconds
    setTimeout(() => {
      closeModal();
      document.removeEventListener('keydown', handleKeyPress);
    }, 7000);
  }

  // TrackBy functions for performance
  public trackByBranch(index: number, branch: Branch): number {
    return branch.id;
  }

  public trackByProduct(index: number, product: Product): number {
    return product.id;
  }

  public trackByItemIndex(index: number, item: any): number {
    return index;
  }

  public trackBySource(index: number, source: AvailableSourceDto): number {
    return source.branchId;
  }

  // Product dropdown methods
  public toggleProductDropdown(index: number): void {
    this.showProductDropdown[index] = !this.showProductDropdown[index];
    // Close other dropdowns
    this.showProductDropdown.forEach((_, i) => {
      if (i !== index) {
        this.showProductDropdown[i] = false;
      }
    });

    // Position dropdown if shown
    if (this.showProductDropdown[index]) {
      setTimeout(() => this.positionDropdown(index), 0);
    }
  }

  public showProductDropdownAt(index: number): void {
    // Close other dropdowns
    this.showProductDropdown.forEach((_, i) => {
      this.showProductDropdown[i] = (i === index);
    });

    // Position dropdown
    setTimeout(() => this.positionDropdown(index), 0);
  }

  private positionDropdown(index: number): void {
    const inputElement = document.querySelector(`[data-dropdown-index="${index}"]`) as HTMLElement;
    const dropdownElement = document.querySelector(`[data-dropdown-for="${index}"]`) as HTMLElement;

    if (inputElement && dropdownElement) {
      const inputRect = inputElement.getBoundingClientRect();
      dropdownElement.style.position = 'fixed';
      dropdownElement.style.top = `${inputRect.bottom + window.scrollY}px`;
      dropdownElement.style.left = `${inputRect.left + window.scrollX}px`;
      dropdownElement.style.width = `${inputRect.width}px`;
    }
  }

  public hideProductDropdown(index: number): void {
    setTimeout(() => {
      this.showProductDropdown[index] = false;
    }, 200); // Delay to allow click on option
  }

  public selectProduct(product: Product, index: number): void {
    this.onProductSelected(product, index);
    this.showProductDropdown[index] = false;
  }
}