// src/app/dashboard/dashboard.component.ts - FIXED Router Conflicts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../core/services/auth.service';
import { TopbarComponent } from '../shared/topbar/topbar';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    TopbarComponent
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ✅ USER DATA
  username: string = '';
  role: string = '';
  avatarUrl: string = 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/947c66a6-b9ae-4e78-938f-0f423d69a713.png';
  notificationCount: number = 0;

  // ✅ PAGE STATE
  currentPageTitle: string = 'Dashboard';
  currentPageSubtitle: string = 'Welcome to Toko Eniwan';

  // ✅ DASHBOARD STATS
  userStats = {
    total: 0,
    active: 0,
    inactive: 0,
    deleted: 0
  };

  totalCategories = 5; // Default value
  isLoadingStats = false;

  constructor(
    private authService: AuthService,
    private router: Router // ✅ SINGLE router declaration - private
  ) {}

  ngOnInit() {
    this.initializeComponent();
    this.setupRouterListener();
    this.loadUserData();
    this.loadDashboardStats();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALIZATION =====

  private initializeComponent(): void {
    console.log('🚀 Clean Dashboard initialized');
    this.updatePageTitle(this.router.url);
  }

  private setupRouterListener(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.updatePageTitle(event.url);
      });
  }

  private updatePageTitle(url: string): void {
    const titleMap: { [key: string]: { title: string; subtitle: string } } = {
      '/dashboard': { title: 'Dashboard', subtitle: 'Welcome to Toko Eniwan' },
      '/pos': { title: 'POS Kasir', subtitle: 'Point of Sale System' },
      '/categories': { title: 'Categories', subtitle: 'Manage Product Categories' },
      '/users': { title: 'User Management', subtitle: 'Manage System Users' },
      '/activity-log': { title: 'Activity Logs', subtitle: 'System Activity History' },
      '/settings': { title: 'Settings', subtitle: 'System Configuration' },
      '/notifications': { title: 'Notifications', subtitle: 'System Notifications' }
    };

    const pageInfo = titleMap[url] || { title: 'Dashboard', subtitle: 'Toko Eniwan' };
    this.currentPageTitle = pageInfo.title;
    this.currentPageSubtitle = pageInfo.subtitle;
  }

  // ===== USER DATA =====

  private loadUserData(): void {
    // Get user data from auth service
    const user = this.authService.getCurrentUser();
    
    if (user) {
      this.username = user.username || 'Guest User';
      this.role = user.role || 'User';
    } else {
      // Fallback to localStorage
      this.username = localStorage.getItem('username') || 'Guest User';
      this.role = localStorage.getItem('role') || 'User';
    }

    console.log('👤 User loaded:', { username: this.username, role: this.role });
  }

  // ===== DASHBOARD STATS =====

  private loadDashboardStats(): void {
    this.isLoadingStats = true;
    
    // Mock data loading - replace with real services
    setTimeout(() => {
      this.userStats = {
        total: 8,
        active: 6,
        inactive: 1,
        deleted: 1
      };
      
      this.totalCategories = 5;
      this.notificationCount = 3;
      this.isLoadingStats = false;
      
      console.log('📊 Dashboard stats loaded');
    }, 1000);
  }

  // ===== NAVIGATION METHODS =====

  /**
   * Navigate to specific route
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /**
   * Open notifications panel
   */
  openNotifications(): void {
    this.navigateTo('/notifications');
  }

  /**
   * Handle logout from topbar
   */
  logout(): void {
    console.log('🚪 Logout initiated from dashboard');
    
    // Clear user data
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    
    // Navigate to login
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.router.navigate(['/auth/login']); // Force navigation even on error
      }
    });
  }

  // ===== PUBLIC GETTERS FOR TEMPLATE ACCESS =====

  /**
   * ✅ FIXED: Public getter for current URL to access from template
   * Replaces direct router access in template
   */
  get currentUrl(): string {
    return this.router.url;
  }

  /**
   * ✅ FIXED: Check if current route is dashboard home
   * Used in template instead of direct router.url comparison
   */
  get isDashboardHome(): boolean {
    return this.currentUrl === '/dashboard';
  }

  /**
   * ✅ FIXED: Check if current route is NOT dashboard home
   * Used in template for router-outlet conditional display
   */
  get isNotDashboardHome(): boolean {
    return this.currentUrl !== '/dashboard';
  }

  // ===== UTILITY METHODS =====

  /**
   * Get greeting based on time of day
   */
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /**
   * Format number for display
   */
  formatNumber(num: number): string {
    return num.toLocaleString();
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
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.role === role;
  }

  /**
   * Get user role color for UI
   */
  getRoleColor(): string {
    const colorMap: { [key: string]: string } = {
      'Admin': '#ef4444',
      'Manager': '#f59e0b',
      'User': '#10b981',
      'Cashier': '#3b82f6'
    };
    return colorMap[this.role] || '#64748b';
  }
}