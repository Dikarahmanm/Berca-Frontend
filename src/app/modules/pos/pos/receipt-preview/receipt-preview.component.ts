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

  // ===== DATA LOADING =====

  loadSale() {
    this.isLoading = true;
    this.errorMessage = '';

    this.posService.getSaleById(this.saleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.sale = response.data;
            this.generateDigitalReceiptUrl();
          } else {
            this.errorMessage = response.message || 'Transaksi tidak ditemukan';
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Gagal memuat data transaksi';
          console.error('Error loading sale:', error);
        }
      });
  }

  // ===== ACTIONS =====

  async printReceipt() {
    if (!this.sale) return;

    try {
      await this.receiptService.printReceipt(this.sale.id);
      this.showSuccessMessage('Struk berhasil dicetak');
    } catch (error: any) {
      this.errorMessage = error.message || 'Gagal mencetak struk';
      this.clearMessages();
    }
  }

  async downloadPDF() {
    if (!this.sale) return;

    try {
      await this.receiptService.downloadReceiptPDF(this.sale.id);
      this.showSuccessMessage('Struk PDF berhasil diunduh');
    } catch (error: any) {
      this.errorMessage = error.message || 'Gagal mengunduh PDF';
      this.clearMessages();
    }
  }

  async shareReceipt() {
    if (!this.sale) return;

    try {
      await this.receiptService.shareReceipt(this.sale.id, 'native');
      this.showSuccessMessage('Struk berhasil dibagikan');
    } catch (error: any) {
      // Fallback to WhatsApp if native sharing fails
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

  // ===== FORMATTERS =====

  formatCurrency(amount: number): string {
    return this.posService.formatCurrency(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getPaymentMethodLabel(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Tunai',
      'card': 'Kartu',
      'digital': 'Digital/E-wallet'
    };
    return methods[method] || method;
  }

  // ===== CALCULATIONS =====

  getPointsEarned(): number {
    if (!this.sale || !this.sale.memberId) return 0;
    // Calculate points: 1 point per 1000 IDR
    return Math.floor(this.sale.total / 1000);
  }

  getTotalItems(): number {
    if (!this.sale) return 0;
    return this.sale.items.reduce((total, item) => total + item.quantity, 0);
  }

  // ===== HELPERS =====

  private generateDigitalReceiptUrl() {
    if (this.sale) {
      // Generate URL for digital receipt (could be used for QR code)
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