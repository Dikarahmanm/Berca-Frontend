// src/app/core/services/smart-notifications.service.ts
// ✅ SMART ANALYTICS INTEGRATION: SmartNotificationsService
// Following Project Guidelines: Signal-based, Performance Optimized, Type-safe

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environment/environment';

// ===== SMART NOTIFICATION INTERFACES =====
export interface SmartNotificationDto {
  id: number;
  type: 'EXPIRY_WARNING' | 'STOCK_LOW' | 'PRICE_ALERT' | 'TREND_ANALYSIS' | 'FIFO_RECOMMENDATION' | 'QUALITY_ISSUE';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isRead: boolean;
  isActionable: boolean;
  createdAt: string;
  updatedAt: string;
  expiryDate?: string;
  
  // Smart Analytics Properties
  confidenceScore?: number;
  potentialImpact?: number;
  recommendedAction?: string;
  actionDeadline?: string;
  
  // Related Entity Information
  productId?: number;
  productName?: string;
  batchId?: string;
  categoryId?: number;
  categoryName?: string;
  branchId?: number;
  branchName?: string;
  
  // Metadata
  metadata?: SmartNotificationMetadataDto;
  actions?: NotificationActionDto[];
}

export interface SmartNotificationMetadataDto {
  daysUntilExpiry?: number;
  currentStock?: number;
  minStockLevel?: number;
  potentialLoss?: number;
  discountSuggestion?: number;
  alternativeProducts?: string[];
  supplierInfo?: {
    id: number;
    name: string;
    leadTime: number;
  };
  trendData?: {
    direction: 'UP' | 'DOWN' | 'STABLE';
    changePercentage: number;
    comparisonPeriod: string;
  };
}

export interface NotificationActionDto {
  id: string;
  label: string;
  type: 'PRIMARY' | 'SECONDARY' | 'WARNING' | 'DANGER';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  confirmationRequired?: boolean;
  successMessage?: string;
}

export interface NotificationPreferencesDto {
  userId: number;
  enableSmartNotifications: boolean;
  enableExpiryWarnings: boolean;
  enableStockAlerts: boolean;
  enableTrendAnalysis: boolean;
  minPriorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  emailNotifications: boolean;
  webPushNotifications: boolean;
  categories: string[];
  branches: number[];
}

export interface NotificationStatsDto {
  totalNotifications: number;
  unreadCount: number;
  criticalCount: number;
  highPriorityCount: number;
  actionableCount: number;
  
  byType: {
    [key: string]: number;
  };
  
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  
  todayStats: {
    created: number;
    resolved: number;
    dismissed: number;
  };
}

