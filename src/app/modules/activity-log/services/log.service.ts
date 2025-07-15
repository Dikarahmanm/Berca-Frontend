import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface LogActivity {
  id: number;
  username: string;
  action: string;
  timestamp: string;
}

interface BackendLogResponse {
  total: number;
  page: number;
  pageSize: number;
  data: LogActivity[];
}

@Injectable({ providedIn: 'root' })
export class LogService {
  // ✅ DIRECT URL TO BACKEND
  private baseUrl = 'http://localhost:5171/admin/logs';

  constructor(private http: HttpClient) {
    console.log('🔧 LogService initialized with DIRECT URL:', this.baseUrl);
  }

  getLogs(page: number, pageSize: number, search: string = '', from?: string, to?: string): Observable<{ total: number; logs: LogActivity[] }> {
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

    console.log('📋 GET Logs Request (DIRECT):', {
      url: this.baseUrl,
      params: params.toString(),
      withCredentials: true
    });

    return this.http.get<BackendLogResponse>(this.baseUrl, { 
      params,
      withCredentials: true
    }).pipe(
      map(response => ({
        total: response.total,
        logs: response.data
      })),
      tap(response => console.log('✅ Logs response:', response)),
      catchError(this.handleError.bind(this))
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

    const url = `${this.baseUrl}/export`;
    console.log('📥 Export Request (DIRECT):', { url, params: params.toString() });

    return this.http.get(url, {
      params,
      responseType: 'blob',
      withCredentials: true
    }).pipe(
      catchError(this.handleError.bind(this))
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