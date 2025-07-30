// src/app/dashboard/dashboard.component.ts
// ✅ FIXED: All template binding issues resolved
// Mengatasi NG8107, NG8002, TS2339 dengan proper interfaces dan property initialization

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, filter, debounceTime } from 'rxjs/operators';

// ✅ FIXED: Import TopbarComponent dengan path yang benar
import { TopbarComponent } from '../shared/topbar/topbar';
import { AuthService } from '../core/services/auth.service';
import { NotificationService, NotificationDto } from '../core/services/notification.service';

// ===== FIXED INTERFACES ===== //
// ✅ FIXED: Complete interface definitions tanpa optional properties yang menyebabkan NG8107

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  deleted: number;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCategories: number;
  totalProducts: number;
  lowStockCount: number;
  dailySales: number;
  monthlySales: number;
  lastUpdated: string;
}

// ✅ FIXED: RecentActivity interface dengan proper time property
interface RecentActivity {
  id: number;
  description: string;
  timestamp: string;      // ✅ FIXED: Backend timestamp
  time: string;          // ✅ FIXED: Ditambahkan untuk template compatibility
  relativeTime: string;  // ✅ FIXED: Human readable time
  type: 'success' | 'warning' | 'info' | 'error';
  icon: string;
  userId?: number;
  actionUrl?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TopbarComponent // ✅ FIXED: TopbarComponent properly imported
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ===== USER DATA ===== //
  username: string = '';
  role: string = '';
  pageTitle: string = 'Dashboard';
  
  // ✅ FIXED: notificationCount properly initialized untuk TopbarComponent input
  notificationCount: number = 0;
  
  // ===== DASHBOARD DATA - PROPERLY INITIALIZED ===== //
  // ✅ FIXED: userStats diinisialisasi dengan nilai default, menghilangkan kebutuhan optional chaining
  userStats: UserStats = {
    total: 0,
    active: 0,
    inactive: 0,
    deleted: 0
  };
  
