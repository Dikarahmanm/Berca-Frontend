import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  InventoryTransferDto,
  TransferItemDto,
  TransferStatusHistory,
  CreateInventoryTransferRequestDto,
  CreateTransferItemDto,
  BulkTransferRequestDto,
  TransferApprovalRequestDto,
  TransferItemApprovalDto,
  TransferShipmentRequestDto,
  TransferItemShipmentDto,
  TransferReceiptRequestDto,
  TransferItemReceiptDto,
  InventoryTransferQueryParams,
  InventoryTransferSummaryDto,
  TransferAnalyticsDto,
  BranchTransferStatsDto,
  TransferTrendDto,
  EmergencyTransferSuggestionDto,
  AvailableSourceDto,
  StockRebalancingSuggestionDto,
  TransferEfficiencyDto,
  TransferStatus,
  TransferPriority,
  MutationType,
  ApiResponse
} from '../models/inventory-transfer.models';

// All interfaces are now imported from the dedicated models file

@Injectable({
  providedIn: 'root'
})
export class InventoryTransferService {
  private readonly apiUrl = `${environment.apiUrl}/api/InventoryTransfer`;

  // State management
  private transfersSubject = new BehaviorSubject<InventoryTransferSummaryDto[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public transfers$ = this.transfersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ==================== CORE TRANSFER OPERATIONS ==================== //

  /**
   * Create a new inventory transfer request
   */
  createTransferRequest(request: CreateInventoryTransferRequestDto): Observable<InventoryTransferDto> {
    this.setLoading(true);
    return this.http.post<ApiResponse<InventoryTransferDto>>(`${this.apiUrl}/request`, request)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to create transfer request', error))
      );
  }

