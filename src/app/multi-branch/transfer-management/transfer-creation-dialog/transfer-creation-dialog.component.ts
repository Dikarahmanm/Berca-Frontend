import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';

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
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatChipsModule
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
  private snackBar = inject(MatSnackBar);

  // Signals for reactive state
  loading = signal<boolean>(false);
  calculating = signal<boolean>(false);
  branches = signal<Branch[]>([]);
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  availableSources = signal<AvailableSourceDto[]>([]);
  estimatedCost = signal<number>(0);
  estimatedDelivery = signal<Date | null>(null);

  // Form
  transferForm!: FormGroup;

  // Priority enum
  TransferPriority = TransferPriority;

  // Table columns for items
  displayedColumns = ['product', 'quantity', 'availableStock', 'actions'];

  // Computed values
  totalItems = computed(() => this.transferItemsArray.length);
  totalQuantity = computed(() =>
    this.transferItemsArray.controls.reduce((sum, control) =>
      sum + (control.get('quantity')?.value || 0), 0
    )
  );

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
      .subscribe(() => this.calculateEstimates());
  }

  private calculateEstimates(): void {
    const sourceBranchId = this.transferForm.get('sourceBranchId')?.value;
    const destinationBranchId = this.transferForm.get('destinationBranchId')?.value;
    const priority = this.transferForm.get('priority')?.value;
    const items = this.transferItemsArray.value;

    if (!sourceBranchId || !destinationBranchId || items.length === 0) {
      this.estimatedCost.set(0);
      this.estimatedDelivery.set(null);
      return;
    }

    this.calculating.set(true);

    // Calculate cost
    const transferItems: CreateTransferItemDto[] = items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
      qualityNotes: item.notes || ''
    }));

    this.transferService.calculateTransferCost(sourceBranchId, destinationBranchId, transferItems)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cost) => {
          this.estimatedCost.set(cost);
          this.calculating.set(false);
        },
        error: (error) => {
          this.handleError('Failed to calculate transfer cost', error);
          this.calculating.set(false);
        }
      });

    // Estimate delivery date
    this.transferService.estimateDeliveryDate(sourceBranchId, destinationBranchId, priority)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (date) => this.estimatedDelivery.set(date),
        error: (error) => console.error('Failed to estimate delivery date:', error)
      });
  }

  // Product selection methods
  filterProducts(searchTerm: string): void {
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
  addTransferItem(product?: Product, quantity: number = 1): void {
    const itemForm = this.fb.group({
      productId: [product?.id || null, Validators.required],
      productName: [product?.name || ''],
      productBarcode: [product?.barcode || ''],
      quantity: [quantity, [Validators.required, Validators.min(1)]],
      availableStock: [product?.stock || 0],
      notes: ['']
    });

    this.transferItemsArray.push(itemForm);
  }

  removeTransferItem(index: number): void {
    this.transferItemsArray.removeAt(index);
    this.calculateEstimates();
  }

  onProductSelected(product: Product, index: number): void {
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
  checkAvailableSources(productId: number, requiredQuantity: number): void {
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
  onSubmit(): void {
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

    const transferRequest: CreateInventoryTransferRequestDto = {
      sourceBranchId: formValue.sourceBranchId,
      destinationBranchId: formValue.destinationBranchId,
      type: this.data?.mode === 'emergency' ? TransferType.Emergency : TransferType.Regular,
      priority: formValue.priority,
      requestReason: `Transfer request from ${this.getBranchName(formValue.sourceBranchId)} to ${this.getBranchName(formValue.destinationBranchId)}`,
      notes: formValue.notes || '',
      estimatedCost: this.estimatedCost(),
      estimatedDeliveryDate: formValue.estimatedDeliveryDate,
      transferItems: formValue.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        expiryDate: item.expiryDate,
        batchNumber: item.batchNumber || '',
        qualityNotes: item.notes || ''
      }))
    };

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
          this.handleError('Failed to create transfer', error);
        }
      });
  }

  onCancel(): void {
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }

  private handleError(message: string, error: any): void {
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
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: [`snackbar-${type}`]
    });
  }
}