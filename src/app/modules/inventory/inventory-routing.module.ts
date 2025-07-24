// --- src/app/modules/inventory/inventory-routing.module.ts ---
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventoryDashboardComponent } from './inventory-dashboard/inventory-dashboard.component';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductFormComponent } from './product-form/product-form.component';
import { CategoryManagementComponent } from './category-management/category-management.component';
import { StockAdjustmentComponent } from './stock-adjustment/stock-adjustment.component';
import { LowStockAlertComponent } from './low-stock-alert/low-stock-alert.component';

const routes: Routes = [
  {
    path: '',
    component: InventoryDashboardComponent,
    data: { title: 'Dashboard Inventori' }
  },
  {
    path: 'products',
    component: ProductListComponent,
    data: { title: 'Daftar Produk' }
  },
  {
    path: 'products/add',
    component: ProductFormComponent,
    data: { title: 'Tambah Produk' }
  },
  {
    path: 'products/edit/:id',
    component: ProductFormComponent,
    data: { title: 'Edit Produk' }
  },
  {
    path: 'categories',
    component: CategoryManagementComponent,
    data: { title: 'Manajemen Kategori' }
  },
  {
    path: 'stock-adjustment',
    component: StockAdjustmentComponent,
    data: { title: 'Penyesuaian Stok' }
  },
  {
    path: 'low-stock',
    component: LowStockAlertComponent,
    data: { title: 'Stok Menipis' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventoryRoutingModule { }