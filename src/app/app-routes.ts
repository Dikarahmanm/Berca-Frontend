import { Routes } from '@angular/router';
import { AuthGuard } from './core/guard/auth.guard';

export const routes: Routes = [
  // ===== PUBLIC ROUTES ===== //
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
    title: 'Login - Toko Eniwan POS'
  },

  // ===== PROTECTED ROUTES ===== //
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'users',
        loadChildren: () => import('./modules/user-management/user-management.module').then(m => m.UserManagementModule),
        data: {
          title: 'User Management',
          breadcrumb: 'Users',
          roles: ['Admin', 'Manager']
        }
      },
      {
        path: 'categories',
        loadChildren: () => import('./modules/category-management/category-management.module').then(m => m.CategoryManagementModule),
        data: {
          title: 'Category Management',
          breadcrumb: 'Categories',
          roles: ['Admin', 'Manager']
        }
      },
      {
        path: 'logs',
        loadChildren: () => import('./modules/activity-log/activity-log.module').then(m => m.ActivityLogModule),
        data: {
          title: 'Activity Logs',
          breadcrumb: 'Logs',
          roles: ['Admin', 'Manager']
        }
      },
      {
        path: '',
        loadComponent: () => import('./dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent),
        pathMatch: 'full'
      }
    ],
    title: 'Dashboard - Toko Eniwan POS'
  },

  // ===== POS STANDALONE ROUTE ===== //
  {
    path: 'pos',
    loadComponent: () => import('./modules/pos/pos/pos.component').then(m => m.POSComponent),
    canActivate: [AuthGuard],
    data: {
      title: 'Point of Sale',
      breadcrumb: 'POS',
      roles: ['Admin', 'Manager', 'User', 'Cashier']
    },
    title: 'POS - Toko Eniwan'
  },

  // ===== NOTIFICATIONS STANDALONE ROUTE ===== //
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

  // ===== USER PROFILE ===== //
  {
    path: 'profile',
    loadComponent: () => import('./modules/user-profile/user-profile.component').then(m => m.UserProfileComponent),
    canActivate: [AuthGuard],
    title: 'Profile - Toko Eniwan POS'
  },

  // ===== DEFAULT & FALLBACK ROUTES ===== //
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