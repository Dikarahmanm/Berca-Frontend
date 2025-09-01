import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-financial-report-consolidated',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="financial-report-consolidated">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>account_balance</mat-icon>
            Consolidated Financial Report
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="filterForm" class="filter-form">
            <mat-form-field>
              <mat-label>Period</mat-label>
              <mat-select formControlName="period">
                <mat-option value="this-month">This Month</mat-option>
                <mat-option value="last-month">Last Month</mat-option>
                <mat-option value="this-quarter">This Quarter</mat-option>
                <mat-option value="this-year">This Year</mat-option>
              </mat-select>
            </mat-form-field>
            
            <mat-form-field>
              <mat-label>Branch</mat-label>
              <mat-select formControlName="branch">
                <mat-option value="">All Branches</mat-option>
                <mat-option value="main">Main Branch</mat-option>
                <mat-option value="downtown">Downtown</mat-option>
                <mat-option value="mall">Mall Location</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="loadReport()">
              <mat-icon>refresh</mat-icon>
              Generate Report
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="summary-cards">
        <mat-card class="summary-card revenue">
          <mat-card-content>
            <div class="card-header">
              <span class="label">Total Revenue</span>
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="value">{{ totalRevenue | currency }}</div>
            <div class="change positive">+15.2% from last period</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card expenses">
          <mat-card-content>
            <div class="card-header">
              <span class="label">Total Expenses</span>
              <mat-icon>trending_down</mat-icon>
            </div>
            <div class="value">{{ totalExpenses | currency }}</div>
            <div class="change negative">+8.5% from last period</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card profit">
          <mat-card-content>
            <div class="card-header">
              <span class="label">Net Profit</span>
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
            <div class="value">{{ netProfit | currency }}</div>
            <div class="change positive">+22.1% from last period</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card margin">
          <mat-card-content>
            <div class="card-header">
              <span class="label">Profit Margin</span>
              <mat-icon>percent</mat-icon>
            </div>
            <div class="value">{{ profitMargin }}%</div>
            <div class="change positive">+2.1% from last period</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-tab-group class="financial-tabs">
        <mat-tab label="Revenue Analysis">
          <mat-card class="tab-content">
            <mat-card-header>
              <mat-card-title>Revenue Breakdown by Branch</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-table [dataSource]="revenueData" class="financial-table">
                <ng-container matColumnDef="branch">
                  <mat-header-cell *matHeaderCellDef>Branch</mat-header-cell>
                  <mat-cell *matCellDef="let item">{{ item.branch }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="revenue">
                  <mat-header-cell *matHeaderCellDef>Revenue</mat-header-cell>
                  <mat-cell *matCellDef="let item">{{ item.revenue | currency }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="growth">
                  <mat-header-cell *matHeaderCellDef>Growth</mat-header-cell>
                  <mat-cell *matCellDef="let item">
                    <span [class]="item.growth >= 0 ? 'positive' : 'negative'">
                      {{ item.growth > 0 ? '+' : '' }}{{ item.growth }}%
                    </span>
                  </mat-cell>
                </ng-container>

                <ng-container matColumnDef="share">
                  <mat-header-cell *matHeaderCellDef>Market Share</mat-header-cell>
                  <mat-cell *matCellDef="let item">{{ item.share }}%</mat-cell>
                </ng-container>

                <mat-header-row *matHeaderRowDef="revenueColumns"></mat-header-row>
                <mat-row *matRowDef="let row; columns: revenueColumns;"></mat-row>
              </mat-table>
            </mat-card-content>
          </mat-card>
        </mat-tab>

        <mat-tab label="Expense Analysis">
          <mat-card class="tab-content">
            <mat-card-header>
              <mat-card-title>Expense Breakdown by Category</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-table [dataSource]="expenseData" class="financial-table">
                <ng-container matColumnDef="category">
                  <mat-header-cell *matHeaderCellDef>Category</mat-header-cell>
                  <mat-cell *matCellDef="let item">{{ item.category }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="amount">
                  <mat-header-cell *matHeaderCellDef>Amount</mat-header-cell>
                  <mat-cell *matCellDef="let item">{{ item.amount | currency }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="percentage">
                  <mat-header-cell *matHeaderCellDef>% of Total</mat-header-cell>
                  <mat-cell *matCellDef="let item">{{ item.percentage }}%</mat-cell>
                </ng-container>

                <ng-container matColumnDef="variance">
                  <mat-header-cell *matHeaderCellDef>Variance</mat-header-cell>
                  <mat-cell *matCellDef="let item">
                    <span [class]="item.variance <= 0 ? 'positive' : 'negative'">
                      {{ item.variance > 0 ? '+' : '' }}{{ item.variance }}%
                    </span>
                  </mat-cell>
                </ng-container>

                <mat-header-row *matHeaderRowDef="expenseColumns"></mat-header-row>
                <mat-row *matRowDef="let row; columns: expenseColumns;"></mat-row>
              </mat-table>
            </mat-card-content>
          </mat-card>
        </mat-tab>

        <mat-tab label="Profitability">
          <mat-card class="tab-content">
            <mat-card-header>
              <mat-card-title>Profitability Analysis</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-table [dataSource]="profitData" class="financial-table">
                <ng-container matColumnDef="metric">
                  <mat-header-cell *matHeaderCellDef>Metric</mat-header-cell>
                  <mat-cell *matCellDef="let item">{{ item.metric }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="current">
                  <mat-header-cell *matHeaderCellDef>Current Period</mat-header-cell>
                  <mat-cell *matCellDef="let item">{{ item.current }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="previous">
                  <mat-header-cell *matHeaderCellDef>Previous Period</mat-header-cell>
                  <mat-cell *matCellDef="let item">{{ item.previous }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="change">
                  <mat-header-cell *matHeaderCellDef>Change</mat-header-cell>
                  <mat-cell *matCellDef="let item">
                    <span [class]="item.changeValue >= 0 ? 'positive' : 'negative'">
                      {{ item.change }}
                    </span>
                  </mat-cell>
                </ng-container>

                <mat-header-row *matHeaderRowDef="profitColumns"></mat-header-row>
                <mat-row *matRowDef="let row; columns: profitColumns;"></mat-row>
              </mat-table>
            </mat-card-content>
          </mat-card>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .financial-report-consolidated {
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

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .summary-card .label {
      font-size: 0.875rem;
      color: #666;
      font-weight: 500;
    }

    .summary-card .value {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .summary-card .change {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .summary-card.revenue .value {
      color: #2196f3;
    }

    .summary-card.expenses .value {
      color: #ff5722;
    }

    .summary-card.profit .value {
      color: #4caf50;
    }

    .summary-card.margin .value {
      color: #9c27b0;
    }

    .positive {
      color: #4caf50;
    }

    .negative {
      color: #f44336;
    }

    .financial-tabs {
      margin-bottom: 24px;
    }

    .tab-content {
      margin-top: 16px;
    }

    .financial-table {
      width: 100%;
    }

    @media (max-width: 768px) {
      .filter-form {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-form mat-form-field {
        min-width: auto;
      }

      .summary-cards {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FinancialReportConsolidatedComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  filterForm: FormGroup;
  totalRevenue = 850000;
  totalExpenses = 620000;
  netProfit = 230000;
  profitMargin = 27.1;
  
  revenueColumns = ['branch', 'revenue', 'growth', 'share'];
  revenueData = [
    { branch: 'Main Branch', revenue: 450000, growth: 18.5, share: 52.9 },
    { branch: 'Downtown', revenue: 250000, growth: 12.3, share: 29.4 },
    { branch: 'Mall Location', revenue: 150000, growth: 8.7, share: 17.6 }
  ];

  expenseColumns = ['category', 'amount', 'percentage', 'variance'];
  expenseData = [
    { category: 'Salaries', amount: 280000, percentage: 45.2, variance: 5.2 },
    { category: 'Rent', amount: 120000, percentage: 19.4, variance: 0.0 },
    { category: 'Utilities', amount: 85000, percentage: 13.7, variance: 12.1 },
    { category: 'Marketing', amount: 75000, percentage: 12.1, variance: -8.5 },
    { category: 'Other', amount: 60000, percentage: 9.7, variance: 3.2 }
  ];

  profitColumns = ['metric', 'current', 'previous', 'change'];
  profitData = [
    { metric: 'Gross Profit', current: '$320,000', previous: '$275,000', change: '+16.4%', changeValue: 16.4 },
    { metric: 'Operating Profit', current: '$280,000', previous: '$235,000', change: '+19.1%', changeValue: 19.1 },
    { metric: 'Net Profit', current: '$230,000', previous: '$188,000', change: '+22.3%', changeValue: 22.3 },
    { metric: 'EBITDA', current: '$315,000', previous: '$265,000', change: '+18.9%', changeValue: 18.9 }
  ];

  constructor() {
    this.filterForm = this.fb.group({
      period: ['this-month'],
      branch: ['']
    });
  }

  ngOnInit() {
    this.loadReport();
  }

  loadReport() {
    // Implementation for loading financial report data
    console.log('Loading financial report with filters:', this.filterForm.value);
  }
}