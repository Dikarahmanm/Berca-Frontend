// src/app/shared/components/transaction-quick-view-modal/transaction-quick-view-modal.component.ts
import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { POSService } from '../../../core/services/pos.service';
import { TransactionDetail, TransactionItem } from '../../../modules/pos/interfaces/transaction-detail.interface';
import { RecentTransactionDto } from '../../../core/services/dashboard.service';

export interface TransactionQuickViewData {
  transaction: RecentTransactionDto;
}

@Component({
  selector: 'app-transaction-quick-view-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTableModule
  ],
  template: `
    <div class="transaction-quick-view-modal">
      <!-- Header -->
      <div class="modal-header">
        <h2 mat-dialog-title>
          <mat-icon>receipt_long</mat-icon>
          Detail Transaksi
        </h2>
        <button 
          mat-icon-button 
          [mat-dialog-close]="null"
          class="close-btn"
          aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading()">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Memuat detail transaksi...</p>
      </div>

      <!-- Error State -->
      <div class="error-container" *ngIf="error()">
        <mat-icon class="error-icon">error</mat-icon>
        <h3>Gagal Memuat Data</h3>
        <p>{{ error() }}</p>
        <button mat-raised-button color="primary" (click)="loadTransaction()">
          <mat-icon>refresh</mat-icon>
          Coba Lagi
        </button>
      </div>

      <!-- Content -->
      <div mat-dialog-content class="modal-content" *ngIf="transactionDetail() && !isLoading()">
        
        <!-- Transaction Header -->
        <div class="transaction-header">
          <div class="transaction-id-section">
            <div class="transaction-number">{{ data.transaction.saleNumber }}</div>
            <div class="transaction-date">{{ formatDateTime(data.transaction.saleDate) }}</div>
            <mat-chip 
              [ngClass]="getStatusClass()" 
              class="status-chip">
              {{ getStatusText() }}
            </mat-chip>
          </div>
          <div class="transaction-amount">
            <div class="total-amount">{{ formatCurrency(data.transaction.total) }}</div>
            <div class="payment-method">{{ data.transaction.paymentMethod }}</div>
          </div>
        </div>

        <!-- Customer & Cashier Info -->
        <div class="participants-section">
          <div class="participant-item">
            <mat-icon>person</mat-icon>
            <div class="participant-info">
              <div class="participant-label">Customer</div>
              <div class="participant-name">{{ data.transaction.customerName || 'Walk-in Customer' }}</div>
            </div>
          </div>
          
          <div class="participant-item">
            <mat-icon>badge</mat-icon>
            <div class="participant-info">
              <div class="participant-label">Kasir</div>
              <div class="participant-name">{{ data.transaction.cashierName || 'Unknown' }}</div>
            </div>
          </div>
        </div>

        <!-- Transaction Summary -->
        <div class="summary-section">
          <h4>Ringkasan Transaksi</h4>
          <div class="summary-grid">
            <div class="summary-item">
              <mat-icon>shopping_cart</mat-icon>
              <div class="summary-content">
                <div class="summary-value">{{ data.transaction.itemCount }}</div>
                <div class="summary-label">Total Item</div>
              </div>
            </div>
            
            <div class="summary-item">
              <mat-icon>calculate</mat-icon>
              <div class="summary-content">
                <div class="summary-value">{{ formatCurrency(getSubtotal()) }}</div>
                <div class="summary-label">Subtotal</div>
              </div>
            </div>
            
            <div class="summary-item" *ngIf="getDiscount() > 0">
              <mat-icon>local_offer</mat-icon>
              <div class="summary-content">
                <div class="summary-value">{{ formatCurrency(getDiscount()) }}</div>
                <div class="summary-label">Diskon</div>
              </div>
            </div>
            
            <div class="summary-item" *ngIf="transactionDetail()?.changeAmount && transactionDetail()?.changeAmount! > 0">
              <mat-icon>savings</mat-icon>
              <div class="summary-content">
                <div class="summary-value">{{ formatCurrency(transactionDetail()?.changeAmount || 0) }}</div>
                <div class="summary-label">Kembalian</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Items List -->
        <div class="items-section">
          <h4>Items Transaksi</h4>
          <div class="items-list" *ngIf="transactionDetail()?.items && transactionDetail()?.items!.length > 0">
            <div class="item-row" *ngFor="let item of transactionDetail()?.items; let i = index">
              <div class="item-number">{{ i + 1 }}</div>
              <div class="item-info">
                <div class="item-name">{{ item.productName }}</div>
                <div class="item-barcode">{{ item.productBarcode }}</div>
              </div>
              <div class="item-quantity">
                <div class="quantity-value">{{ formatNumber(item.quantity) }}</div>
                <div class="quantity-label">qty</div>
              </div>
              <div class="item-price">
                <div class="unit-price">{{ formatCurrency(item.unitPrice) }}</div>
                <div class="subtotal" *ngIf="item.discountAmount && item.discountAmount > 0">
                  <span class="original-price">{{ formatCurrency(item.unitPrice * item.quantity) }}</span>
                  <span class="discounted-price">{{ formatCurrency(item.subtotal) }}</span>
                </div>
                <div class="subtotal" *ngIf="!item.discountAmount || item.discountAmount === 0">
                  {{ formatCurrency(item.subtotal) }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="empty-items" *ngIf="!transactionDetail()?.items || transactionDetail()?.items!.length === 0">
            <mat-icon>shopping_cart_checkout</mat-icon>
            <p>Tidak ada item dalam transaksi ini</p>
          </div>
        </div>

        <!-- Payment Details -->
        <div class="payment-section" *ngIf="transactionDetail()">
          <h4>Detail Pembayaran</h4>
          <div class="payment-breakdown">
            <div class="payment-row">
              <span>Subtotal</span>
              <span>{{ formatCurrency(getSubtotal()) }}</span>
            </div>
            <div class="payment-row" *ngIf="getDiscount() > 0">
              <span>Diskon</span>
              <span class="discount">-{{ formatCurrency(getDiscount()) }}</span>
            </div>
            <div class="payment-row total">
              <span>Total</span>
              <span>{{ formatCurrency(data.transaction.total) }}</span>
            </div>
            <div class="payment-row" *ngIf="transactionDetail()?.amountPaid">
              <span>Dibayar ({{ data.transaction.paymentMethod }})</span>
              <span>{{ formatCurrency(transactionDetail()?.amountPaid || 0) }}</span>
            </div>
            <div class="payment-row" *ngIf="transactionDetail()?.changeAmount && transactionDetail()?.changeAmount! > 0">
              <span>Kembalian</span>
              <span class="changeAmount">{{ formatCurrency(transactionDetail()?.changeAmount || 0) }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Actions -->
      <div mat-dialog-actions class="modal-actions" *ngIf="transactionDetail()">
        <button mat-button [mat-dialog-close]="null" class="cancel-btn">
          Tutup
        </button>
        
        <button mat-raised-button color="accent" [mat-dialog-close]="'receipt'">
          <mat-icon>print</mat-icon>
          Print Receipt
        </button>
        
        <button mat-raised-button color="primary" [mat-dialog-close]="'detail'">
          <mat-icon>visibility</mat-icon>
          Lihat Detail Lengkap
        </button>
      </div>
    </div>
  `,
  styles: [`
    .transaction-quick-view-modal {
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--s6);
        
        h2 {
          display: flex;
          align-items: center;
          gap: var(--s2);
          margin: 0;
          color: var(--text);
        }
        
        .close-btn {
          color: var(--text-secondary);
        }
      }

      .loading-container,
      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--s10);
        text-align: center;
        
        p {
          margin-top: var(--s4);
          color: var(--text-secondary);
        }
      }
      
      .error-container {
        .error-icon {
          font-size: 48px;
          color: var(--error);
          margin-bottom: var(--s4);
        }
        
        h3 {
          margin: 0 0 var(--s2) 0;
          color: var(--error);
        }
        
        button {
          margin-top: var(--s4);
        }
      }

      .modal-content {
        max-height: 70vh;
        overflow-y: auto;
        padding: 0;
      }

      .transaction-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--s6);
        background: var(--bg);
        border-radius: var(--radius);
        margin-bottom: var(--s6);
        
        @media (max-width: 640px) {
          flex-direction: column;
          align-items: stretch;
          gap: var(--s4);
        }
        
        .transaction-id-section {
          .transaction-number {
            font-size: var(--text-xl);
            font-weight: 700;
            color: var(--text);
            margin-bottom: var(--s2);
          }
          
          .transaction-date {
            font-size: var(--text-sm);
            color: var(--text-secondary);
            margin-bottom: var(--s2);
          }
          
          .status-chip {
            font-size: var(--text-xs);
            font-weight: 600;
            
            &.completed {
              background: var(--success);
              color: var(--surface);
            }
            
            &.pending {
              background: var(--warning);
              color: var(--text);
            }
            
            &.cancelled {
              background: var(--error);
              color: var(--surface);
            }
          }
        }
        
        .transaction-amount {
          text-align: right;
          
          @media (max-width: 640px) {
            text-align: left;
          }
          
          .total-amount {
            font-size: var(--text-2xl);
            font-weight: 700;
            color: var(--text);
            margin-bottom: var(--s2);
          }
          
          .payment-method {
            font-size: var(--text-sm);
            color: var(--text-secondary);
            padding: var(--s1) var(--s2);
            background: var(--surface);
            border: 2px solid var(--border);
            border-radius: var(--radius);
            display: inline-block;
          }
        }
      }

      .participants-section {
        display: flex;
        gap: var(--s6);
        margin-bottom: var(--s6);
        
        @media (max-width: 640px) {
          flex-direction: column;
          gap: var(--s4);
        }
        
        .participant-item {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--s3);
          padding: var(--s4);
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          
          mat-icon {
            color: var(--primary);
            flex-shrink: 0;
          }
          
          .participant-info {
            .participant-label {
              font-size: var(--text-xs);
              color: var(--text-secondary);
              margin-bottom: var(--s1);
            }
            
            .participant-name {
              font-size: var(--text-base);
              font-weight: 600;
              color: var(--text);
            }
          }
        }
      }

      .summary-section {
        margin-bottom: var(--s6);
        
        h4 {
          margin: 0 0 var(--s4) 0;
          font-size: var(--text-lg);
          color: var(--text);
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--s4);
          
          @media (max-width: 640px) {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .summary-item {
          display: flex;
          align-items: center;
          gap: var(--s3);
          padding: var(--s4);
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          
          mat-icon {
            color: var(--primary);
            flex-shrink: 0;
          }
          
          .summary-content {
            .summary-value {
              font-size: var(--text-base);
              font-weight: 600;
              color: var(--text);
              margin-bottom: var(--s1);
            }
            
            .summary-label {
              font-size: var(--text-xs);
              color: var(--text-secondary);
            }
          }
        }
      }

      .items-section {
        margin-bottom: var(--s6);
        
        h4 {
          margin: 0 0 var(--s4) 0;
          font-size: var(--text-lg);
          color: var(--text);
        }
        
        .items-list {
          border: 2px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        
        .item-row {
          display: flex;
          align-items: center;
          gap: var(--s3);
          padding: var(--s4);
          border-bottom: 1px solid var(--border);
          
          &:last-child {
            border-bottom: none;
          }
          
          &:hover {
            background: var(--bg);
          }
          
          @media (max-width: 640px) {
            flex-wrap: wrap;
            gap: var(--s2);
          }
          
          .item-number {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: var(--primary);
            color: var(--surface);
            border-radius: 50%;
            font-size: var(--text-xs);
            font-weight: 700;
            flex-shrink: 0;
          }
          
          .item-info {
            flex: 1;
            min-width: 0;
            
            .item-name {
              font-size: var(--text-base);
              font-weight: 600;
              color: var(--text);
              margin-bottom: var(--s1);
              word-break: break-word;
            }
            
            .item-barcode {
              font-size: var(--text-xs);
              color: var(--text-secondary);
            }
          }
          
          .item-quantity {
            text-align: center;
            flex-shrink: 0;
            
            .quantity-value {
              font-size: var(--text-base);
              font-weight: 600;
              color: var(--text);
              margin-bottom: var(--s1);
            }
            
            .quantity-label {
              font-size: var(--text-xs);
              color: var(--text-secondary);
            }
          }
          
          .item-price {
            text-align: right;
            flex-shrink: 0;
            min-width: 100px;
            
            .unit-price {
              font-size: var(--text-sm);
              color: var(--text-secondary);
              margin-bottom: var(--s1);
            }
            
            .subtotal {
              font-size: var(--text-base);
              font-weight: 600;
              color: var(--text);
              
              .original-price {
                text-decoration: line-through;
                color: var(--text-secondary);
                font-size: var(--text-sm);
                margin-right: var(--s2);
              }
              
              .discounted-price {
                color: var(--success);
              }
            }
          }
        }
        
        .empty-items {
          text-align: center;
          padding: var(--s10);
          color: var(--text-secondary);
          
          mat-icon {
            font-size: 48px;
            margin-bottom: var(--s4);
          }
          
          p {
            margin: 0;
          }
        }
      }

      .payment-section {
        h4 {
          margin: 0 0 var(--s4) 0;
          font-size: var(--text-lg);
          color: var(--text);
        }
        
        .payment-breakdown {
          background: var(--bg);
          border-radius: var(--radius);
          padding: var(--s4);
          
          .payment-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--s2) 0;
            border-bottom: 1px solid var(--border);
            
            &:last-child {
              border-bottom: none;
            }
            
            &.total {
              font-size: var(--text-lg);
              font-weight: 700;
              color: var(--text);
              border-top: 2px solid var(--border);
              margin-top: var(--s2);
              padding-top: var(--s3);
            }
            
            .discount {
              color: var(--success);
              font-weight: 600;
            }
            
            .changeAmount {
              color: var(--primary);
              font-weight: 600;
            }
          }
        }
      }

      .modal-actions {
        margin-top: var(--s6);
        padding-top: var(--s4);
        border-top: 2px solid var(--border);
        
        .cancel-btn {
          color: var(--text-secondary);
        }
      }
    }
  `]
})
export class TransactionQuickViewModalComponent implements OnInit {
  transactionDetail = signal<TransactionDetail | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  constructor(
    public dialogRef: MatDialogRef<TransactionQuickViewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TransactionQuickViewData,
    private posService: POSService
  ) {}

