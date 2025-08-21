// src/app/core/services/expiry-management.service.ts - Complete Expiry Management Service
// Angular 20 service for comprehensive expiry and batch management

import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, tap, map, shareReplay, retry, finalize } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { CategoryService } from '../../modules/category-management/services/category.service';
import {
  // Core interfaces
  ExpiringProduct,
  ExpiredProduct,
  ProductBatch,
  ExpiryAnalytics,
  CategoryWithExpiry,
  FifoRecommendationDto,
  ExpiryNotification,
  
  // Filter interfaces
  ExpiringProductsFilter,
  ExpiredProductsFilter,
  ProductBatchFilter,
  
  // Batch management
  CreateProductBatch,
  UpdateProductBatch,
  BatchDisposalRequest,
  BulkDisposeRequest,
  BatchTransferRequest,
  BatchStockAdjustment,
  
  // Bulk operations
  BulkOperationRequest,
  BulkOperationResult,
  BulkPreviewResult,
  
  // Response types
  PaginatedResponse,
  ApiResponse,
  
  // Enums
  ExpiryStatus,
  ExpiryUrgency,
  DisposalMethod,
  BatchStatus,
  
  // Validation & settings
  ExpiryValidationResult,
  CategoryExpirySettings,
  ExpiryDashboard
} from '../interfaces/expiry.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ExpiryManagementService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly baseUrl = `${environment.apiUrl}`;
  
  // Signal-based state management
  private _expiryAnalytics = signal<ExpiryAnalytics | null>(null);
  private _expiringProducts = signal<ExpiringProduct[]>([]);
  private _expiredProducts = signal<ExpiredProduct[]>([]);
  private _productBatches = signal<ProductBatch[]>([]);
  private _fifoRecommendations = signal<FifoRecommendationDto[]>([]);
  private _categoriesWithExpiry = signal<CategoryWithExpiry[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  
  // Cache for API responses
  private categoryExpiryCache = new Map<number, { requiresExpiry: boolean; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private analyticsCacheSubject = new BehaviorSubject<ExpiryAnalytics | null>(null);
  
  // Public readonly signals
  readonly expiryAnalytics = this._expiryAnalytics.asReadonly();
  readonly expiringProducts = this._expiringProducts.asReadonly();
  readonly expiredProducts = this._expiredProducts.asReadonly();
  readonly productBatches = this._productBatches.asReadonly();
  readonly fifoRecommendations = this._fifoRecommendations.asReadonly();
  readonly categoriesWithExpiry = this._categoriesWithExpiry.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Computed properties
  readonly criticallyExpiringCount = computed(() => 
    this._expiringProducts().filter(p => p.urgencyLevel === ExpiryUrgency.CRITICAL).length
  );
  
  readonly totalExpiringValue = computed(() => 
    this._expiringProducts().reduce((sum, p) => sum + p.valueAtRisk, 0)
  );
  
  readonly totalExpiredValue = computed(() => 
    this._expiredProducts().reduce((sum, p) => sum + p.lossValue, 0)
  );
  
  readonly hasExpiryData = computed(() => 
    this._expiryAnalytics() !== null
  );

  // ===== CATEGORY MANAGEMENT APIs =====

  /**
   * Get categories that require expiry dates
   */
  getCategoriesWithExpiry(): Observable<CategoryWithExpiry[]> {
    return this.http.get<ApiResponse<CategoryWithExpiry[]>>(`${this.baseUrl}/Category/with-expiry`)
      .pipe(
        map(response => response.data || []),
        tap(categories => this._categoriesWithExpiry.set(categories)),
        catchError(this.handleError<CategoryWithExpiry[]>('getCategoriesWithExpiry', []))
      );
  }

  /**
   * Check if a category requires expiry date with hardcoded logic based on API reference
   */
  async checkCategoryRequiresExpiry(categoryId: number): Promise<{ requiresExpiry: boolean }> {
    console.log('🔍 Checking expiry requirement for category:', categoryId);
    
    // Check cache first
    const cached = this.categoryExpiryCache.get(categoryId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('💾 Using cached result for category', categoryId, ':', cached.requiresExpiry);
      return { requiresExpiry: cached.requiresExpiry };
    }

    // First, get the category details to determine expiry requirement by name
    try {
      console.log('🌐 Getting category details for ID:', categoryId);
      
      // Get category service to fetch category name
      const categoryService = this.injector.get(CategoryService);
      const category = await categoryService.getCategoryById(categoryId).toPromise();
      
      console.log('📁 Category details retrieved:', category);
      
      if (category) {
        // ✅ ENHANCED: Hardcoded logic based on user's API reference
        const categoryName = category.name.toLowerCase().trim();
        console.log('📝 Checking category name:', categoryName);
        
        // Categories that do NOT require expiry (based on user's API reference)
        const noExpiryCategories = [
          'mainan & barang hobi',
          'mainan',
          'barang hobi', 
          'perhiasan & aksesoris',
          'perhiasan',
          'aksesoris',
          'alat tulis & office supplies',
          'alat tulis',
          'office supplies',
          'durable electronics & gadget',
          'durable electronics',
          'electronics',
          'gadget',
          'elektronik'
        ];
        
        const requiresExpiry = !noExpiryCategories.some(noExpiry => 
          categoryName.includes(noExpiry) || noExpiry.includes(categoryName)
        );
        
        console.log('🎯 Category requires expiry determination:');
        console.log('   Category name:', categoryName);
        console.log('   Requires expiry:', requiresExpiry);
        console.log('   Reason:', requiresExpiry ? 
          'Category not in non-expiry list' : 
          'Category found in non-expiry list'
        );
        
        // Cache the result
        this.categoryExpiryCache.set(categoryId, {
          requiresExpiry,
          timestamp: Date.now()
        });
        
        return { requiresExpiry };
      } else {
        console.warn('⚠️ Category not found for ID:', categoryId);
        // Default to requiring expiry if category not found
        return { requiresExpiry: true };
      }
      
    } catch (error: any) {
      console.error('❌ Error getting category details:', error);
      
      // Try API call as fallback
      try {
        console.log('🔄 Falling back to API call:', `${this.baseUrl}/Category/${categoryId}/requires-expiry`);
        const response = await this.http
          .get<ApiResponse<{ requiresExpiry: boolean }>>(`${this.baseUrl}/Category/${categoryId}/requires-expiry`)
          .toPromise();

        console.log('📡 Category expiry API response:', response);

        if (response?.success && response.data) {
          // Cache the result
          this.categoryExpiryCache.set(categoryId, {
            requiresExpiry: response.data.requiresExpiry,
            timestamp: Date.now()
          });
          console.log('✅ Category', categoryId, 'requires expiry from API:', response.data.requiresExpiry);
          return response.data;
        } else {
          console.warn('⚠️ API response structure unexpected:', response);
          throw new Error(response?.message || 'API did not return a successful response.');
        }
      } catch (apiError: any) {
        console.error('❌ API call also failed:', apiError);
        // Final fallback - default to NO expiry for safety
        console.warn(`Both category lookup and API failed for category ${categoryId}. Defaulting to NO EXPIRY for safety.`);
        
        const defaultResult = { requiresExpiry: false };
        
        // Cache the default result to prevent repeated failed calls
        this.categoryExpiryCache.set(categoryId, {
          requiresExpiry: false,
          timestamp: Date.now()
        });
        
        return defaultResult;
      }
    }
  }

  /**
   * Get categories by expiry requirement
   */
  getCategoriesByExpiryRequirement(requiresExpiry: boolean): Observable<CategoryWithExpiry[]> {
    const params = new HttpParams().set('requiresExpiry', requiresExpiry.toString());
    
    return this.http.get<ApiResponse<CategoryWithExpiry[]>>(`${this.baseUrl}/Category/by-expiry-requirement`, { params })
      .pipe(
        map(response => response.data || []),
        catchError(this.handleError<CategoryWithExpiry[]>('getCategoriesByExpiryRequirement', []))
      );
  }

  /**
   * Get category expiry statistics
   */
  getCategoryExpiryStats(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/Category/expiry-stats`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError('getCategoryExpiryStats', {}))
      );
  }

  /**
   * Update category expiry requirements
   */
  updateCategoryExpirySettings(categoryId: number, settings: CategoryExpirySettings): Observable<CategoryWithExpiry> {
    const requestBody = {
      ...settings,
      categoryId // Avoid duplicate categoryId by spreading settings first
    };
    
    return this.http.post<ApiResponse<CategoryWithExpiry>>(`${this.baseUrl}/Category/update-expiry-requirements`, requestBody).pipe(
      map(response => response.data!),
      tap(() => {
        // Clear cache for this category
        this.categoryExpiryCache.delete(categoryId);
        // Refresh categories list
        this.getCategoriesWithExpiry().subscribe({
          next: () => console.log('Categories refreshed'),
          error: (error) => console.error('Failed to refresh categories:', error)
        });
      }),
      catchError(this.handleError<CategoryWithExpiry>('updateCategoryExpirySettings'))
    );
  }

  // ===== PRODUCT EXPIRY APIs =====

  /**
   * Check if a product requires expiry date
   */
  checkProductRequiresExpiry(productId: number): Observable<{ requiresExpiry: boolean }> {
    return this.http.get<ApiResponse<{ requiresExpiry: boolean }>>(`${this.baseUrl}/Product/${productId}/requires-expiry`)
      .pipe(
        map(response => response.data || { requiresExpiry: false }),
        catchError(this.handleError('checkProductRequiresExpiry', { requiresExpiry: false }))
      );
  }

  /**
   * Get products with expiry warnings - Observable pattern
   */
  getExpiringProducts(filter?: ExpiringProductsFilter): Observable<ExpiringProduct[]> {
    let params = new HttpParams();
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<PaginatedResponse<ExpiringProduct>>>(`${this.baseUrl}/Product/expiry/warning`, { params })
      .pipe(
        map(response => {
          if (response?.success && response.data) {
            const products = response.data.data || [];
            this._expiringProducts.set(products);
            return products;
          } else {
            this._expiringProducts.set([]);
            return [];
          }
        }),
        catchError((error: any) => {
          console.warn('Expiring products API not available, using empty array');
          this._expiringProducts.set([]);
          return of([]);
        })
      );
  }

  /**
   * Get expired products
   */
  getExpiredProducts(filter?: ExpiredProductsFilter): Observable<PaginatedResponse<ExpiredProduct>> {
    let params = new HttpParams();
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    // ✅ FIXED: Correctly handle API response structure
    return this.http.get<ApiResponse<PaginatedResponse<ExpiredProduct>>>(`${this.baseUrl}/Product/expiry/expired`, { params })
      .pipe(
        map(response => response.data || { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0, hasNext: false, hasPrevious: false }),
        tap(result => this._expiredProducts.set(result.data)),
        catchError(this.handleError<PaginatedResponse<ExpiredProduct>>('getExpiredProducts', { 
          data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0, hasNext: false, hasPrevious: false 
        }))
      );
  }

  /**
   * Get expiry analytics with caching - Observable pattern
   */
  getExpiryAnalytics(branchId?: number): Observable<ExpiryAnalytics> {
    this._loading.set(true);
    this._error.set(null);
    
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());

    return this.http.get<ApiResponse<ExpiryAnalytics>>(`${this.baseUrl}/Product/analytics/expiry`, { params })
      .pipe(
        map(response => {
          if (response?.success && response.data) {
            this._expiryAnalytics.set(response.data);
            this.analyticsCacheSubject.next(response.data);
            return response.data;
          } else {
            throw new Error(response?.message || 'Failed to load expiry analytics');
          }
        }),
        catchError((error: any) => {
          // Fallback for missing API endpoints
          if (error.status === 400 || error.status === 404 || error.status === 500) {
            console.warn('Expiry analytics API not available, using mock data');
            const mockData: ExpiryAnalytics = {
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
            };
            this._expiryAnalytics.set(mockData);
            return of(mockData);
          } else {
            this._error.set('Failed to load expiry analytics');
            console.error('Error loading expiry analytics:', error);
            return throwError(() => error);
          }
        }),
        finalize(() => this._loading.set(false))
      );
  }

  /**
   * Get FIFO recommendations - Observable pattern
   */
  getFifoRecommendations(params?: { categoryId?: number; limit?: number; urgencyLevel?: ExpiryUrgency }): Observable<FifoRecommendationDto[]> {
    let httpParams = new HttpParams();
    if (params?.categoryId) httpParams = httpParams.set('categoryId', params.categoryId.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.urgencyLevel) httpParams = httpParams.set('urgencyLevel', params.urgencyLevel.toString());

    return this.http.get<ApiResponse<FifoRecommendationDto[]>>(`${this.baseUrl}/Product/fifo/recommendations`, { params: httpParams })
      .pipe(
        map(response => {
          if (response?.success && response.data) {
            this._fifoRecommendations.set(response.data);
            return response.data;
          } else {
            this._fifoRecommendations.set([]);
            return [];
          }
        }),
        catchError((error: any) => {
          console.warn('FIFO recommendations API not available, using empty array');
          this._fifoRecommendations.set([]);
          return of([]);
        })
      );
  }

  // ===== BATCH MANAGEMENT APIs =====

  /**
   * Create a new product batch
   */
  createProductBatch(batch: CreateProductBatch): Observable<ApiResponse<ProductBatch>> {
    return this.http.post<ApiResponse<ProductBatch>>(`${this.baseUrl}/Product/${batch.productId}/batches`, batch)
      .pipe(
        tap((response) => {
          if(response.success) this.refreshProductBatches(batch.productId)
        }),
        catchError(this.handleError<ApiResponse<ProductBatch>>('createProductBatch'))
      );
  }

  /**
   * Get all batches for a product - Observable pattern
   */
  getProductBatches(filter: ProductBatchFilter): Observable<ProductBatch[]> {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
    });

    return this.http.get<ApiResponse<ProductBatch[]>>(`${this.baseUrl}/Product/${filter.productId}/batches`, { params })
      .pipe(
        map(response => {
          if (response?.success && response.data) {
            this._productBatches.set(response.data);
            return response.data;
          } else {
            this._productBatches.set([]);
            return [];
          }
        }),
        catchError((error: any) => {
          console.warn('Product batches API not available, using empty array');
          this._productBatches.set([]);
          return of([]);
        })
      );
  }

  /**
   * Get a specific batch
   */
  getProductBatch(productId: number, batchId: number): Observable<ProductBatch> {
    return this.http.get<ApiResponse<ProductBatch>>(`${this.baseUrl}/Product/${productId}/batches/${batchId}`)
      .pipe(
        map(response => response.data!),
        catchError(this.handleError<ProductBatch>('getProductBatch'))
      );
  }

  /**
   * Update a product batch
   */
  updateProductBatch(batchId: number, batch: UpdateProductBatch): Observable<ApiResponse<ProductBatch>> {
    // Assuming productId is part of the batch object or not needed in URL
    return this.http.put<ApiResponse<ProductBatch>>(`${this.baseUrl}/Product/batches/${batchId}`, batch)
      .pipe(
        catchError(this.handleError<ApiResponse<ProductBatch>>('updateProductBatch'))
      );
  }

  /**
   * Dispose a batch
   */
  disposeBatch(productId: number, batchId: number, disposal: BatchDisposalRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/Product/${productId}/batches/${batchId}/dispose`, disposal)
      .pipe(
        map(() => undefined),
        tap(() => this.refreshProductBatches(productId)),
        catchError(this.handleError<void>('disposeBatch'))
      );
  }

  // ===== BULK OPERATIONS =====

  /**
   * Preview bulk operation
   */
  previewBulkOperation(batchIds: number[]): Observable<BulkPreviewResult> {
    return this.http.post<ApiResponse<BulkPreviewResult>>(`${this.baseUrl}/Product/batches/bulk/preview`, { batchIds })
      .pipe(
        map(response => response.data!),
        catchError(this.handleError<BulkPreviewResult>('previewBulkOperation'))
      );
  }

  /**
   * Execute bulk dispose operation
   */
  bulkDisposeProducts(request: BulkDisposeRequest): Observable<BulkOperationResult> {
    return this.http.post<ApiResponse<BulkOperationResult>>(`${this.baseUrl}/Product/batches/bulk/dispose`, request)
      .pipe(
        map(response => response.data!),
        tap(() => {
          // Refresh relevant data after bulk operation
          this.getExpiryAnalytics();
          this.getExpiredProducts().subscribe({
            next: () => console.log('Expired products refreshed'),
            error: (error) => console.error('Failed to refresh expired products:', error)
          });
        }),
        catchError(this.handleError<BulkOperationResult>('bulkDisposeProducts'))
      );
  }

  /**
   * Execute general bulk operation
   */
  executeBulkOperation(request: BulkOperationRequest): Observable<BulkOperationResult> {
    return this.http.post<ApiResponse<BulkOperationResult>>(`${this.baseUrl}/Product/batches/bulk/execute`, request)
      .pipe(
        map(response => response.data!),
        tap(() => {
          // Refresh data after operation
          this.getExpiryAnalytics();
          this.getExpiringProducts().subscribe({
            next: () => console.log('Expiring products refreshed'),
            error: (error) => console.error('Failed to refresh expiring products:', error)
          });
        }),
        catchError(this.handleError<BulkOperationResult>('executeBulkOperation'))
      );
  }

  // ===== UTILITY METHODS =====

  /**
   * Calculate expiry status based on days until expiry
   */
  calculateExpiryStatus(daysUntilExpiry: number): ExpiryStatus {
    if (daysUntilExpiry < 0) return ExpiryStatus.EXPIRED;
    if (daysUntilExpiry <= 3) return ExpiryStatus.CRITICAL;
    if (daysUntilExpiry <= 7) return ExpiryStatus.WARNING;
    return ExpiryStatus.GOOD;
  }

  /**
   * Calculate urgency level
   */
  calculateUrgencyLevel(daysUntilExpiry: number): ExpiryUrgency {
    if (daysUntilExpiry < 0) return ExpiryUrgency.CRITICAL;
    if (daysUntilExpiry <= 1) return ExpiryUrgency.CRITICAL;
    if (daysUntilExpiry <= 3) return ExpiryUrgency.HIGH;
    if (daysUntilExpiry <= 7) return ExpiryUrgency.MEDIUM;
    return ExpiryUrgency.LOW;
  }

  /**
   * Get expiry status color class
   */
  getExpiryStatusColor(status: ExpiryStatus): string {
    const colorMap: Record<ExpiryStatus, string> = {
      [ExpiryStatus.GOOD]: 'text-success',
      [ExpiryStatus.WARNING]: 'text-warning',
      [ExpiryStatus.CRITICAL]: 'text-error',
      [ExpiryStatus.EXPIRED]: 'text-error'
    };
    return colorMap[status] || 'text-muted';
  }

  /**
   * Get urgency color class
   */
  getUrgencyColor(urgency: ExpiryUrgency): string {
    const colorMap: Record<ExpiryUrgency, string> = {
      [ExpiryUrgency.LOW]: 'text-success',
      [ExpiryUrgency.MEDIUM]: 'text-info',
      [ExpiryUrgency.HIGH]: 'text-warning',
      [ExpiryUrgency.CRITICAL]: 'text-error'
    };
    return colorMap[urgency] || 'text-muted';
  }

  /**
   * Calculate days until expiry
   */
  getDaysUntilExpiry(expiryDate: Date | string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format expiry date for display
   */
  formatExpiryDate(date: string | Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }

  /**
   * Format currency value
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get expiry status icon
   */
  getExpiryStatusIcon(status: ExpiryStatus): string {
    const iconMap: Record<ExpiryStatus, string> = {
      [ExpiryStatus.GOOD]: '✅',
      [ExpiryStatus.WARNING]: '⚠️',
      [ExpiryStatus.CRITICAL]: '🔴',
      [ExpiryStatus.EXPIRED]: '❌'
    };
    return iconMap[status] || '❓';
  }

  // ===== VALIDATION =====

  /**
   * Validate expiry date
   */
  validateExpiryDate(expiryDate: string | Date, productId?: number): ExpiryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldErrors: Record<string, string> = {};

    const expiry = new Date(expiryDate);
    const today = new Date();
    
    // Basic validation
    if (expiry <= today) {
      errors.push('Expiry date must be in the future');
      fieldErrors['expiryDate'] = 'Expiry date must be in the future';
    }

    // Warning for very long shelf life
    const daysUntilExpiry = this.getDaysUntilExpiry(expiry);
    if (daysUntilExpiry > 365) {
      warnings.push('Expiry date is more than 1 year from now');
    }

    // Warning for very short shelf life
    if (daysUntilExpiry < 30) {
      warnings.push('Product will expire within 30 days');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fieldErrors
    };
  }

  // ===== STATE MANAGEMENT =====

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.categoryExpiryCache.clear();
  }

  /**
   * Refresh product batches
   */
  private refreshProductBatches(productId: number): void {
    this.getProductBatches({ productId }).subscribe({
      next: () => console.log('Product batches refreshed'),
      error: (error) => console.error('Failed to refresh product batches:', error)
    });
  }

  /**
   * Refresh all expiry data
   */
  async refreshAll(): Promise<void> {
    this.clearCache();
    await Promise.allSettled([
      this.getExpiryAnalytics(),
      this.getExpiringProducts().toPromise(),
      this.getExpiredProducts().toPromise(),
      this.getFifoRecommendations().toPromise(),
      this.getCategoriesWithExpiry().toPromise()
    ]);
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<ExpiryDashboard | null> {
    try {
      this._loading.set(true);
      
      // Load all dashboard data concurrently
      const [analytics, expiring, expired, fifo] = await Promise.allSettled([
        this.getExpiryAnalytics(),
        this.getExpiringProducts({ page: 1, pageSize: 10, sortBy: 'expiryDate', sortOrder: 'asc' }).toPromise(),
        this.getExpiredProducts({ page: 1, pageSize: 10, sortBy: 'expiryDate', sortOrder: 'desc' }).toPromise(),
        this.getFifoRecommendations().toPromise()
      ]);

      return {
        summary: this._expiryAnalytics()!,
        criticalItems: this._expiringProducts().filter(p => p.urgencyLevel === ExpiryUrgency.CRITICAL),
        recentlyExpired: this._expiredProducts().slice(0, 10),
        fifoRecommendations: this._fifoRecommendations().slice(0, 5),
        notifications: [], // Would be loaded from notification service
        trends: this._expiryAnalytics()?.expiryTrends || [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  // ===== ERROR HANDLING =====

  /**
   * Generic error handler for HTTP operations
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Set error state for UI feedback
      this._error.set(`${operation} failed: ${error.message || 'Unknown error'}`);
      
      // Let the app keep running by returning a safe result
      return of(result as T);
    };
  }

  /**
   * Initialize service - load essential data
   */
  initialize(): void {
    // Load categories with expiry requirements on service initialization
    this.getCategoriesWithExpiry().subscribe({
      next: () => console.log('Categories with expiry refreshed'),
      error: (error) => console.error('Failed to refresh categories with expiry:', error)
    });
    
    // Load basic analytics
    this.getExpiryAnalytics();
  }
}
