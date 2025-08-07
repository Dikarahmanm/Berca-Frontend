// src/app/modules/reports/reports.module.ts
// ✅ Reports Module - Modular Structure

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';

// NGX Charts for visualizations
import { NgxChartsModule } from '@swimlane/ngx-charts';

// Reports routing
import { ReportsRoutingModule } from './reports-routing.module';

// Services (provided in module level)
import { ReportsService } from '../../core/services/reports.service';

@NgModule({
  declarations: [
    // ✅ Note: ReportsDashboardComponent is standalone, no declarations needed here
  ],
  imports: [
    // Core Angular modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ReportsRoutingModule,
    
    // Angular Material modules needed for reports
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatCheckboxModule,
    
    // NGX Charts for visualizations
    NgxChartsModule
  ],
  providers: [
    // ✅ Reports service provided at module level
    ReportsService
  ]
})
export class ReportsModule { }