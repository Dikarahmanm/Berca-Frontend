// src/app/core/services/branch-performance-optimizer.service.ts
// Performance optimization service for multi-branch data loading
// Angular 20 with advanced caching and batch loading strategies

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest, EMPTY, of, timer } from 'rxjs';
import { 
  map, 
  tap, 
  catchError, 
  debounceTime, 
  distinctUntilChanged, 
  shareReplay, 
  switchMap,
  retry,
  timeout,
  mergeMap,
  concatMap,
  startWith
} from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { StateService } from './state.service';

// Performance monitoring interfaces
export interface PerformanceMetrics {
  operationId: string;
  operationType: 'cache_hit' | 'cache_miss' | 'api_call' | 'batch_load' | 'lazy_load';
  branchIds: number[];
  executionTime: number;
  dataSize: number;
  timestamp: string;
  cacheEfficiency: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  branchId: number;
  ttl: number; // Time to live in milliseconds
  size: number; // Approximate size in bytes
  hitCount: number;
}

export interface BatchLoadRequest {
  branchIds: number[];
  dataTypes: DataType[];
  priority: 'high' | 'medium' | 'low';
  forceRefresh?: boolean;
}

export interface LazyLoadConfig {
  threshold: number; // Viewport threshold for loading
  pageSize: number;
  maxConcurrentLoads: number;
  preloadNextPages: number;
}

type DataType = 'sales' | 'inventory' | 'analytics' | 'notifications' | 'performance';

