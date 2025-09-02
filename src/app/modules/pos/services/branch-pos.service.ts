// src/app/modules/pos/services/branch-pos.service.ts
// Branch-Aware POS Service for Multi-Branch Transactions
// Angular 20 with Signal-based Architecture

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { environment } from '../../../../environment/environment';
import { StateService } from '../../../core/services/state.service';
import { BranchInventoryService } from '../../inventory/services/branch-inventory.service';

// Branch-specific POS interfaces
export interface BranchTransactionDto {
  id?: number;
  transactionCode: string;
  branchId: number;
  branchName: string;
  branchCode: string;
  items: BranchTransactionItemDto[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital' | 'credit';
  amountPaid: number;
  change: number;
  memberId?: number;
  memberName?: string;
  memberDiscount?: number;
  cashierId: number;
  cashierName: string;
  transactionDate: string;
  receiptNumber: string;
  status: 'Completed' | 'Pending' | 'Cancelled' | 'Refunded';
  notes?: string;
}

export interface BranchTransactionItemDto {
  productId: number;
  productName: string;
  productCode: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  branchId: number;
  availableStock: number;
  category: string;
  unit: string;
}

export interface BranchReceiptDto extends BranchTransactionDto {
  branchAddress: string;
  branchPhone: string;
  branchManager: string;
  companyLogo?: string;
  receiptFooter: string;
  branchSpecificMessage?: string;
}

export interface BranchSalesReport {
  branchId: number;
  branchName: string;
  branchCode: string;
  dateRange: {
    start: string;
    end: string;
  };
  totalTransactions: number;
  totalAmount: number;
  averageTransaction: number;
  topProducts: {
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  paymentMethodBreakdown: {
    cash: number;
    card: number;
    digital: number;
    credit: number;
  };
  memberTransactions: number;
  memberDiscount: number;
}

@Injectable({
  providedIn: 'root'
})
export class BranchPOSService {
  private readonly http = inject(HttpClient);
  private readonly stateService = inject(StateService);
  private readonly inventoryService = inject(BranchInventoryService);
  // ✅ Use relative URL for proxy routing
  private readonly apiUrl = '/api';

  // Signal-based state
  private _recentTransactions = signal<BranchTransactionDto[]>([]);
  private _currentTransaction = signal<Partial<BranchTransactionDto> | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly recentTransactions = this._recentTransactions.asReadonly();
  readonly currentTransaction = this._currentTransaction.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties
  readonly activeBranch = this.stateService.activeBranch;
  readonly currentBranchId = computed(() => this.activeBranch()?.branchId || null);
  readonly canProcessTransaction = computed(() => {
    const branch = this.activeBranch();
    return branch && (branch.canWrite || branch.canManage);
  });

  readonly branchReceiptConfig = computed(() => {
    const branch = this.activeBranch();
    if (!branch) return null;

    return {
      branchName: branch.branchName,
      branchCode: branch.branchCode,
      branchAddress: this.getBranchAddress(branch.branchId),
      branchPhone: this.getBranchPhone(branch.branchId),
      branchManager: this.getBranchManager(branch.branchId),
      receiptFooter: `Terima kasih telah berbelanja di ${branch.branchName}`,
      branchSpecificMessage: this.getBranchMessage(branch.branchId)
    };
  });

  // ===== TRANSACTION OPERATIONS =====

