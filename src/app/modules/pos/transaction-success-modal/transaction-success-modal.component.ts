import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface TransactionSuccessData {
  saleId: number;
  saleNumber: string;
  total: number;
}

@Component({
  selector: 'app-transaction-success-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="success-modal">
      <div class="modal-header">
        <mat-icon class="success-icon">check_circle</mat-icon>
        <h2 mat-dialog-title>Transaksi Berhasil!</h2>
      </div>
      
      <div mat-dialog-content class="modal-content">
        <div class="transaction-info">
          <div class="info-item">
            <span class="label">No. Transaksi:</span>
            <span class="value">{{ data.saleNumber }}</span>
          </div>
          <div class="info-item">
            <span class="label">Total:</span>
            <span class="value">{{ formatCurrency(data.total) }}</span>
          </div>
        </div>
        
        <div class="question">
          <p>Apa yang ingin Anda lakukan selanjutnya?</p>
        </div>
      </div>
      
      <div mat-dialog-actions class="modal-actions">
        <button 
          mat-raised-button 
          color="primary" 
          (click)="viewDetail()"
          class="action-button">
          <mat-icon>receipt_long</mat-icon>
          Lihat Detail Transaksi
        </button>
        
        <button 
          mat-stroked-button 
          color="accent" 
          (click)="newTransaction()"
          class="action-button">
          <mat-icon>add</mat-icon>
          Transaksi Baru
        </button>
      </div>
    </div>
  `,
  styles: [`
    .success-modal {
      padding: 0;
      max-width: 480px;
      width: 100%;
    }

    .modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 24px 16px;
      background: linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%);
      text-align: center;
      
      .success-icon {
        font-size: 64px;
        height: 64px;
        width: 64px;
        color: #4caf50;
        margin-bottom: 16px;
      }
      
      h2 {
        margin: 0;
        color: #2e7d32;
        font-size: 24px;
        font-weight: 600;
      }
    }

    .modal-content {
      padding: 24px;
    }

    .transaction-info {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      border: 1px solid #e9ecef;
      
      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        
        &:last-child {
          margin-bottom: 0;
          padding-top: 12px;
          border-top: 1px solid #dee2e6;
          font-weight: 600;
        }
        
        .label {
          color: #666;
          font-weight: 500;
        }
        
        .value {
          color: #333;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }
      }
    }

    .question {
      text-align: center;
      margin-bottom: 8px;
      
      p {
        margin: 0;
        color: #666;
        font-size: 16px;
        font-weight: 500;
      }
    }

    .modal-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 0 24px 24px;
      
      .action-button {
        height: 48px;
        font-size: 16px;
        font-weight: 500;
        text-transform: none;
        
        mat-icon {
          margin-right: 8px;
        }
        
        &:first-child {
          background: #1976d2;
          color: white;
          
          &:hover {
            background: #1565c0;
          }
        }
      }
    }

    @media (max-width: 480px) {
      .success-modal {
        margin: 16px;
        max-width: none;
      }
      
      .modal-header {
        padding: 24px 16px 12px;
        
        .success-icon {
          font-size: 48px;
          height: 48px;
          width: 48px;
        }
        
        h2 {
          font-size: 20px;
        }
      }
      
      .modal-content {
        padding: 16px;
      }
      
      .modal-actions {
        padding: 0 16px 16px;
        
        .action-button {
          height: 44px;
          font-size: 14px;
        }
      }
    }
  `]
})
export class TransactionSuccessModalComponent {
  constructor(
    public dialogRef: MatDialogRef<TransactionSuccessModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TransactionSuccessData
  ) {}

  viewDetail(): void {
    this.dialogRef.close('detail');
  }

  newTransaction(): void {
    this.dialogRef.close('new');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
