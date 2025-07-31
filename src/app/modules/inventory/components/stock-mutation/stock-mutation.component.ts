// ===== STOCK MUTATION COMPONENT =====
// src/app/modules/inventory/components/stock-mutation/stock-mutation.component.ts

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';

// Services & Interfaces
import { InventoryService } from '../../services/inventory.service';
import { Product, InventoryMutation, StockUpdateRequest, MutationType } from '../../interfaces/inventory.interfaces';

@Component({
  selector: 'app-stock-mutation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
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
  
  // Data sources
  historyDataSource = new MatTableDataSource<InventoryMutation>([]);
  historyColumns: string[] = ['date', 'type', 'quantity', 'stockBefore', 'stockAfter', 'notes', 'reference', 'createdBy'];
  
  // State management
  loading = false;
  saving = false;
  loadingHistory = false;
  
  // Mutation types
  mutationTypes = [
    { value: MutationType.StockIn, label: 'Stock In', icon: 'add_circle', color: '#4BBF7B' },
    { value: MutationType.StockOut, label: 'Stock Out', icon: 'remove_circle', color: '#E15A4F' },
    { value: MutationType.Adjustment, label: 'Adjustment', icon: 'tune', color: '#FFB84D' },
    { value: MutationType.Damaged, label: 'Damaged', icon: 'broken_image', color: '#E15A4F' },
    { value: MutationType.Expired, label: 'Expired', icon: 'schedule', color: '#FF914D' },
    { value: MutationType.Return, label: 'Return', icon: 'undo', color: '#4BBF7B' }
  ];
  
  // Tabs
  selectedTabIndex = 0;
  
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.getProductId();
    this.loadProduct();
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== INITIALIZATION =====

  private initializeForms(): void {
    this.stockForm = this.fb.group({
      type: [MutationType.StockIn, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      notes: ['', [Validators.required, Validators.maxLength(500)]],
      referenceNumber: [''],
      unitCost: [0, [Validators.min(0)]]
    });

    this.historyFilterForm = this.fb.group({
      startDate: [null],
      endDate: [null],
      type: ['']
    });

    // Watch type changes to update form validation
    this.subscriptions.add(
      this.stockForm.get('type')?.valueChanges.subscribe(type => {
        this.updateFormValidation(type);
      })
    );

    // Watch history filter changes
    this.subscriptions.add(
      this.historyFilterForm.valueChanges.subscribe(() => {
        this.loadHistory();
      })
    );
  }

  private updateFormValidation(type: MutationType): void {
    const quantityControl = this.stockForm.get('quantity');
    const unitCostControl = this.stockForm.get('unitCost');
    
    if (type === MutationType.StockOut) {
      // For stock out, quantity should not exceed current stock
      const maxStock = this.product?.stock || 0;
      quantityControl?.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(maxStock)
      ]);
    } else {
      quantityControl?.setValidators([
        Validators.required,
        Validators.min(1)
      ]);
    }
    
    // Unit cost is required for stock in
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
      this.inventoryService.getProductById(this.productId).subscribe({
        next: (product) => {
          this.product = product;
          this.updateFormValidation(this.stockForm.get('type')?.value);
          this.loading = false;
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
          // Filter by type if selected
          let filteredHistory = history;
          if (filterValues.type) {
            filteredHistory = history.filter(h => h.type === filterValues.type);
          }
          
          this.historyDataSource.data = filteredHistory;
          this.loadingHistory = false;
        },
        error: (error) => {
          this.showError('Failed to load history: ' + error.message);
          this.loadingHistory = false;
        }
      })
    );
  }

  // ===== STOCK OPERATIONS =====

  onSubmitStockUpdate(): void {
    if (this.stockForm.invalid || !this.productId) {
      this.markFormGroupTouched();
      this.showError('Please fix the form errors before submitting');
      return;
    }

    this.saving = true;
    const formData = this.stockForm.value;
    
    const request: StockUpdateRequest = {
      quantity: formData.quantity,
      type: formData.type,
      notes: formData.notes,
      referenceNumber: formData.referenceNumber || undefined,
      unitCost: formData.unitCost > 0 ? formData.unitCost : undefined
    };

    this.subscriptions.add(
      this.inventoryService.updateStock(this.productId, request).subscribe({
        next: () => {
          this.showSuccess('Stock updated successfully');
          this.resetForm();
          this.loadProduct(); // Refresh product data
          this.loadHistory(); // Refresh history
          this.saving = false;
        },
        error: (error) => {
          this.showError('Failed to update stock: ' + error.message);
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

  // ===== QUICK ACTIONS =====

  quickStockIn(amount: number): void {
    this.stockForm.patchValue({
      type: MutationType.StockIn,
      quantity: amount,
      notes: `Quick stock in - ${amount} units`
    });
  }

  quickStockOut(amount: number): void {
    const maxAmount = Math.min(amount, this.product?.stock || 0);
    this.stockForm.patchValue({
      type: MutationType.StockOut,
      quantity: maxAmount,
      notes: `Quick stock out - ${maxAmount} units`
    });
  }

  quickAdjustment(): void {
    this.stockForm.patchValue({
      type: MutationType.Adjustment,
      notes: 'Stock count adjustment'
    });
  }

  // ===== UTILITY METHODS =====

  getMutationTypeInfo(type: MutationType) {
    return this.mutationTypes.find(t => t.value === type) || this.mutationTypes[0];
  }

  getMutationTypeLabel(type: string): string {
    const typeInfo = this.mutationTypes.find(t => t.value === type);
    return typeInfo?.label || type;
  }

  getMutationTypeIcon(type: string): string {
    const typeInfo = this.mutationTypes.find(t => t.value === type);
    return typeInfo?.icon || 'help';
  }

  getMutationTypeColor(type: string): string {
    const typeInfo = this.mutationTypes.find(t => t.value === type);
    return typeInfo?.color || '#666666';
  }

  getStockStatusColor(product: Product): string {
    if (product.stock === 0) return '#E15A4F';
    if (product.stock <= product.minimumStock) return '#FF914D';
    if (product.stock <= product.minimumStock * 2) return '#FFB84D';
    return '#4BBF7B';
  }

  getNewStockPreview(): number {
    if (!this.product) return 0;
    
    const currentStock = this.product.stock;
    const quantity = this.stockForm.get('quantity')?.value || 0;
    const type = this.stockForm.get('type')?.value;
    
    if (type === MutationType.StockOut) {
      return Math.max(0, currentStock - quantity);
    } else {
      return currentStock + quantity;
    }
  }

  getNewStockColor(): string {
    if (!this.product) return '#666';
    
    const newStock = this.getNewStockPreview();
    const tempProduct = { ...this.product, stock: newStock };
    return this.getStockStatusColor(tempProduct);
  }

  getTotalCostPreview(): number {
    const quantity = this.stockForm.get('quantity')?.value || 0;
    const unitCost = this.stockForm.get('unitCost')?.value || 0;
    return quantity * unitCost;
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

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // ===== TAB MANAGEMENT =====

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }

  // ===== FORM VALIDATION =====

  isFieldInvalid(fieldName: string): boolean {
    const field = this.stockForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.stockForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be positive`;
      if (field.errors['max']) return `Quantity cannot exceed current stock (${this.product?.stock})`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} is too long`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      type: 'Mutation type',
      quantity: 'Quantity',
      notes: 'Notes',
      referenceNumber: 'Reference number',
      unitCost: 'Unit cost'
    };
    return labels[fieldName] || fieldName;
  }

  // ===== NAVIGATION =====

  goBack(): void {
    this.router.navigate(['/dashboard/inventory']);
  }

  // ===== NOTIFICATION METHODS =====

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // ===== GETTERS FOR TEMPLATE =====

  get canSubmit(): boolean {
    return this.stockForm.valid && !this.saving && !!this.product;
  }

  get currentStockStatus(): string {
    if (!this.product) return 'Unknown';
    if (this.product.stock === 0) return 'Out of Stock';
    if (this.product.stock <= this.product.minimumStock) return 'Low Stock';
    if (this.product.stock <= this.product.minimumStock * 2) return 'Medium Stock';
    return 'Good Stock';
  }

  get selectedMutationType() {
    const type = this.stockForm.get('type')?.value;
    return this.getMutationTypeInfo(type);
  }

  get isStockOutType(): boolean {
    return this.stockForm.get('type')?.value === MutationType.StockOut;
  }

  get maxQuantityAllowed(): number {
    return this.isStockOutType ? (this.product?.stock || 0) : 999999;
  }
}