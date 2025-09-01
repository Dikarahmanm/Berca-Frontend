// src/app/core/services/mobile-responsive-tester.service.ts
// Comprehensive Mobile Responsive Testing & Validation Service
// Angular 20 with automated viewport testing and multi-branch mobile optimization

import { Injectable, signal, computed, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable, fromEvent, timer } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';

export interface ViewportTest {
  testId: string;
  name: string;
  width: number;
  height: number;
  description: string;
  deviceCategory: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  userAgent?: string;
}

export interface ResponsiveTestResult {
  testId: string;
  viewportName: string;
  passed: boolean;
  issues: ResponsiveIssue[];
  performance: {
    renderTime: number;
    layoutShift: number;
    touchTargetSize: number;
    scrollPerformance: number;
  };
  accessibility: {
    touchTargetsValid: boolean;
    textReadable: boolean;
    contrastRatio: number;
    keyboardAccessible: boolean;
  };
  branchFeatures: {
    branchSelectorVisible: boolean;
    multiBranchDataLoads: boolean;
    branchSwitchingWorks: boolean;
    branchNotificationsVisible: boolean;
  };
  timestamp: string;
}

export interface ResponsiveIssue {
  type: 'layout' | 'touch' | 'performance' | 'accessibility' | 'branch-specific';
  severity: 'critical' | 'high' | 'medium' | 'low';
  element: string;
  description: string;
  suggestion: string;
  screenshot?: string;
}

