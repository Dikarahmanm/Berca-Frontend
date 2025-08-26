// src/app/core/services/expiry-analytics.service.ts
// ✅ SMART ANALYTICS INTEGRATION: ExpiryAnalyticsService
// Following Project Guidelines: Signal-based, Performance Optimized, Type-safe

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { SmartFifoRecommendationDto as SharedSmartFifoRecommendationDto } from '../interfaces/smart-analytics.interfaces';

// ===== COMPREHENSIVE INTERFACES =====
export interface ComprehensiveExpiryAnalyticsDto {
  totalProducts: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  expiredProducts: number;
  criticalAlerts: number;
  potentialLossValue: number;
  averageDaysUntilExpiry: number;
  
  // Risk Analysis
  riskAnalysis: {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskScore: number; // 0-1
    insights: {
      type: 'WARNING' | 'INFO' | 'RECOMMENDATION' | 'ALERT';
      message: string;
    }[];
  };
  
  categoryBreakdown: CategoryExpiryStatsDto[];
  supplierAnalytics: SupplierExpiryStatsDto[];
  trends: ExpiryTrendDto[];
  recommendations: SharedSmartFifoRecommendationDto[];
  lastUpdated: string;
}

export interface CategoryExpiryStatsDto {
  categoryId: number;
  categoryName: string;
  totalProducts: number;
  expiringProducts: number;
  expiredProducts: number;
  averageDaysUntilExpiry: number;
  potentialLoss: number;
  riskScore: number;
}

export interface SupplierExpiryStatsDto {
  supplierId: number;
  supplierName: string;
  totalProducts: number;
  expiringProducts: number;
  averageShelfLife: number;
  qualityScore: number;
  recommendedOrderTiming: number;
}

export interface ExpiryTrendDto {
  date: string;
  expiringProducts: number;
  expiredProducts: number;
  potentialLoss: number;
  actualLoss?: number;
}

// Using shared SmartFifoRecommendationDto from interfaces

export interface ProductExpiryDetailDto {
  productId: number;
  productName: string;
  categoryName: string;
  supplierName: string;
  batches: BatchExpiryInfoDto[];
  totalStock: number;
  expiringStock: number;
  expiredStock: number;
  averageDaysUntilExpiry: number;
  recommendations: SharedSmartFifoRecommendationDto[];
}

export interface BatchExpiryInfoDto {
  batchId: string;
  expiryDate: string;
  daysUntilExpiry: number;
  stock: number;
  purchasePrice: number;
  sellingPrice: number;
  potentialLoss: number;
  status: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED';
}

