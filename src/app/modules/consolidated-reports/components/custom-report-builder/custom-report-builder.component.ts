import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-custom-report-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="custom-report-builder">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>build</mat-icon>
            Custom Report Builder
          </mat-card-title>
          <mat-card-subtitle>Create customized consolidated reports with your preferred data and visualizations</mat-card-subtitle>
        </mat-card-header>
      </mat-card>

      <mat-stepper [linear]="true" #stepper>
        <!-- Step 1: Report Configuration -->
        <mat-step [stepControl]="configForm" label="Report Configuration">
          <form [formGroup]="configForm" class="step-form">
            <mat-card>
              <mat-card-content>
                <div class="form-row">
                  <mat-form-field class="full-width">
                    <mat-label>Report Name</mat-label>
                    <input matInput formControlName="reportName" placeholder="Enter report name">
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field>
                    <mat-label>Report Type</mat-label>
                    <mat-select formControlName="reportType">
                      <mat-option value="sales">Sales Report</mat-option>
                      <mat-option value="financial">Financial Report</mat-option>
                      <mat-option value="inventory">Inventory Report</mat-option>
                      <mat-option value="operational">Operational Report</mat-option>
                      <mat-option value="performance">Performance Report</mat-option>
                      <mat-option value="mixed">Mixed Report</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field>
                    <mat-label>Time Period</mat-label>
                    <mat-select formControlName="timePeriod">
                      <mat-option value="daily">Daily</mat-option>
                      <mat-option value="weekly">Weekly</mat-option>
                      <mat-option value="monthly">Monthly</mat-option>
                      <mat-option value="quarterly">Quarterly</mat-option>
                      <mat-option value="yearly">Yearly</mat-option>
                      <mat-option value="custom">Custom Range</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field class="full-width">
                    <mat-label>Description</mat-label>
                    <textarea matInput formControlName="description" rows="3" placeholder="Describe the purpose of this report"></textarea>
                  </mat-form-field>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="step-actions">
              <button mat-raised-button color="primary" matStepperNext [disabled]="!configForm.valid">Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 2: Data Sources -->
        <mat-step [stepControl]="dataSourcesForm" label="Data Sources">
          <form [formGroup]="dataSourcesForm" class="step-form">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Select Data Sources</mat-card-title>
                <mat-card-subtitle>Choose which data sources to include in your report</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="data-sources-grid">
                  <div *ngFor="let source of availableDataSources" class="data-source-item">
                    <mat-checkbox 
                      [checked]="isDataSourceSelected(source.id)"
                      (change)="toggleDataSource(source.id, $event.checked)">
                      <div class="source-info">
                        <div class="source-header">
                          <mat-icon>{{ source.icon }}</mat-icon>
                          <span class="source-name">{{ source.name }}</span>
                        </div>
                        <p class="source-description">{{ source.description }}</p>
                      </div>
                    </mat-checkbox>
                  </div>
                </div>

                <mat-divider class="section-divider"></mat-divider>

                <div class="branch-selection">
                  <h4>Branch Selection</h4>
                  <mat-form-field class="full-width">
                    <mat-label>Branches to Include</mat-label>
                    <mat-select formControlName="selectedBranches" multiple>
                      <mat-option value="all">All Branches</mat-option>
                      <mat-option value="main">Main Branch</mat-option>
                      <mat-option value="downtown">Downtown Branch</mat-option>
                      <mat-option value="mall">Mall Location</mat-option>
                      <mat-option value="suburban">Suburban Branch</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="!dataSourcesForm.valid">Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 3: Metrics & KPIs -->
        <mat-step [stepControl]="metricsForm" label="Metrics & KPIs">
          <form [formGroup]="metricsForm" class="step-form">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Select Metrics and KPIs</mat-card-title>
                <mat-card-subtitle>Choose the specific metrics you want to track</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="metrics-categories">
                  <div *ngFor="let category of metricCategories" class="metric-category">
                    <h4 class="category-title">
                      <mat-icon>{{ category.icon }}</mat-icon>
                      {{ category.name }}
                    </h4>
                    
                    <div class="metrics-list">
                      <mat-checkbox 
                        *ngFor="let metric of category.metrics"
                        [checked]="isMetricSelected(metric.id)"
                        (change)="toggleMetric(metric.id, $event.checked)"
                        class="metric-checkbox">
                        <div class="metric-info">
                          <span class="metric-name">{{ metric.name }}</span>
                          <span class="metric-description">{{ metric.description }}</span>
                        </div>
                      </mat-checkbox>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="!metricsForm.valid">Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 4: Visualization -->
        <mat-step [stepControl]="visualizationForm" label="Visualization">
          <form [formGroup]="visualizationForm" class="step-form">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Visualization Settings</mat-card-title>
                <mat-card-subtitle>Configure how your data will be displayed</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="form-row">
                  <mat-form-field>
                    <mat-label>Primary Chart Type</mat-label>
                    <mat-select formControlName="primaryChartType">
                      <mat-option value="bar">Bar Chart</mat-option>
                      <mat-option value="line">Line Chart</mat-option>
                      <mat-option value="pie">Pie Chart</mat-option>
                      <mat-option value="area">Area Chart</mat-option>
                      <mat-option value="combo">Combination Chart</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field>
                    <mat-label>Table Style</mat-label>
                    <mat-select formControlName="tableStyle">
                      <mat-option value="standard">Standard Table</mat-option>
                      <mat-option value="striped">Striped Rows</mat-option>
                      <mat-option value="bordered">Bordered</mat-option>
                      <mat-option value="minimal">Minimal</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="visualization-options">
                  <h4>Display Options</h4>
                  <mat-checkbox formControlName="showSummaryCards">Show Summary Cards</mat-checkbox>
                  <mat-checkbox formControlName="showTrends">Show Trend Indicators</mat-checkbox>
                  <mat-checkbox formControlName="showComparison">Show Period Comparison</mat-checkbox>
                  <mat-checkbox formControlName="enableDrillDown">Enable Drill-down</mat-checkbox>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="!visualizationForm.valid">Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 5: Review & Generate -->
        <mat-step label="Review & Generate">
          <div class="step-form">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Review Your Report Configuration</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="review-section">
                  <h4>Report Configuration</h4>
                  <div class="review-item">
                    <strong>Name:</strong> {{ configForm.get('reportName')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Type:</strong> {{ configForm.get('reportType')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Time Period:</strong> {{ configForm.get('timePeriod')?.value }}
                  </div>
                </div>

                <mat-divider class="section-divider"></mat-divider>

                <div class="review-section">
                  <h4>Selected Metrics</h4>
                  <mat-chip-listbox>
                    <mat-chip-option *ngFor="let metric of getSelectedMetrics()">
                      {{ metric }}
                    </mat-chip-option>
                  </mat-chip-listbox>
                </div>

                <mat-divider class="section-divider"></mat-divider>

                <div class="review-section">
                  <h4>Selected Branches</h4>
                  <mat-chip-listbox>
                    <mat-chip-option *ngFor="let branch of dataSourcesForm.get('selectedBranches')?.value">
                      {{ branch }}
                    </mat-chip-option>
                  </mat-chip-listbox>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="accent" (click)="generateReport()">
                <mat-icon>description</mat-icon>
                Generate Report
              </button>
            </div>
          </div>
        </mat-step>
      </mat-stepper>
    </div>
  `,
  styles: [`
    .custom-report-builder {
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-card {
      margin-bottom: 24px;
    }

    .step-form {
      margin: 16px 0;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .step-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }

    .data-sources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .data-source-item {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      transition: border-color 0.2s ease;
    }

    .data-source-item:hover {
      border-color: #2196f3;
    }

    .source-info {
      margin-left: 8px;
    }

    .source-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .source-name {
      font-weight: 500;
      color: #333;
    }

    .source-description {
      margin: 0;
      font-size: 0.875rem;
      color: #666;
      line-height: 1.4;
    }

    .section-divider {
      margin: 24px 0;
    }

    .branch-selection h4 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .metrics-categories {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .metric-category {
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 16px;
    }

    .category-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      color: #333;
      font-size: 1.1rem;
    }

    .metrics-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
    }

    .metric-checkbox {
      margin: 0;
    }

    .metric-info {
      margin-left: 8px;
    }

    .metric-name {
      display: block;
      font-weight: 500;
      color: #333;
    }

    .metric-description {
      display: block;
      font-size: 0.875rem;
      color: #666;
      margin-top: 2px;
    }

    .visualization-options {
      margin-top: 24px;
    }

    .visualization-options h4 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .visualization-options mat-checkbox {
      display: block;
      margin-bottom: 12px;
    }

    .review-section {
      margin-bottom: 24px;
    }

    .review-section h4 {
      margin: 0 0 12px 0;
      color: #333;
    }

    .review-item {
      margin-bottom: 8px;
      padding: 8px 0;
    }

    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
      }

      .data-sources-grid {
        grid-template-columns: 1fr;
      }

      .metrics-list {
        grid-template-columns: 1fr;
      }

      .step-actions {
        justify-content: center;
      }
    }
  `]
})
export class CustomReportBuilderComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  configForm: FormGroup;
  dataSourcesForm: FormGroup;
  metricsForm: FormGroup;
  visualizationForm: FormGroup;

  selectedDataSources: string[] = [];
  selectedMetrics: string[] = [];

  availableDataSources = [
    { id: 'sales', name: 'Sales Data', icon: 'shopping_cart', description: 'Transaction records, revenue, and sales performance metrics' },
    { id: 'inventory', name: 'Inventory Data', icon: 'inventory', description: 'Stock levels, product movements, and inventory valuation' },
    { id: 'financial', name: 'Financial Data', icon: 'account_balance', description: 'Financial statements, expenses, and profitability metrics' },
    { id: 'customer', name: 'Customer Data', icon: 'people', description: 'Customer demographics, satisfaction, and behavior analytics' },
    { id: 'employee', name: 'Employee Data', icon: 'badge', description: 'Staff performance, productivity, and HR metrics' },
    { id: 'operational', name: 'Operational Data', icon: 'settings', description: 'Process efficiency, system performance, and operational KPIs' }
  ];

  metricCategories = [
    {
      name: 'Sales Metrics',
      icon: 'trending_up',
      metrics: [
        { id: 'total_revenue', name: 'Total Revenue', description: 'Sum of all sales revenue' },
        { id: 'sales_growth', name: 'Sales Growth', description: 'Period-over-period sales growth rate' },
        { id: 'avg_transaction', name: 'Average Transaction Value', description: 'Mean value per transaction' },
        { id: 'conversion_rate', name: 'Conversion Rate', description: 'Percentage of leads converted to sales' }
      ]
    },
    {
      name: 'Financial Metrics',
      icon: 'account_balance_wallet',
      metrics: [
        { id: 'profit_margin', name: 'Profit Margin', description: 'Net profit as percentage of revenue' },
        { id: 'roi', name: 'Return on Investment', description: 'ROI calculation for investments' },
        { id: 'cash_flow', name: 'Cash Flow', description: 'Net cash flow analysis' },
        { id: 'expense_ratio', name: 'Expense Ratio', description: 'Operating expenses as percentage of revenue' }
      ]
    },
    {
      name: 'Operational Metrics',
      icon: 'speed',
      metrics: [
        { id: 'efficiency', name: 'Operational Efficiency', description: 'Overall operational efficiency score' },
        { id: 'uptime', name: 'System Uptime', description: 'System availability percentage' },
        { id: 'response_time', name: 'Response Time', description: 'Average response time for requests' },
        { id: 'throughput', name: 'Throughput', description: 'Number of transactions processed per hour' }
      ]
    }
  ];

  constructor() {
    this.configForm = this.fb.group({
      reportName: ['', Validators.required],
      reportType: ['', Validators.required],
      timePeriod: ['', Validators.required],
      description: ['']
    });

    this.dataSourcesForm = this.fb.group({
      selectedBranches: [[], Validators.required]
    });

    this.metricsForm = this.fb.group({
      // This will be populated dynamically
    });

    this.visualizationForm = this.fb.group({
      primaryChartType: ['bar', Validators.required],
      tableStyle: ['standard', Validators.required],
      showSummaryCards: [true],
      showTrends: [true],
      showComparison: [false],
      enableDrillDown: [false]
    });
  }

  ngOnInit() {
    // Initialize with some default selections
    this.selectedDataSources = ['sales', 'financial'];
    this.selectedMetrics = ['total_revenue', 'profit_margin'];
  }

  isDataSourceSelected(sourceId: string): boolean {
    return this.selectedDataSources.includes(sourceId);
  }

  toggleDataSource(sourceId: string, selected: boolean) {
    if (selected) {
      this.selectedDataSources.push(sourceId);
    } else {
      this.selectedDataSources = this.selectedDataSources.filter(id => id !== sourceId);
    }
  }

  isMetricSelected(metricId: string): boolean {
    return this.selectedMetrics.includes(metricId);
  }

  toggleMetric(metricId: string, selected: boolean) {
    if (selected) {
      this.selectedMetrics.push(metricId);
    } else {
      this.selectedMetrics = this.selectedMetrics.filter(id => id !== metricId);
    }
  }

  getSelectedMetrics(): string[] {
    return this.selectedMetrics.map(id => {
      for (const category of this.metricCategories) {
        const metric = category.metrics.find(m => m.id === id);
        if (metric) return metric.name;
      }
      return id;
    });
  }

  generateReport() {
    const reportConfig = {
      config: this.configForm.value,
      dataSources: this.selectedDataSources,
      branches: this.dataSourcesForm.value.selectedBranches,
      metrics: this.selectedMetrics,
      visualization: this.visualizationForm.value
    };

    console.log('Generating custom report with configuration:', reportConfig);
    
    // Here you would typically call a service to generate the report
    // For now, we'll just show a success message
    alert('Report configuration saved! Your custom report is being generated.');
  }
}