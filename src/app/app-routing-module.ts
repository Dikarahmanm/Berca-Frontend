// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { HomeComponent } from './pages/home/home.component';
import { UserProfileComponent } from './pages/user-profiles/user-profile.component';
import { AuthGuard } from './core/guard/auth.guard';

const routes: Routes = [
  // Redirect root ke login
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // Auth routes (tidak perlu guard)
  { path: 'login', component: LoginComponent },
  
  // Protected routes - setelah login redirect ke home
  { 
    path: 'home', 
    component: HomeComponent,
    canActivate: [AuthGuard],
    data: { title: 'Dashboard POS Eniwan' }
  },
  
  // User Profile dengan detail lengkap
  { 
    path: 'profile', 
    component: UserProfileComponent,
    canActivate: [AuthGuard],
    data: { title: 'Profil Pengguna' }
  },
  
  // Modul User Management (lazy loading)
  {
    path: 'users',
    loadChildren: () => import('./modules/user-management/user-management.module').then(m => m.UserManagementModule),
    canActivate: [AuthGuard],
    data: { title: 'Manajemen Pengguna' }
  },
  
  // Modul Activity Log (lazy loading)
  {
    path: 'logs',
    loadChildren: () => import('./modules/activity-log/activity-log.module').then(m => m.ActivityLogModule),
    canActivate: [AuthGuard],
    data: { title: 'Log Aktivitas' }
  },
  
  // Modul POS/Kasir (lazy loading)
  // {
  //   path: 'pos',
  //   loadChildren: () => import('./modules/pos/pos.module').then(m => m.PosModule),
  //   canActivate: [AuthGuard],
  //   data: { title: 'Point of Sale' }
  // },
  
  // Modul Inventori (lazy loading)
  {
    path: 'inventory',
    loadChildren: () => import('./modules/inventory/inventory.module').then(m => m.InventoryModule),
    canActivate: [AuthGuard],
    data: { title: 'Manajemen Inventori' }
  },
  
  // Modul Laporan (lazy loading)
  // {
  //   path: 'reports',
  //   loadChildren: () => import('./modules/reports/reports.module').then(m => m.ReportsModule),
  //   canActivate: [AuthGuard],
  //   data: { title: 'Laporan' }
  // },
  
  // Fallback untuk route yang tidak ditemukan
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, // Set true untuk debugging routing
    scrollPositionRestoration: 'top',
    preloadingStrategy: 'PreloadAllModules' // Preload lazy modules
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }