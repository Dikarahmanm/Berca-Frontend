// ===== INVENTORY ROUTING MODULE =====
// src/app/modules/inventory/inventory-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../../core/guard/role.guard';
import { InventoryListComponent } from './components/inventory-list/inventory-list.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { StockMutationComponent } from './components/stock-mutation/stock-mutation.component';

const routes: Routes = [
  {
    path: '',
    component: InventoryListComponent,
    canActivate: [RoleGuard],
    data: {
      title: 'Inventory Management',
      breadcrumb: 'Inventory',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  },
  {
    path: 'add',
    component: ProductFormComponent,
    canActivate: [RoleGuard],
    data: {
      title: 'Add Product',
      breadcrumb: 'Add Product',
      requiredRoles: ['Admin', 'Manager']
    }
  },
  {
    path: 'edit/:id',
    component: ProductFormComponent,
    canActivate: [RoleGuard],
    data: {
      title: 'Edit Product',
      breadcrumb: 'Edit Product',
      requiredRoles: ['Admin', 'Manager']
    }
  },
  {
    path: 'stock/:id',
    component: StockMutationComponent,
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
