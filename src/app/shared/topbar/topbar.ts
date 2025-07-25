// topbar.component.ts - NO ANIMATIONS VERSION
import { Component, Input, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule] 
  // ✅ NO animations array
})
export class TopbarComponent implements OnInit {
  @Input() username: string = '';
  @Input() role: string = '';
  @Input() avatarUrl: string = '';
  @Input() notificationCount: number = 0;
  @Input() pageTitle: string = 'Dashboard';
  @Output() logoutClicked = new EventEmitter<void>();
  @Output() notificationClicked = new EventEmitter<void>();

  dropdownOpen = false;
  isLoading = false;

  ngOnInit() {
    if (!this.username) this.username = 'User';
    if (!this.role) this.role = 'Admin';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const profileWrapper = target.closest('.profile-wrapper');
    if (!profileWrapper) {
      this.dropdownOpen = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.dropdownOpen) {
      this.dropdownOpen = false;
    }
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  onNotificationClick() {
    // ✅ Simple CSS animation instead
    const bellButton = document.querySelector('.bell-button');
    if (bellButton) {
      bellButton.classList.add('shake-animation');
      setTimeout(() => {
        bellButton.classList.remove('shake-animation');
      }, 600);
    }
    
    this.notificationClicked.emit();
  }

  async logout() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.logoutClicked.emit();
    } finally {
      this.dropdownOpen = false;
      this.isLoading = false;
    }
  }

  onAvatarError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/ae0514bb-6c45-45fa-a431-f0d5fbd2a2ae.png';
  }

  get roleDisplayName(): string {
    switch (this.role.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Manager';
      case 'user':
        return 'User';
      case 'moderator':
        return 'Moderator';
      default:
        return this.role || 'User';
    }
  }

  getRoleColor(): string {
    switch (this.role.toLowerCase()) {
      case 'admin':
        return '#ff6b6b';
      case 'manager':
        return '#4ecdc4';
      case 'user':
        return '#45b7d1';
      case 'moderator':
        return '#f9ca24';
      default:
        return '#6c5ce7';
    }
  }
  onProfileClick() {
    this.dropdownOpen = false; // Close dropdown when profile clicked
    // Navigation handled by routerLink
  }
}