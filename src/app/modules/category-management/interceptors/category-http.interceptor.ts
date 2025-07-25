// src/app/modules/category-management/interceptors/category-http.interceptor.ts

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class CategoryHttpInterceptor implements HttpInterceptor {
  
  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add withCredentials untuk cookie authentication
    const authReq = req.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true // Important untuk cookie auth
    });

    return next.handle(authReq).pipe(
      // Retry failed requests once (except for specific cases)
      retry({
        count: 1,
        delay: (error: HttpErrorResponse) => {
          // Don't retry on certain status codes
          if ([400, 401, 403, 404, 409, 422].includes(error.status)) {
            return throwError(() => error);
          }
          return throwError(() => error);
        }
      }),
      
      catchError((error: HttpErrorResponse) => {
        // Handle specific HTTP errors
        switch (error.status) {
          case 401:
            // Unauthorized - redirect to login
            console.warn('Unauthorized access - redirecting to login');
            this.router.navigate(['/login']);
            break;
            
          case 403:
            // Forbidden - show permission error
            console.warn('Forbidden access - insufficient permissions');
            break;
            
          case 404:
            // Not found
            console.warn('Resource not found:', req.url);
            break;
            
          case 409:
            // Conflict (e.g., duplicate category name)
            console.warn('Conflict error:', error.error?.message);
            break;
            
          case 500:
            // Server error
            console.error('Server error:', error.error?.message);
            break;
            
          default:
            console.error('Unexpected error:', error);
        }
        
        return throwError(() => error);
      })
    );
  }
}