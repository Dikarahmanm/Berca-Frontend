// ===== INVENTORY ROUTING MODULE =====
// src/app/modules/inventory/inventory-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../../core/guard/role.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/inventory-list/inventory-list.component').then(c => c.InventoryListComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Inventory Management',
      breadcrumb: 'Inventory',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  },
  {
    path: 'add',
    loadComponent: () => import('./components/product-form/product-form.component').then(c => c.ProductFormComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Add Product',
      breadcrumb: 'Add Product',
      requiredRoles: ['Admin', 'Manager']
    }
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./components/product-form/product-form.component').then(c => c.ProductFormComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Edit Product',
      breadcrumb: 'Edit Product',
      requiredRoles: ['Admin', 'Manager']
    }
  },
  {
    path: 'stock/:id',
    loadComponent: () => import('./components/stock-mutation/stock-mutation.component').then(c => c.StockMutationComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Stock Management',
      breadcrumb: 'Stock',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
}) 
export class InventoryRoutingModule { }
