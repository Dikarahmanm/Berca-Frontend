// src/app/core/services/branch-aware-data.service.ts
// Example service showing how to implement branch-aware data filtering
// Angular 20 with Multi-Branch Integration

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { StateService } from './state.service';

export interface BranchAwareApiResponse<T> {
  success: boolean;
  data: T;
  branchContext: {
    requestedBranches: number[];
    returnedBranches: number[];
    totalRecords: number;
    branchBreakdown: { branchId: number; count: number; }[];
  };
  message?: string;
}

export interface SalesDataDto {
  id: number;
  transactionDate: string;
  totalAmount: number;
  branchId: number;
  branchName: string;
  memberName?: string;
  productCount: number;
  paymentMethod: string;
}

export interface InventoryDataDto {
  productId: number;
  productName: string;
  category: string;
  branchId: number;
  branchName: string;
  currentStock: number;
  minimumStock: number;
  price: number;
  lastUpdated: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchAwareDataService {
  private readonly http = inject(HttpClient);
  private readonly stateService = inject(StateService);
  private readonly baseUrl = environment.apiUrl;

  // Signal-based state for branch-aware data
  private _salesData = signal<SalesDataDto[]>([]);
  private _inventoryData = signal<InventoryDataDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _lastSyncBranches = signal<number[]>([]);

  // Public readonly signals
  readonly salesData = this._salesData.asReadonly();
  readonly inventoryData = this._inventoryData.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties that react to branch changes
  readonly activeBranchIds = this.stateService.activeBranchIds;
  
  readonly filteredSalesData = computed(() => {
    const sales = this._salesData();
    const branchIds = this.activeBranchIds();
    
    if (branchIds.length === 0) return sales;
    
    return sales.filter(sale => branchIds.includes(sale.branchId));
  });

  readonly filteredInventoryData = computed(() => {
    const inventory = this._inventoryData();
    const branchIds = this.activeBranchIds();
    
    if (branchIds.length === 0) return inventory;
    
    return inventory.filter(item => branchIds.includes(item.branchId));
  });

  readonly branchSalesSummary = computed(() => {
    const sales = this.filteredSalesData();
    const summary = new Map<number, { branchName: string; total: number; count: number }>();
    
    sales.forEach(sale => {
      if (!summary.has(sale.branchId)) {
        summary.set(sale.branchId, {
          branchName: sale.branchName,
          total: 0,
          count: 0
        });
      }
      
      const existing = summary.get(sale.branchId)!;
      existing.total += sale.totalAmount;
      existing.count += 1;
    });
    
    return Array.from(summary.entries()).map(([branchId, data]) => ({
      branchId,
      branchName: data.branchName,
      totalSales: data.total,
      transactionCount: data.count,
      averageTransaction: data.count > 0 ? data.total / data.count : 0
    }));
  });

  readonly branchInventorySummary = computed(() => {
    const inventory = this.filteredInventoryData();
    const summary = new Map<number, { branchName: string; products: number; totalValue: number; lowStock: number }>();
    
    inventory.forEach(item => {
      if (!summary.has(item.branchId)) {
        summary.set(item.branchId, {
          branchName: item.branchName,
          products: 0,
          totalValue: 0,
          lowStock: 0
        });
      }
      
      const existing = summary.get(item.branchId)!;
      existing.products += 1;
      existing.totalValue += item.currentStock * item.price;
      if (item.currentStock <= item.minimumStock) {
        existing.lowStock += 1;
      }
    });
    
    return Array.from(summary.entries()).map(([branchId, data]) => ({
      branchId,
      branchName: data.branchName,
      totalProducts: data.products,
      totalStockValue: data.totalValue,
      lowStockItems: data.lowStock
    }));
  });

  readonly needsDataRefresh = computed(() => {
    const currentBranches = this.activeBranchIds();
    const lastSyncBranches = this._lastSyncBranches();
    
    // Check if branch selection has changed
    if (currentBranches.length !== lastSyncBranches.length) return true;
    
    return !currentBranches.every(id => lastSyncBranches.includes(id));
  });

  // ===== DATA LOADING METHODS =====

  loadSalesData(dateRange?: { start: string; end: string }): Observable<BranchAwareApiResponse<SalesDataDto[]>> {
    this._loading.set(true);
    this._error.set(null);

    const params: any = {};
    if (dateRange) {
      params.startDate = dateRange.start;
      params.endDate = dateRange.end;
    }

    console.log('📊 Loading branch-aware sales data...', {
      branches: this.activeBranchIds(),
      dateRange
    });

    return this.http.get<BranchAwareApiResponse<SalesDataDto[]>>(`${this.baseUrl}/sales/branch-aware`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this._salesData.set(response.data);
            this._lastSyncBranches.set(this.activeBranchIds());
            
            console.log('✅ Sales data loaded:', {
              totalRecords: response.branchContext.totalRecords,
              branches: response.branchContext.returnedBranches,
              breakdown: response.branchContext.branchBreakdown
            });
          } else {
            this._error.set(response.message || 'Failed to load sales data');
          }
        }),
        tap(() => this._loading.set(false))
      );
  }

  loadInventoryData(): Observable<BranchAwareApiResponse<InventoryDataDto[]>> {
    this._loading.set(true);
    this._error.set(null);

    console.log('📦 Loading branch-aware inventory data...', {
      branches: this.activeBranchIds()
    });

    return this.http.get<BranchAwareApiResponse<InventoryDataDto[]>>(`${this.baseUrl}/inventory/branch-aware`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._inventoryData.set(response.data);
            this._lastSyncBranches.set(this.activeBranchIds());
            
            console.log('✅ Inventory data loaded:', {
              totalRecords: response.branchContext.totalRecords,
              branches: response.branchContext.returnedBranches,
              breakdown: response.branchContext.branchBreakdown
            });
          } else {
            this._error.set(response.message || 'Failed to load inventory data');
          }
        }),
        tap(() => this._loading.set(false))
      );
  }

  // ===== BRANCH CONTEXT UTILITIES =====

  getCurrentBranchContext(): { branchIds: number[]; branchNames: string[] } {
    const branchIds = this.activeBranchIds();
    const branches = this.stateService.accessibleBranches();
    
    const branchNames = branchIds
      .map(id => branches.find(b => b.branchId === id)?.branchName)
      .filter(name => name !== undefined) as string[];

    return { branchIds, branchNames };
  }

  isBranchDataAvailable(branchId: number): boolean {
    const sales = this._salesData();
    const inventory = this._inventoryData();
    
    return sales.some(s => s.branchId === branchId) || 
           inventory.some(i => i.branchId === branchId);
  }

  getBranchSpecificData<T extends { branchId: number }>(data: T[], branchId: number): T[] {
    return data.filter(item => item.branchId === branchId);
  }

  // ===== AUTO-REFRESH ON BRANCH CHANGE =====

  setupAutoRefresh(): void {
    // This would typically be called from a component's ngOnInit
    // It automatically refreshes data when branch selection changes
    
    // Example implementation:
    // effect(() => {
    //   if (this.needsDataRefresh()) {
    //     this.refreshAllData();
    //   }
    // });
  }

  refreshAllData(): void {
    if (this.activeBranchIds().length === 0) {
      console.log('⚠️ No branches selected, skipping data refresh');
      return;
    }

    console.log('🔄 Refreshing all branch data due to branch selection change');
    
    this.loadSalesData().subscribe({
      next: () => console.log('✅ Sales data refreshed'),
      error: (error) => console.error('❌ Failed to refresh sales data:', error)
    });
    
    this.loadInventoryData().subscribe({
      next: () => console.log('✅ Inventory data refreshed'),
      error: (error) => console.error('❌ Failed to refresh inventory data:', error)
    });
  }

  // ===== UTILITY METHODS =====

  clearData(): void {
    this._salesData.set([]);
    this._inventoryData.set([]);
    this._error.set(null);
    this._lastSyncBranches.set([]);
  }

  getDataStats(): {
    salesCount: number;
    inventoryCount: number;
    coversBranches: number[];
    lastSync: string;
  } {
    const sales = this._salesData();
    const inventory = this._inventoryData();
    
    const salesBranches = [...new Set(sales.map(s => s.branchId))];
    const inventoryBranches = [...new Set(inventory.map(i => i.branchId))];
    const allBranches = [...new Set([...salesBranches, ...inventoryBranches])];
    
    return {
      salesCount: sales.length,
      inventoryCount: inventory.length,
      coversBranches: allBranches,
      lastSync: new Date().toISOString()
    };
  }

  // ===== DEBUG HELPERS =====

  debugBranchData(): void {
    const context = this.getCurrentBranchContext();
    const stats = this.getDataStats();
    
    console.log('🏢 Branch-Aware Data Debug:', {
      currentContext: context,
      dataStats: stats,
      salesSummary: this.branchSalesSummary(),
      inventorySummary: this.branchInventorySummary(),
      needsRefresh: this.needsDataRefresh()
    });
  }
}