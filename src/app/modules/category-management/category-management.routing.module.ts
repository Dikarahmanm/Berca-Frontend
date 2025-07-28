// src/app/modules/category-management/category-management-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CategoryListComponent } from './category-list/category-list.component';

// Guards (if you have them)
// import { AuthGuard } from '../../core/guards/auth.guard';
// import { RoleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: CategoryListComponent,
    data: {
      title: 'Category Management',
      breadcrumb: 'Categories',
      description: 'Manage product categories for Toko Eniwan',
      requiredRoles: ['Admin', 'Manager'], // For role-based access
    }
    // canActivate: [AuthGuard, RoleGuard] // Uncomment if you have guards
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full'
  },
  // Future routes for category details, analytics, etc.
  // {
  //   path: ':id',
  //   component: CategoryDetailComponent,
  //   data: {
  //     title: 'Category Details',
  //     breadcrumb: 'Details'
  //   }
  // },
  // {
  //   path: ':id/products',
  //   component: CategoryProductsComponent,
  //   data: {
  //     title: 'Category Products',
  //     breadcrumb: 'Products'
  //   }
  // },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CategoryManagementRoutingModule { }