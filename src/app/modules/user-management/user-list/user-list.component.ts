import { Component, OnInit } from '@angular/core';
import { UserService, User } from '../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  deletedUsers: User[] = [];
  showDeleted = false;
  page = 1;
  pageSize = 5;
  totalUsers = 0;
  search = '';

  loading = false;
  error: string | null = null;

  // Available roles
  availableRoles = ['User', 'Admin', 'Manager', 'Moderator'];

  // For Math.ceil in template
  Math = Math;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // ✅ CHANGE USER ROLE METHOD
  changeUserRole(user: User, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newRole = target.value;
    
    if (newRole === user.role) {
      return; // No change
    }

    console.log(`🔄 Changing user ${user.username} role from ${user.role} to ${newRole}`);
    
    // Show confirmation for role changes
    const confirmMessage = `Are you sure you want to change ${user.username}'s role from ${user.role} to ${newRole}?`;
    
    if (!confirm(confirmMessage)) {
      // Reset the dropdown to original value
      target.value = user.role;
      return;
    }

    this.userService.updateUser(user.id, {
      role: newRole,
      isActive: user.isActive
    }).subscribe({
      next: (response: any) => {
        console.log('✅ User role updated successfully:', response);
        
        // Update local user object
        user.role = newRole;
        
        // Show success feedback
        this.showSuccessMessage(`${user.username}'s role updated to ${newRole}`);
      },
      error: (err: any) => {
        console.error('❌ Failed to update user role:', err);
        
        // Reset dropdown to original value
        target.value = user.role;
        
        this.error = `Failed to update role: ${err}`;
      }
    });
  }

  private showSuccessMessage(message: string): void {
    // Simple success feedback (you can replace with toast notification)
    const successDiv = document.createElement('div');
    successDiv.className = 'success-toast';
    successDiv.textContent = `✅ ${message}`;
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  // ... existing methods (loadUsers, toggleActive, deleteUser, etc.)
  
  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    console.log('📊 Loading users...');
    
    this.userService.getUsers(this.page, this.pageSize, this.search).subscribe({
      next: (res: any) => {
        console.log('✅ Users loaded successfully:', res);
        this.users = res.users;
        this.totalUsers = res.total;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Failed to load users:', err);
        this.error = `Failed to load users: ${err}`;
        this.loading = false;
      }
    });
  }

  loadDeletedUsers(): void {
    this.loading = true;
    this.error = null;
    
    console.log('🗑️ Loading deleted users...');
    
    this.userService.getDeletedUsers(this.page, this.pageSize).subscribe({
      next: (res: any) => {
        console.log('✅ Deleted users loaded successfully:', res);
        this.deletedUsers = res.users;
        this.totalUsers = res.total;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Failed to load deleted users:', err);
        this.error = `Failed to load deleted users: ${err}`;
        this.loading = false;
      }
    });
  }

  toggleView(): void {
    this.showDeleted = !this.showDeleted;
    this.page = 1;
    this.search = '';
    this.error = null;
    
    console.log(`🔄 Toggling view to: ${this.showDeleted ? 'Deleted Users' : 'Active Users'}`);
    
    if (this.showDeleted) {
      this.loadDeletedUsers();
    } else {
      this.loadUsers();
    }
  }

  onSearchChange(): void {
    if (!this.showDeleted) {
      this.page = 1;
      this.loadUsers();
    }
  }

  changePage(newPage: number): void {
    if (newPage < 1) return;
    
    this.page = newPage;
    console.log(`📄 Changing to page ${newPage} for ${this.showDeleted ? 'deleted' : 'active'} users`);
    
    if (this.showDeleted) {
      this.loadDeletedUsers();
    } else {
      this.loadUsers();
    }
  }

  toggleActive(user: User): void {
    console.log('🔄 Toggling user active status:', user);
    
    this.userService.updateUser(user.id, {
      role: user.role,
      isActive: !user.isActive
    }).subscribe({
      next: (response: any) => {
        console.log('✅ User updated successfully:', response);
        user.isActive = !user.isActive; // Update local state
        this.showSuccessMessage(`${user.username} ${user.isActive ? 'activated' : 'deactivated'}`);
      },
      error: (err: any) => {
        console.error('❌ Failed to update user:', err);
        this.error = `Failed to update user: ${err}`;
      }
    });
  }

  deleteUser(id: number): void {
    const user = this.users.find(u => u.id === id);
    const username = user?.username || `User ${id}`;
    
    if (confirm(`Are you sure you want to delete ${username}?`)) {
      console.log('🗑️ Deleting user:', id);
      
      this.userService.deleteUser(id).subscribe({
        next: (response: any) => {
          console.log('✅ User deleted successfully:', response);
          this.loadUsers(); // Reload active users
          this.showSuccessMessage(`${username} deleted successfully`);
        },
        error: (err: any) => {
          console.error('❌ Failed to delete user:', err);
          this.error = `Failed to delete user: ${err}`;
        }
      });
    }
  }

  restoreUser(user: any): void {
    if (confirm(`Restore user ${user.username}?`)) {
      console.log('🔄 Restoring user:', user);
      
      this.userService.restoreUser(user.id).subscribe({
        next: (response: any) => {
          console.log('✅ User restored successfully:', response);
          this.loadDeletedUsers();
          this.showSuccessMessage(`${user.username} restored successfully`);
        },
        error: (err: any) => {
          console.error('❌ Failed to restore user:', err);
          this.error = `Failed to restore user: ${err}`;
        }
      });
    }
  }

  clearError(): void {
    this.error = null;
  }

  // Helper methods
  get canGoPrevious(): boolean {
    return this.page > 1;
  }

  get canGoNext(): boolean {
    return this.page * this.pageSize < this.totalUsers;
  }

  get currentList(): User[] {
    return this.showDeleted ? this.deletedUsers : this.users;
  }

  get currentTitle(): string {
    return this.showDeleted ? 'Deleted Users' : 'User Management';
  }

  get toggleButtonText(): string {
    return this.showDeleted ? '👥 Show Active Users' : '🗑️ Show Deleted Users';
  }
}