import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environment/environment';
import {
  SupplierDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierStatusDto,
  SupplierQueryDto,
  SupplierPagedResponseDto,
  SupplierSummaryDto,
  SupplierStatsDto,
  SupplierAlertDto,
  SupplierRankingDto,
  SupplierBranchStatsDto
} from '../interfaces/supplier.interfaces';

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
export class SupplierService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/Supplier'; // Will be proxied to localhost:5171

  // Signal-based state management
  private _suppliers = signal<SupplierDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly suppliers = this._suppliers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties
  readonly activeSuppliers = computed(() => 
    this._suppliers().filter(s => s.isActive)
  );

  readonly suppliersByBranch = computed(() => {
    const suppliers = this._suppliers();
    const grouped = new Map<number | string, SupplierDto[]>();

    suppliers.forEach(supplier => {
      const branchKey = supplier.branchId || 'all-branches';
      if (!grouped.has(branchKey)) {
        grouped.set(branchKey, []);
      }
      grouped.get(branchKey)!.push(supplier);
    });

    return grouped;
  });

  // ==================== CRUD OPERATIONS ==================== //

  getSuppliers(query: SupplierQueryDto): Observable<SupplierPagedResponseDto> {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    
    if (query.search) params = params.set('search', query.search);
    if (query.branchId) params = params.set('branchId', query.branchId.toString());
    if (query.isActive !== undefined) params = params.set('isActive', query.isActive.toString());
    if (query.minPaymentTerms) params = params.set('minPaymentTerms', query.minPaymentTerms.toString());
    if (query.maxPaymentTerms) params = params.set('maxPaymentTerms', query.maxPaymentTerms.toString());
    if (query.minCreditLimit) params = params.set('minCreditLimit', query.minCreditLimit.toString());
    if (query.maxCreditLimit) params = params.set('maxCreditLimit', query.maxCreditLimit.toString());
    
    params = params.set('page', query.page.toString());
    params = params.set('pageSize', Math.min(query.pageSize, 100).toString());
    params = params.set('sortBy', query.sortBy);
    params = params.set('sortOrder', query.sortOrder);

    console.log('🔍 Supplier request params:', params.toString());

    // Backend returns direct array, not wrapped in ApiResponse for GET operation
    return this.http.get<SupplierDto[]>(this.baseUrl, {
      params,
      withCredentials: true
    }).pipe(
      tap(suppliersArray => {
        console.log('📊 Raw suppliers response:', suppliersArray?.length || 0, 'items');
        
        if (Array.isArray(suppliersArray)) {
          console.log('✅ Setting suppliers data:', suppliersArray.length, 'suppliers');
          this._suppliers.set(suppliersArray);
        } else {
          console.warn('⚠️ Expected array but got:', typeof suppliersArray);
          this._suppliers.set([]);
        }
        
        this._loading.set(false);
      }),
      map(suppliersArray => {
        if (!Array.isArray(suppliersArray)) {
          console.warn('⚠️ Backend returned non-array response, treating as empty');
          suppliersArray = [];
        }

        // Create proper paged response structure
        const response: SupplierPagedResponseDto = {
          suppliers: suppliersArray,
          totalCount: suppliersArray.length,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.ceil(suppliersArray.length / query.pageSize),
          hasNextPage: suppliersArray.length > (query.page * query.pageSize),
          hasPreviousPage: query.page > 1
        };

        console.log('✅ Processed suppliers response:', {
          totalSuppliers: response.suppliers.length,
          page: response.page,
          totalPages: response.totalPages
        });

        return response;
      }),
      catchError(error => {
        console.error('❌ Error fetching suppliers:', error);
        
        // Only show error if it's not a connection issue
        if (error.status !== 0 && error.status !== 404 && error.status !== 500) {
          return this.handleError(error);
        }
        
        console.warn('🔌 Backend not available, returning empty response');
        this._loading.set(false);
        
        const emptyResponse: SupplierPagedResponseDto = {
          suppliers: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        };
        
        return new Observable<SupplierPagedResponseDto>(observer => {
          observer.next(emptyResponse);
          observer.complete();
        });
      })
    );
  }

  getSupplierById(id: number): Observable<SupplierDto> {
    return this.http.get<ApiResponse<SupplierDto>>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch supplier');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getSupplierByCode(code: string): Observable<SupplierDto> {
    return this.http.get<ApiResponse<SupplierDto>>(`${this.baseUrl}/code/${code}`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch supplier by code');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  createSupplier(supplier: CreateSupplierDto): Observable<SupplierDto> {
    this._loading.set(true);
    
    return this.http.post<ApiResponse<SupplierDto>>(this.baseUrl, supplier, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Supplier created:', response);
        if (response.success && response.data) {
          this._suppliers.update(suppliers => [...suppliers, response.data]);
        }
        this._loading.set(false);
      }),
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to create supplier');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  updateSupplier(id: number, supplier: UpdateSupplierDto): Observable<SupplierDto> {
    this._loading.set(true);
    
    return this.http.put<ApiResponse<SupplierDto>>(`${this.baseUrl}/${id}`, supplier, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Supplier updated:', response);
        if (response.success && response.data) {
          this._suppliers.update(suppliers => 
            suppliers.map(s => s.id === id ? response.data : s)
          );
        }
        this._loading.set(false);
      }),
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to update supplier');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  deleteSupplier(id: number, reason?: string): Observable<boolean> {
    let params = new HttpParams();
    if (reason) params = params.set('reason', reason);
    
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, {
      params,
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Supplier deleted:', response);
        if (response.success) {
          this._suppliers.update(suppliers => 
            suppliers.filter(s => s.id !== id)
          );
        }
      }),
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to delete supplier');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  toggleSupplierStatus(id: number, statusDto: SupplierStatusDto): Observable<SupplierDto> {
    return this.http.patch<ApiResponse<SupplierDto>>(`${this.baseUrl}/${id}/status`, statusDto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Supplier status updated:', response);
        if (response.success && response.data) {
          this._suppliers.update(suppliers => 
            suppliers.map(s => s.id === id ? response.data : s)
          );
        }
      }),
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to update supplier status');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ==================== BRANCH-SPECIFIC OPERATIONS ==================== //

  getSuppliersByBranch(
    branchId: number, 
    includeAll: boolean = true, 
    activeOnly: boolean = true
  ): Observable<SupplierSummaryDto[]> {
    let params = new HttpParams()
      .set('includeAll', includeAll.toString())
      .set('activeOnly', activeOnly.toString());

    return this.http.get<ApiResponse<SupplierSummaryDto[]>>(`${this.baseUrl}/branch/${branchId}`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch suppliers by branch');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getSuppliersByPaymentTerms(
    minDays: number = 1,
    maxDays: number = 365,
    branchId?: number
  ): Observable<SupplierSummaryDto[]> {
    let params = new HttpParams()
      .set('minDays', minDays.toString())
      .set('maxDays', maxDays.toString());
    
    if (branchId) params = params.set('branchId', branchId.toString());

    return this.http.get<ApiResponse<SupplierSummaryDto[]>>(`${this.baseUrl}/payment-terms`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch suppliers by payment terms');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getSuppliersByCreditLimit(
    minCreditLimit: number,
    branchId?: number
  ): Observable<SupplierSummaryDto[]> {
    let params = new HttpParams()
      .set('minCreditLimit', minCreditLimit.toString());
    
    if (branchId) params = params.set('branchId', branchId.toString());

    return this.http.get<ApiResponse<SupplierSummaryDto[]>>(`${this.baseUrl}/credit-limit`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch suppliers by credit limit');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ==================== VALIDATION OPERATIONS ==================== //

  validateSupplierCode(code: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams();
    if (excludeId) params = params.set('excludeId', excludeId.toString());
    
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/validate/code/${code}`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to validate supplier code');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  validateCompanyName(name: string, branchId?: number, excludeId?: number): Observable<boolean> {
    let params = new HttpParams().set('name', name);
    if (branchId) params = params.set('branchId', branchId.toString());
    if (excludeId) params = params.set('excludeId', excludeId.toString());
    
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/validate/company`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to validate company name');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  validateEmail(email: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams().set('email', email);
    if (excludeId) params = params.set('excludeId', excludeId.toString());
    
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/validate/email`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to validate email');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ==================== ANALYTICS & UTILITIES ==================== //

  getSupplierStats(branchId?: number): Observable<SupplierStatsDto> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    
    // Ensure suppliers are loaded first, then get analytics
    const suppliersObservable = this._suppliers().length > 0 
      ? new Observable<SupplierDto[]>(observer => {
          observer.next(this._suppliers());
          observer.complete();
        })
      : this.getSuppliers({
          search: '',
          branchId: branchId || undefined,
          isActive: undefined,
          minCreditLimit: undefined,
          maxCreditLimit: undefined,
          page: 1,
          pageSize: 100,
          sortBy: 'companyName',
          sortOrder: 'asc'
        }).pipe(map(response => response.suppliers));
    
    return suppliersObservable.pipe(
      switchMap(() => {
        // Try the analytics endpoint first (which returns more complete data)
        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics`, {
          params,
          withCredentials: true
        });
      }),
      map((response: any) => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch supplier analytics');
        }
        
        console.log('📊 Raw analytics response received:', response.data);
        
        // Map the analytics response to SupplierStatsDto format and fill in missing supplier names
        const analyticsData = response.data;
        const suppliers = this._suppliers();
        
        // Create a map of supplier IDs to names for quick lookup
        const supplierNameMap = new Map<number, string>();
        suppliers.forEach(s => supplierNameMap.set(s.id, s.companyName || s.supplierCode));
        
        // Process top suppliers by factures and fill in missing names
        const topSuppliersByFactures = (analyticsData.topSuppliersByFactures || []).map((supplier: any) => ({
          ...supplier,
          supplierName: supplier.supplierName || supplier.companyName || supplierNameMap.get(supplier.supplierId) || `Supplier #${supplier.supplierId}`,
          companyName: supplier.companyName || supplier.supplierName || supplierNameMap.get(supplier.supplierId) || `Supplier #${supplier.supplierId}`
        }));
        
        // Process supplier alerts and fill in missing names
        const supplierAlerts = (analyticsData.supplierAlerts || []).map((alert: any) => {
          const supplierName = alert.supplierName || alert.companyName || supplierNameMap.get(alert.supplierId) || `Supplier #${alert.supplierId}`;
          return {
            ...alert,
            supplierName: supplierName,
            companyName: supplierName,
            message: alert.message.replace(/ has/, ` ${supplierName} has`)
          };
        });
        
        // Convert to SupplierStatsDto format
        const statsDto: SupplierStatsDto = {
          totalSuppliers: analyticsData.totalSuppliers || 0,
          activeSuppliers: analyticsData.activeSuppliers || 0,
          inactiveSuppliers: analyticsData.inactiveSuppliers || 0,
          averagePaymentTerms: 30, // Default as this might not be in analytics response
          totalCreditLimit: analyticsData.totalCreditLimit || 0,
          suppliersWithOutstandingFactures: analyticsData.outstandingFactures || 0,
          topSuppliersByFactureCount: topSuppliersByFactures.slice(0, 5),
          topSuppliersByAmount: topSuppliersByFactures.slice(0, 5),
          suppliersByBranch: analyticsData.suppliersByBranch || []
        };
        
        console.log('✅ Processed analytics data with supplier names:', {
          totalSuppliers: statsDto.totalSuppliers,
          activeSuppliers: statsDto.activeSuppliers,
          topSuppliers: statsDto.topSuppliersByAmount.length,
          supplierAlerts: supplierAlerts.length
        });
        
        return statsDto;
      }),
      catchError(error => {
        console.warn('⚠️ Supplier analytics endpoint failed, trying stats endpoint:', error);
        
        // Fallback to the stats endpoint
        return this.http.get<ApiResponse<SupplierStatsDto>>(`${this.baseUrl}/stats`, {
          params,
          withCredentials: true
        }).pipe(
          map(response => {
            if (!response.success) {
              throw new Error(response.message || 'Failed to fetch supplier stats');
            }
            return response.data;
          }),
          catchError(statsError => {
            console.warn('⚠️ Both analytics and stats endpoints failed, calculating from local data:', statsError);
            
            // Calculate stats from current loaded suppliers
            const suppliers = this._suppliers();
            const fallbackStats: SupplierStatsDto = this.calculateStatsFromSuppliers(suppliers, branchId);
            
            console.log('📊 Generated fallback supplier stats:', fallbackStats);
            return new Observable<SupplierStatsDto>(observer => {
              observer.next(fallbackStats);
              observer.complete();
            });
          })
        );
      })
    );
  }

  // Helper method to calculate stats from loaded suppliers
  private calculateStatsFromSuppliers(suppliers: SupplierDto[], branchId?: number): SupplierStatsDto {
    // Filter by branch if specified
    let filteredSuppliers = suppliers;
    if (branchId) {
      filteredSuppliers = suppliers.filter(s => s.branchId === branchId);
    }
    
    const totalSuppliers = filteredSuppliers.length;
    const activeSuppliers = filteredSuppliers.filter(s => s.isActive).length;
    const inactiveSuppliers = totalSuppliers - activeSuppliers;
    
    const totalCreditLimit = filteredSuppliers.reduce((sum, s) => sum + (s.creditLimit || 0), 0);
    
    const averagePaymentTerms = totalSuppliers > 0 
      ? Math.round(filteredSuppliers.reduce((sum, s) => sum + (s.paymentTerms || 0), 0) / totalSuppliers)
      : 0;
    
    // Create top suppliers by credit limit (as proxy for amount)
    const topSuppliersByAmount: SupplierRankingDto[] = filteredSuppliers
      .sort((a, b) => (b.creditLimit || 0) - (a.creditLimit || 0))
      .slice(0, 5)
      .map(s => ({
        supplierId: s.id,
        companyName: s.companyName || 'Unknown',
        count: 1, // Placeholder since we don't have facture count
        totalAmount: s.creditLimit || 0
      }));
    
    // Group suppliers by branch
    const branchGroups = new Map<number, SupplierDto[]>();
    filteredSuppliers.forEach(supplier => {
      const key = supplier.branchId || 0; // 0 for all-branches suppliers
      if (!branchGroups.has(key)) {
        branchGroups.set(key, []);
      }
      branchGroups.get(key)!.push(supplier);
    });
    
    const suppliersByBranch: SupplierBranchStatsDto[] = Array.from(branchGroups.entries()).map(([branchId, suppliers]) => ({
      branchId,
      branchName: branchId === 0 ? 'All Branches' : `Branch ${branchId}`,
      supplierCount: suppliers.length,
      activeCount: suppliers.filter(s => s.isActive).length
    }));
    
    return {
      totalSuppliers,
      activeSuppliers,
      inactiveSuppliers,
      averagePaymentTerms,
      totalCreditLimit,
      suppliersWithOutstandingFactures: 0, // Will be calculated from facture data when available
      topSuppliersByFactureCount: [], // Will be populated from facture data when available
      topSuppliersByAmount,
      suppliersByBranch
    };
  }

  getSupplierAlerts(branchId?: number): Observable<SupplierAlertDto[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    
    return this.http.get<ApiResponse<SupplierAlertDto[]>>(`${this.baseUrl}/alerts`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch supplier alerts');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  generateSupplierCode(): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/generate-code`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to generate supplier code');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ==================== STATE MANAGEMENT HELPERS ==================== //

  clearError(): void {
    this._error.set(null);
  }

  refreshSuppliers(query?: SupplierQueryDto): void {
    const defaultQuery: SupplierQueryDto = query || {
      page: 1,
      pageSize: 100,
      sortBy: 'companyName',
      sortOrder: 'asc'
    };
    
    console.log('🔄 Refreshing suppliers with query:', defaultQuery);
    this.getSuppliers(defaultQuery).subscribe({
      next: (response) => {
        console.log('✅ Suppliers refreshed:', response.suppliers?.length || 0, 'suppliers loaded');
      },
      error: (error) => {
        console.error('❌ Error refreshing suppliers:', error);
      }
    });
  }

  // Get supplier from local state
  getSupplierFromState(id: number): SupplierDto | undefined {
    return this._suppliers().find(s => s.id === id);
  }

  // Error handler following AuthService pattern
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('❌ === SUPPLIER SERVICE ERROR ===');
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    console.error('Error body:', error.error);
    
    this._error.set(error.message || 'An unexpected error occurred');
    this._loading.set(false);
    
    return throwError(() => error);
  }
}