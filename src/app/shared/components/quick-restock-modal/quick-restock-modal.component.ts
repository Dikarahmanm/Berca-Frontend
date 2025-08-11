// src/app/shared/components/quick-restock-modal/quick-restock-modal.component.ts
import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductService } from '../../../core/services/product.service';

export interface QuickRestockData {
  productId: number;
  productName: string;
}

export interface QuickRestockResult {
  success: boolean;
  quantity?: number;
  notes?: string;
}

@Component({
  selector: 'app-quick-restock-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="quick-restock-modal">
      <!-- Header -->
      <div class="modal-header">
        <h2 mat-dialog-title>
          <mat-icon>add_circle</mat-icon>
          Quick Restock
        </h2>
        <button 
          mat-icon-button 
          [mat-dialog-close]="null"
          class="close-btn"
          aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div mat-dialog-content class="modal-content">
        <!-- Product Info -->
        <div class="product-info">
          <mat-icon>inventory_2</mat-icon>
          <div class="product-details">
            <h3>{{ data.productName }}</h3>
            <p>Tambah stok untuk produk ini</p>
          </div>
        </div>

        <!-- Restock Form -->
        <form [formGroup]="restockForm" class="restock-form">
          <!-- Quantity Input -->
          <div class="form-group">
            <label for="quantity" class="form-label">
              <mat-icon>add</mat-icon>
              Jumlah Tambah Stok *
            </label>
            <div class="quantity-input-group">
              <button 
                type="button" 
                class="quantity-btn minus"
                (click)="decreaseQuantity()"
                [disabled]="restockForm.get('quantity')?.value <= 1">
                <mat-icon>remove</mat-icon>
              </button>
              
              <input
                id="quantity"
                type="number"
                formControlName="quantity"
                class="quantity-input"
                min="1"
                max="9999"
                placeholder="0">
              
              <button 
                type="button" 
                class="quantity-btn plus"
                (click)="increaseQuantity()">
                <mat-icon>add</mat-icon>
              </button>
            </div>
            
            <div class="form-error" *ngIf="restockForm.get('quantity')?.invalid && restockForm.get('quantity')?.touched">
              <mat-icon>error</mat-icon>
              <span *ngIf="restockForm.get('quantity')?.errors?.['required']">Jumlah stok wajib diisi</span>
              <span *ngIf="restockForm.get('quantity')?.errors?.['min']">Jumlah minimal 1</span>
              <span *ngIf="restockForm.get('quantity')?.errors?.['max']">Jumlah maksimal 9999</span>
            </div>
          </div>

          <!-- Quick Quantity Buttons -->
          <div class="quick-quantity-section">
            <label class="form-label">Quick Add</label>
            <div class="quick-quantity-buttons">
              <button 
                type="button" 
                class="quick-btn"
                *ngFor="let qty of quickQuantities"
                (click)="setQuantity(qty)">
                +{{ qty }}
              </button>
            </div>
          </div>

          <!-- Restock Type -->
          <div class="form-group">
            <label for="restockType" class="form-label">
              <mat-icon>category</mat-icon>
              Jenis Restock
            </label>
            <select 
              id="restockType"
              formControlName="restockType" 
              class="form-select">
              <option value="purchase">Pembelian Baru</option>
              <option value="return">Retur Supplier</option>
              <option value="transfer">Transfer Antar Gudang</option>
              <option value="adjustment">Penyesuaian Stok</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          <!-- Notes -->
          <div class="form-group">
            <label for="notes" class="form-label">
              <mat-icon>notes</mat-icon>
              Catatan (Opsional)
            </label>
            <textarea
              id="notes"
              formControlName="notes"
              class="form-textarea"
              rows="3"
              placeholder="Tambahkan catatan untuk restock ini..."></textarea>
          </div>

        </form>

        <!-- Preview -->
        <div class="restock-preview" *ngIf="restockForm.get('quantity')?.value > 0">
          <h4>Preview Restock</h4>
          <div class="preview-content">
            <div class="preview-item">
              <span>Produk:</span>
              <span>{{ data.productName }}</span>
            </div>
            <div class="preview-item">
              <span>Tambah Stok:</span>
              <span class="highlight">+{{ restockForm.get('quantity')?.value }} pcs</span>
            </div>
            <div class="preview-item">
              <span>Jenis:</span>
              <span>{{ getRestockTypeLabel() }}</span>
            </div>
            <div class="preview-item" *ngIf="restockForm.get('notes')?.value">
              <span>Catatan:</span>
              <span>{{ restockForm.get('notes')?.value }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Actions -->
      <div mat-dialog-actions class="modal-actions">
        <button 
          mat-button 
          [mat-dialog-close]="null" 
          class="cancel-btn"
          type="button">
          Batal
        </button>
        
        <button 
          mat-raised-button 
          color="primary" 
          (click)="executeRestock()"
          [disabled]="restockForm.invalid || isProcessing()"
          type="button">
          <mat-icon *ngIf="!isProcessing()">add_circle</mat-icon>
          <mat-spinner *ngIf="isProcessing()" diameter="20"></mat-spinner>
          <span>{{ isProcessing() ? 'Memproses...' : 'Tambah Stok' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .quick-restock-modal {
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

      .modal-content {
        max-height: 70vh;
        overflow-y: auto;
        padding: 0;
      }

      .product-info {
        display: flex;
        align-items: center;
        gap: var(--s4);
        padding: var(--s4);
        background: var(--primary-light);
        border-radius: var(--radius);
        margin-bottom: var(--s6);
        
        mat-icon {
          font-size: 32px;
          color: var(--primary);
        }
        
        .product-details {
          h3 {
            margin: 0 0 var(--s1) 0;
            font-size: var(--text-lg);
            color: var(--text);
          }
          
          p {
            margin: 0;
            font-size: var(--text-sm);
            color: var(--text-secondary);
          }
        }
      }

      .restock-form {
        .form-group {
          margin-bottom: var(--s6);
        }
        
        .form-label {
          display: flex;
          align-items: center;
          gap: var(--s2);
          margin-bottom: var(--s3);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text);
          
          mat-icon {
            font-size: 18px;
            color: var(--primary);
          }
        }
        
        .quantity-input-group {
          display: flex;
          align-items: center;
          border: 2px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          
          &:focus-within {
            border-color: var(--primary);
          }
          
          .quantity-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border: none;
            background: var(--bg);
            color: var(--text);
            cursor: pointer;
            transition: var(--transition);
            
            &:hover:not(:disabled) {
              background: var(--primary-light);
              color: var(--primary);
            }
            
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            
            &.minus {
              border-right: 1px solid var(--border);
            }
            
            &.plus {
              border-left: 1px solid var(--border);
            }
            
            mat-icon {
              font-size: 20px;
            }
          }
          
          .quantity-input {
            flex: 1;
            padding: var(--s3) var(--s4);
            border: none;
            background: var(--surface);
            color: var(--text);
            font-size: var(--text-lg);
            font-weight: 600;
            text-align: center;
            outline: none;
            
            &::placeholder {
              color: var(--text-secondary);
              font-weight: normal;
            }
          }
        }
        
        .form-error {
          display: flex;
          align-items: center;
          gap: var(--s2);
          margin-top: var(--s2);
          padding: var(--s2);
          background: #FFF5F5;
          border: 1px solid var(--error);
          border-radius: var(--radius);
          color: var(--error);
          font-size: var(--text-sm);
          
          mat-icon {
            font-size: 16px;
          }
        }
        
        .form-select {
          width: 100%;
          padding: var(--s3) var(--s4);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          background: var(--surface);
          color: var(--text);
          font-size: var(--text-base);
          font-family: inherit;
          cursor: pointer;
          transition: var(--transition);
          
          &:focus {
            border-color: var(--primary);
            outline: none;
          }
        }
        
        .form-textarea {
          width: 100%;
          padding: var(--s3) var(--s4);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          background: var(--surface);
          color: var(--text);
          font-size: var(--text-base);
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          transition: var(--transition);
          
          &:focus {
            border-color: var(--primary);
            outline: none;
          }
          
          &::placeholder {
            color: var(--text-secondary);
          }
        }
      }

      .quick-quantity-section {
        margin-bottom: var(--s6);
        
        .quick-quantity-buttons {
          display: flex;
          gap: var(--s2);
          flex-wrap: wrap;
          margin-top: var(--s3);
        }
        
        .quick-btn {
          padding: var(--s2) var(--s3);
          border: 2px solid var(--border);
          border-radius: var(--radius);
          background: var(--surface);
          color: var(--text);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          
          &:hover {
            border-color: var(--primary);
            background: var(--primary-light);
            color: var(--primary);
          }
        }
      }

      .restock-preview {
        padding: var(--s4);
        background: var(--bg);
        border: 2px solid var(--border);
        border-radius: var(--radius);
        margin-bottom: var(--s6);
        
        h4 {
          margin: 0 0 var(--s4) 0;
          font-size: var(--text-base);
          color: var(--text);
        }
        
        .preview-content {
          .preview-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--s2) 0;
            border-bottom: 1px solid var(--border);
            
            &:last-child {
              border-bottom: none;
            }
            
            span:first-child {
              color: var(--text-secondary);
              font-size: var(--text-sm);
            }
            
            span:last-child {
              color: var(--text);
              font-weight: 600;
              
              &.highlight {
                color: var(--primary);
              }
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
export class QuickRestockModalComponent {
  restockForm: FormGroup;
  isProcessing = signal(false);
  quickQuantities = [5, 10, 25, 50, 100];

  constructor(
    public dialogRef: MatDialogRef<QuickRestockModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QuickRestockData,
    private fb: FormBuilder,
    private productService: ProductService
  ) {
    this.restockForm = this.fb.group({
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
      restockType: ['purchase', Validators.required],
      notes: ['']
    });
  }

  // ===== QUANTITY CONTROLS =====

  increaseQuantity() {
    const currentValue = this.restockForm.get('quantity')?.value || 0;
    if (currentValue < 9999) {
      this.restockForm.patchValue({ quantity: currentValue + 1 });
    }
  }

  decreaseQuantity() {
    const currentValue = this.restockForm.get('quantity')?.value || 0;
    if (currentValue > 1) {
      this.restockForm.patchValue({ quantity: currentValue - 1 });
    }
  }

  setQuantity(quantity: number) {
    this.restockForm.patchValue({ quantity });
  }

  // ===== FORM HELPERS =====

  getRestockTypeLabel(): string {
    const type = this.restockForm.get('restockType')?.value;
    const labels = {
      'purchase': 'Pembelian Baru',
      'return': 'Retur Supplier',
      'transfer': 'Transfer Antar Gudang',
      'adjustment': 'Penyesuaian Stok',
      'other': 'Lainnya'
    };
    return labels[type as keyof typeof labels] || 'Unknown';
  }

  // ===== EXECUTE RESTOCK =====

  executeRestock() {
    if (this.restockForm.invalid) {
      this.restockForm.markAllAsTouched();
      return;
    }

    this.isProcessing.set(true);

    const restockData = {
      productId: this.data.productId,
      quantity: this.restockForm.get('quantity')?.value,
      type: this.restockForm.get('restockType')?.value,
      notes: this.restockForm.get('notes')?.value || '',
      timestamp: new Date().toISOString()
    };

    // Call the product service to add stock
    this.productService.addStock(restockData).subscribe({
      next: (result) => {
        console.log('✅ Restock successful:', result);
        
        const response: QuickRestockResult = {
          success: true,
          quantity: restockData.quantity,
          notes: restockData.notes
        };
        
        this.dialogRef.close(response);
      },
      error: (error) => {
        console.error('❌ Restock failed:', error);
        this.isProcessing.set(false);
        
        // You could show an error message here
        // For now, we'll just keep the modal open
      }
    });
  }
}