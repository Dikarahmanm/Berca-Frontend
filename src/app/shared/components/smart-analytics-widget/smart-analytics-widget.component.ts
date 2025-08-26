// src/app/shared/components/smart-analytics-widget/smart-analytics-widget.component.ts
// ✅ SMART ANALYTICS WIDGET: Reusable Widget Component
// Following Project Guidelines: Signal-based, Performance Optimized, Clean Design

import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ===== WIDGET INTERFACES =====
export interface SmartWidgetConfig {
  type: 'EXPIRY_PREDICTIONS' | 'FIFO_RECOMMENDATIONS' | 'CATEGORY_PERFORMANCE' | 'BRANCH_ANALYTICS' | 'SMART_ALERTS' | 'WASTE_OPTIMIZATION';
  title: string;
  subtitle?: string;
  icon: string;
  refreshInterval?: number; // milliseconds
  autoRefresh?: boolean;
  showActions?: boolean;
  size?: 'SMALL' | 'MEDIUM' | 'LARGE';
  theme?: 'LIGHT' | 'DARK' | 'AUTO';
}

export interface WidgetAction {
  id: string;
  label: string;
  icon: string;
  type: 'PRIMARY' | 'SECONDARY' | 'WARNING' | 'DANGER';
  disabled?: boolean;
}

export interface WidgetData {
  loading: boolean;
  error?: string;
  data?: any;
  lastUpdated?: Date;
  metadata?: {
    totalItems?: number;
    confidenceScore?: number;
    dataFreshness?: number;
    [key: string]: any;
  };
}

