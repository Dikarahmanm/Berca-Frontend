import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, retry, tap } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { 
  SmartNotificationDto, 
  SmartNotification,
  SmartNotificationResponse,
  NotificationPreferences, 
  NotificationSystemHealth, 
  EscalationAlert,
  ApiResponse 
} from '../interfaces/smart-notification-api.interfaces';

@Injectable({
  providedIn: 'root'
})
export class SmartNotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/SmartNotification`;

  // Reactive state
  private smartNotificationsSubject = new BehaviorSubject<SmartNotification[]>([]);
  private systemHealthSubject = new BehaviorSubject<NotificationSystemHealth | null>(null);
  private preferencesSubject = new BehaviorSubject<NotificationPreferences | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  public smartNotifications$ = this.smartNotificationsSubject.asObservable();
  public systemHealth$ = this.systemHealthSubject.asObservable();
  public preferences$ = this.preferencesSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  // Signals for reactive components
  private _smartNotifications = signal<SmartNotification[]>([]);
  private _systemHealth = signal<NotificationSystemHealth | null>(null);
  private _preferences = signal<NotificationPreferences | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly smartNotifications = this._smartNotifications.asReadonly();
  readonly systemHealth = this._systemHealth.asReadonly();
  readonly preferences = this._preferences.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Get intelligent notifications
   * GET /api/SmartNotification/intelligent
   */
  getIntelligentNotifications(branchId?: number): Observable<SmartNotification[]> {
    console.log('🤖 Getting intelligent notifications...');
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    if (branchId) {
      params = params.set('branchId', branchId.toString());
    } else {
      // Load all branches when no specific branch is requested
      params = params.set('allBranches', 'true');
    }

    return this.http.get<SmartNotificationResponse>(`${this.apiUrl}/intelligent`, { params })
      .pipe(
        map(response => {
          console.log('🤖 Smart notifications API response:', response);
          if (response.success && response.data) {
            // Transform API data to SmartNotification format
            const smartNotifications: SmartNotification[] = response.data.map(item => ({
              ...item,
              id: item.id || Math.floor(Math.random() * 1000000), // Generate ID if not provided
              createdAt: response.timestamp || new Date().toISOString(),
              isRead: false,
              metadata: {
                isSmartNotification: true,
                potentialLoss: item.potentialLoss,
                actionItems: item.actionItems,
                affectedBatches: item.affectedBatches,
                businessImpact: item.businessImpact,
                escalationRule: item.escalationRule
              }
            }));
            
            this._smartNotifications.set(smartNotifications);
            this.smartNotificationsSubject.next(smartNotifications);
            return smartNotifications;
          }
          throw new Error(response.message || 'Failed to get intelligent notifications');
        }),
        tap({
          finalize: () => this._loading.set(false)
        }),
        retry(1),
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Error getting intelligent notifications:', error);
          this._error.set('Failed to load intelligent notifications');
          this._loading.set(false);
          return of([]);
        })
      );
  }

  /**
   * Process notification rules
   * POST /api/SmartNotification/process-rules
   */
  processNotificationRules(): Observable<boolean> {
    console.log('🔄 Processing notification rules...');
    
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/process-rules`, {})
      .pipe(
        map(response => {
          console.log('🔄 Process rules response:', response);
          return response.success && response.data;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Error processing notification rules:', error);
          return of(false);
        })
      );
  }

  /**
   * Process escalations
   * POST /api/SmartNotification/escalations
   */
  processEscalations(): Observable<EscalationAlert[]> {
    console.log('📈 Processing escalations...');
    
    return this.http.post<ApiResponse<EscalationAlert[]>>(`${this.apiUrl}/escalations`, {})
      .pipe(
        map(response => {
          console.log('📈 Process escalations response:', response);
          if (response.success && response.data) {
            return response.data;
          }
          return [];
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Error processing escalations:', error);
          return of([]);
        })
      );
  }

  /**
   * Get user notification preferences
   * GET /api/SmartNotification/preferences/{userId}
   */
  getNotificationPreferences(userId: number): Observable<NotificationPreferences | null> {
    console.log('⚙️ Getting notification preferences for user:', userId);
    
    return this.http.get<ApiResponse<NotificationPreferences>>(`${this.apiUrl}/preferences/${userId}`)
      .pipe(
        map(response => {
          console.log('⚙️ Preferences response:', response);
          if (response.success && response.data) {
            this._preferences.set(response.data);
            this.preferencesSubject.next(response.data);
            return response.data;
          }
          return null;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Error getting notification preferences:', error);
          return of(null);
        })
      );
  }

  /**
   * Trigger critical expiry alerts
   * POST /api/SmartNotification/critical-expiry-alerts
   */
  triggerCriticalExpiryAlerts(): Observable<boolean> {
    console.log('🚨 Triggering critical expiry alerts...');
    
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/critical-expiry-alerts`, {})
      .pipe(
        map(response => {
          console.log('🚨 Critical expiry alerts response:', response);
          return response.success && response.data;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Error triggering critical expiry alerts:', error);
          return of(false);
        })
      );
  }

  /**
   * Get notification system health
   * GET /api/SmartNotification/health
   */
  getSystemHealth(): Observable<NotificationSystemHealth | null> {
    console.log('🏥 Getting notification system health...');
    
    return this.http.get<ApiResponse<NotificationSystemHealth>>(`${this.apiUrl}/health`)
      .pipe(
        map(response => {
          console.log('🏥 System health response:', response);
          if (response.success && response.data) {
            this._systemHealth.set(response.data);
            this.systemHealthSubject.next(response.data);
            return response.data;
          }
          return null;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Error getting system health:', error);
          return of(null);
        })
      );
  }

  /**
   * Refresh all smart notification data
   */
  refreshAll(branchId?: number): void {
    console.log('🔄 Refreshing all smart notification data...');
    
    // Load intelligent notifications
    this.getIntelligentNotifications(branchId).subscribe();
    
    // Load system health
    this.getSystemHealth().subscribe();
    
    // Process any pending rules
    this.processNotificationRules().subscribe(success => {
      if (success) {
        console.log('✅ Notification rules processed successfully');
      }
    });
  }

  /**
   * Manual trigger for testing - forces refresh of all smart notifications
   */
  manualRefresh(branchId?: number): Observable<any> {
    console.log('🔄 Manual refresh triggered for testing...');
    
    return this.getIntelligentNotifications(branchId).pipe(
      tap(notifications => {
        console.log('🤖 Manual refresh result:', notifications.length, 'smart notifications');
      })
    );
  }

  /**
   * Convert SmartNotification to standard NotificationDto format
   * for compatibility with existing notification system
   */
  convertToStandardNotifications(smartNotifications: SmartNotification[]): any[] {
    return smartNotifications.map((smart, index) => ({
      id: smart.id || `smart_${index}_${Date.now()}`,
      userId: null,
      type: smart.type,
      title: smart.title,
      message: smart.message,
      priority: this.mapPriorityToString(smart.priority),
      isRead: smart.isRead || false,
      readAt: null,
      actionUrl: smart.actionUrl,
      actionText: 'View Details',
      createdAt: smart.createdAt || new Date().toISOString(),
      timeAgo: 'Just now',
      isExpired: smart.actionDeadline ? new Date(smart.actionDeadline) < new Date() : false,
      branchId: null,
      branchName: null,
      userName: null,
      severity: this.mapPriorityToSeverity(smart.priority),
      isArchived: false,
      actionRequired: smart.escalationRule?.requireAcknowledgment || false,
      expiresAt: smart.actionDeadline,
      metadata: {
        isSmartNotification: true,
        potentialLoss: smart.potentialLoss,
        actionItems: smart.actionItems,
        escalationRule: smart.escalationRule,
        businessImpact: smart.businessImpact,
        affectedBatches: smart.affectedBatches
      }
    }));
  }

  private mapPriorityToString(priority: number): string {
    switch (priority) {
      case 1: return 'Low';
      case 2: return 'Normal';
      case 3: return 'High';
      case 4: return 'Critical';
      default: return 'Normal';
    }
  }

  private mapPriorityToSeverity(priority: number): string {
    switch (priority) {
      case 1: return 'info';
      case 2: return 'info';
      case 3: return 'warning';
      case 4: return 'error';
      default: return 'info';
    }
  }
}
