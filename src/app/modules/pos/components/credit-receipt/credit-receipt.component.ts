import { Component, input, output, signal, computed, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CreditReceiptData {
  transactionId: string;
  memberName: string;
  memberCode: string;
  creditAmount: number;
  totalAmount: number;
  items: ReceiptItem[];
  paymentMethod: string;
  cashierName: string;
  storeName: string;
  storeAddress: string;
  transactionDate: string;
  dueDate: string;
  reference?: string;
  previousDebt: number;
  newDebt: number;
  creditLimit: number;
  remainingLimit: number;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  discount?: number;
}

@Component({
  selector: 'app-credit-receipt',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="credit-receipt-container">
      <!-- Receipt Preview -->
      <div class="receipt-preview" #receiptPreview>
        <div class="receipt-paper">
          <!-- Header -->
          <div class="receipt-header">
            <div class="store-logo">🏪</div>
            <h2 class="store-name">{{ receiptData().storeName }}</h2>
            <p class="store-address">{{ receiptData().storeAddress }}</p>
            <div class="receipt-type">STRUK KREDIT MEMBER</div>
          </div>

          <!-- Transaction Info -->
          <div class="receipt-section">
            <div class="section-title">INFORMASI TRANSAKSI</div>
            <div class="info-line">
              <span class="info-label">No. Transaksi:</span>
              <span class="info-value">{{ receiptData().transactionId }}</span>
            </div>
            <div class="info-line">
              <span class="info-label">Tanggal:</span>
              <span class="info-value">{{ formatDateTime(receiptData().transactionDate) }}</span>
            </div>
            <div class="info-line">
              <span class="info-label">Kasir:</span>
              <span class="info-value">{{ receiptData().cashierName }}</span>
            </div>
            @if (receiptData().reference) {
            <div class="info-line">
              <span class="info-label">Referensi:</span>
              <span class="info-value">{{ receiptData().reference }}</span>
            </div>
            }
          </div>

          <!-- Member Info -->
          <div class="receipt-section">
            <div class="section-title">INFORMASI MEMBER</div>
            <div class="info-line">
              <span class="info-label">Nama:</span>
              <span class="info-value">{{ receiptData().memberName }}</span>
            </div>
            <div class="info-line">
              <span class="info-label">Kode Member:</span>
              <span class="info-value">{{ receiptData().memberCode }}</span>
            </div>
            <div class="info-line">
              <span class="info-label">Limit Kredit:</span>
              <span class="info-value">{{ formatCurrency(receiptData().creditLimit) }}</span>
            </div>
          </div>

          <!-- Items -->
          <div class="receipt-section">
            <div class="section-title">DETAIL PEMBELIAN</div>
            <div class="items-header">
              <span class="item-name">Item</span>
              <span class="item-qty">Qty</span>
              <span class="item-price">Harga</span>
              <span class="item-total">Total</span>
            </div>
            
            @for (item of receiptData().items; track $index) {
            <div class="item-line">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-qty">{{ item.quantity }}</span>
              <span class="item-price">{{ formatCurrency(item.price) }}</span>
              <span class="item-total">{{ formatCurrency(item.total) }}</span>
            </div>
            @if (item.discount && item.discount > 0) {
            <div class="discount-line">
              <span class="discount-text">Diskon: -{{ formatCurrency(item.discount) }}</span>
            </div>
            }
            }
          </div>

          <!-- Totals -->
          <div class="receipt-section">
            <div class="totals-line subtotal">
              <span class="totals-label">Subtotal:</span>
              <span class="totals-value">{{ formatCurrency(subtotalAmount()) }}</span>
            </div>
            @if (totalDiscount() > 0) {
            <div class="totals-line discount">
              <span class="totals-label">Total Diskon:</span>
              <span class="totals-value">-{{ formatCurrency(totalDiscount()) }}</span>
            </div>
            }
            <div class="totals-line total">
              <span class="totals-label">TOTAL:</span>
              <span class="totals-value">{{ formatCurrency(receiptData().totalAmount) }}</span>
            </div>
          </div>

          <!-- Payment Info -->
          <div class="receipt-section payment-section">
            <div class="section-title">PEMBAYARAN</div>
            <div class="payment-line">
              <span class="payment-label">Metode Pembayaran:</span>
              <span class="payment-value credit">KREDIT MEMBER</span>
            </div>
            <div class="payment-line">
              <span class="payment-label">Jumlah Kredit:</span>
              <span class="payment-value">{{ formatCurrency(receiptData().creditAmount) }}</span>
            </div>
            <div class="payment-line due-date">
              <span class="payment-label">Jatuh Tempo:</span>
              <span class="payment-value">{{ formatDate(receiptData().dueDate) }}</span>
            </div>
          </div>

          <!-- Credit Summary -->
          <div class="receipt-section credit-summary">
            <div class="section-title">RINGKASAN KREDIT</div>
            <div class="credit-line">
              <span class="credit-label">Hutang Sebelumnya:</span>
              <span class="credit-value">{{ formatCurrency(receiptData().previousDebt) }}</span>
            </div>
            <div class="credit-line">
              <span class="credit-label">Hutang Baru:</span>
              <span class="credit-value">{{ formatCurrency(receiptData().creditAmount) }}</span>
            </div>
            <div class="credit-line total-debt">
              <span class="credit-label">Total Hutang:</span>
              <span class="credit-value">{{ formatCurrency(receiptData().newDebt) }}</span>
            </div>
            <div class="credit-line remaining">
              <span class="credit-label">Sisa Limit:</span>
              <span class="credit-value">{{ formatCurrency(receiptData().remainingLimit) }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="receipt-footer">
            <div class="footer-note">
              <p>⚠️ PENTING:</p>
              <p>• Simpan struk ini sebagai bukti transaksi</p>
              <p>• Hutang harus dilunasi sebelum jatuh tempo</p>
              <p>• Keterlambatan pembayaran dikenakan denda</p>
              <p>• Hubungi toko untuk informasi pembayaran</p>
            </div>
            
            <div class="qr-section">
              <div class="qr-placeholder">📱</div>
              <p class="qr-text">Scan QR Code untuk<br>tracking pembayaran</p>
            </div>

            <div class="thank-you">
              <p>Terima kasih atas kepercayaan Anda!</p>
              <p class="footer-tagline">{{ receiptData().storeName }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="receipt-actions">
        <button class="btn btn-outline" (click)="onPreview()">
          👁️ Preview
        </button>
        <button class="btn btn-primary" (click)="onPrint()">
          🖨️ Cetak
        </button>
        <button class="btn btn-outline" (click)="onSave()">
          💾 Simpan
        </button>
        <button class="btn btn-outline" (click)="onEmail()">
          📧 Email
        </button>
      </div>
    </div>
  `,
  styles: [`
    .credit-receipt-container {
      max-width: 400px;
      margin: 0 auto;
      padding: var(--s4);
    }

    .receipt-preview {
      margin-bottom: var(--s4);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      background: white;
    }

    .receipt-paper {
      width: 100%;
      background: white;
      color: #000;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.2;
      padding: 16px;
    }

    .receipt-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px dashed #000;
    }

    .store-logo {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .store-name {
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }

    .store-address {
      font-size: 11px;
      margin: 0 0 8px 0;
      line-height: 1.3;
    }

    .receipt-type {
      font-size: 14px;
      font-weight: bold;
      background: #000;
      color: white;
      padding: 4px 8px;
      display: inline-block;
      margin-top: 8px;
    }

    .receipt-section {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #000;

      &.payment-section {
        background: rgba(0, 0, 0, 0.05);
        margin: 0 -16px 16px -16px;
        padding: 12px 16px;
      }

      &.credit-summary {
        background: rgba(255, 193, 7, 0.1);
        margin: 0 -16px 16px -16px;
        padding: 12px 16px;
        border: 1px solid #ffc107;
      }
    }

    .section-title {
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 8px;
      text-decoration: underline;
    }

    .info-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 11px;
    }

    .info-label {
      flex: 1;
    }

    .info-value {
      font-weight: bold;
      text-align: right;
    }

    .items-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 4px;
      font-size: 10px;
      font-weight: bold;
      padding: 4px 0;
      border-bottom: 1px solid #000;
      margin-bottom: 4px;
      text-align: center;
    }

    .item-name {
      text-align: left !important;
    }

    .item-line {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 4px;
      font-size: 10px;
      margin-bottom: 2px;
      text-align: center;
    }

    .item-line .item-name {
      text-align: left;
      font-weight: bold;
    }

    .discount-line {
      margin-bottom: 4px;
      padding-left: 8px;
    }

    .discount-text {
      font-size: 10px;
      font-style: italic;
      color: #666;
    }

    .totals-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 11px;

      &.subtotal {
        border-top: 1px solid #000;
        padding-top: 4px;
        margin-top: 8px;
      }

      &.discount .totals-value {
        color: #dc3545;
      }

      &.total {
        font-size: 13px;
        font-weight: bold;
        border-top: 2px solid #000;
        padding-top: 4px;
        margin-top: 4px;
      }
    }

    .payment-line, .credit-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 11px;

      &.due-date {
        background: rgba(220, 53, 69, 0.1);
        padding: 4px;
        border: 1px solid #dc3545;
        margin: 4px -4px;
        font-weight: bold;
      }

      &.total-debt {
        font-weight: bold;
        font-size: 12px;
        border-top: 1px solid #000;
        padding-top: 4px;
        margin-top: 4px;
      }

      &.remaining {
        background: rgba(40, 167, 69, 0.1);
        padding: 4px;
        margin: 4px -4px;
        border: 1px solid #28a745;
        font-weight: bold;
      }
    }

    .payment-value.credit {
      font-weight: bold;
      text-decoration: underline;
    }

    .receipt-footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 2px dashed #000;
    }

    .footer-note {
      margin-bottom: 16px;
      font-size: 10px;
      line-height: 1.4;

      p {
        margin: 0 0 2px 0;
      }
    }

    .qr-section {
      text-align: center;
      margin-bottom: 16px;
      padding: 8px;
      border: 1px dashed #000;
    }

    .qr-placeholder {
      font-size: 32px;
      margin-bottom: 4px;
    }

    .qr-text {
      font-size: 9px;
      margin: 0;
      line-height: 1.3;
    }

    .thank-you {
      text-align: center;
      font-size: 11px;
      font-weight: bold;

      p {
        margin: 0 0 4px 0;
      }
    }

    .footer-tagline {
      font-style: italic;
      text-decoration: underline;
    }

    .receipt-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--s2);
      margin-top: var(--s4);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--s2);
      padding: var(--s3) var(--s4);
      border: 2px solid transparent;
      border-radius: var(--radius);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      min-height: 44px;

      &.btn-primary {
        background: var(--primary);
        color: white;
        border-color: var(--primary);

        &:hover:not(:disabled) {
          background: var(--primary-hover);
          border-color: var(--primary-hover);
        }
      }

      &.btn-outline {
        background: var(--surface);
        color: var(--text);
        border-color: var(--border);

        &:hover:not(:disabled) {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    // Print styles
    @media print {
      .credit-receipt-container {
        max-width: none;
        padding: 0;
      }

      .receipt-preview {
        border: none;
        margin: 0;
        box-shadow: none;
      }

      .receipt-actions {
        display: none;
      }

      .receipt-paper {
        font-size: 10px;
      }
    }

    // Mobile responsive
    @media (max-width: 640px) {
      .credit-receipt-container {
        padding: var(--s2);
      }

      .receipt-actions {
        grid-template-columns: 1fr;
        gap: var(--s2);
      }

      .items-header, .item-line {
        font-size: 9px;
      }
    }
  `]
})
export class CreditReceiptComponent {
  @ViewChild('receiptPreview') receiptPreview!: ElementRef<HTMLDivElement>;

  // Input signals
  receiptData = input.required<CreditReceiptData>();
  showActions = input<boolean>(true);

  // Output events
  printed = output<void>();
  saved = output<string>(); // Returns base64 or file path
  emailed = output<string>(); // Returns email address
  previewed = output<void>();

  // Computed properties
  subtotalAmount = computed(() => {
    return this.receiptData().items.reduce((sum, item) => sum + item.total, 0);
  });

  totalDiscount = computed(() => {
    return this.receiptData().items.reduce((sum, item) => sum + (item.discount || 0), 0);
  });

  // Event handlers
  onPrint(): void {
    window.print();
    this.printed.emit();
  }

  onPreview(): void {
    // Open preview in new window
    const previewWindow = window.open('', '_blank', 'width=400,height=600');
    if (previewWindow) {
      const receiptHtml = this.generateReceiptHtml();
      previewWindow.document.write(receiptHtml);
      previewWindow.document.close();
    }
    this.previewed.emit();
  }

  onSave(): void {
    // Convert receipt to image or PDF
    const receiptElement = this.receiptPreview.nativeElement;
    
    // Using html2canvas would be ideal here, but for now we'll use a simple approach
    const receiptHtml = this.generateReceiptHtml();
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `kredit-receipt-${this.receiptData().transactionId}.html`;
    link.click();
    
    URL.revokeObjectURL(url);
    this.saved.emit(url);
  }

  onEmail(): void {
    const subject = `Struk Kredit - ${this.receiptData().transactionId}`;
    const body = this.generateEmailBody();
    
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl);
    
    this.emailed.emit('');
  }

  // Utility methods
  private generateReceiptHtml(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk Kredit - ${this.receiptData().transactionId}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; }
          .receipt-paper { max-width: 300px; margin: 0 auto; }
          ${this.getReceiptStyles()}
        </style>
      </head>
      <body>
        <div class="receipt-paper">
          ${this.receiptPreview.nativeElement.innerHTML}
        </div>
      </body>
      </html>
    `;
  }

  private generateEmailBody(): string {
    const data = this.receiptData();
    return `
Struk Kredit Member
===================

Nomor Transaksi: ${data.transactionId}
Tanggal: ${this.formatDateTime(data.transactionDate)}
Member: ${data.memberName} (${data.memberCode})

Total Pembelian: ${this.formatCurrency(data.totalAmount)}
Metode Pembayaran: Kredit Member
Jatuh Tempo: ${this.formatDate(data.dueDate)}

Ringkasan Kredit:
- Hutang Sebelumnya: ${this.formatCurrency(data.previousDebt)}
- Hutang Baru: ${this.formatCurrency(data.creditAmount)}
- Total Hutang: ${this.formatCurrency(data.newDebt)}
- Sisa Limit: ${this.formatCurrency(data.remainingLimit)}

Silakan simpan email ini sebagai bukti transaksi.

---
${data.storeName}
${data.storeAddress}
    `.trim();
  }

  private getReceiptStyles(): string {
    // Return essential CSS for receipt printing
    return `
      .receipt-header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px dashed #000; }
      .store-name { font-size: 16px; font-weight: bold; margin: 0 0 4px 0; }
      .receipt-type { font-size: 14px; font-weight: bold; background: #000; color: white; padding: 4px 8px; }
      .receipt-section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #000; }
      .section-title { font-size: 13px; font-weight: bold; text-align: center; margin-bottom: 8px; }
      .info-line { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
      .totals-line { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
      .total { font-weight: bold; border-top: 2px solid #000; padding-top: 4px; }
    `;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}