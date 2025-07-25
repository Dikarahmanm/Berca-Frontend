import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guard/auth.guard';

const routes: Routes = [
  // Redirect root to dashboard
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Authentication routes (no guard needed)
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.RegisterComponent) },

  // Protected routes (require authentication)
  { 
    path: 'dashboard', 
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },

  // ✅ ADD NEW ROUTE - User Profile
  { 
    path: 'profile', 
    loadComponent: () => import('./modules/user-profile/user-profile.component').then(m => m.UserProfileComponent),
    canActivate: [AuthGuard],
    data: { title: 'Profil Pengguna', breadcrumb: 'Profile' }
  },

  // User Management Module
  {
    path: 'dashboard/users',
    loadComponent: () => import('./modules/user-management/user-list/user-list.component').then(m => m.UserListComponent),
    canActivate: [AuthGuard]
  },

  // Activity Log Module  
  {
    path: 'dashboard/activity-log',
    loadComponent: () => import('./modules/activity-log/log-viewer/log-viewer.component').then(m => m.LogViewerComponent),
    canActivate: [AuthGuard]
  },

  // Future modules (coming in next sprints)
  // {
  //   path: 'dashboard/inventory',
  //   loadComponent: () => import('./modules/inventory/inventory.component').then(m => m.InventoryComponent),
  //   canActivate: [AuthGuard]
  // },
  // {
  //   path: 'dashboard/pos',
  //   loadComponent: () => import('./modules/pos/pos.component').then(m => m.POSComponent),
  //   canActivate: [AuthGuard]
  // },
  // {
  //   path: 'dashboard/reports',
  //   loadComponent: () => import('./modules/reports/reports.component').then(m => m.ReportsComponent),
  //   canActivate: [AuthGuard]
  // },

  // Catch-all route (redirect to dashboard)
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, // Set to true for debugging
    scrollPositionRestoration: 'top',
    preloadingStrategy: 'NoPreloading' // Lazy load only when needed
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }