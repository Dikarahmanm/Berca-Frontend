import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MultiBranchNotificationService, MultiBranchNotification, NotificationFilters } from '../../services/notification.service';
import { Subscription, debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  // Component state signals
  private readonly _isVisible = signal<boolean>(false);
  private readonly _selectedTab = signal<string>('all');
  private readonly _filters = signal<NotificationFilters>({});
  private readonly _searchQuery = signal<string>('');
  
  // Component state getters
  isVisible = this._isVisible.asReadonly();
  selectedTab = this._selectedTab.asReadonly();
  filters = this._filters.asReadonly();
  searchQuery = this._searchQuery.asReadonly();
  
  // Service data
  notifications = computed(() => this.notificationService.notifications());
  unreadNotifications = computed(() => this.notificationService.unreadNotifications());
  urgentNotifications = computed(() => this.notificationService.urgentNotifications());
  notificationStats = computed(() => this.notificationService.notificationStats());
  isConnected = computed(() => this.notificationService.isConnected());
  lastUpdate = computed(() => this.notificationService.lastUpdate());
  
  // Search functionality
  private searchSubject = new Subject<string>();
  
  // Tab configuration
  readonly tabs = [
    { key: 'all', label: 'All', icon: 'icon-bell' },
    { key: 'unread', label: 'Unread', icon: 'icon-mail' },
    { key: 'urgent', label: 'Urgent', icon: 'icon-alert-triangle' },
    { key: 'system', label: 'System', icon: 'icon-settings' },
    { key: 'transfers', label: 'Transfers', icon: 'icon-arrow-right-left' },
    { key: 'alerts', label: 'Alerts', icon: 'icon-alert-circle' }
  ];
  
  // Computed properties
  filteredNotifications = computed(() => {
    let notifications = this.notifications();
    const tab = this._selectedTab();
    const search = this._searchQuery().toLowerCase();
    const filters = this._filters();
    
    // Apply tab filter
    switch (tab) {
      case 'unread':
        notifications = notifications.filter(n => !n.isRead && !n.isArchived);
        break;
      case 'urgent':
        notifications = notifications.filter(n => 
          !n.isRead && !n.isArchived && (n.severity === 'error' || n.actionRequired)
        );
        break;
      case 'system':
        notifications = notifications.filter(n => n.type === 'system' && !n.isArchived);
        break;
      case 'transfers':
        notifications = notifications.filter(n => n.type === 'transfer' && !n.isArchived);
        break;
      case 'alerts':
        notifications = notifications.filter(n => 
          (n.type === 'alert' || n.severity === 'error' || n.severity === 'warning') && !n.isArchived
        );
        break;
      default:
        notifications = notifications.filter(n => !n.isArchived);
    }
    
    // Apply search filter
    if (search) {
      notifications = notifications.filter(n => 
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search) ||
        n.branchName?.toLowerCase().includes(search) ||
        n.userName?.toLowerCase().includes(search)
      );
    }
    
    // Apply additional filters
    if (filters.severity) {
      notifications = notifications.filter(n => n.severity === filters.severity);
    }
    
    if (filters.branchId) {
      notifications = notifications.filter(n => n.branchId === filters.branchId);
    }
    
    if (filters.actionRequired !== undefined) {
      notifications = notifications.filter(n => n.actionRequired === filters.actionRequired);
    }
    
    // Sort by timestamp (newest first)
    return notifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });
  
  hasUnreadUrgent = computed(() => {
    return this.urgentNotifications().length > 0;
  });
  
  unreadCount = computed(() => {
    return this.unreadNotifications().length;
  });
  
  private subscriptions = new Subscription();

  constructor(
    private notificationService: MultiBranchNotificationService,
    private router: Router
  ) {
    // Search debounce
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(query => {
        this._searchQuery.set(query);
      })
    );
  }

  ngOnInit() {
    // Clean up expired notifications periodically
    setInterval(() => {
      this.notificationService.clearExpiredNotifications();
    }, 60000); // Every minute
    
    // Auto-hide notification center on outside clicks
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }

  // Notification center visibility
  toggleVisibility() {
    this._isVisible.set(!this._isVisible());
  }

  show() {
    this._isVisible.set(true);
  }

  hide() {
    this._isVisible.set(false);
  }

  private onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-center') && !target.closest('.notification-trigger')) {
      this._isVisible.set(false);
    }
  }

  // Tab management
  selectTab(tabKey: string) {
    this._selectedTab.set(tabKey);
  }

  getTabCount(tabKey: string): number {
    const stats = this.notificationStats();
    
    switch (tabKey) {
      case 'all':
        return stats.total;
      case 'unread':
        return stats.unread;
      case 'urgent':
        return this.urgentNotifications().length;
      case 'system':
        return stats.byType['system'] || 0;
      case 'transfers':
        return stats.byType['transfer'] || 0;
      case 'alerts':
        return (stats.byType['alert'] || 0) + (stats.bySeverity['error'] || 0) + (stats.bySeverity['warning'] || 0);
      default:
        return 0;
    }
  }

  // Search functionality
  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  clearSearch() {
    this._searchQuery.set('');
  }

  // Filter management
  updateFilters(partialFilters: Partial<NotificationFilters>) {
    const currentFilters = this._filters();
    this._filters.set({ ...currentFilters, ...partialFilters });
  }

  clearFilters() {
    this._filters.set({});
    this._searchQuery.set('');
    this._selectedTab.set('all');
  }

  // Notification actions
  markAsRead(notification: MultiBranchNotification, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.markAsRead(notification.id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  archiveNotification(notification: MultiBranchNotification, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.archiveNotification(notification.id);
  }

  deleteNotification(notification: MultiBranchNotification, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    const confirmed = confirm('Are you sure you want to delete this notification?');
    if (confirmed) {
      this.notificationService.deleteNotification(notification.id);
    }
  }

  handleNotificationClick(notification: MultiBranchNotification) {
    // Mark as read if not already
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
    
    // Navigate to action URL if available
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.hide();
    }
  }

  // Utility methods
  getNotificationIcon(notification: MultiBranchNotification): string {
    return this.notificationService.getNotificationIcon(notification.type, notification.severity);
  }

  getNotificationColor(notification: MultiBranchNotification): string {
    return this.notificationService.getNotificationColor(notification.severity);
  }

  formatTimeAgo(timestamp: string): string {
    return this.notificationService.formatTimeAgo(timestamp);
  }

  getSeverityClass(severity: string): string {
    return `severity-${severity}`;
  }

  getTypeClass(type: string): string {
    return `type-${type}`;
  }

  getBadgeText(notification: MultiBranchNotification): string {
    if (notification.actionRequired) return 'Action Required';
    if (notification.severity === 'error') return 'Error';
    if (notification.severity === 'warning') return 'Warning';
    return '';
  }

  shouldShowBadge(notification: MultiBranchNotification): boolean {
    return notification.actionRequired || notification.severity === 'error' || notification.severity === 'warning';
  }

  // Connection status
  getConnectionStatusText(): string {
    return this.isConnected() ? 'Connected' : 'Disconnected';
  }

  getConnectionStatusClass(): string {
    return this.isConnected() ? 'connected' : 'disconnected';
  }

  // Quick actions
  viewAllSystemAlerts() {
    this.router.navigate(['/admin/alerts']);
    this.hide();
  }

  viewTransfers() {
    this.router.navigate(['/transfers']);
    this.hide();
  }

  viewSystemHealth() {
    this.router.navigate(['/admin/system-health']);
    this.hide();
  }

  // Export notifications (for debugging/reporting)
  exportNotifications() {
    const notifications = this.filteredNotifications();
    const data = notifications.map(n => ({
      timestamp: n.timestamp,
      type: n.type,
      severity: n.severity,
      title: n.title,
      message: n.message,
      branch: n.branchName,
      user: n.userName,
      isRead: n.isRead,
      actionRequired: n.actionRequired
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notifications-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Track by function for ngFor
  trackByNotificationId(index: number, notification: MultiBranchNotification): string {
    return notification.id;
  }
}