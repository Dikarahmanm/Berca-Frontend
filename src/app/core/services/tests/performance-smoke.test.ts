// Simple smoke test to verify performance optimization services can be instantiated
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { BranchPerformanceOptimizerService } from '../branch-performance-optimizer.service';
import { OptimizedBranchIntegrationService } from '../optimized-branch-integration.service';
import { StateService } from '../state.service';

// Mock StateService
class MockStateService {
  activeBranchIds = signal([1, 2]);
  accessibleBranches = signal([
    { branchId: 1, branchName: 'Main Branch', branchCode: 'MAIN' },
    { branchId: 2, branchName: 'Secondary Branch', branchCode: 'SEC' }
  ]);
}

describe('Performance Optimization Services - Smoke Test', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BranchPerformanceOptimizerService,
        OptimizedBranchIntegrationService,
        { provide: StateService, useClass: MockStateService }
      ]
    });
  });

  describe('BranchPerformanceOptimizerService', () => {
    it('should be created successfully', () => {
      const service = TestBed.inject(BranchPerformanceOptimizerService);
      expect(service).toBeTruthy();
    });

    it('should have initial signal values', () => {
      const service = TestBed.inject(BranchPerformanceOptimizerService);
      expect(service.cacheHitRatio()).toBe(0);
      expect(service.averageLoadTime()).toBe(0);
      expect(service.activeOperations()).toBe(0);
    });

    it('should provide cache statistics', () => {
      const service = TestBed.inject(BranchPerformanceOptimizerService);
      const stats = service.cacheStatistics;
      expect(stats()).toBeDefined();
      expect(stats().totalEntries).toBe(0);
      expect(stats().totalSizeMB).toBe(0);
    });

    it('should provide performance insights', () => {
      const service = TestBed.inject(BranchPerformanceOptimizerService);
      const insights = service.performanceInsights;
      expect(insights()).toBeNull(); // No metrics initially
    });

    it('should generate performance report', () => {
      const service = TestBed.inject(BranchPerformanceOptimizerService);
      const report = service.getPerformanceReport();
      expect(report).toBeDefined();
      expect(report.cacheStatistics).toBeDefined();
    });

    it('should clear cache without errors', () => {
      const service = TestBed.inject(BranchPerformanceOptimizerService);
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('OptimizedBranchIntegrationService', () => {
    it('should be created successfully', () => {
      const service = TestBed.inject(OptimizedBranchIntegrationService);
      expect(service).toBeTruthy();
    });

    it('should have initial signal values', () => {
      const service = TestBed.inject(OptimizedBranchIntegrationService);
      expect(service.branchDataCache()).toBeDefined();
      expect(service.globalLoadingState()).toBe(false);
      expect(service.optimizationEnabled()).toBe(true);
    });

    it('should provide sync progress', () => {
      const service = TestBed.inject(OptimizedBranchIntegrationService);
      const progress = service.syncProgress;
      expect(progress()).toBeDefined();
      expect(progress().overall).toBe(0);
      expect(progress().total).toBe(0);
    });

    it('should provide performance score', () => {
      const service = TestBed.inject(OptimizedBranchIntegrationService);
      const score = service.overallPerformanceScore;
      expect(score()).toBeDefined();
      expect(typeof score()).toBe('number');
    });

    it('should enable/disable optimization', () => {
      const service = TestBed.inject(OptimizedBranchIntegrationService);
      
      service.disableOptimization();
      expect(service.optimizationEnabled()).toBe(false);
      
      service.enableOptimization();
      expect(service.optimizationEnabled()).toBe(true);
    });
  });
});

// Integration test - verify services work together
describe('Performance Services Integration', () => {
  let optimizerService: BranchPerformanceOptimizerService;
  let integrationService: OptimizedBranchIntegrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BranchPerformanceOptimizerService,
        OptimizedBranchIntegrationService,
        { provide: StateService, useClass: MockStateService }
      ]
    });

    optimizerService = TestBed.inject(BranchPerformanceOptimizerService);
    integrationService = TestBed.inject(OptimizedBranchIntegrationService);
  });

  it('should allow services to coexist without conflicts', () => {
    expect(optimizerService).toBeTruthy();
    expect(integrationService).toBeTruthy();
    
    // Both services should be able to generate reports
    const optimizerReport = optimizerService.getPerformanceReport();
    const integrationReport = integrationService.getOptimizationReport();
    
    expect(optimizerReport).toBeDefined();
    expect(integrationReport).toBeDefined();
  });

  it('should handle optimization mode changes', () => {
    // Disable optimization
    integrationService.disableOptimization();
    expect(integrationService.optimizationEnabled()).toBe(false);
    
    // Clear cache
    optimizerService.clearCache();
    expect(optimizerService.cacheStatistics().totalEntries).toBe(0);
    
    // Re-enable optimization
    integrationService.enableOptimization();
    expect(integrationService.optimizationEnabled()).toBe(true);
  });
});