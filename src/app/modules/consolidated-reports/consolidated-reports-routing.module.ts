// src/app/modules/consolidated-reports/consolidated-reports-routing.module.ts
// Routing configuration for Consolidated Reports module

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { ConsolidatedReportsDashboardComponent } from './components/consolidated-reports-dashboard/consolidated-reports-dashboard.component';
import { SalesReportConsolidatedComponent } from './components/sales-report-consolidated/sales-report-consolidated.component';
import { InventoryReportConsolidatedComponent } from './components/inventory-report-consolidated/inventory-report-consolidated.component';
import { FinancialReportConsolidatedComponent } from './components/financial-report-consolidated/financial-report-consolidated.component';
import { OperationalReportConsolidatedComponent } from './components/operational-report-consolidated/operational-report-consolidated.component';
import { PerformanceReportConsolidatedComponent } from './components/performance-report-consolidated/performance-report-consolidated.component';
import { CustomReportBuilderComponent } from './components/custom-report-builder/custom-report-builder.component';
import { ReportSchedulerComponent } from './components/report-scheduler/report-scheduler.component';
import { ReportExportManagerComponent } from './components/report-export-manager/report-export-manager.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: ConsolidatedReportsDashboardComponent,
    data: {
      title: 'Consolidated Reports Dashboard',
      breadcrumb: 'Dashboard'
    }
  },
  {
    path: 'sales',
    component: SalesReportConsolidatedComponent,
    data: {
      title: 'Consolidated Sales Reports',
      breadcrumb: 'Sales Reports'
    }
  },
  {
    path: 'inventory',
    component: InventoryReportConsolidatedComponent,
    data: {
      title: 'Consolidated Inventory Reports',
      breadcrumb: 'Inventory Reports'
    }
  },
  {
    path: 'financial',
    component: FinancialReportConsolidatedComponent,
    data: {
      title: 'Consolidated Financial Reports',
      breadcrumb: 'Financial Reports'
    }
  },
  {
    path: 'operational',
    component: OperationalReportConsolidatedComponent,
    data: {
      title: 'Consolidated Operational Reports',
      breadcrumb: 'Operational Reports'
    }
  },
  {
    path: 'performance',
    component: PerformanceReportConsolidatedComponent,
    data: {
      title: 'Consolidated Performance Reports',
      breadcrumb: 'Performance Reports'
    }
  },
  {
    path: 'custom-builder',
    component: CustomReportBuilderComponent,
    data: {
      title: 'Custom Report Builder',
      breadcrumb: 'Report Builder'
    }
  },
  {
    path: 'scheduler',
    component: ReportSchedulerComponent,
    data: {
      title: 'Report Scheduler',
      breadcrumb: 'Scheduler'
    }
  },
  {
    path: 'export-manager',
    component: ReportExportManagerComponent,
    data: {
      title: 'Report Export Manager',
      breadcrumb: 'Export Manager'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConsolidatedReportsRoutingModule { }