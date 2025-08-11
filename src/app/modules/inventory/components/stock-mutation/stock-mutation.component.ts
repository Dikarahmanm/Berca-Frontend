import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { Product, InventoryMutation, StockUpdateRequest, MutationType } from '../../interfaces/inventory.interfaces';

@Component({
  selector: 'app-stock-mutation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    SlicePipe,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './stock-mutation.component.html',
  styleUrls: ['./stock-mutation.component.scss']
})
export class StockMutationComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Product information
  product: Product | null = null;
  productId: number | null = null;
  
  // Forms
  stockForm!: FormGroup;
  historyFilterForm!: FormGroup;
  
  // Data & UI state
  mutationHistory = new MatTableDataSource<InventoryMutation>([]);
  historyColumns = ['date', 'type', 'quantity', 'stockBefore', 'stockAfter', 'notes', 'createdBy'];
  
  loading = false;
  saving = false;
  loadingHistory = false;
  selectedTab: 'update' | 'history' = 'update';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  
  // Mutation types for dropdown
  mutationTypes = [
    { value: MutationType.StockIn, label: 'Stock In', icon: 'add_circle', color: '#4BBF7B' },
    { value: MutationType.StockOut, label: 'Stock Out', icon: 'remove_circle', color: '#E15A4F' },
    { value: MutationType.Adjustment, label: 'Adjustment', icon: 'tune', color: '#FFB84D' },
    { value: MutationType.Transfer, label: 'Transfer', icon: 'swap_horiz', color: '#FF914D' },
    { value: MutationType.Damaged, label: 'Damaged', icon: 'broken_image', color: '#E15A4F' },
    { value: MutationType.Expired, label: 'Expired', icon: 'schedule', color: '#E15A4F' }
  ];
  
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.getProductId();
    this.initializeForms();
    this.loadProduct();
    this.loadHistory();
    this.updatePagination();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== COMPUTED PROPERTIES =====
  
  get selectedMutationType() {
    const type = this.stockForm?.get('type')?.value;
    return this.mutationTypes.find(t => t.value === type) || this.mutationTypes[0];
  }

  get isStockOutType(): boolean {
    const type = this.stockForm?.get('type')?.value;
    return type === MutationType.StockOut || type === MutationType.Damaged || type === MutationType.Expired;
  }

  get canSubmit(): boolean {
    return this.stockForm?.valid && !this.saving;
  }

get historyDataSource() {
  return this.mutationHistory;
}

  get currentStockStatus(): string {
    if (!this.product) return '';
    
    const stock = this.product.stock;
    const minStock = this.product.minimumStock;
    
    if (stock === 0) return 'Out of Stock';
    if (stock <= minStock) return 'Low Stock';
    if (stock <= minStock * 2) return 'Medium Stock';
    return 'Good Stock';
  }

  get maxQuantityAllowed(): number {
    if (!this.product) return 1;
    return this.product.stock; // Max adalah stock yang tersedia
  }

  // ===== CUSTOM VALIDATORS =====

  private quantityValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value && control.value !== 0) {
      return { required: true };
    }

    const quantity = Number(control.value);
    
    if (isNaN(quantity)) {
      return { invalidNumber: true };
    }

    if (quantity === 0) {
      return { cannotBeZero: true };
    }

    // Jika quantity negatif, pastikan tidak melebihi stock yang tersedia
    if (quantity < 0 && this.product) {
      const absQuantity = Math.abs(quantity);
      if (absQuantity > this.product.stock) {
        return { exceedsStock: { max: this.product.stock, actual: absQuantity } };
      }
    }

    return null;
  };
  // ===== TAB MANAGEMENT =====
setActiveTab(tab: 'update' | 'history'): void {
  this.selectedTab = tab;
  
  if (tab === 'history') {
    this.loadHistory();
  }
  }
  // ===== PAGINATION METHODS =====
updatePagination(): void {
  const totalItems = this.mutationHistory.data.length;
  this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
  
  // Ensure current page is within valid range
  if (this.currentPage > this.totalPages) {
    this.currentPage = Math.max(1, this.totalPages);
  }
}
getPaginatedData(): any[] {
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = startIndex + this.itemsPerPage;
  return this.mutationHistory.data.slice(startIndex, endIndex);
}

previousPage(): void {
  if (this.currentPage > 1) {
    this.currentPage--;
  }
}

