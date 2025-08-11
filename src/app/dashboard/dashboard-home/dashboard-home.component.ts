// src/app/dashboard/dashboard-home/dashboard-home.component.ts
// ✅ REDESIGNED: Clean Simple Design - High Contrast, No Transparency

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService, NotificationDto } from '../../core/services/notification.service';
import { DashboardService, DashboardKPIDto, QuickStatsDto } from '../../core/services/dashboard.service';
import { UserService } from '../../modules/user-management/services/user.service';

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

      <!-- Welcome Section - REDESIGNED: Clean Simple Design -->
      <section class="welcome-section">
        <div class="welcome-card">
          <div class="welcome-content">
            <div class="welcome-text">
              <h1 class="welcome-greeting">{{ getGreeting() }}, {{ username }}!</h1>
              <p class="welcome-date">{{ getCurrentDate() }}</p>
              <p class="welcome-subtitle">Selamat datang di sistem POS Toko Eniwan</p>
            </div>
            
            <div class="welcome-actions">
              <button class="action-btn primary" (click)="navigateTo('/dashboard/pos')">
                <mat-icon>point_of_sale</mat-icon>
                <span>Mulai Transaksi</span>
              </button>
              <button class="action-btn secondary" (click)="navigateTo('/dashboard/inventory')">
                <mat-icon>inventory_2</mat-icon>
                <span>Kelola Stok</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Grid - REDESIGNED: High Contrast Cards -->
      <section class="stats-section">
        <div class="section-header">
          <div class="header-content">
            <div class="header-text">
              <h2>Statistik Sistem</h2>
              <p>Overview performa bisnis Anda</p>
            </div>
            <button 
              class="refresh-btn" 
              (click)="refreshDashboardData()"
              [disabled]="isLoading"
              title="Refresh Data">
              <mat-icon [class.spinning]="isLoading">refresh</mat-icon>
              <span *ngIf="!isLoading">Refresh</span>
              <span *ngIf="isLoading">Loading...</span>
            </button>
          </div>
        </div>

        <div class="stats-grid">
          <!-- Total Users -->
          <div class="stat-card users clickable" (click)="navigateTo('/dashboard/users')">
            <div class="stat-icon">
              <mat-icon>people</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(userStats.total) }}</div>
              <div class="stat-label">Total Users</div>
              <div class="stat-meta">
                <span class="stat-detail">{{ userStats.active }} active</span>
              </div>
            </div>
          </div>

          <!-- Total Products -->
          <div class="stat-card products clickable" (click)="navigateTo('/dashboard/inventory')">
            <div class="stat-icon">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(dashboardStats.totalProducts) }}</div>
              <div class="stat-label">Total Products</div>
              <div class="stat-meta">
                <span class="stat-detail warning" *ngIf="dashboardStats.lowStockCount > 0">
                  {{ dashboardStats.lowStockCount }} stok rendah
                </span>
                <span class="stat-detail success" *ngIf="dashboardStats.lowStockCount === 0">
                  Stok mencukupi
                </span>
              </div>
            </div>
          </div>

          <!-- Total Members -->
          <div class="stat-card members clickable" (click)="navigateTo('/dashboard/membership')">
            <div class="stat-icon">
              <mat-icon>card_membership</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(dashboardStats.totalMembers) }}</div>
              <div class="stat-label">Total Members</div>
              <div class="stat-meta">
                <span class="stat-detail">Member terdaftar</span>
              </div>
            </div>
          </div>

          <!-- Today Revenue -->
          <div class="stat-card revenue clickable" (click)="navigateTo('/dashboard/reports')">
            <div class="stat-icon">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatCurrency(dashboardStats.todayRevenue) }}</div>
              <div class="stat-label">Pendapatan Hari Ini</div>
              <div class="stat-meta">
                <span class="stat-detail">{{ dashboardStats.todayTransactions }} transaksi</span>
              </div>
            </div>
          </div>

          <!-- Notifications -->
          <div class="stat-card notifications clickable" (click)="navigateTo('/dashboard/notifications')">
            <div class="stat-icon">
              <mat-icon>notifications</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ recentNotifications.length }}</div>
              <div class="stat-label">Notifikasi</div>
              <div class="stat-meta">
                <span class="stat-detail">Lihat semua</span>
              </div>
            </div>
          </div>

          <!-- Monthly Revenue -->
          <div class="stat-card monthly-revenue clickable" (click)="navigateTo('/dashboard/reports')">
            <div class="stat-icon">
              <mat-icon>bar_chart</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatCurrency(dashboardStats.monthlyRevenue) }}</div>
              <div class="stat-label">Pendapatan Bulanan</div>
              <div class="stat-meta">
                <span class="stat-detail">Bulan ini</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Actions - REDESIGNED: Clean Action Cards -->
      <section class="actions-section">
        <div class="section-header">
          <h2>Quick Actions</h2>
          <p>Akses cepat ke fitur utama sistem</p>
        </div>

        <div class="actions-grid">
          <div 
            class="action-card" 
            *ngFor="let action of quickActions"
            [ngClass]="action.color"
            (click)="executeQuickAction(action)">
            
            <div class="action-icon">
              <mat-icon>{{ action.icon }}</mat-icon>
            </div>
            
            <div class="action-content">
              <h3>{{ action.title }}</h3>
              <p>{{ action.description }}</p>
            </div>
            
            <div class="action-arrow">
              <mat-icon>arrow_forward</mat-icon>
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

  username: string = '';
  role: string = '';

  userStats: UserStats = {
    total: 0,
    active: 0,
    inactive: 0,
    deleted: 0
  };

  dashboardStats: DashboardStats = {
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalMembers: 0,
    todayTransactions: 0,
    lastUpdated: new Date().toISOString()
  };

  recentNotifications: NotificationDto[] = [];
  quickActions: QuickAction[] = [];

  // Observables for real-time data
  dashboardKPIs: DashboardKPIDto | null = null;
  quickStats: QuickStatsDto | null = null;
  isLoading = true;

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private dashboardService: DashboardService,
    private userService: UserService
  ) {}

  ngOnInit() {
    console.log('🏠 Dashboard Home Component initialized');
    
    this.loadUserData();
    this.setupQuickActions();
    this.subscribeToNotifications();
    this.loadDashboardData();
    this.loadUserStatistics();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load KPIs
    this.dashboardService.getDashboardKPIs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (kpis) => {
          if (kpis) {
            this.dashboardKPIs = kpis;
            this.updateDashboardStats(kpis);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard KPIs:', error);
          this.isLoading = false;
        }
      });

    // Load Quick Stats
    this.dashboardService.getQuickStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          if (stats) {
            this.quickStats = stats;
            this.updateQuickStats(stats);
          }
        },
        error: (error) => {
          console.error('Error loading quick stats:', error);
        }
      });
  }

  private updateDashboardStats(kpis: DashboardKPIDto): void {
    this.dashboardStats = {
      todayRevenue: kpis.todayRevenue,
      monthlyRevenue: kpis.monthlyRevenue,
      totalProducts: kpis.totalProducts,
      lowStockCount: kpis.lowStockProducts,
      totalMembers: kpis.totalMembers,
      todayTransactions: kpis.todayTransactions,
      lastUpdated: new Date().toISOString()
    };
  }

  private updateQuickStats(stats: QuickStatsDto): void {
    // Update additional stats from quick stats if needed
    this.dashboardStats.todayRevenue = stats.todayRevenue;
    this.dashboardStats.todayTransactions = stats.todayTransactions;
  }

  private loadUserStatistics(): void {
    // Load user statistics by getting first page with large pageSize to get total
    this.userService.getUsers(1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const users = response.users || [];
          this.userStats = {
            total: response.total || users.length,
            active: users.filter(user => user.isActive).length,
            inactive: users.filter(user => !user.isActive).length,
            deleted: 0 // This might need to be tracked differently if supported by backend
          };
          console.log('👥 User statistics loaded:', this.userStats);
        },
        error: (error) => {
          console.error('Error loading user statistics:', error);
          // Keep default values if error occurs
        }
      });
  }

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
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  private setupQuickActions(): void {
    this.quickActions = [
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
  }

  private subscribeToNotifications(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.recentNotifications = notifications.slice(0, 5);
      });
  }

  navigateTo(route: string): void {
    console.log('Navigating to:', route);
    this.router.navigate([route]);
  }

  executeQuickAction(action: QuickAction): void {
    this.navigateTo(action.route);
  }

  refreshDashboardData(): void {
    console.log('🔄 Refreshing dashboard data...');
    this.loadDashboardData();
    this.loadUserStatistics();
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  }

  getCurrentDate(): string {
    const now = new Date();
    const day = now.getUTCDate().toString().padStart(2, '0');
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = now.getUTCFullYear();
    const time = toJakartaTime(now);
    return `${day}/${month}/${year} ${time} WIB`;
  }

  formatNumber(num: number): string {
    return num.toLocaleString('id-ID');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  }
}