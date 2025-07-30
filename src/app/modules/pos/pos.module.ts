// src/app/modules/pos/pos.module.ts - CORRECTED for Backend Integration
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material imports for POS functionality
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';

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
    
    // ✅ FIXED: All necessary Angular Material modules for POS
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatGridListModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatRadioModule
  ],
  providers: [
    // ✅ FIXED: Backend-integrated services
    POSService,
    BarcodeService,
    ReceiptService
  ]
})
export class POSModule { }