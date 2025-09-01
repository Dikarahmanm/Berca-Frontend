// src/app/modules/inventory-transfer/inventory-transfer-routing.module.ts
// Routing Module for Inventory Transfer Module

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TransferListComponent } from './components/transfer-list/transfer-list.component';
import { CreateTransferComponent } from './components/create-transfer/create-transfer.component';
import { TransferDetailComponent } from './components/transfer-detail/transfer-detail.component';
import { TransferApprovalComponent } from './components/transfer-approval/transfer-approval.component';
import { BranchStockComparisonComponent } from './components/branch-stock-comparison/branch-stock-comparison.component';
import { TransferHistoryComponent } from './components/transfer-history/transfer-history.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    component: TransferListComponent,
    data: { breadcrumb: 'Transfer List' }
  },
  {
    path: 'create',
    component: CreateTransferComponent,
    data: { breadcrumb: 'Create Transfer' }
  },
  {
    path: 'detail/:id',
    component: TransferDetailComponent,
    data: { breadcrumb: 'Transfer Details' }
  },
  {
    path: 'approval',
    component: TransferApprovalComponent,
    data: { breadcrumb: 'Pending Approvals' }
  },
  {
    path: 'comparison',
    component: BranchStockComparisonComponent,
    data: { breadcrumb: 'Branch Stock Comparison' }
  },
  {
    path: 'history',
    component: TransferHistoryComponent,
    data: { breadcrumb: 'Transfer History' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventoryTransferRoutingModule { }