import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MultiBranchCoordinationService } from '../../../core/services/multi-branch-coordination.service';
import { StateService } from '../../../core/services/state.service';
import { Branch } from '../../../core/models/branch.models';
import { Subscription, debounceTime, distinctUntilChanged, Subject } from 'rxjs';

// Extended Branch interface with additional management fields
export interface ManagedBranch extends Branch {
  branchId: number; // Ensure this property is always present
  region: string; // Ensure this property is always present
  lastActivity: string;
  totalUsers: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  performanceRating: number;
  complianceStatus: 'compliant' | 'warning' | 'violation';
  systemVersion: string;
  backupStatus: 'current' | 'outdated' | 'failed';
  maintenanceWindow: string;
}

export interface BranchFilters {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'pending' | 'suspended';
  region: string;
  performanceRating: 'all' | 'excellent' | 'good' | 'fair' | 'poor';
  complianceStatus: 'all' | 'compliant' | 'warning' | 'violation';
}

export interface BranchStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  suspended: number;
  totalRevenue: number;
  averagePerformance: number;
}

@Component({
  selector: 'app-branch-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './branch-list.component.html',
  styleUrls: ['./branch-list.component.scss']
})
export class BranchListComponent implements OnInit, OnDestroy {
  // Expose Math to template
  Math = Math;

  // Service dependencies
  availableBranches = computed(() => this.stateService.availableBranches());
  currentUser = computed(() => this.stateService.user());
  
  // Component state signals
  private readonly _isLoading = signal<boolean>(false);
  private readonly _branches = signal<ManagedBranch[]>([]);
  private readonly _selectedBranches = signal<number[]>([]);
  private readonly _filters = signal<BranchFilters>({
    search: '',
    status: 'all',
    region: '',
    performanceRating: 'all',
    complianceStatus: 'all'
  });
  private readonly _sortBy = signal<string>('branchName');
  private readonly _sortDirection = signal<'asc' | 'desc'>('asc');
  private readonly _currentPage = signal<number>(1);
  private readonly _pageSize = signal<number>(10);
  private readonly _viewMode = signal<'grid' | 'table'>('table');

  // Component state getters
  isLoading = this._isLoading.asReadonly();
  branches = this._branches.asReadonly();
  selectedBranches = this._selectedBranches.asReadonly();
  filters = this._filters.asReadonly();
  sortBy = this._sortBy.asReadonly();
  sortDirection = this._sortDirection.asReadonly();
  currentPage = this._currentPage.asReadonly();
  pageSize = this._pageSize.asReadonly();
  viewMode = this._viewMode.asReadonly();

  // Search functionality
  private searchSubject = new Subject<string>();

  // Computed properties
  filteredBranches = computed(() => {
    const branches = this._branches();
    const filters = this._filters();
    
    return branches.filter(branch => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!branch.branchName.toLowerCase().includes(searchLower) &&
            !branch.address.toLowerCase().includes(searchLower) &&
            !(branch.managerName?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      // Status filter
      if (filters.status !== 'all') {
        const branchStatus = this.getBranchStatus(branch);
        if (branchStatus !== filters.status) return false;
      }
      
      // Region filter
      if (filters.region && branch.region !== filters.region) {
        return false;
      }
      
      // Performance rating filter
      if (filters.performanceRating !== 'all') {
        const rating = this.getPerformanceCategory(branch.performanceRating);
        if (rating !== filters.performanceRating) return false;
      }
      
      // Compliance status filter
      if (filters.complianceStatus !== 'all') {
        if (branch.complianceStatus !== filters.complianceStatus) return false;
      }
      
      return true;
    });
  });

