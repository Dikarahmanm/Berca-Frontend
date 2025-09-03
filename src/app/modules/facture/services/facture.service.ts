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
  FacturePriority,
  FactureItemDetailDto
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
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
        } else {
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
    
    return this.http.post<any>(`${this.baseUrl}/${id}/verify`, verifyDto, {
      withCredentials: true
    }).pipe(
      map(response => {
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
        } else {
          throw new Error('Failed to verify facture');
        }

        if (!factureData || !factureData.id) {
          throw new Error('Invalid verified facture data structure');
        }

        return factureData;
      }),
      tap(factureData => {
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
    
    return this.http.post<any>(`${this.baseUrl}/${id}/approve`, JSON.stringify(approvalNotes || ''), {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
        } else {
          throw new Error('Failed to approve facture');
        }

        if (!factureData || !factureData.id) {
          throw new Error('Invalid approved facture data structure');
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

  disputeFacture(id: number, disputeDto: DisputeFactureDto): Observable<FactureDto> {
    this._loading.set(true);
    
    return this.http.post<FactureDto>(`${this.baseUrl}/${id}/dispute`, disputeDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
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
    
    return this.http.post(`${this.baseUrl}/${id}/cancel`, JSON.stringify(cancellationReason || ''), {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'text'
    }).pipe(
      tap(response => {
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


    // Try both wrapped and direct response formats
    return this.http.get<any>(this.baseUrl, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('🔍 RAW FACTURE RESPONSE:', response);
        
        let facturesArray: any[] = [];
        
        // Handle different response formats
        if (Array.isArray(response)) {
          // Direct array response
          facturesArray = response;
          console.log('✅ Direct array response with', facturesArray.length, 'factures');
        } else if (response && typeof response === 'object') {
          // Check for various wrapper formats
          if (response.success && response.data) {
            facturesArray = Array.isArray(response.data) ? response.data : [];
            console.log('✅ Wrapped success response with', facturesArray.length, 'factures');
          } else if (response.data && Array.isArray(response.data)) {
            facturesArray = response.data;
            console.log('✅ Data wrapper response with', facturesArray.length, 'factures');
          } else if (response.factures && Array.isArray(response.factures)) {
            facturesArray = response.factures;
            console.log('✅ Factures property response with', facturesArray.length, 'factures');
          } else {
            console.warn('⚠️ Unknown response format:', Object.keys(response));
            facturesArray = [];
          }
        } else {
          console.warn('⚠️ Unexpected response type:', typeof response);
          facturesArray = [];
        }

        // Sample first item for debugging
        if (facturesArray.length > 0) {
          console.log('🔍 SAMPLE FACTURE ITEM:', facturesArray[0]);
        }

        // Enhance facture data to ensure proper mapping
        const enhancedFactures: FactureListDto[] = this.enhanceFactureListData(facturesArray);

        // Calculate statistics from the enhanced factures
        const totalAmount = enhancedFactures.reduce((sum, f) => sum + f.totalAmount, 0);
        const totalPaidAmount = enhancedFactures.reduce((sum, f) => sum + f.paidAmount, 0);
        const totalOutstanding = enhancedFactures.reduce((sum, f) => sum + f.remainingAmount, 0);
        const overdueFactures = enhancedFactures.filter(f => f.isOverdue);
        
        console.log('📊 CALCULATED STATS:', { 
          totalFactures: enhancedFactures.length,
          totalAmount,
          totalPaidAmount,
          totalOutstanding,
          overdueCount: overdueFactures.length
        });
        
        // Create proper paged response structure
        const processedResponse: FacturePagedResponseDto = {
          factures: enhancedFactures,
          totalCount: enhancedFactures.length,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.ceil(enhancedFactures.length / query.pageSize),
          hasNextPage: enhancedFactures.length > (query.page * query.pageSize),
          hasPreviousPage: query.page > 1,
          totalAmount,
          totalPaidAmount,
          totalOutstanding,
          overdueCount: overdueFactures.length,
          overdueAmount: overdueFactures.reduce((sum, f) => sum + f.remainingAmount, 0)
        };

        return processedResponse;
      }),
      tap(processedResponse => {
        // Update signal state after processing
        this._factures.set(processedResponse.factures);
        this._loading.set(false);
      }),
      catchError(error => {
        
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
        
        let factureData: any;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
        } else {
          throw new Error('Invalid facture data received from server');
        }

        if (!factureData || !factureData.id) {
          throw new Error('Invalid facture data structure');
        }

        // Debug log before enhancement
        console.log('🔍 RAW FACTURE DATA FROM API:', factureData);
        
        // Enhance facture data with computed fields and fallbacks
        const enhancedFactureData = this.enhanceFactureData(factureData);
        console.log('🔍 ENHANCED FACTURE DATA RESULT:', enhancedFactureData);
        
        return enhancedFactureData;
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
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
        } else {
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
        
        let factureData: FactureDto;
        
        // Handle different response formats
        if (response && response.id) {
          // Direct FactureDto response
          factureData = response;
        } else if (response && response.success && response.data) {
          // Wrapped response
          factureData = response.data;
        } else if (response && response.data && response.data.id) {
          // Alternative wrapper format
          factureData = response.data;
        } else {
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
    
    return this.http.get<any>(this.baseUrl, {
      withCredentials: true
    }).pipe(
      tap(response => {
      }),
      catchError(error => {
        console.log('❌ TEST CONNECTION ERROR:', {
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
  // ==================== DATA ENHANCEMENT METHODS ==================== //

  private enhanceFactureListData(rawFactures: any[]): FactureListDto[] {
    console.log('🔧 ENHANCING FACTURE LIST DATA:', rawFactures?.length || 0, 'items');
    
    if (!rawFactures || !Array.isArray(rawFactures)) {
      console.warn('⚠️ Invalid factures array provided');
      return [];
    }

    const enhanced = rawFactures.map((facture, index) => {
      console.log(`🔍 Processing facture ${index + 1}:`, {
        id: facture.id,
        supplierName: facture.supplierName,
        companyName: facture.companyName,
        supplier: facture.supplier,
        status: facture.status,
        statusDisplay: facture.statusDisplay
      });

      // Enhanced supplier name mapping
      let supplierName = 'Unknown Supplier';
      if (facture.supplierName) {
        supplierName = facture.supplierName;
      } else if (facture.companyName) {
        supplierName = facture.companyName;
      } else if (facture.supplier?.companyName) {
        supplierName = facture.supplier.companyName;
      } else if (facture.supplier?.name) {
        supplierName = facture.supplier.name;
      } else if (facture.supplierCode) {
        supplierName = facture.supplierCode;
      }

      // Enhanced status mapping
      let status: FactureStatus;
      if (typeof facture.status === 'number') {
        status = facture.status as FactureStatus;
      } else if (typeof facture.status === 'string') {
        // Try to parse string status
        const statusNum = parseInt(facture.status);
        if (!isNaN(statusNum)) {
          status = statusNum as FactureStatus;
        } else {
          // Default to RECEIVED if we can't parse
          status = FactureStatus.RECEIVED;
        }
      } else {
        status = FactureStatus.RECEIVED;
      }

      // Enhanced priority mapping  
      let priority: FacturePriority;
      if (typeof facture.priority === 'number') {
        priority = facture.priority as FacturePriority;
      } else if (typeof facture.paymentPriority === 'number') {
        priority = facture.paymentPriority as FacturePriority;
      } else {
        priority = FacturePriority.NORMAL;
      }

      // Date parsing with error handling
      const parseDate = (dateValue: any): Date => {
        if (!dateValue) return new Date();
        try {
          return new Date(dateValue);
        } catch {
          return new Date();
        }
      };

      const invoiceDate = parseDate(facture.invoiceDate);
      const dueDate = parseDate(facture.dueDate);
      const receivedAt = parseDate(facture.receivedAt || facture.createdAt);

      // Calculate remaining amount
      const totalAmount = facture.totalAmount || 0;
      const paidAmount = facture.paidAmount || 0;
      const remainingAmount = facture.remainingAmount || facture.outstandingAmount || (totalAmount - paidAmount);

      // Calculate days until due
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDateCopy = new Date(dueDate);
      dueDateCopy.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDateCopy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const enhanced: FactureListDto = {
        id: facture.id || 0,
        supplierName,
        supplierInvoiceNumber: facture.supplierInvoiceNumber || 'N/A',
        internalReferenceNumber: facture.internalReferenceNumber || `REF-${facture.id}`,
        totalAmount,
        paidAmount,
        remainingAmount,
        invoiceDate,
        dueDate,
        status,
        priority,
        isOverdue: daysUntilDue < 0,
        daysUntilDue: Math.max(0, daysUntilDue),
        receivedAt,
        receivedBy: facture.receivedByName || facture.receivedBy || 'System',
        branchName: facture.branchName || facture.branchDisplay || 'Main Branch'
      };

      console.log(`✅ Enhanced facture ${index + 1}:`, {
        id: enhanced.id,
        supplierName: enhanced.supplierName,
        status: enhanced.status,
        totalAmount: enhanced.totalAmount,
        isOverdue: enhanced.isOverdue
      });

      return enhanced;
    });

    console.log('✅ FACTURE DATA ENHANCEMENT COMPLETE:', enhanced.length, 'factures processed');
    return enhanced;
  }

  private enhancePaymentsData(rawPayments: any[]): FacturePaymentDto[] {
    console.log('🔧 ENHANCING PAYMENTS DATA:', rawPayments?.length || 0, 'payments');
    
    if (!rawPayments || !Array.isArray(rawPayments)) {
      console.warn('⚠️ Invalid payments array provided');
      return [];
    }

    const enhanced = rawPayments.map((payment, index) => {
      console.log(`🔍 Processing payment ${index + 1}:`, {
        id: payment.id,
        status: payment.status,
        statusDisplay: payment.statusDisplay,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        canProcess: payment.canProcess,
        canConfirm: payment.canConfirm
      });

      // Enhanced date parsing
      const parseDate = (dateValue: any): Date | undefined => {
        if (!dateValue) return undefined;
        try {
          return new Date(dateValue);
        } catch {
          return undefined;
        }
      };

      // Payment status mapping with fallbacks
      let status: number;
      if (typeof payment.status === 'number') {
        status = payment.status;
      } else if (typeof payment.status === 'string') {
        const statusNum = parseInt(payment.status);
        status = isNaN(statusNum) ? 0 : statusNum; // Default to SCHEDULED
      } else {
        status = 0; // Default to SCHEDULED
      }

      // Payment method mapping with fallbacks
      let paymentMethod: number;
      if (typeof payment.paymentMethod === 'number') {
        paymentMethod = payment.paymentMethod;
      } else if (typeof payment.paymentMethod === 'string') {
        const methodNum = parseInt(payment.paymentMethod);
        paymentMethod = isNaN(methodNum) ? 0 : methodNum; // Default to BANK_TRANSFER
      } else {
        paymentMethod = 0; // Default to BANK_TRANSFER
      }

      // Enhanced action flags with fallback logic based on status
      const enhancedPayment: FacturePaymentDto = {
        id: payment.id || 0,
        factureId: payment.factureId || 0,
        paymentDate: parseDate(payment.paymentDate) || new Date(),
        amount: payment.amount || 0,
        paymentMethod,
        paymentMethodDisplay: payment.paymentMethodDisplay || this.getPaymentMethodDisplay(paymentMethod),
        status,
        statusDisplay: payment.statusDisplay || this.getPaymentStatusDisplay(status),
        
        // Reference fields with fallbacks
        ourPaymentReference: payment.ourPaymentReference || '',
        supplierAckReference: payment.supplierAckReference || '',
        bankAccount: payment.bankAccount || '',
        checkNumber: payment.checkNumber || '',
        transferReference: payment.transferReference || '',
        paymentReference: payment.paymentReference || '',
        
        // User and date fields
        processedBy: payment.processedBy,
        processedByName: payment.processedByName || '',
        approvedBy: payment.approvedBy,
        approvedByName: payment.approvedByName || '',
        approvedAt: parseDate(payment.approvedAt),
        confirmedAt: parseDate(payment.confirmedAt),
        confirmedByName: payment.confirmedByName || '',
        
        // Notes and files
        notes: payment.notes || '',
        failureReason: payment.failureReason || '',
        disputeReason: payment.disputeReason || '',
        paymentReceiptFile: payment.paymentReceiptFile || '',
        confirmationFile: payment.confirmationFile || '',
        
        // Scheduled payment fields
        scheduledDate: parseDate(payment.scheduledDate),
        
        // Computed boolean fields
        requiresApproval: payment.requiresApproval || false,
        isOverdue: payment.isOverdue || false,
        isDueToday: payment.isDueToday || false,
        isDueSoon: payment.isDueSoon || false,
        hasConfirmation: payment.hasConfirmation || false,
        
        // Computed numeric fields
        daysOverdue: payment.daysOverdue || 0,
        daysUntilPayment: payment.daysUntilPayment || 0,
        
        // Status and processing
        processingStatus: payment.processingStatus || 'Pending',
        
        // Display fields
        amountDisplay: payment.amountDisplay || this.formatCurrency(payment.amount || 0),
        
        // Action flags - use backend values if available, otherwise calculate based on status
        canEdit: payment.canEdit !== undefined ? payment.canEdit : this.calculateCanEditPayment(status),
        canProcess: payment.canProcess !== undefined ? payment.canProcess : this.calculateCanProcessPayment(status),
        canConfirm: payment.canConfirm !== undefined ? payment.canConfirm : this.calculateCanConfirmPayment(status),
        canCancel: payment.canCancel !== undefined ? payment.canCancel : this.calculateCanCancelPayment(status),
        
        // Audit fields
        createdAt: parseDate(payment.createdAt) || new Date(),
        updatedAt: parseDate(payment.updatedAt) || new Date()
      };

      console.log(`✅ Enhanced payment ${index + 1}:`, {
        id: enhancedPayment.id,
        status: enhancedPayment.status,
        statusDisplay: enhancedPayment.statusDisplay,
        canProcess: enhancedPayment.canProcess,
        canConfirm: enhancedPayment.canConfirm,
        canEdit: enhancedPayment.canEdit,
        canCancel: enhancedPayment.canCancel
      });

      return enhancedPayment;
    });

    console.log('✅ PAYMENT DATA ENHANCEMENT COMPLETE:', enhanced.length, 'payments processed');
    return enhanced;
  }

  private getPaymentMethodDisplay(method: number): string {
    const methodLabels: Record<number, string> = {
      0: 'Bank Transfer',
      1: 'Check',
      2: 'Cash',
      3: 'Credit Card',
      4: 'Digital Wallet'
    };
    return methodLabels[method] || 'Unknown';
  }

  private getPaymentStatusDisplay(status: number): string {
    const statusLabels: Record<number, string> = {
      0: 'Scheduled',
      1: 'Pending',
      2: 'Processing',
      3: 'Completed',
      4: 'Failed',
      5: 'Cancelled',
      6: 'Disputed'
    };
    return statusLabels[status] || 'Unknown';
  }

  // Payment action calculation methods
  private calculateCanEditPayment(status: number): boolean {
    // Can edit if SCHEDULED (0) or PENDING (1)
    return status === 0 || status === 1;
  }

  private calculateCanProcessPayment(status: number): boolean {
    // Can process if SCHEDULED (0)
    return status === 0;
  }

  private calculateCanConfirmPayment(status: number): boolean {
    // Can confirm if PROCESSING (2)
    return status === 2;
  }

  private calculateCanCancelPayment(status: number): boolean {
    // Can cancel if SCHEDULED (0) or PENDING (1)
    return status === 0 || status === 1;
  }

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
    
    return this.http.post<FacturePaymentDto>(`${this.baseUrl}/${scheduleDto.factureId}/payments/schedule`, scheduleDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        // Update local state if needed
        this._loading.set(false);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  processPayment(processDto: ProcessPaymentDto): Observable<FacturePaymentDto> {
    this._loading.set(true);
    
    return this.http.post<FacturePaymentDto>(`${this.baseUrl}/payments/${processDto.paymentId}/process`, processDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        this._loading.set(false);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  confirmPayment(confirmDto: ConfirmPaymentDto): Observable<FacturePaymentDto> {
    this._loading.set(true);
    const apiUrl = `${this.baseUrl}/payments/${confirmDto.paymentId}/confirm`;
    
    return this.http.post<FacturePaymentDto>(apiUrl, confirmDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        return this.handleError(error);
      })
    );
  }

  cancelPayment(cancelDto: CancelPaymentDto): Observable<boolean> {
    this._loading.set(true);
    
    return this.http.post(`${this.baseUrl}/payments/${cancelDto.paymentId}/cancel`, cancelDto, {
      withCredentials: true,
      responseType: 'text'
    }).pipe(
      tap(response => {
        this._loading.set(false);
      }),
      map(() => true),
      catchError(this.handleError.bind(this))
    );
  }

  getFacturePayments(factureId: number): Observable<FacturePaymentDto[]> {
    this._loading.set(true);
    
    return this.http.get<FacturePaymentDto[]>(`${this.baseUrl}/${factureId}/payments`, {
      withCredentials: true
    }).pipe(
      tap(response => {
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

  // Error handler
  private handleError(error: any): Observable<never> {
    // If it's a 400 error, log detailed validation information
    if (error?.status === 400 && error?.error) {
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

    // Create enhanced facture with fallbacks
    const enhanced: FactureDto = {
      ...factureData,
      
      // Basic fallbacks with multiple property name attempts (prioritize supplier.companyName)
      supplierName: factureData.supplier?.companyName || factureData.supplierName || factureData.supplier?.name || factureData.supplier_name || factureData.SupplierName || factureData.supplierCompanyName || factureData.company_name || factureData.CompanyName || 'Unknown Supplier',
      supplierCode: factureData.supplierCode || factureData.supplier?.code || factureData.supplier_code || factureData.SupplierCode || 'N/A', 
      branchName: factureData.branchName || factureData.branch?.name || factureData.branch_name || factureData.BranchName || 'Main Branch',
      branchDisplay: factureData.branchDisplay || factureData.branchName || factureData.branch_name || 'Main Branch',
      
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
      canSchedulePayment: factureData.canSchedulePayment ?? this.calculateCanSchedulePayment(factureData.status, factureData.outstandingAmount || (factureData.totalAmount - factureData.paidAmount)),
      canReceivePayment: factureData.canReceivePayment ?? this.calculateCanReceivePayment(factureData.status, factureData.outstandingAmount || (factureData.totalAmount - factureData.paidAmount)),
      
      // Ensure arrays exist with enhanced mapping
      items: this.enhanceItemsData(factureData.items || []),
      payments: this.enhancePaymentsData(factureData.payments || []),
      
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

    return enhanced;
  }

  private getStatusDisplayFromEnum(status: any): string {
    
    // Handle string status
    if (typeof status === 'string') {
      const stringStatusMap: Record<string, string> = {
        'Received': 'Received',
        'Verification': 'Under Verification',
        'Verified': 'Verified',
        'Approved': 'Approved', 
        'Paid': 'Paid',
        'Disputed': 'Disputed',
        'Cancelled': 'Cancelled',
        'PartialPaid': 'Partially Paid',
        'Partial_Paid': 'Partially Paid'
      };
      return stringStatusMap[status] || status; // Return original string if not found
    }
    
    // Handle numeric status
    const statusNum = parseInt(String(status));
    const numericStatusMap: Record<number, string> = {
      0: 'Received',
      1: 'Under Verification', 
      2: 'Verified',
      3: 'Approved',
      4: 'Paid',
      5: 'Disputed',
      6: 'Cancelled',
      7: 'Partially Paid'
    };
    return numericStatusMap[statusNum] || 'Unknown';
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

  private calculateCanVerify(status: any): boolean {
    // More flexible verification logic - allow verify if received
    
    let canVerify = false;
    
    if (typeof status === 'string') {
      canVerify = status.toLowerCase() === 'received';
    } else {
      const statusNum = parseInt(String(status));
      canVerify = statusNum === 0 || status === FactureStatus.RECEIVED;
    }
    
    return canVerify;
  }

  private calculateCanApprove(status: any): boolean {
    // More flexible approval logic - allow approve if verified
    
    let canApprove = false;
    
    if (typeof status === 'string') {
      canApprove = status.toLowerCase() === 'verified';
    } else {
      const statusNum = parseInt(String(status));
      canApprove = statusNum === 2 || status === FactureStatus.VERIFIED;
    }
    
    return canApprove;
  }

  private calculateCanDispute(status: any): boolean {
    if (typeof status === 'string') {
      const disputeableStatuses = ['received', 'verification', 'verified', 'approved'];
      return disputeableStatuses.includes(status.toLowerCase());
    }
    const statusNum = parseInt(String(status));
    return statusNum >= 0 && statusNum <= 3; // RECEIVED to APPROVED
  }

  private calculateCanCancel(status: any): boolean {
    if (typeof status === 'string') {
      const cancellableStatuses = ['received', 'verification', 'verified', 'approved'];
      return cancellableStatuses.includes(status.toLowerCase());
    }
    const statusNum = parseInt(String(status));
    return statusNum >= 0 && statusNum <= 3; // RECEIVED to APPROVED
  }

  private calculateCanSchedulePayment(status: any, outstandingAmount: number): boolean {
    let isApproved = false;
    if (typeof status === 'string') {
      isApproved = status.toLowerCase() === 'approved';
    } else {
      const statusNum = parseInt(String(status));
      isApproved = statusNum === 3;
    }
    return isApproved && (outstandingAmount || 0) > 0; // APPROVED with outstanding
  }

  private calculateCanReceivePayment(status: any, outstandingAmount: number): boolean {
    let isPayable = false;
    if (typeof status === 'string') {
      const payableStatuses = ['approved', 'partialpaid', 'partial_paid'];
      isPayable = payableStatuses.includes(status.toLowerCase());
    } else {
      const statusNum = parseInt(String(status));
      isPayable = statusNum >= 3; // APPROVED or PARTIAL_PAID
    }
    return isPayable && (outstandingAmount || 0) > 0;
  }

  /**
   * Enhance items data to match FactureItemDetailDto interface
   */
  private enhanceItemsData(items: any[]): FactureItemDetailDto[] {
    console.log('🔧 ENHANCING ITEMS DATA:', items);
    if (!items || !Array.isArray(items)) {
      console.log('❌ Items is null or not array');
      return [];
    }

    console.log('✅ Processing items, count:', items.length);
    const enhanced = items.map(item => {
      console.log('📝 Processing item:', item);
      return {
      id: item.id,
      factureId: item.factureId || 0,
      productId: item.product?.id || item.productId,
      productName: item.product?.name || item.productName || 'Unknown Product',
      productBarcode: item.product?.barcode || item.productBarcode || '',
      supplierItemCode: item.supplierItemCode || '',
      supplierItemDescription: item.supplierItemDescription || item.product?.name || item.productName || '',
      itemDescription: item.itemDescription || item.product?.name || item.productName || '',
      itemCode: item.itemCode || item.product?.barcode || '',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      receivedQuantity: item.receivedQuantity || item.quantity || 0,
      acceptedQuantity: item.acceptedQuantity || item.quantity || 0,
      taxRate: item.taxRate || 0,
      discountAmount: item.discountAmount || 0,
      lineTotal: item.totalPrice || (item.quantity * item.unitPrice) || 0,
      taxAmount: item.taxAmount || 0,
      lineTotalWithTax: item.lineTotalWithTax || item.totalPrice || (item.quantity * item.unitPrice) || 0,
      notes: item.notes || '',
      verificationNotes: item.verificationNotes || '',
      isVerified: item.isVerified || false,
      verifiedAt: item.verifiedAt ? new Date(item.verifiedAt) : undefined,
      verifiedByName: item.verifiedByName || '',
      isProductMapped: item.isProductMapped ?? (item.product?.id ? true : false),
      hasQuantityVariance: item.hasQuantityVariance || false,
      hasAcceptanceVariance: item.hasAcceptanceVariance || false,
      verificationStatus: item.verificationStatus || (item.isVerified ? 'Verified' : 'Pending'),
      quantityVariance: item.quantityVariance || 0,
      acceptanceVariance: item.acceptanceVariance || 0,
      unitDisplay: this.formatCurrency(item.unitPrice || 0),
      unitPriceDisplay: this.formatCurrency(item.unitPrice || 0),
      lineTotalDisplay: this.formatCurrency(item.totalPrice || (item.quantity * item.unitPrice) || 0),
      lineTotalWithTaxDisplay: this.formatCurrency(item.lineTotalWithTax || item.totalPrice || (item.quantity * item.unitPrice) || 0),
      requiresApproval: item.requiresApproval || false,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
      };
    });
    
    console.log('✅ ENHANCED ITEMS RESULT:', enhanced);
    return enhanced;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}