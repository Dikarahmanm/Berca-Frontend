// src/app/app-routing-module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegisterComponent } from './auth/register/register';
import { AuthGuard } from './core/guard/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent, // standalone component
    canActivate: [AuthGuard],
    children: [
      { 
        path: 'users', 
        loadChildren: () => import('./modules/user-management/user-management.module').then(m => m.UserManagementModule) 
      },
      { 
        path: 'logs',  
        loadChildren: () => import('./modules/activity-log/activity-log.module').then(m => m.ActivityLogModule) 
      },
      // ✅ NEW: Categories route
      { 
        path: 'categories',  
        loadChildren: () => import('./modules/category-management/category-management.module').then(m => m.CategoryManagementModule) 
      },
      { 
        path: '', 
        redirectTo: 'users', 
        pathMatch: 'full' 
      }
    ]
  },
  { path: 'register', component: RegisterComponent },
   { 
    path: 'profile', 
    loadComponent: () => import('./modules/user-profile/user-profile.component').then(m => m.UserProfileComponent),
    canActivate: [AuthGuard]
   },
  // ✅ Optional: Direct routes untuk convenience (redirect ke dashboard)
  { 
    path: 'users', 
    redirectTo: '/dashboard/users', 
    pathMatch: 'full' 
  },
  { 
    path: 'categories', 
    redirectTo: '/dashboard/categories', 
    pathMatch: 'full' 
  },
  { 
    path: 'logs', 
    redirectTo: '/dashboard/logs', 
    pathMatch: 'full' 
  },
  
  // ✅ Wildcard route - must be last
  { 
    path: '**', 
    redirectTo: '/dashboard', 
    pathMatch: 'full' 
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }