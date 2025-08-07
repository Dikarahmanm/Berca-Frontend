// src/app/modules/reports/reports-routing.module.ts
// ✅ Reports Routing - Lazy Loaded Routes

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../../core/guard/role.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/reports-dashboard/reports-dashboard.component').then(c => c.ReportsDashboardComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Reports & Analytics',
      breadcrumb: 'Reports',
      requiredRoles: ['Admin', 'Manager']
    }
  },
  {
    path: 'dashboard',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportsRoutingModule { }