// src/app/core/services/branch-notification.service.ts
// Enhanced Branch-Aware Notification Service for Multi-Branch functionality
// Phase 3: Multi-Branch Features Implementation

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';

import { NotificationService, NotificationDto, CreateNotificationRequest, ApiResponse } from './notification.service';
import { StateService } from './state.service';
import { environment } from '../../../environment/environment';

// Branch-specific notification interfaces
export interface BranchNotificationDto extends NotificationDto {
  branchId?: number;
  branchName?: string;
  isBranchSpecific?: boolean;
  targetBranches?: number[];
}

export interface BranchNotificationSummaryDto {
  branchId: number;
  branchName: string;
  totalCount: number;
  unreadCount: number;
  criticalCount: number;
  recentNotifications: BranchNotificationDto[];
  lastUpdated: string;
}

export interface CreateBranchNotificationRequest extends CreateNotificationRequest {
  branchId?: number;
  targetBranches?: number[];
  isBranchSpecific?: boolean;
  notificationType: 'transfer_request' | 'transfer_approved' | 'transfer_rejected' | 'low_stock' | 'performance_alert' | 'capacity_warning' | 'general';
}

// Notification types for multi-branch operations
export interface TransferNotificationData {
  transferId: number;
  sourceBranchId: number;
  targetBranchId: number;
  sourceBranchName: string;
  targetBranchName: string;
  requestedBy: string;
  itemCount: number;
  estimatedValue: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface StockAlertNotificationData {
  productId: number;
  productName: string;
  branchId: number;
  branchName: string;
  currentStock: number;
  minStock: number;
  alertLevel: 'low' | 'critical' | 'out_of_stock';
}

export interface PerformanceAlertNotificationData {
  branchId: number;
  branchName: string;
  metric: string;
  currentValue: number;
  expectedValue: number;
  variance: number;
  alertLevel: 'warning' | 'critical';
}

@Injectable({
  providedIn: 'root'
})
export class BranchNotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseNotificationService = inject(NotificationService);
  private readonly stateService = inject(StateService);
  
  // ✅ Use relative URL for proxy routing
  private readonly apiUrl = '/api/BranchNotification';

