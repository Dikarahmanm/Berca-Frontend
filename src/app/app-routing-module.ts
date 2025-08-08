// src/app/app-routing.module.ts
// ✅ FINAL FIX: Add proper empty path component for children

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guard/auth.guard';

const routes: Routes = [
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
      // ✅ CRITICAL FIX: Add empty path with component
      {
        path: '',
        loadComponent: () => import('./dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent),
        pathMatch: 'full'
      },
      {
        path: 'users',
        loadChildren: () => import('./modules/user-management/user-management.module').then(m => m.UserManagementModule)
      },
      {
        path: 'categories',
        loadChildren: () => import('./modules/category-management/category-management.module').then(m => m.CategoryManagementModule)
      },
      {
        path: 'membership',
        loadChildren: () => import('./modules/membership/membership.module').then(m => m.MembershipModule)
      },
      {
        path: 'logs',
        loadChildren: () => import('./modules/activity-log/activity-log.module').then(m => m.ActivityLogModule)
      }
    ],
    title: 'Dashboard - Toko Eniwan POS'
  },

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

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: true,
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled',
    scrollOffset: [0, 64]
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }