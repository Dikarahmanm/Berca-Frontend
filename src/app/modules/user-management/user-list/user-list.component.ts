import { Component, OnInit } from '@angular/core';
import { AuthService, User, UsersResponse, UpdateUserRequest } from '../../../core/services/auth.service';
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

  // ✅ UPDATED: Available roles (removed Moderator)
  availableRoles = ['User', 'Admin', 'Manager'];

  // ✅ UPDATED: Get current user role from localStorage
  get currentUserRole(): string {
    return localStorage.getItem('role') || 'User';
  }

  // ✅ NEW: Page size options
  pageSizeOptions = [
    { value: 5, label: '5 per page' },
    { value: 10, label: '10 per page' },
    { value: 15, label: '15 per page' },
    { value: 20, label: '20 per page' },
    { value: -1, label: 'Show All' }
  ];

  // ✅ NEW: Modal states
  showDeleteModal = false;
  userToDelete: { id: number; username: string } | null = null;

  showRestoreModal = false;
  userToRestore: { id: number; username: string; role: string } | null = null;

  showRoleChangeModal = false;
  roleChangeData: { 
    user: User; 
    newRole: string; 
    oldRole: string;
    selectElement: HTMLSelectElement;
  } | null = null;

  showPermissionModal = false;
  permissionDeniedData: {
    action: string;
    requiredRole: string;
    currentRole: string;
  } | null = null;

  // For Math.ceil in template
  Math = Math;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    console.log('🔍 Current user role:', this.currentUserRole);
    this.testAuthBeforeLoad();
  }

  // ✅ FIXED: Test authentication before loading data
  private testAuthBeforeLoad(): void {
    console.log('🧪 Testing authentication before loading users...');
    
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    
    if (!username || !role) {
      console.error('❌ No authentication info in localStorage');
      this.error = 'Authentication required. Please login.';
      return;
    }

    // Use AuthService for authentication test
    this.authService.testAuthStatus().subscribe({
      next: () => {
        console.log('✅ Authentication test passed, loading users...');
        this.loadUsers();
      },
      error: (err: any) => {
        console.error('❌ Authentication test failed:', err);
        this.error = 'Authentication failed. Please login again.';
        localStorage.removeItem('username');
        localStorage.removeItem('role');
      }
    });
  }

  // ✅ NEW: Permission checking methods
  canChangeRole(user: User): boolean {
    const role = this.currentUserRole;
    console.log(`🔐 Checking canChangeRole for ${user.username} - Current user role: ${role}`);
    
    if (role === 'Admin') {
      return false; // Admin can't change roles
    }
    if (role === 'Manager') {
      return true; // Manager can change all roles
    }
    return false; // User can't change roles
  }

  canToggleActive(user: User): boolean {
    const role = this.currentUserRole;
    console.log(`🔐 Checking canToggleActive for ${user.username} - Current user role: ${role}`);
    
    if (role === 'Admin') {
      return true; // Admin can only activate/deactivate
    }
    if (role === 'Manager') {
      return true; // Manager can activate/deactivate
    }
    return false; // User can't toggle active status
  }

  canDeleteUser(user: User): boolean {
    const role = this.currentUserRole;
    console.log(`🔐 Checking canDeleteUser for ${user.username} - Current user role: ${role}`);
    
    if (role === 'Admin') {
      return false; // Admin can't delete users
    }
    if (role === 'Manager') {
      return true; // Manager can delete users
    }
    return false; // User can't delete users
  }

  canRestoreUser(user: User): boolean {
    return this.canDeleteUser(user); // Same permission as delete
  }

  getAvailableRolesForUser(user: User): string[] {
    const role = this.currentUserRole;
    
    if (role === 'Manager') {
      return ['User', 'Admin']; // Manager can set users to User or Admin
    }
    return []; // Others can't change roles
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

  // ✅ UPDATED: Change user role with permission check first
  changeUserRole(user: User, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newRole = target.value;
    
    if (newRole === user.role) {
      return; // No change
    }

    // ✅ NEW: Check permission before proceeding
    if (!this.canChangeRole(user)) {
      this.showPermissionDeniedModal('change roles', 'Manager');
      // Reset dropdown to original value
      target.value = user.role;
      return;
    }

    console.log(`🔄 Preparing role change for user ${user.username} from ${user.role} to ${newRole}`);
    
    // Show custom role change modal
    this.roleChangeData = {
      user: user,
      newRole: newRole,
      oldRole: user.role,
      selectElement: target
    };
    this.showRoleChangeModal = true;
  }

  // ✅ NEW: Confirm role change action
  confirmRoleChange(): void {
    if (!this.roleChangeData) return;
    
    const { user, newRole } = this.roleChangeData;
    
    console.log(`🔄 Changing user ${user.username} role from ${user.role} to ${newRole}`);
    
    this.authService.updateUser(user.id, {
      role: newRole,
      isActive: user.isActive
    }).subscribe({
      next: (response: any) => {
        console.log('✅ User role updated successfully:', response);
        
        // Update local user object
        user.role = newRole;
        
        // Show success feedback
        this.showSuccessMessage(`${user.username}'s role updated to ${newRole}`);
        this.closeRoleChangeModal();
      },
      error: (err: any) => {
        console.error('❌ Failed to update user role:', err);
        
        // Reset dropdown to original value
        if (this.roleChangeData?.selectElement) {
          this.roleChangeData.selectElement.value = user.role;
        }
        
        this.error = `Failed to update role: ${err}`;
        this.closeRoleChangeModal();
      }
    });
  }

  // ✅ NEW: Cancel role change action
  cancelRoleChange(): void {
    if (this.roleChangeData?.selectElement) {
      // Reset dropdown to original value
      this.roleChangeData.selectElement.value = this.roleChangeData.oldRole;
    }
    this.closeRoleChangeModal();
  }

  // ✅ UPDATED: Toggle active with permission check first
  toggleActive(user: User): void {
    // ✅ NEW: Check permission before proceeding
    if (!this.canToggleActive(user)) {
      this.showPermissionDeniedModal('activate/deactivate users', 'Admin or Manager');
      return;
    }

    console.log('🔄 Toggling user active status:', user);
    
    this.authService.updateUser(user.id, {
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

  // ✅ UPDATED: Delete user with permission check first
  deleteUser(id: number): void {
    const user = this.users.find(u => u.id === id);
    
    // ✅ NEW: Check permission before proceeding
    if (!this.canDeleteUser(user!)) {
      this.showPermissionDeniedModal('delete users', 'Manager');
      return;
    }

    const username = user?.username || `User ${id}`;
    
    // Show custom delete modal
    this.userToDelete = { id, username };
    this.showDeleteModal = true;
  }

  // ✅ NEW: Confirm delete action
  confirmDelete(): void {
    if (!this.userToDelete) return;
    
    console.log('🗑️ Deleting user:', this.userToDelete.id);
    
    this.authService.deleteUser(this.userToDelete.id).subscribe({
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

  // ✅ UPDATED: Restore user with permission check first
  restoreUser(user: any): void {
    // ✅ NEW: Check permission before proceeding
    if (!this.canRestoreUser(user)) {
      this.showPermissionDeniedModal('restore users', 'Manager');
      return;
    }

    // Show custom restore modal
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
    
    this.authService.restoreUser(this.userToRestore.id).subscribe({
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

  // ✅ UPDATED: Load users with dynamic page size
  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    console.log('📊 Loading users...');
    
    // If pageSize is -1 (Show All), pass a large number or handle differently
    const requestPageSize = this.pageSize === -1 ? 1000 : this.pageSize;
    const requestPage = this.pageSize === -1 ? 1 : this.page;
    
    this.authService.getUsers(requestPage, requestPageSize, this.search).subscribe({
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
    
    this.authService.getDeletedUsers(requestPage, requestPageSize).subscribe({
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

  clearError(): void {
    this.error = null;
  }

  // ✅ Modal management methods
  private closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  private closeRestoreModal(): void {
    this.showRestoreModal = false;
    this.userToRestore = null;
  }

  private closeRoleChangeModal(): void {
    this.showRoleChangeModal = false;
    this.roleChangeData = null;
  }

  private showPermissionDeniedModal(action: string, requiredRole: string): void {
    this.permissionDeniedData = {
      action: action,
      requiredRole: requiredRole,
      currentRole: this.currentUserRole
    };
    this.showPermissionModal = true;
  }

  closePermissionModal(): void {
    this.showPermissionModal = false;
    this.permissionDeniedData = null;
  }

  private showSuccessMessage(message: string): void {
    // Simple success feedback
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

  // ✅ Helper methods with Show All support
  get canGoPrevious(): boolean {
    return this.page > 1 && this.pageSize !== -1;
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

  get totalPages(): number {
    if (this.pageSize === -1) return 1; // Show All = 1 page
    return Math.ceil(this.totalUsers / this.pageSize);
  }

  get displayedItemsInfo(): string {
    if (this.pageSize === -1) {
      return `Showing all ${this.totalUsers} users`;
    }
    
    const startItem = (this.page - 1) * this.pageSize + 1;
    const endItem = Math.min(this.page * this.pageSize, this.totalUsers);
    
    return `Showing ${startItem}-${endItem} of ${this.totalUsers} users`;
  }
}