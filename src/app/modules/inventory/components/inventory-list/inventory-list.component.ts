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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subscription, debounceTime, distinctUntilChanged, firstValueFrom, map } from 'rxjs';

import { InventoryService, BulkUpdateExpiryBatchesRequest, BulkUpdateResult } from '../../services/inventory.service';
// NEW: Branch-aware services
import { BranchInventoryService, BranchProductDto, BranchInventoryFilter } from '../../services/branch-inventory.service';
import { StateService } from '../../../../core/services/state.service';
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

// NEW: Branch filter enum
export enum BranchFilterType {
  ALL = 'all',
  CURRENT = 'current',
  SPECIFIC = 'specific'
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
  
  // ✅ NEW: For batch detail view compatibility
  batches?: ProductBatchWithDetails[];
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
    MatDividerModule,
    MatCheckboxModule
  ],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss', './inventory-list-redesign.scss']
})
export class InventoryListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Responsive signals
  public screenWidth = signal<number>(window.innerWidth);
  private isMobile = computed(() => this.screenWidth() < 768);
  private isTablet = computed(() => this.screenWidth() >= 768 && this.screenWidth() < 1024);
  private isDesktop = computed(() => this.screenWidth() >= 1024);
  private debugCounter = 0; // Debug counter for stock display logging

  // NEW: Branch-aware signals and computed properties
  readonly activeBranch = computed(() => this.stateService.activeBranch());
  readonly availableBranches = computed(() => this.stateService.accessibleBranches());
  readonly canManageBranches = computed(() => this.stateService.hasPermission('branch.manage'));
  
  // Branch filter state
  selectedBranchIds = signal<number[]>([]);
  branchFilterType = signal<BranchFilterType>(BranchFilterType.CURRENT);
  
  // Branch products from branch inventory service
  readonly branchProducts = computed(() => this.branchInventoryService.filteredProducts());
  readonly branchLoading = computed(() => this.branchInventoryService.loading());

  // ✅ NEW: Combined products with branch-aware priority and type safety
  readonly displayProducts = computed((): ProductWithExpiryAndBatch[] => {
    const branchProducts = this.branchProducts();
    const regularProducts = this.products.data;
    const branchFilterType = this.branchFilterType();

    // Always prioritize branch products when available (regardless of filter type)
    if (branchProducts && branchProducts.length > 0) {
      console.log('🏢 Using branch-specific products:', branchProducts.length, 'with filter:', branchFilterType);
      console.log('📊 Branch Products Sample (first 3):',
        branchProducts.slice(0, 3).map(bp => ({
          id: bp.id,
          name: bp.name,
          branchStock: bp.branchStock,
          branchId: bp.branchId,
          branchName: bp.branchName
        }))
      );
      // Convert BranchProductDto to compatible format
      return branchProducts.map(bp => ({
        ...bp,
        // Map branch-specific fields to standard fields for template compatibility
        stock: bp.branchStock,
        minimumStock: bp.branchMinimumStock,
        // Add missing properties with defaults
        categoryRequiresExpiry: false,
        needsExpiryData: false,
        totalBatches: 0,
        expiryStatus: 'good' as const,
        daysUntilExpiry: undefined,
        expiryStatusText: undefined,
        batchesGood: undefined,
        batchesWarning: undefined,
        batchesCritical: undefined,
        batchesExpired: undefined,
        nearestExpiryDate: undefined,
        daysToNearestExpiry: undefined,
        latestBatch: undefined,
        batches: undefined,
        // Preserve original branch fields
        branchStock: bp.branchStock,
        branchMinimumStock: bp.branchMinimumStock
      } as ProductWithExpiryAndBatch));
    }

    // Otherwise use regular products (which might be total stock across branches)
    console.log('📦 Using regular products:', regularProducts.length);
    return regularProducts;
  });

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
  
  // ✅ NEW: Enhanced UI state signals for column system
  viewMode = signal<'cards' | 'table'>('cards');
  selectedBatchView = signal<'summary' | 'detailed'>('summary');
  filterPanelOpen = signal(false);
  sortModalOpen = signal(false);
  expandedProducts = new Set<number>();

  // Enhanced computed properties
  enhancedProducts = computed(() => this.enhanceProductsWithExpiryInfo(this.rawProducts()));
  
  // ✅ NEW: UI computed properties
  currentViewTitle = computed(() => this.batchViewMode() ? 'Batch Management View' : 'Product Management View');
  // ✅ UPDATED: Use branch-aware products when available
  filteredProductsCount = computed(() => {
    const displayProducts = this.displayProducts();
    return displayProducts ? displayProducts.length : 0;
  });
  visibleBatchesCount = computed(() => {
    const batchGroups = this.productsWithDetailedBatches();
    if (!batchGroups || !Array.isArray(batchGroups)) return 0;
    
    return batchGroups.reduce((sum, p) => {
      const batchCount = p?.batches?.length || 0;
      return sum + batchCount;
    }, 0);
  });
  isDesktopView = computed(() => this.screenWidth() >= 1024);
  
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
  // ✅ NEW: Batch view layout mode (grid or column)
  batchLayoutMode = signal<'grid' | 'list'>('grid');
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
  bulkUpdateForm!: FormGroup;

  // ✅ NEW: Bulk update state
  showBulkUpdateModal = signal(false);
  bulkUpdateLoading = signal(false);
  bulkUpdateResult = signal<BulkUpdateResult | null>(null);
  bulkUpdatePreview = signal<{ productsToUpdate: number; categoriesAffected: number; } | null>(null);
  
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
    // NEW: Branch-aware services
    private branchInventoryService: BranchInventoryService,
    private stateService: StateService,
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
    
    // NEW: Initialize branch data first, then load regular products
    this.initializeBranchData();
    
    // Load all data
    this.loadProducts();
    this.loadLowStockAlerts();
    this.loadExpiryAnalytics(); // ✅ NEW: Load expiry data
    this.loadExpiringProducts(); // ✅ NEW: Load expiring products
    this.loadFifoRecommendations(); // ✅ NEW: Load FIFO recommendations
    
    this.setupFilterWatchers();
    
    // Add debug logging after a short delay to see final state
    setTimeout(() => {
      this.debugStats();
    }, 2000);
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

    // ✅ NEW: Initialize bulk update form
    this.bulkUpdateForm = this.fb.group({
      categoryIds: [[]],
      defaultExpiryDays: [365],
      defaultSupplierName: ['System Migration'],
      forceUpdate: [false]
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

  // ✅ ENHANCED: LoadProducts with better sort handling and batch support
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

    // ✅ NEW: Use batch summary endpoint for better expiry and batch data
    const useProductsWithBatchSummary = true; // Enable batch data by default

    if (useProductsWithBatchSummary) {
      // Use batch summary endpoint
      this.subscriptions.add(
        this.inventoryService.getProductsWithBatchSummary(filter).subscribe({
          next: (batchProducts: any[]) => {
            const response = {
              products: batchProducts,
              totalItems: batchProducts.length,
              totalPages: 1,
              currentPage: 1,
              pageSize: batchProducts.length
            };
            this.handleProductsResponse(response);
          },
          error: (error: any) => {
            console.error('❌ Failed to load products with batch summary:', error);
            // Fallback to regular products endpoint
            this.loadProductsRegular(filter);
          }
        })
      );
    } else {
      this.loadProductsRegular(filter);
    }
  }

  private loadProductsRegular(filter: ProductFilter): void {
    this.subscriptions.add(
      this.inventoryService.getProducts(filter).subscribe({
        next: (response: any) => {
          this.handleProductsResponse(response);
        },
        error: (error: any) => {
          this.handleProductsError(error);
        }
      })
    );
  }

  private handleProductsResponse(response: any): void {
    const rawProductsData = response.products || [];
    
    // Update raw products signal
    this.rawProducts.set(rawProductsData);
    
    // Create enhanced products with both legacy and expiry enhancements
    const enhancedProducts = rawProductsData.map((product: any) => {
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
    
    // Set total items - use actual data length if API response is invalid
    const totalItemsFromResponse = response.totalItems || 0;
    const actualDataLength = enhancedProducts.length;
    const totalItems = totalItemsFromResponse > 0 ? totalItemsFromResponse : actualDataLength;
    
    this.totalItems.set(totalItems);
    
    console.log('📦 Products Data Summary:', {
      apiTotalItems: response.totalItems,
      actualDataLength,
      finalTotalItems: totalItems,
      enhancedProductsCount: enhancedProducts.length,
      sampleProduct: enhancedProducts[0],
      lowStockInData: enhancedProducts.filter((p: any) => p.stock <= (p.minimumStock || 5)).length
    });
    
    // Update expiry filter counts
    this.updateExpiryFilterCounts();
    
    this.loading.set(false);
    
    console.log('📦 Products Loaded & Enhanced with Batch Data:', {
      total: response.totalItems,
      products: enhancedProducts.length,
      sampleBatchInfo: enhancedProducts[0]?.nearestExpiryBatch || 'No batch data',
      productsWithBatches: enhancedProducts.filter((p: any) => p.totalBatches > 0).length
    });
  }

  private handleProductsError(error: any): void {
    console.error('❌ Failed to load products:', error);
    this.showError('Failed to load products: ' + error.message);
    this.loading.set(false);
    
    // ✅ FALLBACK: Create sample data for development/demo
    this.createFallbackData();
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

  // ===== BATCH & EXPIRY UTILITY METHODS =====

  /**
   * Get nearest expiry batch information for a product
   */
  getNearestExpiryBatch(product: any): { batchNumber: string; daysUntilExpiry: number; status: string } | null {
    // First, check if product has batch data from with-batch-summary endpoint
    if (product.nearestExpiryBatch) {
      const batch = product.nearestExpiryBatch;
      const expiryDate = new Date(batch.expiryDate);
      const today = new Date();
      const timeDiff = expiryDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      let status = 'good';
      if (daysUntilExpiry <= 0) {
        status = 'expired';
      } else if (daysUntilExpiry <= 7) {
        status = 'critical';
      } else if (daysUntilExpiry <= 30) {
        status = 'warning';
      }
      
      return {
        batchNumber: batch.batchNumber || 'Unknown',
        daysUntilExpiry,
        status
      };
    }
    
    // Fallback: check if product has batches array
    if (product.batches && product.batches.length > 0) {
      // Sort batches by expiry date to find nearest
      const sortedBatches = product.batches
        .filter((batch: any) => batch.expiryDate)
        .sort((a: any, b: any) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      
      if (sortedBatches.length > 0) {
        const nearestBatch = sortedBatches[0];
        const expiryDate = new Date(nearestBatch.expiryDate);
        const today = new Date();
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let status = 'good';
        if (daysUntilExpiry <= 0) {
          status = 'expired';
        } else if (daysUntilExpiry <= 7) {
          status = 'critical';
        } else if (daysUntilExpiry <= 30) {
          status = 'warning';
        }
        
        return {
          batchNumber: nearestBatch.batchNumber || 'Unknown',
          daysUntilExpiry,
          status
        };
      }
    }
    
    return null;
  }

  /**
   * Format expiry text for display
   */
  formatExpiryText(batch: { batchNumber: string; daysUntilExpiry: number; status: string }): string {
    const { batchNumber, daysUntilExpiry, status } = batch;
    
    if (status === 'expired') {
      return `Expired ${Math.abs(daysUntilExpiry)} days ago for batch ${batchNumber}`;
    } else {
      return `${daysUntilExpiry} days until expired for batch ${batchNumber}`;
    }
  }

  /**
   * Get CSS class for expiry status
   */
  getExpiryStatusClass(statusOrBatch: string | any): string {
    // Handle both string status and batch object
    if (typeof statusOrBatch === 'string') {
      return `expiry-${statusOrBatch}`;
    }

    // Handle batch object
    const batch = statusOrBatch;
    if (batch.isExpired) {
      return 'status-expired';
    } else if (batch.daysUntilExpiry <= 7) {
      return 'status-critical';
    } else if (batch.daysUntilExpiry <= 30) {
      return 'status-warning';
    } else {
      return 'status-good';
    }
  }

  /**
   * Check if product requires expiry tracking
   */
  requiresExpiryTracking(product: any): boolean {
    // Check if category requires expiry (from category data)
    const category = this.categories().find(c => c.id === product.categoryId);
    if (category && 'requiresExpiryDate' in category) {
      return (category as any).requiresExpiryDate;
    }
    
    // Fallback: check if product has any batch or expiry information
    return !!(product.nearestExpiryBatch || (product.batches && product.batches.length > 0) || product.expiryDate);
  }

  // ===== UTILITY METHODS =====

  getCategoryName(categoryId: number, product?: any): string {
    // First, try to get category name from product data (most efficient)
    if (product?.categoryName) {
      return product.categoryName;
    }
    
    // Find product in current data that has this categoryId and get its categoryName
    const productWithCategory = this.products.data.find(p => p.categoryId === categoryId && p.categoryName);
    if (productWithCategory?.categoryName) {
      return productWithCategory.categoryName;
    }
    
    // Fallback: Search in categories array (less efficient but covers edge cases)
    const category = this.categories().find(c => c.id === categoryId);
    if (category?.name) {
      return category.name;
    }
    
    // Ultimate fallback: Return Unknown with categoryId for debugging
    console.warn(`Category not found for categoryId: ${categoryId}`);
    return `Category #${categoryId}`;
  }

  getCategoryColor(categoryId: number, product?: any): string {
    // First, try to get category color from product data (most efficient)
    if (product?.categoryColor) {
      return product.categoryColor;
    }
    
    // Find product in current data that has this categoryId and get its categoryColor
    const productWithCategory = this.products.data.find(p => p.categoryId === categoryId && p.categoryColor);
    if (productWithCategory?.categoryColor) {
      return productWithCategory.categoryColor;
    }
    
    // Fallback: Search in categories array (less efficient but covers edge cases)
    const category = this.categories().find(c => c.id === categoryId);
    if (category?.color) {
      return category.color;
    }
    
    // Ultimate fallback
    return '#666666';
  }

  // ✅ UPDATED: Enhanced getStockStatus method moved to line 1852 - using new return type

  getStockStatusColor(product: Product): string {
    const status = this.getStockStatus(product);
    const colors = {
      'good': '#4BBF7B',     // Success green
      'low': '#FFB84D',      // Warning orange  
      'critical': '#E15A4F'  // Error red
    };
    return colors[status];
  }

  getStockStatusLabel(product: Product): string {
    const status = this.getStockStatus(product);
    const labels = {
      'critical': 'Out of Stock',
      'low': 'Low Stock',
      'good': 'Good Stock'
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

  formatNumber(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return new Intl.NumberFormat('id-ID').format(value);
  }

  formatPercentage(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) return '0%';
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

  // ✅ NEW: TrackBy function for products (referenced in template)
  trackById(index: number, item: any): number {
    return item.id;
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

  // Removed duplicate getter - using computed property instead

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
          console.error('❌ Failed to load expiry analytics:', error);
          // Service will handle fallback data automatically
          this.showError('Failed to load expiry analytics. Using fallback data.');
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
    try {
      const analytics = this.expiryAnalytics();
      const expiring = this.expiringProducts();
      const recommendations = this.fifoRecommendations();
      const currentProducts = this.products.data;

      // Calculate real low stock count from current products
      const realLowStockCount = this.calculateLowStockCount(currentProducts);
      
      // Calculate real average margin from products
      const realAverageMargin = this.calculateAverageMargin(currentProducts);

      return {
        totalProducts: this.totalItems(),
        lowStockCount: realLowStockCount,
        expiryTrackedProducts: analytics?.totalProductsWithExpiry || 0,
        expiringProducts: expiring.length,
        fifoRecommendations: recommendations.length,
        totalValueAtRisk: analytics?.potentialLossValue || 0,
        averageMargin: realAverageMargin
      };
    } catch (error) {
      console.warn('Error calculating comprehensive stats:', error);
      return {
        totalProducts: 0,
        lowStockCount: 0,
        expiryTrackedProducts: 0,
        expiringProducts: 0,
        fifoRecommendations: 0,
        totalValueAtRisk: 0,
        averageMargin: 0
      };
    }
  }

  /**
   * Safe computed property for template access
   */
  safeStats = computed(() => {
    return this.comprehensiveStats;
  });

  /**
   * Create fallback data when API is not available
   */
  private createFallbackData(): void {
    console.log('🔄 Creating fallback data for demo...');
    
    const fallbackProducts: Product[] = [
      {
        id: 1,
        name: 'Indomie Goreng Original',
        barcode: '8992388101001',
        categoryId: 1,
        stock: 150,
        minimumStock: 20,
        unit: 'pcs',
        buyPrice: 2500,
        sellPrice: 3000,
        description: 'Mie instan rasa ayam bawang',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Aqua Botol 600ml',
        barcode: '8993675201026',
        categoryId: 2,
        stock: 5, // Low stock
        minimumStock: 25,
        unit: 'btl',
        buyPrice: 3000,
        sellPrice: 4000,
        description: 'Air mineral dalam kemasan 600ml',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Teh Botol Sosro 450ml',
        barcode: '8992388101014',
        categoryId: 2,
        stock: 80,
        minimumStock: 15,
        unit: 'btl',
        buyPrice: 4000,
        sellPrice: 5000,
        description: 'Teh manis dalam botol 450ml',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 4,
        name: 'Beras Premium 5kg',
        barcode: '8998765432101',
        categoryId: 3,
        stock: 25,
        minimumStock: 10,
        unit: 'kg',
        buyPrice: 65000,
        sellPrice: 75000,
        description: 'Beras premium kualitas terbaik 5kg',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 5,
        name: 'Minyak Goreng Tropical 1L',
        barcode: '8997654321012',
        categoryId: 3,
        stock: 3, // Low stock
        minimumStock: 12,
        unit: 'btl',
        buyPrice: 18000,
        sellPrice: 22000,
        description: 'Minyak goreng berkualitas 1 liter',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Apply enhancements to fallback products
    const enhancedFallbackProducts = fallbackProducts.map(product => {
      const legacyEnhanced = {
        ...product,
        minimumStock: typeof product.minimumStock === 'number' ? product.minimumStock : 5,
        profitMargin: this.getMarginPercentage(product),
        isLowStock: product.stock <= (typeof product.minimumStock === 'number' ? product.minimumStock : 5),
        isOutOfStock: product.stock === 0,
        categoryName: this.getCategoryName(product.categoryId)
      };
      
      return this.enhanceProductWithExpiry(legacyEnhanced);
    });

    // Update the data
    this.products.data = enhancedFallbackProducts;
    this.totalItems.set(enhancedFallbackProducts.length);
    
    console.log('✅ Fallback data created:', {
      productsCount: enhancedFallbackProducts.length,
      lowStockCount: enhancedFallbackProducts.filter(p => p.isLowStock).length
    });

    this.showInfo('Using demo data - Backend API not available');
  }

  /**
   * Debug method to check current statistics
   */
  debugStats(): void {
    const stats = this.comprehensiveStats;
    const currentProducts = this.products.data;
    
    console.log('📊 Current Stats Debug:', {
      totalItems: this.totalItems(),
      currentProductsLength: currentProducts.length,
      comprehensiveStats: stats,
      sampleProducts: currentProducts.slice(0, 3).map(p => ({
        name: p.name,
        stock: p.stock,
        minimumStock: p.minimumStock,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
        isLowStock: p.stock <= (p.minimumStock || 5)
      }))
    });
  }

  /**
   * Calculate low stock count from current product data
   */
  private calculateLowStockCount(products: Product[]): number {
    if (!products || products.length === 0) return 0;
    
    return products.filter(product => {
      const minStock = typeof product.minimumStock === 'number' ? product.minimumStock : 5;
      return product.stock <= minStock && product.stock > 0; // Low stock but not out of stock
    }).length;
  }

  /**
   * Calculate average profit margin from actual product data
   */
  private calculateAverageMargin(products: Product[]): number {
    if (!products || products.length === 0) return 0;

    const validProducts = products.filter(p => 
      p.buyPrice && p.sellPrice && 
      p.buyPrice > 0 && p.sellPrice > p.buyPrice
    );

    if (validProducts.length === 0) return 0;

    const totalMargin = validProducts.reduce((sum, product) => {
      const margin = ((product.sellPrice - product.buyPrice) / product.sellPrice) * 100;
      return sum + margin;
    }, 0);

    return Math.round((totalMargin / validProducts.length) * 10) / 10; // Round to 1 decimal
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

    // ✅ FIXED: Check if category requires expiry by looking up category data
    const category = this.categories().find(c => c.id === product.categoryId);
    const categoryRequiresExpiry = category ? (category as any).requiresExpiryDate : false;
    
    enhanced.categoryRequiresExpiry = categoryRequiresExpiry;

    if (product.expiryDate) {
      enhanced.daysUntilExpiry = this.calculateDaysUntilExpiry(product.expiryDate);
      enhanced.expiryStatus = this.getExpiryStatusFromDays(enhanced.daysUntilExpiry);
      enhanced.expiryStatusText = this.formatDaysUntilExpiry(enhanced);
    } else if (categoryRequiresExpiry) {
      enhanced.expiryStatus = 'missing';
      enhanced.needsExpiryData = true;
      enhanced.expiryStatusText = 'Missing expiry data';
    } else {
      enhanced.expiryStatusText = 'Not required';
    }

    // ✅ REAL API: Batch data will come from backend API calls
    // For now, basic batch info for products that have expiry dates
    if (product.expiryDate) {
      // Basic batch info - will be populated by real API calls
      enhanced.nearestExpiryDate = product.expiryDate;
      enhanced.daysToNearestExpiry = enhanced.daysUntilExpiry;
      
      // These will be populated by getProductsWithBatchSummary() API call
      enhanced.totalBatches = 0;
      enhanced.batchesGood = 0;
      enhanced.batchesWarning = 0;
      enhanced.batchesCritical = 0;
      enhanced.batchesExpired = 0;
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
   * Toggle batch view layout between grid and list view
   */
  toggleBatchLayout(): void {
    const currentLayout = this.batchLayoutMode();
    const newLayout = currentLayout === 'grid' ? 'list' : 'grid';
    this.batchLayoutMode.set(newLayout);
    console.log(`🎨 Batch layout changed to: ${newLayout}`);
  }

  /**
   * Load detailed batch view data - showing individual batches grouped by product
   */
  private async loadDetailedBatchView(): Promise<void> {
    this.loadingBatchDetails.set(true);

    try {
      console.log('📦 Loading detailed batch view...');

      // ✅ UPDATED: Use branch-aware batch data when applicable
      const branchIds = this.selectedBranchIds();
      const branchFilterType = this.branchFilterType();

      let productsWithBatches: ProductWithBatchSummaryDto[];

      if (branchIds.length > 0 && branchFilterType !== BranchFilterType.ALL) {
        console.log('🏢 Loading branch-specific batch data for branches:', branchIds);
        // TODO: Need to implement branch-specific batch endpoint
        // For now, fall back to regular endpoint but filter later
        productsWithBatches = await firstValueFrom(
          this.inventoryService.getProductsWithBatchSummary()
        );
        console.log('⚠️ Using fallback: regular batch data (need branch-specific endpoint)');
      } else {
        console.log('📦 Loading all-branch batch data');
        productsWithBatches = await firstValueFrom(
          this.inventoryService.getProductsWithBatchSummary()
        );
      }
      
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

    // ✅ REAL API: Use enhanced filter parameters
    const batchFilters = {
      categoryId: categoryId,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: filterValues.sortBy || 'name',
      sortOrder: filterValues.sortOrder || 'asc'
    };

    this.subscriptions.add(
      this.inventoryService.getProductsWithBatchSummary(batchFilters).subscribe({
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

  // ✅ NEW: Enhanced Column System Helper Methods

  // Stock Status Helpers
  // ✅ NEW: Helper methods for branch-aware stock values
  getDisplayStock(product: Product | any): number {
    const branchStock = (product as any).branchStock;
    const regularStock = product.stock;
    const result = branchStock ?? regularStock;

    // Debug log for first 3 products
    if (this.debugCounter < 3) {
      console.log(`🏪 [DEBUG getDisplayStock] Product: ${product.name}`, {
        branchStock,
        regularStock,
        result,
        hasBranchStock: branchStock !== undefined,
        productData: product
      });
      this.debugCounter++;
    }

    return result;
  }

  getDisplayMinimumStock(product: Product | any): number {
    return (product as any).minStock ?? product.minimumStock;
  }

  // ✅ NEW: Check if displaying branch-specific stock
  isBranchSpecificStock(): boolean {
    const branchFilterType = this.branchFilterType();
    const branchProducts = this.branchProducts();
    return branchFilterType !== BranchFilterType.ALL && branchProducts && branchProducts.length > 0;
  }

  // ✅ NEW: Get branch indicator text
  getBranchStockIndicator(): string {
    const branchFilterType = this.branchFilterType();

    switch (branchFilterType) {
      case BranchFilterType.CURRENT:
        const activeBranch = this.activeBranch();
        return activeBranch ? `${activeBranch.branchCode} Stock` : 'Branch Stock';
      case BranchFilterType.SPECIFIC:
        const selectedBranches = this.selectedBranchIds();
        return selectedBranches.length === 1 ? 'Branch Stock' : `${selectedBranches.length} Branches Stock`;
      default:
        return 'Total Stock';
    }
  }

  // ✅ UPDATED: Branch-aware stock status
  getStockStatus(product: Product | any): 'critical' | 'low' | 'good' {
    // Branch-specific stock handling
    const stock = this.getDisplayStock(product);
    const minimumStock = this.getDisplayMinimumStock(product);

    if (stock <= 0) return 'critical';
    if (stock <= minimumStock) return 'low';
    return 'good';
  }

  // ✅ UPDATED: Branch-aware stock percentage
  getStockPercentage(product: Product | any): number {
    const stock = this.getDisplayStock(product);
    const minimumStock = this.getDisplayMinimumStock(product);

    if (minimumStock === 0) return 100;
    return Math.min((stock / (minimumStock * 2)) * 100, 100);
  }

  getStockStatusIcon(product: Product): string {
    const status = this.getStockStatus(product);
    switch (status) {
      case 'critical': return 'error';
      case 'low': return 'warning';
      case 'good': return 'check_circle';
      default: return 'help';
    }
  }

  getStockStatusText(product: Product): string {
    const status = this.getStockStatus(product);
    switch (status) {
      case 'critical': return 'Out of Stock';
      case 'low': return 'Low Stock';
      case 'good': return 'In Stock';
      default: return 'Unknown';
    }
  }

  // Margin & Profit Helpers - using existing method at line 626

  getMarginClass(product: Product): string {
    const margin = this.getMarginPercentage(product);
    if (margin >= 30) return 'margin-good';
    if (margin >= 15) return 'margin-warning';
    return 'margin-poor';
  }

  calculateProfit(product: Product): number {
    return product.sellPrice - product.buyPrice;
  }

  getProfitClass(product: Product): string {
    const profit = this.calculateProfit(product);
    return profit > 0 ? 'profit-positive' : 'profit-negative';
  }

  // Performance Metrics (Mock implementations - replace with actual business logic)
  getStockTurnover(product: Product): string {
    // Mock calculation based on stock levels
    const stockRatio = product.stock / Math.max(product.minimumStock, 1);
    if (stockRatio > 2) return 'High';
    if (stockRatio > 1) return 'Medium';
    return 'Low';
  }

  getSalesPerformance(product: Product): string {
    // Mock calculation based on profit margins
    const margin = this.getMarginPercentage(product);
    if (margin >= 30) return 'Excellent';
    if (margin >= 20) return 'Good';
    if (margin >= 10) return 'Fair';
    return 'Poor';
  }

  getStockHealth(product: Product): string {
    const stockStatus = this.getStockStatus(product);
    const productWithExpiry = product as ProductWithExpiryAndBatch;
    const expiryStatus = productWithExpiry.expiryStatus || 'good';
    
    if (stockStatus === 'critical' || expiryStatus === 'critical') return 'critical';
    if (stockStatus === 'low' || expiryStatus === 'warning') return 'warning';
    return 'good';
  }

  getStockHealthIcon(product: Product): string {
    const health = this.getStockHealth(product);
    switch (health) {
      case 'critical': return 'heart_broken';
      case 'warning': return 'favorite_border';
      case 'good': return 'favorite';
      default: return 'help';
    }
  }

  getPerformanceScore(product: Product): number {
    // Mock calculation combining various factors
    const stockStatus = this.getStockStatus(product);
    const margin = this.getMarginPercentage(product);
    
    let score = 50; // Base score
    
    // Stock factor
    if (stockStatus === 'good') score += 20;
    else if (stockStatus === 'low') score += 10;
    else score -= 10;
    
    // Margin factor
    if (margin >= 30) score += 30;
    else if (margin >= 20) score += 20;
    else if (margin >= 10) score += 10;
    else score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  getPerformanceGrade(product: Product): string {
    const score = this.getPerformanceScore(product);
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // Product Expansion Methods
  toggleProductExpansion(productId: number): void {
    if (this.expandedProducts.has(productId)) {
      this.expandedProducts.delete(productId);
    } else {
      this.expandedProducts.add(productId);
    }
  }

  // Additional Action Methods
  duplicateProduct(product: Product): void {
    console.log('Duplicating product:', product.id);
    this.showSuccess(`Product "${product.name}" will be duplicated`);
    // TODO: Implement duplication logic
  }

  viewProductHistory(product: Product): void {
    console.log('Viewing history for product:', product.id);
    this.showSuccess(`Opening history for "${product.name}"`);
    // TODO: Navigate to product history page
  }

  generateQRCode(product: Product): void {
    console.log('Generating QR code for product:', product.id);
    this.showSuccess(`QR code generated for "${product.name}"`);
    // TODO: Implement QR code generation
  }




  // ✅ NEW: Sorting functionality for enhanced columns
  sortField = signal<string>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');

  sortBy(field: string): void {
    if (this.sortField() === field) {
      // Toggle direction if same field
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }

    // Apply sorting to the data source
    this.applySorting();
  }

  private applySorting(): void {
    const field = this.sortField();
    const direction = this.sortDirection();
    
    const data = [...this.products.data];
    
    data.sort((a: any, b: any) => {
      let aValue = a[field];
      let bValue = b[field];
      
      // Handle different field types
      if (field === 'name') {
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
      } else if (field === 'stock' || field === 'sellPrice' || field === 'buyPrice') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (field === 'expiryDate') {
        const productA = a as ProductWithExpiryAndBatch;
        const productB = b as ProductWithExpiryAndBatch;
        aValue = productA.expiryDate ? new Date(productA.expiryDate).getTime() : 0;
        bValue = productB.expiryDate ? new Date(productB.expiryDate).getTime() : 0;
      }
      
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    this.products.data = data;
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
  viewProductBatches(product: Product | ProductWithExpiryAndBatch): void {
    this.router.navigate(['/dashboard/inventory/batches', product.id]);
  }

  adjustStock(product: Product): void {
    console.log('Adjusting stock for product:', product.id);
    this.router.navigate(['/dashboard/inventory/stock-mutation', product.id]);
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

  // ===== NEW: BRANCH-AWARE INVENTORY METHODS =====

  /**
   * Initialize branch data and setup branch effects
   */
  private initializeBranchData(): void {
    console.log('🏢 Initializing branch-aware inventory data...');
    
    // Set initial branch filter to current active branch
    const activeBranch = this.activeBranch();
    if (activeBranch) {
      this.selectedBranchIds.set([activeBranch.branchId]);
      this.loadBranchInventory();
    }
    
    // Load branch data for all accessible branches
    this.loadAllBranchesInventory();
  }

  /**
   * Load inventory data for currently selected branches
   */
  private loadBranchInventory(): void {
    const branchIds = this.selectedBranchIds();
    
    if (branchIds.length === 0) {
      console.log('⚠️ No branches selected for inventory loading');
      return;
    }

    console.log('🏢 Loading branch inventory for branches:', branchIds);
    
    // Use BranchInventoryService to load branch-specific data
    this.branchInventoryService.loadBranchProducts({ branchIds }).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Branch inventory loaded:', response.data.length, 'products');
        } else {
          console.error('❌ Failed to load branch inventory:', response.message);
          this.showError('Failed to load branch inventory data');
        }
      },
      error: (error) => {
        console.error('❌ Branch inventory loading error:', error);
        this.showError('Error loading branch inventory data');
      }
    });
  }

  /**
   * Load inventory data for all accessible branches
   */
  private loadAllBranchesInventory(): void {
    const allBranchIds = this.availableBranches().map(b => b.branchId);
    
    if (allBranchIds.length === 0) {
      console.log('⚠️ No accessible branches found');
      return;
    }

    console.log('🏢 Loading inventory for all accessible branches:', allBranchIds);
    
    this.branchInventoryService.loadBranchProducts({ branchIds: allBranchIds }).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ All branches inventory loaded:', response.data.length, 'products');
        }
      },
      error: (error) => {
        console.error('❌ Error loading all branches inventory:', error);
      }
    });
  }

  /**
   * Handle branch filter change
   */
  onBranchFilterChange(branchFilterType: BranchFilterType): void {
    console.log('🏢 Branch filter changed:', branchFilterType);
    
    this.branchFilterType.set(branchFilterType);
    
    switch (branchFilterType) {
      case BranchFilterType.ALL:
        // Load all branches
        const allBranchIds = this.availableBranches().map(b => b.branchId);
        this.selectedBranchIds.set(allBranchIds);
        break;
        
      case BranchFilterType.CURRENT:
        // Load only current active branch
        const activeBranch = this.activeBranch();
        if (activeBranch) {
          this.selectedBranchIds.set([activeBranch.branchId]);
        }
        break;
        
      case BranchFilterType.SPECIFIC:
        // Keep current selected branches or prompt for selection
        break;
    }

    this.loadBranchInventory();

    // ✅ NEW: If in batch view, reload batch data with new branch filter
    if (this.batchViewMode()) {
      this.loadDetailedBatchView();
    }
  }

  /**
   * Handle specific branch selection
   */
  onBranchSelectionChange(branchIds: number[]): void {
    console.log('🏢 Branch selection changed:', branchIds);
    
    this.selectedBranchIds.set(branchIds);
    this.branchFilterType.set(BranchFilterType.SPECIFIC);
    this.loadBranchInventory();

    // ✅ NEW: If in batch view, reload batch data with new branch selection
    if (this.batchViewMode()) {
      this.loadDetailedBatchView();
    }
  }

  /**
   * Get branch context info for display
   */
  getBranchContextInfo(): string {
    try {
      const branchType = this.branchFilterType();
      const selectedBranches = this.selectedBranchIds();
      const availableBranches = this.availableBranches();
      
      switch (branchType) {
        case BranchFilterType.ALL:
          return `All Branches (${availableBranches.length})`;
          
        case BranchFilterType.CURRENT:
          const activeBranch = this.activeBranch();
          return activeBranch ? `Current: ${activeBranch.branchName}` : 'No Active Branch';
          
        case BranchFilterType.SPECIFIC:
          if (selectedBranches.length === 1) {
            const branch = availableBranches.find(b => b.branchId === selectedBranches[0]);
            return branch ? branch.branchName : 'Selected Branch';
          } else {
            return `${selectedBranches.length} Branches Selected`;
          }
          
        default:
          return 'Current: Toko Eniwan Purwakarta'; // Fallback for demo
      }
    } catch (error) {
      console.warn('Error getting branch context:', error);
      return 'Current: Toko Eniwan Purwakarta'; // Safe fallback
    }
  }

  // ===== BULK UPDATE METHODS =====

  /**
   * Open bulk update modal
   */
  openBulkUpdateModal(): void {
    this.showBulkUpdateModal.set(true);
    this.bulkUpdateResult.set(null);
    this.bulkUpdatePreview.set(null);
    
    // Reset form to default values
    this.bulkUpdateForm.patchValue({
      categoryIds: [],
      defaultExpiryDays: 365,
      defaultSupplierName: 'System Migration',
      forceUpdate: false
    });
  }

  /**
   * Close bulk update modal
   */
  closeBulkUpdateModal(): void {
    this.showBulkUpdateModal.set(false);
    this.bulkUpdateResult.set(null);
    this.bulkUpdatePreview.set(null);
    this.bulkUpdateLoading.set(false);
  }

  /**
   * Preview bulk update - shows how many products will be affected
   */
  previewBulkUpdate(): void {
    const formValue = this.bulkUpdateForm.value;
    
    // Calculate affected products based on form values
    const eligibleProducts = this.rawProducts().filter(product => {
      const category = this.categories().find(c => c.id === product.categoryId);
      const requiresExpiry = category ? (category as any).requiresExpiryDate : false;
      
      // Check if product is eligible for update
      if (!requiresExpiry || !product.isActive) return false;
      
      // Check category filter
      if (formValue.categoryIds && formValue.categoryIds.length > 0) {
        return formValue.categoryIds.includes(product.categoryId);
      }
      
      return true;
    });

    const categoriesAffected = new Set(
      eligibleProducts.map(p => p.categoryId)
    ).size;

    this.bulkUpdatePreview.set({
      productsToUpdate: eligibleProducts.length,
      categoriesAffected: categoriesAffected
    });

    this.showSuccess(`Preview: ${eligibleProducts.length} products in ${categoriesAffected} categories will be updated.`);
  }

  /**
   * Execute bulk update
   */
  executeBulkUpdate(): void {
    const formValue = this.bulkUpdateForm.value;
    
    // Show confirmation
    const preview = this.bulkUpdatePreview();
    const confirmMessage = preview 
      ? `Confirm bulk update for ${preview.productsToUpdate} products in ${preview.categoriesAffected} categories?`
      : 'Confirm bulk update? This will add expiry dates and batches to eligible products.';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    this.bulkUpdateLoading.set(true);
    this.bulkUpdateResult.set(null);

    // Prepare request
    const request: BulkUpdateExpiryBatchesRequest = {
      categoryIds: formValue.categoryIds && formValue.categoryIds.length > 0 ? formValue.categoryIds : undefined,
      forceUpdate: formValue.forceUpdate || false,
      defaultExpiryDays: formValue.defaultExpiryDays || 365,
      defaultSupplierName: formValue.defaultSupplierName || 'System Migration'
    };

    console.log('🔄 Executing bulk update with request:', request);

    // Execute bulk update
    this.subscriptions.add(
      this.inventoryService.bulkUpdateProductsWithExpiryBatches(request).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.bulkUpdateResult.set(response.data);
            this.showSuccess(response.message || 'Bulk update completed successfully!');
            
            // Refresh data to show updates
            this.loadProducts();
            this.loadExpiryAnalytics();
            
            console.log('✅ Bulk update completed:', response.data);
          } else {
            this.showError('Bulk update failed: ' + (response.message || 'Unknown error'));
          }
        },
        error: (error) => {
          console.error('❌ Bulk update error:', error);
          this.showError('Bulk update failed: ' + error.message);
        },
        complete: () => {
          this.bulkUpdateLoading.set(false);
        }
      })
    );
  }

  // ✅ NEW: Enhanced Batch Layout Methods
  setBatchLayoutMode(mode: 'grid' | 'list'): void {
    this.batchLayoutMode.set(mode);
    console.log('🔄 Batch layout mode changed to:', mode);
  }

  // ✅ NEW: Batch Status Class Method for Template
  getBatchStatusClass(batch: any): string[] {
    const classes: string[] = [];

    if (batch.isExpired) {
      classes.push('status-expired');
    } else if (batch.daysUntilExpiry <= 7) {
      classes.push('status-critical');
    } else if (batch.daysUntilExpiry <= 30) {
      classes.push('status-warning');
    } else {
      classes.push('status-active');
    }

    return classes;
  }

}