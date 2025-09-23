// ✅ PHASE 5: Enhanced POS Service with Multi-Branch Coordination
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest, of, catchError, map, tap, timeout, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { MultiBranchCoordinationService } from './multi-branch-coordination.service';
import { StateService } from './state.service';

// POS.md Phase 5 Interfaces - Aligned with guide specification
export interface Product {
  id: number;
  name: string;
  barcode: string;
  price?: number;
  sellPrice: number; // Added for compatibility
  buyPrice: number; // Added for compatibility
  stock: number;
  minStock: number; // Added for compatibility
  category?: string;
  categoryId?: number; // Added for compatibility
  categoryName?: string; // Added for compatibility
  description?: string;
  image?: string;
  isActive?: boolean; // Added for compatibility
  unit?: string; // Added for compatibility
  createdAt?: string; // Added for compatibility
  updatedAt?: string; // Added for compatibility
  
  // Enhanced dengan coordination data
  coordinationData?: {
    crossBranchStock: number;
    transferRecommendations: TransferSuggestion[];
    demandForecast?: {
      predicted7Days: number;
      confidence: number;
    };
    pricingOptimization?: {
      suggestedPrice: number;
      reason: string;
      potentialRevenue: number;
    };
  };
}

export interface BranchStockInfo {
  branchId: number;
  branchName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  lastUpdated: string;
  transferTime?: string;
}

export interface TransferSuggestion {
  fromBranchId: number;
  fromBranchName: string;
  availableQuantity: number;
  transferTime: string;
  priority: 'Low' | 'Medium' | 'High';
  cost: number;
}

// Using the other ProductRecommendation interface defined earlier

export interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number;
  discount: number; // Added for compatibility
  subtotal: number; // Added for compatibility
  coordinationAlerts?: string[];
}

export interface Transaction {
  id?: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
  memberInfo?: MemberInfo;
  branchId: number;
  timestamp: Date;
  
  coordinationContext?: {
    branchPerformanceImpact: number;
    optimizationSuggestions: string[];
    transferOpportunities: TransferSuggestion[];
  };
}

export interface MemberInfo {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  creditLimit: number;
  currentCredit: number;
  availableCredit: number;
  
  crossBranchData?: {
    totalCreditAcrossBranches: number;
    recentTransactions: Array<{
      branchId: number;
      branchName: string;
      amount: number;
      date: string;
    }>;
    riskAssessment: {
      level: 'Low' | 'Medium' | 'High';
      factors: string[];
    };
  };
}

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

// ✅ PHASE 5: Multi-Branch Integration Interfaces
export interface CrossBranchStockResponse {
  success: boolean;
  data: {
    branchId: number;
    branchName: string;
    productId: number;
    productName: string;
    availableStock: number;
    reservedStock: number;
    minStock: number;
    status: 'available' | 'low_stock' | 'out_of_stock';
    distance?: number; // Distance from current branch in KM
    transferTime?: string; // Estimated transfer time
  }[];
  message?: string;
}

export interface ProductRecommendation {
  productId: number;
  productName: string;
  reason: string;
  reasoning: string; // For template compatibility
  confidence: number;
  expectedDemand: number;
  potentialValue?: number; // For template compatibility  
  urgency: 'low' | 'medium' | 'high' | 'critical'; // For template compatibility
}

export interface CartRecommendationsResponse {
  success: boolean;
  data: ProductRecommendation[];
  message?: string;
}

export interface TransferRequestData {
  sourceBranchId?: number;
  targetBranchId: number;
  productId: number;
  quantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  expectedDelivery?: string;
  requestedBy: number;
}

export interface TransferRequestResponse {
  success: boolean;
  data: {
    transferId: number;
    transferNumber: string;
    status: 'pending' | 'approved' | 'rejected';
    estimatedDelivery?: string;
  };
  message?: string;
}

export interface CoordinationInsight {
  type: 'stock_alert' | 'recommendation' | 'transfer_opportunity' | 'pricing_suggestion' | 'inventory';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  actionText?: string;
  actionData?: any;
}

export interface CalculateTotalRequest {
  items: CreateSaleItemRequest[];
  globalDiscountPercent?: number;
}

// Legacy interfaces for backward compatibility
export interface ProductDto {
  id: number;
  name: string;
  barcode: string;
  price: number;
  sellPrice: number;
  buyPrice: number;
  stock: number;
  minStock: number;
  category?: string;
  categoryId?: number;
  categoryName?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  unit?: string;
}

export interface CreateSaleRequest {
  items: CreateSaleItemRequest[];
  paymentMethod: string;
  memberInfo?: MemberInfo;
  notes?: string;
  globalDiscountPercent?: number;
  subTotal?: number; // Added for compatibility
  amountPaid?: number; // Added for compatibility
  paidAmount?: number; // Added for compatibility
  changeAmount?: number; // Added for compatibility
  creditAmount?: number; // Added for compatibility
  cashAmount?: number; // Added for compatibility
  discountAmount?: number; // Added for compatibility
  taxAmount?: number; // Added for compatibility
  total?: number; // Added for compatibility
  paymentReference?: string; // Added for compatibility
  memberId?: number; // Added for compatibility
  customerName?: string; // Added for compatibility
  redeemedPoints?: number; // Added for compatibility
}

