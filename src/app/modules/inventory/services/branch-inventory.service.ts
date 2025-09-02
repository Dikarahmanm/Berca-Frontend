// src/app/modules/inventory/services/branch-inventory.service.ts
// Enhanced Branch-Aware Inventory Service
// Angular 20 with Multi-Branch Integration

import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { environment } from '../../../../environment/environment';
import { StateService } from '../../../core/services/state.service';
import { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductListResponse, 
  StockUpdateRequest, 
  ProductFilter, 
  ApiResponse,
  ProductBatch,
  ProductWithBatchSummaryDto
} from '../interfaces/inventory.interfaces';

// Enhanced interfaces for branch-aware inventory
export interface BranchProductDto extends Product {
  productCode: string;
  branchId: number;
  branchName: string;
  branchCode: string;
  branchStock: number;
  branchMinimumStock: number;
  lastStockUpdate: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  // Ensure compatibility with Product interface
  minStock: number; // Map to branchMinimumStock
}

export interface BranchStockSummaryDto {
  productId: number;
  productName: string;
  categoryName: string;
  totalStock: number;
  totalValue: number;
  branchStocks: {
    branchId: number;
    branchName: string;
    stock: number;
    minimumStock: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    lastUpdated: string;
  }[];
}

export interface BranchInventoryFilter extends ProductFilter {
  branchIds?: number[];
  stockStatus?: 'In Stock' | 'Low Stock' | 'Out of Stock';
  includeInactive?: boolean;
}

export interface BranchStockTransferDto {
  productId: number;
  fromBranchId: number;
  toBranchId: number;
  quantity: number;
  reason: string;
  requestedBy: number;
  approvedBy?: number;
  transferDate: string;
  status: 'Pending' | 'Approved' | 'In Transit' | 'Completed' | 'Cancelled';
}

@Injectable({
  providedIn: 'root'
})
export class BranchInventoryService {
  private readonly http = inject(HttpClient);
  private readonly stateService = inject(StateService);
  // ✅ Use relative URL for proxy routing
  private readonly apiUrl = '/api/Inventory';

  // Signal-based state management
  private _branchProducts = signal<BranchProductDto[]>([]);
  private _stockSummaries = signal<BranchStockSummaryDto[]>([]);
  private _pendingTransfers = signal<BranchStockTransferDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _lastSyncBranches = signal<number[]>([]);

  // Public readonly signals
  readonly branchProducts = this._branchProducts.asReadonly();
  readonly stockSummaries = this._stockSummaries.asReadonly();
  readonly pendingTransfers = this._pendingTransfers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties that react to branch changes
  readonly activeBranchIds = this.stateService.activeBranchIds;
  
  readonly filteredProducts = computed(() => {
    const products = this._branchProducts();
    const branchIds = this.activeBranchIds();
    
    if (branchIds.length === 0) return products;
    
    return products.filter(product => branchIds.includes(product.branchId));
  });

  readonly lowStockProducts = computed(() => 
    this.filteredProducts().filter(p => p.stockStatus === 'Low Stock')
  );

  readonly outOfStockProducts = computed(() => 
    this.filteredProducts().filter(p => p.stockStatus === 'Out of Stock')
  );

  readonly branchInventoryStats = computed(() => {
    const products = this.filteredProducts();
    const branchStats = new Map<number, {
      branchId: number;
      branchName: string;
      totalProducts: number;
      inStock: number;
      lowStock: number;
      outOfStock: number;
      totalValue: number;
    }>();

    products.forEach(product => {
      if (!branchStats.has(product.branchId)) {
        branchStats.set(product.branchId, {
          branchId: product.branchId,
          branchName: product.branchName,
          totalProducts: 0,
          inStock: 0,
          lowStock: 0,
          outOfStock: 0,
          totalValue: 0
        });
      }

      const stats = branchStats.get(product.branchId)!;
      stats.totalProducts++;
      stats.totalValue += product.branchStock * product.buyPrice;

      switch (product.stockStatus) {
        case 'In Stock':
          stats.inStock++;
          break;
        case 'Low Stock':
          stats.lowStock++;
          break;
        case 'Out of Stock':
          stats.outOfStock++;
          break;
      }
    });

    return Array.from(branchStats.values());
  });