export interface ExpiryAnalyticsQueryParams {
  branchId?: number;
  categoryId?: number;
  supplierId?: number;
  daysAhead?: number;
  includeExpired?: boolean;
  sortBy?: 'expiry_date' | 'potential_loss' | 'stock_quantity';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpiryAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ExpiryManagement`;

  // ===== STATE SIGNALS =====
  private _comprehensiveAnalytics = signal<ComprehensiveExpiryAnalyticsDto | null>(null);
  private _fifoRecommendations = signal<SharedSmartFifoRecommendationDto[]>([]);
  private _categoryStats = signal<CategoryExpiryStatsDto[]>([]);
  private _supplierStats = signal<SupplierExpiryStatsDto[]>([]);
  private _trends = signal<ExpiryTrendDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _lastUpdated = signal<Date | null>(null);

  // ===== PUBLIC READONLY SIGNALS =====
  readonly comprehensiveAnalytics = this._comprehensiveAnalytics.asReadonly();
  readonly fifoRecommendations = this._fifoRecommendations.asReadonly();
  readonly categoryStats = this._categoryStats.asReadonly();
  readonly supplierStats = this._supplierStats.asReadonly();
  readonly trends = this._trends.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();

  // ===== COMPUTED PROPERTIES =====
  readonly criticalRecommendations = computed(() => 
    this._fifoRecommendations().filter(r => r.priority === 'CRITICAL')
  );

  readonly highPriorityRecommendations = computed(() =>
    this._fifoRecommendations().filter(r => r.priority === 'HIGH')
  );

  readonly totalPotentialLoss = computed(() => {
    const analytics = this._comprehensiveAnalytics();
    return analytics?.potentialLossValue || 0;
  });

  readonly expiringProductsCount = computed(() => {
    const analytics = this._comprehensiveAnalytics();
    return (analytics?.expiringIn7Days || 0) + (analytics?.expiringIn30Days || 0);
  });

  readonly topRiskCategories = computed(() =>
    this._categoryStats()
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5)
  );

  readonly topQualitySuppliers = computed(() =>
    this._supplierStats()
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 10)
  );

  readonly isDataStale = computed(() => {
    const lastUpdate = this._lastUpdated();
    if (!lastUpdate) return true;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastUpdate < fiveMinutesAgo;
  });

  // ===== HTTP HEADERS =====
  private getHttpHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });
  }

  private buildHttpParams(params?: ExpiryAnalyticsQueryParams): HttpParams {
    let httpParams = new HttpParams();
    
    if (params?.branchId) httpParams = httpParams.set('branchId', params.branchId.toString());
    if (params?.categoryId) httpParams = httpParams.set('categoryId', params.categoryId.toString());
    if (params?.supplierId) httpParams = httpParams.set('supplierId', params.supplierId.toString());
    if (params?.daysAhead) httpParams = httpParams.set('daysAhead', params.daysAhead.toString());
    if (params?.includeExpired !== undefined) httpParams = httpParams.set('includeExpired', params.includeExpired.toString());
    if (params?.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params?.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
    
    return httpParams;
  }

  // ===== MAIN API METHODS =====

  /**
   * Get comprehensive expiry analytics from /api/ExpiryManagement/comprehensive-analytics
   */
  async getComprehensiveAnalytics(params?: ExpiryAnalyticsQueryParams): Promise<ComprehensiveExpiryAnalyticsDto> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const httpParams = this.buildHttpParams(params);
      const response = await this.http.get<ApiResponse<ComprehensiveExpiryAnalyticsDto>>(
        `${this.baseUrl}/comprehensive-analytics`,
        { 
          headers: this.getHttpHeaders(),
          params: httpParams,
          withCredentials: true
        }
      ).toPromise();

      if (response?.success && response.data) {
        this._comprehensiveAnalytics.set(response.data);
        this._categoryStats.set(response.data.categoryBreakdown || []);
        this._supplierStats.set(response.data.supplierAnalytics || []);
        this._trends.set(response.data.trends || []);
        this._fifoRecommendations.set(response.data.recommendations || []);
        this._lastUpdated.set(new Date());
        return response.data;
      } else {
        const errorMsg = response?.message || 'Failed to load comprehensive analytics';
        this._error.set(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = this.handleError(error, 'Failed to load comprehensive analytics');
      this._error.set(errorMsg);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get smart FIFO recommendations from /api/ExpiryManagement/smart-fifo-recommendations
   */
  async getSmartFifoRecommendations(params?: ExpiryAnalyticsQueryParams): Promise<SharedSmartFifoRecommendationDto[]> {
    try {
      const httpParams = this.buildHttpParams(params);
      const response = await this.http.get<ApiResponse<SharedSmartFifoRecommendationDto[]>>(
        `${this.baseUrl}/smart-fifo-recommendations`,
        {
          headers: this.getHttpHeaders(),
          params: httpParams,
          withCredentials: true
        }
      ).toPromise();

      if (response?.success && response.data) {
        this._fifoRecommendations.set(response.data);
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to load FIFO recommendations');
      }
    } catch (error) {
      this.handleError(error, 'Failed to load FIFO recommendations');
      throw error;
    }
  }

  /**
   * Get category expiry statistics from /api/ExpiryManagement/category-stats
   */
  async getCategoryStats(params?: ExpiryAnalyticsQueryParams): Promise<CategoryExpiryStatsDto[]> {
    try {
      const httpParams = this.buildHttpParams(params);
      const response = await this.http.get<ApiResponse<CategoryExpiryStatsDto[]>>(
        `${this.baseUrl}/category-stats`,
        {
          headers: this.getHttpHeaders(),
          params: httpParams,
          withCredentials: true
        }
      ).toPromise();

      if (response?.success && response.data) {
        this._categoryStats.set(response.data);
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to load category statistics');
      }
    } catch (error) {
      this.handleError(error, 'Failed to load category statistics');
      throw error;
    }
  }

  /**
   * Get supplier expiry analytics from /api/ExpiryManagement/supplier-analytics
   */
  async getSupplierAnalytics(params?: ExpiryAnalyticsQueryParams): Promise<SupplierExpiryStatsDto[]> {
    try {
      const httpParams = this.buildHttpParams(params);
      const response = await this.http.get<ApiResponse<SupplierExpiryStatsDto[]>>(
        `${this.baseUrl}/supplier-analytics`,
        {
          headers: this.getHttpHeaders(),
          params: httpParams,
          withCredentials: true
        }
      ).toPromise();

      if (response?.success && response.data) {
        this._supplierStats.set(response.data);
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to load supplier analytics');
      }
    } catch (error) {
      this.handleError(error, 'Failed to load supplier analytics');
      throw error;
    }
  }

  /**
   * Get expiry trends from /api/ExpiryManagement/trends
   */
  async getExpiryTrends(daysBack: number = 30, params?: ExpiryAnalyticsQueryParams): Promise<ExpiryTrendDto[]> {
    try {
      const httpParams = this.buildHttpParams(params);
      httpParams.set('daysBack', daysBack.toString());
      
      const response = await this.http.get<ApiResponse<ExpiryTrendDto[]>>(
        `${this.baseUrl}/trends`,
        {
          headers: this.getHttpHeaders(),
          params: httpParams,
          withCredentials: true
        }
      ).toPromise();

      if (response?.success && response.data) {
        this._trends.set(response.data);
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to load expiry trends');
      }
    } catch (error) {
      this.handleError(error, 'Failed to load expiry trends');
      throw error;
    }
  }

  /**
   * Get detailed product expiry info from /api/ExpiryManagement/product-detail/{productId}
   */
  async getProductExpiryDetail(productId: number): Promise<ProductExpiryDetailDto> {
    try {
      const response = await this.http.get<ApiResponse<ProductExpiryDetailDto>>(
        `${this.baseUrl}/product-detail/${productId}`,
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success && response.data) {
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to load product expiry details');
      }
    } catch (error) {
      this.handleError(error, 'Failed to load product expiry details');
      throw error;
    }
  }

  /**
   * Execute FIFO recommendation action from /api/ExpiryManagement/execute-recommendation
   */
  async executeRecommendation(
    productId: number,
    batchId: string,
    action: string,
    discountPercentage?: number
  ): Promise<boolean> {
    try {
      const payload = {
        productId,
        batchId,
        action,
        discountPercentage: discountPercentage || 0
      };

      const response = await this.http.post<ApiResponse<boolean>>(
        `${this.baseUrl}/execute-recommendation`,
        payload,
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success) {
        // Refresh recommendations after successful action
        await this.refreshData();
        return true;
      } else {
        throw new Error(response?.message || 'Failed to execute recommendation');
      }
    } catch (error) {
      this.handleError(error, 'Failed to execute recommendation');
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Refresh all analytics data
   */
  async refreshData(): Promise<void> {
    try {
      await Promise.all([
        this.getComprehensiveAnalytics(),
        this.getSmartFifoRecommendations(),
        this.getCategoryStats(),
        this.getSupplierAnalytics(),
        this.getExpiryTrends()
      ]);
    } catch (error) {
      console.error('Error refreshing expiry analytics data:', error);
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this._comprehensiveAnalytics.set(null);
    this._fifoRecommendations.set([]);
    this._categoryStats.set([]);
    this._supplierStats.set([]);
    this._trends.set([]);
    this._lastUpdated.set(null);
    this._error.set(null);
  }

  /**
   * Check if data needs refresh based on cache TTL
   */
  shouldRefreshData(): boolean {
    return this.isDataStale();
  }

  /**
   * Get analytics summary for dashboard widgets
   */
  getAnalyticsSummary() {
    const analytics = this._comprehensiveAnalytics();
    const criticalCount = this.criticalRecommendations().length;
    const highPriorityCount = this.highPriorityRecommendations().length;

    return {
      totalProducts: analytics?.totalProducts || 0,
      expiringProducts: this.expiringProductsCount(),
      expiredProducts: analytics?.expiredProducts || 0,
      potentialLoss: this.totalPotentialLoss(),
      criticalAlerts: criticalCount,
      highPriorityAlerts: highPriorityCount,
      topRiskCategory: this.topRiskCategories()[0]?.categoryName || 'N/A',
      averageDaysUntilExpiry: analytics?.averageDaysUntilExpiry || 0,
      isDataStale: this.isDataStale()
    };
  }


  // ===== ERROR HANDLING =====
  private handleError(error: any, context: string): string {
    console.error(`${context}:`, error);
    
    if (error?.status === 401) {
      return 'Authentication required. Please log in again.';
    } else if (error?.status === 403) {
      return 'Access denied. You do not have permission to view this data.';
    } else if (error?.status === 404) {
      return 'Analytics data not found. The endpoint may not be available.';
    } else if (error?.status === 500) {
      return 'Server error occurred. Please try again later.';
    } else if (!navigator.onLine) {
      return 'No internet connection. Please check your network.';
    } else {
      return error?.message || 'An unexpected error occurred';
    }
  }
}