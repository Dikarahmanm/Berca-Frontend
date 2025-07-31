// src/app/shared/components/topbar/topbar.component.ts
// ✅ REDESIGNED: Topbar Component dengan Glass Morphism Orange Modern Theme

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { NotificationDto,NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Input properties
  @Input() pageTitle: string = '';
  @Input() brandTitle: string = 'Toko Eniwan';
  @Input() username: string = '';
  @Input() role: string = '';
  @Input() userPhoto?: string;
  @Input() notificationCount: number = 0;
  @Input() showMenuToggle: boolean = false;
  @Input() showBreadcrumb: boolean = true;
  @Input() showQuickActions: boolean = false;
  @Input() breadcrumb: string[] = [];
  @Input() isMobile: boolean = false;

  // Output events
  @Output() logoutClicked = new EventEmitter<void>();
  @Output() menuToggleClicked = new EventEmitter<void>();

  // Component state
  recentNotifications: NotificationDto[] = [];
  isLoadingNotifications: boolean = false;
  notificationError: string | null = null;
  isLoggingOut: boolean = false;
  isDarkMode: boolean = false;
  showNotificationDropdown: boolean = false;
  showProfileDropdown: boolean = false;

  private roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator',
    'Manager': 'Manager',
    'User': 'Kasir',
    'Cashier': 'Kasir',
    'Staff': 'Staff'
  };

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeTopbar();
    this.subscribeToNotifications();
    this.checkMobileState();
    this.setupDocumentClickListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }

  private initializeTopbar(): void {
    console.log('🔝 Redesigned Topbar initialized');
    
    // Load theme preference
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Load initial notifications from API first, then fallback to mock data
    this.loadNotifications();
  }

  private loadNotifications(): void {
    try {
      this.isLoadingNotifications = true;
      this.notificationError = null;
      
      // Try to load from API using existing service method
      this.notificationService.getNotificationSummary().subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.recentNotifications = response.data.recentNotifications || response.recentNotifications || [];
            this.notificationCount = response.data.unreadCount || response.unreadCount || 0;
            console.log('✅ Notifications loaded from API:', this.recentNotifications.length);
          } else {
            // Fallback to mock data if API response is empty
            this.initializeMockData();
          }
          this.isLoadingNotifications = false;
        },
        error: (error: any) => {
          console.warn('⚠️ API failed, using mock data:', error);
          this.notificationError = 'Failed to load notifications';
          // Fallback to mock data
          this.initializeMockData();
          this.isLoadingNotifications = false;
        }
      });
      
    } catch (error) {
      console.error('Error in loadNotifications:', error);
      this.initializeMockData();
      this.isLoadingNotifications = false;
    }
  }

  private initializeMockData(): void {
    console.log('📝 Using mock notification data');
    
    // Initialize with mock data for testing
    this.recentNotifications = [
      {
        id: 1,
        title: 'Pesanan Baru #001',
        message: 'Pesanan baru telah masuk dari customer',
        type: 'order',
        isRead: false,
        priority: 'high',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        userId: 1,
        createdBy: 'System'
      },
      {
        id: 2, 
        title: 'Stock Alert',
        message: 'Stok produk ABC hampir habis',
        type: 'warning',
        isRead: false,
        priority: 'medium',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        userId: 1,
        createdBy: 'System'
      },
      {
        id: 3,
        title: 'Payment Received',
        message: 'Pembayaran untuk pesanan #999 berhasil',
        type: 'success', 
        isRead: true,
        priority: 'low',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        readAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        userId: 1,
        createdBy: 'System'
      }
    ];
    
    this.notificationCount = this.recentNotifications.filter(n => !n.isRead).length;
  }

  private subscribeToNotifications(): void {
    // Subscribe to notifications
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications: NotificationDto[]) => {
        this.recentNotifications = notifications.slice(0, 5);
      });

    // Subscribe to loading state
    this.notificationService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading: boolean) => {
        this.isLoadingNotifications = isLoading;
      });

    // Subscribe to error state
    this.notificationService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error: string | null) => {
        this.notificationError = error;
      });
  }

  private checkMobileState(): void {
    this.isMobile = window.innerWidth <= 768;
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 768;
    });
  }

  private setupDocumentClickListener(): void {
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  private onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const notificationWrapper = target.closest('.notification-wrapper');
    const profileWrapper = target.closest('.profile-wrapper');
    
    if (!notificationWrapper) {
      this.showNotificationDropdown = false;
    }
    
    if (!profileWrapper) {
      this.showProfileDropdown = false;
    }
  }

  // Dropdown toggle methods
  toggleNotificationDropdown(): void {
    this.showNotificationDropdown = !this.showNotificationDropdown;
    this.showProfileDropdown = false; // Close other dropdown
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
    this.showNotificationDropdown = false; // Close other dropdown
  }

  // Helper methods for templates
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} hari yang lalu`;
  }

  markAsRead(notification: NotificationDto): void {
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
      this.notificationCount = this.recentNotifications.filter(n => !n.isRead).length;
      // TODO: Call API to mark as read
    }
  }

  viewAllNotifications(): void {
    this.showNotificationDropdown = false;
    this.router.navigate(['/dashboard/notifications']);
  }

  markAllAsRead(): void {
    // Update local state first for immediate UI feedback
    this.recentNotifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
      }
    });
    this.notificationCount = 0;
    
    // Then call API
    this.notificationService.markAllAsRead().subscribe({
      next: (success: boolean) => {
        if (success) {
          console.log('✅ All notifications marked as read');
          this.showSuccessMessage('All notifications marked as read');
        }
      },
      error: (error: any) => {
        console.error('Error marking all as read:', error);
        this.showErrorMessage('Failed to mark all as read');
        // Revert local changes on error
        this.loadNotifications();
      }
    });
  }

  // Navigation methods
  navigateHome(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  navigateToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  // Notification methods
  onNotificationClick(notification: NotificationDto): void {
    if (!notification.isRead) {
      this.markNotificationAsRead(notification.id);
    }

    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    } else {
      this.navigateToNotifications();
    }
  }

  markNotificationAsRead(id: number): void {
    this.notificationService.markAsRead(id).subscribe({
      next: (success: boolean) => {
        if (success) {
          const notification = this.recentNotifications.find(n => n.id === id);
          if (notification) {
            notification.isRead = true;
          }
        }
      },
      error: (error: any) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  refreshNotifications(): void {
    this.loadNotifications();
  }

  // User actions
  logout(): void {
    this.isLoggingOut = true;
    this.logoutClicked.emit();
    
    // Reset loading state after timeout
    setTimeout(() => {
      this.isLoggingOut = false;
    }, 3000);
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    
    this.showSuccessMessage(`Switched to ${this.isDarkMode ? 'dark' : 'light'} mode`);
  }

  // Utility methods
  getInitials(name: string): string {
    if (!name) return 'U';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  }

  getRoleDisplay(role: string): string {
    return this.roleDisplayMap[role] || role;
  }

  getNotificationIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'order': 'shopping_cart',
      'warning': 'warning',
      'success': 'check_circle',
      'info': 'info',
      'error': 'error',
      'LOW_STOCK': 'warning',
      'SALE_COMPLETED': 'point_of_sale',
      'SYSTEM_MAINTENANCE': 'build',
      'USER_ACTION': 'person',
      'BACKUP_COMPLETED': 'backup',
      'ERROR': 'error',
      'INFO': 'info',
      'SUCCESS': 'check_circle'
    };
    return iconMap[type] || 'notifications';
  }

  getNotificationTypeClass(type: string): string {
    const classMap: { [key: string]: string } = {
      'LOW_STOCK': 'type-warning',
      'SALE_COMPLETED': 'type-success',
      'SYSTEM_MAINTENANCE': 'type-info',
      'USER_ACTION': 'type-info',
      'BACKUP_COMPLETED': 'type-success',
      'ERROR': 'type-error',
      'INFO': 'type-info',
      'SUCCESS': 'type-success'
    };
    return classMap[type] || 'type-info';
  }

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    
    return date.toLocaleDateString('id-ID');
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }

  trackByNotificationId(index: number, notification: NotificationDto): number {
    return notification.id;
  }
}