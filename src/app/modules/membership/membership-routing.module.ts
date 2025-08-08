// src/app/modules/membership/membership-routing.module.ts
// ✅ Membership Routing - Lazy Loaded Routes

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../../core/guard/role.guard';

const routes: Routes = [
  {
    path: '',
  loadComponent: () => import('./components/membership-list/membership-list.component').then(c => c.MembershipListComponent),
  canActivate: [RoleGuard],
    data: {
      title: 'Membership Management',
      breadcrumb: 'Members',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  },
  {
    path: 'create',
    loadComponent: () => import('./components/membership-form/membership-form.component').then(c => c.MembershipFormComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Add New Member',
      breadcrumb: 'Add Member',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./components/membership-form/membership-form.component').then(c => c.MembershipFormComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Edit Member',
      breadcrumb: 'Edit Member',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  },
  {
    path: 'view/:id',
    loadComponent: () => import('./components/membership-form/membership-form.component').then(c => c.MembershipFormComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Member Details',
      breadcrumb: 'View Member',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  },
  {
    path: 'points/:id',
    loadComponent: () => import('./components/member-points/member-points.component').then(c => c.MemberPointsComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Manage Points',
      breadcrumb: 'Points Management',
      requiredRoles: ['Admin', 'Manager', 'User']
    }
  },
  {
    path: 'analytics',
    loadComponent: () => import('./components/membership-analytics/membership-analytics.component').then(c => c.MembershipAnalyticsComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Membership Analytics',
      breadcrumb: 'Analytics',
      requiredRoles: ['Admin', 'Manager']
    }
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MembershipRoutingModule { }