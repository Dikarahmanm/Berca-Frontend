// ✅ RECEIPT SERVICE FIX: src/app/core/services/receipt.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { POSService, SaleDto, ReceiptDataDto } from './pos.service'; // ✅ Now exports from service
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private posService: POSService
  ) {}

  /**
   * Print receipt using browser
   */
  async printReceipt(saleId: number): Promise<void> {
    try {
      console.log('🖨️ Printing receipt for sale:', saleId);
      
      // ✅ FIX: Use sale data directly instead of receipt endpoint
      const saleResponse = await this.posService.getSaleById(saleId).toPromise();
      
      if (!saleResponse?.success || !saleResponse.data) {
        throw new Error('Failed to get sale data');
      }

      const sale = saleResponse.data;
      
      // Create receipt data structure
      const receiptData = {
        sale: sale,
        storeName: 'Toko Eniwan',
        storeAddress: 'Bekasi, West Java',
        storePhone: '+62 xxx-xxxx-xxxx',
        storeEmail: 'info@tokoeniwan.com',
        footerMessage: 'Terima kasih atas kunjungan Anda!'
      };
      
      // Generate print content
      const printContent = this.generatePrintHTML(receiptData);
      
      // Print using browser API
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            
            // Mark as printed after successful print
            this.posService.markReceiptPrinted(saleId).subscribe({
              next: (response) => {
                console.log('✅ Receipt marked as printed:', response);
              },
              error: (error) => {
                console.warn('⚠️ Failed to mark receipt as printed:', error);
                // Don't throw error since printing was successful
              }
            });
            
            // Close window after printing
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
   * Download receipt as PDF - Client side generation
   */
  async downloadReceiptPDF(saleId: number): Promise<void> {
    try {
      console.log('📄 Downloading PDF for sale:', saleId);
      
      // ✅ FIX: Use sale data directly and generate PDF client-side
      const saleResponse = await this.posService.getSaleById(saleId).toPromise();
      
      if (!saleResponse?.success || !saleResponse.data) {
        throw new Error('Failed to get sale data');
      }

      const sale = saleResponse.data;
      
      // Create receipt data structure
      const receiptData = {
        sale: sale,
        storeName: 'Toko Eniwan',
        storeAddress: 'Bekasi, West Java',
        storePhone: '+62 xxx-xxxx-xxxx',
        storeEmail: 'info@tokoeniwan.com',
        footerMessage: 'Terima kasih atas kunjungan Anda!'
      };
      
      // Generate PDF using client-side library
      const pdfBlob = await this.generateReceiptPDF(receiptData);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${sale.saleNumber || saleId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('❌ Download PDF error:', error);
      throw error;
    }
  }

  /**
   * Generate PDF blob from receipt data
   */
  private async generateReceiptPDF(receiptData: any): Promise<Blob> {
    // Simple text-based PDF generation
    // In production, you'd use a proper PDF library like jsPDF
    const content = this.generateReceiptText(receiptData);
    
    // Create a simple PDF-like blob (for demo purposes)
    // Replace with proper PDF generation library
    const blob = new Blob([content], { type: 'text/plain' });
    return blob;
  }

  /**
   * Generate receipt text content
   */
  private generateReceiptText(receiptData: any): string {
    const sale = receiptData.sale;
    
    return `
=== STRUK PEMBAYARAN ===

${receiptData.storeName}
${receiptData.storeAddress}
${receiptData.storePhone}

================================

No: ${sale.saleNumber}
Tanggal: ${this.formatDateTime(sale.saleDate)}
Kasir: ${sale.cashierName}
${sale.memberName ? `Member: ${sale.memberName}` : ''}

================================

ITEM PEMBELIAN:
${sale.items?.map((item: any) => 
  `${item.productName}\n${this.getItemQuantity(item)} x ${this.formatCurrency(this.getItemPrice(item))} = ${this.formatCurrency(this.getItemSubtotal(item))}`
).join('\n\n') || 'No items'}

================================

Subtotal: ${this.formatCurrency(sale.subtotal)}
${sale.discountAmount > 0 ? `Diskon: -${this.formatCurrency(sale.discountAmount)}\n` : ''}
${sale.taxAmount > 0 ? `Pajak: ${this.formatCurrency(sale.taxAmount)}\n` : ''}
TOTAL: ${this.formatCurrency(sale.total)}

Bayar: ${this.formatCurrency(sale.amountPaid)}
Kembali: ${this.formatCurrency(sale.changeAmount)}

================================

${receiptData.footerMessage}
Barang yang sudah dibeli tidak dapat dikembalikan
    `.trim();
  }

  /**
   * Share receipt via native sharing or WhatsApp
   */
  async shareReceipt(saleId: number, method: 'native' | 'whatsapp' = 'native'): Promise<void> {
    try {
      console.log('📤 Sharing receipt:', saleId, 'via', method);
      
      // Get receipt data
      const receiptResponse = await this.posService.getReceiptData(saleId).toPromise();
      
      if (!receiptResponse?.success || !receiptResponse.data) {
        throw new Error('Failed to get receipt data');
      }

      const receiptData = receiptResponse.data;
      const shareText = this.generateShareText(receiptData);
      
      if (method === 'native' && navigator.share) {
        await navigator.share({
          title: 'Struk Pembayaran',
          text: shareText,
          url: `${window.location.origin}/receipt/digital/${receiptData.sale.saleNumber}`
        });
      } else {
        // Fallback to WhatsApp
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      }
      
    } catch (error) {
      console.error('❌ Share receipt error:', error);
      throw error;
    }
  }

    /**
     * Generate share text content
     */
    private generateShareText(receiptData: any): string {
      const sale = receiptData.sale;
      
      return `
  🧾 *STRUK PEMBAYARAN*
  
  📍 ${receiptData.storeName}
  ${receiptData.storeAddress}
  ${receiptData.storePhone}
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  📝 No: ${sale.saleNumber}
  📅 Tanggal: ${this.formatDateTime(sale.saleDate)}
  👤 Kasir: ${sale.cashierName}
  ${sale.memberName ? `🎫 Member: ${sale.memberName}\n` : ''}
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  🛒 *ITEM PEMBELIAN:*
  ${sale.items?.map((item: any) => 
    `• ${item.productName}\n  ${this.getItemQuantity(item)} x ${this.formatCurrency(this.getItemPrice(item))} = ${this.formatCurrency(this.getItemSubtotal(item))}`
  ).join('\n\n') || 'Tidak ada item'}
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  💰 Subtotal: ${this.formatCurrency(sale.subtotal)}
  ${sale.discountAmount > 0 ? `🎯 Diskon: -${this.formatCurrency(sale.discountAmount)}\n` : ''}
  ${sale.taxAmount > 0 ? `📋 Pajak: ${this.formatCurrency(sale.taxAmount)}\n` : ''}
  💳 *TOTAL: ${this.formatCurrency(sale.total)}*
  
  💵 Bayar: ${this.formatCurrency(sale.amountPaid)}
  💰 Kembali: ${this.formatCurrency(sale.changeAmount)}
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ${receiptData.footerMessage}
  Barang yang sudah dibeli tidak dapat dikembalikan
  
  Powered by Toko Eniwan POS System
      `.trim();
    }
  
    /**
     * Generate print HTML content
     */
    private generatePrintHTML(receiptData: any): string {
    const sale = receiptData.sale;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk #${sale.saleNumber}</title>
        <style>
          @media print {
            @page { size: 58mm auto; margin: 2mm; }
            body { margin: 0; font-family: monospace; }
          }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            line-height: 1.4; 
            max-width: 54mm; 
            margin: 0 auto; 
          }
          .center { text-align: center; }
          .left { text-align: left; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .dashed { border-top: 1px dashed #000; margin: 4px 0; }
          .item { margin: 2px 0; }
          .item-line { display: flex; justify-content: space-between; }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        <div class="center bold">
          <div>${receiptData.storeName}</div>
          <div style="font-size: 10px; font-weight: normal;">
            ${receiptData.storeAddress}<br>
            ${receiptData.storePhone}
          </div>
        </div>
        
        <div class="dashed"></div>
        
        <div class="left">
          <div>No: ${sale.saleNumber}</div>
          <div>Tanggal: ${this.formatDateTime(sale.saleDate)}</div>
          <div>Kasir: ${sale.cashierName}</div>
          ${sale.memberName ? `<div>Member: ${sale.memberName}</div>` : ''}
        </div>
        
        <div class="dashed"></div>
        
        <div class="left">
          ${sale.items?.map((item: any) => `
            <div class="item">
              <div class="bold">${item.productName}</div>
              <div class="item-line">
                <span>${this.getItemQuantity(item)} x ${this.formatCurrency(this.getItemPrice(item))}</span>
                <span>${this.formatCurrency(this.getItemSubtotal(item))}</span>
              </div>
            </div>
          `).join('') || '<div>No items</div>'}
        </div>
        
        <div class="dashed"></div>
        
        <div class="left">
          <div class="item-line">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(sale.subtotal)}</span>
          </div>
          ${sale.discountAmount > 0 ? `
            <div class="item-line">
              <span>Diskon:</span>
              <span>-${this.formatCurrency(sale.discountAmount)}</span>
            </div>
          ` : ''}
          ${sale.taxAmount > 0 ? `
            <div class="item-line">
              <span>Pajak:</span>
              <span>${this.formatCurrency(sale.taxAmount)}</span>
            </div>
          ` : ''}
          <div class="item-line bold">
            <span>TOTAL:</span>
            <span>${this.formatCurrency(sale.total)}</span>
          </div>
          <div class="item-line">
            <span>Bayar:</span>
            <span>${this.formatCurrency(sale.amountPaid)}</span>
          </div>
          <div class="item-line">
            <span>Kembali:</span>
            <span>${this.formatCurrency(sale.changeAmount)}</span>
          </div>
        </div>
        
        <div class="dashed"></div>
        
        <div class="center">
          <div style="font-size: 10px;">
            ${receiptData.footerMessage || 'Terima kasih atas kunjungan Anda!'}
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 100);
          }
        </script>
      </body>
      </html>
    `;
  }

  // Helper methods with field mapping
  private getItemPrice(item: any): number {
    return item.unitPrice || item.sellPrice || item.price || 0;
  }

  private getItemSubtotal(item: any): number {
    return item.subtotal || item.totalPrice || item.total || 0;
  }

  private getItemQuantity(item: any): number {
    return item.quantity || 1;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private formatDateTime(date: Date | string): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    });
  }
}