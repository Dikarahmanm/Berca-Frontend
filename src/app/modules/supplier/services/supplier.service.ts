import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
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
  SupplierAlertDto
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
  private readonly baseUrl = '/api/Supplier';

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

    return this.http.get<ApiResponse<SupplierPagedResponseDto>>(this.baseUrl, {
      params,
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('✅ Suppliers fetched:', response);
        if (response.success && response.data) {
          this._suppliers.set(response.data.suppliers);
        }
        this._loading.set(false);
      }),
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch suppliers');
        }
        return response.data;
      }),
      catchError(this.handleError.bind(this))
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
      catchError(this.handleError.bind(this))
    );
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
    if (query) {
      this.getSuppliers(query).subscribe();
    }
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