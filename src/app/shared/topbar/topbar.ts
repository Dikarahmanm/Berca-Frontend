// src/app/shared/topbar/topbar.component.ts
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import services (with fallback interfaces if services don't exist yet)
interface AuthService {
  logout(): any;
}

interface UserProfileService {
  getCurrentProfile(): any;
  currentProfile$: any;
  clearProfile(): void;
  getAvatarUrl(photoUrl: string): string;
}

interface NotificationService {
  getUnreadCount(): number;
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
    MatSnackBarModule
  ]
})
export class TopbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Input properties
  @Input() pageTitle: string = 'Dashboard';
  @Input() username: string = '';
  @Input() role: string = '';
  @Input() avatarUrl: string = '';

  // Output events
  @Output() logoutClicked = new EventEmitter<void>();

  // User data
  currentUser: any = null;
  userProfile: any = null;

  // UI state
  isMenuOpen = false;
  isProfileMenuOpen = false;
  dropdownOpen = false;
  isLoading = false;

  // Navigation items
  navigationItems = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      permission: null
    },
    {
      label: 'POS Kasir',
      icon: 'point_of_sale',
      route: '/pos',
      permission: 'POS.Read',
      highlight: true // Highlight untuk Sprint 2
    },
    {
      label: 'Inventori',
      icon: 'inventory_2',
      route: '/inventory',
      permission: 'Inventory.Read',
      disabled: true // Akan diaktifkan nanti
    },
    {
      label: 'Kategori',
      icon: 'category',
      route: '/category-management',
      permission: 'Category.Read'
    },
    {
      label: 'Membership',
      icon: 'card_membership',
      route: '/membership',
      permission: 'Membership.Read',
      disabled: true // Akan diaktifkan nanti
    },
    {
      label: 'User Management',
      icon: 'people',
      route: '/user-management',
      permission: 'UserManagement.Read'
    },
    {
      label: 'Laporan',
      icon: 'analytics',
      route: '/reports',
      permission: 'Reports.Read',
      disabled: true // Akan diaktifkan nanti
    },
    {
      label: 'Activity Log',
      icon: 'history',
      route: '/activity-log',
      permission: 'Reports.Read'
    }
  ];

  // Profile menu items
  profileMenuItems = [
    {
      label: 'Profil Saya',
      icon: 'person',
      action: () => this.navigateToProfile()
    },
    {
      label: 'Pengaturan',
      icon: 'settings',
      action: () => this.navigateToSettings()
    },
    {
      label: 'Pusat Bantuan',
      icon: 'help',
      action: () => this.openHelp()
    },
    {
      type: 'divider'
    },
    {
      label: 'Logout',
      icon: 'logout',
      action: () => this.logout(),
      danger: true
    }
  ];

  // Role display mapping
  private roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator',
    'Manager': 'Manager',
    'User': 'Pengguna',
    'Cashier': 'Kasir'
  };

  // Role color mapping
  private roleColorMap: { [key: string]: string } = {
    'Admin': '#E15A4F',      // Red
    'Manager': '#FF914D',    // Orange
    'User': '#4BBF7B',       // Green
    'Cashier': '#FFB84D'     // Yellow
  };

  constructor(
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.setDefaults();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Set default values
   */
  private setDefaults() {
    if (!this.username) this.username = this.getUserDisplayName();
    if (!this.role) this.role = 'Admin';
    if (!this.avatarUrl) {
      this.avatarUrl = 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/947c66a6-b9ae-4e78-938f-0f423d69a713.png';
    }
  }

  /**
   * Load current user data
   */
  private loadUserData() {
    // For now, use localStorage data since getCurrentUser method doesn't exist
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    
    if (username && role) {
      this.currentUser = {
        username: username,
        role: role
      };
      
      // Load user profile if service exists
      this.loadUserProfile();
    } else {
      console.warn('No user data found in localStorage');
    }
  }

  /**
   * Load user profile details
   */
  private loadUserProfile() {
    // Create fallback profile from localStorage
    this.userProfile = {
      fullName: localStorage.getItem('userFullName') || this.currentUser?.username || 'User',
      email: localStorage.getItem('userEmail') || '',
      photoUrl: localStorage.getItem('userPhotoUrl') || null
    };
  }

  /**
   * Toggle main navigation menu
   */
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /**
   * Toggle profile dropdown menu
   */
  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  /**
   * Toggle profile dropdown (for compatibility)
   */
  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    this.isProfileMenuOpen = this.dropdownOpen;
  }

  /**
   * Close profile menu
   */
  closeProfileMenu() {
    this.isProfileMenuOpen = false;
    this.dropdownOpen = false;
  }

  /**
   * Navigate to route
   */
  navigateTo(route: string) {
    this.router.navigate([route]);
    this.isMenuOpen = false;
  }

  /**
   * Navigate to profile page
   */
  navigateToProfile() {
    this.router.navigate(['/user-profile']);
    this.closeProfileMenu();
  }

  /**
   * Navigate to settings (future implementation)
   */
  navigateToSettings() {
    this.snackBar.open('Pengaturan akan tersedia segera', 'Tutup', { duration: 2000 });
    this.closeProfileMenu();
  }

  /**
   * Open help center (future implementation)
   */
  openHelp() {
    this.snackBar.open('Pusat bantuan akan tersedia segera', 'Tutup', { duration: 2000 });
    this.closeProfileMenu();
  }

  /**
   * Handle notification click
   */
  onNotificationClick() {
    // Add shake animation
    const bellButton = document.querySelector('.bell-button');
    if (bellButton) {
      bellButton.classList.add('shake-animation');
      setTimeout(() => {
        bellButton.classList.remove('shake-animation');
      }, 600);
    }
    
    this.navigateToNotifications();
  }

  /**
   * Logout user
   */
  async logout() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear localStorage
      localStorage.clear();
      
      this.snackBar.open('Logout berhasil', 'Tutup', { duration: 2000 });
      this.logoutClicked.emit();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      localStorage.clear();
      this.snackBar.open('Logout berhasil', 'Tutup', { duration: 2000 });
      this.router.navigate(['/auth/login']);
    } finally {
      this.closeProfileMenu();
      this.isLoading = false;
    }
  }

  /**
   * Get user display name
   */
  getUserDisplayName(): string {
    if (this.userProfile?.fullName) {
      return this.userProfile.fullName;
    }
    if (this.currentUser?.username) {
      return this.currentUser.username;
    }
    if (this.username) {
      return this.username;
    }
    return 'User';
  }

  /**
   * Get user avatar URL or initials
   */
  getUserAvatar(): string | null {
    if (this.avatarUrl) {
      return this.avatarUrl;
    }
    if (this.userProfile?.photoUrl) {
      return this.userProfile.photoUrl;
    }
    return null;
  }

  /**
   * Get user initials for avatar fallback
   */
  getUserInitials(): string {
    const name = this.getUserDisplayName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  /**
   * Get user role display
   */
  getUserRole(): string {
    if (this.userProfile?.position) {
      return this.userProfile.position;
    }
    if (this.role) {
      return this.role;
    }
    if (this.currentUser?.role) {
      return this.currentUser.role;
    }
    return '';
  }

  /**
   * Get role display name
   */
  get roleDisplayName(): string {
    const role = this.getUserRole();
    return this.roleDisplayMap[role] || role;
  }

  /**
   * Get role color
   */
  getRoleColor(): string {
    const role = this.getUserRole();
    return this.roleColorMap[role] || '#FF914D';
  }

  /**
   * Handle avatar error
   */
  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Set default avatar on error
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRjkxNEQiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNMTIgMTJjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
  }

  /**
   * Check if user has permission for navigation item
   */
  hasPermission(permission: string | null): boolean {
    if (!permission) return true;
    
    // TODO: Implement proper permission checking based on user roles
    // For now, return true for all permissions
    return true;
  }

  /**
   * Check if navigation item should be shown
   */
  shouldShowNavItem(item: any): boolean {
    return !item.disabled && this.hasPermission(item.permission);
  }

  /**
   * Get current route for active state
   */
  isRouteActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  /**
   * Handle profile menu item click
   */
  onProfileMenuItemClick(item: any) {
    if (item.action && typeof item.action === 'function') {
      item.action();
    }
  }

  /**
   * Handle outside click to close menus
   */
  onOutsideClick() {
    this.isMenuOpen = false;
    this.isProfileMenuOpen = false;
    this.dropdownOpen = false;
  }

  /**
   * Get notification badge count from service
   */
  getNotificationCount(): number {
    // Mock notification count for now
    return 3;
  }

  /**
   * Navigate to notifications page
   */
  navigateToNotifications() {
    this.router.navigate(['/notifications']);
  }
}