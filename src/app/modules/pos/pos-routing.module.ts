// src/app/modules/pos/pos-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pos/pos.component').then(m => m.POSComponent)
  },
  {
    path: 'receipt/:transactionId',
    loadComponent: () => import('./pos/receipt-preview/receipt-preview.component').then(m => m.ReceiptPreviewComponent)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class POSRoutingModule { }