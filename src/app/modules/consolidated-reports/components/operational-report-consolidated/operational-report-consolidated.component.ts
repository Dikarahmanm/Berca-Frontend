import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-operational-report-consolidated',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressBarModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="operational-report-consolidated">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>business</mat-icon>
            Consolidated Operational Report
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="filterForm" class="filter-form">
            <mat-form-field>
              <mat-label>Time Period</mat-label>
              <mat-select formControlName="period">
                <mat-option value="today">Today</mat-option>
                <mat-option value="this-week">This Week</mat-option>
                <mat-option value="this-month">This Month</mat-option>
                <mat-option value="this-quarter">This Quarter</mat-option>
              </mat-select>
            </mat-form-field>
            
            <mat-form-field>
              <mat-label>Department</mat-label>
              <mat-select formControlName="department">
                <mat-option value="">All Departments</mat-option>
                <mat-option value="sales">Sales</mat-option>
                <mat-option value="operations">Operations</mat-option>
                <mat-option value="customer-service">Customer Service</mat-option>
                <mat-option value="logistics">Logistics</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="loadReport()">
              <mat-icon>refresh</mat-icon>
              Generate Report
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="kpi-grid">
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-header">
              <span class="kpi-label">Staff Productivity</span>
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="kpi-value">{{ staffProductivity }}%</div>
            <mat-progress-bar [value]="staffProductivity" mode="determinate"></mat-progress-bar>
            <div class="kpi-change positive">+8.5% from last period</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-header">
              <span class="kpi-label">Customer Satisfaction</span>
              <mat-icon>sentiment_very_satisfied</mat-icon>
            </div>
            <div class="kpi-value">{{ customerSatisfaction }}%</div>
            <mat-progress-bar [value]="customerSatisfaction" mode="determinate"></mat-progress-bar>
            <div class="kpi-change positive">+2.3% from last period</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-header">
              <span class="kpi-label">Order Fulfillment</span>
              <mat-icon>local_shipping</mat-icon>
            </div>
            <div class="kpi-value">{{ orderFulfillment }}%</div>
            <mat-progress-bar [value]="orderFulfillment" mode="determinate"></mat-progress-bar>
            <div class="kpi-change positive">+5.1% from last period</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-header">
              <span class="kpi-label">System Uptime</span>
              <mat-icon>computer</mat-icon>
            </div>
            <div class="kpi-value">{{ systemUptime }}%</div>
            <mat-progress-bar [value]="systemUptime" mode="determinate"></mat-progress-bar>
            <div class="kpi-change negative">-0.2% from last period</div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="operational-details">
        <mat-card class="details-card">
          <mat-card-header>
            <mat-card-title>Department Performance</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-table [dataSource]="departmentData" class="performance-table">
              <ng-container matColumnDef="department">
                <mat-header-cell *matHeaderCellDef>Department</mat-header-cell>
                <mat-cell *matCellDef="let item">{{ item.department }}</mat-cell>
              </ng-container>

              <ng-container matColumnDef="efficiency">
                <mat-header-cell *matHeaderCellDef>Efficiency</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <div class="efficiency-cell">
                    <span>{{ item.efficiency }}%</span>
                    <mat-progress-bar [value]="item.efficiency" mode="determinate" class="mini-progress"></mat-progress-bar>
                  </div>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="target">
                <mat-header-cell *matHeaderCellDef>Target</mat-header-cell>
                <mat-cell *matCellDef="let item">{{ item.target }}%</mat-cell>
              </ng-container>

              <ng-container matColumnDef="variance">
                <mat-header-cell *matHeaderCellDef>Variance</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <span [class]="item.variance >= 0 ? 'positive' : 'negative'">
                    {{ item.variance > 0 ? '+' : '' }}{{ item.variance }}%
                  </span>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="status">
                <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <span [class]="'status-' + item.status">{{ item.statusLabel }}</span>
                </mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
              <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
            </mat-table>
          </mat-card-content>
        </mat-card>

        <mat-card class="details-card">
          <mat-card-header>
            <mat-card-title>Key Operational Metrics</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-table [dataSource]="metricsData" class="metrics-table">
              <ng-container matColumnDef="metric">
                <mat-header-cell *matHeaderCellDef>Metric</mat-header-cell>
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

              <ng-container matColumnDef="trend">
                <mat-header-cell *matHeaderCellDef>Trend</mat-header-cell>
                <mat-cell *matCellDef="let item">
                  <mat-icon [class]="'trend-' + item.trendDirection">
                    {{ item.trendDirection === 'up' ? 'trending_up' : item.trendDirection === 'down' ? 'trending_down' : 'trending_flat' }}
                  </mat-icon>
                  <span [class]="'trend-' + item.trendDirection">{{ item.trend }}</span>
                </mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="metricsColumns"></mat-header-row>
              <mat-row *matRowDef="let row; columns: metricsColumns;"></mat-row>
            </mat-table>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .operational-report-consolidated {
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

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .kpi-card .kpi-label {
      font-size: 0.875rem;
      color: #666;
      font-weight: 500;
    }

    .kpi-card .kpi-value {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .kpi-card mat-progress-bar {
      margin-bottom: 8px;
      height: 8px;
      border-radius: 4px;
    }

    .kpi-card .kpi-change {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .operational-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .details-card {
      height: fit-content;
    }

    .performance-table, .metrics-table {
      width: 100%;
    }

    .efficiency-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .mini-progress {
      width: 80px;
      height: 4px;
    }

    .positive {
      color: #4caf50;
    }

    .negative {
      color: #f44336;
    }

    .status-excellent {
      color: #4caf50;
      font-weight: 500;
    }

    .status-good {
      color: #8bc34a;
      font-weight: 500;
    }

    .status-average {
      color: #ff9800;
      font-weight: 500;
    }

    .status-poor {
      color: #f44336;
      font-weight: 500;
    }

    .trend-up {
      color: #4caf50;
    }

    .trend-down {
      color: #f44336;
    }

    .trend-flat {
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

      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .operational-details {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class OperationalReportConsolidatedComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  filterForm: FormGroup;
  staffProductivity = 87;
  customerSatisfaction = 92;
  orderFulfillment = 94;
  systemUptime = 99.7;
  
  displayedColumns = ['department', 'efficiency', 'target', 'variance', 'status'];
  departmentData = [
    { department: 'Sales', efficiency: 92, target: 85, variance: 7, status: 'excellent', statusLabel: 'Excellent' },
    { department: 'Operations', efficiency: 88, target: 90, variance: -2, status: 'good', statusLabel: 'Good' },
    { department: 'Customer Service', efficiency: 95, target: 90, variance: 5, status: 'excellent', statusLabel: 'Excellent' },
    { department: 'Logistics', efficiency: 82, target: 85, variance: -3, status: 'average', statusLabel: 'Average' }
  ];

  metricsColumns = ['metric', 'current', 'previous', 'trend'];
  metricsData = [
    { metric: 'Average Response Time', current: '2.3 min', previous: '2.8 min', trend: '+17.9%', trendDirection: 'up' },
    { metric: 'Error Rate', current: '0.8%', previous: '1.2%', trend: '-33.3%', trendDirection: 'up' },
    { metric: 'Processing Speed', current: '145 items/hr', previous: '138 items/hr', trend: '+5.1%', trendDirection: 'up' },
    { metric: 'Resource Utilization', current: '78%', previous: '75%', trend: '+4.0%', trendDirection: 'up' }
  ];

  constructor() {
    this.filterForm = this.fb.group({
      period: ['this-week'],
      department: ['']
    });
  }

  ngOnInit() {
    this.loadReport();
  }

  loadReport() {
    // Implementation for loading operational report data
    console.log('Loading operational report with filters:', this.filterForm.value);
  }
}