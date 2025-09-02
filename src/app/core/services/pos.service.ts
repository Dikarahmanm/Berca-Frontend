// ✅ COMPLETE FIX: src/app/core/services/pos.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { ApiResponse } from './user-profile.service';
import { StateService } from './state.service';

// ✅ IMPORT AND RE-EXPORT FROM CENTRALIZED INTERFACES
import {
  CreateSaleRequest,
  CreateSaleItemRequest,
  SaleDto,
  SaleItemDto,
  ProductDto,
  ReceiptDataDto,
  Product,
  Sale,
  SaleItem,
  CartItem,
  PaymentData,
  ReceiptData
} from '../../modules/pos/pos/interfaces/pos.interfaces';

import { 
  TransactionDetailResponse, 
  TransactionDetail,
  TransactionItem
} from '../../modules/pos/interfaces/transaction-detail.interface';

// ✅ RE-EXPORT ALL INTERFACES FOR OTHER COMPONENTS
export type {
  CreateSaleRequest,
  CreateSaleItemRequest,
  SaleDto,
  SaleItemDto,
  ProductDto,
  ReceiptDataDto,
  Product,
  Sale,
  SaleItem,
  CartItem,
  PaymentData,
  ReceiptData
};

// ===== API RESPONSE WRAPPERS =====
export interface ProductListResponseApiResponse {
  success: boolean;
  data: {
    products: ProductDto[];
    totalItems: number;
    currentPage: number;
    totalPages: number;
    pageSize: number;
  };
  message?: string;
}

// ✅ NEW: Response interface for /api/Product/by-branch endpoint
export interface ProductByBranchApiResponse {
  success: boolean;
  message: string;
  data: ProductDto[]; // Direct array, not paginated
  timestamp: string;
  errors: string[] | null;
  error: string | null;
}

export interface ProductDtoApiResponse {
  success: boolean;
  data: ProductDto;
  message?: string;
}

export interface SaleDtoApiResponse {
  success: boolean;
  data: SaleDto;
  message?: string;
}

export interface BooleanApiResponse {
  success: boolean;
  data: boolean;
  message?: string;
}

export interface DecimalApiResponse {
  success: boolean;
  data: number;
  message?: string;
}

export interface CalculateTotalRequest {
  items: CreateSaleItemRequest[];
  globalDiscountPercent?: number;
}

@Injectable({
  providedIn: 'root'
})
export class POSService {
  private readonly http = inject(HttpClient);
  private readonly stateService = inject(StateService);
  
  // ✅ Use relative URL for proxy routing
  private readonly apiUrl = '/api';
  
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  private currentSaleSubject = new BehaviorSubject<Sale | null>(null);
  public currentSale$ = this.currentSaleSubject.asObservable();

  // ===== PRODUCT METHODS =====
  
