import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app-routes';

import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { LayoutService } from './shared/services/layout.service';

import { appHttpInterceptor } from './core/interceptors/app-http.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(withInterceptors([appHttpInterceptor])),
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    AuthService,
    NotificationService,
    LayoutService,
  ],
};
