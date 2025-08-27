import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Routing
import { SupplierRoutingModule } from './supplier-routing.module';

// Components
import { SupplierListComponent } from './components/supplier-list/supplier-list.component';
import { SupplierFormComponent } from './components/supplier-form/supplier-form.component';
import { SupplierDetailComponent } from './components/supplier-detail/supplier-detail.component';

// Services
import { SupplierService } from './services/supplier.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    SupplierRoutingModule,
    
    // Standalone components
    SupplierListComponent,
    SupplierFormComponent,
    SupplierDetailComponent
  ],
  providers: [
    SupplierService
  ],
  exports: [
    SupplierListComponent,
    SupplierFormComponent,
    SupplierDetailComponent
  ]
})
export class SupplierModule { }