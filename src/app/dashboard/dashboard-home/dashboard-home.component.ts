// src/app/dashboard/dashboard-home/dashboard-home.component.ts
// ✅ NEW: Separate component for dashboard home content

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

      <!-- Welcome Section -->
      <section class="welcome-section">
        <div class="welcome-card glass-card">
          <div class="welcome-content">
            <div class="welcome-text">
              <h2>{{ getGreeting() }}, {{ username }}! 👋</h2>
              <p class="welcome-date">{{ getCurrentDate() }}</p>
              <p class="welcome-subtitle">Selamat datang di sistem POS Toko Eniwan</p>
            </div>
            
            <div class="welcome-actions">
              <button class="action-btn primary-btn" (click)="navigateTo('/pos')">
                <mat-icon>point_of_sale</mat-icon>
                Mulai Transaksi
              </button>
              <button class="action-btn secondary-btn" (click)="navigateTo('/dashboard/inventory')">
                <mat-icon>inventory_2</mat-icon>
                Kelola Stok
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Grid -->
      <section class="stats-section">
        <div class="section-header">
          <h2>Statistik Sistem</h2>
          <p>Overview performa bisnis Anda</p>
        </div>

        <div class="stats-grid">
          <!-- Total Users -->
          <div class="stat-card glass-card">
            <div class="stat-icon users">
              <mat-icon>people</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(userStats.total) }}</div>
              <div class="stat-label">Total Users</div>
              <div class="stat-meta">
                <span class="stat-detail active">{{ userStats.active }} active</span>
              </div>
            </div>
          </div>

          <!-- Products -->
          <div class="stat-card glass-card clickable" (click)="navigateTo('/dashboard/inventory')">
            <div class="stat-icon products">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(dashboardStats.totalProducts) }}</div>
              <div class="stat-label">Total Products</div>
              <div class="stat-meta">
                <span class="stat-detail warning" *ngIf="dashboardStats.lowStockCount > 0">
                  {{ dashboardStats.lowStockCount }} stok rendah
                </span>
                <span class="stat-detail positive" *ngIf="dashboardStats.lowStockCount === 0">
                  Stok mencukupi
                </span>
              </div>
            </div>
          </div>

          <!-- Categories -->
          <div class="stat-card glass-card">
            <div class="stat-icon categories">
              <mat-icon>category</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(dashboardStats.totalCategories) }}</div>
              <div class="stat-label">Categories</div>
              <div class="stat-meta">
                <span class="stat-detail">Produk dikategorikan</span>
              </div>
            </div>
          </div>

          <!-- Daily Sales -->
          <div class="stat-card glass-card">
            <div class="stat-icon sales">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatCurrency(dashboardStats.dailySales) }}</div>
              <div class="stat-label">Penjualan Hari Ini</div>
              <div class="stat-meta">
                <span class="stat-detail positive">Target tercapai</span>
              </div>
            </div>
          </div>

          <!-- Notifications -->
          <div class="stat-card glass-card clickable" (click)="navigateTo('/notifications')">
            <div class="stat-icon notifications">
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
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions-section">
        <div class="section-header">
          <h2>Quick Actions</h2>
          <p>Akses cepat ke fitur utama sistem</p>
        </div>

        <div class="quick-actions-grid">
          <div 
            class="quick-action-card glass-card" 
            *ngFor="let action of quickActions"
            (click)="executeQuickAction(action)">
            
            <div class="action-icon" [ngClass]="action.color">
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
    total: 12,
    active: 8,
    inactive: 4,
    deleted: 0
  };

  dashboardStats: DashboardStats = {
    totalUsers: 12,
    activeUsers: 8,
    totalCategories: 8,
    totalProducts: 156,
    lowStockCount: 3,
    dailySales: 1250000,
    monthlySales: 35750000,
    lastUpdated: new Date().toISOString()
  };

  recentNotifications: NotificationDto[] = [];
  quickActions: QuickAction[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    console.log('🏠 Dashboard Home Component initialized');
    
    this.loadUserData();
    this.setupQuickActions();
    this.subscribeToNotifications();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
        route: '/pos',
        color: 'primary',
        enabled: true
      },
      {
        id: 'inventory',
        title: 'Inventory',
        description: 'Kelola produk dan stok',
        icon: 'inventory_2',
        route: '/dashboard/inventory',
        color: 'success',
        enabled: true
      },
      {
        id: 'categories',
        title: 'Categories',
        description: 'Atur kategori produk',
        icon: 'category',
        route: '/dashboard/categories',
        color: 'warning',
        enabled: true
      },
      {
        id: 'users',
        title: 'User Management',
        description: 'Kelola pengguna sistem',
        icon: 'people',
        route: '/dashboard/users',
        color: 'info',
        enabled: true
      },
      {
        id: 'logs',
        title: 'Activity Logs',
        description: 'Riwayat aktivitas sistem',
        icon: 'history',
        route: '/dashboard/logs',
        color: 'secondary',
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

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
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
