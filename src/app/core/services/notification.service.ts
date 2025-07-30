// src/app/core/services/notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { tap, catchError, switchMap, filter } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { ApiResponse } from './user-profile.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface Notification {
  id: number;
  userId?: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: any;
}

export interface NotificationSummary {
  totalCount: number;
  unreadCount: number;
  lowStockCount: number;
  systemCount: number;
  salesCount: number;
  lastUpdated: Date;
}

export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  userId?: number;
  expiresAt?: Date;
  metadata?: any;
}

export type NotificationType = 
  | 'LOW_STOCK' 
  | 'MONTHLY_REVENUE' 
  | 'INVENTORY_AUDIT' 
  | 'SYSTEM_MAINTENANCE'
  | 'SALE_COMPLETED'
  | 'USER_LOGIN'
  | 'BACKUP_COMPLETED'
  | 'CUSTOM';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/Notification`;
  
  // Notification state
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private summarySubject = new BehaviorSubject<NotificationSummary>({
    totalCount: 0,
    unreadCount: 0,
    lowStockCount: 0,
    systemCount: 0,
    salesCount: 0,
    lastUpdated: new Date()
  });

  // UI state
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Polling interval for real-time updates
  private pollingInterval = 30000; // 30 seconds
  private pollingSubscription: any;

  // Public observables
  public notifications$ = this.notificationsSubject.asObservable();
  public summary$ = this.summarySubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.startPolling();
  }

  // ===== CORE OPERATIONS =====

  /**
   * Get user notifications with pagination
   */
  getUserNotifications(
    isRead?: boolean, 
    page: number = 1, 
    pageSize: number = 20
  ): Observable<ApiResponse<Notification[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (isRead !== undefined) {
      params = params.set('isRead', isRead.toString());
    }

    return this.http.get<ApiResponse<Notification[]>>(`${this.apiUrl}/user`, { params })
      .pipe(
        tap(response => {
          if (response.success && page === 1) {
            // Only update state for first page
            this.notificationsSubject.next(response.data || []);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get notification summary
   */
  getNotificationSummary(): Observable<ApiResponse<NotificationSummary>> {
    return this.http.get<ApiResponse<NotificationSummary>>(`${this.apiUrl}/summary`)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.summarySubject.next(response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${notificationId}/read`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            this.updateNotificationInState(notificationId, { isRead: true });
            this.refreshSummary();
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/read-all`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            const currentNotifications = this.notificationsSubject.value;
            const updatedNotifications = currentNotifications.map(n => ({ ...n, isRead: true }));
            this.notificationsSubject.next(updatedNotifications);
            this.refreshSummary();
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${notificationId}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.removeNotificationFromState(notificationId);
            this.refreshSummary();
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Create notification (admin only)
   */
  createNotification(request: CreateNotificationRequest): Observable<ApiResponse<Notification>> {
    return this.http.post<ApiResponse<Notification>>(`${this.apiUrl}`, request)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.addNotificationToState(response.data);
            this.refreshSummary();
          }
        }),
        catchError(this.handleError)
      );
  }

  // ===== REAL-TIME UPDATES =====

  /**
   * Start polling for new notifications
   */
  startPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }

    this.pollingSubscription = interval(this.pollingInterval)
      .pipe(
        switchMap(() => this.getNotificationSummary()),
        filter(response => response.success)
      )
      .subscribe({
        next: () => {
          // Summary is already updated in the tap operator
          this.checkForNewNotifications();
        },
        error: (error) => {
          console.error('Polling error:', error);
        }
      });

    // Initial load
    this.refreshNotifications();
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  /**
   * Check for new notifications
   */
  private checkForNewNotifications(): void {
    const currentSummary = this.summarySubject.value;
    const lastKnownCount = this.getStoredNotificationCount();

    if (currentSummary.totalCount > lastKnownCount) {
      // New notifications detected
      this.refreshNotifications();
      this.showNewNotificationAlert(currentSummary.totalCount - lastKnownCount);
    }

    this.storeNotificationCount(currentSummary.totalCount);
  }

  /**
   * Show alert for new notifications
   */
  private showNewNotificationAlert(count: number): void {
    const message = count === 1 
      ? '1 notifikasi baru' 
      : `${count} notifikasi baru`;
    
    this.snackBar.open(message, 'Lihat', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // ===== STATE MANAGEMENT =====

  /**
   * Update notification in local state
   */
  private updateNotificationInState(id: number, updates: Partial<Notification>): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification =>
      notification.id === id ? { ...notification, ...updates } : notification
    );
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * Add notification to local state
   */
  private addNotificationToState(notification: Notification): void {
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
   * Refresh notifications from server
   */
  refreshNotifications(): void {
    this.isLoadingSubject.next(true);
    this.getUserNotifications().subscribe({
      next: () => {
        this.isLoadingSubject.next(false);
        this.errorSubject.next(null);
      },
      error: (error) => {
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Failed to load notifications');
      }
    });
  }

  /**
   * Refresh summary from server
   */
  refreshSummary(): void {
    this.getNotificationSummary().subscribe();
  }

  // ===== UTILITY METHODS =====

  /**
   * Get current notifications
   */
  getCurrentNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  /**
   * Get current summary
   */
  getCurrentSummary(): NotificationSummary {
    return this.summarySubject.value;
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.summarySubject.value.unreadCount;
  }

  /**
   * Filter notifications by type
   */
  getNotificationsByType(type: NotificationType): Notification[] {
    return this.notificationsSubject.value.filter(n => n.type === type);
  }

  /**
   * Filter notifications by priority
   */
  getNotificationsByPriority(priority: NotificationPriority): Notification[] {
    return this.notificationsSubject.value.filter(n => n.priority === priority);
  }

  /**
   * Get notification icon by type
   */
  getNotificationIcon(type: NotificationType): string {
    const icons: { [key in NotificationType]: string } = {
      'LOW_STOCK': 'inventory_2',
      'MONTHLY_REVENUE': 'trending_up',
      'INVENTORY_AUDIT': 'fact_check',
      'SYSTEM_MAINTENANCE': 'build',
      'SALE_COMPLETED': 'point_of_sale',
      'USER_LOGIN': 'person',
      'BACKUP_COMPLETED': 'backup',
      'CUSTOM': 'notifications'
    };
    return icons[type] || 'notifications';
  }

  /**
   * Get notification color by priority
   */
  getNotificationColor(priority: NotificationPriority): string {
    const colors: { [key in NotificationPriority]: string } = {
      'LOW': '#4BBF7B',
      'MEDIUM': '#FFB84D',
      'HIGH': '#FF914D',
      'URGENT': '#E15A4F'
    };
    return colors[priority];
  }

  /**
   * Format notification time
   */
  formatNotificationTime(date: Date | string): string {
    const notificationDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return notificationDate.toLocaleDateString('id-ID');
  }

  /**
   * Check if notification is expired
   */
  isNotificationExpired(notification: Notification): boolean {
    if (!notification.expiresAt) return false;
    return new Date(notification.expiresAt) < new Date();
  }

  // ===== LOCAL STORAGE =====

  /**
   * Store notification count in localStorage
   */
  private storeNotificationCount(count: number): void {
    try {
      localStorage.setItem('notification_count', count.toString());
    } catch (error) {
      console.error('Error storing notification count:', error);
    }
  }

  /**
   * Get stored notification count
   */
  private getStoredNotificationCount(): number {
    try {
      const stored = localStorage.getItem('notification_count');
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Error getting stored notification count:', error);
      return 0;
    }
  }

  // ===== HELPER FUNCTIONS FOR SPECIFIC NOTIFICATIONS =====

  /**
   * Create low stock notification
   */
  createLowStockNotification(productName: string, currentStock: number, minStock: number): void {
    const request: CreateNotificationRequest = {
      type: 'LOW_STOCK',
      title: 'Stok Menipis',
      message: `${productName} tersisa ${currentStock} unit (minimum: ${minStock})`,
      priority: currentStock === 0 ? 'URGENT' : 'HIGH',
      actionUrl: '/inventory',
      metadata: { productName, currentStock, minStock }
    };

    this.createNotification(request).subscribe({
      error: (error) => console.error('Error creating low stock notification:', error)
    });
  }

  /**
   * Create system maintenance notification
   */
  createSystemMaintenanceNotification(scheduledTime: Date, message: string): void {
    const request: CreateNotificationRequest = {
      type: 'SYSTEM_MAINTENANCE',
      title: 'Pemeliharaan Sistem',
      message: `Sistem akan dipelihara pada ${scheduledTime.toLocaleString('id-ID')}. ${message}`,
      priority: 'MEDIUM',
      expiresAt: scheduledTime,
      metadata: { scheduledTime: scheduledTime.toISOString(), message }
    };

    this.createNotification(request).subscribe({
      error: (error) => console.error('Error creating maintenance notification:', error)
    });
  }

  // ===== ERROR HANDLING =====

  private handleError = (error: any): Observable<never> => {
    console.error('Notification Service Error:', error);
    
    let errorMessage = 'Terjadi kesalahan pada sistem notifikasi';
    
    if (error.status === 401) {
      errorMessage = 'Anda tidak memiliki akses untuk melihat notifikasi';
    } else if (error.status === 403) {
      errorMessage = 'Akses ditolak';
    } else if (error.status === 0) {
      errorMessage = 'Tidak dapat terhubung ke server';
    }

    this.errorSubject.next(errorMessage);
    throw error;
  };

  // ===== CLEANUP =====

  ngOnDestroy(): void {
    this.stopPolling();
  }
}