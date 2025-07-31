// ✅ CLEAN VERSION: src/app/modules/pos/pos/receipt-preview/receipt-preview.component.ts

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
  storeInfo = environment.pos?.receiptSettings || {
    storeName: 'Toko Eniwan',
    storeAddress: 'Bekasi, West Java',
    storePhone: '+62 xxx-xxxx-xxxx',
    storeEmail: 'info@tokoeniwan.com',
    footerMessage: 'Terima kasih atas kunjungan Anda!'
  };

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

  // ===== DATA LOADING =====

  loadSale() {
    this.isLoading = true;
    this.errorMessage = '';

    this.posService.getSaleById(this.saleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.sale = response.data;
            this.generateDigitalReceiptUrl();
          } else {
            this.errorMessage = response.message || 'Transaksi tidak ditemukan';
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Gagal memuat data transaksi';
          console.error('❌ Error loading sale:', error);
        }
      });
  }

  // ===== FIELD MAPPING WITH COMPREHENSIVE FALLBACKS =====

  getItemPrice(item: any): number {
    if (!item) return 0;

    const priceFields = ['unitPrice', 'sellPrice', 'price', 'salePrice'];
    
    for (const field of priceFields) {
      const value = item[field];
      if (value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) > 0) {
        return this.toNumber(value);
      }
    }
    
    // Fallback: Calculate from sale total if only one item
    if (this.sale && this.sale.items && this.sale.items.length === 1) {
      return this.toNumber(this.sale.total || this.sale.subtotal || 0);
    }
    
    return 0;
  }

  getItemSubtotal(item: any): number {
    if (!item) return 0;

    const subtotalFields = ['subtotal', 'subTotal', 'totalPrice', 'total', 'amount'];
    
    for (const field of subtotalFields) {
      const value = item[field];
      if (value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) >= 0) {
        return this.toNumber(value);
      }
    }
    
    // Manual calculation as fallback
    const quantity = this.getItemQuantity(item);
    const price = this.getItemPrice(item);
    const discount = this.getItemDiscount(item);
    
    if (price > 0) {
      const baseAmount = price * quantity;
      const discountAmount = baseAmount * (discount / 100);
      return baseAmount - discountAmount;
    }
    
    // Ultimate fallback: Use sale total if single item
    if (this.sale && this.sale.items && this.sale.items.length === 1) {
      return this.toNumber(this.sale.total || this.sale.subtotal || 0);
    }
    
    return 0;
  }

  getItemQuantity(item: any): number {
    if (!item) return 1;
    
    const quantityFields = ['quantity', 'qty', 'amount', 'count'];
    
    for (const field of quantityFields) {
      const value = item[field];
      if (value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) > 0) {
        return this.toNumber(value);
      }
    }
    
    return 1;
  }

  getItemDiscount(item: any): number {
    if (!item) return 0;
    
    const discountFields = ['discount', 'discountPercent', 'discountPercentage'];
    
    for (const field of discountFields) {
      const value = item[field];
      if (value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) >= 0) {
        return this.toNumber(value);
      }
    }
    
    return 0;
  }

  // ===== FORMATTERS =====

  formatCurrency(amount: number | string | undefined | null): string {
    let numericAmount: number;
    
    if (amount == null || amount === undefined) {
      numericAmount = 0;
    } else if (typeof amount === 'string') {
      numericAmount = parseFloat(amount) || 0;
    } else if (typeof amount === 'number') {
      numericAmount = isNaN(amount) ? 0 : amount;
    } else {
      numericAmount = 0;
    }

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericAmount);
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '-';
    
    return dateObj.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  }

  formatTime(date: Date | string): string {
    if (!date) return '-';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '-';
    
    // ✅ FIXED: Use simple toLocaleTimeString without timezone
    return dateObj.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
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

  // ===== CALCULATIONS =====

  getPointsEarned(): number {
    if (!this.sale || !this.sale.memberId || !this.sale.total) return 0;
    return Math.floor(this.sale.total / 1000);
  }

  getTotalItems(): number {
    if (!this.sale || !this.sale.items || !Array.isArray(this.sale.items)) return 0;
    
    return this.sale.items.reduce((sum: number, item: any) => {
      return sum + this.getItemQuantity(item);
    }, 0);
  }

  // ===== HELPER METHODS =====

  toNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'string') {
      if (value.trim() === '') return 0;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // ===== ACTIONS =====

  async printReceipt() {
    if (!this.sale) {
      this.errorMessage = 'Tidak ada data struk untuk dicetak';
      this.clearMessages();
      return;
    }

    try {
      console.log('🖨️ Starting print process for sale:', this.sale.id);
      await this.receiptService.printReceipt(this.sale.id);
      this.showSuccessMessage('Struk berhasil dicetak');
    } catch (error: any) {
      console.error('❌ Print failed:', error);
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

    try {
      console.log('📄 Starting PDF download for sale:', this.sale.id);
      
      // Show user options
      const userChoice = confirm(
        'Pilih cara download PDF:\n\n' +
        'OK = Download file HTML (kemudian convert ke PDF)\n' + 
        'Cancel = Buka window print (langsung save as PDF)'
      );
      
      if (userChoice) {
        // Option 1: Download HTML file
        await this.receiptService.downloadReceiptPDF(this.sale.id);
        this.showSuccessMessage('File HTML berhasil didownload. Buka file tersebut dan tekan Ctrl+P untuk save as PDF');
      } else {
        // Option 2: Open print window
        window.print();
        this.showSuccessMessage('Window print telah dibuka. Pilih "Save as PDF" di dialog print');
      }
      
    } catch (error: any) {
      console.error('❌ PDF download failed:', error);
      this.errorMessage = error.message || 'Gagal mendownload PDF';
      this.clearMessages();
    }
  }

  async shareReceipt() {
    if (!this.sale) {
      this.errorMessage = 'Tidak ada data struk untuk dibagikan';
      this.clearMessages();
      return;
    }

    try {
      await this.receiptService.shareReceipt(this.sale.id, 'native');
      this.showSuccessMessage('Struk berhasil dibagikan');
    } catch (error: any) {
      console.error('❌ Share failed:', error);
      // If native share fails, try WhatsApp fallback
      try {
        await this.receiptService.shareReceipt(this.sale.id, 'whatsapp');
        this.showSuccessMessage('Struk dibagikan via WhatsApp');
      } catch (fallbackError: any) {
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
      this.digitalReceiptUrl = `${window.location.origin}/receipt/digital/${this.sale.saleNumber}`;
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