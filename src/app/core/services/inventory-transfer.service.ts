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
  TransferType,
  MutationType,
  ApiResponse
} from '../models/inventory-transfer.models';

// All interfaces are now imported from the dedicated models file

@Injectable({
  providedIn: 'root'
})
export class InventoryTransferService {
  private readonly apiUrl = `${environment.apiUrl}/InventoryTransfer`;

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

    return this.http.get<ApiResponse<{transfers: any[], totalCount: number, page: number, pageSize: number, totalPages: number}>>(`${this.apiUrl}`, { params })
      .pipe(
        map(response => {
          // Map the API response to match our TypeScript interface
          const mappedTransfers = (response.data.transfers || []).map(transfer => this.mapApiTransferToSummaryDto(transfer));
          return {
            transfers: mappedTransfers,
            totalCount: response.data.totalCount || 0
          };
        }),
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
    const body = {
      sourceBranchId,
      destinationBranchId,
      transferItems: items,
      priority: TransferPriority.Normal
    };
    return this.http.post<ApiResponse<{estimatedCost: number, distance: number, estimatedDeliveryDate: string}>>(`${this.apiUrl}/calculate-cost`, body)
      .pipe(
        map(response => response.data.estimatedCost),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to calculate transfer cost', error))
      );
  }

  /**
   * Estimate delivery date
   */
  estimateDeliveryDate(sourceBranchId: number, destinationBranchId: number, priority: TransferPriority = TransferPriority.Normal): Observable<Date> {
    // Since the calculate-cost endpoint returns delivery date, use that
    const items: CreateTransferItemDto[] = [{
      productId: 1, // dummy product
      quantity: 1,
      qualityNotes: ''
    }];

    this.setLoading(true);
    const body = {
      sourceBranchId,
      destinationBranchId,
      transferItems: items,
      priority
    };

    return this.http.post<ApiResponse<{estimatedCost: number, distance: number, estimatedDeliveryDate: string}>>(`${this.apiUrl}/calculate-cost`, body)
      .pipe(
        map(response => new Date(response.data.estimatedDeliveryDate)),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to estimate delivery date', error))
      );
  }

  // ==================== HELPER METHODS ==================== //