  // Signal-based state management
  private _branchNotifications = signal<Map<number, BranchNotificationDto[]>>(new Map());
  private _branchSummaries = signal<BranchNotificationSummaryDto[]>([]);
  private _selectedBranchIds = signal<number[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly branchNotifications = this._branchNotifications.asReadonly();
  readonly branchSummaries = this._branchSummaries.asReadonly();
  readonly selectedBranchIds = this._selectedBranchIds.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // User context
  readonly user = this.stateService.user;
  readonly accessibleBranches = this.stateService.accessibleBranches;

  // Computed properties
  readonly totalUnreadCount = computed(() => {
    const summaries = this._branchSummaries();
    return summaries.reduce((total, summary) => total + summary.unreadCount, 0);
  });

  readonly totalCriticalCount = computed(() => {
    const summaries = this._branchSummaries();
    return summaries.reduce((total, summary) => total + summary.criticalCount, 0);
  });

  readonly selectedBranchNotifications = computed(() => {
    const selectedIds = this._selectedBranchIds();
    const allNotifications = this._branchNotifications();
    
    if (selectedIds.length === 0) {
      // Return all notifications if no specific branches selected
      return Array.from(allNotifications.values()).flat();
    }
    
    return selectedIds
      .map(id => allNotifications.get(id) || [])
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  readonly branchAlertCounts = computed(() => {
    const summaries = this._branchSummaries();
    return new Map(
      summaries.map(summary => [
        summary.branchId, 
        {
          unread: summary.unreadCount,
          critical: summary.criticalCount,
          total: summary.totalCount
        }
      ])
    );
  });

  constructor() {
    this.initializeBranchNotifications();
    this.setupBranchContextEffects();
    this.startBranchNotificationPolling();
  }

  private initializeBranchNotifications(): void {
    console.log('🏪 Initializing branch-aware notification service');
    this.loadBranchSummaries();
  }

  private setupBranchContextEffects(): void {
    // Auto-update selected branches based on state service
    effect(() => {
      const branchIds = this.stateService.activeBranchIds();
      this._selectedBranchIds.set(branchIds);
      if (branchIds.length > 0) {
        this.loadNotificationsForBranches(branchIds);
      }
    });
  }

  private startBranchNotificationPolling(): void {
    console.log('🔄 Starting branch notification polling every 5 seconds');
    
    timer(0, 5000)
      .pipe(
        switchMap(() => {
          if (!this.stateService.isAuthenticated()) {
            return of(null);
          }
          return this.loadBranchSummaries().pipe(
            catchError(error => {
              console.warn('Branch notification polling error:', error);
              return of(null);
            })
          );
        })
      )
      .subscribe();
  }

  // ===== CORE API METHODS =====

  /**
   * Load notification summaries for all accessible branches
   */
  private loadBranchSummaries(): Observable<BranchNotificationSummaryDto[]> {
    this._loading.set(true);
    
    const branchIds = this.accessibleBranches().map(b => b.branchId);
    if (branchIds.length === 0) {
      this._loading.set(false);
      return of([]);
    }

    const params = new HttpParams().set('branchIds', branchIds.join(','));
    
    return this.http.get<ApiResponse<BranchNotificationSummaryDto[]>>(
      `${this.apiUrl}/summaries`, { params }
    ).pipe(
      tap(response => console.log('📊 Branch notification summaries:', response)),
      map(response => {
        if (response.success && response.data) {
          this._branchSummaries.set(response.data);
          this._loading.set(false);
          this._error.set(null);
          return response.data;
        }
        throw new Error(response.message || 'Failed to load branch summaries');
      }),
      catchError(error => {
        console.error('Error loading branch summaries:', error);
        this._loading.set(false);
        this._error.set('Failed to load branch notifications');
        
        // Return mock data for development
        const mockSummaries = this.generateMockBranchSummaries();
        this._branchSummaries.set(mockSummaries);
        return of(mockSummaries);
      })
    );
  }

  /**
   * Load notifications for specific branches
   */
  loadNotificationsForBranches(branchIds: number[]): Observable<BranchNotificationDto[]> {
    if (branchIds.length === 0) return of([]);

    const params = new HttpParams()
      .set('branchIds', branchIds.join(','))
      .set('page', '1')
      .set('pageSize', '50');

    return this.http.get<ApiResponse<BranchNotificationDto[]>>(
      this.apiUrl, { params }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          // Update branch notifications map
          const currentMap = new Map(this._branchNotifications());
          
          branchIds.forEach(branchId => {
            const branchNotifications = response.data.filter(n => 
              n.branchId === branchId || 
              (n.targetBranches && n.targetBranches.includes(branchId))
            );
            currentMap.set(branchId, branchNotifications);
          });
          
          this._branchNotifications.set(currentMap);
          return response.data;
        }
        throw new Error(response.message || 'Failed to load branch notifications');
      }),
      catchError(error => {
        console.error('Error loading branch notifications:', error);
        
        // Return mock data for development
        const mockNotifications = this.generateMockBranchNotifications(branchIds);
        const currentMap = new Map(this._branchNotifications());
        
        branchIds.forEach(branchId => {
          const branchNotifications = mockNotifications.filter(n => n.branchId === branchId);
          currentMap.set(branchId, branchNotifications);
        });
        
        this._branchNotifications.set(currentMap);
        return of(mockNotifications);
      })
    );
  }

  // ===== BRANCH-SPECIFIC NOTIFICATION CREATORS =====

  /**
   * Create transfer request notification
   */
  createTransferRequestNotification(data: TransferNotificationData): Observable<BranchNotificationDto> {
    const request: CreateBranchNotificationRequest = {
      title: 'New Transfer Request',
      message: `Transfer request from ${data.sourceBranchName} to ${data.targetBranchName}. ${data.itemCount} items, estimated value ${this.formatCurrency(data.estimatedValue)}.`,
      type: 'transfer_request',
      priority: data.priority,
      actionUrl: `/dashboard/inventory-transfer/detail/${data.transferId}`,
      actionText: 'View Transfer',
      branchId: data.targetBranchId,
      targetBranches: [data.targetBranchId],
      isBranchSpecific: true,
      notificationType: 'transfer_request'
    };

    return this.createBranchNotification(request);
  }

