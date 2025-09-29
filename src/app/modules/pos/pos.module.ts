// src/app/modules/pos/pos.module.ts - CORRECTED for Backend Integration
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Shared Material Module (optimized for tree shaking)
import { MaterialModule } from '../../shared/material.module';

// POS Routing
import { POSRoutingModule } from './pos-routing.module';

// ✅ FIXED: Services properly imported - backend integrated versions
import { POSService } from '../../core/services/pos.service';
import { BarcodeService } from '../../core/services/barcode.service';
import { ReceiptService } from '../../core/services/receipt.service';

@NgModule({
  declarations: [
    // ✅ Note: All POS components are standalone, no declarations needed
  ],
  imports: [
    // Core Angular modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    POSRoutingModule,
    
    // ✅ OPTIMIZED: Use shared Material module for better tree shaking
    MaterialModule
  ],
  providers: [
    // ✅ FIXED: Backend-integrated services
    POSService,
    BarcodeService,
    ReceiptService
  ]
})
export class POSModule { }