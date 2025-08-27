import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guard/auth.guard';
import { roleGuard } from '../../core/guard/role.guard';
import { FactureListComponent } from './components/facture-list/facture-list.component';
import { FactureFormComponent } from './components/facture-form/facture-form.component';
import { FactureDetailComponent } from './components/facture-detail/facture-detail.component';

const routes: Routes = [
  {
    path: '',
    component: FactureListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager', 'User'] }
  },
  {
    path: 'receive',
    component: FactureFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager'] }
  },
  {
    path: ':id',
    component: FactureDetailComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager', 'User'] }
  },
  {
    path: ':id/verify',
    component: FactureDetailComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager'], mode: 'verify' }
  },
  {
    path: ':id/schedule-payment',
    component: FactureDetailComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager'], mode: 'schedule-payment' }
  },
  {
    path: ':id/receive-payment',
    component: FactureDetailComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager'], mode: 'receive-payment' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FactureRoutingModule { }