// src/app/core/services/smart-analytics-cache.service.ts
// ✅ SMART ANALYTICS CACHE SERVICE: Performance optimization with intelligent caching
// Following Project Guidelines: Signal-based, Performance Optimized, Production Ready

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, timer, merge } from 'rxjs';
import { tap, switchMap, shareReplay, catchError, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environment/environment';

// ===== CACHE INTERFACES =====
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
  hits: number;
  lastAccessed: number;
  compressed?: boolean;
}

export interface CacheConfig {
  defaultTTL: number;
  maxEntries: number;
  compressionThreshold: number; // Compress data larger than this size (bytes)
  cleanupInterval: number; // Milliseconds between cleanup cycles
  enableCompression: boolean;
  enableMetrics: boolean;
}

export interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage: number; // Estimated bytes
  averageResponseTime: number;
  lastCleanup: number;
}

export interface CacheStrategy {
  key: string;
  ttl: number;
  refreshThreshold?: number; // Refresh when TTL remaining < threshold
  backgroundRefresh?: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

@Injectable({ providedIn: 'root' })
export class SmartAnalyticsCacheService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly activeRequests = new Map<string, Observable<any>>();
  private cleanupTimer: any;
  
  // ===== CACHE CONFIGURATION =====
  private readonly config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes default
    maxEntries: 1000,
    compressionThreshold: 50 * 1024, // 50KB
    cleanupInterval: 10 * 60 * 1000, // 10 minutes
    enableCompression: true,
    enableMetrics: true
  };

  // ===== CACHE STRATEGIES FOR DIFFERENT DATA TYPES =====
  private readonly strategies: Record<string, CacheStrategy> = {
    // Expiry Analytics - High priority, frequent updates
    'expiry-analytics': {
      key: 'expiry-analytics',
      ttl: 5 * 60 * 1000, // 5 minutes
      refreshThreshold: 2 * 60 * 1000, // Refresh when 2min remaining
      backgroundRefresh: true,
      priority: 'HIGH'
    },
    
    // FIFO Recommendations - Medium priority, moderate updates
    'fifo-recommendations': {
      key: 'fifo-recommendations',
      ttl: 10 * 60 * 1000, // 10 minutes
      refreshThreshold: 3 * 60 * 1000,
      backgroundRefresh: true,
      priority: 'MEDIUM'
    },
    
    // Category Analytics - Lower priority, slower updates
    'category-analytics': {
      key: 'category-analytics',
      ttl: 15 * 60 * 1000, // 15 minutes
      refreshThreshold: 5 * 60 * 1000,
      backgroundRefresh: false,
      priority: 'MEDIUM'
    },
    
    // Branch Analytics - Low priority, infrequent updates
    'branch-analytics': {
      key: 'branch-analytics',
      ttl: 30 * 60 * 1000, // 30 minutes
      refreshThreshold: 10 * 60 * 1000,
      backgroundRefresh: false,
      priority: 'LOW'
    },
    
    // Smart Notifications - Critical priority, real-time updates
    'smart-notifications': {
      key: 'smart-notifications',
      ttl: 2 * 60 * 1000, // 2 minutes
      refreshThreshold: 30 * 1000, // 30 seconds
      backgroundRefresh: true,
      priority: 'CRITICAL'
    },
    
    // Transfer Opportunities - Medium priority, business hours updates
    'transfer-opportunities': {
      key: 'transfer-opportunities',
      ttl: 20 * 60 * 1000, // 20 minutes
      refreshThreshold: 5 * 60 * 1000,
      backgroundRefresh: true,
      priority: 'MEDIUM'
    },
    
    // Dashboard Metrics - High priority for operational visibility
    'dashboard-metrics': {
      key: 'dashboard-metrics',
      ttl: 3 * 60 * 1000, // 3 minutes
      refreshThreshold: 1 * 60 * 1000,
      backgroundRefresh: true,
      priority: 'HIGH'
    }
  };

  // ===== STATE SIGNALS =====
  private _metrics = signal<CacheMetrics>({
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    totalEntries: 0,
    memoryUsage: 0,
    averageResponseTime: 0,
    lastCleanup: 0
  });

  private _cacheStatus = signal<'HEALTHY' | 'WARNING' | 'CRITICAL'>('HEALTHY');
  
  // ===== PUBLIC READONLY SIGNALS =====
  readonly metrics = this._metrics.asReadonly();
  readonly cacheStatus = this._cacheStatus.asReadonly();
  
  // ===== COMPUTED PROPERTIES =====
  readonly hitRate = computed(() => {
    const metrics = this._metrics();
    return metrics.totalRequests > 0 
      ? (metrics.cacheHits / metrics.totalRequests) * 100 
      : 0;
  });

  readonly memoryUsageMB = computed(() => {
    return (this._metrics().memoryUsage / (1024 * 1024));
  });

  readonly cacheHealth = computed(() => {
    const hitRate = this.hitRate();
    const memoryUsage = this.memoryUsageMB();
    const totalEntries = this._metrics().totalEntries;

    if (hitRate < 30 || memoryUsage > 100 || totalEntries > this.config.maxEntries * 0.9) {
      return 'CRITICAL';
    }
    
    if (hitRate < 60 || memoryUsage > 50 || totalEntries > this.config.maxEntries * 0.7) {
      return 'WARNING';
    }
    
    return 'HEALTHY';
  });

  constructor() {
    console.log('🚀 Smart Analytics Cache Service initialized');
    this.startCleanupTimer();
    this.updateCacheStatus();
  }

  // ===== MAIN CACHE METHODS =====
  
  /**
   * Get data from cache or fetch from API with intelligent strategies
   */
  get<T>(key: string, apiCall: () => Observable<T>, customStrategy?: Partial<CacheStrategy>): Observable<T> {
    const strategy = this.getStrategy(key, customStrategy);
    const cacheKey = this.buildCacheKey(key);
    
    // Increment total requests
    this.incrementMetric('totalRequests');
    
    // Check if data exists and is valid
    const cached = this.getCachedData<T>(cacheKey, strategy);
    if (cached) {
      this.incrementMetric('cacheHits');
      
      // Background refresh if needed
      if (strategy.backgroundRefresh && this.shouldBackgroundRefresh(cached, strategy)) {
        this.backgroundRefresh(cacheKey, apiCall, strategy);
      }
      
      return of(cached.data);
    }

    // Cache miss - fetch from API
    this.incrementMetric('cacheMisses');
    return this.fetchAndCache(cacheKey, apiCall, strategy);
  }

  /**
   * Set data directly in cache
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    const strategy = this.getStrategy(key);
    const cacheKey = this.buildCacheKey(key);
    const ttl = customTTL || strategy.ttl;
    
    this.storeInCache(cacheKey, data, ttl);
    this.updateMetrics();
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    const cacheKey = this.buildCacheKey(key);
    
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
      console.log(`🗑️ Cache invalidated: ${cacheKey}`);
      this.updateMetrics();
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    const entriesCount = this.cache.size;
    this.cache.clear();
    this.activeRequests.clear();
    
    console.log(`🧹 Cache cleared: ${entriesCount} entries removed`);
    this.updateMetrics();
  }

  /**
   * Preload critical data during app initialization
   */
  preloadCriticalData(): Observable<any> {
    const criticalKeys = Object.keys(this.strategies)
      .filter(key => this.strategies[key].priority === 'CRITICAL' || this.strategies[key].priority === 'HIGH');
    
    console.log('🚀 Preloading critical analytics data:', criticalKeys);
    
    const preloadObservables = criticalKeys.map(key => 
      this.get(key, () => this.createApiCall(key)).pipe(
        catchError(error => {
          console.warn(`⚠️ Failed to preload ${key}:`, error);
          return of(null);
        })
      )
    );

    return merge(...preloadObservables).pipe(
      shareReplay(1)
    );
  }

  // ===== PRIVATE HELPER METHODS =====

  private getCachedData<T>(cacheKey: string, strategy: CacheStrategy): CacheEntry<T> | null {
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    
    const now = Date.now();
    const isExpired = (now - entry.timestamp) > strategy.ttl;
    
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    // Update access tracking
    entry.hits++;
    entry.lastAccessed = now;
    
    return entry as CacheEntry<T>;
  }

  private fetchAndCache<T>(cacheKey: string, apiCall: () => Observable<T>, strategy: CacheStrategy): Observable<T> {
    // Prevent duplicate requests
    if (this.activeRequests.has(cacheKey)) {
      return this.activeRequests.get(cacheKey)!;
    }

    const startTime = Date.now();
    const request$ = apiCall().pipe(
      tap(data => {
        const responseTime = Date.now() - startTime;
        this.storeInCache(cacheKey, data, strategy.ttl);
        this.updateAverageResponseTime(responseTime);
        this.activeRequests.delete(cacheKey);
      }),
      catchError(error => {
        this.activeRequests.delete(cacheKey);
        throw error;
      }),
      shareReplay(1)
    );

    this.activeRequests.set(cacheKey, request$);
    return request$;
  }

  private backgroundRefresh<T>(cacheKey: string, apiCall: () => Observable<T>, strategy: CacheStrategy): void {
    console.log(`🔄 Background refresh triggered for: ${cacheKey}`);
    
    apiCall().subscribe({
      next: (data) => {
        this.storeInCache(cacheKey, data, strategy.ttl);
        console.log(`✅ Background refresh completed: ${cacheKey}`);
      },
      error: (error) => {
        console.warn(`⚠️ Background refresh failed for ${cacheKey}:`, error);
      }
    });
  }

  private shouldBackgroundRefresh(entry: CacheEntry, strategy: CacheStrategy): boolean {
    if (!strategy.backgroundRefresh || !strategy.refreshThreshold) return false;
    
    const now = Date.now();
    const age = now - entry.timestamp;
    const remainingTTL = strategy.ttl - age;
    
    return remainingTTL < strategy.refreshThreshold;
  }

  private storeInCache<T>(cacheKey: string, data: T, ttl: number): void {
    // Enforce cache size limits
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    const now = Date.now();
    let processedData = data;
    let compressed = false;

    // Compress large data if enabled
    if (this.config.enableCompression) {
      const dataSize = this.estimateObjectSize(data);
      if (dataSize > this.config.compressionThreshold) {
        try {
          processedData = this.compressData(data);
          compressed = true;
          console.log(`🗜️ Data compressed for ${cacheKey}: ${dataSize} bytes`);
        } catch (error) {
          console.warn('Compression failed:', error);
        }
      }
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: now,
      ttl,
      key: cacheKey,
      hits: 0,
      lastAccessed: now,
      compressed
    };

    this.cache.set(cacheKey, entry);
    this.updateMetrics();
  }

  private evictLeastRecentlyUsed(): void {
    let oldestEntry: [string, CacheEntry] | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestEntry = [key, entry];
      }
    }

    if (oldestEntry) {
      this.cache.delete(oldestEntry[0]);
      console.log(`🗑️ Evicted LRU entry: ${oldestEntry[0]}`);
    }
  }

  private getStrategy(key: string, customStrategy?: Partial<CacheStrategy>): CacheStrategy {
    const baseStrategy = this.strategies[key] || {
      key,
      ttl: this.config.defaultTTL,
      priority: 'LOW'
    };

    return { ...baseStrategy, ...customStrategy };
  }

  private buildCacheKey(key: string): string {
    return `smart-analytics:${key}`;
  }

  private createApiCall(key: string): Observable<any> {
    // Create appropriate API calls based on key
    const apiEndpoints: Record<string, string> = {
      'expiry-analytics': `${environment.apiUrl}/ExpiryManagement/comprehensive-analytics`,
      'fifo-recommendations': `${environment.apiUrl}/ExpiryManagement/smart-fifo-recommendations`,
      'category-analytics': `${environment.apiUrl}/Analytics/category-performance`,
      'branch-analytics': `${environment.apiUrl}/Analytics/branch-comparison`,
      'smart-notifications': `${environment.apiUrl}/SmartNotifications/dashboard-summary`,
      'transfer-opportunities': `${environment.apiUrl}/MultiBranch/transfer-opportunities`,
      'dashboard-metrics': `${environment.apiUrl}/Dashboard/smart-metrics`
    };

    const endpoint = apiEndpoints[key];
    if (!endpoint) {
      throw new Error(`No API endpoint configured for key: ${key}`);
    }

    return this.http.get(endpoint);
  }

  // ===== METRICS & MONITORING =====

  private incrementMetric(metric: keyof CacheMetrics): void {
    if (!this.config.enableMetrics) return;

    this._metrics.update(current => ({
      ...current,
      [metric]: current[metric] + 1
    }));
  }

  private updateMetrics(): void {
    if (!this.config.enableMetrics) return;

    const totalEntries = this.cache.size;
    const memoryUsage = this.calculateMemoryUsage();
    const metrics = this._metrics();
    
    const hitRate = metrics.totalRequests > 0 
      ? (metrics.cacheHits / metrics.totalRequests) * 100 
      : 0;

    this._metrics.update(current => ({
      ...current,
      hitRate,
      totalEntries,
      memoryUsage
    }));

    this.updateCacheStatus();
  }

  private updateAverageResponseTime(responseTime: number): void {
    this._metrics.update(current => {
      const totalRequests = current.totalRequests;
      const currentAvg = current.averageResponseTime;
      const newAvg = totalRequests > 1 
        ? ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests
        : responseTime;

      return {
        ...current,
        averageResponseTime: newAvg
      };
    });
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += this.estimateObjectSize(entry);
    }
    
    return totalSize;
  }

  private estimateObjectSize(obj: any): number {
    // Rough estimation of object size in bytes
    return JSON.stringify(obj).length * 2; // Assuming 2 bytes per character
  }

  private updateCacheStatus(): void {
    this._cacheStatus.set(this.cacheHealth());
  }

  // ===== CLEANUP & MAINTENANCE =====

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  private performCleanup(): void {
    const now = Date.now();
    let cleanedEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        cleanedEntries++;
      }
    }

    if (cleanedEntries > 0) {
      console.log(`🧹 Cache cleanup: ${cleanedEntries} expired entries removed`);
      this.updateMetrics();
    }

    this._metrics.update(current => ({
      ...current,
      lastCleanup: now
    }));
  }

  // ===== COMPRESSION UTILITIES =====

  private compressData<T>(data: T): T {
    // Simple compression simulation
    // In production, use actual compression library like lz-string
    try {
      const jsonString = JSON.stringify(data);
      const compressed = btoa(jsonString); // Base64 encoding as simple compression
      return JSON.parse(atob(compressed));
    } catch (error) {
      console.warn('Data compression failed:', error);
      return data;
    }
  }

  private decompressData<T>(compressedData: T): T {
    // Simple decompression
    return compressedData; // For now, return as-is
  }

  // ===== CLEANUP ON DESTROY =====

  ngOnDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cache.clear();
    this.activeRequests.clear();
    console.log('🛑 Smart Analytics Cache Service destroyed');
  }

  // ===== DEBUG & MONITORING METHODS =====

  getCacheSnapshot(): any {
    return {
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        hits: entry.hits,
        size: this.estimateObjectSize(entry.data),
        compressed: entry.compressed || false
      })),
      metrics: this._metrics(),
      status: this._cacheStatus(),
      config: this.config
    };
  }

  logCacheStatus(): void {
    console.group('📊 Smart Analytics Cache Status');
    console.table(this.getCacheSnapshot().entries);
    console.log('Metrics:', this._metrics());
    console.log('Health:', this.cacheHealth());
    console.groupEnd();
  }
}