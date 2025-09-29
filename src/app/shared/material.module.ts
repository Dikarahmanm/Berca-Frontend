// src/app/shared/material.module.ts - Optimized for Tree Shaking
import { NgModule } from '@angular/core';

// ===== CORE MODULES (Essential & Frequently Used) =====
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule, MatNativeDateModule } from '@angular/material/core';

// ===== FEEDBACK & INTERACTION MODULES =====
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';

// ===== DATA DISPLAY MODULES =====
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';

// ===== LAYOUT & NAVIGATION MODULES =====
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';

// ===== FORM CONTROLS MODULES =====
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

// ===== ADVANCED/SPECIALIZED MODULES (Used in specific components) =====
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';

// NOTE: Removed unused modules for better tree shaking:
// - MatSliderModule, MatAutocompleteModule, MatBottomSheetModule
// - MatButtonToggleModule, MatGridListModule, MatRippleModule, MatTreeModule

const MaterialModules = [
  // Core Modules (Essential)
  MatIconModule,
  MatButtonModule,
  MatCardModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatOptionModule,

  // Feedback & Interaction
  MatSnackBarModule,
  MatProgressSpinnerModule,
  MatProgressBarModule,
  MatDialogModule,
  MatTooltipModule,
  MatMenuModule,

  // Data Display
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatTabsModule,
  MatBadgeModule,

  // Layout & Navigation
  MatToolbarModule,
  MatDividerModule,
  MatListModule,
  MatSidenavModule,

  // Form Controls
  MatDatepickerModule,
  MatNativeDateModule,
  MatCheckboxModule,
  MatRadioModule,
  MatSlideToggleModule,

  // Advanced/Specialized
  MatChipsModule,
  MatExpansionModule,
  MatStepperModule
];

@NgModule({
  imports: MaterialModules,
  exports: MaterialModules
})
export class MaterialModule { }