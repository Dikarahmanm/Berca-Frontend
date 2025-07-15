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
    component: DashboardComponent, // standalone :contentReference[oaicite:1]{index=1}
    canActivate: [AuthGuard],
    children: [
      { path: 'users', loadChildren: () => import('./modules/user-management/user-management.module').then(m => m.UserManagementModule) },
      { path: 'logs',  loadChildren: () => import('./modules/activity-log/activity-log.module').then(m => m.ActivityLogModule) },
      { path: '', redirectTo: 'users', pathMatch: 'full' }
    ]
  },
  { path: 'register', component: RegisterComponent },
];



@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }