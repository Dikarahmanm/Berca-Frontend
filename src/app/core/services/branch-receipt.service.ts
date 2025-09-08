// src/app/core/services/branch-receipt.service.ts
// Branch-Aware Receipt Generation Service
// Angular 20 with Multi-Branch Support

import { Injectable, inject, signal, computed } from '@angular/core';
import { StateService } from './state.service';
import { BranchTransactionDto, BranchReceiptDto } from '../../modules/pos/services/branch-pos.service';

export interface BranchReceiptTemplate {
  branchId: number;
  branchName: string;
  branchCode: string;
  logoUrl?: string;
  headerText: string;
  address: string;
  phone: string;
  email?: string;
  taxId?: string;
  footerMessage: string;
  promotionMessage?: string;
  socialMedia?: {
    instagram?: string;
    whatsapp?: string;
    website?: string;
  };
  receiptStyle: 'standard' | 'compact' | 'detailed';
  paperSize: 'thermal58' | 'thermal80' | 'a4';
}

export interface ReceiptPrintOptions {
  copies: number;
  customerCopy: boolean;
  merchantCopy: boolean;
  showBarcode: boolean;
  showQRCode: boolean;
  showPromo: boolean;
  fontSize: 'small' | 'normal' | 'large';
}

@Injectable({
  providedIn: 'root'
})
export class BranchReceiptService {
  private readonly stateService = inject(StateService);

  // Signal-based state
  private _templates = signal<Map<number, BranchReceiptTemplate>>(new Map());
  private _defaultPrintOptions = signal<ReceiptPrintOptions>({
    copies: 1,
    customerCopy: true,
    merchantCopy: false,
    showBarcode: true,
    showQRCode: false,
    showPromo: true,
    fontSize: 'normal'
  });

  // Computed properties
  readonly activeBranch = this.stateService.activeBranch;
  readonly currentTemplate = computed(() => {
    const branch = this.activeBranch();
    if (!branch) return null;
    
    return this._templates().get(branch.branchId) || this.generateDefaultTemplate(branch.branchId);
  });

  constructor() {
    // Initialize default templates for all branches
    this.initializeDefaultTemplates();
  }

  // ===== RECEIPT GENERATION =====

  /**
   * Generate receipt HTML for printing
   */
  generateReceiptHTML(receiptData: BranchReceiptDto, options?: Partial<ReceiptPrintOptions>): string {
    const template = this.currentTemplate();
    if (!template) {
      throw new Error('No receipt template available for current branch');
    }

    const printOptions = { ...this._defaultPrintOptions(), ...options };
    
    return this.buildReceiptHTML(receiptData, template, printOptions);
  }

  /**
   * Generate thermal printer format
   */
  generateThermalReceipt(receiptData: BranchReceiptDto): string {
    const template = this.currentTemplate();
    if (!template) {
      throw new Error('No receipt template available for current branch');
    }

    return this.buildThermalReceipt(receiptData, template);
  }

  /**
   * Print receipt using browser print API
   */
  printReceipt(receiptData: BranchReceiptDto, options?: Partial<ReceiptPrintOptions>): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const htmlContent = this.generateReceiptHTML(receiptData, options);
        
