// src/app/modules/pos/pos/pos.component.ts - SIGNALS + ONPUSH MIGRATION
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, take } from 'rxjs/operators';
import { of } from 'rxjs';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Components
import { TransactionSuccessModalComponent, TransactionSuccessData } from '../transaction-success-modal/transaction-success-modal.component';

// Services
import { POSService, Product, CartItem, CreateSaleRequest, CreateSaleItemRequest, PaymentData, ProductListResponseApiResponse } from '../../../core/services/pos.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import { CreateProductRequest } from '../../inventory/interfaces/inventory.interfaces';
import { AuthService } from '../../../core/services/auth.service';
import { MembershipService } from '../../membership/services/membership.service';
import { MemberDto } from '../../membership/interfaces/membership.interfaces';
import { CategoryService } from '../../category-management/services/category.service';
import { Category } from '../../category-management/models/category.models';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../../shared/services/toast.service';

// Import standalone components
import { BarcodeToolsComponent } from './barcode-tools/barcode-tools.component';
import { PaymentModalComponent } from './payment-modal/payment-modal.component';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    BarcodeToolsComponent,
    PaymentModalComponent
  ]
})
export class POSComponent implements OnInit, OnDestroy {
  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>;
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  // Injected services using inject()
  private posService = inject(POSService);
  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);
  private membershipService = inject(MembershipService);
  private categoryService = inject(CategoryService);
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  // SIGNALS: Template-driven form state
  searchQuery = signal('');
  globalDiscount = signal(0);
  customerName = signal('');
  customerPhone = signal('');
  notes = signal('');
  
  // SIGNALS: Data state
  products = signal<Product[]>([]);
  cart = signal<CartItem[]>([]);
  
  // SIGNALS: UI state
  isLoading = signal(false);
  isSearching = signal(false);
  showPaymentModal = signal(false);
  showBarcodeScanner = signal(false);
  showProductRegistrationModal = signal(false);
  scannedBarcodeForRegistration = signal('');
  errorMessage = signal('');
  successMessage = signal('');

  // SIGNALS: New product registration
  newProduct = signal({
    name: '',
    barcode: '',
    description: '',
    sellPrice: 0,
    buyPrice: 0,
    stock: 0,
    minimumStock: 5,
    categoryId: null as number | null,
    unit: 'pcs'
  });
  
  // SIGNALS: Categories and user
  categories = signal<any[]>([]);
  currentUser = signal<any>(null);
  
  // SIGNALS: Membership integration
  selectedMember = signal<MemberDto | null>(null);
  memberSearchQuery = signal('');
  searchedMembers = signal<MemberDto[]>([]);
  isSearchingMembers = signal(false);

  // COMPUTED: Filtered products based on search
  filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const allProducts = this.products();
    
    if (!query) return allProducts;
    
    return allProducts.filter(product =>
      product.name?.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    );
  });

  // COMPUTED: Cart totals
  cartSubtotal = computed(() => {
    return this.cart().reduce((total, item) => {
      const itemTotal = item.quantity * item.product.sellPrice;
      const discount = item.discount || 0;
      return total + (itemTotal - discount);
    }, 0);
  });

  cartDiscountAmount = computed(() => {
    const subtotal = this.cartSubtotal();
    const discountPercent = this.globalDiscount();
    return (subtotal * discountPercent) / 100;
  });

  cartTotal = computed(() => {
    return this.cartSubtotal() - this.cartDiscountAmount();
  });

  // COMPUTED: Cart state
  isCartEmpty = computed(() => this.cart().length === 0);
  cartItemCount = computed(() => this.cart().length);

  // COMPUTED: Form validation
  canCheckout = computed(() => {
    return !this.isCartEmpty() && this.cartTotal() > 0;
  });

  constructor() {
    // Setup search subject subscription in constructor
    this.setupSearchSubscription();
  }

  // Track by functions for performance
  trackByProductId = (index: number, product: any): any => product.id;
  trackByCartItemId = (index: number, item: CartItem): any => item.product.id;

  // Helper method for updating new product form
  updateNewProduct(field: string, value: any): void {
    this.newProduct.update(product => ({
      ...product,
      [field]: value
    }));
  }

  ngOnInit(): void {
    this.initializeComponent();
    this.setupCartSubscription();
    this.setupSearchListener();
    this.loadCategories();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Setup search subscription
  private setupSearchSubscription(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.searchQuery.set(query);
      });
  }

  // ===== INITIALIZATION =====

  // Load products with signals
  loadProducts(): void {
    this.isLoading.set(true);
    
    this.posService.getProducts(1, 20).subscribe({
      next: (response) => {
        console.log('🔍 Full Response:', response);
        console.log('🔍 Response Success:', response.success);
        console.log('🔍 Response Data:', response.data);
        
        if (response.success && response.data) {
          // ✅ FIX: Use signals properly
          this.products.set(response.data.products || []);
          console.log('✅ Products loaded:', this.products().length);
          console.log('✅ First product:', this.products()[0]);
        } else {
          console.warn('⚠️ Response not successful:', response.message);
          this.products.set([]);
        }
        
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Load Products Error:', error);
        this.products.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private initializeComponent(): void {
    // Get current user info using signals
    this.currentUser.set(this.authService.getCurrentUser());
    
    // Subscribe to user changes
    this.authService.getCurrentUser$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: any) => {
        this.currentUser.set(user);
        console.log('👤 Current user updated:', this.currentUser);
      });
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('❌ User not authenticated, redirecting to login');
      this.router.navigate(['/auth/login']);
      return;
    }
    
    // Focus search input
    setTimeout(() => {
      if (this.productSearchInput) {
        this.productSearchInput.nativeElement.focus();
      }
    }, 100);

    // Load initial products if needed
    this.performSearch('');
  }

  private setupCartSubscription(): void {
    this.posService.cart$
      .pipe(
        takeUntil(this.destroy$),
        // ✅ Add distinctUntilChanged to prevent unnecessary updates
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe((cart: CartItem[]) => {
        console.log('🛒 Cart subscription triggered:', cart.length, 'items');
        this.cart.set([...cart]); // Always create new array reference
        
        // Force change detection
        setTimeout(() => {
          console.log('🛒 Cart state after timeout:', this.cart().length, 'items');
        }, 0);
      });
  }

  private setupSearchListener(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((query: string) => {
        this.performSearch(query);
      });
  }

  // ===== PRODUCT OPERATIONS =====

  onSearchInput(event: any): void {
    const query = event.target.value;
    this.searchQuery.set(query);
    this.searchSubject$.next(query);
  }

  private performSearch(query: string) {
    if (query.length < 2 && query.length > 0) {
      // For short queries, clear the products to show nothing
      this.products.set([]);
      return;
    }

    this.isSearching.set(true);
    this.errorMessage.set('');

    // Use getProducts for empty query, searchProducts for specific search
    const searchObservable = query.length === 0 
      ? this.posService.getProducts()
      : this.posService.searchProducts(query);

    searchObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ProductListResponseApiResponse) => {
          this.isSearching.set(false);
          if (response.success && response.data) {
            // Handle both getProducts and searchProducts response format
            const products = response.data.products || [];
            this.products.set(products.filter((p: Product) => p.isActive && p.stock > 0));
          } else {
            this.products.set([]);
            this.errorMessage.set(response.message || 'Gagal memuat produk');
          }
        },
        error: (error: any) => {
          this.isSearching.set(false);
          this.products.set([]);
          this.errorMessage.set(error.message || 'Gagal memuat produk');
          console.error('Error loading products:', error);
        }
      });
  }

  // ===== CART OPERATIONS =====

  addToCart(product: Product, quantity: number = 1): void {
    console.log('🛒 Adding to cart:', product.name, 'quantity:', quantity);
    
    // Check stock availability
    if (product.stock < quantity) {
      this.errorMessage.set(`Stok tidak mencukupi. Tersedia: ${product.stock}`);
      this.clearMessages();
      return;
    }

    // Check if already in cart
    const currentCart = this.cart();
    const existingItem = currentCart.find(item => item.product.id === product.id);
    const totalQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    if (totalQuantity > product.stock) {
      this.errorMessage.set(`Jumlah melebihi stok. Maksimal: ${product.stock}`);
      this.clearMessages();
      return;
    }

    // ✅ FIX: Add to cart and ensure immediate UI update
    this.posService.addToCart(product, quantity, 0);
    
    // ✅ FIX: Force immediate cart refresh without subscription delay
    this.posService.cart$.pipe(take(1)).subscribe(cart => {
      this.cart.set([...cart]); // Force array reference change
      console.log('✅ Cart immediately updated:', this.cart().length, 'items');
    });
    
    this.successMessage.set(`${product.name} ditambahkan ke keranjang`);
    this.clearMessages();

    // Don't clear search - keep products visible for easy multiple selection
    // Just focus back to search for easier interaction
    if (this.productSearchInput) {
      this.productSearchInput.nativeElement.focus();
    }
  }

  // ===== ENHANCED INPUT HANDLERS =====

  onQuantityInputChange(index: number, event: Event) {
    const target = event.target as HTMLInputElement;
    const newQuantity = parseInt(target.value) || 1;
    this.updateCartItemQuantity(index, newQuantity);
  }

  onDiscountInputChange(index: number, event: Event) {
    const target = event.target as HTMLInputElement;
    const newDiscount = parseFloat(target.value) || 0;
    this.updateCartItemDiscount(index, newDiscount);
  }

  updateCartItemQuantity(index: number, quantity: number): void {
    const currentCart = this.cart();
    const item = currentCart[index];
    if (!item) return;

    // Validate quantity
    const validQuantity = Math.max(1, Math.min(item.product.stock, quantity));
    
    if (validQuantity !== quantity) {
      if (quantity > item.product.stock) {
        this.errorMessage.set(`Stok maksimal ${item.product.stock}`);
        this.clearMessages();
      }
    }

    if (validQuantity <= 0) {
      this.removeFromCart(index);
      return;
    }

    this.posService.updateCartItemQuantity(item.product.id, validQuantity);
  }

  updateCartItemDiscount(index: number, discount: number): void {
    const currentCart = this.cart();
    const item = currentCart[index];
    if (!item) return;

    // Validate discount
    const validDiscount = Math.max(0, Math.min(100, discount));
    
    if (validDiscount !== discount) {
      if (discount > 100) {
        this.errorMessage.set('Diskon maksimal 100%');
        this.clearMessages();
      } else if (discount < 0) {
        this.errorMessage.set('Diskon minimal 0%');
        this.clearMessages();
      }
    }

    this.posService.updateCartItemDiscount(item.product.id, validDiscount);
  }

  removeFromCart(index: number): void {
    const currentCart = this.cart();
    const item = currentCart[index];
    if (item) {
      this.posService.removeFromCart(item.product.id);
    }
  }

  clearCart(): void {
    const currentCart = this.cart();
    if (currentCart.length === 0) return;

    if (confirm('Yakin ingin mengosongkan keranjang?')) {
      this.posService.clearCart();
      this.globalDiscount.set(0);
      this.customerName.set('');
      this.customerPhone.set('');
      this.notes.set('');
      this.clearMember();
      this.successMessage.set('Keranjang dikosongkan');
      this.clearMessages();
    }
  }

  // ===== CALCULATIONS - USING BACKEND =====
  
  cartTotals$: Observable<any> = new Observable(); // Initialize properly in ngOnInit

  getCartTotals() {
    // For backward compatibility, return sync version but prefer async
    return this.posService.getCartTotalsSync(this.globalDiscount());
  }

  onGlobalDiscountChange(): void {
    const currentDiscount = this.globalDiscount();
    this.globalDiscount.set(Math.max(0, Math.min(100, currentDiscount)));
    // Trigger recalculation by emitting cart change
    this.posService.cart$.pipe(take(1)).subscribe();
  }

  // ===== BARCODE OPERATIONS =====

  onBarcodeScanned(barcode: string): void {
    this.showBarcodeScanner.set(false);
    this.searchByBarcode(barcode);
  }

  private searchByBarcode(barcode: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.posService.getProductByBarcode(barcode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isLoading.set(false);
          if (response.success && response.data) {
            const product = response.data;
            if (product.isActive && product.stock > 0) {
              this.addToCart(product);
              this.successMessage.set(`${product.name} ditambahkan ke keranjang`);
              this.clearMessages();
            } else {
              this.errorMessage.set(product.stock <= 0 ? 
                'Produk habis stok' : 'Produk tidak aktif');
              this.clearMessages();
            }
          } else {
            this.errorMessage.set('Produk dengan barcode ini tidak ditemukan');
            this.clearMessages();
          }
        },
        error: (error: any) => {
          this.isLoading.set(false);
          console.error('Error searching by barcode:', error);
          
          // Check if it's specifically a "product not found" error (404 or specific error)
          if (error.status === 404 || 
              (error.error && error.error.message && error.error.message.includes('tidak ditemukan')) ||
              (error.message && error.message.includes('tidak ditemukan'))) {
            // Show product registration modal with scanned barcode
            console.log('📦 Product not found, showing registration modal for barcode:', barcode);
            this.scannedBarcodeForRegistration.set(barcode);
            this.newProduct.update(product => ({ ...product, barcode }));
            this.showProductRegistrationModal.set(true);
            this.successMessage.set(`Barcode ${barcode} tidak ditemukan. Silakan daftarkan produk baru.`);
            this.clearMessages();
          } else {
            // Other errors (network, server, etc.)
            this.errorMessage.set(error.error?.message || error.message || 'Gagal mencari produk');
            this.clearMessages();
          }
        }
      });
  }

  // ===== PAYMENT OPERATIONS =====

  processPayment(): void {
    const currentCart = this.cart();
    if (currentCart.length === 0) {
      this.errorMessage.set('Keranjang kosong');
      this.clearMessages();
      return;
    }

    // Validate stock before payment using new backend method
    const saleItems: CreateSaleItemRequest[] = currentCart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      sellPrice: item.product.sellPrice,
      discount: item.discount
    }));

    this.isLoading.set(true);
    this.posService.validateStock(saleItems)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isLoading.set(false);
          if (response.success && response.data) {
            this.showPaymentModal.set(true);
          } else {
            this.errorMessage.set(response.message || 'Stok tidak mencukupi untuk beberapa item');
            this.clearMessages();
          }
        },
        error: (error: any) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.message || 'Gagal memvalidasi stok');
          this.clearMessages();
        }
      });
  }

  onPaymentComplete(paymentData: PaymentData): void {
    this.showPaymentModal.set(false);
    this.completeSale(paymentData);
  }

  onPaymentCancelled(): void {
    this.showPaymentModal.set(false);
  }

  // ===== PRODUCT REGISTRATION MODAL =====

  onProductRegistrationComplete(product: any): void {
    this.showProductRegistrationModal.set(false);
    this.scannedBarcodeForRegistration.set('');
    this.resetNewProductForm();
    
    if (product) {
      // Product was successfully created, add it to cart
      this.addToCart(product);
      this.successMessage.set(`${product.name} berhasil didaftarkan dan ditambahkan ke keranjang`);
      this.clearMessages();
    }
  }

  onProductRegistrationCancelled(): void {
    console.log('🚫 Product registration cancelled');
    this.showProductRegistrationModal.set(false);
    this.scannedBarcodeForRegistration.set('');
    this.resetNewProductForm();
    this.errorMessage.set('Pendaftaran produk dibatalkan');
    this.clearMessages();
  }

  submitNewProduct(form: any): void {
    if (!form.valid) {
      this.errorMessage.set('Mohon lengkapi semua field yang wajib diisi');
      this.clearMessages();
      return;
    }

    const currentNewProduct = this.newProduct();
    // Additional validation
    if (!currentNewProduct.name?.trim()) {
      this.errorMessage.set('Nama produk harus diisi');
      this.clearMessages();
      return;
    }

    if (!currentNewProduct.sellPrice || currentNewProduct.sellPrice <= 0) {
      this.errorMessage.set('Harga jual harus lebih dari 0');
      this.clearMessages();
      return;
    }

    if (!currentNewProduct.stock || currentNewProduct.stock < 0) {
      this.errorMessage.set('Stok tidak boleh negatif');
      this.clearMessages();
      return;
    }

    const scannedBarcode = this.scannedBarcodeForRegistration();
    if (!scannedBarcode?.trim()) {
      this.errorMessage.set('Barcode tidak valid');
      this.clearMessages();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    // Set the barcode from scanned value
    this.newProduct.update(product => ({
      ...product,
      barcode: scannedBarcode
    }));

    // Create product using inventory service
    this.createNewProduct(this.newProduct());
  }

  private createNewProduct(productData: any): void {
    // Create the product request according to Inventory interface
    const createRequest: CreateProductRequest = {
      name: productData.name,
      barcode: productData.barcode,
      description: productData.description || `Produk baru dari barcode ${productData.barcode}`,
      buyPrice: productData.buyPrice,
      sellPrice: productData.sellPrice,
      stock: productData.stock,
      minimumStock: productData.minimumStock,
      unit: productData.unit || 'pcs',
      categoryId: productData.categoryId || 1,
      isActive: true
    };

    console.log('🆕 Creating product via InventoryService:', createRequest);

    // Call real API through InventoryService
    this.inventoryService.createProduct(createRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdProduct) => {
          console.log('✅ Product created successfully:', createdProduct);
          this.isLoading.set(false);
          
          // Convert from inventory Product to POS Product format
          const posProduct: Product = {
            id: createdProduct.id,
            name: createdProduct.name,
            barcode: createdProduct.barcode,
            sellPrice: createdProduct.sellPrice,
            buyPrice: createdProduct.buyPrice,
            stock: createdProduct.stock,
            minStock: createdProduct.minimumStock,
            unit: createdProduct.unit,
            categoryId: createdProduct.categoryId,
            categoryName: createdProduct.categoryName || 'Umum',
            isActive: createdProduct.isActive,
            description: createdProduct.description,
            createdAt: createdProduct.createdAt,
            updatedAt: createdProduct.updatedAt
          };

          // Refresh the product list in POS
          this.refreshProductLists();
          
          // Add to cart and complete registration
          this.onProductRegistrationComplete(posProduct);
        },
        error: (error) => {
          console.error('❌ Failed to create product:', error);
          this.isLoading.set(false);
          this.errorMessage.set(`Gagal mendaftarkan produk: ${error.message || error}`);
          this.clearMessages();
        }
      });
  }

  private resetNewProductForm(): void {
    this.newProduct.set({
      name: '',
      barcode: '',
      description: '',
      sellPrice: 0,
      buyPrice: 0,
      stock: 0,
      minimumStock: 5,
      categoryId: null,
      unit: 'pcs'
    });
  }

  private refreshProductLists(): void {
    // Refresh POS product list
    this.loadProducts();
    
    // Also trigger refresh in inventory service
    this.inventoryService.getProducts().subscribe({
      next: (response) => {
        console.log('✅ Inventory products refreshed:', response.products?.length || 0);
      },
      error: (error) => {
        console.warn('⚠️ Failed to refresh inventory products:', error);
      }
    });
  }

  private loadCategories() {
    this.categoryService.getCategoriesSimple()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          console.log('✅ Categories loaded for POS:', categories.length);
        },
        error: (error) => {
          console.error('❌ Failed to load categories:', error);
          // Set default category if loading fails
          this.categories.set([{ id: 1, name: 'Umum', color: '#666666' }]);
        }
      });
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  private completeSale(paymentData: PaymentData) {
    // Use backend calculation for totals
    this.posService.getCartTotals(this.globalDiscount())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (totals) => {
          const saleRequest: CreateSaleRequest = {
            items: this.cart().map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
              sellPrice: item.product.sellPrice,
              discount: item.discount
            })),
            subTotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            taxAmount: totals.taxAmount,
            total: totals.total,
            amountPaid: paymentData.amountPaid,
            changeAmount: paymentData.change,
            paymentMethod: paymentData.method,
            paymentReference: paymentData.reference,
            memberId: this.selectedMember()?.id,
            customerName: this.customerName() || undefined,
            customerPhone: this.customerPhone() || undefined,
            notes: this.notes() || undefined,
            redeemedPoints: 0 // TODO: Implement points redemption in payment modal
          };

          this.isLoading.set(true);
          this.posService.createSale(saleRequest)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: any) => {
                this.isLoading.set(false);
                console.log('✅ Sale created successfully:', response);
                
                if (response.success && response.data) {
                  const saleId = response.data.id;
                  const saleNumber = response.data.saleNumber;
                  
                  console.log('🧾 Navigating to receipt:', saleId, saleNumber);
                  this.successMessage.set(`Transaksi berhasil! No: ${saleNumber}`);
                  
                  // Process membership benefits (points and tier upgrade) - with error handling
                  try {
                    this.processMembershipBenefits(saleId, response.data.total);
                  } catch (error) {
                    console.error('❌ Error processing membership benefits:', error);
                    // Don't let membership errors stop the transaction completion
                  }
                  
                  // Reset form
                  this.globalDiscount.set(0);
                  this.customerName.set('');
                  this.customerPhone.set('');
                  this.notes.set('');
                  this.clearMember();
                  
                  // Clear cart
                  this.cart.set([]);
                  
                  // ✅ NEW: Instant notification refresh after successful transaction
                  console.log('🔔 Refreshing notifications after successful transaction...');
                  this.notificationService.refreshInstantly().subscribe({
                    next: () => {
                      console.log('✅ Notifications refreshed successfully');
                    },
                    error: (error) => {
                      console.warn('⚠️ Notification refresh failed (non-critical):', error);
                    }
                  });

                  // ✅ CRITICAL: Show toast notification IMMEDIATELY (before modal)
                  console.log('🍞 Showing success toast BEFORE modal...');
                  this.toastService.showSuccess(
                    '✅ Transaksi Berhasil!',
                    `Penjualan ${saleNumber} telah berhasil diproses - Total: ${this.formatCurrency(response.data.total)}`,
                    'Lihat Detail',
                    `/dashboard/pos/transaction/${saleId}`
                  );

                  // ✅ NEW: Check for low stock and show warnings IMMEDIATELY  
                  console.log('🔍 Checking low stock BEFORE modal...');
                  this.checkLowStockAfterSale();

                  // ✅ DELAY modal to let toasts appear first
                  console.log('🚀 Delaying modal to let toasts show first...');
                  setTimeout(() => {
                    this.showTransactionSuccessModal(saleId, saleNumber, response.data.total);
                  }, 1500); // 1.5 second delay to ensure toasts are visible
                } else {
                  this.errorMessage.set(response.message || 'Gagal menyimpan transaksi');
                  this.clearMessages();
                }
              },
              error: (error: any) => {
                this.isLoading.set(false);
                this.errorMessage.set(error.message || 'Gagal menyimpan transaksi');
                this.clearMessages();
                console.error('Error creating sale:', error);
              }
            });
        },
        error: (error: any) => {
          this.errorMessage = error.message || 'Gagal menghitung total';
          this.clearMessages();
        }
      });
  }

  // ===== UI HELPERS =====

  formatCurrency(amount: number): string {
    return this.posService.formatCurrency(amount);
  }

  getFilteredProducts(): Product[] {
    return this.filteredProducts();
  }

  getCartItemCount(): number {
    return this.cart().reduce((sum, item) => sum + item.quantity, 0);
  }

  getCartTotalValue(): number {
    return this.cartTotal();
  }

  isProductInCart(productId: number): boolean {
    return this.cart().some(item => item.product.id === productId);
  }

  getProductQuantityInCart(productId: number): number {
    const item = this.cart().find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }

  // ===== LOW STOCK DETECTION =====

  /**
   * ✅ IMPROVED: Check for low stock products after sale completion - REAL TIME
   */
  private checkLowStockAfterSale(): void {
    console.log('🔍 Checking for low stock after sale (REAL-TIME)...');
    const currentCart = this.cart();
    console.log('🛒 Current cart:', currentCart);
    
    if (currentCart.length === 0) {
      console.log('🔍 No items in cart to check');
      return;
    }
    
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    // Check each product in the cart for low stock after the sale
    currentCart.forEach((cartItem, index) => {
      const product = cartItem.product;
      console.log(`📦 Product ${index + 1}:`, {
        name: product.name,
        currentStock: product.stock,
        soldQuantity: cartItem.quantity,
        minStock: product.minStock || 5
      });
      
      const newStock = product.stock - cartItem.quantity;
      const minStock = product.minStock || 5; // Fallback to 5 if minStock is not set
      
      console.log(`📊 ${product.name}: ${product.stock} - ${cartItem.quantity} = ${newStock} (min: ${minStock})`);
      
      // Check if product will be out of stock
      if (newStock <= 0) {
        console.log('🚨 OUT OF STOCK:', product.name);
        outOfStockCount++;
        
        this.toastService.showError(
          '🚨 Stok Habis!',
          `${product.name} sudah habis setelah transaksi ini`,
          'Tambah Stok',
          '/dashboard/inventory'
        );
      }
      // Check if product will be low stock after this sale  
      else if (newStock > 0 && newStock <= minStock) {
        console.log('⚠️ LOW STOCK:', product.name, 'New stock:', newStock, 'Min:', minStock);
        lowStockCount++;
        
        // Show low stock toast IMMEDIATELY
        this.toastService.showLowStock(
          product.name,
          newStock,
          minStock
        );
      }
      else {
        console.log('✅ STOCK OK:', product.name, 'New stock:', newStock, 'Min:', minStock);
      }
    });

    // Summary notification if multiple items affected
    if (lowStockCount > 1) {
      setTimeout(() => {
        this.toastService.showWarning(
          '⚠️ Multiple Low Stock',
          `${lowStockCount} produk memiliki stok rendah setelah transaksi ini`,
          'Lihat Inventory',
          '/dashboard/inventory'
        );
      }, 500);
    }

    if (outOfStockCount > 1) {
      setTimeout(() => {
        this.toastService.showError(
          '🚨 Multiple Out of Stock',
          `${outOfStockCount} produk habis stok setelah transaksi ini`,
          'Tambah Stok',
          '/dashboard/inventory'
        );
      }, 750);
    }

    console.log(`🔍 Stock check completed: ${lowStockCount} low stock, ${outOfStockCount} out of stock`);
  }

  private clearMessages(timeout: number = 3000) {
    setTimeout(() => {
      this.errorMessage.set('');
      this.successMessage.set('');
    }, timeout);
  }

  // ===== KEYBOARD SHORTCUTS =====

  @HostListener('window:keydown', ['$event'])
