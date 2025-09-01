import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-performance-report-consolidated',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="performance-report-consolidated">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>assessment</mat-icon>
            Consolidated Performance Report
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="filterForm" class="filter-form">
            <mat-form-field>
              <mat-label>Performance Period</mat-label>
              <mat-select formControlName="period">
                <mat-option value="this-week">This Week</mat-option>
                <mat-option value="this-month">This Month</mat-option>
                <mat-option value="this-quarter">This Quarter</mat-option>
                <mat-option value="this-year">This Year</mat-option>
              </mat-select>
            </mat-form-field>
            
            <mat-form-field>
              <mat-label>Performance Category</mat-label>
              <mat-select formControlName="category">
                <mat-option value="">All Categories</mat-option>
                <mat-option value="sales">Sales Performance</mat-option>
                <mat-option value="employee">Employee Performance</mat-option>
                <mat-option value="customer">Customer Metrics</mat-option>
                <mat-option value="financial">Financial KPIs</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="loadReport()">
              <mat-icon>refresh</mat-icon>
              Generate Report
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="performance-overview">
        <mat-card class="overview-card">
          <mat-card-header>
            <mat-card-title>Performance Score</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="score-display">
              <div class="score-circle">
                <span class="score-value">{{ overallScore }}</span>
                <span class="score-label">Overall Score</span>
              </div>
              <div class="score-breakdown">
                <div class="score-item">
                  <span class="score-category">Sales</span>
                  <span class="score-number">{{ salesScore }}/100</span>
                </div>
                <div class="score-item">
                  <span class="score-category">Operations</span>
                  <span class="score-number">{{ operationsScore }}/100</span>
                </div>
                <div class="score-item">
                  <span class="score-category">Customer Service</span>
                  <span class="score-number">{{ customerServiceScore }}/100</span>
                </div>
                <div class="score-item">
                  <span class="score-category">Financial</span>
                  <span class="score-number">{{ financialScore }}/100</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="achievements-card">
          <mat-card-header>
            <mat-card-title>Key Achievements</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="achievements-list">
              <mat-chip-listbox>
                <mat-chip-option *ngFor="let achievement of achievements" [class]="'achievement-' + achievement.type">
                  <mat-icon>{{ achievement.icon }}</mat-icon>
                  {{ achievement.title }}
                </mat-chip-option>
              </mat-chip-listbox>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="performance-details">
        <mat-card class="details-card">
          <mat-card-header>
            <mat-card-title>Branch Performance Comparison</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-table [dataSource]="branchPerformanceData" class="performance-table">
              <ng-container matColumnDef="branch">
                <mat-header-cell *matHeaderCellDef>Branch</mat-header-cell>
                <mat-cell *matCellDef="let item">{{ item.branch }}</mat-cell>
              </ng-container>

              <ng-container matColumnDef="sales">
                <mat-header-cell *matHeaderCellDef>Sales Score</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <span [class]="getScoreClass(item.sales)">{{ item.sales }}/100</span>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="operations">
                <mat-header-cell *matHeaderCellDef>Operations Score</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <span [class]="getScoreClass(item.operations)">{{ item.operations }}/100</span>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="customer">
                <mat-header-cell *matHeaderCellDef>Customer Score</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <span [class]="getScoreClass(item.customer)">{{ item.customer }}/100</span>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="overall">
                <mat-header-cell *matHeaderCellDef>Overall Score</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <span [class]="getScoreClass(item.overall)" class="overall-score">{{ item.overall }}/100</span>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="rank">
                <mat-header-cell *matHeaderCellDef>Rank</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <mat-icon [class]="getRankClass(item.rank)">
                    {{ item.rank === 1 ? 'emoji_events' : item.rank === 2 ? 'military_tech' : 'grade' }}
                  </mat-icon>
                  #{{ item.rank }}
                </mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="branchColumns"></mat-header-row>
              <mat-row *matRowDef="let row; columns: branchColumns;"></mat-row>
            </mat-table>
          </mat-card-content>
        </mat-card>

        <mat-card class="details-card">
          <mat-card-header>
            <mat-card-title>Performance Trends</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-table [dataSource]="trendsData" class="trends-table">
              <ng-container matColumnDef="metric">
                <mat-header-cell *matHeaderCellDef>Performance Metric</mat-header-cell>
                <mat-cell *matCellDef="let item">{{ item.metric }}</mat-cell>
              </ng-container>

              <ng-container matColumnDef="current">
                <mat-header-cell *matHeaderCellDef>Current</mat-header-cell>
                <mat-cell *matCellDef="let item">{{ item.current }}</mat-cell>
              </ng-container>

              <ng-container matColumnDef="previous">
                <mat-header-cell *matHeaderCellDef>Previous</mat-header-cell>
                <mat-cell *matCellDef="let item">{{ item.previous }}</mat-cell>
              </ng-container>

              <ng-container matColumnDef="change">
                <mat-header-cell *matHeaderCellDef>Change</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <div class="trend-indicator">
                    <mat-icon [class]="item.changeDirection">
                      {{ item.changeDirection === 'positive' ? 'trending_up' : item.changeDirection === 'negative' ? 'trending_down' : 'trending_flat' }}
                    </mat-icon>
                    <span [class]="item.changeDirection">{{ item.change }}</span>
                  </div>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="target">
                <mat-header-cell *matHeaderCellDef>Target</mat-header-cell>
                <mat-cell *matCellDef="let item">{{ item.target }}</mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="trendsColumns"></mat-header-row>
              <mat-row *matRowDef="let row; columns: trendsColumns;"></mat-row>
            </mat-table>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .performance-report-consolidated {
      padding: 16px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header-card {
      margin-bottom: 24px;
    }

    .filter-form {
      display: flex;
      gap: 16px;
      align-items: end;
      flex-wrap: wrap;
    }

    .filter-form mat-form-field {
      min-width: 200px;
    }

    .performance-overview {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .score-display {
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .score-circle {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
    }

    .score-value {
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1;
    }

    .score-label {
      font-size: 0.75rem;
      opacity: 0.9;
    }

    .score-breakdown {
      flex: 1;
    }

    .score-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .score-item:last-child {
      border-bottom: none;
    }

    .score-category {
      font-weight: 500;
      color: #666;
    }

    .score-number {
      font-weight: 600;
      color: #333;
    }

    .achievements-list mat-chip-listbox {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .achievement-gold {
      background-color: #ffd700;
      color: #333;
    }

    .achievement-silver {
      background-color: #c0c0c0;
      color: #333;
    }

    .achievement-bronze {
      background-color: #cd7f32;
      color: white;
    }

    .achievement-green {
      background-color: #4caf50;
      color: white;
    }

    .performance-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .performance-table, .trends-table {
      width: 100%;
    }

    .score-excellent {
      color: #4caf50;
      font-weight: 600;
    }

    .score-good {
      color: #8bc34a;
      font-weight: 600;
    }

    .score-average {
      color: #ff9800;
      font-weight: 600;
    }

    .score-poor {
      color: #f44336;
      font-weight: 600;
    }

    .overall-score {
      font-size: 1.1rem;
      font-weight: 700;
    }

    .rank-gold {
      color: #ffd700;
    }

    .rank-silver {
      color: #c0c0c0;
    }

    .rank-bronze {
      color: #cd7f32;
    }

    .trend-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .positive {
      color: #4caf50;
    }

    .negative {
      color: #f44336;
    }

    .neutral {
      color: #666;
    }

    @media (max-width: 768px) {
      .filter-form {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-form mat-form-field {
        min-width: auto;
      }

      .performance-overview,
      .performance-details {
        grid-template-columns: 1fr;
      }

      .score-display {
        flex-direction: column;
        gap: 16px;
      }
    }
  `]
})
export class PerformanceReportConsolidatedComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  filterForm: FormGroup;
  overallScore = 87;
  salesScore = 92;
  operationsScore = 85;
  customerServiceScore = 88;
  financialScore = 84;
  
  achievements = [
    { title: 'Top Sales Performance', type: 'gold', icon: 'emoji_events' },
    { title: 'Customer Excellence', type: 'silver', icon: 'sentiment_very_satisfied' },
    { title: 'Cost Efficiency', type: 'bronze', icon: 'savings' },
    { title: 'Growth Target Met', type: 'green', icon: 'trending_up' }
  ];
  
  branchColumns = ['branch', 'sales', 'operations', 'customer', 'overall', 'rank'];
  branchPerformanceData = [
    { branch: 'Main Branch', sales: 92, operations: 88, customer: 90, overall: 90, rank: 1 },
    { branch: 'Downtown', sales: 85, operations: 82, customer: 87, overall: 85, rank: 2 },
    { branch: 'Mall Location', sales: 78, operations: 80, customer: 82, overall: 80, rank: 3 }
  ];

  trendsColumns = ['metric', 'current', 'previous', 'change', 'target'];
  trendsData = [
    { metric: 'Customer Satisfaction', current: '92%', previous: '88%', change: '+4.5%', changeDirection: 'positive', target: '90%' },
    { metric: 'Sales Growth', current: '15.2%', previous: '12.8%', change: '+2.4%', changeDirection: 'positive', target: '15%' },
    { metric: 'Employee Productivity', current: '87%', previous: '89%', change: '-2.2%', changeDirection: 'negative', target: '90%' },
    { metric: 'Cost Efficiency', current: '78%', previous: '76%', change: '+2.6%', changeDirection: 'positive', target: '80%' }
  ];

  constructor() {
    this.filterForm = this.fb.group({
      period: ['this-month'],
      category: ['']
    });
  }

  ngOnInit() {
    this.loadReport();
  }

  loadReport() {
    // Implementation for loading performance report data
    console.log('Loading performance report with filters:', this.filterForm.value);
  }

  getScoreClass(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 80) return 'score-good';
    if (score >= 70) return 'score-average';
    return 'score-poor';
  }

  getRankClass(rank: number): string {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  }
}