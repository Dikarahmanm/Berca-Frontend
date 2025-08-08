// src/app/core/services/notification.service.ts
// ✅ REAL DATA INTEGRATION: Sinkronisasi penuh dengan backend .NET 9
// Menggunakan API nyata tanpa mock data sesuai NotificationController

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer, of } from 'rxjs';
import { map, catchError, tap, retry, shareReplay, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { environment } from '../../../environment/environment';
import { AuthService } from './auth.service';
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
    private snackBar: MatSnackBar,
    private authService: AuthService,  // ✅ Add AuthService injection
    private injector: Injector  // ✅ Added injector for router access
  ) {
    console.log('🔔 NotificationService initialized with AuthService');
    this.initializeRealTimeUpdates();
  }

  // ===== REAL API METHODS ===== //

  /**
   * ✅ REAL: Get unread notification count dari backend
   * Endpoint: GET /api/Notification/summary
   */
  getUnreadCount(): Observable<number> {
    console.log('🔔 === GETTING NOTIFICATION COUNT ===');
    console.log('API URL:', `${this.apiUrl}/summary`);
    console.log('Auth Status:', this.authService.isAuthenticated());
    console.log('Current User:', this.authService.getCurrentUser());
    console.log('Cookies:', document.cookie);
    
    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      console.log('❌ User not authenticated, returning 0');
      this.unreadCountSubject.next(0);
      return of(0);
    }

    return this.http.get<ApiResponse<NotificationSummaryDto>>(`${this.apiUrl}/summary`).pipe(
      tap((response) => {
        console.log('✅ Notification API Response:', response);
      }),
      map(response => {
        if (response.success && response.data) {
          this.unreadCountSubject.next(response.data.unreadCount);
          this.summarySubject.next(response.data);
          console.log('✅ Updated notification count:', response.data.unreadCount);
          return response.data.unreadCount;
        }
        throw new Error(response.message || 'Failed to get notification count');
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Notification API Error:', {
          status: error.status,
          url: error.url,
          message: error.message,
          error: error.error
        });
        
        // Don't show error for auth issues - interceptor handles it
        if (error.status !== 401 && error.status !== 405) {
          this.handleApiError('Failed to load notification count', error);
        }
        
        return of(this.unreadCountSubject.value);
      })
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
          return of([]);
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

  // ===== NOTIFICATION INTERACTION METHODS ===== //

  /**
   * Handle notification click with smart navigation
   */
  handleNotificationClick(notification: NotificationDto): void {
    console.log('🔔 Handling notification click:', notification);
    
    // Mark as read first
    if (!notification.isRead) {
      this.markAsRead(notification.id).subscribe({
        next: () => console.log('✅ Notification marked as read'),
        error: (error) => console.error('❌ Error marking notification as read:', error)
      });
    }

    // Handle navigation based on notification type and content
    this.navigateFromNotification(notification);
  }

  /**
   * Smart navigation based on notification content
   */
  private navigateFromNotification(notification: NotificationDto): void {
    const router = this.getRouter();
    if (!router) {
      console.warn('Router not available for navigation');
      return;
    }

    console.log('🔍 Analyzing notification for navigation:', {
      title: notification.title,
      message: notification.message,
      type: notification.type
    });

    // Priority 1: Use actionUrl if provided and valid
    if (notification.actionUrl) {
      console.log('🔄 Found actionUrl:', notification.actionUrl);
      
      // Convert /sales/:id to /dashboard/pos/transaction/:id
      const salesMatch = notification.actionUrl.match(/^\/sales\/(\d+)$/);
      if (salesMatch) {
        const transactionId = salesMatch[1];
        console.log('🔄 Converting sales URL to transaction detail:', transactionId);
        router.navigate(['/dashboard/pos/transaction', transactionId]);
        return;
      }
      
      // Use actionUrl as-is if it's already a valid route
      console.log('🔄 Navigating to actionUrl:', notification.actionUrl);
      router.navigateByUrl(notification.actionUrl);
      return;
    }

    // Priority 2: Extract transaction ID from message for POS transactions
    const transactionPattern = /(?:penjualan|transaksi|transaction|TRX-\d{8}-\d{4}|selesai|\b\d{4,5}\b)/i;
    const isTransactionRelated = notification.type === 'transaction' || 
                                notification.type === 'sale' || 
                                notification.type === 'sales' ||
                                transactionPattern.test(notification.message) ||
                                transactionPattern.test(notification.title);
    
    console.log('🔍 Is transaction related?', isTransactionRelated);

    if (isTransactionRelated) {
      const transactionId = this.extractTransactionId(notification);
      if (transactionId) {
        console.log('🔄 Navigating to transaction detail:', transactionId);
        router.navigate(['/dashboard/pos/transaction', transactionId]);
        return;
      } else {
        console.warn('🔍 Could not extract transaction ID, trying alternative approaches...');
        
        // Alternative: check if message contains any transaction number format
        const altNumberMatch = notification.message.match(/(\d{4,6})/);
        if (altNumberMatch) {
          const altId = parseInt(altNumberMatch[1], 10);
          console.log('🔄 Found alternative transaction ID:', altId, 'navigating to detail');
          router.navigate(['/dashboard/pos/transaction', altId]);
          return;
        }
        
        console.warn('🔍 No transaction ID found, redirecting to POS main page');
        router.navigate(['/dashboard/pos']);
        return;
      }
    }

    // Priority 3: Navigate based on notification type
    switch (notification.type?.toLowerCase()) {
      case 'inventory':
      case 'stock':
        router.navigate(['/dashboard/inventory']);
        break;
      case 'user':
      case 'auth':
        router.navigate(['/dashboard/users']);
        break;
      case 'report':
      case 'financial':
        router.navigate(['/dashboard/reports']);
        break;
      case 'activity':
        router.navigate(['/dashboard/logs']);
        break;
      default:
        // Fallback: go to notifications center
        console.log('🔄 Navigating to notifications center (fallback)');
        router.navigate(['/dashboard/notifications']);
        break;
    }
  }

  /**
   * Extract transaction ID from notification message
   */
  private extractTransactionId(notification: NotificationDto): number | null {
    console.log('🔍 Extracting transaction ID from:', {
      title: notification.title,
      message: notification.message
    });

    // Try to extract from message content
    const patterns = [
      /TRX-\d{8}-(\d{4})/,  // TRX-20250808-0006 format
      /transaksi\s*(?:#)?(\d+)/i,  // "transaksi #1067" or "transaksi 1067"
      /penjualan\s*(?:#)?(\d+)/i,  // "penjualan #1067" or "penjualan 1067"
      /transaction\s*(?:#)?(\d+)/i, // "transaction #1067" or "transaction 1067"
      /ID[:\s]+(\d+)/i,  // "ID: 1067" or "ID 1067"
      /\b(\d{4,5})\b/  // any 4-5 digit number (as fallback)
    ];

    // Check message first
    for (const pattern of patterns) {
      const match = notification.message.match(pattern);
      if (match && match[1]) {
        const id = parseInt(match[1], 10);
        if (id && id > 0) {
          console.log('✅ Extracted transaction ID from message:', id, 'using pattern:', pattern.source);
          return id;
        }
      }
    }

    // Check title
    for (const pattern of patterns) {
      const match = notification.title.match(pattern);
      if (match && match[1]) {
        const id = parseInt(match[1], 10);
        if (id && id > 0) {
          console.log('✅ Extracted transaction ID from title:', id, 'using pattern:', pattern.source);
          return id;
        }
      }
    }

    // Special case: if TRX pattern is found but no ID, try to extract the full number
    const trxMatch = (notification.message + ' ' + notification.title).match(/TRX-\d{8}-(\d{4})/);
    if (trxMatch) {
      const id = parseInt(trxMatch[1], 10);
      console.log('✅ Extracted transaction ID from TRX pattern:', id);
      return id;
    }

    console.warn('❌ Could not extract transaction ID from notification:', notification);
    return null;
  }

  /**
   * Get router instance (dependency injection)
   */
  private getRouter(): Router | null {
    try {
      return this.injector.get(Router);
    } catch {
      console.warn('Router not available in notification service');
      return null;
    }
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