// Dynamic Branch Management Service
// Menggunakan API /api/Branch endpoints

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { 
  BranchDto,
  AccessibleBranchDto,
  SimpleBranchDto,
  BranchPerformanceDto,
  BranchUserSummaryDto,
  BranchAnalyticsDto,
  BranchComparisonDto,
  BranchDetailDto,
  CreateBranchDto,
  UpdateBranchDto,
  ToggleBranchStatusDto,
  BranchQueryParams,
  BranchApiResponse,
  BranchListApiResponse,
  AccessibleBranchListApiResponse,
  BranchDetailApiResponse,
  BranchPerformanceListApiResponse,
  BranchComparisonApiResponse,
  BranchAnalyticsApiResponse,
  BranchUserSummaryListApiResponse,
  BranchValidationApiResponse,
  SimpleBranchListApiResponse
} from '../models/branch.interface';

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api'; // Use relative URL for proxy routing
  
  // New endpoints for UserBranchAssignment API
  private readonly branchAssignmentUrl = '/api/UserBranchAssignment';

  // Signal-based state management
  private _branches = signal<BranchDto[]>([]);
  private _accessibleBranches = signal<AccessibleBranchDto[]>([]);
  private _currentBranch = signal<BranchDto | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly branches = this._branches.asReadonly();
  readonly accessibleBranches = this._accessibleBranches.asReadonly();
  readonly currentBranch = this._currentBranch.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties
  readonly activeBranches = computed(() => 
    this._branches().filter(branch => branch.isActive)
  );

  readonly headOffices = computed(() =>
    this._branches().filter(branch => branch.isHeadOffice)
  );

  readonly regularBranches = computed(() =>
    this._branches().filter(branch => !branch.isHeadOffice && branch.isActive)
  );

  readonly branchesByProvince = computed(() => {
    const branches = this._branches();
    const grouped = new Map<string, BranchDto[]>();
    
    branches.forEach(branch => {
      if (!grouped.has(branch.province)) {
        grouped.set(branch.province, []);
      }
      grouped.get(branch.province)!.push(branch);
    });
    
    return grouped;
  });

  readonly branchesByCity = computed(() => {
    const branches = this._branches();
    const grouped = new Map<string, BranchDto[]>();
    
    branches.forEach(branch => {
      const cityKey = `${branch.city}, ${branch.province}`;
      if (!grouped.has(cityKey)) {
        grouped.set(cityKey, []);
      }
      grouped.get(cityKey)!.push(branch);
    });
    
    return grouped;
  });

  // ===== CRUD OPERATIONS =====

  /**
   * Get all branches with optional filtering
   */
  getBranches(params?: BranchQueryParams): Observable<BranchDto[]> {
    this._loading.set(true);
    this._error.set(null);

    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('Search', params.search);
    if (params?.branchType !== undefined) httpParams = httpParams.set('BranchType', params.branchType.toString());
    if (params?.city) httpParams = httpParams.set('City', params.city);
    if (params?.province) httpParams = httpParams.set('Province', params.province);
    if (params?.isActive !== undefined) httpParams = httpParams.set('IsActive', params.isActive.toString());
    if (params?.storeSize) httpParams = httpParams.set('StoreSize', params.storeSize);
    if (params?.page) httpParams = httpParams.set('Page', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('PageSize', params.pageSize.toString());
    if (params?.sortBy) httpParams = httpParams.set('SortBy', params.sortBy);
    if (params?.sortOrder) httpParams = httpParams.set('SortOrder', params.sortOrder);

    return this.http.get<BranchListApiResponse>(`${this.apiUrl}/Branch`, {
      params: httpParams,
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          this._branches.set(response.data);
          return response.data;
        }
        throw new Error(response.message || 'Failed to load branches');
      }),
      catchError(error => {
        console.error('❌ Error loading branches:', error);
        this._error.set('Failed to load branches');
        return of([]);
      }),
      tap(() => this._loading.set(false))
    );
  }

  /**
   * Get accessible branches for current user using new API
   */
  getAccessibleBranches(): Observable<AccessibleBranchDto[]> {
    this._loading.set(true);
    this._error.set(null);

    const url = `${this.branchAssignmentUrl}/user-access`;
    console.log('🏢 Loading accessible branches from:', url);

    return this.http.get<any>(url, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          // Transform API response to AccessibleBranchDto format
          const accessibleBranches: AccessibleBranchDto[] = response.data.map((branch: any) => ({
            branchId: branch.branchId,
            branchCode: branch.branchCode,
            branchName: branch.branchName,
            branchType: this.mapBranchType(branch.branchType),
            isHeadOffice: branch.isHeadOffice || false,
            level: branch.level || (branch.isHeadOffice ? 0 : 1),
            canRead: branch.canRead || true,
            canWrite: branch.canWrite || false,
            canManage: branch.canManage || false,
            canTransfer: branch.canTransfer || false,
            canApprove: branch.canApprove || false,
            accessLevel: branch.accessLevel || 'ReadOnly',
            isActive: branch.isActive,
            address: branch.address || 'Alamat tidak tersedia',
            managerName: branch.managerName || 'Manager tidak diketahui',
            phone: branch.phone || '-',
            parentBranchId: branch.parentBranchId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));

          this._accessibleBranches.set(accessibleBranches);
          console.log('✅ Accessible branches loaded from API:', accessibleBranches.length);
          
          return accessibleBranches;
        }
        
        throw new Error('Invalid API response format');
      }),
      catchError(error => {
        console.error('❌ Error loading accessible branches:', error);
        this._error.set('Failed to load accessible branches');
        
        // Return empty array on error
        this._accessibleBranches.set([]);
        return of([]);
      }),
      tap(() => this._loading.set(false))
    );
  }

  /**
   * DEPRECATED: Old method - keeping for compatibility
   */
  getAccessibleBranchesOld(): Observable<AccessibleBranchDto[]> {
    return this.http.get<AccessibleBranchListApiResponse>(`${this.apiUrl}/Branch/accessible`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          this._accessibleBranches.set(response.data);
          return response.data;
        }
        throw new Error(response.message || 'Failed to load accessible branches');
      }),
      catchError(error => {
        console.error('❌ Error loading accessible branches:', error);
        return of([]);
      })
    );
  }

  /**
   * Get my accessible branches (simplified format)
   */
  getMyAccessibleBranches(): Observable<SimpleBranchDto[]> {
    const url = `${this.branchAssignmentUrl}/user-access`;
    console.log('🏢 Loading my accessible branches from:', url);
    
    return this.http.get<any>(url, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          // Transform API response to SimpleBranchDto format
          const simpleBranches: SimpleBranchDto[] = response.data.map((branch: any) => ({
            branchId: branch.branchId,
            branchCode: branch.branchCode,
            branchName: branch.branchName,
            branchType: branch.branchType,
            isActive: branch.isActive
          }));
          
          console.log('✅ My accessible branches loaded:', simpleBranches.length);
          return simpleBranches;
        }
        throw new Error(response.message || 'Failed to load accessible branches');
      }),
      catchError(error => {
        console.error('❌ Error loading my accessible branches from API:', error);
        return of([]);
      })
    );
  }

  /**
   * Get branch by ID with detailed information
   */
  getBranchById(id: number): Observable<BranchDetailDto> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<BranchDetailApiResponse>(`${this.apiUrl}/Branch/${id}`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Branch not found');
      }),
      catchError(error => {
        console.error('❌ Error loading branch:', error);
        this._error.set('Failed to load branch details');
        throw error;
      }),
      tap(() => this._loading.set(false))
    );
  }

  /**
   * Create new branch
   */
  createBranch(branchData: CreateBranchDto): Observable<BranchDto> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.post<BranchApiResponse>(`${this.apiUrl}/Branch`, branchData, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          // Update local state
          this._branches.update(branches => [...branches, response.data]);
          return response.data;
        }
        throw new Error(response.message || 'Failed to create branch');
      }),
      catchError(error => {
        console.error('❌ Error creating branch:', error);
        this._error.set('Failed to create branch');
        throw error;
      }),
      tap(() => this._loading.set(false))
    );
  }

  /**
   * Update existing branch
   */
  updateBranch(id: number, branchData: UpdateBranchDto): Observable<BranchDto> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.put<BranchApiResponse>(`${this.apiUrl}/Branch/${id}`, branchData, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          // Update local state
          this._branches.update(branches => 
            branches.map(branch => 
              branch.id === id ? response.data : branch
            )
          );
          return response.data;
        }
        throw new Error(response.message || 'Failed to update branch');
      }),
      catchError(error => {
        console.error('❌ Error updating branch:', error);
        this._error.set('Failed to update branch');
        throw error;
      }),
      tap(() => this._loading.set(false))
    );
  }

  /**
   * Toggle branch active/inactive status
   */
  toggleBranchStatus(id: number, isActive: boolean, reason: string = ''): Observable<boolean> {
    const data: ToggleBranchStatusDto = {
      branchId: id,
      isActive,
      reason
    };

    return this.http.patch<BranchApiResponse>(`${this.apiUrl}/Branch/${id}/toggle-status`, data, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success) {
          // Update local state
          this._branches.update(branches =>
            branches.map(branch =>
              branch.id === id ? { ...branch, isActive } : branch
            )
          );
          return true;
        }
        throw new Error(response.message || 'Failed to toggle branch status');
      }),
      catchError(error => {
        console.error('❌ Error toggling branch status:', error);
        throw error;
      })
    );
  }

  /**
   * Delete branch (soft delete)
   */
  deleteBranch(id: number): Observable<boolean> {
    return this.http.delete<BranchApiResponse>(`${this.apiUrl}/Branch/${id}`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success) {
          // Remove from local state
          this._branches.update(branches =>
            branches.filter(branch => branch.id !== id)
          );
          return true;
        }
        throw new Error(response.message || 'Failed to delete branch');
      }),
      catchError(error => {
        console.error('❌ Error deleting branch:', error);
        throw error;
      })
    );
  }

  /**
   * Permanently delete branch
   */
  permanentDeleteBranch(id: number): Observable<boolean> {
    return this.http.delete<BranchApiResponse>(`${this.apiUrl}/Branch/${id}/permanent`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success) {
          // Remove from local state
          this._branches.update(branches =>
            branches.filter(branch => branch.id !== id)
          );
          return true;
        }
        throw new Error(response.message || 'Failed to permanently delete branch');
      }),
      catchError(error => {
        console.error('❌ Error permanently deleting branch:', error);
        throw error;
      })
    );
  }

  // ===== SPECIALIZED QUERIES =====

  /**
   * Get active branches only
   */
  getActiveBranches(): Observable<BranchDto[]> {
    return this.http.get<BranchListApiResponse>(`${this.apiUrl}/Branch/active`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load active branches');
      }),
      catchError(error => {
        console.error('❌ Error loading active branches:', error);
        return of([]);
      })
    );
  }

  /**
   * Get inactive branches only
   */
  getInactiveBranches(): Observable<BranchDto[]> {
    return this.http.get<BranchListApiResponse>(`${this.apiUrl}/Branch/inactive`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load inactive branches');
      }),
      catchError(error => {
        console.error('❌ Error loading inactive branches:', error);
        return of([]);
      })
    );
  }

  /**
   * Get branch hierarchy
   */
  getBranchHierarchy(): Observable<{ [key: string]: BranchDto[] }> {
    return this.http.get<{ success: boolean; data: { [key: string]: BranchDto[] } }>(`${this.apiUrl}/Branch/hierarchy`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Failed to load branch hierarchy');
      }),
      catchError(error => {
        console.error('❌ Error loading branch hierarchy:', error);
        return of({});
      })
    );
  }

  /**
   * Get branches by region
   */
  getBranchesByRegion(province?: string, city?: string): Observable<{ [province: string]: { [city: string]: BranchDto[] } }> {
    let params = new HttpParams();
    if (province) params = params.set('province', province);
    if (city) params = params.set('city', city);

    return this.http.get<{ success: boolean; data: { [province: string]: { [city: string]: BranchDto[] } } }>(`${this.apiUrl}/Branch/by-region`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Failed to load branches by region');
      }),
      catchError(error => {
        console.error('❌ Error loading branches by region:', error);
        return of({});
      })
    );
  }

  // ===== ANALYTICS & REPORTING =====

  /**
   * Get branch performance data
   */
  getBranchPerformance(startDate?: string, endDate?: string): Observable<BranchPerformanceDto[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<BranchPerformanceListApiResponse>(`${this.apiUrl}/Branch/performance`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load branch performance');
      }),
      catchError(error => {
        console.error('❌ Error loading branch performance:', error);
        return of([]);
      })
    );
  }

  /**
   * Get branch performance comparison
   */
  getBranchPerformanceComparison(compareDate?: string): Observable<BranchComparisonDto> {
    let params = new HttpParams();
    if (compareDate) params = params.set('compareDate', compareDate);

    return this.http.get<BranchComparisonApiResponse>(`${this.apiUrl}/Branch/performance/comparison`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load branch performance comparison');
      }),
      catchError(error => {
        console.error('❌ Error loading branch performance comparison:', error);
        throw error;
      })
    );
  }

  /**
   * Get comprehensive branch analytics
   */
  getBranchAnalytics(): Observable<BranchAnalyticsDto> {
    return this.http.get<BranchAnalyticsApiResponse>(`${this.apiUrl}/Branch/analytics/comprehensive`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load branch analytics');
      }),
      catchError(error => {
        console.error('❌ Error loading branch analytics:', error);
        throw error;
      })
    );
  }

  /**
   * Get store size analytics
   */
  getStoreSizeAnalytics(): Observable<{ [size: string]: number }> {
    return this.http.get<{ success: boolean; data: { [size: string]: number }; message?: string }>(`${this.apiUrl}/Branch/analytics/store-size`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load store size analytics');
      }),
      catchError(error => {
        console.error('❌ Error loading store size analytics:', error);
        return of({});
      })
    );
  }

  /**
   * Get regional distribution analytics
   */
  getRegionalAnalytics(): Observable<{ [region: string]: number }> {
    return this.http.get<{ success: boolean; data: { [region: string]: number }; message?: string }>(`${this.apiUrl}/Branch/analytics/regional`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load regional analytics');
      }),
      catchError(error => {
        console.error('❌ Error loading regional analytics:', error);
        return of({});
      })
    );
  }

  /**
   * Get user summaries by branch
   */
  getBranchUserSummaries(): Observable<BranchUserSummaryDto[]> {
    return this.http.get<BranchUserSummaryListApiResponse>(`${this.apiUrl}/Branch/user-summaries`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to load user summaries');
      }),
      catchError(error => {
        console.error('❌ Error loading user summaries:', error);
        return of([]);
      })
    );
  }

  // ===== VALIDATION =====

  /**
   * Validate branch code availability
   */
  validateBranchCode(branchCode: string, excludeBranchId?: number): Observable<boolean> {
    let params = new HttpParams();
    if (excludeBranchId) params = params.set('excludeBranchId', excludeBranchId.toString());

    return this.http.get<BranchValidationApiResponse>(`${this.apiUrl}/Branch/validate-code/${branchCode}`, {
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to validate branch code');
      }),
      catchError(error => {
        console.error('❌ Error validating branch code:', error);
        return of(false);
      })
    );
  }

  // ===== UTILITY METHODS =====

  /**
   * Map numeric branch type to string
   */
  private mapBranchType(branchType: number): 'Head' | 'Branch' | 'SubBranch' {
    switch (branchType) {
      case 0: return 'Head';
      case 1: return 'Branch'; 
      case 2: return 'SubBranch';
      default: return 'Branch';
    }
  }

  /**
   * Set current branch
   */
  setCurrentBranch(branch: BranchDto | null): void {
    this._currentBranch.set(branch);
    if (branch) {
      localStorage.setItem('current-branch', JSON.stringify({
        id: branch.id,
        branchCode: branch.branchCode,
        branchName: branch.branchName
      }));
    } else {
      localStorage.removeItem('current-branch');
    }
  }

  /**
   * Get current branch from localStorage
   */
  loadCurrentBranchFromStorage(): void {
    const stored = localStorage.getItem('current-branch');
    if (stored) {
      try {
        const branchInfo = JSON.parse(stored);
        // Find the full branch data
        const fullBranch = this._branches().find(b => b.id === branchInfo.id);
        if (fullBranch) {
          this._currentBranch.set(fullBranch);
        }
      } catch (error) {
        console.error('Error loading current branch from storage:', error);
      }
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}