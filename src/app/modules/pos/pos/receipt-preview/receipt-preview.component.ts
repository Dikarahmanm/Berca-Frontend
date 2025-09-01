import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { POSService, SaleDto } from '../../../../core/services/pos.service';
import { ReceiptService } from '../../../../core/services/receipt.service';
import { environment } from '../../../../../environment/environment';

// Enhanced Receipt Header Interface
export interface ReceiptHeader {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  logoUrl?: string;
  footerMessage: string;
  showDateTime: boolean;
  showTransactionNumber: boolean;
  showCashier: boolean;
  theme: 'classic' | 'modern' | 'minimal';
  fontSize: 'small' | 'medium' | 'large';
}

export interface ReceiptPrintOptions {
  copies: number;
  includeLogo: boolean;
  includeFooter: boolean;
  includeQR: boolean;
  paperSize: '58mm' | '80mm' | 'A4';
}

@Component({
  selector: 'app-receipt-preview',
  templateUrl: './receipt-preview.component.html',
  styleUrls: ['./receipt-preview.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptPreviewComponent implements OnInit {
  // Inject services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private posService = inject(POSService);
  private receiptService = inject(ReceiptService);

  // Signal-based state
  sale = signal<SaleDto | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  successMessage = signal<string>('');
  digitalReceiptUrl = signal<string>('');

  // Receipt Header Configuration (Enhanced)
  receiptHeader = signal<ReceiptHeader>({
    storeName: environment.pos?.receiptSettings?.storeName || 'Toko Eniwan',
    storeAddress: environment.pos?.receiptSettings?.storeAddress || 'Bekasi, West Java',
    storePhone: environment.pos?.receiptSettings?.storePhone || '+62 xxx-xxxx-xxxx',
    storeEmail: environment.pos?.receiptSettings?.storeEmail || 'info@tokoeniwan.com',
    logoUrl: environment.pos?.receiptSettings?.logoUrl,
    footerMessage: environment.pos?.receiptSettings?.footerMessage || 'Terima kasih atas kunjungan Anda!',
    showDateTime: true,
    showTransactionNumber: true,
    showCashier: true,
    theme: 'classic',
    fontSize: 'medium'
  });

  // Print options
  printOptions = signal<ReceiptPrintOptions>({
    copies: 1,
    includeLogo: true,
    includeFooter: true,
    includeQR: true,
    paperSize: '80mm'
  });

  // Computed properties
  receiptThemeClass = computed(() => {
    const header = this.receiptHeader();
    return `receipt-theme-${header.theme} receipt-size-${header.fontSize}`;
  });

  totalItems = computed(() => {
    const saleData = this.sale();
    if (!saleData?.items || !Array.isArray(saleData.items)) return 0;
    
    return saleData.items.reduce((sum: number, item: any) => {
      return sum + this.getItemQuantity(item);
    }, 0);
  });

  pointsEarned = computed(() => {
    const saleData = this.sale();
    if (!saleData?.memberId || !saleData?.total) return 0;
    return Math.floor(saleData.total / 1000);
  });

  canPrint = computed(() => {
    return this.sale() !== null && !this.loading();
  });

  ngOnInit(): void {
    this.loadTransactionFromRoute();
  }

  // Enhanced data loading with route parameter handling
  private async loadTransactionFromRoute(): Promise<void> {
    const transactionId = this.route.snapshot.params['transactionId'];
    
    if (!transactionId || isNaN(Number(transactionId))) {
      this.error.set('ID transaksi tidak valid');
      this.loading.set(false);
      return;
    }

    await this.loadSale(Number(transactionId));
  }

  // Enhanced sale loading with better error handling
  private async loadSale(saleId: number): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      const response = await this.posService.getSaleById(saleId).toPromise();
      
      if (response?.success && response.data) {
        this.sale.set(response.data);
        this.generateDigitalReceiptUrl();
      } else {
        this.error.set(response?.message || 'Transaksi tidak ditemukan');
      }
    } catch (error: any) {
      console.error('Error loading sale:', error);
      this.error.set('Gagal memuat data transaksi');
    } finally {
      this.loading.set(false);
    }
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
    const saleData = this.sale();
    if (saleData && saleData.items && saleData.items.length === 1) {
      return this.toNumber(saleData.total || saleData.subtotal || 0);
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
    const saleData = this.sale();
    if (saleData && saleData.items && saleData.items.length === 1) {
      return this.toNumber(saleData.total || saleData.subtotal || 0);
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

  // ===== CALCULATIONS (Legacy wrapper methods) =====

  // These methods are kept for backward compatibility with template
  // They delegate to the computed signals

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

  // ===== RECEIPT HEADER CONFIGURATION METHODS =====

  updateReceiptHeader(headerUpdate: Partial<ReceiptHeader>): void {
    this.receiptHeader.update(current => ({ ...current, ...headerUpdate }));
  }

  updatePrintOptions(optionsUpdate: Partial<ReceiptPrintOptions>): void {
    this.printOptions.update(current => ({ ...current, ...optionsUpdate }));
  }

  previewReceiptTheme(theme: ReceiptHeader['theme']): void {
    this.updateReceiptHeader({ theme });
  }

  adjustReceiptFontSize(fontSize: ReceiptHeader['fontSize']): void {
    this.updateReceiptHeader({ fontSize });
  }

  // ===== ENHANCED ACTIONS =====

  async printReceipt(): Promise<void> {
    const saleData = this.sale();
    if (!saleData) {
      this.showErrorMessage('Tidak ada data struk untuk dicetak');
      return;
    }

    try {
      this.loading.set(true);
      console.log('🖨️ Starting print process for sale:', saleData.id);
      
      // Pass both receipt configuration and print options
      const receiptConfig = this.receiptHeader();
      const printOptions = this.printOptions();
      await this.receiptService.printReceipt(saleData.id, receiptConfig, printOptions);
      this.showSuccessMessage('Struk berhasil dicetak');
    } catch (error: any) {
      console.error('❌ Print failed:', error);
      this.showErrorMessage(error.message || 'Gagal mencetak struk');
    } finally {
      this.loading.set(false);
    }
  }

  // ===== NEW: BRANCH-AWARE RECEIPT ACTIONS =====

  async printBranchReceipt(): Promise<void> {
    const saleData = this.sale();
    if (!saleData) {
      this.showErrorMessage('Tidak ada data struk untuk dicetak');
      return;
    }

    try {
      this.loading.set(true);
      console.log('🖨️🏢 Starting branch-aware print process for sale:', saleData.id);
      
      // Create branch-specific config from current header settings
      const branchReceiptConfig = this.getBranchReceiptConfig();
      const printOptions = this.printOptions();
      
      await this.receiptService.printBranchReceipt(saleData.id, branchReceiptConfig, printOptions);
      this.showSuccessMessage('Struk branch berhasil dicetak');
    } catch (error: any) {
      console.error('❌ Branch print failed:', error);
      this.showErrorMessage(error.message || 'Gagal mencetak struk branch');
    } finally {
      this.loading.set(false);
    }
  }

  async downloadBranchPDF(): Promise<void> {
    const saleData = this.sale();
    if (!saleData) {
      this.showErrorMessage('Tidak ada data struk untuk diunduh');
      return;
    }

    try {
      this.loading.set(true);
      console.log('📄🏢 Starting branch-aware PDF download for sale:', saleData.id);
      
      // Create branch-specific config from current header settings
      const branchReceiptConfig = this.getBranchReceiptConfig();
      const printOptions = this.printOptions();
      
      await this.receiptService.downloadBranchReceiptPDF(saleData.id, branchReceiptConfig, printOptions);
      this.showSuccessMessage('PDF struk branch berhasil didownload!');
    } catch (error: any) {
      console.error('❌ Branch PDF download error:', error);
      this.showErrorMessage(error.message || 'Gagal mengunduh PDF branch');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Helper method to convert current receipt header to branch receipt config
   */
  private getBranchReceiptConfig(): any {
    const headerConfig = this.receiptHeader();
    
    return {
      storeName: headerConfig.storeName,
      storeAddress: headerConfig.storeAddress,
      storePhone: headerConfig.storePhone,
      storeEmail: headerConfig.storeEmail,
      footerMessage: headerConfig.footerMessage,
      theme: headerConfig.theme,
      fontSize: headerConfig.fontSize,
      includeQR: this.printOptions().includeQR,
      includeLogo: this.printOptions().includeLogo,
      includeFooter: this.printOptions().includeFooter
    };
  }

  async downloadPDF(): Promise<void> {
    const saleData = this.sale();
    if (!saleData) {
      this.showErrorMessage('Tidak ada data struk untuk diunduh');
      return;
    }

    try {
      this.loading.set(true);
      console.log('📄 Starting PDF download for sale:', saleData.id);
      
      // Pass both receipt configuration and print options
      const receiptConfig = this.receiptHeader();
      const printOptions = this.printOptions();
      await this.receiptService.downloadReceiptPDF(saleData.id, receiptConfig, printOptions);
      this.showSuccessMessage('PDF struk berhasil didownload!');
    } catch (error: any) {
      console.error('❌ Download PDF error:', error);
      this.showErrorMessage(error.message || 'Gagal mengunduh PDF');
    } finally {
      this.loading.set(false);
    }
  }

  async shareReceipt(): Promise<void> {
    const saleData = this.sale();
    if (!saleData) {
      this.showErrorMessage('Tidak ada data struk untuk dibagikan');
      return;
    }

    try {
      // Pass both receipt configuration and print options
      const receiptConfig = this.receiptHeader();
      const printOptions = this.printOptions();
      await this.receiptService.shareReceipt(saleData.id, 'native', receiptConfig, printOptions);
      this.showSuccessMessage('Struk berhasil dibagikan');
    } catch (error: any) {
      console.error('❌ Share failed:', error);
      // If native share fails, try WhatsApp fallback
      try {
        const receiptConfig = this.receiptHeader();
        const printOptions = this.printOptions();
        await this.receiptService.shareReceipt(saleData.id, 'whatsapp', receiptConfig, printOptions);
        this.showSuccessMessage('Struk dibagikan via WhatsApp');
      } catch (fallbackError: any) {
        this.showErrorMessage(fallbackError.message || 'Gagal membagikan struk');
      }
    }
  }

  goBackToPOS(): void {
    this.router.navigate(['/dashboard/pos']);
  }

  // Retry loading sale data
  retryLoadSale(): void {
    const transactionId = this.route.snapshot.params['transactionId'];
    if (transactionId && !isNaN(Number(transactionId))) {
      this.loadSale(Number(transactionId));
    }
  }

  // ===== COMPUTED GETTERS (Convert legacy methods) =====

  getTotalItems(): number {
    return this.totalItems();
  }

  getPointsEarned(): number {
    return this.pointsEarned();
  }

  // ===== HELPERS =====

  private generateDigitalReceiptUrl(): void {
    const saleData = this.sale();
    if (saleData) {
      this.digitalReceiptUrl.set(
        `${window.location.origin}/receipt/digital/${saleData.saleNumber}`
      );
    }
  }

  private showSuccessMessage(message: string): void {
    this.successMessage.set(message);
    this.clearMessages();
  }

  private showErrorMessage(message: string): void {
    this.error.set(message);
    this.clearMessages();
  }

  private clearMessages(): void {
    setTimeout(() => {
      this.error.set(null);
      this.successMessage.set('');
    }, 3000);
  }

  // ===== UTILITY METHODS =====

  // TrackBy function for performance
  trackByItem = (index: number, item: any): number => item.id || index;

  // Enhanced receipt header validation
  validateReceiptHeader(): { isValid: boolean; errors: string[] } {
    const header = this.receiptHeader();
    const errors: string[] = [];

    if (!header.storeName.trim()) {
      errors.push('Nama toko tidak boleh kosong');
    }
    if (!header.storeAddress.trim()) {
      errors.push('Alamat toko tidak boleh kosong');
    }
    if (!header.storePhone.trim()) {
      errors.push('Telepon toko tidak boleh kosong');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Reset receipt header to default
  resetReceiptHeader(): void {
    this.receiptHeader.set({
      storeName: 'Toko Eniwan',
      storeAddress: 'Bekasi, West Java',
      storePhone: '+62 xxx-xxxx-xxxx',
      storeEmail: 'info@tokoeniwan.com',
      footerMessage: 'Terima kasih atas kunjungan Anda!',
      showDateTime: true,
      showTransactionNumber: true,
      showCashier: true,
      theme: 'classic',
      fontSize: 'medium'
    });
  }
}