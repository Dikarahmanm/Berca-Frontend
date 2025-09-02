// src/app/shared/components/mobile-test-utility/mobile-test-utility.component.ts
// Real-time Mobile Testing Utility Component
// Angular 20 with comprehensive responsive testing and debugging

import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MobileResponsiveTesterService, ViewportTest, ResponsiveTestResult } from '../../../core/services/mobile-responsive-tester.service';

interface DeviceSimulation {
  name: string;
  width: number;
  height: number;
  pixelRatio: number;
  userAgent: string;
}

@Component({
  selector: 'app-mobile-test-utility',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    MatCheckboxModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressBarModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule
  ],
  templateUrl: './mobile-test-utility.component.html',
  styleUrls: ['./mobile-test-utility.component.scss']
})
export class MobileTestUtilityComponent implements OnInit {
  readonly responsiveService = inject(MobileResponsiveTesterService);

  // Settings signals
  readonly showDeviceFrame = signal(false);
  readonly autoTest = signal(true);
  readonly showTooltips = signal(true);
  readonly highlightIssuesAuto = signal(true);
  readonly touchTargetMin = signal(44);

  // Test state signals
  readonly isRunningTest = signal(false);
  readonly selectedDevice = signal<DeviceSimulation | null>(null);
  readonly testProgress = signal(0);
  readonly lastTestResults = signal<ResponsiveTestResult[]>([]);

  // Available devices for testing
  readonly deviceSimulations: DeviceSimulation[] = [
    {
      name: 'iPhone SE',
      width: 375,
      height: 667,
      pixelRatio: 2,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    },
    {
      name: 'iPhone 12',
      width: 390,
      height: 844,
      pixelRatio: 3,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    },
    {
      name: 'Samsung Galaxy S21',
      width: 360,
      height: 800,
      pixelRatio: 3,
      userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
    },
    {
      name: 'iPad',
      width: 768,
      height: 1024,
      pixelRatio: 2,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    },
    {
      name: 'iPad Landscape',
      width: 1024,
      height: 768,
      pixelRatio: 2,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    }
  ];

  // Computed properties
  readonly currentDeviceInfo = computed(() => this.responsiveService.currentDeviceInfo());
  readonly responsiveBreakpoints = computed(() => this.responsiveService.responsiveBreakpoints());
  readonly testSummary = computed(() => this.responsiveService.testSummary());
  readonly isTestingActive = computed(() => this.responsiveService.isRunningTests());

  readonly criticalIssues = computed(() => {
    const results = this.lastTestResults();
    return results.flatMap(r => r.issues.filter(i => i.severity === 'critical'));
  });

  readonly highPriorityIssues = computed(() => {
    const results = this.lastTestResults();
    return results.flatMap(r => r.issues.filter(i => i.severity === 'high'));
  });

  ngOnInit(): void {
    this.setupAutoTesting();
  }

  private setupAutoTesting(): void {
    // Auto-test when enabled and viewport changes
    if (this.autoTest()) {
      // Monitor viewport changes for auto-testing
      // Implementation would go here
    }
  }

  // ===== DEVICE SIMULATION =====

  simulateDevice(device: DeviceSimulation): void {
    this.selectedDevice.set(device);
    
    // Apply device simulation
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        `width=${device.width}, height=${device.height}, initial-scale=1.0, user-scalable=no`
      );
    }

    // Update document viewport styling
    document.documentElement.style.width = `${device.width}px`;
    document.documentElement.style.height = `${device.height}px`;
    
    // Update pixel ratio simulation
    document.documentElement.style.setProperty('--device-pixel-ratio', device.pixelRatio.toString());

    console.log(`📱 Simulating ${device.name} (${device.width}x${device.height})`);
  }

  resetSimulation(): void {
    this.selectedDevice.set(null);
    
    // Reset viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }

    // Reset document styling
    document.documentElement.style.width = '';
    document.documentElement.style.height = '';
    document.documentElement.style.removeProperty('--device-pixel-ratio');

    console.log('📱 Device simulation reset');
  }

  // ===== TESTING METHODS =====

  async runQuickTest(): Promise<void> {
    this.isRunningTest.set(true);
    try {
      const result = await this.responsiveService.testCurrentViewport();
      this.lastTestResults.set([result]);
      console.log('✅ Quick test completed:', result);
    } catch (error) {
      console.error('❌ Quick test failed:', error);
    } finally {
      this.isRunningTest.set(false);
    }
  }

  async runFullTest(): Promise<void> {
    this.isRunningTest.set(true);
    this.testProgress.set(0);
    
    try {
      const results = await this.responsiveService.runResponsiveTests();
      this.lastTestResults.set(results);
      this.testProgress.set(100);
      console.log('✅ Full responsive test completed:', results);
    } catch (error) {
      console.error('❌ Full test failed:', error);
    } finally {
      this.isRunningTest.set(false);
      this.testProgress.set(0);
    }
  }

  async scanForIssues(): Promise<void> {
    this.isRunningTest.set(true);
    try {
      const result = await this.responsiveService.testCurrentViewport();
      this.lastTestResults.set([result]);
      
      if (this.highlightIssuesAuto()) {
        this.highlightIssuesOnPage(result.issues);
      }
      
      console.log(`🔍 Issue scan found ${result.issues.length} issues`);
    } catch (error) {
      console.error('❌ Issue scan failed:', error);
    } finally {
      this.isRunningTest.set(false);
    }
  }

  private highlightIssuesOnPage(issues: any[]): void {
    // Remove existing highlights
    document.querySelectorAll('.responsive-issue-highlight').forEach(el => {
      el.classList.remove('responsive-issue-highlight');
    });

    // Add highlights for new issues
    issues.forEach(issue => {
      const element = document.querySelector(issue.element);
      if (element) {
        element.classList.add('responsive-issue-highlight');
      }
    });
  }

  // ===== EXPORT & REPORTING =====

  exportTestResults(): void {
    const report = this.responsiveService.generateResponsiveReport();
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: report.summary,
      detailedResults: report.detailedResults,
      branchSpecificIssues: report.branchSpecificIssues,
      recommendations: report.recommendations,
      testEnvironment: {
        userAgent: navigator.userAgent,
        viewport: this.currentDeviceInfo(),
        settings: {
          touchTargetMin: this.touchTargetMin(),
          showDeviceFrame: this.showDeviceFrame(),
          autoTest: this.autoTest()
        }
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `mobile-responsive-test-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('📄 Test results exported');
  }

  clearResults(): void {
    this.lastTestResults.set([]);
    this.responsiveService.clearTestResults();
    console.log('🗑️ Test results cleared');
  }

  // ===== UTILITY METHODS =====

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ffeb3b';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  }

  getDeviceCategoryIcon(category: string): string {
    switch (category) {
      case 'mobile': return 'smartphone';
      case 'tablet': return 'tablet';
      case 'desktop': return 'computer';
      default: return 'device_unknown';
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ===== TEMPLATE METHODS =====

  toggleDeviceFrame(): void {
    this.showDeviceFrame.update(val => !val);
  }

  toggleAutoTest(): void {
    this.autoTest.update(val => !val);
    if (this.autoTest()) {
      this.setupAutoTesting();
    }
  }

  toggleTooltips(): void {
    this.showTooltips.update(val => !val);
  }

  toggleHighlightIssues(): void {
    this.highlightIssuesAuto.update(val => !val);
  }

  updateTouchTargetMin(value: number): void {
    this.touchTargetMin.set(value);
  }
}
