// ===== INVENTORY LIST COMPONENT =====
// src/app/modules/inventory/components/inventory-list/inventory-list.component.ts

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

// Services & Interfaces
import { InventoryService } from '../../services/inventory.service';
import { CategoryService } from '../../../category-management/services/category.service';
import { Product, ProductFilter, MutationType } from '../../interfaces/inventory.interfaces';
import { Category, CategoryListResponse } from '../../../category-management/models/category.models';

@Component({
  selector: 'app-inventory-list',
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
    MatBadgeModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss']
})
export class InventoryListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Table configuration
  displayedColumns: string[] = [
    'image',
    'name',
    'barcode', 
    'category',
    'stock',
    'buyPrice',
    'sellPrice',
    'margin',
    'status',
    'actions'
  ];

  // Data sources
  dataSource = new MatTableDataSource<Product>([]);
  categories: Category[] = [];
  lowStockProducts: Product[] = [];

  // Filter form
  filterForm!: FormGroup;
  
  // State management
  loading = false;
  error: string | null = null;
  totalProducts = 0;
  currentPage = 1;
  pageSize = 20;
  
  // Current filter
  currentFilter: ProductFilter = {
    page: 1,
    pageSize: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  };

  // Tabs
  selectedTabIndex = 0;
  lowStockCount = 0;
  outOfStockCount = 0;

  // Subscriptions
  private subscriptions = new Subscription();

  constructor(
    private inventoryService: InventoryService,
    private categoryService: CategoryService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.initializeFilterForm();
  }

  ngOnInit(): void {
    console.log('[Inventory] InventoryListComponent ngOnInit dipanggil!');
    this.setupSubscriptions();
    this.loadCategories();
    this.loadProducts();
    this.loadLowStockAlerts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== INITIALIZATION =====

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      search: [''],
      categoryId: [''],
      isActive: [true],
      stockFilter: ['all'], // all, lowStock, outOfStock
      sortBy: ['name'],
      sortOrder: ['asc']
    });
  }

  private setupSubscriptions(): void {
    // Subscribe to inventory service states
    this.subscriptions.add(
      this.inventoryService.loading$.subscribe(loading => {
        this.loading = loading;
      })
    );

    this.subscriptions.add(
      this.inventoryService.error$.subscribe(error => {
        this.error = error;
        if (error) {
          this.showError(error);
        }
      })
    );

    // Subscribe to filter form changes
    this.subscriptions.add(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged()
        )
        .subscribe(values => {
          this.applyFilters(values);
        })
    );
  }

  // ===== DATA LOADING =====

  private loadProducts(): void {
    this.loading = true;
    
    this.subscriptions.add(
      this.inventoryService.getProducts(this.currentFilter).subscribe({
        next: (response) => {
          this.dataSource.data = response.products;
          this.totalProducts = response.totalItems;
          this.currentPage = response.currentPage;
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load products: ' + error.message);
          this.loading = false;
        }
      })
    );
  }

  private loadCategories(): void {
    this.subscriptions.add(
      this.categoryService.getCategories({ 
        page: 1, 
        pageSize: 100, 
        sortBy: 'name', 
        sortOrder: 'asc' 
      }).subscribe({
        next: (response: CategoryListResponse) => {
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
          this.lowStockCount = products.length;
        },
        error: (error) => {
          console.error('Failed to load low stock alerts:', error);
        }
      })
    );

    this.subscriptions.add(
      this.inventoryService.getOutOfStockProducts().subscribe({
        next: (products) => {
          this.outOfStockCount = products.length;
        },
        error: (error) => {
          console.error('Failed to load out of stock count:', error);
        }
      })
    );
  }

  // ===== FILTERING & SORTING =====

  private applyFilters(formValues: any): void {
    this.currentFilter = {
      search: formValues.search || undefined,
      categoryId: formValues.categoryId || undefined,
      isActive: formValues.isActive,
      page: 1, // Reset to first page when filtering
      pageSize: this.pageSize,
      sortBy: formValues.sortBy,
      sortOrder: formValues.sortOrder
    };

    // Handle special stock filters
    if (formValues.stockFilter === 'lowStock') {
      this.loadLowStockOnly();
      return;
    } else if (formValues.stockFilter === 'outOfStock') {
      this.loadOutOfStockOnly();
      return;
    }

    this.loadProducts();
  }

  private loadLowStockOnly(): void {
    this.loading = true;
    this.subscriptions.add(
      this.inventoryService.getLowStockProducts().subscribe({
        next: (products) => {
          this.dataSource.data = products;
          this.totalProducts = products.length;
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load low stock products: ' + error.message);
          this.loading = false;
        }
      })
    );
  }

  private loadOutOfStockOnly(): void {
    this.loading = true;
    this.subscriptions.add(
      this.inventoryService.getOutOfStockProducts().subscribe({
        next: (products) => {
          this.dataSource.data = products;
          this.totalProducts = products.length;
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load out of stock products: ' + error.message);
          this.loading = false;
        }
      })
    );
  }

  onPageChange(event: any): void {
    this.currentFilter.page = event.pageIndex + 1;
    this.currentFilter.pageSize = event.pageSize;
    this.pageSize = event.pageSize;
    this.loadProducts();
  }

  onSortChange(event: any): void {
    this.currentFilter.sortBy = event.active;
    this.currentFilter.sortOrder = event.direction || 'asc';
    this.loadProducts();
  }

  // ===== TAB MANAGEMENT =====

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
    
    switch (event.index) {
      case 0: // All Products
        this.filterForm.patchValue({ stockFilter: 'all' });
        break;
      case 1: // Low Stock
        this.filterForm.patchValue({ stockFilter: 'lowStock' });
        break;
      case 2: // Out of Stock
        this.filterForm.patchValue({ stockFilter: 'outOfStock' });
        break;
    }
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

  viewHistory(product: Product): void {
    // TODO: Implement product history modal
    console.log('View history for product:', product.name);
  }

  duplicateProduct(product: Product): void {
    const duplicateData = {
      ...product,
      name: `${product.name} (Copy)`,
      barcode: '', // Clear barcode for manual entry
      id: 0 // Reset ID for new product
    };
    
    this.router.navigate(['/dashboard/inventory/add'], {
      state: { duplicateData }
    });
  }

  toggleProductStatus(product: Product): void {
    const updatedProduct = {
      ...product,
      isActive: !product.isActive
    };

    this.subscriptions.add(
      this.inventoryService.updateProduct(product.id, updatedProduct).subscribe({
        next: () => {
          this.showSuccess(`Product ${product.isActive ? 'deactivated' : 'activated'} successfully`);
          this.loadProducts();
        },
        error: (error) => {
          this.showError('Failed to update product status: ' + error.message);
        }
      })
    );
  }

  deleteProduct(product: Product): void {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
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

  getMarginPercentage(product: Product): number {
    if (product.buyPrice === 0) return 0;
    return ((product.sellPrice - product.buyPrice) / product.buyPrice) * 100;
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

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // ===== GETTERS FOR TEMPLATE =====

  get hasLowStock(): boolean {
    return this.lowStockCount > 0;
  }

  get hasOutOfStock(): boolean {
    return this.outOfStockCount > 0;
  }

  get totalInventoryValue(): number {
    return this.dataSource.data.reduce((total, product) => {
      return total + (product.stock * product.buyPrice);
    }, 0);
  }

  get activeProductsCount(): number {
    return this.dataSource.data.filter(p => p.isActive).length;
  }

  // Utility method to copy text to clipboard
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Copied to clipboard!', 'Close', { duration: 2000 });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      this.snackBar.open('Failed to copy to clipboard', 'Close', { duration: 2000 });
    });
  }
}