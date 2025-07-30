// src/app/modules/pos/pos.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Standalone Components (no longer need to import in NgModule)
// These will be imported directly in routing or parent components

// Services (provide at root level for better tree-shaking)
import { POSService } from '../../core/services/pos.service';
import { BarcodeService } from '../../core/services/barcode.service';
import { ReceiptService } from '../../core/services/receipt.service';

// Routing
import { POSRoutingModule } from './pos-routing.module';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    POSRoutingModule
  ],
  providers: [
    // Services that are not provided at root level
    POSService,
    BarcodeService,
    ReceiptService
  ]
})
export class POSModule { }