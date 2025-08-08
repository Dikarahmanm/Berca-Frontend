import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '../../../shared/material.module';
import { POSService } from '../../../core/services/pos.service';
import { TransactionDetail, TransactionItem } from '../interfaces/transaction-detail.interface';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './transaction-detail.component.html',
  styleUrls: ['./transaction-detail.component.scss']
})
export class TransactionDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  transaction: TransactionDetail | null = null;
  loading = true;
  error: string | null = null;
  printingReceipt = false;

  displayedColumns: string[] = ['productName', 'quantity', 'unitPrice', 'subtotal'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private posService: POSService
  ) {}

  ngOnInit(): void {
    this.loadTransactionDetail();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTransactionDetail(): void {
    const id = this.route.snapshot.params['id'];
    
    console.log('🔍 TransactionDetailComponent - Route params:', this.route.snapshot.params);
    console.log('🔍 TransactionDetailComponent - Current URL:', this.router.url);
    
    if (!id || isNaN(Number(id))) {
      console.error('❌ Invalid transaction ID:', id);
      this.error = 'ID transaksi tidak valid';
      this.loading = false;
      return;
    }

    console.log('🔍 Loading transaction detail for ID:', id);
    
    this.posService.getTransactionDetail(Number(id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transaction) => {
          console.log('✅ Transaction loaded:', transaction);
          this.transaction = transaction;
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error loading transaction:', error);
          this.error = 'Gagal memuat detail transaksi: ' + (error.message || 'Unknown error');
          this.loading = false;
        }
      });
  }

  onPrintReceipt(): void {
    if (!this.transaction) return;

    console.log('🧾 Redirecting to receipt preview for transaction:', this.transaction.id);
    
    // Navigate to receipt preview instead of printing directly
    this.router.navigate(['/dashboard/pos/receipt', this.transaction.id]);
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
    return new Date(dateString).toLocaleString('id-ID');
  }

  goBack(): void {
    this.router.navigate(['/dashboard/pos']);
  }

  get totalProfit(): number {
    return this.transaction?.items.reduce((sum, item) => sum + item.totalProfit, 0) || 0;
  }

  get profitMargin(): number {
    if (!this.transaction || this.transaction.total === 0) return 0;
    return (this.totalProfit / this.transaction.total) * 100;
  }
}
