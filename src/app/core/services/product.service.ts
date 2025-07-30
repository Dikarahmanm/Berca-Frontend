// src/app/core/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { ApiResponse } from './user-profile.service';

export interface Product {
  id: number;
  name: string;
  barcode: string;
  stock: number;
  buyPrice: number;
  sellPrice: number;
  categoryId: number;
  categoryName: string;
  isActive: boolean;
  minStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListResponse {
  products: Product[];       // ✅ Change from "products" to "products"
  totalproducts: number;        // ✅ Keep as "totalproducts"
  currentPage: number;       // ✅ Add missing fields
  totalPages: number;
  pageSize: number;
}

export interface CreateProductRequest {
  name: string;
  barcode: string;
  stock: number;
  buyPrice: number;
  sellPrice: number;
  categoryId: number;
  minStock: number;
  isActive: boolean;
}

export interface UpdateProductRequest extends CreateProductRequest {
  id: number;
}

export interface ProductFilter {
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  minStock?: number;
  maxStock?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly apiUrl = `${environment.apiUrl}/Product`;

  constructor(private http: HttpClient) {}

  // ===== CRUD OPERATIONS =====

  /**
   * Get products with filtering and pagination
   */
  getProducts(filter?: ProductFilter): Observable<ApiResponse<ProductListResponse>> {
    let params = new HttpParams();

    if (filter) {
      if (filter.search) params = params.set('search', filter.search);
      if (filter.categoryId) params = params.set('categoryId', filter.categoryId.toString());
      if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
      if (filter.minStock) params = params.set('minStock', filter.minStock.toString());
      if (filter.maxStock) params = params.set('maxStock', filter.maxStock.toString());
      if (filter.page) params = params.set('page', filter.page.toString());
      if (filter.pageSize) params = params.set('pageSize', filter.pageSize.toString());
      if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
      if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);
    }

    return this.http.get<ApiResponse<ProductListResponse>>(this.apiUrl, { params,withCredentials: true })
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Get product by ID
   */
  getProductById(id: number): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Get product by barcode
   */
  getProductByBarcode(barcode: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/barcode/${barcode}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Create new product
   */
  createProduct(request: CreateProductRequest): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(this.apiUrl, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Update product
   */
  updateProduct(id: number, request: UpdateProductRequest): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${id}`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Delete product
   */
  deleteProduct(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  // ===== SEARCH & FILTERING =====

  /**
   * Search products for POS (active products with stock)
   */
  searchForPOS(query: string, limit: number = 50): Observable<ApiResponse<Product[]>> {
    const params = new HttpParams()
      .set('search', query)
      .set('isActive', 'true')
      .set('pageSize', limit.toString())
      .set('page', '1');

    return this.http.get<ApiResponse<ProductListResponse>>(this.apiUrl, { params })
      .pipe(
        map(response => ({
          ...response,
          data: response.data?.products || []
        })),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get low stock products
   */
  getLowStockProducts(): Observable<ApiResponse<Product[]>> {
    const params = new HttpParams()
      .set('isActive', 'true')
      .set('lowStock', 'true')
      .set('pageSize', '100');

    return this.http.get<ApiResponse<ProductListResponse>>(this.apiUrl, { params })
      .pipe(
        map(response => ({
          ...response,
          data: response.data?.products || []
        })),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get products by category
   */
  getProductsByCategory(categoryId: number): Observable<ApiResponse<Product[]>> {
    const params = new HttpParams()
      .set('categoryId', categoryId.toString())
      .set('isActive', 'true')
      .set('pageSize', '100');

    return this.http.get<ApiResponse<ProductListResponse>>(this.apiUrl, { params })
      .pipe(
        map(response => ({
          ...response,
          data: response.data?.products || []
        })),
        catchError(this.handleError.bind(this))
      );
  }

  // ===== STOCK OPERATIONS =====

  /**
   * Update product stock
   */
  updateStock(productId: number, newStock: number, reason?: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${productId}/stock`, {
      stock: newStock,
      reason: reason || 'Manual adjustment'
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Check stock availability for multiple products
   */
  checkStockAvailability(products: { productId: number; quantity: number }[]): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/check-stock`, { products })
      .pipe(catchError(this.handleError.bind(this)));
  }

  // ===== VALIDATION =====

  /**
   * Check if barcode is unique
   */
  validateBarcode(barcode: string, excludeId?: number): Observable<ApiResponse<boolean>> {
    let params = new HttpParams().set('barcode', barcode);
    if (excludeId) {
      params = params.set('excludeId', excludeId.toString());
    }

    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/validate-barcode`, { params })
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Validate product name uniqueness
   */
  validateProductName(name: string, excludeId?: number): Observable<ApiResponse<boolean>> {
    let params = new HttpParams().set('name', name);
    if (excludeId) {
      params = params.set('excludeId', excludeId.toString());
    }

    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/validate-name`, { params })
      .pipe(catchError(this.handleError.bind(this)));
  }

  // ===== BULK OPERATIONS =====

  /**
   * Bulk update products
   */
  bulkUpdateProducts(updates: Partial<UpdateProductRequest>[]): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/bulk-update`, { products: updates })
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Import products from CSV/Excel
   */
  importProducts(file: File): Observable<ApiResponse<{ successful: number; failed: number; errors: string[] }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<{ successful: number; failed: number; errors: string[] }>>(
      `${this.apiUrl}/import`,
      formData
    ).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Export products to Excel
   */
  exportProducts(filter?: ProductFilter): Observable<Blob> {
    let params = new HttpParams();

    if (filter) {
      if (filter.search) params = params.set('search', filter.search);
      if (filter.categoryId) params = params.set('categoryId', filter.categoryId.toString());
      if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
    }

    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    }).pipe(catchError(this.handleError.bind(this)));
  }

