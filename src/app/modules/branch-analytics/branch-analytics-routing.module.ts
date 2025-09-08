// src/app/modules/branch-analytics/branch-analytics-routing.module.ts
// Routing configuration for Branch Analytics module

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Simple placeholder components
import { 
  BranchAnalyticsDashboardComponent,
  BranchPerformanceComparisonComponent,
  BranchEfficiencyAnalysisComponent,
  BranchCapacityPlanningComponent,
  BranchTrendAnalysisComponent,
  BranchBenchmarkingComponent,
  BranchAlertManagerComponent
} from './components/simple-placeholders';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: BranchAnalyticsDashboardComponent,
    data: {
      title: 'Branch Analytics Dashboard',
      breadcrumb: 'Dashboard'
    }
  },
  {
    path: 'performance-comparison',
    component: BranchPerformanceComparisonComponent,
    data: {
      title: 'Branch Performance Comparison',
      breadcrumb: 'Performance Comparison'
    }
  },
  {
    path: 'efficiency-analysis',
    component: BranchEfficiencyAnalysisComponent,
    data: {
      title: 'Branch Efficiency Analysis',
      breadcrumb: 'Efficiency Analysis'
    }
  },
  {
    path: 'capacity-planning',
    component: BranchCapacityPlanningComponent,
    data: {
      title: 'Branch Capacity Planning',
      breadcrumb: 'Capacity Planning'
    }
  },
  {
    path: 'trend-analysis',
    component: BranchTrendAnalysisComponent,
    data: {
      title: 'Branch Trend Analysis',
      breadcrumb: 'Trend Analysis'
    }
  },
  {
    path: 'benchmarking',
    component: BranchBenchmarkingComponent,
    data: {
      title: 'Branch Benchmarking',
      breadcrumb: 'Benchmarking'
    }
  },
  {
    path: 'alerts',
    component: BranchAlertManagerComponent,
    data: {
      title: 'Branch Alert Manager',
      breadcrumb: 'Alert Manager'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BranchAnalyticsRoutingModule { }