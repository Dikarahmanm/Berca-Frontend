// ✅ RECEIPT SERVICE FIX: src/app/core/services/receipt.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { POSService, SaleDto, ReceiptDataDto } from './pos.service'; // ✅ Now exports from service
import { environment } from '../../../environment/environment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
      console.log('📄 Downloading optimized PDF for sale:', saleId);
      
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
      
      // Generate optimized PDF using client-side library (target <1MB)
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
      
      console.log('✅ Optimized PDF downloaded successfully');
      
    } catch (error) {
      console.error('❌ Download PDF error:', error);
      throw error;
    }
  }

  /**
   * Generate PDF blob from receipt data - ENHANCED to match visual preview with optimized file size
   */

  private async generateReceiptPDF(receiptData: any): Promise<Blob> {
    try {
      // Create a hidden div with the exact same styling as the receipt preview
      const receiptElement = this.createReceiptElement(receiptData);
      document.body.appendChild(receiptElement);

      // Wait for fonts and styling to load
      await new Promise(resolve => setTimeout(resolve, 200));

      // Convert to canvas with optimized settings for smaller file size
      const canvas = await html2canvas(receiptElement, {
        scale: 2, // Reduced from 3 to 2 for smaller file size while maintaining quality
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: receiptElement.scrollWidth,
        height: receiptElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        removeContainer: false,
        imageTimeout: 0
      });

      // Remove the temporary element
      document.body.removeChild(receiptElement);

      // Create PDF with optimized compression
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG with 85% quality for smaller file size
      
      // Calculate proper dimensions for A4 or thermal receipt
      const isSmallReceipt = receiptElement.scrollWidth <= 400;
      
      let pdf;
      if (isSmallReceipt) {
        // Thermal receipt size (80mm wide, auto height)
        const pdfWidth = 80;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [pdfWidth, Math.max(pdfHeight, 100)] // Minimum 100mm height
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } else {
        // A4 size for full receipts
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 20; // 10mm margin on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let currentHeight = 0;
        const marginTop = 10;
        const marginLeft = 10;
        
        // If image fits in one page
        if (imgHeight <= pageHeight - 20) {
          pdf.addImage(imgData, 'JPEG', marginLeft, marginTop, imgWidth, imgHeight);
        } else {
          // Split across multiple pages if needed
          const pageContentHeight = pageHeight - 20;
          const numPages = Math.ceil(imgHeight / pageContentHeight);
          
          for (let i = 0; i < numPages; i++) {
            if (i > 0) pdf.addPage();
            
            const sourceY = (canvas.height / numPages) * i;
            const sourceHeight = canvas.height / numPages;
            
            // Create a temporary canvas for this page section
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = sourceHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
              tempCtx.drawImage(canvas, 0, -sourceY);
              const tempImgData = tempCanvas.toDataURL('image/jpeg', 0.85);
              pdf.addImage(tempImgData, 'JPEG', marginLeft, marginTop, imgWidth, pageContentHeight);
            }
          }
        }
      }

      // Return as blob
      return new Promise((resolve) => {
        const pdfBlob = pdf.output('blob');
        resolve(pdfBlob);
      });
      
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      // Fallback to text-based PDF
      return this.generateSimpleTextPDF(receiptData);
    }
  }

  /**
   * Create receipt element with exact same styling as receipt preview
   */
  private createReceiptElement(receiptData: any): HTMLElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 400px;
      min-height: 600px;
      background: white;
      padding: 24px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      box-sizing: border-box;
    `;

    const sale = receiptData.sale;
    
    div.innerHTML = `
      <!-- Store Header -->
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #FF914D; padding-bottom: 16px;">
        <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: bold; color: #FF914D;">${receiptData.storeName}</h1>
        <p style="margin: 4px 0; font-size: 13px; color: #666;">${receiptData.storeAddress}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #666;">${receiptData.storePhone}</p>
        ${receiptData.storeEmail ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">${receiptData.storeEmail}</p>` : ''}
      </div>

      <!-- Divider -->
      <div style="text-align: center; margin: 16px 0; font-weight: bold; letter-spacing: 1px; font-size: 12px;">================================</div>

      <!-- Transaction Info -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
          <span style="font-weight: bold; font-size: 13px;">No Transaksi:</span>
          <span style="font-size: 13px;">${sale.saleNumber || sale.id}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
          <span style="font-weight: bold; font-size: 13px;">Tanggal:</span>
          <span style="font-size: 13px;">${this.formatDate(sale.saleDate)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
          <span style="font-weight: bold; font-size: 13px;">Waktu:</span>
          <span style="font-size: 13px;">${this.formatTime(sale.saleDate)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
          <span style="font-weight: bold; font-size: 13px;">Kasir:</span>
          <span style="font-size: 13px;">${sale.cashierName || 'Admin'}</span>
        </div>
        ${sale.customerName ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
          <span style="font-weight: bold; font-size: 13px;">Customer:</span>
          <span style="font-size: 13px;">${sale.customerName}</span>
        </div>` : ''}
        ${sale.customerPhone ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
          <span style="font-weight: bold; font-size: 13px;">Telepon:</span>
          <span style="font-size: 13px;">${sale.customerPhone}</span>
        </div>` : ''}
        ${sale.memberName ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
          <span style="font-weight: bold; font-size: 13px;">Member:</span>
          <span style="font-size: 13px;">${sale.memberName}</span>
        </div>` : ''}
      </div>

      <!-- Divider -->
      <div style="text-align: center; margin: 16px 0; font-weight: bold; letter-spacing: 1px; font-size: 12px;">================================</div>

      <!-- Items -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px; font-size: 13px;">
          <span>ITEM</span>
          <span>TOTAL</span>
        </div>

        ${sale.items?.map((item: any) => `
          <div style="margin-bottom: 16px; border-bottom: 1px dotted #ccc; padding-bottom: 10px;">
            <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px; color: #333;">${item.productName || item.product?.name || 'Unknown Product'}</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 2px;">
              <span>${this.getItemQuantity(item)} x ${this.formatCurrency(this.getItemPrice(item))}</span>
              <span style="font-weight: bold; color: #333; font-size: 13px;">${this.formatCurrency(this.getItemSubtotal(item))}</span>
            </div>
            ${this.getItemDiscount(item) > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #E15A4F; margin-top: 2px;">
              <span>Diskon ${this.getItemDiscount(item)}%</span>
              <span>-${this.formatCurrency(this.getItemPrice(item) * this.getItemQuantity(item) * this.getItemDiscount(item) / 100)}</span>
            </div>` : ''}
          </div>
        `).join('') || '<div style="text-align: center; color: #999; padding: 20px; font-size: 13px;">Tidak ada item</div>'}
      </div>

      <!-- Divider -->
      <div style="text-align: center; margin: 16px 0; font-weight: bold; letter-spacing: 1px; font-size: 12px;">================================</div>

      <!-- Summary -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
          <span>Subtotal:</span>
          <span>${this.formatCurrency(sale.subtotal || 0)}</span>
        </div>
        ${(sale.discountAmount || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #E15A4F; font-size: 13px;">
          <span>Diskon:</span>
          <span>-${this.formatCurrency(sale.discountAmount)}</span>
        </div>` : ''}
        ${(sale.taxAmount || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
          <span>Pajak:</span>
          <span>${this.formatCurrency(sale.taxAmount)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; color: #FF914D;">
          <span>TOTAL:</span>
          <span>${this.formatCurrency(sale.total || 0)}</span>
        </div>
      </div>

      <!-- Divider -->
      <div style="text-align: center; margin: 16px 0; font-weight: bold; letter-spacing: 1px; font-size: 12px;">================================</div>

      <!-- Payment Info -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
          <span>Metode Bayar:</span>
          <span>${this.getPaymentMethodLabel(sale.paymentMethod || 'cash')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
          <span>Bayar:</span>
          <span>${this.formatCurrency(sale.amountPaid || 0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
          <span>Kembali:</span>
          <span>${this.formatCurrency(sale.changeAmount || 0)}</span>
        </div>
      </div>

      <!-- Loyalty Points -->
      ${sale.memberId ? `
      <div style="margin-bottom: 20px; border-top: 1px dotted #ccc; padding-top: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
          <span>Poin Didapat:</span>
          <span style="color: #4BBF7B; font-weight: bold;">+${this.getPointsEarned()} poin</span>
        </div>
      </div>` : ''}

      <!-- Notes -->
      ${sale.notes ? `
      <div style="margin-bottom: 20px; border-top: 1px dotted #ccc; padding-top: 12px;">
        <div style="font-weight: bold; margin-bottom: 4px; font-size: 13px;">Catatan:</div>
        <div style="font-size: 12px; color: #666; word-wrap: break-word;">${sale.notes}</div>
      </div>` : ''}

      <!-- Footer -->
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
        <p style="margin: 8px 0; font-size: 13px; color: #666; font-weight: bold;">${receiptData.footerMessage}</p>
        <p style="margin: 6px 0; font-size: 11px; color: #999;">Barang yang sudah dibeli tidak dapat dikembalikan</p>
        <p style="margin: 12px 0 0 0; font-size: 10px; color: #999;">Powered by Toko Eniwan POS System</p>
        <p style="margin: 4px 0 0 0; font-size: 10px; color: #ccc;">${new Date().toLocaleString('id-ID')}</p>
      </div>
    `;

    return div;
  }

  /**
   * Fallback: Generate simple text-based PDF
   */
  private generateSimpleTextPDF(receiptData: any): Blob {
    const content = this.generateReceiptText(receiptData);
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    // Add text content
    const lines = content.split('\n');
    let y = 10;
    const lineHeight = 4;

    lines.forEach(line => {
      if (y > 190) { // Add new page if needed
        pdf.addPage();
        y = 10;
      }
      pdf.text(line, 5, y);
      y += lineHeight;
    });

    return pdf.output('blob');
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
   * Share receipt via native sharing or WhatsApp - now shares PDF file
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
      
      if (method === 'native' && navigator.share) {
        // Generate optimized PDF for sharing
        const pdfBlob = await this.generateReceiptPDF(receiptData);
        const fileName = `receipt_${receiptData.sale.saleNumber || receiptData.sale.id}.pdf`;
        
        // Create a File object from the blob
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        // Share the PDF file directly
        await navigator.share({
          title: 'Struk Pembayaran',
          text: `Struk pembayaran ${receiptData.storeName} - ${receiptData.sale.saleNumber}`,
          files: [pdfFile]
        });
      } else {
        // Fallback: Generate share text for WhatsApp
        const shareText = this.generateShareText(receiptData);
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      }
      
    } catch (error) {
      console.error('❌ Share receipt error:', error);
      
      // Fallback to text sharing if file sharing fails
      if (method === 'native') {
        try {
          const receiptResponse = await this.posService.getReceiptData(saleId).toPromise();
          if (receiptResponse?.success && receiptResponse.data) {
            const shareText = this.generateShareText(receiptResponse.data);
            await navigator.share({
              title: 'Struk Pembayaran',
              text: shareText
            });
          }
        } catch (fallbackError) {
          console.error('❌ Fallback share error:', fallbackError);
          throw new Error('Gagal membagikan struk');
        }
      } else {
        throw error;
      }
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

  private getItemDiscount(item: any): number {
    return item.discount || item.discountPercent || item.discountPercentage || 0;
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
      'card': 'Kartu',
      'debit': 'Kartu Debit',
      'credit': 'Kartu Kredit',
      'digital': 'Digital',
      'qris': 'QRIS',
      'transfer': 'Transfer Bank',
      'ewallet': 'E-Wallet'
    };
    return methods[method] || 'Tunai';
  }

  private getPointsEarned(): number {
    // Simple calculation: 1 point per 1000 IDR
    // This should be replaced with actual business logic
    return 0; // Placeholder for loyalty points calculation
  }
}