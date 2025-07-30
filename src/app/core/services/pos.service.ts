// src/app/core/services/pos.service.ts - CORRECTED BACKEND INTEGRATION
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { ApiResponse } from './user-profile.service';

// ===== BACKEND DTO INTERFACES - EXACT MATCH =====

export interface CreateSaleRequest {
  items: CreateSaleItemRequest[];
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  memberId?: number;
  customerName?: string;
  notes?: string;
  redeemedPoints?: number;
}

export interface CreateSaleItemRequest {
  productId: number;
  quantity: number;
  sellPrice: number;
  discount: number;
}

export interface CalculateTotalRequest {
  items: CreateSaleItemRequest[];
  globalDiscountPercent?: number;
}

export interface SaleDto {
  id: number;
  saleNumber: string;
  saleDate: Date;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  memberId?: number;
  memberName?: string;
  memberNumber?: string;
  customerName?: string;
  cashierId: number;
  cashierName: string;
  status: string;
  notes?: string;
  receiptPrinted: boolean;
  receiptPrintedAt?: Date;
  items: SaleItemDto[];
  createdAt: Date;
  totalItems: number;
  totalProfit: number;
  discountPercentage: number;
  redeemedPoints: number;
}

export interface SaleItemDto {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  productBarcode: string;
  quantity: number;
  sellPrice: number;
  buyPrice: number;
  discount: number;
  subtotal: number;
  totalProfit: number;
}

export interface ProductDto {
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

export interface ReceiptDataDto {
  sale: SaleDto;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  footerMessage?: string;
}

// API Response wrappers - CORRECTED TO MATCH BACKEND
export interface ProductListResponseApiResponse {
  success: boolean;
  data: {
    products: ProductDto[];    // ✅ Backend uses "products"
    totalItems: number;        // ✅ Backend uses "totalItems"
    currentPage: number;
    totalPages: number;
    pageSize: number;
  };
  message?: string;
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

// Use backend DTOs for consistency
export interface Sale extends SaleDto {}
export interface SaleItem extends SaleItemDto {}
export interface Product extends ProductDto {}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  subtotal: number;
}

// ===== RECEIPT DATA INTERFACE =====
export interface ReceiptData extends ReceiptDataDto {}

// ===== UI INTERFACES =====
export interface PaymentData {
  method: 'cash' | 'card' | 'digital';
  amountPaid: number;
  change: number;
  reference?: string;
}

@Injectable({
  providedIn: 'root'
})
export class POSService {
  private readonly apiUrl = environment.apiUrl; // Base API URL
  
  // Real-time cart state
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  // Current sale session
  private currentSaleSubject = new BehaviorSubject<Sale | null>(null);
  public currentSale$ = this.currentSaleSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ===== PRODUCT METHODS (ProductController endpoints) =====

