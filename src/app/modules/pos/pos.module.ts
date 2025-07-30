// src/app/modules/pos/pos/pos.component.ts
// ✅ UPDATED - POS Component dengan imports yang benar dari repository

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar'; // ✅ Added: MatSnackBar import

// Services - menggunakan service yang sudah ada di repository
import { PosService } from '../services/pos.service';
import { NotificationService } from '../../../core/services/notification.service'; // ✅ Fixed: menggunakan path yang benar

// Components
import { BarcodeToolsComponent } from './barcode-tools/barcode-tools.component';
import { PaymentModalComponent } from './payment-modal/payment-modal.component';

// Interfaces
import { 
  Product, 
  CartItem, 
  Transaction, 
  CartTotals, 
  PaymentData,
  PaymentMethod // ✅ Fixed: import PaymentMethod type
} from '../services/pos.service'; // Import dari service yang sudah diperbaiki

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BarcodeToolsComponent,
    PaymentModalComponent
  ]
})
export class POSComponent implements OnInit, OnDestroy {
  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>;
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  // Form data
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
  showPaymentModal = false;
  showBarcodeScanner = false;
  
  // Transaction
  currentTransaction: Transaction | null = null;

  constructor(
    private posService: PosService,
    private notificationService: NotificationService, // ✅ Fixed: menggunakan service dari repository
    private router: Router,
    private snackBar: MatSnackBar // ✅ Added: MatSnackBar injection
  ) {}

