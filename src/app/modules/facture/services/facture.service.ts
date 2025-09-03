import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environment/environment';
import {
  FactureDto,
  FactureListDto,
  FacturePagedResponseDto,
  ReceiveFactureDto,
  VerifyFactureDto,
  DisputeFactureDto,
  UpdateFactureDto,
  FactureQueryParams,
  FactureStatsDto,
  SchedulePaymentDto,
  ProcessPaymentDto,
  ConfirmPaymentDto,
  CancelPaymentDto,
  FacturePaymentDto,
  FactureStatus,
  FacturePriority
} from '../interfaces/facture.interfaces';

// API Response wrapper matching backend pattern
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FactureService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/Facture'; // Will be proxied to localhost:5171

  // Signal-based state management
  private _factures = signal<FactureListDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly factures = this._factures.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties - optimized for performance
  readonly facturesCount = computed(() => this._factures().length);

  readonly pendingCount = computed(() => 
    this._factures().filter(f => 
      [FactureStatus.RECEIVED, FactureStatus.VERIFICATION].includes(f.status)
    ).length
  );

  readonly overdueCount = computed(() => 
    this._factures().filter(f => f.isOverdue).length
  );

  // ==================== WORKFLOW OPERATIONS ==================== //

  receiveSupplierInvoice(receiveDto: ReceiveFactureDto): Observable<FactureDto> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.post<any>(`${this.baseUrl}/receive`, receiveDto, {
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('📊 Raw receive facture response:', response);
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
          console.log('✅ Using direct FactureDto response');
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
          console.log('✅ Using wrapped response.data');
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
          console.log('✅ Using alternative wrapper format');
        } else {
          console.error('❌ Invalid receive facture response format:', response);
          throw new Error('Failed to receive supplier invoice');
        }

        if (!factureData || !factureData.id) {
          throw new Error('Invalid received facture data structure');
        }

        return factureData;
      }),
      tap(factureData => {
        // Add to local state
        this._factures.update(factures => [...factures, this.mapFactureToListDto(factureData)]);
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        return this.handleError(error);
      })
    );
  }

  verifyFactureItems(id: number, verifyDto: VerifyFactureDto): Observable<FactureDto> {
    this._loading.set(true);
    console.log('🔄 Verifying facture:', id, verifyDto);
    
    return this.http.post<any>(`${this.baseUrl}/${id}/verify`, verifyDto, {
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('📊 Raw verify facture response:', response);
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
          console.log('✅ Using direct FactureDto response');
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
          console.log('✅ Using wrapped response.data');
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
          console.log('✅ Using alternative wrapper format');
        } else {
          console.error('❌ Invalid verify facture response format:', response);
          throw new Error('Failed to verify facture');
        }

        if (!factureData || !factureData.id) {
          throw new Error('Invalid verified facture data structure');
        }

        return factureData;
      }),
      tap(factureData => {
        console.log('✅ Facture verified successfully:', factureData);
        // Update local state if facture exists
        this._factures.update(factures => 
          factures.map(f => f.id === id ? this.mapFactureToListDto(factureData) : f)
        );
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        return this.handleError(error);
      })
    );
  }

  approveFacture(id: number, approvalNotes?: string): Observable<FactureDto> {
    this._loading.set(true);
    console.log('🔄 Approving facture:', id, approvalNotes);
    
    return this.http.post<any>(`${this.baseUrl}/${id}/approve`, JSON.stringify(approvalNotes || ''), {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        console.log('📊 Raw approve facture response:', response);
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
          console.log('✅ Using direct FactureDto response');
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
          console.log('✅ Using wrapped response.data');
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
          console.log('✅ Using alternative wrapper format');
        } else {
          console.error('❌ Invalid approve facture response format:', response);
          throw new Error('Failed to approve facture');
        }

        if (!factureData || !factureData.id) {
          throw new Error('Invalid approved facture data structure');
        }

        return factureData;
      }),
      tap(factureData => {
        console.log('✅ Facture approved successfully:', factureData);
        // Update local state
        this._factures.update(factures => 
          factures.map(f => f.id === id ? this.mapFactureToListDto(factureData) : f)
        );
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        return this.handleError(error);
      })
    );
  }

  disputeFacture(id: number, disputeDto: DisputeFactureDto): Observable<FactureDto> {
    this._loading.set(true);
    console.log('🔄 Disputing facture:', id, disputeDto);
    
    return this.http.post<FactureDto>(`${this.baseUrl}/${id}/dispute`, disputeDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Facture disputed successfully:', response);
        if (response && response.id) {
          // Update local state
          this._factures.update(factures => 
            factures.map(f => f.id === id ? this.mapFactureToListDto(response) : f)
          );
        }
        this._loading.set(false);
      }),
      map(response => {
        if (!response || !response.id) {
          throw new Error('Invalid response from dispute endpoint');
        }
        return response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  cancelFacture(id: number, cancellationReason?: string): Observable<boolean> {
    this._loading.set(true);
    console.log('🔄 Cancelling facture:', id, cancellationReason);
    
    return this.http.post(`${this.baseUrl}/${id}/cancel`, JSON.stringify(cancellationReason || ''), {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'text'
    }).pipe(
      tap(response => {
        console.log('✅ Facture cancelled successfully:', response);
        // Update local state
        this._factures.update(factures => 
          factures.map(f => f.id === id ? { ...f, status: FactureStatus.CANCELLED } : f)
        );
        this._loading.set(false);
      }),
      map(() => true), // Return true on successful cancellation
      catchError(this.handleError.bind(this))
    );
  }

  // ==================== CRUD OPERATIONS ==================== //

  getFactures(query: FactureQueryParams): Observable<FacturePagedResponseDto> {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    
    if (query.search) params = params.set('search', query.search);
    if (query.supplierId) params = params.set('supplierId', query.supplierId.toString());
    if (query.branchId) params = params.set('branchId', query.branchId.toString());
    
    // Handle multiple branch IDs for multi-branch filtering
    if (query.branchIds && Array.isArray(query.branchIds)) {
      params = params.set('branchIds', query.branchIds.join(','));
    }
    
    // Handle status as string (backend expects status as string, not enum)
    if (query.status !== undefined) {
      if (Array.isArray(query.status)) {
        params = params.set('status', query.status.join(','));
      } else {
        params = params.set('status', query.status.toString());
      }
    }
    
    // Date filters (backend expects specific date format)
    if (query.fromDate) params = params.set('fromDate', query.fromDate.toISOString());
    if (query.toDate) params = params.set('toDate', query.toDate.toISOString());
    
    // Pagination
    params = params.set('page', query.page.toString());
    params = params.set('pageSize', Math.min(query.pageSize, 100).toString());
    params = params.set('sortBy', query.sortBy);
    params = params.set('sortOrder', query.sortOrder);

    console.log('🔍 Facture request params:', params.toString());

    // Try both wrapped and direct response formats
    return this.http.get<any>(this.baseUrl, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('📊 Raw factures response:', response);
        
        let facturesArray: FactureListDto[] = [];
        
        // Handle different response formats
        if (Array.isArray(response)) {
          // Direct array response
          facturesArray = response;
          console.log('✅ Using direct array response:', facturesArray.length, 'items');
        } else if (response && typeof response === 'object') {
          // Check for various wrapper formats
          if (response.success && response.data) {
            facturesArray = Array.isArray(response.data) ? response.data : [];
            console.log('✅ Using wrapped response.data:', facturesArray.length, 'items');
          } else if (response.data && Array.isArray(response.data)) {
            facturesArray = response.data;
            console.log('✅ Using response.data array:', facturesArray.length, 'items');
          } else if (response.factures && Array.isArray(response.factures)) {
            facturesArray = response.factures;
            console.log('✅ Using response.factures array:', facturesArray.length, 'items');
          } else {
            console.warn('⚠️ Unknown response format, trying fallback');
            facturesArray = [];
          }
        } else {
          console.warn('⚠️ Unexpected response type:', typeof response);
          facturesArray = [];
        }

        // Calculate statistics from the factures
        const totalAmount = facturesArray.reduce((sum, f) => sum + f.totalAmount, 0);
        const totalPaidAmount = facturesArray.reduce((sum, f) => sum + f.paidAmount, 0);
        const totalOutstanding = facturesArray.reduce((sum, f) => sum + f.remainingAmount, 0);
        const overdueFactures = facturesArray.filter(f => f.isOverdue);
        
        // Create proper paged response structure
        const processedResponse: FacturePagedResponseDto = {
          factures: facturesArray,
          totalCount: facturesArray.length,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.ceil(facturesArray.length / query.pageSize),
          hasNextPage: facturesArray.length > (query.page * query.pageSize),
          hasPreviousPage: query.page > 1,
          totalAmount,
          totalPaidAmount,
          totalOutstanding,
          overdueCount: overdueFactures.length,
          overdueAmount: overdueFactures.reduce((sum, f) => sum + f.remainingAmount, 0)
        };

        console.log('✅ Processed factures response:', {
          totalFactures: processedResponse.factures.length,
          totalAmount: processedResponse.totalAmount,
          overdueCount: processedResponse.overdueCount
        });

        return processedResponse;
      }),
      tap(processedResponse => {
        // Update signal state after processing
        this._factures.set(processedResponse.factures);
        this._loading.set(false);
      }),
      catchError(error => {
        console.error('❌ Error fetching factures:', error);
        
        // Only use fallback if backend is completely unavailable (no response)
        if (error.status === 0) {
          console.warn('🔌 Backend completely unavailable, using fallback data');
          const fallbackFactures: FactureListDto[] = this.generateSampleFactures();
          const totalAmount = fallbackFactures.reduce((sum, f) => sum + f.totalAmount, 0);
          const totalPaidAmount = fallbackFactures.reduce((sum, f) => sum + f.paidAmount, 0);
          const overdueFactures = fallbackFactures.filter(f => f.isOverdue);
          
          const fallbackResponse: FacturePagedResponseDto = {
            factures: fallbackFactures,
            totalCount: fallbackFactures.length,
            page: query.page,
            pageSize: query.pageSize,
            totalPages: Math.ceil(fallbackFactures.length / query.pageSize),
            hasNextPage: false,
            hasPreviousPage: false,
            totalAmount,
            totalPaidAmount,
            totalOutstanding: totalAmount - totalPaidAmount,
            overdueCount: overdueFactures.length,
            overdueAmount: overdueFactures.reduce((sum, f) => sum + f.remainingAmount, 0)
          };
          
          console.log('📊 Using fallback factures:', fallbackFactures.length, 'items');
          this._factures.set(fallbackFactures);
          this._loading.set(false);
          
          return new Observable<FacturePagedResponseDto>(observer => {
            observer.next(fallbackResponse);
            observer.complete();
          });
        }
        
        return this.handleError(error);
      })
    );
  }

  getFactureById(id: number): Observable<FactureDto> {
    this._loading.set(true);
    
    return this.http.get<any>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('📊 Raw facture detail response:', response);
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
          console.log('✅ Using direct FactureDto response');
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
          console.log('✅ Using wrapped response.data');
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
          console.log('✅ Using alternative wrapper format');
        } else {
          console.error('❌ Invalid facture response format:', response);
          throw new Error('Invalid facture data received from server');
        }

        if (!factureData || !factureData.id) {
          throw new Error('Invalid facture data structure');
        }

        return factureData;
      }),
      tap(() => this._loading.set(false)),
      catchError(error => {
        this._loading.set(false);
        return this.handleError(error);
      })
    );
  }

  getFactureBySupplierInvoiceNumber(
    supplierInvoiceNumber: string, 
    supplierId: number
  ): Observable<FactureDto> {
    this._loading.set(true);
    let params = new HttpParams().set('supplierId', supplierId.toString());
    
    return this.http.get<any>(
      `${this.baseUrl}/supplier-invoice/${supplierInvoiceNumber}`, 
      {
        params,
        withCredentials: true
      }
    ).pipe(
      map(response => {
        console.log('📊 Raw facture by invoice response:', response);
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
          console.log('✅ Using direct FactureDto response');
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
          console.log('✅ Using wrapped response.data');
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
          console.log('✅ Using alternative wrapper format');
        } else {
          console.error('❌ Invalid facture response format:', response);
          throw new Error('Failed to fetch facture by supplier invoice number');
        }

        if (!factureData || !factureData.id) {
          throw new Error('Invalid facture data structure');
        }

        return factureData;
      }),
      tap(() => this._loading.set(false)),
      catchError(error => {
        this._loading.set(false);
        return this.handleError(error);
      })
    );
  }

  updateFacture(id: number, updateDto: UpdateFactureDto): Observable<FactureDto> {
    this._loading.set(true);
    
    return this.http.put<any>(`${this.baseUrl}/${id}`, updateDto, {
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('📊 Raw facture update response:', response);
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
          console.log('✅ Using direct FactureDto response');
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
          console.log('✅ Using wrapped response.data');
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
          console.log('✅ Using alternative wrapper format');
        } else {
          console.error('❌ Invalid facture update response format:', response);
          throw new Error('Failed to update facture');
        }

        if (!factureData || !factureData.id) {
          throw new Error('Invalid updated facture data structure');
        }

        return factureData;
      }),
      tap(factureData => {
        // Update local state
        this._factures.update(factures => 
          factures.map(f => f.id === id ? this.mapFactureToListDto(factureData) : f)
        );
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        return this.handleError(error);
      })
    );
  }

  // ==================== SUPPLIER-SPECIFIC OPERATIONS ==================== //

  getSupplierFactures(
    supplierId: number, 
    includeCompleted: boolean = false, 
    pageSize: number = 50
  ): Observable<FactureListDto[]> {
    let params = new HttpParams()
      .set('includeCompleted', includeCompleted.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<FactureListDto[]>>(`${this.baseUrl}/supplier/${supplierId}`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch supplier factures');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ==================== ANALYTICS & REPORTING ==================== //

  getFactureStats(branchId?: number, supplierId?: number): Observable<FactureStatsDto> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    if (supplierId) params = params.set('supplierId', supplierId.toString());
    
    return this.http.get<ApiResponse<FactureStatsDto>>(`${this.baseUrl}/stats`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch facture stats');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ==================== UTILITY METHODS ==================== //

  // Test method for debugging connectivity issues
  testConnection(): Observable<any> {
    console.log('🧪 Testing connection to:', this.baseUrl);
    
    return this.http.get<any>(this.baseUrl, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Test connection successful:', response);
      }),
      catchError(error => {
        console.error('❌ Test connection failed:', error);
        console.error('Full error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url,
          name: error.name,
          type: typeof error
        });
        return throwError(() => error);
      })
    );
  }

  getStatusLabel(status: FactureStatus): string {
    const statusLabels: Record<FactureStatus, string> = {
      [FactureStatus.RECEIVED]: 'Received',
      [FactureStatus.VERIFICATION]: 'Under Verification',
      [FactureStatus.VERIFIED]: 'Verified',
      [FactureStatus.APPROVED]: 'Approved',
      [FactureStatus.PAID]: 'Paid',
      [FactureStatus.DISPUTED]: 'Disputed',
      [FactureStatus.CANCELLED]: 'Cancelled',
      [FactureStatus.PARTIAL_PAID]: 'Partially Paid'
    };
    return statusLabels[status] || 'Unknown';
  }

  getStatusColor(status: FactureStatus): string {
    const statusColors: Record<FactureStatus, string> = {
      [FactureStatus.RECEIVED]: 'blue',
      [FactureStatus.VERIFICATION]: 'orange',
      [FactureStatus.VERIFIED]: 'purple',
      [FactureStatus.APPROVED]: 'green',
      [FactureStatus.PAID]: 'success',
      [FactureStatus.DISPUTED]: 'red',
      [FactureStatus.CANCELLED]: 'grey',
      [FactureStatus.PARTIAL_PAID]: 'yellow'
    };
    return statusColors[status] || 'default';
  }

  // Helper method to map FactureDto to FactureListDto
  private mapFactureToListDto(facture: FactureDto): FactureListDto {
    return {
      id: facture.id,
      supplierName: facture.supplierName,
      supplierInvoiceNumber: facture.supplierInvoiceNumber,
      internalReferenceNumber: facture.internalReferenceNumber,
      totalAmount: facture.totalAmount,
      paidAmount: facture.paidAmount,
      remainingAmount: facture.outstandingAmount, // Use outstandingAmount
      invoiceDate: facture.invoiceDate,
      dueDate: facture.dueDate,
      status: facture.status,
      priority: facture.paymentPriority, // Use paymentPriority
      isOverdue: facture.isOverdue,
      daysUntilDue: facture.daysUntilDue,
      receivedAt: facture.receivedAt,
      receivedBy: facture.receivedByName, // Use receivedByName
      branchName: facture.branchName
    };
  }

  // ==================== STATE MANAGEMENT HELPERS ==================== //

  clearError(): void {
    this._error.set(null);
  }

  refreshFactures(query?: FactureQueryParams): void {
    if (query) {
      this.getFactures(query).subscribe();
    }
  }

  // Get facture from local state
  getFactureFromState(id: number): FactureListDto | undefined {
    return this._factures().find(f => f.id === id);
  }

  // ==================== PAYMENT PROCESSING METHODS ==================== //

  schedulePayment(scheduleDto: SchedulePaymentDto): Observable<FacturePaymentDto> {
    this._loading.set(true);
    console.log('💰 Scheduling payment:', scheduleDto);
    
    return this.http.post<FacturePaymentDto>(`${this.baseUrl}/${scheduleDto.factureId}/payments/schedule`, scheduleDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Payment scheduled successfully:', response);
        // Update local state if needed
        this._loading.set(false);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  processPayment(processDto: ProcessPaymentDto): Observable<FacturePaymentDto> {
    this._loading.set(true);
    console.log('🔄 Processing payment:', processDto);
    
    return this.http.post<FacturePaymentDto>(`${this.baseUrl}/payments/${processDto.paymentId}/process`, processDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Payment processed successfully:', response);
        this._loading.set(false);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  confirmPayment(confirmDto: ConfirmPaymentDto): Observable<FacturePaymentDto> {
    this._loading.set(true);
    const apiUrl = `${this.baseUrl}/payments/${confirmDto.paymentId}/confirm`;
    console.log('✅ Confirming payment:', confirmDto);
    console.log('🔍 API URL:', apiUrl);
    console.log('🔍 Request body:', JSON.stringify(confirmDto, null, 2));
    
    return this.http.post<FacturePaymentDto>(apiUrl, confirmDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Payment confirmed successfully - Full response:', response);
        console.log('🔍 Response status:', response?.status, response?.statusDisplay);
        console.log('🔍 Response confirmed amount:', response?.amount);
        console.log('🔍 Response confirmed at:', response?.confirmedAt);
        console.log('🔍 Response processing status:', response?.processingStatus);
        this._loading.set(false);
      }),
      catchError(error => {
        console.error('❌ Confirm payment API error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error body:', error.error);
        this._loading.set(false);
        return this.handleError(error);
      })
    );
  }

  cancelPayment(cancelDto: CancelPaymentDto): Observable<boolean> {
    this._loading.set(true);
    console.log('❌ Cancelling payment:', cancelDto);
    
    return this.http.post(`${this.baseUrl}/payments/${cancelDto.paymentId}/cancel`, cancelDto, {
      withCredentials: true,
      responseType: 'text'
    }).pipe(
      tap(response => {
        console.log('✅ Payment cancelled successfully:', response);
        this._loading.set(false);
      }),
      map(() => true),
      catchError(this.handleError.bind(this))
    );
  }

  getFacturePayments(factureId: number): Observable<FacturePaymentDto[]> {
    this._loading.set(true);
    console.log('📋 Getting facture payments:', factureId);
    
    return this.http.get<FacturePaymentDto[]>(`${this.baseUrl}/${factureId}/payments`, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Facture payments retrieved:', response);
        this._loading.set(false);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Generate sample facture data for fallback
  private generateSampleFactures(): FactureListDto[] {
    const sampleSuppliers = [
      'PT Sumber Rejeki',
      'CV Maju Bersama', 
      'PT Cahaya Baru',
      'UD Berkah Jaya',
      'PT Indo Sukses'
    ];
    
    const factures: FactureListDto[] = [];
    
    for (let i = 1; i <= 8; i++) {
      const supplier = sampleSuppliers[i % sampleSuppliers.length];
      const invoiceDate = new Date();
      invoiceDate.setDate(invoiceDate.getDate() - (i * 5));
      
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);
      
      const totalAmount = Math.floor(Math.random() * 50000000) + 5000000; // 5M - 55M
      const paidAmount = Math.floor(totalAmount * (Math.random() * 0.7)); // 0-70% paid
      const outstandingAmount = totalAmount - paidAmount;
      
      const receivedAt = new Date(invoiceDate);
      receivedAt.setHours(receivedAt.getHours() + 2); // Received 2 hours after invoice date
      
      factures.push({
        id: i,
        supplierName: supplier,
        supplierInvoiceNumber: `INV-${supplier.replace(/\s/g, '').substring(0, 3).toUpperCase()}-${String(i).padStart(4, '0')}`,
        internalReferenceNumber: `REF-${new Date().getFullYear()}-${String(i).padStart(4, '0')}`,
        totalAmount,
        paidAmount,
        remainingAmount: outstandingAmount,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        status: this.getRandomStatus(),
        priority: this.getRandomPriority(),
        isOverdue: dueDate < new Date(),
        daysUntilDue: dueDate > new Date() ? Math.floor((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0,
        receivedAt: receivedAt,
        receivedBy: `User ${i % 3 + 1}`,
        branchName: i <= 4 ? 'Head Office' : 'Branch Jakarta'
      });
    }
    
    return factures;
  }
  
  private getRandomStatus(): FactureStatus {
    const statuses = [
      FactureStatus.RECEIVED,
      FactureStatus.VERIFICATION, 
      FactureStatus.VERIFIED,
      FactureStatus.APPROVED,
      FactureStatus.PARTIAL_PAID,
      FactureStatus.PAID
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }
  
  private getRandomPriority(): FacturePriority {
    const priorities = [FacturePriority.LOW, FacturePriority.NORMAL, FacturePriority.HIGH, FacturePriority.URGENT];
    return priorities[Math.floor(Math.random() * priorities.length)];
  }
  
  private getPriorityLabel(priority: FacturePriority): string {
    const labels: Record<FacturePriority, string> = {
      [FacturePriority.LOW]: 'Low',
      [FacturePriority.NORMAL]: 'Normal', 
      [FacturePriority.HIGH]: 'High',
      [FacturePriority.URGENT]: 'Urgent'
    };
    return labels[priority] || 'Unknown';
  }

  // Enhanced error handler for better debugging
  private handleError(error: any): Observable<never> {
    console.error('❌ === FACTURE SERVICE ERROR ===');
    console.error('Full error object:', error);
    console.error('Error type:', typeof error);
    console.error('Status:', error?.status);
    console.error('Status text:', error?.statusText);
    console.error('Message:', error?.message);
    console.error('Error body:', error?.error);
    console.error('Error body type:', typeof error?.error);
    console.error('Error body keys:', error?.error ? Object.keys(error.error) : 'N/A');
    console.error('Error name:', error?.name);
    console.error('URL:', error?.url);
    
    // If it's a 400 error, log detailed validation information
    if (error?.status === 400 && error?.error) {
      console.error('🔍 400 BAD REQUEST DETAILS:');
      console.error('Error message:', error.error.message || error.error.title);
      console.error('Validation errors:', error.error.errors);
      console.error('Detail:', error.error.detail);
      console.error('Raw error body:', JSON.stringify(error.error, null, 2));
    }
    
    let errorMessage = 'An unexpected error occurred with facture service';
    
    // Check for different types of errors
    if (error?.status === 0) {
      errorMessage = 'Cannot connect to server. Please check if the backend is running on http://localhost:5171';
    } else if (error?.status === 401) {
      errorMessage = 'Authentication required. Please log in to access factures.';
    } else if (error?.status === 403) {
      errorMessage = 'Access denied. You do not have permission to view factures.';
    } else if (error?.status === 404) {
      errorMessage = 'Facture API endpoint not found. Please check backend configuration.';
    } else if (error?.status >= 500) {
      errorMessage = 'Server error occurred. Please try again later.';
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      errorMessage = 'Network error: Failed to connect to the server. Check if backend is running.';
    }
    
    this._error.set(errorMessage);
    this._loading.set(false);
    
    return throwError(() => new Error(errorMessage));
  }

  // ==================== DATA ENHANCEMENT UTILITY ==================== //

  /**
   * Enhance facture data with computed fields and fallbacks for missing properties
   */
  private enhanceFactureData(factureData: any): FactureDto {
    console.log('🔧 Enhancing facture data:', factureData);

    // Create enhanced facture with fallbacks
    const enhanced: FactureDto = {
      ...factureData,
      
      // Basic fallbacks
      supplierName: factureData.supplierName || factureData.supplier?.name || 'Unknown Supplier',
      supplierCode: factureData.supplierCode || factureData.supplier?.code || 'N/A',
      branchName: factureData.branchName || factureData.branch?.name || 'Main Branch',
      branchDisplay: factureData.branchDisplay || factureData.branchName || 'Main Branch',
      
      // Status and display fields
      statusDisplay: factureData.statusDisplay || this.getStatusDisplayFromEnum(factureData.status),
      priorityDisplay: factureData.priorityDisplay || this.getPriorityDisplayFromEnum(factureData.paymentPriority),
      verificationStatus: factureData.verificationStatus || this.getVerificationStatusFromEnum(factureData.status),
      
      // Financial fields with fallbacks
      totalAmount: factureData.totalAmount || 0,
      paidAmount: factureData.paidAmount || 0,
      outstandingAmount: factureData.outstandingAmount ?? (factureData.totalAmount || 0) - (factureData.paidAmount || 0),
      tax: factureData.tax || 0,
      discount: factureData.discount || 0,
      
      // Display fields
      totalAmountDisplay: factureData.totalAmountDisplay || this.formatCurrency(factureData.totalAmount || 0),
      paidAmountDisplay: factureData.paidAmountDisplay || this.formatCurrency(factureData.paidAmount || 0),
      outstandingAmountDisplay: factureData.outstandingAmountDisplay || this.formatCurrency((factureData.totalAmount || 0) - (factureData.paidAmount || 0)),
      
      // Computed fields
      daysOverdue: factureData.daysOverdue ?? this.calculateDaysOverdue(factureData.dueDate),
      daysUntilDue: factureData.daysUntilDue ?? this.calculateDaysUntilDue(factureData.dueDate),
      paymentProgress: factureData.paymentProgress ?? this.calculatePaymentProgress(factureData.totalAmount, factureData.paidAmount),
      isOverdue: factureData.isOverdue ?? this.calculateIsOverdue(factureData.dueDate),
      
      // Workflow permissions with smart defaults based on status
      canVerify: factureData.canVerify ?? this.calculateCanVerify(factureData.status),
      canApprove: factureData.canApprove ?? this.calculateCanApprove(factureData.status),
      canDispute: factureData.canDispute ?? this.calculateCanDispute(factureData.status),
      canCancel: factureData.canCancel ?? this.calculateCanCancel(factureData.status),
      canSchedulePayment: factureData.canSchedulePayment ?? this.calculateCanSchedulePayment(factureData.status, factureData.outstandingAmount),
      canReceivePayment: factureData.canReceivePayment ?? this.calculateCanReceivePayment(factureData.status, factureData.outstandingAmount),
      
      // Ensure arrays exist
      items: factureData.items || [],
      payments: factureData.payments || [],
      
      // Date conversions
      invoiceDate: new Date(factureData.invoiceDate),
      dueDate: new Date(factureData.dueDate),
      receivedAt: new Date(factureData.receivedAt),
      verifiedAt: factureData.verifiedAt ? new Date(factureData.verifiedAt) : undefined,
      approvedAt: factureData.approvedAt ? new Date(factureData.approvedAt) : undefined,
      createdAt: new Date(factureData.createdAt),
      updatedAt: new Date(factureData.updatedAt),
      deliveryDate: factureData.deliveryDate ? new Date(factureData.deliveryDate) : undefined,
      
      // User names with fallbacks
      receivedByName: factureData.receivedByName || 'System User',
      verifiedByName: factureData.verifiedByName || '',
      approvedByName: factureData.approvedByName || '',
      createdByName: factureData.createdByName || 'System User',
      updatedByName: factureData.updatedByName || '',
      
      // Default missing fields
      requiresApproval: factureData.requiresApproval ?? true
    };

    console.log('✅ Enhanced facture data:', {
      id: enhanced.id,
      supplierName: enhanced.supplierName,
      totalAmountDisplay: enhanced.totalAmountDisplay,
      canVerify: enhanced.canVerify,
      canApprove: enhanced.canApprove,
      statusDisplay: enhanced.statusDisplay
    });

    return enhanced;
  }

  private getStatusDisplayFromEnum(status: number): string {
    const statusMap: Record<number, string> = {
      0: 'Received',
      1: 'Under Verification',
      2: 'Verified', 
      3: 'Approved',
      4: 'Paid',
      5: 'Disputed',
      6: 'Cancelled',
      7: 'Partially Paid'
    };
    return statusMap[status] || 'Unknown';
  }

  private getPriorityDisplayFromEnum(priority: number): string {
    const priorityMap: Record<number, string> = {
      0: 'Low',
      1: 'Normal', 
      2: 'High',
      3: 'Urgent'
    };
    return priorityMap[priority] || 'Normal';
  }

  private getVerificationStatusFromEnum(status: number): string {
    if (status >= 2) return 'Verified';
    if (status === 1) return 'In Progress';
    return 'Pending';
  }

  private calculateDaysOverdue(dueDate: Date | string): number {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  private calculateDaysUntilDue(dueDate: Date | string): number {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  private calculatePaymentProgress(totalAmount: number, paidAmount: number): number {
    if (!totalAmount || totalAmount === 0) return 0;
    return Math.round((paidAmount / totalAmount) * 100);
  }

  private calculateIsOverdue(dueDate: Date | string): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  private calculateCanVerify(status: number): boolean {
    return status === 0; // RECEIVED
  }

  private calculateCanApprove(status: number): boolean {
    return status === 2; // VERIFIED
  }

  private calculateCanDispute(status: number): boolean {
    return status >= 0 && status <= 3; // RECEIVED to APPROVED
  }

  private calculateCanCancel(status: number): boolean {
    return status >= 0 && status <= 3; // RECEIVED to APPROVED
  }

  private calculateCanSchedulePayment(status: number, outstandingAmount: number): boolean {
    return status === 3 && (outstandingAmount || 0) > 0; // APPROVED with outstanding
  }

  private calculateCanReceivePayment(status: number, outstandingAmount: number): boolean {
    return status >= 3 && (outstandingAmount || 0) > 0; // APPROVED or PARTIAL_PAID with outstanding
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}