        // Create print window
        const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');
        if (!printWindow) {
          resolve(false);
          return;
        }

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
            resolve(true);
          }, 500);
        };
        
      } catch (error) {
        console.error('Print error:', error);
        resolve(false);
      }
    });
  }

  // ===== TEMPLATE MANAGEMENT =====

  /**
   * Update template for specific branch
   */
  updateBranchTemplate(branchId: number, template: Partial<BranchReceiptTemplate>): void {
    const current = this._templates().get(branchId) || this.generateDefaultTemplate(branchId);
    const updated = { ...current, ...template };
    
    this._templates.update(templates => {
      const newTemplates = new Map(templates);
      newTemplates.set(branchId, updated);
      return newTemplates;
    });

    console.log('📄 Branch receipt template updated for branch:', branchId);
  }

  /**
   * Get template for specific branch
   */
  getBranchTemplate(branchId: number): BranchReceiptTemplate | null {
    return this._templates().get(branchId) || null;
  }

  /**
   * Set default print options
   */
  setDefaultPrintOptions(options: Partial<ReceiptPrintOptions>): void {
    this._defaultPrintOptions.update(current => ({ ...current, ...options }));
  }

  // ===== PRIVATE METHODS =====

  private initializeDefaultTemplates(): void {
    const branches = this.stateService.accessibleBranches();
    const templates = new Map<number, BranchReceiptTemplate>();

    branches.forEach(branch => {
      templates.set(branch.branchId, this.generateDefaultTemplate(branch.branchId));
    });

    this._templates.set(templates);
    console.log('📄 Initialized receipt templates for', templates.size, 'branches');
  }

  private generateDefaultTemplate(branchId: number): BranchReceiptTemplate {
    const branch = this.stateService.accessibleBranches().find(b => b.branchId === branchId);
    
    const templates: Record<number, Partial<BranchReceiptTemplate>> = {
      1: { // Head Office
        headerText: 'TOKO ENIWAN',
        address: 'Jl. Sudirman No. 123, Jakarta Pusat',
        phone: '+62-21-1234-5678',
        email: 'info@tokoeniwan.com',
        footerMessage: 'Terima kasih atas kunjungan Anda!\nSimpan struk untuk keperluan garansi',
        promotionMessage: 'Dapatkan promo menarik setiap hari!',
        socialMedia: {
          instagram: '@tokoeniwan_official',
          whatsapp: '+62-812-3456-7890',
          website: 'www.tokoeniwan.com'
        }
      },
      2: { // Bekasi Branch
        headerText: 'TOKO ENIWAN - BEKASI',
        address: 'Jl. Raya Bekasi No. 456, Bekasi',
        phone: '+62-21-8765-4321',
        email: 'bekasi@tokoeniwan.com',
        footerMessage: 'Terima kasih telah berbelanja!\nKunjungi kami lagi ya!',
        promotionMessage: 'Member baru dapat diskon 10%!',
        socialMedia: {
          instagram: '@tokoeniwan_bekasi',
          whatsapp: '+62-812-1111-2222'
        }
      },
      3: { // Tangerang Branch
        headerText: 'TOKO ENIWAN - TANGERANG',
        address: 'Jl. BSD Raya No. 789, Tangerang Selatan',
        phone: '+62-21-5555-6666',
        email: 'tangerang@tokoeniwan.com',
        footerMessage: 'Belanja hemat, kualitas terjamin!\nFollow IG kami untuk info promo',
        promotionMessage: 'Gratis ongkir pembelian > 100rb!',
        socialMedia: {
          instagram: '@tokoeniwan_tangerang',
          whatsapp: '+62-812-3333-4444'
        }
      }
    };

    const defaultTemplate: BranchReceiptTemplate = {
      branchId,
      branchName: branch?.branchName || `Branch ${branchId}`,
      branchCode: branch?.branchCode || `BR${branchId.toString().padStart(3, '0')}`,
      headerText: 'TOKO ENIWAN',
      address: 'Alamat tidak tersedia',
      phone: '+62-21-0000-0000',
      footerMessage: 'Terima kasih atas kunjungan Anda!',
      receiptStyle: 'standard',
      paperSize: 'thermal80',
      ...templates[branchId]
    };

    return defaultTemplate;
  }

  private buildReceiptHTML(
    receiptData: BranchReceiptDto, 
    template: BranchReceiptTemplate, 
    options: ReceiptPrintOptions
  ): string {
    const now = new Date();
    const receiptDate = new Date(receiptData.transactionDate);

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - ${receiptData.receiptNumber}</title>
      <style>
        ${this.getReceiptCSS(template, options)}
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Header -->
        <div class="header">
          ${template.logoUrl ? `<img src="${template.logoUrl}" alt="Logo" class="logo">` : ''}
          <h1 class="store-name">${template.headerText}</h1>
          <div class="store-info">
            <div>${template.address}</div>
            <div>${template.phone}</div>
            ${template.email ? `<div>${template.email}</div>` : ''}
          </div>
        </div>

        <!-- Transaction Info -->
        <div class="transaction-info">
          <div class="info-row">
            <span>No. Struk:</span>
            <span>${receiptData.receiptNumber}</span>
          </div>
          <div class="info-row">
            <span>Tanggal:</span>
            <span>${this.formatDate(receiptDate)}</span>
          </div>
          <div class="info-row">
            <span>Waktu:</span>
            <span>${this.formatTime(receiptDate)}</span>
          </div>
          <div class="info-row">
            <span>Kasir:</span>
            <span>${receiptData.cashierName}</span>
          </div>
          ${receiptData.memberName ? `
          <div class="info-row">
            <span>Member:</span>
            <span>${receiptData.memberName}</span>
          </div>
          ` : ''}
        </div>

        <!-- Items -->
        <div class="items">
          <div class="items-header">
            <span>Item</span>
            <span>Qty</span>
            <span>Harga</span>
            <span>Total</span>
          </div>
          ${receiptData.items.map(item => `
          <div class="item-row">
            <div class="item-name">${item.productName}</div>
            <div class="item-details">
              <span>${item.quantity}</span>
              <span>${this.formatCurrency(item.unitPrice)}</span>
              <span>${this.formatCurrency(item.subtotal)}</span>
            </div>
          </div>
          `).join('')}
        </div>

        <!-- Totals -->
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(receiptData.subtotal)}</span>
          </div>
          ${receiptData.discount > 0 ? `
          <div class="total-row">
            <span>Diskon:</span>
            <span>-${this.formatCurrency(receiptData.discount)}</span>
          </div>
          ` : ''}
          ${receiptData.memberDiscount && receiptData.memberDiscount > 0 ? `
          <div class="total-row">
            <span>Member Diskon:</span>
            <span>-${this.formatCurrency(receiptData.memberDiscount)}</span>
          </div>
          ` : ''}
          ${receiptData.tax > 0 ? `
          <div class="total-row">
            <span>Pajak:</span>
            <span>${this.formatCurrency(receiptData.tax)}</span>
          </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>${this.formatCurrency(receiptData.total)}</span>
          </div>
        </div>

        <!-- Payment -->
        <div class="payment">
          <div class="payment-row">
            <span>Metode Bayar:</span>
            <span>${this.getPaymentMethodName(receiptData.paymentMethod)}</span>
          </div>
          <div class="payment-row">
            <span>Dibayar:</span>
            <span>${this.formatCurrency(receiptData.amountPaid)}</span>
          </div>
          ${receiptData.change > 0 ? `
          <div class="payment-row">
            <span>Kembalian:</span>
            <span>${this.formatCurrency(receiptData.change)}</span>
          </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div class="footer">
          ${template.promotionMessage && options.showPromo ? `
          <div class="promo">${template.promotionMessage}</div>
          ` : ''}
          
          <div class="footer-message">${template.footerMessage}</div>
          
          ${template.socialMedia ? `
          <div class="social-media">
            ${template.socialMedia.instagram ? `<div>IG: ${template.socialMedia.instagram}</div>` : ''}
            ${template.socialMedia.whatsapp ? `<div>WA: ${template.socialMedia.whatsapp}</div>` : ''}
            ${template.socialMedia.website ? `<div>${template.socialMedia.website}</div>` : ''}
          </div>
          ` : ''}

          ${options.showBarcode ? `
          <div class="barcode">*${receiptData.receiptNumber}*</div>
          ` : ''}
        </div>

        <!-- Print Info -->
        <div class="print-info">
          <small>Dicetak: ${this.formatDateTime(now)}</small>
          ${options.customerCopy ? '<small>- Customer Copy -</small>' : ''}
          ${options.merchantCopy ? '<small>- Merchant Copy -</small>' : ''}
        </div>
      </div>
    </body>
    </html>`;
  }

  private buildThermalReceipt(receiptData: BranchReceiptDto, template: BranchReceiptTemplate): string {
    // ESC/POS commands for thermal printing
    const ESC = '\x1B';
    const commands = {
      init: ESC + '@',
      center: ESC + 'a1',
      left: ESC + 'a0',
      bold: ESC + 'E1',
      normal: ESC + 'E0',
      doubleWidth: ESC + '!1',
      normalWidth: ESC + '!0',
      cut: ESC + 'd3' + ESC + 'i',
      newLine: '\n'
    };

    let output = commands.init;

    // Header
    output += commands.center + commands.bold + commands.doubleWidth;
    output += template.headerText + commands.newLine;
    output += commands.normalWidth + commands.normal;
    output += template.address + commands.newLine;
    output += template.phone + commands.newLine;
    output += commands.newLine;

    // Transaction details
    output += commands.left;
    output += `No: ${receiptData.receiptNumber}` + commands.newLine;
    output += `Tgl: ${this.formatDate(new Date(receiptData.transactionDate))}` + commands.newLine;
    output += `Kasir: ${receiptData.cashierName}` + commands.newLine;
    output += '--------------------------------' + commands.newLine;

    // Items
    receiptData.items.forEach(item => {
      output += `${item.productName}` + commands.newLine;
      output += `  ${item.quantity} x ${this.formatCurrency(item.unitPrice)}`;
      output += `  ${this.formatCurrency(item.subtotal)}` + commands.newLine;
    });

    output += '--------------------------------' + commands.newLine;

    // Totals
    output += `Subtotal: ${this.formatCurrency(receiptData.subtotal)}` + commands.newLine;
    if (receiptData.discount > 0) {
      output += `Diskon: -${this.formatCurrency(receiptData.discount)}` + commands.newLine;
    }
    if (receiptData.memberDiscount && receiptData.memberDiscount > 0) {
      output += `Member: -${this.formatCurrency(receiptData.memberDiscount)}` + commands.newLine;
    }
    
    output += commands.bold;
    output += `TOTAL: ${this.formatCurrency(receiptData.total)}` + commands.newLine;
    output += commands.normal;

    // Payment
    output += '--------------------------------' + commands.newLine;
    output += `Bayar: ${this.formatCurrency(receiptData.amountPaid)}` + commands.newLine;
    if (receiptData.change > 0) {
      output += `Kembali: ${this.formatCurrency(receiptData.change)}` + commands.newLine;
    }

    // Footer
    output += commands.newLine + commands.center;
    output += template.footerMessage + commands.newLine;
    output += commands.newLine;

    // Cut paper
    output += commands.cut;

    return output;
  }

  private getReceiptCSS(template: BranchReceiptTemplate, options: ReceiptPrintOptions): string {
    const fontSize = {
      small: '10px',
      normal: '12px',
      large: '14px'
    }[options.fontSize];

    return `
      @media print {
        body { margin: 0; padding: 0; }
        .receipt { break-inside: avoid; }
      }
      
      body {
        font-family: 'Courier New', monospace;
        font-size: ${fontSize};
        line-height: 1.4;
        margin: 0;
        padding: 10px;
        max-width: ${template.paperSize === 'thermal58' ? '200px' : '300px'};
      }
      
      .receipt {
        width: 100%;
        max-width: ${template.paperSize === 'thermal58' ? '200px' : '300px'};
        margin: 0 auto;
      }
      
      .header {
        text-align: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px dashed #000;
      }
      
      .logo {
        max-width: 80px;
        max-height: 60px;
        margin-bottom: 5px;
      }
      
      .store-name {
        font-size: ${options.fontSize === 'large' ? '18px' : '16px'};
        font-weight: bold;
        margin: 5px 0;
      }
      
      .store-info {
        font-size: ${options.fontSize === 'large' ? '12px' : '10px'};
        line-height: 1.3;
      }
      
      .transaction-info, .payment {
        margin: 10px 0;
        padding: 5px 0;
      }
      
      .info-row, .payment-row, .total-row {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
      }
      
      .items {
        margin: 15px 0;
        border-top: 1px dashed #000;
        border-bottom: 1px dashed #000;
        padding: 10px 0;
      }
      
      .items-header {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        font-weight: bold;
        padding-bottom: 5px;
        border-bottom: 1px solid #000;
        font-size: ${options.fontSize === 'small' ? '9px' : '10px'};
      }
      
      .item-row {
        margin: 5px 0;
      }
      
      .item-name {
        font-weight: bold;
        margin-bottom: 2px;
      }
      
      .item-details {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        font-size: ${options.fontSize === 'small' ? '9px' : '10px'};
        text-align: right;
      }
      
      .totals {
        margin: 10px 0;
        padding-top: 10px;
        border-top: 1px dashed #000;
      }
      
      .grand-total {
        font-weight: bold;
        font-size: ${options.fontSize === 'large' ? '14px' : '12px'};
        border-top: 1px solid #000;
        padding-top: 5px;
        margin-top: 5px;
      }
      
      .footer {
        text-align: center;
        margin-top: 15px;
        padding-top: 10px;
        border-top: 1px dashed #000;
        font-size: ${options.fontSize === 'large' ? '11px' : '9px'};
      }
      
      .promo {
        background: #f0f0f0;
        padding: 5px;
        margin: 5px 0;
        border: 1px dashed #000;
      }
      
      .social-media {
        margin: 10px 0;
        line-height: 1.2;
      }
      
      .barcode {
        font-family: 'Courier New', monospace;
        font-size: 14px;
        letter-spacing: 2px;
        margin: 10px 0;
      }
      
      .print-info {
        text-align: center;
        margin-top: 15px;
        padding-top: 5px;
        border-top: 1px dotted #ccc;
        font-size: 8px;
        color: #666;
      }
    `;
  }

  private getPaymentMethodName(method: string): string {
    const methods: Record<string, string> = {
      'cash': 'Tunai',
      'card': 'Kartu Debit/Kredit',
      'digital': 'Dompet Digital',
      'credit': 'Kredit Toko'
    };
    return methods[method] || method;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private formatDateTime(date: Date): string {
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  }
}