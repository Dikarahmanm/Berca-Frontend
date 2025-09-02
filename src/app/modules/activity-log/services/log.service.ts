import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface LogActivity {
  id: number;
  username: string;
  action: string;
  timestamp: string;
  userId?: number;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  category?: string;
}

@Injectable({ providedIn: 'root' })
export class LogService {
  // ✅ Use admin logs endpoint as per API specification
  private logsEndpoint = '/admin/logs';

  constructor(private http: HttpClient) {
    console.log('🔧 LogService initialized with endpoint:', this.logsEndpoint);
  }

  getLogs(page: number, pageSize: number, search: string = '', from?: string, to?: string, action?: string): Observable<{ total: number; logs: LogActivity[] }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search.trim()) {
      params = params.set('search', search);
    }

    if (from) {
      params = params.set('from', from);
    }

    if (to) {
      params = params.set('to', to);
    }

    if (action) {
      params = params.set('action', action);
    }

    console.log('📋 Getting logs with params:', {
      endpoint: this.logsEndpoint,
      params: params.toString(),
      withCredentials: true
    });

    return this.http.get<any>(this.logsEndpoint, { 
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('✅ Logs response:', response);
        
        // Handle different response formats
        if (response && Array.isArray(response)) {
          return { total: response.length, logs: response };
        }
        
        if (response && response.data && Array.isArray(response.data)) {
          return { total: response.total || response.data.length, logs: response.data };
        }
        
        if (response && response.logs && Array.isArray(response.logs)) {
          return { total: response.total || response.logs.length, logs: response.logs };
        }
        
        console.warn('⚠️ Unexpected response format:', response);
        return { total: 0, logs: [] };
      }),
      catchError(error => {
        console.error('❌ Error getting logs:', error);
        return of({ total: 0, logs: [] });
      })
    );
  }

  exportLogsToXlsx(search: string = '', from?: string, to?: string): Observable<Blob> {
    let params = new HttpParams();

    if (search.trim()) {
      params = params.set('search', search);
    }

    if (from) {
      params = params.set('from', from);
    }

    if (to) {
      params = params.set('to', to);
    }

    console.log('� Exporting logs to XLSX:', {
      endpoint: `${this.logsEndpoint}/export`,
      params: params.toString()
    });

    return this.http.get(`${this.logsEndpoint}/export`, {
      params,
      responseType: 'blob',
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('❌ Error exporting logs:', error);
        // Return empty blob on error
        return of(new Blob());
      })
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('❌ LogService Error:', error);
    
    if (error.status === 401) {
      return throwError(() => 'Authentication required');
    }
    
    return throwError(() => error.error?.message || 'An error occurred');
  }
}