@Component({
  selector: 'app-smart-analytics-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="smart-widget" 
         [class]="getWidgetClasses()"
         [attr.data-widget-type]="config.type.toLowerCase()">
      
      <!-- Widget Header -->
      <div class="widget-header">
        <div class="widget-title-section">
          <div class="widget-icon" [class]="getIconClasses()">
            <mat-icon>{{ config.icon }}</mat-icon>
          </div>
          <div class="widget-title-text">
            <h3 class="widget-title">{{ config.title }}</h3>
            <p class="widget-subtitle" *ngIf="config.subtitle">{{ config.subtitle }}</p>
          </div>
        </div>
        
        <div class="widget-actions" *ngIf="config.showActions">
          <button 
            class="widget-action-btn refresh-btn"
            (click)="onRefresh()"
            [disabled]="widgetData().loading"
            matTooltip="Refresh Data">
            <mat-icon [class.spinning]="widgetData().loading">refresh</mat-icon>
          </button>
          
          <button 
            class="widget-action-btn expand-btn"
            (click)="onExpand()"
            matTooltip="View Details">
            <mat-icon>open_in_new</mat-icon>
          </button>
          
          <button 
            class="widget-action-btn menu-btn"
            (click)="onMenuToggle()"
            matTooltip="More Options">
            <mat-icon>more_vert</mat-icon>
          </button>
        </div>
      </div>

      <!-- Widget Content -->
      <div class="widget-content" [class.loading]="widgetData().loading">
        
        <!-- Loading State -->
        <div class="widget-loading" *ngIf="widgetData().loading && !hasData()">
          <div class="loading-spinner">
            <mat-spinner diameter="32"></mat-spinner>
          </div>
          <p class="loading-text">{{ getLoadingMessage() }}</p>
        </div>

        <!-- Error State -->
        <div class="widget-error" *ngIf="widgetData().error && !widgetData().loading">
          <div class="error-icon">
            <mat-icon>error_outline</mat-icon>
          </div>
          <div class="error-content">
            <h4>Error Loading Data</h4>
            <p>{{ widgetData().error }}</p>
            <button class="error-retry-btn" (click)="onRefresh()">
              <mat-icon>refresh</mat-icon>
              <span>Try Again</span>
            </button>
          </div>
        </div>

        <!-- Data Content -->
        <div class="widget-data" *ngIf="hasData() && !widgetData().error">
          <ng-content></ng-content>
        </div>

        <!-- Empty State -->
        <div class="widget-empty" *ngIf="!hasData() && !widgetData().loading && !widgetData().error">
          <div class="empty-icon">
            <mat-icon>{{ getEmptyStateIcon() }}</mat-icon>
          </div>
          <div class="empty-content">
            <h4>{{ getEmptyStateTitle() }}</h4>
            <p>{{ getEmptyStateMessage() }}</p>
          </div>
        </div>
      </div>

      <!-- Widget Footer -->
      <div class="widget-footer" *ngIf="showFooter()">
        
        <!-- Data Metadata -->
        <div class="widget-metadata" *ngIf="widgetData().metadata">
          <div class="metadata-item" *ngIf="widgetData().metadata?.totalItems">
            <mat-icon>dataset</mat-icon>
            <span>{{ widgetData().metadata!.totalItems }} items</span>
          </div>
          
          <div class="metadata-item" *ngIf="widgetData().metadata?.confidenceScore">
            <mat-icon>psychology</mat-icon>
            <span>{{ ((widgetData().metadata?.confidenceScore || 0) * 100).toFixed(0) }}% confidence</span>
          </div>
          
          <div class="metadata-item" *ngIf="widgetData().lastUpdated">
            <mat-icon>schedule</mat-icon>
            <span>{{ formatLastUpdated(widgetData().lastUpdated!) }}</span>
          </div>
        </div>

        <!-- Custom Actions -->
        <div class="widget-custom-actions" *ngIf="actions.length > 0">
          <button 
            *ngFor="let action of actions"
            class="custom-action-btn"
            [class]="getActionClasses(action)"
            [disabled]="action.disabled || widgetData().loading"
            (click)="onActionClick(action)"
            [matTooltip]="action.label">
            <mat-icon>{{ action.icon }}</mat-icon>
            <span>{{ action.label }}</span>
          </button>
        </div>
      </div>

      <!-- Data Quality Indicator -->
      <div class="data-quality-indicator" 
           [class]="getDataQualityClass()"
           *ngIf="widgetData().metadata?.dataFreshness">
        <div class="quality-dot"></div>
      </div>
    </div>
  `,
  styleUrls: ['./smart-analytics-widget.component.scss']
})
export class SmartAnalyticsWidgetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ===== INPUT PROPERTIES =====
  @Input() config!: SmartWidgetConfig;
  @Input() widgetData = signal<WidgetData>({ loading: false });
  @Input() actions: WidgetAction[] = [];
  @Input() customClasses: string[] = [];

  // ===== OUTPUT EVENTS =====
  @Output() refresh = new EventEmitter<void>();
  @Output() expand = new EventEmitter<void>();
  @Output() actionClick = new EventEmitter<WidgetAction>();
  @Output() menuToggle = new EventEmitter<void>();

  // ===== INTERNAL STATE =====
  private refreshInterval: any;
  readonly showMenuDropdown = signal<boolean>(false);

  // ===== COMPUTED PROPERTIES =====
  readonly hasData = computed(() => {
    const data = this.widgetData();
    return data && data.data && !data.loading;
  });

  readonly dataQuality = computed(() => {
    const metadata = this.widgetData().metadata;
    if (!metadata?.dataFreshness) return 'UNKNOWN';
    
    const freshness = metadata.dataFreshness; // minutes
    if (freshness <= 5) return 'EXCELLENT';
    if (freshness <= 15) return 'GOOD';
    if (freshness <= 60) return 'FAIR';
    return 'STALE';
  });

  ngOnInit() {
    console.log('🎛️ Smart Analytics Widget initialized:', this.config.type);
    
    if (this.config.autoRefresh && this.config.refreshInterval) {
      this.setupAutoRefresh();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // ===== AUTO REFRESH SETUP =====
  private setupAutoRefresh(): void {
    if (this.config.refreshInterval && this.config.refreshInterval > 0) {
      this.refreshInterval = setInterval(() => {
        if (!this.widgetData().loading) {
          this.onRefresh();
        }
      }, this.config.refreshInterval);
    }
  }

  // ===== EVENT HANDLERS =====
  onRefresh(): void {
    console.log('🔄 Widget refresh requested:', this.config.type);
    this.refresh.emit();
  }

  onExpand(): void {
    console.log('📊 Widget expand requested:', this.config.type);
    this.expand.emit();
  }

  onMenuToggle(): void {
    this.showMenuDropdown.update(show => !show);
    this.menuToggle.emit();
  }

  onActionClick(action: WidgetAction): void {
    if (!action.disabled && !this.widgetData().loading) {
      console.log('⚡ Widget action clicked:', action.id);
      this.actionClick.emit(action);
    }
  }

  // ===== UTILITY METHODS =====
  getWidgetClasses(): string {
    const classes = ['smart-widget'];
    
    if (this.config.size) {
      classes.push(`size-${this.config.size.toLowerCase()}`);
    }
    
    if (this.config.theme) {
      classes.push(`theme-${this.config.theme.toLowerCase()}`);
    }
    
    if (this.widgetData().loading) {
      classes.push('loading');
    }
    
    if (this.widgetData().error) {
      classes.push('error');
    }
    
    if (this.hasData()) {
      classes.push('has-data');
    }
    
    if (this.customClasses) {
      classes.push(...this.customClasses);
    }
    
    return classes.join(' ');
  }

  getIconClasses(): string {
    const classes = ['widget-icon'];
    
    switch (this.config.type) {
      case 'EXPIRY_PREDICTIONS':
        classes.push('predictive');
        break;
      case 'FIFO_RECOMMENDATIONS':
        classes.push('recommendations');
        break;
      case 'CATEGORY_PERFORMANCE':
        classes.push('performance');
        break;
      case 'BRANCH_ANALYTICS':
        classes.push('analytics');
        break;
      case 'SMART_ALERTS':
        classes.push('alerts');
        break;
      case 'WASTE_OPTIMIZATION':
        classes.push('optimization');
        break;
    }
    
    return classes.join(' ');
  }

  getActionClasses(action: WidgetAction): string {
    const classes = ['custom-action-btn'];
    classes.push(`action-${action.type.toLowerCase()}`);
    
    if (action.disabled) {
      classes.push('disabled');
    }
    
    return classes.join(' ');
  }

  getDataQualityClass(): string {
    return `quality-${this.dataQuality().toLowerCase()}`;
  }

  showFooter(): boolean {
    return !!(this.widgetData().metadata || this.actions.length > 0);
  }

  // ===== LOADING & ERROR MESSAGES =====
  getLoadingMessage(): string {
    const messages: Record<string, string> = {
      'EXPIRY_PREDICTIONS': 'Analyzing expiry patterns...',
      'FIFO_RECOMMENDATIONS': 'Generating smart recommendations...',
      'CATEGORY_PERFORMANCE': 'Evaluating category trends...',
      'BRANCH_ANALYTICS': 'Comparing branch performance...',
      'SMART_ALERTS': 'Checking system alerts...',
      'WASTE_OPTIMIZATION': 'Calculating optimization potential...'
    };
    
    return messages[this.config.type] || 'Loading data...';
  }

  getEmptyStateIcon(): string {
    const icons: Record<string, string> = {
      'EXPIRY_PREDICTIONS': 'psychology',
      'FIFO_RECOMMENDATIONS': 'smart_toy',
      'CATEGORY_PERFORMANCE': 'trending_up',
      'BRANCH_ANALYTICS': 'account_tree',
      'SMART_ALERTS': 'notifications_none',
      'WASTE_OPTIMIZATION': 'eco'
    };
    
    return icons[this.config.type] || 'info';
  }

  getEmptyStateTitle(): string {
    const titles: Record<string, string> = {
      'EXPIRY_PREDICTIONS': 'No Predictions Available',
      'FIFO_RECOMMENDATIONS': 'No Recommendations',
      'CATEGORY_PERFORMANCE': 'No Performance Data',
      'BRANCH_ANALYTICS': 'No Branch Data',
      'SMART_ALERTS': 'All Clear',
      'WASTE_OPTIMIZATION': 'No Optimization Needed'
    };
    
    return titles[this.config.type] || 'No Data';
  }

  getEmptyStateMessage(): string {
    const messages: Record<string, string> = {
      'EXPIRY_PREDICTIONS': 'All products have healthy expiry timelines',
      'FIFO_RECOMMENDATIONS': 'Your inventory is optimally managed',
      'CATEGORY_PERFORMANCE': 'Insufficient data for analysis',
      'BRANCH_ANALYTICS': 'No branches configured for comparison',
      'SMART_ALERTS': 'All systems are running optimally',
      'WASTE_OPTIMIZATION': 'Your waste levels are already optimized'
    };
    
    return messages[this.config.type] || 'No data available to display';
  }

  // ===== FORMATTING UTILITIES =====
  formatLastUpdated(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
}