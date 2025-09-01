import { Injectable, ElementRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { POSService, SaleDto, ReceiptDataDto } from './pos.service';
// NEW: Branch-aware imports
import { BranchReceiptDto } from '../../modules/pos/services/branch-pos.service';
import { StateService } from './state.service';
import { environment } from '../../../environment/environment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// NEW: Branch-specific receipt configuration
export interface BranchReceiptConfig {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  branchName?: string;
  branchCode?: string;
  branchAddress?: string;
  branchPhone?: string;
  branchManager?: string;
  companyLogo?: string;
  footerMessage?: string;
  branchSpecificMessage?: string;
  theme?: 'classic' | 'modern' | 'minimal' | 'branch';
  fontSize?: 'small' | 'medium' | 'large';
  includeQR?: boolean;
  includeLogo?: boolean;
  includeFooter?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private readonly apiUrl = environment.apiUrl;
  // NEW: Inject StateService for branch context
  private readonly stateService = inject(StateService);

  constructor(
    private http: HttpClient,
    private posService: POSService
  ) { }

  // ===== NEW: BRANCH-AWARE RECEIPT METHODS =====

  /**
   * Get branch-specific receipt configuration
   */
  private getBranchReceiptConfig(saleData?: any, customConfig?: BranchReceiptConfig): BranchReceiptConfig {
    // Get current active branch from state service
    const activeBranch = this.stateService.activeBranch();
    const user = this.stateService.user();

    // Default company info
    const defaultConfig: BranchReceiptConfig = {
      storeName: 'Toko Eniwan',
      storeAddress: 'Bekasi, West Java, Indonesia',
      storePhone: '+62 xxx-xxxx-xxxx',
      storeEmail: 'info@tokoeniwan.com',
      footerMessage: 'Terima kasih atas kunjungan Anda!',
      theme: 'branch',
      fontSize: 'medium',
      includeQR: true,
      includeLogo: true,
      includeFooter: true
    };

    // Branch-specific configuration
    const branchConfig: Partial<BranchReceiptConfig> = {};
    
    if (activeBranch) {
      branchConfig.branchName = activeBranch.branchName;
      branchConfig.branchCode = activeBranch.branchCode;
      // BranchAccessDto doesn't have address/phone, use defaults
      branchConfig.branchAddress = defaultConfig.storeAddress;
      branchConfig.branchPhone = defaultConfig.storePhone;
      branchConfig.branchManager = user?.username || 'Branch Manager';
      branchConfig.branchSpecificMessage = this.getBranchSpecificMessage(activeBranch.branchCode);
    }

    // If sale data contains branch info (from BranchPOSService), use that
    if (saleData?.branchName) {
      branchConfig.branchName = saleData.branchName;
      branchConfig.branchCode = saleData.branchCode;
      branchConfig.branchAddress = saleData.branchAddress || branchConfig.branchAddress;
      branchConfig.branchPhone = saleData.branchPhone || branchConfig.branchPhone;
      branchConfig.branchManager = saleData.branchManager || branchConfig.branchManager;
    }

    // Merge configurations: default < branch < custom
    return {
      ...defaultConfig,
      ...branchConfig,
      ...customConfig
    };
  }

  /**
   * Get branch-specific footer message
   */
  private getBranchSpecificMessage(branchCode?: string): string {
    const messages: Record<string, string> = {
      'HQ': 'Kantor Pusat - Layanan Terpercaya',
      'CAB01': 'Cabang Utama - Melayani dengan Sepenuh Hati',
      'CAB02': 'Cabang Kedua - Kualitas Terjamin',
      'SUB01': 'Sub Cabang - Pelayanan Terdepan',
      'default': 'Kepuasan pelanggan adalah prioritas kami'
    };

    return messages[branchCode || 'default'] || messages['default'];
  }

  /**
   * NEW: Print receipt with branch-aware configuration
   */
  async printBranchReceipt(saleId: number, customConfig?: BranchReceiptConfig, printOptions?: any): Promise<void> {
    try {
      console.log('🖨️🏢 Printing branch-aware receipt for sale:', saleId);

      const saleResponse = await this.posService.getSaleById(saleId).toPromise();

      if (!saleResponse?.success || !saleResponse.data) {
        throw new Error('Failed to get sale data');
      }

      const sale = saleResponse.data;
      
      // Get branch-specific configuration
      const branchReceiptConfig = this.getBranchReceiptConfig(sale, customConfig);

      // Generate branch-aware HTML
      const printContent = this.generateBranchReceiptHTML(sale, branchReceiptConfig, printOptions);

      const printWindow = window.open('', '_blank', 'width=480,height=650');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();

        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();

            this.posService.markReceiptPrinted(saleId).subscribe({
              next: (response) => {
                console.log('✅ Branch receipt marked as printed:', response);
              },
              error: (error) => {
                console.warn('⚠️ Failed to mark branch receipt as printed:', error);
              }
            });

            setTimeout(() => {
              printWindow.close();
            }, 1000);
          }, 500);
        };
      } else {
        throw new Error('Failed to open print window - popup blocked?');
      }

    } catch (error) {
      console.error('❌ Print branch receipt error:', error);
      throw error;
    }
  }

  /**
   * Print receipt - MENGGUNAKAN HTML DARI PREVIEW COMPONENT
   */
  async printReceipt(saleId: number, receiptConfig?: any, printOptions?: any): Promise<void> {
    try {
      console.log('🖨️ Printing receipt for sale:', saleId);

      const saleResponse = await this.posService.getSaleById(saleId).toPromise();

      if (!saleResponse?.success || !saleResponse.data) {
        throw new Error('Failed to get sale data');
      }

      const sale = saleResponse.data;

      // Gunakan HTML yang sama dengan preview component
      const printContent = this.generateReceiptHTML(sale, receiptConfig, printOptions);

      const printWindow = window.open('', '_blank', 'width=480,height=650');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();

        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();

            this.posService.markReceiptPrinted(saleId).subscribe({
              next: (response) => {
                console.log('✅ Receipt marked as printed:', response);
              },
              error: (error) => {
                console.warn('⚠️ Failed to mark receipt as printed:', error);
              }
            });

            setTimeout(() => {
              printWindow.close();
            }, 1000);
          }, 500);
        };
      } else {
        throw new Error('Failed to open print window - popup blocked?');
      }

    } catch (error) {
      console.error('❌ Print receipt error:', error);
      throw error;
    }
  }

  /**
   * Download PDF - MENGGUNAKAN HTML DARI PREVIEW COMPONENT
   */
  async downloadReceiptPDF(saleId: number, receiptConfig?: any, printOptions?: any): Promise<void> {
    try {
      console.log('📄 Downloading PDF for sale:', saleId);

      const saleResponse = await this.posService.getSaleById(saleId).toPromise();

      if (!saleResponse?.success || !saleResponse.data) {
        throw new Error('Failed to get sale data');
      }

      const sale = saleResponse.data;

      // Generate PDF menggunakan method terpisah
      const pdfBlob = await this.generateReceiptPDF(sale, receiptConfig, printOptions);

      // Download PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `struk-${sale.saleNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('❌ Download PDF error:', error);
      throw error;
    }
  }

  /**
   * Share receipt - MENGGUNAKAN PDF YANG SAMA DENGAN DOWNLOAD
   */
  async shareReceipt(saleId: number, method: 'native' | 'whatsapp' = 'native', receiptConfig?: any, printOptions?: any): Promise<void> {
    try {
      console.log('📤 Sharing receipt for sale:', saleId);

      const saleResponse = await this.posService.getSaleById(saleId).toPromise();

      if (!saleResponse?.success || !saleResponse.data) {
        throw new Error('Failed to get sale data');
      }

      const sale = saleResponse.data;

      if (method === 'whatsapp') {
        // Untuk WhatsApp, buat PDF kecil untuk sharing
        const pdfBlob = await this.generateReceiptPDF(sale, receiptConfig, printOptions);
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Buat text summary + link download PDF
        const receiptText = this.generateReceiptTextSummary(sale, receiptConfig);
        const whatsappText = `${receiptText}\n\n📎 PDF Struk: ${pdfUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        window.open(whatsappUrl, '_blank');
      } else {
        // Untuk native share gunakan PDF yang sama dengan download
        const pdfBlob = await this.generateReceiptPDF(sale, receiptConfig, printOptions);
        const file = new File([pdfBlob], `struk-${sale.saleNumber}.pdf`, { type: 'application/pdf' });

        if (navigator.share) {
          await navigator.share({
            title: `Struk #${sale.saleNumber}`,
            text: 'Struk Pembelian',
            files: [file]
          });
        } else {
          // Fallback: download PDF
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `struk-${sale.saleNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }

    } catch (error: any) {
      console.error('❌ Share receipt error:', error);
      throw error;
    }
  }

  /**
   * Generate Receipt PDF - UNTUK DOWNLOAD DAN SHARE
   */
  private async generateReceiptPDF(sale: any, receiptConfig?: any, printOptions?: any): Promise<Blob> {
    // Gunakan HTML yang sama dengan preview component
    const pdfContent = this.generateReceiptHTML(sale, receiptConfig, printOptions);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pdfContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '380px'; // Fixed width untuk consistency
    document.body.appendChild(tempDiv);

    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(tempDiv, {
      width: 380,
      height: tempDiv.scrollHeight,
      scale: 1.5, // Reduced scale untuk file size lebih kecil
      useCORS: true,
      backgroundColor: '#ffffff',
      allowTaint: false,
      foreignObjectRendering: false
    });

    document.body.removeChild(tempDiv);

    // Create PDF dengan ukuran yang optimal
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, (canvas.height * 80) / canvas.width],
      compress: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.85); // JPEG dengan quality 85% untuk size lebih kecil
    pdf.addImage(imgData, 'JPEG', 0, 0, 80, (canvas.height * 80) / canvas.width);

    // Return sebagai Blob
    return pdf.output('blob');
  }

  /**
   * Generate Receipt Text Summary - UNTUK SHARE YANG RINGKAS
   */
  private generateReceiptTextSummary(sale: any, receiptConfig?: any): string {
    const storeInfo = receiptConfig || environment.pos?.receiptSettings || {
      storeName: 'Toko Eniwan',
      storeAddress: 'Bekasi, West Java',
      storePhone: '+62 xxx-xxxx-xxxx',
      footerMessage: 'Terima kasih atas kunjungan Anda!'
    };

    const formattedDate = this.formatDate(sale.saleDate);
    const formattedTime = this.formatTime(sale.saleDate);

    let receiptText = `📄 ${storeInfo.storeName}\n`;
    receiptText += `${storeInfo.storeAddress}\n`;
    receiptText += `${storeInfo.storePhone}\n\n`;

    receiptText += `🧾 STRUK PEMBELIAN\n`;
    receiptText += `================================\n`;
    
    if (receiptConfig?.showTransactionNumber !== false) {
      receiptText += `No. Transaksi: ${sale.saleNumber || 'N/A'}\n`;
    }
    if (receiptConfig?.showDateTime !== false) {
      receiptText += `Tanggal: ${formattedDate}\n`;
      receiptText += `Waktu: ${formattedTime}\n`;
    }
    if (receiptConfig?.showCashier !== false) {
      receiptText += `Kasir: ${sale.cashierName || 'N/A'}\n`;
    }

    if (sale.customerName) {
      receiptText += `Pelanggan: ${sale.customerName}\n`;
    }

    receiptText += `================================\n`;

    // Items
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item: any) => {
        const qty = this.getItemQuantity(item);
        const price = this.getItemPrice(item);
        const total = this.getItemSubtotal(item);

        receiptText += `${item.productName || 'Unknown Product'}\n`;
        receiptText += `  ${qty} x ${this.formatCurrency(price)} = ${this.formatCurrency(total)}\n`;

        if (this.getItemDiscount(item) > 0) {
          receiptText += `  (Diskon ${this.getItemDiscount(item)}%)\n`;
        }
      });
    }

    receiptText += `================================\n`;
    receiptText += `Subtotal: ${this.formatCurrency(sale.subtotal)}\n`;

    if (this.toNumber(sale.discountAmount) > 0) {
      receiptText += `Diskon: -${this.formatCurrency(sale.discountAmount)}\n`;
    }

    receiptText += `TOTAL: ${this.formatCurrency(sale.total)}\n`;
    receiptText += `================================\n`;
    receiptText += `Metode Bayar: ${this.getPaymentMethodLabel(sale.paymentMethod)}\n`;
    receiptText += `Jumlah Bayar: ${this.formatCurrency(sale.amountPaid)}\n`;

    if (this.toNumber(sale.changeAmount) > 0) {
      receiptText += `Kembalian: ${this.formatCurrency(sale.changeAmount)}\n`;
    }

    receiptText += `\n${storeInfo.footerMessage}\n`;
    receiptText += `Barang yang sudah dibeli tidak dapat dikembalikan`;

    return receiptText;
  }

  /**
   * Generate Receipt HTML - PERSIS SEPERTI PREVIEW COMPONENT
   */
  private generateReceiptHTML(sale: any, receiptConfig?: any, printOptions?: any): string {
    const storeInfo = receiptConfig || environment.pos?.receiptSettings || {
      storeName: 'Toko Eniwan',
      storeAddress: 'Bekasi, West Java',
      storePhone: '+62 xxx-xxxx-xxxx',
      storeEmail: 'info@tokoeniwan.com',
      footerMessage: 'Terima kasih atas kunjungan Anda!'
    };
    
    // Get theme and font size settings
    const theme = receiptConfig?.theme || 'classic';
    const fontSize = receiptConfig?.fontSize || 'medium';
    const includeFooter = printOptions?.includeFooter !== false;
    const includeQR = printOptions?.includeQR !== false;
    const includeLogo = printOptions?.includeLogo !== false;

    const formattedDate = this.formatDate(sale.saleDate);
    const formattedTime = this.formatTime(sale.saleDate);
    const showKembalian = sale.changeAmount && sale.changeAmount > 0;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Struk #${sale.saleNumber}</title>
    <style>
        :root {
          --clr-primary: #FF914D;
          --clr-primary-dark: #E07A3B;
          --clr-primary-light: #FFD3B3;
          --clr-accent: #4BBF7B;
          --clr-warning: #FFB84D;
          --clr-error: #E15A4F;
          --clr-surface: rgba(255, 255, 255, 0.25);
          --clr-bg-base: #FDF9F6;
          --backdrop-blur: blur(20px);
          --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.1);
          --border-radius: 12px;
        }

        body {
            font-family: 'Courier New', monospace;
            font-size: 0.75rem;
            line-height: 1.3;
            margin: 0;
            padding: 8px;
            background: white;
            color: #333;
        }
        
        .receipt-content {
            display: flex;
            justify-content: center;
            margin-top: 0;
        }

        .receipt-paper {
            width: 100%;
            max-width: 380px;
            background: white;
            padding: 1.2rem;
            border-radius: var(--border-radius);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            line-height: 1.3;
            color: #333;
            position: relative;
            margin: 0 auto;
        }

        /* Receipt styling */
        .receipt-paper::before {
            content: '';
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 20px;
            background: repeating-linear-gradient(
              45deg,
              #ccc,
              #ccc 2px,
              transparent 2px,
              transparent 8px
            );
            border-radius: 50%;
        }

        /* Store Header */
        .store-header {
            text-align: center;
            margin-bottom: 1rem;
        }

        .store-name {
            margin: 0 0 0.3rem 0;
            font-size: 1.1rem;
            font-weight: bold;
            color: var(--clr-primary-dark);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .store-address,
        .store-contact,
        .store-email {
            margin: 0.2rem 0;
            font-size: 0.75rem;
            color: #666;
        }

        /* Divider */
        .divider {
            text-align: center;
            margin: 0.8rem 0;
            color: #999;
            font-size: 0.65rem;
            letter-spacing: 0.3px;
        }

        /* Transaction Info */
        .transaction-info .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.2rem;
        }

        .transaction-info .info-row .label {
            font-weight: bold;
            color: #555;
            font-size: 0.75rem;
        }

        .transaction-info .info-row .value {
            color: #333;
            font-size: 0.75rem;
        }

        /* Items Section */
        .items-section .items-header {
            display: grid;
            grid-template-columns: 3fr 0.7fr 1.1fr 1.1fr;
            gap: 0.25rem;
            padding: 0.4rem 0;
            border-bottom: 1px dashed #ccc;
            margin-bottom: 0.4rem;
            font-weight: bold;
            font-size: 0.65rem;
            color: #555;
            align-items: center;
        }

        .items-section .items-header .col-name { text-align: left; }
        .items-section .items-header .col-qty { text-align: center; }
        .items-section .items-header .col-price { text-align: right; }
        .items-section .items-header .col-total { text-align: right; }

        .items-section .item-row {
            margin-bottom: 0.4rem;
        }

        .items-section .item-row .item-main {
            display: grid;
            grid-template-columns: 3fr 0.7fr 1.1fr 1.1fr;
            gap: 0.25rem;
            align-items: center;
            font-size: 0.7rem;
            min-height: 1.2rem;
        }

        .items-section .item-row .item-main .item-name {
            font-weight: 600;
            color: #333;
            word-break: break-word;
            line-height: 1.2;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .items-section .item-row .item-main .item-qty {
            text-align: center;
            font-weight: bold;
            color: var(--clr-primary);
            white-space: nowrap;
        }

        .items-section .item-row .item-main .item-price {
            text-align: right;
            color: #666;
            white-space: nowrap;
            font-size: 0.65rem;
        }

        .items-section .item-row .item-main .item-total {
            text-align: right;
            font-weight: bold;
            color: #333;
            white-space: nowrap;
            font-size: 0.65rem;
        }

        .items-section .item-row .item-details {
            margin-top: 0.1rem;
            margin-left: 0.1rem;
        }

        .items-section .item-row .item-details .discount-info {
            font-size: 0.65rem;
            color: var(--clr-accent);
            font-style: italic;
        }

        /* Summary Section */
        .summary-section .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.3rem;
            padding: 0.15rem 0;
            font-size: 0.75rem;
        }

        .summary-section .summary-row .label {
            color: #555;
        }

        .summary-section .summary-row .value {
            color: #333;
            font-weight: 600;
        }

        .summary-section .summary-row.total-row {
            border-top: 1px solid #ccc;
            border-bottom: 2px solid #333;
            padding: 0.4rem 0;
            margin-top: 0.4rem;
            font-size: 0.85rem;
            font-weight: bold;
        }

        .summary-section .summary-row.total-row .label {
            color: #333;
            font-weight: bold;
        }

        .summary-section .summary-row.total-row .value {
            color: var(--clr-primary-dark);
            font-size: 0.9rem;
        }

        /* Payment Section */
        .payment-section .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.25rem;
            font-size: 0.75rem;
        }

        .payment-section .payment-row .label {
            color: #555;
            font-weight: 600;
        }

        .payment-section .payment-row .value {
            color: #333;
            font-weight: bold;
        }

        /* Footer */
        .receipt-footer {
            text-align: center;
            margin-top: 1rem;
        }

        .receipt-footer .thank-you {
            margin: 0.5rem 0;
            font-size: 0.9rem;
            font-weight: bold;
            color: #333;
        }

        .receipt-footer .footer-note {
            margin: 0.5rem 0;
            font-size: 0.75rem;
            color: #666;
            font-style: italic;
        }

        .receipt-footer .qr-section {
            margin-top: 1rem;
            padding: 0.75rem;
            background: rgba(255, 145, 77, 0.05);
            border-radius: 6px;
        }

        .receipt-footer .qr-section .qr-label {
            margin: 0 0 0.5rem 0;
            font-size: 0.75rem;
            color: #666;
        }

        .receipt-footer .qr-section .qr-placeholder {
            width: 80px;
            height: 80px;
            margin: 0 auto;
            background: #f8f9fa;
            border: 2px dashed #ccc;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .receipt-footer .qr-section .qr-placeholder .qr-text {
            font-size: 0.7rem;
            color: #999;
        }

        .no-items {
            text-align: center;
            padding: 20px;
            color: #999;
        }

        @media print {
            body { 
                margin: 0; 
                padding: 4px;
                font-size: 0.7rem;
            }
            .receipt-content {
                margin-top: 0;
            }
            .receipt-content .receipt-paper {
                box-shadow: none;
                border: none;
                max-width: 380px;
                width: 100%;
                padding: 1rem;
                margin: 0 auto;
            }
            .receipt-paper::before {
                display: none;
            }
            .items-section .items-header {
                font-size: 0.6rem;
            }
            .items-section .item-row .item-main {
                font-size: 0.65rem;
            }
            .items-section .item-row .item-main .item-price,
            .items-section .item-row .item-main .item-total {
                font-size: 0.6rem;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-content">
        <div class="receipt-paper">
            <!-- Store Header -->
            <div class="store-header">
                ${(storeInfo.logoUrl && includeLogo) ? `
                <div class="store-logo">
                    <img src="${storeInfo.logoUrl}" alt="${storeInfo.storeName}" style="max-width: 120px; max-height: 60px; object-fit: contain; margin-bottom: 12px;">
                </div>` : ''}
                
                <h1 class="store-name">${storeInfo.storeName}</h1>
                <p class="store-address">${storeInfo.storeAddress}</p>
                <p class="store-contact">${storeInfo.storePhone}</p>
                ${storeInfo.storeEmail ? `<p class="store-email">${storeInfo.storeEmail}</p>` : ''}
            </div>

            <!-- Divider -->
            <div class="divider">================================</div>

            <!-- Transaction Info -->
            <div class="transaction-info">
                ${(receiptConfig?.showTransactionNumber !== false) ? `
                <div class="info-row">
                    <span class="label">No. Transaksi:</span>
                    <span class="value">${sale.saleNumber || 'N/A'}</span>
                </div>` : ''}
                ${(receiptConfig?.showDateTime !== false) ? `
                <div class="info-row">
                    <span class="label">Tanggal:</span>
                    <span class="value">${formattedDate}</span>
                </div>
                <div class="info-row">
                    <span class="label">Waktu:</span>
                    <span class="value">${formattedTime}</span>
                </div>` : ''}
                ${(receiptConfig?.showCashier !== false) ? `
                <div class="info-row">
                    <span class="label">Kasir:</span>
                    <span class="value">${sale.cashierName || 'N/A'}</span>
                </div>` : ''}
                ${sale.customerName ? `
                <div class="info-row">
                    <span class="label">Pelanggan:</span>
                    <span class="value">${sale.customerName}</span>
                </div>` : ''}
                ${sale.memberName ? `
                <div class="info-row">
                    <span class="label">Member:</span>
                    <span class="value">${sale.memberName} (${sale.memberNumber})</span>
                </div>` : ''}
            </div>

            <!-- Divider -->
            <div class="divider">================================</div>

            <!-- Items -->
            <div class="items-section">
                <div class="items-header">
                    <span class="col-name">Item</span>
                    <span class="col-qty">Qty</span>
                    <span class="col-price">Harga</span>
                    <span class="col-total">Total</span>
                </div>

                <!-- Items List -->
                ${sale.items && sale.items.length > 0 ? sale.items.map((item: any) => `
                    <div class="item-row">
                        <div class="item-main">
                            <span class="item-name">${item.productName || 'Unknown Product'}</span>
                            <span class="item-qty">${this.getItemQuantity(item)}</span>
                            <span class="item-price">${this.formatCurrency(this.getItemPrice(item))}</span>
                            <span class="item-total">${this.formatCurrency(this.getItemSubtotal(item))}</span>
                        </div>

                        ${this.getItemDiscount(item) > 0 ? `
                        <div class="item-details">
                            <span class="discount-info">
                                Diskon ${this.getItemDiscount(item)}%
                            </span>
                        </div>` : ''}
                    </div>
                `).join('') : `
                <div class="no-items">
                    <p>Tidak ada item ditemukan dalam transaksi ini</p>
                </div>`}
            </div>

            <!-- Divider -->
            <div class="divider">================================</div>

            <!-- Summary -->
            <div class="summary-section">
                <div class="summary-row">
                    <span class="label">Subtotal (${this.getTotalItems(sale)} item):</span>
                    <span class="value">${this.formatCurrency(sale.subtotal)}</span>
                </div>

                ${this.toNumber(sale.discountAmount) > 0 ? `
                <div class="summary-row">
                    <span class="label">Diskon:</span>
                    <span class="value">-${this.formatCurrency(sale.discountAmount)}</span>
                </div>` : ''}

                <div class="summary-row total-row">
                    <span class="label">TOTAL:</span>
                    <span class="value">${this.formatCurrency(sale.total)}</span>
                </div>
            </div>

            <!-- Divider -->
            <div class="divider">================================</div>

            <!-- Payment Info -->
            <div class="payment-section">
                <div class="payment-row">
                    <span class="label">Metode Bayar:</span>
                    <span class="value">${this.getPaymentMethodLabel(sale.paymentMethod)}</span>
                </div>

                <div class="payment-row">
                    <span class="label">Jumlah Bayar:</span>
                    <span class="value">${this.formatCurrency(sale.amountPaid)}</span>
                </div>

                ${this.toNumber(sale.changeAmount) > 0 ? `
                <div class="payment-row">
                    <span class="label">Kembalian:</span>
                    <span class="value">${this.formatCurrency(sale.changeAmount)}</span>
                </div>` : ''}

                ${sale.paymentReference ? `
                <div class="payment-row">
                    <span class="label">Ref. Number:</span>
                    <span class="value">${sale.paymentReference}</span>
                </div>` : ''}
            </div>

            <!-- Footer -->
            ${includeFooter ? `
            <div class="receipt-footer">
                <div class="divider">================================</div>
                <p class="thank-you">${storeInfo.footerMessage || 'Terima kasih atas kunjungan Anda!'}</p>
                <p class="footer-note">Barang yang sudah dibeli tidak dapat dikembalikan</p>

                ${includeQR ? `
                <!-- QR Code for digital receipt -->
                <div class="qr-section">
                    <p class="qr-label">Scan untuk struk digital:</p>
                    <div class="qr-placeholder">
                        <span class="qr-text">QR Code</span>
                        <small>${sale.saleNumber || ''}</small>
                    </div>
                </div>` : ''}
            </div>` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  // ===== UTILITY METHODS - SAMA SEPERTI PREVIEW COMPONENT =====

  private getItemQuantity(item: any): number {
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

  private getItemPrice(item: any): number {
    if (!item) return 0;

    const priceFields = ['unitPrice', 'sellPrice', 'price', 'salePrice'];

    for (const field of priceFields) {
      const value = item[field];
      if (value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) > 0) {
        return this.toNumber(value);
      }
    }

    return 0;
  }

  private getItemSubtotal(item: any): number {
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

    return 0;
  }

  private getItemDiscount(item: any): number {
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

  private formatCurrency(amount: number | string | undefined | null): string {
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

  private formatDate(date: Date | string): string {
    if (!date) return '-';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '-';

    return dateObj.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatTime(date: Date | string): string {
    if (!date) return '-';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '-';

    return dateObj.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  private getPaymentMethodLabel(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Tunai',
      'card': 'Kartu Debit/Kredit',
      'digital': 'Digital/E-wallet',
      'transfer': 'Transfer Bank',
      'qris': 'QRIS'
    };
    return methods[method?.toLowerCase()] || method || 'Tidak diketahui';
  }

  private getTotalItems(sale: any): number {
    if (!sale || !sale.items || !Array.isArray(sale.items)) return 0;

    return sale.items.reduce((sum: number, item: any) => {
      return sum + this.getItemQuantity(item);
    }, 0);
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'string') {
      if (value.trim() === '') return 0;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // ===== NEW: BRANCH-SPECIFIC RECEIPT HTML GENERATOR =====

  /**
   * Generate Branch-Specific Receipt HTML with enhanced branding
   */
  private generateBranchReceiptHTML(sale: any, branchConfig: BranchReceiptConfig, printOptions?: any): string {
    const includeFooter = printOptions?.includeFooter !== false;
    const includeQR = branchConfig.includeQR !== false;
    const includeLogo = branchConfig.includeLogo !== false;

    const formattedDate = this.formatDate(sale.saleDate);
    const formattedTime = this.formatTime(sale.saleDate);
    const showKembalian = sale.changeAmount && sale.changeAmount > 0;

    // Branch-specific CSS classes
    const themeClass = `theme-${branchConfig.theme || 'branch'}`;
    const fontSizeClass = `font-${branchConfig.fontSize || 'medium'}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Struk ${branchConfig.branchName || branchConfig.storeName} #${sale.saleNumber}</title>
    <style>
        :root {
          /* Branch Theme Colors */
          --clr-primary: #FF914D;
          --clr-primary-dark: #E07A3B;
          --clr-primary-light: #FFD3B3;
          --clr-accent: #4BBF7B;
          --clr-warning: #FFB84D;
          --clr-error: #E15A4F;
          --clr-branch: #2563EB;
          --clr-branch-light: #DBEAFE;
          --clr-surface: rgba(255, 255, 255, 0.25);
          --clr-bg-base: #FDF9F6;
          --border-radius: 12px;
        }

        body {
            font-family: 'Courier New', monospace;
            line-height: 1.3;
            margin: 0;
            padding: 8px;
            background: white;
            color: #333;
        }

        .receipt-paper {
            width: 100%;
            max-width: 380px;
            background: white;
            padding: 1.2rem;
            border-radius: var(--border-radius);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            font-family: 'Courier New', monospace;
            color: #333;
            position: relative;
            margin: 0 auto;
        }

        /* Branch-Specific Theme Classes */
        .theme-branch .branch-header {
            background: linear-gradient(135deg, var(--clr-branch) 0%, var(--clr-primary) 100%);
            color: white;
            padding: 1rem;
            margin: -1.2rem -1.2rem 1rem -1.2rem;
            border-radius: var(--border-radius) var(--border-radius) 0 0;
            text-align: center;
        }

        .theme-classic .branch-header {
            text-align: center;
            border-bottom: 2px dashed #333;
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
        }

        .theme-modern .branch-header {
            background: var(--clr-primary-light);
            border-left: 4px solid var(--clr-primary);
            padding: 0.8rem;
            margin: -1.2rem -1.2rem 1rem -1.2rem;
        }

        .theme-minimal .branch-header {
            text-align: center;
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
            border-bottom: 1px solid #e0e0e0;
        }

        /* Font Size Classes */
        .font-small { font-size: 0.7rem; }
        .font-medium { font-size: 0.8rem; }
        .font-large { font-size: 0.9rem; }

        /* Store & Branch Header */
        .store-info {
            margin-bottom: 0.3rem;
        }

        .store-name {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 0.2rem;
        }

        .branch-info {
            color: var(--clr-branch);
            font-weight: bold;
            font-size: 0.95em;
            margin: 0.3rem 0;
        }

        .branch-code {
            background: var(--clr-branch-light);
            color: var(--clr-branch);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.7em;
            font-family: 'Courier New', monospace;
            margin-left: 0.5rem;
        }

        .contact-info {
            font-size: 0.75em;
            color: #666;
            line-height: 1.2;
        }

        /* Transaction Details */
        .divider {
            border-top: 1px dashed #333;
            margin: 0.8rem 0;
        }

        .transaction-info {
            font-size: 0.75em;
            margin-bottom: 0.8rem;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.2rem;
        }

        /* Items Table */
        .items-section {
            margin: 1rem 0;
        }

        .items-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            padding-bottom: 0.3rem;
            border-bottom: 1px solid #333;
            margin-bottom: 0.5rem;
        }

        .item-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.4rem;
            font-size: 0.75em;
        }

        .item-name {
            flex: 1;
            margin-right: 0.5rem;
            word-wrap: break-word;
        }

        .item-details {
            text-align: right;
            min-width: 80px;
        }

        .item-qty-price {
            color: #666;
            font-size: 0.9em;
        }

        /* Totals */
        .totals-section {
            border-top: 1px dashed #333;
            padding-top: 0.5rem;
            margin-top: 0.8rem;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.3rem;
        }

        .total-row.grand-total {
            font-weight: bold;
            font-size: 1.1em;
            border-top: 1px solid #333;
            padding-top: 0.3rem;
            margin-top: 0.3rem;
        }

        /* Payment Info */
        .payment-section {
            margin-top: 1rem;
            padding-top: 0.5rem;
            border-top: 1px dashed #333;
        }

        /* Branch-Specific Footer */
        .branch-footer {
            text-align: center;
            margin-top: 1.2rem;
            padding-top: 0.8rem;
            border-top: 2px dashed #333;
            font-size: 0.75em;
        }

        .branch-message {
            background: var(--clr-branch-light);
            color: var(--clr-branch);
            padding: 0.5rem;
            border-radius: 6px;
            margin: 0.5rem 0;
            font-style: italic;
        }

        .manager-signature {
            margin-top: 0.8rem;
            font-size: 0.7em;
            color: #666;
        }

        /* Print-specific */
        @media print {
            body {
                padding: 0;
                background: white;
            }
            
            .receipt-paper {
                box-shadow: none;
                border-radius: 0;
                padding: 0.8rem;
            }
        }
    </style>
</head>
<body class="${themeClass} ${fontSizeClass}">
    <div class="receipt-paper">
        <!-- Branch Header -->
        <div class="branch-header">
            <div class="store-info">
                <div class="store-name">${branchConfig.storeName || 'Toko Eniwan'}</div>
                ${branchConfig.branchName ? `
                <div class="branch-info">
                    ${branchConfig.branchName}
                    <span class="branch-code">${branchConfig.branchCode || ''}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="contact-info">
                ${branchConfig.branchAddress || branchConfig.storeAddress || ''}<br>
                ${branchConfig.branchPhone || branchConfig.storePhone || ''}<br>
                ${branchConfig.storeEmail ? `${branchConfig.storeEmail}<br>` : ''}
                ${branchConfig.branchManager ? `Manager: ${branchConfig.branchManager}` : ''}
            </div>
        </div>

        <div class="divider"></div>

        <!-- Transaction Info -->
        <div class="transaction-info">
            <div class="info-row">
                <span>No. Struk:</span>
                <span><strong>${sale.saleNumber || sale.id}</strong></span>
            </div>
            <div class="info-row">
                <span>Tanggal:</span>
                <span>${formattedDate}</span>
            </div>
            <div class="info-row">
                <span>Waktu:</span>
                <span>${formattedTime}</span>
            </div>
            <div class="info-row">
                <span>Kasir:</span>
                <span>${sale.cashierName || 'Kasir'}</span>
            </div>
            ${sale.customerName ? `
            <div class="info-row">
                <span>Customer:</span>
                <span>${sale.customerName}</span>
            </div>
            ` : ''}
        </div>

        <div class="divider"></div>

        <!-- Items -->
        <div class="items-section">
            <div class="items-header">
                <span>Item</span>
                <span>Total</span>
            </div>
            
            ${sale.items && sale.items.length > 0 ? sale.items.map((item: any) => `
                <div class="item-row">
                    <div class="item-name">
                        ${item.productName || item.name}<br>
                        <span class="item-qty-price">
                            ${this.getItemQuantity(item)} × ${this.formatCurrency(this.getItemPrice(item))}
                            ${this.getItemDiscount(item) > 0 ? ` (-${this.formatCurrency(this.getItemDiscount(item))})` : ''}
                        </span>
                    </div>
                    <div class="item-details">
                        ${this.formatCurrency(this.getItemSubtotal(item))}
                    </div>
                </div>
            `).join('') : '<div class="item-row"><span colspan="2">Tidak ada item</span></div>'}
        </div>

        <!-- Totals -->
        <div class="totals-section">
            <div class="total-row">
                <span>Subtotal (${this.getTotalItems(sale)} item):</span>
                <span>${this.formatCurrency(this.toNumber(sale.subtotalAmount) || 0)}</span>
            </div>
            
            ${this.toNumber(sale.discountAmount) > 0 ? `
            <div class="total-row">
                <span>Diskon:</span>
                <span>-${this.formatCurrency(this.toNumber(sale.discountAmount))}</span>
            </div>
            ` : ''}
            
            ${this.toNumber(sale.taxAmount) > 0 ? `
            <div class="total-row">
                <span>Pajak:</span>
                <span>${this.formatCurrency(this.toNumber(sale.taxAmount))}</span>
            </div>
            ` : ''}
            
            <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span><strong>${this.formatCurrency(this.toNumber(sale.totalAmount) || 0)}</strong></span>
            </div>
        </div>

        <!-- Payment -->
        <div class="payment-section">
            <div class="info-row">
                <span>Metode Bayar:</span>
                <span>${this.getPaymentMethodLabel(sale.paymentMethod)}</span>
            </div>
            <div class="info-row">
                <span>Dibayar:</span>
                <span>${this.formatCurrency(this.toNumber(sale.paidAmount) || 0)}</span>
            </div>
            ${showKembalian ? `
            <div class="info-row">
                <span>Kembalian:</span>
                <span>${this.formatCurrency(this.toNumber(sale.changeAmount))}</span>
            </div>
            ` : ''}
        </div>

        ${includeFooter ? `
        <!-- Branch Footer -->
        <div class="branch-footer">
            <div>${branchConfig.footerMessage || 'Terima kasih atas kunjungan Anda!'}</div>
            
            ${branchConfig.branchSpecificMessage ? `
            <div class="branch-message">
                ${branchConfig.branchSpecificMessage}
            </div>
            ` : ''}
            
            ${branchConfig.branchManager ? `
            <div class="manager-signature">
                <div>Hormat kami,</div>
                <div><strong>${branchConfig.branchManager}</strong></div>
                <div>Manager ${branchConfig.branchName || 'Branch'}</div>
            </div>
            ` : ''}
            
            <div style="margin-top: 1rem; font-size: 0.7em; color: #666;">
                ${new Date().toLocaleString('id-ID')}
            </div>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }

  /**
   * NEW: Download branch-specific receipt PDF
   */
  async downloadBranchReceiptPDF(saleId: number, customConfig?: BranchReceiptConfig, printOptions?: any): Promise<void> {
    try {
      console.log('📄🏢 Downloading branch-aware PDF for sale:', saleId);

      const saleResponse = await this.posService.getSaleById(saleId).toPromise();

      if (!saleResponse?.success || !saleResponse.data) {
        throw new Error('Failed to get sale data');
      }

      const sale = saleResponse.data;
      
      // Get branch-specific configuration
      const branchReceiptConfig = this.getBranchReceiptConfig(sale, customConfig);

      // Generate branch-aware PDF
      const pdfBlob = await this.generateBranchReceiptPDF(sale, branchReceiptConfig, printOptions);

      // Download with branch-specific filename
      const branchCode = branchReceiptConfig.branchCode || 'GEN';
      const filename = `struk-${branchCode}-${sale.saleNumber}.pdf`;

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('❌ Download branch PDF error:', error);
      throw error;
    }
  }

  /**
   * Generate branch-specific receipt PDF
   */
  private async generateBranchReceiptPDF(sale: any, branchConfig: BranchReceiptConfig, printOptions?: any): Promise<Blob> {
    const pdfContent = this.generateBranchReceiptHTML(sale, branchConfig, printOptions);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pdfContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '380px';
    document.body.appendChild(tempDiv);

    await new Promise(resolve => setTimeout(resolve, 150));

    const canvas = await html2canvas(tempDiv, {
      width: 380,
      height: tempDiv.scrollHeight,
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      allowTaint: false,
      foreignObjectRendering: false
    });

    document.body.removeChild(tempDiv);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, (canvas.height * 80) / canvas.width],
      compress: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    pdf.addImage(imgData, 'JPEG', 0, 0, 80, (canvas.height * 80) / canvas.width);

    return pdf.output('blob');
  }
}
