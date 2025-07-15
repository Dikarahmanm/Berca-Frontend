import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { UserService } from '../modules/user-management/services/user.service';
import { LogService } from '../modules/activity-log/services/log.service';
import { TopbarComponent } from '../shared/topbar/topbar';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  standalone: true,
  imports: [
    TopbarComponent,
    CommonModule,
    RouterModule
  ]
})
export class DashboardComponent implements OnInit {
  // ✅ DYNAMIC USER DATA
  username: string = '';
  role: string = '';
  avatarUrl: string = 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/947c66a6-b9ae-4e78-938f-0f423d69a713.png';
  notificationCount: number = 0;

  // Page title management
  currentPageTitle: string = 'Dashboard';
  currentPageSubtitle: string = 'Welcome to your admin panel';

  // ✅ DYNAMIC STATS
  userStats = {
    total: 0,
    active: 0,
    inactive: 0,
    deleted: 0
  };

  // Loading states
  isLoadingStats = true;
  isLoadingNotifications = true;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private userService: UserService,
    private logService: LogService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadDashboardData();
    this.setupRouterListener();
  }

  // ✅ LOAD USER DATA DYNAMICALLY
  private loadUserData() {
    console.log('📊 Loading user data...');
    
    // Get from localStorage first (immediate display)
    this.username = localStorage.getItem('username') || '';
    this.role = localStorage.getItem('role') || '';
    
    // Then verify with backend and get updated info
    this.authService.testAuthStatus().subscribe({
      next: (response: any) => {
        console.log('✅ Auth status verified:', response);
        
        if (response.username) {
          this.username = response.username;
          localStorage.setItem('username', response.username);
        }
        
        if (response.role) {
          this.role = response.role;
          localStorage.setItem('role', response.role);
        }
        
        console.log('👤 User data updated:', { username: this.username, role: this.role });
      },
      error: (error) => {
        console.error('❌ Failed to verify auth status:', error);
        // If auth fails, redirect to login
        if (error.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  // ✅ LOAD ALL DASHBOARD DATA
  private loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    this.isLoadingStats = true;
    this.isLoadingNotifications = true;
    
    // Load multiple data sources in parallel
    forkJoin({
      userStats: this.loadUserStats(),
      notifications: this.loadNotificationCount()
    }).subscribe({
      next: (results) => {
        console.log('✅ Dashboard data loaded:', results);
        this.isLoadingStats = false;
        this.isLoadingNotifications = false;
      },
      error: (error) => {
        console.error('❌ Failed to load dashboard data:', error);
        this.isLoadingStats = false;
        this.isLoadingNotifications = false;
      }
    });
  }

  // ✅ DYNAMIC USER STATS FROM BACKEND
  private loadUserStats() {
    return new Promise((resolve, reject) => {
      console.log('📈 Loading user statistics...');
      
      // Get active users (page 1, large pageSize to get total count)
      this.userService.getUsers(1, 1000, '').subscribe({
        next: (activeResponse: any) => {
          console.log('✅ Active users response:', activeResponse);
          
          // Get deleted users
          this.userService.getDeletedUsers(1, 1000).subscribe({
            next: (deletedResponse: any) => {
              console.log('✅ Deleted users response:', deletedResponse);
              
              // Calculate stats
              const activeUsers = activeResponse.users || [];
              const deletedUsers = deletedResponse.users || [];
              
              const activeCount = activeUsers.filter((u: any) => u.isActive).length;
              const inactiveCount = activeUsers.filter((u: any) => !u.isActive).length;
              
              this.userStats = {
                total: activeResponse.total + deletedResponse.total,
                active: activeCount,
                inactive: inactiveCount,
                deleted: deletedResponse.total
              };
              
              console.log('📊 User stats calculated:', this.userStats);
              resolve(this.userStats);
            },
            error: (error) => {
              console.error('❌ Failed to load deleted users:', error);
              // Fallback to active users only
              const activeUsers = activeResponse.users || [];
              const activeCount = activeUsers.filter((u: any) => u.isActive).length;
              const inactiveCount = activeUsers.filter((u: any) => !u.isActive).length;
              
              this.userStats = {
                total: activeResponse.total,
                active: activeCount,
                inactive: inactiveCount,
                deleted: 0
              };
              
              console.log('📊 User stats (partial):', this.userStats);
              resolve(this.userStats);
            }
          });
        },
        error: (error) => {
          console.error('❌ Failed to load user stats:', error);
          reject(error);
        }
      });
    });
  }

  // ✅ DYNAMIC NOTIFICATION COUNT
  private loadNotificationCount() {
    return new Promise((resolve, reject) => {
      console.log('🔔 Loading notification count...');
      
      // Get recent activity logs as notifications (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      this.logService.getLogs(1, 100, '', yesterdayStr).subscribe({
        next: (response: any) => {
          console.log('✅ Recent logs response:', response);
          
          // Count logs from last 24 hours as notifications
          const recentLogs = response.logs || [];
          this.notificationCount = recentLogs.length;
          
          console.log('🔔 Notification count:', this.notificationCount);
          resolve(this.notificationCount);
        },
        error: (error) => {
          console.error('❌ Failed to load notifications:', error);
          this.notificationCount = 0;
          resolve(0);
        }
      });
    });
  }

  private setupRouterListener() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updatePageTitle(event.url);
    });
  }

  private updatePageTitle(url: string) {
    if (url.includes('/users')) {
      this.currentPageTitle = 'User Management';
      this.currentPageSubtitle = `Manage users, roles, and permissions • ${this.userStats.total} total users`;
    } else if (url.includes('/logs')) {
      this.currentPageTitle = 'Activity Logs';
      this.currentPageSubtitle = 'Monitor system activities and user actions';
    } else {
      this.currentPageTitle = 'Dashboard';
      this.currentPageSubtitle = `Welcome back, ${this.username}! Here's your system overview.`;
    }
  }

  // ✅ REFRESH DATA METHOD
  refreshData() {
    console.log('🔄 Refreshing dashboard data...');
    this.loadDashboardData();
    
    // Show user feedback
    this.showRefreshFeedback();
  }

  private showRefreshFeedback() {
    // You could implement a toast notification here
    console.log('✅ Dashboard data refreshed!');
    
    // Simple alert for now (replace with proper toast notification)
    const originalText = document.querySelector('.action-btn.primary span')?.textContent;
    const button = document.querySelector('.action-btn.primary span') as HTMLElement;
    
    if (button) {
      button.textContent = 'Refreshed!';
      setTimeout(() => {
        button.textContent = originalText || 'Refresh';
      }, 2000);
    }
  }

  // ✅ ENHANCED LOGOUT WITH CLEANUP
  logout() {
    console.log('👋 Logging out...');
    
    this.authService.logout().subscribe({
      next: () => {
        // Clear all local data
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        
        // Reset component state
        this.username = '';
        this.role = '';
        this.notificationCount = 0;
        this.userStats = { total: 0, active: 0, inactive: 0, deleted: 0 };
        
        console.log('✅ Logout successful');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('❌ Logout failed:', err);
        // Force logout even if backend call fails
        localStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }

  // ✅ GETTER METHODS FOR TEMPLATE
  get welcomeMessage(): string {
    if (this.username) {
      const timeOfDay = this.getTimeOfDay();
      return `Good ${timeOfDay}, ${this.username}!`;
    }
    return 'Welcome to your dashboard!';
  }

  get roleDisplayName(): string {
    switch (this.role.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Manager';
      case 'user':
        return 'User';
      default:
        return this.role || 'User';
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  // ✅ UTILITY METHODS
  get isDataLoading(): boolean {
    return this.isLoadingStats || this.isLoadingNotifications;
  }

  get hasNotifications(): boolean {
    return this.notificationCount > 0;
  }

  get userStatsDisplay() {
    return {
      ...this.userStats,
      activePercentage: this.userStats.total > 0 ? Math.round((this.userStats.active / this.userStats.total) * 100) : 0,
      inactivePercentage: this.userStats.total > 0 ? Math.round((this.userStats.inactive / this.userStats.total) * 100) : 0
    };
  }
}