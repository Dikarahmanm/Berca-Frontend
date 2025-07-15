import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface User {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
}

export interface PagedUserResponse {
  total: number;
  users: User[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // ✅ DIRECT URL TO BACKEND
  private apiUrl = 'http://localhost:5171/admin/users';

  constructor(private http: HttpClient) {
    console.log('🔧 UserService initialized with DIRECT URL:', this.apiUrl);
  }

  getUsers(page: number = 1, pageSize: number = 10, search: string = ''): Observable<PagedUserResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search.trim()) {
      params = params.set('search', search);
    }

    console.log('📊 GET Request (DIRECT):', {
      url: this.apiUrl,
      params: params.toString(),
      withCredentials: true
    });

    return this.http.get<PagedUserResponse>(this.apiUrl, { 
      params,
      withCredentials: true
    }).pipe(
      tap((response: PagedUserResponse) => console.log('✅ Users response:', response)),
      catchError(this.handleError.bind(this))
    );
  }

  updateUser(id: number, payload: { role?: string; isActive: boolean }): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    
    console.log('🔄 PUT Request (DIRECT):', {
      url: url,
      payload: payload,
      withCredentials: true,
      timestamp: new Date().toISOString()
    });

    return this.http.put(url, payload, {
      withCredentials: true
    }).pipe(
      tap((response: any) => console.log('✅ Update response:', response)),
      catchError(this.handleError.bind(this))
    );
  }

  deleteUser(id: number): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    
    console.log('🗑️ DELETE Request (DIRECT):', {
      url: url,
      withCredentials: true,
      timestamp: new Date().toISOString()
    });

    return this.http.delete(url, {
      withCredentials: true
    }).pipe(
      tap((response: any) => console.log('✅ Delete response:', response)),
      catchError(this.handleError.bind(this))
    );
  }
getDeletedUsers(page: number = 1, pageSize: number = 10): Observable<PagedUserResponse> {
  let params = new HttpParams()
    .set('page', page.toString())
    .set('pageSize', pageSize.toString());

  const url = `http://localhost:5171/admin/users/deleted`;
  console.log('🗑️ GET Deleted Users Request:', { url, params: params.toString() });

  return this.http.get<PagedUserResponse>(url, { 
    params,
    withCredentials: true
  }).pipe(
    tap((response: PagedUserResponse) => console.log('✅ Deleted users response:', response)),
    catchError(this.handleError.bind(this))
  );
}

restoreUser(id: number): Observable<any> {
  const url = `http://localhost:5171/admin/users/${id}/restore`;
  
  console.log('🔄 RESTORE User Request:', {
    url: url,
    withCredentials: true,
    timestamp: new Date().toISOString()
  });

  return this.http.put(url, {}, {
    withCredentials: true
  }).pipe(
    tap((response: any) => console.log('✅ Restore response:', response)),
    catchError(this.handleError.bind(this))
  );
}

  // ✅ ADD MISSING testConnection METHOD
  testConnection(): Observable<any> {
    console.log('🧪 Testing connection to backend...');
    return this.http.get(this.apiUrl, {
      withCredentials: true,
      observe: 'response'
    }).pipe(
      tap((response: any) => console.log('✅ Connection test successful:', response)),
      map((response: any) => response.body),
      catchError((error: any) => {
        console.error('❌ Connection test failed:', error);
        return throwError(() => error);
      })
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('❌ UserService Error Details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error,
      timestamp: new Date().toISOString()
    });

    if (error.status === 0) {
      console.error('🚫 NETWORK ERROR: Check if backend is running on http://localhost:5171');
      return throwError(() => 'Network error - backend not reachable');
    }
    
    if (error.status === 401) {
      console.error('🔐 401 ERROR: Authentication required');
      return throwError(() => 'Authentication required - please login');
    }

    if (error.status === 403) {
      console.error('🚫 403 ERROR: Access forbidden');
      return throwError(() => 'Access forbidden - insufficient permissions');
    }
    
    return throwError(() => error.error?.message || `HTTP Error ${error.status}: ${error.statusText}`);
  }
}