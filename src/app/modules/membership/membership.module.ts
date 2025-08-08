// src/app/modules/membership/membership.module.ts
// ✅ Membership Module - Complete Module Structure

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';

// NGX Charts for member analytics
import { NgxChartsModule } from '@swimlane/ngx-charts';

// Membership routing
import { MembershipRoutingModule } from './membership-routing.module';

// Services
import { MembershipService } from './services/membership.service';

@NgModule({
  declarations: [
    // ✅ Note: All membership components are standalone, no declarations needed
  ],
  imports: [
    // Core Angular modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MembershipRoutingModule,
    
    // Angular Material modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatMenuModule,
    MatBadgeModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatCheckboxModule,
    MatTabsModule,
    MatExpansionModule,
    
    // Charts for member analytics
    NgxChartsModule
  ],
  providers: [
    // ✅ Membership services
    MembershipService
  ]
})
export class MembershipModule { }