onKeyDown(event: KeyboardEvent) {
  // ✅ FIX: Enhanced input detection
  const isInputActive = (
    event.target instanceof HTMLInputElement || 
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement ||
    (event.target as HTMLElement).isContentEditable
  );

  // ✅ FIX: Skip shortcuts when typing in any input or modal is open
  if (isInputActive || this.showPaymentModal() || this.showBarcodeScanner()) {
    return; // Let the input handle the event normally
  }

  // ✅ FIX: Additional check for specific input contexts
  const activeElement = document.activeElement;
  if (activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.hasAttribute('contenteditable')
  )) {
    return;
  }

  switch (event.key) {
    case 'F1':
      event.preventDefault();
      this.showBarcodeScanner.set(true);
      break;
    
    case 'F2':
      event.preventDefault();
      if (this.productSearchInput) {
        this.productSearchInput.nativeElement.focus();
      }
      break;
    
    case 'F9':
      event.preventDefault();
      this.processPayment();
      break;
    
    case 'F12':
      event.preventDefault();
      this.clearCart();
      break;
    
    case 'Escape':
      if (this.showBarcodeScanner()) {
        this.showBarcodeScanner.set(false);
      } else if (this.showPaymentModal()) {
        this.showPaymentModal.set(false);
      } else if (this.showProductRegistrationModal()) {
        this.showProductRegistrationModal.set(false);
        this.scannedBarcodeForRegistration.set('');
      }
      break;
  }
}
  increaseQuantity(index: number) {
  const item = this.cart()[index];
  if (item && item.quantity < item.product.stock) {
    this.onQuantityChange(index, item.quantity + 1);
  } else {
    this.errorMessage.set(`Stok maksimal ${item.product.stock}`);
    this.clearMessages();
  }
}

