// src/app/dashboard/dashboard.component.ts - ADD Missing Event Handlers

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

  // ✅ EXISTING METHODS (keep as is)
  private loadUserData() {
    console.log('📊 Loading user data...');
    
    // Get from localStorage first (immediate display)
    this.username = localStorage.getItem('username') || '';
    this.role = localStorage.getItem('role') || '';
    
    // Update avatar from localStorage if available
    const savedAvatarUrl = localStorage.getItem('userPhotoUrl');
    if (savedAvatarUrl) {
      this.avatarUrl = `http://localhost:5171${savedAvatarUrl}`;
    }
    
    // Verify authentication
    if (!this.username || !this.role) {
      console.error('❌ No authentication info found');
      this.router.navigate(['/login']);
      return;
    }

    console.log('✅ User loaded:', { username: this.username, role: this.role });
  }

  private loadDashboardData() {
    console.log('📈 Loading dashboard data...');
    
    // Load user statistics
    this.loadUserStats();
    
    // Load notifications (simulated for now)
    this.loadNotifications();
  }

  private loadUserStats() {
    this.userService.getUsers(1, 1000, '').subscribe({
      next: (response: any) => {
        if (response.success) {
          console.log('✅ User stats loaded:', response.data);
          
          const users = response.data?.users || [];
          this.userStats = {
            total: users.length,
            active: users.filter((u: any) => !u.isDeleted).length,
            inactive: users.filter((u: any) => u.isDeleted).length,
            deleted: users.filter((u: any) => u.isDeleted).length
          };
        }
        this.isLoadingStats = false;
      },
      error: (err: any) => {
        console.error('❌ Failed to load user stats:', err);
        this.isLoadingStats = false;
      }
    });
  }

  private loadNotifications() {
    // Simulate notification loading
    setTimeout(() => {
      this.notificationCount = Math.floor(Math.random() * 10) + 1;
      this.isLoadingNotifications = false;
      console.log('🔔 Notifications loaded:', this.notificationCount);
    }, 1000);
  }

  private setupRouterListener() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updatePageTitle(event.url);
      });
  }

  private updatePageTitle(url: string) {
    const titleMap: { [key: string]: { title: string; subtitle: string } } = {
      '/dashboard': { title: 'Dashboard', subtitle: 'Selamat datang di Toko Eniwan' },
      '/dashboard/users': { title: 'Manajemen User', subtitle: 'Kelola pengguna sistem' },
      '/dashboard/activity-log': { title: 'Log Aktivitas', subtitle: 'Pantau aktivitas pengguna' },
      '/dashboard/inventory': { title: 'Inventori', subtitle: 'Kelola stok barang' },
      '/dashboard/pos': { title: 'Point of Sale', subtitle: 'Sistem kasir' },
      '/dashboard/reports': { title: 'Laporan', subtitle: 'Analisis dan laporan' }
    };

    const pageInfo = titleMap[url] || { title: 'Dashboard', subtitle: 'Panel admin' };
    this.currentPageTitle = pageInfo.title;
    this.currentPageSubtitle = pageInfo.subtitle;
  }

  // ✅ EXISTING LOGOUT METHOD (rename untuk consistency)
  logout() {
    console.log('🚪 Logout clicked');
    this.authService.logout().subscribe({
      next: () => {
        console.log('✅ Logout successful');
        localStorage.clear();
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        console.error('❌ Logout failed:', err);
        // Force logout even if server request fails
        localStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }

  // ✅ ADD NEW EVENT HANDLERS
  onLogout() {
    this.logout(); // Call existing logout method
  }

  onNotificationClick() {
    console.log('🔔 Notifications clicked');
    // TODO: Implement notification center
    // For now, show simple alert
    alert('🔔 Pusat Notifikasi\n\nFitur ini akan segera hadir!\n\nNotifikasi yang tersedia:\n• Stok barang menipis\n• Laporan harian\n• Update sistem');
  }

  onProfileClick() {
    console.log('👤 Profile clicked');
    this.router.navigate(['/profile']);
  }

  onSettingsClick() {
    console.log('⚙️ Settings clicked');
    // TODO: Implement settings page
    alert('⚙️ Pengaturan Sistem\n\nFitur pengaturan akan segera hadir!\n\nYang akan tersedia:\n• Pengaturan toko\n• Konfigurasi POS\n• Backup & restore\n• Tema tampilan');
  }

  onNotificationSettingsClick() {
    console.log('🔔⚙️ Notification settings clicked');
    // TODO: Implement notification settings
    alert('🔔 Pengaturan Notifikasi\n\nAtur preferensi notifikasi:\n\n• Email notifications\n• Push notifications\n• Alert stok minimum\n• Laporan otomatis\n\nFitur ini akan segera hadir!');
  }

  onHelpClick() {
    console.log('❓ Help clicked');
    // TODO: Implement help/FAQ page
    alert('❓ Bantuan & Dukungan\n\nButuh bantuan?\n\n📖 Panduan pengguna\n🎥 Video tutorial\n📞 Hubungi support\n💬 Live chat\n\nFitur bantuan akan segera hadir!');
  }

  // ✅ UTILITY GETTERS
  get isLoading(): boolean {
    return this.isLoadingStats || this.isLoadingNotifications;
  }

  get totalUsers(): number {
    return this.userStats.total;
  }

  get activeUsers(): number {
    return this.userStats.active;
  }
  refreshData() {
  console.log('🔄 Refreshing dashboard data...');
  this.isLoadingStats = true;
  this.isLoadingNotifications = true;
  
  // Reload user stats
  this.loadUserStats();
  
  // Reload notifications
  this.loadNotifications();
  
  // Show success message
  setTimeout(() => {
    alert('✅ Data berhasil diperbarui!');
  }, 1000);
}
}