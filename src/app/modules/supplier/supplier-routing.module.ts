import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guard/auth.guard';
import { roleGuard } from '../../core/guard/role.guard';
import { SupplierDashboardComponent } from './components/supplier-dashboard/supplier-dashboard.component';
import { SupplierListComponent } from './components/supplier-list/supplier-list.component';
import { SupplierFormComponent } from './components/supplier-form/supplier-form.component';
import { SupplierDetailComponent } from './components/supplier-detail/supplier-detail.component';

const routes: Routes = [
  {
    path: '',
    component: SupplierDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager'] }
  },
  {
    path: 'list',
    component: SupplierListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager'] }
  },
  {
    path: 'create',
    component: SupplierFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager'] }
  },
  {
    path: 'edit/:id',
    component: SupplierFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager'] }
  },
  {
    path: ':id',
    component: SupplierDetailComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredRoles: ['Admin', 'Manager'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SupplierRoutingModule { }