// src/app/shared/components/branch-performance-monitor/branch-performance-monitor.component.ts
// Performance monitoring component for multi-branch data loading optimization
// Angular 20 with real-time performance visualization

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BranchPerformanceOptimizerService } from '../../../core/services/branch-performance-optimizer.service';
import { StateService } from '../../../core/services/state.service';

@Component({
  selector: 'app-branch-performance-monitor',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="performance-monitor-container">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-semibold">Performance Monitor</h3>
        <div class="flex gap-2">
          <button 
            class="btn btn-sm btn-outline" 
            (click)="clearCache()"
            [disabled]="!hasCacheData()"
          >
            Clear Cache
          </button>
          <button 
            class="btn btn-sm btn-primary" 
            (click)="enablePerformanceMode()"
          >
            Boost Performance
          </button>
        </div>
      </div>

      <!-- Performance Overview Cards -->
      <div class="grid grid-4 gap-4 mb-6">
        <!-- Cache Hit Ratio -->
        <div class="performance-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-secondary">Cache Hit Ratio</span>
            <div 
              class="performance-indicator" 
              [class.excellent]="cacheHitRatio() >= 80"
              [class.good]="cacheHitRatio() >= 60 && cacheHitRatio() < 80"
              [class.poor]="cacheHitRatio() < 60"
            ></div>
          </div>
          <div class="text-2xl font-bold">{{ cacheHitRatio() }}%</div>
          <div class="text-xs text-muted">
            <span [class.text-success]="cacheHitRatio() >= 80">
              {{ getCacheRatingText(cacheHitRatio()) }}
            </span>
          </div>
        </div>

        <!-- Average Load Time -->
        <div class="performance-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-secondary">Avg Load Time</span>
            <div 
              class="performance-indicator" 
              [class.excellent]="averageLoadTime() < 200"
              [class.good]="averageLoadTime() < 500"
              [class.poor]="averageLoadTime() >= 500"
            ></div>
          </div>
          <div class="text-2xl font-bold">{{ averageLoadTime() }}<span class="text-sm font-normal">ms</span></div>
          <div class="text-xs text-muted">
            {{ getLoadTimeRatingText(averageLoadTime()) }}
          </div>
        </div>

        <!-- Active Operations -->
        <div class="performance-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-secondary">Active Operations</span>
            <div 
              class="performance-indicator" 
              [class.excellent]="activeOperations() === 0"
              [class.good]="activeOperations() <= 2"
              [class.poor]="activeOperations() > 2"
            ></div>
          </div>
          <div class="text-2xl font-bold">{{ activeOperations() }}</div>
          <div class="text-xs text-muted" *ngIf="activeOperations() > 0">
            <div class="loading-spinner inline-block mr-1"></div>
            Processing...
          </div>
        </div>

        <!-- Performance Grade -->
        <div class="performance-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-secondary">Overall Grade</span>
            <div 
              class="performance-grade" 
              [class]="'grade-' + (performanceInsights()?.performanceGrade || 'F').toLowerCase()"
            >
              {{ performanceInsights()?.performanceGrade || 'N/A' }}
            </div>
          </div>
          <div class="text-lg font-medium">{{ getGradeDescription(performanceInsights()?.performanceGrade) }}</div>
          <div class="text-xs text-muted">
            Based on cache efficiency & speed
          </div>
        </div>
      </div>

      <!-- Cache Statistics -->
      <div class="card mb-6" *ngIf="cacheStats()">
        <h4 class="text-md font-semibold mb-4">Cache Statistics</h4>
        
        <div class="grid grid-2 gap-6">
          <!-- Cache Usage -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm">Cache Usage</span>
              <span class="text-sm font-medium">{{ cacheStats().totalSizeMB }}MB</span>
            </div>
            <div class="progress-bar mb-3">
              <div 
                class="progress-fill" 
                [style.width.%]="cacheStats().utilizationPercent"
                [class.progress-warning]="cacheStats().utilizationPercent > 80"
                [class.progress-danger]="cacheStats().utilizationPercent > 95"
              ></div>
            </div>
            <div class="text-xs text-secondary">
              {{ cacheStats().totalEntries }} entries • {{ cacheStats().utilizationPercent }}% utilized
            </div>
          </div>

          <!-- Cache Distribution -->
          <div>
            <div class="text-sm mb-2">Entries per Branch</div>
            <div class="space-y-2">
              <div 
                *ngFor="let entry of cacheStats()?.entriesPerBranch || []" 
                class="flex justify-between items-center text-sm"
              >
                <span>Branch {{ entry.branchId }}</span>
                <span class="font-medium">{{ entry.entryCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Insights -->
      <div class="card mb-6" *ngIf="performanceInsights()">
        <h4 class="text-md font-semibold mb-4">Performance Insights</h4>
        
        <div class="grid grid-2 gap-6">
          <!-- Key Metrics -->
          <div>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm">Cache Efficiency</span>
                <span class="text-sm font-medium">{{ performanceInsights()?.cacheEfficiency | number:'1.1-1' }}%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm">Total Operations</span>
                <span class="text-sm font-medium">{{ performanceInsights()?.totalOperations }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm">Avg Execution Time</span>
                <span class="text-sm font-medium">{{ performanceInsights()?.averageExecutionTime }}ms</span>
              </div>
            </div>
          </div>

          <!-- Recommendations -->
          <div>
            <div class="text-sm font-medium mb-2">Recommendations</div>
            <div class="space-y-2">
              <div 
                *ngFor="let rec of performanceInsights()?.recommendations || []" 
                class="flex items-start gap-2 text-xs"
              >
                <div class="text-primary mt-1">•</div>
                <span class="text-secondary">{{ rec }}</span>
              </div>
              <div *ngIf="(performanceInsights()?.recommendations?.length || 0) === 0" class="text-xs text-success">
                ✓ Performance is optimal
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Operations -->
      <div class="card">
        <h4 class="text-md font-semibold mb-4">Recent Operations</h4>
        
        <div class="operations-list">
          <div 
            *ngFor="let metric of recentMetrics(); trackBy: trackByMetric" 
            class="operation-item"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div 
                  class="operation-type-badge" 
                  [class]="'type-' + metric.operationType.replace('_', '-')"
                >
                  {{ formatOperationType(metric.operationType) }}
                </div>
                <div>
                  <div class="text-sm font-medium">
                    Branches: [{{ metric.branchIds.join(', ') }}]
                  </div>
                  <div class="text-xs text-secondary">
                    {{ formatRelativeTime(metric.timestamp) }} • 
                    {{ formatDataSize(metric.dataSize) }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium">{{ metric.executionTime | number:'1.0-0' }}ms</div>
                <div 
                  class="text-xs"
                  [class.text-success]="metric.executionTime < 200"
                  [class.text-warning]="metric.executionTime >= 200 && metric.executionTime < 500"
                  [class.text-error]="metric.executionTime >= 500"
                >
                  {{ getPerformanceRating(metric.executionTime) }}
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="recentMetrics().length === 0" class="text-center py-8 text-secondary">
            No recent operations to display
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .performance-monitor-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--s6);
    }

    .performance-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s4);
      transition: var(--transition);

      &:hover {
        border-color: var(--primary);
      }
    }

    .performance-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--border);

      &.excellent { background: var(--success); }
      &.good { background: var(--warning); }
      &.poor { background: var(--error); }
    }

    .performance-grade {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-bold);
      min-width: 24px;
      text-align: center;

      &.grade-a { background: var(--success); color: white; }
      &.grade-b { background: #10B981; color: white; }
      &.grade-c { background: var(--warning); color: white; }
      &.grade-d { background: #F59E0B; color: white; }
      &.grade-f { background: var(--error); color: white; }
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: var(--bg-secondary);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--primary);
      transition: var(--transition);

      &.progress-warning { background: var(--warning); }
      &.progress-danger { background: var(--error); }
    }

    .operations-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .operation-item {
      padding: var(--s3);
      border-bottom: 1px solid var(--border);
      transition: var(--transition);

      &:hover {
        background: var(--bg-secondary);
      }

      &:last-child {
        border-bottom: none;
      }
    }

    .operation-type-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);

      &.type-cache-hit { 
        background: var(--success); 
        color: white; 
      }
      &.type-cache-miss { 
        background: var(--warning); 
        color: white; 
      }
      &.type-api-call { 
        background: var(--info); 
        color: white; 
      }
      &.type-batch-load { 
        background: var(--primary); 
        color: white; 
      }
      &.type-lazy-load { 
        background: var(--secondary); 
        color: var(--text); 
      }
    }

    .loading-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid var(--border);
      border-top: 2px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .btn-sm {
      padding: var(--s2) var(--s3);
      font-size: var(--text-xs);
      min-height: 32px;
    }

    // Mobile responsiveness
    @media (max-width: 640px) {
      .performance-monitor-container {
        padding: var(--s4);
      }

      .grid-4 {
        grid-template-columns: repeat(2, 1fr);
      }

      .grid-2 {
        grid-template-columns: 1fr;
      }

      .flex {
        flex-direction: column;
        gap: var(--s2);
        align-items: stretch;
      }
    }
  `]
})
export class BranchPerformanceMonitorComponent implements OnInit {
  private readonly optimizerService = inject(BranchPerformanceOptimizerService);
  private readonly stateService = inject(StateService);

  // Component signals
  readonly cacheHitRatio = this.optimizerService.cacheHitRatio;
  readonly averageLoadTime = this.optimizerService.averageLoadTime;
  readonly activeOperations = this.optimizerService.activeOperations;
  readonly performanceInsights = this.optimizerService.performanceInsights;
  readonly cacheStats = this.optimizerService.cacheStatistics;

  // Recent metrics (last 10 operations)
  readonly recentMetrics = computed(() => 
    this.optimizerService.performanceMetrics().slice(0, 10)
  );

  readonly hasCacheData = computed(() => 
    (this.cacheStats()?.totalEntries || 0) > 0
  );

  ngOnInit(): void {
    console.log('📊 Performance Monitor initialized');
  }

  // Action methods
  clearCache(): void {
    this.optimizerService.clearCache();
  }

  enablePerformanceMode(): void {
    this.optimizerService.enablePerformanceMode();
  }

  // Utility methods
  getCacheRatingText(ratio: number): string {
    if (ratio >= 80) return 'Excellent';
    if (ratio >= 60) return 'Good';
    if (ratio >= 40) return 'Fair';
    return 'Poor';
  }

  getLoadTimeRatingText(time: number): string {
    if (time < 200) return 'Excellent';
    if (time < 500) return 'Good';
    if (time < 1000) return 'Fair';
    return 'Needs improvement';
  }

  getGradeDescription(grade?: string): string {
    switch (grade) {
      case 'A': return 'Excellent';
      case 'B': return 'Good';
      case 'C': return 'Average';
      case 'D': return 'Below Average';
      case 'F': return 'Poor';
      default: return 'No data';
    }
  }

  formatOperationType(type: string): string {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  formatRelativeTime(timestamp: string): string {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  formatDataSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / 1048576 * 100) / 100}MB`;
  }

  getPerformanceRating(time: number): string {
    if (time < 200) return 'Fast';
    if (time < 500) return 'Good';
    if (time < 1000) return 'Slow';
    return 'Very Slow';
  }

  // TrackBy function
  trackByMetric = (index: number, metric: any): string => metric.operationId;
}