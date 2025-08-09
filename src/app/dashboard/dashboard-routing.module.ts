// src/app/dashboard/dashboard-routing.module.ts
// ✅ UPDATED: Uncommented Reports Route

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { roleGuard } from '../core/guard/role.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      // ===== DASHBOARD ANALYTICS (MOVED TO app-routes.ts) ===== //
      // Note: Analytics route is now defined in app-routes.ts since we're using standalone components

      // ===== USER MANAGEMENT ===== //
      {
        path: 'users',
        loadChildren: () => import('../modules/user-management/user-management.module').then(m => m.UserManagementModule),
        canActivate: [roleGuard],
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
        canActivate: [roleGuard],
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
        canActivate: [roleGuard],
        data: {
          title: 'Inventory Management',
          breadcrumb: 'Inventory',
          requiredRoles: ['Admin', 'Manager', 'User']
        }
      },

      // ===== REPORTS & ANALYTICS (✅ NOW ACTIVE) ===== //
      {
        path: 'reports',
        loadChildren: () => import('../modules/reports/reports.module').then(m => m.ReportsModule),
        canActivate: [roleGuard],
        data: {
          title: 'Reports & Analytics',
          breadcrumb: 'Reports',
          requiredRoles: ['Admin', 'Manager']
        }
      },

      // ===== MEMBERSHIP MANAGEMENT (READY FOR NEXT SPRINT) ===== //
      {
        path: 'membership',
  loadChildren: () => import('../modules/membership/membership.module').then(m => m.MembershipModule),
        canActivate: [roleGuard],
        data: {
          title: 'Membership Management',
          breadcrumb: 'Membership',
          requiredRoles: ['Admin', 'Manager', 'User']
        }
      },

      // ===== ACTIVITY LOGS ===== //
      {
        path: 'logs',
        loadChildren: () => import('../modules/activity-log/activity-log.module').then(m => m.ActivityLogModule),
        canActivate: [roleGuard],
        data: {
          title: 'Activity Logs',
          breadcrumb: 'Logs',
          requiredRoles: ['Admin', 'Manager']
        }
      },

      // ===== NOTIFICATIONS CENTER ===== //
      {
        path: 'notifications',
        loadChildren: () => import('../modules/notifications/notifications.module').then(m => m.NotificationsModule),
        data: {
          title: 'Notification Center',
          breadcrumb: 'Notifications'
        }
      },

      // ===== DEFAULT ROUTE - REDIRECT TO DASHBOARD HOME ===== //
      {
        path: '',
        redirectTo: '/dashboard',
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