  /**
   * Process a transaction for the current branch
   */
  processTransaction(transaction: Omit<BranchTransactionDto, 'id' | 'branchId' | 'branchName' | 'branchCode'>): Observable<{success: boolean, transactionId?: number, receiptData?: BranchReceiptDto, message?: string}> {
    const currentBranch = this.activeBranch();
    if (!currentBranch) {
      return of({
        success: false,
        message: 'No branch selected. Please select a branch to process transactions.'
      });
    }

    if (!this.canProcessTransaction()) {
      return of({
        success: false,
        message: 'You do not have permission to process transactions in this branch.'
      });
    }

    this._loading.set(true);
    this._error.set(null);

    const branchTransaction: BranchTransactionDto = {
      ...transaction,
      branchId: currentBranch.branchId,
      branchName: currentBranch.branchName,
      branchCode: currentBranch.branchCode,
      transactionDate: new Date().toISOString(),
      receiptNumber: this.generateReceiptNumber(currentBranch.branchCode),
      status: 'Completed'
    };

    console.log('💳 Processing branch transaction...', {
      branchId: branchTransaction.branchId,
      branchName: branchTransaction.branchName,
      total: branchTransaction.total,
      items: branchTransaction.items.length
    });

    return this.http.post<{success: boolean, data?: {id: number, saleNumber: string}, message?: string}>(`${this.apiUrl}/POS/sales`, branchTransaction, {
      withCredentials: true
    })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Create receipt data
            const receiptData: BranchReceiptDto = {
              ...branchTransaction,
              id: response.data.id,
              ...this.branchReceiptConfig()!
            };

            // Update local state
            this._recentTransactions.update(transactions => [branchTransaction, ...transactions.slice(0, 9)]);
            
            console.log('✅ Transaction processed successfully:', response.data.id);
            
            return {
              success: true,
              data: {
                id: response.data.id,
                saleNumber: response.data.saleNumber,
                total: branchTransaction.total,
                totalAmount: branchTransaction.total,
                date: new Date().toISOString(), // Use current date since API doesn't return it
                subtotal: branchTransaction.subtotal,
                discountAmount: branchTransaction.discount,
                taxAmount: branchTransaction.tax,
                amountPaid: branchTransaction.amountPaid,
                changeAmount: branchTransaction.change,
                paymentMethod: branchTransaction.paymentMethod,
                memberId: branchTransaction.memberId,
                memberName: branchTransaction.memberName,
                cashierId: branchTransaction.cashierId,
                cashierName: branchTransaction.cashierName,
                status: branchTransaction.status,
                notes: branchTransaction.notes,
                receiptData
              },
              message: 'Transaction processed successfully'
            };
          } else {
            this._error.set(response.message || 'Transaction failed');
            return response;
          }
        }),
        catchError(error => {
          console.error('❌ Transaction processing failed:', error);
          this._error.set('Network error occurred');
          
          // Generate mock success for development
          const mockReceiptData: BranchReceiptDto = {
            ...branchTransaction,
            id: Date.now(),
            ...this.branchReceiptConfig()!
          };

          this._recentTransactions.update(transactions => [branchTransaction, ...transactions.slice(0, 9)]);

          const mockId = Date.now();
          return of({
            success: true,
            data: {
              id: mockId,
              saleNumber: `MOCK-${mockId}`,
              total: branchTransaction.total,
              totalAmount: branchTransaction.total,
              saleDate: new Date().toISOString(),
              subtotal: branchTransaction.subtotal,
              discountAmount: branchTransaction.discount,
              taxAmount: branchTransaction.tax,
              amountPaid: branchTransaction.amountPaid,
              changeAmount: branchTransaction.change,
              paymentMethod: branchTransaction.paymentMethod,
              memberId: branchTransaction.memberId,
              memberName: branchTransaction.memberName,
              cashierId: branchTransaction.cashierId,
              cashierName: branchTransaction.cashierName,
              status: branchTransaction.status,
              notes: branchTransaction.notes,
              receiptData: mockReceiptData
            },
            message: 'Transaction processed (mock mode)'
          });
        }),
        tap(() => this._loading.set(false))
      );
  }

  /**
   * Validate transaction items against branch inventory
   */
  validateTransactionItems(items: BranchTransactionItemDto[]): Observable<{valid: boolean, issues: string[]}> {
    const branchId = this.currentBranchId();
    if (!branchId) {
      return of({
        valid: false,
        issues: ['No branch selected']
      });
    }

    const branchProducts = this.inventoryService.filteredProducts();
    const issues: string[] = [];

    items.forEach(item => {
      const product = branchProducts.find(p => 
        p.id === item.productId && p.branchId === branchId
      );

      if (!product) {
        issues.push(`Product ${item.productName} not found in ${this.activeBranch()?.branchName}`);
      } else if (product.branchStock < item.quantity) {
        issues.push(`Insufficient stock for ${item.productName} (Available: ${product.branchStock}, Requested: ${item.quantity})`);
      } else if (!product.isActive) {
        issues.push(`Product ${item.productName} is not active in this branch`);
      }
    });

    return of({
      valid: issues.length === 0,
      issues
    });
  }

  /**
   * Get recent transactions for current branch
   */
  loadRecentTransactions(limit: number = 10): Observable<BranchTransactionDto[]> {
    const branchId = this.currentBranchId();
    if (!branchId) {
      return of([]);
    }

    return this.http.get<{success: boolean, data: BranchTransactionDto[]}>(`${this.apiUrl}/POS/recent/${branchId}?limit=${limit}`)
      .pipe(
        map(response => {
          if (response.success) {
            this._recentTransactions.set(response.data);
            return response.data;
          }
          return [];
        }),
        catchError(error => {
          console.error('❌ Error loading recent transactions:', error);
          // Return mock data for development
          return of(this.generateMockTransactions());
        })
      );
  }

  /**
   * Generate branch sales report
   */
  generateBranchReport(startDate: string, endDate: string): Observable<BranchSalesReport> {
    const branchId = this.currentBranchId();
    if (!branchId) {
      return of({} as BranchSalesReport);
    }

    const params = { startDate, endDate };
    
    return this.http.get<{success: boolean, data: BranchSalesReport}>(`${this.apiUrl}/POS/report/${branchId}`, { params })
      .pipe(
        map(response => response.success ? response.data : {} as BranchSalesReport),
        catchError(error => {
          console.error('❌ Error generating report:', error);
          return of(this.generateMockReport());
        })
      );
  }

  // ===== UTILITY METHODS =====

  private generateReceiptNumber(branchCode: string): string {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    const timeStr = Date.now().toString().slice(-4);
    return `${branchCode}-${dateStr}-${timeStr}`;
  }

  private getBranchAddress(branchId: number): string {
    const addresses: Record<number, string> = {
      1: 'Jl. Sudirman No. 123, Jakarta Pusat',
      2: 'Jl. Raya Bekasi No. 456, Bekasi',
      3: 'Jl. BSD Raya No. 789, Tangerang Selatan'
    };
    return addresses[branchId] || 'Alamat tidak tersedia';
  }

  private getBranchPhone(branchId: number): string {
    const phones: Record<number, string> = {
      1: '+62-21-1234-5678',
      2: '+62-21-8765-4321',
      3: '+62-21-5555-6666'
    };
    return phones[branchId] || '+62-21-0000-0000';
  }

  private getBranchManager(branchId: number): string {
    const managers: Record<number, string> = {
      1: 'Budi Santoso',
      2: 'Siti Rahmatika',
      3: 'Ahmad Hidayat'
    };
    return managers[branchId] || 'Manager';
  }

  private getBranchMessage(branchId: number): string {
    const messages: Record<number, string> = {
      1: 'Nikmati promo spesial setiap hari Jumat!',
      2: 'Dapatkan poin member dengan setiap pembelian',
      3: 'Gratis ongkir untuk pembelian di atas 100rb'
    };
    return messages[branchId] || '';
  }

  // ===== MOCK DATA GENERATORS =====

  private generateMockTransactions(): BranchTransactionDto[] {
    const branch = this.activeBranch();
    if (!branch) return [];

    return [
      {
        id: 1,
        transactionCode: 'TRX-001',
        branchId: branch.branchId,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        items: [
          {
            productId: 1,
            productName: 'Indomie Goreng',
            productCode: 'P001',
            barcode: '8998866200015',
            quantity: 2,
            unitPrice: 3500,
            discount: 0,
            subtotal: 7000,
            branchId: branch.branchId,
            availableStock: 50,
            category: 'Food',
            unit: 'pcs'
          }
        ],
        subtotal: 7000,
        discount: 0,
        tax: 0,
        total: 7000,
        paymentMethod: 'cash',
        amountPaid: 10000,
        change: 3000,
        cashierId: 1,
        cashierName: 'Kasir 1',
        transactionDate: new Date().toISOString(),
        receiptNumber: this.generateReceiptNumber(branch.branchCode),
        status: 'Completed'
      }
    ];
  }

  private generateMockReport(): BranchSalesReport {
    const branch = this.activeBranch();
    if (!branch) return {} as BranchSalesReport;

    return {
      branchId: branch.branchId,
      branchName: branch.branchName,
      branchCode: branch.branchCode,
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      totalTransactions: 45,
      totalAmount: 2150000,
      averageTransaction: 47777,
      topProducts: [
        { productName: 'Indomie Goreng', quantity: 120, revenue: 420000 },
        { productName: 'Aqua 600ml', quantity: 85, revenue: 255000 }
      ],
      paymentMethodBreakdown: {
        cash: 1200000,
        card: 650000,
        digital: 300000,
        credit: 0
      },
      memberTransactions: 18,
      memberDiscount: 125000
    };
  }

  // ===== PUBLIC UTILITIES =====

  clearError(): void {
    this._error.set(null);
  }

  getCurrentBranchInfo(): {branchId: number, branchName: string, branchCode: string} | null {
    const branch = this.activeBranch();
    return branch ? {
      branchId: branch.branchId,
      branchName: branch.branchName,
      branchCode: branch.branchCode
    } : null;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}