  /**
   * Create bulk transfer requests
   */
  createBulkTransferRequest(request: BulkTransferRequestDto): Observable<InventoryTransferDto> {
    this.setLoading(true);
    return this.http.post<ApiResponse<InventoryTransferDto>>(`${this.apiUrl}/bulk-request`, request)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to create bulk transfer request', error))
      );
  }

  /**
   * Get transfer by ID with full details
   */
  getTransferById(transferId: number): Observable<InventoryTransferDto> {
    this.setLoading(true);
    return this.http.get<ApiResponse<InventoryTransferDto>>(`${this.apiUrl}/${transferId}`)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get transfer details', error))
      );
  }

  /**
   * Get transfers with filtering and pagination
   */
  getTransfers(queryParams?: InventoryTransferQueryParams): Observable<{transfers: InventoryTransferSummaryDto[], totalCount: number}> {
    this.setLoading(true);

    let params = new HttpParams();
    if (queryParams) {
      Object.keys(queryParams).forEach(key => {
        const value = (queryParams as any)[key];
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            params = params.set(key, value.toISOString());
          } else {
            params = params.set(key, value.toString());
          }
        }
      });
    }

    return this.http.get<ApiResponse<{transfers: InventoryTransferSummaryDto[], totalCount: number}>>(`${this.apiUrl}`, { params })
      .pipe(
        map(response => response.data),
        tap(result => {
          this.transfersSubject.next(result.transfers);
          this.setLoading(false);
        }),
        catchError(error => this.handleError('Failed to get transfers', error))
      );
  }

  // ==================== TRANSFER WORKFLOW ==================== //

  /**
   * Approve or reject a transfer request
   */
  approveTransfer(transferId: number, approval: TransferApprovalRequestDto): Observable<InventoryTransferDto> {
    this.setLoading(true);
    return this.http.put<ApiResponse<InventoryTransferDto>>(`${this.apiUrl}/${transferId}/approve`, approval)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to approve transfer', error))
      );
  }

  /**
   * Mark transfer as shipped/in transit
   */
  shipTransfer(transferId: number, shipment: TransferShipmentRequestDto): Observable<InventoryTransferDto> {
    this.setLoading(true);
    return this.http.put<ApiResponse<InventoryTransferDto>>(`${this.apiUrl}/${transferId}/ship`, shipment)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to ship transfer', error))
      );
  }

  /**
   * Complete transfer receipt at destination
   */
  receiveTransfer(transferId: number, receipt: TransferReceiptRequestDto): Observable<InventoryTransferDto> {
    this.setLoading(true);
    return this.http.put<ApiResponse<InventoryTransferDto>>(`${this.apiUrl}/${transferId}/receive`, receipt)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to receive transfer', error))
      );
  }

  /**
   * Cancel a transfer
   */
  cancelTransfer(transferId: number, cancellationReason: string): Observable<InventoryTransferDto> {
    this.setLoading(true);
    const body = { cancellationReason };
    return this.http.put<ApiResponse<InventoryTransferDto>>(`${this.apiUrl}/${transferId}/cancel`, body)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to cancel transfer', error))
      );
  }

  // ==================== EMERGENCY & OPTIMIZATION ==================== //

  /**
   * Create emergency transfer for critical stock shortage
   */
  createEmergencyTransfer(productId: number, destinationBranchId: number, quantity: number): Observable<InventoryTransferDto> {
    this.setLoading(true);
    const body = { productId, destinationBranchId, quantity };
    return this.http.post<ApiResponse<InventoryTransferDto>>(`${this.apiUrl}/emergency`, body)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to create emergency transfer', error))
      );
  }

  /**
   * Get emergency transfer suggestions
   */
  getEmergencyTransferSuggestions(branchId?: number): Observable<EmergencyTransferSuggestionDto[]> {
    this.setLoading(true);
    let params = new HttpParams();
    if (branchId) {
      params = params.set('branchId', branchId.toString());
    }

    return this.http.get<ApiResponse<EmergencyTransferSuggestionDto[]>>(`${this.apiUrl}/emergency-suggestions`, { params })
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get emergency suggestions', error))
      );
  }

  /**
   * Get stock rebalancing suggestions
   */
  getStockRebalancingSuggestions(): Observable<StockRebalancingSuggestionDto[]> {
    this.setLoading(true);
    return this.http.get<ApiResponse<StockRebalancingSuggestionDto[]>>(`${this.apiUrl}/rebalancing-suggestions`)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get rebalancing suggestions', error))
      );
  }

  /**
   * Get route optimization suggestions
   */
  getRouteOptimizationSuggestions(): Observable<TransferEfficiencyDto[]> {
    this.setLoading(true);
    return this.http.get<ApiResponse<TransferEfficiencyDto[]>>(`${this.apiUrl}/route-optimization`)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get route optimization', error))
      );
  }

  // ==================== ANALYTICS & REPORTING ==================== //

  /**
   * Get comprehensive transfer analytics
   */
  getTransferAnalytics(startDate?: Date, endDate?: Date): Observable<TransferAnalyticsDto> {
    this.setLoading(true);
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<ApiResponse<TransferAnalyticsDto>>(`${this.apiUrl}/analytics`, { params })
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get transfer analytics', error))
      );
  }

  /**
   * Get branch transfer performance metrics
   */
  getBranchTransferStats(startDate?: Date, endDate?: Date): Observable<BranchTransferStatsDto[]> {
    this.setLoading(true);
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<ApiResponse<BranchTransferStatsDto[]>>(`${this.apiUrl}/branch-stats`, { params })
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get branch stats', error))
      );
  }

  /**
   * Get transfer trends analysis
   */
  getTransferTrends(startDate: Date, endDate: Date): Observable<TransferTrendDto[]> {
    this.setLoading(true);
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.get<ApiResponse<TransferTrendDto[]>>(`${this.apiUrl}/trends`, { params })
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get transfer trends', error))
      );
  }

  // ==================== AUDIT & HISTORY ==================== //

  /**
   * Get transfer status history for audit trail
   */
  getTransferStatusHistory(transferId: number): Observable<TransferStatusHistory[]> {
    this.setLoading(true);
    return this.http.get<ApiResponse<TransferStatusHistory[]>>(`${this.apiUrl}/${transferId}/history`)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get transfer history', error))
      );
  }

  /**
   * Get transfer activity summary for dashboard
   */
  getTransferActivitySummary(branchId?: number): Observable<any> {
    this.setLoading(true);
    let params = new HttpParams();
    if (branchId) {
      params = params.set('branchId', branchId.toString());
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/activity-summary`, { params })
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get activity summary', error))
      );
  }

  // ==================== UTILITY METHODS ==================== //

  /**
   * Get available source branches for product transfer
   */
  getAvailableSourceBranches(productId: number, destinationBranchId: number, requiredQuantity: number): Observable<AvailableSourceDto[]> {
    this.setLoading(true);
    const params = new HttpParams()
      .set('productId', productId.toString())
      .set('destinationBranchId', destinationBranchId.toString())
      .set('requiredQuantity', requiredQuantity.toString());

    return this.http.get<ApiResponse<AvailableSourceDto[]>>(`${this.apiUrl}/available-sources`, { params })
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get available sources', error))
      );
  }

  /**
   * Calculate transfer cost
   */
  calculateTransferCost(sourceBranchId: number, destinationBranchId: number, items: CreateTransferItemDto[]): Observable<number> {
    this.setLoading(true);
    const body = { sourceBranchId, destinationBranchId, items };
    return this.http.post<ApiResponse<number>>(`${this.apiUrl}/calculate-cost`, body)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to calculate transfer cost', error))
      );
  }

  /**
   * Estimate delivery date
   */
  estimateDeliveryDate(sourceBranchId: number, destinationBranchId: number, priority: TransferPriority = TransferPriority.Normal): Observable<Date> {
    this.setLoading(true);
    const params = new HttpParams()
      .set('sourceBranchId', sourceBranchId.toString())
      .set('destinationBranchId', destinationBranchId.toString())
      .set('priority', priority);

    return this.http.get<ApiResponse<string>>(`${this.apiUrl}/estimate-delivery`, { params })
      .pipe(
        map(response => new Date(response.data)),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to estimate delivery date', error))
      );
  }

  // ==================== HELPER METHODS ==================== //

  /**
   * Refresh transfers list
   */
  refreshTransfers(queryParams?: InventoryTransferQueryParams): Observable<void> {
    return this.getTransfers(queryParams).pipe(
      map(() => void 0)
    );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Get transfer status display text
   */
  getStatusDisplayText(status: TransferStatus): string {
    const statusTexts = {
      [TransferStatus.Pending]: 'Menunggu Persetujuan',
      [TransferStatus.Approved]: 'Disetujui',
      [TransferStatus.Rejected]: 'Ditolak',
      [TransferStatus.InTransit]: 'Dalam Perjalanan',
      [TransferStatus.Delivered]: 'Terkirim',
      [TransferStatus.Completed]: 'Selesai',
      [TransferStatus.Cancelled]: 'Dibatalkan'
    };
    return statusTexts[status] || status;
  }

  /**
   * Get priority display text
   */
  getPriorityDisplayText(priority: TransferPriority): string {
    const priorityTexts = {
      [TransferPriority.Low]: 'Rendah',
      [TransferPriority.Normal]: 'Normal',
      [TransferPriority.High]: 'Tinggi',
      [TransferPriority.Emergency]: 'Darurat'
    };
    return priorityTexts[priority] || priority;
  }

  /**
   * Get status badge class for UI
   */
  getStatusBadgeClass(status: TransferStatus): string {
    const statusClasses = {
      [TransferStatus.Pending]: 'badge-warning',
      [TransferStatus.Approved]: 'badge-info',
      [TransferStatus.Rejected]: 'badge-danger',
      [TransferStatus.InTransit]: 'badge-primary',
      [TransferStatus.Delivered]: 'badge-success',
      [TransferStatus.Completed]: 'badge-success',
      [TransferStatus.Cancelled]: 'badge-secondary'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  /**
   * Get priority badge class for UI
   */
  getPriorityBadgeClass(priority: TransferPriority): string {
    const priorityClasses = {
      [TransferPriority.Low]: 'badge-light',
      [TransferPriority.Normal]: 'badge-primary',
      [TransferPriority.High]: 'badge-warning',
      [TransferPriority.Emergency]: 'badge-danger'
    };
    return priorityClasses[priority] || 'badge-secondary';
  }

  // ==================== PRIVATE HELPER METHODS ==================== //

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private handleError(message: string, error: any): Observable<never> {
    console.error(`InventoryTransferService Error: ${message}`, error);
    this.setLoading(false);
    this.errorSubject.next(message);
    return throwError(() => new Error(message));
  }
}