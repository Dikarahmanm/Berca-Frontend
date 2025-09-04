import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environment/environment';
import { catchError, filter, switchMap, take, throwError, BehaviorSubject } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const appHttpInterceptor: HttpInterceptorFn = (req, next) => {
  // Avoid circular dependency - don't inject AuthService for auth-related endpoints
  const isAuthEndpoint = req.url.includes('/auth/') || req.url.includes('/auth/me');
  
  const authService = !isAuthEndpoint ? inject(AuthService) : null;
  const snackBar = inject(MatSnackBar);

  const finalReq = addCommonHeaders(req);

  return next(finalReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Skip auth handling for auth endpoints to avoid circular dependency
      if (isAuthEndpoint) {
        return throwError(() => error);
      }
      
      if (error.status === 401 && authService) {
        if (isRefreshing) {
          return refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(() => next(finalReq))
          );
        }

        isRefreshing = true;
        refreshTokenSubject.next(null);

        return authService.refreshToken().pipe(
          switchMap((token: string) => {
            isRefreshing = false;
            refreshTokenSubject.next(token);
            return next(finalReq);
          }),
          catchError(refreshErr => {
            isRefreshing = false;
            refreshTokenSubject.next(null);
            openSnack(snackBar, 'Sesi berakhir. Silakan login kembali.', 'snackbar-error');
            authService.logout().subscribe();
            return throwError(() => refreshErr);
          })
        );
      }

      if (error.status === 403) {
        openSnack(snackBar, 'Anda tidak memiliki izin untuk mengakses fitur ini.', 'snackbar-error');
      } else if (error.status === 0) {
        openSnack(snackBar, 'Tidak dapat terhubung ke server. Periksa koneksi internet.', 'snackbar-error');
      }
      return throwError(() => error);
    })
  );
};

function addCommonHeaders(request: HttpRequest<any>): HttpRequest<any> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (!(request.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (environment.apiVersion) {
    headers['X-API-Version'] = environment.apiVersion;
  }
  headers['X-Correlation-ID'] = generateCorrelationId();

  // ⬇️ SELALU KIRIM COOKIE (cookie-based backend)
  return request.clone({
    setHeaders: headers,
    withCredentials: true,
  });
}

function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function openSnack(snackBar: MatSnackBar, message: string, panelClass: string) {
  snackBar.open(message, 'OK', {
    duration: 5000,
    horizontalPosition: 'right',
    verticalPosition: 'top',
    panelClass: [panelClass],
  });
}