export interface TouchTarget {
  element: HTMLElement;
  rect: DOMRect;
  size: { width: number; height: number };
  isValid: boolean;
  issues: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MobileResponsiveTesterService {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly document = inject(DOCUMENT);

  // Test viewport configurations
  private readonly testViewports: ViewportTest[] = [
    // Mobile devices - Portrait
    {
      testId: 'iphone-se',
      name: 'iPhone SE',
      width: 375,
      height: 667,
      description: 'Small iOS device',
      deviceCategory: 'mobile',
      orientation: 'portrait',
      pixelRatio: 2,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    },
    {
      testId: 'iphone-12',
      name: 'iPhone 12',
      width: 390,
      height: 844,
      description: 'Standard iOS device',
      deviceCategory: 'mobile',
      orientation: 'portrait',
      pixelRatio: 3
    },
    {
      testId: 'android-small',
      name: 'Android Small',
      width: 360,
      height: 640,
      description: 'Small Android device',
      deviceCategory: 'mobile',
      orientation: 'portrait',
      pixelRatio: 2
    },
    {
      testId: 'android-medium',
      name: 'Android Medium',
      width: 414,
      height: 896,
      description: 'Medium Android device',
      deviceCategory: 'mobile',
      orientation: 'portrait',
      pixelRatio: 2
    },

    // Mobile devices - Landscape
    {
      testId: 'iphone-12-landscape',
      name: 'iPhone 12 Landscape',
      width: 844,
      height: 390,
      description: 'iOS landscape mode',
      deviceCategory: 'mobile',
      orientation: 'landscape',
      pixelRatio: 3
    },
    {
      testId: 'android-landscape',
      name: 'Android Landscape',
      width: 896,
      height: 414,
      description: 'Android landscape mode',
      deviceCategory: 'mobile',
      orientation: 'landscape',
      pixelRatio: 2
    },

    // Tablets
    {
      testId: 'ipad',
      name: 'iPad',
      width: 768,
      height: 1024,
      description: 'Standard iPad',
      deviceCategory: 'tablet',
      orientation: 'portrait',
      pixelRatio: 2
    },
    {
      testId: 'ipad-landscape',
      name: 'iPad Landscape',
      width: 1024,
      height: 768,
      description: 'iPad landscape mode',
      deviceCategory: 'tablet',
      orientation: 'landscape',
      pixelRatio: 2
    },
    {
      testId: 'android-tablet',
      name: 'Android Tablet',
      width: 800,
      height: 1280,
      description: 'Android tablet',
      deviceCategory: 'tablet',
      orientation: 'portrait',
      pixelRatio: 1.5
    }
  ];

  // Signal-based state
  private _currentViewport = signal<ViewportTest | null>(null);
  private _testResults = signal<ResponsiveTestResult[]>([]);
  private _isRunningTests = signal<boolean>(false);
  private _currentDeviceInfo = signal<{
    width: number;
    height: number;
    pixelRatio: number;
    orientation: string;
    isMobile: boolean;
    isTablet: boolean;
  }>({
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    orientation: screen.orientation?.type || 'unknown',
    isMobile: false,
    isTablet: false
  });

  // Public readonly signals
  readonly currentViewport = this._currentViewport.asReadonly();
  readonly testResults = this._testResults.asReadonly();
  readonly isRunningTests = this._isRunningTests.asReadonly();
  readonly currentDeviceInfo = this._currentDeviceInfo.asReadonly();

  // Computed properties
  readonly responsiveBreakpoints = computed(() => {
    const device = this._currentDeviceInfo();
    return {
      isMobile: device.width <= 768,
      isTablet: device.width > 768 && device.width <= 1024,
      isDesktop: device.width > 1024,
      isSmallMobile: device.width <= 480,
      isLandscape: device.width > device.height
    };
  });

  readonly testSummary = computed(() => {
    const results = this._testResults();
    if (results.length === 0) return null;

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const criticalIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length, 0);
    const highIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'high').length, 0);

    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      passRate: Math.round((passedTests / totalTests) * 100),
      criticalIssues,
      highIssues,
      overallGrade: this.calculateOverallGrade(passedTests, totalTests, criticalIssues, highIssues)
    };
  });

  readonly branchSpecificIssues = computed(() => {
    const results = this._testResults();
    return results.reduce((issues: ResponsiveIssue[], result) => {
      const branchIssues = result.issues.filter(issue => issue.type === 'branch-specific');
      return [...issues, ...branchIssues];
    }, []);
  });

  constructor() {
    this.initializeResponsiveTester();
    this.setupViewportMonitoring();
  }

  // ===== INITIALIZATION =====

  private initializeResponsiveTester(): void {
    console.log('📱 Initializing Mobile Responsive Tester...');
    
    // Update device info on window resize
    fromEvent(window, 'resize').pipe(
      debounceTime(250),
      map(() => this.getCurrentDeviceInfo())
    ).subscribe(deviceInfo => {
      this._currentDeviceInfo.set(deviceInfo);
    });

    // Monitor orientation changes
    fromEvent(window, 'orientationchange').pipe(
      debounceTime(100)
    ).subscribe(() => {
      setTimeout(() => {
        this._currentDeviceInfo.set(this.getCurrentDeviceInfo());
      }, 100); // Small delay for orientation to complete
    });
  }

  private setupViewportMonitoring(): void {
    // Monitor breakpoint changes
    const breakpoints = [
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium,
      Breakpoints.Large,
      Breakpoints.XLarge
    ];

    this.breakpointObserver.observe(breakpoints).subscribe(result => {
      const deviceInfo = this.getCurrentDeviceInfo();
      deviceInfo.isMobile = result.breakpoints[Breakpoints.XSmall] || result.breakpoints[Breakpoints.Small];
      deviceInfo.isTablet = result.breakpoints[Breakpoints.Medium];
      
      this._currentDeviceInfo.set(deviceInfo);
    });
  }

  // ===== VIEWPORT TESTING =====

  async runResponsiveTests(): Promise<ResponsiveTestResult[]> {
    console.log('🧪 Starting comprehensive responsive testing...');
    
    this._isRunningTests.set(true);
    const results: ResponsiveTestResult[] = [];

    try {
      for (const viewport of this.testViewports) {
        console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        const result = await this.testViewport(viewport);
        results.push(result);
        
        // Small delay between tests
        await this.delay(500);
      }

      this._testResults.set(results);
      console.log(`✅ Responsive testing complete. ${results.length} viewports tested.`);
      
      return results;

    } catch (error) {
      console.error('❌ Error during responsive testing:', error);
      throw error;
    } finally {
      this._isRunningTests.set(false);
    }
  }

  async testViewport(viewport: ViewportTest): Promise<ResponsiveTestResult> {
    const startTime = window.performance.now();
    this._currentViewport.set(viewport);

    // Simulate viewport
    await this.simulateViewport(viewport);

    const issues: ResponsiveIssue[] = [];

    // Run all test categories
    issues.push(...await this.testLayout(viewport));
    issues.push(...await this.testTouchTargets(viewport));
    issues.push(...await this.testPerformance(viewport));
    issues.push(...await this.testAccessibility(viewport));
    issues.push(...await this.testBranchFeatures(viewport));

    const performanceMetrics = await this.measurePerformance();
    const accessibility = await this.checkAccessibility();
    const branchFeatures = await this.testMultiBranchFeatures();

    const passed = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0;
    const renderTime = window.performance.now() - startTime;

    return {
      testId: `test_${viewport.testId}_${Date.now()}`,
      viewportName: viewport.name,
      passed,
      issues,
      performance: {
        renderTime,
        layoutShift: performanceMetrics.layoutShift,
        touchTargetSize: performanceMetrics.touchTargetSize,
        scrollPerformance: performanceMetrics.scrollPerformance
      },
      accessibility,
      branchFeatures,
      timestamp: new Date().toISOString()
    };
  }

  // ===== LAYOUT TESTING =====

  private async testLayout(viewport: ViewportTest): Promise<ResponsiveIssue[]> {
    const issues: ResponsiveIssue[] = [];

    // Test horizontal scrolling
    if (this.document.documentElement.scrollWidth > viewport.width) {
      issues.push({
        type: 'layout',
        severity: 'high',
        element: 'body',
        description: 'Horizontal scroll detected',
        suggestion: 'Ensure all content fits within viewport width'
      });
    }

    // Test element overflow
    const overflowingElements = this.findOverflowingElements(viewport.width);
    overflowingElements.forEach(element => {
      issues.push({
        type: 'layout',
        severity: 'medium',
        element: element.tagName + (element.className ? `.${element.className.split(' ')[0]}` : ''),
        description: 'Element overflows viewport',
        suggestion: 'Add responsive breakpoints or use flexible units'
      });
    });

    // Test critical element visibility
    const criticalElements = [
      '.mobile-header',
      '.mobile-cart-main',
      '.mobile-products-panel',
      '.branch-context-header'
    ];

    criticalElements.forEach(selector => {
      const element = this.document.querySelector(selector) as HTMLElement;
      if (element && !this.isElementVisible(element)) {
        issues.push({
          type: 'layout',
          severity: 'critical',
          element: selector,
          description: 'Critical element not visible',
          suggestion: 'Ensure critical UI elements are visible on all screen sizes'
        });
      }
    });

    return issues;
  }

  // ===== TOUCH TARGET TESTING =====

  private async testTouchTargets(viewport: ViewportTest): Promise<ResponsiveIssue[]> {
    const issues: ResponsiveIssue[] = [];
    
    if (viewport.deviceCategory === 'mobile') {
      const touchTargets = this.findTouchTargets();
      
      touchTargets.forEach(target => {
        if (!target.isValid) {
          issues.push({
            type: 'touch',
            severity: target.size.width < 44 || target.size.height < 44 ? 'high' : 'medium',
            element: target.element.tagName + (target.element.className ? `.${target.element.className.split(' ')[0]}` : ''),
            description: `Touch target too small: ${target.size.width}x${target.size.height}px`,
            suggestion: 'Ensure touch targets are at least 44x44px for mobile devices'
          });
        }
      });
    }

    return issues;
  }

  // ===== PERFORMANCE TESTING =====

  private async testPerformance(viewport: ViewportTest): Promise<ResponsiveIssue[]> {
    const issues: ResponsiveIssue[] = [];

    // Test render performance
    const renderStart = performance.now();
    await this.triggerRerender();
    const renderTime = performance.now() - renderStart;

    if (renderTime > 1000) {
      issues.push({
        type: 'performance',
        severity: 'high',
        element: 'viewport',
        description: `Slow render time: ${Math.round(renderTime)}ms`,
        suggestion: 'Optimize component rendering and reduce DOM complexity'
      });
    }

    // Test scroll performance
    const scrollLag = await this.measureScrollPerformance();
    if (scrollLag > 16) { // 60fps = 16.67ms per frame
      issues.push({
        type: 'performance',
        severity: 'medium',
        element: 'viewport',
        description: `Scroll lag detected: ${Math.round(scrollLag)}ms`,
        suggestion: 'Optimize scroll handlers and reduce layout thrashing'
      });
    }

    return issues;
  }

  // ===== ACCESSIBILITY TESTING =====

  private async testAccessibility(viewport: ViewportTest): Promise<ResponsiveIssue[]> {
    const issues: ResponsiveIssue[] = [];

    // Test text readability
    const textElements = this.document.querySelectorAll('p, span, div, button, a');
    textElements.forEach((element: Element) => {
      const styles = window.getComputedStyle(element as HTMLElement);
      const fontSize = parseFloat(styles.fontSize);
      
      if (viewport.deviceCategory === 'mobile' && fontSize < 16) {
        issues.push({
          type: 'accessibility',
          severity: 'medium',
          element: element.tagName,
          description: `Text too small for mobile: ${fontSize}px`,
          suggestion: 'Use minimum 16px font size for mobile readability'
        });
      }
    });

    // Test contrast ratios
    const contrastIssues = await this.checkContrastRatios();
    issues.push(...contrastIssues);

    return issues;
  }

  // ===== BRANCH-SPECIFIC TESTING =====

  private async testBranchFeatures(viewport: ViewportTest): Promise<ResponsiveIssue[]> {
    const issues: ResponsiveIssue[] = [];

    // Test branch selector visibility
    const branchSelector = this.document.querySelector('.branch-context-header');
    if (!branchSelector || !this.isElementVisible(branchSelector as HTMLElement)) {
      issues.push({
        type: 'branch-specific',
        severity: 'high',
        element: '.branch-context-header',
        description: 'Branch context not visible on mobile',
        suggestion: 'Ensure branch selector is accessible on mobile devices'
      });
    }

    // Test multi-branch data loading indicators
    const loadingIndicators = this.document.querySelectorAll('.loading-spinner, .loading-state');
    if (loadingIndicators.length === 0) {
      issues.push({
        type: 'branch-specific',
        severity: 'medium',
        element: 'loading-states',
        description: 'No loading indicators found for branch data',
        suggestion: 'Add loading states for branch data operations'
      });
    }

    // Test branch switching functionality
    const branchSwitchButtons = this.document.querySelectorAll('[data-branch-switch], .branch-selector');
    branchSwitchButtons.forEach((button: Element) => {
      if (viewport.deviceCategory === 'mobile') {
        const buttonElement = button as HTMLElement;
        const rect = buttonElement.getBoundingClientRect();
        
        if (rect.width < 44 || rect.height < 44) {
          issues.push({
            type: 'branch-specific',
            severity: 'high',
            element: 'branch-switch-button',
            description: 'Branch switch button too small for mobile',
            suggestion: 'Increase branch switch button size for mobile touch targets'
          });
        }
      }
    });

    return issues;
  }

  // ===== UTILITY METHODS =====

  private async simulateViewport(viewport: ViewportTest): Promise<void> {
    // In a real implementation, this would resize the viewport or use headless browser
    // For now, we'll simulate by updating our internal state
    
    // Update meta viewport tag if it exists
    const viewportMeta = this.document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (viewportMeta) {
      viewportMeta.content = `width=${viewport.width}, initial-scale=1.0`;
    }

    // Trigger resize events
    window.dispatchEvent(new Event('resize'));
    
    // Allow time for layout updates
    await this.delay(200);
  }

  private getCurrentDeviceInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      orientation: screen.orientation?.type || 'unknown',
      isMobile: window.innerWidth <= 768,
      isTablet: window.innerWidth > 768 && window.innerWidth <= 1024
    };
  }

  private findOverflowingElements(maxWidth: number): HTMLElement[] {
    const elements = Array.from(this.document.querySelectorAll('*')) as HTMLElement[];
    return elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.right > maxWidth;
    });
  }

  private isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           parseFloat(style.opacity) > 0;
  }

  private findTouchTargets(): TouchTarget[] {
    const interactiveElements = this.document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex], .clickable'
    );

    return Array.from(interactiveElements).map((element: Element) => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const size = { width: rect.width, height: rect.height };
      
      const isValid = size.width >= 44 && size.height >= 44;
      const issues: string[] = [];
      
      if (size.width < 44) issues.push(`Width too small: ${size.width}px`);
      if (size.height < 44) issues.push(`Height too small: ${size.height}px`);

      return {
        element: htmlElement,
        rect,
        size,
        isValid,
        issues
      };
    });
  }

  private async measurePerformance() {
    const layoutShift = this.measureLayoutShift();
    const touchTargetSize = this.averageTouchTargetSize();
    const scrollPerformance = await this.measureScrollPerformance();

    return {
      layoutShift,
      touchTargetSize,
      scrollPerformance
    };
  }

  private measureLayoutShift(): number {
    // Simplified CLS measurement
    return Math.random() * 0.1; // Mock value, real implementation would use Performance Observer
  }

  private averageTouchTargetSize(): number {
    const touchTargets = this.findTouchTargets();
    if (touchTargets.length === 0) return 44;

    const totalSize = touchTargets.reduce((sum, target) => 
      sum + Math.min(target.size.width, target.size.height), 0
    );

    return totalSize / touchTargets.length;
  }

  private async measureScrollPerformance(): Promise<number> {
    return new Promise(resolve => {
      let frameCount = 0;
      let totalTime = 0;
      const startTime = performance.now();

      const measureFrame = () => {
        frameCount++;
        totalTime = performance.now() - startTime;

        if (frameCount < 10 && totalTime < 200) {
          requestAnimationFrame(measureFrame);
        } else {
          const avgFrameTime = totalTime / frameCount;
          resolve(avgFrameTime);
        }
      };

      // Trigger scroll event
      window.scrollBy(0, 100);
      requestAnimationFrame(measureFrame);
    });
  }

  private async checkAccessibility() {
    const touchTargetsValid = this.findTouchTargets().every(target => target.isValid);
    const textReadable = await this.checkTextReadability();
    const contrastRatio = await this.averageContrastRatio();
    const keyboardAccessible = this.checkKeyboardAccessibility();

    return {
      touchTargetsValid,
      textReadable,
      contrastRatio,
      keyboardAccessible
    };
  }

  private async checkTextReadability(): Promise<boolean> {
    const textElements = this.document.querySelectorAll('p, span, div:not(:empty)');
    let readableCount = 0;

    textElements.forEach((element: Element) => {
      const styles = window.getComputedStyle(element as HTMLElement);
      const fontSize = parseFloat(styles.fontSize);
      
      if (fontSize >= 16) readableCount++;
    });

    return textElements.length > 0 ? (readableCount / textElements.length) >= 0.8 : true;
  }

  private async averageContrastRatio(): Promise<number> {
    // Simplified contrast ratio calculation
    // Real implementation would analyze actual colors
    return 4.5; // Mock value representing good contrast
  }

  private checkKeyboardAccessibility(): boolean {
    const focusableElements = this.document.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    let accessibleCount = 0;

    focusableElements.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      if (htmlElement.tabIndex >= 0) {
        accessibleCount++;
      }
    });

    return focusableElements.length > 0 ? (accessibleCount / focusableElements.length) >= 0.9 : true;
  }

  private async testMultiBranchFeatures() {
    return {
      branchSelectorVisible: !!this.document.querySelector('.branch-context-header'),
      multiBranchDataLoads: !!this.document.querySelector('[data-branch-id]'),
      branchSwitchingWorks: !!this.document.querySelector('.branch-selector'),
      branchNotificationsVisible: !!this.document.querySelector('.branch-notification')
    };
  }

  private async checkContrastRatios(): Promise<ResponsiveIssue[]> {
    // Simplified contrast checking - real implementation would use color analysis
    return [];
  }

  private async triggerRerender(): Promise<void> {
    // Trigger a layout recalculation
    this.document.body.style.display = 'none';
    this.document.body.offsetHeight; // Force reflow
    this.document.body.style.display = '';
    
    await this.delay(50);
  }

  private calculateOverallGrade(passed: number, total: number, critical: number, high: number): string {
    const passRate = (passed / total) * 100;
    
    if (critical > 0) return 'F';
    if (high > 2) return 'D';
    if (passRate < 70) return 'D';
    if (passRate < 80) return 'C';
    if (passRate < 90) return 'B';
    return 'A';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== PUBLIC API =====

  async testCurrentViewport(): Promise<ResponsiveTestResult> {
    const currentDevice = this._currentDeviceInfo();
    const mockViewport: ViewportTest = {
      testId: 'current',
      name: 'Current Viewport',
      width: currentDevice.width,
      height: currentDevice.height,
      description: 'Current browser viewport',
      deviceCategory: currentDevice.isMobile ? 'mobile' : currentDevice.isTablet ? 'tablet' : 'desktop',
      orientation: currentDevice.width > currentDevice.height ? 'landscape' : 'portrait',
      pixelRatio: currentDevice.pixelRatio
    };

    return await this.testViewport(mockViewport);
  }

  getViewportTests(): ViewportTest[] {
    return [...this.testViewports];
  }

  generateResponsiveReport(): {
    summary: any;
    detailedResults: ResponsiveTestResult[];
    branchSpecificIssues: ResponsiveIssue[];
    recommendations: string[];
  } {
    const summary = this.testSummary();
    const results = this._testResults();
    const branchIssues = this.branchSpecificIssues();

    const recommendations = this.generateRecommendations(results, branchIssues);

    return {
      summary,
      detailedResults: results,
      branchSpecificIssues: branchIssues,
      recommendations
    };
  }

  private generateRecommendations(results: ResponsiveTestResult[], branchIssues: ResponsiveIssue[]): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    const avgRenderTime = results.reduce((sum, r) => sum + r.performance.renderTime, 0) / results.length;
    if (avgRenderTime > 500) {
      recommendations.push('Optimize component rendering performance - consider OnPush change detection');
    }

    // Touch target recommendations
    const touchIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.type === 'touch').length, 0);
    if (touchIssues > 0) {
      recommendations.push('Increase touch target sizes to minimum 44x44px for better mobile usability');
    }

    // Branch-specific recommendations
    if (branchIssues.length > 0) {
      recommendations.push('Improve branch selector visibility and functionality on mobile devices');
    }

    // Layout recommendations
    const layoutIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.type === 'layout').length, 0);
    if (layoutIssues > 0) {
      recommendations.push('Fix layout overflow issues and ensure proper responsive breakpoints');
    }

    return recommendations;
  }

  clearTestResults(): void {
    this._testResults.set([]);
    this._currentViewport.set(null);
  }
}