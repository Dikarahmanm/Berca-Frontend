// src/app/shared/components/mobile-responsive-debugger/mobile-responsive-debugger.component.ts
// Real-time Mobile Responsive Debugging and Testing Component
// Angular 20 with live responsive testing and automatic fixes

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileResponsiveTesterService, ResponsiveTestResult, ResponsiveIssue } from '../../../core/services/mobile-responsive-tester.service';

interface DebugPanel {
  id: string;
  title: string;
  isOpen: boolean;
  hasIssues: boolean;
}

@Component({
  selector: 'app-mobile-responsive-debugger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="responsive-debugger" [class.minimized]="isMinimized()">
      <!-- Toggle Button -->
      <button 
        class="debugger-toggle"
        (click)="toggleMinimized()"
        [attr.aria-label]="isMinimized() ? 'Show responsive debugger' : 'Hide responsive debugger'"
      >
        <span class="icon">{{ isMinimized() ? '🔧' : '❌' }}</span>
        <span class="text" *ngIf="!isMinimized()">Responsive Debugger</span>
        <span class="badge" *ngIf="criticalIssuesCount() > 0">{{ criticalIssuesCount() }}</span>
      </button>

      <!-- Main Debugger Panel -->
      <div class="debugger-panel" *ngIf="!isMinimized()">
        <!-- Header -->
        <div class="debugger-header">
          <div class="device-info">
            <div class="current-viewport">
              <span class="label">Current:</span>
              <span class="value">{{ currentDeviceInfo().width }}×{{ currentDeviceInfo().height }}</span>
              <span class="device-type">{{ getDeviceTypeIcon() }}</span>
            </div>
            <div class="orientation">
              <span class="value">{{ currentDeviceInfo().orientation }}</span>
            </div>
          </div>
          
          <div class="test-controls">
            <button 
              class="btn btn-sm btn-primary"
              (click)="runQuickTest()"
              [disabled]="isRunningTests()"
            >
              {{ isRunningTests() ? '⏳ Testing...' : '🧪 Quick Test' }}
            </button>
            
            <button 
              class="btn btn-sm btn-outline"
              (click)="runFullTest()"
              [disabled]="isRunningTests()"
            >
              {{ isRunningTests() ? 'Running...' : '🔬 Full Test' }}
            </button>
          </div>
        </div>

        <!-- Test Status -->
        <div class="test-status" *ngIf="testSummary()">
          <div class="status-grid">
            <div class="status-item">
              <div class="status-label">Tests</div>
              <div class="status-value">{{ testSummary()?.passedTests }}/{{ testSummary()?.totalTests }}</div>
            </div>
            <div class="status-item">
              <div class="status-label">Pass Rate</div>
              <div class="status-value" [class]="getPassRateClass(testSummary()?.passRate)">
                {{ testSummary()?.passRate }}%
              </div>
            </div>
            <div class="status-item">
              <div class="status-label">Grade</div>
              <div class="status-value grade" [class]="'grade-' + testSummary()?.overallGrade?.toLowerCase()">
                {{ testSummary()?.overallGrade }}
              </div>
            </div>
            <div class="status-item" *ngIf="testSummary()?.criticalIssues || testSummary()?.highIssues">
              <div class="status-label">Issues</div>
              <div class="status-value error">
                {{ (testSummary()?.criticalIssues || 0) + (testSummary()?.highIssues || 0) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Debug Panels -->
        <div class="debug-panels">
          <!-- Viewport Testing Panel -->
          <div class="debug-panel" [class.open]="viewportPanelOpen()">
            <div class="panel-header" (click)="togglePanel('viewport')">
              <span class="panel-title">📱 Viewport Testing</span>
              <span class="panel-badge" *ngIf="viewportIssues().length > 0">{{ viewportIssues().length }}</span>
              <span class="panel-toggle">{{ viewportPanelOpen() ? '▼' : '▶' }}</span>
            </div>
            <div class="panel-content" *ngIf="viewportPanelOpen()">
              <!-- Viewport Selector -->
              <div class="viewport-selector">
                <select [(ngModel)]="selectedViewport" (ngModelChange)="onViewportChange($event)">
                  <option value="">Current Viewport</option>
                  <option *ngFor="let viewport of availableViewports()" [value]="viewport.testId">
                    {{ viewport.name }} ({{ viewport.width }}×{{ viewport.height }})
                  </option>
                </select>
              </div>

              <!-- Viewport Issues -->
              <div class="issues-list" *ngIf="viewportIssues().length > 0">
                <div 
                  *ngFor="let issue of viewportIssues()" 
                  class="issue-item"
                  [class]="'severity-' + issue.severity"
                >
                  <div class="issue-header">
                    <span class="severity-icon">{{ getSeverityIcon(issue.severity) }}</span>
                    <span class="issue-title">{{ issue.description }}</span>
                  </div>
                  <div class="issue-details">
                    <div class="issue-element">{{ issue.element }}</div>
                    <div class="issue-suggestion">💡 {{ issue.suggestion }}</div>
                  </div>
                </div>
              </div>

              <div class="no-issues" *ngIf="viewportIssues().length === 0 && lastTestResult()">
                ✅ No viewport issues found
              </div>
            </div>
          </div>

          <!-- Touch Targets Panel -->
          <div class="debug-panel" [class.open]="touchPanelOpen()">
            <div class="panel-header" (click)="togglePanel('touch')">
              <span class="panel-title">👆 Touch Targets</span>
              <span class="panel-badge" *ngIf="touchIssues().length > 0">{{ touchIssues().length }}</span>
              <span class="panel-toggle">{{ touchPanelOpen() ? '▼' : '▶' }}</span>
            </div>
            <div class="panel-content" *ngIf="touchPanelOpen()">
              <div class="touch-stats" *ngIf="lastTestResult()">
                <div class="stat">
                  <span class="label">Min Size:</span>
                  <span class="value">{{ touchTargetSize() | number:'1.0-0' }}px</span>
                </div>
                <div class="stat">
                  <span class="label">Valid:</span>
                  <span class="value" [class]="touchTargetsValid() ? 'success' : 'error'">
                    {{ touchTargetsValid() ? 'Yes' : 'No' }}
                  </span>
                </div>
              </div>

              <div class="issues-list" *ngIf="touchIssues().length > 0">
                <div 
                  *ngFor="let issue of touchIssues()" 
                  class="issue-item"
                  [class]="'severity-' + issue.severity"
                >
                  <div class="issue-header">
                    <span class="severity-icon">{{ getSeverityIcon(issue.severity) }}</span>
                    <span class="issue-title">{{ issue.description }}</span>
                  </div>
                  <div class="issue-details">
                    <div class="issue-suggestion">💡 {{ issue.suggestion }}</div>
                    <button class="btn btn-xs btn-outline" (click)="highlightElement(issue.element)">
                      Highlight
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Features Panel -->
          <div class="debug-panel" [class.open]="branchPanelOpen()">
            <div class="panel-header" (click)="togglePanel('branch')">
              <span class="panel-title">🏢 Branch Features</span>
              <span class="panel-badge" *ngIf="branchIssues().length > 0">{{ branchIssues().length }}</span>
              <span class="panel-toggle">{{ branchPanelOpen() ? '▼' : '▶' }}</span>
            </div>
            <div class="panel-content" *ngIf="branchPanelOpen()">
              <div class="branch-features" *ngIf="lastTestResult()">
                <div class="feature-check">
                  <span class="check-icon">{{ branchSelectorVisible() ? '✅' : '❌' }}</span>
                  <span class="feature-name">Branch Selector Visible</span>
                </div>
                <div class="feature-check">
                  <span class="check-icon">{{ multiBranchDataLoads() ? '✅' : '❌' }}</span>
                  <span class="feature-name">Multi-Branch Data Loading</span>
                </div>
                <div class="feature-check">
                  <span class="check-icon">{{ branchSwitchingWorks() ? '✅' : '❌' }}</span>
                  <span class="feature-name">Branch Switching</span>
                </div>
                <div class="feature-check">
                  <span class="check-icon">{{ branchNotificationsVisible() ? '✅' : '❌' }}</span>
                  <span class="feature-name">Branch Notifications</span>
                </div>
              </div>

              <div class="issues-list" *ngIf="branchIssues().length > 0">
                <div 
                  *ngFor="let issue of branchIssues()" 
                  class="issue-item"
                  [class]="'severity-' + issue.severity"
                >
                  <div class="issue-header">
                    <span class="severity-icon">{{ getSeverityIcon(issue.severity) }}</span>
                    <span class="issue-title">{{ issue.description }}</span>
                  </div>
                  <div class="issue-details">
                    <div class="issue-suggestion">💡 {{ issue.suggestion }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Performance Panel -->
          <div class="debug-panel" [class.open]="performancePanelOpen()">
            <div class="panel-header" (click)="togglePanel('performance')">
              <span class="panel-title">⚡ Performance</span>
              <span class="panel-badge" *ngIf="performanceIssues().length > 0">{{ performanceIssues().length }}</span>
              <span class="panel-toggle">{{ performancePanelOpen() ? '▼' : '▶' }}</span>
            </div>
            <div class="panel-content" *ngIf="performancePanelOpen()">
              <div class="performance-stats" *ngIf="lastTestResult()">
                <div class="stat">
                  <span class="label">Render Time:</span>
                  <span class="value" [class]="getRenderTimeClass(renderTime())">
                    {{ renderTime() | number:'1.0-0' }}ms
                  </span>
                </div>
                <div class="stat">
                  <span class="label">Layout Shift:</span>
                  <span class="value" [class]="getLayoutShiftClass(layoutShift())">
                    {{ layoutShift() | number:'1.2-2' }}
                  </span>
                </div>
                <div class="stat">
                  <span class="label">Scroll Perf:</span>
                  <span class="value" [class]="getScrollPerfClass(scrollPerformance())">
                    {{ scrollPerformance() | number:'1.0-0' }}ms
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button class="btn btn-xs btn-outline" (click)="toggleTouchTargetHighlight()">
            {{ showTouchHighlight() ? 'Hide' : 'Show' }} Touch Targets
          </button>
          <button class="btn btn-xs btn-outline" (click)="toggleGridOverlay()">
            {{ showGrid() ? 'Hide' : 'Show' }} Grid
          </button>
          <button class="btn btn-xs btn-outline" (click)="exportReport()">
            📄 Export Report
          </button>
        </div>
      </div>

      <!-- Touch Target Overlay -->
      <div class="touch-target-overlay" *ngIf="showTouchHighlight()" #touchOverlay>
        <!-- Touch targets will be dynamically added here -->
      </div>

      <!-- Grid Overlay -->
      <div class="grid-overlay" *ngIf="showGrid()">
        <div class="grid-lines"></div>
      </div>
    </div>
  `,
  styles: [`
    .responsive-debugger {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;

      &.minimized {
        .debugger-panel {
          display: none;
        }
      }
    }

    .debugger-toggle {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s2) var(--s3);
      background: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 12px;
      font-weight: var(--font-medium);
      box-shadow: var(--shadow-md);
      transition: var(--transition);
      position: relative;

      &:hover {
        background: var(--primary-hover);
        transform: translateY(-1px);
      }

      .badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: var(--error);
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
      }
    }

    .debugger-panel {
      width: 400px;
      max-height: 80vh;
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      margin-top: var(--s2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .debugger-header {
      padding: var(--s4);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;

      .device-info {
        display: flex;
        flex-direction: column;
        gap: var(--s1);

        .current-viewport {
          display: flex;
          align-items: center;
          gap: var(--s2);

          .label {
            color: var(--text-secondary);
            font-size: 10px;
          }

          .value {
            font-weight: var(--font-bold);
            color: var(--text);
          }

          .device-type {
            font-size: 16px;
          }
        }

        .orientation {
          font-size: 10px;
          color: var(--text-secondary);
        }
      }

      .test-controls {
        display: flex;
        gap: var(--s2);
      }
    }

    .test-status {
      padding: var(--s3);
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;

      .status-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--s3);

        .status-item {
          text-align: center;

          .status-label {
            font-size: 10px;
            color: var(--text-secondary);
            margin-bottom: var(--s1);
          }

          .status-value {
            font-weight: var(--font-bold);
            
            &.success { color: var(--success); }
            &.warning { color: var(--warning); }
            &.error { color: var(--error); }
            
            &.grade {
              padding: var(--s1) var(--s2);
              border-radius: var(--radius);
              color: white;
              
              &.grade-a { background: var(--success); }
              &.grade-b { background: #10B981; }
              &.grade-c { background: var(--warning); }
              &.grade-d { background: #F59E0B; }
              &.grade-f { background: var(--error); }
            }
          }
        }
      }
    }

    .debug-panels {
      flex: 1;
      overflow-y: auto;
      padding: var(--s2);
    }

    .debug-panel {
      margin-bottom: var(--s2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;

      &.open {
        .panel-content {
          display: block;
        }
      }

      .panel-header {
        padding: var(--s3);
        background: var(--bg-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: var(--transition);

        &:hover {
          background: var(--border);
        }

        .panel-title {
          font-weight: var(--font-medium);
        }

        .panel-badge {
          background: var(--error);
          color: white;
          padding: 2px 6px;
          border-radius: var(--radius);
          font-size: 10px;
          font-weight: bold;
        }

        .panel-toggle {
          color: var(--text-secondary);
          font-size: 10px;
        }
      }

      .panel-content {
        display: none;
        padding: var(--s3);
        
        .viewport-selector select {
          width: 100%;
          padding: var(--s2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 11px;
          margin-bottom: var(--s3);
        }
      }
    }

    .issues-list {
      .issue-item {
        padding: var(--s3);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        margin-bottom: var(--s2);

        &.severity-critical {
          border-color: var(--error);
          background: rgba(225, 90, 79, 0.05);
        }

        &.severity-high {
          border-color: #F59E0B;
          background: rgba(245, 158, 11, 0.05);
        }

        &.severity-medium {
          border-color: var(--warning);
          background: rgba(255, 184, 77, 0.05);
        }

        .issue-header {
          display: flex;
          align-items: center;
          gap: var(--s2);
          margin-bottom: var(--s2);

          .severity-icon {
            font-size: 14px;
          }

          .issue-title {
            font-weight: var(--font-medium);
            flex: 1;
          }
        }

        .issue-details {
          font-size: 10px;
          color: var(--text-secondary);

          .issue-element {
            font-family: monospace;
            background: var(--bg-secondary);
            padding: 2px 4px;
            border-radius: 2px;
            margin-bottom: var(--s1);
            display: inline-block;
          }

          .issue-suggestion {
            margin-bottom: var(--s2);
          }
        }
      }
    }

    .no-issues {
      text-align: center;
      color: var(--success);
      padding: var(--s4);
      font-size: 11px;
    }

    .touch-stats,
    .performance-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--s2);
      margin-bottom: var(--s3);

      .stat {
        display: flex;
        justify-content: space-between;
        padding: var(--s2);
        background: var(--bg-secondary);
        border-radius: var(--radius);
        font-size: 10px;

        .label {
          color: var(--text-secondary);
        }

        .value {
          font-weight: var(--font-bold);
          
          &.success { color: var(--success); }
          &.warning { color: var(--warning); }
          &.error { color: var(--error); }
        }
      }
    }

    .branch-features {
      margin-bottom: var(--s3);

      .feature-check {
        display: flex;
        align-items: center;
        gap: var(--s2);
        padding: var(--s2);
        font-size: 11px;

        .check-icon {
          font-size: 14px;
        }
      }
    }

    .quick-actions {
      padding: var(--s3);
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      display: flex;
      gap: var(--s2);
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .btn-xs {
      padding: 4px 8px;
      font-size: 10px;
      min-height: 24px;
    }

    .btn-sm {
      padding: var(--s2) var(--s3);
      font-size: 11px;
      min-height: 28px;
    }

    // Touch Target Overlay
    .touch-target-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 9999;

      .touch-highlight {
        position: absolute;
        border: 2px dashed var(--primary);
        background: rgba(255, 145, 77, 0.1);
        pointer-events: none;
        
        &.invalid {
          border-color: var(--error);
          background: rgba(225, 90, 79, 0.1);
        }

        &::after {
          content: attr(data-size);
          position: absolute;
          top: -20px;
          left: 0;
          background: var(--text);
          color: var(--surface);
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 2px;
          white-space: nowrap;
        }
      }
    }

    // Grid Overlay
    .grid-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 9998;

      .grid-lines {
        width: 100%;
        height: 100%;
        background-image: 
          linear-gradient(rgba(255, 145, 77, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 145, 77, 0.1) 1px, transparent 1px);
        background-size: 20px 20px;
      }
    }

    // Mobile adjustments
    @media (max-width: 768px) {
      .responsive-debugger {
        top: 10px;
        right: 10px;
        left: 10px;
      }

      .debugger-panel {
        width: 100%;
        max-height: 70vh;
      }

      .debugger-header {
        flex-direction: column;
        gap: var(--s3);
      }

      .test-controls {
        width: 100%;
        justify-content: center;
      }

      .status-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class MobileResponsiveDebuggerComponent implements OnInit {
  private readonly responsiveTester = inject(MobileResponsiveTesterService);

  // Component state
  private _isMinimized = signal<boolean>(true);
  private _panels = signal<DebugPanel[]>([
    { id: 'viewport', title: 'Viewport Testing', isOpen: true, hasIssues: false },
    { id: 'touch', title: 'Touch Targets', isOpen: false, hasIssues: false },
    { id: 'branch', title: 'Branch Features', isOpen: false, hasIssues: false },
    { id: 'performance', title: 'Performance', isOpen: false, hasIssues: false }
  ]);
  private _showTouchHighlight = signal<boolean>(false);
  private _showGrid = signal<boolean>(false);

  // Form state
  selectedViewport = '';

  // Public readonly signals
  readonly isMinimized = this._isMinimized.asReadonly();
  readonly panels = this._panels.asReadonly();
  readonly showTouchHighlight = this._showTouchHighlight.asReadonly();
  readonly showGrid = this._showGrid.asReadonly();

  // Service signals
  readonly currentDeviceInfo = this.responsiveTester.currentDeviceInfo;
  readonly isRunningTests = this.responsiveTester.isRunningTests;
  readonly testResults = this.responsiveTester.testResults;
  readonly testSummary = this.responsiveTester.testSummary;

  // Computed properties
  readonly lastTestResult = computed(() => {
    const results = this.testResults();
    return results.length > 0 ? results[results.length - 1] : null;
  });

  readonly availableViewports = computed(() => 
    this.responsiveTester.getViewportTests()
  );

  readonly viewportIssues = computed(() => {
    const result = this.lastTestResult();
    return result ? result.issues.filter(issue => issue.type === 'layout') : [];
  });

  readonly touchIssues = computed(() => {
    const result = this.lastTestResult();
    return result ? result.issues.filter(issue => issue.type === 'touch') : [];
  });

  readonly branchIssues = computed(() => {
    const result = this.lastTestResult();
    return result ? result.issues.filter(issue => issue.type === 'branch-specific') : [];
  });

  readonly performanceIssues = computed(() => {
    const result = this.lastTestResult();
    return result ? result.issues.filter(issue => issue.type === 'performance') : [];
  });

  readonly criticalIssuesCount = computed(() => {
    const result = this.lastTestResult();
    return result ? result.issues.filter(issue => issue.severity === 'critical').length : 0;
  });

  // Panel state computed signals
  readonly viewportPanelOpen = computed(() => 
    this.panels().find(p => p.id === 'viewport')?.isOpen || false
  );

  readonly touchPanelOpen = computed(() => 
    this.panels().find(p => p.id === 'touch')?.isOpen || false
  );

  readonly branchPanelOpen = computed(() => 
    this.panels().find(p => p.id === 'branch')?.isOpen || false
  );

  readonly performancePanelOpen = computed(() => 
    this.panels().find(p => p.id === 'performance')?.isOpen || false
  );

  // Safe accessors for test result data
  readonly touchTargetSize = computed(() => 
    this.lastTestResult()?.performance?.touchTargetSize ?? 0
  );

  readonly touchTargetsValid = computed(() => 
    this.lastTestResult()?.accessibility?.touchTargetsValid ?? false
  );

  readonly branchSelectorVisible = computed(() => 
    this.lastTestResult()?.branchFeatures?.branchSelectorVisible ?? false
  );

  readonly multiBranchDataLoads = computed(() => 
    this.lastTestResult()?.branchFeatures?.multiBranchDataLoads ?? false
  );

  readonly branchSwitchingWorks = computed(() => 
    this.lastTestResult()?.branchFeatures?.branchSwitchingWorks ?? false
  );

  readonly branchNotificationsVisible = computed(() => 
    this.lastTestResult()?.branchFeatures?.branchNotificationsVisible ?? false
  );

  readonly renderTime = computed(() => 
    this.lastTestResult()?.performance?.renderTime ?? 0
  );

  readonly layoutShift = computed(() => 
    this.lastTestResult()?.performance?.layoutShift ?? 0
  );

  readonly scrollPerformance = computed(() => 
    this.lastTestResult()?.performance?.scrollPerformance ?? 0
  );

  ngOnInit(): void {
    console.log('📱 Mobile Responsive Debugger initialized');
    
    // Auto-run quick test on mobile devices
    if (this.currentDeviceInfo().isMobile) {
      setTimeout(() => this.runQuickTest(), 1000);
    }
  }

  // Action methods
  toggleMinimized(): void {
    this._isMinimized.update(minimized => !minimized);
  }

  togglePanel(panelId: string): void {
    this._panels.update(panels =>
      panels.map(panel =>
        panel.id === panelId 
          ? { ...panel, isOpen: !panel.isOpen }
          : panel
      )
    );
  }

  async runQuickTest(): Promise<void> {
    try {
      const result = await this.responsiveTester.testCurrentViewport();
      console.log('✅ Quick responsive test completed:', result);
      this.updatePanelIssues();
    } catch (error) {
      console.error('❌ Quick test failed:', error);
    }
  }

  async runFullTest(): Promise<void> {
    try {
      const results = await this.responsiveTester.runResponsiveTests();
      console.log(`✅ Full responsive test completed: ${results.length} viewports tested`);
      this.updatePanelIssues();
    } catch (error) {
      console.error('❌ Full test failed:', error);
    }
  }

  onViewportChange(viewportId: string): void {
    const viewports = this.availableViewports();
    const viewport = viewports.find(v => v.testId === viewportId);
    
    if (viewport) {
      console.log(`📱 Testing viewport: ${viewport.name}`);
      this.responsiveTester.testViewport(viewport).then(result => {
        console.log('✅ Viewport test completed:', result);
        this.updatePanelIssues();
      });
    }
  }

  toggleTouchTargetHighlight(): void {
    this._showTouchHighlight.update(show => !show);
    
    if (this.showTouchHighlight()) {
      this.highlightTouchTargets();
    } else {
      this.clearTouchHighlights();
    }
  }

  toggleGridOverlay(): void {
    this._showGrid.update(show => !show);
  }

  highlightElement(elementSelector: string): void {
    const elements = document.querySelectorAll(elementSelector);
    elements.forEach(element => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.outline = '3px dashed var(--error)';
      htmlElement.style.outlineOffset = '2px';
      
      setTimeout(() => {
        htmlElement.style.outline = '';
        htmlElement.style.outlineOffset = '';
      }, 3000);
    });
  }

  exportReport(): void {
    const report = this.responsiveTester.generateResponsiveReport();
    
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: report.summary,
      currentViewport: {
        width: this.currentDeviceInfo().width,
        height: this.currentDeviceInfo().height,
        deviceType: this.getDeviceTypeText()
      },
      issues: report.detailedResults.flatMap(r => r.issues),
      branchSpecificIssues: report.branchSpecificIssues,
      recommendations: report.recommendations
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `responsive-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Utility methods
  private updatePanelIssues(): void {
    const result = this.lastTestResult();
    if (!result) return;

    this._panels.update(panels => panels.map(panel => {
      let hasIssues = false;
      
      switch (panel.id) {
        case 'viewport':
          hasIssues = result.issues.some(i => i.type === 'layout');
          break;
        case 'touch':
          hasIssues = result.issues.some(i => i.type === 'touch');
          break;
        case 'branch':
          hasIssues = result.issues.some(i => i.type === 'branch-specific');
          break;
        case 'performance':
          hasIssues = result.issues.some(i => i.type === 'performance');
          break;
      }

      return { ...panel, hasIssues };
    }));
  }

  private highlightTouchTargets(): void {
    // Find all interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex], .clickable'
    );

    const overlay = document.querySelector('.touch-target-overlay') as HTMLElement;
    if (!overlay) return;

    // Clear existing highlights
    overlay.innerHTML = '';

    interactiveElements.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      
      if (rect.width > 0 && rect.height > 0) {
        const highlight = document.createElement('div');
        highlight.className = 'touch-highlight';
        
        const isValid = rect.width >= 44 && rect.height >= 44;
        if (!isValid) {
          highlight.classList.add('invalid');
        }

        highlight.style.left = `${rect.left + window.scrollX}px`;
        highlight.style.top = `${rect.top + window.scrollY}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        highlight.setAttribute('data-size', `${Math.round(rect.width)}×${Math.round(rect.height)}`);

        overlay.appendChild(highlight);
      }
    });
  }

  private clearTouchHighlights(): void {
    const overlay = document.querySelector('.touch-target-overlay') as HTMLElement;
    if (overlay) {
      overlay.innerHTML = '';
    }
  }

  getDeviceTypeIcon(): string {
    const device = this.currentDeviceInfo();
    if (device.isMobile) return '📱';
    if (device.isTablet) return '📱'; // Tablet icon
    return '💻';
  }

  getDeviceTypeText(): string {
    const device = this.currentDeviceInfo();
    if (device.isMobile) return 'Mobile';
    if (device.isTablet) return 'Tablet';
    return 'Desktop';
  }

  getSeverityIcon(severity: string): string {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    return icons[severity as keyof typeof icons] || 'ℹ️';
  }

  getPassRateClass(passRate?: number): string {
    if (!passRate) return '';
    if (passRate >= 90) return 'success';
    if (passRate >= 70) return 'warning';
    return 'error';
  }

  getRenderTimeClass(renderTime?: number): string {
    if (!renderTime) return '';
    if (renderTime < 200) return 'success';
    if (renderTime < 500) return 'warning';
    return 'error';
  }

  getLayoutShiftClass(layoutShift?: number): string {
    if (!layoutShift) return '';
    if (layoutShift < 0.1) return 'success';
    if (layoutShift < 0.25) return 'warning';
    return 'error';
  }

  getScrollPerfClass(scrollPerf?: number): string {
    if (!scrollPerf) return '';
    if (scrollPerf < 16) return 'success';
    if (scrollPerf < 33) return 'warning';
    return 'error';
  }
}