export interface CreateSaleItemRequest {
  productId: number;
  quantity: number;
  discount: number;
  sellPrice: number;
  discountAmount: number;
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

export interface SaleDto {
  id: number;
  saleNumber: string;
  total: number;
  subtotal?: number;
  paymentMethod: string;
  paymentReference?: string;
  memberInfo?: MemberInfo;
  memberId?: number;
  memberName?: string;
  memberNumber?: string;
  redeemedPoints?: number;
  discountAmount?: number;
  amountPaid?: number;
  changeAmount?: number;
  saleDate?: string;
  cashierName?: string;
  customerName?: string;
  items: any[];
}

export interface SaleDtoApiResponse {
  success: boolean;
  data: SaleDto;
  message?: string;
}

export interface ProductDtoApiResponse {
  success: boolean;
  data: ProductDto;
  message?: string;
}

export interface ValidateStockRequest {
  items: CreateSaleItemRequest[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  errors?: string[] | null;
  error?: string | null;
}

export interface Sale {
  id: number;
  saleNumber: string;
  total: number;
  items: any[];
}

export interface ReceiptDataDto {
  id: number;
  saleNumber: string;
  total: number;
  items: any[];
}

export interface POSTransactionDetail {
  id: number;
  saleNumber: string;
  saleDate: string;
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
  receiptPrintedAt?: string;
  items: any[]; // TransactionItem[] but using any for compatibility
  createdAt: string;
  totalItems: number;
  totalProfit: number;
  discountPercentage: number;
  redeemedPoints: number;
  receiptFooterMessage?: string;
  receiptStoreName: string;
  receiptStoreAddress: string;
  receiptStorePhone: string;
  receiptStoreEmail?: string;
  receiptStoreLogoUrl?: string;
  receiptStoreWebsite?: string;
  receiptStoreTitle: string;
}

export interface TransactionDetailResponse {
  success: boolean;
  data: POSTransactionDetail;
  message?: string;
}

// Export compatibility alias untuk existing components
export type { POSTransactionDetail as TransactionDetail };

export interface PaymentData {
  method: 'cash' | 'card' | 'digital' | 'credit';
  amountPaid: number;
  change: number;
  reference?: string;
  amount?: number; // Optional for backward compatibility
}

@Injectable({
  providedIn: 'root'
})
export class POSService {
  private readonly http = inject(HttpClient);
  private readonly coordinationService = inject(MultiBranchCoordinationService);
  private readonly stateService = inject(StateService);
  private readonly baseUrl = `${environment.apiUrl}/pos`;
  
  // Legacy API URL for backward compatibility
  private readonly apiUrl = `${environment.apiUrl}`;
  
  // Cart state management - POS.md specification
  private readonly _cartItems = signal<CartItem[]>([]);
  private readonly _selectedMember = signal<MemberInfo | null>(null);
  private readonly _isProcessing = signal<boolean>(false);
  private readonly _coordinationInsights = signal<any>(null);
  private readonly _cartRecommendations = signal<ProductRecommendation[]>([]);
  private readonly _crossBranchStock = signal<{[productId: number]: any}>({});
  private readonly _isLoadingInsights = signal<boolean>(false);
  
  // Legacy BehaviorSubjects for backward compatibility
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  private currentSaleSubject = new BehaviorSubject<any>(null);

  // Public readonly signals
  readonly cartItems = this._cartItems.asReadonly();
  readonly selectedMember = this._selectedMember.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly coordinationInsights = this._coordinationInsights.asReadonly();
  
  // Backward compatibility - Observable for cart
  public cart$ = new Observable<CartItem[]>(observer => {
    // Convert signal to observable with proper typing
    const subscription = () => {
      observer.next(this._cartItems());
    };
    subscription();
    
    // Also sync with legacy BehaviorSubject
    this.cartSubject.next(this._cartItems());
    
    return () => {}; // cleanup function
  });

  // Computed properties - POS.md specification
  readonly cartTotal = computed(() => 
    this._cartItems().reduce((sum, item) => sum + item.totalPrice, 0)
  );

