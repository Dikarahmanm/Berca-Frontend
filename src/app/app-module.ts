// src/app/app.module.ts
// ✅ FIXED: Bootstrap configuration for standalone AppComponent

import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing-module';

// Core services
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { LayoutService } from './shared/services/layout.service';

// HTTP Interceptors
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
//import { ErrorInterceptor } from './core/interceptors/error.interceptor';

// Guards
import { AuthGuard } from './core/guard/auth.guard';
import { RoleGuard } from './core/guard/role.guard';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserAnimationsModule,
      HttpClientModule,
      AppRoutingModule
    ),
    
    // Core Services
    AuthService,
    NotificationService,
    LayoutService,
    
    // Guards
    AuthGuard,
    RoleGuard,
    
    // HTTP Interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    // {
    //   provide: HTTP_INTERCEPTORS,
    //   useClass: ErrorInterceptor,
    //   multi: true
    // }
  ]
});