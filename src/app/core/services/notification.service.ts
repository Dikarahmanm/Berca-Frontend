// src/app/core/services/notification.service.ts
// ✅ REAL DATA INTEGRATION: Sinkronisasi penuh dengan backend .NET 9
// Menggunakan API nyata tanpa mock data sesuai NotificationController

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer, of, combineLatest } from 'rxjs';
import { map, catchError, tap, retry, shareReplay, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { environment } from '../../../environment/environment';
import { AuthService } from './auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { SmartNotificationApiService } from './smart-notification-api.service';
// ===== BACKEND DTO INTERFACES ===== //
// Sesuai dengan backend NotificationController response

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface NotificationDto {
  id: number;
  userId?: number;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  timeAgo: string;
  isExpired: boolean;
  branchId?: number;
  branchName?: string;
  userName?: string;
  severity: string;
  isArchived: boolean;
  actionRequired: boolean;
  expiresAt?: string;
  metadata?: any;
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
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  
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
    private injector: Injector,  // ✅ Added injector for router access
    private toastService: ToastService,  // ✅ Add ToastService for popup notifications
    private smartNotificationApi: SmartNotificationApiService  // ✅ Add SmartNotification API service
  ) {
    console.log('🔔 NotificationService initialized with AuthService, ToastService, and SmartNotificationAPI');
    this.initializeRealTimeUpdates();
  }

  // ===== REAL API METHODS ===== //

  /**
   * 🧪 DEBUG: Test API connection without auth
   */
  testApiConnection(): Observable<any> {
    console.log('🧪 Testing API connection to:', this.apiUrl);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    return this.http.get(this.apiUrl, { headers, observe: 'response' }).pipe(
      tap(response => {
        console.log('🧪 Test API Response:', response);
      }),
      catchError(error => {
        console.error('🧪 Test API Error:', error);
        return of(error);
      })
    );
  }

  /**
   * ✅ REAL: Get unread notification count dari backend
   * Endpoint: GET /api/notifications/unread-count
   */
  getUnreadCount(): Observable<number> {
    console.log('🔔 === GETTING NOTIFICATION COUNT ===');
    console.log('API URL:', `${this.apiUrl}/unread-count`);
    console.log('Auth Status:', this.authService.isAuthenticated());
    console.log('Current User:', this.authService.getCurrentUser());
    console.log('Cookies:', document.cookie);
    
    // Check authentication first
    const isAuth = this.authService.isAuthenticated();
    console.log('🔐 Authentication check:', {
      isAuthenticated: isAuth,
      currentUser: this.authService.getCurrentUser(),
      localStorage: {
        token: localStorage.getItem('token'),
        username: localStorage.getItem('username'),
        role: localStorage.getItem('role')
      }
    });
    
    // TEMPORARY: Skip auth check for debugging
    if (!isAuth) {
      console.log('⚠️ User not authenticated, but continuing for debug...');
      // this.unreadCountSubject.next(0);
      // return of(0);
    }

    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/unread-count`).pipe(
      tap((response) => {
        console.log('✅ Unread Count API Response:', response);
      }),
      map(response => {
        if (response.success && response.data !== undefined) {
          this.unreadCountSubject.next(response.data);
          console.log('✅ Updated unread count:', response.data);
          return response.data;
        }
        throw new Error(response.message || 'Failed to get notification count');
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Notification Count API Error:', {
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
   * Endpoint: GET /api/notifications
   */
  getUserNotifications(
    page: number = 1, 
    pageSize: number = 20, 
    isRead?: boolean,
    type?: string,
    priority?: string,
    severity?: string,
    allBranches: boolean = false
  ): Observable<NotificationDto[]> {
    console.log('🔔 === GETTING USER NOTIFICATIONS ===');
    console.log('Parameters:', { page, pageSize, isRead, type, priority, severity, allBranches });
    console.log('API URL:', this.apiUrl);
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (isRead !== undefined) {
      params = params.set('isRead', isRead.toString());
    }
    
    if (type) {
      params = params.set('type', type);
    }
    
    if (priority) {
      params = params.set('priority', priority);
    }
    
    if (severity) {
      params = params.set('severity', severity);
    }

    // If allBranches is true, explicitly set allBranches parameter to override branch filtering
    if (allBranches) {
      params = params.set('allBranches', 'true');
      console.log('🔔 Requesting notifications from all branches');
    }

    return this.http.get<ApiResponse<any>>(this.apiUrl, { params })
      .pipe(
        map(response => {
          console.log('🔔 Raw API Response:', response);
          console.log('🔔 Response structure:', {
            success: response.success,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : 'no data',
            dataType: typeof response.data
          });
          
          if (response.success && response.data) {
            // Handle different possible response structures
            let notifications: NotificationDto[] = [];
            
            if (response.data.data && Array.isArray(response.data.data)) {
              // Structure: { data: { data: NotificationDto[], totalCount: number } }
              notifications = response.data.data;
              console.log('✅ Notification data found (nested structure):', notifications.length, 'items');
            } else if (Array.isArray(response.data)) {
              // Structure: { data: NotificationDto[] }
              notifications = response.data;
              console.log('✅ Notification data found (direct array):', notifications.length, 'items');
            } else if (response.data.notifications && Array.isArray(response.data.notifications)) {
              // Structure: { data: { notifications: NotificationDto[], ... } }
              notifications = response.data.notifications;
              console.log('✅ Notification data found (notifications property):', notifications.length, 'items');
            } else {
              console.log('⚠️ Unexpected response structure, checking for array properties:', Object.keys(response.data));
              // Try to find any array property that might contain notifications
              const arrayProps = Object.keys(response.data).filter(key => Array.isArray((response.data as any)[key]));
              if (arrayProps.length > 0) {
                notifications = (response.data as any)[arrayProps[0]];
                console.log(`✅ Found notification array in property '${arrayProps[0]}':`, notifications.length, 'items');
              }
            }
            
            // Update local state untuk page 1 (fresh load)
            if (page === 1) {
              this.notificationsSubject.next(notifications);
            }
            return notifications;
          }
          console.log('❌ No notification data in response');
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
   * ✅ REAL: Get notification summary menggunakan stats endpoint
   * Endpoint: GET /api/notifications/stats  
   */
  getNotificationSummary(): Observable<NotificationSummaryDto> {
    console.log('🔔 Getting notification summary from:', `${this.apiUrl}/stats`);
    
    return this.http.get<ApiResponse<{
      total: number,
      unread: number,
      byType: any,
      bySeverity: any,
      byPriority: any,
      actionRequired: number,
      archived: number,
      trends: any[]
    }>>(`${this.apiUrl}/stats`)
      .pipe(
        map(response => {
          console.log('🔔 Stats API Response:', response);
          if (response.success && response.data) {
            const summary: NotificationSummaryDto = {
              totalCount: response.data.total || 0,
              unreadCount: response.data.unread || 0,
              recentNotifications: [],
              lastUpdated: new Date().toISOString()
            };
            
            console.log('✅ Parsed summary:', summary);
            this.summarySubject.next(summary);
            this.unreadCountSubject.next(summary.unreadCount);
            return summary;
          }
          console.log('❌ Stats API failed or no data');
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
   * Get notifications from all branches (bypasses branch filtering)
   */
  getAllBranchNotifications(
    page: number = 1, 
    pageSize: number = 20, 
    isRead?: boolean,
    type?: string,
    priority?: string,
    severity?: string
  ): Observable<NotificationDto[]> {
    return this.getUserNotifications(page, pageSize, isRead, type, priority, severity, true);
  }

  /**
   * ✅ REAL: Mark notification as read
   * Endpoint: PUT /api/notifications/{id}/mark-read
   */
  markAsRead(notificationId: number): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${notificationId}/mark-read`, {})
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
          return of(false);
        })
      );
  }

  /**
   * ✅ REAL: Mark all notifications as read
   * Endpoint: PUT /api/notifications/mark-all-read
   */
  markAllAsRead(): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/mark-all-read`, {})
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
          return of(false);
        })
      );
  }

  /**
   * ✅ REAL: Create new notification (admin only)
   * Endpoint: POST /api/notifications
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
   * Endpoint: DELETE /api/notifications/{id}
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
   * ✅ ENHANCED: Initialize real-time updates via ultra-fast polling
   * Poll backend setiap 2 detik untuk real-time updates yang sangat responsif
   */
  private initializeRealTimeUpdates(): void {
    console.log('🚀 Starting REAL-TIME notification polling every 2 seconds...');
    
    // Ultra-fast polling every 2 seconds for truly real-time updates
    timer(0, 2000)
      .pipe(
        switchMap(() => {
          // Only poll if user is authenticated
          if (!this.authService.isAuthenticated()) {
            return of(0);
          }
          
          // Get both count and latest notifications in one go
          return this.getCombinedNotificationSummary().pipe(
            map(summary => summary.unreadCount),
            catchError((error) => {
              console.warn('⚠️ Polling error, will retry in next cycle:', error);
              return of(this.unreadCountSubject.value);
            })
          );
        })
      )
      .subscribe({
        next: (count: number) => {
          const previousCount = this.unreadCountSubject.value;
          
          console.log(`🔔 Polling result: ${count} notifications (was ${previousCount})`);
          
          // Show toasts for new notifications - IMMEDIATE
          if (count > previousCount && previousCount >= 0) {
            const newNotifications = count - previousCount;
            console.log(`🆕 ${newNotifications} NEW notifications detected!`);
            
            // Force refresh to get notification details and show toasts
            this.refreshNotificationsInBackground();
            
            // Also show general alert
            this.showNewNotificationAlert(newNotifications);
          }
        },
        error: (error) => {
          console.error('❌ Real-time polling failed:', error);
        }
      });
  }

  /**
   * ✅ NEW: Background refresh without affecting UI loading states (includes smart notifications)
   */
  private refreshNotificationsInBackground(): void {
    this.getCombinedNotifications(1, 20).subscribe({
      next: (notifications) => {
        const previousNotifications = this.notificationsSubject.value;
        this.notificationsSubject.next(notifications);
        
        // Show toast for new notifications (compare with previous)
        if (previousNotifications.length > 0) {
          const newNotifications = notifications.filter(notification => 
            !previousNotifications.some(prev => prev.id === notification.id)
          );
          
          // Show toast for each new notification
          newNotifications.forEach(notification => {
            this.showNotificationToast(notification);
          });
        }
        
        console.log('🔄 Background refresh completed:', notifications.length, 'notifications (including smart)');
      },
      error: (error) => {
        console.warn('Background notification refresh failed:', error);
        // Fallback to regular notifications only
        this.getUserNotifications(1, 20).subscribe();
      }
    });
    
    // Also refresh smart notifications independently
    this.refreshSmartNotifications();
  }

  /**
   * ✅ NEW: Force immediate refresh from external components
   */
  public forceRefresh(): Observable<void> {
    console.log('🚀 Force refreshing notifications immediately...');
    
    // Trigger immediate poll without waiting for next cycle
    return this.getNotificationSummary().pipe(
      tap((summary) => {
        if (summary.recentNotifications) {
          this.notificationsSubject.next(summary.recentNotifications);
        }
        console.log('✅ Force refresh completed');
      }),
      map(() => void 0),
      catchError((error) => {
        console.error('❌ Force refresh failed:', error);
        return of(void 0);
      })
    );
  }

  /**
   * Create notification after successful transaction
   */
  createTransactionNotification(transactionData: any): Observable<NotificationDto> {
    console.log('💰 Creating transaction notification:', transactionData);
    
    const notification: CreateNotificationRequest = {
      title: `Transaksi Berhasil - Rp ${transactionData.totalAmount?.toLocaleString('id-ID') || '0'}`,
      message: `Transaksi ${transactionData.transactionId || 'T' + Date.now()} telah berhasil diproses. Total: Rp ${transactionData.totalAmount?.toLocaleString('id-ID') || '0'}`,
      type: 'SALE_COMPLETED',
      priority: 'Normal',
      actionUrl: transactionData.receiptUrl || `/pos/transactions/${transactionData.transactionId}`,
      actionText: 'Lihat Struk',
      userId: transactionData.userId
    };
    
    return this.createNotification(notification).pipe(
      tap((createdNotification) => {
        console.log('✅ Transaction notification created:', createdNotification);
        // Immediately refresh to show the new notification
        this.refreshNotificationsInBackground();
      })
    );
  }

  /**
   * Create notification for low stock alerts
   */
  createLowStockNotification(productData: any): Observable<NotificationDto> {
    console.log('📦 Creating low stock notification:', productData);
    
    const notification: CreateNotificationRequest = {
      title: `Stok Menipis - ${productData.productName}`,
      message: `Produk ${productData.productName} tersisa ${productData.currentStock} unit. Segera lakukan restocking.`,
      type: 'LOW_STOCK',
      priority: productData.currentStock <= 5 ? 'High' : 'Normal',
      actionUrl: `/inventory/products/${productData.productId}`,
      actionText: 'Kelola Stok'
    };
    
    return this.createNotification(notification);
  }

  /**
   * Auto-trigger notifications based on app events
   */
  handleAppEvent(eventType: string, eventData: any): void {
    console.log('🔔 Handling app event:', eventType, eventData);
    
    switch (eventType) {
      case 'transaction_completed':
        this.createTransactionNotification(eventData).subscribe();
        break;
      case 'low_stock_detected':
        this.createLowStockNotification(eventData).subscribe();
        break;
      case 'user_login':
        this.createNotification({
          title: 'Selamat Datang',
          message: `Selamat datang kembali, ${eventData.userName}!`,
          type: 'USER_LOGIN',
          priority: 'Low'
        }).subscribe();
        break;
      default:
        console.log('⚠️ Unhandled event type:', eventType);
    }
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

  /**
   * ✅ NEW: Instant refresh without loading indicator (for background updates)
   */
  public refreshInstantly(): Observable<void> {
    console.log('⚡ Instant notification refresh triggered');
    return this.getNotificationSummary().pipe(
      tap((summary) => {
        if (summary.recentNotifications) {
          this.notificationsSubject.next(summary.recentNotifications);
        }
        this.errorSubject.next(null);
        console.log('⚡ Instant refresh completed');
      }),
      map(() => void 0),
      catchError((error) => {
        console.warn('⚡ Instant refresh failed, using silent fallback:', error);
        return of(void 0); // Silent fail for background refresh
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

  /**
   * ✅ ENHANCED: Show toast popup for individual notifications (REAL TOASTS)
   */
  private showNotificationToast(notification: NotificationDto): void {
    // Only show toast for unread notifications to avoid spam
    if (notification.isRead) return;
    
    console.log('🍞 Showing REAL toast for notification:', notification.title);
    
    // Determine action URL for the notification
    let actionUrl = notification.actionUrl;
    if (!actionUrl) {
      // Try to generate action URL based on notification type and content
      const transactionId = this.extractTransactionId(notification);
      if (transactionId) {
        actionUrl = `/dashboard/pos/transaction/${transactionId}`;
      } else {
        actionUrl = '/dashboard/notifications';
      }
    }

    // Special handling for low stock notifications
    if (this.isLowStockNotification(notification)) {
      // Extract product info for low stock toast
      const productInfo = this.extractLowStockInfo(notification);
      if (productInfo) {
        console.log('🍞 Showing low stock toast:', productInfo);
        this.toastService.showLowStock(
          productInfo.productName,
          productInfo.currentStock,
          productInfo.minStock
        );
        return;
      }
    }
    
    // Map notification type to toast type
    const toastType = this.mapNotificationTypeToToastType(notification.type);
    
    // Show appropriate toast based on type
    switch (toastType) {
      case 'success':
        console.log('🍞 Showing success toast:', notification.title);
        this.toastService.showSuccess(
          notification.title,
          notification.message,
          'Lihat Detail',
          actionUrl
        );
        break;
        
      case 'warning':
        console.log('🍞 Showing warning toast:', notification.title);
        this.toastService.showWarning(
          notification.title,
          notification.message,
          'Lihat Detail',
          actionUrl
        );
        break;
        
      case 'error':
        console.log('🍞 Showing error toast:', notification.title);
        this.toastService.showError(
          notification.title,
          notification.message,
          'Lihat Detail',
          actionUrl
        );
        break;
        
      default: // 'info'
        console.log('🍞 Showing info toast:', notification.title);
        this.toastService.showInfo(
          notification.title,
          notification.message,
          'Lihat Detail',
          actionUrl
        );
        break;
    }
  }

  /**
   * ✅ NEW: Map notification type to toast type
   */
  private mapNotificationTypeToToastType(type: string): 'success' | 'info' | 'warning' | 'error' {
    const typeLower = type.toLowerCase();
    
    if (typeLower.includes('success') || typeLower.includes('complete') || typeLower.includes('berhasil')) {
      return 'success';
    } else if (typeLower.includes('error') || typeLower.includes('failed') || typeLower.includes('gagal')) {
      return 'error';
    } else if (typeLower.includes('warning') || typeLower.includes('low') || typeLower.includes('stock') || typeLower.includes('peringatan')) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  /**
   * ✅ NEW: Check if notification is about low stock
   */
  private isLowStockNotification(notification: NotificationDto): boolean {
    const lowStockKeywords = ['low stock', 'stok menipis', 'stock rendah', 'minimum stock', 'low_stock'];
    const content = (notification.title + ' ' + notification.message + ' ' + notification.type).toLowerCase();
    return lowStockKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * ✅ NEW: Extract low stock information from notification
   */
  private extractLowStockInfo(notification: NotificationDto): { productName: string, currentStock: number, minStock: number } | null {
    try {
      // Try to extract product name and stock info from message
      // Pattern: "Product ABC stock is 2, minimum is 5"
      const stockPattern = /(.+?)\s*(?:stock|stok)\s*(?:is|tersisa|ada)?\s*(\d+).*?(?:minimum|min)\s*(?:is|adalah)?\s*(\d+)/i;
      const match = notification.message.match(stockPattern);
      
      if (match) {
        return {
          productName: match[1].trim(),
          currentStock: parseInt(match[2]),
          minStock: parseInt(match[3])
        };
      }

      // Alternative pattern: "ABC: 2/5 units" (current/min)
      const altPattern = /(.+?):\s*(\d+)\/(\d+)/i;
      const altMatch = notification.message.match(altPattern);
      
      if (altMatch) {
        return {
          productName: altMatch[1].trim(),
          currentStock: parseInt(altMatch[2]),
          minStock: parseInt(altMatch[3])
        };
      }

      // Fallback: extract any product name and use generic numbers
      const productPattern = /(?:produk|product)\s+(.+?)(?:\s|$)/i;
      const productMatch = notification.message.match(productPattern);
      
      if (productMatch) {
        return {
          productName: productMatch[1].trim(),
          currentStock: 0,
          minStock: 5
        };
      }

      return null;
    } catch (error) {
      console.warn('Error extracting low stock info:', error);
      return null;
    }
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

  /**
   * Show success message via snackbar
   */
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-success']
    });
  }

  /**
   * Show error message via snackbar
   */
  showError(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-error']
    });
  }

  /**
   * Show warning message via snackbar
   */
  showWarning(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-warning']
    });
  }

  /**
   * Show info message via snackbar
   */
  showInfo(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['snackbar-info']
    });
  }

  // ===== SMART NOTIFICATIONS INTEGRATION ===== //

  /**
   * Get combined notifications (regular + smart)
   */
  getCombinedNotifications(
    page: number = 1, 
    pageSize: number = 20, 
    isRead?: boolean,
    type?: string,
    priority?: string,
    severity?: string,
    branchId?: number
  ): Observable<NotificationDto[]> {
    console.log('🔔 Getting combined notifications (regular + smart)');
    
    return combineLatest([
      this.getAllBranchNotifications(page, pageSize, isRead, type, priority, severity),
      this.smartNotificationApi.getIntelligentNotifications(branchId)
    ]).pipe(
      map(([regularNotifications, smartNotifications]) => {
        console.log('🔔 Regular notifications:', regularNotifications.length);
        console.log('🤖 Smart notifications:', smartNotifications.length);
        
        // Convert smart notifications to standard format
        const convertedSmartNotifications = this.smartNotificationApi.convertToStandardNotifications(smartNotifications);
        
        // Combine and sort by creation date (newest first)
        const combined = [...regularNotifications, ...convertedSmartNotifications];
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        console.log('🔔 Combined notifications total:', combined.length);
        return combined.slice(0, pageSize); // Limit to pageSize
      }),
      catchError(error => {
        console.error('❌ Error getting combined notifications:', error);
        // Fallback to regular notifications only
        return this.getAllBranchNotifications(page, pageSize, isRead, type, priority, severity);
      })
    );
  }

  /**
   * Get combined notification summary (regular + smart)
   */
  getCombinedNotificationSummary(branchId?: number): Observable<NotificationSummaryDto> {
    console.log('🔔 Getting combined notification summary');
    
    return combineLatest([
      this.getNotificationSummary(),
      this.smartNotificationApi.getIntelligentNotifications(branchId),
      this.smartNotificationApi.getSystemHealth()
    ]).pipe(
      map(([regularSummary, smartNotifications, systemHealth]) => {
        const smartUnreadCount = smartNotifications.length;
        const combinedSummary: NotificationSummaryDto = {
          totalCount: regularSummary.totalCount + smartNotifications.length,
          unreadCount: regularSummary.unreadCount + smartUnreadCount,
          recentNotifications: [
            ...regularSummary.recentNotifications,
            ...this.smartNotificationApi.convertToStandardNotifications(smartNotifications).slice(0, 5)
          ].slice(0, 10), // Limit to 10 most recent
          lastUpdated: new Date().toISOString()
        };
        
        console.log('🔔 Combined summary:', combinedSummary);
        
        // Update the main summary subject with combined data
        this.summarySubject.next(combinedSummary);
        this.unreadCountSubject.next(combinedSummary.unreadCount);
        
        return combinedSummary;
      }),
      catchError(error => {
        console.error('❌ Error getting combined summary:', error);
        // Fallback to regular summary only
        return this.getNotificationSummary();
      })
    );
  }

  /**
   * Refresh smart notifications
   */
  refreshSmartNotifications(branchId?: number): void {
    console.log('🤖 Refreshing smart notifications...');
    this.smartNotificationApi.refreshAll(branchId);
  }

  /**
   * Get system health data
   */
  getSystemHealth(): Observable<any> {
    return this.smartNotificationApi.getSystemHealth();
  }

  /**
   * Trigger critical expiry alerts
   */
  triggerCriticalExpiryAlerts(): Observable<boolean> {
    return this.smartNotificationApi.triggerCriticalExpiryAlerts();
  }
}