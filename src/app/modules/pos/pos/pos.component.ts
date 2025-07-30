// src/app/modules/pos/pos/pos.component.ts
// ✅ FIXED - Removed Reactive Forms, using template-driven approach

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Using FormsModule instead of ReactiveFormsModule
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

// Import standalone components
import { BarcodeToolsComponent } from './barcode-tools/barcode-tools.component';
import { PaymentModalComponent } from './payment-modal/payment-modal.component';

// Interfaces
interface Product {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  timestamp: Date;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
}

interface CartTotals {
  subtotal: number;
  globalDiscount: number;
  discountAmount: number;
  total: number;
  tax: number;
  grandTotal: number;
}

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // ✅ Using FormsModule for template-driven forms
    BarcodeToolsComponent,
    PaymentModalComponent
  ]
})
export class POSComponent implements OnInit, OnDestroy {
  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>;
  
  private destroy$ = new Subject<void>();

  // ✅ Template-driven form properties
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
  
  // Mock products data - Enhanced with more realistic data
  private mockProducts: Product[] = [
    {
      id: 1,
      name: 'Mie Instan Sedap Goreng',
      barcode: '8994587123456',
      price: 3500,
      stock: 25,
      category: 'Makanan'
    },
    {
      id: 2,
      name: 'Susu UHT Indomilk 250ml',
      barcode: '8991234567890',
      price: 5500,
      stock: 0, // Out of stock
      category: 'Minuman'
    },
    {
      id: 3,
      name: 'Sabun Mandi Lifebuoy',
      barcode: '8887654321098',
      price: 12000,
      stock: 15,
      category: 'Kebersihan'
    },
    {
      id: 4,
      name: 'Beras Premium 5kg',
      barcode: '8881122334455',
      price: 65000,
      stock: 8,
      category: 'Sembako'
    },
    {
      id: 5,
      name: 'Kopi Kapal Api 200g',
      barcode: '8889988776655',
      price: 18500,
      stock: 12,
      category: 'Minuman'
    },
    {
      id: 6,
      name: 'Teh Botol Sosro 350ml',
      barcode: '8991111222333',
      price: 4000,
      stock: 30,
      category: 'Minuman'
    },
    {
      id: 7,
      name: 'Pasta Gigi Pepsodent',
      barcode: '8887777888999',
      price: 8500,
      stock: 20,
      category: 'Kebersihan'
    },
    {
      id: 8,
      name: 'Roti Tawar Sari Roti',
      barcode: '8994444555666',
      price: 12500,
      stock: 18,
      category: 'Makanan'
    },
    {
      id: 9,
      name: 'Minyak Goreng Bimoli 1L',
      barcode: '8882222333444',
      price: 15000,
      stock: 10,
      category: 'Sembako'
    },
    {
      id: 10,
      name: 'Aqua 600ml',
      barcode: '8995555666777',
      price: 3000,
      stock: 50,
      category: 'Minuman'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadProducts();
    this.focusProductSearch();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load products (mock data)
   */
  private loadProducts() {
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.products = [...this.mockProducts];
      this.filteredProducts = [...this.products];
      this.isLoading = false;
    }, 500);
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
   * Handle search input change
   */
  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
  }