export interface BulkNotificationActionDto {
  notificationIds: number[];
  action: 'MARK_READ' | 'MARK_UNREAD' | 'DELETE' | 'ARCHIVE';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class SmartNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/SmartNotification`;

  // ===== STATE SIGNALS =====
  private _notifications = signal<SmartNotificationDto[]>([]);
  private _preferences = signal<NotificationPreferencesDto | null>(null);
  private _stats = signal<NotificationStatsDto | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _lastUpdated = signal<Date | null>(null);

  // ===== PUBLIC READONLY SIGNALS =====
  readonly notifications = this._notifications.asReadonly();
  readonly preferences = this._preferences.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();

  // ===== COMPUTED PROPERTIES =====
  readonly unreadNotifications = computed(() =>
    this._notifications().filter(n => !n.isRead)
  );

  readonly criticalNotifications = computed(() =>
    this._notifications().filter(n => n.priority === 'CRITICAL')
  );

  readonly highPriorityNotifications = computed(() =>
    this._notifications().filter(n => n.priority === 'HIGH')
  );

  readonly actionableNotifications = computed(() =>
    this._notifications().filter(n => n.isActionable && !n.isRead)
  );

  readonly expiryWarnings = computed(() =>
    this._notifications().filter(n => n.type === 'EXPIRY_WARNING')
  );

  readonly fifoRecommendations = computed(() =>
    this._notifications().filter(n => n.type === 'FIFO_RECOMMENDATION')
  );

  readonly unreadCount = computed(() => this.unreadNotifications().length);

  readonly criticalCount = computed(() => this.criticalNotifications().length);

  readonly actionableCount = computed(() => this.actionableNotifications().length);

  readonly hasUrgentNotifications = computed(() => 
    this.criticalCount() > 0 || this.highPriorityNotifications().length > 0
  );

  readonly notificationsByType = computed(() => {
    const notifications = this._notifications();
    const grouped = new Map<string, SmartNotificationDto[]>();

    notifications.forEach(notification => {
      if (!grouped.has(notification.type)) {
        grouped.set(notification.type, []);
      }
      grouped.get(notification.type)!.push(notification);
    });

    return grouped;
  });

  readonly todaysNotifications = computed(() => {
    const today = new Date().toDateString();
    return this._notifications().filter(n => 
      new Date(n.createdAt).toDateString() === today
    );
  });

  readonly isDataStale = computed(() => {
    const lastUpdate = this._lastUpdated();
    if (!lastUpdate) return true;
    
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    return lastUpdate < twoMinutesAgo;
  });

  // ===== HTTP HEADERS =====
  private getHttpHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });
  }

  // ===== MAIN API METHODS =====

  /**
   * Get all smart notifications from /api/SmartNotification/list
   */
  async getSmartNotifications(params?: {
    unreadOnly?: boolean;
    priority?: string;
    type?: string;
    branchId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<SmartNotificationDto[]> {
    this._loading.set(true);
    this._error.set(null);

    try {
      let httpParams = new HttpParams();
      if (params?.unreadOnly) httpParams = httpParams.set('unreadOnly', 'true');
      if (params?.priority) httpParams = httpParams.set('priority', params.priority);
      if (params?.type) httpParams = httpParams.set('type', params.type);
      if (params?.branchId) httpParams = httpParams.set('branchId', params.branchId.toString());
      if (params?.page) httpParams = httpParams.set('page', params.page.toString());
      if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

      const response = await this.http.get<ApiResponse<SmartNotificationDto[]>>(
        `${this.baseUrl}/list`,
        {
          headers: this.getHttpHeaders(),
          params: httpParams,
          withCredentials: true
        }
      ).toPromise();

      if (response?.success && response.data) {
        this._notifications.set(response.data);
        this._lastUpdated.set(new Date());
        return response.data;
      } else {
        const errorMsg = response?.message || 'Failed to load smart notifications';
        this._error.set(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = this.handleError(error, 'Failed to load smart notifications');
      this._error.set(errorMsg);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get notification statistics from /api/SmartNotification/stats
   */
  async getNotificationStats(): Promise<NotificationStatsDto> {
    try {
      const response = await this.http.get<ApiResponse<NotificationStatsDto>>(
        `${this.baseUrl}/stats`,
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success && response.data) {
        this._stats.set(response.data);
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to load notification statistics');
      }
    } catch (error) {
      this.handleError(error, 'Failed to load notification statistics');
      throw error;
    }
  }

  /**
   * Get user notification preferences from /api/SmartNotification/preferences
   */
  async getNotificationPreferences(): Promise<NotificationPreferencesDto> {
    try {
      const response = await this.http.get<ApiResponse<NotificationPreferencesDto>>(
        `${this.baseUrl}/preferences`,
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success && response.data) {
        this._preferences.set(response.data);
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to load notification preferences');
      }
    } catch (error) {
      this.handleError(error, 'Failed to load notification preferences');
      throw error;
    }
  }

  /**
   * Update notification preferences via /api/SmartNotification/preferences
   */
  async updateNotificationPreferences(preferences: Partial<NotificationPreferencesDto>): Promise<boolean> {
    try {
      const response = await this.http.put<ApiResponse<boolean>>(
        `${this.baseUrl}/preferences`,
        preferences,
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success) {
        // Refresh preferences
        await this.getNotificationPreferences();
        return true;
      } else {
        throw new Error(response?.message || 'Failed to update notification preferences');
      }
    } catch (error) {
      this.handleError(error, 'Failed to update notification preferences');
      throw error;
    }
  }

  /**
   * Mark notification as read via /api/SmartNotification/{id}/mark-read
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      const response = await this.http.post<ApiResponse<boolean>>(
        `${this.baseUrl}/${notificationId}/mark-read`,
        {},
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success) {
        // Update local state
        this._notifications.update(notifications =>
          notifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        return true;
      } else {
        throw new Error(response?.message || 'Failed to mark notification as read');
      }
    } catch (error) {
      this.handleError(error, 'Failed to mark notification as read');
      throw error;
    }
  }

  /**
   * Mark notification as unread via /api/SmartNotification/{id}/mark-unread
   */
  async markAsUnread(notificationId: number): Promise<boolean> {
    try {
      const response = await this.http.post<ApiResponse<boolean>>(
        `${this.baseUrl}/${notificationId}/mark-unread`,
        {},
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success) {
        // Update local state
        this._notifications.update(notifications =>
          notifications.map(n => 
            n.id === notificationId ? { ...n, isRead: false } : n
          )
        );
        return true;
      } else {
        throw new Error(response?.message || 'Failed to mark notification as unread');
      }
    } catch (error) {
      this.handleError(error, 'Failed to mark notification as unread');
      throw error;
    }
  }

  /**
   * Delete notification via /api/SmartNotification/{id}
   */
  async deleteNotification(notificationId: number): Promise<boolean> {
    try {
      const response = await this.http.delete<ApiResponse<boolean>>(
        `${this.baseUrl}/${notificationId}`,
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success) {
        // Update local state
        this._notifications.update(notifications =>
          notifications.filter(n => n.id !== notificationId)
        );
        return true;
      } else {
        throw new Error(response?.message || 'Failed to delete notification');
      }
    } catch (error) {
      this.handleError(error, 'Failed to delete notification');
      throw error;
    }
  }

  /**
   * Execute bulk action on notifications via /api/SmartNotification/bulk-action
   */
  async bulkAction(action: BulkNotificationActionDto): Promise<boolean> {
    try {
      const response = await this.http.post<ApiResponse<boolean>>(
        `${this.baseUrl}/bulk-action`,
        action,
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success) {
        // Refresh notifications after bulk action
        await this.refreshNotifications();
        return true;
      } else {
        throw new Error(response?.message || 'Failed to execute bulk action');
      }
    } catch (error) {
      this.handleError(error, 'Failed to execute bulk action');
      throw error;
    }
  }

  /**
   * Execute notification action via /api/SmartNotification/{id}/execute-action
   */
  async executeNotificationAction(
    notificationId: number, 
    actionId: string, 
    payload?: any
  ): Promise<boolean> {
    try {
      const requestPayload = {
        actionId,
        payload: payload || {}
      };

      const response = await this.http.post<ApiResponse<boolean>>(
        `${this.baseUrl}/${notificationId}/execute-action`,
        requestPayload,
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success) {
        // Mark notification as read after successful action
        await this.markAsRead(notificationId);
        return true;
      } else {
        throw new Error(response?.message || 'Failed to execute notification action');
      }
    } catch (error) {
      this.handleError(error, 'Failed to execute notification action');
      throw error;
    }
  }

  /**
   * Dismiss notification via /api/SmartNotification/{id}/dismiss
   */
  async dismissNotification(notificationId: number): Promise<boolean> {
    try {
      const response = await this.http.post<ApiResponse<boolean>>(
        `${this.baseUrl}/${notificationId}/dismiss`,
        {},
        {
          headers: this.getHttpHeaders(),
          withCredentials: true
        }
      ).toPromise();

      if (response?.success) {
        // Remove from local state
        this._notifications.update(notifications =>
          notifications.filter(n => n.id !== notificationId)
        );
        return true;
      } else {
        throw new Error(response?.message || 'Failed to dismiss notification');
      }
    } catch (error) {
      this.handleError(error, 'Failed to dismiss notification');
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Refresh all notification data
   */
  async refreshNotifications(): Promise<void> {
    try {
      await Promise.all([
        this.getSmartNotifications(),
        this.getNotificationStats(),
        this.getNotificationPreferences()
      ]);
    } catch (error) {
      console.error('Error refreshing notification data:', error);
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this._notifications.set([]);
    this._preferences.set(null);
    this._stats.set(null);
    this._lastUpdated.set(null);
    this._error.set(null);
  }

  /**
   * Check if notifications should be refreshed
   */
  shouldRefreshNotifications(): boolean {
    return this.isDataStale();
  }

  /**
   * Get notifications for dashboard widgets
   */
  getDashboardSummary() {
    const stats = this._stats();
    
    return {
      unreadCount: this.unreadCount(),
      criticalCount: this.criticalCount(),
      actionableCount: this.actionableCount(),
      hasUrgentNotifications: this.hasUrgentNotifications(),
      todaysCount: this.todaysNotifications().length,
      recentCritical: this.criticalNotifications().slice(0, 3),
      recentActionable: this.actionableNotifications().slice(0, 5),
      isDataStale: this.isDataStale(),
      stats: stats
    };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    const unreadIds = this.unreadNotifications().map(n => n.id);
    
    if (unreadIds.length === 0) return true;

    return await this.bulkAction({
      notificationIds: unreadIds,
      action: 'MARK_READ'
    });
  }

  /**
   * Get notification by ID
   */
  getNotificationById(id: number): SmartNotificationDto | undefined {
    return this._notifications().find(n => n.id === id);
  }

  // ===== ERROR HANDLING =====
  private handleError(error: any, context: string): string {
    console.error(`${context}:`, error);
    
    if (error?.status === 401) {
      return 'Authentication required. Please log in again.';
    } else if (error?.status === 403) {
      return 'Access denied. You do not have permission to view notifications.';
    } else if (error?.status === 404) {
      return 'Notifications not found. The endpoint may not be available.';
    } else if (error?.status === 500) {
      return 'Server error occurred. Please try again later.';
    } else if (!navigator.onLine) {
      return 'No internet connection. Please check your network.';
    } else {
      return error?.message || 'An unexpected error occurred';
    }
  }
}