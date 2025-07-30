// src/app/core/services/notification.service.ts
// ✅ REAL DATA INTEGRATION: Sinkronisasi penuh dengan backend .NET 9
// Menggunakan API nyata tanpa mock data sesuai NotificationController

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer } from 'rxjs';
import { map, catchError, tap, retry, shareReplay, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environment/environment';

// ===== BACKEND DTO INTERFACES ===== //
// Sesuai dengan backend NotificationController response

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  priority: string;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
  actionText?: string;
  userId: number;
  createdBy: string;
}

export interface NotificationSummaryDto {
  totalCount: number;
  unreadCount: number;
  recentNotifications: NotificationDto[];
  lastUpdated: string;
}

export interface CreateNotificationRequest {
  title: string;
  message: string;
  type: string;
  priority: string;
  actionUrl?: string;
  actionText?: string;
  userId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/Notification`;
  
  // ===== REACTIVE STATE ===== //
  private notificationsSubject = new BehaviorSubject<NotificationDto[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private summarySubject = new BehaviorSubject<NotificationSummaryDto | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // ===== PUBLIC OBSERVABLES ===== //
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public summary$ = this.summarySubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.initializeRealTimeUpdates();
  }

  // ===== REAL API METHODS ===== //

  /**
   * ✅ REAL: Get unread notification count dari backend
   * Endpoint: GET /api/Notification/summary
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<ApiResponse<NotificationSummaryDto>>(`${this.apiUrl}/summary`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Update local state
            this.unreadCountSubject.next(response.data.unreadCount);
            this.summarySubject.next(response.data);
            return response.data.unreadCount;
          }
          throw new Error(response.message || 'Failed to get notification count');
        }),
        retry(2), // Retry up to 2 times on failure
        catchError((error: HttpErrorResponse) => {
          this.handleApiError('Failed to load notification count', error);
          // Return current value as fallback
          return [this.unreadCountSubject.value];
        }),
        shareReplay(1) // Cache the latest result
      );
  }

  /**
   * ✅ REAL: Get user notifications dengan filtering dan pagination
   * Endpoint: GET /api/Notification
   */
  getUserNotifications(
    page: number = 1, 
    pageSize: number = 20, 
    isRead?: boolean
  ): Observable<NotificationDto[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (isRead !== undefined) {
      params = params.set('isRead', isRead.toString());
    }

    return this.http.get<ApiResponse<NotificationDto[]>>(this.apiUrl, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Update local state untuk page 1 (fresh load)
            if (page === 1) {
              this.notificationsSubject.next(response.data);
            }
            return response.data;
          }
          throw new Error(response.message || 'Failed to load notifications');
        }),
        retry(1),
        catchError((error: HttpErrorResponse) => {
          this.handleApiError('Failed to load notifications', error);
          // Return empty array as fallback
          return [[]];
        })
      );
  }

  /**
   * ✅ REAL: Get notification summary
   * Endpoint: GET /api/Notification/summary
   */
  getNotificationSummary(): Observable<NotificationSummaryDto> {
    return this.http.get<ApiResponse<NotificationSummaryDto>>(`${this.apiUrl}/summary`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.summarySubject.next(response.data);
            this.unreadCountSubject.next(response.data.unreadCount);
            return response.data;
          }
          throw new Error(response.message || 'Failed to get notification summary');
        }),
        retry(1),
        catchError((error: HttpErrorResponse) => {
          this.handleApiError('Failed to load notification summary', error);
          throw error;
        })
      );
  }

  /**
   * ✅ REAL: Mark notification as read
   * Endpoint: POST /api/Notification/{id}/read
   */
  markAsRead(notificationId: number): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/${notificationId}/read`, {})
      .pipe(
        map(response => {
          if (response.success) {
            // Update local state
            this.updateNotificationReadStatus(notificationId, true);
            this.decrementUnreadCount();
            return true;
          }
          throw new Error(response.message || 'Failed to mark notification as read');
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleApiError('Failed to mark notification as read', error);
          return [false];
        })
      );
  }

  /**
   * ✅ REAL: Mark all notifications as read
   * Endpoint: POST /api/Notification/read-all
   */
  markAllAsRead(): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/read-all`, {})
      .pipe(
        map(response => {
          if (response.success) {
            // Update local state
            this.markAllNotificationsAsRead();
            this.unreadCountSubject.next(0);
            return true;
          }
          throw new Error(response.message || 'Failed to mark all notifications as read');
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleApiError('Failed to mark all notifications as read', error);
          return [false];
        })
      );
  }

  /**
   * ✅ REAL: Create new notification (admin only)
   * Endpoint: POST /api/Notification
   */
  createNotification(request: CreateNotificationRequest): Observable<NotificationDto> {
    return this.http.post<ApiResponse<NotificationDto>>(this.apiUrl, request)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Update local state
            this.addNotificationToState(response.data);
            if (!response.data.isRead) {
              this.incrementUnreadCount();
            }
            return response.data;
          }
          throw new Error(response.message || 'Failed to create notification');
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleApiError('Failed to create notification', error);
          throw error;
        })
      );
  }

  /**
   * ✅ REAL: Delete notification
   * Endpoint: DELETE /api/Notification/{id}
   */
  deleteNotification(notificationId: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${notificationId}`)
      .pipe(
        map(response => {
          if (response.success) {
            // Update local state
            this.removeNotificationFromState(notificationId);
            return true;
          }
          throw new Error(response.message || 'Failed to delete notification');
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleApiError('Failed to delete notification', error);
          return [false];
        })
      );
  }

  // ===== REAL-TIME UPDATES ===== //

  /**
   * ✅ REAL: Initialize real-time updates via polling
   * Poll backend setiap 30 detik untuk update terbaru
   */
  private initializeRealTimeUpdates(): void {
    // Poll every 30 seconds for real-time updates
    timer(0, 30000)
      .pipe(
        switchMap(() => this.getUnreadCount()),
        catchError((error) => {
          console.warn('Polling error, will retry in next cycle:', error);
          return []; // Continue polling cycle
        })
      )
      .subscribe({
        next: (count: number) => {
          // Update notification badge
          if (count > this.unreadCountSubject.value) {
            this.showNewNotificationAlert(count - this.unreadCountSubject.value);
          }
        },
        error: (error) => {
          console.error('Real-time polling failed:', error);
        }
      });
  }

  /**
   * Refresh all notification data
   */
  refreshNotifications(): Observable<void> {
    this.isLoadingSubject.next(true);
    
    return this.getNotificationSummary().pipe(
      tap(() => {
        this.isLoadingSubject.next(false);
        this.errorSubject.next(null);
      }),
      map(() => void 0), // Convert to void
      catchError((error) => {
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Failed to refresh notifications');
        throw error;
      })
    );
  }

  // ===== STATE MANAGEMENT ===== //

  /**
   * Update notification read status in local state
   */
  private updateNotificationReadStatus(id: number, isRead: boolean): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification =>
      notification.id === id ? { ...notification, isRead, readAt: isRead ? new Date().toISOString() : undefined } : notification
    );
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * Mark all notifications as read in local state
   */
  private markAllNotificationsAsRead(): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification => ({
      ...notification,
      isRead: true,
      readAt: new Date().toISOString()
    }));
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * Add new notification to local state
   */
  private addNotificationToState(notification: NotificationDto): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...currentNotifications]);
  }

  /**
   * Remove notification from local state
   */
  private removeNotificationFromState(id: number): void {
    const currentNotifications = this.notificationsSubject.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(filteredNotifications);
  }

  /**
   * Increment unread count
   */
  private incrementUnreadCount(): void {
    const currentCount = this.unreadCountSubject.value;
    this.unreadCountSubject.next(currentCount + 1);
  }

  /**
   * Decrement unread count
   */
  private decrementUnreadCount(): void {
    const currentCount = this.unreadCountSubject.value;
    this.unreadCountSubject.next(Math.max(0, currentCount - 1));
  }

  // ===== ERROR HANDLING ===== //

  /**
   * Handle API errors with user-friendly messages
   */
  private handleApiError(context: string, error: HttpErrorResponse): void {
    let errorMessage = context;
    
    if (error.status === 0) {
      errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    } else if (error.status === 401) {
      errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
    } else if (error.status === 403) {
      errorMessage = 'Anda tidak memiliki izin untuk mengakses fitur ini.';
    } else if (error.status >= 500) {
      errorMessage = 'Terjadi kesalahan pada server. Coba lagi dalam beberapa saat.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.errorSubject.next(errorMessage);
    
    // Log error untuk debugging
    console.error(`${context}:`, {
      status: error.status,
      message: error.message,
      url: error.url,
      error: error.error
    });
  }

  /**
   * Show alert for new notifications
   */
  private showNewNotificationAlert(newCount: number): void {
    const message = newCount === 1 
      ? '1 notifikasi baru' 
      : `${newCount} notifikasi baru`;
    
    this.snackBar.open(message, 'Lihat', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-info']
    });
  }

  // ===== PUBLIC UTILITY METHODS ===== //

  /**
   * Get current unread count synchronously
   */
  getCurrentUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /**
   * Get current notifications synchronously
   */
  getCurrentNotifications(): NotificationDto[] {
    return this.notificationsSubject.value;
  }

  /**
   * Check if service is currently loading
   */
  isLoading(): boolean {
    return this.isLoadingSubject.value;
  }

  /**
   * Get current error message
   */
  getCurrentError(): string | null {
    return this.errorSubject.value;
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.errorSubject.next(null);
  }
}