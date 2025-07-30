// src/app/core/services/pos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { ApiResponse } from './user-profile.service';

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

export interface SaleSummary {
  totalSales: number;
  totalTransactions: number;
  averageTransaction: number;
  totalProfit: number;
  cashSales: number;
  cardSales: number;
  digitalSales: number;
  topSellingProducts: TopSellingProduct[];
  hourlySales: HourlySales[];
}

export interface TopSellingProduct {
  productId: number;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface HourlySales {
  hour: number;
  sales: number;
  transactions: number;
}

export interface ReceiptData {
  sale: Sale;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  footerMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class POSService {
  private readonly apiUrl = `${environment.apiUrl}/POS`;
  
  // Real-time cart state
  private cartSubject = new BehaviorSubject<any[]>([]);
  public cart$ = this.cartSubject.asObservable();

  // Current sale session
  private currentSaleSubject = new BehaviorSubject<any>(null);
  public currentSale$ = this.currentSaleSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ===== TRANSACTION OPERATIONS =====
  
  /**
   * Create a new sale transaction
   */
  createSale(request: CreateSaleRequest): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(`${this.apiUrl}/sales`, request)
      .pipe(
        tap(response => {
          if (response.success) {
            this.clearCart();
            this.currentSaleSubject.next(response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get sale by ID
   */
  getSaleById(id: number): Observable<ApiResponse<Sale>> {
    return this.http.get<ApiResponse<Sale>>(`${this.apiUrl}/sales/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get sale by sale number
   */
  getSaleByNumber(saleNumber: string): Observable<ApiResponse<Sale>> {
    return this.http.get<ApiResponse<Sale>>(`${this.apiUrl}/sales/number/${saleNumber}`)
      .pipe(catchError(this.handleError));
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
  }): Observable<ApiResponse<Sale[]>> {
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

    return this.http.get<ApiResponse<Sale[]>>(`${this.apiUrl}/sales`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get recent sales (today's sales)
   */
  getRecentSales(): Observable<ApiResponse<Sale[]>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.getSales({
      startDate: today,
      endDate: new Date(),
      pageSize: 10
    });
  }

  // ===== RECEIPT OPERATIONS =====

  /**
   * Mark receipt as printed
   */
  markReceiptPrinted(saleId: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/sales/${saleId}/receipt-printed`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Get receipt data for printing
   */
  getReceiptData(saleId: number): Observable<ApiResponse<ReceiptData>> {
    return this.http.get<ApiResponse<ReceiptData>>(`${this.apiUrl}/sales/${saleId}/receipt`)
      .pipe(catchError(this.handleError));
  }

  // ===== SALE MANAGEMENT =====

  /**
   * Cancel a sale
   */
  cancelSale(saleId: number, reason: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/sales/${saleId}/cancel`, { reason })
      .pipe(catchError(this.handleError));
  }

  /**
   * Refund a sale
   */
  refundSale(saleId: number, reason: string): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(`${this.apiUrl}/sales/${saleId}/refund`, { reason })
      .pipe(catchError(this.handleError));
  }

  // ===== ANALYTICS =====

  /**
   * Get sales summary for a date range
   */
  getSalesSummary(startDate: Date, endDate: Date): Observable<ApiResponse<SaleSummary>> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.get<ApiResponse<SaleSummary>>(`${this.apiUrl}/summary`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get daily sales data
   */
  getDailySales(startDate: Date, endDate: Date): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/daily-sales`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get payment method summary
   */
  getPaymentMethodSummary(startDate: Date, endDate: Date): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/payment-methods`, { params })
      .pipe(catchError(this.handleError));
  }

  // ===== VALIDATION =====

  /**
   * Validate stock availability for items
   */
  validateStockAvailability(items: CreateSaleItemRequest[]): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/validate-stock`, { items })
      .pipe(catchError(this.handleError));
  }

  /**
   * Calculate total for items
   */
  calculateTotal(
    items: CreateSaleItemRequest[], 
    discountAmount: number = 0, 
    taxAmount: number = 0
  ): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(`${this.apiUrl}/calculate-total`, {
      items,
      discountAmount,
      taxAmount
    }).pipe(catchError(this.handleError));
  }

  // ===== CART MANAGEMENT (CLIENT-SIDE) =====

  /**
   * Get current cart items
   */
  getCart(): any[] {
    return this.cartSubject.value;
  }

  /**
   * Add item to cart
   */
  addToCart(item: any): void {
    const currentCart = this.cartSubject.value;
    const existingItemIndex = currentCart.findIndex(cartItem => cartItem.productId === item.productId);

    if (existingItemIndex > -1) {
      currentCart[existingItemIndex].quantity += item.quantity;
      currentCart[existingItemIndex].total = this.calculateItemTotal(currentCart[existingItemIndex]);
    } else {
      const cartItem = {
        ...item,
        total: this.calculateItemTotal(item)
      };
      currentCart.push(cartItem);
    }

    this.cartSubject.next([...currentCart]);
  }

  /**
   * Update cart item
   */
  updateCartItem(productId: number, updates: any): void {
    const currentCart = this.cartSubject.value;
    const itemIndex = currentCart.findIndex(item => item.productId === productId);

    if (itemIndex > -1) {
      currentCart[itemIndex] = { ...currentCart[itemIndex], ...updates };
      currentCart[itemIndex].total = this.calculateItemTotal(currentCart[itemIndex]);
      this.cartSubject.next([...currentCart]);
    }
  }

  /**
   * Remove item from cart
   */
  removeFromCart(productId: number): void {
    const currentCart = this.cartSubject.value;
    const filteredCart = currentCart.filter(item => item.productId !== productId);
    this.cartSubject.next(filteredCart);
  }

  /**
   * Clear cart
   */
  clearCart(): void {
    this.cartSubject.next([]);
  }

  /**
   * Calculate cart totals
   */
  getCartTotals(): {
    subtotal: number;
    tax: number;
    total: number;
    itemCount: number;
  } {
    const cart = this.cartSubject.value;
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.11; // 11% PPN
    const total = subtotal + tax;
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return { subtotal, tax, total, itemCount };
  }

  // ===== UTILITY METHODS =====

  /**
   * Calculate item total (price * quantity - discount)
   */
  private calculateItemTotal(item: any): number {
    return (item.sellPrice * item.quantity) - (item.discount || 0);
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Generate sale number (client-side temporary, server will override)
   */
  generateTempSaleNumber(): string {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    return `TMP-${timestamp}`;
  }

  // ===== ERROR HANDLING =====

  private handleError = (error: any): Observable<never> => {
    console.error('POS Service Error:', error);
    
    // Handle offline/network errors
    if (!navigator.onLine) {
      // Queue for offline sync
      this.queueForOfflineSync(error.url, error.body);
    }
    
    throw error;
  };

  /**
   * Queue transaction for offline sync
   */
  private queueForOfflineSync(url: string, data: any): void {
    const offlineQueue = JSON.parse(localStorage.getItem('pos_offline_queue') || '[]');
    offlineQueue.push({
      url,
      data,
      timestamp: new Date().toISOString(),
      type: 'sale'
    });
    localStorage.setItem('pos_offline_queue', JSON.stringify(offlineQueue));
  }

  /**
   * Process offline queue when back online
   */
  processOfflineQueue(): Observable<any> {
    const queue = JSON.parse(localStorage.getItem('pos_offline_queue') || '[]');
    if (queue.length === 0) {
      return new Observable(observer => observer.next([]));
    }

    const requests = queue.map((item: any) => {
      return this.http.post(item.url, item.data);
    });

    return new Observable(observer => {
      Promise.all(requests).then(results => {
        localStorage.removeItem('pos_offline_queue');
        observer.next(results);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Check if there are offline transactions
   */
  hasOfflineTransactions(): boolean {
    const queue = JSON.parse(localStorage.getItem('pos_offline_queue') || '[]');
    return queue.length > 0;
  }

  /**
   * Get offline transaction count
   */
  getOfflineTransactionCount(): number {
    const queue = JSON.parse(localStorage.getItem('pos_offline_queue') || '[]');
    return queue.length;
  }
}