decreaseQuantity(index: number) {
  const item = this.cart()[index];
  if (item && item.quantity > 1) {
    this.onQuantityChange(index, item.quantity - 1);
  }
}

onQuantityChange(index: number, newQuantity: number) {
  const item = this.cart()[index];
  if (!item) return;

  // Validate quantity
  const validQuantity = Math.max(1, Math.min(item.product.stock, newQuantity));
  
  // Update item quantity using signal update
  this.cart.update(cartItems => {
    const updatedItems = [...cartItems];
    updatedItems[index] = { ...updatedItems[index], quantity: validQuantity };
    return updatedItems;
  });
  
  // Show validation messages
  if (newQuantity > item.product.stock) {
    this.errorMessage.set(`Stok maksimal ${item.product.stock}`);
    this.clearMessages();
  } else if (newQuantity < 1) {
    this.errorMessage.set('Jumlah minimal 1');
    this.clearMessages();
  }
}

onDiscountChange(index: number, newDiscount: number) {
  const item = this.cart()[index];
  if (!item) return;

  // Validate discount
  const validDiscount = Math.max(0, Math.min(100, newDiscount));
  
  // Update item discount in local cart first
  item.discount = validDiscount;
  
  // Update in service
  // Update discount using signal update
  this.cart.update(cartItems => {
    const updatedItems = [...cartItems];
    updatedItems[index] = { ...updatedItems[index], discount: validDiscount };
    return updatedItems;
  });
  
  // Show warning if discount was adjusted
  if (validDiscount !== newDiscount) {
    if (newDiscount > 100) {
      this.errorMessage.set('Diskon maksimal 100%');
      this.clearMessages();
    } else if (newDiscount < 0) {
      this.errorMessage.set('Diskon minimal 0%');
      this.clearMessages();
    }
  }
}

  // ===== TRANSACTION SUCCESS MODAL =====
  
  private showTransactionSuccessModal(saleId: number, saleNumber: string, total: number) {
    console.log('🎉 Showing transaction success modal for:', { saleId, saleNumber, total });
    console.log('🔍 MatDialog instance:', this.dialog);
    console.log('🔍 TransactionSuccessModalComponent:', TransactionSuccessModalComponent);
    
    try {
      const dialogRef = this.dialog.open(TransactionSuccessModalComponent, {
        width: '480px',
        maxWidth: '90vw',
        disableClose: false, // ✅ Allow close on backdrop click
        panelClass: 'transaction-success-dialog',
        data: {
          saleId,
          saleNumber,
          total
        } as TransactionSuccessData
      });

      console.log('🔍 Dialog ref created:', dialogRef);

      dialogRef.afterClosed().subscribe(result => {
        console.log('🔔 Modal closed with result:', result);
        
        if (result === 'detail') {
          // Navigate to transaction detail
          const targetRoute = `/dashboard/pos/transaction/${saleId}`;
          console.log('🔄 Navigating to:', targetRoute);
          
          this.router.navigateByUrl(targetRoute).then(success => {
            if (success) {
              console.log('✅ Navigation successful');
            } else {
              console.error('❌ Navigation failed - route may not exist');
              this.errorMessage.set(`Gagal membuka detail transaksi. ID: ${saleId}`);
              this.clearMessages();
            }
          }).catch(error => {
            console.error('❌ Navigation error:', error);
            this.errorMessage.set(`Error navigasi: ${error.message}`);
            this.clearMessages();
          });
        } else if (result === 'new') {
          // Stay on POS for new transaction
          console.log('✅ Starting new transaction');
          this.clearMessages();
          this.successMessage.set(`Transaksi ${saleNumber} berhasil disimpan!`);
          this.clearMessages(3000); // Clear after 3 seconds
        }
      });
    } catch (error) {
      console.error('❌ Error opening dialog:', error);
      // Fallback to simple alert if dialog fails
      alert(`Transaksi berhasil! No: ${saleNumber}\nTotal: ${this.formatCurrency(total)}\n\nKlik OK untuk melanjutkan.`);
    }
  }

  // ===== MEMBERSHIP INTEGRATION =====

  searchMembers(query: string): void {
    if (!query || query.length < 2) {
      this.searchedMembers.set([]);
      return;
    }

    this.isSearchingMembers.set(true);
    
    const filters = {
      search: query,
      isActive: true,
      page: 1,
      pageSize: 10
    };

    this.membershipService.searchMembers(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.searchedMembers.set(response.members);
          this.isSearchingMembers.set(false);
        },
        error: (error) => {
          console.error('Error searching members:', error);
          this.searchedMembers.set([]);
          this.isSearchingMembers.set(false);
        }
      });
  }

  selectMember(member: MemberDto): void {
    this.selectedMember.set(member);
    this.memberSearchQuery.set(`${member.name} (${member.memberNumber})`);
    this.searchedMembers.set([]);
  }

  clearMember(): void {
    this.selectedMember.set(null);
    this.memberSearchQuery.set('');
    this.searchedMembers.set([]);
  }

  calculateEarnedPoints(total: number): number {
    if (!this.selectedMember() || total <= 0) return 0;
    
    // Basic calculation: 1 point per 1000 IDR spent
    // You can customize this based on member tier
    const basePointsRate = 0.001; // 1 point per 1000 IDR
    
    let pointsRate = basePointsRate;
    
    // Tier bonuses
    switch (this.selectedMember()?.tier.toLowerCase()) {
      case 'gold':
        pointsRate = basePointsRate * 1.5;
        break;
      case 'platinum':
        pointsRate = basePointsRate * 2;
        break;
      case 'diamond':
        pointsRate = basePointsRate * 2.5;
        break;
    }
    
    return Math.floor(total * pointsRate);
  }

  // Process member tier upgrade after successful transaction
  private processMembershipBenefits(saleId: number, saleTotal: number): void {
    const currentMember = this.selectedMember();
    if (!currentMember) {
      console.log('ℹ️ No member selected, skipping membership benefits processing');
      return;
    }

    const earnedPoints = this.calculateEarnedPoints(saleTotal);
    
    console.log(`🎯 Processing membership benefits for member: ${currentMember.name}`);
    console.log(`  - Sale ID: ${saleId}`);
    console.log(`  - Transaction Amount: ${saleTotal}`);
    console.log(`  - Points to Earn: ${earnedPoints}`);
    
    // Use the complete transaction processing method
    const transactionData = {
      saleId: saleId,
      amount: saleTotal,
      points: earnedPoints,
      description: `Purchase transaction #${saleId}`
    };

    // Try the main transaction endpoint, fallback to manual method
    this.membershipService.processTransaction(currentMember.id, transactionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log(`✅ Successfully processed transaction for member ${currentMember.name}`);
            this.checkTierUpgrade();
          } else {
            console.warn('⚠️ Transaction processing returned false, trying manual method');
            this.processTransactionManually(saleId, saleTotal, earnedPoints);
          }
        },
        error: (error) => {
          console.warn('⚠️ Main transaction processing failed, trying manual method:', error);
          this.processTransactionManually(saleId, saleTotal, earnedPoints);
        }
      });
  }

  private processTransactionManually(saleId: number, saleTotal: number, earnedPoints: number): void {
    const currentMember = this.selectedMember();
    if (!currentMember) {
      console.log('ℹ️ No member selected, skipping manual transaction processing');
      return;
    }

    const transactionData = {
      saleId: saleId,
      amount: saleTotal,
      points: earnedPoints,
      description: `Manual transaction processing for sale #${saleId}`
    };

    this.membershipService.processTransactionManually(currentMember.id, transactionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log(`✅ Manual transaction processing successful for member ${currentMember.name}`);
            console.log(`📝 Note: Total spent might not be updated on backend. Manual update may be required.`);
            this.checkTierUpgrade();
          }
        },
        error: (error) => {
          console.error('❌ Manual transaction processing also failed:', error);
        }
      });
  }

  private checkTierUpgrade(): void {
    const currentMember = this.selectedMember();
    if (!currentMember) {
      console.log('ℹ️ No member selected, skipping tier upgrade check');
      return;
    }

    // Check for tier upgrade after transaction processing
    this.membershipService.updateMemberTier(currentMember.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (upgraded) => {
          if (upgraded && currentMember) {
            console.log(`🎉 Member ${currentMember.name} tier upgraded!`);
            // You could show a success message or notification here
            this.successMessage.update(msg => msg + ` | Member ${currentMember.name} tier upgraded!`);
          } else if (currentMember) {
            console.log(`📊 Member ${currentMember.name} tier checked - no upgrade needed`);
          }
        },
        error: (error) => {
          console.error('❌ Failed to check tier upgrade:', error);
        }
      });
  }

  // ===== REAL-TIME NOTIFICATION TESTING =====

  /**
   * ✅ NEW: Simulate real-time notifications appearing from backend
   */
  // ===== NAVIGATION HELPERS =====
  
  viewTransactionDetail(saleId: number) {
    this.router.navigate(['/dashboard/pos/transaction', saleId]);
  }

  printReceipt(saleId: number) {
    this.router.navigate(['/dashboard/pos/receipt', saleId]);
  }
}