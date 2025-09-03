import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environment/environment';
import {
  OutstandingFactureDto,
  TopSupplierByFacturesDto,
  SuppliersByBranchDto,
  SupplierAlertsResponseDto,
  ApiResponse,
  OutstandingFacturesQueryParams,
  TopSuppliersByFacturesQueryParams,
  SuppliersByBranchQueryParams,
  SupplierAlertsQueryParams
} from '../interfaces/facture-analytics.interfaces';

@Injectable({
  providedIn: 'root'
})
export class FactureAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/Facture';

  // Signal-based state for caching
  private _outstandingFactures = signal<OutstandingFactureDto[]>([]);
  private _topSuppliers = signal<TopSupplierByFacturesDto[]>([]);
  private _suppliersByBranch = signal<SuppliersByBranchDto[]>([]);
  private _supplierAlerts = signal<SupplierAlertsResponseDto | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly outstandingFactures = this._outstandingFactures.asReadonly();
  readonly topSuppliers = this._topSuppliers.asReadonly();
  readonly suppliersByBranch = this._suppliersByBranch.asReadonly();
  readonly supplierAlerts = this._supplierAlerts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Get outstanding factures
   * GET /api/Facture/outstanding-factures
   */
  getOutstandingFactures(params?: OutstandingFacturesQueryParams): Observable<OutstandingFactureDto[]> {
    this._loading.set(true);
    this._error.set(null);

    let httpParams = new HttpParams();
    if (params?.branchId) httpParams = httpParams.set('branchId', params.branchId.toString());
    if (params?.supplierId) httpParams = httpParams.set('supplierId', params.supplierId.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

    const url = `${this.baseUrl}/outstanding-factures`;

    return this.http.get<OutstandingFactureDto[]>(url, {
      params: httpParams,
      withCredentials: true
    }).pipe(
      tap(data => {
        console.log('📋 Outstanding factures loaded:', data?.length || 0);
        this._outstandingFactures.set(data || []);
        this._loading.set(false);
      }),
      catchError(error => this.handleError(error, []))
    );
  }

  /**
   * Get top suppliers by factures
   * GET /api/Facture/top-suppliers-by-factures
   */
  getTopSuppliersByFactures(params?: TopSuppliersByFacturesQueryParams): Observable<TopSupplierByFacturesDto[]> {
    this._loading.set(true);
    this._error.set(null);

    let httpParams = new HttpParams();
    if (params?.branchId) httpParams = httpParams.set('branchId', params.branchId.toString());
    if (params?.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params?.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

    const url = `${this.baseUrl}/top-suppliers-by-factures`;

    return this.http.get<TopSupplierByFacturesDto[]>(url, {
      params: httpParams,
      withCredentials: true
    }).pipe(
      tap(data => {
        console.log('🏆 Top suppliers by factures loaded:', data?.length || 0);
        this._topSuppliers.set(data || []);
        this._loading.set(false);
      }),
      catchError(error => this.handleError(error, []))
    );
  }

  /**
   * Get suppliers by branch analytics
   * GET /api/Facture/suppliers-by-branch
   */
  getSuppliersByBranch(params?: SuppliersByBranchQueryParams): Observable<SuppliersByBranchDto[]> {
    this._loading.set(true);
    this._error.set(null);

    let httpParams = new HttpParams();
    if (params?.branchId) httpParams = httpParams.set('branchId', params.branchId.toString());

    const url = `${this.baseUrl}/suppliers-by-branch`;

    return this.http.get<SuppliersByBranchDto[]>(url, {
      params: httpParams,
      withCredentials: true
    }).pipe(
      tap(data => {
        console.log('🏪 Suppliers by branch loaded:', data?.length || 0);
        this._suppliersByBranch.set(data || []);
        this._loading.set(false);
      }),
      catchError(error => this.handleError(error, []))
    );
  }

  /**
   * Get supplier alerts
   * GET /api/Facture/supplier-alerts
   */
  getSupplierAlerts(params?: SupplierAlertsQueryParams): Observable<SupplierAlertsResponseDto> {
    this._loading.set(true);
    this._error.set(null);

    let httpParams = new HttpParams();
    if (params?.branchId) httpParams = httpParams.set('branchId', params.branchId.toString());
    if (params?.priorityFilter) httpParams = httpParams.set('priorityFilter', params.priorityFilter);

    const url = `${this.baseUrl}/supplier-alerts`;

    const fallbackAlerts: SupplierAlertsResponseDto = {
      criticalAlerts: [],
      warningAlerts: [],
      infoAlerts: [],
      summary: {
        totalCriticalAlerts: 0,
        totalWarningAlerts: 0,
        totalInfoAlerts: 0,
        unreadAlerts: 0,
        totalAmountAtRisk: 0,
        suppliersWithAlerts: 0,
        lastUpdated: new Date().toISOString(),
        alertsByCategory: []
      }
    };

    return this.http.get<SupplierAlertsResponseDto>(url, {
      params: httpParams,
      withCredentials: true
    }).pipe(
      tap(data => {
        console.log('🚨 Supplier alerts loaded:', {
          critical: data?.criticalAlerts?.length || 0,
          warning: data?.warningAlerts?.length || 0,
          info: data?.infoAlerts?.length || 0
        });
        this._supplierAlerts.set(data);
        this._loading.set(false);
      }),
      catchError(error => this.handleError(error, fallbackAlerts))
    );
  }

  /**
   * Get dashboard summary data
   * Combines multiple endpoints for dashboard
   */
  getDashboardSummary(branchId?: number): Observable<{
    outstandingFactures: OutstandingFactureDto[];
    topSuppliers: TopSupplierByFacturesDto[];
    suppliersByBranch: SuppliersByBranchDto[];
    alerts: SupplierAlertsResponseDto;
  }> {
    this._loading.set(true);
    this._error.set(null);

    // Prepare parameters
    const outstandingParams: OutstandingFacturesQueryParams = {
      branchId,
      limit: 50
    };

    const topSuppliersParams: TopSuppliersByFacturesQueryParams = {
      branchId,
      limit: 10
    };

    const branchParams: SuppliersByBranchQueryParams = {
      branchId
    };

    const alertsParams: SupplierAlertsQueryParams = {
      branchId
    };

    // Use Promise.all to load data in parallel
    return new Observable(observer => {
      Promise.all([
        this.getOutstandingFactures(outstandingParams).toPromise(),
        this.getTopSuppliersByFactures(topSuppliersParams).toPromise(),
        this.getSuppliersByBranch(branchParams).toPromise(),
        this.getSupplierAlerts(alertsParams).toPromise()
      ]).then(([outstandingFactures, topSuppliers, suppliersByBranch, alerts]) => {
        const summary = {
          outstandingFactures: outstandingFactures || [],
          topSuppliers: topSuppliers || [],
          suppliersByBranch: suppliersByBranch || [],
          alerts: alerts || {
            criticalAlerts: [],
            warningAlerts: [],
            infoAlerts: [],
            summary: {
              totalCriticalAlerts: 0,
              totalWarningAlerts: 0,
              totalInfoAlerts: 0,
              unreadAlerts: 0,
              totalAmountAtRisk: 0,
              suppliersWithAlerts: 0,
              lastUpdated: new Date().toISOString(),
              alertsByCategory: []
            }
          }
        };

        console.log('📊 Dashboard summary loaded:', {
          outstandingFactures: summary.outstandingFactures.length,
          topSuppliers: summary.topSuppliers.length,
          branches: summary.suppliersByBranch.length,
          totalAlerts: (summary.alerts.criticalAlerts?.length || 0) +
                      (summary.alerts.warningAlerts?.length || 0) +
                      (summary.alerts.infoAlerts?.length || 0)
        });

        this._loading.set(false);
        observer.next(summary);
        observer.complete();
      }).catch(error => {
        console.warn('⚠️ Some dashboard analytics endpoints unavailable, using fallback data:', error);
        
        // Provide fallback summary with empty data
        const fallbackSummary = {
          outstandingFactures: [],
          topSuppliers: [],
          suppliersByBranch: [],
          alerts: {
            criticalAlerts: [],
            warningAlerts: [],
            infoAlerts: [],
            summary: {
              totalCriticalAlerts: 0,
              totalWarningAlerts: 0,
              totalInfoAlerts: 0,
              unreadAlerts: 0,
              totalAmountAtRisk: 0,
              suppliersWithAlerts: 0,
              lastUpdated: new Date().toISOString(),
              alertsByCategory: []
            }
          }
        };
        
        console.log('📊 Dashboard summary loaded with fallback data');
        this._loading.set(false);
        observer.next(fallbackSummary);
        observer.complete();
      });
    });
  }

  /**
   * Calculate dashboard statistics from loaded data
   */
  calculateDashboardStats(): {
    totalOutstanding: number;
    totalFactures: number;
    totalSuppliers: number;
    overdueCount: number;
    overdueAmount: number;
    averageFactureAmount: number;
    totalAmountAtRisk: number;
    suppliersWithAlerts: number;
    branchesActive: number;
  } {
    const outstandingFactures = this._outstandingFactures();
    const topSuppliers = this._topSuppliers();
    const suppliersByBranch = this._suppliersByBranch();
    const alerts = this._supplierAlerts();

    // Calculate totals from outstanding factures
    const totalOutstanding = outstandingFactures.reduce((sum, facture) => sum + facture.outstandingAmount, 0);
    const totalFactures = outstandingFactures.length;
    const overdueCount = outstandingFactures.filter(f => f.isOverdue).length;
    const overdueAmount = outstandingFactures.filter(f => f.isOverdue).reduce((sum, f) => sum + f.outstandingAmount, 0);

    // Calculate supplier statistics
    const uniqueSuppliers = new Set(outstandingFactures.map(f => f.supplierName));
    const totalSuppliers = uniqueSuppliers.size;
    
    // Calculate averages
    const averageFactureAmount = totalFactures > 0 ? totalOutstanding / totalFactures : 0;

    // Calculate alert statistics
    const totalAmountAtRisk = alerts?.summary?.totalAmountAtRisk || 0;
    const suppliersWithAlerts = alerts?.summary?.suppliersWithAlerts || 0;

    // Calculate active branches
    const branchesActive = suppliersByBranch.filter(b => b.totalFacturesThisMonth > 0).length;

    return {
      totalOutstanding,
      totalFactures,
      totalSuppliers,
      overdueCount,
      overdueAmount,
      averageFactureAmount,
      totalAmountAtRisk,
      suppliersWithAlerts,
      branchesActive
    };
  }

  /**
   * Get payment risk statistics
   */
  getPaymentRiskStats(): {
    low: number;
    medium: number;
    high: number;
    critical: number;
  } {
    const topSuppliers = this._topSuppliers();
    
    const riskStats = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    topSuppliers.forEach(supplier => {
      const risk = supplier.paymentRisk?.toLowerCase() || 'low';
      if (risk.includes('low')) riskStats.low++;
      else if (risk.includes('medium')) riskStats.medium++;
      else if (risk.includes('high')) riskStats.high++;
      else if (risk.includes('critical')) riskStats.critical++;
    });

    return riskStats;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this._outstandingFactures.set([]);
    this._topSuppliers.set([]);
    this._suppliersByBranch.set([]);
    this._supplierAlerts.set(null);
    this._error.set(null);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Enhanced error handler with fallback strategies
   */
  private handleError(error: any, fallbackData?: any): Observable<any> {
    console.warn('⚠️ Facture Analytics endpoint not available:', error.url || 'unknown endpoint');
    
    if (error.status === 500) {
      console.warn('💡 Backend analytics endpoint may not be implemented yet:', {
        url: error.url,
        status: error.status,
        message: error.message
      });
      
      // Don't set error state for missing endpoints
      this._loading.set(false);
      
      // Return fallback data instead of throwing error
      return new Observable(observer => {
        observer.next(fallbackData || []);
        observer.complete();
      });
    }
    
    // For other errors, still handle normally but with gentler messaging
    console.warn('🔌 Analytics service temporarily unavailable:', error.message);
    this._error.set('Analytics temporarily unavailable');
    this._loading.set(false);
    
    // Return fallback data even for network errors
    return new Observable(observer => {
      observer.next(fallbackData || []);
      observer.complete();
    });
  }
}