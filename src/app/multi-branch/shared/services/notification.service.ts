import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { map, startWith, catchError } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environment/environment';

export interface MultiBranchNotification {
  id: string;
  type: 'system' | 'transfer' | 'alert' | 'user' | 'branch' | 'coordination';
  severity: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  branchId?: number;
  branchName?: string;
  userId?: number;
  userName?: string;
  timestamp: string;
  createdAt: string;
  isRead: boolean;
  isArchived: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  type?: string;
  severity?: string;
  branchId?: number;
  isRead?: boolean;
  actionRequired?: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  actionRequired: number;
}

// API Response interfaces matching the real backend
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  errors?: any;
  error?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MultiBranchNotificationService {
  private readonly baseUrl = `${environment.apiUrl}/notifications`;
  
  // Internal state
  private readonly _notifications = signal<MultiBranchNotification[]>([]);
  private readonly _isConnected = signal<boolean>(false);
  private readonly _lastUpdate = signal<string>(new Date().toISOString());
  
  // WebSocket or real-time connection simulation
  private connectionSubject = new BehaviorSubject<boolean>(false);
  private notificationQueue: MultiBranchNotification[] = [];
  
  // Public readonly signals
  notifications = this._notifications.asReadonly();
  isConnected = this._isConnected.asReadonly();
  lastUpdate = this._lastUpdate.asReadonly();
  
  // Computed properties
  unreadNotifications = computed(() => {
    return this._notifications().filter(n => !n.isRead && !n.isArchived);
  });
  
  urgentNotifications = computed(() => {
    return this._notifications().filter(n => 
      !n.isRead && 
      !n.isArchived && 
      (n.severity === 'error' || n.actionRequired)
    );
  });
  
  recentNotifications = computed(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return this._notifications()
      .filter(n => new Date(n.timestamp) > oneHourAgo)
      .slice(0, 10);
  });
  
  notificationStats = computed(() => {
    const notifications = this._notifications();
    const stats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {},
      bySeverity: {},
      actionRequired: notifications.filter(n => n.actionRequired && !n.isRead).length
    };
    
    // Count by type
    notifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      stats.bySeverity[n.severity] = (stats.bySeverity[n.severity] || 0) + 1;
    });
    
    return stats;
  });

  constructor(private http: HttpClient) {
    this.initializeNotificationSystem();
    this.startRealTimeStream();
  }

  private initializeNotificationSystem() {
    // Load initial notifications from real API
    this.getNotifications().subscribe({
      next: (notifications) => {
        this._notifications.set(notifications);
        this._isConnected.set(true);
        this._lastUpdate.set(new Date().toISOString());
        console.log('✅ Multi-branch notifications loaded from real API:', notifications.length);
      },
      error: (error) => {
        console.error('❌ Failed to load multi-branch notifications:', error);
        this._notifications.set([]);
        this._isConnected.set(false);
      }
    });
  }

  private startRealTimeStream() {
    // TODO: Implement SignalR real-time connection
    // For now, use periodic polling
    interval(30000).subscribe(() => {
      this.refreshNotifications();
    });
    
    // Update connection status periodically
    interval(10000).subscribe(() => {
      this._lastUpdate.set(new Date().toISOString());
    });
  }


  // ===== HELPER METHODS =====
  
  /**
   * Map notification type to MultiBranchNotification type
   */
  private mapNotificationType(type: string): MultiBranchNotification['type'] {
    const typeMap: Record<string, MultiBranchNotification['type']> = {
      'alert': 'alert',
      'system': 'system',
      'transfer': 'transfer',
      'user': 'user',
      'branch': 'branch',
      'coordination': 'coordination',
      'facture-overdue': 'system',
      'daily-credit-summary': 'system',
      'BatchExpiry': 'alert',
      'SALE_COMPLETED': 'system',
      'sales': 'system'
    };
    
    return typeMap[type] || 'system';
  }
  
  /**
   * Map severity to MultiBranchNotification severity
   */
  private mapSeverity(severity: string): MultiBranchNotification['severity'] {
    const severityMap: Record<string, MultiBranchNotification['severity']> = {
      'info': 'info',
      'warning': 'warning',
      'error': 'error',
      'success': 'success'
    };
    
    return severityMap[severity] || 'info';
  }
  
  /**
   * Map priority to MultiBranchNotification priority
   */
  private mapPriority(priority: string): MultiBranchNotification['priority'] {
    const priorityMap: Record<string, MultiBranchNotification['priority']> = {
      'low': 'low',
      'normal': 'medium',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical'
    };
    
    return priorityMap[priority?.toLowerCase()] || 'medium';
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get notifications with filtering (Real API)
   */
  getNotifications(filters?: NotificationFilters): Observable<MultiBranchNotification[]> {
    let params = new HttpParams();
    
    if (filters) {
      // Map filters to API parameters
      if (filters.type) params = params.set('Type', filters.type);
      if (filters.severity) params = params.set('Severity', filters.severity);
      if (filters.branchId) params = params.set('BranchId', filters.branchId.toString());
      if (filters.isRead !== undefined) params = params.set('IsRead', filters.isRead.toString());
      if (filters.actionRequired !== undefined) params = params.set('ActionRequired', filters.actionRequired.toString());
    }

    return this.http.get<ApiResponse<{data: any[], totalCount: number}>>(
      this.baseUrl, 
      { params, withCredentials: true }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        
        // Convert unified notifications to MultiBranchNotification format
        const notifications: MultiBranchNotification[] = response.data.data.map(notification => ({
          id: notification.id.toString(),
          type: this.mapNotificationType(notification.type),
          severity: this.mapSeverity(notification.severity),
          priority: this.mapPriority(notification.priority),
          title: notification.title,
          message: notification.message,
          branchId: notification.branchId,
          branchName: notification.branchName,
          userId: notification.userId,
          userName: notification.userName,
          timestamp: notification.createdAt,
          createdAt: notification.createdAt,
          isRead: notification.isRead,
          isArchived: notification.isArchived,
          actionRequired: notification.actionRequired,
          actionUrl: notification.actionUrl,
          expiresAt: notification.expiresAt,
          metadata: notification.metadata
        }));
        
        return notifications;
      }),
      catchError(error => {
        console.error('Error fetching multi-branch notifications:', error);
        return of([]); // Return observable of empty array
      })
    );
  }

  /**
   * Create new notification (Real API)
   */
  createNotification(notification: Partial<MultiBranchNotification>): Observable<MultiBranchNotification> {
    const payload = {
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      branchId: notification.branchId,
      severity: notification.severity,
      actionRequired: notification.actionRequired,
      actionUrl: notification.actionUrl,
      expiresAt: notification.expiresAt
    };

    return this.http.post<ApiResponse<MultiBranchNotification>>(
      this.baseUrl,
      payload,
      { withCredentials: true }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Error creating notification:', error);
        throw error;
      })
    );
  }

  // Public methods
  addNotification(notification: MultiBranchNotification) {
    const current = this._notifications();
    this._notifications.set([notification, ...current]);
    this._lastUpdate.set(new Date().toISOString());
    
    // Trigger browser notification if supported
    this.showBrowserNotification(notification);
  }

  refreshNotifications(): void {
    this.getNotifications().subscribe({
      next: (notifications) => {
        this._notifications.set(notifications);
        this._lastUpdate.set(new Date().toISOString());
      },
      error: (error) => {
        console.error('Error refreshing notifications:', error);
      }
    });
  }

  markAsRead(notificationId: string): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.baseUrl}/${notificationId}/mark-read`,
      {},
      { withCredentials: true }
    ).pipe(
      map(response => {
        if (response.success) {
          // Update local state
          const current = this._notifications();
          const updated = current.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          );
          this._notifications.set(updated);
          this._lastUpdate.set(new Date().toISOString());
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('Failed to mark notification as read:', error);
        return of(false);
      })
    );
  }

  markAllAsRead(): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.baseUrl}/mark-all-read`,
      {},
      { withCredentials: true }
    ).pipe(
      map(response => {
        if (response.success) {
          // Update local state
          const current = this._notifications();
          const updated = current.map(n => ({ ...n, isRead: true }));
          this._notifications.set(updated);
          this._lastUpdate.set(new Date().toISOString());
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('Failed to mark all notifications as read:', error);
        return of(false);
      })
    );
  }

  archiveNotification(notificationId: string): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.baseUrl}/${notificationId}/archive`,
      {},
      { withCredentials: true }
    ).pipe(
      map(response => {
        if (response.success) {
          // Update local state
          const current = this._notifications();
          const updated = current.map(n => 
            n.id === notificationId ? { ...n, isArchived: true, isRead: true } : n
          );
          this._notifications.set(updated);
          this._lastUpdate.set(new Date().toISOString());
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('Failed to archive notification:', error);
        return of(false);
      })
    );
  }

  deleteNotification(notificationId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.baseUrl}/${notificationId}`,
      { withCredentials: true }
    ).pipe(
      map(response => {
        if (response.success) {
          // Update local state
          const current = this._notifications();
          const updated = current.filter(n => n.id !== notificationId);
          this._notifications.set(updated);
          this._lastUpdate.set(new Date().toISOString());
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('Failed to delete notification:', error);
        return of(false);
      })
    );
  }

  /**
   * Get notification statistics (Real API)
   */
  getNotificationStats(): Observable<NotificationStats> {
    return this.http.get<ApiResponse<any>>(
      `${this.baseUrl}/stats`,
      { withCredentials: true }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Error fetching notification stats:', error);
        return of({
          total: 0,
          unread: 0,
          byType: {},
          bySeverity: {},
          actionRequired: 0
        });
      })
    );
  }

  getFilteredNotifications(filters: NotificationFilters): MultiBranchNotification[] {
    let filtered = this._notifications();
    
    if (filters.type) {
      filtered = filtered.filter(n => n.type === filters.type);
    }
    
    if (filters.severity) {
      filtered = filtered.filter(n => n.severity === filters.severity);
    }
    
    if (filters.branchId) {
      filtered = filtered.filter(n => n.branchId === filters.branchId);
    }
    
    if (filters.isRead !== undefined) {
      filtered = filtered.filter(n => n.isRead === filters.isRead);
    }
    
    if (filters.actionRequired !== undefined) {
      filtered = filtered.filter(n => n.actionRequired === filters.actionRequired);
    }
    
    return filtered.filter(n => !n.isArchived);
  }

  clearExpiredNotifications() {
    const now = new Date();
    const current = this._notifications();
    const updated = current.filter(n => 
      !n.expiresAt || new Date(n.expiresAt) > now
    );
    
    if (updated.length !== current.length) {
      this._notifications.set(updated);
      this._lastUpdate.set(new Date().toISOString());
    }
  }

  // Browser notification support
  private async showBrowserNotification(notification: MultiBranchNotification) {
    if (!('Notification' in window) || Notification.permission === 'denied') {
      return;
    }
    
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }
    
    // Only show browser notifications for high-priority items
    if (notification.severity === 'error' || notification.actionRequired) {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.severity === 'error',
        data: {
          notificationId: notification.id,
          actionUrl: notification.actionUrl
        }
      });
      
      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };
      
      // Auto-close after 10 seconds for non-critical notifications
      if (notification.severity !== 'error') {
        setTimeout(() => browserNotification.close(), 10000);
      }
    }
  }

  // Connection management
  connect(): Observable<boolean> {
    // Simulate connection establishment
    setTimeout(() => {
      this._isConnected.set(true);
      this.connectionSubject.next(true);
    }, 1000);
    
    return this.connectionSubject.asObservable();
  }

  disconnect() {
    this._isConnected.set(false);
    this.connectionSubject.next(false);
  }

  // Utility methods
  getNotificationIcon(type: string, severity: string): string {
    if (severity === 'error') return 'icon-alert-circle';
    if (severity === 'warning') return 'icon-alert-triangle';
    if (severity === 'success') return 'icon-check-circle';
    
    const iconMap = {
      system: 'icon-settings',
      transfer: 'icon-arrow-right-left',
      alert: 'icon-bell',
      user: 'icon-user',
      branch: 'icon-git-branch',
      coordination: 'icon-git-merge'
    };
    
    return iconMap[type as keyof typeof iconMap] || 'icon-info';
  }

  getNotificationColor(severity: string): string {
    const colorMap = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      success: '#10b981'
    };
    
    return colorMap[severity as keyof typeof colorMap] || '#6b7280';
  }

  formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} days ago`;
    
    return date.toLocaleDateString();
  }
}