import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    DashboardComponent,
    DashboardRoutingModule
  ]
})
export class DashboardModule {}