  readonly cartItemCount = computed(() => 
    this._cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly hasCoordinationAlerts = computed(() =>
    this._cartItems().some(item => item.coordinationAlerts && item.coordinationAlerts.length > 0)
  );

  readonly availableCredit = computed(() => {
    const member = this._selectedMember();
    return member?.availableCredit || 0;
  });

  readonly canUseCreditForTotal = computed(() => {
    const total = this.cartTotal();
    const credit = this.availableCredit();
    return credit >= total;
  });

  readonly branchContext = computed(() => ({
    branchId: this.stateService.selectedBranchId(),
    branchName: this.stateService.selectedBranch()?.branchName || '',
    isMultiBranch: this.stateService.isMultiBranchMode(),
    canRequestTransfers: this.stateService.hasMultiBranchAccess()
  }));

  // Additional computed properties for component compatibility
  readonly cartRecommendations = this._cartRecommendations.asReadonly();
  readonly hasCoordinationInsights = computed(() => this._coordinationInsights() !== null);
  readonly criticalInsights = computed(() => []);
  readonly actionableInsights = computed(() => []);
  readonly coordinationNotes = computed(() => '');
  readonly crossBranchStock = this._crossBranchStock.asReadonly();

  // === ENHANCED PRODUCT METHODS - POS.md Specification ===

  /**
   * Search products dengan coordination insights
   */
  searchProducts(query: string, includeCoordination: boolean = true): Observable<Product[]> {
    const searchParams = { 
      q: query,
      includeCoordination: includeCoordination.toString(),
      branchId: this.stateService.selectedBranchId()?.toString() || ''
    };

    return this.http.get<{ data: Product[] }>(`${this.baseUrl}/products/search`, { params: searchParams })
      .pipe(
        map(response => response.data),
        tap(products => {
          // Enhance products dengan coordination data jika available
          if (includeCoordination) {
            this.enhanceProductsWithCoordination(products);
          }
        }),
        catchError(error => {
          console.error('Product search failed:', error);
          return of([]);
        })
      );
  }

  /**
   * Get product by barcode dengan enhanced data
   */
  getProductByBarcode(barcode: string): Observable<Product | null> {
    return this.http.get<{ data: Product }>(`${this.baseUrl}/products/barcode/${barcode}`)
      .pipe(
        map(response => response.data),
        tap(product => {
          if (product) {
            this.enhanceProductWithCoordination(product);
          }
        }),
        catchError(error => {
          console.error('Product lookup failed:', error);
          return of(null);
        })
      );
  }

  /**
   * Validate stock dengan cross-branch checking
   */
  validateStock(productId: number, quantity: number): Observable<{
    available: boolean;
    currentStock: number;
    crossBranchOptions?: BranchStockInfo[];
    transferSuggestions?: TransferSuggestion[];
  }>;
  
  /**
   * Legacy validateStock overload untuk component compatibility
   */
  validateStock(items: CreateSaleItemRequest[]): Observable<any>;
  
  validateStock(productIdOrItems: number | CreateSaleItemRequest[], quantity?: number): Observable<any> {
    // Handle legacy signature (items array)
    if (Array.isArray(productIdOrItems)) {
      return this.validateStockLegacy(productIdOrItems);
    }
    
    // Handle POS.md signature (productId, quantity) with enhanced error handling
    const productId = productIdOrItems as number;
    const requestedQuantity = quantity || 1;
    
    // Validate inputs
    if (!productId || productId <= 0) {
      console.error('❌ Invalid product ID for stock validation:', productId);
      return of({ 
        available: false, 
        currentStock: 0,
        crossBranchOptions: [],
        transferSuggestions: [],
        error: 'Invalid product ID'
      });
    }
    
    if (requestedQuantity <= 0) {
      console.error('❌ Invalid quantity for stock validation:', requestedQuantity);
      return of({ 
        available: false, 
        currentStock: 0,
        crossBranchOptions: [],
        transferSuggestions: [],
        error: 'Invalid quantity'
      });
    }
    
    const params = { 
      productId: productId.toString(), 
      quantity: requestedQuantity.toString(),
      checkCrossBranch: 'true'
    };

    return this.http.get<any>(`${this.baseUrl}/validate-stock`, { params })
      .pipe(
        timeout(3000), // 3 second timeout for stock validation
        map(response => {
          try {
            // Validate response structure
            if (!response || typeof response.available !== 'boolean') {
              throw new Error('Invalid stock validation response structure');
            }
            
            return {
              available: response.available,
              currentStock: Math.max(0, response.currentStock || 0),
              crossBranchOptions: Array.isArray(response.crossBranchOptions) ? response.crossBranchOptions : [],
              transferSuggestions: Array.isArray(response.transferSuggestions) ? response.transferSuggestions : []
            };
          } catch (processingError: any) {
            console.error('❌ Error processing stock validation response:', processingError);
            return { 
              available: false, 
              currentStock: 0,
              crossBranchOptions: [],
              transferSuggestions: [],
              error: 'Failed to process stock validation response'
            };
          }
        }),
        catchError(error => {
          const errorType = error.name === 'TimeoutError' ? 'timeout' : 'service error';
          console.error(`❌ Stock validation failed (${errorType}) for product ${productId}:`, error.message);
          
          // Try to get stock from local cart data as fallback
          const cartItem = this._cartItems().find(item => item.product.id === productId);
          const fallbackStock = cartItem?.product.stock || 0;
          const fallbackAvailable = fallbackStock >= requestedQuantity;
          
          return of({ 
            available: fallbackAvailable, 
            currentStock: fallbackStock,
            crossBranchOptions: [],
            transferSuggestions: [],
            error: `Stock validation ${errorType} - using cached data`,
            isFallback: true
          });
        })
      );
  }

  // === ENHANCED CART METHODS - POS.md Specification ===

  /**
   * Add item to cart dengan coordination validation
   */
  async addToCart(product: Product, quantity: number, discount?: number): Promise<void> {
    // Validate stock first
    const stockValidation = await this.validateStock(product.id, quantity).toPromise();
    
    const coordinationAlerts: string[] = [];
    
    // Check jika stock tidak cukup tapi ada di branch lain
    if (!stockValidation?.available && stockValidation?.crossBranchOptions && stockValidation.crossBranchOptions.length > 0) {
      coordinationAlerts.push(
        `Stock tidak cukup di branch ini. Tersedia di ${stockValidation.crossBranchOptions.length} branch lain.`
      );
    }

    // Check transfer suggestions
    if (stockValidation?.transferSuggestions && stockValidation.transferSuggestions.length > 0) {
      const urgentTransfers = stockValidation.transferSuggestions.filter(t => t.priority === 'High');
      if (urgentTransfers.length > 0) {
        coordinationAlerts.push(
          `Ada ${urgentTransfers.length} urgent transfer suggestion untuk produk ini.`
        );
      }
    }

    const discountAmount = discount || 0;
    const basePrice = product.sellPrice || product.price || 0;
    const subtotalBeforeDiscount = basePrice * quantity;
    const discountValue = (subtotalBeforeDiscount * discountAmount) / 100;
    const totalPrice = subtotalBeforeDiscount - discountValue;

    const cartItem: CartItem = {
      product,
      quantity,
      totalPrice,
      discount: discountAmount,
      subtotal: totalPrice,
      coordinationAlerts: coordinationAlerts.length > 0 ? coordinationAlerts : undefined
    };

    const currentItems = this._cartItems();
    const existingItemIndex = currentItems.findIndex(item => item.product.id === product.id);

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity,
        totalPrice: (updatedItems[existingItemIndex].quantity + quantity) * (product.sellPrice || product.price || 0),
        coordinationAlerts
      };
      this._cartItems.set(updatedItems);
    } else {
      // Add new item
      this._cartItems.set([...currentItems, cartItem]);
    }

    // Update coordination insights
    this.updateCoordinationInsights();
  }

  /**
   * Remove item from cart
   */
  removeFromCart(productId: number): void {
    const currentItems = this._cartItems();
    const updatedItems = currentItems.filter(item => item.product.id !== productId);
    this._cartItems.set(updatedItems);
    this.updateCoordinationInsights();
  }

  /**
   * Update item quantity
   */
  updateCartItemQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const currentItems = this._cartItems();
    const updatedItems = currentItems.map(item => 
      item.product.id === productId 
        ? { 
            ...item, 
            quantity, 
            totalPrice: (item.product.sellPrice || item.product.price || 0) * quantity 
          }
        : item
    );
    this._cartItems.set(updatedItems);
    this.updateCoordinationInsights();
  }

  /**
   * Clear cart
   */
  clearCart(): void {
    this._cartItems.set([]);
    this._coordinationInsights.set(null);
  }

  // === ENHANCED MEMBER METHODS - POS.md Specification ===

