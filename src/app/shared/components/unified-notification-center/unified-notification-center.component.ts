// src/app/shared/components/unified-notification-center/unified-notification-center.component.ts
// ✅ UPDATED: Added Smart Positioning Logic for Mobile
// Following Project Guidelines: Signal-based, Performance Optimized, Clean Design

import { Component, OnInit, OnDestroy, computed, signal, inject, input, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

// Services
import { SmartNotificationService } from '../../../core/services/smart-notification.service';
import { NotificationService } from '../../../core/services/notification.service';

// Interfaces
import { ExpiryNotification, ExpiryUrgency } from '../../../core/interfaces/expiry.interfaces';

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
  
  // ===== INPUT PROPERTIES =====
  maxItemsToShow = input<number>(10);
  autoRefreshInterval = input<number>(2 * 60 * 1000); // 2 minutes
  
  // ===== STATE SIGNALS =====
  private _smartNotifications = signal<SmartNotification[]>([]);
  private _basicNotifications = signal<BasicNotification[]>([]);
  private _isLoading = signal<boolean>(false);
  private _isDropdownOpen = signal<boolean>(false);
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
      const notifications = this.smartNotificationService.notifications();
      const enhanced: SmartNotification[] = notifications.map(n => ({
        ...n,
        potentialLoss: this.calculatePotentialLoss(n),
        confidenceScore: this.calculateConfidenceScore(n),
        actionDeadline: this.calculateActionDeadline(n)
      }));
      
      this._smartNotifications.set(enhanced);
    } catch (error) {
      console.error('Error loading smart notifications:', error);
    }
  }
  
  private async loadBasicNotifications(): Promise<void> {
    if (!this.preferences().basicEnabled) return;
    
    try {
      // Mock data - replace with actual service call
      const mockNotifications: BasicNotification[] = [
        {
          id: 1,
          title: 'System Backup Completed',
          message: 'Daily backup completed successfully at 02:00 AM',
          priority: 'Medium',
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'system'
        },
        {
          id: 2,
          title: 'Low Stock Alert',
          message: 'Indomie Goreng running low (8 units remaining)',
          priority: 'High',
          isRead: false,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          type: 'inventory',
          actionUrl: '/dashboard/inventory'
        }
      ];
      
      this._basicNotifications.set(mockNotifications);
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
            action: 'discount' 
          }
        });
        break;
      case 'expired_alert':
        this.router.navigate(['/dashboard/inventory/dispose'], {
          queryParams: { 
            productId: notification.productId,
            batchId: notification.batchId
          }
        });
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
      this._basicNotifications.update(notifications => 
        notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    }
  }
  
  refreshNotifications(): void {
    this._isLoading.set(true);
    this.loadAllNotifications().finally(() => {
      this._isLoading.set(false);
    });
  }

  // ===== NAVIGATION METHODS =====
  viewAllNotifications(): void {
    this.navigateToUrl('/dashboard/notifications');
  }
  
  openSettings(): void {
    this.navigateToUrl('/dashboard/settings');
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
    return !!(notification.potentialLoss || notification.confidenceScore || notification.actionDeadline);
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
  
  private calculateConfidenceScore(notification: ExpiryNotification): number {
    let score = 75;
    
    if (notification.daysUntilExpiry !== undefined) score += 10;
    if (notification.productId && notification.batchId) score += 10;
    if (notification.priority === ExpiryUrgency.CRITICAL) score += 5;
    
    return Math.min(score, 95);
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
}