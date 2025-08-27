import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Routing
import { FactureRoutingModule } from './facture-routing.module';

// Components
import { FactureListComponent } from './components/facture-list/facture-list.component';
import { FactureFormComponent } from './components/facture-form/facture-form.component';
import { FactureDetailComponent } from './components/facture-detail/facture-detail.component';

// Services
import { FactureService } from './services/facture.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    FactureRoutingModule,
    
    // Standalone components
    FactureListComponent,
    FactureFormComponent,
    FactureDetailComponent
  ],
  providers: [
    FactureService
  ],
  exports: [
    FactureListComponent,
    FactureFormComponent,
    FactureDetailComponent
  ]
})
export class FactureModule { }