  /**
   * Get transfer by ID with full details
   */
  getTransferById(id: number): Observable<InventoryTransferDto> {
    this.setLoading(true);
    return this.http.get<ApiResponse<InventoryTransferDto>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => response.data),
        tap(() => this.setLoading(false)),
        catchError(error => this.handleError('Failed to get transfer details', error))
      );
  }

  /**
   * Print transfer document
   */
  printTransfer(transferId: number): void {
    // Generate print content directly
    this.generatePrintableTransfer(transferId);
  }

  /**
   * Generate printable transfer document
   */
  private generatePrintableTransfer(transferId: number): void {
    this.getTransferById(transferId).subscribe({
      next: (transfer) => {
        const printContent = this.generateTransferPrintHTML(transfer);
        const printWindow = window.open('', '_blank');

        if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      },
      error: (error) => {
        console.error('Failed to generate printable transfer:', error);
        alert('Gagal menggenerate dokumen print transfer');
      }
    });
  }

  /**
   * Generate HTML content for transfer print
   */
  private generateTransferPrintHTML(transfer: InventoryTransferDto): string {
    const currentDate = new Date().toLocaleDateString('id-ID');
    const transferDate = new Date(transfer.requestedAt).toLocaleDateString('id-ID');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transfer Document - ${transfer.transferNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1976d2; margin: 0; }
          .header h2 { margin: 5px 0; color: #666; }
          .info-section { margin-bottom: 20px; }
          .info-row { display: flex; margin-bottom: 8px; }
          .info-label { font-weight: bold; width: 150px; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .status-pending { background: #fff3e0; color: #e65100; }
          .status-approved { background: #e8f5e8; color: #2e7d32; }
          .status-in-transit { background: #e3f2fd; color: #1565c0; }
          .status-completed { background: #e8f5e8; color: #2e7d32; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .total { font-weight: bold; background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DOKUMEN TRANSFER INVENTORY</h1>
          <h2>${transfer.transferNumber}</h2>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="status status-${transfer.status.toLowerCase()}">${this.getStatusDisplayText(transfer.status)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tanggal Permintaan:</span>
            <span>${transferDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cabang Asal:</span>
            <span>${transfer.sourceBranchName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cabang Tujuan:</span>
            <span>${transfer.destinationBranchName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Diminta oleh:</span>
            <span>${transfer.requestedByName}</span>
          </div>
          ${transfer.approvedByName ? `
          <div class="info-row">
            <span class="info-label">Disetujui oleh:</span>
            <span>${transfer.approvedByName}</span>
          </div>
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Kode Produk</th>
              <th>Nama Produk</th>
              <th>Qty Diminta</th>
              <th>Qty Disetujui</th>
              <th>Harga Satuan</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${transfer.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.productCode}</td>
                <td>${item.productName}</td>
                <td>${item.requestedQuantity}</td>
                <td>${item.approvedQuantity || '-'}</td>
                <td>Rp ${item.unitCost.toLocaleString('id-ID')}</td>
                <td>Rp ${item.totalCost.toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="6"><strong>TOTAL</strong></td>
              <td><strong>Rp ${transfer.totalCost.toLocaleString('id-ID')}</strong></td>
            </tr>
          </tbody>
        </table>

        ${transfer.notes ? `
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Catatan:</span>
              <span>${transfer.notes}</span>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p>Dokumen ini digenerate secara otomatis pada ${currentDate}</p>
          <p>Sistem Manajemen Inventory Multi-Branch</p>
        </div>
      </body>
      </html>
    `;
  }

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
    return statusTexts[status] || 'Menunggu Persetujuan';
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
    return priorityTexts[priority] || 'Normal';
  }

  /**
   * Get status badge class for UI
   */
  getStatusBadgeClass(status: TransferStatus): string {
    const statusClasses = {
      [TransferStatus.Pending]: 'status-pending',
      [TransferStatus.Approved]: 'status-approved',
      [TransferStatus.Rejected]: 'status-rejected',
      [TransferStatus.InTransit]: 'status-in-transit',
      [TransferStatus.Delivered]: 'status-delivered',
      [TransferStatus.Completed]: 'status-completed',
      [TransferStatus.Cancelled]: 'status-cancelled'
    };
    return statusClasses[status] || 'status-pending';
  }

  /**
   * Get priority badge class for UI
   */
  getPriorityBadgeClass(priority: TransferPriority): string {
    const priorityClasses = {
      [TransferPriority.Low]: 'priority-low',
      [TransferPriority.Normal]: 'priority-normal',
      [TransferPriority.High]: 'priority-high',
      [TransferPriority.Emergency]: 'priority-emergency'
    };
    return priorityClasses[priority] || 'priority-normal';
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

  /**
   * Map API transfer response to InventoryTransferSummaryDto interface
   */
  public mapApiTransferToSummaryDto(apiTransfer: any): InventoryTransferSummaryDto {
    const status = this.mapApiStatusToEnum(apiTransfer.status);

    return {
      id: apiTransfer.id,
      transferNumber: apiTransfer.transferNumber,
      sourceBranchName: apiTransfer.sourceBranchName,
      destinationBranchName: apiTransfer.destinationBranchName,
      status: status,
      priority: apiTransfer.priority as TransferPriority,
      requestedAt: new Date(apiTransfer.createdAt || apiTransfer.requestedAt),
      estimatedDeliveryDate: apiTransfer.estimatedDeliveryDate ? new Date(apiTransfer.estimatedDeliveryDate) : undefined,
      actualDeliveryDate: apiTransfer.actualDeliveryDate ? new Date(apiTransfer.actualDeliveryDate) : undefined,
      totalItems: apiTransfer.totalItems,
      totalCost: apiTransfer.totalValue || apiTransfer.totalCost,
      requestedByName: apiTransfer.requestedByName,
      daysInTransit: apiTransfer.daysInTransit,
      isOverdue: apiTransfer.isOverdue,
      canCancel: this.canCancelTransfer(status),
      canApprove: this.canApproveTransfer(status),
      canShip: this.canShipTransfer(status),
      canReceive: this.canReceiveTransfer(status)
    };
  }

  /**
   * Map API status number to TransferStatus enum
   */
  private mapApiStatusToEnum(statusNumber: number): TransferStatus {
    const statusMap: { [key: number]: TransferStatus } = {
      0: TransferStatus.Pending,
      1: TransferStatus.Approved,
      2: TransferStatus.Rejected,
      3: TransferStatus.InTransit,
      4: TransferStatus.Delivered,
      5: TransferStatus.Completed,
      6: TransferStatus.Cancelled
    };
    return statusMap[statusNumber] || TransferStatus.Pending;
  }

  /**
   * Check if transfer can be approved
   */
  public canApproveTransfer(status: TransferStatus): boolean {
    return status === TransferStatus.Pending;
  }

  /**
   * Check if transfer can be cancelled
   */
  public canCancelTransfer(status: TransferStatus): boolean {
    return status === TransferStatus.Pending || status === TransferStatus.Approved;
  }

  /**
   * Check if transfer can be shipped
   */
  public canShipTransfer(status: TransferStatus): boolean {
    return status === TransferStatus.Approved;
  }

  /**
   * Check if transfer can be received
   */
  public canReceiveTransfer(status: TransferStatus): boolean {
    return status === TransferStatus.InTransit || status === TransferStatus.Delivered;
  }
}