// src/app/core/testing/mobile-responsive-integration.test.ts
// Integration test for mobile responsive features with multi-branch functionality
// Angular 20 + Jasmine testing for mobile responsiveness

import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { signal } from '@angular/core';

import { MobileResponsiveTesterService } from '../services/mobile-responsive-tester.service';
import { MOBILE_TEST_SCENARIOS, MobileTestRunner } from './mobile-test-scenarios';

// Mock BreakpointObserver
class MockBreakpointObserver {
  observe = jasmine.createSpy('observe').and.returnValue({
    subscribe: jasmine.createSpy('subscribe').and.callFake((fn: any) => {
      fn({
        breakpoints: {
          '(max-width: 599.98px)': true, // XSmall
          '(min-width: 600px) and (max-width: 959.98px)': false, // Small
          '(min-width: 960px) and (max-width: 1279.98px)': false, // Medium
          '(min-width: 1280px) and (max-width: 1919.98px)': false, // Large
          '(min-width: 1920px)': false // XLarge
        }
      });
      return { unsubscribe: jasmine.createSpy('unsubscribe') };
    })
  });
}

describe('Mobile Responsive Integration Tests', () => {
  let responsiveTester: MobileResponsiveTesterService;
  let mobileTestRunner: MobileTestRunner;
  let mockBreakpointObserver: MockBreakpointObserver;

  beforeEach(async () => {
    mockBreakpointObserver = new MockBreakpointObserver();

    await TestBed.configureTestingModule({
      providers: [
        MobileResponsiveTesterService,
        { provide: BreakpointObserver, useValue: mockBreakpointObserver }
      ]
    }).compileComponents();

    responsiveTester = TestBed.inject(MobileResponsiveTesterService);
    mobileTestRunner = new MobileTestRunner();
  });

  describe('Service Initialization', () => {
    it('should create mobile responsive tester service', () => {
      expect(responsiveTester).toBeTruthy();
    });

    it('should initialize with correct device info', () => {
      const deviceInfo = responsiveTester.currentDeviceInfo();
      expect(deviceInfo).toBeDefined();
      expect(typeof deviceInfo.width).toBe('number');
      expect(typeof deviceInfo.height).toBe('number');
    });

    it('should have default viewport configurations', () => {
      const viewports = responsiveTester.getViewportTests();
      expect(viewports.length).toBeGreaterThan(0);
      
      // Should have mobile, tablet, and desktop viewports
      const mobileViewports = viewports.filter(v => v.deviceCategory === 'mobile');
      const tabletViewports = viewports.filter(v => v.deviceCategory === 'tablet');
      
      expect(mobileViewports.length).toBeGreaterThan(0);
      expect(tabletViewports.length).toBeGreaterThan(0);
    });
  });

  describe('Viewport Testing', () => {
    it('should test current viewport successfully', async () => {
      spyOn(document, 'querySelectorAll').and.returnValue([
        { 
          getBoundingClientRect: () => ({ width: 48, height: 48, left: 0, top: 0, right: 48, bottom: 48 }),
          tagName: 'BUTTON',
          className: 'btn-primary'
        }
      ] as any);

      const result = await responsiveTester.testCurrentViewport();
      
      expect(result).toBeDefined();
      expect(result.testId).toContain('current');
      expect(result.viewportName).toBe('Current Viewport');
      expect(typeof result.passed).toBe('boolean');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should identify touch target issues', async () => {
      // Mock elements with small touch targets
      spyOn(document, 'querySelectorAll').and.returnValue([
        {
          getBoundingClientRect: () => ({ width: 30, height: 30, left: 0, top: 0, right: 30, bottom: 30 }),
          tagName: 'BUTTON',
          className: 'btn-small'
        }
      ] as any);

      const iPhone = responsiveTester.getViewportTests().find(v => v.testId === 'iphone-se');
      if (iPhone) {
        const result = await responsiveTester.testViewport(iPhone);
        
        const touchIssues = result.issues.filter(issue => issue.type === 'touch');
        expect(touchIssues.length).toBeGreaterThan(0);
        
        const smallTouchTargetIssue = touchIssues.find(issue => 
          issue.description.includes('Touch target too small')
        );
        expect(smallTouchTargetIssue).toBeDefined();
      }
    });

    it('should detect horizontal overflow issues', async () => {
      // Mock document with horizontal scroll
      Object.defineProperty(document.documentElement, 'scrollWidth', {
        configurable: true,
        value: 500
      });

      const mobileViewport = responsiveTester.getViewportTests().find(v => v.width === 375);
      if (mobileViewport) {
        const result = await responsiveTester.testViewport(mobileViewport);
        
        const layoutIssues = result.issues.filter(issue => issue.type === 'layout');
        const horizontalScrollIssue = layoutIssues.find(issue => 
          issue.description.includes('Horizontal scroll detected')
        );
        
        expect(horizontalScrollIssue).toBeDefined();
        expect(horizontalScrollIssue?.severity).toBe('high');
      }
    });

    it('should test branch-specific features', async () => {
      // Mock branch-related elements
      const mockBranchHeader = document.createElement('div');
      mockBranchHeader.className = 'branch-context-header';
      mockBranchHeader.style.display = 'block';
      
      spyOn(document, 'querySelector').and.callFake((selector: string) => {
        if (selector === '.branch-context-header') {
          return mockBranchHeader;
        }
        return null;
      });

      const result = await responsiveTester.testCurrentViewport();
      
      expect(result.branchFeatures.branchSelectorVisible).toBe(true);
      
      // Should not have branch-specific issues if element is visible
      const branchIssues = result.issues.filter(issue => issue.type === 'branch-specific');
      const visibilityIssue = branchIssues.find(issue => 
        issue.description.includes('Branch context not visible')
      );
      expect(visibilityIssue).toBeUndefined();
    });
  });

  describe('Performance Testing', () => {
    it('should measure render performance', async () => {
      const result = await responsiveTester.testCurrentViewport();
      
      expect(result.performance).toBeDefined();
      expect(typeof result.performance.renderTime).toBe('number');
      expect(result.performance.renderTime).toBeGreaterThan(0);
    });

    it('should detect slow render times', async () => {
      // Mock slow performance
      spyOn(performance, 'now').and.returnValues(0, 1500); // 1.5 second render time
      
      const result = await responsiveTester.testCurrentViewport();
      
      const performanceIssues = result.issues.filter(issue => issue.type === 'performance');
      const slowRenderIssue = performanceIssues.find(issue => 
        issue.description.includes('Slow render time')
      );
      
      expect(slowRenderIssue).toBeDefined();
      expect(slowRenderIssue?.severity).toBe('high');
    });

    it('should check scroll performance', async () => {
      const result = await responsiveTester.testCurrentViewport();
      
      expect(result.performance.scrollPerformance).toBeDefined();
      expect(typeof result.performance.scrollPerformance).toBe('number');
    });
  });

  describe('Accessibility Testing', () => {
    it('should check text readability', async () => {
      // Mock text elements with small font sizes
      const mockElements = [
        { 
          tagName: 'P',
          getBoundingClientRect: () => ({ width: 100, height: 20 })
        }
      ];
      
      spyOn(document, 'querySelectorAll').and.returnValue(mockElements as any);
      spyOn(window, 'getComputedStyle').and.returnValue({ fontSize: '12px' } as any);

      const mobileViewport = responsiveTester.getViewportTests().find(v => v.deviceCategory === 'mobile');
      if (mobileViewport) {
        const result = await responsiveTester.testViewport(mobileViewport);
        
        const accessibilityIssues = result.issues.filter(issue => issue.type === 'accessibility');
        const smallTextIssue = accessibilityIssues.find(issue => 
          issue.description.includes('Text too small for mobile')
        );
        
        expect(smallTextIssue).toBeDefined();
      }
    });

    it('should validate touch target accessibility', async () => {
      const result = await responsiveTester.testCurrentViewport();
      
      expect(result.accessibility).toBeDefined();
      expect(typeof result.accessibility.touchTargetsValid).toBe('boolean');
      expect(typeof result.accessibility.textReadable).toBe('boolean');
      expect(typeof result.accessibility.contrastRatio).toBe('number');
    });
  });

  describe('Test Scenarios Integration', () => {
    it('should have comprehensive test scenarios', () => {
      expect(MOBILE_TEST_SCENARIOS.length).toBeGreaterThan(0);
      
      // Should have critical branch-specific scenarios
      const criticalBranchScenarios = MOBILE_TEST_SCENARIOS.filter(
        s => s.priority === 'critical' && s.branchSpecific
      );
      expect(criticalBranchScenarios.length).toBeGreaterThan(0);
      
      // Should cover different device categories
      const mobileScenarios = MOBILE_TEST_SCENARIOS.filter(
        s => s.viewport.width <= 768
      );
      expect(mobileScenarios.length).toBeGreaterThan(0);
    });

    it('should execute branch selector scenario successfully', async () => {
      const branchSelectorScenario = MOBILE_TEST_SCENARIOS.find(
        s => s.id === 'branch-selector-mobile'
      );
      
      expect(branchSelectorScenario).toBeDefined();
      
      if (branchSelectorScenario) {
        // Mock required DOM elements
        const mockBranchHeader = document.createElement('div');
        mockBranchHeader.className = 'branch-context-header';
        
        const mockBranchSelector = document.createElement('button');
        mockBranchSelector.className = 'branch-selector-trigger';
        
        spyOn(document, 'querySelector').and.callFake((selector: string) => {
          switch (selector) {
            case '.branch-context-header':
              return mockBranchHeader;
            case '.branch-selector-trigger':
              return mockBranchSelector;
            default:
              return null;
          }
        });

        const result = await mobileTestRunner.runScenario(branchSelectorScenario);
        
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(Array.isArray(result.results)).toBe(true);
        expect(Array.isArray(result.expectations)).toBe(true);
      }
    });

    it('should run performance scenarios', async () => {
      const performanceScenario = MOBILE_TEST_SCENARIOS.find(
        s => s.id === 'performance-under-load'
      );
      
      expect(performanceScenario).toBeDefined();
      expect(performanceScenario?.priority).toBe('medium');
      expect(performanceScenario?.branchSpecific).toBe(true);
    });
  });

  describe('Responsive Breakpoints', () => {
    it('should detect mobile breakpoint correctly', () => {
      const breakpoints = responsiveTester.responsiveBreakpoints();
      
      // Based on mock observer configuration
      expect(breakpoints.isMobile).toBe(true);
      expect(breakpoints.isTablet).toBe(false);
      expect(breakpoints.isDesktop).toBe(false);
    });

    it('should handle viewport changes', () => {
      // Simulate larger viewport
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
      
      window.dispatchEvent(new Event('resize'));
      
      const deviceInfo = responsiveTester.currentDeviceInfo();
      expect(deviceInfo.width).toBe(1024);
      expect(deviceInfo.height).toBe(768);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive responsive report', async () => {
      // Run a test first to have data
      await responsiveTester.testCurrentViewport();
      
      const report = responsiveTester.generateResponsiveReport();
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(Array.isArray(report.detailedResults)).toBe(true);
      expect(Array.isArray(report.branchSpecificIssues)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should provide actionable recommendations', async () => {
      // Run test with known issues
      spyOn(document, 'querySelectorAll').and.returnValue([
        {
          getBoundingClientRect: () => ({ width: 30, height: 30 }),
          tagName: 'BUTTON'
        }
      ] as any);
      
      await responsiveTester.testCurrentViewport();
      
      const report = responsiveTester.generateResponsiveReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      const touchRecommendation = report.recommendations.find(rec => 
        rec.includes('touch target')
      );
      expect(touchRecommendation).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing elements gracefully', async () => {
      spyOn(document, 'querySelector').and.returnValue(null);
      spyOn(document, 'querySelectorAll').and.returnValue([] as any);
      
      const result = await responsiveTester.testCurrentViewport();
      
      expect(result).toBeDefined();
      expect(result.passed).toBe(false); // Should fail if critical elements missing
      
      const branchIssues = result.issues.filter(issue => issue.type === 'branch-specific');
      expect(branchIssues.length).toBeGreaterThan(0);
    });

    it('should handle test execution errors', async () => {
      const invalidScenario = {
        ...MOBILE_TEST_SCENARIOS[0],
        testSteps: [{
          action: 'tap' as const,
          target: '.non-existent-element',
          description: 'Tap non-existent element'
        }]
      };

      const result = await mobileTestRunner.runScenario(invalidScenario);
      
      expect(result.success).toBe(false);
      expect(result.results.some(r => !r.passed)).toBe(true);
    });
  });
});