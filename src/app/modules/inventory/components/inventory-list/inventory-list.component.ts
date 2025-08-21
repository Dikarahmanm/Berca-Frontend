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
import { ExpiryManagementService } from '../../../../core/services/expiry-management.service';
import { Product, ProductFilter } from '../../interfaces/inventory.interfaces';
import { Category, CategoryFilter } from '../../../category-management/models/category.models';
import { ExpiryStatus, ExpiryAnalytics, ExpiringProduct, FifoRecommendationDto, ProductBatch, ExpiringProductsFilter, BatchStatus, ExpiryUrgency } from '../../../../core/interfaces/expiry.interfaces';
import { AfterViewInit } from '@angular/core'; // ✅ Add this import

// Stock filter enum for better type safety
export enum StockFilterType {
  ALL = 'all',
  IN_STOCK = 'inStock',
  LOW_STOCK = 'lowStock',
  OUT_OF_STOCK = 'outOfStock'
}

// ✅ NEW: Expiry filter enum
export enum ExpiryFilterType {
  ALL = 'all',
  GOOD = 'good',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EXPIRED = 'expired',
  MISSING = 'missing'
}

// ✅ NEW: Enhanced interface for product with expiry information
export interface ProductWithExpiry extends Product {
  expiryDate?: string;
  batchNumber?: string;
  daysUntilExpiry?: number;
  expiryStatus: 'good' | 'warning' | 'critical' | 'expired' | 'missing';
  categoryRequiresExpiry: boolean;
  needsExpiryData: boolean;
  expiryStatusText?: string;
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

  // Enhanced data sources
  products = new MatTableDataSource<ProductWithExpiry>([]);
  rawProducts = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  lowStockProducts = signal<Product[]>([]);
  
  // ✅ ENHANCED: Expiry management signals
  expiryAnalytics = signal<ExpiryAnalytics | null>(null);
  expiringProducts = signal<ExpiringProduct[]>([]);
  fifoRecommendations = signal<FifoRecommendationDto[]>([]);
  productBatches = signal<ProductBatch[]>([]);
  
  // Enhanced expiry filter state
  expiryFilter = signal<ExpiryFilterType>(ExpiryFilterType.ALL);
  showExpiryColumn = signal(true);
  productsRequiringExpiry = signal<ProductWithExpiry[]>([]);
  
  // Enhanced computed properties
  enhancedProducts = computed(() => this.enhanceProductsWithExpiryInfo(this.rawProducts()));
  
  filteredProductsByExpiry = computed(() => {
    const filter = this.expiryFilter();
    const products = this.enhancedProducts();
    
    if (filter === ExpiryFilterType.ALL) return products;
    
    return products.filter(product => product.expiryStatus === filter);
  });
  
  // Expiry statistics
  expiryStats = computed(() => {
    const products = this.enhancedProducts();
    return {
      total: products.length,
      good: products.filter(p => p.expiryStatus === 'good').length,
      warning: products.filter(p => p.expiryStatus === 'warning').length,
      critical: products.filter(p => p.expiryStatus === 'critical').length,
      expired: products.filter(p => p.expiryStatus === 'expired').length,
      missing: products.filter(p => p.expiryStatus === 'missing').length
    };
  });
  
  // ✅ NEW: Expiry view state
  showExpiryAnalytics = signal(false);
  selectedProductForBatches: Product | null = null;
  
  // All possible table columns (enhanced with expiry columns)
  private allColumns = [
    'name', 'barcode', 'category', 'stock', 'minimumStock',
    'buyPrice', 'sellPrice', 'expiry', 'daysLeft', 'expiryStatus', 'status', 'actions'
  ];
  
  // Responsive column configuration (enhanced with expiry columns - always include expiry)
  private mobileColumns = ['name', 'stock', 'expiry', 'expiryStatus', 'actions'];
  private tabletColumns = ['name', 'barcode', 'stock', 'sellPrice', 'expiry', 'expiryStatus', 'daysLeft', 'status', 'actions'];
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
  