nextPage(): void {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
  }
}
  // ===== FORM INITIALIZATION =====

  private initializeForms(): void {
    this.stockForm = this.fb.group({
      type: [MutationType.StockIn, [Validators.required]],
      quantity: [1, [this.quantityValidator]],
      notes: ['', [Validators.required, Validators.maxLength(500)]],
      referenceNumber: ['', [Validators.maxLength(50)]],
      unitCost: [0, [Validators.min(0)]]
    });

    this.historyFilterForm = this.fb.group({
      startDate: [null],
      endDate: [null],
      type: ['']
    });

    this.subscriptions.add(
      this.stockForm.get('type')?.valueChanges.subscribe(type => {
        this.updateFormValidation(type);
      })
    );

    this.subscriptions.add(
      this.historyFilterForm.valueChanges.subscribe(() => {
        this.loadHistory();
      })
    );
    this.subscriptions.add(
  this.historyFilterForm.valueChanges.subscribe(() => {
    this.currentPage = 1; // Reset to first page when filters change
    this.loadHistory();
  })
);
  }

  private updateFormValidation(type: MutationType): void {
    const quantityControl = this.stockForm.get('quantity');
    const unitCostControl = this.stockForm.get('unitCost');
    
    // Update quantity validator dengan custom validator
    quantityControl?.setValidators([this.quantityValidator]);
    
    if (type === MutationType.StockIn) {
      unitCostControl?.setValidators([
        Validators.required,
        Validators.min(0)
      ]);
    } else {
      unitCostControl?.setValidators([Validators.min(0)]);
    }
    
    quantityControl?.updateValueAndValidity();
    unitCostControl?.updateValueAndValidity();
  }

  private getProductId(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productId = parseInt(id, 10);
    }
  }

  // ===== DATA LOADING =====

  private loadProduct(): void {
    if (!this.productId) {
      this.showError('Invalid product ID');
      this.goBack();
      return;
    }
    
    this.loading = true;
    this.subscriptions.add(
      this.inventoryService.getProduct(this.productId).subscribe({
        next: (product) => {
          this.product = product;
          this.loading = false;
          // Re-validate quantity after product is loaded
          this.stockForm.get('quantity')?.updateValueAndValidity();
        },
        error: (error) => {
          this.showError('Failed to load product: ' + error.message);
          this.loading = false;
          this.goBack();
        }
      })
    );
  }

  private loadHistory(): void {
  if (!this.productId) return;
  
  this.loadingHistory = true;
  const filterValues = this.historyFilterForm.value;
  
  this.subscriptions.add(
    this.inventoryService.getInventoryHistory(
      this.productId,
      filterValues.startDate,
      filterValues.endDate
    ).subscribe({
      next: (history) => {
        let filteredHistory = history;
        if (filterValues.type) {
          filteredHistory = history.filter(h => h.type === filterValues.type);
        }
        
        this.mutationHistory.data = filteredHistory;
        this.updatePagination(); // Add pagination update
        this.loadingHistory = false;
      },
      error: (error) => {
        this.showError('Failed to load inventory history: ' + error.message);
        this.loadingHistory = false;
      }
    })
  );
}

  // ===== FORM SUBMISSION =====

  onSubmitStockUpdate(): void {
    if (this.stockForm.invalid) {
      this.markFormGroupTouched();
      return;
    }
    if (!this.productId) {
      this.showError('Invalid product ID');
      return;
    }
    
    this.saving = true;
    const formData = this.stockForm.value;
    let quantity = Number(formData.quantity);

    if (isNaN(quantity)) {
      this.showError('Quantity must be a number');
      this.saving = false;
      return;
    }

    if (quantity === 0) {
      this.showError('Quantity cannot be zero');
      this.saving = false;
      return;
    }

    // Enforce correct sign for quantity based on mutation type
    const outTypes = [MutationType.StockOut, MutationType.Sale, MutationType.Damaged, MutationType.Expired];
    const inTypes = [MutationType.StockIn, MutationType.Return, MutationType.Adjustment, MutationType.Transfer];
    let mutationType = formData.type;
    // If mutationType is a number (shouldn't be, but just in case), convert to string
    if (typeof mutationType === 'number' && this.mutationTypes) {
      const found = this.mutationTypes.find(t => t.value === mutationType);
      if (found) mutationType = found.label.replace(/ /g, '');
    }

    if (outTypes.includes(mutationType)) {
      quantity = -Math.abs(quantity);
    } else if (inTypes.includes(mutationType)) {
      quantity = Math.abs(quantity);
    }

    // Validasi tambahan untuk quantity negatif (stock out)
    if (quantity < 0 && this.product) {
      const absQuantity = Math.abs(quantity);
      if (absQuantity > this.product.stock) {
        this.showError(`Cannot reduce stock by ${absQuantity}. Available stock: ${this.product.stock}`);
        this.saving = false;
        return;
      }
    }

    const request: StockUpdateRequest = {
      mutationType: mutationType,
      quantity,
      notes: formData.notes.trim(),
      referenceNumber: formData.referenceNumber?.trim() || undefined,
      unitCost: formData.unitCost && formData.unitCost > 0 ? parseFloat(formData.unitCost) : undefined
    };

    this.subscriptions.add(
      this.inventoryService.updateStock(this.productId, request).subscribe({
        next: () => {
          this.showSuccess('Stock updated successfully');
          this.resetForm();
          this.loadProduct();
          this.loadHistory();
          this.saving = false;
        },
        error: (err) => {
          this.showError('Failed to update stock');
          this.saving = false;
        }
      })
    );
  }

  resetForm(): void {
    this.stockForm.reset({
      type: MutationType.StockIn,
      quantity: 1,
      notes: '',
      referenceNumber: '',
      unitCost: 0
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.stockForm.controls).forEach(key => {
      const control = this.stockForm.get(key);
      control?.markAsTouched();
    });
  }

  // ===== TAB CHANGES =====

  onTabChange(event: any): void {
    if (event.index === 1) {
      this.loadHistory();
    }
  }

  // ===== UTILITY METHODS =====

  getMutationTypeIcon(type: string): string {
    const typeInfo = this.mutationTypes.find(t => t.value === type);
    return typeInfo?.icon || 'help';
  }

  getMutationTypeColor(type: string): string {
    const typeInfo = this.mutationTypes.find(t => t.value === type);
    return typeInfo?.color || '#666666';
  }

  getMutationTypeLabel(type: string): string {
    const typeInfo = this.mutationTypes.find(t => t.value === type);
    return typeInfo?.label || type;
  }

  // Helper method untuk menghitung actual quantity change berdasarkan before/after
  getActualQuantityChange(mutation: InventoryMutation): number {
    return mutation.stockAfter - mutation.stockBefore;
  }

  // Helper method untuk format quantity dengan tanda yang benar
  formatQuantityChange(mutation: InventoryMutation): string {
    const actualChange = this.getActualQuantityChange(mutation);
    const sign = actualChange > 0 ? '+' : '';
    return `${sign}${this.formatNumber(actualChange)}`;
  }

  getStockStatusColor(product: Product): string {
    if (product.stock === 0) return '#E15A4F';
    if (product.stock <= product.minimumStock) return '#FF914D';
    if (product.stock <= product.minimumStock * 2) return '#FFB84D';
    return '#4BBF7B';
  }

  getNewStockColor(): string {
    if (!this.product || !this.stockForm?.valid) return '#666';
    
    const newStock = this.getNewStockPreview();

    if (newStock <= 0) return '#E15A4F';
    if (newStock <= this.product.minimumStock) return '#FFB84D';
    return '#4BBF7B';
  }

  getNewStockPreview(): number {
    if (!this.product) return 0;
    
    const currentStock = this.product.stock;
    const quantity = parseInt(this.stockForm.get('quantity')?.value) || 0;
    
    // Jika quantity negatif, kurangi dari stock
    // Jika quantity positif, tambah ke stock
    const newStock = currentStock + quantity;
    
    return Math.max(0, newStock);
  }

  getTotalCostPreview(): number {
    if (!this.stockForm?.valid) return 0;
    
    const quantity = Math.abs(parseInt(this.stockForm.get('quantity')?.value) || 0);
    const unitCost = parseFloat(this.stockForm.get('unitCost')?.value) || 0;
    
    return quantity * unitCost;
  }

  // ===== QUICK ACTIONS =====

  quickStockIn(amount: number): void {
    this.stockForm.patchValue({
      type: MutationType.StockIn,
      quantity: amount,
      notes: `Quick stock in - ${amount} units`
    });
  }

  quickStockOut(amount: number): void {
    if (!this.product || this.product.stock < amount) {
      this.showError(`Cannot reduce stock by ${amount}. Available stock: ${this.product?.stock || 0}`);
      return;
    }
    
    this.stockForm.patchValue({
      type: MutationType.StockOut,
      quantity: -amount, // Gunakan nilai negatif
      notes: `Quick stock out - ${amount} units`
    });
    this.onSubmitStockUpdate();
  }

  quickAdjustment(): void {
    this.stockForm.patchValue({
      type: MutationType.Adjustment,
      notes: 'Stock count adjustment'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    }).format(new Date(date));
  }

  // ===== FORM VALIDATION HELPERS =====

  getFieldError(fieldName: string): string {
    const control = this.stockForm.get(fieldName);
    if (control?.errors && control.touched) {
      const errors = control.errors;
      
      if (errors['required']) return `${fieldName} is required`;
      if (errors['invalidNumber']) return `${fieldName} must be a valid number`;
      if (errors['cannotBeZero']) return `${fieldName} cannot be zero`;
      if (errors['exceedsStock']) {
        return `Cannot reduce stock by ${errors['exceedsStock'].actual}. Available stock: ${errors['exceedsStock'].max}`;
      }
      if (errors['min']) return `${fieldName} must be greater than ${errors['min'].min}`;
      if (errors['max']) return `${fieldName} cannot exceed ${errors['max'].max}`;
      if (errors['maxlength']) return `${fieldName} is too long`;
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.stockForm.get(fieldName);
    return !!(control?.errors && control.touched);
  }

  // ===== NAVIGATION =====

  goBack(): void {
    this.router.navigate(['/dashboard/inventory']);
  }

  editProduct(): void {
    this.router.navigate(['/dashboard/inventory/edit', this.productId]);
  }

  // ===== NOTIFICATIONS =====

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
}