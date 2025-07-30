// src/app/core/interceptors/http.interceptor.ts - FIXED for Cookie-Based Auth
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { environment } from '../../../environment/environment';

@Injectable()
export class HttpInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthService,
    private errorHandler: ErrorHandlerService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add authentication (cookies) and common headers
    const finalRequest = this.addCommonHeaders(request);

    return next.handle(finalRequest).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, finalRequest, next))
    );
  }

  /**
   * Add authentication and common headers to request
   * For cookie-based auth, we don't need Authorization header
   */
  private addCommonHeaders(request: HttpRequest<any>): HttpRequest<any> {
    const headers: { [key: string]: string } = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Add API version header
    if (environment.apiVersion) {
      headers['X-API-Version'] = environment.apiVersion;
    }

    // Add correlation ID for debugging
    headers['X-Correlation-ID'] = this.generateCorrelationId();

    // Don't override content-type for file uploads
    if (!(request.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // For cookie-based auth, always include credentials
    const isApiRequest = request.url.includes('/api/') || 
                        request.url.includes('/auth/') || 
                        request.url.includes('/admin/');

    return request.clone({
      setHeaders: headers,
      withCredentials: isApiRequest // Include cookies for API requests
    });
  }

  /**
   * Handle HTTP errors
   */
  private handleError(
    error: HttpErrorResponse, 
    request: HttpRequest<any>, 
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    
    // Handle authentication errors
    if (error.status === 401) {
      return this.handle401Error(request, next);
    }

    // Handle other errors using error handler service
    return this.errorHandler.handleHttpError(error);
  }

  /**
   * Handle 401 Unauthorized errors for cookie-based auth
   */
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('🔒 401 Unauthorized - Cookie-based auth failed');
    
    // If we're already refreshing, wait for the new auth status
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => next.handle(request))
      );
    }

    // Try to refresh auth status (test cookies)
    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.authService.refreshToken().pipe(
      switchMap((result: string) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(result);
        
        console.log('✅ Cookie auth refreshed, retrying request');
        // Retry the original request
        return next.handle(request);
      }),
      catchError((refreshError) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(null);
        
        console.log('❌ Cookie refresh failed, redirecting to login');
        // Auth refresh failed, redirect to login
        this.authService.logout().subscribe();
        this.router.navigate(['/auth/login']);
        
        return throwError(() => refreshError);
      })
    );
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
}