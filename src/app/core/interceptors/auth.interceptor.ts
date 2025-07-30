import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('🔐 Auth Interceptor - Original Request:', {
      url: req.url,
      method: req.method,
      headers: req.headers.keys(),
      withCredentials: req.withCredentials
    });
    
    // ✅ CRITICAL FIX: Add withCredentials untuk SEMUA request ke backend
    const authReq = req.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      withCredentials: true  // ✅ ALWAYS include cookies
    });

    console.log('🔐 Modified Request:', {
      url: authReq.url,
      method: authReq.method,
      headers: authReq.headers.keys(),
      withCredentials: authReq.withCredentials
    });

    return next.handle(authReq).pipe(
      tap(() => {
        console.log('✅ Request successful:', authReq.url);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('🚨 HTTP Error in Auth Interceptor:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });

        // Handle different error types
        if (error.status === 401) {
          console.log('🔓 401 Unauthorized - Session expired or invalid');
          this.handleAuthenticationError();
        } else if (error.status === 405 && error.url?.includes('/auth/login')) {
          console.log('🔓 405 Method Not Allowed - Auth redirect detected');
          this.handleAuthenticationError();
        } else if (error.status === 403) {
          console.log('🚫 403 Forbidden - Insufficient permissions');
          this.showError('Anda tidak memiliki izin untuk mengakses fitur ini.');
        } else if (error.status === 0) {
          console.log('🌐 Network Error - Server unreachable');
          this.showError('Tidak dapat terhubung ke server. Periksa koneksi internet.');
        }

        return throwError(() => error);
      })
    );
  }

  private handleAuthenticationError(): void {
    // Clear any stored auth data
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('isAuthenticated');
    
    // Show error message
    this.showError('Sesi Anda telah berakhir. Silakan login kembali.');
    
    // Redirect to login after a short delay
    setTimeout(() => {
      this.router.navigate(['/auth/login']);
    }, 1000);
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 5000,
      panelClass: ['snackbar-error'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}