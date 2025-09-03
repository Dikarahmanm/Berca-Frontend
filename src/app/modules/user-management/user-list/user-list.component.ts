// ✅ REDESIGNED: User Management with Angular Signals & Enhanced Desktop UI
import { Component, OnInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, timer, interval } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService, User, UsersResponse, UpdateUserRequest } from '../../../core/services/auth.service';
import { UserService } from '../services/user.service';

// Angular Material imports - Minimal for clean design
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Enhanced interfaces for better type safety
interface UserStats {
  total: number;
  active: number;
  inactive: number;
  deleted: number;
  byRole: { [key: string]: number };
}

interface UserFilters {
  search: string;
  role: string;
  status: 'all' | 'active' | 'inactive';
  showDeleted: boolean;
}

interface UserAction {
  id: string;
  type: 'delete' | 'restore' | 'toggle-active' | 'change-role';
  user: User;
  data?: any;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="user-management-container">
      
      <!-- Enhanced Header Section -->
      <section class="user-header">
        <div class="header-content">
          <div class="header-text">
            <h1 class="page-title">
              <mat-icon>people</mat-icon>
              {{ currentTitle() }}
            </h1>
            <p class="page-subtitle">{{ getSubtitleText() }}</p>
          </div>
          
          <div class="header-actions">
            <button 
              class="btn btn-outline" 
              (click)="toggleView()"
              [disabled]="isLoading()">
              <mat-icon>{{ filters().showDeleted ? 'people' : 'delete' }}</mat-icon>
              <span>{{ toggleButtonText() }}</span>
            </button>
            
