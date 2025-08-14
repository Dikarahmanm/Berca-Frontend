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

// Multiple possible response formats from backend
interface BackendLogResponse {
  total: number;
  page: number;
  pageSize: number;
  data: LogActivity[];
}

// Alternative response format
interface AlternativeLogResponse {
  success: boolean;
  total: number;
  logs: LogActivity[];
  message?: string;
}

// Generic response format
interface GenericLogResponse {
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class LogService {
  // ✅ DIRECT URL TO BACKEND - Try multiple endpoints
  private baseUrl = 'http://localhost:5171';
  private possibleEndpoints = [
    '/admin/logs',
    '/api/logs',
    '/logs',
    '/admin/audit-logs',
    '/api/audit-logs',
    '/admin/activities',
    '/api/activities'
  ];

  constructor(private http: HttpClient) {
    console.log('🔧 LogService initialized with base URL:', this.baseUrl);
    console.log('🔍 Will try endpoints:', this.possibleEndpoints);
  }

  getLogs(page: number, pageSize: number, search: string = '', from?: string, to?: string, action?: string): Observable<{ total: number; logs: LogActivity[] }> {
    return this.tryLogsEndpoints(page, pageSize, search, from, to, action);
  }

  private tryLogsEndpoints(page: number, pageSize: number, search: string = '', from?: string, to?: string, action?: string, endpointIndex: number = 0): Observable<{ total: number; logs: LogActivity[] }> {
    if (endpointIndex >= this.possibleEndpoints.length) {
      console.warn('🚫 All endpoints failed, returning empty logs');
      return of({ total: 0, logs: [] });
    }

    const endpoint = this.possibleEndpoints[endpointIndex];
    const url = `${this.baseUrl}${endpoint}`;

    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search.trim()) {
      params = params.set('search', search);
      // Backend should search across all fields:
      // - id (log ID)
      // - username 
      // - action
      // - category (derived from action)
      // - timestamp (formatted dates)
      // - details, ipAddress, userAgent (if available)
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

    console.log(`📋 Trying endpoint ${endpointIndex + 1}/${this.possibleEndpoints.length}:`, {
      url,
      params: params.toString()
    });

    return this.http.get<any>(url, { 
      params,
      withCredentials: true
    }).pipe(
      map(response => {
        console.log(`✅ Success with endpoint: ${endpoint}`);
        console.log('🔍 Raw API Response:', response);
        
        // Handle different response formats
        if (response.data && Array.isArray(response.data)) {
          // Format 1: { total, page, pageSize, data: LogActivity[] }
          return {
            total: response.total || response.data.length,
            logs: response.data
          };
        } else if (response.logs && Array.isArray(response.logs)) {
          // Format 2: { success, total, logs: LogActivity[] }
          return {
            total: response.total || response.logs.length,
            logs: response.logs
          };
        } else if (Array.isArray(response)) {
          // Format 3: Direct array of LogActivity[]
          return {
            total: response.length,
            logs: response
          };
        } else {
          // Unknown format, log and return empty
          console.warn('⚠️ Unknown response format:', response);
          return {
            total: 0,
            logs: []
          };
        }
      }),
      tap(response => console.log('✅ Processed logs response:', response)),
      catchError((error) => {
        console.error(`❌ Endpoint ${endpoint} failed:`, error.status, error.statusText);
        
        // Try next endpoint
        return this.tryLogsEndpoints(page, pageSize, search, from, to, action, endpointIndex + 1);
      })
    );
  }

  exportLogsToXlsx(search: string = '', from?: string, to?: string): Observable<Blob> {
    const exportEndpoints = [
      '/admin/logs/export',
      '/api/logs/export', 
      '/logs/export',
      '/admin/audit-logs/export',
      '/api/activities/export'
    ];

    return this.tryExportEndpoints(search, from, to, exportEndpoints);
  }

  private tryExportEndpoints(search: string, from?: string, to?: string, endpoints: string[] = [], endpointIndex: number = 0): Observable<Blob> {
    if (endpointIndex >= endpoints.length) {
      console.warn('🚫 All export endpoints failed, creating fallback CSV');
      // Create fallback CSV export
      const fallbackCsv = `ID,Username,Action,Timestamp,Error
0,system,Export Failed,${new Date().toISOString()},API not available`;
      const blob = new Blob([fallbackCsv], { type: 'text/csv' });
      return of(blob);
    }

    const endpoint = endpoints[endpointIndex];
    const url = `${this.baseUrl}${endpoint}`;

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

    console.log(`📥 Trying export endpoint ${endpointIndex + 1}/${endpoints.length}:`, { 
      url, 
      params: params.toString() 
    });

    return this.http.get(url, {
      params,
      responseType: 'blob',
      withCredentials: true
    }).pipe(
      tap(() => console.log(`✅ Export success with endpoint: ${endpoint}`)),
      catchError((error) => {
        console.error(`❌ Export endpoint ${endpoint} failed:`, error.status, error.statusText);
        // Try next endpoint
        return this.tryExportEndpoints(search, from, to, endpoints, endpointIndex + 1);
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