export interface OptimizedApiResponse<T> {
  success: boolean;
  data: T;
  metadata: {
    branchIds: number[];
    cacheStatus: 'hit' | 'miss' | 'partial';
    executionTime: number;
    fromCache: boolean;
    totalRecords: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BranchPerformanceOptimizerService {
  private readonly http = inject(HttpClient);
  private readonly stateService = inject(StateService);
  private readonly baseUrl = environment.apiUrl;

  // Cache configuration
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly DEBOUNCE_TIME = 300; // ms
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;

  // Cache storage
  private readonly cache = new Map<string, CacheEntry<any>>();
  private currentCacheSize = 0;

  // Performance monitoring
  private _performanceMetrics = signal<PerformanceMetrics[]>([]);
  private _cacheHitRatio = signal<number>(0);
  private _averageLoadTime = signal<number>(0);
  private _activeOperations = signal<number>(0);

  // Request queuing and batching
  private readonly requestQueue = new BehaviorSubject<BatchLoadRequest[]>([]);
  private readonly loadingStates = new Map<string, BehaviorSubject<boolean>>();

  // Public readonly signals
  readonly performanceMetrics = this._performanceMetrics.asReadonly();
  readonly cacheHitRatio = this._cacheHitRatio.asReadonly();
  readonly averageLoadTime = this._averageLoadTime.asReadonly();
  readonly activeOperations = this._activeOperations.asReadonly();

  // Computed performance insights
  readonly performanceInsights = computed(() => {
    const metrics = this._performanceMetrics();
    const recent = metrics.filter(m => 
      Date.now() - new Date(m.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recent.length === 0) return null;

    const avgExecutionTime = recent.reduce((sum, m) => sum + m.executionTime, 0) / recent.length;
    const cacheHits = recent.filter(m => m.operationType === 'cache_hit').length;
    const totalOps = recent.length;
    const currentHitRatio = totalOps > 0 ? cacheHits / totalOps : 0;

    return {
      averageExecutionTime: Math.round(avgExecutionTime),
      cacheHitRatio: Math.round(currentHitRatio * 100),
      totalOperations: totalOps,
      cacheEfficiency: recent.reduce((sum, m) => sum + m.cacheEfficiency, 0) / recent.length,
      performanceGrade: this.calculatePerformanceGrade(avgExecutionTime, currentHitRatio),
      recommendations: this.generatePerformanceRecommendations(avgExecutionTime, currentHitRatio)
    };
  });

  readonly cacheStatistics = computed(() => {
    const totalEntries = this.cache.size;
    const totalSize = this.currentCacheSize;
    const utilization = (totalSize / this.MAX_CACHE_SIZE) * 100;

    const entriesByBranch = new Map<number, number>();
    this.cache.forEach(entry => {
      entriesByBranch.set(entry.branchId, (entriesByBranch.get(entry.branchId) || 0) + 1);
    });

    return {
      totalEntries,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      utilizationPercent: Math.round(utilization * 100) / 100,
      entriesPerBranch: Array.from(entriesByBranch.entries()).map(([branchId, count]) => ({
        branchId,
        entryCount: count
      })),
      oldestEntry: this.getOldestCacheEntry(),
      newestEntry: this.getNewestCacheEntry()
    };
  });

  constructor() {
    this.initializeOptimizer();
    this.setupBatchProcessing();
    this.setupCacheCleanup();
    this.setupPerformanceMonitoring();
  }

  // ===== INITIALIZATION =====

  private initializeOptimizer(): void {
    console.log('🚀 Initializing Branch Performance Optimizer...');
    
    // Setup automatic cache cleanup
    timer(0, 2 * 60 * 1000).subscribe(() => {
      this.cleanupExpiredCache();
    });

    // Monitor branch changes for cache invalidation
    effect(() => {
      const activeBranches = this.stateService.activeBranchIds();
      if (activeBranches.length > 0) {
        this.preloadCriticalData(activeBranches);
      }
    });
  }

  private setupBatchProcessing(): void {
    this.requestQueue.pipe(
      debounceTime(this.DEBOUNCE_TIME),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      switchMap(requests => this.processBatchRequests(requests))
    ).subscribe({
      next: (results) => console.log('✅ Batch processing completed:', results),
      error: (error) => console.error('❌ Batch processing error:', error)
    });
  }

  private setupCacheCleanup(): void {
    // Cleanup cache when approaching size limit
    effect(() => {
      const stats = this.cacheStatistics();
      if (stats.utilizationPercent > 80) {
        this.aggressiveCleanup();
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    // Track performance metrics every minute
    timer(0, 60 * 1000).subscribe(() => {
      this.updatePerformanceMetrics();
    });
  }

  // ===== OPTIMIZED DATA LOADING =====

  async loadBranchDataOptimized<T>(
    dataType: DataType,
    branchIds: number[],
    forceRefresh = false
  ): Promise<OptimizedApiResponse<T[]>> {
    const startTime = performance.now();
    this._activeOperations.update(count => count + 1);

    try {
      const cacheKey = this.generateCacheKey(dataType, branchIds);
      
      // Check cache first (unless forced refresh)
      if (!forceRefresh) {
        const cachedData = this.getCachedData<T[]>(cacheKey);
        if (cachedData) {
          this.recordMetric('cache_hit', branchIds, performance.now() - startTime, JSON.stringify(cachedData).length);
          return {
            success: true,
            data: cachedData,
            metadata: {
              branchIds,
              cacheStatus: 'hit',
              executionTime: performance.now() - startTime,
              fromCache: true,
              totalRecords: cachedData.length
            }
          };
        }
      }

      // Load from API with optimizations
      const apiData = await this.loadFromApiOptimized<T>(dataType, branchIds);
      
      // Cache the results
      if (apiData.success) {
        this.setCachedData(cacheKey, apiData.data, branchIds[0] || 0);
      }

      const executionTime = performance.now() - startTime;
      this.recordMetric('api_call', branchIds, executionTime, JSON.stringify(apiData.data).length);

      return {
        ...apiData,
        metadata: {
          branchIds,
          cacheStatus: 'miss',
          executionTime,
          fromCache: false,
          totalRecords: Array.isArray(apiData.data) ? apiData.data.length : 0
        }
      };

    } catch (error: any) {
      console.error(`❌ Error loading ${dataType} data:`, error);
      return {
        success: false,
        data: [] as T[],
        metadata: {
          branchIds,
          cacheStatus: 'miss',
          executionTime: performance.now() - startTime,
          fromCache: false,
          totalRecords: 0
        }
      };
    } finally {
      this._activeOperations.update(count => Math.max(0, count - 1));
    }
  }

  private async loadFromApiOptimized<T>(dataType: DataType, branchIds: number[]): Promise<{ success: boolean; data: T[] }> {
    const endpoint = this.getEndpointForDataType(dataType);
    const params = {
      branchIds: branchIds.join(','),
      optimized: 'true',
      compression: 'gzip'
    };

    try {
      const response = await this.http.get<{ success: boolean; data: T[] }>(
        `${this.baseUrl}${endpoint}`,
        { 
          params,
          headers: {
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache'
          }
        }
      ).pipe(
        timeout(this.REQUEST_TIMEOUT),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => timer(retryCount * 1000)
        })
      ).toPromise();

      return response || { success: false, data: [] };
    } catch (error) {
      console.error(`❌ API call failed for ${dataType}:`, error);
      return { success: false, data: [] };
    }
  }

  // ===== BATCH LOADING =====

  queueBatchLoad(request: BatchLoadRequest): void {
    const currentQueue = this.requestQueue.value;
    
    // Check if similar request already exists
    const existing = currentQueue.find(r => 
      JSON.stringify(r.branchIds) === JSON.stringify(request.branchIds) &&
      JSON.stringify(r.dataTypes) === JSON.stringify(request.dataTypes)
    );

    if (!existing) {
      this.requestQueue.next([...currentQueue, request]);
    }
  }

  private processBatchRequests(requests: BatchLoadRequest[]): Observable<any> {
    if (requests.length === 0) return EMPTY;

    console.log(`🔄 Processing ${requests.length} batch requests...`);

    // Group requests by priority
    const highPriority = requests.filter(r => r.priority === 'high');
    const mediumPriority = requests.filter(r => r.priority === 'medium');
    const lowPriority = requests.filter(r => r.priority === 'low');

    // Process high priority first, then others in parallel
    return of(...highPriority).pipe(
      concatMap(request => this.executeBatchRequest(request)),
      switchMap(() => 
        combineLatest([
          ...mediumPriority.map(r => this.executeBatchRequest(r)),
          ...lowPriority.map(r => this.executeBatchRequest(r))
        ]).pipe(
          startWith([])
        )
      ),
      tap(() => {
        // Clear processed requests
        this.requestQueue.next([]);
      })
    );
  }

  private executeBatchRequest(request: BatchLoadRequest): Observable<any> {
    const { branchIds, dataTypes, forceRefresh } = request;
    
    return combineLatest(
      dataTypes.map(dataType => 
        this.loadBranchDataOptimized(dataType, branchIds, forceRefresh)
      )
    ).pipe(
      tap(results => {
        console.log(`✅ Batch request completed for branches [${branchIds.join(', ')}]:`, {
          dataTypes,
          results: results.map(r => ({ success: r.success, recordCount: r.metadata.totalRecords }))
        });
      }),
      catchError(error => {
        console.error('❌ Batch request failed:', error);
        return of([]);
      })
    );
  }

  // ===== LAZY LOADING =====

  setupLazyLoading(config: LazyLoadConfig): Observable<any> {
    let currentPage = 0;
    let isLoading = false;

    return new Observable(observer => {
      const loadNextPage = async () => {
        if (isLoading) return;
        
        isLoading = true;
        const activeBranches = this.stateService.activeBranchIds();
        
        try {
          const result = await this.loadPagedData(activeBranches, currentPage, config.pageSize);
          
          if (result.success) {
            observer.next({
              page: currentPage,
              data: result.data,
              hasMore: result.data.length === config.pageSize
            });
            
            currentPage++;
            
            // Preload next pages if configured
            if (config.preloadNextPages > 0) {
              this.preloadNextPages(activeBranches, currentPage, config);
            }
          }
        } catch (error) {
          observer.error(error);
        } finally {
          isLoading = false;
        }
      };

      // Initial load
      loadNextPage();

      // Return cleanup function
      return () => {
        isLoading = false;
        currentPage = 0;
      };
    });
  }

  private async loadPagedData(branchIds: number[], page: number, pageSize: number): Promise<{ success: boolean; data: any[] }> {
    const params = {
      branchIds: branchIds.join(','),
      page: page.toString(),
      pageSize: pageSize.toString(),
      optimized: 'true'
    };

    try {
      const response = await this.http.get<{ success: boolean; data: any[] }>(
        `${this.baseUrl}/data/paged`,
        { params }
      ).toPromise();

      return response || { success: false, data: [] };
    } catch (error) {
      console.error('❌ Paged data loading failed:', error);
      return { success: false, data: [] };
    }
  }

  private async preloadNextPages(branchIds: number[], startPage: number, config: LazyLoadConfig): Promise<void> {
    for (let i = 0; i < config.preloadNextPages; i++) {
      const page = startPage + i;
      try {
        const result = await this.loadPagedData(branchIds, page, config.pageSize);
        if (result.success) {
          const cacheKey = `paged_${branchIds.join(',')}_${page}`;
          this.setCachedData(cacheKey, result.data, branchIds[0] || 0);
        }
      } catch (error) {
        console.error(`❌ Failed to preload page ${page}:`, error);
        break; // Stop preloading on error
      }
    }
  }

  // ===== CACHE MANAGEMENT =====

  private generateCacheKey(dataType: DataType, branchIds: number[]): string {
    return `${dataType}_${branchIds.sort().join('_')}`;
  }

  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentCacheSize -= entry.size;
      return null;
    }

    entry.hitCount++;
    return entry.data as T;
  }

  private setCachedData<T>(key: string, data: T, branchId: number): void {
    const size = this.estimateDataSize(data);
    
    // Remove old entry if exists
    const existing = this.cache.get(key);
    if (existing) {
      this.currentCacheSize -= existing.size;
    }

    // Check if we have space
    if (this.currentCacheSize + size > this.MAX_CACHE_SIZE) {
      this.evictLeastUsedEntries(size);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      branchId,
      ttl: this.CACHE_TTL,
      size,
      hitCount: 0
    };

    this.cache.set(key, entry);
    this.currentCacheSize += size;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    let freedSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.currentCacheSize -= entry.size;
        cleanedCount++;
        freedSize += entry.size;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleanedCount} expired entries, freed ${Math.round(freedSize / 1024)}KB`);
    }
  }

  private aggressiveCleanup(): void {
    console.log('🧹 Performing aggressive cache cleanup...');
    
    // Sort entries by hit count and age (least used first)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => {
        const ageA = Date.now() - a.timestamp;
        const ageB = Date.now() - b.timestamp;
        const scoreA = a.hitCount / (ageA / 1000); // hits per second
        const scoreB = b.hitCount / (ageB / 1000);
        return scoreA - scoreB; // Lower score = remove first
      });

    // Remove bottom 30% of entries
    const toRemove = Math.floor(entries.length * 0.3);
    for (let i = 0; i < toRemove; i++) {
      const [key, entry] = entries[i];
      this.cache.delete(key);
      this.currentCacheSize -= entry.size;
    }

    console.log(`🧹 Aggressive cleanup: removed ${toRemove} entries`);
  }

  private evictLeastUsedEntries(neededSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.hitCount - b.hitCount);

    let freedSpace = 0;
    let evictedCount = 0;

    for (const [key, entry] of entries) {
      if (freedSpace >= neededSpace) break;
      
      this.cache.delete(key);
      this.currentCacheSize -= entry.size;
      freedSpace += entry.size;
      evictedCount++;
    }

    console.log(`🧹 Evicted ${evictedCount} least used cache entries, freed ${Math.round(freedSpace / 1024)}KB`);
  }

  // ===== PERFORMANCE MONITORING =====

  private recordMetric(
    operationType: PerformanceMetrics['operationType'],
    branchIds: number[],
    executionTime: number,
    dataSize: number
  ): void {
    const metric: PerformanceMetrics = {
      operationId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operationType,
      branchIds: [...branchIds],
      executionTime,
      dataSize,
      timestamp: new Date().toISOString(),
      cacheEfficiency: this.calculateCacheEfficiency()
    };

    this._performanceMetrics.update(metrics => [metric, ...metrics].slice(0, 1000)); // Keep last 1000
  }

  private calculateCacheEfficiency(): number {
    const recent = this._performanceMetrics().slice(0, 100);
    if (recent.length === 0) return 0;

    const cacheHits = recent.filter(m => m.operationType === 'cache_hit').length;
    return (cacheHits / recent.length) * 100;
  }

  private updatePerformanceMetrics(): void {
    const metrics = this._performanceMetrics();
    const recent = metrics.slice(0, 100);
    
    if (recent.length > 0) {
      const avgLoadTime = recent.reduce((sum, m) => sum + m.executionTime, 0) / recent.length;
      const cacheHits = recent.filter(m => m.operationType === 'cache_hit').length;
      const hitRatio = (cacheHits / recent.length) * 100;

      this._averageLoadTime.set(Math.round(avgLoadTime));
      this._cacheHitRatio.set(Math.round(hitRatio));
    }
  }

  private calculatePerformanceGrade(avgTime: number, hitRatio: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    const timeScore = avgTime < 100 ? 100 : avgTime < 300 ? 80 : avgTime < 500 ? 60 : avgTime < 1000 ? 40 : 20;
    const cacheScore = hitRatio * 100;
    const totalScore = (timeScore + cacheScore) / 2;

    if (totalScore >= 90) return 'A';
    if (totalScore >= 80) return 'B';
    if (totalScore >= 70) return 'C';
    if (totalScore >= 60) return 'D';
    return 'F';
  }

  private generatePerformanceRecommendations(avgTime: number, hitRatio: number): string[] {
    const recommendations: string[] = [];

    if (avgTime > 500) {
      recommendations.push('Consider implementing request debouncing');
      recommendations.push('Optimize API queries with proper indexing');
    }

    if (hitRatio < 0.6) {
      recommendations.push('Increase cache TTL for stable data');
      recommendations.push('Implement predictive preloading');
    }

    if (this.currentCacheSize / this.MAX_CACHE_SIZE > 0.8) {
      recommendations.push('Increase cache size limit');
      recommendations.push('Implement smarter cache eviction strategy');
    }

    return recommendations;
  }

  // ===== UTILITY METHODS =====

  private getEndpointForDataType(dataType: DataType): string {
    const endpoints = {
      sales: '/sales/branch-optimized',
      inventory: '/inventory/branch-optimized',
      analytics: '/analytics/branch-optimized',
      notifications: '/notifications/branch-optimized',
      performance: '/performance/branch-optimized'
    };
    return endpoints[dataType] || '/data/generic';
  }

  private estimateDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  private getOldestCacheEntry(): { key: string; age: number } | null {
    let oldest: { key: string; entry: CacheEntry<any> } | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.timestamp < oldest.entry.timestamp) {
        oldest = { key, entry };
      }
    }

    if (!oldest) return null;

    return {
      key: oldest.key,
      age: Date.now() - oldest.entry.timestamp
    };
  }

  private getNewestCacheEntry(): { key: string; age: number } | null {
    let newest: { key: string; entry: CacheEntry<any> } | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!newest || entry.timestamp > newest.entry.timestamp) {
        newest = { key, entry };
      }
    }

    if (!newest) return null;

    return {
      key: newest.key,
      age: Date.now() - newest.entry.timestamp
    };
  }

  // ===== PRELOADING STRATEGIES =====

  private async preloadCriticalData(branchIds: number[]): Promise<void> {
    console.log('🔄 Preloading critical data for branches:', branchIds);

    const criticalDataTypes: DataType[] = ['sales', 'inventory', 'notifications'];
    
    for (const dataType of criticalDataTypes) {
      try {
        await this.loadBranchDataOptimized(dataType, branchIds, false);
      } catch (error) {
        console.error(`❌ Failed to preload ${dataType}:`, error);
      }
    }
  }

  // ===== PUBLIC API =====

  clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
    console.log('🧹 Cache cleared completely');
  }

  invalidateBranchCache(branchId: number): void {
    let removedCount = 0;
    let freedSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.branchId === branchId) {
        this.cache.delete(key);
        this.currentCacheSize -= entry.size;
        removedCount++;
        freedSize += entry.size;
      }
    }

    console.log(`🧹 Invalidated ${removedCount} cache entries for branch ${branchId}, freed ${Math.round(freedSize / 1024)}KB`);
  }

  getPerformanceReport(): {
    cacheStatistics: any;
    performanceInsights: any;
    recommendations: string[];
  } {
    return {
      cacheStatistics: this.cacheStatistics(),
      performanceInsights: this.performanceInsights(),
      recommendations: this.performanceInsights()?.recommendations || []
    };
  }

  enablePerformanceMode(): void {
    console.log('🚀 Enabling high-performance mode...');
    
    // Reduce cache TTL for more frequent updates
    // Increase preloading aggressiveness
    // Enable request batching
    
    this.queueBatchLoad({
      branchIds: this.stateService.activeBranchIds(),
      dataTypes: ['sales', 'inventory', 'analytics'],
      priority: 'high',
      forceRefresh: true
    });
  }
}