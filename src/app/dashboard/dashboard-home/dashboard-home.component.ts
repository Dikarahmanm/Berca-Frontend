// src/app/dashboard/dashboard-home/dashboard-home.component.ts
// ✅ SIMPLIFIED: Operational Focus Only - 4 Core Cards (Sales, Alerts, Actions, Activity)
// Following Project Guidelines: Clean Design, Signal-based, Performance Optimized

import { Component, OnInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Subject, interval, timer } from 'rxjs';
import { takeUntil, switchMap, startWith, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService, NotificationDto } from '../../core/services/notification.service';
import { DashboardService, DashboardKPIDto, QuickStatsDto } from '../../core/services/dashboard.service';
import { UserService } from '../../modules/user-management/services/user.service';
import { SmartNotificationService } from '../../core/services/smart-notification.service';
import { ExpiryManagementService } from '../../core/services/expiry-management.service';

// Utility: Konversi waktu ke jam Jakarta (WIB)
function toJakartaTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const jakarta = new Date(utc + (7 * 60 * 60 * 1000));
  const hours = jakarta.getHours().toString().padStart(2, '0');
  const minutes = jakarta.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  deleted: number;
}

interface DashboardStats {
  todayRevenue: number;
  monthlyRevenue: number;
  totalProducts: number;
  lowStockCount: number;
  totalMembers: number;
  todayTransactions: number;
  lastUpdated: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  enabled: boolean;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule
  ],
  template: `
    <div class="dashboard-home">

      <!-- Welcome Section - SIMPLIFIED: Clean Simple Design -->
      <section class="welcome-section">
        <div class="welcome-card">
          <div class="welcome-content">
            <div class="welcome-text">
              <h1 class="welcome-greeting">{{ greeting() }}, {{ username() }}!</h1>
              <p class="welcome-date">{{ currentDate() }}</p>
              <p class="welcome-subtitle">Selamat datang di sistem POS Toko Eniwan</p>
            </div>
            
            <div class="welcome-actions">
              <button class="action-btn primary" (click)="navigateTo('/dashboard/pos')">
                <mat-icon>point_of_sale</mat-icon>
                <span>Mulai Transaksi</span>
              </button>
              <button class="action-btn secondary" (click)="navigateTo('/dashboard/analytics')">
                <mat-icon>analytics</mat-icon>
                <span>Lihat Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- SIMPLIFIED: 4 Core Operational Cards Only -->
      <section class="operational-cards-section">
        <div class="section-header">
          <div class="header-content">
            <div class="header-text">
              <h2>Operational Overview</h2>
              <p>Core business metrics and quick actions</p>
            </div>
            <button 
              class="refresh-btn" 
              (click)="refreshDashboardData()"
              [disabled]="isLoading()"
              title="Refresh Data">
              <mat-icon [class.spinning]="isLoading()">refresh</mat-icon>
              <span *ngIf="!isLoading()">Refresh</span>
              <span *ngIf="isLoading()">Loading...</span>
            </button>
          </div>
        </div>

        <div class="operational-grid">
          
          <!-- 1. SALES CARD - Daily/Monthly Revenue -->
          <div class="operational-card sales-card" (click)="navigateTo('/dashboard/pos')">
            <div class="card-header">
              <div class="card-icon sales">
                <mat-icon>monetization_on</mat-icon>
              </div>
              <div class="card-title">
                <h3>Sales</h3>
                <p>Revenue & Transactions</p>
              </div>
            </div>
            <div class="card-content">
              <div class="main-metric">
                <div class="metric-value">{{ formatCurrency(dashboardStats().todayRevenue) }}</div>
                <div class="metric-label">Today's Revenue</div>
              </div>
              <div class="secondary-metrics">
                <div class="metric-item">
                  <span class="metric-number">{{ dashboardStats().todayTransactions }}</span>
                  <span class="metric-text">Transactions</span>
                </div>
                <div class="metric-item">
                  <span class="metric-number">{{ formatCurrency(dashboardStats().monthlyRevenue) }}</span>
                  <span class="metric-text">Monthly</span>
                </div>
              </div>
            </div>
            <div class="card-action">
              <span>Start Transaction</span>
              <mat-icon>arrow_forward</mat-icon>
            </div>
          </div>

          <!-- 2. ALERTS CARD - Critical Notifications & Stock Alerts -->
          <div class="operational-card alerts-card" [class.has-alerts]="hasActiveAlerts()" (click)="navigateTo('/dashboard/notifications')">
            <div class="card-header">
              <div class="card-icon alerts" [class.critical]="hasCriticalAlerts()">
                <mat-icon>{{ hasActiveAlerts() ? 'warning' : 'check_circle' }}</mat-icon>
              </div>
              <div class="card-title">
                <h3>Alerts</h3>
                <p>System Notifications</p>
              </div>
            </div>
            <div class="card-content">
              <div class="main-metric">
                <div class="metric-value">{{ totalAlertsCount() }}</div>
                <div class="metric-label">{{ hasActiveAlerts() ? 'Active Alerts' : 'All Clear' }}</div>
              </div>
              <div class="secondary-metrics">
                <div class="metric-item critical" *ngIf="criticalAlertsCount() > 0">
                  <span class="metric-number">{{ criticalAlertsCount() }}</span>
                  <span class="metric-text">Critical</span>
                </div>
                <div class="metric-item warning" *ngIf="dashboardStats().lowStockCount > 0">
                  <span class="metric-number">{{ dashboardStats().lowStockCount }}</span>
                  <span class="metric-text">Low Stock</span>
                </div>
                <div class="metric-item success" *ngIf="!hasActiveAlerts()">
                  <span class="metric-number">✓</span>
                  <span class="metric-text">All Good</span>
                </div>
              </div>
            </div>
            <div class="card-action">
              <span>{{ hasActiveAlerts() ? 'View Alerts' : 'All Systems OK' }}</span>
              <mat-icon>{{ hasActiveAlerts() ? 'priority_high' : 'check_circle' }}</mat-icon>
            </div>
          </div>

          <!-- 3. ACTIVITY CARD - Recent Activity & Stats -->
          <div class="operational-card activity-card" (click)="navigateTo('/dashboard/analytics')">
            <div class="card-header">
              <div class="card-icon activity">
                <mat-icon>timeline</mat-icon>
              </div>
              <div class="card-title">
                <h3>Activity</h3>
                <p>System Overview</p>
              </div>
            </div>
            <div class="card-content">
              <div class="activity-stats">
                <div class="activity-item">
                  <div class="activity-icon">
                    <mat-icon>inventory_2</mat-icon>
                  </div>
                  <div class="activity-details">
                    <div class="activity-number">{{ formatNumber(dashboardStats().totalProducts) }}</div>
                    <div class="activity-label">Products</div>
                  </div>
                </div>
                <div class="activity-item">
                  <div class="activity-icon">
                    <mat-icon>people</mat-icon>
                  </div>
                  <div class="activity-details">
                    <div class="activity-number">{{ formatNumber(dashboardStats().totalMembers) }}</div>
                    <div class="activity-label">Members</div>
                  </div>
                </div>
                <div class="activity-item">
                  <div class="activity-icon">
                    <mat-icon>schedule</mat-icon>
                  </div>
                  <div class="activity-details">
                    <div class="activity-number">{{ formatTime(dashboardStats().lastUpdated) }}</div>
                    <div class="activity-label">Last Update</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-action">
              <span>View Analytics</span>
              <mat-icon>trending_up</mat-icon>
            </div>
          </div>

        </div>
      </section>

      <!-- Quick Actions Section -->
      <section class="quick-actions-section">
        <div class="section-header">
          <div class="header-content">
            <div class="header-text">
              <h2>⚡ Quick Actions</h2>
              <p>Common operations and shortcuts</p>
            </div>
          </div>
        </div>

        <div class="quick-actions-grid">
          <button class="quick-action-card" (click)="navigateTo('/dashboard/inventory/add')">
            <div class="action-icon">
              <mat-icon>add_box</mat-icon>
            </div>
            <div class="action-content">
              <h3>Add Product</h3>
              <p>Add new product to inventory</p>
            </div>
            <div class="action-arrow">
              <mat-icon>arrow_forward</mat-icon>
            </div>
          </button>

          <button class="quick-action-card" (click)="navigateTo('/dashboard/inventory')">
            <div class="action-icon">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div class="action-content">
              <h3>Manage Stock</h3>
              <p>Update stock levels and quantities</p>
            </div>
            <div class="action-arrow">
              <mat-icon>arrow_forward</mat-icon>
            </div>
          </button>

          <button class="quick-action-card" (click)="navigateTo('/dashboard/membership/add')">
            <div class="action-icon">
              <mat-icon>person_add</mat-icon>
            </div>
            <div class="action-content">
              <h3>Add Member</h3>
              <p>Register new customer member</p>
            </div>
            <div class="action-arrow">
              <mat-icon>arrow_forward</mat-icon>
            </div>
          </button>

          <button class="quick-action-card" (click)="navigateTo('/dashboard/reports')">
            <div class="action-icon">
              <mat-icon>assessment</mat-icon>
            </div>
            <div class="action-content">
              <h3>View Reports</h3>
              <p>Analytics and business reports</p>
            </div>
            <div class="action-arrow">
              <mat-icon>arrow_forward</mat-icon>
            </div>
          </button>
        </div>
      </section>

      <!-- Analytics Link Section - Simple Call-to-Action -->
      <section class="analytics-cta-section">
        <div class="cta-card" (click)="navigateTo('/dashboard/analytics')">
          <div class="cta-content">
            <div class="cta-icon">
              <mat-icon>psychology</mat-icon>
            </div>
            <div class="cta-text">
              <h3>Advanced Analytics</h3>
              <p>AI-powered insights, expiry predictions, and smart recommendations</p>
            </div>
            <div class="cta-action">
              <button class="cta-btn">
                <span>View Full Analytics</span>
                <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  `,
  styleUrls: ['./dashboard-home.component.scss']
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ===== ENHANCED: SIGNAL-BASED STATE MANAGEMENT =====
  // Inject services using new Angular pattern
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private dashboardService = inject(DashboardService);
  private userService = inject(UserService);
  private smartNotificationService = inject(SmartNotificationService);
  private expiryManagementService = inject(ExpiryManagementService);

  // Core signals for reactive state
  private dashboardKPIs = signal<DashboardKPIDto | null>(null);
  private quickStats = signal<QuickStatsDto | null>(null);
  private userStatsData = signal<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    deleted: 0
  });
  private notifications = signal<NotificationDto[]>([]);
  private loadingState = signal<boolean>(true);
  private lastUpdated = signal<Date>(new Date());

  // User information signals
  readonly username = signal<string>('');
  readonly role = signal<string>('');

  // Quick actions (static for now, could be dynamic)
  readonly quickActions = signal<QuickAction[]>([]);

  // ===== SIMPLIFIED: OPERATIONAL FOCUS SIGNALS =====
  readonly criticalAlertsSignal = signal<number>(0);
  readonly totalNotificationsSignal = signal<number>(0);

  // ===== COMPUTED PROPERTIES FOR REACTIVE UI =====
  readonly isLoading = computed(() => this.loadingState());
  
  readonly userStats = computed(() => this.userStatsData());
  
  readonly recentNotifications = computed(() => 
    this.notifications().slice(0, 5)
  );

  // ===== SIMPLIFIED: OPERATIONAL CARDS COMPUTED PROPERTIES =====
  readonly hasActiveAlerts = computed(() => 
    this.totalAlertsCount() > 0
  );

  readonly hasCriticalAlerts = computed(() => 
    this.criticalAlertsCount() > 0
  );

  readonly totalAlertsCount = computed(() => 
    this.totalNotificationsSignal() + this.dashboardStats().lowStockCount
  );

  readonly criticalAlertsCount = computed(() => 
    this.criticalAlertsSignal()
  );

  readonly dashboardStats = computed((): DashboardStats => {
    const kpis = this.dashboardKPIs();
    const stats = this.quickStats();
    
    return {
      todayRevenue: stats?.todayRevenue || kpis?.todayRevenue || 0,
      monthlyRevenue: kpis?.monthlyRevenue || 0,
      totalProducts: kpis?.totalProducts || 0,
      lowStockCount: kpis?.lowStockProducts || 0,
      totalMembers: kpis?.totalMembers || 0,
      todayTransactions: stats?.todayTransactions || kpis?.todayTransactions || 0,
      lastUpdated: this.lastUpdated().toISOString()
    };
  });

  // Real-time greeting that updates automatically
  readonly greeting = computed(() => {
    // This will automatically update when the component reruns
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  });

  readonly currentDate = computed(() => {
    // Updates automatically with lastUpdated signal
    this.lastUpdated(); // Read signal to create dependency
    const now = new Date();
    const day = now.getUTCDate().toString().padStart(2, '0');
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = now.getUTCFullYear();
    const time = toJakartaTime(now);
    return `${day}/${month}/${year} ${time} WIB`;
  });

  constructor() {
    // Initialize real-time effects after component initialization
    this.setupRealTimeEffects();
  }
  
  private setupRealTimeEffects(): void {
    // ===== REAL-TIME DATA EFFECTS =====
    // Auto-refresh every 30 seconds
    timer(30000, 30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.refreshAllData().catch(error => {
        console.error('Auto-refresh error:', error);
      });
    });

    // Update time display every minute
    interval(60000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.lastUpdated.set(new Date());
    });

    // Subscribe to real-time notifications
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications.set(notifications);
      });
  }

  ngOnInit() {
    console.log('🏠 Dashboard Home Component initialized - Operational Focus');
    
    // Initialize data - signals will handle real-time updates
    this.loadUserData();
    this.setupQuickActions();
    this.loadInitialData();
    
    // Load basic alerts data
    this.loadBasicAlerts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== SIGNAL-BASED DATA LOADING =====
  private loadInitialData(): void {
    // Initial load - auto-refresh is handled by effects
    this.refreshAllData();
  }

  private refreshAllData() {
    this.loadingState.set(true);
    
    return new Promise((resolve) => {
      Promise.all([
        this.loadDashboardData(),
        this.loadUserStatistics(),
        this.loadBasicAlerts() // Simplified alerts loading
      ]).then(() => {
        this.loadingState.set(false);
        this.lastUpdated.set(new Date());
        resolve(true);
      }).catch(error => {
        console.error('Error refreshing data:', error);
        this.loadingState.set(false);
        resolve(false);
      });
    });
  }

  private async loadDashboardData(): Promise<void> {
    try {
      // Load KPIs
      const kpis = await this.dashboardService.getDashboardKPIs().toPromise();
      if (kpis) {
        this.dashboardKPIs.set(kpis);
        console.log('📊 Dashboard KPIs updated:', kpis);
      }

      // Load Quick Stats
      const stats = await this.dashboardService.getQuickStats().toPromise();
      if (stats) {
        this.quickStats.set(stats);
        console.log('⚡ Quick stats updated:', stats);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  private async loadUserStatistics(): Promise<void> {
    try {
      const response = await this.userService.getUsers(1, 1000).toPromise();
      if (response) {
        const users = response.users || [];
        const userStats: UserStats = {
          total: response.total || users.length,
          active: users.filter(user => user.isActive).length,
          inactive: users.filter(user => !user.isActive).length,
          deleted: 0
        };
        
        this.userStatsData.set(userStats);
        console.log('👥 User statistics updated:', userStats);
      }
    } catch (error) {
      console.error('Error loading user statistics:', error);
    }
  }

  private loadUserData(): void {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        this.username.set(currentUser.username || '');
        this.role.set(currentUser.role || '');
      } else {
        this.username.set(localStorage.getItem('username') || '');
        this.role.set(localStorage.getItem('role') || '');
      }
      console.log('👤 User data loaded:', { username: this.username(), role: this.role() });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  private setupQuickActions(): void {
    const actions: QuickAction[] = [
      {
        id: 'pos',
        title: 'Point of Sale',
        description: 'Mulai transaksi penjualan',
        icon: 'point_of_sale',
        route: '/dashboard/pos',
        color: 'primary',
        enabled: true
      },
      {
        id: 'analytics',
        title: 'Analytics',
        description: 'Lihat laporan dan analisis bisnis',
        icon: 'analytics',
        route: '/dashboard/analytics',
        color: 'success',
        enabled: true
      },
      {
        id: 'inventory',
        title: 'Inventory',
        description: 'Kelola produk dan stok',
        icon: 'inventory_2',
        route: '/dashboard/inventory',
        color: 'warning',
        enabled: true
      },
      {
        id: 'categories',
        title: 'Categories',
        description: 'Atur kategori produk',
        icon: 'category',
        route: '/dashboard/categories',
        color: 'info',
        enabled: true
      },
      {
        id: 'users',
        title: 'User Management',
        description: 'Kelola pengguna sistem',
        icon: 'people',
        route: '/dashboard/users',
        color: 'secondary',
        enabled: true
      },
      {
        id: 'logs',
        title: 'Activity Logs',
        description: 'Riwayat aktivitas sistem',
        icon: 'history',
        route: '/dashboard/logs',
        color: 'accent',
        enabled: true
      }
    ];
    
    this.quickActions.set(actions);
  }

  // ===== PUBLIC METHODS =====
  navigateTo(route: string): void {
    console.log('🧭 Dashboard Home - Navigate clicked:', route);
    console.log('🧭 Router instance:', this.router);
    
    try {
      this.router.navigate([route]).then((success) => {
        console.log('🧭 Navigation result:', success);
        if (!success) {
          console.error('❌ Navigation failed for route:', route);
        }
      }).catch((error) => {
        console.error('❌ Navigation error:', error);
      });
    } catch (error) {
      console.error('❌ Navigation exception:', error);
    }
  }

  executeQuickAction(action: QuickAction): void {
    console.log('⚡ Executing quick action:', action.title);
    this.navigateTo(action.route);
  }

  refreshDashboardData(): void {
    console.log('🔄 Manual refresh triggered...');
    this.refreshAllData().then(() => {
      console.log('✅ Dashboard data refreshed successfully');
    }).catch(error => {
      console.error('❌ Manual refresh failed:', error);
    });
  }

  // ===== UTILITY METHODS =====
  formatNumber(num: number): string {
    return num.toLocaleString('id-ID');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  // ===== SIMPLIFIED: BASIC ALERTS METHODS =====

  async loadBasicAlerts(): Promise<void> {
    console.log('🔄 Loading basic alerts for operational cards...');
    
    try {
      // Get notification count
      const notifications = this.notifications();
      this.totalNotificationsSignal.set(notifications.length);
      
      // Count critical notifications
      const criticalCount = notifications.filter(n => 
        n.priority === 'Critical' || n.priority === 'High'
      ).length;
      this.criticalAlertsSignal.set(criticalCount);
      
      console.log('✅ Basic alerts loaded:', { 
        total: notifications.length, 
        critical: criticalCount 
      });
    } catch (error) {
      console.error('❌ Failed to load basic alerts:', error);
    }
  }

  // ===== OPERATIONAL CARD UTILITY METHODS =====
  
  formatTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return toJakartaTime(date);
    } catch {
      return '--:--';
    }
  }


}