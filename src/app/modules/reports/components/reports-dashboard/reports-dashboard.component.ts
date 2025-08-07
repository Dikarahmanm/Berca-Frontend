// src/app/modules/reports/components/reports-dashboard/reports-dashboard.component.ts
// ✅ Reports Dashboard - Standalone Component

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription, Observable } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

// Chart component - NEW Chart.js implementation
import { DateRangeUtil } from '../../../../shared/utils/date-range.util';
import { ChartJSComponent, ChartJSData } from '../chart-js/chart-js.component';

// Remove old heavy chart imports
// import { ReportsChartComponent, ChartData, SeriesData } from '../charts/reports-chart.component';
// import { 
//   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
//   BarChart, Bar, PieChart, Pie, Cell, Legend
// } from 'recharts';

// Services and interfaces
import { ReportsService } from '../../../../core/services/reports.service';
import {
  SalesReportDto,
  InventoryReportDto,
  FinancialReportDto,
  CustomerReportDto,
  ReportDateFilter,
  ReportExportRequest
} from '../../interfaces/reports.interfaces';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    // Material modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    // Chart component - NEW Chart.js
    ChartJSComponent
  ],
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.scss']
})
export class ReportsDashboardComponent implements OnInit, OnDestroy {
  // Form controls
  dateRangeForm: FormGroup;
  
  // Report data
  salesReport: SalesReportDto | null = null;
  inventoryReport: InventoryReportDto | null = null;
  financialReport: FinancialReportDto | null = null;
  customerReport: CustomerReportDto | null = null;

  // UI state
  activeTab = 0;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Track which tabs have been loaded to avoid re-loading
  loadedTabs = new Set<number>();
  
  // Chart colors
  primaryColor = '#FF914D';
  chartColors = [
    '#FF914D', '#4BBF7B', '#FFB84D', '#E15A4F',
    '#6366f1', '#8b5cf6', '#06b6d4', '#10b981'
  ];

  // Subscription management
  private subscriptions = new Subscription();

  constructor(
    private reportsService: ReportsService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.dateRangeForm = this.initializeDateForm();
    this.loading$ = this.reportsService.loading$;
    this.error$ = this.reportsService.error$;
  }

