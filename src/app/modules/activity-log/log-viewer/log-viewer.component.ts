// ✅ REDESIGNED: Activity Log with Angular Signals & Enhanced Desktop UI
import { Component, OnInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, timer, BehaviorSubject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { LogService, LogActivity } from '../services/log.service';

// Angular Material imports - Minimal for clean design
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Enhanced interfaces for better type safety
interface LogFilters {
  search: string;
  fromDate: string;
  toDate: string;
  action: string;
}

interface LogStats {
  total: number;
  todayCount: number;
  thisWeekCount: number;
  loginCount: number;
  errorCount: number;
}

interface PageSizeOption {
  value: number;
  label: string;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc' | null;
}

type SortableColumn = 'id' | 'username' | 'action' | 'timestamp' | 'category';

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="log-viewer-container">
      
      <!-- Enhanced Header Section -->
      <section class="log-header">
        <div class="header-content">
          <div class="header-text">
            <h1 class="page-title">
              <mat-icon>history</mat-icon>
              Activity Logs
            </h1>
            <p class="page-subtitle">Monitor and track all system activities and user actions</p>
          </div>
          
          <div class="header-actions">
            <button 
              class="btn btn-outline" 
              (click)="clearAllFilters()"
              [disabled]="isLoading() || !hasActiveFilters()"
              title="Clear all filters">
              <mat-icon>clear_all</mat-icon>
              <span>Clear Filters</span>
            </button>
            
            <button 
              class="btn btn-secondary" 
              (click)="exportLogs()"
              [disabled]="isLoading() || isExporting()"
              title="Export logs to Excel">
              <mat-icon [class.spinning]="isExporting()">download</mat-icon>
              <span>{{ isExporting() ? 'Exporting...' : 'Export' }}</span>
            </button>
            
            <button 
              class="btn btn-primary" 
              (click)="refreshLogs()"
              [disabled]="isLoading()"
              title="Refresh logs">
              <mat-icon [class.spinning]="isLoading()">refresh</mat-icon>
              <span>{{ isLoading() ? 'Loading...' : 'Refresh' }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Enhanced Stats Cards -->
      <section class="log-stats-section">
        <div class="stats-grid">
          <div class="stat-card total">
            <div class="stat-icon">
              <mat-icon>event_note</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(logStats().total) }}</div>
              <div class="stat-label">Total Logs</div>
              <div class="stat-meta">All recorded activities</div>
            </div>
          </div>
          
          <div class="stat-card today">
            <div class="stat-icon">
              <mat-icon>today</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(logStats().todayCount) }}</div>
              <div class="stat-label">Today's Activity</div>
              <div class="stat-meta">Activities today</div>
            </div>
          </div>
          
          <div class="stat-card week">
            <div class="stat-icon">
              <mat-icon>date_range</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(logStats().thisWeekCount) }}</div>
              <div class="stat-label">This Week</div>
              <div class="stat-meta">7 days activities</div>
            </div>
          </div>
          
          <div class="stat-card users">
            <div class="stat-icon">
              <mat-icon>login</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatNumber(logStats().loginCount) }}</div>
              <div class="stat-label">Login Events</div>
              <div class="stat-meta">User authentications</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Enhanced Filters Section -->
      <section class="filters-section">
        <div class="filters-grid">
          <!-- Enhanced Search Filter -->
          <div class="filter-group search-group">
            <div class="form-field">
              <label for="search">
                Search Logs
                <span class="search-hint" title="Search across all fields: ID, username, action, category, timestamp">
                  <mat-icon class="help-icon">help_outline</mat-icon>
                </span>
              </label>
              <div class="search-input-wrapper">
                <mat-icon class="search-icon">search</mat-icon>
                <input 
                  id="search"
                  type="text" 
                  class="form-control"
                  placeholder="Search by ID, username, action, category, or timestamp..."
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
              <!-- Search Results Info -->
              <div class="search-info" *ngIf="filters().search">
                <small class="text-secondary">
                  {{ getSearchResultsInfo() }}
                </small>
              </div>
            </div>
          </div>

          <!-- From Date Filter -->
          <div class="filter-group">
            <div class="form-field">
              <label for="from-date">From Date</label>
              <div class="date-input-wrapper">
                <input 
                  id="from-date"
                  type="date"
                  class="form-control"
                  [value]="filters().fromDate"
                  (change)="updateFromDate($event)"
                  [disabled]="isLoading()">
                <button 
                  class="clear-date-btn" 
                  *ngIf="filters().fromDate"
                  (click)="clearFromDate()"
                  type="button"
                  title="Clear from date">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- To Date Filter -->
          <div class="filter-group">
            <div class="form-field">
              <label for="to-date">To Date</label>
              <div class="date-input-wrapper">
                <input 
                  id="to-date"
                  type="date"
                  class="form-control"
                  [value]="filters().toDate"
                  (change)="updateToDate($event)"
                  [disabled]="isLoading()">
                <button 
                  class="clear-date-btn" 
                  *ngIf="filters().toDate"
                  (click)="clearToDate()"
                  type="button"
                  title="Clear to date">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- Action Filter -->
          <div class="filter-group">
            <div class="form-field">
              <label for="action-filter">Filter by Action</label>
              <select 
                id="action-filter"
                class="form-control"
                [value]="filters().action"
                (change)="updateActionFilter($event)"
                [disabled]="isLoading()">
                <option value="">All Actions</option>
                <option value="login">Login Events</option>
                <option value="logout">Logout Events</option>
                <option value="created">Create Actions</option>
                <option value="updated">Update Actions</option>
                <option value="deleted">Delete Actions</option>
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
                <option *ngFor="let option of pageSizeOptions()" [value]="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- Success/Error Messages -->
      <div class="message-container" *ngIf="successMessage() || errorMessage()">
        <div class="message success-message" *ngIf="successMessage()">
          <mat-icon>check_circle</mat-icon>
          <span>{{ successMessage() }}</span>
          <button class="close-btn" (click)="clearMessages()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <div class="message error-message" *ngIf="errorMessage()">
          <mat-icon>error</mat-icon>
          <span>{{ errorMessage() }}</span>
          <button class="close-btn" (click)="clearMessages()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading() && filteredLogs().length === 0">
        <div class="loading-spinner">
          <mat-spinner></mat-spinner>
        </div>
        <p>Loading activity logs...</p>
      </div>

      <!-- Logs List -->
      <section class="logs-section" *ngIf="!isLoading() || filteredLogs().length > 0">
        
        <!-- List Header -->
        <div class="list-header">
          <div class="list-info">
            <h3>Activity History</h3>
            <p class="list-count">{{ getDisplayInfo() }}</p>
          </div>
          
          <div class="list-actions">
            <div class="view-toggle">
              <button 
                class="toggle-btn"
                [class.active]="viewMode() === 'card'"
                (click)="setViewMode('card')"
                title="Card View">
                <mat-icon>view_agenda</mat-icon>
              </button>
              <button 
                class="toggle-btn"
                [class.active]="viewMode() === 'table'"
                (click)="setViewMode('table')"
                title="Table View">
                <mat-icon>table_view</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile/Card View -->
        <div class="mobile-view" *ngIf="viewMode() === 'card'">
          <div class="log-card" *ngFor="let log of filteredLogs(); trackBy: trackByLogId">
            <div class="log-card-content">
              <!-- Log Header -->
              <div class="log-header">
                <div class="log-icon">
                  <mat-icon>{{ getActionIcon(log.action) }}</mat-icon>
                </div>
                <div class="log-basic-info">
                  <h4 class="log-action">{{ log.action }}</h4>
                  <p class="log-user">{{ log.username }}</p>
                  <div class="log-badges">
                    <span class="badge action-badge" [ngClass]="getActionClass(log.action)">
                      {{ getActionCategory(log.action) }}
                    </span>
                    <span class="badge time-badge">
                      {{ formatTimeAgo(log.timestamp) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Log Details -->
              <div class="log-details">
                <div class="detail-item">
                  <mat-icon class="detail-icon">access_time</mat-icon>
                  <span>{{ formatDateTime(log.timestamp) }}</span>
                </div>
                <div class="detail-item">
                  <mat-icon class="detail-icon">fingerprint</mat-icon>
                  <span>ID: {{ log.id }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div class="desktop-view" *ngIf="viewMode() === 'table'">
          <div class="table-container">
            <table class="logs-table">
              <thead>
                <tr>
                  <th class="id-col {{ getSortClass('id') }}" (click)="sortByColumn('id')">
                    <div class="th-content">
                      <span>ID</span>
                      <mat-icon class="sort-icon">{{ getSortIcon('id') }}</mat-icon>
                    </div>
                  </th>
                  <th class="action-col {{ getSortClass('action') }}" (click)="sortByColumn('action')">
                    <div class="th-content">
                      <span>Action</span>
                      <mat-icon class="sort-icon">{{ getSortIcon('action') }}</mat-icon>
                    </div>
                  </th>
                  <th class="user-col {{ getSortClass('username') }}" (click)="sortByColumn('username')">
                    <div class="th-content">
                      <span>User</span>
                      <mat-icon class="sort-icon">{{ getSortIcon('username') }}</mat-icon>
                    </div>
                  </th>
                  <th class="timestamp-col {{ getSortClass('timestamp') }}" (click)="sortByColumn('timestamp')">
                    <div class="th-content">
                      <span>Timestamp</span>
                      <mat-icon class="sort-icon">{{ getSortIcon('timestamp') }}</mat-icon>
                    </div>
                  </th>
                  <th class="category-col {{ getSortClass('category') }}" (click)="sortByColumn('category')">
                    <div class="th-content">
                      <span>Category</span>
                      <mat-icon class="sort-icon">{{ getSortIcon('category') }}</mat-icon>
                    </div>
                  </th>
                  <th class="relative-time-col">Time Ago</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of filteredLogs(); trackBy: trackByLogId" 
                    class="log-row">
                  
                  <td class="id-col">
                    <span class="log-id">#{{ log.id }}</span>
                  </td>
                  
                  <td class="action-col">
                    <div class="action-info">
                      <div class="action-icon-small">
                        <mat-icon>{{ getActionIcon(log.action) }}</mat-icon>
                      </div>
                      <div class="action-text">{{ log.action }}</div>
                    </div>
                  </td>
                  
                  <td class="user-col">
                    <div class="user-info">
                      <mat-icon class="user-icon">person</mat-icon>
                      <span class="username">{{ log.username }}</span>
                    </div>
                  </td>
                  
                  <td class="timestamp-col">
                    <div class="timestamp-info">
                      <div class="date-time">{{ formatDateTime(log.timestamp) }}</div>
                      <div class="time-only">{{ formatTimeOnly(log.timestamp) }}</div>
                    </div>
                  </td>
                  
                  <td class="category-col">
                    <span class="category-badge" [ngClass]="getActionClass(log.action)">
                      {{ getActionCategory(log.action) }}
                    </span>
                  </td>
                  
                  <td class="relative-time-col">
                    <span class="time-ago">{{ formatTimeAgo(log.timestamp) }}</span>
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
      <div class="empty-state" *ngIf="!isLoading() && !errorMessage() && filteredLogs().length === 0">
        <div class="empty-content">
          <mat-icon class="empty-icon">history</mat-icon>
          <h3>{{ getEmptyStateTitle() }}</h3>
          <p>{{ getEmptyStateMessage() }}</p>
          <button class="btn btn-primary" (click)="refreshLogs()" *ngIf="!hasActiveFilters()">
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
  styleUrls: ['./log-viewer.component.scss']
})
export class LogViewerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ===== SIGNAL-BASED STATE MANAGEMENT =====
  // Inject services
  private logService = inject(LogService);

  // Core data signals
  private logsData = signal<LogActivity[]>([]);
  private totalCount = signal<number>(0);
  
  // UI state signals
  private loadingState = signal<boolean>(false);
  private exportingState = signal<boolean>(false);
  private successMsg = signal<string>('');
  private errorMsg = signal<string>('');
  private viewModeState = signal<'card' | 'table'>('card');
  
  // Filter and pagination signals
  private filtersData = signal<LogFilters>({
    search: '',
    fromDate: '',
    toDate: '',
    action: ''
  });
  
  private currentPageNum = signal<number>(1);
  private pageSizeNum = signal<number>(20);
  private lastUpdated = signal<Date>(new Date());

  // Search debouncing
  private searchSubject = new BehaviorSubject<string>('');
  private filterSubject = new BehaviorSubject<LogFilters>({
    search: '',
    fromDate: '',
    toDate: '',
    action: ''
  });

  // Sorting state
  private sortConfig = signal<SortConfig>({
    column: 'timestamp',
    direction: 'desc'
  });

  // Page size options
  readonly pageSizeOptions = signal<PageSizeOption[]>([
    { value: 10, label: '10 per page' },
    { value: 20, label: '20 per page' },
    { value: 50, label: '50 per page' },
    { value: 100, label: '100 per page' }
  ]);

  // ===== COMPUTED PROPERTIES =====
  readonly isLoading = computed(() => this.loadingState());
  readonly isExporting = computed(() => this.exportingState());
  readonly successMessage = computed(() => this.successMsg());
  readonly errorMessage = computed(() => this.errorMsg());
  readonly filters = computed(() => this.filtersData());
  readonly currentPage = computed(() => this.currentPageNum());
  readonly pageSize = computed(() => this.pageSizeNum());
  readonly viewMode = computed(() => this.viewModeState());
  
  // Enhanced filtering with search and sorting
  readonly filteredLogs = computed(() => {
    let logs = this.logsData();
    const searchTerm = this.filters().search.trim();
    const sort = this.sortConfig();
    
    // Apply search filter
    if (searchTerm) {
      logs = this.performLocalSearch(logs, searchTerm);
    }
    
    // Apply sorting
    if (sort.direction) {
      logs = this.sortLogs(logs, sort.column as SortableColumn, sort.direction);
    }
    
    return logs;
  });

  private performLocalSearch(logs: LogActivity[], searchTerm: string): LogActivity[] {
    const search = searchTerm.toLowerCase();
    console.log('🔍 Local search for:', search, 'in', logs.length, 'logs');
    
    const filtered = logs.filter(log => {
      // Search in ID (convert to string)
      const idMatch = log.id.toString().includes(search);
      
      // Search in username
      const usernameMatch = log.username.toLowerCase().includes(search);
      
      // Search in action
      const actionMatch = log.action.toLowerCase().includes(search);
      
      // Search in category (derived from action)
      const category = this.getActionCategory(log.action).toLowerCase();
      const categoryMatch = category.includes(search);
      
      // Search in formatted timestamp
      const formattedTime = this.formatDateTime(log.timestamp).toLowerCase();
      const timestampMatch = formattedTime.includes(search);
      
      // Search in relative time (e.g., "2h ago", "just now")
      const relativeTime = this.formatTimeAgo(log.timestamp).toLowerCase();
      const relativeTimeMatch = relativeTime.includes(search);
      
      // Search in optional fields if available
      const detailsMatch = log.details ? log.details.toLowerCase().includes(search) : false;
      const ipMatch = log.ipAddress ? log.ipAddress.includes(search) : false;
      const userAgentMatch = log.userAgent ? log.userAgent.toLowerCase().includes(search) : false;
      
      // Debug logging for first few logs
      if (logs.indexOf(log) < 3) {
        console.log(`Log ${log.id}:`, {
          id: log.id.toString(),
          username: log.username,
          action: log.action,
          category,
          formattedTime,
          relativeTime,
          matches: { idMatch, usernameMatch, actionMatch, categoryMatch, timestampMatch, relativeTimeMatch }
        });
      }
      
      // Return true if any field matches
      return idMatch || usernameMatch || actionMatch || categoryMatch || 
             timestampMatch || relativeTimeMatch || detailsMatch || 
             ipMatch || userAgentMatch;
    });
    
    console.log('✅ Local search results:', filtered.length, 'of', logs.length);
    return filtered;
  }

  private sortLogs(logs: LogActivity[], column: SortableColumn, direction: 'asc' | 'desc'): LogActivity[] {
    return [...logs].sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      switch (column) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'username':
          valueA = a.username.toLowerCase();
          valueB = b.username.toLowerCase();
          break;
        case 'action':
          valueA = a.action.toLowerCase();
          valueB = b.action.toLowerCase();
          break;
        case 'timestamp':
          valueA = new Date(a.timestamp).getTime();
          valueB = new Date(b.timestamp).getTime();
          break;
        case 'category':
          valueA = this.getActionCategory(a.action).toLowerCase();
          valueB = this.getActionCategory(b.action).toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (valueA < valueB) {
        return direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  readonly logStats = computed((): LogStats => {
    const logs = this.logsData();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const stats: LogStats = {
      total: logs.length,
      todayCount: logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= today;
      }).length,
      thisWeekCount: logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= thisWeekStart;
      }).length,
      loginCount: logs.filter(log => 
        log.action.toLowerCase().includes('login')
      ).length,
      errorCount: logs.filter(log => 
        log.action.toLowerCase().includes('error') || 
        log.action.toLowerCase().includes('failed')
      ).length
    };
    
    return stats;
  });

  readonly totalPages = computed(() => {
    const size = this.pageSize();
    return Math.ceil(this.totalCount() / size);
  });

  // ===== REAL-TIME AUTO REFRESH =====
  constructor() {
    // Initialize view mode based on screen size
    this.initializeViewMode();
    
    // Setup real-time updates with signals
    this.setupRealTimeUpdates();
    
    // Setup debounced search and filtering
    this.setupFilterDebouncing();
  }

  private initializeViewMode(): void {
    // Check if running in browser
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('log-viewer-view-mode') as 'card' | 'table';
      if (savedMode) {
        this.viewModeState.set(savedMode);
      } else {
        // Default to table view for desktop, card for mobile
        const isDesktop = window.innerWidth >= 1024;
        this.viewModeState.set(isDesktop ? 'table' : 'card');
      }
    }
  }

  private setupRealTimeUpdates(): void {
    // Auto-refresh every 2 minutes for activity logs
    timer(120000, 120000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('🔄 Auto-refresh triggered');
      this.loadLogs();
    });
  }

  private setupFilterDebouncing(): void {
    // Debounced filter changes with 500ms delay
    this.filterSubject.pipe(
      debounceTime(500),
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      ),
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      console.log('🔍 Debounced filter change:', filters);
      this.loadLogsWithFilters(filters);
    });
  }

  ngOnInit(): void {
    console.log('📋 Activity Log Component initialized with Signals');
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== DATA LOADING METHODS WITH SIGNALS =====
  private async loadLogs(): Promise<void> {
    const filters = this.filters();
    return this.loadLogsWithFilters(filters);
  }

  private async loadLogsWithFilters(filters: LogFilters): Promise<void> {
    this.loadingState.set(true);
    this.clearMessages();

    try {
      const page = this.currentPage();
      const pageSize = this.pageSize();

      console.log('🔄 Loading logs with filters:', { page, pageSize, filters });

      const response = await this.logService.getLogs(
        page, 
        pageSize, 
        filters.search,
        filters.fromDate,
        filters.toDate,
        filters.action
      ).toPromise();

      if (response) {
        this.logsData.set(response.logs);
        this.totalCount.set(response.total);
        this.lastUpdated.set(new Date());
        console.log('✅ Logs loaded successfully:', response.logs.length, 'of', response.total);
        console.log('📊 Sample log data:', response.logs.slice(0, 2));
      }
    } catch (error: any) {
      console.error('Error loading logs:', error);
      this.showError('Failed to load activity logs. Please try again.');
    } finally {
      this.loadingState.set(false);
    }
  }

  refreshLogs(): void {
    console.log('🔄 Manual logs refresh triggered');
    this.loadLogs();
  }

  // ===== FILTER METHODS WITH DEBOUNCING =====
  updateSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const currentFilters = this.filters();
    const newFilters = {
      ...currentFilters,
      search: target.value
    };
    
    // Update local state immediately for UI responsiveness
    this.filtersData.set(newFilters);
    this.currentPageNum.set(1);
    
    // Trigger debounced API call
    this.filterSubject.next(newFilters);
  }

  updateFromDate(event: Event): void {
    const target = event.target as HTMLInputElement;
    const currentFilters = this.filters();
    const newFilters = {
      ...currentFilters,
      fromDate: target.value
    };
    
    // Update local state immediately
    this.filtersData.set(newFilters);
    this.currentPageNum.set(1);
    
    // Trigger debounced API call
    this.filterSubject.next(newFilters);
  }

  updateToDate(event: Event): void {
    const target = event.target as HTMLInputElement;
    const currentFilters = this.filters();
    const newFilters = {
      ...currentFilters,
      toDate: target.value
    };
    
    // Update local state immediately
    this.filtersData.set(newFilters);
    this.currentPageNum.set(1);
    
    // Trigger debounced API call
    this.filterSubject.next(newFilters);
  }

  updateActionFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const currentFilters = this.filters();
    const newFilters = {
      ...currentFilters,
      action: target.value
    };
    
    // Update local state immediately
    this.filtersData.set(newFilters);
    this.currentPageNum.set(1);
    
    // Trigger immediate API call for select changes (no debounce needed)
    this.loadLogsWithFilters(newFilters);
  }

  updatePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSizeNum.set(parseInt(target.value));
    this.currentPageNum.set(1);
    
    // Immediate load for page size changes
    this.loadLogs();
  }

  clearSearch(): void {
    const currentFilters = this.filters();
    const newFilters = {
      ...currentFilters,
      search: ''
    };
    
    this.filtersData.set(newFilters);
    this.currentPageNum.set(1);
    
    // Immediate API call for clear actions
    this.loadLogsWithFilters(newFilters);
  }

  clearFromDate(): void {
    const currentFilters = this.filters();
    const newFilters = {
      ...currentFilters,
      fromDate: ''
    };
    
    this.filtersData.set(newFilters);
    this.currentPageNum.set(1);
    
    // Immediate API call for clear actions
    this.loadLogsWithFilters(newFilters);
  }

  clearToDate(): void {
    const currentFilters = this.filters();
    const newFilters = {
      ...currentFilters,
      toDate: ''
    };
    
    this.filtersData.set(newFilters);
    this.currentPageNum.set(1);
    
    // Immediate API call for clear actions
    this.loadLogsWithFilters(newFilters);
  }

  clearAllFilters(): void {
    const newFilters: LogFilters = {
      search: '',
      fromDate: '',
      toDate: '',
      action: ''
    };
    
    this.filtersData.set(newFilters);
    this.currentPageNum.set(1);
    
    // Immediate API call for clear all
    this.loadLogsWithFilters(newFilters);
  }

  // ===== VIEW MODE METHODS =====
  setViewMode(mode: 'card' | 'table'): void {
    this.viewModeState.set(mode);
    localStorage.setItem('log-viewer-view-mode', mode);
  }

  // ===== SORTING METHODS =====
  sortByColumn(column: SortableColumn): void {
    const currentSort = this.sortConfig();
    let newDirection: 'asc' | 'desc' | null;
    
    if (currentSort.column === column) {
      // Cycle through: asc -> desc -> null -> asc
      switch (currentSort.direction) {
        case 'asc':
          newDirection = 'desc';
          break;
        case 'desc':
          newDirection = null;
          break;
        case null:
          newDirection = 'asc';
          break;
        default:
          newDirection = 'asc';
      }
    } else {
      // New column, start with asc
      newDirection = 'asc';
    }
    
    this.sortConfig.set({
      column: column,
      direction: newDirection
    });
    
    console.log('📊 Sort changed:', { column, direction: newDirection });
  }

  getSortIcon(column: SortableColumn): string {
    const currentSort = this.sortConfig();
    if (currentSort.column !== column) {
      return 'unfold_more'; // Default sort icon
    }
    
    switch (currentSort.direction) {
      case 'asc':
        return 'keyboard_arrow_up';
      case 'desc':
        return 'keyboard_arrow_down';
      case null:
      default:
        return 'unfold_more';
    }
  }

  getSortClass(column: SortableColumn): string {
    const currentSort = this.sortConfig();
    if (currentSort.column !== column) {
      return 'sortable';
    }
    
    switch (currentSort.direction) {
      case 'asc':
        return 'sortable sorted-asc';
      case 'desc':
        return 'sortable sorted-desc';
      case null:
      default:
        return 'sortable';
    }
  }

  // ===== PAGINATION METHODS =====
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPageNum.set(page);
      // Immediate load for pagination changes
      this.loadLogs();
    }
  }

  // ===== EXPORT METHODS =====
  async exportLogs(): Promise<void> {
    if (this.isExporting()) return;
    
    this.exportingState.set(true);
    this.clearMessages();
    
    try {
      const filters = this.filters();
      const blob = await this.logService.exportLogsToXlsx(
        filters.search,
        filters.fromDate,
        filters.toDate
      ).toPromise();
      
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Export completed successfully!');
        console.log('✅ Logs exported successfully');
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      this.showError('Failed to export logs. Please try again.');
    } finally {
      this.exportingState.set(false);
    }
  }

  // ===== MESSAGE HANDLING =====
  private showSuccess(message: string): void {
    this.successMsg.set(message);
    this.errorMsg.set('');
    setTimeout(() => this.successMsg.set(''), 5000);
  }

  private showError(message: string): void {
    this.errorMsg.set(message);
    this.successMsg.set('');
    setTimeout(() => this.errorMsg.set(''), 5000);
  }

  clearMessages(): void {
    this.successMsg.set('');
    this.errorMsg.set('');
  }

  // ===== UTILITY METHODS FOR TEMPLATE =====
  trackByLogId(index: number, log: LogActivity): number {
    return log.id;
  }

  formatNumber(num: number): string {
    return num.toLocaleString('id-ID');
  }

  getActionIcon(action: string): string {
    const actionType = action.toLowerCase();
    
    if (actionType.includes('login')) return 'login';
    if (actionType.includes('logout')) return 'logout';
    if (actionType.includes('created') || actionType.includes('added')) return 'add_circle';
    if (actionType.includes('deleted') || actionType.includes('removed')) return 'remove_circle';
    if (actionType.includes('updated') || actionType.includes('modified')) return 'edit';
    return 'event_note';
  }

  getActionClass(action: string): string {
    const actionType = action.toLowerCase();
    
    if (actionType.includes('login')) return 'action-login';
    if (actionType.includes('logout')) return 'action-logout';
    if (actionType.includes('created') || actionType.includes('added')) return 'action-create';
    if (actionType.includes('deleted') || actionType.includes('removed')) return 'action-delete';
    if (actionType.includes('updated') || actionType.includes('modified')) return 'action-update';
    
    return 'action-default';
  }

  getActionCategory(action: string): string {
    const actionType = action.toLowerCase();
    
    if (actionType.includes('login')) return 'Authentication';
    if (actionType.includes('logout')) return 'Authentication';
    if (actionType.includes('created') || actionType.includes('added')) return 'Create';
    if (actionType.includes('deleted') || actionType.includes('removed')) return 'Delete';
    if (actionType.includes('updated') || actionType.includes('modified')) return 'Update';
    
    return 'System';
  }

  formatDateTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('id-ID') + ' ' + date.toLocaleTimeString('id-ID');
    } catch {
      return timestamp;
    }
  }

  formatTimeOnly(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  }

  formatTimeAgo(timestamp: string): string {
    try {
      const now = new Date();
      const date = new Date(timestamp);
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      
      const diffInDays = Math.floor(diffInSeconds / 86400);
      if (diffInDays < 30) return `${diffInDays}d ago`;
      
      const diffInMonths = Math.floor(diffInDays / 30);
      return `${diffInMonths}mo ago`;
    } catch {
      return '';
    }
  }

  getDisplayInfo(): string {
    const total = this.totalCount();
    const filtered = this.filteredLogs().length;
    const page = this.currentPage();
    const pageSize = this.pageSize();
    
    // If search is active and we have local filtering
    if (this.filters().search && filtered !== total) {
      return `Showing ${filtered} filtered results of ${total} total logs`;
    }

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `Showing ${start}-${end} of ${total} logs`;
  }

  getSearchResultsInfo(): string {
    const searchTerm = this.filters().search;
    const filtered = this.filteredLogs().length;
    const total = this.logsData().length;
    
    if (!searchTerm) return '';
    
    if (filtered === 0) {
      return `No results found for "${searchTerm}"`;
    }
    
    if (filtered === total) {
      return `All ${total} logs match "${searchTerm}"`;
    }
    
    return `${filtered} of ${total} logs match "${searchTerm}"`;
  }

  hasActiveFilters(): boolean {
    const filters = this.filters();
    return !!(filters.search || filters.fromDate || filters.toDate || filters.action);
  }

  getEmptyStateTitle(): string {
    return this.hasActiveFilters() ? 'No logs match your filters' : 'No activity logs found';
  }

  getEmptyStateMessage(): string {
    return this.hasActiveFilters() 
      ? 'Try adjusting your search or filter criteria.'
      : 'No activity has been recorded yet.';
  }

  // Enhanced search highlighting
  highlightSearchTerm(text: string, searchTerm: string): string {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // Safe HTML for highlighting (for use in templates with [innerHTML])
  getHighlightedText(text: string): string {
    const searchTerm = this.filters().search;
    if (!searchTerm) return text;
    
    return this.highlightSearchTerm(text, searchTerm);
  }
}