// src/app/modules/pos/pos/pos.component.ts - FIXED INTEGRATION
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, take } from 'rxjs/operators';
import { of } from 'rxjs';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

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

// Import standalone components
import { BarcodeToolsComponent } from './barcode-tools/barcode-tools.component';
import { PaymentModalComponent } from './payment-modal/payment-modal.component';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    BarcodeToolsComponent,
    PaymentModalComponent
  ]
})
export class POSComponent implements OnInit, OnDestroy {
  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>;
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  // Template-driven form properties
  searchQuery = '';
  globalDiscount = 0;
  customerName = '';
  customerPhone = '';
  notes = '';
  
  // Data
  products: Product[] = [];
  cart: CartItem[] = [];
  filteredProducts: Product[] = [];
  
  // UI State
  isLoading = false;
  isSearching = false;
  showPaymentModal = false;
  showBarcodeScanner = false;
  showProductRegistrationModal = false;
  scannedBarcodeForRegistration = '';
  errorMessage = '';
  successMessage = '';

  // New product registration
  newProduct = {
    name: '',
    barcode: '',
    description: '',
    sellPrice: 0,
    buyPrice: 0,
    stock: 0,
    minimumStock: 5,
    categoryId: null as number | null,
    unit: 'pcs'
  };
  
  // Categories for dropdown
  categories: any[] = [];
  
  // Current user info
  currentUser: any = null;
  
  // Membership integration
  selectedMember: MemberDto | null = null;
  memberSearchQuery = '';
  searchedMembers: MemberDto[] = [];
  isSearchingMembers = false;

