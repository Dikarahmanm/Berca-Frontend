import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Material Design Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { InventoryRoutingModule } from './inventory-routing.module';
import { InventoryDashboardComponent } from './inventory-dashboard/inventory-dashboard.component';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductFormComponent } from './product-form/product-form.component';
import { CategoryManagementComponent } from './category-management/category-management.component';
import { StockAdjustmentComponent } from './stock-adjustment/stock-adjustment.component';
import { LowStockAlertComponent } from './low-stock-alert/low-stock-alert.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    InventoryRoutingModule,
    
    // Material Design Modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    //MatInputModule,
    //MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatCheckboxModule,
    //MatDatepickerModule,
    MatNativeDateModule,
    MatGridListModule,
    MatDividerModule,
    //MatTooltipModule,
    
    // Standalone Components
    InventoryDashboardComponent,
    ProductListComponent,
    ProductFormComponent,
    CategoryManagementComponent,
    StockAdjustmentComponent,
    LowStockAlertComponent
  ],
  exports: [
    // Export components jika diperlukan oleh module lain
    InventoryDashboardComponent,
    ProductListComponent,
    ProductFormComponent,
    CategoryManagementComponent,
    StockAdjustmentComponent,
    LowStockAlertComponent
  ]
})
export class InventoryModule { }