  /**
   * Create transfer approval notification
   */
  createTransferApprovalNotification(data: TransferNotificationData, approved: boolean): Observable<BranchNotificationDto> {
    const status = approved ? 'approved' : 'rejected';
    const request: CreateBranchNotificationRequest = {
      title: `Transfer Request ${approved ? 'Approved' : 'Rejected'}`,
      message: `Your transfer request from ${data.sourceBranchName} to ${data.targetBranchName} has been ${status}.`,
      type: approved ? 'transfer_approved' : 'transfer_rejected',
      priority: 'Medium',
      actionUrl: `/dashboard/inventory-transfer/detail/${data.transferId}`,
      actionText: 'View Transfer',
      branchId: data.sourceBranchId,
      targetBranches: [data.sourceBranchId],
      isBranchSpecific: true,
      notificationType: approved ? 'transfer_approved' : 'transfer_rejected'
    };

    return this.createBranchNotification(request);
  }

  /**
   * Create low stock alert for specific branch
   */
  createLowStockAlert(data: StockAlertNotificationData): Observable<BranchNotificationDto> {
    const urgency = data.alertLevel === 'critical' ? 'Critical' : 
                   data.alertLevel === 'out_of_stock' ? 'Critical' : 'High';

    const request: CreateBranchNotificationRequest = {
      title: `${data.alertLevel === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'} Alert`,
      message: `${data.productName} at ${data.branchName} is ${data.alertLevel === 'out_of_stock' ? 'out of stock' : `running low (${data.currentStock} remaining, minimum ${data.minStock})`}.`,
      type: 'low_stock',
      priority: urgency,
      actionUrl: `/dashboard/inventory?branchId=${data.branchId}&productId=${data.productId}`,
      actionText: 'View Product',
      branchId: data.branchId,
      targetBranches: [data.branchId],
      isBranchSpecific: true,
      notificationType: 'low_stock'
    };

    return this.createBranchNotification(request);
  }

  /**
   * Create performance alert for branch
   */
  createPerformanceAlert(data: PerformanceAlertNotificationData): Observable<BranchNotificationDto> {
    const request: CreateBranchNotificationRequest = {
      title: `Performance Alert - ${data.branchName}`,
      message: `${data.metric} is ${data.variance > 0 ? 'above' : 'below'} expected level. Current: ${data.currentValue}, Expected: ${data.expectedValue}.`,
      type: 'performance_alert',
      priority: data.alertLevel === 'critical' ? 'Critical' : 'High',
      actionUrl: `/dashboard/branch-analytics/performance-comparison?branchId=${data.branchId}`,
      actionText: 'View Analytics',
      branchId: data.branchId,
      targetBranches: [data.branchId],
      isBranchSpecific: true,
      notificationType: 'performance_alert'
    };

    return this.createBranchNotification(request);
  }

  /**
   * Create branch capacity warning
   */
  createCapacityWarning(branchId: number, branchName: string, utilizationPercent: number): Observable<BranchNotificationDto> {
    const request: CreateBranchNotificationRequest = {
      title: `Capacity Warning - ${branchName}`,
      message: `Branch capacity utilization is at ${utilizationPercent}%. Consider optimizing operations or expanding capacity.`,
      type: 'capacity_warning',
      priority: utilizationPercent > 95 ? 'Critical' : 'High',
      actionUrl: `/dashboard/branch-analytics/capacity-planning?branchId=${branchId}`,
      actionText: 'View Capacity',
      branchId: branchId,
      targetBranches: [branchId],
      isBranchSpecific: true,
      notificationType: 'capacity_warning'
    };

    return this.createBranchNotification(request);
  }

  /**
   * Create general branch notification
   */
  private createBranchNotification(request: CreateBranchNotificationRequest): Observable<BranchNotificationDto> {
    return this.http.post<ApiResponse<BranchNotificationDto>>(this.apiUrl, request).pipe(
      map(response => {
        if (response.success && response.data) {
          // Update local state
          this.addNotificationToState(response.data);
          return response.data;
        }
        throw new Error(response.message || 'Failed to create branch notification');
      }),
      catchError(error => {
        console.error('Error creating branch notification:', error);
        throw error;
      })
    );
  }

