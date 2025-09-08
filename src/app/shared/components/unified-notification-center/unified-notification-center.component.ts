// src/app/shared/components/unified-notification-center/unified-notification-center.component.ts
// ✅ UPDATED: Replaced Mock Data with Real API Integration
// ✅ INTEGRATION: Using NotificationService like dashboard/notifications
// Following Project Guidelines: Signal-based, Performance Optimized, Clean Design

import { Component, OnInit, OnDestroy, computed, signal, inject, input, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

// Services
import { SmartNotificationService } from '../../../core/services/smart-notification.service';
import { NotificationService, NotificationDto } from '../../../core/services/notification.service';
import { environment } from '../../../../environment/environment';

// Interfaces
import { ExpiryNotification, ExpiryUrgency } from '../../../core/interfaces/expiry.interfaces';

// ===== INTELLIGENT NOTIFICATION INTERFACES ===== 
// Based on /api/SmartNotification/intelligent response
interface IntelligentNotificationDto {
  type: string;
  priority: number;
  title: string;
  message: string;
  potentialLoss: number;
  actionDeadline: string;
  actionUrl: string;
  actionItems: string[];
  escalationRule: {
    escalateAfterHours: number;
    escalateToRoles: string[];
    requireAcknowledgment: boolean;
    notificationChannels: number[];
  };
  businessImpact: {
    financialRisk: number;
    operationalImpact: string;
    customerImpact: string;
    complianceRisk: string;
  };
  affectedBatches: Array<{
    batchId: number;
    batchNumber: string;
    quantity: number;
    value: number;
    expiryDate: string;
  }>;
}

interface IntelligentNotificationResponse {
  success: boolean;
  message: string;
  data: IntelligentNotificationDto[];
  timestamp: string;
  errors: any;
  error: any;
}

// ===== INTERFACES ===== 
interface BasicNotification {
  id: number;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  type: string;
}

interface SmartNotification extends ExpiryNotification {
  potentialLoss?: number;
  actionDeadline?: string;
  confidenceScore?: number;
  // ✅ ENHANCED: Additional properties from intelligent API
  actionItems?: string[];
  businessImpact?: {
    financialRisk: number;
    operationalImpact: string;
    customerImpact: string;
    complianceRisk: string;
  };
  affectedBatches?: Array<{
    batchId: number;
    batchNumber: string;
    quantity: number;
    value: number;
    expiryDate: string;
  }>;
  escalationRule?: {
    escalateAfterHours: number;
    escalateToRoles: string[];
    requireAcknowledgment: boolean;
    notificationChannels: number[];
  };
}

interface NotificationCounts {
  total: number;
  smart: number;
  basic: number;
  critical: number;
  high: number;
}

// ===== USER PREFERENCES INTERFACE =====
interface UserNotificationPreferences {
  smartEnabled: boolean;
  basicEnabled: boolean;
  maxItemsToShow: number;
  autoRefresh: boolean;
}

@Component({
  selector: 'app-unified-notification-center',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './unified-notification-center.component.html',
  styleUrls: ['./unified-notification-center.component.scss']
})
export class UnifiedNotificationCenterComponent implements OnInit, OnDestroy {
  
  // ===== DEPENDENCY INJECTION =====
  private smartNotificationService = inject(SmartNotificationService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  
  // ===== INPUT PROPERTIES =====
  maxItemsToShow = input<number>(10);
  autoRefreshInterval = input<number>(2 * 60 * 1000); // 2 minutes
  
  // ===== STATE SIGNALS =====
  private _smartNotifications = signal<SmartNotification[]>([]);
  private _basicNotifications = signal<BasicNotification[]>([]);
  private _isLoading = signal<boolean>(false);
  private _isDropdownOpen = signal<boolean>(false);
  private _expandedActionItems = signal<Set<number>>(new Set());
  private _preferences = signal<UserNotificationPreferences>({
    smartEnabled: true,
    basicEnabled: true,
    maxItemsToShow: 10,
    autoRefresh: true
  });
  
  // ===== PUBLIC READONLY SIGNALS =====
  readonly smartNotifications = this._smartNotifications.asReadonly();
  readonly basicNotifications = this._basicNotifications.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isDropdownOpen = this._isDropdownOpen.asReadonly();
  readonly expandedActionItems = this._expandedActionItems.asReadonly();
  readonly preferences = this._preferences.asReadonly();
  
  // ===== COMPUTED PROPERTIES =====
  readonly criticalNotifications = computed(() => 
    this.smartNotifications().filter(n => n.priority === ExpiryUrgency.CRITICAL)
  );
  
  readonly highPriorityNotifications = computed(() => 
    this.smartNotifications().filter(n => n.priority === ExpiryUrgency.HIGH)
  );
  
  readonly unreadCount = computed(() => {
    const smartUnread = this.preferences().smartEnabled ? 
      this.smartNotifications().filter(n => !n.isRead).length : 0;
    const basicUnread = this.preferences().basicEnabled ? 
      this.basicNotifications().filter(n => !n.isRead).length : 0;
    return smartUnread + basicUnread;
  });
  
  readonly notificationCounts = computed((): NotificationCounts => {
    const smart = this.preferences().smartEnabled ? this.smartNotifications().length : 0;
    const basic = this.preferences().basicEnabled ? this.basicNotifications().length : 0;
    
    return {
      total: smart + basic,
      smart,
      basic,
      critical: this.criticalNotifications().length,
      high: this.highPriorityNotifications().length
    };
  });
  
  readonly displayCount = computed(() => {
    const count = this.unreadCount();
    return count > 99 ? 99 : count;
  });
  
  readonly badgeColor = computed(() => {
    if (this.criticalNotifications().length > 0) return 'warn';
    if (this.highPriorityNotifications().length > 0) return 'accent';
    return 'primary';
  });
  
  readonly hasAlerts = computed(() => this.notificationCounts().total > 0);
  readonly hasCriticalAlerts = computed(() => this.criticalNotifications().length > 0);

  // ===== LIFECYCLE HOOKS =====
  async ngOnInit(): Promise<void> {
    console.log('🔔 UnifiedNotificationCenter: Initializing with real API integration...');
    console.log('📡 Smart Notifications: Using /api/SmartNotification/intelligent');
    console.log('📡 Basic Notifications: Using NotificationService.getUserNotifications()');
    await this.initializeComponent();
    this.setupAutoRefresh();
  }
  
  ngOnDestroy(): void {
    this.savePreferences();
  }

  // ===== INITIALIZATION =====
  private async initializeComponent(): Promise<void> {
    try {
      await this.loadUserPreferences();
      await this.loadAllNotifications();
    } catch (error) {
      console.error('Failed to initialize notification center:', error);
    }
  }
  
  private setupAutoRefresh(): void {
    if (this.preferences().autoRefresh) {
      // ✅ REAL-TIME: Subscribe to notification service observables
      this.notificationService.unreadCount$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((count) => {
          console.log('📡 Real-time unread count update:', count);
        });

      // Auto refresh interval
      interval(this.autoRefreshInterval())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.loadAllNotifications();
        });
    }
  }

  // ===== USER PREFERENCES =====
  private async loadUserPreferences(): Promise<void> {
    try {
      const smartEnabled = localStorage.getItem('smartNotificationsEnabled');
      const basicEnabled = localStorage.getItem('basicNotificationsEnabled');
      const maxItems = localStorage.getItem('maxNotificationItems');
      const autoRefresh = localStorage.getItem('autoRefreshNotifications');
      
      this._preferences.update(prefs => ({
        ...prefs,
        smartEnabled: smartEnabled ? JSON.parse(smartEnabled) : true,
        basicEnabled: basicEnabled ? JSON.parse(basicEnabled) : true,
        maxItemsToShow: maxItems ? parseInt(maxItems, 10) : 10,
        autoRefresh: autoRefresh ? JSON.parse(autoRefresh) : true
      }));
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }
  
  private savePreferences(): void {
    try {
      const prefs = this.preferences();
      localStorage.setItem('smartNotificationsEnabled', JSON.stringify(prefs.smartEnabled));
      localStorage.setItem('basicNotificationsEnabled', JSON.stringify(prefs.basicEnabled));
      localStorage.setItem('maxNotificationItems', prefs.maxItemsToShow.toString());
      localStorage.setItem('autoRefreshNotifications', JSON.stringify(prefs.autoRefresh));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  // ===== TOGGLE METHODS =====
  toggleSmartNotifications(enabled: boolean): void {
    this._preferences.update(prefs => ({ ...prefs, smartEnabled: enabled }));
    if (enabled) {
      this.loadSmartNotifications();
    }
    this.savePreferences();
  }
  
  toggleBasicNotifications(enabled: boolean): void {
    this._preferences.update(prefs => ({ ...prefs, basicEnabled: enabled }));
    if (enabled) {
      this.loadBasicNotifications();
    }
    this.savePreferences();
  }

  // ===== DROPDOWN TOGGLE METHODS - SIMPLIFIED =====
  toggleDropdown(): void {
    this._isDropdownOpen.update(isOpen => !isOpen);
    if (this._isDropdownOpen()) {
      this.refreshNotifications();
    }
  }

  closeDropdown(): void {
    this._isDropdownOpen.set(false);
  }

  // ===== ACTION ITEMS TOGGLE =====
  toggleActionItems(notificationId: number): void {
    this._expandedActionItems.update(expanded => {
      const newSet = new Set(expanded);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  }

  isActionItemsExpanded(notificationId: number): boolean {
    return this.expandedActionItems().has(notificationId);
  }

  // ===== TOGGLE EVENT HANDLERS =====
  onSmartToggleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.toggleSmartNotifications(target.checked);
  }

  onBasicToggleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.toggleBasicNotifications(target.checked);
  }

  // ===== DATA LOADING =====
  async loadAllNotifications(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    if (this.preferences().smartEnabled) {
      promises.push(this.loadSmartNotifications());
    }
    
    if (this.preferences().basicEnabled) {
      promises.push(this.loadBasicNotifications());
    }
    
    await Promise.all(promises);
  }
  
  private async loadSmartNotifications(): Promise<void> {
    if (!this.preferences().smartEnabled) return;
    
    try {
      // ✅ REAL API: Using /api/SmartNotification/intelligent endpoint
      const response = await this.http.get<IntelligentNotificationResponse>(
        `${environment.apiUrl}/SmartNotification/intelligent`,
        { withCredentials: true }
      ).toPromise();
      
      if (response?.success && response.data) {
        console.log('✅ Loaded intelligent notifications from real API:', response.data);
        
        // Convert IntelligentNotificationDto to SmartNotification format
        const smartNotifications: SmartNotification[] = response.data.map(dto => ({
          id: dto.affectedBatches[0]?.batchId || Date.now(), // Use batchId as unique ID
          type: this.mapNotificationType(dto.type),
          title: dto.title,
          message: dto.message,
          productId: dto.affectedBatches[0]?.batchId,
          productName: this.extractProductName(dto.title),
          batchId: dto.affectedBatches[0]?.batchId,
          batchNumber: dto.affectedBatches[0]?.batchNumber,
          expiryDate: dto.affectedBatches[0]?.expiryDate,
          daysUntilExpiry: this.calculateDaysUntilExpiry(dto.affectedBatches[0]?.expiryDate),
          priority: this.mapPriorityToExpiryUrgency(dto.priority),
          isRead: false,
          actionRequired: true,
          createdAt: response.timestamp,
          branchId: 1, // Default branch ID
          branchName: 'Cabang Utama',
          // Enhanced properties from intelligent API
          potentialLoss: dto.potentialLoss,
          actionDeadline: dto.actionDeadline,
          confidenceScore: this.calculateConfidenceScore(dto),
          // ✅ NEW: Rich data from intelligent API
          actionItems: dto.actionItems,
          businessImpact: dto.businessImpact,
          affectedBatches: dto.affectedBatches,
          escalationRule: dto.escalationRule
        }));
        
        this._smartNotifications.set(smartNotifications);
      } else {
        console.warn('❌ No intelligent notifications data:', response?.message);
        this._smartNotifications.set([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading intelligent notifications:', error);
      
      // ✅ FALLBACK: Show user-friendly message for API errors
      if (error.status === 401) {
        console.log('🔐 Authentication required for intelligent notifications');
      } else if (error.status === 404) {
        console.log('📭 No intelligent notifications available');
      } else {
        console.log('🔄 Using fallback mode for smart notifications');
      }
      
      this._smartNotifications.set([]);
    }
  }
  
  private async loadBasicNotifications(): Promise<void> {
    if (!this.preferences().basicEnabled) return;
    
    try {
      // ✅ REAL API: Using NotificationService like dashboard/notifications
      this.notificationService.getUserNotifications(1, this.preferences().maxItemsToShow)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (notifications) => {
            // Convert NotificationDto to BasicNotification interface
            const basicNotifications: BasicNotification[] = notifications.map(n => ({
              id: n.id,
              title: n.title,
              message: n.message,
              priority: n.priority,
              isRead: n.isRead,
              createdAt: n.createdAt,
              type: n.type,
              actionUrl: n.actionUrl
            }));
            
            this._basicNotifications.set(basicNotifications);
            console.log('✅ Loaded basic notifications from real API:', basicNotifications);
          },
          error: (error) => {
            console.error('❌ Error loading basic notifications:', error);
            this._basicNotifications.set([]);
          }
        });
    } catch (error) {
      console.error('Error loading basic notifications:', error);
    }
  }

  // ===== EVENT HANDLERS =====
  handleNotificationClick(notification: SmartNotification | BasicNotification, type: 'smart' | 'basic'): void {
    if (!notification.isRead) {
      this.markAsRead(notification.id, type);
    }
    
    if (notification.actionUrl) {
      this.navigateToUrl(notification.actionUrl);
    } else {
      this.handleDefaultNavigation(notification, type);
    }
  }
  
  handleQuickAction(notification: SmartNotification): void {
    switch (notification.type) {
      case 'expiry_warning':
        this.router.navigate(['/dashboard/pos'], {
          queryParams: { 
            productId: notification.productId,
            batchId: notification.batchId,
            action: 'discount' 
          }
        });
        break;
      case 'expired_alert':
        // ✅ REAL DATA: Use actual batch information from intelligent API
        if (notification.actionUrl) {
          this.navigateToUrl(notification.actionUrl);
        } else {
          this.router.navigate(['/dashboard/inventory/dispose'], {
            queryParams: { 
              productId: notification.productId,
              batchId: notification.batchId,
              batchNumber: notification.batchNumber
            }
          });
        }
        break;
      default:
        this.handleNotificationClick(notification, 'smart');
    }
  }
  
  markAsRead(id: number, type: 'smart' | 'basic'): void {
    if (type === 'smart') {
      this.smartNotificationService.markAsRead(id);
      this._smartNotifications.update(notifications => 
        notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } else {
      // ✅ REAL API: Mark basic notification as read via NotificationService
      this.notificationService.markAsRead(id).subscribe({
        next: (success) => {
          if (success) {
            this._basicNotifications.update(notifications => 
              notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            console.log('✅ Marked basic notification as read:', id);
          }
        },
        error: (error) => {
          console.error('❌ Error marking notification as read:', error);
        }
      });
    }
  }
  
  refreshNotifications(): void {
    this._isLoading.set(true);
    
    // ✅ REAL API: Refresh both smart and basic notifications
    Promise.all([
      this.loadAllNotifications(),
      // Also refresh notification summary for real-time count updates
      this.notificationService.getNotificationSummary().pipe(
        takeUntilDestroyed(this.destroyRef)
      ).toPromise().catch(error => {
        console.error('Error refreshing notification summary:', error);
      })
    ]).finally(() => {
      this._isLoading.set(false);
    });
  }

  // ===== MARK ALL AS READ =====
  markAllAsRead(): void {
    // ✅ REAL API: Mark all notifications as read
    this.notificationService.markAllAsRead().subscribe({
      next: (success) => {
        if (success) {
          // Update local state for both smart and basic notifications
          this._smartNotifications.update(notifications => 
            notifications.map(n => ({ ...n, isRead: true }))
          );
          this._basicNotifications.update(notifications => 
            notifications.map(n => ({ ...n, isRead: true }))
          );
          console.log('✅ Marked all notifications as read');
        }
      },
      error: (error) => {
        console.error('❌ Error marking all notifications as read:', error);
      }
    });
  }

  // ===== NAVIGATION METHODS =====
  viewAllNotifications(): void {
    this.navigateToUrl('/dashboard/notifications');
  }
  
  openSettings(): void {
    this.navigateToUrl('/dashboard/settings');
  }

  // ✅ NEW: Navigate to Smart Notifications Dashboard
  viewSmartDetails(): void {
    this.closeDropdown();
    this.router.navigate(['/dashboard/notifications'], { 
      queryParams: { tab: 'smart' }
    });
  }
  
  private navigateToUrl(url: string): void {
    console.log('🔍 Notification - Navigating to:', url);
    console.log('🔍 Router instance:', this.router);
    
    this.router.navigate([url]).then(success => {
      console.log('🔍 Navigation success:', success);
      if (!success) {
        console.error('❌ Router navigation failed, using window.location');
        window.location.href = url;
      }
    }).catch(error => {
      console.error('❌ Navigation error:', error);
      window.location.href = url;
    });
  }
  
  private handleDefaultNavigation(notification: SmartNotification | BasicNotification, type: 'smart' | 'basic'): void {
    if (type === 'smart') {
      const smartNotif = notification as SmartNotification;
      switch (smartNotif.type) {
        case 'expiry_warning':
        case 'expired_alert':
          this.navigateToUrl('/dashboard/inventory?filter=expiring');
          break;
        default:
          this.viewAllNotifications();
      }
    } else {
      const basicNotif = notification as BasicNotification;
      switch (basicNotif.type) {
        case 'inventory':
          this.navigateToUrl('/dashboard/inventory');
          break;
        case 'sale':
          this.navigateToUrl('/dashboard/pos');
          break;
        default:
          this.viewAllNotifications();
      }
    }
  }

  // ===== HELPER METHODS =====
  getCriticalNotificationsSlice(): SmartNotification[] {
    return this.criticalNotifications().slice(0, 3);
  }
  
  getHighPriorityNotificationsSlice(): SmartNotification[] {
    return this.highPriorityNotifications().slice(0, 5);
  }
  
  getBasicNotificationsSlice(): BasicNotification[] {
    return this.basicNotifications().slice(0, this.preferences().maxItemsToShow);
  }
  
  hasSmartMeta(notification: SmartNotification): boolean {
    return !!(notification.potentialLoss || 
              notification.confidenceScore || 
              notification.actionDeadline ||
              notification.businessImpact ||
              notification.actionItems?.length ||
              notification.affectedBatches?.length);
  }
  
  getPriorityChipColor(priority: string): 'primary' | 'accent' | 'warn' {
    switch (priority?.toLowerCase()) {
      case 'high': return 'warn';
      case 'medium': return 'accent';
      default: return 'primary';
    }
  }
  
  getAriaLabel(): string {
    const count = this.unreadCount();
    return count > 0 ? 
      `Notifications: ${count} unread` : 
      'Notifications: No unread notifications';
  }
  
  getNotificationAriaLabel(notification: SmartNotification | BasicNotification): string {
    return `${notification.title}. ${notification.message}. ${this.formatRelativeTime(notification.createdAt)}`;
  }

  // ===== TRACKING FUNCTIONS =====
  trackByNotificationId = (index: number, notification: SmartNotification): any => notification.id;
  trackByBasicNotificationId = (index: number, notification: BasicNotification): any => notification.id;
  trackByActionItem = (index: number, action: string): any => action;

  // ===== UTILITY METHODS =====
  formatCurrencyShort(amount: number): string {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
  }
  
  formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(Math.abs(diffTime) / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return diffTime > 0 ? `in ${diffMinutes}m` : `${diffMinutes}m ago`;
    if (diffHours < 24) return diffTime > 0 ? `in ${diffHours}h` : `${diffHours}h ago`;
    return diffTime > 0 ? `in ${diffDays}d` : `${diffDays}d ago`;
  }

  // ===== SMART NOTIFICATION CALCULATION METHODS =====
  private calculatePotentialLoss(notification: ExpiryNotification): number {
    if (notification.type === 'expiry_warning' && notification.daysUntilExpiry !== undefined) {
      const baseValue = 50000;
      const urgencyMultiplier = notification.daysUntilExpiry <= 1 ? 3 : 
                               notification.daysUntilExpiry <= 3 ? 2 : 1;
      return baseValue * urgencyMultiplier;
    }
    
    if (notification.type === 'expired_alert') {
      return 75000;
    }
    
    return 0;
  }
  
  private calculateConfidenceScore(notification: ExpiryNotification): number;
  private calculateConfidenceScore(dto: IntelligentNotificationDto): number;
  private calculateConfidenceScore(input: ExpiryNotification | IntelligentNotificationDto): number {
    if ('affectedBatches' in input) {
      // IntelligentNotificationDto case
      let score = 85; // Base score for intelligent notifications
      if (input.affectedBatches.length > 0) score += 5;
      if (input.businessImpact.financialRisk > 100000) score += 5;
      if (input.escalationRule.requireAcknowledgment) score += 5;
      return Math.min(score, 95);
    } else {
      // ExpiryNotification case (legacy)
      let score = 75;
      if (input.daysUntilExpiry !== undefined) score += 10;
      if (input.productId && input.batchId) score += 10;
      if (input.priority === ExpiryUrgency.CRITICAL) score += 5;
      return Math.min(score, 95);
    }
  }
  
  private calculateActionDeadline(notification: ExpiryNotification): string | undefined {
    if (notification.expiryDate && notification.daysUntilExpiry !== undefined) {
      const actionDays = Math.max(1, Math.floor(notification.daysUntilExpiry / 2));
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + actionDays);
      return deadline.toISOString();
    }
    
    return undefined;
  }

  // ===== INTELLIGENT API MAPPING METHODS =====
  private mapNotificationType(type: string): 'expiry_warning' | 'expired_alert' | 'disposal_reminder' {
    switch (type.toLowerCase()) {
      case 'criticalexpiry':
        return 'expired_alert';
      case 'expirywarning':
        return 'expiry_warning';
      default:
        return 'expiry_warning';
    }
  }

  private mapPriorityToExpiryUrgency(priority: number): ExpiryUrgency {
    switch (priority) {
      case 3:
        return ExpiryUrgency.CRITICAL;
      case 2:
        return ExpiryUrgency.HIGH;
      case 1:
        return ExpiryUrgency.MEDIUM;
      default:
        return ExpiryUrgency.LOW;
    }
  }

  private extractProductName(title: string): string {
    // Extract product name from title like "🚨 Critical Expiry Alert: Aqua 600ml"
    const match = title.match(/:\s*(.+?)(?:\s|$)/);
    return match ? match[1].trim() : 'Unknown Product';
  }

  private calculateDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}