// src/app/dashboard/dashboard-routing.module.ts
// ✅ UPDATED: Added Analytics route and prepared for Membership

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { RoleGuard } from '../core/guard/role.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      // ===== DASHBOARD ANALYTICS (NEW) ===== //
      {
        path: 'analytics',
        loadComponent: () => import('./dashboard-analytics/dashboard-analytics.component').then(c => c.DashboardAnalyticsComponent),
        canActivate: [RoleGuard],
        data: {
          title: 'Dashboard Analytics',
          breadcrumb: 'Analytics',
          requiredRoles: ['Admin', 'Manager', 'User']
        }
      },

      // ===== USER MANAGEMENT ===== //
      {
        path: 'users',
        loadChildren: () => import('../modules/user-management/user-management.module').then(m => m.UserManagementModule),
        canActivate: [RoleGuard],
        data: {
          title: 'User Management',
          breadcrumb: 'Users',
          requiredRoles: ['Admin', 'Manager']
        }
      },

      // ===== CATEGORY MANAGEMENT ===== //
      {
        path: 'categories',
        loadChildren: () => import('../modules/category-management/category-management.module').then(m => m.CategoryManagementModule),
        canActivate: [RoleGuard],
        data: {
          title: 'Category Management',
          breadcrumb: 'Categories',
          requiredRoles: ['Admin', 'Manager']
        }
      },

      // ===== INVENTORY MANAGEMENT ===== //
      {
        path: 'inventory',
        loadComponent: () => import('../modules/inventory/components/inventory-list/inventory-list.component').then(c => c.InventoryListComponent),
        canActivate: [RoleGuard],
        data: {
          title: 'Inventory Management',
          breadcrumb: 'Inventory',
          requiredRoles: ['Admin', 'Manager', 'User']
        }
      },

      // ===== MEMBERSHIP MANAGEMENT (READY FOR NEXT SPRINT) ===== //
      // {
      //   path: 'membership',
      //   loadComponent: () => import('../modules/membership/membership-list/membership-list.component').then(c => c.MembershipListComponent),
      //   canActivate: [RoleGuard],
      //   data: {
      //     title: 'Membership Management',
      //     breadcrumb: 'Membership',
      //     requiredRoles: ['Admin', 'Manager', 'User']
      //   }
      // },

      // ===== REPORTS & ANALYTICS (FUTURE) ===== //
      // {
      //   path: 'reports',
      //   loadComponent: () => import('../modules/reports/reports-dashboard/reports-dashboard.component').then(c => c.ReportsDashboardComponent),
      //   canActivate: [RoleGuard],
      //   data: {
      //     title: 'Reports & Analytics',
      //     breadcrumb: 'Reports',
      //     requiredRoles: ['Admin', 'Manager']
      //   }
      // },

      // ===== ACTIVITY LOGS ===== //
      {
        path: 'logs',
        loadChildren: () => import('../modules/activity-log/activity-log.module').then(m => m.ActivityLogModule),
        canActivate: [RoleGuard],
        data: {
          title: 'Activity Logs',
          breadcrumb: 'Logs',
          requiredRoles: ['Admin', 'Manager']
        }
      },

      // ===== DEFAULT ROUTE - REDIRECT TO ANALYTICS ===== //
      {
        path: '',
        redirectTo: 'analytics',
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