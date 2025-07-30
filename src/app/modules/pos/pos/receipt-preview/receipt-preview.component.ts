// src/app/modules/pos/receipt-preview/receipt-preview.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Mock interfaces
interface TransactionItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  timestamp: Date;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
}

@Component({
  selector: 'app-receipt-preview',
  templateUrl: './receipt-preview.component.html',
  styleUrls: ['./receipt-preview.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ReceiptPreviewComponent implements OnInit {
  @Input() transaction: Transaction | null = null;
  
  // Mock transaction data
  mockTransaction: Transaction = {
    id: 'TXN' + Date.now(),
    items: [
      {
        name: 'Mie Instan Sedap Goreng',
        quantity: 2,
        price: 3500,
        discount: 0,
        subtotal: 7000
      },
      {
        name: 'Susu UHT Indomilk 250ml',
        quantity: 1,
        price: 5500,
        discount: 5,
        subtotal: 5225
      },
      {
        name: 'Sabun Mandi Lifebuoy',
        quantity: 1,
        price: 12000,
        discount: 0,
        subtotal: 12000
      }
    ],
    subtotal: 24225,
    discount: 275,
    tax: 2395,
    total: 26345,
    paid: 30000,
    change: 3655,
    paymentMethod: 'cash',
    timestamp: new Date(),
    cashierName: 'Admin',
    customerName: 'John Doe',
    customerPhone: '081234567890'
  };

  isLoading = false;
  isPrinting = false;
  isDownloading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Get transaction ID from route
    const transactionId = this.route.snapshot.paramMap.get('transactionId');
    if (transactionId) {
      this.loadTransaction(transactionId);
    } else if (!this.transaction) {
      // Use mock data if no transaction provided
      this.transaction = this.mockTransaction;
    }
  }

  /**
   * Load transaction by ID (mock implementation)
   */
  private loadTransaction(transactionId: string) {
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      // In real app, fetch from service
      this.transaction = {
        ...this.mockTransaction,
        id: transactionId
      };
      this.isLoading = false;
    }, 500);
  }

  /**
   * Print receipt
   */
  async printReceipt() {
    if (!this.transaction) return;

    this.isPrinting = true;

    try {
      // Create printable content
      const printContent = this.generatePrintableHTML();
      
      // Open print dialog
      const printWindow = window.open('', '_blank', 'width=600,height=800');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }

      console.log('Receipt printed successfully');
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Gagal mencetak struk');
    } finally {
      this.isPrinting = false;
    }
  }

  /**
   * Download receipt as PDF (mock implementation)
   */
  async downloadPDF() {
    if (!this.transaction) return;

    this.isDownloading = true;

    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real app, use PDF library like jsPDF
      const filename = `struk-${this.transaction.id}.pdf`;
      console.log('PDF would be downloaded as:', filename);
      
      // Mock download
      alert(`PDF struk ${this.transaction.id} berhasil diunduh`);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Gagal mengunduh PDF');
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Share receipt via WhatsApp
   */
  shareWhatsApp() {
    if (!this.transaction) return;

    const message = this.generateWhatsAppMessage();
    const phoneNumber = this.transaction.customerPhone?.replace(/\D/g, '') || '';
    
    let whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // If no phone number, open WhatsApp web
    if (!phoneNumber) {
      whatsappURL = `https://wa.me/?text=${encodeURIComponent(message)}`;
    }

    window.open(whatsappURL, '_blank');
  }

  /**
   * Generate WhatsApp message
   */
  private generateWhatsAppMessage(): string {
    if (!this.transaction) return '';

    let message = `🧾 *STRUK BELANJA*\n`;
    message += `📅 ${this.formatDate(this.transaction.timestamp)}\n`;
    message += `🏪 Toko Eniwan\n`;
    message += `💳 ID: ${this.transaction.id}\n\n`;

    message += `📋 *DETAIL PEMBELIAN:*\n`;
    this.transaction.items.forEach(item => {
      message += `• ${item.name}\n`;
      message += `  ${item.quantity}x ${this.formatCurrency(item.price)}`;
      if (item.discount > 0) {
        message += ` (-${item.discount}%)`;
      }
      message += ` = ${this.formatCurrency(item.subtotal)}\n`;
    });

    message += `\n💰 *RINGKASAN:*\n`;
    message += `Subtotal: ${this.formatCurrency(this.transaction.subtotal)}\n`;
    if (this.transaction.discount > 0) {
      message += `Diskon: -${this.formatCurrency(this.transaction.discount)}\n`;
    }
    message += `Pajak: ${this.formatCurrency(this.transaction.tax)}\n`;
    message += `*Total: ${this.formatCurrency(this.transaction.total)}*\n`;
    message += `Dibayar: ${this.formatCurrency(this.transaction.paid)}\n`;
    message += `Kembalian: ${this.formatCurrency(this.transaction.change)}\n\n`;

    message += `👤 Kasir: ${this.transaction.cashierName}\n`;
    message += `🙏 Terima kasih telah berbelanja!`;

    return message;
  }

  /**
   * Generate printable HTML
   */
  private generatePrintableHTML(): string {
    if (!this.transaction) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Struk - ${this.transaction.id}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            width: 58mm;
            background: white;
          }
          .receipt {
            width: 100%;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .store-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .store-info {
            font-size: 10px;
            line-height: 1.2;
          }
          .transaction-info {
            margin-bottom: 10px;
            font-size: 10px;
          }
          .items {
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .item {
            margin-bottom: 5px;
          }
          .item-name {
            font-weight: bold;
          }
          .item-details {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
          }
          .totals {
            margin-bottom: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .total-line.grand-total {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="store-name">TOKO ENIWAN</div>
            <div class="store-info">
              Jl. Contoh No. 123<br>
              Telp: (021) 1234567<br>
              Email: info@tokoeniwan.com
            </div>
          </div>
          
          <div class="transaction-info">
            <div>ID: ${this.transaction.id}</div>
            <div>Tanggal: ${this.formatDate(this.transaction.timestamp)}</div>
            <div>Kasir: ${this.transaction.cashierName}</div>
            ${this.transaction.customerName ? `<div>Customer: ${this.transaction.customerName}</div>` : ''}
          </div>
          
          <div class="items">
            ${this.transaction.items.map(item => `
              <div class="item">
                <div class="item-name">${item.name}</div>
                <div class="item-details">
                  <span>${item.quantity} x ${this.formatCurrency(item.price)}</span>
                  <span>${this.formatCurrency(item.subtotal)}</span>
                </div>
                ${item.discount > 0 ? `<div class="item-details"><span>Diskon ${item.discount}%</span></div>` : ''}
              </div>
            `).join('')}
          </div>
          
          <div class="totals">
            <div class="total-line">
              <span>Subtotal:</span>
              <span>${this.formatCurrency(this.transaction.subtotal)}</span>
            </div>
            ${this.transaction.discount > 0 ? `
              <div class="total-line">
                <span>Diskon:</span>
                <span>-${this.formatCurrency(this.transaction.discount)}</span>
              </div>
            ` : ''}
            <div class="total-line">
              <span>Pajak:</span>
              <span>${this.formatCurrency(this.transaction.tax)}</span>
            </div>
            <div class="total-line grand-total">
              <span>TOTAL:</span>
              <span>${this.formatCurrency(this.transaction.total)}</span>
            </div>
            <div class="total-line">
              <span>Dibayar:</span>
              <span>${this.formatCurrency(this.transaction.paid)}</span>
            </div>
            <div class="total-line">
              <span>Kembalian:</span>
              <span>${this.formatCurrency(this.transaction.change)}</span>
            </div>
          </div>
          
          <div class="footer">
            Terima kasih atas kunjungan Anda!<br>
            Barang yang sudah dibeli tidak dapat ditukar<br>
            Simpan struk ini sebagai bukti pembelian
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Close/navigate back
   */
  close() {
    this.router.navigate(['/pos']);
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * Get payment method display
   */
  getPaymentMethodDisplay(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Tunai',
      'card': 'Kartu',
      'digital': 'Digital'
    };
    return methods[method] || method;
  }

  /**
   * Calculate item count
   */
  getTotalItems(): number {
    if (!this.transaction) return 0;
    return this.transaction.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}