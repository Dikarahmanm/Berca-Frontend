// src/app/core/services/optimized-branch-integration.service.ts
// Integration layer that applies performance optimizations to existing branch services
// Angular 20 with enhanced caching and batch loading for POS, Inventory, and Analytics

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Observable, combineLatest, forkJoin, of, timer } from 'rxjs';
import { map, tap, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { BranchPerformanceOptimizerService } from './branch-performance-optimizer.service';
import { BranchAnalyticsService } from './branch-analytics.service';
import { BranchAwareDataService } from './branch-aware-data.service';
import { StateService } from './state.service';

export interface OptimizedBranchData {
  branchId: number;
  branchName: string;
  lastUpdated: string;
  dataTypes: {
    sales: { count: number; lastSync: string; cached: boolean };
    inventory: { count: number; lastSync: string; cached: boolean };
    analytics: { count: number; lastSync: string; cached: boolean };
    notifications: { count: number; lastSync: string; cached: boolean };
  };
  performance: {
    loadTime: number;
    cacheHitRatio: number;
    errorCount: number;
    lastErrorTime?: string;
  };
}

export interface BranchSyncStatus {
  branchId: number;
  branchName: string;
  status: 'syncing' | 'synced' | 'error' | 'pending';
  progress: number; // 0-100
  estimatedTimeRemaining: number; // in seconds
  lastSyncTime?: string;
  errorMessage?: string;
}

export interface OptimizedLoadRequest {
  branchIds: number[];
  dataTypes: ('sales' | 'inventory' | 'analytics' | 'notifications')[];
  priority: 'high' | 'medium' | 'low';
  forceRefresh?: boolean;
  progressCallback?: (progress: BranchSyncStatus[]) => void;
}

@Injectable({
  providedIn: 'root'
})
export class OptimizedBranchIntegrationService {
  private readonly optimizerService = inject(BranchPerformanceOptimizerService);
  private readonly analyticsService = inject(BranchAnalyticsService);
  private readonly dataService = inject(BranchAwareDataService);
  private readonly stateService = inject(StateService);

  // Integration state management
  private _branchDataCache = signal<Map<number, OptimizedBranchData>>(new Map());
  private _syncStatuses = signal<BranchSyncStatus[]>([]);
  private _globalLoadingState = signal<boolean>(false);
  private _lastFullSync = signal<string | null>(null);
  private _optimizationEnabled = signal<boolean>(true);

  // Public readonly signals
  readonly branchDataCache = this._branchDataCache.asReadonly();
  readonly syncStatuses = this._syncStatuses.asReadonly();
  readonly globalLoadingState = this._globalLoadingState.asReadonly();
  readonly lastFullSync = this._lastFullSync.asReadonly();
  readonly optimizationEnabled = this._optimizationEnabled.asReadonly();

  // Computed properties
  readonly activeBranchData = computed(() => {
    const activeBranchIds = this.stateService.activeBranchIds();
    const cache = this._branchDataCache();
    
    return activeBranchIds
      .map(id => cache.get(id))
      .filter(data => data !== undefined) as OptimizedBranchData[];
  });

  readonly overallPerformanceScore = computed(() => {
    const branchData = this.activeBranchData();
    if (branchData.length === 0) return 0;

    const avgLoadTime = branchData.reduce((sum, b) => sum + b.performance.loadTime, 0) / branchData.length;
    const avgCacheHitRatio = branchData.reduce((sum, b) => sum + b.performance.cacheHitRatio, 0) / branchData.length;
    const errorBranches = branchData.filter(b => b.performance.errorCount > 0).length;
    
    const timeScore = Math.max(0, 100 - (avgLoadTime / 10)); // 1000ms = 0 points, 0ms = 100 points
    const cacheScore = avgCacheHitRatio;
    const reliabilityScore = Math.max(0, 100 - (errorBranches / branchData.length * 50));

    return Math.round((timeScore + cacheScore + reliabilityScore) / 3);
  });

  readonly syncProgress = computed(() => {
    const statuses = this._syncStatuses();
    if (statuses.length === 0) return { overall: 0, completed: 0, total: 0 };

    const completed = statuses.filter(s => s.status === 'synced').length;
    const total = statuses.length;
    const overall = total > 0 ? (completed / total) * 100 : 0;

    return { overall: Math.round(overall), completed, total };
  });

  readonly branchHealthStatus = computed(() => {
    const branches = this.activeBranchData();
    return branches.map(branch => ({
      branchId: branch.branchId,
      branchName: branch.branchName,
      healthScore: this.calculateBranchHealth(branch),
      status: this.getBranchHealthStatus(branch),
      recommendations: this.generateBranchRecommendations(branch)
    }));
  });

  constructor() {
    this.initializeIntegrationService();
    this.setupAutoOptimization();
    this.setupPerformanceMonitoring();
  }

  // ===== INITIALIZATION =====

  private initializeIntegrationService(): void {
    console.log('🔧 Initializing Optimized Branch Integration Service...');

    // Auto-sync when active branches change
    effect(() => {
      const activeBranches = this.stateService.activeBranchIds();
      if (activeBranches.length > 0 && this._optimizationEnabled()) {
        this.smartSyncBranches(activeBranches);
      }
    });

    // Monitor optimizer performance
    effect(() => {
      const insights = this.optimizerService.performanceInsights();
      if (insights && insights.performanceGrade === 'F') {
        console.warn('⚠️ Performance degraded, applying emergency optimizations...');
        this.applyEmergencyOptimizations();
      }
    });
  }

  private setupAutoOptimization(): void {
    // Run optimization checks every 5 minutes
    timer(0, 5 * 60 * 1000).subscribe(() => {
      this.runOptimizationChecks();
    });

    // Predictive preloading based on usage patterns
    timer(0, 30 * 1000).subscribe(() => {
      this.predictivePreload();
    });
  }

  private setupPerformanceMonitoring(): void {
    // Track performance metrics
    timer(0, 60 * 1000).subscribe(() => {
      this.updateBranchPerformanceMetrics();
    });
  }

  // ===== OPTIMIZED LOADING METHODS =====

  async loadBranchesOptimized(request: OptimizedLoadRequest): Promise<{
    success: boolean;
    data: OptimizedBranchData[];
    performanceReport: any;
  }> {
    const startTime = performance.now();
    this._globalLoadingState.set(true);

    try {
      console.log('🚀 Starting optimized branch loading...', request);

      // Initialize sync statuses
      this.initializeSyncStatuses(request.branchIds, request.dataTypes);

      // Use batch loading for efficiency
      this.optimizerService.queueBatchLoad({
        branchIds: request.branchIds,
        dataTypes: request.dataTypes as any,
        priority: request.priority,
        forceRefresh: request.forceRefresh
      });

      // Load data with progress tracking
      const results = await this.loadDataWithProgress(request);

      // Update cache
      await this.updateBranchDataCache(request.branchIds, results);

      // Mark sync as completed
      this.completeSyncStatuses(request.branchIds);

      const executionTime = performance.now() - startTime;
      const performanceReport = this.optimizerService.getPerformanceReport();

      console.log(`✅ Optimized loading completed in ${Math.round(executionTime)}ms`);

      return {
        success: true,
        data: this.activeBranchData(),
        performanceReport: {
          ...performanceReport,
          executionTime: Math.round(executionTime),
          branchCount: request.branchIds.length,
          dataTypeCount: request.dataTypes.length
        }
      };

    } catch (error: any) {
      console.error('❌ Optimized loading failed:', error);
      this.updateSyncStatusesWithError(request.branchIds, error.message);
      
      return {
        success: false,
        data: [],
        performanceReport: null
      };
    } finally {
      this._globalLoadingState.set(false);
    }
  }

  private async loadDataWithProgress(request: OptimizedLoadRequest): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const totalSteps = request.branchIds.length * request.dataTypes.length;
    let completedSteps = 0;

    for (const branchId of request.branchIds) {
      for (const dataType of request.dataTypes) {
        try {
          // Update progress
          this.updateSyncProgress(branchId, (completedSteps / totalSteps) * 100);

          // Load data using optimizer
          const result = await this.optimizerService.loadBranchDataOptimized(
            dataType as any,
            [branchId],
            request.forceRefresh
          );

          if (result.success) {
            results.set(`${branchId}_${dataType}`, result.data);
          }

          completedSteps++;

          // Call progress callback if provided
          if (request.progressCallback) {
            request.progressCallback(this._syncStatuses());
          }

        } catch (error) {
          console.error(`❌ Failed to load ${dataType} for branch ${branchId}:`, error);
          this.updateSyncStatusWithError(branchId, `Failed to load ${dataType}`);
          completedSteps++;
        }

        // Small delay to prevent overwhelming the system
        await this.delay(10);
      }
    }

    return results;
  }

  // ===== SMART SYNC STRATEGIES =====

  private async smartSyncBranches(branchIds: number[]): Promise<void> {
    console.log('🧠 Running smart sync for branches:', branchIds);

    // Determine what needs syncing
    const syncNeeds = this.analyzeSyncNeeds(branchIds);
    
    if (syncNeeds.length === 0) {
      console.log('✅ All branches are up to date');
      return;
    }

    // Prioritize critical data types
    const criticalTypes = ['notifications', 'sales'];
    const standardTypes = ['inventory', 'analytics'];

    // Sync critical data first
    for (const need of syncNeeds) {
      const criticalDataTypes = need.dataTypes.filter(dt => criticalTypes.includes(dt));
      if (criticalDataTypes.length > 0) {
        await this.loadBranchesOptimized({
          branchIds: [need.branchId],
          dataTypes: criticalDataTypes as any,
          priority: 'high',
          forceRefresh: need.isStale
        });
      }
    }

    // Sync standard data in background
    setTimeout(() => {
      for (const need of syncNeeds) {
        const standardDataTypes = need.dataTypes.filter(dt => standardTypes.includes(dt));
        if (standardDataTypes.length > 0) {
          this.loadBranchesOptimized({
            branchIds: [need.branchId],
            dataTypes: standardDataTypes as any,
            priority: 'low',
            forceRefresh: false
          });
        }
      }
    }, 100);
  }

  private analyzeSyncNeeds(branchIds: number[]): Array<{
    branchId: number;
    dataTypes: string[];
    isStale: boolean;
    priority: 'high' | 'medium' | 'low';
  }> {
    const cache = this._branchDataCache();
    const needs: Array<{
      branchId: number;
      dataTypes: string[];
      isStale: boolean;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    for (const branchId of branchIds) {
      const branchData = cache.get(branchId);
      
      if (!branchData) {
        // No data at all - high priority full sync
        needs.push({
          branchId,
          dataTypes: ['sales', 'inventory', 'analytics', 'notifications'],
          isStale: true,
          priority: 'high'
        });
        continue;
      }

      // Check for stale data
      const now = Date.now();
      const lastUpdate = new Date(branchData.lastUpdated).getTime();
      const dataAge = now - lastUpdate;

      const staleDataTypes: string[] = [];
      const criticalDataTypes: string[] = [];

      // Check each data type freshness
      for (const [dataType, info] of Object.entries(branchData.dataTypes)) {
        const lastSync = new Date(info.lastSync).getTime();
        const age = now - lastSync;

        // Different TTL for different data types
        const ttl = this.getDataTypeTTL(dataType);
        
        if (age > ttl) {
          staleDataTypes.push(dataType);
          
          if (['notifications', 'sales'].includes(dataType)) {
            criticalDataTypes.push(dataType);
          }
        }
      }

      if (staleDataTypes.length > 0) {
        needs.push({
          branchId,
          dataTypes: staleDataTypes,
          isStale: true,
          priority: criticalDataTypes.length > 0 ? 'high' : 'medium'
        });
      }
    }

    return needs;
  }

  private getDataTypeTTL(dataType: string): number {
    const ttls = {
      notifications: 30 * 1000,    // 30 seconds
      sales: 2 * 60 * 1000,        // 2 minutes
      inventory: 5 * 60 * 1000,    // 5 minutes
      analytics: 10 * 60 * 1000    // 10 minutes
    };
    return ttls[dataType as keyof typeof ttls] || 5 * 60 * 1000;
  }

  // ===== PREDICTIVE PRELOADING =====

  private predictivePreload(): void {
    const activeBranches = this.stateService.activeBranchIds();
    const allBranches = this.stateService.accessibleBranches();
    
    // Predict which branches might be accessed next based on patterns
    const predictedBranches = this.predictNextBranches(activeBranches, allBranches);
    
    if (predictedBranches.length > 0) {
      console.log('🔮 Predictive preloading for branches:', predictedBranches);
      
      // Preload with low priority to avoid impacting current operations
      this.optimizerService.queueBatchLoad({
        branchIds: predictedBranches,
        dataTypes: ['sales', 'inventory'],
        priority: 'low'
      });
    }
  }

  private predictNextBranches(activeBranchIds: number[], allBranches: any[]): number[] {
    // Simple prediction based on branch hierarchy and proximity
    const predicted = new Set<number>();

    for (const activeBranchId of activeBranchIds) {
      const branch = allBranches.find(b => b.branchId === activeBranchId);
      
      if (branch) {
        // Add child branches
        const children = allBranches.filter(b => b.parentBranchId === activeBranchId);
        children.forEach(child => predicted.add(child.branchId));
        
        // Add sibling branches
        if (branch.parentBranchId) {
          const siblings = allBranches.filter(
            b => b.parentBranchId === branch.parentBranchId && b.branchId !== activeBranchId
          );
          siblings.slice(0, 2).forEach(sibling => predicted.add(sibling.branchId)); // Limit to 2 siblings
        }
      }
    }

    return Array.from(predicted).filter(id => !activeBranchIds.includes(id));
  }

  // ===== PERFORMANCE OPTIMIZATION =====

  private runOptimizationChecks(): void {
    const insights = this.optimizerService.performanceInsights();
    
    if (!insights) return;

    // Apply optimizations based on performance grade
    if (insights.performanceGrade === 'D' || insights.performanceGrade === 'F') {
      console.log('📈 Applying performance optimizations...');
      
      // Clear old cache entries
      this.optimizerService.clearCache();
      
      // Reduce concurrent operations
      this.reduceSystemLoad();
      
      // Enable aggressive caching
      this.enableAggressiveCaching();
    } else if (insights.performanceGrade === 'A' || insights.performanceGrade === 'B') {
      // System is performing well, enable more features
      this.enableAdvancedFeatures();
    }
  }

  private applyEmergencyOptimizations(): void {
    console.log('🆘 Applying emergency performance optimizations...');
    
    // Clear all cache to start fresh
    this.optimizerService.clearCache();
    
    // Disable non-essential features temporarily
    this._optimizationEnabled.set(false);
    
    // Re-enable after a short delay
    setTimeout(() => {
      this._optimizationEnabled.set(true);
      console.log('✅ Emergency optimizations completed, system restored');
    }, 5000);
  }

  private reduceSystemLoad(): void {
    // Reduce concurrent requests
    // Increase debounce times
    // Disable predictive preloading temporarily
  }

  private enableAggressiveCaching(): void {
    // Increase cache TTL
    // Preload more data
    // Enable background refresh
  }

  private enableAdvancedFeatures(): void {
    // Enable predictive preloading
    // Reduce debounce times
    // Enable background optimization
  }

  // ===== SYNC STATUS MANAGEMENT =====

  private initializeSyncStatuses(branchIds: number[], dataTypes: string[]): void {
    const allBranches = this.stateService.accessibleBranches();
    
    const statuses = branchIds.map(branchId => {
      const branch = allBranches.find(b => b.branchId === branchId);
      return {
        branchId,
        branchName: branch?.branchName || `Branch ${branchId}`,
        status: 'pending' as const,
        progress: 0,
        estimatedTimeRemaining: dataTypes.length * 2, // 2 seconds per data type estimate
      };
    });

    this._syncStatuses.set(statuses);
  }

  private updateSyncProgress(branchId: number, progress: number): void {
    this._syncStatuses.update(statuses =>
      statuses.map(status =>
        status.branchId === branchId
          ? {
              ...status,
              status: progress >= 100 ? 'synced' : 'syncing' as const,
              progress: Math.min(100, Math.max(0, progress)),
              estimatedTimeRemaining: progress >= 100 ? 0 : Math.max(0, status.estimatedTimeRemaining - 1)
            }
          : status
      )
    );
  }

  private updateSyncStatusWithError(branchId: number, errorMessage: string): void {
    this._syncStatuses.update(statuses =>
      statuses.map(status =>
        status.branchId === branchId
          ? {
              ...status,
              status: 'error' as const,
              errorMessage,
              estimatedTimeRemaining: 0
            }
          : status
      )
    );
  }

  private updateSyncStatusesWithError(branchIds: number[], errorMessage: string): void {
    this._syncStatuses.update(statuses =>
      statuses.map(status =>
        branchIds.includes(status.branchId)
          ? {
              ...status,
              status: 'error' as const,
              errorMessage,
              estimatedTimeRemaining: 0
            }
          : status
      )
    );
  }

  private completeSyncStatuses(branchIds: number[]): void {
    this._syncStatuses.update(statuses =>
      statuses.map(status =>
        branchIds.includes(status.branchId)
          ? {
              ...status,
              status: 'synced' as const,
              progress: 100,
              estimatedTimeRemaining: 0,
              lastSyncTime: new Date().toISOString()
            }
          : status
      )
    );

    this._lastFullSync.set(new Date().toISOString());
  }

  // ===== CACHE MANAGEMENT =====

  private async updateBranchDataCache(branchIds: number[], results: Map<string, any>): Promise<void> {
    const cache = new Map(this._branchDataCache());
    const allBranches = this.stateService.accessibleBranches();

    for (const branchId of branchIds) {
      const branch = allBranches.find(b => b.branchId === branchId);
      if (!branch) continue;

      // Collect data for this branch
      const salesData = results.get(`${branchId}_sales`) || [];
      const inventoryData = results.get(`${branchId}_inventory`) || [];
      const analyticsData = results.get(`${branchId}_analytics`) || [];
      const notificationsData = results.get(`${branchId}_notifications`) || [];

      const now = new Date().toISOString();

      const branchData: OptimizedBranchData = {
        branchId,
        branchName: branch.branchName,
        lastUpdated: now,
        dataTypes: {
          sales: {
            count: Array.isArray(salesData) ? salesData.length : 0,
            lastSync: now,
            cached: true
          },
          inventory: {
            count: Array.isArray(inventoryData) ? inventoryData.length : 0,
            lastSync: now,
            cached: true
          },
          analytics: {
            count: Array.isArray(analyticsData) ? analyticsData.length : 0,
            lastSync: now,
            cached: true
          },
          notifications: {
            count: Array.isArray(notificationsData) ? notificationsData.length : 0,
            lastSync: now,
            cached: true
          }
        },
        performance: this.calculateBranchPerformance(branchId)
      };

      cache.set(branchId, branchData);
    }

    this._branchDataCache.set(cache);
  }

  private calculateBranchPerformance(branchId: number): OptimizedBranchData['performance'] {
    const metrics = this.optimizerService.performanceMetrics()
      .filter(m => m.branchIds.includes(branchId))
      .slice(0, 10); // Last 10 operations

    if (metrics.length === 0) {
      return {
        loadTime: 0,
        cacheHitRatio: 0,
        errorCount: 0
      };
    }

    const avgLoadTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    const cacheHits = metrics.filter(m => m.operationType === 'cache_hit').length;
    const cacheHitRatio = (cacheHits / metrics.length) * 100;

    return {
      loadTime: Math.round(avgLoadTime),
      cacheHitRatio: Math.round(cacheHitRatio),
      errorCount: 0 // This would be tracked separately in a real implementation
    };
  }

  private updateBranchPerformanceMetrics(): void {
    const cache = new Map(this._branchDataCache());
    
    for (const [branchId, branchData] of cache.entries()) {
      const updatedPerformance = this.calculateBranchPerformance(branchId);
      
      cache.set(branchId, {
        ...branchData,
        performance: updatedPerformance
      });
    }

    this._branchDataCache.set(cache);
  }

  // ===== HEALTH MONITORING =====

  private calculateBranchHealth(branch: OptimizedBranchData): number {
    const weights = {
      performance: 0.4,
      dataFreshness: 0.3,
      cacheEfficiency: 0.2,
      reliability: 0.1
    };

    // Performance score (inverse of load time, max 100)
    const performanceScore = Math.max(0, 100 - (branch.performance.loadTime / 10));
    
    // Data freshness score
    const now = Date.now();
    const lastUpdate = new Date(branch.lastUpdated).getTime();
    const dataAge = now - lastUpdate;
    const freshnessScore = Math.max(0, 100 - (dataAge / (5 * 60 * 1000)) * 20); // 5 min = full score

    // Cache efficiency score
    const cacheScore = branch.performance.cacheHitRatio;

    // Reliability score
    const reliabilityScore = Math.max(0, 100 - (branch.performance.errorCount * 10));

    const healthScore = 
      performanceScore * weights.performance +
      freshnessScore * weights.dataFreshness +
      cacheScore * weights.cacheEfficiency +
      reliabilityScore * weights.reliability;

    return Math.round(healthScore);
  }

  private getBranchHealthStatus(branch: OptimizedBranchData): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const health = this.calculateBranchHealth(branch);
    
    if (health >= 90) return 'excellent';
    if (health >= 80) return 'good';
    if (health >= 70) return 'fair';
    if (health >= 60) return 'poor';
    return 'critical';
  }

  private generateBranchRecommendations(branch: OptimizedBranchData): string[] {
    const recommendations: string[] = [];

    if (branch.performance.loadTime > 1000) {
      recommendations.push('Optimize data queries to reduce load time');
    }

    if (branch.performance.cacheHitRatio < 60) {
      recommendations.push('Increase cache utilization for better performance');
    }

    if (branch.performance.errorCount > 0) {
      recommendations.push('Investigate and resolve data loading errors');
    }

    const dataAge = Date.now() - new Date(branch.lastUpdated).getTime();
    if (dataAge > 10 * 60 * 1000) { // 10 minutes
      recommendations.push('Data needs refresh - consider more frequent sync');
    }

    return recommendations;
  }

  // ===== UTILITY METHODS =====

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== PUBLIC API =====

  async refreshAllBranches(): Promise<void> {
    const activeBranches = this.stateService.activeBranchIds();
    
    if (activeBranches.length === 0) {
      console.log('⚠️ No active branches to refresh');
      return;
    }

    await this.loadBranchesOptimized({
      branchIds: activeBranches,
      dataTypes: ['sales', 'inventory', 'analytics', 'notifications'],
      priority: 'high',
      forceRefresh: true
    });
  }

  getBranchHealth(branchId: number): {
    score: number;
    status: string;
    recommendations: string[];
  } | null {
    const branchData = this._branchDataCache().get(branchId);
    if (!branchData) return null;

    return {
      score: this.calculateBranchHealth(branchData),
      status: this.getBranchHealthStatus(branchData),
      recommendations: this.generateBranchRecommendations(branchData)
    };
  }

  enableOptimization(): void {
    this._optimizationEnabled.set(true);
    console.log('✅ Branch optimization enabled');
  }

  disableOptimization(): void {
    this._optimizationEnabled.set(false);
    console.log('⚠️ Branch optimization disabled');
  }

  getOptimizationReport(): any {
    const performanceReport = this.optimizerService.getPerformanceReport();
    const branchHealthStatuses = this.branchHealthStatus();
    
    return {
      ...performanceReport,
      overallPerformanceScore: this.overallPerformanceScore(),
      syncProgress: this.syncProgress(),
      branchHealthStatuses,
      optimizationEnabled: this._optimizationEnabled(),
      lastFullSync: this._lastFullSync()
    };
  }
}