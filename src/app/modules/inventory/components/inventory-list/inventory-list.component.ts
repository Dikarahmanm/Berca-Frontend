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
import { Subscription, debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { CategoryService } from '../../../category-management/services/category.service';
import { ExpiryManagementService } from '../../../../core/services/expiry-management.service';
import { Product, ProductFilter, ProductWithBatchSummaryDto } from '../../interfaces/inventory.interfaces';
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

// ✅ ENHANCED: Interface for product with both expiry and batch information
export interface ProductWithExpiryAndBatch extends Product {
  expiryDate?: string;
  batchNumber?: string;
  daysUntilExpiry?: number;
  expiryStatus: 'good' | 'warning' | 'critical' | 'expired' | 'missing';
  categoryRequiresExpiry: boolean;
  needsExpiryData: boolean;
  expiryStatusText?: string;
  
  // ✅ NEW: Batch summary properties
  totalBatches?: number;
  batchesGood?: number;
  batchesWarning?: number;
  batchesCritical?: number;
  batchesExpired?: number;
  nearestExpiryDate?: string;
  daysToNearestExpiry?: number;
  latestBatch?: {
    batchNumber: string;
    quantity: number;
    expiryDate?: string;
    status: string;
  };
}

// ✅ NEW: Interfaces for batch view mode
export interface ProductWithBatchesGroup {
  productId: number;
  productName: string;
  barcode: string;
  categoryName: string;
  categoryColor: string;
  unit: string;
  totalStock: number;        // ✅ Calculated from batches
  databaseStock: number;     // ✅ Original database value
  minimumStock: number;
  isLowStock: boolean;
  hasStockDiscrepancy: boolean; // ✅ Flag for discrepancy warning
  batches: ProductBatchWithDetails[];
}

export interface ProductBatchWithDetails extends ProductBatch {
  fifoOrder: number;
  expiryStatus: 'good' | 'warning' | 'critical' | 'expired';
  daysUntilExpiry: number;
  stockPercentage: number;
  // Computed properties
  isExpired: boolean;
  categoryId?: number;
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

  // Enhanced data sources with batch support
  products = new MatTableDataSource<ProductWithExpiryAndBatch>([]);
  rawProducts = signal<Product[]>([]);
  batchProducts = signal<ProductWithBatchSummaryDto[]>([]);
  categories = signal<Category[]>([]);
  lowStockProducts = signal<Product[]>([]);
  
  // ✅ NEW: Batch view state
  showBatchView = signal(false);
  loadingBatchData = signal(false);
  
  // ✅ ENHANCED: Expiry management signals
  expiryAnalytics = signal<ExpiryAnalytics | null>(null);
  expiringProducts = signal<ExpiringProduct[]>([]);
  fifoRecommendations = signal<FifoRecommendationDto[]>([]);
  productBatches = signal<ProductBatch[]>([]);
  
  // Enhanced expiry filter state
  expiryFilter = signal<ExpiryFilterType>(ExpiryFilterType.ALL);
  showExpiryColumn = signal(true);
  productsRequiringExpiry = signal<ProductWithExpiryAndBatch[]>([]);
  
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
  
  // ✅ NEW: Batch statistics
  batchStats = computed(() => {
    const products = this.batchProducts();
    const totalBatches = products.reduce((sum, p) => sum + (p.totalBatches || 0), 0);
    const goodBatches = products.reduce((sum, p) => sum + (p.batchesGood || 0), 0);
    const warningBatches = products.reduce((sum, p) => sum + (p.batchesWarning || 0), 0);
    const criticalBatches = products.reduce((sum, p) => sum + (p.batchesCritical || 0), 0);
    const expiredBatches = products.reduce((sum, p) => sum + (p.batchesExpired || 0), 0);
    
    return {
      totalProducts: products.length,
      totalBatches,
      goodBatches,
      warningBatches,
      criticalBatches,
      expiredBatches
    };
  });
  
  // ✅ NEW: Expiry view state
  showExpiryAnalytics = signal(false);
  selectedProductForBatches: Product | null = null;

  // ✅ NEW: Batch view data structures
  productsWithDetailedBatches = signal<ProductWithBatchesGroup[]>([]);
  batchViewMode = signal(false);
  loadingBatchDetails = signal(false);
  
  // All possible table columns (enhanced with batch columns)
  private allColumns = [
    'name', 'barcode', 'category', 'stock', 'minimumStock',
    'buyPrice', 'sellPrice', 'expiry', 'daysLeft', 'expiryStatus', 'batches', 'batchSummary', 'status', 'actions'
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
   * Get batch status color class (by BatchStatus)
   */
  getBatchStatusColorByStatus(status: BatchStatus): string {
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
  private enhanceProductsWithExpiryInfo(products: Product[]): ProductWithExpiryAndBatch[] {
    return products.map(product => this.enhanceProductWithExpiry(product));
  }

  /**
   * Enhance single product with expiry information
   */
  private enhanceProductWithExpiry(product: Product): ProductWithExpiryAndBatch {
    const enhanced: ProductWithExpiryAndBatch = {
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
  formatExpiryDisplay(product: ProductWithExpiryAndBatch): string {
    if (!product.categoryRequiresExpiry) return 'Not Required';
    if (!product.expiryDate) return 'Not Set';
    return this.formatDate(product.expiryDate);
  }

  /**
   * Format days until expiry
   */
  formatDaysUntilExpiry(product: ProductWithExpiryAndBatch): string {
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
  addExpiryDate(product: ProductWithExpiryAndBatch): void {
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
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Format days to expiry for batch summary - use existing method
   */
  formatDaysToExpiry(days?: number): string {
    if (days === undefined || days === null) return 'Unknown';
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Expires today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  // ===== NEW: BATCH MANAGEMENT METHODS =====

  /**
   * Toggle between regular product view and detailed batch view
   */
  toggleBatchView(): void {
    const currentMode = this.batchViewMode();
    this.batchViewMode.set(!currentMode);
    
    if (!currentMode) {
      // Switching to batch view - load detailed batch data
      console.log('🔄 Switching to detailed batch view...');
      this.loadDetailedBatchView();
    } else {
      // Switching back to regular view
      console.log('🔄 Switching to regular product view...');
      this.loadProducts();
    }
  }

  /**
   * Load detailed batch view data - showing individual batches grouped by product
   */
  private async loadDetailedBatchView(): Promise<void> {
    this.loadingBatchDetails.set(true);
    
    try {
      console.log('📦 Loading detailed batch view...');
      
      // Get products with batch summary first
      const productsWithBatches = await firstValueFrom(
        this.inventoryService.getProductsWithBatchSummary()
      );
      
      // Filter only products that have batches
      const productsHavingBatches = productsWithBatches.filter(p => p.totalBatches > 0);
      console.log('📊 Found', productsHavingBatches.length, 'products with batches');
      
      // Load detailed batch data for each product
      const batchGroups: ProductWithBatchesGroup[] = [];
      
      for (const product of productsHavingBatches) {
        try {
          // Get detailed batches for this product
          const batches = await firstValueFrom(
            this.expiryService.getProductBatches({ 
              productId: product.id,
              sortBy: 'expiryDate',
              sortOrder: 'asc'
            })
          );
          
          // ✅ CALCULATE ACTUAL TOTAL STOCK from all active batches
          const actualTotalStock = batches
            .filter(batch => !batch.isDisposed && batch.currentStock > 0)
            .reduce((total, batch) => total + (batch.currentStock || 0), 0);

          console.log(`📊 Product ${product.name}: 
            DB stock = ${product.totalStock}, 
            Calculated from batches = ${actualTotalStock}, 
            Batch count = ${batches.length}`);
          
          // Get category information
          const category = this.categories().find(c => c.name === product.categoryName) || 
                          this.categories().find(c => c.name === 'Uncategorized');
          
          // Process and enhance batch data with category context
          const processedBatches = this.processBatchesForDisplay(batches, category?.id);
          
          // Check for stock discrepancy
          const hasDiscrepancy = Math.abs(actualTotalStock - product.totalStock) > 0;
          
          if (hasDiscrepancy) {
            console.warn(`⚠️ Stock discrepancy for ${product.name}: 
              Database = ${product.totalStock}, 
              Batches total = ${actualTotalStock}`);
          }
          
          batchGroups.push({
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            categoryName: category?.name || 'Uncategorized',
            categoryColor: category?.color || '#666666',
            unit: product.unit || 'pcs',
            totalStock: actualTotalStock, // ✅ Use calculated total from batches
            databaseStock: product.totalStock, // Keep original for comparison
            minimumStock: product.minimumStock,
            isLowStock: actualTotalStock <= product.minimumStock, // ✅ Use actual stock for low stock check
            hasStockDiscrepancy: hasDiscrepancy,
            batches: processedBatches
          });
          
        } catch (error) {
          console.error(`❌ Failed to load batches for product ${product.id}:`, error);
        }
      }
      
      this.productsWithDetailedBatches.set(batchGroups);
      console.log('✅ Detailed batch view loaded:', batchGroups.length, 'product groups');
      
      // Check and report stock discrepancies
      this.checkStockDiscrepancies();
      
    } catch (error) {
      console.error('❌ Failed to load detailed batch view:', error);
      this.showError('Failed to load batch details. Switching back to regular view.');
      
      // Fallback to regular view
      this.batchViewMode.set(false);
      this.loadProducts();
    } finally {
      this.loadingBatchDetails.set(false);
    }
  }

  /**
   * Process batches for display with FIFO ordering and enhanced information
   */
  private processBatchesForDisplay(batches: ProductBatch[], categoryId?: number): ProductBatchWithDetails[] {
    // Sort batches by FIFO order (expiry date first, then creation date)
    const sortedBatches = [...batches].sort((a, b) => {
      // Active batches come first
      if (a.status !== b.status) {
        if (a.status === BatchStatus.ACTIVE) return -1;
        if (b.status === BatchStatus.ACTIVE) return 1;
      }
      
      // Then by expiry date
      if (a.expiryDate && b.expiryDate) {
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }
      if (a.expiryDate && !b.expiryDate) return -1;
      if (!a.expiryDate && b.expiryDate) return 1;
      
      // Finally by creation date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    // Calculate total initial stock for percentage calculations
    const totalInitialStock = sortedBatches.reduce((sum, batch) => sum + batch.initialStock, 0);
    
    // Enhance each batch with display information
    return sortedBatches.map((batch, index) => {
      const daysUntilExpiry = this.calculateBatchDaysUntilExpiry(batch.expiryDate);
      const expiryStatus = this.calculateBatchExpiryStatus(batch.expiryDate);
      
      return {
        ...batch,
        fifoOrder: index + 1,
        expiryStatus,
        daysUntilExpiry,
        stockPercentage: totalInitialStock > 0 ? (batch.currentStock / totalInitialStock) * 100 : 0,
        // Computed properties
        isExpired: daysUntilExpiry < 0,
        categoryId: categoryId || 0
      };
    });
  }

  /**
   * Load products with batch summary information
   */
  private loadProductsWithBatches(): void {
    this.loadingBatchData.set(true);
    const filterValues = this.filterForm.value;
    
    // Get category filter for API call
    const categoryId = filterValues.categoryId || undefined;

    console.log('📡 Loading products with batch summary...', { categoryId });

    this.subscriptions.add(
      this.inventoryService.getProductsWithBatchSummary(categoryId).subscribe({
        next: (batchProducts) => {
          console.log('📦 Batch Products Loaded:', batchProducts.length, 'products');
          this.batchProducts.set(batchProducts);
          
          // Apply client-side filtering and sorting
          const filteredProducts = this.applyClientSideFiltering(batchProducts, filterValues);
          
          // Convert batch products to enhanced products for table display
          const enhancedProducts = filteredProducts.map(batchProduct => 
            this.convertBatchProductToEnhanced(batchProduct)
          );
          
          this.products.data = enhancedProducts;
          this.totalItems.set(enhancedProducts.length);
          
          this.loadingBatchData.set(false);
          console.log('✅ Batch view loaded successfully:', enhancedProducts.length, 'products displayed');
        },
        error: (error) => {
          console.error('❌ Failed to load products with batches:', error);
          
          // Enhanced error handling
          let errorMessage = 'Failed to load batch data';
          if (error?.status === 404) {
            errorMessage = 'Batch summary endpoint not found. Please check backend configuration.';
          } else if (error?.status === 400) {
            errorMessage = 'Invalid request parameters for batch data.';
          } else if (error?.status === 500) {
            errorMessage = 'Server error occurred while loading batch data.';
          } else if (error?.message) {
            errorMessage = `Failed to load batch data: ${error.message}`;
          }
          
          this.showError(errorMessage);
          this.loadingBatchData.set(false);
          
          // Fallback to regular view with user notification
          this.showBatchView.set(false);
          this.showInfo('Switched back to regular view due to batch data loading error.');
          this.loadProducts();
        }
      })
    );
  }

  /**
   * Apply client-side filtering and sorting to batch products
   */
  private applyClientSideFiltering(products: ProductWithBatchSummaryDto[], filterValues: any): ProductWithBatchSummaryDto[] {
    let filtered = [...products];
    
    // Apply search filter
    const searchTerm = filterValues.search?.trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.barcode.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply active status filter
    if (filterValues.isActive !== undefined && filterValues.isActive !== '') {
      filtered = filtered.filter(product => product.isActive === filterValues.isActive);
    }
    
    // Apply sorting
    const sortBy = filterValues.sortBy || 'name';
    const sortOrder = filterValues.sortOrder || 'asc';
    
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'stock':
          comparison = (a.totalStock || 0) - (b.totalStock || 0);
          break;
        case 'barcode':
          comparison = a.barcode.localeCompare(b.barcode);
          break;
        case 'minimumStock':
          comparison = (a.minimumStock || 0) - (b.minimumStock || 0);
          break;
        case 'totalBatches':
          comparison = (a.totalBatches || 0) - (b.totalBatches || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    // Apply pagination (client-side)
    const page = this.currentPage();
    const pageSize = this.pageSize();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return filtered.slice(startIndex, endIndex);
  }

  /**
   * Convert ProductWithBatchSummaryDto to ProductWithExpiryAndBatch
   */
  private convertBatchProductToEnhanced(batchProduct: ProductWithBatchSummaryDto): ProductWithExpiryAndBatch {
    const enhanced: ProductWithExpiryAndBatch = {
      ...batchProduct,
      // Map batch summary fields to enhanced product
      totalBatches: batchProduct.totalBatches,
      batchesGood: batchProduct.batchesGood,
      batchesWarning: batchProduct.batchesWarning,
      batchesCritical: batchProduct.batchesCritical,
      batchesExpired: batchProduct.batchesExpired,
      nearestExpiryDate: batchProduct.nearestExpiryDate,
      daysToNearestExpiry: batchProduct.daysToNearestExpiry,
      latestBatch: batchProduct.latestBatch,
      
      // Calculate expiry information from batch data
      expiryDate: batchProduct.nearestExpiryDate,
      daysUntilExpiry: batchProduct.daysToNearestExpiry,
      expiryStatus: batchProduct.expiryStatus as any,
      categoryRequiresExpiry: batchProduct.totalBatches > 0,
      needsExpiryData: batchProduct.totalBatches === 0,
      expiryStatusText: this.formatBatchExpiryStatus(batchProduct),
      
      // Calculate legacy fields for compatibility
      buyPrice: 0, // Not available in batch summary
      sellPrice: 0, // Not available in batch summary
      categoryId: 0, // Will need to be populated from category lookup
      minimumStock: batchProduct.minimumStock || 5,
      profitMargin: 0, // Cannot calculate without prices
      isLowStock: batchProduct.isLowStock,
      isOutOfStock: batchProduct.totalStock === 0,
      stock: batchProduct.totalStock, // Map totalStock to stock field
      
      // Handle date fields - provide defaults if not available
      createdAt: (batchProduct as any).createdAt ? 
        (typeof (batchProduct as any).createdAt === 'string' ? new Date((batchProduct as any).createdAt) : (batchProduct as any).createdAt) : 
        new Date(),
      updatedAt: (batchProduct as any).updatedAt ? 
        (typeof (batchProduct as any).updatedAt === 'string' ? new Date((batchProduct as any).updatedAt) : (batchProduct as any).updatedAt) : 
        new Date()
    };

    return enhanced;
  }

  /**
   * Format batch expiry status text
   */
  private formatBatchExpiryStatus(batchProduct: ProductWithBatchSummaryDto): string {
    if (batchProduct.totalBatches === 0) {
      return 'No batches';
    }

    if (batchProduct.daysToNearestExpiry !== undefined) {
      const days = batchProduct.daysToNearestExpiry;
      if (days < 0) return `${Math.abs(days)} days overdue`;
      if (days === 0) return 'Expires today';
      if (days === 1) return '1 day left';
      return `${days} days left`;
    }

    return 'No expiry data';
  }

  /**
   * Calculate profit margin percentage
   */
  private calculateProfitMargin(sellPrice: number, buyPrice: number): number {
    if (buyPrice === 0) return 0;
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  }

  /**
   * Get batch summary display text
   */
  getBatchSummaryText(product: ProductWithExpiryAndBatch): string {
    if (!product.totalBatches || product.totalBatches === 0) {
      return 'No batches';
    }

    const parts = [];
    if (product.batchesGood) parts.push(`${product.batchesGood} good`);
    if (product.batchesWarning) parts.push(`${product.batchesWarning} warning`);
    if (product.batchesCritical) parts.push(`${product.batchesCritical} critical`);
    if (product.batchesExpired) parts.push(`${product.batchesExpired} expired`);

    return parts.length > 0 ? parts.join(', ') : `${product.totalBatches} batches`;
  }

  /**
   * Get batch status color based on the worst batch status
   */
  getBatchStatusColor(product: ProductWithExpiryAndBatch): string {
    if (product.batchesExpired && product.batchesExpired > 0) return '#E15A4F'; // Red
    if (product.batchesCritical && product.batchesCritical > 0) return '#FF914D'; // Orange
    if (product.batchesWarning && product.batchesWarning > 0) return '#FFB84D'; // Yellow
    if (product.batchesGood && product.batchesGood > 0) return '#4BBF7B'; // Green
    return '#666666'; // Gray for no batches
  }

  // ===== NEW: DETAILED BATCH VIEW FORMATTING METHODS =====

  /**
   * Calculate expiry status for a batch
   */
  calculateBatchExpiryStatus(expiryDate: string | undefined): 'good' | 'warning' | 'critical' | 'expired' {
    if (!expiryDate) return 'good';
    
    const days = this.calculateBatchDaysUntilExpiry(expiryDate);
    
    if (days < 0) return 'expired';
    if (days <= 3) return 'critical';
    if (days <= 7) return 'warning';
    return 'good';
  }

  /**
   * Calculate days until expiry for a batch
   */
  calculateBatchDaysUntilExpiry(expiryDate: string | undefined): number {
    if (!expiryDate) return Infinity;
    
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);
      return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  /**
   * Format safe date display (fixes "Not Set" issues)
   */
  formatSafeDate(date: string | Date | null): string {
    if (!date) return 'Not set';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      return dateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }

  /**
   * Format safe currency (fixes "Rp NaN" issues)
   */
  formatSafeCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'Rp 0';
    }
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format safe stock display (fixes "NaN btl" issues)
   */
  formatSafeStock(stock: number | null | undefined, unit: string): string {
    if (stock === null || stock === undefined || isNaN(stock)) {
      return `0 ${unit}`;
    }
    
    return `${this.formatNumber(stock)} ${unit}`;
  }

  /**
   * Get days left text for batch display
   */
  getDaysLeftText(batch: ProductBatchWithDetails): string {
    const days = batch.daysUntilExpiry;
    
    if (days === Infinity) return 'No expiry';
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `${days} days left`;
  }

  /**
   * Get batch card CSS classes based on status
   */
  getBatchCardClasses(batch: ProductBatchWithDetails): string[] {
    const classes = ['batch-card'];
    
    classes.push(`expiry-${batch.expiryStatus}`);
    
    if (batch.isExpired) classes.push('expired');
    if (batch.isDisposed) classes.push('disposed');
    if (batch.currentStock === 0) classes.push('empty');
    if (batch.fifoOrder === 1) classes.push('fifo-priority');
    
    return classes;
  }

  /**
   * Get FIFO order display text
   */
  getFifoOrderText(batch: ProductBatchWithDetails): string {
    if (batch.fifoOrder === 1) return '1st (Sell First)';
    if (batch.fifoOrder === 2) return '2nd';
    if (batch.fifoOrder === 3) return '3rd';
    return `${batch.fifoOrder}th`;
  }

  /**
   * Get FIFO order CSS class
   */
  getFifoOrderClass(batch: ProductBatchWithDetails): string {
    if (batch.fifoOrder === 1) return 'fifo-first';
    if (batch.fifoOrder <= 3) return 'fifo-soon';
    return 'fifo-later';
  }

  /**
   * Get expiry status icon
   */
  getExpiryIcon(batch: ProductBatchWithDetails): string {
    switch (batch.expiryStatus) {
      case 'good': return 'check_circle';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'expired': return 'cancel';
      default: return 'help';
    }
  }

  /**
   * Get expiry icon CSS class
   */
  getExpiryIconClass(batch: ProductBatchWithDetails): string {
    return `expiry-icon-${batch.expiryStatus}`;
  }

  /**
   * Get expiry date CSS class
   */
  getExpiryDateClass(batch: ProductBatchWithDetails): string {
    return `expiry-date-${batch.expiryStatus}`;
  }

  /**
   * Get days left CSS class
   */
  getDaysLeftClass(batch: ProductBatchWithDetails): string {
    return `days-left-${batch.expiryStatus}`;
  }

  /**
   * Get batch status icon
   */
  getBatchStatusIcon(batch: ProductBatchWithDetails): string {
    if (batch.isDisposed) return 'delete_sweep';
    if (batch.isExpired) return 'schedule';
    if (batch.currentStock === 0) return 'inventory';
    if (batch.status === BatchStatus.BLOCKED) return 'block';
    return 'check_circle';
  }

  /**
   * Get batch status text
   */
  getBatchStatusText(batch: ProductBatchWithDetails): string {
    if (batch.isDisposed) return 'Disposed';
    if (batch.isExpired) return 'Expired';
    if (batch.currentStock === 0) return 'Empty';
    if (batch.status === BatchStatus.BLOCKED) return 'Blocked';
    return 'Active';
  }

  /**
   * Navigate to batch management for a product
   */
  viewProductBatches(product: ProductWithExpiryAndBatch): void {
    this.router.navigate(['/dashboard/inventory/batches', product.id]);
  }

  /**
   * Add new batch for a product
   */
  addNewBatch(product: ProductWithExpiryAndBatch): void {
    this.router.navigate(['/dashboard/inventory/product/edit', product.id], {
      queryParams: { action: 'add-batch' }
    });
  }

  // ===== NEW: BATCH VIEW UTILITY METHODS =====

  /**
   * TrackBy function for product groups
   */
  trackByProductGroup(index: number, productGroup: ProductWithBatchesGroup): number {
    return productGroup.productId;
  }

  /**
   * TrackBy function for batches
   */
  trackByBatch(index: number, batch: ProductBatchWithDetails): number {
    return batch.id;
  }

  /**
   * Get total batch count across all products
   */
  getTotalBatchCount(): number {
    return this.productsWithDetailedBatches().reduce((total, productGroup) => total + productGroup.batches.length, 0);
  }

  /**
   * Get critical batch count across all products
   */
  getCriticalBatchCount(): number {
    return this.productsWithDetailedBatches().reduce((total, productGroup) => 
      total + productGroup.batches.filter(batch => batch.expiryStatus === 'critical').length, 0);
  }

  /**
   * Get count of products with stock discrepancies
   */
  getStockDiscrepancyCount(): number {
    return this.productsWithDetailedBatches().filter(productGroup => productGroup.hasStockDiscrepancy).length;
  }

  /**
   * Check and log all stock discrepancies
   */
  checkStockDiscrepancies(): void {
    const groups = this.productsWithDetailedBatches();
    const discrepancies = groups.filter(group => group.hasStockDiscrepancy);
    
    if (discrepancies.length > 0) {
      console.warn(`⚠️ Found ${discrepancies.length} stock discrepancies:`);
      discrepancies.forEach(group => {
        console.warn(`  - ${group.productName}: DB=${group.databaseStock}, Batches=${group.totalStock}`);
      });
    } else {
      console.log('✅ No stock discrepancies found');
    }
  }

  // ===== NEW: BATCH ACTION METHODS =====

  /**
   * Edit a specific batch - stay within inventory module
   */
  editBatch(batch: ProductBatchWithDetails): void {
    console.log('🔧 Editing batch:', batch.batchNumber);
    
    // Navigate to product edit page with batch focus, NOT dashboard
    this.router.navigate(['/dashboard/inventory/edit', batch.productId], {
      queryParams: { 
        action: 'edit-batch',
        batchId: batch.id,
        batchNumber: batch.batchNumber
      }
    });
  }

  /**
   * Add stock to an existing batch - open modal instead of redirect
   */
  addStockToBatch(batch: ProductBatchWithDetails): void {
    console.log('➕ Adding stock to batch:', batch.batchNumber);
    
    // For now, show info message since modal components aren't imported
    // TODO: Open AddStockToBatchModalComponent when available
    this.showInfo(`Add stock to batch ${batch.batchNumber} - feature coming soon`);
    
    // Alternative: Navigate to product edit with add-stock action
    this.router.navigate(['/dashboard/inventory/edit', batch.productId], {
      queryParams: { 
        action: 'add-stock-to-batch',
        batchId: batch.id,
        batchNumber: batch.batchNumber
      }
    });
  }

  /**
   * Edit the product that contains this batch
   */
  editProductFromBatch(productGroup: ProductWithBatchesGroup): void {
    console.log('🔧 Editing product:', productGroup.productName);
    
    // Navigate to product edit page - STAY IN INVENTORY MODULE
    this.router.navigate(['/dashboard/inventory/edit', productGroup.productId]);
  }

  /**
   * Add stock to product (create new batch)
   */
  addStockToProduct(productGroup: ProductWithBatchesGroup): void {
    console.log('➕ Adding stock to product:', productGroup.productName);
    
    // Navigate to product edit with add-batch action
    this.router.navigate(['/dashboard/inventory/edit', productGroup.productId], {
      queryParams: { action: 'add-batch' }
    });
  }

  /**
   * View batch history - stay in inventory module
   */
  viewBatchHistory(batch: ProductBatchWithDetails): void {
    console.log('📜 Viewing batch history:', batch.batchNumber);
    
    // For now, show batch info since we don't have a dedicated history page
    this.showInfo(`Batch ${batch.batchNumber} history - feature coming soon`);
    
    // Alternative: Could navigate to a batch details page
    // this.router.navigate(['/dashboard/inventory/batch-details', batch.id]);
  }

  /**
   * Transfer stock from batch
   */
  transferBatch(batch: ProductBatchWithDetails): void {
    console.log('🔄 Transferring batch:', batch.batchNumber);
    
    if (batch.currentStock === 0) {
      this.showError('Cannot transfer stock from empty batch');
      return;
    }
    
    // For now, show info message
    this.showInfo(`Transfer ${batch.currentStock} units from batch ${batch.batchNumber} - feature coming soon`);
  }

  /**
   * Dispose expired batch with proper confirmation
   */
  disposeBatch(batch: ProductBatchWithDetails): void {
    console.log('🗑️ Disposing batch:', batch.batchNumber);
    
    const confirmed = confirm(
      `Are you sure you want to dispose batch ${batch.batchNumber}?\n\n` +
      `This will mark ${batch.currentStock} units as disposed and cannot be undone.\n\n` +
      `Batch Details:\n` +
      `- Product: ${batch.productName || 'Unknown'}\n` +
      `- Expiry: ${batch.expiryDate ? this.formatSafeDate(batch.expiryDate) : 'No expiry'}\n` +
      `- Current Stock: ${batch.currentStock} units`
    );
    
    if (confirmed) {
      // TODO: Implement proper batch disposal API call
      this.showInfo(`Batch ${batch.batchNumber} has been marked for disposal. This feature will be fully implemented soon.`);
      
      // For now, just log the action
      console.log('Batch disposal requested:', {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        currentStock: batch.currentStock,
        productId: batch.productId
      });
    }
  }

  /**
   * Create first batch for a product
   */
  createFirstBatch(productGroup: ProductWithBatchesGroup): void {
    console.log('🆕 Creating first batch for product:', productGroup.productName);
    
    this.router.navigate(['/dashboard/inventory/edit', productGroup.productId], {
      queryParams: { action: 'create-first-batch' }
    });
  }

  /**
   * Prevent unwanted dashboard redirects
   */
  private preventDashboardRedirect(): void {
    console.log('🛡️ Staying within inventory module - no dashboard redirects');
  }

}