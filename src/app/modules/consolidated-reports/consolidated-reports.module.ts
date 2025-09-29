// src/app/modules/consolidated-reports/consolidated-reports.module.ts
// Consolidated Reports Module for multi-branch reporting and analytics
// Phase 3: Multi-Branch Features Implementation

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Shared Material Module (optimized for tree shaking)
import { MaterialModule } from '../../shared/material.module';

import { ConsolidatedReportsRoutingModule } from './consolidated-reports-routing.module';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConsolidatedReportsRoutingModule,
    
    // Material Modules - Optimized with shared module
    MaterialModule
  ],
  providers: [
    // Services will be provided at component level or imported from core
  ]
})
export class ConsolidatedReportsModule { }