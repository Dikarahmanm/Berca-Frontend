// src/app/dashboard/dashboard.component.ts
// ✅ SIMPLIFIED: Now just contains BaseLayout with router-outlet

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { BaseLayoutComponent } from '../shared/components/base-layout/base-layout.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    CommonModule,
    RouterModule,
    BaseLayoutComponent
  ],
  template: `
    <app-base-layout
      pageTitle="Dashboard"
      pageSubtitle="Sistem Point of Sale Toko Eniwan"
      [showPageHeader]="false">
      
      <!-- Router outlet for child routes -->
      <router-outlet></router-outlet>
      
    </app-base-layout>
  `
})
export class DashboardComponent {
  constructor() {
    console.log('🚀 Dashboard Shell Component initialized');
  }
}