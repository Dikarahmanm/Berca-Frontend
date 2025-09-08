// src/app/app-routes.ts
// ✅ FIXED: Gunakan functional guards dan pertahankan route inventory + reports

import { Routes } from '@angular/router';
import { authGuard } from './core/guard/auth.guard';
import { roleGuard } from './core/guard/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Login - Toko Eniwan POS',
  },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard/dashboard-home/dashboard-home.component').then(
            (m) => m.DashboardHomeComponent
          ),
        pathMatch: 'full',
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import(
            './dashboard/dashboard-analytics/dashboard-analytics.component'
          ).then((c) => c.DashboardAnalyticsComponent),
        canActivate: [roleGuard],
        data: {
          title: 'Dashboard Analytics',
          breadcrumb: 'Analytics',
          requiredRoles: ['Admin', 'Manager', 'User'],
        },
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./modules/user-management/user-management.module').then(
            (m) => m.UserManagementModule
          ),
        canActivate: [roleGuard],
        data: {
          title: 'User Management',
          breadcrumb: 'Users',
          requiredRoles: ['Admin', 'Manager'],
        },
      },
      {
        path: 'categories',
        loadChildren: () =>
          import('./modules/category-management/category-management.module').then(
            (m) => m.CategoryManagementModule
          ),
        canActivate: [roleGuard],
        data: {
          title: 'Category Management',
          breadcrumb: 'Categories',
          requiredRoles: ['Admin', 'Manager'],
        },
      },
      {
        path: 'membership',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./modules/membership/components/membership-list/membership-list.component').then(
                (m) => m.MembershipListComponent
              ),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./modules/membership/components/membership-form/membership-form.component').then(
                (m) => m.MembershipFormComponent
              ),
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./modules/membership/components/membership-form/membership-form.component').then(
                (m) => m.MembershipFormComponent
              ),
          },
          {
            path: 'view/:id',
            loadComponent: () =>
              import('./modules/membership/components/membership-form/membership-form.component').then(
                (m) => m.MembershipFormComponent
              ),
          },
          {
            path: 'points/:id',
            loadComponent: () =>
              import('./modules/membership/components/member-points/member-points.component').then(
                (m) => m.MemberPointsComponent
              ),
          },
          {
            path: 'analytics',
            loadComponent: () =>
              import('./modules/membership/components/membership-analytics/membership-analytics.component').then(
                (m) => m.MembershipAnalyticsComponent
              ),
          },
          {
            path: 'credit-dashboard',
            loadComponent: () =>
              import('./modules/membership/components/member-credit-dashboard/member-credit-dashboard.component').then(
                (m) => m.MemberCreditDashboardComponent
              ),
          }
        ],
        canActivate: [roleGuard],
        data: {
          title: 'Membership Management',
          breadcrumb: 'Membership',
          requiredRoles: ['Admin', 'Manager', 'User'],
        },
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./modules/inventory/inventory.module').then(
            (m) => m.InventoryModule
          ),
        canActivate: [roleGuard],
        data: {
          title: 'Inventory Management',
          breadcrumb: 'Inventory',
          requiredRoles: ['Admin', 'Manager', 'User'],
        },
      },
      {
        path: 'supplier',
        loadChildren: () =>
          import('./modules/supplier/supplier.module').then(
            (m) => m.SupplierModule
          ),
        canActivate: [roleGuard],
        data: {
          title: 'Supplier Management',
          breadcrumb: 'Suppliers',
          requiredRoles: ['Admin', 'Manager'],
        },
      },
      {
        path: 'facture',
        loadChildren: () =>
          import('./modules/facture/facture.module').then(
            (m) => m.FactureModule
          ),
        canActivate: [roleGuard],
        data: {
          title: 'Facture Management',
          breadcrumb: 'Factures',
          requiredRoles: ['Admin', 'Manager', 'User'],
        },
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./modules/reports/reports.module').then(
            (m) => m.ReportsModule
          ),
        canActivate: [roleGuard],
        data: {
          title: 'Reports & Analytics',
          breadcrumb: 'Reports',
          requiredRoles: ['Admin', 'Manager'],
        },
      },
      {
        path: 'logs',
        loadChildren: () =>
          import('./modules/activity-log/activity-log.module').then(
            (m) => m.ActivityLogModule
          ),
        canActivate: [roleGuard],
        data: {
          title: 'Activity Logs',
          breadcrumb: 'Logs',
          requiredRoles: ['Admin', 'Manager'],
        },
      },
      {
        path: 'pos',
        loadChildren: () =>
          import('./modules/pos/pos.module').then((m) => m.POSModule),
        canActivate: [roleGuard],
        data: {
          title: 'Point of Sale',
          breadcrumb: 'POS',
          requiredRoles: ['Admin', 'Manager', 'User', 'Cashier'],
        },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import(
            './modules/notifications/notification-center/notification-center.component'
          ).then((m) => m.NotificationCenterComponent),
        canActivate: [roleGuard],
        data: {
          title: 'Notifications',
          breadcrumb: 'Notifications',
          requiredRoles: ['Admin', 'Manager', 'User', 'Cashier'],
        },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./modules/user-profile/user-profile.component').then(
            (m) => m.UserProfileComponent
          ),
        canActivate: [roleGuard],
        data: {
          title: 'User Profile',
          breadcrumb: 'Profile',
          requiredRoles: ['Admin', 'Manager', 'User', 'Cashier'],
        },
      },
    ],
    title: 'Dashboard - Toko Eniwan POS',
  },

  {
    path: 'sales/:id',
    redirectTo: '/dashboard/pos/transaction/:id',
    pathMatch: 'full',
  },

  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },

  {
    path: '**',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