            <button 
              class="btn btn-primary" 
              (click)="refreshUsers()"
              [disabled]="isLoading()">
              <mat-icon [class.spinning]="isLoading()">refresh</mat-icon>
              <span>{{ isLoading() ? 'Loading...' : 'Refresh' }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Enhanced Stats Cards -->
      <section class="user-stats-section" *ngIf="!filters().showDeleted">
        <div class="stats-grid">
          <div class="stat-card total">
            <div class="stat-icon">
              <mat-icon>people</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ userStats().total }}</div>
              <div class="stat-label">Total Users</div>
              <div class="stat-meta">Registered users</div>
            </div>
          </div>
          
          <div class="stat-card active">
            <div class="stat-icon">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ userStats().active }}</div>
              <div class="stat-label">Active Users</div>
              <div class="stat-meta">Currently active</div>
            </div>
          </div>
          
          <div class="stat-card inactive">
            <div class="stat-icon">
              <mat-icon>block</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ userStats().inactive }}</div>
              <div class="stat-label">Inactive Users</div>
              <div class="stat-meta">Deactivated accounts</div>
            </div>
          </div>
          
          <div class="stat-card roles">
            <div class="stat-icon">
              <mat-icon>admin_panel_settings</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ Object.keys(userStats().byRole).length }}</div>
              <div class="stat-label">User Roles</div>
              <div class="stat-meta">Role types</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Enhanced Filters Section -->
      <section class="filters-section">
        <div class="filters-grid">
          <!-- Search Filter -->
          <div class="filter-group search-group">
            <div class="form-field">
              <label for="search">Search Users</label>
              <div class="search-input-wrapper">
                <mat-icon class="search-icon">search</mat-icon>
                <input 
                  id="search"
                  type="text" 
                  class="form-control"
                  placeholder="Search by username or email..."
                  [value]="filters().search"
                  (input)="updateSearch($event)"
                  [disabled]="isLoading()">
                <button 
                  class="clear-search-btn" 
                  *ngIf="filters().search"
                  (click)="clearSearch()"
                  type="button">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- Role Filter -->
          <div class="filter-group">
            <div class="form-field">
              <label for="role-filter">Filter by Role</label>
              <select 
                id="role-filter"
                class="form-control"
                [value]="filters().role"
                (change)="updateRoleFilter($event)"
                [disabled]="isLoading()">
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="User">User</option>
              </select>
            </div>
          </div>

          <!-- Status Filter -->
          <div class="filter-group" *ngIf="!filters().showDeleted">
            <div class="form-field">
              <label for="status-filter">Filter by Status</label>
              <select 
                id="status-filter"
                class="form-control"
                [value]="filters().status"
                (change)="updateStatusFilter($event)"
                [disabled]="isLoading()">
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          <!-- Page Size -->
          <div class="filter-group">
            <div class="form-field">
              <label for="page-size">Items per page</label>
              <select 
                id="page-size"
                class="form-control"
                [value]="pageSize()"
                (change)="updatePageSize($event)"
                [disabled]="isLoading()">
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
                <option value="-1">Show All</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading() && currentUsers().length === 0">
        <div class="loading-spinner">
          <mat-spinner></mat-spinner>
        </div>
        <p>Loading users...</p>
      </div>

      <!-- Error State -->
      <div class="error-container" *ngIf="error() && !isLoading()">
        <div class="error-content">
          <mat-icon class="error-icon">error</mat-icon>
          <h3>Error Loading Users</h3>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" (click)="refreshUsers()">
            <mat-icon>refresh</mat-icon>
            Try Again
          </button>
        </div>
      </div>

      <!-- Users List -->
      <section class="users-section" *ngIf="!isLoading() || currentUsers().length > 0">
        
        <!-- List Header -->
        <div class="list-header">
          <div class="list-info">
            <h3>{{ getListTitle() }}</h3>
            <p class="list-count">{{ getDisplayInfo() }}</p>
          </div>
          
          <div class="list-actions" *ngIf="canPerformBulkActions()">
            <button class="btn btn-outline" (click)="selectAll()">
              <mat-icon>select_all</mat-icon>
              Select All
            </button>
          </div>
        </div>

        <!-- Mobile Card View -->
        <div class="mobile-view">
          <div class="user-card" *ngFor="let user of currentUsers(); trackBy: trackByUserId">
            <div class="user-card-content">
              <!-- User Header -->
              <div class="user-header">
                <div class="user-avatar">
                  <mat-icon>{{ getUserIcon(user) }}</mat-icon>
                </div>
                <div class="user-basic-info">
                  <h4 class="user-name">{{ user.username }}</h4>
                  <p class="user-email" *ngIf="user.email">{{ user.email }}</p>
                  <div class="user-badges">
                    <span class="badge role-badge" [attr.data-role]="user.role">{{ user.role }}</span>
                    <span class="badge status-badge" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                      {{ user.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- User Actions -->
              <div class="user-actions">
                <button 
                  class="action-btn toggle-btn"
                  *ngIf="!filters().showDeleted && canToggleActive(user)"
                  (click)="toggleActive(user)"
                  [title]="user.isActive ? 'Deactivate User' : 'Activate User'">
                  <mat-icon>{{ user.isActive ? 'block' : 'check_circle' }}</mat-icon>
                </button>
                
                <button 
                  class="action-btn edit-btn"
                  *ngIf="!filters().showDeleted && canChangeRole(user)"
                  (click)="openRoleChangeModal(user)"
                  title="Change Role">
                  <mat-icon>edit</mat-icon>
                </button>
                
                <button 
                  class="action-btn delete-btn"
                  *ngIf="!filters().showDeleted && canDeleteUser(user)"
                  (click)="confirmDelete(user)"
                  title="Delete User">
                  <mat-icon>delete</mat-icon>
                </button>
                
                <button 
                  class="action-btn restore-btn"
                  *ngIf="filters().showDeleted && canRestoreUser(user)"
                  (click)="confirmRestore(user)"
                  title="Restore User">
                  <mat-icon>restore</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div class="desktop-view">
          <div class="table-container">
            <table class="users-table">
              <thead>
                <tr>
                  <th class="select-col" *ngIf="canPerformBulkActions()">
                    <input type="checkbox" (change)="toggleSelectAll($event)">
                  </th>
                  <th class="user-col">User</th>
                  <th class="role-col">Role</th>
                  <th class="status-col">Status</th>
                  <th class="created-col" *ngIf="!filters().showDeleted">Created</th>
                  <th class="deleted-col" *ngIf="filters().showDeleted">Deleted</th>
                  <th class="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of currentUsers(); trackBy: trackByUserId" 
                    class="user-row"
                    [class.selected]="isSelected(user.id)">
                  
                  <td class="select-col" *ngIf="canPerformBulkActions()">
                    <input type="checkbox" 
                           [checked]="isSelected(user.id)"
                           (change)="toggleSelect(user.id, $event)">
                  </td>
                  
                  <td class="user-col">
                    <div class="user-info">
                      <div class="user-avatar-small">
                        <mat-icon>{{ getUserIcon(user) }}</mat-icon>
                      </div>
                      <div class="user-details">
                        <div class="username">{{ user.username }}</div>
                        <div class="user-email" *ngIf="user.email">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td class="role-col">
                    <select 
                      class="role-select"
                      [value]="user.role"
                      (change)="changeUserRole(user, $event)"
                      [disabled]="!canChangeRole(user) || isLoading()"
                      *ngIf="!filters().showDeleted">
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="User">User</option>
                    </select>
                    <span class="role-display" *ngIf="filters().showDeleted">{{ user.role }}</span>
                  </td>
                  
                  <td class="status-col">
                    <span class="status-badge" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                      <mat-icon class="status-icon">{{ user.isActive ? 'check_circle' : 'block' }}</mat-icon>
                      {{ user.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  
                  <td class="created-col" *ngIf="!filters().showDeleted">
                    {{ formatDate(user.createdAt) }}
                  </td>
                  
                  <td class="deleted-col" *ngIf="filters().showDeleted">
                    {{ formatDate(user.deletedAt) }}
                  </td>
                  
                  <td class="actions-col">
                    <div class="action-buttons">
                      <button 
                        class="btn btn-sm btn-outline"
                        *ngIf="!filters().showDeleted && canToggleActive(user)"
                        (click)="toggleActive(user)"
                        [disabled]="isLoading()">
                        <mat-icon>{{ user.isActive ? 'block' : 'check_circle' }}</mat-icon>
                        {{ user.isActive ? 'Deactivate' : 'Activate' }}
                      </button>
                      
                      <button 
                        class="btn btn-sm btn-error"
                        *ngIf="!filters().showDeleted && canDeleteUser(user)"
                        (click)="confirmDelete(user)"
                        [disabled]="isLoading()">
                        <mat-icon>delete</mat-icon>
                        Delete
                      </button>
                      
                      <button 
                        class="btn btn-sm btn-success"
                        *ngIf="filters().showDeleted && canRestoreUser(user)"
                        (click)="confirmRestore(user)"
                        [disabled]="isLoading()">
                        <mat-icon>restore</mat-icon>
                        Restore
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Enhanced Pagination -->
        <div class="pagination-section" *ngIf="totalPages() > 1">
          <div class="pagination-info">
            <span>{{ getDisplayInfo() }}</span>
          </div>
          
          <div class="pagination-controls">
            <button 
              class="btn btn-outline btn-sm"
              [disabled]="currentPage() <= 1 || isLoading()"
              (click)="goToPage(1)">
              <mat-icon>first_page</mat-icon>
            </button>
            
            <button 
              class="btn btn-outline btn-sm"
              [disabled]="currentPage() <= 1 || isLoading()"
              (click)="goToPage(currentPage() - 1)">
              <mat-icon>chevron_left</mat-icon>
            </button>
            
            <span class="page-info">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>
            
            <button 
              class="btn btn-outline btn-sm"
              [disabled]="currentPage() >= totalPages() || isLoading()"
              (click)="goToPage(currentPage() + 1)">
              <mat-icon>chevron_right</mat-icon>
            </button>
            
            <button 
              class="btn btn-outline btn-sm"
              [disabled]="currentPage() >= totalPages() || isLoading()"
              (click)="goToPage(totalPages())">
              <mat-icon>last_page</mat-icon>
            </button>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading() && !error() && currentUsers().length === 0">
        <div class="empty-content">
          <mat-icon class="empty-icon">{{ filters().showDeleted ? 'delete' : 'people' }}</mat-icon>
          <h3>{{ getEmptyStateTitle() }}</h3>
          <p>{{ getEmptyStateMessage() }}</p>
          <button class="btn btn-primary" (click)="refreshUsers()" *ngIf="!hasActiveFilters()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <button class="btn btn-outline" (click)="clearAllFilters()" *ngIf="hasActiveFilters()">
            <mat-icon>clear</mat-icon>
            Clear Filters
          </button>
        </div>
      </div>

    </div>
  `,
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ===== SIGNAL-BASED STATE MANAGEMENT =====
  // Inject services
  private authService = inject(AuthService);
  private userService = inject(UserService);

  // Core data signals
  private usersData = signal<User[]>([]);
  private deletedUsersData = signal<User[]>([]);
  private totalCount = signal<number>(0);
  
  // UI state signals
  private loadingState = signal<boolean>(false);
  private errorMessage = signal<string | null>(null);
  private selectedUserIds = signal<Set<number>>(new Set());
  
  // Filter and pagination signals
  private filtersData = signal<UserFilters>({
    search: '',
    role: '',
    status: 'all',
    showDeleted: false
  });
  
  private currentPageNum = signal<number>(1);
  private pageSizeNum = signal<number>(20);
  private lastUpdated = signal<Date>(new Date());

  // Expose Object for template usage
  readonly Object = Object;

  // ===== COMPUTED PROPERTIES =====
  readonly isLoading = computed(() => this.loadingState());
  readonly error = computed(() => this.errorMessage());
  readonly filters = computed(() => this.filtersData());
  readonly currentPage = computed(() => this.currentPageNum());
  readonly pageSize = computed(() => this.pageSizeNum());
  
  readonly currentUsers = computed(() => {
    const users = this.filters().showDeleted ? this.deletedUsersData() : this.usersData();
    const filters = this.filters();
    
    let filtered = users;
    
    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(search) ||
        (user.email && user.email.toLowerCase().includes(search))
      );
    }
    
    // Apply role filter
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }
    
    // Apply status filter (only for non-deleted users)
    if (!filters.showDeleted && filters.status !== 'all') {
      filtered = filtered.filter(user => 
        filters.status === 'active' ? user.isActive : !user.isActive
      );
    }
    
    return filtered;
  });

  readonly userStats = computed((): UserStats => {
    const users = this.usersData();
    const deleted = this.deletedUsersData();
    
    const stats: UserStats = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      deleted: deleted.length,
      byRole: {}
    };
    
    // Count by role
    users.forEach(user => {
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
    });
    
    return stats;
  });

  readonly totalPages = computed(() => {
    const size = this.pageSize();
    if (size === -1) return 1; // Show all
    return Math.ceil(this.currentUsers().length / size);
  });

  readonly currentUserRole = computed(() => {
    return localStorage.getItem('role') || 'User';
  });

  readonly currentTitle = computed(() => {
    return this.filters().showDeleted ? 'Deleted Users' : 'User Management';
  });

  readonly toggleButtonText = computed(() => {
    return this.filters().showDeleted ? 'Show Active Users' : 'Show Deleted Users';
  });

  // ===== REAL-TIME AUTO REFRESH =====
  constructor() {
    // Auto-refresh every 60 seconds for real-time updates
    timer(60000, 60000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.refreshUsers();
    });

    // Setup search debouncing
    this.setupSearchDebouncing();
  }

  ngOnInit(): void {
    console.log('🔍 Current user role:', this.currentUserRole());
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALIZATION METHODS =====
  private loadInitialData(): void {
    this.loadUsers();
  }

  private setupSearchDebouncing(): void {
    // This would typically use a form control, but for simplicity we'll handle it in updateSearch
  }

  // ===== DATA LOADING METHODS WITH SIGNALS =====
  private async loadUsers(): Promise<void> {
    this.loadingState.set(true);
    this.errorMessage.set(null);

    try {
      const filters = this.filters();
      if (filters.showDeleted) {
        await this.loadDeletedUsers();
      } else {
        await this.loadActiveUsers();
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      this.errorMessage.set('Failed to load users. Please try again.');
    } finally {
      this.loadingState.set(false);
      this.lastUpdated.set(new Date());
    }
  }

  private async loadActiveUsers(): Promise<void> {
    const page = this.currentPage();
    const pageSize = this.pageSize() === -1 ? 1000 : this.pageSize();

    const response = await this.authService.getUsers(page, pageSize).toPromise();
    if (response) {
      this.usersData.set(response.users || []);
      this.totalCount.set(response.total || 0);
      console.log('✅ Active users loaded:', response.users?.length);
    }
  }

  private async loadDeletedUsers(): Promise<void> {
    const page = this.currentPage();
    const pageSize = this.pageSize() === -1 ? 1000 : this.pageSize();

    const response = await this.authService.getDeletedUsers(page, pageSize).toPromise();
    if (response) {
      this.deletedUsersData.set(response.users || []);
      this.totalCount.set(response.total || 0);
      console.log('✅ Deleted users loaded:', response.users?.length);
    }
  }

  // ===== PUBLIC METHODS FOR TEMPLATE =====
  refreshUsers(): void {
    console.log('🔄 Manual refresh triggered');
    this.loadUsers();
  }

  toggleView(): void {
    const currentFilters = this.filters();
    this.filtersData.set({
      ...currentFilters,
      showDeleted: !currentFilters.showDeleted
    });
    this.currentPageNum.set(1);
    this.loadUsers();
  }

  // ===== FILTER METHODS =====
  updateSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const currentFilters = this.filters();
    this.filtersData.set({
      ...currentFilters,
      search: target.value
    });
    this.currentPageNum.set(1);
  }

  clearSearch(): void {
    const currentFilters = this.filters();
    this.filtersData.set({
      ...currentFilters,
      search: ''
    });
  }

  updateRoleFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const currentFilters = this.filters();
    this.filtersData.set({
      ...currentFilters,
      role: target.value
    });
    this.currentPageNum.set(1);
  }

  updateStatusFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const currentFilters = this.filters();
    this.filtersData.set({
      ...currentFilters,
      status: target.value as 'all' | 'active' | 'inactive'
    });
    this.currentPageNum.set(1);
  }

  updatePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSizeNum.set(parseInt(target.value));
    this.currentPageNum.set(1);
    this.loadUsers();
  }

  clearAllFilters(): void {
    this.filtersData.set({
      search: '',
      role: '',
      status: 'all',
      showDeleted: this.filters().showDeleted
    });
    this.currentPageNum.set(1);
  }

  // ===== PAGINATION METHODS =====
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPageNum.set(page);
      this.loadUsers();
    }
  }

  // ===== PERMISSION METHODS =====
  canChangeRole(user: User): boolean {
    const role = this.currentUserRole();
    return role === 'Manager' && user.role !== 'Manager';
  }

  canToggleActive(user: User): boolean {
    const role = this.currentUserRole();
    return ['Admin', 'Manager'].includes(role);
  }

  canDeleteUser(user: User): boolean {
    const role = this.currentUserRole();
    return role === 'Manager';
  }

  canRestoreUser(user: User): boolean {
    return this.canDeleteUser(user);
  }

  canPerformBulkActions(): boolean {
    return this.canDeleteUser({ role: 'User' } as User);
  }

  // ===== USER ACTION METHODS =====
  async toggleActive(user: User): Promise<void> {
    if (!this.canToggleActive(user)) return;

    this.loadingState.set(true);
    try {
      await this.authService.updateUser(user.id, {
        role: user.role,
        isActive: !user.isActive
      }).toPromise();

      // Update local data
      const users = this.usersData();
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, isActive: !u.isActive } : u
      );
      this.usersData.set(updatedUsers);
      
      console.log(`✅ User ${user.username} ${!user.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Failed to toggle user active status:', error);
      this.errorMessage.set('Failed to update user status');
    } finally {
      this.loadingState.set(false);
    }
  }

  async changeUserRole(user: User, event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    const newRole = target.value;
    
    if (newRole === user.role || !this.canChangeRole(user)) {
      target.value = user.role; // Reset
      return;
    }

    this.loadingState.set(true);
    try {
      await this.authService.updateUser(user.id, {
        role: newRole,
        isActive: user.isActive
      }).toPromise();

      // Update local data
      const users = this.usersData();
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, role: newRole } : u
      );
      this.usersData.set(updatedUsers);
      
      console.log(`✅ User ${user.username} role changed to ${newRole}`);
    } catch (error) {
      console.error('Failed to change user role:', error);
      this.errorMessage.set('Failed to change user role');
      target.value = user.role; // Reset on error
    } finally {
      this.loadingState.set(false);
    }
  }

  async confirmDelete(user: User): Promise<void> {
    if (!this.canDeleteUser(user)) return;
    
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    this.loadingState.set(true);
    try {
      await this.authService.deleteUser(user.id).toPromise();
      
      // Remove from local data
      const users = this.usersData();
      const updatedUsers = users.filter(u => u.id !== user.id);
      this.usersData.set(updatedUsers);
      
      console.log(`✅ User ${user.username} deleted`);
    } catch (error) {
      console.error('Failed to delete user:', error);
      this.errorMessage.set('Failed to delete user');
    } finally {
      this.loadingState.set(false);
    }
  }

  async confirmRestore(user: User): Promise<void> {
    if (!this.canRestoreUser(user)) return;
    
    if (!confirm(`Are you sure you want to restore user "${user.username}"?`)) {
      return;
    }

    this.loadingState.set(true);
    try {
      await this.authService.restoreUser(user.id).toPromise();
      
      // Remove from deleted users data
      const deletedUsers = this.deletedUsersData();
      const updatedDeletedUsers = deletedUsers.filter(u => u.id !== user.id);
      this.deletedUsersData.set(updatedDeletedUsers);
      
      console.log(`✅ User ${user.username} restored`);
    } catch (error) {
      console.error('Failed to restore user:', error);
      this.errorMessage.set('Failed to restore user');
    } finally {
      this.loadingState.set(false);
    }
  }

  // ===== SELECTION METHODS =====
  isSelected(userId: number): boolean {
    return this.selectedUserIds().has(userId);
  }

  toggleSelect(userId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const selected = new Set(this.selectedUserIds());
    
    if (target.checked) {
      selected.add(userId);
    } else {
      selected.delete(userId);
    }
    
    this.selectedUserIds.set(selected);
  }

  selectAll(): void {
    const userIds = this.currentUsers().map(u => u.id);
    this.selectedUserIds.set(new Set(userIds));
  }

  toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.selectAll();
    } else {
      this.selectedUserIds.set(new Set());
    }
  }

  // ===== UTILITY METHODS FOR TEMPLATE =====
  trackByUserId(index: number, user: User): number {
    return user.id;
  }

  getUserIcon(user: User): string {
    switch (user.role) {
      case 'Admin': return 'admin_panel_settings';
      case 'Manager': return 'manage_accounts';
      default: return 'person';
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID');
    } catch {
      return '-';
    }
  }

  getSubtitleText(): string {
    const filters = this.filters();
    if (filters.showDeleted) {
      return 'Manage deleted users and restore accounts';
    }
    return 'Manage system users, roles, and permissions';
  }

  getListTitle(): string {
    const filters = this.filters();
    return filters.showDeleted ? 'Deleted Users' : 'Active Users';
  }

  getDisplayInfo(): string {
    const total = this.currentUsers().length;
    const page = this.currentPage();
    const pageSize = this.pageSize();

    if (pageSize === -1) {
      return `Showing all ${total} users`;
    }

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `Showing ${start}-${end} of ${total} users`;
  }

  getEmptyStateTitle(): string {
    const filters = this.filters();
    if (filters.showDeleted) {
      return 'No deleted users';
    }
    return this.hasActiveFilters() ? 'No users match your filters' : 'No users found';
  }

  getEmptyStateMessage(): string {
    const filters = this.filters();
    if (filters.showDeleted) {
      return 'There are no deleted users to display.';
    }
    return this.hasActiveFilters() 
      ? 'Try adjusting your search or filter criteria.'
      : 'No users have been created yet.';
  }

  hasActiveFilters(): boolean {
    const filters = this.filters();
    return !!(filters.search || filters.role || filters.status !== 'all');
  }

  openRoleChangeModal(user: User): void {
    // This would open a modal in a real implementation
    // For now, we'll just log
    console.log('Opening role change modal for:', user.username);
  }
}