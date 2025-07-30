// src/app/modules/notifications/notifications.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Material Module
import { MaterialModule } from '../../shared/material.module';

// Components
import { NotificationCenterComponent } from './notification-center/notification-center.component';
import { NotificationDropdownComponent } from './notification-dropdown/notification-dropdown.component';
import { NotificationItemComponent } from './notification-item/notification-item.component';

// Services
import { NotificationService } from '../../core/services/notification.service';

// Routing
import { NotificationsRoutingModule } from './notifications-routing.module';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NotificationsRoutingModule,
    MaterialModule,
    NotificationCenterComponent,
    NotificationDropdownComponent,
    NotificationItemComponent
  ],
  providers: [
    NotificationService
  ],
  exports: [
    NotificationDropdownComponent // Export untuk digunakan di topbar
  ]
})
export class NotificationsModule { }