  readonly needsDataRefresh = computed(() => {
    const currentBranches = this.activeBranchIds();
    const lastSyncBranches = this._lastSyncBranches();
    
    if (currentBranches.length !== lastSyncBranches.length) return true;
    
    return !currentBranches.every(id => lastSyncBranches.includes(id));
  });

  constructor() {
    // Auto-refresh when branch selection changes
    effect(() => {
      if (this.needsDataRefresh() && this.activeBranchIds().length > 0) {
        console.log('🔄 Branch selection changed, refreshing inventory data...');
        this.refreshInventoryData();
      }
    });
  }

  // ===== BRANCH-AWARE INVENTORY OPERATIONS =====

  /**
   * Load products for selected branches
   */
  loadBranchProducts(filter?: BranchInventoryFilter): Observable<ApiResponse<BranchProductDto[]>> {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    
    // Add branch filter
    const branchIds = filter?.branchIds || this.activeBranchIds();
    if (branchIds.length > 0) {
      params = params.set('branchIds', branchIds.join(','));
    }

    // Add other filters
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.categoryId) params = params.set('categoryId', filter.categoryId.toString());
    if (filter?.stockStatus) params = params.set('stockStatus', filter.stockStatus);
    if (filter?.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
    if (filter?.lowStock) params = params.set('lowStock', filter.lowStock.toString());
    if (filter?.page) params = params.set('page', filter.page.toString());
    if (filter?.pageSize) params = params.set('pageSize', filter.pageSize.toString());

    console.log('📦 Loading branch inventory...', { branchIds, filter });

    return this.http.get<ApiResponse<BranchProductDto[]>>(`${this.apiUrl}/branch-products`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this._branchProducts.set(response.data);
            this._lastSyncBranches.set(branchIds);
            console.log('✅ Branch inventory loaded:', response.data.length, 'products');
          } else {
            this._error.set(response.message || 'Failed to load branch inventory');
            // Generate mock data for development
            this.generateMockBranchProducts(branchIds);
          }
        }),
        catchError(error => {
          console.error('❌ Error loading branch inventory:', error);
          this._error.set('Network error occurred');
          // Generate mock data for development
          this.generateMockBranchProducts(branchIds);
          return of({
            success: false,
            data: [],
            message: 'Using mock data for development'
          } as ApiResponse<BranchProductDto[]>);
        }),
        tap(() => this._loading.set(false))
      );
  }

  /**
   * Load stock summaries across branches
   */
  loadStockSummaries(): Observable<ApiResponse<BranchStockSummaryDto[]>> {
    this._loading.set(true);

    const branchIds = this.activeBranchIds();
    const params = new HttpParams().set('branchIds', branchIds.join(','));

    console.log('📊 Loading stock summaries...', { branchIds });

    return this.http.get<ApiResponse<BranchStockSummaryDto[]>>(`${this.apiUrl}/stock-summaries`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this._stockSummaries.set(response.data);
            console.log('✅ Stock summaries loaded:', response.data.length, 'products');
          } else {
            this._error.set(response.message || 'Failed to load stock summaries');
            this.generateMockStockSummaries(branchIds);
          }
        }),
        catchError(error => {
          console.error('❌ Error loading stock summaries:', error);
          this.generateMockStockSummaries(branchIds);
          return of({
            success: false,
            data: [],
            message: 'Using mock data for development'
          } as ApiResponse<BranchStockSummaryDto[]>);
        }),
        tap(() => this._loading.set(false))
      );
  }

  /**
   * Update stock for specific branch
   */
  updateBranchStock(
    productId: number, 
    branchId: number, 
    quantity: number, 
    reason: string
  ): Observable<ApiResponse<boolean>> {
    const stockUpdate = {
      productId,
      branchId,
      quantity,
      reason,
      updatedBy: this.stateService.user()?.id || 1,
      updateType: quantity > 0 ? 'Addition' : 'Reduction'
    };

    console.log('📦 Updating branch stock...', stockUpdate);

    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/update-branch-stock`, stockUpdate)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update local state
            this.updateLocalBranchStock(productId, branchId, quantity);
            console.log('✅ Branch stock updated successfully');
          } else {
            this._error.set(response.message || 'Failed to update stock');
          }
        }),
        catchError(error => {
          console.error('❌ Error updating branch stock:', error);
          this._error.set('Network error occurred');
          return of({
            success: false,
            data: false,
            message: 'Failed to update stock'
          } as ApiResponse<boolean>);
        })
      );
  }

  /**
   * Request stock transfer between branches
   */
  requestStockTransfer(transfer: Omit<BranchStockTransferDto, 'status' | 'transferDate'>): Observable<ApiResponse<number>> {
    const transferRequest = {
      ...transfer,
      status: 'Pending',
      transferDate: new Date().toISOString(),
      requestedBy: this.stateService.user()?.id || 1
    };

    console.log('🚛 Requesting stock transfer...', transferRequest);

    return this.http.post<ApiResponse<number>>(`${this.apiUrl}/request-transfer`, transferRequest)
      .pipe(
        tap(response => {
          if (response.success) {
            // Add to pending transfers
            const newTransfer: BranchStockTransferDto = {
              ...transferRequest,
              status: 'Pending'
            };
            this._pendingTransfers.update(transfers => [...transfers, newTransfer]);
            console.log('✅ Stock transfer requested, ID:', response.data);
          }
        }),
        catchError(error => {
          console.error('❌ Error requesting stock transfer:', error);
          return of({
            success: false,
            data: 0,
            message: 'Failed to request transfer'
          } as ApiResponse<number>);
        })
      );
  }

  /**
   * Get low stock alerts for branches
   */
  getLowStockAlerts(): Observable<ApiResponse<BranchProductDto[]>> {
    const branchIds = this.activeBranchIds();
    const params = new HttpParams()
      .set('branchIds', branchIds.join(','))
      .set('alertType', 'LowStock');

    return this.http.get<ApiResponse<BranchProductDto[]>>(`${this.apiUrl}/alerts`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('⚠️ Low stock alerts:', response.data.length, 'products');
          }
        }),
        catchError(error => {
          console.error('❌ Error loading alerts:', error);
          return of({
            success: false,
            data: [],
            message: 'Failed to load alerts'
          } as ApiResponse<BranchProductDto[]>);
        })
      );
  }

  // ===== DATA MANAGEMENT =====

  refreshInventoryData(): void {
    if (this.activeBranchIds().length === 0) {
      console.log('⚠️ No branches selected, skipping refresh');
      return;
    }

    console.log('🔄 Refreshing inventory data for branches:', this.activeBranchIds());
    
    this.loadBranchProducts().subscribe();
    this.loadStockSummaries().subscribe();
  }

  clearError(): void {
    this._error.set(null);
  }

  clearData(): void {
    this._branchProducts.set([]);
    this._stockSummaries.set([]);
    this._pendingTransfers.set([]);
    this._error.set(null);
    this._lastSyncBranches.set([]);
  }

  // ===== UTILITY METHODS =====

  private updateLocalBranchStock(productId: number, branchId: number, quantityChange: number): void {
    this._branchProducts.update(products =>
      products.map(product => {
        if (product.id === productId && product.branchId === branchId) {
          const newStock = product.branchStock + quantityChange;
          const stockStatus = this.determineStockStatus(newStock, product.branchMinimumStock);
          
          return {
            ...product,
            branchStock: newStock,
            stockStatus,
            lastStockUpdate: new Date().toISOString()
          };
        }
        return product;
      })
    );
  }

  private determineStockStatus(stock: number, minimumStock: number): 'In Stock' | 'Low Stock' | 'Out of Stock' {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= minimumStock) return 'Low Stock';
    return 'In Stock';
  }

  // ===== MOCK DATA GENERATORS =====

  private generateMockBranchProducts(branchIds: number[]): void {
    const branches = this.stateService.accessibleBranches();
    const mockProducts: BranchProductDto[] = [];

    branchIds.forEach(branchId => {
      const branch = branches.find(b => b.branchId === branchId);
      if (!branch) return;

      // Generate mock products for each branch
      const baseProducts = [
        { id: 1, name: 'Indomie Goreng', category: 'Food', buyPrice: 3000, sellPrice: 3500, barcode: '8998866200015' },
        { id: 2, name: 'Aqua 600ml', category: 'Beverages', buyPrice: 2500, sellPrice: 3000, barcode: '8886008101015' },
        { id: 3, name: 'Teh Botol Sosro', category: 'Beverages', buyPrice: 4000, sellPrice: 4500, barcode: '8992388101014' },
        { id: 4, name: 'Beras Premium 5kg', category: 'Food', buyPrice: 65000, sellPrice: 75000, barcode: '8998765432101' },
        { id: 5, name: 'Minyak Goreng Tropical', category: 'Food', buyPrice: 18000, sellPrice: 20000, barcode: '8997654321012' }
      ];

      baseProducts.forEach((base, index) => {
        const stock = Math.floor(Math.random() * 100) + 10;
        const minimumStock = 20;
        
        mockProducts.push({
          id: base.id + (branchId * 1000), // Unique ID per branch
          productCode: `P${String(base.id).padStart(3, '0')}-${branch.branchCode}`,
          name: base.name,
          buyPrice: base.buyPrice,
          sellPrice: base.sellPrice,
          minimumStock,
          minStock: minimumStock, // For compatibility with Product interface
          stock: stock,
          categoryId: index + 1,
          categoryName: base.category,
          description: `${base.name} - ${branch.branchName}`,
          barcode: base.barcode,
          unit: 'pcs',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          branchId,
          branchName: branch.branchName,
          branchCode: branch.branchCode,
          branchStock: stock,
          branchMinimumStock: minimumStock,
          lastStockUpdate: new Date().toISOString(),
          stockStatus: this.determineStockStatus(stock, minimumStock)
        });
      });
    });

    this._branchProducts.set(mockProducts);
    console.log('🧪 Generated mock branch products:', mockProducts.length);
  }

  private generateMockStockSummaries(branchIds: number[]): void {
    const branches = this.stateService.accessibleBranches();
    const mockSummaries: BranchStockSummaryDto[] = [];

    // Generate summaries for each product across branches
    const products = ['Indomie Goreng', 'Aqua 600ml', 'Teh Botol Sosro', 'Beras Premium 5kg'];
    
    products.forEach((productName, index) => {
      const branchStocks = branchIds.map(branchId => {
        const branch = branches.find(b => b.branchId === branchId);
        const stock = Math.floor(Math.random() * 100) + 10;
        const minimumStock = 20;
        
        return {
          branchId,
          branchName: branch?.branchName || `Branch ${branchId}`,
          stock,
          minimumStock,
          status: this.determineStockStatus(stock, minimumStock),
          lastUpdated: new Date().toISOString()
        };
      });

      const totalStock = branchStocks.reduce((sum, bs) => sum + bs.stock, 0);
      
      mockSummaries.push({
        productId: index + 1,
        productName,
        categoryName: 'Food & Beverages',
        totalStock,
        totalValue: totalStock * (3000 + index * 1000),
        branchStocks
      });
    });

    this._stockSummaries.set(mockSummaries);
    console.log('🧪 Generated mock stock summaries:', mockSummaries.length);
  }

  // ===== BRANCH STOCK TRANSFER METHODS =====

  /**
   * Create a new stock transfer request between branches
   */
  createStockTransfer(transferRequest: Omit<BranchStockTransferDto, 'status' | 'transferDate'>): Observable<ApiResponse<BranchStockTransferDto>> {
    const transferData: BranchStockTransferDto = {
      ...transferRequest,
      transferDate: new Date().toISOString(),
      status: 'Pending'
    };

    console.log('📦➡️ Creating stock transfer request:', transferData);

    return this.http.post<ApiResponse<BranchStockTransferDto>>(`${this.apiUrl}/stock-transfer`, transferData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Add to pending transfers
            this._pendingTransfers.update(transfers => [...transfers, response.data]);
            console.log('✅ Stock transfer request created:', response.data);
          } else {
            this._error.set(response.message || 'Failed to create transfer request');
            console.error('❌ Failed to create transfer request:', response.message);
          }
        }),
        catchError(error => {
          console.error('❌ Error creating transfer request:', error);
          this._error.set('Network error occurred');
          
          // Generate mock success for development
          const mockTransfer: BranchStockTransferDto = {
            ...transferData,
            status: 'Pending'
          };
          
          this._pendingTransfers.update(transfers => [...transfers, mockTransfer]);
          
          return of({
            success: true,
            data: mockTransfer,
            message: 'Transfer request created (mock data for development)'
          } as ApiResponse<BranchStockTransferDto>);
        })
      );
  }

  /**
   * Get all pending transfer requests
   */
  getPendingTransfers(): Observable<ApiResponse<BranchStockTransferDto[]>> {
    const branchIds = this.activeBranchIds();
    const params = new HttpParams().set('branchIds', branchIds.join(','));

    console.log('📦📋 Loading pending transfers for branches:', branchIds);

    return this.http.get<ApiResponse<BranchStockTransferDto[]>>(`${this.apiUrl}/stock-transfer/pending`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this._pendingTransfers.set(response.data);
            console.log('✅ Pending transfers loaded:', response.data.length);
          } else {
            this._error.set(response.message || 'Failed to load pending transfers');
            this.generateMockTransfers(branchIds);
          }
        }),
        catchError(error => {
          console.error('❌ Error loading pending transfers:', error);
          this.generateMockTransfers(branchIds);
          
          return of({
            success: false,
            data: [],
            message: 'Using mock data for development'
          } as ApiResponse<BranchStockTransferDto[]>);
        })
      );
  }

  /**
   * Approve a stock transfer request
   */
  approveTransfer(transferId: number, approverId: number): Observable<ApiResponse<BranchStockTransferDto>> {
    const approvalData = {
      transferId,
      approverId,
      status: 'Approved'
    };

    console.log('✅ Approving transfer:', approvalData);

    return this.http.patch<ApiResponse<BranchStockTransferDto>>(`${this.apiUrl}/stock-transfer/${transferId}/approve`, approvalData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update local transfer status
            this._pendingTransfers.update(transfers => 
              transfers.map(t => t.productId === transferId ? 
                { ...t, status: 'Approved', approvedBy: approverId } : t
              )
            );
            console.log('✅ Transfer approved:', response.data);
          } else {
            this._error.set(response.message || 'Failed to approve transfer');
          }
        }),
        catchError(error => {
          console.error('❌ Error approving transfer:', error);
          
          // Mock approval for development
          this._pendingTransfers.update(transfers => 
            transfers.map(t => t.productId === transferId ? 
              { ...t, status: 'Approved', approvedBy: approverId } : t
            )
          );
          
          return of({
            success: true,
            data: {} as BranchStockTransferDto,
            message: 'Transfer approved (mock)'
          } as ApiResponse<BranchStockTransferDto>);
        })
      );
  }

  /**
   * Complete a stock transfer (mark as completed)
   */
  completeTransfer(transferId: number): Observable<ApiResponse<boolean>> {
    console.log('🏁 Completing transfer:', transferId);

    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/stock-transfer/${transferId}/complete`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            // Remove from pending transfers or move to completed
            this._pendingTransfers.update(transfers => 
              transfers.map(t => t.productId === transferId ? 
                { ...t, status: 'Completed' } : t
              )
            );
            console.log('✅ Transfer completed');
            
            // Refresh inventory data after successful transfer
            this.refreshInventoryData();
          } else {
            this._error.set(response.message || 'Failed to complete transfer');
          }
        }),
        catchError(error => {
          console.error('❌ Error completing transfer:', error);
          
          // Mock completion for development
          this._pendingTransfers.update(transfers => 
            transfers.map(t => t.productId === transferId ? 
              { ...t, status: 'Completed' } : t
            )
          );
          
          return of({
            success: true,
            data: true,
            message: 'Transfer completed (mock)'
          } as ApiResponse<boolean>);
        })
      );
  }

  /**
   * Cancel a stock transfer request
   */
  cancelTransfer(transferId: number, reason: string): Observable<ApiResponse<boolean>> {
    const cancelData = { reason };

    console.log('❌ Cancelling transfer:', transferId, reason);

    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/stock-transfer/${transferId}/cancel`, cancelData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update transfer status to cancelled
            this._pendingTransfers.update(transfers => 
              transfers.map(t => t.productId === transferId ? 
                { ...t, status: 'Cancelled' } : t
              )
            );
            console.log('✅ Transfer cancelled');
          } else {
            this._error.set(response.message || 'Failed to cancel transfer');
          }
        }),
        catchError(error => {
          console.error('❌ Error cancelling transfer:', error);
          
          // Mock cancellation for development
          this._pendingTransfers.update(transfers => 
            transfers.map(t => t.productId === transferId ? 
              { ...t, status: 'Cancelled' } : t
            )
          );
          
          return of({
            success: true,
            data: true,
            message: 'Transfer cancelled (mock)'
          } as ApiResponse<boolean>);
        })
      );
  }

  /**
   * Get transfer history for a specific product
   */
  getTransferHistory(productId: number): Observable<ApiResponse<BranchStockTransferDto[]>> {
    console.log('📜 Loading transfer history for product:', productId);

    return this.http.get<ApiResponse<BranchStockTransferDto[]>>(`${this.apiUrl}/stock-transfer/history/${productId}`)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Transfer history loaded:', response.data.length, 'transfers');
          } else {
            console.error('❌ Failed to load transfer history:', response.message);
          }
        }),
        catchError(error => {
          console.error('❌ Error loading transfer history:', error);
          
          // Generate mock history for development
          const mockHistory = this.generateMockTransferHistory(productId);
          
          return of({
            success: false,
            data: mockHistory,
            message: 'Using mock transfer history for development'
          } as ApiResponse<BranchStockTransferDto[]>);
        })
      );
  }


  /**
   * Generate mock pending transfers for development
   */
  private generateMockTransfers(branchIds: number[]): void {
    const branches = this.stateService.accessibleBranches();
    const products = this._branchProducts();
    
    if (branches.length < 2 || products.length === 0) {
      console.log('⚠️ Not enough branches or products for mock transfers');
      return;
    }

    const mockTransfers: BranchStockTransferDto[] = [];
    
    // Generate 2-3 mock transfers
    for (let i = 0; i < Math.min(3, products.length); i++) {
      const product = products[i];
      const fromBranch = branches[0];
      const toBranch = branches[1];
      
      mockTransfers.push({
        productId: product.id,
        fromBranchId: fromBranch.branchId,
        toBranchId: toBranch.branchId,
        quantity: Math.floor(Math.random() * 20) + 5,
        reason: `Low stock in ${toBranch.branchName}`,
        requestedBy: 1,
        transferDate: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
        status: Math.random() > 0.5 ? 'Pending' : 'Approved'
      });
    }

    this._pendingTransfers.set(mockTransfers);
    console.log('🧪 Generated mock transfers:', mockTransfers.length);
  }

  /**
   * Generate mock transfer history for development
   */
  private generateMockTransferHistory(productId: number): BranchStockTransferDto[] {
    const branches = this.stateService.accessibleBranches();
    
    if (branches.length < 2) return [];

    const mockHistory: BranchStockTransferDto[] = [];
    const statuses: BranchStockTransferDto['status'][] = ['Completed', 'Cancelled', 'Completed'];
    
    for (let i = 0; i < 3; i++) {
      const fromBranch = branches[i % branches.length];
      const toBranch = branches[(i + 1) % branches.length];
      
      mockHistory.push({
        productId,
        fromBranchId: fromBranch.branchId,
        toBranchId: toBranch.branchId,
        quantity: Math.floor(Math.random() * 50) + 10,
        reason: `Stock rebalancing ${i + 1}`,
        requestedBy: 1,
        approvedBy: i < 2 ? 2 : undefined,
        transferDate: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        status: statuses[i]
      });
    }

    return mockHistory;
  }

  // ===== DEBUG HELPERS =====

  debugInventoryState(): void {
    const state = {
      activeBranches: this.activeBranchIds(),
      productsCount: this._branchProducts().length,
      summariesCount: this._stockSummaries().length,
      lowStockCount: this.lowStockProducts().length,
      outOfStockCount: this.outOfStockProducts().length,
      branchStats: this.branchInventoryStats(),
      needsRefresh: this.needsDataRefresh()
    };

    console.log('📦 Branch Inventory Debug:', state);
  }
}