  /**
   * Get products with pagination and search
   * Endpoint: GET /api/Product
   */
  getProducts(page: number = 1, pageSize: number = 20, search?: string): Observable<ProductListResponseApiResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
      
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ProductListResponseApiResponse>(`${this.apiUrl}/Product`, { 
      params,
      withCredentials: true 
    }).pipe(
      tap(response => {
        console.log('✅ Products loaded:', response?.data?.products?.length || 0);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get product by barcode
   * Endpoint: GET /api/Product/barcode/{barcode}
   */
  getProductByBarcode(barcode: string): Observable<ProductDtoApiResponse> {
    return this.http.get<ProductDtoApiResponse>(`${this.apiUrl}/Product/barcode/${barcode}`, {
      withCredentials: true 
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Search products by name or barcode
   * Endpoint: GET /api/Product?search={query}
   */
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

  // ===== POS METHODS (POSController endpoints) =====

  /**
   * Create a new sale transaction
   * Endpoint: POST /api/POS/sales
   */
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

  /**
   * Validate stock availability for items
   * Endpoint: POST /api/POS/validate-stock
   * ✅ FIXED: Send array directly (not wrapped in object)
   */
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

  /**
   * Calculate total using backend
   * Endpoint: POST /api/POS/calculate-total
   * ✅ FIXED: Use proper request body structure
   */
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

  /**
   * Get sale by ID
   * Endpoint: GET /api/POS/sales/{id}
   */
  getSaleById(id: number): Observable<SaleDtoApiResponse> {
    return this.http.get<SaleDtoApiResponse>(`${this.apiUrl}/POS/sales/${id}`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Get sale by sale number
   * Endpoint: GET /api/POS/sales/number/{saleNumber}
   */
  getSaleByNumber(saleNumber: string): Observable<SaleDtoApiResponse> {
    return this.http.get<SaleDtoApiResponse>(`${this.apiUrl}/POS/sales/number/${saleNumber}`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Get sales with filters
   * Endpoint: GET /api/POS/sales
   */
  getSales(filters: {
    startDate?: Date;
    endDate?: Date;
    cashierId?: number;
    paymentMethod?: string;
    page?: number;
    pageSize?: number;
  } = {}): Observable<ApiResponse<Sale[]>> {
    let params = new HttpParams();
    
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate.toISOString());
    }
    if (filters.cashierId) {
      params = params.set('cashierId', filters.cashierId.toString());
    }
    if (filters.paymentMethod) {
      params = params.set('paymentMethod', filters.paymentMethod);
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<ApiResponse<Sale[]>>(`${this.apiUrl}/POS/sales`, { 
      params,
      withCredentials: true 
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Get receipt data for printing
   * Endpoint: GET /api/POS/sales/{id}/receipt
   */
  getReceiptData(saleId: number): Observable<ApiResponse<ReceiptDataDto>> {
    return this.http.get<ApiResponse<ReceiptDataDto>>(`${this.apiUrl}/POS/sales/${saleId}/receipt`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Mark receipt as printed
   * Endpoint: PUT /api/POS/sales/{id}/receipt-printed
   */
  markReceiptPrinted(saleId: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/POS/sales/${saleId}/receipt-printed`, {}, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  // ===== LEGACY METHODS - UPDATED FOR COMPATIBILITY =====

  /**
   * @deprecated Use validateStock instead
   */
  validateStockAvailability(items: CreateSaleItemRequest[]): Observable<BooleanApiResponse> {
    return this.validateStock(items);
  }

  // ===== CART MANAGEMENT (CLIENT-SIDE) =====

  /**
   * Get current cart items
   */
  getCart(): CartItem[] {
    return this.cartSubject.value;
  }

  /**
   * Add item to cart
   */
  addToCart(product: Product, quantity: number = 1, discount: number = 0): void {
    const currentCart = this.cartSubject.value;
    const existingItemIndex = currentCart.findIndex(item => item.product.id === product.id);

    if (existingItemIndex > -1) {
      // Update existing item
      const updatedCart = [...currentCart];
      updatedCart[existingItemIndex].quantity += quantity;
      updatedCart[existingItemIndex].discount = discount;
      updatedCart[existingItemIndex].subtotal = this.calculateItemSubtotal(
        updatedCart[existingItemIndex]
      );
      this.cartSubject.next(updatedCart);
    } else {
      // Add new item
      const newItem: CartItem = {
        product,
        quantity,
        discount,
        subtotal: this.calculateItemSubtotal({ product, quantity, discount } as CartItem)
      };
      this.cartSubject.next([...currentCart, newItem]);
    }
  }

  /**
   * Update cart item quantity
   */
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

  /**
   * Update cart item discount
   */
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

  /**
   * Remove item from cart
   */
  removeFromCart(productId: number): void {
    const currentCart = this.cartSubject.value;
    const updatedCart = currentCart.filter(item => item.product.id !== productId);
    this.cartSubject.next(updatedCart);
  }

  /**
   * Clear cart
   */
  clearCart(): void {
    this.cartSubject.next([]);
    this.currentSaleSubject.next(null);
  }

  /**
   * Get cart totals using backend calculation
   * ✅ FIXED: Use corrected calculateTotal method signature
   */
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

    const items: CreateSaleItemRequest[] = cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      sellPrice: item.product.sellPrice,
      discount: item.discount
    }));

    return this.calculateTotal(items, globalDiscountPercent).pipe(
      map(response => {
        if (response.success) {
          // Calculate individual components for UI display
          const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
          const discountAmount = subtotal * (globalDiscountPercent / 100);
          const afterDiscount = subtotal - discountAmount;
          const taxAmount = afterDiscount * 0.11; // This should also come from backend in future
          
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

  /**
   * Get cart totals synchronously (for compatibility, but prefers async version)
   * @deprecated Use getCartTotals() Observable version instead
   */
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
    const taxAmount = afterDiscount * 0.11; // 11% PPN
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      globalDiscount: globalDiscountPercent,
      discountAmount,
      taxAmount,
      total
    };
  }

  // ===== UTILITY METHODS =====

  /**
   * Calculate subtotal for a cart item
   */
  private calculateItemSubtotal(item: CartItem): number {
    const baseAmount = item.product.sellPrice * item.quantity;
    const discountAmount = baseAmount * (item.discount / 100);
    return baseAmount - discountAmount;
  }

  /**
   * Format currency
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
   * Handle HTTP errors
   */
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