  constructor(
    private posService: POSService,
    private inventoryService: InventoryService,
    private authService: AuthService,
    private membershipService: MembershipService,
    private categoryService: CategoryService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.initializeComponent();
    this.setupCartSubscription();
    this.setupSearchListener();
    this.initializeCartTotals();
    this.loadCategories();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALIZATION =====

  private initializeCartTotals() {
    this.cartTotals$ = this.posService.cart$.pipe(
      switchMap(() => this.posService.getCartTotals(this.globalDiscount)),
      catchError(() => of({
        subtotal: 0,
        globalDiscount: this.globalDiscount,
        discountAmount: 0,
        taxAmount: 0,
        total: 0
      }))
    );
  }
// src/app/modules/pos/pos/pos.component.ts - FIX DATA ACCESS
loadProducts(): void {
  this.isLoading = true;
  
  this.posService.getProducts(1, 20).subscribe({
    next: (response) => {
      console.log('🔍 Full Response:', response);
      console.log('🔍 Response Success:', response.success);
      console.log('🔍 Response Data:', response.data);
      
      if (response.success && response.data) {
        // ✅ FIX: Use "products" instead of "items"
        this.products = response.data.products || [];
        console.log('✅ Products loaded:', this.products.length);
        console.log('✅ First product:', this.products[0]);
      } else {
        console.warn('⚠️ Response not successful:', response.message);
        this.products = [];
      }
      
      this.isLoading = false;
    },
    error: (error) => {
      console.error('❌ Load Products Error:', error);
      this.products = [];
      this.isLoading = false;
    }
  });
}
  private initializeComponent() {
    // Get current user info using the fixed AuthService
    this.currentUser = this.authService.getCurrentUser();
    
    // Subscribe to user changes
    this.authService.getCurrentUser$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: any) => {
        this.currentUser = user;
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

  private setupCartSubscription() {
    this.posService.cart$
      .pipe(
        takeUntil(this.destroy$),
        // ✅ Add distinctUntilChanged to prevent unnecessary updates
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe((cart: CartItem[]) => {
        console.log('🛒 Cart subscription triggered:', cart.length, 'items');
        this.cart = [...cart]; // Always create new array reference
        
        // Force change detection
        setTimeout(() => {
          console.log('🛒 Cart state after timeout:', this.cart.length, 'items');
        }, 0);
      });
  }

  private setupSearchListener() {
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

  onSearchInput(event: any) {
    this.searchQuery = event.target.value;
    this.searchSubject$.next(this.searchQuery);
  }

  private performSearch(query: string) {
    if (query.length < 2 && query.length > 0) {
      this.filteredProducts = [];
      return;
    }

    this.isSearching = true;
    this.errorMessage = '';

    // Use getProducts for empty query, searchProducts for specific search
    const searchObservable = query.length === 0 
      ? this.posService.getProducts()
      : this.posService.searchProducts(query);

    searchObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ProductListResponseApiResponse) => {
          this.isSearching = false;
          if (response.success && response.data) {
            // Handle both getProducts and searchProducts response format
            const products = response.data.products || [];
            this.filteredProducts = products.filter((p: Product) => p.isActive && p.stock > 0);
          } else {
            this.filteredProducts = [];
            this.errorMessage = response.message || 'Gagal memuat produk';
          }
        },
        error: (error: any) => {
          this.isSearching = false;
          this.filteredProducts = [];
          this.errorMessage = error.message || 'Gagal memuat produk';
          console.error('Error loading products:', error);
        }
      });
  }

  // ===== CART OPERATIONS =====

  addToCart(product: Product, quantity: number = 1) {
    console.log('🛒 Adding to cart:', product.name, 'quantity:', quantity);
    
    // Check stock availability
    if (product.stock < quantity) {
      this.errorMessage = `Stok tidak mencukupi. Tersedia: ${product.stock}`;
      this.clearMessages();
      return;
    }

    // Check if already in cart
    const existingItem = this.cart.find(item => item.product.id === product.id);
    const totalQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    if (totalQuantity > product.stock) {
      this.errorMessage = `Jumlah melebihi stok. Maksimal: ${product.stock}`;
      this.clearMessages();
      return;
    }

    // ✅ FIX: Add to cart and ensure immediate UI update
    this.posService.addToCart(product, quantity, 0);
    
    // ✅ FIX: Force immediate cart refresh without subscription delay
    this.posService.cart$.pipe(take(1)).subscribe(cart => {
      this.cart = [...cart]; // Force array reference change
      console.log('✅ Cart immediately updated:', this.cart.length, 'items');
    });
    
    this.successMessage = `${product.name} ditambahkan ke keranjang`;
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

  updateCartItemQuantity(index: number, quantity: number) {
    const item = this.cart[index];
    if (!item) return;

    // Validate quantity
    const validQuantity = Math.max(1, Math.min(item.product.stock, quantity));
    
    if (validQuantity !== quantity) {
      if (quantity > item.product.stock) {
        this.errorMessage = `Stok maksimal ${item.product.stock}`;
        this.clearMessages();
      }
    }

    if (validQuantity <= 0) {
      this.removeFromCart(index);
      return;
    }

    this.posService.updateCartItemQuantity(item.product.id, validQuantity);
  }

  updateCartItemDiscount(index: number, discount: number) {
    const item = this.cart[index];
    if (!item) return;

    // Validate discount
    const validDiscount = Math.max(0, Math.min(100, discount));
    
    if (validDiscount !== discount) {
      if (discount > 100) {
        this.errorMessage = 'Diskon maksimal 100%';
        this.clearMessages();
      } else if (discount < 0) {
        this.errorMessage = 'Diskon minimal 0%';
        this.clearMessages();
      }
    }

    this.posService.updateCartItemDiscount(item.product.id, validDiscount);
  }

  removeFromCart(index: number) {
    const item = this.cart[index];
    if (item) {
      this.posService.removeFromCart(item.product.id);
    }
  }

  clearCart() {
    if (this.cart.length === 0) return;

    if (confirm('Yakin ingin mengosongkan keranjang?')) {
      this.posService.clearCart();
      this.globalDiscount = 0;
      this.customerName = '';
      this.customerPhone = '';
      this.notes = '';
      this.clearMember();
      this.successMessage = 'Keranjang dikosongkan';
      this.clearMessages();
    }
  }

  // ===== CALCULATIONS - USING BACKEND =====
  
  cartTotals$: Observable<any> = new Observable(); // Initialize properly in ngOnInit

  getCartTotals() {
    // For backward compatibility, return sync version but prefer async
    return this.posService.getCartTotalsSync(this.globalDiscount);
  }

  onGlobalDiscountChange() {
    this.globalDiscount = Math.max(0, Math.min(100, this.globalDiscount));
    // Trigger recalculation by emitting cart change
    this.posService.cart$.pipe(take(1)).subscribe();
  }

  // ===== BARCODE OPERATIONS =====

  onBarcodeScanned(barcode: string) {
    this.showBarcodeScanner = false;
    this.searchByBarcode(barcode);
  }

  private searchByBarcode(barcode: string) {
    this.isLoading = true;
    this.errorMessage = '';

    this.posService.getProductByBarcode(barcode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success && response.data) {
            const product = response.data;
            if (product.isActive && product.stock > 0) {
              this.addToCart(product);
              this.successMessage = `${product.name} ditambahkan ke keranjang`;
              this.clearMessages();
            } else {
              this.errorMessage = product.stock <= 0 ? 
                'Produk habis stok' : 'Produk tidak aktif';
              this.clearMessages();
            }
          } else {
            this.errorMessage = 'Produk dengan barcode ini tidak ditemukan';
            this.clearMessages();
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Error searching by barcode:', error);
          
          // Check if it's a "product not found" error
          if (error.message && error.message.includes('tidak ditemukan')) {
            // Show product registration modal with scanned barcode
            this.scannedBarcodeForRegistration = barcode;
            this.showProductRegistrationModal = true;
            this.successMessage = `Barcode ${barcode} tidak ditemukan. Silakan daftarkan produk baru.`;
            this.clearMessages();
          } else {
            // Other errors
            this.errorMessage = error.message || 'Gagal mencari produk';
            this.clearMessages();
          }
        }
      });
  }

