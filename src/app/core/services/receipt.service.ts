// src/app/core/services/receipt.service.ts
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { POSService, Sale, ReceiptData } from './pos.service';
import jsPDF from 'jspdf';

export interface ReceiptTemplate {
  id: string;
  name: string;
  width: number; // in mm
  fontSize: number;
  lineHeight: number;
  margins: {
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
}

export interface PrinterSettings {
  printerName?: string;
  paperSize: 'thermal58' | 'thermal80' | 'a4';
  copies: number;
  autoCut: boolean;
  cashDrawer: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  
  // Available receipt templates
  private templates: ReceiptTemplate[] = [
    {
      id: 'thermal58',
      name: 'Thermal 58mm',
      width: 58,
      fontSize: 8,
      lineHeight: 3,
      margins: { top: 5, left: 2, right: 2, bottom: 5 }
    },
    {
      id: 'thermal80',
      name: 'Thermal 80mm', 
      width: 80,
      fontSize: 10,
      lineHeight: 4,
      margins: { top: 5, left: 3, right: 3, bottom: 5 }
    },
    {
      id: 'a4',
      name: 'A4 Paper',
      width: 210,
      fontSize: 12,
      lineHeight: 5,
      margins: { top: 20, left: 20, right: 20, bottom: 20 }
    }
  ];

  // Default printer settings
  private defaultSettings: PrinterSettings = {
    paperSize: 'thermal58',
    copies: 1,
    autoCut: true,
    cashDrawer: false
  };

  // Current printer settings
  private settingsSubject = new BehaviorSubject<PrinterSettings>(this.defaultSettings);
  public settings$ = this.settingsSubject.asObservable();

  constructor(private posService: POSService) {
    this.loadSettings();
  }

  // ===== RECEIPT GENERATION =====

  /**
   * Generate receipt HTML for preview/printing
   */
  async generateReceiptHTML(saleId: number): Promise<string> {
    try {
      const response = await this.posService.getReceiptData(saleId).toPromise();
      
      if (!response?.success || !response.data) {
        throw new Error('Failed to get receipt data');
      }

      return this.buildReceiptHTML(response.data);
      
    } catch (error) {
      console.error('Error generating receipt HTML:', error);
      throw error;
    }
  }

  /**
   * Generate receipt PDF
   */
  async generateReceiptPDF(saleId: number, templateId: string = 'thermal58'): Promise<Blob> {
    try {
      const response = await this.posService.getReceiptData(saleId).toPromise();
      
      if (!response?.success || !response.data) {
        throw new Error('Failed to get receipt data');
      }

      const template = this.getTemplate(templateId);
      return this.buildReceiptPDF(response.data, template);
      
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      throw error;
    }
  }

