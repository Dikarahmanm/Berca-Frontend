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
  CreateBatchRequest,
  AddStockToBatchRequest,
  BatchForPOSDto
} from '../interfaces/inventory.interfaces';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly apiUrl = `${environment.apiUrl}/Product`;
  
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

    return this.http.get<ApiResponse<ProductListResponse>>(this.apiUrl, { params })
      .pipe(
        map(response => {
          if (response.success) {
            this.productsSubject.next(response.data.products);
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch products');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ FIXED: Get product by ID
   * Backend: GET /api/Product/{id}
   */
  getProduct(id: number): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`)
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
   * ✅ ENHANCED: Get product by barcode for batch management
   * Backend: GET /api/Product/barcode/{barcode}
   * Returns null if product not found (non-throwing version)
   */
  getProductByBarcode(barcode: string): Observable<Product | null> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/barcode/${barcode}`)
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
    
    return this.http.post<ApiResponse<Product>>(this.apiUrl, request)
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
    
    return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${id}`, request)
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
    
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`)
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
    const url = `${this.apiUrl}/${productId}/stock`;
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
    
    return this.http.get<ApiResponse<Product[]>>(`${this.apiUrl}/alerts/low-stock`, { params })
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
    return this.http.get<ApiResponse<Product[]>>(`${this.apiUrl}/alerts/out-of-stock`)
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

    return this.http.get<ApiResponse<InventoryMutation[]>>(`${this.apiUrl}/${productId}/history`, { params })
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
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/reports/inventory-value`)
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

    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/validate/barcode/${barcode}`, { params })
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
    return this.http.get<ApiResponse<{ batchNumber: string }>>(`${this.apiUrl}/${productId}/batch/generate`)
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
   * ✅ FIXED: Get products with batch summary for enhanced inventory view
   * Backend: GET /api/Product/with-batch-summary
   */
  getProductsWithBatchSummary(categoryId?: number): Observable<ProductWithBatchSummaryDto[]> {
    let params = new HttpParams();
    
    // Only pass categoryId if provided
    if (categoryId) {
      params = params.set('categoryId', categoryId.toString());
    }

    return this.http.get<ApiResponse<ProductWithBatchSummaryDto[]>>(`${this.apiUrl}/with-batch-summary`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch products with batches');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ NEW: Get batches for a specific product
   * Backend: GET /api/Product/{productId}/batches
   */
  getProductBatches(productId: number): Observable<ProductBatch[]> {
    return this.http.get<ApiResponse<ProductBatch[]>>(`${this.apiUrl}/${productId}/batches`)
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to fetch product batches');
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ NEW: Create batch for existing product
   * Backend: POST /api/Product/{productId}/batches
   */
  createBatchForProduct(productId: number, batchData: CreateBatchRequest): Observable<ProductBatch> {
    console.log('🆕 Creating Batch for Product:', { productId, batchData });
    
    return this.http.post<ApiResponse<ProductBatch>>(`${this.apiUrl}/${productId}/batches`, batchData)
      .pipe(
        map(response => {
          console.log('✅ Batch Created:', response);
          if (response.success) {
            this.refreshProducts();
            return response.data;
          }
          throw new Error(response.message || 'Failed to create batch');
        }),
        catchError(error => {
          console.error('❌ Create Batch Error:', error);
          if (error.status === 400) {
            const message = error.error?.message || error.error?.errors || 'Invalid batch data';
            throw new Error(message);
          }
          return this.handleError(error);
        })
      );
  }

  /**
   * ✅ NEW: Add stock to existing batch
   * Backend: POST /api/Product/batches/{batchId}/add-stock
   */
  addStockToBatch(batchId: number, request: AddStockToBatchRequest): Observable<ProductBatch> {
    console.log('📦 Adding Stock to Batch:', { batchId, request });
    
    return this.http.post<ApiResponse<ProductBatch>>(`${this.apiUrl}/batches/${batchId}/add-stock`, request)
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
    return this.http.get<ApiResponse<BatchForPOSDto[]>>(`${this.apiUrl}/${productId}/batches/for-pos`)
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
}

