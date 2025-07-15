import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      {
        path: 'users',
        loadChildren: () =>
          import('../modules/user-management/user-management.module').then(m => m.UserManagementModule),
      },
      {
        path: 'logs',
        loadChildren: () =>
          import('../modules/activity-log/activity-log.module').then(m => m.ActivityLogModule),
      },
      {
        path: '',
        redirectTo: 'users',  // ✅ Default redirect ke users
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}