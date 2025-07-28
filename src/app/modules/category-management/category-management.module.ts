

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryListComponent } from './category-list/category-list.component';
import { CategoryService } from './services/category.service';
import { CategoryStateService } from './services/category-state.service';

// Routing
import { CategoryManagementRoutingModule } from './category-management.routing.module';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    FormsModule,
    CategoryListComponent,
    
    // Routing
    CategoryManagementRoutingModule
  ],
  providers: [
    CategoryService,
    CategoryStateService
  ],
  exports: [
    CategoryListComponent
  ]
})
export class CategoryManagementModule { }