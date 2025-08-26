// src/app/shared/components/fifo-recommendations-widget/fifo-recommendations-widget.component.ts
// ✅ FIFO RECOMMENDATIONS WIDGET: Displays ML-powered FIFO recommendations
// Following Project Guidelines: Signal-based, Performance Optimized, Clean Design

import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';

import { SmartAnalyticsWidgetComponent, SmartWidgetConfig, WidgetData, WidgetAction } from '../smart-analytics-widget/smart-analytics-widget.component';
import { ExpiryAnalyticsService } from '../../../core/services/expiry-analytics.service';
import { SmartFifoRecommendationDto } from '../../../core/interfaces/smart-analytics.interfaces';

@Component({
  selector: 'app-fifo-recommendations-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule, 
    MatTooltipModule,
    MatChipsModule,
    MatProgressBarModule,
    SmartAnalyticsWidgetComponent
  ],
  template: `
    <app-smart-analytics-widget
      [config]="widgetConfig"
      [widgetData]="widgetData"
      [actions]="widgetActions"
      (refresh)="onRefresh()"
      (expand)="onExpand()"
      (actionClick)="onActionClick($event)">
      
      <!-- FIFO Recommendations Content -->
      <div class="fifo-recommendations-content" *ngIf="recommendations().length > 0">
        
        <!-- Summary Stats -->
        <div class="fifo-summary">
          <div class="summary-stat">
            <span class="stat-number">{{ recommendations().length }}</span>
            <span class="stat-label">Active Recommendations</span>
          </div>
          
          <div class="summary-stat">
            <span class="stat-number">{{ totalPotentialSavings() | currency:'IDR':'symbol':'1.0-0' }}</span>
            <span class="stat-label">Potential Savings</span>
          </div>
          
          <div class="summary-stat priority">
            <span class="stat-number">{{ highPriorityCount() }}</span>
            <span class="stat-label">High Priority</span>
          </div>
        </div>

        <!-- Top Priority Recommendations -->
        <div class="priority-recommendations">
          <h4 class="section-title">
            <mat-icon>priority_high</mat-icon>
            Priority Actions
          </h4>
          
          <div class="recommendation-list">
            <div 
              class="recommendation-item" 
              *ngFor="let recommendation of topPriorityRecommendations().slice(0, 3)"
              [class.urgent]="recommendation.priority === 'CRITICAL'">
              
              <!-- Recommendation Header -->
              <div class="recommendation-header">
                <div class="product-info">
                  <h5 class="product-name">{{ recommendation.productName }}</h5>
                  <span class="product-code">{{ recommendation.productCode }}</span>
                </div>
                
                <div class="priority-badge" [class]="getPriorityClass(recommendation.priority)">
                  {{ recommendation.priority }}
                </div>
              </div>

              <!-- Recommendation Details -->
              <div class="recommendation-details">
                <div class="detail-row">
                  <div class="detail-item">
                    <mat-icon>inventory</mat-icon>
                    <span>{{ recommendation.currentStock }} units</span>
                  </div>
                  
                  <div class="detail-item expiry-warning">
                    <mat-icon>schedule</mat-icon>
                    <span>{{ formatExpiryDate(recommendation.nearestExpiryDate) }}</span>
                  </div>
                  
                  <div class="detail-item savings">
                    <mat-icon>savings</mat-icon>
                    <span>Save {{ formatCurrency(recommendation.potentialSavings) }}</span>
                  </div>
                </div>
              </div>

              <!-- AI Recommendation -->
              <div class="ai-recommendation">
                <div class="ai-badge">
                  <mat-icon>psychology</mat-icon>
                  <span>AI Suggestion</span>
                </div>
                <p class="recommendation-text">{{ recommendation.recommendation }}</p>
              </div>

              <!-- Action Buttons -->
              <div class="recommendation-actions">
                <button 
                  class="action-btn primary"
                  (click)="executeRecommendation(recommendation)"
                  [matTooltip]="'Apply this recommendation automatically'">
                  <mat-icon>auto_fix_high</mat-icon>
                  <span>Apply</span>
                </button>
                
                <button 
                  class="action-btn secondary"
                  (click)="viewRecommendationDetails(recommendation)"
                  [matTooltip]="'View detailed analysis'">
                  <mat-icon>analytics</mat-icon>
                  <span>Analyze</span>
                </button>
                
                <button 
                  class="action-btn tertiary"
                  (click)="dismissRecommendation(recommendation)"
                  [matTooltip]="'Dismiss this recommendation'">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <!-- Confidence Indicator -->
              <div class="confidence-indicator">
                <span class="confidence-label">AI Confidence:</span>
                <div class="confidence-bar">
                  <mat-progress-bar 
                    mode="determinate" 
                    [value]="recommendation.confidenceScore * 100"
                    [color]="getConfidenceColor(recommendation.confidenceScore)">
                  </mat-progress-bar>
                </div>
                <span class="confidence-score">{{ (recommendation.confidenceScore * 100).toFixed(0) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="category-breakdown" *ngIf="categoryBreakdown().length > 0">
          <h4 class="section-title">
            <mat-icon>category</mat-icon>
            By Category
          </h4>
          
          <div class="category-chips">
            <mat-chip-set>
              <mat-chip 
                *ngFor="let category of categoryBreakdown()"
                [class]="getCategoryChipClass(category.recommendationCount)">
                {{ category.categoryName }}
                <span class="chip-count">{{ category.recommendationCount }}</span>
              </mat-chip>
            </mat-chip-set>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div class="bulk-actions" *ngIf="recommendations().length > 1">
          <h4 class="section-title">
            <mat-icon>playlist_add_check</mat-icon>
            Bulk Actions
          </h4>
          
          <div class="bulk-action-buttons">
            <button 
              class="bulk-action-btn apply-all"
              (click)="applyAllRecommendations()"
              [disabled]="isApplyingBulk()"
              [matTooltip]="'Apply all high-priority recommendations'">
              <mat-icon>done_all</mat-icon>
              <span>Apply All High Priority</span>
            </button>
            
            <button 
              class="bulk-action-btn export"
              (click)="exportRecommendations()"
              [matTooltip]="'Export recommendations report'">
              <mat-icon>file_download</mat-icon>
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="no-recommendations" *ngIf="recommendations().length === 0">
        <div class="empty-illustration">
          <mat-icon>smart_toy</mat-icon>
        </div>
        <h3>No Recommendations</h3>
        <p>Your inventory is optimally managed</p>
        <button class="refresh-btn" (click)="onRefresh()">
          <mat-icon>refresh</mat-icon>
          <span>Check Again</span>
        </button>
      </div>
    </app-smart-analytics-widget>
  `,
  styles: [`
    .fifo-recommendations-content {
      display: flex;
      flex-direction: column;
      gap: var(--s4);
    }

    .fifo-summary {
      display: grid;
      grid-template-columns: 2fr 2fr 1fr;
      gap: var(--s3);
      padding: var(--s3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-primary);
    }

    .summary-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      &.priority {
        .stat-number {
          color: var(--error);
        }
      }
    }

    .stat-number {
      font-size: var(--text-lg);
      font-weight: var(--font-bold);
      color: var(--text);
      line-height: var(--leading-tight);
    }

    .stat-label {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      font-weight: var(--font-medium);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: var(--s2);
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin: 0 0 var(--s3) 0;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--primary);
      }
    }

    .recommendation-list {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
    }

    .recommendation-item {
      padding: var(--s4);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      transition: var(--transition);

      &:hover {
        border-color: var(--primary);
      }

      &.urgent {
        border-color: var(--error);
        background: rgba(212, 74, 63, 0.05);
      }
    }

    .recommendation-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--s3);
    }

    .product-info {
      flex: 1;
    }

    .product-name {
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      color: var(--text);
      margin: 0 0 var(--s1) 0;
    }

    .product-code {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      font-family: monospace;
    }

    .priority-badge {
      padding: var(--s1) var(--s2);
      border-radius: var(--radius);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      text-transform: uppercase;

      &.critical {
        background: var(--error);
        color: white;
      }

      &.high {
        background: var(--warning);
        color: white;
      }

      &.medium {
        background: var(--info);
        color: white;
      }

      &.low {
        background: var(--bg-secondary);
        color: var(--text);
      }
    }

    .recommendation-details {
      margin-bottom: var(--s3);
    }

    .detail-row {
      display: flex;
      gap: var(--s4);
      flex-wrap: wrap;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: var(--s1);
      font-size: var(--text-sm);
      color: var(--text-secondary);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.expiry-warning {
        color: var(--warning);
        font-weight: var(--font-medium);
      }

      &.savings {
        color: var(--success);
        font-weight: var(--font-semibold);
      }
    }

    .ai-recommendation {
      margin-bottom: var(--s3);
      padding: var(--s3);
      border-radius: var(--radius);
      background: rgba(228, 122, 63, 0.1);
    }

    .ai-badge {
      display: flex;
      align-items: center;
      gap: var(--s1);
      margin-bottom: var(--s2);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      color: var(--primary);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .recommendation-text {
      font-size: var(--text-sm);
      color: var(--text);
      margin: 0;
      line-height: var(--leading-relaxed);
    }

    .recommendation-actions {
      display: flex;
      gap: var(--s2);
      margin-bottom: var(--s3);
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: var(--s1);
      padding: var(--s2) var(--s3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      cursor: pointer;
      transition: var(--transition);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &.primary {
        background: var(--primary);
        color: white;
        border-color: var(--primary);

        &:hover {
          background: var(--primary-hover);
        }
      }

      &.secondary {
        color: var(--info);
        border-color: var(--info);

        &:hover {
          background: var(--info);
          color: white;
        }
      }

      &.tertiary {
        color: var(--text-secondary);

        &:hover {
          background: var(--bg-secondary);
        }
      }
    }

    .confidence-indicator {
      display: flex;
      align-items: center;
      gap: var(--s2);
      font-size: var(--text-xs);
    }

    .confidence-label {
      color: var(--text-secondary);
      min-width: 80px;
    }

    .confidence-bar {
      flex: 1;
      max-width: 100px;
    }

    .confidence-score {
      color: var(--text);
      font-weight: var(--font-semibold);
      min-width: 35px;
    }

    .category-chips {
      mat-chip-set {
        display: flex;
        flex-wrap: wrap;
        gap: var(--s2);
      }

      mat-chip {
        position: relative;
        
        &.high-activity {
          background: var(--error);
          color: white;
        }

        &.medium-activity {
          background: var(--warning);
          color: white;
        }

        &.low-activity {
          background: var(--bg-secondary);
          color: var(--text);
        }

        .chip-count {
          margin-left: var(--s1);
          font-weight: var(--font-bold);
        }
      }
    }

    .bulk-action-buttons {
      display: flex;
      gap: var(--s3);
    }

    .bulk-action-btn {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s3) var(--s4);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      cursor: pointer;
      transition: var(--transition);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      min-height: 44px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.apply-all {
        background: var(--success);
        color: white;
        border-color: var(--success);

        &:hover:not(:disabled) {
          background: rgba(82, 165, 115, 0.9);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      &.export {
        color: var(--info);
        border-color: var(--info);

        &:hover {
          background: var(--info);
          color: white;
        }
      }
    }

    .no-recommendations {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--s8) var(--s4);
      text-align: center;
    }

    .empty-illustration {
      margin-bottom: var(--s4);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--text-muted);
      }
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s3) var(--s4);
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--primary);
      cursor: pointer;
      transition: var(--transition);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      margin-top: var(--s4);

      &:hover {
        background: var(--primary);
        color: white;
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    // Mobile responsive
    @media (max-width: 640px) {
      .fifo-summary {
        grid-template-columns: 1fr;
      }

      .detail-row {
        flex-direction: column;
        gap: var(--s2);
      }

      .recommendation-actions {
        flex-direction: column;
      }

      .bulk-action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class FifoRecommendationsWidgetComponent implements OnInit {
  private expiryService = inject(ExpiryAnalyticsService);
  private router = inject(Router);

  // Widget Configuration
  widgetConfig: SmartWidgetConfig = {
    type: 'FIFO_RECOMMENDATIONS',
    title: 'FIFO Recommendations',
    subtitle: 'AI-powered inventory optimization',
    icon: 'smart_toy',
    refreshInterval: 600000, // 10 minutes
    autoRefresh: true,
    showActions: true,
    size: 'LARGE'
  };

  // Widget State
  widgetData = signal<WidgetData>({ loading: false });
  private isApplyingBulkSignal = signal<boolean>(false);

  // Widget Actions
  widgetActions: WidgetAction[] = [
    {
      id: 'view-all',
      label: 'View All Recommendations',
      icon: 'list',
      type: 'PRIMARY'
    },
    {
      id: 'settings',
      label: 'AI Settings',
      icon: 'settings',
      type: 'SECONDARY'
    }
  ];

  // Computed Properties
  readonly recommendations = computed(() => {
    const data = this.widgetData().data;
    return (data as SmartFifoRecommendationDto[]) || [];
  });

  readonly topPriorityRecommendations = computed(() => {
    return this.recommendations()
      .filter(rec => rec.priority === 'CRITICAL' || rec.priority === 'HIGH')
      .sort((a, b) => {
        const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  });

  readonly totalPotentialSavings = computed(() => {
    return this.recommendations()
      .reduce((total, rec) => total + rec.potentialSavings, 0);
  });

  readonly highPriorityCount = computed(() => {
    return this.recommendations()
      .filter(rec => rec.priority === 'CRITICAL' || rec.priority === 'HIGH')
      .length;
  });

  readonly categoryBreakdown = computed(() => {
    const recommendations = this.recommendations();
    const categoryMap = new Map<string, number>();

    recommendations.forEach(rec => {
      const count = categoryMap.get(rec.categoryName) || 0;
      categoryMap.set(rec.categoryName, count + 1);
    });

    return Array.from(categoryMap.entries())
      .map(([categoryName, recommendationCount]) => ({
        categoryName,
        recommendationCount
      }))
      .sort((a, b) => b.recommendationCount - a.recommendationCount);
  });

  readonly isApplyingBulk = this.isApplyingBulkSignal.asReadonly();

  ngOnInit() {
    this.loadFifoRecommendations();
  }

  // Data Loading
  async loadFifoRecommendations(): Promise<void> {
    this.widgetData.update(data => ({ ...data, loading: true, error: undefined }));

    try {
      const recommendations = await this.expiryService.getSmartFifoRecommendations();
      
      this.widgetData.set({
        loading: false,
        data: recommendations,
        lastUpdated: new Date(),
        metadata: {
          totalItems: recommendations?.length || 0,
          confidenceScore: this.calculateAverageConfidence(recommendations || []),
          dataFreshness: 0
        }
      });

    } catch (error: any) {
      this.widgetData.update(data => ({
        ...data,
        loading: false,
        error: 'Failed to load FIFO recommendations'
      }));
      console.error('Error loading FIFO recommendations:', error);
    }
  }

  // Event Handlers
  onRefresh(): void {
    this.loadFifoRecommendations();
  }

  onExpand(): void {
    this.router.navigate(['/dashboard/analytics'], { 
      queryParams: { view: 'fifo-recommendations' }
    });
  }

  onActionClick(action: WidgetAction): void {
    switch (action.id) {
      case 'view-all':
        this.router.navigate(['/dashboard/analytics/fifo']);
        break;
      case 'settings':
        this.openAISettings();
        break;
    }
  }

  // Recommendation Actions
  async executeRecommendation(recommendation: SmartFifoRecommendationDto): Promise<void> {
    console.log('🤖 Executing recommendation:', recommendation.id);
    // Implementation for executing single recommendation
  }

  viewRecommendationDetails(recommendation: SmartFifoRecommendationDto): void {
    this.router.navigate(['/dashboard/analytics/fifo', recommendation.id]);
  }

  async dismissRecommendation(recommendation: SmartFifoRecommendationDto): Promise<void> {
    console.log('❌ Dismissing recommendation:', recommendation.id);
    // Implementation for dismissing recommendation
  }

  async applyAllRecommendations(): Promise<void> {
    this.isApplyingBulkSignal.set(true);
    
    try {
      const highPriorityRecs = this.topPriorityRecommendations();
      console.log('🚀 Applying all recommendations:', highPriorityRecs.length);
      
      // Implementation for bulk applying recommendations
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      // Refresh data after applying
      await this.loadFifoRecommendations();
      
    } catch (error) {
      console.error('Error applying bulk recommendations:', error);
    } finally {
      this.isApplyingBulkSignal.set(false);
    }
  }

  async exportRecommendations(): Promise<void> {
    console.log('📊 Exporting FIFO recommendations...');
    // Implementation for exporting recommendations
  }

  // Utility Methods
  getPriorityClass(priority: string): string {
    return priority.toLowerCase();
  }

  getConfidenceColor(score: number): 'primary' | 'accent' | 'warn' {
    if (score >= 0.8) return 'primary';
    if (score >= 0.6) return 'accent';
    return 'warn';
  }

  getCategoryChipClass(count: number): string {
    if (count >= 5) return 'high-activity';
    if (count >= 2) return 'medium-activity';
    return 'low-activity';
  }

  formatExpiryDate(date: string): string {
    const expiryDate = new Date(date);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    
    return expiryDate.toLocaleDateString('id-ID');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private calculateAverageConfidence(recommendations: SmartFifoRecommendationDto[]): number {
    if (recommendations.length === 0) return 0;
    
    const total = recommendations.reduce((sum, rec) => sum + rec.confidenceScore, 0);
    return total / recommendations.length;
  }

  private openAISettings(): void {
    this.router.navigate(['/dashboard/settings'], { 
      queryParams: { section: 'ai-recommendations' }
    });
  }
}