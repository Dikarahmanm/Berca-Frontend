// ===== POS ROUTING MODULE UPDATE =====
// src/app/modules/pos/pos-routing.module.ts - CORRECTED paths

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guard/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pos/pos.component').then(m => m.POSComponent),
    canActivate: [authGuard],
    data: { 
      title: 'Point of Sale',
      requiredPermission: 'POS.Write'
    }
  },
  {
    path: 'transaction/:id',
    loadComponent: () => import('./transaction-detail/transaction-detail.component').then(m => m.TransactionDetailComponent),
    canActivate: [authGuard],
    data: { 
      title: 'Detail Transaksi',
      requiredPermission: 'POS.Read'
    }
  },
  {
    path: 'receipt/:transactionId',
    loadComponent: () => import('./pos/receipt-preview/receipt-preview.component').then(m => m.ReceiptPreviewComponent),
    canActivate: [authGuard],
    data: { 
      title: 'Receipt Preview',
      requiredPermission: 'POS.Read'
    }
  },
  {
    path: 'receipt/digital/:saleNumber',
    loadComponent: () => import('./pos/receipt-preview/receipt-preview.component').then(m => m.ReceiptPreviewComponent),
    data: { 
      title: 'Digital Receipt',
      isDigitalReceipt: true
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class POSRoutingModule { }