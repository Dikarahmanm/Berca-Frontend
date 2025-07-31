// Test untuk inventory module loading
// src/app/modules/inventory/test-inventory.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        loadComponent: () => import('./components/inventory-list/inventory-list.component').then(c => c.InventoryListComponent)
      }
    ])
  ]
})
export class TestInventoryModule { }