  // ===== PAYMENT OPERATIONS =====

  processPayment() {
    if (this.cart.length === 0) {
      this.errorMessage = 'Keranjang kosong';
      this.clearMessages();
      return;
    }

    // Validate stock before payment using new backend method
    const saleItems: CreateSaleItemRequest[] = this.cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      sellPrice: item.product.sellPrice,
      discount: item.discount
    }));

    this.isLoading = true;
    this.posService.validateStock(saleItems)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.showPaymentModal = true;
          } else {
            this.errorMessage = response.message || 'Stok tidak mencukupi untuk beberapa item';
            this.clearMessages();
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Gagal memvalidasi stok';
          this.clearMessages();
        }
      });
  }

  onPaymentComplete(paymentData: PaymentData) {
    this.showPaymentModal = false;
    this.completeSale(paymentData);
  }

  onPaymentCancelled() {
    this.showPaymentModal = false;
  }

  // ===== PRODUCT REGISTRATION MODAL =====

  onProductRegistrationComplete(product: any) {
    this.showProductRegistrationModal = false;
    this.scannedBarcodeForRegistration = '';
    this.resetNewProductForm();
    
    if (product) {
      // Product was successfully created, add it to cart
      this.addToCart(product);
      this.successMessage = `${product.name} berhasil didaftarkan dan ditambahkan ke keranjang`;
      this.clearMessages();
    }
  }

  onProductRegistrationCancelled() {
    this.showProductRegistrationModal = false;
    this.scannedBarcodeForRegistration = '';
    this.resetNewProductForm();
    this.errorMessage = 'Pendaftaran produk dibatalkan';
    this.clearMessages();
  }

  submitNewProduct(form: any) {
    if (!form.valid) {
      this.errorMessage = 'Mohon lengkapi semua field yang wajib diisi';
      this.clearMessages();
      return;
    }

    // Additional validation
    if (!this.newProduct.name?.trim()) {
      this.errorMessage = 'Nama produk harus diisi';
      this.clearMessages();
      return;
    }

    if (!this.newProduct.sellPrice || this.newProduct.sellPrice <= 0) {
      this.errorMessage = 'Harga jual harus lebih dari 0';
      this.clearMessages();
      return;
    }

    if (!this.newProduct.stock || this.newProduct.stock < 0) {
      this.errorMessage = 'Stok tidak boleh negatif';
      this.clearMessages();
      return;
    }

    if (!this.scannedBarcodeForRegistration?.trim()) {
      this.errorMessage = 'Barcode tidak valid';
      this.clearMessages();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Set the barcode from scanned value
    this.newProduct.barcode = this.scannedBarcodeForRegistration;

    // Create product using inventory service
    this.createNewProduct(this.newProduct);
  }

  private createNewProduct(productData: any) {
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
          this.isLoading = false;
          
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
          this.isLoading = false;
          this.errorMessage = `Gagal mendaftarkan produk: ${error.message || error}`;
          this.clearMessages();
        }
      });
  }

  private resetNewProductForm() {
    this.newProduct = {
      name: '',
      barcode: '',
      description: '',
      sellPrice: 0,
      buyPrice: 0,
      stock: 0,
      minimumStock: 5,
      categoryId: null,
      unit: 'pcs'
    };
  }

  private refreshProductLists() {
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
          this.categories = categories;
          console.log('✅ Categories loaded for POS:', categories.length);
        },
        error: (error) => {
          console.error('❌ Failed to load categories:', error);
          // Set default category if loading fails
          this.categories = [{ id: 1, name: 'Umum', color: '#666666' }];
        }
      });
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  private completeSale(paymentData: PaymentData) {
    // Use backend calculation for totals
    this.posService.getCartTotals(this.globalDiscount)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (totals) => {
          const saleRequest: CreateSaleRequest = {
            items: this.cart.map(item => ({
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
            memberId: this.selectedMember?.id,
            customerName: this.customerName || undefined,
            customerPhone: this.customerPhone || undefined,
            notes: this.notes || undefined,
            redeemedPoints: 0 // TODO: Implement points redemption in payment modal
          };

          this.isLoading = true;
          this.posService.createSale(saleRequest)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: any) => {
                this.isLoading = false;
                console.log('✅ Sale created successfully:', response);
                
                if (response.success && response.data) {
                  const saleId = response.data.id;
                  const saleNumber = response.data.saleNumber;
                  
                  console.log('🧾 Navigating to receipt:', saleId, saleNumber);
                  this.successMessage = `Transaksi berhasil! No: ${saleNumber}`;
                  
                  // Process membership benefits (points and tier upgrade)
                  this.processMembershipBenefits(saleId, response.data.total);
                  
                  // Reset form
                  this.globalDiscount = 0;
                  this.customerName = '';
                  this.customerPhone = '';
                  this.notes = '';
                  this.clearMember();
                  
                  // Clear cart
                  this.cart = [];
                  
                  // Show success modal instead of alert
                  this.showTransactionSuccessModal(saleId, saleNumber, response.data.total);
                } else {
                  this.errorMessage = response.message || 'Gagal menyimpan transaksi';
                  this.clearMessages();
                }
              },
              error: (error: any) => {
                this.isLoading = false;
                this.errorMessage = error.message || 'Gagal menyimpan transaksi';
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
    return this.filteredProducts;
  }

  getCartItemCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  getCartTotalValue(): number {
    return this.getCartTotals().total;
  }

  isProductInCart(productId: number): boolean {
    return this.cart.some(item => item.product.id === productId);
  }

  getProductQuantityInCart(productId: number): number {
    const item = this.cart.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }

  private clearMessages(timeout: number = 3000) {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
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
  if (isInputActive || this.showPaymentModal || this.showBarcodeScanner) {
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
      this.showBarcodeScanner = true;
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
      if (this.showBarcodeScanner) {
        this.showBarcodeScanner = false;
      } else if (this.showPaymentModal) {
        this.showPaymentModal = false;
      } else if (this.showProductRegistrationModal) {
        this.showProductRegistrationModal = false;
        this.scannedBarcodeForRegistration = '';
      }
      break;
  }
}
  increaseQuantity(index: number) {
  const item = this.cart[index];
  if (item && item.quantity < item.product.stock) {
    this.onQuantityChange(index, item.quantity + 1);
  } else {
    this.errorMessage = `Stok maksimal ${item.product.stock}`;
    this.clearMessages();
  }
}

decreaseQuantity(index: number) {
  const item = this.cart[index];
  if (item && item.quantity > 1) {
    this.onQuantityChange(index, item.quantity - 1);
  }
}

onQuantityChange(index: number, newQuantity: number) {
  const item = this.cart[index];
  if (!item) return;

  // Validate quantity
  const validQuantity = Math.max(1, Math.min(item.product.stock, newQuantity));
  
  // Update item quantity in local cart first
  item.quantity = validQuantity;
  
  // Update in service
  this.posService.updateCartItemQuantity(item.product.id, validQuantity);
  
  // Show warning if quantity was adjusted
  if (validQuantity !== newQuantity) {
    if (newQuantity > item.product.stock) {
      this.errorMessage = `Stok maksimal ${item.product.stock}`;
      this.clearMessages();
    } else if (newQuantity < 1) {
      this.errorMessage = 'Jumlah minimal 1';
      this.clearMessages();
    }
  }
}

onDiscountChange(index: number, newDiscount: number) {
  const item = this.cart[index];
  if (!item) return;

  // Validate discount
  const validDiscount = Math.max(0, Math.min(100, newDiscount));
  
  // Update item discount in local cart first
  item.discount = validDiscount;
  
  // Update in service
  this.posService.updateCartItemDiscount(item.product.id, validDiscount);
  
  // Show warning if discount was adjusted
  if (validDiscount !== newDiscount) {
    if (newDiscount > 100) {
      this.errorMessage = 'Diskon maksimal 100%';
      this.clearMessages();
    } else if (newDiscount < 0) {
      this.errorMessage = 'Diskon minimal 0%';
      this.clearMessages();
    }
  }
}

  // ===== TRANSACTION SUCCESS MODAL =====
  
  private showTransactionSuccessModal(saleId: number, saleNumber: string, total: number) {
    console.log('🎉 Showing transaction success modal for:', { saleId, saleNumber, total });
    
    const dialogRef = this.dialog.open(TransactionSuccessModalComponent, {
      width: '480px',
      maxWidth: '90vw',
      disableClose: true,
      panelClass: 'transaction-success-dialog',
      data: {
        saleId,
        saleNumber,
        total
      } as TransactionSuccessData
    });

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
            this.errorMessage = `Gagal membuka detail transaksi. ID: ${saleId}`;
            this.clearMessages();
          }
        }).catch(error => {
          console.error('❌ Navigation error:', error);
          this.errorMessage = `Error navigasi: ${error.message}`;
          this.clearMessages();
        });
      } else if (result === 'new') {
        // Stay on POS for new transaction
        console.log('✅ Starting new transaction');
        this.clearMessages();
        this.successMessage = `Transaksi ${saleNumber} berhasil disimpan!`;
        this.clearMessages(3000); // Clear after 3 seconds
      }
    });
  }

  // ===== MEMBERSHIP INTEGRATION =====

  searchMembers(query: string): void {
    if (!query || query.length < 2) {
      this.searchedMembers = [];
      return;
    }

    this.isSearchingMembers = true;
    
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
          this.searchedMembers = response.members;
          this.isSearchingMembers = false;
        },
        error: (error) => {
          console.error('Error searching members:', error);
          this.searchedMembers = [];
          this.isSearchingMembers = false;
        }
      });
  }

  selectMember(member: MemberDto): void {
    this.selectedMember = member;
    this.memberSearchQuery = `${member.name} (${member.memberNumber})`;
    this.searchedMembers = [];
  }

  clearMember(): void {
    this.selectedMember = null;
    this.memberSearchQuery = '';
    this.searchedMembers = [];
  }

  calculateEarnedPoints(total: number): number {
    if (!this.selectedMember || total <= 0) return 0;
    
    // Basic calculation: 1 point per 1000 IDR spent
    // You can customize this based on member tier
    const basePointsRate = 0.001; // 1 point per 1000 IDR
    
    let pointsRate = basePointsRate;
    
    // Tier bonuses
    switch (this.selectedMember.tier.toLowerCase()) {
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
    if (!this.selectedMember) return;

    const earnedPoints = this.calculateEarnedPoints(saleTotal);
    
    console.log(`🎯 Processing membership benefits for member: ${this.selectedMember.name}`);
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
    this.membershipService.processTransaction(this.selectedMember.id, transactionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log(`✅ Successfully processed transaction for member ${this.selectedMember?.name}`);
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
    if (!this.selectedMember) return;

    const transactionData = {
      saleId: saleId,
      amount: saleTotal,
      points: earnedPoints,
      description: `Manual transaction processing for sale #${saleId}`
    };

    this.membershipService.processTransactionManually(this.selectedMember.id, transactionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log(`✅ Manual transaction processing successful for member ${this.selectedMember?.name}`);
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
    if (!this.selectedMember) return;

    // Check for tier upgrade after transaction processing
    this.membershipService.updateMemberTier(this.selectedMember.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (upgraded) => {
          if (upgraded && this.selectedMember) {
            console.log(`🎉 Member ${this.selectedMember.name} tier upgraded!`);
            // You could show a success message or notification here
            this.successMessage += ` | Member ${this.selectedMember.name} tier upgraded!`;
          } else if (this.selectedMember) {
            console.log(`📊 Member ${this.selectedMember.name} tier checked - no upgrade needed`);
          }
        },
        error: (error) => {
          console.error('❌ Failed to check tier upgrade:', error);
        }
      });
  }

  // ===== NAVIGATION HELPERS =====
  
  viewTransactionDetail(saleId: number) {
    this.router.navigate(['/dashboard/pos/transaction', saleId]);
  }

  printReceipt(saleId: number) {
    this.router.navigate(['/dashboard/pos/receipt', saleId]);
  }
}