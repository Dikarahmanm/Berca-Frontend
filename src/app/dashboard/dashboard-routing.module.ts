// src/app/dashboard/dashboard-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      {
        path: 'users',
        loadChildren: () =>
          import('../modules/user-management/user-management.module').then(m => m.UserManagementModule),
        data: {
          title: 'User Management',
          breadcrumb: 'Users'
        }
      },
      {
        path: 'logs',
        loadChildren: () =>
          import('../modules/activity-log/activity-log.module').then(m => m.ActivityLogModule),
        data: {
          title: 'Activity Logs', 
          breadcrumb: 'Logs'
        }
      },
      // ✅ NEW: Categories Route
      {
        path: 'categories',
        loadChildren: () =>
          import('../modules/category-management/category-management.module').then(m => m.CategoryManagementModule),
        data: {
          title: 'Category Management',
          breadcrumb: 'Categories'
        }
      },
      {
        path: '',
        redirectTo: 'users',  // ✅ Default redirect ke users
        pathMatch: 'full'
      },
      // ✅ Wildcard route untuk handling invalid routes
      {
        path: '**',
        redirectTo: 'users',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }