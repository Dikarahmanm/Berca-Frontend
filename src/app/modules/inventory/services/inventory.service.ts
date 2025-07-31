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
  ApiResponse 
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
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    let params = new HttpParams();
    
    if (filter) {
      if (filter.search) params = params.set('search', filter.search);
      if (filter.categoryId) params = params.set('categoryId', filter.categoryId.toString());
      if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
      if (filter.page) params = params.set('page', filter.page.toString());
      if (filter.pageSize) params = params.set('pageSize', filter.pageSize.toString());
    }

    return this.http.get<ApiResponse<ProductListResponse>>(`${this.apiUrl}`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            this.productsSubject.next(response.data.products);
            return response.data;
          }
          throw new Error(response.message);
        }),
        tap(() => this.loadingSubject.next(false)),
        catchError(error => {
          this.loadingSubject.next(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * ✅ FIXED: Get product by ID
   * Backend: GET /api/Product/{id}
   */
  getProductById(id: number): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`)
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

  /**
   * ✅ FIXED: Get product by barcode
   * Backend: GET /api/Product/barcode/{barcode}
   */
  getProductByBarcode(barcode: string): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/barcode/${barcode}`)
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

  /**
   * ✅ FIXED: Create new product
   * Backend: POST /api/Product
   */
  createProduct(product: CreateProductRequest): Observable<Product> {
    return this.http.post<ApiResponse<Product>>(`${this.apiUrl}`, product)
      .pipe(
        map(response => {
          if (response.success) {
            // Refresh products list
            this.refreshProducts();
            return response.data;
          }
          throw new Error(response.message);
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ FIXED: Update existing product
   * Backend: PUT /api/Product/{id}
   */
  updateProduct(id: number, product: UpdateProductRequest): Observable<Product> {
    return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${id}`, product)
      .pipe(
        map(response => {
          if (response.success) {
            // Refresh products list
            this.refreshProducts();
            return response.data;
          }
          throw new Error(response.message);
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ FIXED: Delete product (soft delete)
   * Backend: DELETE /api/Product/{id}
   */
  deleteProduct(id: number): Observable<boolean> {
    console.log('🗑️ Delete Product Request:', { id, url: `${this.apiUrl}/${id}` });
    
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => {
          console.log('✅ Delete Product Response:', response);
          if (response.success) {
            // Refresh products list
            this.refreshProducts();
            return response.data;
          }
          throw new Error(response.message);
        }),
        catchError(error => {
          console.error('❌ Delete Product Error:', error);
          return this.handleError(error);
        })
      );
  }

  // ===== STOCK OPERATIONS =====

  /**
   * ✅ FIXED: Update product stock
   * Backend: POST /api/Product/{id}/stock
   */
  updateStock(productId: number, request: StockUpdateRequest): Observable<boolean> {
    const url = `${this.apiUrl}/${productId}/stock`;
    console.log('🔄 Stock Update Request:', { productId, request, url });
    
    return this.http.post<ApiResponse<boolean>>(url, request)
      .pipe(
        map(response => {
          console.log('✅ Stock Update Response:', response);
          if (response.success) {
            // Refresh products list
            this.refreshProducts();
            return response.data;
          }
          throw new Error(response.message);
        }),
        catchError(error => {
          console.error('❌ Stock Update Error:', error);
          return this.handleError(error);
        })
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
          throw new Error(response.message);
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
          throw new Error(response.message);
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * ✅ FIXED: Get inventory mutations for a product
   * Backend: GET /api/Product/{id}/history
   */
  getInventoryHistory(productId: number, startDate?: Date, endDate?: Date): Observable<InventoryMutation[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());

    const url = `${this.apiUrl}/${productId}/history`;
    console.log('📋 Get History Request:', { productId, startDate, endDate, url, params: params.toString() });

    return this.http.get<ApiResponse<InventoryMutation[]>>(url, { params })
      .pipe(
        map(response => {
          console.log('✅ Get History Response:', response);
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message);
        }),
        catchError(error => {
          console.error('❌ Get History Error:', error);
          return this.handleError(error);
        })
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
  private refreshProducts(): void {
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

  /**
   * ✅ ENHANCED: Handle HTTP errors with proper status codes
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized access';
          break;
        case 403:
          errorMessage = 'Access forbidden';
          break;
        case 404:
          errorMessage = 'Resource not found';
          break;
        case 409:  // ✅ ADDED: Handle barcode conflicts
          errorMessage = 'Conflict - Barcode already exists';
          break;
        case 500:
          errorMessage = 'Server error';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.statusText}`;
      }
    }
    
    this.errorSubject.next(errorMessage);
    console.error('Inventory Service Error:', error);
    
    return throwError(() => new Error(errorMessage));
  }
}