  // ✅ FIXED: dashboardStats juga diinisialisasi dengan default values
  dashboardStats: DashboardStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalCategories: 0,
    totalProducts: 0,
    lowStockCount: 0,
    dailySales: 0,
    monthlySales: 0,
    lastUpdated: new Date().toISOString()
  };
  
  // ✅ FIXED: recentActivities dengan proper interface
  recentActivities: RecentActivity[] = [];
  recentNotifications: NotificationDto[] = [];
  
  // ===== UI STATE ===== //
  isLoadingStats: boolean = false;
  isLoadingNotifications: boolean = false;
  sidebarCollapsed: boolean = false;
  error: string | null = null;

  // ===== ROLE MAPPING ===== //
  roleDisplayMap: { [key: string]: string } = {
    'Admin': 'Administrator',
    'Manager': 'Manager', 
    'User': 'Kasir',
    'Cashier': 'Kasir',
    'Staff': 'Staff'
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    console.log('🚀 Fixed Dashboard initialized - all binding issues resolved');
    
    this.initializeComponent();
    this.subscribeToRealTimeData();
    this.setupRouterEvents();
    this.loadPreferences();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALIZATION ===== //

  /**
   * Initialize component dengan proper data initialization
   */
  private initializeComponent(): void {
    this.loadUserData();
    this.loadDashboardData();
    this.updatePageTitle();
  }

  /**
   * ✅ FIXED: Subscribe ke real-time data dengan proper error handling
   */
  private subscribeToRealTimeData(): void {
    // Subscribe ke notification count
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count: number) => {
          this.notificationCount = count; // ✅ FIXED: Properly updates for TopbarComponent
          console.log('📊 Notification count updated:', count);
        },
        error: (error: any) => {
          console.error('Error loading notification count:', error);
          this.notificationCount = 0; // ✅ FIXED: Fallback value
        }
      });

    // Subscribe ke notifications
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.recentNotifications = notifications.slice(0, 5);
      });

    // Subscribe ke loading state
    this.notificationService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        this.isLoadingNotifications = isLoading;
      });
  }

  /**
   * Setup router events
   */
  private setupRouterEvents(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updatePageTitle();
      });
  }

  // ===== DATA LOADING METHODS ===== //

  /**
   * Load user data dari AuthService
   */
  private loadUserData(): void {
    try {
      const currentUser = this.authService.getCurrentUser();
      
      if (currentUser) {
        this.username = currentUser.username || '';
        this.role = currentUser.role || '';
      } else {
        this.username = localStorage.getItem('username') || '';
        this.role = localStorage.getItem('role') || '';
      }

      console.log('👤 User data loaded:', { 
        username: this.username, 
        role: this.role 
      });

    } catch (error) {
      console.error('Error loading user data:', error);
      this.handleError('Failed to load user information');
    }
  }

  /**
   * ✅ FIXED: Load dashboard data dengan proper initialization
   */
  private loadDashboardData(): void {
    this.isLoadingStats = true;
    this.error = null;

    // Combine multiple data sources
    combineLatest([
      this.notificationService.getNotificationSummary(),
      this.loadDashboardStats(),
      this.loadRecentActivities()
    ]).pipe(
      takeUntil(this.destroy$),
      debounceTime(100)
    ).subscribe({
      next: ([notificationSummary, dashboardStatsData, activities]) => {
        // ✅ FIXED: Update dengan proper assignment tanpa optional chaining
        this.notificationCount = notificationSummary.unreadCount;
        this.recentNotifications = notificationSummary.recentNotifications.slice(0, 5);
        
        // ✅ FIXED: Update dashboardStats dan userStats dengan nilai pasti
        this.dashboardStats = dashboardStatsData;
        this.userStats = {
          total: dashboardStatsData.totalUsers,
          active: dashboardStatsData.activeUsers,
          inactive: dashboardStatsData.totalUsers - dashboardStatsData.activeUsers,
          deleted: 0 // TODO: Add from backend
        };
        
        // ✅ FIXED: Update activities dengan proper time mapping
        this.recentActivities = activities.map(activity => ({
          ...activity,
          time: this.getRelativeTime(activity.timestamp), // ✅ FIXED: Ensure time property exists
          relativeTime: this.getRelativeTime(activity.timestamp)
        }));
        
        this.isLoadingStats = false;
        console.log('📊 All dashboard data loaded successfully');
      },
      error: (error: any) => {
        console.error('Error loading dashboard data:', error);
        this.isLoadingStats = false;
        this.handleError('Failed to load dashboard data');
      }
    });
  }

  /**
   * ✅ FIXED: Load dashboard statistics dengan proper return type
   */
  private loadDashboardStats(): Promise<DashboardStats> {
    // TODO: Replace dengan actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalUsers: 12,
          activeUsers: 8,
          totalCategories: 8,
          totalProducts: 156,
          lowStockCount: 3,
          dailySales: 1250000,
          monthlySales: 35750000,
          lastUpdated: new Date().toISOString()
        });
      }, 500);
    });
  }

  /**
   * ✅ FIXED: Load recent activities dengan complete interface
   */
  private loadRecentActivities(): Promise<RecentActivity[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date();
        const activities: RecentActivity[] = [
          {
            id: 1,
            description: 'User login berhasil',
            timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
            time: '5 menit yang lalu',
            relativeTime: '5 menit yang lalu',
            type: 'success',
            icon: 'login'
          },
          {
            id: 2,
            description: 'Produk baru ditambahkan',
            timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
            time: '15 menit yang lalu',
            relativeTime: '15 menit yang lalu',
            type: 'info',
            icon: 'add_box'
          },
          {
            id: 3,
            description: 'Stock rendah terdeteksi',
            timestamp: new Date(now.getTime() - 30 * 60000).toISOString(),
            time: '30 menit yang lalu',
            relativeTime: '30 menit yang lalu',
            type: 'warning',
            icon: 'warning'
          },
          {
            id: 4,
            description: 'Transaksi POS berhasil',
            timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
            time: '1 jam yang lalu',
            relativeTime: '1 jam yang lalu',
            type: 'success',
            icon: 'point_of_sale'
          },
          {
            id: 5,
            description: 'Backup database selesai',
            timestamp: new Date(now.getTime() - 2 * 60 * 60000).toISOString(),
            time: '2 jam yang lalu',
            relativeTime: '2 jam yang lalu',
            type: 'info',
            icon: 'backup'
          }
        ];
        
        resolve(activities);
      }, 300);
    });
  }

  // ===== NAVIGATION METHODS ===== //

  /**
   * Navigate to specific route
   */
  navigateTo(route: string): void {
    this.router.navigate([route]).then(success => {
      if (success) {
        this.updatePageTitle();
      }
    });
  }

  /**
   * Update page title berdasarkan current route
   */
  private updatePageTitle(): void {
    const currentUrl = this.router.url;
    
    const titleMap: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/pos': 'Point of Sale',
      '/dashboard/users': 'User Management',
      '/dashboard/categories': 'Categories',
      '/dashboard/inventory': 'Inventory',
      '/dashboard/reports': 'Reports',
      '/dashboard/logs': 'Activity Logs',
      '/notifications': 'Notifications',
      '/profile': 'User Profile',
      '/settings': 'Settings'
    };

    this.pageTitle = titleMap[currentUrl] || 'Dashboard';
  }

  /**
   * Toggle sidebar collapse
   */
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed.toString());
  }

  /**
   * Handle logout
   */
  logout(): void {
    console.log('🚪 Logout initiated from dashboard');
    
    this.isLoadingStats = true;
    
    // Clear localStorage
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('sidebarCollapsed');
    
    // Clear notification service state
    this.notificationService.clearError();
    
    // Call real logout API
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
        this.showSuccess('Logout berhasil!');
      },
      error: (error: any) => {
        console.error('Logout error:', error);
        this.router.navigate(['/login']);
        this.showError('Logout error, but redirected to login');
      },
      complete: () => {
        this.isLoadingStats = false;
      }
    });
  }

  // ===== GETTER METHODS FOR TEMPLATE ===== //

  get currentUrl(): string {
    return this.router.url;
  }

  get isDashboardHome(): boolean {
    return this.currentUrl === '/dashboard';
  }

  get isNotDashboardHome(): boolean {
    return this.currentUrl !== '/dashboard';
  }

  // ===== COMPUTED PROPERTIES ===== //
  // ✅ FIXED: Remove optional chaining since userStats is always initialized

  /**
   * ✅ FIXED: Get total categories - no optional chaining needed
   */
  get totalCategories(): number {
    return this.dashboardStats.totalCategories;
  }

  /**
   * ✅ FIXED: Get total products - no optional chaining needed
   */
  get totalProducts(): number {
    return this.dashboardStats.totalProducts;
  }

  /**
   * ✅ FIXED: Get low stock count - no optional chaining needed
   */
  get lowStockCount(): number {
    return this.dashboardStats.lowStockCount;
  }

  // ===== UTILITY METHODS ===== //

  /**
   * Get greeting based on time
   */
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  }

  /**
   * Format number untuk display
   */
  formatNumber(num: number): string {
    return num.toLocaleString('id-ID');
  }

  /**
   * Format currency untuk display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  }

  /**
   * Get current date formatted
   */
  getCurrentDate(): string {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get user initials untuk avatar
   */
  getInitials(name: string): string {
    if (!name) return 'U';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  }

  /**
   * ✅ FIXED: Get relative time dengan proper implementation
   */
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

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.role === role;
  }

  /**
   * Check if user can access feature based on role
   */
  canAccess(feature: string): boolean {
    const rolePermissions: { [key: string]: string[] } = {
      'Admin': ['all'],
      'Manager': ['dashboard', 'pos', 'inventory', 'categories', 'users', 'reports'],
      'User': ['dashboard', 'pos', 'inventory'],
      'Cashier': ['dashboard', 'pos']
    };
    
    const permissions = rolePermissions[this.role] || [];
    return permissions.includes('all') || permissions.includes(feature);
  }

  // ===== ERROR HANDLING ===== //

  /**
   * Handle errors dengan user notification
   */
  private handleError(message: string): void {
    this.error = message;
    this.showError(message);
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.error = null;
    this.notificationService.clearError();
  }

  // ===== NOTIFICATION METHODS ===== //

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }

  // ===== QUICK ACTIONS ===== //

  /**
   * Quick action methods
   */
  startPOS(): void {
    if (this.canAccess('pos')) {
      this.navigateTo('/pos');
    } else {
      this.showError('Anda tidak memiliki akses ke POS');
    }
  }

  manageInventory(): void {
    if (this.canAccess('inventory')) {
      this.navigateTo('/dashboard/inventory');
    } else {
      this.showError('Anda tidak memiliki akses ke Inventory');
    }
  }

  viewReports(): void {
    if (this.canAccess('reports')) {
      this.navigateTo('/dashboard/reports');
    } else {
      this.showError('Anda tidak memiliki akses ke Reports');
    }
  }

  openNotifications(): void {
    this.navigateTo('/notifications');
  }

  // ===== PREFERENCES ===== //

  /**
   * Load saved preferences
   */
  private loadPreferences(): void {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed) {
      this.sidebarCollapsed = savedCollapsed === 'true';
    }
    
    if (window.innerWidth <= 768) {
      this.sidebarCollapsed = true;
    }
  }

  // ===== TRACK BY FUNCTIONS ===== //

  /**
   * Track by functions untuk ngFor performance
   */
  trackByActivityId(index: number, item: RecentActivity): number {
    return item.id;
  }

  trackByNotificationId(index: number, item: NotificationDto): number {
    return item.id;
  }
}