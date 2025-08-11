// src/app/shared/components/product-quick-view-modal/product-quick-view-modal.component.ts
import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { InventoryService } from '../../../modules/inventory/services/inventory.service';
import { ProductDto } from '../../../modules/pos/pos/interfaces/pos.interfaces';
import { ProductService, Product } from '../../../core/services/product.service';

export interface ProductQuickViewData {
  productId: number;
}

@Component({
  selector: 'app-product-quick-view-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  template: `
    <div class="product-quick-view-modal">
      <!-- Header -->
      <div class="modal-header">
        <h2 mat-dialog-title>
          <mat-icon>inventory_2</mat-icon>
          Detail Produk
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
        <p>Memuat detail produk...</p>
      </div>

      <!-- Error State -->
      <div class="error-container" *ngIf="error()">
        <mat-icon class="error-icon">error</mat-icon>
        <h3>Gagal Memuat Data</h3>
        <p>{{ error() }}</p>
        <button mat-raised-button color="primary" (click)="loadProduct()">
          <mat-icon>refresh</mat-icon>
          Coba Lagi
        </button>
      </div>

      <!-- Content -->
      <div mat-dialog-content class="modal-content" *ngIf="product() && !isLoading()">
        
        <!-- Product Header -->
        <div class="product-header">
          <div class="product-image">
            <mat-icon>inventory_2</mat-icon>
          </div>
          <div class="product-basic-info">
            <h3 class="product-name">{{ product()?.name }}</h3>
            <div class="product-barcode">{{ product()?.barcode }}</div>
            <div class="product-category">
              <mat-chip [style.background-color]="'#FF914D'">
                {{ product()?.categoryName }}
              </mat-chip>
            </div>
          </div>
          <div class="stock-status" [ngClass]="getStockStatusClass()">
            <div class="stock-value">{{ formatNumber(product()?.stock || 0) }}</div>
            <div class="stock-label">{{ product()?.unit || 'pcs' }}</div>
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="metrics-section">
          <h4>Informasi Harga & Stok</h4>
          <div class="metrics-grid">
            <div class="metric-item">
              <mat-icon>shopping_cart</mat-icon>
              <div class="metric-content">
                <div class="metric-value">{{ formatCurrency(product()?.buyPrice || 0) }}</div>
                <div class="metric-label">Harga Beli</div>
              </div>
            </div>
            
            <div class="metric-item">
              <mat-icon>sell</mat-icon>
              <div class="metric-content">
                <div class="metric-value">{{ formatCurrency(product()?.sellPrice || 0) }}</div>
                <div class="metric-label">Harga Jual</div>
              </div>
            </div>
            
            <div class="metric-item">
              <mat-icon>trending_up</mat-icon>
              <div class="metric-content">
                <div class="metric-value">{{ formatPercentage(calculateProfitMargin()) }}</div>
                <div class="metric-label">Margin</div>
              </div>
            </div>
            
            <div class="metric-item">
              <mat-icon>warning</mat-icon>
              <div class="metric-content">
                <div class="metric-value">{{ formatNumber(product()?.minStock || 0) }}</div>
                <div class="metric-label">Min Stok</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stock Alert -->
        <div class="stock-alert" *ngIf="isLowStock()" [ngClass]="getStockAlertClass()">
          <mat-icon>{{ getStockAlertIcon() }}</mat-icon>
          <div class="alert-content">
            <strong>{{ getStockAlertTitle() }}</strong>
            <p>{{ getStockAlertMessage() }}</p>
          </div>
        </div>

        <!-- Expiry Information -->
        <div class="expiry-section" *ngIf="product()?.expiryDate">
          <h4>Informasi Kedaluwarsa</h4>
          <div class="expiry-info" [ngClass]="getExpiryStatusClass()">
            <mat-icon>{{ getExpiryIcon() }}</mat-icon>
            <div class="expiry-content">
              <div class="expiry-date">{{ formatDate(product()?.expiryDate) }}</div>
              <div class="expiry-status">{{ getExpiryStatus() }}</div>
              <div class="days-remaining" *ngIf="getDaysUntilExpiry() >= 0">
                {{ getDaysUntilExpiry() }} hari tersisa
              </div>
            </div>
          </div>
        </div>

        <!-- Additional Info -->
        <div class="additional-info" *ngIf="product()?.description">
          <h4>Deskripsi</h4>
          <p>{{ product()?.description }}</p>
        </div>

      </div>

      <!-- Actions -->
      <div mat-dialog-actions class="modal-actions" *ngIf="product()">
        <button mat-button [mat-dialog-close]="null" class="cancel-btn">
          Tutup
        </button>
        
        <button mat-raised-button color="accent" [mat-dialog-close]="'stock'">
          <mat-icon>inventory</mat-icon>
          Kelola Stok
        </button>
        
        <button mat-raised-button color="primary" [mat-dialog-close]="'edit'">
          <mat-icon>edit</mat-icon>
          Edit Produk
        </button>
      </div>
    </div>
  `,
  styles: [`
    .product-quick-view-modal {
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
        max-height: 60vh;
        overflow-y: auto;
        padding: 0;
      }

      .product-header {
        display: flex;
        gap: var(--s4);
        padding: var(--s6);
        background: var(--bg);
        border-radius: var(--radius);
        margin-bottom: var(--s6);
        
        .product-image {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: var(--primary-light);
          border-radius: var(--radius);
          flex-shrink: 0;
          
          mat-icon {
            font-size: 32px;
            color: var(--primary);
          }
        }
        
        .product-basic-info {
          flex: 1;
          
          .product-name {
            margin: 0 0 var(--s2) 0;
            font-size: var(--text-xl);
            font-weight: 600;
            color: var(--text);
          }
          
          .product-barcode {
            font-size: var(--text-sm);
            color: var(--text-secondary);
            margin-bottom: var(--s2);
          }
          
          .product-category mat-chip {
            color: var(--surface);
            font-size: var(--text-xs);
            font-weight: 600;
          }
        }
        
        .stock-status {
          text-align: center;
          padding: var(--s3);
          border-radius: var(--radius);
          min-width: 80px;
          
          .stock-value {
            font-size: var(--text-xl);
            font-weight: 700;
            margin-bottom: var(--s1);
          }
          
          .stock-label {
            font-size: var(--text-xs);
            opacity: 0.8;
          }
          
          &.high {
            background: var(--success);
            color: var(--surface);
          }
          
          &.low {
            background: var(--warning);
            color: var(--text);
          }
          
          &.out {
            background: var(--error);
            color: var(--surface);
          }
        }
      }

      .metrics-section {
        margin-bottom: var(--s6);
        
        h4 {
          margin: 0 0 var(--s4) 0;
          font-size: var(--text-lg);
          color: var(--text);
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--s4);
          
          @media (max-width: 640px) {
            grid-template-columns: 1fr;
          }
        }
        
        .metric-item {
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
          
          .metric-content {
            .metric-value {
              font-size: var(--text-base);
              font-weight: 600;
              color: var(--text);
              margin-bottom: var(--s1);
            }
            
            .metric-label {
              font-size: var(--text-xs);
              color: var(--text-secondary);
            }
          }
        }
      }

      .stock-alert {
        display: flex;
        align-items: center;
        gap: var(--s3);
        padding: var(--s4);
        border-radius: var(--radius);
        margin-bottom: var(--s6);
        
        mat-icon {
          flex-shrink: 0;
        }
        
        .alert-content {
          strong {
            display: block;
            margin-bottom: var(--s1);
          }
          
          p {
            margin: 0;
            font-size: var(--text-sm);
          }
        }
        
        &.warning {
          background: var(--primary-light);
          border: 2px solid var(--warning);
          color: var(--text);
          
          mat-icon {
            color: var(--warning);
          }
        }
        
        &.danger {
          background: #FFF5F5;
          border: 2px solid var(--error);
          color: var(--text);
          
          mat-icon {
            color: var(--error);
          }
        }
      }

      .expiry-section {
        margin-bottom: var(--s6);
        
        h4 {
          margin: 0 0 var(--s4) 0;
          font-size: var(--text-lg);
          color: var(--text);
        }
        
        .expiry-info {
          display: flex;
          align-items: center;
          gap: var(--s3);
          padding: var(--s4);
          border-radius: var(--radius);
          border: 2px solid;
          
          mat-icon {
            flex-shrink: 0;
          }
          
          .expiry-content {
            .expiry-date {
              font-size: var(--text-base);
              font-weight: 600;
              margin-bottom: var(--s1);
            }
            
            .expiry-status {
              font-size: var(--text-sm);
              margin-bottom: var(--s1);
            }
            
            .days-remaining {
              font-size: var(--text-xs);
              opacity: 0.8;
            }
          }
          
          &.fresh {
            background: var(--primary-light);
            border-color: var(--success);
            color: var(--text);
            
            mat-icon {
              color: var(--success);
            }
          }
          
          &.warning {
            background: var(--primary-light);
            border-color: var(--warning);
            color: var(--text);
            
            mat-icon {
              color: var(--warning);
            }
          }
          
          &.expired {
            background: #FFF5F5;
            border-color: var(--error);
            color: var(--text);
            
            mat-icon {
              color: var(--error);
            }
          }
        }
      }

      .additional-info {
        h4 {
          margin: 0 0 var(--s3) 0;
          font-size: var(--text-lg);
          color: var(--text);
        }
        
        p {
          margin: 0;
          padding: var(--s4);
          background: var(--bg);
          border-radius: var(--radius);
          color: var(--text-secondary);
          line-height: 1.5;
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
export class ProductQuickViewModalComponent implements OnInit {
  product = signal<Product | null | undefined>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  constructor(
    public dialogRef: MatDialogRef<ProductQuickViewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProductQuickViewData,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.loadProduct();
  }

  loadProduct() {
    this.isLoading.set(true);
    this.error.set(null);

    this.productService.getProductById(this.data.productId).subscribe({
      next: (response) => {
        this.product.set(response.data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.error.set('Gagal memuat detail produk. Silakan coba lagi.');
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

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(date));
  }

  calculateProfitMargin(): number {
    const product = this.product();
    if (!product || !product.buyPrice || !product.sellPrice) return 0;
    return ((product.sellPrice - product.buyPrice) / product.sellPrice) * 100;
  }

  // ===== STOCK STATUS =====

  getStockStatusClass(): string {
    const product = this.product();
    if (!product) return 'out';
    
    if (product.stock === 0) return 'out';
    if (product.stock <= (product.minStock || 0)) return 'low';
    return 'high';
  }

  isLowStock(): boolean {
    const product = this.product();
    if (!product) return false;
    return product.stock <= (product.minStock || 0);
  }

  getStockAlertClass(): string {
    const product = this.product();
    if (!product) return 'danger';
    return product.stock === 0 ? 'danger' : 'warning';
  }

  getStockAlertIcon(): string {
    const product = this.product();
    if (!product) return 'block';
    return product.stock === 0 ? 'block' : 'warning';
  }

  getStockAlertTitle(): string {
    const product = this.product();
    if (!product) return 'Stok Habis';
    return product.stock === 0 ? 'Stok Habis' : 'Stok Menipis';
  }

  getStockAlertMessage(): string {
    const product = this.product();
    if (!product) return 'Produk ini sudah habis dan perlu restock segera.';
    
    if (product.stock === 0) {
      return 'Produk ini sudah habis dan perlu restock segera.';
    } else {
      return `Stok tersisa ${product.stock} ${product.unit || 'pcs'}, mendekati batas minimum ${product.minStock || 0}.`;
    }
  }

  // ===== EXPIRY STATUS =====

  getDaysUntilExpiry(): number {
    const product = this.product();
    if (!product?.expiryDate) return -1;
    
    const now = new Date();
    const expiry = new Date(product.expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getExpiryStatusClass(): string {
    const days = this.getDaysUntilExpiry();
    if (days < 0) return 'expired';
    if (days <= 7) return 'warning';
    return 'fresh';
  }

  getExpiryIcon(): string {
    const days = this.getDaysUntilExpiry();
    if (days < 0) return 'block';
    if (days <= 7) return 'warning';
    return 'check_circle';
  }

  getExpiryStatus(): string {
    const days = this.getDaysUntilExpiry();
    if (days < 0) return 'Sudah Kedaluwarsa';
    if (days <= 7) return 'Segera Kedaluwarsa';
    return 'Masih Fresh';
  }
}