  /**
   * Search member dengan cross-branch credit data
   */
  searchMember(query: string): Observable<MemberInfo[]> {
    const params = { 
      q: query,
      includeCrossBranchData: 'true'
    };

    return this.http.get<{ data: MemberInfo[] }>(`${this.baseUrl}/members/search`, { params })
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Member search failed:', error);
          return of([]);
        })
      );
  }

  /**
   * Validate member credit dengan cross-branch checking
   */
  validateMemberCredit(memberId: number, amount: number): Observable<{
    approved: boolean;
    availableCredit: number;
    crossBranchCredit: number;
    riskAssessment: {
      level: 'Low' | 'Medium' | 'High';
      factors: string[];
    };
  }> {
    const params = { 
      memberId: memberId.toString(), 
      amount: amount.toString(),
      checkCrossBranch: 'true'
    };

    return this.http.get<any>(`${this.baseUrl}/members/validate-credit`, { params })
      .pipe(
        timeout(3000), // 3 second timeout untuk credit check
        catchError(error => {
          console.error('Credit validation failed:', error);
          return of({
            approved: false,
            availableCredit: 0,
            crossBranchCredit: 0,
            riskAssessment: { level: 'High' as const, factors: ['Validation failed'] }
          });
        })
      );
  }

  /**
   * Select member untuk transaction
   */
  selectMember(member: MemberInfo): void {
    this._selectedMember.set(member);
    this.updateCoordinationInsights();
  }

  /**
   * Clear selected member
   */
  clearSelectedMember(): void {
    this._selectedMember.set(null);
    this.updateCoordinationInsights();
  }

  // === ENHANCED TRANSACTION METHODS - POS.md Specification ===

  /**
   * Create transaction dengan coordination context
   */
  createTransaction(paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'): Observable<Transaction> {
    this._isProcessing.set(true);

    const transaction: Partial<Transaction> = {
      items: this._cartItems(),
      subtotal: this.cartTotal(),
      tax: this.cartTotal() * 0.1, // 10% tax
      total: this.cartTotal() * 1.1,
      paymentMethod,
      memberInfo: this._selectedMember() || undefined,
      branchId: this.stateService.selectedBranchId() || 0,
      timestamp: new Date(),
      coordinationContext: this._coordinationInsights()
    };

    return this.http.post<{ data: Transaction }>(`${this.baseUrl}/transactions`, transaction)
      .pipe(
        map(response => response.data),
        tap(result => {
          console.log('Transaction created:', result);
          // Clear cart after successful transaction
          this.clearCart();
          this.clearSelectedMember();
          this._isProcessing.set(false);
        }),
        catchError(error => {
          console.error('Transaction failed:', error);
          this._isProcessing.set(false);
          throw error;
        })
      );
  }

  // === COORDINATION INTEGRATION METHODS - POS.md Specification ===

  /**
   * Enhance single product dengan coordination data
   */
  private enhanceProductWithCoordination(product: Product): void {
    // Get coordination data dengan timeout untuk tidak block POS
    combineLatest([
      this.coordinationService.getDemandForecast(7, product.id).pipe(
        timeout(2000),
        catchError((error) => {
          console.warn(`⚠️ Demand forecast failed for product ${product.id}:`, error.message);
          return of([]);
        })
      )
    ]).subscribe({
      next: ([demandForecastResponse]) => {
        try {
          // Enhance product dengan coordination data
          const demandForecast = Array.isArray(demandForecastResponse) ? 
            demandForecastResponse : 
            (demandForecastResponse as any)?.data || [];
          const forecast = demandForecast.find((f: any) => f.productId === product.id);
          const transfers: any[] = []; // Get from coordination service later

          product.coordinationData = {
            crossBranchStock: this.calculateCrossBranchStock(product.id),
            transferRecommendations: this.mapToTransferSuggestions(transfers),
            demandForecast: forecast ? {
              predicted7Days: forecast.totalPredictedDemand || 0,
              confidence: forecast.forecastAccuracy || 0.5
            } : undefined,
            pricingOptimization: this.calculatePricingOptimization(product, forecast)
          };
        } catch (error: any) {
          console.error(`❌ Error enhancing product ${product.id} with coordination data:`, error);
          // Set minimal coordination data to prevent template errors
          product.coordinationData = {
            crossBranchStock: 0,
            transferRecommendations: []
          };
        }
      },
      error: (error) => {
        console.error(`❌ Critical error in product coordination enhancement for product ${product.id}:`, error);
        // Ensure product has basic coordination data structure
        product.coordinationData = {
          crossBranchStock: 0,
          transferRecommendations: []
        };
      }
    });
  }

  /**
   * Enhance multiple products dengan coordination data
   */
  private enhanceProductsWithCoordination(products: Product[]): void {
    products.forEach(product => this.enhanceProductWithCoordination(product));
  }

  /**
   * Update coordination insights untuk current cart
   */
  updateCoordinationInsights(): void {
    const cartItems = this._cartItems();
    const member = this._selectedMember();
    
    if (cartItems.length === 0) {
      this._coordinationInsights.set(null);
      return;
    }

    const branchId = this.stateService.selectedBranchId();
    const productIds = cartItems.map(item => item.product.id);
    
    if (!branchId) {
      this._coordinationInsights.set(null);
      return;
    }

    // Get real coordination insights from service with enhanced error handling
    this.coordinationService.getMultiBranchAnalysis(branchId, productIds)
      .pipe(
        timeout(5000), // 5 second timeout for coordination analysis
        map(analysis => {
          try {
            return {
              branchPerformanceImpact: this.calculateBranchPerformanceImpact(analysis),
              optimizationSuggestions: this.generateOptimizationSuggestions(analysis),
              transferOpportunities: this.identifyTransferOpportunities(analysis)
            };
          } catch (error: any) {
            console.error('❌ Error processing coordination analysis:', error);
            // Return fallback data on processing error
            return {
              branchPerformanceImpact: this.calculateBranchPerformanceImpact(),
              optimizationSuggestions: [`Analysis processing failed: ${error.message}`],
              transferOpportunities: this.identifyTransferOpportunities()
            };
          }
        }),
        catchError(error => {
          const errorType = error.name === 'TimeoutError' ? 'timeout' : 'service';
          console.warn(`⚠️ Coordination insights ${errorType} failure:`, error.message);
          
          // Return comprehensive fallback data
          return of({
            branchPerformanceImpact: this.calculateBranchPerformanceImpact(),
            optimizationSuggestions: [
              `Coordination service ${errorType === 'timeout' ? 'timed out' : 'unavailable'} - using offline calculations`,
              'Some features may be limited without coordination data'
            ],
            transferOpportunities: this.identifyTransferOpportunities()
          });
        })
      )
      .subscribe({
        next: (insights) => {
          this._coordinationInsights.set(insights);
        },
        error: (error) => {
          console.error('❌ Critical error in coordination insights subscription:', error);
          // Set minimal insights to prevent template errors
          this._coordinationInsights.set({
            branchPerformanceImpact: 0,
            optimizationSuggestions: ['Coordination system temporarily unavailable'],
            transferOpportunities: []
          });
        }
      });
  }

  /**
   * Calculate cross-branch stock untuk product
   */
  private calculateCrossBranchStock(productId: number): number {
    // Get real cross-branch stock from coordination service
    let totalStock = 0;
    
    this.coordinationService.getMultiBranchAnalysis(
      this.stateService.selectedBranchId() || 1,
      [productId]
    ).subscribe({
      next: (analysis) => {
        const productAnalysis = analysis.find(p => p.productId === productId);
        totalStock = productAnalysis?.totalCrossBranchStock || 0;
      },
      error: () => {
        // Fallback to current branch stock if coordination service fails
        totalStock = this._cartItems()
          .find(item => item.product.id === productId)?.product.stock || 0;
      }
    });
    
    return totalStock;
  }

  /**
   * Map transfer recommendations to suggestions
   */
  private mapToTransferSuggestions(transfers: any[]): TransferSuggestion[] {
    return transfers.map(t => ({
      fromBranchId: t.fromBranchId,
      fromBranchName: t.fromBranchName,
      availableQuantity: t.recommendedQuantity,
      transferTime: '2-4 hours', // estimated
      priority: t.priority,
      cost: t.potentialSavings * 0.1 // estimated transfer cost
    }));
  }

  /**
   * Calculate pricing optimization
   */
  private calculatePricingOptimization(product: Product, forecast: any): any {
    if (!forecast) return undefined;

    const demandMultiplier = forecast.totalPredictedDemand > product.stock ? 1.1 : 0.95;
    const suggestedPrice = Math.round((product.sellPrice || product.price || 0) * demandMultiplier);

    return {
      suggestedPrice,
      reason: demandMultiplier > 1 ? 'High demand predicted' : 'Low demand, consider discount',
      potentialRevenue: suggestedPrice * forecast.totalPredictedDemand
    };
  }

  /**
   * Calculate branch performance impact
   */
  private calculateBranchPerformanceImpact(analysis?: any[]): number {
    const total = this.cartTotal();
    
    if (analysis && analysis.length > 0) {
      // Use real coordination analysis data
      const averageImpact = analysis.reduce((sum, item) => {
        const stockRatio = item.totalCrossBranchStock > 0 
          ? item.branchStocks.find((b: any) => b.branchId === this.stateService.selectedBranchId())?.currentStock / item.totalCrossBranchStock
          : 0;
        return sum + (stockRatio * 0.2); // Impact based on stock distribution
      }, 0) / analysis.length;
      
      return total * Math.max(0.05, Math.min(0.25, averageImpact)); // 5-25% impact range
    }
    
    // Fallback calculation
    return total * 0.15; // 15% estimated impact on branch performance
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(analysis?: any[]): string[] {
    const suggestions: string[] = [];
    const cartItems = this._cartItems();

    if (analysis && analysis.length > 0) {
      // Use real coordination analysis for suggestions
      analysis.forEach(item => {
        const cartItem = cartItems.find(c => c.product.id === item.productId);
        if (!cartItem) return;
        
        // Check stock optimization
        const currentBranchStock = item.branchStocks.find((b: any) => 
          b.branchId === this.stateService.selectedBranchId()
        );
        
        if (currentBranchStock && currentBranchStock.currentStock < cartItem.quantity) {
          const availableBranches = item.branchStocks.filter((b: any) => 
            b.branchId !== this.stateService.selectedBranchId() && 
            b.currentStock >= cartItem.quantity
          );
          
          if (availableBranches.length > 0) {
            suggestions.push(
              `${item.productName}: Consider transfer from ${availableBranches[0].branchName} (${availableBranches[0].currentStock} available)`
            );
          }
        }
        
        // Check for optimization opportunities
        if (item.transferOpportunities && item.transferOpportunities.length > 0) {
          const bestOpportunity = item.transferOpportunities[0];
          suggestions.push(
            `${item.productName}: Transfer opportunity from ${bestOpportunity.fromBranchName} (${bestOpportunity.potentialSavings} savings)`
          );
        }
      });
    } else {
      // Fallback: Analyze cart untuk suggestions
      cartItems.forEach(item => {
        if (item.product.coordinationData?.pricingOptimization) {
          const pricing = item.product.coordinationData.pricingOptimization;
          if (pricing.suggestedPrice !== item.product.price) {
            suggestions.push(
              `Consider adjusting ${item.product.name} price to ${pricing.suggestedPrice} (${pricing.reason})`
            );
          }
        }

        if (item.coordinationAlerts && item.coordinationAlerts.length > 0) {
          suggestions.push(...item.coordinationAlerts);
        }
      });
    }

    return suggestions;
  }

  /**
   * Identify transfer opportunities
   */
  private identifyTransferOpportunities(analysis?: any[]): TransferSuggestion[] {
    const opportunities: TransferSuggestion[] = [];
    const cartItems = this._cartItems();

    if (analysis && analysis.length > 0) {
      // Use real coordination analysis for transfer opportunities
      analysis.forEach(item => {
        if (item.transferOpportunities && item.transferOpportunities.length > 0) {
          item.transferOpportunities.forEach((opportunity: any) => {
            opportunities.push({
              fromBranchId: opportunity.fromBranchId,
              fromBranchName: opportunity.fromBranchName,
              availableQuantity: opportunity.recommendedQuantity,
              transferTime: opportunity.estimatedTime || '2-4 hours',
              priority: opportunity.priority as 'Low' | 'Medium' | 'High',
              cost: opportunity.transferCost || (opportunity.potentialSavings * 0.1)
            });
          });
        }
      });
    } else {
      // Fallback: Use product coordination data
      cartItems.forEach(item => {
        if (item.product.coordinationData?.transferRecommendations) {
          opportunities.push(...item.product.coordinationData.transferRecommendations);
        }
      });
    }

    return opportunities;
  }

  // ===== EXISTING PRODUCT METHODS (Compatibility) - Keep these for backward compatibility =====

  /**
   * Legacy method - Get products using old API structure
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

    // ✅ NEW: Add current branch ID to get branch-specific stock
    const activeBranch = this.stateService.activeBranch();
    if (activeBranch?.branchId) {
      params = params.set('branchIds', activeBranch.branchId.toString());
      console.log('🏢 Loading products for specific branch:', activeBranch.branchId, activeBranch.branchName);
    }

    console.log('🏢 Loading products with branch filtering:', filters);

    // ✅ Use the updated POS endpoint with branch support
    return this.http.get<ProductListResponseApiResponse>(`${this.apiUrl}/POS/products`, {
      params,
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Branch-specific products loaded:', response?.data?.products?.length || 0);
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

  // Legacy barcode method for compatibility
  getProductBarcodeCompat(barcode: string): Observable<any> {
    return this.getProductByBarcode(barcode);
  }

  // Removed duplicate method - using POS.md aligned version

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

  validateStockLegacy(items: CreateSaleItemRequest[]): Observable<BooleanApiResponse> {
    console.log('🔍 Validating stock for items using new GET endpoint:', items.length, 'items');
    
    if (!items || items.length === 0) {
      return of({
        success: true,
        data: true,
        message: 'No items to validate',
        timestamp: new Date().toISOString(),
        errors: null,
        error: null
      } as BooleanApiResponse);
    }

    // Use the new GET endpoint to validate each item individually
    const validationRequests = items.map(item => {
      const params = { 
        productId: item.productId.toString(), 
        quantity: item.quantity.toString(),
        checkCrossBranch: 'true'
      };

      return this.http.get<any>(`${this.baseUrl}/validate-stock`, { params }).pipe(
        map(response => ({
          productId: item.productId,
          available: response.success && response.data?.available,
          currentStock: response.data?.currentStock || 0,
          requestedQuantity: item.quantity
        })),
        catchError(error => {
          console.warn(`Stock validation failed for product ${item.productId}:`, error);
          return of({
            productId: item.productId,
            available: false,
            currentStock: 0,
            requestedQuantity: item.quantity
          });
        })
      );
    });

    // Combine all validation results
    return combineLatest(validationRequests).pipe(
      map(results => {
        const allAvailable = results.every(result => result.available);
        const unavailableItems = results.filter(result => !result.available);
        
        console.log('🔍 Stock validation results:', { allAvailable, unavailableItems: unavailableItems.length });
        
        return {
          success: allAvailable,
          data: allAvailable,
          message: allAvailable 
            ? 'All items have sufficient stock' 
            : `${unavailableItems.length} items have insufficient stock`,
          timestamp: new Date().toISOString(),
          errors: allAvailable ? null : unavailableItems,
          error: null
        } as BooleanApiResponse;
      }),
      catchError(error => {
        console.error('❌ Bulk stock validation failed:', error);
        return of({
          success: false,
          data: false,
          message: 'Stock validation failed',
          timestamp: new Date().toISOString(),
          errors: null,
          error: error.message
        } as BooleanApiResponse);
      })
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

  addToCartLegacy(product: Product, quantity: number = 1, discount: number = 0): void {
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
        totalPrice: product.sellPrice * quantity,
        subtotal: this.calculateItemSubtotal({ product, quantity, discount, totalPrice: product.sellPrice * quantity } as CartItem)
      };
      this.cartSubject.next([...currentCart, newItem]);
    }
  }

  updateCartItemQuantityLegacy(productId: number, quantity: number): void {
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

  removeFromCartLegacy(productId: number): void {
    const currentCart = this.cartSubject.value;
    const updatedCart = currentCart.filter(item => item.product.id !== productId);
    this.cartSubject.next(updatedCart);
  }

  clearCartLegacy(): void {
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
  getTransactionDetail(id: number): Observable<POSTransactionDetail> {
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

  // ===== PHASE 5: MULTI-BRANCH COORDINATION METHODS =====

  /**
   * Get cross-branch stock availability for a product
   */
  getCrossBranchStockAvailability(productId: number): Observable<CrossBranchStockResponse> {
    const currentBranchId = this.stateService.selectedBranchId();
    
    console.log('🔍 Getting cross-branch stock for product:', productId);

    // ✅ FIXED: Use working endpoint for branch stock
    return this.getProductBranchStock(productId).pipe(
      map(response => {
        if (response.success && response.data) {
          // Convert branch stock data to CrossBranchStockResponse format
          const crossBranchData: CrossBranchStockResponse['data'] = Object.entries(response.data).map(([branchId, stock]) => ({
            branchId: parseInt(branchId),
            branchName: `Branch ${branchId}`,
            productId: productId,
            productName: 'Product ' + productId,
            availableStock: stock,
            reservedStock: 0,
            minStock: 10,
            status: stock > 10 ? 'available' : stock > 0 ? 'low_stock' : 'out_of_stock',
            distance: 2.5,
            transferTime: '2-4 hours'
          } as CrossBranchStockResponse['data'][0]));
          
          // Update cross-branch stock cache
          const currentStock = this._crossBranchStock();
          this._crossBranchStock.set({
            ...currentStock,
            [productId]: crossBranchData
          });
          
          return {
            success: true,
            data: crossBranchData,
            message: 'Cross-branch stock loaded from real API'
          } as CrossBranchStockResponse;
        }
        
        throw new Error('No stock data available');
      }),
      catchError(error => {
        console.warn('⚠️ Cross-branch stock API not available, using coordination service fallback');
        
        // Use coordination service as fallback
        return this.coordinationService.getMultiBranchAnalysis(
          this.stateService.selectedBranchId() || 1,
          [productId]
        ).pipe(
          map(analysis => {
            const productAnalysis = analysis.find(p => p.productId === productId);
            if (!productAnalysis) {
              throw new Error('Product analysis not found');
            }
            
            // Convert coordination service data to CrossBranchStockResponse format
            const crossBranchData: CrossBranchStockResponse['data'] = productAnalysis.branchStocks.map((branch: any) => ({
              branchId: branch.branchId,
              branchName: branch.branchName,
              productId: productId,
              productName: productAnalysis.productName,
              availableStock: branch.currentStock,
              reservedStock: 0, // Not provided by coordination service
              minStock: branch.minimumStock || 10,
              status: branch.currentStock > (branch.minimumStock || 10) 
                ? 'available' 
                : branch.currentStock > 0 
                  ? 'low_stock' 
                  : 'out_of_stock',
              distance: 2.5, // Default distance
              transferTime: '2-4 hours' // Default transfer time
            }));
            
            // Update cross-branch stock cache
            const currentStock = this._crossBranchStock();
            this._crossBranchStock.set({
              ...currentStock,
              [productId]: crossBranchData
            });
            
            return {
              success: true,
              data: crossBranchData,
              message: 'Cross-branch stock from coordination service'
            } as CrossBranchStockResponse;
          }),
          catchError(coordError => {
            console.error('⚠️ Coordination service also failed:', coordError);
            // Return empty data instead of mock data
            return of({
              success: false,
              data: [],
              message: 'Cross-branch stock unavailable: ' + coordError.message
            });
          })
        );
      })
    );
  }

  /**
   * Get AI-powered cart recommendations
   */
  getCartRecommendations(): Observable<CartRecommendationsResponse> {
    const cart = this.cartSubject.value;
    const branchContext = this.branchContext();
    
    if (!branchContext.isMultiBranch || cart.length === 0) {
      return of({ success: true, data: [], message: 'No recommendations available' });
    }

    const productIds = cart.map(item => item.product.id);
    const params = new HttpParams()
      .set('branchId', branchContext.branchId!.toString())
      .set('productIds', productIds.join(','));

    console.log('🤖 Getting AI cart recommendations for:', productIds);

    return this.http.get<CartRecommendationsResponse>(`${this.apiUrl}/pos/cart-recommendations`, {
      params,
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success) {
          console.log('✅ Cart recommendations loaded:', response.data.length);
          this._cartRecommendations.set(response.data);
        }
      }),
      catchError(error => {
        console.warn('⚠️ Cart recommendations API not available, using coordination service fallback');
        
        // Use coordination service as fallback with enhanced error handling
        return this.coordinationService.getRecommendations(
          branchContext.branchId!,
          productIds
        ).pipe(
          timeout(3000), // 3 second timeout for recommendations
          map(recommendations => {
            try {
              const convertedRecommendations: ProductRecommendation[] = (recommendations || []).map(rec => {
                // Validate required fields
                if (!rec.productId || !rec.productName) {
                  console.warn('⚠️ Invalid recommendation data:', rec);
                  return null;
                }
                
                return {
                  productId: rec.productId,
                  productName: rec.productName,
                  reason: rec.reasoning || 'Recommended based on branch data',
                  reasoning: rec.reasoning || 'Recommended based on branch data',
                  confidence: Math.max(0, Math.min(1, rec.confidence || 0.5)),
                  expectedDemand: Math.max(0, rec.potentialValue || 0),
                  potentialValue: Math.max(0, rec.potentialValue || 0),
                  urgency: ['low', 'medium', 'high', 'critical'].includes(rec.urgency) ? rec.urgency : 'medium'
                };
              }).filter(rec => rec !== null) as ProductRecommendation[];
              
              this._cartRecommendations.set(convertedRecommendations);
              return {
                success: true,
                data: convertedRecommendations,
                message: `${convertedRecommendations.length} recommendations from coordination service`
              };
            } catch (processingError: any) {
              console.error('❌ Error processing recommendations:', processingError);
              this._cartRecommendations.set([]);
              return {
                success: false,
                data: [],
                message: 'Failed to process recommendations: ' + processingError.message
              };
            }
          }),
          catchError(coordError => {
            const errorType = coordError.name === 'TimeoutError' ? 'timeout' : 'service error';
            console.warn(`⚠️ Coordination service recommendations failed (${errorType}):`, coordError.message);
            this._cartRecommendations.set([]);
            return of({
              success: false,
              data: [],
              message: `Recommendations unavailable due to ${errorType}`
            });
          })
        );
      })
    );
  }

  /**
   * Request inter-branch transfer for low stock product
   */
  requestInterBranchTransfer(transferData: TransferRequestData): Observable<TransferRequestResponse> {
    const currentUser = this.stateService.user();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    const requestPayload = {
      ...transferData,
      requestedBy: currentUser.id,
      sourceBranchId: transferData.sourceBranchId || undefined // Auto-detect best source branch
    };

    console.log('🔄 Requesting inter-branch transfer:', requestPayload);

    return this.http.post<TransferRequestResponse>(`${this.apiUrl}/pos/request-transfer`, requestPayload, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success) {
          console.log('✅ Transfer request submitted:', response.data.transferNumber);
          
          // Update coordination insights
          this.updateCoordinationInsights();
        }
      }),
      catchError(error => {
        console.warn('⚠️ Transfer request API not available, using coordination service');
        
        // Use coordination service for transfer requests with enhanced error handling
        return this.coordinationService.requestTransfer(
          requestPayload.targetBranchId,
          requestPayload.sourceBranchId || this.stateService.selectedBranchId() || 1,
          requestPayload.productId,
          requestPayload.quantity,
          requestPayload.urgency
        ).pipe(
          timeout(10000), // 10 second timeout for transfer requests
          map(transferResult => {
            try {
              // Validate transfer result
              if (!transferResult || !transferResult.transferId) {
                throw new Error('Invalid transfer result received');
              }
              
              const response: TransferRequestResponse = {
                success: true,
                data: {
                  transferId: transferResult.transferId,
                  transferNumber: transferResult.transferReference || `TR-${transferResult.transferId}`,
                  status: (['pending', 'approved', 'rejected'].includes(transferResult.status) 
                    ? transferResult.status 
                    : 'pending') as 'pending' | 'approved' | 'rejected',
                  estimatedDelivery: transferResult.estimatedDelivery || 
                    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                },
                message: 'Transfer request submitted via coordination service'
              };
              
              console.log('✅ Transfer request successful:', response.data.transferNumber);
              return response;
            } catch (processingError: any) {
              console.error('❌ Error processing transfer result:', processingError);
              throw new Error('Failed to process transfer result: ' + processingError.message);
            }
          }),
          catchError(coordError => {
            const errorType = coordError.name === 'TimeoutError' ? 'timeout' : 'service error';
            console.error(`❌ Transfer request failed (${errorType}):`, coordError.message);
            return throwError(() => new Error(
              `Transfer request failed due to ${errorType}. Please try again or contact support.`
            ));
          })
        );
      })
    );
  }

  /**
   * Update coordination insights based on current cart and branch context (Legacy)
   */
  updateCoordinationInsightsLegacy(): void {
    const cart = this.cartSubject.value;
    const branchContext = this.branchContext();
    
    if (!branchContext.isMultiBranch) {
      this._coordinationInsights.set([]);
      return;
    }

    this._isLoadingInsights.set(true);

    const insights: CoordinationInsight[] = [];

    // Check for low stock items in cart with detailed product information
    cart.forEach(item => {
      const currentStock = item.product.stock;
      const minStock = item.product.minStock || 0;
      const stockRatio = currentStock / Math.max(minStock, 1);
      
      if (currentStock <= minStock) {
        insights.push({
          type: 'stock_alert',
          title: `${item.product.name} - Stock Alert`,
          message: `Current stock: ${currentStock} units (Min: ${minStock}). Consider checking other branches or reordering.`,
          priority: currentStock === 0 ? 'critical' : (currentStock <= minStock * 0.5 ? 'high' : 'medium'),
          actionable: true,
          actionText: 'Check Other Branches',
          actionData: { productId: item.product.id, action: 'cross_branch_check', productName: item.product.name }
        });
      }
      
      // Add potential overstocking insight
      if (currentStock > minStock * 5 && minStock > 0) {
        insights.push({
          type: 'inventory',
          title: `${item.product.name} - High Stock`,
          message: `Stock level (${currentStock}) is significantly above minimum. Consider redistribution to other branches.`,
          priority: 'low',
          actionable: true,
          actionText: 'Suggest Transfer',
          actionData: { productId: item.product.id, action: 'suggest_transfer', productName: item.product.name }
        });
      }
    });

    // Add transfer opportunities with detailed analysis
    if (cart.length > 0) {
      const lowStockCount = cart.filter(item => item.product.stock <= item.product.minStock).length;
      const totalValue = cart.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
      
      if (lowStockCount > 0) {
        insights.push({
          type: 'transfer_opportunity',
          title: 'Multi-Branch Coordination Needed',
          message: `${lowStockCount} of ${cart.length} products have stock issues. Total cart value: ${this.formatCurrency(totalValue)}. Inter-branch coordination recommended.`,
          priority: lowStockCount >= cart.length * 0.5 ? 'high' : 'medium',
          actionable: true,
          actionText: 'View Coordination Options',
          actionData: { action: 'show_recommendations', cartValue: totalValue, lowStockCount }
        });
      } else {
        insights.push({
          type: 'transfer_opportunity',
          title: 'Optimization Opportunities',
          message: `Cart contains ${cart.length} products worth ${this.formatCurrency(totalValue)}. Check for optimization opportunities.`,
          priority: 'low',
          actionable: true,
          actionText: 'View Optimization',
          actionData: { action: 'show_optimization', cartValue: totalValue }
        });
      }
    }

    this._coordinationInsights.set(insights);
    this._isLoadingInsights.set(false);

    console.log('🔗 Coordination insights updated:', insights.length, 'insights');
  }

  /**
   * Enhanced addToCart with coordination insights
   */
  async addToCartWithCoordination(product: Product, quantity: number = 1): Promise<void> {
    await this.addToCart(product, quantity);
    
    // Update coordination insights after adding item
    this.updateCoordinationInsights();
    
    // Get cart recommendations if multi-branch mode
    const branchContext = this.branchContext();
    if (branchContext.isMultiBranch) {
      this.getCartRecommendations().subscribe();
    }
  }

  /**
   * Enhanced createSale with coordination notes
   */
  createSaleWithCoordination(data: CreateSaleRequest): Observable<SaleDtoApiResponse> {
    const insights = this._coordinationInsights();
    const branchContext = this.branchContext();
    
    // Add coordination notes if applicable
    if (branchContext.isMultiBranch && insights.length > 0) {
      const coordinationNotes = insights
        .filter((insight: any) => insight.type === 'stock_alert' || insight.type === 'recommendation')
        .map((insight: any) => `${insight.title}: ${insight.message}`)
        .join('; ');
      
      if (coordinationNotes) {
        data = {
          ...data,
          notes: data.notes 
            ? `${data.notes}\n[Coordination]: ${coordinationNotes}`
            : `[Coordination]: ${coordinationNotes}`
        };
      }
    }

    return this.createSale(data).pipe(
      tap(response => {
        if (response.success) {
          // Clear coordination insights after successful sale
          this._coordinationInsights.set([]);
          this._cartRecommendations.set([]);
        }
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
      
      // ✅ DEVELOPMENT: Show auth guidance in console
      console.warn('🔐 Authentication Required - Please check:');
      console.warn('1. Navigate to /auth/login and login again');
      console.warn('2. Check if backend authentication cookies are valid');
      console.warn('3. Verify backend API is running on port 5171');
      
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