  ngOnInit() {
    this.loadTransaction();
  }

  loadTransaction() {
    this.isLoading.set(true);
    this.error.set(null);

    this.posService.getTransactionDetail(this.data.transaction.id).subscribe({
      next: (transaction: TransactionDetail) => {
        this.transactionDetail.set(transaction);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading transaction:', error);
        this.error.set('Gagal memuat detail transaksi. Silakan coba lagi.');
        this.isLoading.set(false);
      }
    });
  }

  // ===== UTILITY METHODS =====

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // ===== CALCULATION METHODS =====

  getSubtotal(): number {
    const detail = this.transactionDetail();
    if (!detail?.items) return 0;
    
    return detail.items.reduce((total: number, item: TransactionItem) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  }

  getDiscount(): number {
    const detail = this.transactionDetail();
    if (!detail?.items) return 0;
    
    return detail.items.reduce((total: number, item: TransactionItem) => {
      const itemTotal = item.unitPrice * item.quantity;
      return total + (itemTotal - item.subtotal);
    }, 0);
  }

  // ===== STATUS METHODS =====

  getStatusClass(): string {
    // Assume completed for now, you can expand this based on your transaction status logic
    return 'completed';
  }

  getStatusText(): string {
    // Assume completed for now, you can expand this based on your transaction status logic
    return 'Selesai';
  }
}