  // ✅ ENHANCED: Expiry filter options  
  expiryFilterOptions = [
    { value: ExpiryFilterType.ALL, label: 'All Status', icon: '📋', count: 0 },
    { value: ExpiryFilterType.GOOD, label: 'Good (30+ days)', icon: '✅', count: 0 },
    { value: ExpiryFilterType.WARNING, label: 'Warning (7-30 days)', icon: '⚠️', count: 0 },
    { value: ExpiryFilterType.CRITICAL, label: 'Critical (0-7 days)', icon: '🚨', count: 0 },
    { value: ExpiryFilterType.EXPIRED, label: 'Expired', icon: '❌', count: 0 },
    { value: ExpiryFilterType.MISSING, label: 'Missing Expiry', icon: '📝', count: 0 }
  ];
  
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private inventoryService: InventoryService,
    private categoryService: CategoryService,
    private expiryService: ExpiryManagementService,
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
    this.loadExpiryAnalytics(); // ✅ NEW: Load expiry data
    this.loadExpiringProducts(); // ✅ NEW: Load expiring products
    this.loadFifoRecommendations(); // ✅ NEW: Load FIFO recommendations
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
      expiryFilter: [ExpiryFilterType.ALL], // ✅ NEW: Expiry filter
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
    const filterControls = ['isActive', 'stockFilter', 'expiryFilter'];
    filterControls.forEach(controlName => {
      this.subscriptions.add(
        this.filterForm.get(controlName)?.valueChanges
          .pipe(distinctUntilChanged())
          .subscribe((value) => {
            console.log(`🔧 ${controlName} Changed to:`, value);
            this.currentPage.set(1);
            this.loadProducts();
            
            // Reload expiry data when expiry filter changes
            if (controlName === 'expiryFilter') {
              this.loadExpiringProducts();
            }
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
    
    // ✅ NEW: Apply expiry filter
    this.applyExpiryFilter(filter, filterValues.expiryFilter);

    console.log('📡 API Request with enhanced sort:', filter);

    this.subscriptions.add(
      this.inventoryService.getProducts(filter).subscribe({
        next: (response) => {
          const rawProductsData = response.products || [];
          
          // Update raw products signal
          this.rawProducts.set(rawProductsData);
          
          // Create enhanced products with both legacy and expiry enhancements
          const enhancedProducts = rawProductsData.map(product => {
            const legacyEnhanced = {
              ...product,
              minimumStock: typeof product.minimumStock === 'number' ? product.minimumStock : 5,
              profitMargin: this.getMarginPercentage(product),
              isLowStock: product.stock <= (typeof product.minimumStock === 'number' ? product.minimumStock : 5),
              isOutOfStock: product.stock === 0,
              // ✅ Add categoryName for sorting
              categoryName: this.getCategoryName(product.categoryId)
            };
            
            // Apply expiry enhancement
            return this.enhanceProductWithExpiry(legacyEnhanced);
          });
          
          // Update MatTableDataSource with enhanced products
          this.products.data = enhancedProducts;
          this.totalItems.set(response.totalItems);
          
          // Update expiry filter counts
          this.updateExpiryFilterCounts();
          
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
          this.categories.set(response.categories);
          console.log('📁 Loaded Categories:', this.categories().length);
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
          this.lowStockProducts.set(products);
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
    console.log('🚀 Navigating to add product...');
    this.router.navigate(['/dashboard/inventory/add']).then(
      (success) => console.log('✅ Navigation successful:', success),
      (error) => console.error('❌ Navigation failed:', error)
    );
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
    const category = this.categories().find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  getCategoryColor(categoryId: number): string {
    const category = this.categories().find(c => c.id === categoryId);
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
    this.loadExpiryAnalytics();
    this.loadExpiringProducts();
    this.loadFifoRecommendations();
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
      expiryFilter: ExpiryFilterType.ALL, // ✅ Reset expiry filter
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
  // Computed property for current displayed columns
  currentDisplayedColumns = computed(() => this.displayedColumns());

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

  // ===== EXPIRY MANAGEMENT METHODS =====

  /**
   * Load expiry analytics data
   */
  private loadExpiryAnalytics(): void {
    this.subscriptions.add(
      this.expiryService.getExpiryAnalytics().subscribe({
        next: (data) => {
          this.expiryAnalytics.set(data);
        },
        error: (error) => {
          console.error('Failed to load expiry analytics:', error);
          // Set mock analytics data as fallback
          this.expiryAnalytics.set({
            totalProductsWithExpiry: 0,
            expiringProducts: 0,
            expiredProducts: 0,
            criticalProducts: 0,
            totalStockValue: 0,
            expiringStockValue: 0,
            expiredStockValue: 0,
            totalWasteValue: 0,
            potentialLossValue: 0,
            wastePercentage: 0,
            expiryRate: 0,
            averageDaysToExpiry: 0,
            topExpiringCategories: [],
            expiryTrends: [],
            monthlyWasteTrend: [],
            urgencyBreakdown: { low: 0, medium: 0, high: 0, critical: 0 }
          });
        }
      })
    );
  }

  /**
   * Calculate expiry status for a product
   */
  calculateExpiryStatus(product: Product | { expiryDate?: string }): ExpiryStatus {
    const expiryDate = (product as any).expiryDate;
    if (!expiryDate) return ExpiryStatus.GOOD; // Default to GOOD for products without expiry

    const days = this.expiryService.getDaysUntilExpiry(new Date(expiryDate));
    return this.expiryService.calculateExpiryStatus(days);
  }

  /**
   * Get expiry status color class
   */
  getExpiryStatusColor(product: Product | { expiryDate?: string }): string {
    const status = this.calculateExpiryStatus(product);
    return this.expiryService.getExpiryStatusColor(status);
  }

  /**
   * Get days until expiry for display
   */
  getDaysUntilExpiry(product: Product | { expiryDate?: string }): number | null {
    const expiryDate = (product as any).expiryDate;
    if (!expiryDate) return null;

    return this.expiryService.getDaysUntilExpiry(new Date(expiryDate));
  }

  /**
   * Get expiry status text
   */
  getExpiryStatusText(product: Product | { expiryDate?: string }): string {
    const days = this.getDaysUntilExpiry(product);
    if (days === null) return 'No expiry';

    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `${days} days left`;
  }

  /**
   * Get expiry status icon
   */
  getExpiryStatusIcon(product: Product | { expiryDate?: string }): string {
    const status = this.calculateExpiryStatus(product);
    
    const iconMap: Record<ExpiryStatus, string> = {
      [ExpiryStatus.GOOD]: '✅',
      [ExpiryStatus.WARNING]: '⚠️',
      [ExpiryStatus.CRITICAL]: '🔴',
      [ExpiryStatus.EXPIRED]: '❌'
    };
    
    return iconMap[status] || '❓';
  }

  /**
   * Check if product has expiry date
   */
  hasExpiryDate(product: Product | { expiryDate?: string }): boolean {
    return !!(product as any).expiryDate;
  }

  /**
   * Format expiry date for display
   */
  formatExpiryDate(product: Product | { expiryDate?: string }): string {
    const expiryDate = (product as any).expiryDate;
    if (!expiryDate) return 'No expiry';

    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(expiryDate));
  }

  /**
   * Filter products by expiry status
   */
  private filterProductsByExpiry(products: Product[], filterType: ExpiryFilterType): Product[] {
    if (filterType === ExpiryFilterType.ALL) return products;

    return products.filter(product => {
      const status = this.calculateExpiryStatus(product);
      const days = this.getDaysUntilExpiry(product);

      switch (filterType) {
        case ExpiryFilterType.GOOD:
          return status === ExpiryStatus.GOOD;
        case ExpiryFilterType.WARNING:
          return status === ExpiryStatus.WARNING;
        case ExpiryFilterType.CRITICAL:
          return status === ExpiryStatus.CRITICAL;
        case ExpiryFilterType.EXPIRED:
          return status === ExpiryStatus.EXPIRED;
        default:
          return true;
      }
    });
  }

  /**
   * Get expiry analytics summary for display
   */
  get expiryStatsSummary() {
    const analytics = this.expiryAnalytics();
    if (!analytics) return null;

    return {
      total: analytics.totalProductsWithExpiry,
      expiringSoon: analytics.expiringProducts,
      expired: analytics.expiredProducts,
      stockValue: analytics.totalStockValue,
      expiringValue: analytics.expiringStockValue
    };
  }

  /**
   * Get urgency breakdown for display
   */
  get expiryUrgencyBreakdown() {
    const analytics = this.expiryAnalytics();
    return analytics?.urgencyBreakdown || null;
  }

  // ===== ENHANCED EXPIRY & FIFO METHODS =====

  /**
   * Load expiring products with filters
   */
  private loadExpiringProducts(): void {
    const filterValues = this.filterForm.value;
    const filter: ExpiringProductsFilter = {
      categoryId: filterValues.categoryId || undefined,
      expiryStatus: this.mapExpiryFilterToStatus(filterValues.expiryFilter),
      page: 1,
      pageSize: 50,
      sortBy: 'expiryDate',
      sortOrder: 'asc'
    };

    this.subscriptions.add(
      this.expiryService.getExpiringProducts(filter).subscribe({
        next: (products) => {
          this.expiringProducts.set(products);
        },
        error: (error) => {
          console.error('Failed to load expiring products:', error);
          this.expiringProducts.set([]);
        }
      })
    );
  }

  /**
   * Load FIFO recommendations
   */
  private loadFifoRecommendations(): void {
    this.subscriptions.add(
      this.expiryService.getFifoRecommendations({
        limit: 20,
        urgencyLevel: ExpiryUrgency.HIGH
      }).subscribe({
        next: (recommendations) => {
          this.fifoRecommendations.set(recommendations);
        },
        error: (error) => {
          console.error('Failed to load FIFO recommendations:', error);
          this.fifoRecommendations.set([]);
        }
      })
    );
  }

  /**
   * Load product batches for a specific product
   */
  loadProductBatches(product: Product): void {
    this.subscriptions.add(
      this.expiryService.getProductBatches({
        productId: product.id,
        sortBy: 'expiryDate',
        sortOrder: 'asc'
      }).subscribe({
        next: (batches) => {
          this.productBatches.set(batches);
          this.selectedProductForBatches = product;
        },
        error: (error) => {
          console.error('Failed to load product batches:', error);
          this.productBatches.set([]);
        }
      })
    );
  }

  /**
   * Apply expiry filter to product query
   */
  private applyExpiryFilter(filter: ProductFilter, expiryFilterValue: ExpiryFilterType): void {
    const expiryFilter = this.mapExpiryFilterToStatus(expiryFilterValue);
    if (expiryFilter) {
      (filter as any).expiryStatus = expiryFilter;
    }

    // Add specific day ranges for expiry filtering
    switch (expiryFilterValue) {
      case ExpiryFilterType.WARNING:
        (filter as any).minDaysUntilExpiry = 7;
        (filter as any).maxDaysUntilExpiry = 30;
        break;
      case ExpiryFilterType.CRITICAL:
        (filter as any).maxDaysUntilExpiry = 7;
        break;
      case ExpiryFilterType.GOOD:
        (filter as any).minDaysUntilExpiry = 30;
        break;
    }
  }

  /**
   * Map expiry filter type to status
   */
  private mapExpiryFilterToStatus(filterType: ExpiryFilterType): ExpiryStatus | undefined {
    const mapping: Record<ExpiryFilterType, ExpiryStatus | undefined> = {
      [ExpiryFilterType.ALL]: undefined,
      [ExpiryFilterType.GOOD]: ExpiryStatus.GOOD,
      [ExpiryFilterType.WARNING]: ExpiryStatus.WARNING,
      [ExpiryFilterType.CRITICAL]: ExpiryStatus.CRITICAL,
      [ExpiryFilterType.EXPIRED]: ExpiryStatus.EXPIRED,
      [ExpiryFilterType.MISSING]: undefined
    };
    return mapping[filterType];
  }

  /**
   * Get FIFO recommendation for a product
   */
  getFifoRecommendation(product: Product): FifoRecommendationDto | null {
    const recommendations = this.fifoRecommendations();
    return recommendations.find(r => r.productId === product.id) || null;
  }

  /**
   * Get FIFO recommendation priority color
   */
  getFifoRecommendationColor(recommendation: FifoRecommendationDto): string {
    const priorityColors = {
      [ExpiryUrgency.LOW]: '#4BBF7B',
      [ExpiryUrgency.MEDIUM]: '#FFB84D',
      [ExpiryUrgency.HIGH]: '#FF914D',
      [ExpiryUrgency.CRITICAL]: '#E15A4F'
    };
    return priorityColors[recommendation.priority] || '#666666';
  }

  /**
   * Get FIFO recommendation action text
   */
  getFifoActionText(recommendation: FifoRecommendationDto): string {
    const actionMap = {
      'sell_first': 'Sell First',
      'discount': 'Apply Discount',
      'transfer': 'Transfer Stock',
      'dispose': 'Dispose'
    };
    return actionMap[recommendation.recommendedAction] || recommendation.recommendedAction;
  }

  /**
   * Get product batch count
   */
  getProductBatchCount(product: Product): number {
    const batches = this.productBatches();
    return batches.filter(b => b.productId === product.id).length;
  }

  /**
   * Get earliest expiring batch for a product
   */
  getEarliestExpiringBatch(product: Product): ProductBatch | null {
    const batches = this.productBatches().filter(b => 
      b.productId === product.id && 
      b.expiryDate &&
      b.status === BatchStatus.ACTIVE
    );
    
    if (batches.length === 0) return null;
    
    return batches.reduce((earliest, current) => {
      if (!earliest.expiryDate) return current;
      if (!current.expiryDate) return earliest;
      return new Date(current.expiryDate) < new Date(earliest.expiryDate) ? current : earliest;
    });
  }

  /**
   * Toggle expiry analytics view
   */
  toggleExpiryAnalytics(): void {
    this.showExpiryAnalytics.update(show => !show);
  }

  /**
   * Navigate to expiry management for a product
   */
  manageProductExpiry(product: Product): void {
    this.router.navigate(['/dashboard/inventory/expiry', product.id]);
  }

  /**
   * Navigate to batch management for a product
   */
  manageBatches(product: Product): void {
    this.router.navigate(['/dashboard/inventory/batches', product.id]);
  }

  /**
   * Apply FIFO recommendation
   */
  async applyFifoRecommendation(recommendation: FifoRecommendationDto): Promise<void> {
    try {
      const confirmed = confirm(
        `Apply FIFO recommendation: ${this.getFifoActionText(recommendation)} for ${recommendation.productName}?`
      );
      
      if (!confirmed) return;

      // Here you would implement the actual action based on recommendation type
      switch (recommendation.recommendedAction) {
        case 'sell_first':
          // Update product priority or add to special sales list
          this.showInfo(`${recommendation.productName} marked for priority sale`);
          break;
        case 'discount':
          // Apply discount or navigate to discount management
          this.showInfo(`Discount suggestion applied for ${recommendation.productName}`);
          break;
        case 'transfer':
          // Navigate to stock transfer
          this.router.navigate(['/dashboard/inventory/transfer', recommendation.productId]);
          break;
        case 'dispose':
          // Navigate to disposal process
          this.router.navigate(['/dashboard/inventory/dispose', recommendation.productId]);
          break;
      }
      
      // Refresh recommendations
      this.loadFifoRecommendations();
    } catch (error) {
      this.showError('Failed to apply FIFO recommendation');
    }
  }

  /**
   * Get batch status summary for a product
   */
  getBatchStatusSummary(product: Product): string {
    const batches = this.productBatches().filter(b => b.productId === product.id);
    if (batches.length === 0) return 'No batches';
    
    const active = batches.filter(b => b.status === BatchStatus.ACTIVE).length;
    const blocked = batches.filter(b => b.status === BatchStatus.BLOCKED).length;
    const expired = batches.filter(b => b.status === BatchStatus.EXPIRED).length;
    
    const parts = [];
    if (active) parts.push(`${active} active`);
    if (blocked) parts.push(`${blocked} blocked`);
    if (expired) parts.push(`${expired} expired`);
    
    return parts.join(', ');
  }

  /**
   * Check if product supports batch management
   */
  supportsBatchManagement(product: Product): boolean {
    // Check if product category requires expiry tracking
    const category = this.categories().find((c: Category) => c.id === product.categoryId);
    return category ? (category as any).requiresExpiryDate : false;
  }

  /**
   * Format currency for Indonesian locale
   */
  formatIDRCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get urgency level color
   */
  getUrgencyColor(urgency: ExpiryUrgency): string {
    const colors = {
      [ExpiryUrgency.LOW]: '#4BBF7B',
      [ExpiryUrgency.MEDIUM]: '#FFB84D', 
      [ExpiryUrgency.HIGH]: '#FF914D',
      [ExpiryUrgency.CRITICAL]: '#E15A4F'
    };
    return colors[urgency] || '#666666';
  }

  /**
   * Get batch status color class
   */
  getBatchStatusColor(status: BatchStatus): string {
    const statusColors = {
      [BatchStatus.ACTIVE]: '#4BBF7B',
      [BatchStatus.BLOCKED]: '#FFB84D', 
      [BatchStatus.DISPOSED]: '#E15A4F',
      [BatchStatus.EXPIRED]: '#E15A4F'
    };
    
    return statusColors[status] || '#666666';
  }

  /**
   * Get comprehensive product statistics
   */
  get comprehensiveStats() {
    const analytics = this.expiryAnalytics();
    const expiring = this.expiringProducts();
    const recommendations = this.fifoRecommendations();

    return {
      totalProducts: this.totalItems(),
      lowStockCount: this.lowStockProducts().length,
      expiryTrackedProducts: analytics?.totalProductsWithExpiry || 0,
      expiringProducts: expiring.length,
      fifoRecommendations: recommendations.length,
      totalValueAtRisk: analytics?.potentialLossValue || 0,
      averageMargin: 15.3 // TODO: Calculate from actual data
    };
  }

  // ===== ENHANCED EXPIRY MANAGEMENT METHODS =====

  /**
   * Enhance products with expiry information
   */
  private enhanceProductsWithExpiryInfo(products: Product[]): ProductWithExpiry[] {
    return products.map(product => this.enhanceProductWithExpiry(product));
  }

  /**
   * Enhance single product with expiry information
   */
  private enhanceProductWithExpiry(product: Product): ProductWithExpiry {
    const enhanced: ProductWithExpiry = {
      ...product,
      expiryStatus: 'good',
      categoryRequiresExpiry: false,
      needsExpiryData: false
    };

    // TODO: Check if category requires expiry (would need to be loaded separately)
    // For now, assume products with expiryDate require expiry tracking
    enhanced.categoryRequiresExpiry = !!product.expiryDate;

    if (product.expiryDate) {
      enhanced.daysUntilExpiry = this.calculateDaysUntilExpiry(product.expiryDate);
      enhanced.expiryStatus = this.getExpiryStatusFromDays(enhanced.daysUntilExpiry);
      enhanced.expiryStatusText = this.formatDaysUntilExpiry(enhanced);
    } else if (enhanced.categoryRequiresExpiry) {
      enhanced.expiryStatus = 'missing';
      enhanced.needsExpiryData = true;
      enhanced.expiryStatusText = 'Missing expiry data';
    } else {
      enhanced.expiryStatusText = 'Not required';
    }

    return enhanced;
  }

  /**
   * Calculate days until expiry
   */
  private calculateDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get expiry status from days until expiry
   */
  private getExpiryStatusFromDays(daysUntilExpiry: number): 'good' | 'warning' | 'critical' | 'expired' {
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 3) return 'critical';
    if (daysUntilExpiry <= 7) return 'warning';
    return 'good';
  }




  /**
   * Format expiry date display
   */
  formatExpiryDisplay(product: ProductWithExpiry): string {
    if (!product.categoryRequiresExpiry) return 'Not Required';
    if (!product.expiryDate) return 'Not Set';
    return this.formatDate(product.expiryDate);
  }

  /**
   * Format days until expiry
   */
  formatDaysUntilExpiry(product: ProductWithExpiry): string {
    if (!product.categoryRequiresExpiry) return '-';
    if (!product.expiryDate) return 'Missing';
    
    const days = product.daysUntilExpiry!;
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Expires today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  /**
   * Action to add expiry date
   */
  addExpiryDate(product: ProductWithExpiry): void {
    this.router.navigate(['/dashboard/inventory/product/edit', product.id], {
      queryParams: { focus: 'expiry' }
    });
  }

  /**
   * Filter by expiry status
   */
  onExpiryFilterChange(filter: ExpiryFilterType): void {
    this.expiryFilter.set(filter);
    this.filterForm.patchValue({ expiryFilter: filter });
  }

  /**
   * Update filter option counts
   */
  private updateExpiryFilterCounts(): void {
    const stats = this.expiryStats();
    this.expiryFilterOptions = [
      { value: ExpiryFilterType.ALL, label: 'All Status', icon: '📋', count: stats.total },
      { value: ExpiryFilterType.GOOD, label: 'Good (30+ days)', icon: '✅', count: stats.good },
      { value: ExpiryFilterType.WARNING, label: 'Warning (7-30 days)', icon: '⚠️', count: stats.warning },
      { value: ExpiryFilterType.CRITICAL, label: 'Critical (0-7 days)', icon: '🚨', count: stats.critical },
      { value: ExpiryFilterType.EXPIRED, label: 'Expired', icon: '❌', count: stats.expired },
      { value: ExpiryFilterType.MISSING, label: 'Missing Expiry', icon: '📝', count: stats.missing }
    ];
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

}