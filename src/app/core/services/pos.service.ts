// src/app/core/services/pos.service.ts - COMPLETE BACKEND INTEGRATION
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { ApiResponse } from './user-profile.service';

// ===== INTERFACES SESUAI BACKEND DTOs =====

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

export interface Sale {
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
  items: SaleItem[];
  createdAt: Date;
  totalItems: number;
  totalProfit: number;
  discountPercentage: number;
  redeemedPoints: number;
}

export interface SaleItem {
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

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  subtotal: number;
}

// ===== RECEIPT DATA INTERFACE =====
export interface ReceiptData {
  sale: Sale;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  footerMessage?: string;
}

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
  private readonly apiUrl = `${environment.apiUrl}/POS`;
  
  // Real-time cart state
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  // Current sale session
  private currentSaleSubject = new BehaviorSubject<Sale | null>(null);
  public currentSale$ = this.currentSaleSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ===== TRANSACTION OPERATIONS =====
  
  /**
   * Create a new sale transaction
   */
  createSale(request: CreateSaleRequest): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(`${this.apiUrl}/sales`, request, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.clearCart();
          this.currentSaleSubject.next(response.data);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get sale by ID
   */
  getSaleById(id: number): Observable<ApiResponse<Sale>> {
    return this.http.get<ApiResponse<Sale>>(`${this.apiUrl}/sales/${id}`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Get sale by sale number
   */
  getSaleByNumber(saleNumber: string): Observable<ApiResponse<Sale>> {
    return this.http.get<ApiResponse<Sale>>(`${this.apiUrl}/sales/number/${saleNumber}`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Get sales with filters
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

    return this.http.get<ApiResponse<Sale[]>>(`${this.apiUrl}/sales`, { 
      params,
      withCredentials: true 
    }).pipe(catchError(this.handleError.bind(this)));
  }

  // ===== VALIDATION =====

  /**
   * Validate stock availability for items
   */
  validateStockAvailability(items: CreateSaleItemRequest[]): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/validate-stock`, items, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  // ===== RECEIPT OPERATIONS =====

  /**
   * Get receipt data for printing
   */
  getReceiptData(saleId: number): Observable<ApiResponse<ReceiptData>> {
    return this.http.get<ApiResponse<ReceiptData>>(`${this.apiUrl}/sales/${saleId}/receipt`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Mark receipt as printed
   */
  markReceiptPrinted(saleId: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/sales/${saleId}/receipt-printed`, {}, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
  }

  // ===== PRODUCT SEARCH (Integration with Product Service) =====

  /**
   * Search products by name or barcode
   */
  searchProducts(query: string): Observable<ApiResponse<Product[]>> {
    const params = new HttpParams()
      .set('search', query)
      .set('page', '1')
      .set('pageSize', '50')
      .set('isActive', 'true');

    return this.http.get<ApiResponse<{items: Product[]; totalCount: number}>>(`${environment.apiUrl}/Product`, { 
      params,
      withCredentials: true 
    }).pipe(
      map(response => ({
        ...response,
        data: response.data?.items || []
      })),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get product by barcode
   */
  getProductByBarcode(barcode: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${environment.apiUrl}/Product/barcode/${barcode}`, {
      withCredentials: true
    }).pipe(catchError(this.handleError.bind(this)));
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
   * Get cart totals
   */
  getCartTotals(globalDiscountPercent: number = 0): {
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
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}