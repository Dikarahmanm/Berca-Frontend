// Real API integration service for multi-branch notifications
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap, retry } from 'rxjs/operators';
import { environment } from '../../../../environment/environment';
import { MultiBranchNotification } from './notification.service';

export interface NotificationApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  errors?: string[];
}

export interface CreateNotificationRequest {
  type: string;
  severity: string;
  priority: string;
  title: string;
  message: string;
  branchId?: number;
  userId?: number;
  actionRequired: boolean;
  actionUrl?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationRequest {
  isRead?: boolean;
  isArchived?: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  branchId?: number;
  type?: string;
  severity?: string;
  priority?: string;
  isRead?: boolean;
  actionRequired?: boolean;
  dateFrom?: string;
  dateTo?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationApiService {
  private readonly baseUrl = `${environment.apiUrl}/notifications`;
  
  // Real-time connection status
  private readonly _connectionStatus = signal<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  readonly connectionStatus = this._connectionStatus.asReadonly();

  constructor(private http: HttpClient) {
    this.initializeRealtimeConnection();
  }

  // ===== CRUD OPERATIONS =====

  /**
   * Get notifications with filtering
   */
  getNotifications(filters?: NotificationFilters): Observable<MultiBranchNotification[]> {
    let params = new HttpParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<NotificationApiResponse<MultiBranchNotification[]>>(
      this.baseUrl, 
      { params }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      retry(2),
      catchError(this.handleError<MultiBranchNotification[]>('getNotifications', []))
    );
  }

  /**
   * Get notification by ID
   */
  getNotificationById(id: string): Observable<MultiBranchNotification | null> {
    return this.http.get<NotificationApiResponse<MultiBranchNotification>>(
      `${this.baseUrl}/${id}`
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(this.handleError<MultiBranchNotification | null>('getNotificationById', null))
    );
  }

  /**
   * Create new notification
   */
  createNotification(request: CreateNotificationRequest): Observable<MultiBranchNotification> {
    return this.http.post<NotificationApiResponse<MultiBranchNotification>>(
      this.baseUrl, 
      request
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(this.handleError<MultiBranchNotification>('createNotification'))
    );
  }

  /**
   * Update notification
   */
  updateNotification(id: string, request: UpdateNotificationRequest): Observable<boolean> {
    return this.http.put<NotificationApiResponse<boolean>>(
      `${this.baseUrl}/${id}`, 
      request
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(this.handleError<boolean>('updateNotification', false))
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): Observable<boolean> {
    return this.updateNotification(id, { isRead: true });
  }

  /**
   * Mark multiple notifications as read
   */
  markMultipleAsRead(ids: string[]): Observable<boolean> {
    return this.http.put<NotificationApiResponse<boolean>>(
      `${this.baseUrl}/mark-read-bulk`, 
      { ids }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(this.handleError<boolean>('markMultipleAsRead', false))
    );
  }

  /**
   * Mark all notifications as read for a user/branch
   */
  markAllAsRead(branchId?: number): Observable<boolean> {
    const params = branchId ? new HttpParams().set('branchId', branchId.toString()) : new HttpParams();
    
    return this.http.put<NotificationApiResponse<boolean>>(
      `${this.baseUrl}/mark-all-read`,
      {},
      { params }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(this.handleError<boolean>('markAllAsRead', false))
    );
  }

  /**
   * Archive notification
   */
  archiveNotification(id: string): Observable<boolean> {
    return this.updateNotification(id, { isArchived: true });
  }

  /**
   * Delete notification
   */
  deleteNotification(id: string): Observable<boolean> {
    return this.http.delete<NotificationApiResponse<boolean>>(
      `${this.baseUrl}/${id}`
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(this.handleError<boolean>('deleteNotification', false))
    );
  }

  // ===== ANALYTICS & REPORTING =====

  /**
   * Get notification statistics
   */
  getNotificationStats(branchId?: number, dateFrom?: string, dateTo?: string): Observable<any> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);

    return this.http.get<NotificationApiResponse<any>>(
      `${this.baseUrl}/stats`,
      { params }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(this.handleError<any>('getNotificationStats', {}))
    );
  }

  /**
   * Get notification trends
   */
  getNotificationTrends(days: number = 30, branchId?: number): Observable<any> {
    let params = new HttpParams().set('days', days.toString());
    if (branchId) params = params.set('branchId', branchId.toString());

    return this.http.get<NotificationApiResponse<any>>(
      `${this.baseUrl}/trends`,
      { params }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(this.handleError<any>('getNotificationTrends', {}))
    );
  }

  /**
   * Export notifications
   */
  exportNotifications(filters?: NotificationFilters, format: 'csv' | 'excel' = 'excel'): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get(
      `${this.baseUrl}/export`,
      { 
        params,
        responseType: 'blob'
      }
    ).pipe(
      catchError(error => {
        console.error('Export failed:', error);
        return throwError(() => error);
      })
    );
  }

  // ===== REAL-TIME UPDATES =====

  /**
   * Subscribe to real-time notification updates via SignalR
   */
  subscribeToRealTimeUpdates(): Observable<MultiBranchNotification> {
    // This would integrate with SignalR hub
    // For now, return a mock observable
    return new BehaviorSubject<MultiBranchNotification>({
      id: 'realtime-test',
      type: 'system',
      severity: 'info',
      priority: 'low',
      title: 'Real-time Connection Established',
      message: 'Successfully connected to notification hub',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isRead: false,
      isArchived: false,
      actionRequired: false
    }).asObservable();
  }

  /**
   * Initialize real-time connection
   */
  private initializeRealtimeConnection(): void {
    // Initialize SignalR connection
    this._connectionStatus.set('connected');
    
    // In real implementation:
    // 1. Create SignalR connection
    // 2. Handle connection events
    // 3. Subscribe to notification updates
    // 4. Handle reconnection logic
    
    console.log('🔗 Multi-branch notification API service initialized');
  }

  // ===== UTILITY METHODS =====

  /**
   * Test API connectivity
   */
  testConnection(): Observable<boolean> {
    return this.http.get<NotificationApiResponse<boolean>>(
      `${this.baseUrl}/health`
    ).pipe(
      map(response => response.success),
      catchError(() => {
        return throwError(() => new Error('API connection failed'));
      })
    );
  }

  /**
   * Get API health status
   */
  getHealthStatus(): Observable<any> {
    return this.http.get<NotificationApiResponse<any>>(
      `${this.baseUrl}/health/detailed`
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(this.handleError<any>('getHealthStatus', { status: 'unknown' }))
    );
  }

  /**
   * Generic error handler
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Log error to monitoring service
      // this.logError(operation, error);
      
      // Return safe fallback result
      return throwError(() => error);
    };
  }

  /**
   * Log error for monitoring
   */
  private logError(operation: string, error: any): void {
    // Send error to monitoring service
    const errorLog = {
      operation,
      error: error.message || error,
      timestamp: new Date().toISOString(),
      url: error.url || 'unknown',
      status: error.status || 'unknown'
    };
    
    console.error('API Error Log:', errorLog);
    // Send to monitoring service
  }
}