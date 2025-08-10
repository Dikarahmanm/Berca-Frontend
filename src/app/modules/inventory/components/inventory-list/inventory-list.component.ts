// ===== FIXED: Inventory List Component TypeScript =====
// src/app/modules/inventory/components/inventory-list/inventory-list.component.ts

import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy, signal, computed, inject, HostListener } from '@angular/core';
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
import { MatDividerModule } from '@angular/material/divider';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { CategoryService } from '../../../category-management/services/category.service';
import { Product, ProductFilter } from '../../interfaces/inventory.interfaces';
import { Category, CategoryFilter } from '../../../category-management/models/category.models';
import { AfterViewInit } from '@angular/core'; // ✅ Add this import
// Stock filter enum for better type safety
export enum StockFilterType {
  ALL = 'all',
  IN_STOCK = 'inStock',
  LOW_STOCK = 'lowStock',
  OUT_OF_STOCK = 'outOfStock'
}

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class InventoryListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Responsive signals
  public screenWidth = signal<number>(window.innerWidth);
  private isMobile = computed(() => this.screenWidth() < 768);
  private isTablet = computed(() => this.screenWidth() >= 768 && this.screenWidth() < 1024);
  private isDesktop = computed(() => this.screenWidth() >= 1024);

  // Data sources
  products = new MatTableDataSource<Product>([]);
  categories: Category[] = [];
  lowStockProducts: Product[] = [];
  
  // All possible table columns
  private allColumns = [
    'image', 'name', 'barcode', 'category', 'stock', 'minimumStock',
    'buyPrice', 'sellPrice', 'margin', 'status', 'actions'
  ];
  
  // Responsive column configuration
  private mobileColumns = ['name', 'stock', 'actions'];
  private tabletColumns = ['name', 'barcode', 'stock', 'sellPrice', 'status', 'actions'];
  private desktopColumns = this.allColumns;
  
  // Dynamic displayed columns based on screen size
  displayedColumns = computed(() => {
    if (this.isMobile()) return this.mobileColumns;
    if (this.isTablet()) return this.tabletColumns;
    return this.desktopColumns;
  });
  
  // Forms and filters
  filterForm!: FormGroup;
  
  // UI state signals
  loading = signal(false);
  totalItems = signal(0);
  pageSize = signal(25);
  currentPage = signal(1);
  
  // Stock filter options with proper typing
  stockFilterOptions = [
    { value: StockFilterType.ALL, label: 'All Products' },
    { value: StockFilterType.IN_STOCK, label: 'In Stock' },
    { value: StockFilterType.LOW_STOCK, label: 'Low Stock' },
    { value: StockFilterType.OUT_OF_STOCK, label: 'Out of Stock' }
  ];
  
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private inventoryService: InventoryService,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar
  ) {}

  // Listen for window resize to update responsive behavior
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.screenWidth.set((event.target as Window).innerWidth);
  }

  ngOnInit(): void {
    this.initializeFilterForm();
    this.loadCategories();
    this.loadProducts();
    this.loadLowStockAlerts();
    this.setupFilterWatchers();
  }

  ngAfterViewInit(): void {
    // Initialize paginator and sort after view initialization
    if (this.paginator) {
      this.products.paginator = this.paginator;
    }
    if (this.sort) {
      this.products.sort = this.sort;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      search: [''],
      categoryId: [''],
      isActive: [true],
      stockFilter: [StockFilterType.ALL],
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
          console.log('🔍 Search Changed');
          this.currentPage.set(1);
          this.loadProducts();
        })
    );

    // Watch category filter specifically
    this.subscriptions.add(
      this.filterForm.get('categoryId')?.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((categoryId) => {
          console.log('📂 Category Filter Changed to:', categoryId);
          this.currentPage.set(1);
          this.loadProducts();
        })
    );

    // Watch other filters (NOT sort fields to prevent conflicts)
    const filterControls = ['isActive', 'stockFilter'];
    filterControls.forEach(controlName => {
      this.subscriptions.add(
        this.filterForm.get(controlName)?.valueChanges
          .pipe(distinctUntilChanged())
          .subscribe((value) => {
            console.log(`🔧 ${controlName} Changed to:`, value);
            this.currentPage.set(1);
            this.loadProducts();
          })
      );
    });

    // ✅ DON'T watch sortBy and sortOrder here to avoid conflicts with onSortChange
  }

  // ===== DATA LOADING =====

  // ✅ ENHANCED: LoadProducts with better sort handling
   loadProducts(): void {
    this.loading.set(true);
    const filterValues = this.filterForm.value;
    
    const filter: ProductFilter = {
      search: filterValues.search?.trim() || undefined,
      categoryId: filterValues.categoryId || undefined,
      isActive: filterValues.isActive,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: filterValues.sortBy || 'name',
      sortOrder: filterValues.sortOrder || 'asc'
    };

    // Apply stock filter
    this.applyStockFilter(filter, filterValues.stockFilter);

    console.log('📡 API Request with enhanced sort:', filter);

    this.subscriptions.add(
      this.inventoryService.getProducts(filter).subscribe({
        next: (response) => {
          const enhancedProducts = response.products.map(product => ({
            ...product,
            minimumStock: typeof product.minimumStock === 'number' ? product.minimumStock : 5,
            profitMargin: this.getMarginPercentage(product),
            isLowStock: product.stock <= (typeof product.minimumStock === 'number' ? product.minimumStock : 5),
            isOutOfStock: product.stock === 0,
            // ✅ Add categoryName for sorting
            categoryName: this.getCategoryName(product.categoryId)
          }));
          
          this.products.data = enhancedProducts;
          this.totalItems.set(response.totalItems);
          this.loading.set(false);
          
          // ✅ Update MatSort state to match current sort
          if (this.sort) {
            // Map backend field back to frontend column
            const frontendColumn = this.mapBackendToFrontend(filter.sortBy || 'name');
            this.sort.active = frontendColumn;
            this.sort.direction = filter.sortOrder as 'asc' | 'desc';
          }
          
          console.log('📦 Products Loaded & Sorted:', {
            total: response.totalItems,
            products: enhancedProducts.length,
            sortBy: filter.sortBy,
            sortOrder: filter.sortOrder,
            frontendSort: this.sort ? { active: this.sort.active, direction: this.sort.direction } : 'not initialized'
          });
        },
        error: (error) => {
          this.showError('Failed to load products: ' + error.message);
          this.loading.set(false);
        }
      })
    );
  }
  // ✅ HELPER: Map backend field names back to frontend column names
  private mapBackendToFrontend(backendField: string): string {
    const reverseMapping: { [key: string]: string } = {
      'name': 'name',
      'barcode': 'barcode',
      'stock': 'stock', 
      'minimumStock': 'minimumStock',
      'buyPrice': 'buyPrice',
      'sellPrice': 'sellPrice',
      'category.name': 'categoryName',
      'profitMargin': 'profitMargin',
      'isActive': 'isActive'
    };
    return reverseMapping[backendField] || backendField;
  }

  // ✅ FIXED: Enhanced stock filter application
  private applyStockFilter(filter: ProductFilter, stockFilterValue: StockFilterType): void {
    switch (stockFilterValue) {
      case StockFilterType.LOW_STOCK:
        // Products where stock <= minimumStock AND stock > 0
        filter.lowStock = true;
        filter.minStock = 1; // Ensure not out of stock
        break;
        
      case StockFilterType.OUT_OF_STOCK:
        // Products where stock = 0
        filter.maxStock = 0;
        break;
        
      case StockFilterType.IN_STOCK:
        // Products where stock > minimumStock
        filter.minStock = 1;
        filter.lowStock = false;
        break;
        
      case StockFilterType.ALL:
      default:
        // No stock filtering
        break;
    }
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
          console.log('📁 Loaded Categories:', this.categories.length);
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
          console.log('⚠️ Low Stock Products:', products.length);
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
    const confirmMessage = `Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
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
    const colors = {
      'high': '#4BBF7B',   // Success green
      'medium': '#FFB84D', // Warning orange
      'low': '#FF914D',    // Primary orange
      'out': '#E15A4F'     // Error red
    };
    return colors[status];
  }

  getStockStatusLabel(product: Product): string {
    const status = this.getStockStatus(product);
    const labels = {
      'high': 'Good Stock',
      'medium': 'Medium Stock', 
      'low': 'Low Stock',
      'out': 'Out of Stock'
    };
    return labels[status];
  }

  getMarginPercentage(product: Product): number {
    if (product.buyPrice === 0) return 0;
    return ((product.sellPrice - product.buyPrice) / product.buyPrice) * 100;
  }

  getMarginAmount(product: Product): number {
    return product.sellPrice - product.buyPrice;
  }

  // ===== FORMATTING METHODS =====

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
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadProducts();
  }

  // ✅ FIXED: Enhanced sort change handler
  onSortChange(event: any): void {
    console.log('🔄 Sort Event Triggered:', {
      active: event.active,
      direction: event.direction
    });

    // Validate sort parameters
    if (!event.active) {
      console.warn('⚠️ No active sort column provided');
      return;
    }

    // ✅ Map frontend column names to backend field names
    const columnMapping: { [key: string]: string } = {
      'name': 'name',
      'barcode': 'barcode', 
      'stock': 'stock',
      'minimumStock': 'minimumStock',
      'buyPrice': 'buyPrice',
      'sellPrice': 'sellPrice',
      'categoryName': 'category.name',  // ✅ Backend relation field
      'profitMargin': 'profitMargin',   // ✅ Computed field
      'isActive': 'isActive'
    };

    const backendField = columnMapping[event.active] || event.active;

    // Update filter form to trigger API call
    this.filterForm.patchValue({
      sortBy: backendField,
      sortOrder: event.direction || 'asc'
    }, { emitEvent: false }); // Don't emit to prevent infinite loop

    // Reset to first page when sorting
    this.currentPage.set(1);
    
    // Trigger data reload with new sort
    this.loadProducts();
    
    console.log('✅ Sort Applied:', {
      frontendColumn: event.active,
      backendField: backendField,
      direction: event.direction,
      formValues: this.filterForm.value
    });
  }
onCategoryFilterChange(event: any): void {
    console.log('📂 Category Filter Changed:', event.value);
    // This will be handled by the existing form watcher
    // No need to manually trigger loadProducts here
  }
  // ✅ FIXED: TrackBy function for categories
  trackCategoryById(index: number, category: Category): number {
    return category.id;
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

  onBarcodeScanned(barcode: string): void {
    this.filterForm.patchValue({ search: barcode });
  }

  // ✅ ENHANCED: Clear filters with sort reset
  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      categoryId: '',
      isActive: true,
      stockFilter: StockFilterType.ALL,
      sortBy: 'name',        // ✅ Reset sort
      sortOrder: 'asc'       // ✅ Reset direction
    });
    
    // Reset MatSort state
    if (this.sort) {
      this.sort.active = 'name';
      this.sort.direction = 'asc';
    }
    
    console.log('🧹 Filters & Sort Cleared');
  }

  // ===== RESPONSIVE HELPERS =====

  // Expose computed values to template
  get isMobileView(): boolean {
    return this.isMobile();
  }

  get isTabletView(): boolean {
    return this.isTablet();
  }

  get isDesktopView(): boolean {
    return this.isDesktop();
  }

  // Get current displayed columns for template
  get currentDisplayedColumns(): string[] {
    return this.displayedColumns();
  }

  // Check if specific column should be visible
  isColumnVisible(columnName: string): boolean {
    return this.displayedColumns().includes(columnName);
  }

  // ===== COMPUTED PROPERTIES FOR TEMPLATE =====

  get statsData() {
    return {
      totalProducts: this.totalItems(),
      lowStockCount: this.lowStockProducts.length,
      averageMargin: 15.3 // TODO: Calculate from actual data
    };
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
  // ✅ HELPER: Manual sort trigger (for testing)
  triggerSort(column: string, direction: 'asc' | 'desc' = 'asc'): void {
    console.log(`🔄 Manual Sort Trigger: ${column} ${direction}`);
    
    if (this.sort) {
      this.sort.active = column;
      this.sort.direction = direction;
      this.sort._stateChanges.next();
      
      // Trigger the sort change event manually
      this.onSortChange({
        active: column,
        direction: direction
      });
    }
  }

  // ✅ HELPER: Check if column is sortable
  // ✅ FIXED: Update sortable columns list
  private isColumnSortable(columnName: string): boolean {
    const sortableColumns = [
      'name', 'barcode', 'stock', 'minimumStock', 
      'buyPrice', 'sellPrice', 'categoryName', 'profitMargin', 'isActive'
    ];
    return sortableColumns.includes(columnName);
  }

  // ✅ HELPER: Get current sort info
  getCurrentSortInfo(): { column: string, direction: string } {
    return {
      column: this.sort?.active || 'none',
      direction: this.sort?.direction || 'none'
    };
  }
}