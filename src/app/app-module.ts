import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

// Application Components
import { App } from './app';
import { AppRoutingModule } from './app-routing-module';

// Shared Module
import { SharedModule } from './shared/shared.module';

// Core Services
import { AuthService } from './core/services/auth.service';
import { UserProfileService } from './core/services/user-profile.service';
import { POSService } from './core/services/pos.service';
import { BarcodeService } from './core/services/barcode.service';
import { ReceiptService } from './core/services/receipt.service';
import { NotificationService } from './core/services/notification.service';

// Guards
import { AuthGuard } from './core/guard/auth.guard';

// ✅ UNCOMMENT: Import AuthInterceptor
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

@NgModule({
  declarations: [
    App
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    SharedModule
  ],
  providers: [
    // Core Services
    AuthService,
    UserProfileService,
    POSService,
    BarcodeService,
    ReceiptService,
    NotificationService,
    
    // Guards
    AuthGuard,
    
    // ✅ UNCOMMENT: Enable AuthInterceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [App]
})
export class AppModule { }