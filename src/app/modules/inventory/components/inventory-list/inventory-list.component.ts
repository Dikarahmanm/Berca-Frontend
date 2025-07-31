// ===== 5. FRONTEND FIX: Inventory List Component =====
// src/app/modules/inventory/components/inventory-list/inventory-list.component.ts

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { MatDividerModule } from '@angular/material/divider';
import { CategoryService } from '../../../category-management/services/category.service';
import { Product, ProductFilter } from '../../interfaces/inventory.interfaces';
import { Category, CategoryFilter } from '../../../category-management/models/category.models';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    CommonModule,
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
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss']
})
export class InventoryListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data sources
  products = new MatTableDataSource<Product>([]);
  categories: Category[] = [];
  lowStockProducts: Product[] = [];
  
  // Table configuration
  displayedColumns = [
    'image', 'name', 'barcode', 'category', 'stock', 'minimumStock', // ✅ Added minimumStock column
    'buyPrice', 'sellPrice', 'margin', 'status', 'actions'
  ];
  
  // Forms and filters
  filterForm!: FormGroup;
  
  // UI state
  loading = false;
  totalItems = 0;
  pageSize = 25;
  currentPage = 1;
  
  // Stock filter options
  stockFilterOptions = [
    { value: 'all', label: 'All Products' },
    { value: 'inStock', label: 'In Stock' },
    { value: 'lowStock', label: 'Low Stock' },
    { value: 'outOfStock', label: 'Out of Stock' }
  ];
  
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private inventoryService: InventoryService,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeFilterForm();
    this.loadCategories();
    this.loadProducts();
    this.loadLowStockAlerts();
    this.setupFilterWatchers();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      search: [''],
      categoryId: [''],
      isActive: [true],
      stockFilter: ['all'],
      sortBy: ['name'],
      sortOrder: ['asc']
    });
  }

  private setupFilterWatchers(): void {
    // Watch search input with debounce
    this.subscriptions.add(
      this.filterForm.get('search')?.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(() => {
          this.currentPage = 1;
          this.loadProducts();
        })
    );

    // Watch other filters
    this.subscriptions.add(
      this.filterForm.valueChanges.subscribe((value) => {
        // Skip if only search changed (handled above)
        if (this.filterForm.get('search')?.value === value.search) {
          this.currentPage = 1;
          this.loadProducts();
        }
      })
    );
  }

  // ===== DATA LOADING =====

  loadProducts(): void {
    this.loading = true;
    const filterValues = this.filterForm.value;
    
    const filter: ProductFilter = {
      search: filterValues.search || undefined,
      categoryId: filterValues.categoryId || undefined,
      isActive: filterValues.isActive,
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy: filterValues.sortBy,
      sortOrder: filterValues.sortOrder
    };

    // Handle stock filter
    switch (filterValues.stockFilter) {
      case 'lowStock':
        filter.lowStock = true;
        break;
      case 'outOfStock':
        filter.maxStock = 0;
        break;
      case 'inStock':
        filter.minStock = 1;
        break;
    }

    this.subscriptions.add(
      this.inventoryService.getProducts(filter).subscribe({
        next: (response) => {
          this.products.data = response.products.map(product => ({
            ...product,
            // ✅ FIXED: Allow minimumStock = 0, only default to 5 if undefined/null
            minimumStock: typeof product.minimumStock === 'number' ? product.minimumStock : 5,
            // Computed properties
            profitMargin: this.getMarginPercentage(product),
            isLowStock: product.stock <= (typeof product.minimumStock === 'number' ? product.minimumStock : 5),
            isOutOfStock: product.stock === 0
          }));
          
          this.totalItems = response.totalItems;
          this.loading = false;
          
          console.log('📦 Loaded Products:', response);
        },
        error: (error) => {
          this.showError('Failed to load products: ' + error.message);
          this.loading = false;
        }
      })
    );
  }

  private loadCategories(): void {
    const filter: CategoryFilter = {
      page: 1,
      pageSize: 100,
      sortBy: 'name',
      sortOrder: 'asc'
    };

    this.subscriptions.add(
      this.categoryService.getCategories(filter).subscribe({
        next: (response) => {
          this.categories = response.categories;
        },
        error: (error) => {
          console.error('Failed to load categories:', error);
        }
      })
    );
  }

  private loadLowStockAlerts(): void {
    this.subscriptions.add(
      this.inventoryService.getLowStockProducts(10).subscribe({
        next: (products) => {
          this.lowStockProducts = products;
        },
        error: (error) => {
          console.error('Failed to load low stock alerts:', error);
        }
      })
    );
  }

  // ===== PRODUCT ACTIONS =====

  addProduct(): void {
    this.router.navigate(['/dashboard/inventory/add']);
  }

  editProduct(product: Product): void {
    this.router.navigate(['/dashboard/inventory/edit', product.id]);
  }

  manageStock(product: Product): void {
    this.router.navigate(['/dashboard/inventory/stock', product.id]);
  }

  toggleProductStatus(product: Product): void {
    const newStatus = !product.isActive;
    
    this.subscriptions.add(
      this.inventoryService.updateProduct(product.id, {
        ...product,
        isActive: newStatus
      }).subscribe({
        next: () => {
          product.isActive = newStatus;
          this.showSuccess(`Product ${newStatus ? 'activated' : 'deactivated'} successfully`);
          this.loadProducts();
        },
        error: (error) => {
          this.showError('Failed to update product status: ' + error.message);
        }
      })
    );
  }

  deleteProduct(product: Product): void {
    if (confirm(`Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone.`)) {
      this.subscriptions.add(
        this.inventoryService.deleteProduct(product.id).subscribe({
          next: () => {
            this.showSuccess('Product deleted successfully');
            this.loadProducts();
          },
          error: (error) => {
            this.showError('Failed to delete product: ' + error.message);
          }
        })
      );
    }
  }

  // ===== UTILITY METHODS =====

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  getCategoryColor(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.color || '#666666';
  }

  getStockStatus(product: Product): 'high' | 'medium' | 'low' | 'out' {
    if (product.stock === 0) return 'out';
    if (product.stock <= product.minimumStock) return 'low';
    if (product.stock <= product.minimumStock * 2) return 'medium';
    return 'high';
  }

  getStockStatusColor(product: Product): string {
    const status = this.getStockStatus(product);
    switch (status) {
      case 'high': return '#4BBF7B';
      case 'medium': return '#FFB84D';
      case 'low': return '#FF914D';
      case 'out': return '#E15A4F';
      default: return '#666666';
    }
  }

  getStockStatusLabel(product: Product): string {
    const status = this.getStockStatus(product);
    switch (status) {
      case 'high': return 'Good Stock';
      case 'medium': return 'Medium Stock';
      case 'low': return 'Low Stock';
      case 'out': return 'Out of Stock';
      default: return 'Unknown';
    }
  }

  getMarginPercentage(product: Product): number {
    if (product.buyPrice === 0) return 0;
    return ((product.sellPrice - product.buyPrice) / product.buyPrice) * 100;
  }

  getMarginAmount(product: Product): number {
    return product.sellPrice - product.buyPrice;
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

  formatPercentage(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  // ===== PAGINATION & SORTING =====

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadProducts();
  }

  onSortChange(event: any): void {
    this.filterForm.patchValue({
      sortBy: event.active,
      sortOrder: event.direction || 'asc'
    });
  }

  // ===== QUICK ACTIONS =====

  refreshData(): void {
    this.loadProducts();
    this.loadLowStockAlerts();
    this.showSuccess('Data refreshed successfully');
  }

  exportData(): void {
    // TODO: Implement export functionality
    this.showInfo('Export functionality coming soon');
  }

  bulkActions(): void {
    // TODO: Implement bulk actions
    this.showInfo('Bulk actions coming soon');
  }

  // ===== SEARCH & BARCODE =====

  onBarcodeScanned(barcode: string): void {
    this.filterForm.patchValue({ search: barcode });
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      categoryId: '',
      isActive: true,
      stockFilter: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
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

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }
}