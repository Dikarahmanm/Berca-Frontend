// src/app/shared/topbar/topbar.ts - MINIMALIST VERSION
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Notification interface for dropdown
interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
}

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatDialogModule
  ]
})
export class TopbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ✅ MINIMAL INPUT PROPERTIES
  @Input() pageTitle: string = 'Dashboard';
  @Input() username: string = '';
  @Input() role: string = '';
  @Input() avatarUrl: string = '';
  @Input() notificationCount: number = 0;

  // ✅ MINIMAL OUTPUT EVENTS
  @Output() logoutClicked = new EventEmitter<void>();

  // UI State
  isLoading = false;

  // ✅ MOCK NOTIFICATIONS for dropdown (replace with real service)
  mockNotifications: NotificationItem[] = [
    {
      id: 1,
      title: 'Stock Alert',
      message: 'Low stock for Mie Instan Sedap',
      time: '5 minutes ago',
      read: false,
      type: 'warning'
    },
    {
      id: 2,
      title: 'New Sale',
      message: 'Transaction #001234 completed',
      time: '15 minutes ago',
      read: false,
      type: 'success'
    },
    {
      id: 3,
      title: 'System Update',
      message: 'POS system updated successfully',
      time: '1 hour ago',
      read: true,
      type: 'info'
    }
  ];

  // Role display mapping
  roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator',
    'Manager': 'Manager',
    'User': 'Kasir',
    'Cashier': 'Kasir'
  };

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    console.log('🔧 Minimalist Topbar initialized');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== NAVIGATION METHODS =====

  /**
   * Navigate to route
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /**
   * Navigate to settings page
   */
  navigateToSettings(): void {
    this.navigateTo('/settings');
  }

  /**
   * Show change user dialog
   */
  showChangeUserDialog(): void {
    // TODO: Implement change user dialog
    this.snackBar.open('Change user feature coming soon', 'Close', { duration: 3000 });
  }

  /**
   * Handle logout
   */
  logout(): void {
    this.isLoading = true;
    this.logoutClicked.emit();
    
    // Simulate logout process
    setTimeout(() => {
      this.isLoading = false;
      this.showSuccess('Logout successful!');
    }, 1000);
  }

  // ===== USER DATA METHODS =====

  /**
   * Get user display name
   */
  getUserDisplayName(): string {
    return this.username || 'Guest User';
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(): string {
    const name = this.getUserDisplayName();
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Get user avatar URL
   */
  getUserAvatar(): string {
    return this.avatarUrl || '';
  }

  /**
   * Get role display name
   */
  get roleDisplayName(): string {
    return this.roleDisplayMap[this.role] || this.role || 'User';
  }

  /**
   * Get notification count
   */
  getNotificationCount(): number {
    return this.notificationCount;
  }

  // ===== NOTIFICATION METHODS =====

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead(): void {
    this.mockNotifications.forEach(notification => {
      notification.read = true;
    });
    this.notificationCount = 0;
    this.showSuccess('All notifications marked as read');
  }

  /**
   * Mark single notification as read
   */
  markNotificationRead(notificationId: number): void {
    const notification = this.mockNotifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.notificationCount = Math.max(0, this.notificationCount - 1);
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Handle avatar error
   */
  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Set default avatar on error
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRjkxNEQiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNMTIgMTJjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(`✅ ${message}`, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.snackBar.open(`❌ ${message}`, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}