// src/app/modules/pos/pos/receipt-preview/receipt-preview.component.ts - COMPLETE INTEGRATION
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { POSService, SaleDto } from '../../../../core/services/pos.service';
import { ReceiptService } from '../../../../core/services/receipt.service';
import { environment } from '../../../../../environment/environment';

@Component({
  selector: 'app-receipt-preview',
  templateUrl: './receipt-preview.component.html',
  styleUrls: ['./receipt-preview.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})

export class ReceiptPreviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  sale: SaleDto | null = null;
  saleId: number = 0;
  
  // UI State
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  digitalReceiptUrl = '';

  // Store Information
  storeInfo = environment.pos.receiptSettings;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private posService: POSService,
    private receiptService: ReceiptService
  ) {}

  ngOnInit() {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe((params: any) => {
        this.saleId = +params['transactionId'];
        if (this.saleId) {
          this.loadSale();
        } else {
          this.errorMessage = 'ID transaksi tidak valid';
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== DATA LOADING - ENHANCED =====

  loadSale() {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('🔍 Loading sale with ID:', this.saleId);

    this.posService.getSaleById(this.saleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📊 Sale response:', response);
          this.isLoading = false;
          
          if (response.success && response.data) {
            this.sale = response.data;
            console.log('✅ Sale loaded:', this.sale);
            console.log('📋 Sale items:', this.sale?.items);
            
            // Validate each item's data
            if (this.sale && this.sale.items) {
              this.sale.items.forEach((item, index) => {
                console.log(`📦 Item ${index}:`, {
                  name: item.productName,
                  quantity: item.quantity,
                  sellPrice: item.sellPrice,
                  subtotal: item.subtotal,
                  discount: item.discount
                });
              });
            }
            
            this.generateDigitalReceiptUrl();
          } else {
            this.errorMessage = response.message || 'Transaksi tidak ditemukan';
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Gagal memuat data transaksi';
          console.error('❌ Error loading sale:', error);
        }
      });
  }

  // ===== FORMATTERS - ENHANCED WITH DEBUGGING =====

  formatCurrency(amount: number | string | undefined | null): string {
    console.log('💰 Formatting currency:', amount, typeof amount);
    
    // Handle various input types
    let numericAmount: number;
    
    if (amount == null || amount === undefined) {
      console.warn('⚠️ Currency amount is null/undefined');
      numericAmount = 0;
    } else if (typeof amount === 'string') {
      numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        console.warn('⚠️ Cannot parse string to number:', amount);
        numericAmount = 0;
      }
    } else if (typeof amount === 'number') {
      if (isNaN(amount)) {
        console.warn('⚠️ Amount is NaN');
        numericAmount = 0;
      } else {
        numericAmount = amount;
      }
    } else {
      console.warn('⚠️ Unknown amount type:', typeof amount);
      numericAmount = 0;
    }

    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericAmount);

    console.log('✅ Formatted currency result:', formatted);
    return formatted;
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('⚠️ Invalid date:', date);
      return '-';
    }
    
    return dateObj.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
  }

  formatTime(date: Date | string): string {
    if (!date) return '-';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('⚠️ Invalid date:', date);
      return '-';
    }
    
    return dateObj.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta',
      hour12: false
    });
  }

  getPaymentMethodLabel(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Tunai',
      'card': 'Kartu Debit/Kredit',
      'digital': 'Digital/E-wallet',
      'transfer': 'Transfer Bank',
      'qris': 'QRIS'
    };
    return methods[method?.toLowerCase()] || method || 'Tidak diketahui';
  }

  // ===== CALCULATIONS - ENHANCED WITH VALIDATION =====

  getPointsEarned(): number {
    if (!this.sale || !this.sale.memberId || !this.sale.total) return 0;
    
    // Calculate points: 1 point per 1000 IDR
    const points = Math.floor(this.sale.total / 1000);
    console.log('🎯 Points calculation:', this.sale.total, '/ 1000 =', points);
    return points;
  }

  getTotalItems(): number {
    if (!this.sale || !this.sale.items || !Array.isArray(this.sale.items)) {
      console.warn('⚠️ No items in sale');
      return 0;
    }
    
    const total = this.sale.items.reduce((sum, item) => {
      const quantity = this.toNumber(item.quantity);
      console.log('📊 Item quantity:', item.productName, quantity);
      return sum + quantity;
    }, 0);
    
    console.log('📦 Total items:', total);
    return total;
  }

  // ===== HELPER METHODS - NEW =====

  /**
   * Safe number conversion with logging
   */
  private toNumber(value: any): number {
    if (value === null || value === undefined) {
      console.log('🔢 toNumber: null/undefined -> 0');
      return 0;
    }
    
    if (typeof value === 'number') {
      if (isNaN(value)) {
        console.warn('🔢 toNumber: NaN -> 0');
        return 0;
      }
      return value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        console.warn('🔢 toNumber: unparseable string', value, '-> 0');
        return 0;
      }
      return parsed;
    }
    
    console.warn('🔢 toNumber: unknown type', typeof value, '-> 0');
    return 0;
  }

  /**
   * Calculate item subtotal with proper validation
   */
  calculateItemSubtotal(item: any): number {
    if (!item) {
      console.warn('⚠️ calculateItemSubtotal: no item');
      return 0;
    }

    const quantity = this.toNumber(item.quantity);
    const sellPrice = this.toNumber(item.sellPrice);
    const discount = this.toNumber(item.discount);

    console.log('🧮 Item calculation:', {
      product: item.productName,
      quantity,
      sellPrice,
      discount,
      subtotalFromAPI: item.subtotal
    });

    // Use API subtotal if available and valid
    if (item.subtotal && !isNaN(item.subtotal)) {
      console.log('✅ Using API subtotal:', item.subtotal);
      return this.toNumber(item.subtotal);
    }

    // Calculate manually if API subtotal is not available
    const baseAmount = sellPrice * quantity;
    const discountAmount = baseAmount * (discount / 100);
    const calculatedSubtotal = baseAmount - discountAmount;

    console.log('🧮 Manual calculation:', {
      baseAmount,
      discountAmount,
      calculatedSubtotal
    });

    return calculatedSubtotal;
  }

  /**
   * Validate sale data integrity
   */
  private validateSaleData(): boolean {
    if (!this.sale) {
      console.error('❌ No sale data');
      return false;
    }

    console.log('🔍 Validating sale data...');

    // Check basic sale properties
    const requiredProps = ['id', 'saleNumber', 'total', 'items'];
    for (const prop of requiredProps) {
      if (!this.sale[prop as keyof SaleDto]) {
        console.error(`❌ Missing required property: ${prop}`);
        return false;
      }
    }

    // Check items array
    if (!Array.isArray(this.sale.items)) {
      console.error('❌ Items is not an array');
      return false;
    }

    if (this.sale.items.length === 0) {
      console.warn('⚠️ No items in sale');
      return false;
    }

    // Validate each item
    this.sale.items.forEach((item, index) => {
      const issues = [];
      
      if (!item.productName) issues.push('missing productName');
      if (!item.quantity || item.quantity <= 0) issues.push('invalid quantity');
      if (!item.sellPrice || item.sellPrice <= 0) issues.push('invalid sellPrice');
      
      if (issues.length > 0) {
        console.warn(`⚠️ Item ${index} issues:`, issues.join(', '));
      }
    });

    console.log('✅ Sale data validation passed');
    return true;
  }

  // ===== ACTIONS - ENHANCED =====

  async printReceipt() {
    if (!this.sale) {
      this.errorMessage = 'Tidak ada data struk untuk dicetak';
      this.clearMessages();
      return;
    }

    if (!this.validateSaleData()) {
      this.errorMessage = 'Data struk tidak valid';
      this.clearMessages();
      return;
    }

    try {
      console.log('🖨️ Printing receipt for sale:', this.sale.id);
      await this.receiptService.printReceipt(this.sale.id);
      this.showSuccessMessage('Struk berhasil dicetak');
    } catch (error: any) {
      console.error('❌ Print error:', error);
      this.errorMessage = error.message || 'Gagal mencetak struk';
      this.clearMessages();
    }
  }

  async downloadPDF() {
    if (!this.sale) {
      this.errorMessage = 'Tidak ada data struk untuk diunduh';
      this.clearMessages();
      return;
    }

    if (!this.validateSaleData()) {
      this.errorMessage = 'Data struk tidak valid';
      this.clearMessages();
      return;
    }

    try {
      console.log('📄 Downloading PDF for sale:', this.sale.id);
      await this.receiptService.downloadReceiptPDF(this.sale.id);
      this.showSuccessMessage('Struk PDF berhasil diunduh');
    } catch (error: any) {
      console.error('❌ PDF download error:', error);
      this.errorMessage = error.message || 'Gagal mengunduh PDF';
      this.clearMessages();
    }
  }

  async shareReceipt() {
    if (!this.sale) {
      this.errorMessage = 'Tidak ada data struk untuk dibagikan';
      this.clearMessages();
      return;
    }

    if (!this.validateSaleData()) {
      this.errorMessage = 'Data struk tidak valid';
      this.clearMessages();
      return;
    }

    try {
      console.log('📤 Sharing receipt for sale:', this.sale.id);
      await this.receiptService.shareReceipt(this.sale.id, 'native');
      this.showSuccessMessage('Struk berhasil dibagikan');
    } catch (error: any) {
      console.error('❌ Share error:', error);
      // Fallback to WhatsApp if native sharing fails
      try {
        await this.receiptService.shareReceipt(this.sale.id, 'whatsapp');
        this.showSuccessMessage('Struk dibagikan via WhatsApp');
      } catch (fallbackError: any) {
        console.error('❌ WhatsApp share error:', fallbackError);
        this.errorMessage = fallbackError.message || 'Gagal membagikan struk';
        this.clearMessages();
      }
    }
  }

  goBackToPOS() {
    this.router.navigate(['/pos']);
  }

  // ===== HELPERS =====

  private generateDigitalReceiptUrl() {
    if (this.sale) {
      // Generate URL for digital receipt (could be used for QR code)
      this.digitalReceiptUrl = `${window.location.origin}/receipt/digital/${this.sale.saleNumber}`;
      console.log('🔗 Digital receipt URL:', this.digitalReceiptUrl);
    }
  }

  private showSuccessMessage(message: string) {
    this.successMessage = message;
    this.clearMessages();
  }

  private clearMessages() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 3000);
  }
}