  /**
   * ✅ FALLBACK: Get products using /api/POS/products endpoint first,
   * fallback to /api/Product/by-branch if that fails
   */
  getProducts(filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: number;
    isActive?: boolean;
  } = {}): Observable<ProductListResponseApiResponse> {
    
    // Try /api/POS/products first (original endpoint)
    return this.getAllProducts(filters).pipe(
      catchError(error => {
        console.log('⚠️ /api/POS/products failed, trying branch fallback:', error.status);
        
        // If fails, try branch-specific endpoint
        const activeBranch = this.stateService.activeBranch();
        if (!activeBranch) {
          console.warn('⚠️ No active branch found, cannot use branch fallback');
          return throwError(() => new Error('No products endpoint available'));
        }

        // Use the by-branch endpoint and convert response format
        return this.getProductsByBranch([activeBranch.branchId], filters).pipe(
          map(branchResponse => {
            // Convert ProductByBranchApiResponse to ProductListResponseApiResponse
            const products = branchResponse.data || [];
            const page = filters.page || 1;
            const pageSize = filters.pageSize || 20;
            
            console.log('✅ Using branch fallback, got', products.length, 'products');
            
            return {
              success: branchResponse.success,
              message: branchResponse.message,
              data: {
                products: products,
                totalItems: products.length,
                currentPage: page,
                totalPages: Math.ceil(products.length / pageSize),
                pageSize: pageSize
              }
            } as ProductListResponseApiResponse;
          })
        );
      })
    );
  }

  /**
   * ✅ LEGACY: Get all products without branch filtering (for compatibility)
   * Uses the original /api/POS/products endpoint
   */
  getAllProducts(filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: number;
    isActive?: boolean;
  } = {}): Observable<ProductListResponseApiResponse> {
    let params = new HttpParams()
      .set('page', (filters.page || 1).toString())
      .set('pageSize', (filters.pageSize || 20).toString())
      .set('isActive', (filters.isActive !== undefined ? filters.isActive : true).toString());
      
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    
    if (filters.categoryId) {
      params = params.set('categoryId', filters.categoryId.toString());
    }

    console.log('🏢 Loading all products (legacy method):', filters);

    // ✅ Use the legacy POS endpoint
    return this.http.get<ProductListResponseApiResponse>(`${this.apiUrl}/POS/products`, { 
      params,
      withCredentials: true 
    }).pipe(
      tap(response => {
        console.log('✅ Products loaded (legacy):', response?.data?.products?.length || 0);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORRECTED: Get products by specific branch IDs  
   * Uses the /api/Product/by-branch endpoint (returns direct array in data)
   */
  getProductsByBranch(branchIds: number[], filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: number;
    isActive?: boolean;
  } = {}): Observable<ProductByBranchApiResponse> {
    let params = new HttpParams()
      .set('branchIds', branchIds.join(','))
      .set('page', (filters.page || 1).toString())
      .set('pageSize', (filters.pageSize || 20).toString())
      .set('isActive', (filters.isActive !== undefined ? filters.isActive : true).toString());
      
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    
    if (filters.categoryId) {
      params = params.set('categoryId', filters.categoryId.toString());
    }

    console.log('🏢 Loading products for specific branches via /api/Product/by-branch:', branchIds);

    // ✅ Use the by-branch endpoint (returns direct array in data)
    return this.http.get<ProductByBranchApiResponse>(`${this.apiUrl}/Product/by-branch`, { 
      params,
      withCredentials: true 
    }).pipe(
      tap(response => {
        console.log('✅ Branch-specific products loaded:', response?.data?.length || 0);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ NEW: Get product stock across branches
   * Uses the /api/POS/products/{productId}/branch-stock endpoint
   */
  getProductBranchStock(productId: number): Observable<ApiResponse<{[branchId: number]: number}>> {
    console.log('📦 Loading branch stock for product:', productId);

    return this.http.get<ApiResponse<{[branchId: number]: number}>>(`${this.apiUrl}/POS/products/${productId}/branch-stock`, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          const branchCount = Object.keys(response.data).length;
          console.log('✅ Branch stock loaded for', branchCount, 'branches');
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getProductByBarcode(barcode: string): Observable<ProductDtoApiResponse> {
    // Try the direct barcode endpoint first
    return this.http.get<ProductDtoApiResponse>(`${this.apiUrl}/Product/barcode/${barcode}`, {
      withCredentials: true 
    }).pipe(
      catchError((error) => {
        // If barcode endpoint fails (404), try searching with barcode filter
        if (error.status === 404) {
          console.log('Direct barcode endpoint not found, trying search fallback...');
          
          const params = new HttpParams()
            .set('search', barcode)
            .set('page', '1')
            .set('pageSize', '10')
            .set('isActive', 'true');

          return this.http.get<ProductListResponseApiResponse>(`${this.apiUrl}/Product`, { 
            params,
            withCredentials: true 
          }).pipe(
            map(response => {
              // Find exact barcode match from search results
              const exactMatch = response.data?.products?.find((product: ProductDto) => 
                product.barcode === barcode
              );
              
              if (exactMatch) {
                // Convert ProductListItem to ProductDto format
                return {
                  success: true,
                  data: exactMatch,
                  message: 'Product found'
                } as ProductDtoApiResponse;
              } else {
                throw new Error('Product dengan barcode tersebut tidak ditemukan');
              }
            }),
            catchError(this.handleError.bind(this))
          );
        }
        return this.handleError(error);
      })
    );
  }

  searchProducts(query: string): Observable<ProductListResponseApiResponse> {
    const params = new HttpParams()
      .set('search', query)
      .set('page', '1')
      .set('pageSize', '50')
      .set('isActive', 'true');

    return this.http.get<ProductListResponseApiResponse>(`${this.apiUrl}/Product`, { 
      params,
      withCredentials: true 
    }).pipe(catchError(this.handleError.bind(this)));
  }

  // ===== POS METHODS =====
  createSale(data: CreateSaleRequest): Observable<SaleDtoApiResponse> {
    return this.http.post<SaleDtoApiResponse>(`${this.apiUrl}/POS/sales`, data, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.clearCart();
          this.currentSaleSubject.next(response.data);
          console.log('✅ Sale created:', response.data.saleNumber);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  validateStock(items: CreateSaleItemRequest[]): Observable<BooleanApiResponse> {
    console.log('🔍 Validating stock for items:', items);
    
    return this.http.post<BooleanApiResponse>(`${this.apiUrl}/POS/validate-stock`, items, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Stock validation response:', response);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  calculateTotal(items: CreateSaleItemRequest[], globalDiscountPercent?: number): Observable<DecimalApiResponse> {
    const requestBody: CalculateTotalRequest = {
      items: items,
      globalDiscountPercent: globalDiscountPercent || 0
    };

    console.log('🔍 Calculating total for:', requestBody);

    return this.http.post<DecimalApiResponse>(`${this.apiUrl}/POS/calculate-total`, requestBody, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Calculate total response:', response);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getSaleById(id: number): Observable<SaleDtoApiResponse> {
    return this.http.get<SaleDtoApiResponse>(`${this.apiUrl}/POS/sales/${id}`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getSaleByNumber(saleNumber: string): Observable<SaleDtoApiResponse> {
    return this.http.get<SaleDtoApiResponse>(`${this.apiUrl}/POS/sales/number/${saleNumber}`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getSales(filters: {
    startDate?: Date;
    endDate?: Date;
    cashierId?: number;
    paymentMethod?: string;
    page?: number;
    pageSize?: number;
  } = {}): Observable<ApiResponse<Sale[]>> {
    let params = new HttpParams();
    
    if (filters.startDate) params = params.set('startDate', filters.startDate.toISOString());
    if (filters.endDate) params = params.set('endDate', filters.endDate.toISOString());
    if (filters.cashierId) params = params.set('cashierId', filters.cashierId.toString());
    if (filters.paymentMethod) params = params.set('paymentMethod', filters.paymentMethod);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());

    return this.http.get<ApiResponse<Sale[]>>(`${this.apiUrl}/POS/sales`, { 
      params,
      withCredentials: true 
    }).pipe(catchError(this.handleError.bind(this)));
  }

  getReceiptData(saleId: number): Observable<ApiResponse<ReceiptDataDto>> {
    return this.http.get<ApiResponse<ReceiptDataDto>>(`${this.apiUrl}/POS/sales/${saleId}/receipt`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }
/**
   * getById
   * Endpoint: GET /api/POS/sales/{id}
   */
  getById(id: number): Observable<ApiResponse<SaleDto>> {
    return this.http.get<ApiResponse<SaleDto>>(`${this.apiUrl}/POS/sales/${id}`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Mark receipt as printed
   * Endpoint: POST /api/POS/sales/{id}/print-receipt
   */
  markReceiptPrinted(saleId: number): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/POS/sales/${saleId}/print-receipt`, {}, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  // ===== CART MANAGEMENT =====
  getCart(): CartItem[] {
    return this.cartSubject.value;
  }

  addToCart(product: Product, quantity: number = 1, discount: number = 0): void {
    const currentCart = this.cartSubject.value;
    const existingItemIndex = currentCart.findIndex(item => item.product.id === product.id);

    if (existingItemIndex > -1) {
      const updatedCart = [...currentCart];
      updatedCart[existingItemIndex].quantity += quantity;
      updatedCart[existingItemIndex].discount = discount;
      updatedCart[existingItemIndex].subtotal = this.calculateItemSubtotal(
        updatedCart[existingItemIndex]
      );
      this.cartSubject.next(updatedCart);
    } else {
      const newItem: CartItem = {
        product,
        quantity,
        discount,
        subtotal: this.calculateItemSubtotal({ product, quantity, discount } as CartItem)
      };
      this.cartSubject.next([...currentCart, newItem]);
    }
  }

  updateCartItemQuantity(productId: number, quantity: number): void {
    const currentCart = this.cartSubject.value;
    const updatedCart = currentCart.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity,
          subtotal: this.calculateItemSubtotal({ ...item, quantity })
        };
      }
      return item;
    });
    this.cartSubject.next(updatedCart);
  }

  updateCartItemDiscount(productId: number, discount: number): void {
    const currentCart = this.cartSubject.value;
    const updatedCart = currentCart.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          discount,
          subtotal: this.calculateItemSubtotal({ ...item, discount })
        };
      }
      return item;
    });
    this.cartSubject.next(updatedCart);
  }

  removeFromCart(productId: number): void {
    const currentCart = this.cartSubject.value;
    const updatedCart = currentCart.filter(item => item.product.id !== productId);
    this.cartSubject.next(updatedCart);
  }

  clearCart(): void {
    this.cartSubject.next([]);
    this.currentSaleSubject.next(null);
  }

  // ===== CART TOTALS - FIXED MAPPING =====
  getCartTotals(globalDiscountPercent: number = 0): Observable<{
    subtotal: number;
    globalDiscount: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
  }> {
    const cart = this.cartSubject.value;
    
    if (cart.length === 0) {
      return new Observable(observer => {
        observer.next({
          subtotal: 0,
          globalDiscount: globalDiscountPercent,
          discountAmount: 0,
          taxAmount: 0,
          total: 0
        });
        observer.complete();
      });
    }

    // ✅ FIXED: Map to correct CreateSaleItemRequest format with all required fields
    const items: CreateSaleItemRequest[] = cart.map(item => {
      const itemTotalPrice = item.quantity * item.product.sellPrice;
      const discountAmount = (itemTotalPrice * item.discount) / 100;
      return {
        productId: item.product.id,
        quantity: item.quantity,
        discount: item.discount,            // Discount percentage
        sellPrice: item.product.sellPrice,  // Price per unit
        discountAmount: discountAmount,     // Calculated discount amount
        notes: '',                         // Optional notes
        unitPrice: item.product.sellPrice, // Same as sellPrice
        totalPrice: itemTotalPrice - discountAmount // Final item total
      };
    });

    return this.calculateTotal(items, globalDiscountPercent).pipe(
      map(response => {
        if (response.success) {
          const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
          const discountAmount = subtotal * (globalDiscountPercent / 100);
          const afterDiscount = subtotal - discountAmount;
          const taxAmount = 0; // ✅ DISABLED: Tax calculation disabled as per requirement
          
          return {
            subtotal,
            globalDiscount: globalDiscountPercent,
            discountAmount,
            taxAmount,
            total: response.data
          };
        } else {
          throw new Error(response.message || 'Failed to calculate total');
        }
      })
    );
  }

  // ===== COMPATIBILITY METHOD =====
  getCartTotalsSync(globalDiscountPercent: number = 0): {
    subtotal: number;
    globalDiscount: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
  } {
    const cart = this.cartSubject.value;
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = subtotal * (globalDiscountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = 0; // ✅ DISABLED: Tax calculation disabled as per requirement
    const total = afterDiscount; // ✅ FIXED: Total without tax

    return {
      subtotal,
      globalDiscount: globalDiscountPercent,
      discountAmount,
      taxAmount,
      total
    };
  }

  // ===== TRANSACTION DETAIL METHODS =====
  
  /**
   * Get transaction detail by ID
   */
  getTransactionDetail(id: number): Observable<TransactionDetail> {
    console.log('🔍 Getting transaction detail for ID:', id);
    
    return this.http.get<TransactionDetailResponse>(`${this.apiUrl}/POS/sales/${id}`)
      .pipe(
        tap(response => {
          console.log('✅ Transaction detail response:', response);
        }),
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to get transaction detail');
        }),
        catchError(error => {
          console.error('❌ Error getting transaction detail:', error);
          return this.handleError(error);
        })
      );
  }

  /**
   * Print receipt for transaction
   */
  printReceipt(transactionId: number): Observable<boolean> {
    console.log('🖨️ Marking receipt as printed for transaction:', transactionId);
    
    return this.http.post<BooleanApiResponse>(`${this.apiUrl}/POS/sales/${transactionId}/print-receipt`, {})
      .pipe(
        tap(response => {
          console.log('✅ Print receipt response:', response);
        }),
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to mark receipt as printed');
        }),
        catchError(error => {
          console.error('❌ Error printing receipt:', error);
          return this.handleError(error);
        })
      );
  }

  // ===== UTILITY METHODS =====
  private calculateItemSubtotal(item: CartItem): number {
    const baseAmount = item.product.sellPrice * item.quantity;
    const discountAmount = baseAmount * (item.discount / 100);
    return baseAmount - discountAmount;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  private handleError(error: any): Observable<never> {
    console.error('POS Service Error:', error);
    
    let errorMessage = 'Terjadi kesalahan pada sistem POS';
    
    if (error.status === 404) {
      errorMessage = 'Endpoint tidak ditemukan - periksa URL API';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized - silakan login ulang';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Data tidak valid';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}