// src/app/core/interceptors/http.interceptor.ts

import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';
import { environment } from '../../../environment/environment';

@Injectable()
export class AppHttpInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const finalRequest = this.addCommonHeaders(request);
    return next.handle(finalRequest).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, finalRequest, next))
    );
  }

  private addCommonHeaders(request: HttpRequest<any>): HttpRequest<any> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (environment.apiVersion) {
      headers['X-API-Version'] = environment.apiVersion;
    }

    headers['X-Correlation-ID'] = this.generateCorrelationId();

    if (!(request.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const isApiRequest = ['/api/', '/auth/', '/admin/'].some(path => request.url.includes(path));

    return request.clone({
      setHeaders: headers,
      withCredentials: isApiRequest
    });
  }

  private handleError(
    error: HttpErrorResponse,
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    console.error('🚨 HTTP Error:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      timestamp: new Date().toISOString()
    });

    if (error.status === 401) {
      return this.handle401Error(request, next);
    }

    switch (error.status) {
      case 403:
        console.warn('🚫 Forbidden access');
        break;
      case 404:
        console.warn('🔍 Not found:', request.url);
        break;
      case 500:
        console.error('💥 Server error:', error.error?.message);
        break;
      case 0:
        console.error('🌐 Network issue');
        break;
    }

    return throwError(() => error);
  }

  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    console.log('🔒 401 Unauthorized');

    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => next.handle(request))
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.authService.refreshToken().pipe(
      switchMap((result: string) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(result);
        console.log('✅ Token refreshed');
        return next.handle(request);
      }),
      catchError(refreshError => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(null);
        console.log('❌ Refresh failed, redirecting to login');
        this.authService.logout().subscribe();
        this.router.navigate(['/auth/login']);
        return throwError(() => refreshError);
      })
    );
  }

  private generateCorrelationId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