  ngOnInit() {
    this.initializeComponent();
    this.setupSearchDebounce();
    this.loadProducts();
    this.focusProductSearch();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize component
   */
  private initializeComponent() {
    this.cart = [];
    this.globalDiscount = 0;
    this.customerName = '';
    this.customerPhone = '';
    this.notes = '';
  }

  /**
   * Setup search debounce
   */
  private setupSearchDebounce() {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.performSearch(query);
      });
  }

  /**
   * Load products from backend
   */
  private loadProducts() {
    this.isLoading = true;
    
    this.posService.getProducts(1, 100) // Load first 100 products
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.filteredProducts = products;
          this.isLoading = false;
          console.log('Products loaded:', products.length);
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.showError('Gagal memuat produk: ' + error.message);
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle search input
   */
  onSearchProduct() {
    this.searchSubject$.next(this.searchQuery);
  }

  /**
   * Perform actual search
   */
  private performSearch(query: string) {
    if (!query.trim()) {
      this.filteredProducts = this.products;
      return;
    }

    this.isLoading = true;
    
    this.posService.searchProducts(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.filteredProducts = products;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error searching products:', error);
          this.showError('Gagal mencari produk: ' + error.message);
          this.isLoading = false;
          // Fallback to local search
          this.filteredProducts = this.products.filter(product =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.barcode.includes(query)
          );
        }
      });
  }

  /**
   * Add product to cart
   */
  addToCart(product: Product) {
    if (product.stock === 0) {
      this.showError(`Produk ${product.name} habis stok`);
      return;
    }

    const existingItem = this.cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        this.showError(`Stok ${product.name} tidak mencukupi`);
        return;
      }
      existingItem.quantity++;
      existingItem.subtotal = this.calculateSubtotal(existingItem);
    } else {
      const newItem: CartItem = {
        product: product,
        quantity: 1,
        discount: 0,
        subtotal: product.price
      };
      this.cart.push(newItem);
    }

    this.showSuccess(`${product.name} ditambahkan ke keranjang`);
  }

  /**
   * Remove item from cart
   */
  removeFromCart(item: CartItem) {
    const index = this.cart.findIndex(cartItem => cartItem.product.id === item.product.id);
    if (index > -1) {
      this.cart.splice(index, 1);
      this.showSuccess(`${item.product.name} dihapus dari keranjang`);
    }
  }

  /**
   * Update cart item quantity
   */
  updateCartItemQuantity(item: CartItem) {
    item.quantity = Math.max(1, Math.min(item.product.stock, item.quantity));
    item.subtotal = this.calculateSubtotal(item);
  }

  /**
   * Update cart item discount
   */
  updateCartItemDiscount(item: CartItem) {
    item.discount = Math.max(0, Math.min(100, item.discount));
    item.subtotal = this.calculateSubtotal(item);
  }

  /**
   * Increase quantity
   */
  increaseQuantity(item: CartItem) {
    if (item.quantity < item.product.stock) {
      item.quantity++;
      item.subtotal = this.calculateSubtotal(item);
    } else {
      this.showError(`Stok ${item.product.name} tidak mencukupi`);
    }
  }

  /**
   * Decrease quantity
   */
  decreaseQuantity(item: CartItem) {
    if (item.quantity > 1) {
      item.quantity--;
      item.subtotal = this.calculateSubtotal(item);
    }
  }

  /**
   * Clear entire cart
   */
  clearCart() {
    if (this.cart.length === 0) {
      this.showInfo('Keranjang sudah kosong');
      return;
    }

    if (confirm('Yakin ingin mengosongkan keranjang?')) {
      this.cart = [];
      this.searchQuery = '';
      this.customerName = '';
      this.customerPhone = '';
      this.globalDiscount = 0;
      this.notes = '';
      this.showSuccess('Keranjang berhasil dikosongkan');
      this.focusProductSearch();
    }
  }

  /**
   * Handle global discount change
   */
  onGlobalDiscountChange() {
    this.globalDiscount = Math.max(0, Math.min(100, this.globalDiscount));
  }

  /**
   * Calculate subtotal for cart item
   */
  private calculateSubtotal(item: CartItem): number {
    const baseAmount = item.product.price * item.quantity;
    const discountAmount = baseAmount * (item.discount / 100);
    return baseAmount - discountAmount;
  }

  /**
   * Calculate cart totals
   */
  getCartTotals(): CartTotals {
    const subtotal = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
    const globalDiscountValue = this.globalDiscount || 0;
    const discountAmount = subtotal * (globalDiscountValue / 100);
    const total = subtotal - discountAmount;
    const taxAmount = total * 0.1; // 10% tax
    const grandTotal = total + taxAmount;

    return {
      subtotal,
      globalDiscount: globalDiscountValue,
      discountAmount,
      total,
      tax: 10,
      taxAmount,
      grandTotal
    };
  }

  /**
   * Handle barcode scan
   */
  onBarcodeScanned(barcode: string) {
    console.log('Barcode scanned:', barcode);
    
    this.posService.getProductByBarcode(barcode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          this.addToCart(product);
          this.showSuccess(`Produk ${product.name} berhasil di-scan`);
          this.showBarcodeScanner = false;
        },
        error: (error) => {
          console.error('Error finding product by barcode:', error);
          this.showError(`Produk dengan barcode ${barcode} tidak ditemukan`);
          this.showBarcodeScanner = false;
        }
      });
  }

  /**
   * Process payment
   */
  processPayment() {
    if (this.cart.length === 0) {
      this.showError('Keranjang masih kosong');
      return;
    }

    // Validate stock before payment
    const stockValidationItems = this.cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));

    this.posService.validateStock(stockValidationItems)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isValid) => {
          if (isValid) {
            this.showPaymentModal = true;
          } else {
            this.showError('Stok beberapa produk tidak mencukupi');
          }
        },
        error: (error) => {
          console.error('Error validating stock:', error);
          this.showError('Gagal memvalidasi stok: ' + error.message);
        }
      });
  }

  /**
   * Handle payment completion
   */
  onPaymentComplete(paymentData: PaymentData) {
    const totals = this.getCartTotals();
    
    // Prepare sale data for backend
    const saleData = {
      items: this.cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        discountAmount: (item.product.price * item.quantity) * (item.discount / 100),
        totalPrice: item.subtotal
      })),
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      discountPercentage: totals.globalDiscount,
      taxAmount: totals.taxAmount,
      total: totals.grandTotal,
      paymentMethod: paymentData.method,
      amountPaid: paymentData.amount,
      changeAmount: paymentData.change,
      customerName: this.customerName || undefined,
      customerPhone: this.customerPhone || undefined,
      notes: this.notes || undefined
    };

    this.isLoading = true;
    this.showPaymentModal = false;

    this.posService.createSale(saleData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transaction) => {
          this.currentTransaction = transaction;
          this.isLoading = false;
          
          this.showSuccess('Transaksi berhasil disimpan!');
          
          // Clear cart and form
          this.cart = [];
          this.globalDiscount = 0;
          this.customerName = '';
          this.customerPhone = '';
          this.notes = '';
          
          // Navigate to receipt after short delay
          setTimeout(() => {
            this.router.navigate(['/pos/receipt', transaction.id]);
          }, 1500);
        },
        error: (error) => {
          console.error('Error creating sale:', error);
          this.showError('Gagal menyimpan transaksi: ' + error.message);
          this.isLoading = false;
          this.showPaymentModal = true; // Show payment modal again
        }
      });
  }

  /**
   * Handle payment cancellation
   */
  onPaymentCancelled() {
    this.showPaymentModal = false;
    this.showInfo('Pembayaran dibatalkan');
  }

  /**
   * Get cart item count
   */
  getCartItemCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Get cart total value
   */
  getCartTotalValue(): number {
    return this.getCartTotals().grandTotal;
  }

  /**
   * Check if product is in cart
   */
  isProductInCart(productId: number): boolean {
    return this.cart.some(item => item.product.id === productId);
  }

  /**
   * Get product quantity in cart
   */
  getProductQuantityInCart(productId: number): number {
    const item = this.cart.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }

  /**
   * Track by functions for ngFor
   */
  trackByProductId(index: number, product: Product): number {
    return product.id;
  }

  trackByCartItem(index: number, item: CartItem): number {
    return item.product.id;
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchQuery = '';
    this.onSearchProduct();
    this.focusProductSearch();
  }

  /**
   * Focus on product search input
   */
  private focusProductSearch() {
    setTimeout(() => {
      if (this.productSearchInput) {
        this.productSearchInput.nativeElement.focus();
      }
    }, 100);
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
   * Handle keyboard shortcuts
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Don't trigger shortcuts if user is typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key) {
      case 'F1':
        event.preventDefault();
        this.showBarcodeScanner = true;
        break;
      case 'F2':
        event.preventDefault();
        this.focusProductSearch();
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
        event.preventDefault();
        if (this.showBarcodeScanner) {
          this.showBarcodeScanner = false;
        } else if (this.showPaymentModal) {
          this.showPaymentModal = false;
        }
        break;
    }
  }

  /**
   * ✅ Fixed: Notification methods menggunakan MatSnackBar langsung
   */
  private showError(message: string) {
    console.error('POS Error:', message);
    this.snackBar.open(
      `❌ ${message}`, 
      'Tutup',
      {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      }
    );
  }

  private showSuccess(message: string) {
    console.log('POS Success:', message);
    this.snackBar.open(
      `✅ ${message}`, 
      'Tutup',
      {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      }
    );
  }

  private showInfo(message: string) {
    console.info('POS Info:', message);
    this.snackBar.open(
      `ℹ️ ${message}`, 
      'Tutup',
      {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['info-snackbar']
      }
    );
  }

  private showWarning(message: string) {
    console.warn('POS Warning:', message);
    this.snackBar.open(
      `⚠️ ${message}`, 
      'Tutup',
      {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      }
    );
  }
}