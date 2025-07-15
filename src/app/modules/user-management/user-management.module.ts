import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListComponent } from './user-list/user-list.component';
import { UserManagementRoutingModule } from './user-management-routing.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    UserManagementRoutingModule,
    UserListComponent  // ✅ Import standalone component
  ]
})
export class UserManagementModule { }