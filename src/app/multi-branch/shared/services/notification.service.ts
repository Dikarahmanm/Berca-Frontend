import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MockNotificationBackendService } from './mock-notification-backend.service';

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

@Injectable({
  providedIn: 'root'
})
export class MultiBranchNotificationService {
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

  constructor(private mockBackend: MockNotificationBackendService) {
    this.initializeNotificationSystem();
    this.startMockNotificationStream();
  }

  private initializeNotificationSystem() {
    // Load initial notifications from mock backend
    this.mockBackend.getNotifications().subscribe({
      next: (notifications) => {
        this._notifications.set(notifications);
        this._isConnected.set(true);
        this._lastUpdate.set(new Date().toISOString());
      },
      error: (error) => {
        console.error('Failed to load initial notifications:', error);
        this._notifications.set([]);
        this._isConnected.set(false);
      }
    });
  }

  private startMockNotificationStream() {
    // Subscribe to mock backend's real-time notification stream
    this.mockBackend.subscribeToRealTimeUpdates().subscribe({
      next: (notification) => {
        this.addNotification(notification);
      },
      error: (error) => {
        console.error('Real-time notification stream error:', error);
        this._isConnected.set(false);
      }
    });
    
    // Update connection status periodically
    interval(10000).subscribe(() => {
      this._lastUpdate.set(new Date().toISOString());
    });
  }


  // Public methods
  addNotification(notification: MultiBranchNotification) {
    const current = this._notifications();
    this._notifications.set([notification, ...current]);
    this._lastUpdate.set(new Date().toISOString());
    
    // Trigger browser notification if supported
    this.showBrowserNotification(notification);
  }

  markAsRead(notificationId: string) {
    this.mockBackend.updateNotification(notificationId, { isRead: true }).subscribe({
      next: (success) => {
        if (success) {
          const current = this._notifications();
          const updated = current.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          );
          this._notifications.set(updated);
          this._lastUpdate.set(new Date().toISOString());
        }
      },
      error: (error) => console.error('Failed to mark notification as read:', error)
    });
  }

  markAllAsRead() {
    this.mockBackend.markAllAsRead().subscribe({
      next: (success) => {
        if (success) {
          const current = this._notifications();
          const updated = current.map(n => ({ ...n, isRead: true }));
          this._notifications.set(updated);
          this._lastUpdate.set(new Date().toISOString());
        }
      },
      error: (error) => console.error('Failed to mark all notifications as read:', error)
    });
  }

  archiveNotification(notificationId: string) {
    this.mockBackend.updateNotification(notificationId, { isArchived: true }).subscribe({
      next: (success) => {
        if (success) {
          const current = this._notifications();
          const updated = current.map(n => 
            n.id === notificationId ? { ...n, isArchived: true, isRead: true } : n
          );
          this._notifications.set(updated);
          this._lastUpdate.set(new Date().toISOString());
        }
      },
      error: (error) => console.error('Failed to archive notification:', error)
    });
  }

  deleteNotification(notificationId: string) {
    this.mockBackend.deleteNotification(notificationId).subscribe({
      next: (success) => {
        if (success) {
          const current = this._notifications();
          const updated = current.filter(n => n.id !== notificationId);
          this._notifications.set(updated);
          this._lastUpdate.set(new Date().toISOString());
        }
      },
      error: (error) => console.error('Failed to delete notification:', error)
    });
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