  // ===== STATE MANAGEMENT =====

  private addNotificationToState(notification: BranchNotificationDto): void {
    if (!notification.branchId) return;

    const currentMap = new Map(this._branchNotifications());
    const branchNotifications = currentMap.get(notification.branchId) || [];
    currentMap.set(notification.branchId, [notification, ...branchNotifications]);
    this._branchNotifications.set(currentMap);

    // Update summary
    this.updateBranchSummary(notification.branchId);
  }

  private updateBranchSummary(branchId: number): void {
    const currentSummaries = [...this._branchSummaries()];
    const summaryIndex = currentSummaries.findIndex(s => s.branchId === branchId);
    
    if (summaryIndex >= 0) {
      const notifications = this._branchNotifications().get(branchId) || [];
      const unreadCount = notifications.filter(n => !n.isRead).length;
      const criticalCount = notifications.filter(n => 
        n.priority === 'Critical' && !n.isRead
      ).length;

      currentSummaries[summaryIndex] = {
        ...currentSummaries[summaryIndex],
        unreadCount,
        criticalCount,
        totalCount: notifications.length,
        lastUpdated: new Date().toISOString()
      };

      this._branchSummaries.set(currentSummaries);
    }
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get notifications for specific branch
   */
  getBranchNotifications(branchId: number): BranchNotificationDto[] {
    return this._branchNotifications().get(branchId) || [];
  }

  /**
   * Get unread count for specific branch
   */
  getBranchUnreadCount(branchId: number): number {
    const summary = this._branchSummaries().find(s => s.branchId === branchId);
    return summary?.unreadCount || 0;
  }

  /**
   * Mark branch notification as read
   */
  markBranchNotificationAsRead(notificationId: number, branchId: number): Observable<boolean> {
    return this.baseNotificationService.markAsRead(notificationId).pipe(
      tap(success => {
        if (success) {
          // Update local state
          const currentMap = new Map(this._branchNotifications());
          const branchNotifications = currentMap.get(branchId) || [];
          const updatedNotifications = branchNotifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          );
          currentMap.set(branchId, updatedNotifications);
          this._branchNotifications.set(currentMap);

          // Update summary
          this.updateBranchSummary(branchId);
        }
      })
    );
  }

  /**
   * Refresh all branch notifications
   */
  refreshAllBranchNotifications(): Observable<void> {
    const branchIds = this.accessibleBranches().map(b => b.branchId);
    return this.loadNotificationsForBranches(branchIds).pipe(
      map(() => void 0)
    );
  }

  /**
   * Set selected branches for filtering
   */
  setSelectedBranches(branchIds: number[]): void {
    this._selectedBranchIds.set(branchIds);
    if (branchIds.length > 0) {
      this.loadNotificationsForBranches(branchIds).subscribe();
    }
  }

  // ===== UTILITY METHODS =====

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  private generateMockBranchSummaries(): BranchNotificationSummaryDto[] {
    return this.accessibleBranches().map(branch => ({
      branchId: branch.branchId,
      branchName: branch.branchName,
      totalCount: 5,
      unreadCount: 2,
      criticalCount: 1,
      recentNotifications: [],
      lastUpdated: new Date().toISOString()
    }));
  }

  private generateMockBranchNotifications(branchIds: number[]): BranchNotificationDto[] {
    const mockNotifications: BranchNotificationDto[] = [];
    const branches = this.accessibleBranches();

    branchIds.forEach(branchId => {
      const branch = branches.find(b => b.branchId === branchId);
      if (branch) {
        mockNotifications.push(
          {
            id: Date.now() + branchId,
            title: 'Transfer Request Pending',
            message: `New transfer request needs approval at ${branch.branchName}`,
            type: 'transfer_request',
            isRead: false,
            priority: 'High',
            createdAt: new Date().toISOString(),
            actionUrl: `/dashboard/inventory-transfer`,
            actionText: 'View Transfer',
            userId: 1,
            createdBy: 'System',
            branchId: branchId,
            branchName: branch.branchName,
            isBranchSpecific: true,
            targetBranches: [branchId]
          }
        );
      }
    });

    return mockNotifications;
  }

  clearError(): void {
    this._error.set(null);
  }
}