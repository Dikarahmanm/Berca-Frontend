// src/app/shared/components/smart-fifo-recommendations/smart-fifo-recommendations.component.ts
// Phase 1: Smart FIFO Recommendations Component with AI-powered insights
// Angular 20 with Signal-based reactive architecture

import { Component, OnInit, computed, signal, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Material Design imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';

// Services and types
import { ExpiryManagementService } from '../../../core/services/expiry-management.service';
import { SmartNotificationService } from '../../../core/services/smart-notification.service';
import { MultiBranchCoordinationService } from '../../../core/services/multi-branch-coordination.service';
import { 
  FifoRecommendationDto, 
  ExpiryUrgency, 
  ExpiryStatus
  // PredictiveInsight,
  // WasteOptimizationSuggestion - These interfaces may not exist yet
} from '../../../core/interfaces/expiry.interfaces';

// Enhanced interfaces for smart FIFO component
interface SmartFifoAction {
  id: string;
  type: 'sell_first' | 'discount' | 'transfer' | 'dispose' | 'bundle' | 'promote';
  label: string;
  icon: string;
  description: string;
  urgency: ExpiryUrgency;
  estimatedSaving: number;
  implementationEffort: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
}

interface EnhancedFifoRecommendation extends FifoRecommendationDto {
  smartActions: SmartFifoAction[];
  predictiveInsights: any[]; // Temporary type until interface is defined
  transferOptions?: any[];
  bundleOpportunities?: any[];
  marketingRecommendations?: any[];
  financialImpact: {
    currentValue: number;
    potentialLoss: number;
    maxSaving: number;
    roi: number;
  };
}

@Component({
  selector: 'app-smart-fifo-recommendations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatTabsModule
  ],
  template: `
    <div class="smart-fifo-container">
      <!-- Header with Controls -->
      <div class="fifo-header">
        <div class="header-content">
          <div class="header-info">
            <h2 class="component-title">
              <mat-icon>psychology</mat-icon>
              🧠 Smart FIFO Recommendations
            </h2>
            <p class="component-description">
              AI-powered inventory optimization with predictive analytics
            </p>
          </div>
          
          <div class="header-controls">
            <div class="view-toggles">
              <mat-slide-toggle 
                [(ngModel)]="showPredictiveInsights"
                class="feature-toggle">
                🔮 Predictive Mode
              </mat-slide-toggle>
              
              <mat-slide-toggle 
                [(ngModel)]="showFinancialImpact"
                class="feature-toggle">
                💰 Financial Impact
              </mat-slide-toggle>
            </div>
            
            <div class="action-controls">
              <mat-select 
                [(ngModel)]="selectedUrgencyFilter" 
                placeholder="Filter by Urgency"
                class="urgency-filter">
                <mat-option value="">All Priorities</mat-option>
                <mat-option value="Critical">🚨 Critical</mat-option>
                <mat-option value="High">⚠️ High</mat-option>
                <mat-option value="Medium">📋 Medium</mat-option>
                <mat-option value="Low">✅ Low</mat-option>
              </mat-select>
              
              <button mat-button 
                [matMenuTriggerFor]="actionMenu"
                class="bulk-action-btn">
                <mat-icon>settings</mat-icon>
                Bulk Actions
              </button>
              
              <button mat-raised-button 
                color="primary"
                (click)="refreshRecommendations()"
                [disabled]="loading()">
                <mat-icon>refresh</mat-icon>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Analytics Summary -->
        <div class="analytics-summary" *ngIf="showFinancialImpact">
          <div class="summary-card">
            <div class="summary-metric">
              <span class="metric-value">{{ formatCurrency(totalPotentialSaving()) }}</span>
              <span class="metric-label">Potential Savings</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-metric">
              <span class="metric-value">{{ criticalRecommendations().length }}</span>
              <span class="metric-label">Critical Items</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-metric">
              <span class="metric-value">{{ formatCurrency(totalValueAtRisk()) }}</span>
              <span class="metric-label">Value at Risk</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-metric">
              <span class="metric-value">{{ Math.round(averageConfidence()) }}%</span>
              <span class="metric-label">AI Confidence</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading()">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>🧠 AI analyzing inventory patterns...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="error() && !loading()">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <h3>Unable to Load Recommendations</h3>
        <p>{{ error() }}</p>
        <button mat-button color="primary" (click)="refreshRecommendations()">
          Try Again
        </button>
      </div>

      <!-- Tab Navigation -->
      <mat-tab-group class="recommendations-tabs" *ngIf="!loading() && !error()">
        
        <!-- Critical Actions Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>warning</mat-icon>
            Critical ({{ criticalRecommendations().length }})
          </ng-template>
          
          <div class="tab-content critical-tab">
            <div class="recommendations-grid" *ngIf="criticalRecommendations().length > 0">
              <div class="recommendation-card critical" 
                *ngFor="let recommendation of criticalRecommendations(); trackBy: trackByRecommendation">
                
                <!-- Card Header -->
                <div class="card-header">
                  <div class="product-info">
                    <div class="product-name">{{ recommendation.productName }}</div>
                    <div class="product-meta">
                      <mat-chip color="warn" selected class="urgency-chip">
                        🚨 {{ recommendation.priority }}
                      </mat-chip>
                      <span class="category-name">{{ recommendation.categoryName }}</span>
                    </div>
                  </div>
                  
                  <div class="financial-impact" *ngIf="showFinancialImpact">
                    <div class="impact-value loss">
                      {{ formatCurrency(recommendation.financialImpact.potentialLoss) }}
                    </div>
                    <div class="impact-label">at risk</div>
                  </div>
                </div>

                <!-- Smart Actions -->
                <div class="smart-actions-section">
                  <div class="primary-action">
                    <div class="action-recommendation">
                      <mat-icon [class]="getActionIcon(recommendation.recommendedAction)">
                        {{ getActionIcon(recommendation.recommendedAction) }}
                      </mat-icon>
                      <div class="action-details">
                        <div class="action-title">{{ getActionTitle(recommendation.recommendedAction) }}</div>
                        <div class="action-description">{{ getActionDescription(recommendation.recommendedAction) }}</div>
                      </div>
                      <div class="action-savings">
                        <span class="savings-amount">{{ formatCurrency(recommendation.financialImpact.maxSaving) }}</span>
                        <span class="savings-label">potential saving</span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Action Buttons -->
                  <div class="action-buttons">
                    <button mat-raised-button 
                      color="primary"
                      (click)="executeRecommendation(recommendation)"
                      class="primary-action-btn">
                      <mat-icon>flash_on</mat-icon>
                      Execute Now
                    </button>
                    
                    <button mat-button 
                      [matMenuTriggerFor]="alternativeActionsMenu"
                      class="alternative-actions-btn">
                      <mat-icon>more_horiz</mat-icon>
                      More Options
                    </button>
                    
                    <!-- Alternative Actions Menu -->
                    <mat-menu #alternativeActionsMenu="matMenu">
                      <button mat-menu-item 
                        *ngFor="let action of recommendation.smartActions.slice(1, 4)"
                        (click)="executeAlternativeAction(recommendation, action)">
                        <mat-icon>{{ action.icon }}</mat-icon>
                        <span>{{ action.label }}</span>
                        <span class="menu-saving">{{ formatCurrency(action.estimatedSaving) }}</span>
                      </button>
                    </mat-menu>
                  </div>
                </div>

                <!-- Predictive Insights -->
                <div class="predictive-insights" *ngIf="showPredictiveInsights() && recommendation.predictiveInsights && recommendation.predictiveInsights.length > 0">
                  <div class="insights-header">
                    <mat-icon>psychology</mat-icon>
                    <span>AI Insights</span>
                  </div>
                  
                  <div class="insights-list">
                    <div class="insight-item" 
                      *ngFor="let insight of recommendation.predictiveInsights.slice(0, 2)">
                      <div class="insight-content">
                        <div class="insight-title">{{ insight.description }}</div>
                        <div class="insight-confidence">
                          Confidence: {{ insight.confidenceScore | percent:'1.0-0' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Batch Details -->
                <div class="batch-details" *ngIf="recommendation.batches && recommendation.batches.length > 0">
                  <mat-divider></mat-divider>
                  <div class="batch-summary">
                    <mat-icon>inventory</mat-icon>
                    <span>{{ recommendation.batches.length }} batch(es), {{ getTotalQuantity(recommendation) }} units</span>
                    <button mat-button 
                      size="small"
                      (click)="viewBatchDetails(recommendation)">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Empty State for Critical -->
            <div class="empty-state" *ngIf="criticalRecommendations().length === 0">
              <mat-icon class="empty-icon success">check_circle</mat-icon>
              <h3>🎉 No Critical Issues!</h3>
              <p>All critical inventory items are being managed effectively.</p>
            </div>
          </div>
        </mat-tab>

        <!-- All Recommendations Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>list</mat-icon>
            All ({{ filteredRecommendations().length }})
          </ng-template>
          
          <div class="tab-content all-tab">
            <div class="recommendations-list">
              <div class="recommendation-row" 
                *ngFor="let recommendation of filteredRecommendations(); trackBy: trackByRecommendation">
                
                <div class="row-content">
                  <div class="product-column">
                    <div class="product-name">{{ recommendation.productName }}</div>
                    <div class="product-meta">
                      <span class="product-barcode">{{ recommendation.productBarcode }}</span>
                      <mat-chip [color]="getUrgencyColor(recommendation.priority)" 
                        selected 
                        class="urgency-chip-small">
                        {{ recommendation.priority }}
                      </mat-chip>
                    </div>
                  </div>
                  
                  <div class="recommendation-column">
                    <div class="recommended-action">
                      <mat-icon>{{ getActionIcon(recommendation.recommendedAction) }}</mat-icon>
                      <span>{{ getActionTitle(recommendation.recommendedAction) }}</span>
                    </div>
                    <div class="action-reason">{{ getActionDescription(recommendation.recommendedAction) }}</div>
                  </div>
                  
                  <div class="financial-column" *ngIf="showFinancialImpact">
                    <div class="value-at-risk">
                      <span class="label">At Risk:</span>
                      <span class="amount">{{ formatCurrency(recommendation.totalAtRiskValue) }}</span>
                    </div>
                    <div class="potential-saving">
                      <span class="label">Saving:</span>
                      <span class="amount saving">{{ formatCurrency(recommendation.financialImpact.maxSaving) }}</span>
                    </div>
                  </div>
                  
                  <div class="actions-column">
                    <button mat-button 
                      color="primary"
                      (click)="executeRecommendation(recommendation)"
                      class="execute-btn">
                      <mat-icon>play_arrow</mat-icon>
                      Execute
                    </button>
                    
                    <button mat-icon-button 
                      [matMenuTriggerFor]="rowActionsMenu"
                      class="options-btn">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    
                    <!-- Row Actions Menu -->
                    <mat-menu #rowActionsMenu="matMenu">
                      <button mat-menu-item (click)="viewProductDetails(recommendation)">
                        <mat-icon>info</mat-icon>
                        <span>View Product Details</span>
                      </button>
                      <button mat-menu-item (click)="viewBatchDetails(recommendation)">
                        <mat-icon>inventory</mat-icon>
                        <span>View Batch Details</span>
                      </button>
                      <button mat-menu-item (click)="scheduleAction(recommendation)">
                        <mat-icon>schedule</mat-icon>
                        <span>Schedule Action</span>
                      </button>
                      <button mat-menu-item (click)="dismissRecommendation(recommendation)">
                        <mat-icon>close</mat-icon>
                        <span>Dismiss</span>
                      </button>
                    </mat-menu>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Optimization Opportunities Tab -->
        <mat-tab *ngIf="showPredictiveInsights">
          <ng-template mat-tab-label>
            <mat-icon>trending_up</mat-icon>
            Opportunities ({{ optimizationOpportunities().length }})
          </ng-template>
          
          <div class="tab-content opportunities-tab">
            <div class="opportunities-grid">
              <div class="opportunity-card" 
                *ngFor="let opportunity of optimizationOpportunities(); trackBy: trackByOpportunity">
                
                <div class="opportunity-header">
                  <div class="opportunity-icon">
                    <mat-icon [class]="getOpportunityIconClass(opportunity.category)">
                      {{ getOpportunityIcon(opportunity.category) }}
                    </mat-icon>
                  </div>
                  
                  <div class="opportunity-info">
                    <div class="opportunity-title">{{ opportunity.title }}</div>
                    <div class="opportunity-description">{{ opportunity.description }}</div>
                  </div>
                  
                  <div class="opportunity-savings">
                    <div class="savings-amount">{{ formatCurrency(opportunity.potentialSaving) }}</div>
                    <div class="savings-period">/month</div>
                  </div>
                </div>
                
                <div class="opportunity-details">
                  <div class="implementation-info">
                    <div class="effort-indicator">
                      <span class="effort-label">Effort:</span>
                      <mat-chip [color]="getEffortColor(opportunity.implementationEffort)" 
                        selected 
                        class="effort-chip">
                        {{ opportunity.implementationEffort | titlecase }}
                      </mat-chip>
                    </div>
                    
                    <div class="roi-indicator">
                      <span class="roi-label">ROI:</span>
                      <span class="roi-value">{{ opportunity.roi.annualROI | number:'1.0-1' }}x</span>
                    </div>
                  </div>
                  
                  <div class="opportunity-actions">
                    <button mat-raised-button 
                      color="accent"
                      (click)="implementOpportunity(opportunity)"
                      class="implement-btn">
                      <mat-icon>rocket_launch</mat-icon>
                      Implement
                    </button>
                    
                    <button mat-button 
                      (click)="learnMoreAboutOpportunity(opportunity)"
                      class="learn-more-btn">
                      <mat-icon>info</mat-icon>
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Bulk Actions Menu -->
      <mat-menu #actionMenu="matMenu">
        <button mat-menu-item (click)="executeBulkAction('sellFirst')">
          <mat-icon>trending_up</mat-icon>
          <span>Sell First - All Critical</span>
        </button>
        <button mat-menu-item (click)="executeBulkAction('applyDiscounts')">
          <mat-icon>local_offer</mat-icon>
          <span>Apply Smart Discounts</span>
        </button>
        <button mat-menu-item (click)="executeBulkAction('scheduleTransfers')">
          <mat-icon>swap_horiz</mat-icon>
          <span>Schedule Branch Transfers</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="exportRecommendations()">
          <mat-icon>download</mat-icon>
          <span>Export to Excel</span>
        </button>
        <button mat-menu-item (click)="generateReport()">
          <mat-icon>assessment</mat-icon>
          <span>Generate Report</span>
        </button>
      </mat-menu>
    </div>
  `,
  styles: [`
    .smart-fifo-container {
      padding: var(--s6);
      max-width: 1400px;
      margin: 0 auto;
    }

    .fifo-header {
      margin-bottom: var(--s6);
      
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--s4);
        
        .header-info {
          .component-title {
            display: flex;
            align-items: center;
            gap: var(--s2);
            font-size: var(--text-2xl);
            font-weight: var(--font-bold);
            color: var(--primary);
            margin: 0 0 var(--s2) 0;
            
            mat-icon {
              font-size: 28px;
              width: 28px;
              height: 28px;
              color: var(--primary);
            }
          }
          
          .component-description {
            color: var(--text-secondary);
            font-size: var(--text-base);
            margin: 0;
          }
        }
        
        .header-controls {
          display: flex;
          gap: var(--s4);
          align-items: center;
          
          .view-toggles {
            display: flex;
            gap: var(--s3);
            
            .feature-toggle {
              font-size: var(--text-sm);
            }
          }
          
          .action-controls {
            display: flex;
            gap: var(--s3);
            align-items: center;
            
            .urgency-filter {
              min-width: 150px;
            }
          }
        }
      }
      
      .analytics-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--s4);
        
        .summary-card {
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--s4);
          text-align: center;
          
          .summary-metric {
            .metric-value {
              display: block;
              font-size: var(--text-2xl);
              font-weight: var(--font-bold);
              color: var(--primary);
              margin-bottom: var(--s1);
            }
            
            .metric-label {
              font-size: var(--text-sm);
              color: var(--text-secondary);
            }
          }
        }
      }
    }

    .loading-state {
      text-align: center;
      padding: var(--s8);
      
      p {
        margin-top: var(--s4);
        color: var(--text-secondary);
        font-size: var(--text-lg);
      }
    }

    .error-state {
      text-align: center;
      padding: var(--s8);
      
      .error-icon {
        font-size: 48px;
        color: var(--error);
        margin-bottom: var(--s4);
      }
      
      h3 {
        color: var(--error);
        margin-bottom: var(--s2);
      }
      
      p {
        color: var(--text-secondary);
        margin-bottom: var(--s4);
      }
    }

    .recommendations-tabs {
      .tab-content {
        padding: var(--s6) 0;
      }
    }

    .recommendations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: var(--s6);
    }

    .recommendation-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s5);
      transition: var(--transition);
      
      &.critical {
        border-color: var(--error);
        box-shadow: 0 0 0 1px rgba(225, 90, 79, 0.1);
      }
      
      &:hover {
        border-color: var(--primary);
        box-shadow: var(--shadow-md);
      }
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--s4);
        
        .product-info {
          .product-name {
            font-size: var(--text-lg);
            font-weight: var(--font-semibold);
            color: var(--text);
            margin-bottom: var(--s2);
          }
          
          .product-meta {
            display: flex;
            gap: var(--s2);
            align-items: center;
            
            .urgency-chip {
              font-size: var(--text-xs);
            }
            
            .category-name {
              font-size: var(--text-sm);
              color: var(--text-secondary);
            }
          }
        }
        
        .financial-impact {
          text-align: right;
          
          .impact-value {
            font-size: var(--text-lg);
            font-weight: var(--font-bold);
            
            &.loss {
              color: var(--error);
            }
          }
          
          .impact-label {
            font-size: var(--text-xs);
            color: var(--text-secondary);
          }
        }
      }
      
      .smart-actions-section {
        .primary-action {
          .action-recommendation {
            display: flex;
            align-items: center;
            gap: var(--s3);
            padding: var(--s3);
            background: var(--bg-secondary);
            border-radius: var(--radius);
            margin-bottom: var(--s4);
            
            mat-icon {
              color: var(--primary);
              font-size: 24px;
            }
            
            .action-details {
              flex: 1;
              
              .action-title {
                font-weight: var(--font-semibold);
                color: var(--text);
                margin-bottom: var(--s1);
              }
              
              .action-description {
                font-size: var(--text-sm);
                color: var(--text-secondary);
              }
            }
            
            .action-savings {
              text-align: right;
              
              .savings-amount {
                display: block;
                font-size: var(--text-base);
                font-weight: var(--font-semibold);
                color: var(--success);
              }
              
              .savings-label {
                font-size: var(--text-xs);
                color: var(--text-secondary);
              }
            }
          }
        }
        
        .action-buttons {
          display: flex;
          gap: var(--s2);
          
          .primary-action-btn {
            flex: 1;
          }
          
          .menu-saving {
            margin-left: auto;
            color: var(--success);
            font-size: var(--text-xs);
          }
        }
      }
      
      .predictive-insights {
        margin-top: var(--s4);
        padding: var(--s3);
        background: var(--primary-light);
        border-radius: var(--radius);
        
        .insights-header {
          display: flex;
          align-items: center;
          gap: var(--s2);
          margin-bottom: var(--s3);
          font-weight: var(--font-semibold);
          color: var(--primary);
        }
        
        .insights-list {
          .insight-item {
            margin-bottom: var(--s2);
            
            .insight-title {
              font-size: var(--text-sm);
              color: var(--text);
              margin-bottom: var(--s1);
            }
            
            .insight-confidence {
              font-size: var(--text-xs);
              color: var(--text-secondary);
            }
          }
        }
      }
      
      .batch-details {
        margin-top: var(--s4);
        
        .batch-summary {
          display: flex;
          align-items: center;
          gap: var(--s2);
          padding-top: var(--s3);
          font-size: var(--text-sm);
          color: var(--text-secondary);
          
          button {
            margin-left: auto;
          }
        }
      }
    }

    .recommendations-list {
      .recommendation-row {
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: var(--radius-lg);
        margin-bottom: var(--s3);
        transition: var(--transition);
        
        &:hover {
          border-color: var(--primary);
          box-shadow: var(--shadow-sm);
        }
        
        .row-content {
          display: grid;
          grid-template-columns: 2fr 2fr 1.5fr 120px;
          gap: var(--s4);
          padding: var(--s4);
          align-items: center;
          
          .product-column {
            .product-name {
              font-weight: var(--font-semibold);
              color: var(--text);
              margin-bottom: var(--s1);
            }
            
            .product-meta {
              display: flex;
              gap: var(--s2);
              align-items: center;
              
              .product-barcode {
                font-size: var(--text-xs);
                color: var(--text-muted);
                font-family: monospace;
              }
              
              .urgency-chip-small {
                font-size: var(--text-xs);
              }
            }
          }
          
          .recommendation-column {
            .recommended-action {
              display: flex;
              align-items: center;
              gap: var(--s2);
              margin-bottom: var(--s1);
              
              mat-icon {
                color: var(--primary);
              }
              
              span {
                font-weight: var(--font-medium);
              }
            }
            
            .action-reason {
              font-size: var(--text-sm);
              color: var(--text-secondary);
            }
          }
          
          .financial-column {
            .value-at-risk, .potential-saving {
              display: flex;
              justify-content: space-between;
              margin-bottom: var(--s1);
              
              .label {
                font-size: var(--text-xs);
                color: var(--text-secondary);
              }
              
              .amount {
                font-weight: var(--font-medium);
                
                &.saving {
                  color: var(--success);
                }
              }
            }
          }
          
          .actions-column {
            display: flex;
            gap: var(--s2);
            
            .execute-btn {
              flex: 1;
            }
          }
        }
      }
    }

    .opportunities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: var(--s6);
    }

    .opportunity-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--s5);
      transition: var(--transition);
      
      &:hover {
        border-color: var(--accent);
        box-shadow: var(--shadow-md);
      }
      
      .opportunity-header {
        display: flex;
        gap: var(--s3);
        margin-bottom: var(--s4);
        
        .opportunity-icon {
          mat-icon {
            font-size: 32px;
            width: 32px;
            height: 32px;
            
            &.pricing {
              color: var(--warning);
            }
            
            &.inventory {
              color: var(--info);
            }
            
            &.supplier {
              color: var(--accent);
            }
          }
        }
        
        .opportunity-info {
          flex: 1;
          
          .opportunity-title {
            font-weight: var(--font-semibold);
            color: var(--text);
            margin-bottom: var(--s1);
          }
          
          .opportunity-description {
            font-size: var(--text-sm);
            color: var(--text-secondary);
            line-height: 1.4;
          }
        }
        
        .opportunity-savings {
          text-align: right;
          
          .savings-amount {
            font-size: var(--text-lg);
            font-weight: var(--font-bold);
            color: var(--success);
          }
          
          .savings-period {
            font-size: var(--text-xs);
            color: var(--text-secondary);
          }
        }
      }
      
      .opportunity-details {
        .implementation-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--s4);
          
          .effort-indicator, .roi-indicator {
            display: flex;
            align-items: center;
            gap: var(--s2);
            
            .effort-chip {
              font-size: var(--text-xs);
            }
            
            .roi-value {
              font-weight: var(--font-semibold);
              color: var(--success);
            }
          }
        }
        
        .opportunity-actions {
          display: flex;
          gap: var(--s2);
          
          .implement-btn {
            flex: 1;
          }
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: var(--s8);
      
      .empty-icon {
        font-size: 64px;
        margin-bottom: var(--s4);
        
        &.success {
          color: var(--success);
        }
      }
      
      h3 {
        color: var(--success);
        margin-bottom: var(--s2);
      }
      
      p {
        color: var(--text-secondary);
      }
    }

    // Mobile responsive
    @media (max-width: 768px) {
      .smart-fifo-container {
        padding: var(--s4);
      }
      
      .fifo-header .header-content {
        flex-direction: column;
        gap: var(--s4);
        
        .header-controls {
          width: 100%;
          flex-direction: column;
          
          .action-controls {
            width: 100%;
            flex-wrap: wrap;
          }
        }
      }
      
      .recommendations-grid {
        grid-template-columns: 1fr;
      }
      
      .recommendation-row .row-content {
        grid-template-columns: 1fr;
        gap: var(--s3);
      }
      
      .opportunities-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SmartFifoRecommendationsComponent implements OnInit {
  // Services
  private expiryService = inject(ExpiryManagementService);
  private smartNotificationService = inject(SmartNotificationService);
  private branchCoordinationService = inject(MultiBranchCoordinationService);
  private router = inject(Router);

  // Make Math available in template
  readonly Math = Math;

  // Input properties
  categoryId = input<number | null>(null);
  maxItems = input<number>(20);
  compactView = input<boolean>(false);
  dashboardMode = input<boolean>(false);
  maxRecommendations = input<number>(20);
  enableQuickActions = input<boolean>(true);
  showAdvancedAnalytics = input<boolean>(true);

  // Signal-based state
  private _recommendations = signal<EnhancedFifoRecommendation[]>([]);
  private _optimizationSuggestions = signal<any[]>([]); // Temporary type
  private _predictiveInsights = signal<any[]>([]); // Temporary type
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // UI state
  showPredictiveInsights = signal<boolean>(true);
  showFinancialImpact = signal<boolean>(true);
  selectedUrgencyFilter = signal<string>('');

  // Public readonly signals
  readonly recommendations = this._recommendations.asReadonly();
  readonly optimizationSuggestions = this._optimizationSuggestions.asReadonly();
  readonly predictiveInsights = this._predictiveInsights.asReadonly();

  // Computed properties
  readonly filteredRecommendations = computed(() => {
    let filtered = this._recommendations();
    
    const urgencyFilter = this.selectedUrgencyFilter();
    if (urgencyFilter) {
      filtered = filtered.filter(rec => rec.priority === urgencyFilter);
    }
    
    return filtered.sort((a, b) => {
      const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return b.financialImpact.maxSaving - a.financialImpact.maxSaving;
    });
  });

  readonly criticalRecommendations = computed(() => 
    this._recommendations().filter(rec => rec.priority === ExpiryUrgency.CRITICAL)
  );

  readonly optimizationOpportunities = computed(() => 
    this._optimizationSuggestions().filter(opp => 
      opp.priority === ExpiryUrgency.HIGH || opp.priority === ExpiryUrgency.CRITICAL
    )
  );

  readonly totalPotentialSaving = computed(() => 
    this._recommendations().reduce((sum, rec) => sum + rec.financialImpact.maxSaving, 0)
  );

  readonly totalValueAtRisk = computed(() => 
    this._recommendations().reduce((sum, rec) => sum + rec.totalAtRiskValue, 0)
  );

  readonly averageConfidence = computed(() => {
    const recommendations = this._recommendations();
    if (recommendations.length === 0) return 0;
    
    const totalConfidence = recommendations.reduce((sum, rec) => {
      const avgConfidence = rec.smartActions.reduce((actionSum, action) => 
        actionSum + action.confidence, 0) / rec.smartActions.length;
      return sum + avgConfidence;
    }, 0);
    
    return totalConfidence / recommendations.length;
  });

  async ngOnInit(): Promise<void> {
    await this.loadAllData();
    
    // Auto-refresh every 10 minutes
    setInterval(() => this.refreshRecommendations(), 10 * 60 * 1000);
  }

  // ===== DATA LOADING METHODS =====

  private async loadAllData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await Promise.all([
        this.loadFifoRecommendations(),
        this.loadOptimizationSuggestions(),
        this.loadPredictiveInsights()
      ]);
    } catch (error: any) {
      console.error('Error loading FIFO data:', error);
      this.error.set('Failed to load recommendations');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFifoRecommendations(): Promise<void> {
    try {
      const categoryId = this.categoryId();
      const limit = this.maxItems();
      
      const fifoRecommendations = await this.expiryService.getFifoRecommendations({ 
        categoryId: categoryId || undefined, 
        limit 
      }).toPromise();

      if (fifoRecommendations) {
        const enhanced = fifoRecommendations.map(rec => this.enhanceRecommendation(rec));
        this._recommendations.set(enhanced);
      }
    } catch (error) {
      console.error('Error loading FIFO recommendations:', error);
    }
  }

  private async loadOptimizationSuggestions(): Promise<void> {
    try {
      const suggestions = await this.expiryService.getWasteOptimizationSuggestions({
        targetWasteReduction: 25,
        focusArea: 'inventory'
      });
      
      this._optimizationSuggestions.set(suggestions);
    } catch (error) {
      console.error('Error loading optimization suggestions:', error);
    }
  }

  private async loadPredictiveInsights(): Promise<void> {
    try {
      const insights = await this.expiryService.getPredictiveInsights({
        forecastDays: 14,
        confidenceThreshold: 0.7
      });
      
      this._predictiveInsights.set(insights);
    } catch (error) {
      console.error('Error loading predictive insights:', error);
    }
  }

  // ===== RECOMMENDATION ENHANCEMENT =====

  private enhanceRecommendation(recommendation: FifoRecommendationDto): EnhancedFifoRecommendation {
    const smartActions = this.generateSmartActions(recommendation);
    const predictiveInsights = this.getRelatedInsights(recommendation);
    const financialImpact = this.calculateFinancialImpact(recommendation);

    return {
      ...recommendation,
      smartActions,
      predictiveInsights,
      financialImpact
    };
  }

  private generateSmartActions(recommendation: FifoRecommendationDto): SmartFifoAction[] {
    const baseActions: SmartFifoAction[] = [
      {
        id: `sell_first_${recommendation.productId}`,
        type: 'sell_first',
        label: 'Prioritize Sales',
        icon: 'trending_up',
        description: 'Move to front of sales queue with staff alerts',
        urgency: recommendation.priority,
        estimatedSaving: recommendation.totalAtRiskValue * 0.9,
        implementationEffort: 'low',
        confidence: 88
      },
      {
        id: `discount_${recommendation.productId}`,
        type: 'discount',
        label: 'Apply Smart Discount',
        icon: 'local_offer',
        description: 'Dynamic pricing based on days until expiry',
        urgency: recommendation.priority,
        estimatedSaving: recommendation.totalAtRiskValue * 0.75,
        implementationEffort: 'low',
        confidence: 92
      }
    ];

    // Add transfer action if branches available
    if (recommendation.alternativeActions?.length) {
      baseActions.push({
        id: `transfer_${recommendation.productId}`,
        type: 'transfer',
        label: 'Inter-Branch Transfer',
        icon: 'swap_horiz',
        description: 'Transfer to high-demand branch location',
        urgency: recommendation.priority,
        estimatedSaving: recommendation.totalAtRiskValue * 0.85,
        implementationEffort: 'medium',
        confidence: 76
      });
    }

    // Add bundle action for high-value items
    if (recommendation.totalAtRiskValue > 100000) {
      baseActions.push({
        id: `bundle_${recommendation.productId}`,
        type: 'bundle',
        label: 'Create Product Bundle',
        icon: 'inventory_2',
        description: 'Bundle with complementary products',
        urgency: recommendation.priority,
        estimatedSaving: recommendation.totalAtRiskValue * 0.65,
        implementationEffort: 'medium',
        confidence: 69
      });
    }

    return baseActions.sort((a, b) => b.confidence - a.confidence);
  }

  private getRelatedInsights(recommendation: FifoRecommendationDto): any[] { // Temporary type
    return this._predictiveInsights().filter(insight => 
      insight.productId === recommendation.productId || 
      insight.categoryId === recommendation.categoryId
    );
  }

  private calculateFinancialImpact(recommendation: FifoRecommendationDto): any {
    const currentValue = recommendation.totalAtRiskValue;
    const potentialLoss = currentValue * 0.8; // 80% loss if no action
    const maxSaving = potentialLoss * 0.9; // 90% can be saved with best action
    const roi = maxSaving / (currentValue * 0.1); // Assume 10% implementation cost

    return {
      currentValue,
      potentialLoss,
      maxSaving,
      roi
    };
  }

  // ===== EVENT HANDLERS =====

  async refreshRecommendations(): Promise<void> {
    await this.loadAllData();
  }

  executeRecommendation(recommendation: EnhancedFifoRecommendation): void {
    const primaryAction = recommendation.smartActions[0];
    
    switch (primaryAction.type) {
      case 'sell_first':
        this.prioritizeForSales(recommendation);
        break;
      case 'discount':
        this.applySmartDiscount(recommendation);
        break;
      case 'transfer':
        this.initiateTransfer(recommendation);
        break;
      case 'dispose':
        this.scheduleDisposal(recommendation);
        break;
      default:
        this.showActionDetails(recommendation, primaryAction);
    }
  }

  executeAlternativeAction(recommendation: EnhancedFifoRecommendation, action: SmartFifoAction): void {
    console.log('Executing alternative action:', action.type, 'for', recommendation.productName);
    // Implementation would depend on action type
    this.showActionDetails(recommendation, action);
  }

  prioritizeForSales(recommendation: EnhancedFifoRecommendation): void {
    // Navigate to POS with product prioritized
    this.router.navigate(['/dashboard/pos'], {
      queryParams: {
        productId: recommendation.productId,
        action: 'prioritize',
        reason: 'expiry_prevention'
      }
    });
  }

  applySmartDiscount(recommendation: EnhancedFifoRecommendation): void {
    // Navigate to product management with discount suggestion
    this.router.navigate(['/dashboard/inventory/product', recommendation.productId, 'pricing'], {
      queryParams: {
        suggestedDiscount: recommendation.suggestedDiscount || 15,
        reason: 'expiry_prevention'
      }
    });
  }

  initiateTransfer(recommendation: EnhancedFifoRecommendation): void {
    // Navigate to transfer page
    this.router.navigate(['/dashboard/inventory/transfer'], {
      queryParams: {
        productId: recommendation.productId,
        reason: 'expiry_prevention'
      }
    });
  }

  scheduleDisposal(recommendation: EnhancedFifoRecommendation): void {
    // Navigate to disposal management
    this.router.navigate(['/dashboard/inventory/disposal'], {
      queryParams: {
        productId: recommendation.productId,
        batchIds: recommendation.batches?.map(b => b.batchId).join(',')
      }
    });
  }

  showActionDetails(recommendation: EnhancedFifoRecommendation, action: SmartFifoAction): void {
    console.log('Showing details for action:', action, 'on product:', recommendation.productName);
    // Could open a dialog or navigate to detailed view
  }

  implementOpportunity(opportunity: any): void { // Temporary type
    console.log('Implementing opportunity:', opportunity.title);
    // Navigate to implementation workflow
  }

  learnMoreAboutOpportunity(opportunity: any): void { // Temporary type
    console.log('Learning more about:', opportunity.title);
    // Could open help or detailed explanation
  }

  executeBulkAction(actionType: string): void {
    console.log('Executing bulk action:', actionType);
    // Implementation for bulk operations
  }

  exportRecommendations(): void {
    console.log('Exporting recommendations to Excel');
    // Excel export functionality
  }

  generateReport(): void {
    this.router.navigate(['/dashboard/reports/fifo-recommendations']);
  }

  // ===== UTILITY METHODS =====

  trackByRecommendation(index: number, recommendation: EnhancedFifoRecommendation): number {
    return recommendation.productId;
  }

  trackByOpportunity(index: number, opportunity: any): number { // Temporary type
    return opportunity.id;
  }

  getTotalQuantity(recommendation: EnhancedFifoRecommendation): number {
    return recommendation.batches?.reduce((sum, batch) => sum + batch.recommendedQuantity, 0) || 0;
  }

  getActionIcon(action: string): string {
    const icons = {
      sell_first: 'trending_up',
      discount: 'local_offer',
      transfer: 'swap_horiz',
      dispose: 'delete',
      bundle: 'inventory_2',
      promote: 'campaign'
    };
    return icons[action as keyof typeof icons] || 'help';
  }

  getActionTitle(action: string): string {
    const titles = {
      sell_first: 'Prioritize Sales',
      discount: 'Apply Discount',
      transfer: 'Inter-Branch Transfer',
      dispose: 'Schedule Disposal',
      bundle: 'Create Bundle',
      promote: 'Marketing Push'
    };
    return titles[action as keyof typeof titles] || 'Take Action';
  }

  getActionDescription(action: string): string {
    const descriptions = {
      sell_first: 'Move to front of sales queue with staff alerts',
      discount: 'Apply dynamic pricing based on expiry timeline',
      transfer: 'Move to branch with higher demand',
      dispose: 'Safely dispose following regulations',
      bundle: 'Bundle with complementary products',
      promote: 'Launch targeted marketing campaign'
    };
    return descriptions[action as keyof typeof descriptions] || 'Execute recommended action';
  }

  getUrgencyColor(priority: string): 'warn' | 'accent' | 'primary' {
    switch (priority) {
      case 'Critical': return 'warn';
      case 'High': return 'accent';
      default: return 'primary';
    }
  }

  getOpportunityIcon(category: string): string {
    const icons = {
      pricing: 'local_offer',
      inventory: 'inventory',
      supplier: 'business',
      process: 'settings',
      technology: 'psychology'
    };
    return icons[category as keyof typeof icons] || 'lightbulb';
  }

  getOpportunityIconClass(category: string): string {
    return category.toLowerCase();
  }

  getEffortColor(effort: string): 'primary' | 'accent' | 'warn' {
    switch (effort) {
      case 'low': return 'primary';
      case 'medium': return 'accent';
      case 'high': return 'warn';
      default: return 'primary';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  viewProductDetails(recommendation: EnhancedFifoRecommendation): void {
    this.router.navigate(['/dashboard/inventory/product', recommendation.productId]);
  }

  viewBatchDetails(recommendation: EnhancedFifoRecommendation): void {
    this.router.navigate(['/dashboard/inventory/batches'], {
      queryParams: { productId: recommendation.productId }
    });
  }

  scheduleAction(recommendation: EnhancedFifoRecommendation): void {
    console.log('Scheduling action for:', recommendation.productName);
    // Could open scheduling dialog
  }

  dismissRecommendation(recommendation: EnhancedFifoRecommendation): void {
    this._recommendations.update(recommendations =>
      recommendations.filter(rec => rec.productId !== recommendation.productId)
    );
  }
}