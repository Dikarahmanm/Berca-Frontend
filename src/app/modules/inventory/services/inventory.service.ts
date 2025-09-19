// ===== INVENTORY SERVICE =====
// src/app/modules/inventory/services/inventory.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environment/environment';

// Import interfaces from interfaces folder
import { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductListResponse, 
  StockUpdateRequest, 
  ProductFilter, 
  InventoryMutation, 
  MutationType, 
  ApiResponse,
  ProductBatch,
  ProductWithBatchSummaryDto,
  ProductWithBatchSummaryPagedResponse,
  CreateBatchRequest,
  AddStockToBatchRequest,
  BatchForPOSDto
} from '../interfaces/inventory.interfaces';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  // ✅ Use relative URL for proxy routing
  private readonly baseUrl = '/api/Product';
  
  // State management
  private productsSubject = new BehaviorSubject<Product[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  
  // Public observables
  public products$ = this.productsSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ===== PRODUCT OPERATIONS =====

  /**
   * ✅ FIXED: Get products with filtering and pagination
   * Backend: GET /api/Product
   */
  getProducts(filter?: ProductFilter): Observable<ProductListResponse> {
    let params = new HttpParams();
    
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.categoryId) params = params.set('categoryId', filter.categoryId.toString());
    if (filter?.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
    if (filter?.lowStock) params = params.set('lowStock', filter.lowStock.toString());
    if (filter?.page) params = params.set('page', filter.page.toString());
    if (filter?.pageSize) params = params.set('pageSize', filter.pageSize.toString());
    if (filter?.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter?.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    return this.http.get<any>(this.baseUrl, { params })
      .pipe(
        map(response => {
          console.log('🔄 Raw Product API Response:', response);
          
          // Handle the actual backend response structure
          if (response && response.success && response.data) {
            const products = response.data.products || [];
            const totalItems = response.data.totalCount || 0;
            const currentPage = response.data.currentPage || 1;
            const totalPages = response.data.totalPages || 1;
            
            console.log('✅ Products parsed successfully:', {
              productsCount: products.length,
              totalItems,
              currentPage,
              sampleProduct: products[0]
            });
            
            this.productsSubject.next(products);
            
            return {
              products,
              totalItems,
              totalPages,
              currentPage,
              pageSize: filter?.pageSize || 20
            } as ProductListResponse;
          }
          
          throw new Error(response?.message || 'Invalid response format');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ FIXED: Get product by ID
   * Backend: GET /api/Product/{id}
   */
  getProduct(id: number): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || 'Product not found');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ NEW: Get products with batch summary for enhanced inventory display (paginated)
   * Backend: GET /api/Product/with-batch-summary-paged
   */
  getProductsWithBatchSummaryPaged(filter?: ProductFilter): Observable<ProductWithBatchSummaryPagedResponse> {
    let params = new HttpParams();

    if (filter?.search) params = params.set('searchTerm', filter.search);
    if (filter?.categoryId) params = params.set('categoryId', filter.categoryId.toString());
    if (filter?.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
    if (filter?.page) params = params.set('page', filter.page.toString());
    if (filter?.pageSize) params = params.set('pageSize', filter.pageSize.toString());
    if (filter?.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter?.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    return this.http.get<any>(`${this.baseUrl}/with-batch-summary-paged`, { params })
      .pipe(
        map(response => {
          console.log('🔄 Raw Product Batch Summary Paged Response:', response);

          if (response && response.success && response.data) {
            console.log('✅ Products with batch summary loaded (paginated):', {
              products: response.data.products.length,
              totalCount: response.data.totalCount,
              currentPage: response.data.currentPage,
              totalPages: response.data.totalPages
            });
            return response.data;
          }

          throw new Error(response?.message || 'Failed to fetch paginated products with batch summary');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ NEW: Get products with batch summary for enhanced inventory display (legacy - non-paginated)
   * Backend: GET /api/Product/with-batch-summary
   */
  getProductsWithBatchSummary(filter?: ProductFilter): Observable<ProductWithBatchSummaryDto[]> {
    let params = new HttpParams();

    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.categoryId) params = params.set('categoryId', filter.categoryId.toString());
    if (filter?.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
    if (filter?.page) params = params.set('page', filter.page.toString());
    if (filter?.pageSize) params = params.set('pageSize', filter.pageSize.toString());
    if (filter?.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter?.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    return this.http.get<any>(`${this.baseUrl}/with-batch-summary`, { params })
      .pipe(
        map(response => {
          console.log('🔄 Raw Product Batch Summary Response:', response);

          if (response && response.success && response.data) {
            console.log('✅ Products with batch summary loaded:', response.data.length);
            return response.data;
          }

          throw new Error(response?.message || 'Failed to fetch products with batch summary');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ ENHANCED: Get product by barcode for batch management
   * Backend: GET /api/Product/barcode/{barcode}
   * Returns null if product not found (non-throwing version)
   */
  getProductByBarcode(barcode: string): Observable<Product | null> {
    return this.http.get<ApiResponse<Product>>(`${this.baseUrl}/barcode/${barcode}`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          return null;
        }),
        catchError(error => {
          console.log('Product not found by barcode, returning null');
          return new Observable<Product | null>(observer => {
            observer.next(null);
            observer.complete();
          });
        })
      );
  }

  /**
   * ✅ FIXED: Create new product
   * Backend: POST /api/Product
   */
  createProduct(request: CreateProductRequest): Observable<Product> {
    console.log('🆕 Creating Product:', request);
    
    return this.http.post<ApiResponse<Product>>(this.baseUrl, request)
      .pipe(
        map(response => {
          console.log('✅ Product Created:', response);
          if (response.success) {
            this.refreshProducts();
            return response.data;
          }
          throw new Error(response.message || 'Failed to create product');
        }),
        catchError(error => {
          console.error('❌ Create Product Error:', error);
          if (error.status === 400) {
            const message = error.error?.message || error.error?.errors || 'Invalid product data';
            throw new Error(message);
          }
          return this.handleError(error);
        })
      );
  }

  /**
   * ✅ FIXED: Update existing product
   * Backend: PUT /api/Product/{id}
   */
  /**
   * ✅ FIXED: Update existing product
   */
  updateProduct(id: number, request: UpdateProductRequest): Observable<Product> {
    console.log('📝 Updating Product:', { id, request });
    
    return this.http.put<ApiResponse<Product>>(`${this.baseUrl}/${id}`, request)
      .pipe(
        map(response => {
          console.log('✅ Product Updated:', response);
          if (response.success) {
            this.refreshProducts();
            return response.data;
          }
          throw new Error(response.message || 'Failed to update product');
        }),
        catchError(error => {
          console.error('❌ Update Product Error:', error);
          if (error.status === 400) {
            const message = error.error?.message || error.error?.errors || 'Invalid product data';
            throw new Error(message);
          }
          if (error.status === 404) {
            throw new Error('Product not found');
          }
          return this.handleError(error);
        })
      );
  }


  /**
   * ✅ FIXED: Delete product (soft delete)
   */
  deleteProduct(id: number): Observable<boolean> {
    console.log('🗑️ Deleting Product:', id);
    
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          console.log('✅ Product Deleted:', response);
          if (response.success) {
            this.refreshProducts();
            return response.data;
          }
          throw new Error(response.message || 'Failed to delete product');
        }),
        catchError(error => {
          console.error('❌ Delete Product Error:', error);
          if (error.status === 403) {
            throw new Error('You do not have permission to delete this product');
          }
          if (error.status === 400) {
            throw new Error('Cannot delete product - it may have active transactions or sales');
          }
          if (error.status === 404) {
            throw new Error('Product not found');
          }
          return this.handleError(error);
        })
      );
  }
// ===== UTILITY METHODS =====

/* Duplicate implementations of refreshProducts and handleError removed */

// ===== STOCK OPERATIONS =====

  /**
   * ✅ FIXED: Update product stock
   * Backend: POST /api/Product/{id}/stock
   */
  // ✅ FIXED: Stock update endpoint 
  updateStock(productId: number, request: StockUpdateRequest): Observable<boolean> {
    const url = `${this.baseUrl}/${productId}/stock`;
    // Pastikan payload dikirim langsung sebagai objek, tidak dibungkus field 'request'
    // Juga pastikan mutationType dikirim sebagai string
    const plainRequest = {
      mutationType: request.mutationType,
      quantity: request.quantity,
      notes: request.notes,
      referenceNumber: request.referenceNumber,
      unitCost: request.unitCost
    };
    console.log('🔄 Stock Update Request:', { productId, plainRequest, url });
    return this.http.put<ApiResponse<boolean>>(url, plainRequest)
      .pipe(
        map(response => {
          console.log('✅ Stock Update Response:', response);
          if (response.success) {
            this.refreshProducts();
          }
          return response.success;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * ✅ FIXED: Get low stock products
   * Backend: GET /api/Product/alerts/low-stock
   */
  getLowStockProducts(threshold: number = 10): Observable<Product[]> {
    const params = new HttpParams().set('threshold', threshold.toString());
    
    return this.http.get<ApiResponse<Product[]>>(`${this.baseUrl}/alerts/low-stock`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch low stock products');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ FIXED: Get out of stock products
   * Backend: GET /api/Product/alerts/out-of-stock
   */
  getOutOfStockProducts(): Observable<Product[]> {
    return this.http.get<ApiResponse<Product[]>>(`${this.baseUrl}/alerts/out-of-stock`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch out of stock products');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ FIXED: Get inventory history for a product
   */
  getInventoryHistory(productId: number, startDate?: Date, endDate?: Date): Observable<InventoryMutation[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());

    return this.http.get<ApiResponse<InventoryMutation[]>>(`${this.baseUrl}/${productId}/history`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch inventory history');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ FIXED: Get total inventory value
   * Backend: GET /api/Product/reports/inventory-value
   */
  getInventoryValue(): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/reports/inventory-value`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message);
        }),
        catchError(error => this.handleError(error))
      );
  }

  // ===== VALIDATION =====

  /**
   * ✅ FIXED: Check if barcode exists
   * Backend: GET /api/Product/validate/barcode/{barcode}
   */
  isBarcodeExists(barcode: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams();
    if (excludeId) params = params.set('excludeId', excludeId.toString());

    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/validate/barcode/${barcode}`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message);
        }),
        catchError(error => this.handleError(error))
      );
  }

  // ===== UTILITY METHODS =====

  /**
   * Refresh products list
   */
  refreshProducts(): void {
    this.getProducts().subscribe();
  }

  /**
   * Get current products snapshot
   */
  getCurrentProducts(): Product[] {
    return this.productsSubject.value;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  // ===== NEW: BATCH MANAGEMENT METHODS =====

  /**
   * ✅ NEW: Generate batch number for a product
   * Backend: GET /api/Product/{productId}/batch/generate
   */
  generateBatchNumber(productId: number): Observable<{ batchNumber: string }> {
    return this.http.get<ApiResponse<{ batchNumber: string }>>(`${this.baseUrl}/${productId}/batch/generate`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          // Fallback: Generate local batch number
          const fallbackBatch = `BATCH-${productId}-${Date.now()}`;
          console.log('🔄 API failed, using fallback batch number:', fallbackBatch);
          return { batchNumber: fallbackBatch };
        }),
        catchError(error => {
          // Fallback: Generate local batch number
          const fallbackBatch = `BATCH-${productId}-${Date.now()}`;
          console.log('🔄 Error generating batch, using fallback:', fallbackBatch);
          return new Observable<{ batchNumber: string }>(observer => {
            observer.next({ batchNumber: fallbackBatch });
            observer.complete();
          });
        })
      );
  }

  /**
   * ✅ REAL API: Get batches for a specific product
   * Backend: GET /api/Product/{productId}/batches
   */
  getProductBatches(productId: number, sortBy = 'expiryDate', sortOrder = 'asc'): Observable<ProductBatch[]> {
    const params = new HttpParams()
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    console.log(`🚀 Calling REAL API: /Product/${productId}/batches`);

    return this.http.get<ApiResponse<ProductBatch[]>>(`${this.baseUrl}/${productId}/batches`, { params })
      .pipe(
        tap(response => console.log('✅ Real API Response - batches:', response)),
        map(response => {
          if (response.success) {
            return response.data || [];
          }
          throw new Error(response.message || 'Failed to fetch batches');
        }),
        catchError(error => {
          console.error(`❌ API Error - batches for product ${productId}:`, error);
          // Fallback to empty array
          return [];
        })
      );
  }

  /**
   * ✅ REAL API: Create new batch for a product
   * Backend: POST /api/Product/{productId}/batches
   */
  createBatch(productId: number, batchData: CreateBatchRequest): Observable<ProductBatch> {
    console.log(`🚀 Calling REAL API: POST /Product/${productId}/batches`, batchData);

    return this.http.post<ApiResponse<ProductBatch>>(`${this.baseUrl}/${productId}/batches`, batchData)
      .pipe(
        tap(response => console.log('✅ Real API Response - create batch:', response)),
        map(response => {
          if (response.success) {
            return response.data!;
          }
          throw new Error(response.message || 'Failed to create batch');
        }),
        catchError(error => {
          console.error(`❌ API Error - create batch for product ${productId}:`, error);
          return throwError(() => new Error('Failed to create batch'));
        })
      );
  }

  /**
   * ✅ REAL API: Update existing batch
   * Backend: PUT /api/Product/{productId}/batches/{batchId}
   */
  updateBatch(productId: number, batchId: number, batchData: any): Observable<ProductBatch> {
    console.log(`🚀 Calling REAL API: PUT /Product/${productId}/batches/${batchId}`, batchData);

    return this.http.put<ApiResponse<ProductBatch>>(`${this.baseUrl}/${productId}/batches/${batchId}`, batchData)
      .pipe(
        tap(response => console.log('✅ Real API Response - update batch:', response)),
        map(response => {
          if (response.success) {
            return response.data!;
          }
          throw new Error(response.message || 'Failed to update batch');
        }),
        catchError(error => {
          console.error(`❌ API Error - update batch ${batchId}:`, error);
          return throwError(() => new Error('Failed to update batch'));
        })
      );
  }

  /**
   * ✅ REAL API: Dispose batch
   * Backend: POST /api/Product/{productId}/batches/{batchId}/dispose
   */
  disposeBatch(productId: number, batchId: number, reason?: string): Observable<boolean> {
    const disposeData = { reason: reason || 'Manual disposal' };
    console.log(`🚀 Calling REAL API: POST /Product/${productId}/batches/${batchId}/dispose`, disposeData);

    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${productId}/batches/${batchId}/dispose`, disposeData)
      .pipe(
        tap(response => console.log('✅ Real API Response - dispose batch:', response)),
        map(response => {
          if (response.success) {
            return response.data || true;
          }
          throw new Error(response.message || 'Failed to dispose batch');
        }),
        catchError(error => {
          console.error(`❌ API Error - dispose batch ${batchId}:`, error);
          return throwError(() => new Error('Failed to dispose batch'));
        })
      );
  }

  /**
   * ✅ REAL API: Get single batch details
   * Backend: GET /api/Product/{productId}/batches/{batchId}
   */
  getBatch(productId: number, batchId: number): Observable<ProductBatch> {
    console.log(`🚀 Calling REAL API: GET /Product/${productId}/batches/${batchId}`);

    return this.http.get<ApiResponse<ProductBatch>>(`${this.baseUrl}/${productId}/batches/${batchId}`)
      .pipe(
        tap(response => console.log('✅ Real API Response - single batch:', response)),
        map(response => {
          if (response.success) {
            return response.data!;
          }
          throw new Error(response.message || 'Failed to fetch batch details');
        }),
        catchError(error => {
          console.error(`❌ API Error - get batch ${batchId}:`, error);
          return throwError(() => new Error('Failed to fetch batch details'));
        })
      );
  }

  // ✅ REMOVED: Duplicate method - using createBatch() instead

  /**
   * ✅ NEW: Add stock to existing batch
   * Backend: POST /api/Product/batches/{batchId}/add-stock
   */
  addStockToBatch(batchId: number, request: AddStockToBatchRequest): Observable<ProductBatch> {
    console.log('📦 Adding Stock to Batch:', { batchId, request });
    
    return this.http.post<ApiResponse<ProductBatch>>(`${this.baseUrl}/batches/${batchId}/add-stock`, request)
      .pipe(
        map(response => {
          console.log('✅ Stock Added to Batch:', response);
          if (response.success) {
            this.refreshProducts();
            return response.data;
          }
          throw new Error(response.message || 'Failed to add stock to batch');
        }),
        catchError(error => {
          console.error('❌ Add Stock to Batch Error:', error);
          if (error.status === 400) {
            const message = error.error?.message || error.error?.errors || 'Invalid stock data';
            throw new Error(message);
          }
          return this.handleError(error);
        })
      );
  }

  /**
   * ✅ NEW: Get batches for POS selection with FIFO ordering
   * Backend: GET /api/Product/{productId}/batches/for-pos
   */
  getBatchesForPOS(productId: number): Observable<BatchForPOSDto[]> {
    return this.http.get<ApiResponse<BatchForPOSDto[]>>(`${this.baseUrl}/${productId}/batches/for-pos`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch batches for POS');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ ENHANCED: Handle HTTP errors with proper status codes
   */
  private handleError(error: any): Observable<never> {
    console.error('❌ Inventory Service Error:', error);
    
    let message = 'An unexpected error occurred';
    
    if (error.error?.message) {
      message = error.error.message;
    } else if (error.message) {
      message = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          message = 'Invalid request data';
          break;
        case 401:
          message = 'Unauthorized access';
          break;
        case 403:
          message = 'Access forbidden';
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 500:
          message = 'Server error occurred';
          break;
        default:
          message = `HTTP Error ${error.status}`;
      }
    }
    
    return throwError(() => new Error(message));
  }

  // ===== BULK UPDATE OPERATIONS =====

  /**
   * Bulk update products with expiry dates and batches for categories that require expiry tracking
   */
  bulkUpdateProductsWithExpiryBatches(request: BulkUpdateExpiryBatchesRequest): Observable<ApiResponse<BulkUpdateResult>> {
    return this.http.post<ApiResponse<BulkUpdateResult>>(`${this.baseUrl}/bulk-update-expiry-batches`, request)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Bulk update completed:', response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get products that need expiry tracking but don't have batches yet
   */
  getProductsNeedingExpiryBatches(categoryIds?: number[]): Observable<ApiResponse<Product[]>> {
    let params = new HttpParams();
    if (categoryIds && categoryIds.length > 0) {
      params = params.set('categoryIds', categoryIds.join(','));
    }
    params = params.set('needsExpiryTracking', 'true');
    params = params.set('hasBatches', 'false');

    return this.http.get<ApiResponse<Product[]>>(`${this.baseUrl}`, { params })
      .pipe(catchError(this.handleError));
  }
}

// ✅ NEW: Interfaces for bulk update
export interface BulkUpdateExpiryBatchesRequest {
  categoryIds?: number[];
  forceUpdate?: boolean;
  defaultExpiryDate?: string;
  defaultExpiryDays?: number;
  defaultProductionDate?: string;
  defaultCostPerUnit?: number;
  defaultSupplierName?: string;
}

export interface BulkUpdateResult {
  totalProcessed: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  processedProducts: string[];
  errors: string[];
  processedAt: string;
}

