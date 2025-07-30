// ===== POS ROUTING MODULE UPDATE =====
// src/app/modules/pos/pos-routing.module.ts - CORRECTED paths

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guard/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pos/pos.component').then(m => m.POSComponent),
    canActivate: [AuthGuard],
    data: { 
      title: 'Point of Sale',
      requiredPermission: 'POS.Write'
    }
  },
  {
    path: 'receipt/:transactionId',
    loadComponent: () => import('./pos/receipt-preview/receipt-preview.component').then(m => m.ReceiptPreviewComponent),
    canActivate: [AuthGuard],
    data: { 
      title: 'Receipt Preview',
      requiredPermission: 'POS.Read'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class POSRoutingModule { }