  /**
   * Build receipt HTML content
   */
  private buildReceiptHTML(data: ReceiptData): string {
    const { sale, storeName, storeAddress, storePhone, storeEmail, footerMessage } = data;
    
    return `
      <div class="receipt" style="font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; line-height: 1.4;">
        <!-- Header -->
        <div class="receipt-header" style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold;">${storeName}</h2>
          ${storeAddress ? `<p style="margin: 2px 0; font-size: 10px;">${storeAddress}</p>` : ''}
          ${storePhone ? `<p style="margin: 2px 0; font-size: 10px;">Tel: ${storePhone}</p>` : ''}
          ${storeEmail ? `<p style="margin: 2px 0; font-size: 10px;">Email: ${storeEmail}</p>` : ''}
        </div>

        <!-- Transaction Info -->
        <div class="receipt-transaction" style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span>No. Transaksi:</span>
            <span style="font-weight: bold;">${sale.saleNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Tanggal:</span>
            <span>${this.formatDate(sale.saleDate)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Kasir:</span>
            <span>${sale.cashierName}</span>
          </div>
          ${sale.memberName ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Member:</span>
            <span>${sale.memberName}</span>
          </div>
          ` : ''}
          ${sale.customerName ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Customer:</span>
            <span>${sale.customerName}</span>
          </div>
          ` : ''}
        </div>

        <!-- Items -->
        <div class="receipt-items" style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          ${sale.items.map((item: any) => `
            <div class="receipt-item" style="margin-bottom: 8px;">
              <div style="font-weight: bold;">${item.productName}</div>
              <div style="display: flex; justify-content: space-between; font-size: 10px;">
                <span>${item.quantity} x ${this.formatCurrency(item.sellPrice)}</span>
                <span style="font-weight: bold;">${this.formatCurrency(item.subtotal)}</span>
              </div>
              ${item.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: #666;">
                  <span>Diskon:</span>
                  <span>-${this.formatCurrency(item.discount)}</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Totals -->
        <div class="receipt-totals" style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(sale.subtotal)}</span>
          </div>
          ${sale.discountAmount > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Diskon:</span>
            <span>-${this.formatCurrency(sale.discountAmount)}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span>Pajak (11%):</span>
            <span>${this.formatCurrency(sale.taxAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px; padding-top: 5px; border-top: 1px solid #000;">
            <span>TOTAL:</span>
            <span>${this.formatCurrency(sale.total)}</span>
          </div>
        </div>

        <!-- Payment -->
        <div class="receipt-payment" style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Metode Bayar:</span>
            <span>${this.getPaymentMethodLabel(sale.paymentMethod)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Jumlah Bayar:</span>
            <span>${this.formatCurrency(sale.amountPaid)}</span>
          </div>
          ${sale.changeAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Kembalian:</span>
            <span>${this.formatCurrency(sale.changeAmount)}</span>
          </div>
          ` : ''}
          ${sale.redeemedPoints > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Poin Digunakan:</span>
            <span>${sale.redeemedPoints}</span>
          </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div class="receipt-footer" style="text-align: center; font-size: 10px;">
          ${footerMessage ? `<p style="margin: 5px 0;">${footerMessage}</p>` : ''}
          <p style="margin: 5px 0;">Terima kasih atas kunjungan Anda!</p>
          <p style="margin: 5px 0;">Barang yang sudah dibeli tidak dapat dikembalikan</p>
          <p style="margin: 5px 0; font-family: monospace;">${this.formatDate(new Date())}</p>
        </div>
      </div>
    `;
  }

  /**
   * Build receipt PDF
   */
  private buildReceiptPDF(data: ReceiptData, template: ReceiptTemplate): Blob {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [template.width, 200] // Dynamic height
    });

    const { sale, storeName, storeAddress, storePhone } = data;
    let yPosition = template.margins.top;
    const lineHeight = template.lineHeight;
    const pageWidth = template.width;
    const contentWidth = pageWidth - template.margins.left - template.margins.right;

    // Set font
    pdf.setFont('courier');
    pdf.setFontSize(template.fontSize);

    // Helper function to add text
    const addText = (text: string, align: 'left' | 'center' | 'right' = 'left', bold: boolean = false) => {
      if (bold) pdf.setFont('courier', 'bold');
      
      let x = template.margins.left;
      if (align === 'center') x = pageWidth / 2;
      if (align === 'right') x = pageWidth - template.margins.right;
      
      pdf.text(text, x, yPosition, { align });
      yPosition += lineHeight;
      
      if (bold) pdf.setFont('courier', 'normal');
    };

    const addLine = () => {
      const lineY = yPosition - lineHeight / 2;
      pdf.line(template.margins.left, lineY, pageWidth - template.margins.right, lineY);
      yPosition += lineHeight / 2;
    };

    // Header
    pdf.setFontSize(template.fontSize + 2);
    addText(storeName, 'center', true);
    pdf.setFontSize(template.fontSize);
    
    if (storeAddress) addText(storeAddress, 'center');
    if (storePhone) addText(`Tel: ${storePhone}`, 'center');
    
    addLine();

    // Transaction info
    addText(`No: ${sale.saleNumber}`);
    addText(`Tanggal: ${this.formatDate(sale.saleDate)}`);
    addText(`Kasir: ${sale.cashierName}`);
    
    if (sale.memberName) addText(`Member: ${sale.memberName}`);
    if (sale.customerName) addText(`Customer: ${sale.customerName}`);
    
    addLine();

    // Items
    sale.items.forEach((item: any) => {
      addText(item.productName, 'left', true);
      addText(`${item.quantity} x ${this.formatCurrency(item.sellPrice)} = ${this.formatCurrency(item.subtotal)}`);
      if (item.discount > 0) {
        addText(`  Diskon: -${this.formatCurrency(item.discount)}`);
      }
      yPosition += lineHeight / 2; // Extra spacing between items
    });

    addLine();

    // Totals
    addText(`Subtotal: ${this.formatCurrency(sale.subtotal)}`);
    if (sale.discountAmount > 0) {
      addText(`Diskon: -${this.formatCurrency(sale.discountAmount)}`);
    }
    addText(`Pajak: ${this.formatCurrency(sale.taxAmount)}`);
    
    addLine();
    pdf.setFontSize(template.fontSize + 1);
    addText(`TOTAL: ${this.formatCurrency(sale.total)}`, 'right', true);
    pdf.setFontSize(template.fontSize);

    addLine();

    // Payment
    addText(`Bayar (${this.getPaymentMethodLabel(sale.paymentMethod)}): ${this.formatCurrency(sale.amountPaid)}`);
    if (sale.changeAmount > 0) {
      addText(`Kembalian: ${this.formatCurrency(sale.changeAmount)}`, 'left', true);
    }

    addLine();

    // Footer
    addText('Terima kasih atas kunjungan Anda!', 'center');
    addText('Barang yang sudah dibeli', 'center');
    addText('tidak dapat dikembalikan', 'center');

    return pdf.output('blob');
  }

  // ===== PRINTING =====

  /**
   * Print receipt
   */
  async printReceipt(saleId: number, openCashDrawer: boolean = false): Promise<boolean> {
    try {
      const html = await this.generateReceiptHTML(saleId);
      
      // Create print window
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      // Write HTML to print window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${new Date().getTime()}</title>
          <style>
            @media print {
              body { margin: 0; }
              .receipt { width: 100% !important; }
              @page { margin: 0; size: 58mm auto; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 10px;
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();

      // Mark receipt as printed
      await this.posService.markReceiptPrinted(saleId).toPromise();

      // Open cash drawer if requested
      if (openCashDrawer) {
        await this.openCashDrawer();
      }

      return true;
      
    } catch (error) {
      console.error('Error printing receipt:', error);
      throw error;
    }
  }

  /**
   * Download receipt as PDF
   */
  async downloadReceiptPDF(saleId: number, filename?: string): Promise<void> {
    try {
      const pdfBlob = await this.generateReceiptPDF(saleId);
      
      if (!filename) {
        const response = await this.posService.getSaleById(saleId).toPromise();
        const saleNumber = response?.data?.saleNumber || saleId.toString();
        filename = `receipt-${saleNumber}.pdf`;
      }

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading receipt PDF:', error);
      throw error;
    }
  }

  /**
   * Share receipt via Web Share API or WhatsApp
   */
  async shareReceipt(saleId: number, method: 'native' | 'whatsapp' | 'email' = 'native'): Promise<void> {
    try {
      const pdfBlob = await this.generateReceiptPDF(saleId);
      const response = await this.posService.getSaleById(saleId).toPromise();
      const sale = response?.data;
      
      if (!sale) {
        throw new Error('Sale data not found');
      }

      const shareData = {
        title: `Receipt - ${sale.saleNumber}`,
        text: `Receipt for transaction ${sale.saleNumber} - Total: ${this.formatCurrency(sale.total)}`,
        files: [new File([pdfBlob], `receipt-${sale.saleNumber}.pdf`, { type: 'application/pdf' })]
      };

      if (method === 'native' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else if (method === 'whatsapp') {
        // For WhatsApp, we'll share text only since file sharing is limited
        const message = encodeURIComponent(
          `*STRUK PEMBELIAN*\n\n` +
          `No. Transaksi: ${sale.saleNumber}\n` +
          `Tanggal: ${this.formatDate(sale.saleDate)}\n` +
          `Total: ${this.formatCurrency(sale.total)}\n\n` +
          `Terima kasih telah berbelanja di Toko Eniwan!`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
      } else if (method === 'email') {
        // Create email with PDF attachment (limited browser support)
        const subject = encodeURIComponent(`Receipt - ${sale.saleNumber}`);
        const body = encodeURIComponent(
          `Receipt for transaction ${sale.saleNumber}\n` +
          `Date: ${this.formatDate(sale.saleDate)}\n` +
          `Total: ${this.formatCurrency(sale.total)}\n\n` +
          `Thank you for shopping with us!`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      } else {
        // Fallback: download PDF
        await this.downloadReceiptPDF(saleId);
      }
      
    } catch (error) {
      console.error('Error sharing receipt:', error);
      throw error;
    }
  }

  // ===== CASH DRAWER =====

  /**
   * Open cash drawer (for compatible thermal printers)
   */
  async openCashDrawer(): Promise<boolean> {
    try {
      // ESC/POS command to open cash drawer
      const openDrawerCommand = '\x1B\x70\x00\x19\x19';
      
      // Try to send command via printer (requires browser printer access)
      // This is a simplified implementation - real implementation would depend on printer API
      console.log('Opening cash drawer...');
      
      // For now, just log the command
      console.log('Cash drawer command sent:', openDrawerCommand);
      
      return true;
    } catch (error) {
      console.error('Error opening cash drawer:', error);
      return false;
    }
  }

  // ===== TEMPLATES & SETTINGS =====

  /**
   * Get available receipt templates
   */
  getTemplates(): ReceiptTemplate[] {
    return [...this.templates];
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ReceiptTemplate {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return template;
  }

  /**
   * Get current printer settings
   */
  getSettings(): PrinterSettings {
    return this.settingsSubject.value;
  }

  /**
   * Update printer settings
   */
  updateSettings(settings: Partial<PrinterSettings>): void {
    const currentSettings = this.settingsSubject.value;
    const newSettings = { ...currentSettings, ...settings };
    this.settingsSubject.next(newSettings);
    this.saveSettings(newSettings);
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(settings: PrinterSettings): void {
    try {
      localStorage.setItem('receipt_printer_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving printer settings:', error);
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('receipt_printer_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.settingsSubject.next({ ...this.defaultSettings, ...settings });
      }
    } catch (error) {
      console.error('Error loading printer settings:', error);
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d);
  }

  /**
   * Get payment method label
   */
  private getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      'CASH': 'Tunai',
      'DEBIT': 'Kartu Debit',
      'CREDIT': 'Kartu Kredit',
      'QRIS': 'QRIS',
      'TRANSFER': 'Transfer Bank'
    };
    return labels[method] || method;
  }

  /**
   * Validate receipt data
   */
  validateReceiptData(data: ReceiptData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.sale) {
      errors.push('Sale data is required');
    } else {
      if (!data.sale.saleNumber) errors.push('Sale number is required');
      if (!data.sale.items || data.sale.items.length === 0) errors.push('Sale items are required');
      if (data.sale.total <= 0) errors.push('Sale total must be greater than 0');
    }

    if (!data.storeName) errors.push('Store name is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get receipt preview URL
   */
  async getReceiptPreviewURL(saleId: number): Promise<string> {
    try {
      const html = await this.generateReceiptHTML(saleId);
      const blob = new Blob([html], { type: 'text/html' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating receipt preview URL:', error);
      throw error;
    }
  }

  /**
   * Print test receipt
   */
  async printTestReceipt(): Promise<boolean> {
    try {
      const testData: ReceiptData = {
        sale: {
          id: 999,
          saleNumber: 'TEST-001',
          saleDate: new Date(),
          subtotal: 50000,
          discountAmount: 5000,
          taxAmount: 4950,
          total: 49950,
          amountPaid: 50000,
          changeAmount: 50,
          paymentMethod: 'CASH',
          cashierId: 1,
          cashierName: 'Test Cashier',
          status: 'Completed',
          receiptPrinted: false,
          items: [
            {
              id: 1,
              saleId: 999,
              productId: 1,
              productName: 'Test Product',
              productBarcode: 'TEST123',
              quantity: 2,
              sellPrice: 25000,
              buyPrice: 20000,
              discount: 5000,
              subtotal: 45000,
              totalProfit: 5000
            }
          ],
          createdAt: new Date(),
          totalItems: 2,
          totalProfit: 5000,
          discountPercentage: 10,
          redeemedPoints: 0
        } as Sale,
        storeName: 'Toko Eniwan',
        storeAddress: 'Jl. Test No. 123, Jakarta',
        storePhone: '021-123456',
        footerMessage: 'Test receipt - please ignore'
      };

      const html = this.buildReceiptHTML(testData);
      
      // Create print window for test
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Receipt</title>
          <style>
            @media print {
              body { margin: 0; }
              .receipt { width: 100% !important; }
              @page { margin: 0; size: 58mm auto; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 10px;
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      return true;
      
    } catch (error) {
      console.error('Error printing test receipt:', error);
      throw error;
    }
  }
}