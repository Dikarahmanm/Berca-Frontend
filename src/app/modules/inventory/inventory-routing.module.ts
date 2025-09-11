// ===== INVENTORY ROUTING MODULE =====
// src/app/modules/inventory/inventory-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { roleGuard } from '../../core/guard/role.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/inventory-list/inventory-list.component').then(c => c.InventoryListComponent),
    canActivate: [roleGuard],
    data: {
      title: 'Inventory Management',
      breadcrumb: 'Inventory',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  },
  {
    path: 'add',
    loadComponent: () => import('./components/product-form/product-form.component').then(c => c.ProductFormComponent),
    canActivate: [roleGuard],
    data: {
      title: 'Add Product',
      breadcrumb: 'Add Product',
      requiredRoles: ['Admin', 'Manager']
    }
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./components/product-form/product-form.component').then(c => c.ProductFormComponent),
    canActivate: [roleGuard],
    data: {
      title: 'Edit Product',
      breadcrumb: 'Edit Product',
      requiredRoles: ['Admin', 'Manager']
    }
  },
  {
    path: 'stock/:id',
    loadComponent: () => import('./components/stock-mutation/stock-mutation.component').then(c => c.StockMutationComponent),
    canActivate: [roleGuard],
    data: {
      title: 'Stock Management',
      breadcrumb: 'Stock',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  },
  {
    path: 'smart-inventory',
    loadComponent: () => import('./components/smart-inventory/smart-inventory.component').then(c => c.SmartInventoryComponent),
    canActivate: [roleGuard],
    data: {
      title: 'Smart Inventory Management',
      breadcrumb: 'Smart Inventory',
      requiredRoles: ['Admin', 'Manager']
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
}) 
export class InventoryRoutingModule { }
