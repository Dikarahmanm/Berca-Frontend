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
  FactureStatus
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
  private readonly baseUrl = `${environment.apiUrl || 'http://localhost:5171/api'}/Facture`;

  // Signal-based state management
  private _factures = signal<FactureListDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly factures = this._factures.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties
  readonly pendingFactures = computed(() => 
    this._factures().filter(f => 
      [FactureStatus.RECEIVED, FactureStatus.VERIFICATION].includes(f.status)
    )
  );

  readonly overdueFactures = computed(() => 
    this._factures().filter(f => f.isOverdue)
  );

  readonly facturesByStatus = computed(() => {
    const factures = this._factures();
    const grouped = new Map<FactureStatus, FactureListDto[]>();

    factures.forEach(facture => {
      if (!grouped.has(facture.status)) {
        grouped.set(facture.status, []);
      }
      grouped.get(facture.status)!.push(facture);
    });

    return grouped;
  });

  // ==================== WORKFLOW OPERATIONS ==================== //

  receiveSupplierInvoice(receiveDto: ReceiveFactureDto): Observable<FactureDto> {
    this._loading.set(true);
    this._error.set(null);

    console.log('🚀 === RECEIVING SUPPLIER INVOICE ===');
    console.log('📊 Request URL:', `${this.baseUrl}/receive`);
    console.log('📋 Request Body:', JSON.stringify(receiveDto, null, 2));
    console.log('📅 Request Body - Date Types:');
    console.log('  - invoiceDate type:', typeof receiveDto.invoiceDate);
    console.log('  - invoiceDate value:', receiveDto.invoiceDate);
    console.log('  - dueDate type:', typeof receiveDto.dueDate);
    console.log('  - dueDate value:', receiveDto.dueDate);
    console.log('  - deliveryDate type:', typeof receiveDto.deliveryDate);
    console.log('  - deliveryDate value:', receiveDto.deliveryDate);
    console.log('🔢 Items count:', receiveDto.items?.length || 0);
    console.log('📦 Items details:', receiveDto.items);

    return this.http.post<any>(`${this.baseUrl}/receive`, receiveDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Facture received:', response);
        console.log('📊 Response type:', typeof response);
        console.log('🔍 Response keys:', response ? Object.keys(response) : 'No keys');
        console.log('✔️ Has success property:', 'success' in (response || {}));
        console.log('✔️ Success value:', response?.success);
        console.log('📦 Has data property:', 'data' in (response || {}));
        console.log('📄 Response structure:', JSON.stringify(response, null, 2));
        this._loading.set(false);
      }),
      map(response => {
        console.log('🔄 Processing response in map operator...');
        
        // If we get here without HTTP error, treat as success
        if (response) {
          console.log('✅ Response successful, returning data');
          return response as FactureDto;
        }
        
        throw new Error('No response received from server');
      }),
      catchError(this.handleError.bind(this))
    );
  }

  verifyFactureItems(id: number, verifyDto: VerifyFactureDto): Observable<FactureDto> {
    this._loading.set(true);
    console.log('🔄 Verifying facture:', id, verifyDto);
    
    return this.http.post<FactureDto>(`${this.baseUrl}/${id}/verify`, verifyDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Facture verified successfully:', response);
        if (response && response.id) {
          // Update local state if facture exists
          this._factures.update(factures => 
            factures.map(f => f.id === id ? this.mapFactureToListDto(response) : f)
          );
        }
        this._loading.set(false);
      }),
      map(response => {
        if (!response || !response.id) {
          throw new Error('Invalid response from verify endpoint');
        }
        return response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  approveFacture(id: number, approvalNotes?: string): Observable<FactureDto> {
    this._loading.set(true);
    console.log('🔄 Approving facture:', id, approvalNotes);
    
    return this.http.post<FactureDto>(`${this.baseUrl}/${id}/approve`, JSON.stringify(approvalNotes || ''), {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      tap(response => {
        console.log('✅ Facture approved successfully:', response);
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
          throw new Error('Invalid response from approve endpoint');
        }
        return response;
      }),
      catchError(this.handleError.bind(this))
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

    console.log('🚀 Starting getFactures request...');
    console.log('📊 Query parameters:', query);
    console.log('🔗 Base URL:', this.baseUrl);
    console.log('🌍 Environment API URL:', environment.apiUrl);

    let params = new HttpParams();
    
    if (query.search) params = params.set('search', query.search);
    if (query.supplierId) params = params.set('supplierId', query.supplierId.toString());
    if (query.branchId) params = params.set('branchId', query.branchId.toString());
    
    // Handle multiple status values
    if (Array.isArray(query.status)) {
      query.status.forEach(status => {
        params = params.append('status', status.toString());
      });
    } else if (query.status !== undefined) {
      params = params.set('status', query.status.toString());
    }
    
    if (query.priority !== undefined) params = params.set('priority', query.priority.toString());
    
    // Date filters
    if (query.invoiceDateFrom) params = params.set('invoiceDateFrom', query.invoiceDateFrom.toISOString());
    if (query.invoiceDateTo) params = params.set('invoiceDateTo', query.invoiceDateTo.toISOString());
    if (query.dueDateFrom) params = params.set('dueDateFrom', query.dueDateFrom.toISOString());
    if (query.dueDateTo) params = params.set('dueDateTo', query.dueDateTo.toISOString());
    if (query.receivedDateFrom) params = params.set('receivedDateFrom', query.receivedDateFrom.toISOString());
    if (query.receivedDateTo) params = params.set('receivedDateTo', query.receivedDateTo.toISOString());
    
    // Amount filters
    if (query.minAmount) params = params.set('minAmount', query.minAmount.toString());
    if (query.maxAmount) params = params.set('maxAmount', query.maxAmount.toString());
    
    // Status filters
    if (query.isOverdue !== undefined) params = params.set('isOverdue', query.isOverdue.toString());
    if (query.isPaid !== undefined) params = params.set('isPaid', query.isPaid.toString());
    if (query.hasDispute !== undefined) params = params.set('hasDispute', query.hasDispute.toString());
    
    // Pagination
    params = params.set('page', query.page.toString());
    params = params.set('pageSize', Math.min(query.pageSize, 100).toString());
    params = params.set('sortBy', query.sortBy);
    params = params.set('sortOrder', query.sortOrder);

    const fullUrl = `${this.baseUrl}?${params.toString()}`;
    console.log('📡 Making HTTP GET request to:', fullUrl);
    console.log('🔑 With credentials: true');
    console.log('📋 Final params:', params.toString());

    return this.http.get<ApiResponse<FacturePagedResponseDto>>(this.baseUrl, {
      params,
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Raw response received:', response);
        console.log('✅ Response type:', typeof response);
        console.log('✅ Response has success property:', 'success' in (response || {}));
        console.log('✅ Response.success value:', response?.success);
        console.log('✅ Response.data exists:', !!response?.data);
        
        if (response && typeof response === 'object' && 'success' in response && response.success && response.data) {
          console.log('✅ Setting factures data:', response.data.factures);
          this._factures.set(response.data.factures);
        } else {
          console.warn('⚠️ Response format unexpected:', response);
        }
        this._loading.set(false);
      }),
      map(response => {
        console.log('🔄 Mapping response:', response);
        
        // Handle both wrapped and direct responses
        if (response && typeof response === 'object' && 'success' in response) {
          // This is the expected ApiResponse<T> format
          if (!response.success) {
            throw new Error(response.message || 'API returned unsuccessful response');
          }
          return response.data;
        } else if (response && typeof response === 'object' && 'factures' in response) {
          // This might be a direct FacturePagedResponseDto without wrapper
          console.log('📦 Response appears to be direct data without ApiResponse wrapper');
          return response as FacturePagedResponseDto;
        } else {
          console.error('❌ Unexpected response format:', response);
          throw new Error('Failed to fetch factures: Unexpected response format');
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getFactureById(id: number): Observable<FactureDto> {
    console.log('🚀 Fetching facture by ID:', id);
    console.log('🚀 API URL:', `${this.baseUrl}/${id}`);
    
    return this.http.get<FactureDto>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Raw API response:', response);
        console.log('✅ Response type:', typeof response);
        console.log('✅ Response has id:', response?.id);
        console.log('✅ Response supplier name:', response?.supplierName);
      }),
      map(response => {
        // Direct response - no wrapper expected
        if (!response || !response.id) {
          throw new Error('Invalid facture data received from server');
        }
        return response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getFactureBySupplierInvoiceNumber(
    supplierInvoiceNumber: string, 
    supplierId: number
  ): Observable<FactureDto> {
    let params = new HttpParams().set('supplierId', supplierId.toString());
    
    return this.http.get<ApiResponse<FactureDto>>(
      `${this.baseUrl}/supplier-invoice/${supplierInvoiceNumber}`, 
      {
        params,
        withCredentials: true
      }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch facture by supplier invoice number');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  updateFacture(id: number, updateDto: UpdateFactureDto): Observable<FactureDto> {
    this._loading.set(true);
    
    return this.http.put<ApiResponse<FactureDto>>(`${this.baseUrl}/${id}`, updateDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Facture updated:', response);
        if (response.success && response.data) {
          // Update local state
          this._factures.update(factures => 
            factures.map(f => f.id === id ? this.mapFactureToListDto(response.data) : f)
          );
        }
        this._loading.set(false);
      }),
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to update facture');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
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
    console.log('✅ Confirming payment:', confirmDto);
    
    return this.http.post<FacturePaymentDto>(`${this.baseUrl}/payments/${confirmDto.paymentId}/confirm`, confirmDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Payment confirmed successfully:', response);
        this._loading.set(false);
      }),
      catchError(this.handleError.bind(this))
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
}