  ngOnInit(): void {
    console.log('🚀 Reports Dashboard Component initialized');
    // Load first tab immediately without waiting for animation
    setTimeout(() => {
      this.loadFirstTab();
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== INITIALIZATION =====

  private initializeDateForm(): FormGroup {
    // ✅ SYNCHRONIZED: Use same date range as Analytics (current month)
    const { startDate, endDate } = DateRangeUtil.getCurrentMonthRange();
    
    console.log('📅 Reports using synchronized date range:', { startDate, endDate });
    
    return this.fb.group({
      startDate: [startDate],
      endDate: [endDate],
      preset: ['currentMonth'] // Updated to match Analytics
    });
  }

  // ===== TAB MANAGEMENT =====

  onTabChange(event: any): void {
    const selectedTabIndex = event.index;
    console.log('📋 Tab changed to:', selectedTabIndex);
    
    this.activeTab = selectedTabIndex;
    
    // Load data only when tab is first accessed
    if (!this.loadedTabs.has(selectedTabIndex)) {
      this.loadTabData(selectedTabIndex);
      this.loadedTabs.add(selectedTabIndex);
    }
  }

  loadTabData(tabIndex: number): void {
    console.log('🔄 Loading data for tab:', tabIndex);
    const dateFilter = this.getDateFilter();
    
    switch (tabIndex) {
      case 0: // Sales Report
        console.log('📊 Loading Sales Report tab');
        this.loadSalesReport(dateFilter);
        break;
      case 1: // Financial Report
        console.log('💰 Loading Financial Report tab');
        this.loadFinancialReport(dateFilter);
        break;
      case 2: // Inventory Report
        console.log('📦 Loading Inventory Report tab');
        this.loadInventoryReport();
        break;
      case 3: // Customer Report
        console.log('👥 Loading Customer Report tab');
        this.loadCustomerReport(dateFilter);
        break;
      default:
        console.log('❓ Unknown tab index:', tabIndex);
    }
  }

  // Load first tab by default when component is ready
  loadFirstTab(): void {
    console.log('🎯 Loading first tab (Sales Report)');
    if (!this.loadedTabs.has(0)) {
      this.loadTabData(0);
      this.loadedTabs.add(0);
    }
  }

  // Helper method to check if tab data is loaded
  isTabLoaded(tabIndex: number): boolean {
    return this.loadedTabs.has(tabIndex);
  }

  // ===== DATE RANGE MANAGEMENT =====

  onPresetChange(preset: string): void {
    const presets = this.reportsService.getDateRangePresets();
    const selectedPreset = presets[preset];
    
    if (selectedPreset) {
      this.dateRangeForm.patchValue({
        startDate: selectedPreset.startDate,
        endDate: selectedPreset.endDate
      });
      
      this.onDateRangeChange();
    }
  }

  onDateRangeChange(): void {
    console.log('📅 Date range changed - reloading current tab:', this.activeTab);
    
    // Clear the loaded flag for current tab to force reload
    this.loadedTabs.delete(this.activeTab);
    
    // Reload only the currently active tab
    this.loadTabData(this.activeTab);
    this.loadedTabs.add(this.activeTab);
  }

  private getDateFilter(): ReportDateFilter {
    const formValue = this.dateRangeForm.value;
    const filter = {
      startDate: formValue.startDate,
      endDate: formValue.endDate
    };
    
    console.log('📅 Reports getDateFilter():', filter);
    console.log('📅 Reports sending to backend:', {
      startDate: filter.startDate.toISOString(),
      endDate: filter.endDate.toISOString(),
      localStart: filter.startDate.toString(),
      localEnd: filter.endDate.toString()
    });
    
    return filter;
  }

  // ===== REPORT LOADING =====

  private loadSalesReport(filter: ReportDateFilter): void {
    console.log('📈 Component: Loading Sales Report with filter:', filter);
    this.subscriptions.add(
      this.reportsService.getSalesReport(filter).subscribe({
        next: (report) => {
          console.log('✅ Component: Sales Report received:', report);
          this.salesReport = report;
        },
        error: (error) => {
          console.error('❌ Component: Sales Report error:', error);
          this.showError('Failed to load sales report');
        }
      })
    );
  }

  private loadInventoryReport(): void {
    console.log('📦 Component: Loading Inventory Report');
    this.subscriptions.add(
      this.reportsService.getInventoryReport().subscribe({
        next: (report) => {
          console.log('✅ Component: Inventory Report received:', report);
          this.inventoryReport = report;
        },
        error: (error) => {
          console.error('❌ Component: Inventory Report error:', error);
          this.showError('Failed to load inventory report');
        }
      })
    );
  }

  private loadFinancialReport(filter: ReportDateFilter): void {
    console.log('💰 Component: Loading Financial Report with filter:', filter);
    this.subscriptions.add(
      this.reportsService.getFinancialReport(filter).subscribe({
        next: (report) => {
          console.log('✅ Component: Financial Report received:', report);
          this.financialReport = report;
        },
        error: (error) => {
          console.error('❌ Component: Financial Report error:', error);
          this.showError('Failed to load financial report');
        }
      })
    );
  }

  private loadCustomerReport(filter: ReportDateFilter): void {
    console.log('👥 Component: Loading Customer Report with filter:', filter);
    this.subscriptions.add(
      this.reportsService.getCustomerReport(filter).subscribe({
        next: (report) => {
          console.log('✅ Component: Customer Report received:', report);
          this.customerReport = report;
        },
        error: (error) => {
          console.error('❌ Component: Customer Report error:', error);
          this.showError('Failed to load customer report');
        }
      })
    );
  }

  // ===== EXPORT FUNCTIONALITY =====

  exportReport(reportType: 'sales' | 'inventory' | 'financial' | 'customer', format: 'PDF' | 'EXCEL'): void {
    const request: ReportExportRequest = {
      ...this.getDateFilter(),
      format
    };

    let exportObservable;
    
    switch (reportType) {
      case 'sales':
        exportObservable = this.reportsService.exportSalesReport(request);
        break;
      case 'inventory':
        exportObservable = this.reportsService.exportInventoryReport(format);
        break;
      case 'financial':
        exportObservable = this.reportsService.exportFinancialReport(request);
        break;
      case 'customer':
        exportObservable = this.reportsService.exportCustomerReport(request);
        break;
    }

    this.subscriptions.add(
      exportObservable.subscribe({
        next: (exportResult) => {
          console.log('📄 Export Result:', exportResult);
          this.showSuccess(`${reportType} report exported successfully`);
          
          // Use downloadUrl if available, otherwise fallback to filePath
          this.reportsService.downloadReport(
            exportResult.filePath, 
            exportResult.downloadUrl
          );
        },
        error: (error) => {
          console.error('❌ Export Error:', error);
          this.showError(`Failed to export ${reportType} report: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  // ===== CHART DATA TRANSFORMATION =====

  getSalesChartData(): ChartJSData[] {
    if (!this.salesReport) return [];
    
    return this.salesReport.paymentMethodBreakdown.map(item => ({
      name: item.methodName,
      value: item.totalAmount
    }));
  }

  getCategoryPerformanceChartData(): ChartJSData[] {
    if (!this.salesReport || !this.salesReport.categoryPerformance) return [];
    
    return this.salesReport.categoryPerformance.map(item => ({
      name: item.categoryName,
      value: item.totalRevenue
    }));
  }

  getFinancialChartData(): ChartJSData[] {
    if (!this.financialReport) return [];
    
    return this.financialReport.monthlyBreakdown.map(item => ({
      name: `${item.monthName}`,
      value: item.revenue
    }));
  }

  getInventoryChartData(): ChartJSData[] {
    if (!this.inventoryReport) return [];
    
    return this.inventoryReport.categoryBreakdown.map(item => ({
      name: item.categoryName,
      value: item.totalValue,
      color: item.categoryColor
    }));
  }

  getCustomerLoyaltyData(): ChartJSData[] {
    if (!this.customerReport) return [];
    
    return this.customerReport.loyaltyAnalysis.map(item => ({
      name: item.tierName,
      value: item.totalRevenue
    }));
  }

  // ===== FORMATTING HELPERS =====

  formatCurrency(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return 'Rp 0';
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return new Intl.NumberFormat('id-ID').format(value);
  }

  formatPercentage(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }

  // ===== UI HELPERS =====

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // ===== TABLE COLUMNS =====

  getPaymentMethodColumns() {
    return ['methodName', 'transactionCount', 'totalAmount', 'percentage'];
  }

  getCategoryPerformanceColumns() {
    return ['categoryName', 'totalRevenue', 'totalItemsSold', 'productCount', 'averagePrice', 'growthPercentage'];
  }

  getTopCustomersColumns() {
    return ['memberName', 'totalOrders', 'totalSpent', 'averageOrderValue', 'lastOrderDate'];
  }

  getCategoryBreakdownColumns() {
    return ['categoryName', 'productCount', 'totalValue', 'lowStockCount'];
  }
}