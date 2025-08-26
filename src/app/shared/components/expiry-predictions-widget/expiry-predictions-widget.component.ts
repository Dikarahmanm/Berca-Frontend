// src/app/shared/components/expiry-predictions-widget/expiry-predictions-widget.component.ts
// ✅ EXPIRY PREDICTIONS WIDGET: Displays ML-powered expiry analytics
// Following Project Guidelines: Signal-based, Performance Optimized, Clean Design

import { Component, Input, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';

import { SmartAnalyticsWidgetComponent, SmartWidgetConfig, WidgetData, WidgetAction } from '../smart-analytics-widget/smart-analytics-widget.component';
import { ExpiryAnalyticsService } from '../../../core/services/expiry-analytics.service';
import { ComprehensiveExpiryAnalyticsDto, CategoryExpiryStatsDto, SmartFifoRecommendationDto } from '../../../core/interfaces/smart-analytics.interfaces';

@Component({
  selector: 'app-expiry-predictions-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule, 
    MatButtonModule,
    MatTooltipModule,
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
      
      <!-- Expiry Predictions Content -->
      <div class="expiry-predictions-content" *ngIf="analytics()">
        
        <!-- Critical Stats Overview -->
        <div class="stats-overview">
          <div class="stat-card critical">
            <div class="stat-icon">
              <mat-icon>warning</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ analytics()!.expiringIn7Days }}</div>
              <div class="stat-label">Expiring in 7 Days</div>
            </div>
          </div>
          
          <div class="stat-card warning">
            <div class="stat-icon">
              <mat-icon>schedule</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ analytics()!.expiringIn30Days }}</div>
              <div class="stat-label">Expiring in 30 Days</div>
            </div>
          </div>
          
          <div class="stat-card info">
            <div class="stat-icon">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ analytics()!.totalProducts }}</div>
              <div class="stat-label">Total Products</div>
            </div>
          </div>
        </div>

        <!-- Risk Analysis -->
        <div class="risk-analysis" *ngIf="analytics()!.riskAnalysis">
          <h4 class="section-title">
            <mat-icon>psychology</mat-icon>
            Risk Analysis
          </h4>
          
          <div class="risk-meter">
            <div class="risk-level" [class]="getRiskLevelClass()">
              <span class="risk-label">{{ analytics()!.riskAnalysis.overallRisk }}</span>
              <span class="risk-score">{{ (analytics()!.riskAnalysis.riskScore * 100).toFixed(0) }}%</span>
            </div>
            
            <mat-progress-bar 
              mode="determinate" 
              [value]="analytics()!.riskAnalysis.riskScore * 100"
              [color]="getRiskColor()">
            </mat-progress-bar>
          </div>
          
          <div class="risk-insights">
            <div class="insight-item" *ngFor="let insight of analytics()!.riskAnalysis.insights">
              <mat-icon class="insight-icon">{{ getInsightIcon(insight.type) }}</mat-icon>
              <span class="insight-text">{{ insight.message }}</span>
            </div>
          </div>
        </div>

        <!-- Top Category Risks -->
        <div class="category-risks" *ngIf="topRiskyCategories().length > 0">
          <h4 class="section-title">
            <mat-icon>category</mat-icon>
            High-Risk Categories
          </h4>
          
          <div class="category-list">
            <div class="category-item" *ngFor="let category of topRiskyCategories().slice(0, 3)">
              <div class="category-header">
                <span class="category-name">{{ category.categoryName }}</span>
                <span class="category-count">{{ category.expiringCount }} items</span>
              </div>
              
              <div class="category-progress">
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="getCategoryRiskPercentage(category)"
                  color="warn">
                </mat-progress-bar>
              </div>
              
              <div class="category-details">
                <span class="expiry-date">Next: {{ formatExpiryDate(category.nearestExpiryDate) }}</span>
                <span class="potential-loss">Loss: {{ formatCurrency(category.potentialLoss) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions" *ngIf="quickActions().length > 0">
          <h4 class="section-title">
            <mat-icon>flash_on</mat-icon>
            Quick Actions
          </h4>
          
          <div class="action-buttons">
            <button 
              *ngFor="let action of quickActions().slice(0, 2)"
              class="quick-action-btn"
              [class]="getActionButtonClass(action)"
              (click)="executeQuickAction(action)"
              [matTooltip]="action.description">
              <mat-icon>{{ action.icon }}</mat-icon>
              <span>{{ action.title }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State for No Predictions -->
      <div class="no-predictions" *ngIf="!analytics()">
        <div class="empty-illustration">
          <mat-icon>psychology</mat-icon>
        </div>
        <h3>No Expiry Predictions</h3>
        <p>All products have healthy expiry timelines</p>
      </div>
    </app-smart-analytics-widget>
  `,
  styles: [`
    .expiry-predictions-content {
      display: flex;
      flex-direction: column;
      gap: var(--s4);
    }

    .stats-overview {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--s3);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s3);
      border-radius: var(--radius);
      border: 1px solid var(--border);

      &.critical {
        background: rgba(212, 74, 63, 0.1);
        border-color: var(--error);
      }

      &.warning {
        background: rgba(230, 168, 85, 0.1);
        border-color: var(--warning);
      }

      &.info {
        background: rgba(75, 137, 230, 0.1);
        border-color: var(--info);
      }
    }

    .stat-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .critical & mat-icon { color: var(--error); }
      .warning & mat-icon { color: var(--warning); }
      .info & mat-icon { color: var(--info); }
    }

    .stat-content {
      flex: 1;
    }

    .stat-number {
      font-size: var(--text-xl);
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

    .risk-analysis {
      padding: var(--s3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-primary);
    }

    .risk-meter {
      margin-bottom: var(--s3);
    }

    .risk-level {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s2);

      &.low {
        .risk-label { color: var(--success); }
      }

      &.medium {
        .risk-label { color: var(--warning); }
      }

      &.high, &.critical {
        .risk-label { color: var(--error); }
      }
    }

    .risk-label {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      text-transform: uppercase;
    }

    .risk-score {
      font-size: var(--text-sm);
      font-weight: var(--font-bold);
      color: var(--text);
    }

    .risk-insights {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .insight-item {
      display: flex;
      align-items: flex-start;
      gap: var(--s2);
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .insight-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--primary);
      margin-top: 1px;
    }

    .category-list {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
    }

    .category-item {
      padding: var(--s3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s2);
    }

    .category-name {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text);
    }

    .category-count {
      font-size: var(--text-xs);
      color: var(--error);
      font-weight: var(--font-semibold);
    }

    .category-progress {
      margin-bottom: var(--s2);
    }

    .category-details {
      display: flex;
      justify-content: space-between;
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .potential-loss {
      color: var(--error);
      font-weight: var(--font-semibold);
    }

    .action-buttons {
      display: flex;
      gap: var(--s2);
    }

    .quick-action-btn {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s2) var(--s3);
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--primary);
      cursor: pointer;
      transition: var(--transition);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);

      &:hover {
        background: var(--primary);
        color: white;
      }

      &.urgent {
        background: var(--error);
        color: white;
        border-color: var(--error);

        &:hover {
          background: var(--primary-hover);
        }
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .no-predictions {
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

    // Mobile responsive
    @media (max-width: 640px) {
      .stats-overview {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-direction: column;
      }

      .category-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--s1);
      }
    }
  `]
})
export class ExpiryPredictionsWidgetComponent implements OnInit {
  private expiryService = inject(ExpiryAnalyticsService);
  private router = inject(Router);

  // Widget Configuration
  widgetConfig: SmartWidgetConfig = {
    type: 'EXPIRY_PREDICTIONS',
    title: 'Expiry Predictions',
    subtitle: 'AI-powered expiry analytics',
    icon: 'psychology',
    refreshInterval: 300000, // 5 minutes
    autoRefresh: true,
    showActions: true,
    size: 'LARGE'
  };

  // Widget State
  widgetData = signal<WidgetData>({ loading: false });

  // Widget Actions
  widgetActions: WidgetAction[] = [
    {
      id: 'view-all',
      label: 'View All Predictions',
      icon: 'list',
      type: 'PRIMARY'
    },
    {
      id: 'export-report',
      label: 'Export Report',
      icon: 'download',
      type: 'SECONDARY'
    }
  ];

  // Data Signals
  readonly analytics = computed(() => {
    const data = this.widgetData().data;
    return data as ComprehensiveExpiryAnalyticsDto | null;
  });

  readonly topRiskyCategories = computed(() => {
    const analytics = this.analytics();
    if (!analytics?.categoryBreakdown) return [];
    
    return analytics.categoryBreakdown
      .filter(cat => cat.expiringCount > 0)
      .sort((a, b) => b.potentialLoss - a.potentialLoss);
  });

  readonly quickActions = computed(() => {
    const analytics = this.analytics();
    if (!analytics) return [];

    const actions = [];
    
    if (analytics.expiringIn7Days > 0) {
      actions.push({
        id: 'urgent-fifo',
        title: 'Urgent FIFO',
        description: 'Process items expiring in 7 days',
        icon: 'priority_high',
        type: 'URGENT'
      });
    }

    if (analytics.recommendations?.length > 0) {
      actions.push({
        id: 'apply-recommendations',
        title: 'Apply AI Recommendations',
        description: 'Auto-apply smart recommendations',
        icon: 'auto_fix_high',
        type: 'PRIMARY'
      });
    }

    return actions;
  });

  ngOnInit() {
    this.loadExpiryPredictions();
  }

  // Data Loading
  async loadExpiryPredictions(): Promise<void> {
    this.widgetData.update(data => ({ ...data, loading: true, error: undefined }));

    try {
      const analytics = await this.expiryService.getComprehensiveAnalytics();
      
      this.widgetData.set({
        loading: false,
        data: analytics,
        lastUpdated: new Date(),
        metadata: {
          totalItems: analytics?.totalProducts || 0,
          confidenceScore: analytics?.riskAnalysis?.riskScore || 0,
          dataFreshness: 0 // Just loaded
        }
      });

    } catch (error: any) {
      this.widgetData.update(data => ({
        ...data,
        loading: false,
        error: 'Failed to load expiry predictions'
      }));
      console.error('Error loading expiry predictions:', error);
    }
  }

  // Event Handlers
  onRefresh(): void {
    this.loadExpiryPredictions();
  }

  onExpand(): void {
    this.router.navigate(['/dashboard/analytics'], { 
      queryParams: { view: 'expiry-predictions' }
    });
  }

  onActionClick(action: WidgetAction): void {
    switch (action.id) {
      case 'view-all':
        this.router.navigate(['/dashboard/analytics/expiry']);
        break;
      case 'export-report':
        this.exportExpiryReport();
        break;
    }
  }

  executeQuickAction(action: any): void {
    switch (action.id) {
      case 'urgent-fifo':
        this.router.navigate(['/dashboard/inventory'], {
          queryParams: { filter: 'expiring-7-days' }
        });
        break;
      case 'apply-recommendations':
        this.applyAIRecommendations();
        break;
    }
  }

  // Utility Methods
  getRiskLevelClass(): string {
    const analytics = this.analytics();
    if (!analytics?.riskAnalysis) return '';
    
    return analytics.riskAnalysis.overallRisk.toLowerCase();
  }

  getRiskColor(): 'primary' | 'accent' | 'warn' {
    const analytics = this.analytics();
    if (!analytics?.riskAnalysis) return 'primary';
    
    const risk = analytics.riskAnalysis.overallRisk.toLowerCase();
    if (risk === 'high' || risk === 'critical') return 'warn';
    if (risk === 'medium') return 'accent';
    return 'primary';
  }

  getInsightIcon(type: string): string {
    const icons: Record<string, string> = {
      'WARNING': 'warning',
      'INFO': 'info',
      'RECOMMENDATION': 'lightbulb',
      'ALERT': 'notification_important'
    };
    return icons[type] || 'info';
  }

  getCategoryRiskPercentage(category: CategoryExpiryStatsDto): number {
    if (!category.totalCount) return 0;
    return (category.expiringCount / category.totalCount) * 100;
  }

  getActionButtonClass(action: any): string {
    return action.type === 'URGENT' ? 'urgent' : '';
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

  private async applyAIRecommendations(): Promise<void> {
    // Implementation for applying AI recommendations
    console.log('🤖 Applying AI recommendations...');
  }

  private async exportExpiryReport(): Promise<void> {
    // Implementation for exporting expiry report
    console.log('📊 Exporting expiry report...');
  }
}