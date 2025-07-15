import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthRoutingModule } from './auth-routing.module';

import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    RouterModule,
    RegisterComponent,
    LoginComponent,
    AuthRoutingModule // ✅ tambahkan ini
  ]
})
export class AuthModule {}
