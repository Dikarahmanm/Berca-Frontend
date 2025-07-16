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

  // ✅ NEW: Delete confirmation modal state
  showDeleteModal = false;
  userToDelete: { id: number; username: string } | null = null;

  // ✅ NEW: Restore confirmation modal state
  showRestoreModal = false;
  userToRestore: { id: number; username: string; role: string } | null = null;

  // Available roles
  availableRoles = ['User', 'Admin', 'Manager', 'Moderator'];

  // ✅ NEW: Page size options
  pageSizeOptions = [
    { value: 5, label: '5 per page' },
    { value: 15, label: '15 per page' },
    { value: 30, label: '30 per page' },
    { value: 50, label: '50 per page' },
    //{ value: -1, label: 'Show All' }
  ];

  // For Math.ceil in template
  Math = Math;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // ✅ NEW: Handle page size change
  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newPageSize = parseInt(target.value);
    
    console.log(`📄 Changing page size from ${this.pageSize} to ${newPageSize === -1 ? 'All' : newPageSize}`);
    
    this.pageSize = newPageSize;
    this.page = 1; // Reset to first page
    
    if (this.showDeleted) {
      this.loadDeletedUsers();
    } else {
      this.loadUsers();
    }
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

  // ✅ UPDATED: Load users with dynamic page size
  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    console.log('📊 Loading users...');
    
    // If pageSize is -1 (Show All), pass a large number or handle differently
    const requestPageSize = this.pageSize === -1 ? 1000 : this.pageSize;
    const requestPage = this.pageSize === -1 ? 1 : this.page;
    
    this.userService.getUsers(requestPage, requestPageSize, this.search).subscribe({
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

  // ✅ UPDATED: Load deleted users with dynamic page size
  loadDeletedUsers(): void {
    this.loading = true;
    this.error = null;
    
    console.log('🗑️ Loading deleted users...');
    
    const requestPageSize = this.pageSize === -1 ? 1000 : this.pageSize;
    const requestPage = this.pageSize === -1 ? 1 : this.page;
    
    this.userService.getDeletedUsers(requestPage, requestPageSize).subscribe({
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

  // ✅ UPDATED: Delete user with custom modal
  deleteUser(id: number): void {
    const user = this.users.find(u => u.id === id);
    const username = user?.username || `User ${id}`;
    
    // Show custom delete modal instead of browser confirm
    this.userToDelete = { id, username };
    this.showDeleteModal = true;
  }

  // ✅ NEW: Confirm delete action
  confirmDelete(): void {
    if (!this.userToDelete) return;
    
    console.log('🗑️ Deleting user:', this.userToDelete.id);
    
    this.userService.deleteUser(this.userToDelete.id).subscribe({
      next: (response: any) => {
        console.log('✅ User deleted successfully:', response);
        this.loadUsers(); // Reload active users
        this.showSuccessMessage(`${this.userToDelete!.username} deleted successfully`);
        this.closeDeleteModal();
      },
      error: (err: any) => {
        console.error('❌ Failed to delete user:', err);
        this.error = `Failed to delete user: ${err}`;
        this.closeDeleteModal();
      }
    });
  }

  // ✅ NEW: Cancel delete action
  cancelDelete(): void {
    this.closeDeleteModal();
  }

  // ✅ NEW: Close delete modal
  private closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  // ✅ UPDATED: Restore user with custom modal
  restoreUser(user: any): void {
    // Show custom restore modal instead of browser confirm
    this.userToRestore = { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    };
    this.showRestoreModal = true;
  }

  // ✅ NEW: Confirm restore action
  confirmRestore(): void {
    if (!this.userToRestore) return;
    
    console.log('🔄 Restoring user:', this.userToRestore);
    
    this.userService.restoreUser(this.userToRestore.id).subscribe({
      next: (response: any) => {
        console.log('✅ User restored successfully:', response);
        this.loadDeletedUsers();
        this.showSuccessMessage(`${this.userToRestore!.username} restored successfully`);
        this.closeRestoreModal();
      },
      error: (err: any) => {
        console.error('❌ Failed to restore user:', err);
        this.error = `Failed to restore user: ${err}`;
        this.closeRestoreModal();
      }
    });
  }

  // ✅ NEW: Cancel restore action
  cancelRestore(): void {
    this.closeRestoreModal();
  }

  // ✅ NEW: Close restore modal
  private closeRestoreModal(): void {
    this.showRestoreModal = false;
    this.userToRestore = null;
  }

  clearError(): void {
    this.error = null;
  }

  // ✅ UPDATED: Helper methods with Show All support
  get canGoPrevious(): boolean {
    return this.page > 1 && this.pageSize !== -1; // Disable pagination for Show All
  }

  get canGoNext(): boolean {
    return this.pageSize !== -1 && this.page * this.pageSize < this.totalUsers;
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

  // ✅ NEW: Get total pages for display
  get totalPages(): number {
    if (this.pageSize === -1) return 1; // Show All = 1 page
    return Math.ceil(this.totalUsers / this.pageSize);
  }

  // ✅ NEW: Get current page size label
  get currentPageSizeLabel(): string {
    if (this.pageSize === -1) return 'All';
    return this.pageSize.toString();
  }

  // ✅ NEW: Get displayed items count
  get displayedItemsInfo(): string {
    if (this.pageSize === -1) {
      return `Showing all ${this.totalUsers} items`;
    }
    
    const startItem = (this.page - 1) * this.pageSize + 1;
    const endItem = Math.min(this.page * this.pageSize, this.totalUsers);
    
    return `Showing ${startItem}-${endItem} of ${this.totalUsers} items`;
  }
}