  /**
   * Get filtered products based on search query
   */
  getFilteredProducts(): Product[] {
    if (!this.searchQuery.trim()) {
      return this.products.slice(0, 20); // Show first 20 products
    }
    
    const query = this.searchQuery.toLowerCase();
    return this.products.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.barcode.includes(query) ||
      product.category.toLowerCase().includes(query)
    ).slice(0, 20); // Limit results for performance
  }

  /**
   * Add product to cart
   */
  addToCart(product: Product, quantity: number = 1) {
    if (product.stock < quantity) {
      this.showError(`Stok ${product.name} tidak mencukupi (tersisa: ${product.stock})`);
      return;
    }

    const existingItem = this.cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        this.showError(`Stok ${product.name} tidak mencukupi (tersisa: ${product.stock})`);
        return;
      }
      existingItem.quantity = newQuantity;
      existingItem.subtotal = this.calculateSubtotal(existingItem);
    } else {
      const cartItem: CartItem = {
        product,
        quantity,
        discount: 0,
        subtotal: product.price * quantity
      };
      this.cart.push(cartItem);
    }

    // Clear search and focus
    this.searchQuery = '';
    this.focusProductSearch();
    
    // Show success feedback
    this.showSuccess(`${product.name} ditambahkan ke keranjang`);
    
    console.log('Added to cart:', product.name, 'Qty:', quantity);
  }

  /**
   * Update cart item quantity
   */
  updateCartItemQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(index);
      return;
    }

    const item = this.cart[index];
    if (quantity > item.product.stock) {
      this.showError(`Stok ${item.product.name} tidak mencukupi (maksimal: ${item.product.stock})`);
      return;
    }

    item.quantity = quantity;
    item.subtotal = this.calculateSubtotal(item);
  }

  /**
   * Update cart item discount
   */
  updateCartItemDiscount(index: number, discount: number) {
    const item = this.cart[index];
    item.discount = Math.max(0, Math.min(100, discount));
    item.subtotal = this.calculateSubtotal(item);
  }

  /**
   * Remove item from cart
   */
  removeFromCart(index: number) {
    const item = this.cart[index];
    if (confirm(`Hapus ${item.product.name} dari keranjang?`)) {
      this.cart.splice(index, 1);
      this.showSuccess(`${item.product.name} dihapus dari keranjang`);
    }
  }

  /**
   * Clear entire cart
   */
  clearCart() {
    if (this.cart.length === 0) return;
    
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
    // Ensure discount is within valid range
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
    const tax = total * 0.1; // 10% tax
    const grandTotal = total + tax;

    return {
      subtotal,
      globalDiscount: globalDiscountValue,
      discountAmount,
      total,
      tax,
      grandTotal
    };
  }

  /**
   * Handle barcode scan
   */
  onBarcodeScanned(barcode: string) {
    console.log('Barcode scanned:', barcode);
    
    const product = this.products.find(p => p.barcode === barcode);
    if (product) {
      this.addToCart(product);
      this.showSuccess(`Produk ${product.name} berhasil di-scan`);
    } else {
      this.showError(`Produk dengan barcode ${barcode} tidak ditemukan`);
    }
    
    this.showBarcodeScanner = false;
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
    for (const item of this.cart) {
      if (item.quantity > item.product.stock) {
        this.showError(`Stok ${item.product.name} tidak mencukupi`);
        return;
      }
    }

    this.showPaymentModal = true;
  }

  /**
   * Handle payment completion
   */
  onPaymentComplete(paymentData: any) {
    const totals = this.getCartTotals();
    
    // Create transaction
    const transaction: Transaction = {
      id: 'TXN' + Date.now(),
      items: [...this.cart],
      subtotal: totals.subtotal,
      discount: totals.discountAmount,
      tax: totals.tax,
      total: totals.grandTotal,
      paid: paymentData.amountPaid,
      change: paymentData.change,
      paymentMethod: paymentData.method,
      timestamp: new Date(),
      cashierName: localStorage.getItem('username') || 'Kasir',
      customerName: this.customerName || undefined,
      customerPhone: this.customerPhone || undefined
    };

    // Update stock (in real app, this would be done via API)
    this.updateProductStock();

    // Save transaction (mock - in real app, save to backend)
    this.currentTransaction = transaction;
    localStorage.setItem('lastTransaction', JSON.stringify(transaction));
    
    console.log('Transaction completed:', transaction);

    // Clear cart and form
    this.cart = [];
    this.searchQuery = '';
    this.customerName = '';
    this.customerPhone = '';
    this.globalDiscount = 0;
    this.notes = '';
    this.showPaymentModal = false;

    // Show success message
    this.showSuccess('Transaksi berhasil! Generating receipt...');

    // Navigate to receipt preview after short delay
    setTimeout(() => {
      this.router.navigate(['/pos/receipt', transaction.id]);
    }, 1500);
  }

  /**
   * Handle payment cancellation
   */
  onPaymentCancelled() {
    this.showPaymentModal = false;
    this.showInfo('Pembayaran dibatalkan');
  }

  /**
   * Update product stock after sale
   */
  private updateProductStock() {
    this.cart.forEach(item => {
      const product = this.products.find(p => p.id === item.product.id);
      if (product) {
        product.stock -= item.quantity;
        console.log(`Updated stock for ${product.name}: ${product.stock}`);
      }
    });
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
   * Show error message
   */
  private showError(message: string) {
    // In real app, use toast/snackbar service
    console.error('POS Error:', message);
    alert('❌ ' + message);
  }

  /**
   * Show success message
   */
  private showSuccess(message: string) {
    // In real app, use toast/snackbar service
    console.log('POS Success:', message);
    // You can implement a toast notification here
  }

  /**
   * Show info message
   */
  private showInfo(message: string) {
    // In real app, use toast/snackbar service
    console.info('POS Info:', message);
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
   * Get cart item count
   */
  getCartItemCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
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
   * Get cart total value
   */
  getCartTotalValue(): number {
    return this.getCartTotals().grandTotal;
  }

  /**
   * Check if cart has items
   */
  hasCartItems(): boolean {
    return this.cart.length > 0;
  }

  /**
   * Get low stock products
   */
  getLowStockProducts(): Product[] {
    return this.products.filter(p => p.stock > 0 && p.stock <= 5);
  }

  /**
   * Get out of stock products
   */
  getOutOfStockProducts(): Product[] {
    return this.products.filter(p => p.stock === 0);
  }

  /**
   * Quick add product by barcode
   */
  quickAddByBarcode(barcode: string): boolean {
    const product = this.products.find(p => p.barcode === barcode);
    if (product && product.stock > 0) {
      this.addToCart(product);
      return true;
    }
    return false;
  }

  /**
   * Get categories
   */
  getCategories(): string[] {
    const categories = [...new Set(this.products.map(p => p.category))];
    return categories.sort();
  }

  /**
   * Filter products by category
   */
  filterByCategory(category: string) {
    this.filteredProducts = this.products.filter(p => p.category === category);
    this.searchQuery = '';
  }

  /**
   * Clear category filter
   */
  clearCategoryFilter() {
    this.filteredProducts = [...this.products];
    this.searchQuery = '';
  }

  /**
   * Get product by ID
   */
  getProductById(id: number): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  /**
   * Calculate item total including tax
   */
  calculateItemTotal(item: CartItem): number {
    return item.subtotal * 1.1; // Including 10% tax
  }

  /**
   * Get transaction summary
   */
  getTransactionSummary() {
    const totals = this.getCartTotals();
    return {
      itemCount: this.getCartItemCount(),
      uniqueItems: this.cart.length,
      subtotal: totals.subtotal,
      discount: totals.discountAmount,
      tax: totals.tax,
      total: totals.grandTotal,
      hasDiscount: totals.discountAmount > 0
    };
  }
}