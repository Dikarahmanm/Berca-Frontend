// Simplified tests for Branch Performance Optimizer Service
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { BranchPerformanceOptimizerService } from '../branch-performance-optimizer.service';
import { StateService } from '../state.service';
import { environment } from '../../../../environment/environment';

// Mock StateService
class MockStateService {
  activeBranchIds = signal([1, 2, 3]);
  accessibleBranches = signal([
    { branchId: 1, branchName: 'Cabang Utama Jakarta', branchCode: 'HQ001' },
    { branchId: 2, branchName: 'Cabang Bekasi Timur', branchCode: 'BR002' },
    { branchId: 3, branchName: 'Cabang Tangerang Selatan', branchCode: 'BR003' }
  ]);
}

describe('BranchPerformanceOptimizerService - Simplified Tests', () => {
  let service: BranchPerformanceOptimizerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BranchPerformanceOptimizerService,
        { provide: StateService, useClass: MockStateService }
      ]
    });

    service = TestBed.inject(BranchPerformanceOptimizerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created successfully', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default signal values', () => {
      expect(service.cacheHitRatio()).toBe(0);
      expect(service.averageLoadTime()).toBe(0);
      expect(service.activeOperations()).toBe(0);
      expect(service.performanceMetrics()).toEqual([]);
    });
  });

  describe('Basic Data Loading', () => {
    it('should load branch data and return success response', async () => {
      const mockData = [{ id: 1, name: 'Test Product', branchId: 1 }];
      
      const promise = service.loadBranchDataOptimized('inventory', [1], false);
      
      const req = httpMock.expectOne(`${environment.apiUrl}/inventory/branch-optimized?branchIds=1&optimized=true&compression=gzip`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockData });
      
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.metadata.cacheStatus).toBe('miss'); // First request should be cache miss
    });

    it('should handle API errors gracefully', async () => {
      const promise = service.loadBranchDataOptimized('sales', [1], false);
      
      const req = httpMock.expectOne(`${environment.apiUrl}/sales/branch-optimized?branchIds=1&optimized=true&compression=gzip`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      
      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
    });
  });

  describe('Cache Functionality', () => {
    it('should demonstrate cache hit after initial load', async () => {
      const mockData = [{ id: 1, name: 'Test Product', branchId: 1 }];
      
      // First request - cache miss
      const promise1 = service.loadBranchDataOptimized('analytics', [1], false);
      const req1 = httpMock.expectOne(`${environment.apiUrl}/analytics/branch-optimized?branchIds=1&optimized=true&compression=gzip`);
      req1.flush({ success: true, data: mockData });
      
      const result1 = await promise1;
      expect(result1.metadata.fromCache).toBe(false);
      
      // Second request - should be cache hit
      const result2 = await service.loadBranchDataOptimized('analytics', [1], false);
      expect(result2.metadata.fromCache).toBe(true);
      expect(result2.metadata.cacheStatus).toBe('hit');
    });

    it('should force refresh when requested', async () => {
      const mockData = [{ id: 1, name: 'Test Product', branchId: 1 }];
      
      // Initial load
      const promise1 = service.loadBranchDataOptimized('notifications', [1], false);
      const req1 = httpMock.expectOne(`${environment.apiUrl}/notifications/branch-optimized?branchIds=1&optimized=true&compression=gzip`);
      req1.flush({ success: true, data: mockData });
      await promise1;
      
      // Force refresh
      const promise2 = service.loadBranchDataOptimized('notifications', [1], true);
      const req2 = httpMock.expectOne(`${environment.apiUrl}/notifications/branch-optimized?branchIds=1&optimized=true&compression=gzip`);
      req2.flush({ success: true, data: mockData });
      
      const result2 = await promise2;
      expect(result2.metadata.fromCache).toBe(false);
    });
  });

  describe('Performance Metrics', () => {
    it('should record performance metrics for operations', async () => {
      const mockData = [{ id: 1, name: 'Test Product', branchId: 1 }];
      
      const promise = service.loadBranchDataOptimized('performance', [1], false);
      const req = httpMock.expectOne(`${environment.apiUrl}/performance/branch-optimized?branchIds=1&optimized=true&compression=gzip`);
      req.flush({ success: true, data: mockData });
      
      await promise;
      
      const metrics = service.performanceMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      
      const lastMetric = metrics[0];
      expect(lastMetric.operationType).toBe('api_call');
      expect(lastMetric.branchIds).toEqual([1]);
      expect(lastMetric.executionTime).toBeGreaterThan(0);
    });

    it('should provide cache statistics', async () => {
      const mockData = [{ id: 1, name: 'Test Product', branchId: 1 }];
      
      // Add some data to cache
      const promise = service.loadBranchDataOptimized('sales', [1], false);
      const req = httpMock.expectOne(`${environment.apiUrl}/sales/branch-optimized?branchIds=1&optimized=true&compression=gzip`);
      req.flush({ success: true, data: mockData });
      await promise;

      const stats = service.cacheStatistics;
      expect(stats()).toBeDefined();
      expect(stats().totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Public API Methods', () => {
    it('should clear cache', () => {
      service.clearCache();
      const stats = service.cacheStatistics;
      expect(stats().totalEntries).toBe(0);
    });

    it('should generate performance report', () => {
      const report = service.getPerformanceReport();
      expect(report).toBeDefined();
      expect(report.cacheStatistics).toBeDefined();
      expect(report.performanceInsights).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should queue batch load requests', () => {
      const batchRequest = {
        branchIds: [1, 2],
        dataTypes: ['sales', 'inventory'] as ('sales' | 'inventory' | 'analytics' | 'notifications')[],
        priority: 'high' as const
      };

      // This should not throw an error
      expect(() => service.queueBatchLoad(batchRequest)).not.toThrow();
    });
  });

  describe('Data Type Endpoints', () => {
    it('should use correct endpoints for different data types', async () => {
      const testCases = [
        { dataType: 'sales', expectedPath: '/sales/branch-optimized' },
        { dataType: 'inventory', expectedPath: '/inventory/branch-optimized' },
        { dataType: 'analytics', expectedPath: '/analytics/branch-optimized' },
        { dataType: 'notifications', expectedPath: '/notifications/branch-optimized' },
        { dataType: 'performance', expectedPath: '/performance/branch-optimized' }
      ];

      for (const testCase of testCases) {
        const promise = service.loadBranchDataOptimized(testCase.dataType as any, [1], false);
        
        const req = httpMock.expectOne(`${environment.apiUrl}${testCase.expectedPath}?branchIds=1&optimized=true&compression=gzip`);
        req.flush({ success: true, data: [] });
        
        const result = await promise;
        expect(result.success).toBe(true);
      }
    });
  });
});