  // ===== UTILITY METHODS =====

  /**
   * Format currency for Indonesia
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Generate random barcode
   */
  generateBarcode(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString().substr(2, 4);
    return `${timestamp.substr(-8)}${random}`;
  }

  /**
   * Calculate profit margin
   */
  calculateProfitMargin(buyPrice: number, sellPrice: number): number {
    if (buyPrice === 0) return 0;
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  }

  /**
   * Calculate profit amount
   */
  calculateProfit(buyPrice: number, sellPrice: number, quantity: number = 1): number {
    return (sellPrice - buyPrice) * quantity;
  }

  /**
   * Get stock status
   */
  getStockStatus(product: Product): 'out-of-stock' | 'low-stock' | 'in-stock' {
    if (product.stock === 0) return 'out-of-stock';
    if (product.stock <= product.minStock) return 'low-stock';
    return 'in-stock';
  }

  /**
   * Get stock status color
   */
  getStockStatusColor(product: Product): string {
    const status = this.getStockStatus(product);
    switch (status) {
      case 'out-of-stock': return '#E15A4F'; // Error color
      case 'low-stock': return '#FFB84D'; // Warning color
      case 'in-stock': return '#4BBF7B'; // Success color
      default: return '#64748b';
    }
  }

  /**
   * Format stock display
   */
  formatStockDisplay(product: Product): string {
    const status = this.getStockStatus(product);
    const stockText = `${product.stock} pcs`;
    
    switch (status) {
      case 'out-of-stock': return `${stockText} (Habis)`;
      case 'low-stock': return `${stockText} (Rendah)`;
      default: return stockText;
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('Product Service Error:', error);
    
    let errorMessage = 'Terjadi kesalahan pada sistem produk';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 404) {
      errorMessage = 'Produk tidak ditemukan';
    } else if (error.status === 409) {
      errorMessage = 'Barcode atau nama produk sudah digunakan';
    } else if (error.status === 400) {
      errorMessage = 'Data produk tidak valid';
    }

    return throwError(() => new Error(errorMessage));
  }
}