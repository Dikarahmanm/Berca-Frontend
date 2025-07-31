import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app-routes'; // ✅ FIXED: Import from app-routes.ts

// Core services
import { AuthService } from './app/core/services/auth.service';
import { NotificationService } from './app/core/services/notification.service';
import { LayoutService } from './app/shared/services/layout.service';

// HTTP Interceptors
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';

// Guards
import { AuthGuard } from './app/core/guard/auth.guard';
import { RoleGuard } from './app/core/guard/role.guard';

bootstrapApplication(AppComponent, {
  providers: [
    // ✅ FIXED: Import modules and configure router
    importProvidersFrom(
      BrowserAnimationsModule,
      HttpClientModule,
      RouterModule.forRoot(routes, {
        enableTracing: false,
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
        scrollOffset: [0, 64]
      })
    ),
    
    // ✅ SERVICES: Core services
    AuthService,
    NotificationService,
    LayoutService,
    
    // ✅ GUARDS: Route guards
    AuthGuard,
    RoleGuard,
    
    // ✅ INTERCEPTORS: HTTP interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
}).catch(err => console.error('Bootstrap error:', err));