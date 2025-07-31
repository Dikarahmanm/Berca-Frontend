// ===== FIX: app-routes.ts =====
// Tambahkan route inventory yang hilang

import { Routes } from '@angular/router';
import { AuthGuard } from './core/guard/auth.guard';
import { RoleGuard } from './core/guard/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
    title: 'Login - Toko Eniwan POS'
  },

  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent),
        pathMatch: 'full'
      },
      {
        path: 'users',
        loadChildren: () => import('./modules/user-management/user-management.module').then(m => m.UserManagementModule),
        canActivate: [RoleGuard],
        data: {
          title: 'User Management',
          breadcrumb: 'Users',
          requiredRoles: ['Admin', 'Manager']
        }
      },
      {
        path: 'categories',
        loadChildren: () => import('./modules/category-management/category-management.module').then(m => m.CategoryManagementModule),
        canActivate: [RoleGuard],
        data: {
          title: 'Category Management',
          breadcrumb: 'Categories',
          requiredRoles: ['Admin', 'Manager']
        }
      },
      // ✅ TAMBAHKAN ROUTE INVENTORY YANG HILANG
      {
        path: 'inventory',
        loadChildren: () => import('./modules/inventory/inventory.module').then(m => m.InventoryModule),
        canActivate: [RoleGuard],
        data: {
          title: 'Inventory Management',
          breadcrumb: 'Inventory',
          requiredRoles: ['Admin', 'Manager', 'User']
        }
      },
      {
        path: 'logs',
        loadChildren: () => import('./modules/activity-log/activity-log.module').then(m => m.ActivityLogModule),
        canActivate: [RoleGuard],
        data: {
          title: 'Activity Logs',
          breadcrumb: 'Logs',
          requiredRoles: ['Admin', 'Manager']
        }
      }
    ],
    title: 'Dashboard - Toko Eniwan POS'
  },

  {
    path: 'pos',
    loadChildren: () => import('./modules/pos/pos.module').then(m => m.POSModule),
    canActivate: [AuthGuard],
    data: {
      title: 'Point of Sale',
      breadcrumb: 'POS',
      roles: ['Admin', 'Manager', 'User', 'Cashier']
    },
    title: 'POS - Toko Eniwan'
  },

  {
    path: 'notifications',
    loadComponent: () => import('./modules/notifications/notification-center/notification-center.component').then(m => m.NotificationCenterComponent),
    canActivate: [AuthGuard],
    data: {
      title: 'Notifications',
      breadcrumb: 'Notifications',
      roles: ['Admin', 'Manager', 'User', 'Cashier']
    },
    title: 'Notifications - Toko Eniwan'
  },

  {
    path: 'profile',
    loadComponent: () => import('./modules/user-profile/user-profile.component').then(m => m.UserProfileComponent),
    canActivate: [AuthGuard],
    title: 'Profile - Toko Eniwan POS'
  },

  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  
  {
    path: '**',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  }
];
