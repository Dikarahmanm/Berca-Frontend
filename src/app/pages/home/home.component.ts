import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { TopbarComponent } from '../../shared/topbar/topbar';
import { AuthService } from '../../core/services/auth.service';

export interface DashboardStats {
  todaySales: number;
  totalTransactions: number;
  lowStockItems: number;
  activeUsers: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

export interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  permission?: string[];
}

export interface RecentActivity {
  id: string;
  type: 'sale' | 'stock' | 'user' | 'system';
  title: string;
  description: string;
  time: string;
  amount?: number;
  user: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatProgressBarModule,
    MatChipsModule,
    TopbarComponent
  ]
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  currentUser: any = {};
  isLoading = false;
  currentTime = new Date();

  // Dashboard Statistics
  dashboardStats: DashboardStats = {
    todaySales: 2850000,
    totalTransactions: 47,
    lowStockItems: 8,
    activeUsers: 3,
    weeklyGrowth: 12.5,
    monthlyGrowth: 8.3
  };

  // Quick Actions berdasarkan role
  quickActions: QuickAction[] = [
    {
      title: 'Kasir/POS',
      description: 'Mulai transaksi penjualan',
      icon: 'point_of_sale',
      route: '/pos',
      color: '#27ae60',
      permission: ['Kasir', 'Admin', 'Owner', 'Manager']
    },
    {
      title: 'Inventori',
      description: 'Kelola stok barang',
      icon: 'inventory',
      route: '/inventory',
      color: '#3498db',
      permission: ['Admin', 'Owner', 'Manager']
    },
    {
      title: 'Laporan',
      description: 'Lihat laporan penjualan',
      icon: 'assessment',
      route: '/reports',
      color: '#9b59b6',
      permission: ['Admin', 'Owner', 'Manager']
    },
    {
      title: 'Pengguna',
      description: 'Manajemen pengguna',
      icon: 'people',
      route: '/users',
      color: '#e67e22',
      permission: ['Admin', 'Owner']
    },
    {
      title: 'Log Aktivitas',
      description: 'Monitor aktivitas sistem',
      icon: 'history',
      route: '/logs',
      color: '#34495e',
      permission: ['Admin', 'Owner']
    },
    {
      title: 'Pengaturan',
      description: 'Konfigurasi aplikasi',
      icon: 'settings',
      route: '/settings',
      color: '#95a5a6',
      permission: ['Admin', 'Owner']
    }
  ];

  // Recent Activities
  recentActivities: RecentActivity[] = [
    {
      id: '1',
      type: 'sale',
      title: 'Transaksi Berhasil',
      description: 'Penjualan sebesar Rp 85,000',
      time: '2 menit lalu',
      amount: 85000,
      user: 'Siti Nurhaliza'
    },
    {
      id: '2',
      type: 'stock',
      title: 'Stok Menipis',
      description: 'Mie Instan ABC tersisa 5 unit',
      time: '15 menit lalu',
      user: 'Sistem'
    },
    {
      id: '3',
      type: 'sale',
      title: 'Transaksi Berhasil',
      description: 'Penjualan sebesar Rp 125,000',
      time: '32 menit lalu',
      amount: 125000,
      user: 'Ahmad Yani'
    },
    {
      id: '4',
      type: 'user',
      title: 'User Login',
      description: 'Pengguna masuk ke sistem',
      time: '1 jam lalu',
      user: 'John Doe'
    },
    {
      id: '5',
      type: 'stock',
      title: 'Stok Ditambah',
      description: 'Beras 5kg ditambah 20 karung',
      time: '2 jam lalu',
      user: 'Maria Gonzalez'
    }
  ];

  ngOnInit() {
    this.loadCurrentUser();
    this.loadDashboardData();
    this.startTimeUpdate();
  }

  loadCurrentUser() {
    this.currentUser = {
      username: localStorage.getItem('username') || 'User',
      role: localStorage.getItem('role') || 'Kasir',
      fullName: localStorage.getItem('fullName') || 'Pengguna'
    };
  }

  loadDashboardData() {
    this.isLoading = true;
    
    // Simulate API call untuk load dashboard data
    setTimeout(() => {
      // Data sudah di-set di constructor, hanya simulasi loading
      this.isLoading = false;
    }, 1500);
  }

  startTimeUpdate() {
    // Update waktu setiap detik
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  navigateToAction(action: QuickAction) {
    if (this.hasPermission(action.permission)) {
      this.router.navigate([action.route]);
    }
  }

  hasPermission(requiredRoles?: string[]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    const userRole = this.currentUser.role;
    return requiredRoles.includes(userRole);
  }

  getFilteredQuickActions(): QuickAction[] {
    return this.quickActions.filter(action => this.hasPermission(action.permission));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatTime(timeString: string): string {
    // Simple time formatting
    return timeString;
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'sale': return 'shopping_cart';
      case 'stock': return 'inventory_2';
      case 'user': return 'person';
      case 'system': return 'settings';
      default: return 'info';
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case 'sale': return '#27ae60';
      case 'stock': return '#f39c12';
      case 'user': return '#3498db';
      case 'system': return '#95a5a6';
      default: return '#34495e';
    }
  }

  refreshDashboard() {
    this.loadDashboardData();
  }

  get welcomeMessage(): string {
    const hour = this.currentTime.getHours();
    let greeting = 'Selamat';
    
    if (hour < 11) greeting += ' Pagi';
    else if (hour < 15) greeting += ' Siang';
    else if (hour < 18) greeting += ' Sore';
    else greeting += ' Malam';
    
    return `${greeting}, ${this.currentUser.fullName || this.currentUser.username}!`;
  }

  get todayDate(): string {
    return this.currentTime.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get currentTimeString(): string {
    return this.currentTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.router.navigate(['/login']);
      }
    });
  }
}