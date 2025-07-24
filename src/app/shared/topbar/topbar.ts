// src/app/shared/topbar/topbar.component.ts
import { Component, Input, Output, EventEmitter, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';

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
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule
  ]
})
export class TopbarComponent implements OnInit {
  @Input() username: string = '';
  @Input() role: string = '';
  @Input() avatarUrl: string = '';
  @Input() notificationCount: number = 0;
  @Input() pageTitle: string = 'POS Eniwan';
  
  @Output() logoutClicked = new EventEmitter<void>();
  @Output() notificationClicked = new EventEmitter<void>();
  @Output() profileClicked = new EventEmitter<void>();

  private router = inject(Router);
  private authService = inject(AuthService);

  dropdownOpen = false;
  notificationDropdownOpen = false;
  isLoading = false;
  currentTime = new Date();

  // Mock notifications untuk demo
  notifications = [
    {
      id: 1,
      title: 'Stok Rendah',
      message: 'Produk "Mie Instan" tersisa 5 unit',
      time: '5 menit lalu',
      type: 'warning',
      unread: true
    },
    {
      id: 2,
      title: 'Transaksi Berhasil',
      message: 'Penjualan Rp 150,000 telah disimpan',
      time: '15 menit lalu',
      type: 'success',
      unread: true
    },
    {
      id: 3,
      title: 'Sistem Update',
      message: 'Pembaruan sistem akan dilakukan malam ini',
      time: '2 jam lalu',
      type: 'info',
      unread: false
    }
  ];

  ngOnInit() {
    if (!this.username) this.username = 'User';
    if (!this.role) this.role = 'Kasir';
    
    // Update waktu setiap menit
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);

    // Set default avatar jika tidak ada
    if (!this.avatarUrl) {
      this.avatarUrl = 'assets/images/default-avatar.png';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const profileWrapper = target.closest('.profile-wrapper');
    const notificationWrapper = target.closest('.notification-wrapper');
    
    if (!profileWrapper) {
      this.dropdownOpen = false;
    }
    if (!notificationWrapper) {
      this.notificationDropdownOpen = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.dropdownOpen = false;
      this.notificationDropdownOpen = false;
    }
  }

  toggleProfileDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    this.notificationDropdownOpen = false;
  }

  toggleNotificationDropdown() {
    this.notificationDropdownOpen = !this.notificationDropdownOpen;
    this.dropdownOpen = false;
    
    // Mark notifications as read
    if (this.notificationDropdownOpen) {
      this.markNotificationsAsRead();
    }
    
    this.notificationClicked.emit();
  }

  navigateToProfile() {
    this.dropdownOpen = false;
    this.router.navigate(['/profile']);
    this.profileClicked.emit();
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }

  async logout() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.dropdownOpen = false;
    
    try {
      await this.authService.logout().toPromise();
      this.logoutClicked.emit();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout bahkan jika ada error
      this.logoutClicked.emit();
      this.router.navigate(['/login']);
    } finally {
      this.isLoading = false;
    }
  }

  onAvatarError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/default-avatar.png';
  }

  markNotificationsAsRead() {
    this.notifications.forEach(notification => {
      if (notification.unread) {
        notification.unread = false;
      }
    });
    this.notificationCount = 0;
  }

  clearNotification(notificationId: number, event: Event) {
    event.stopPropagation();
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.updateNotificationCount();
  }

  private updateNotificationCount() {
    this.notificationCount = this.notifications.filter(n => n.unread).length;
  }

  get roleDisplayName(): string {
    switch (this.role.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'owner':
        return 'Pemilik Toko';
      case 'manager':
        return 'Manajer';
      case 'cashier':
      case 'kasir':
        return 'Kasir';
      case 'user':
        return 'Pengguna';
      default:
        return this.role || 'Pengguna';
    }
  }

  getRoleColor(): string {
    switch (this.role.toLowerCase()) {
      case 'admin':
        return '#e74c3c';
      case 'owner':
        return '#8e44ad';
      case 'manager':
        return '#3498db';
      case 'cashier':
      case 'kasir':
        return '#27ae60';
      case 'user':
        return '#95a5a6';
      default:
        return '#34495e';
    }
  }

  get welcomeMessage(): string {
    const hour = this.currentTime.getHours();
    let greeting = 'Selamat';
    
    if (hour < 11) greeting += ' Pagi';
    else if (hour < 15) greeting += ' Siang';
    else if (hour < 18) greeting += ' Sore';
    else greeting += ' Malam';
    
    return `${greeting}, ${this.username}!`;
  }

  get formattedTime(): string {
    return this.currentTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get formattedDate(): string {
    return this.currentTime.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'warning': return '#f39c12';
      case 'success': return '#27ae60';
      case 'error': return '#e74c3c';
      case 'info': return '#3498db';
      default: return '#95a5a6';
    }
  }
}