  sortedBranches = computed(() => {
    const branches = this.filteredBranches();
    const sortBy = this._sortBy();
    const direction = this._sortDirection();
    
    return [...branches].sort((a, b) => {
      let aValue: any = a[sortBy as keyof ManagedBranch];
      let bValue: any = b[sortBy as keyof ManagedBranch];
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  });

  paginatedBranches = computed(() => {
    const branches = this.sortedBranches();
    const page = this._currentPage();
    const size = this._pageSize();
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    
    return branches.slice(startIndex, endIndex);
  });

  branchStats = computed(() => {
    const branches = this._branches();
    
    const stats: BranchStats = {
      total: branches.length,
      active: 0,
      inactive: 0,
      pending: 0,
      suspended: 0,
      totalRevenue: 0,
      averagePerformance: 0
    };
    
    branches.forEach(branch => {
      const status = this.getBranchStatus(branch);
      switch (status) {
        case 'active': stats.active++; break;
        case 'inactive': stats.inactive++; break;
        case 'pending': stats.pending++; break;
        case 'suspended': stats.suspended++; break;
      }
      
      stats.totalRevenue += branch.monthlyRevenue;
      stats.averagePerformance += branch.performanceRating;
    });
    
    if (branches.length > 0) {
      stats.averagePerformance = stats.averagePerformance / branches.length;
    }
    
    return stats;
  });

  totalPages = computed(() => {
    const totalItems = this.filteredBranches().length;
    return Math.ceil(totalItems / this._pageSize());
  });

  availableRegions = computed(() => {
    const regions = new Set<string>();
    this._branches().forEach(branch => {
      if (branch.region) regions.add(branch.region);
    });
    return Array.from(regions).sort();
  });

  private subscriptions = new Subscription();

  constructor(
    private coordinationService: MultiBranchCoordinationService,
    private stateService: StateService,
    public router: Router
  ) {
    // Search debounce effect
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(search => {
        this.updateFilters({ search });
        this._currentPage.set(1);
      })
    );
  }

  ngOnInit() {
    this.loadBranches();
    this.setupAutoRefresh();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // Data loading methods
  private async loadBranches() {
    this._isLoading.set(true);
    
    try {
      // Simulate loading managed branches data
      setTimeout(() => {
        const baseBranches = this.availableBranches();
        const managedBranches: ManagedBranch[] = baseBranches.map((branch, index) => ({
          ...branch,
          branchId: branch.branchId || branch.id, // Ensure branchId is set
          region: branch.region || branch.province || 'Unknown Region', // Fallback for region
          lastActivity: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
          totalUsers: Math.floor(Math.random() * 50) + 10,
          dailyRevenue: Math.floor(Math.random() * 50000000) + 10000000,
          monthlyRevenue: Math.floor(Math.random() * 1000000000) + 200000000,
          performanceRating: Math.floor(Math.random() * 40) + 60,
          complianceStatus: ['compliant', 'warning', 'violation'][Math.floor(Math.random() * 3)] as any,
          systemVersion: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
          backupStatus: ['current', 'outdated', 'failed'][Math.floor(Math.random() * 3)] as any,
          maintenanceWindow: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:00-${String((Math.floor(Math.random() * 24) + 1) % 24).padStart(2, '0')}:00`
        }));
        
        this._branches.set(managedBranches);
        this._isLoading.set(false);
      }, 800);
    } catch (error) {
      console.error('Failed to load branches:', error);
      this._isLoading.set(false);
    }
  }

  private setupAutoRefresh() {
    // Auto-refresh every 5 minutes
    setInterval(() => {
      this.loadBranches();
    }, 300000);
  }

  // Filter and search methods
  onSearchInput(event: any) {
    this.searchSubject.next(event.target.value);
  }

  updateFilters(partialFilters: Partial<BranchFilters>) {
    const currentFilters = this._filters();
    this._filters.set({ ...currentFilters, ...partialFilters });
  }

  clearFilters() {
    this._filters.set({
      search: '',
      status: 'all',
      region: '',
      performanceRating: 'all',
      complianceStatus: 'all'
    });
    this._currentPage.set(1);
  }

  // Sorting methods
  setSortBy(field: string) {
    const currentSort = this._sortBy();
    const currentDirection = this._sortDirection();
    
    if (currentSort === field) {
      this._sortDirection.set(currentDirection === 'asc' ? 'desc' : 'asc');
    } else {
      this._sortBy.set(field);
      this._sortDirection.set('asc');
    }
  }

  // Pagination methods
  setPage(page: number) {
    const totalPages = this.totalPages();
    if (page >= 1 && page <= totalPages) {
      this._currentPage.set(page);
    }
  }

  setPageSize(size: number) {
    this._pageSize.set(size);
    this._currentPage.set(1);
  }

  // Selection methods
  toggleBranchSelection(branchId: number) {
    const selected = this._selectedBranches();
    if (selected.includes(branchId)) {
      this._selectedBranches.set(selected.filter(id => id !== branchId));
    } else {
      this._selectedBranches.set([...selected, branchId]);
    }
  }

  selectAllVisible() {
    const visibleIds = this.paginatedBranches().map(b => b.branchId);
    this._selectedBranches.set(visibleIds);
  }

  clearSelection() {
    this._selectedBranches.set([]);
  }

  onSelectAllChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target?.checked) {
      this.selectAllVisible();
    } else {
      this.clearSelection();
    }
  }

  // View methods
  setViewMode(mode: 'grid' | 'table') {
    this._viewMode.set(mode);
  }

  // Action methods
  createNewBranch() {
    this.router.navigate(['/branches/create']);
  }

  editBranch(branchId: number) {
    this.router.navigate(['/branches/edit', branchId]);
  }

  viewBranchDetails(branchId: number) {
    this.router.navigate(['/branches/view', branchId]);
  }

  async deactivateBranch(branchId: number) {
    const confirmed = confirm('Are you sure you want to deactivate this branch?');
    if (!confirmed) return;

    try {
      // Simulate API call
      alert(`Branch ${branchId} has been deactivated.`);
      this.loadBranches();
    } catch (error) {
      console.error('Failed to deactivate branch:', error);
      alert('Failed to deactivate branch. Please try again.');
    }
  }

  async deleteBranch(branchId: number) {
    const confirmed = confirm('Are you sure you want to delete this branch? This action cannot be undone.');
    if (!confirmed) return;

    try {
      // Simulate API call
      alert(`Branch ${branchId} has been deleted.`);
      this.loadBranches();
    } catch (error) {
      console.error('Failed to delete branch:', error);
      alert('Failed to delete branch. Please try again.');
    }
  }

  async bulkAction(action: string) {
    const selectedIds = this._selectedBranches();
    if (selectedIds.length === 0) {
      alert('Please select branches first.');
      return;
    }

    const confirmed = confirm(`Are you sure you want to ${action} ${selectedIds.length} branch(es)?`);
    if (!confirmed) return;

    try {
      // Simulate API call
      alert(`${action} applied to ${selectedIds.length} branch(es).`);
      this.clearSelection();
      this.loadBranches();
    } catch (error) {
      console.error(`Failed to ${action} branches:`, error);
      alert(`Failed to ${action} branches. Please try again.`);
    }
  }

  exportBranches() {
    const branches = this.filteredBranches();
    const csvContent = this.generateCSV(branches);
    this.downloadCSV(csvContent, 'branches-export.csv');
  }

  // Utility methods
  getBranchStatus(branch: ManagedBranch): string {
    if (!branch.isActive) return 'inactive';
    if (branch.coordinationStatus === 'offline') return 'suspended';
    if (branch.coordinationStatus === 'pending') return 'pending';
    return 'active';
  }

  getStatusClass(branch: ManagedBranch): string {
    const status = this.getBranchStatus(branch);
    return `status-${status}`;
  }

  getPerformanceCategory(rating: number): string {
    if (rating >= 90) return 'excellent';
    if (rating >= 75) return 'good';
    if (rating >= 60) return 'fair';
    return 'poor';
  }

  getPerformanceClass(rating: number): string {
    return `performance-${this.getPerformanceCategory(rating)}`;
  }

  getComplianceClass(status: string): string {
    return `compliance-${status}`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID');
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  }

  private generateCSV(branches: ManagedBranch[]): string {
    const headers = [
      'ID', 'Name', 'Manager', 'Region', 'Address', 'Status', 
      'Performance Rating', 'Compliance Status', 'Monthly Revenue', 'Total Users'
    ];
    
    const rows = branches.map(branch => [
      branch.branchId,
      branch.branchName,
      branch.managerName,
      branch.region,
      branch.address,
      this.getBranchStatus(branch),
      branch.performanceRating,
      branch.complianceStatus,
      branch.monthlyRevenue,
      branch.totalUsers
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  private downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  trackByBranchId(index: number, branch: ManagedBranch): number {
    return branch.branchId;
  }

  // ✅ NEW: Additional methods for template
  refreshBranches(): void {
    this.loadBranches();
  }

  getBranchRegions(): number {
    return this.availableRegions().length;
  }
}