// src/app/modules/notifications/notifications-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotificationCenterComponent } from './notification-center/notification-center.component';

const routes: Routes = [
  {
    path: '',
    component: NotificationCenterComponent,
    data: { 
      title: 'Pusat Notifikasi',
      breadcrumb: 'Notifikasi'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NotificationsRoutingModule { }