import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { POSService } from '../../../core/services/pos.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TransactionDetail, TransactionItem } from '../interfaces/transaction-detail.interface';
// Removed approval service imports - using existing credit validation endpoints instead

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction-detail.component.html',
  styleUrls: ['./transaction-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionDetailComponent implements OnInit {
  // Inject services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private posService = inject(POSService);
  private toastService = inject(ToastService);
  
  // Signal-based state
  transaction = signal<TransactionDetail | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  
  // Removed approval-related state - using existing credit validation workflow instead

  // Computed properties
  totalProfit = computed(() => {
    const trans = this.transaction();
    return trans?.items.reduce((sum, item) => sum + item.totalProfit, 0) || 0;
  });

  profitMargin = computed(() => {
    const trans = this.transaction();
    const profit = this.totalProfit();
    if (!trans || trans.total === 0) return 0;
    return (profit / trans.total) * 100;
  });

  // Removed approval computed properties - using existing credit validation workflow instead

  ngOnInit(): void {
    this.loadTransactionDetail();
  }

  // Data loading method
  private async loadTransactionDetail(): Promise<void> {
    const id = this.route.snapshot.params['id'];
    
    if (!id || isNaN(Number(id))) {
      this.error.set('ID transaksi tidak valid');
      this.loading.set(false);
      return;
    }

    try {
      this.loading.set(true);
      this.error.set(null);

      const transaction = await this.posService.getTransactionDetail(Number(id)).toPromise();
      
      if (transaction) {
        this.transaction.set(transaction);
        // Load approval data if transaction exists
        // Approval data is now handled through existing credit validation workflow
      } else {
        this.error.set('Transaksi tidak ditemukan');
      }
    } catch (error: any) {
      console.error('Error loading transaction:', error);
      this.error.set('Gagal memuat detail transaksi');
    } finally {
      this.loading.set(false);
    }
  }

  // Event handlers
  onPrintReceipt(): void {
    const trans = this.transaction();
    if (!trans) return;
    
    // Navigate to receipt preview instead of printing directly
    this.router.navigate(['/dashboard/pos/receipt', trans.id]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/pos']);
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusInfo(status: string): { text: string; icon: string; color: string } {
    switch (status.toLowerCase()) {
      case 'completed':
        return { text: 'Selesai', icon: '✓', color: 'success' };
      case 'pending':
        return { text: 'Pending', icon: '⏱', color: 'warning' };
      case 'cancelled':
        return { text: 'Dibatalkan', icon: '✗', color: 'error' };
      default:
        return { text: status, icon: '?', color: 'secondary' };
    }
  }

  // ===== REMOVED APPROVAL METHODS =====
  // Using existing credit validation endpoints instead of separate approval service

  // TrackBy function for performance
  trackByItem = (index: number, item: TransactionItem): number => item.id;
}
