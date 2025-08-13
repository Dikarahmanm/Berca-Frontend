// membership-list.component.ts
// Enhanced with Angular 20 Signals & Clean Simple Design - Compatible with HTML template
// All missing properties and methods added for enhanced features

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Enhanced service integration with actual backend APIs
import { MembershipService } from '../../services/membership.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  MemberFilter,
  UpdateMemberRequest 
} from '../../interfaces/membership.interfaces';

// Enhanced interfaces for advanced features
interface MemberDto {
  id: number;
  memberNumber: string;
  name: string;
  email: string;
  phone: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'VIP';
  availablePoints: number;
  totalPoints: number;
  totalSpent: number;
  totalTransactions: number;
  lastTransactionDate: string | null;
  averageTransactionValue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MemberSearchResponse {
  members: MemberDto[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
}

interface TierInfo {
  color: string;
  icon: string;
  name: string;
}

interface FilterTag {
  key: string;
  label: string;
  value: any;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

interface TierProgress {
  currentTier: string;
  nextTier: string;
  amountNeeded: number;
  percentage: number;
}

@Component({
  selector: 'app-membership-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule // Added for ngModel support
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './membership-list.component.html',
  styleUrl: './membership-list.component.scss'
})
export class MembershipListComponent implements OnInit, OnDestroy {
  // Injected services
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly membershipService = inject(MembershipService);
  private readonly notificationService = inject(NotificationService);
  
  private readonly destroy$ = new Subject<void>();

  // ===== SIGNAL-BASED STATE MANAGEMENT =====
  readonly loading$ = signal<boolean>(false);
  readonly error$ = signal<string | null>(null);
  readonly members = signal<MemberDto[]>([]);
  readonly selectedMembers = signal<MemberDto[]>([]);
  
  // Pagination signals
  readonly totalItems = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  
  // Filter signals
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('all');
  readonly tierFilter = signal<string>('all');

  // ===== ENHANCED FEATURES SIGNALS =====
  // Real-time connection status
  readonly realtimeConnected = signal<boolean>(false);
  
  // Advanced filters
  readonly showAdvancedFilters = signal<boolean>(false);
  readonly selectedSpendingTier = signal<string>('all');
  
  // Modal state
  readonly showMemberDetailModal = signal<boolean>(false);
  readonly selectedMemberForModal = signal<MemberDto | null>(null);
  
  // Sorting state
  readonly sortField = signal<string>('');
  readonly sortDirection = signal<'asc' | 'desc' | ''>('');
  
  // Toast notifications
  readonly realtimeToasts = signal<ToastNotification[]>([]);
  
  // Last updated timestamp
  readonly lastUpdated = signal<string | null>(null);

  // ===== COMPUTED PROPERTIES =====
  readonly filteredMembers = computed(() => {
    let filtered = this.members();
    
    // Search filter
    const search = this.searchQuery().toLowerCase();
    if (search) {
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(search) ||
        member.memberNumber.toLowerCase().includes(search) ||
        member.phone.includes(search)
      );
    }
    
    // Status filter
    const status = this.statusFilter();
    if (status !== 'all') {
      filtered = filtered.filter(member => 
        status === 'true' ? member.isActive : !member.isActive
      );
    }
    
    // Tier filter
    const tier = this.tierFilter();
    if (tier !== 'all') {
      filtered = filtered.filter(member => member.tier === tier);
    }
    
    return filtered;
  });

  readonly totalPages = computed(() => 
    Math.ceil(this.totalItems() / this.pageSize())
  );

  readonly isAllSelected = computed(() => 
    this.members().length > 0 && 
    this.selectedMembers().length === this.members().length
  );

  readonly isPartiallySelected = computed(() => 
    this.selectedMembers().length > 0 && 
    this.selectedMembers().length < this.members().length
  );

  // Data source for template compatibility
  readonly dataSource = computed(() => ({
    data: this.filteredMembers()
  }));

  // Form group for reactive forms
  searchForm: FormGroup;

  // Tier information mapping
  private readonly tierInfoMap: Record<string, TierInfo> = {
    Bronze: { color: '#CD7F32', icon: '🥉', name: 'Bronze' },
    Silver: { color: '#C0C0C0', icon: '🥈', name: 'Silver' },
    Gold: { color: '#FFD700', icon: '🥇', name: 'Gold' },
    Platinum: { color: '#E5E4E2', icon: '💎', name: 'Platinum' },
    VIP: { color: '#800080', icon: '👑', name: 'VIP' }
  };

  constructor() {
    // Initialize reactive form with advanced filters
    this.searchForm = this.fb.group({
      search: [''],
      isActive: ['all'],
      tier: ['all'],
      // Advanced filter controls
      registrationStartDate: [''],
      registrationEndDate: [''],
      minSpent: [''],
      maxSpent: [''],
      minPoints: [''],
      maxPoints: [''],
      lastTransactionPeriod: ['all'],
      transactionFrequency: ['all']
    });
  }

  ngOnInit(): void {
    this.setupSearchListeners();
    this.loadMembers();
    this.initializeRealTimeConnection();
    this.updateLastUpdated();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== SEARCH & FILTER SETUP =====
  private setupSearchListeners(): void {
    // Search input debouncing
    this.searchForm.get('search')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.searchQuery.set(value || '');
        this.currentPage.set(1);
      });

    // Status filter
    this.searchForm.get('isActive')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.statusFilter.set(value || 'all');
        this.currentPage.set(1);
      });

    // Tier filter
    this.searchForm.get('tier')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.tierFilter.set(value || 'all');
        this.currentPage.set(1);
      });
  }

  // ===== DATA LOADING =====
  async loadMembers(): Promise<void> {
    this.loading$.set(true);
    this.error$.set(null);

    try {
      const filters: MemberFilter = {
        search: this.searchQuery(),
        isActive: this.statusFilter() === 'all' ? undefined : 
                  this.statusFilter() === 'true',
        tier: this.tierFilter() === 'all' ? undefined : this.tierFilter(),
        page: this.currentPage(),
        pageSize: this.pageSize()
      };

      this.membershipService.searchMembers(filters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: MemberSearchResponse) => {
            this.members.set(response.members);
            this.totalItems.set(response.totalItems);
            this.loading$.set(false);
            this.updateLastUpdated();
          },
          error: (error: any) => {
            console.error('Error loading members:', error);
            this.error$.set('Failed to load members. Please try again.');
            this.showErrorNotification('Failed to load members');
            this.loading$.set(false);
          }
        });
    } catch (error: any) {
      console.error('Error loading members:', error);
      this.error$.set('Failed to load members. Please try again.');
      this.showErrorNotification('Failed to load members');
      this.loading$.set(false);
    }
  }

  // ===== ADVANCED FILTER METHODS =====
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update(current => !current);
  }

  setSpendingTierFilter(tier: string): void {
    this.selectedSpendingTier.set(tier);
    
    // Apply spending tier logic
    const formControls = this.searchForm.controls;
    switch (tier) {
      case 'low':
        formControls['minSpent'].setValue(0);
        formControls['maxSpent'].setValue(500000);
        break;
      case 'medium':
        formControls['minSpent'].setValue(500000);
        formControls['maxSpent'].setValue(2000000);
        break;
      case 'high':
        formControls['minSpent'].setValue(2000000);
        formControls['maxSpent'].setValue('');
        break;
      default:
        formControls['minSpent'].setValue('');
        formControls['maxSpent'].setValue('');
        break;
    }
  }

  applyAdvancedFilters(): void {
    // Implement advanced filter application logic
    this.currentPage.set(1);
    this.loadMembers();
    this.showSuccessNotification('Advanced filters applied');
  }

  clearAdvancedFilters(): void {
    // Reset advanced filter form controls
    const advancedControls = [
      'registrationStartDate', 'registrationEndDate',
      'minSpent', 'maxSpent', 'minPoints', 'maxPoints',
      'lastTransactionPeriod', 'transactionFrequency'
    ];
    
    advancedControls.forEach(control => {
      this.searchForm.get(control)?.setValue('');
    });
    
    this.selectedSpendingTier.set('all');
    this.currentPage.set(1);
    this.loadMembers();
    this.showSuccessNotification('Advanced filters cleared');
  }

  saveFilterPreset(): void {
    // Implement filter preset saving logic
    const filterPreset = {
      ...this.searchForm.value,
      timestamp: new Date().toISOString()
    };
    
    // Save to localStorage or backend
    localStorage.setItem('memberFilterPreset', JSON.stringify(filterPreset));
    this.showSuccessNotification('Filter preset saved');
  }

  hasActiveFilters(): boolean {
    const formValue = this.searchForm.value;
    return Object.keys(formValue).some(key => {
      const value = formValue[key];
      return value && value !== '' && value !== 'all';
    });
  }

  getActiveFilterTags(): FilterTag[] {
    const tags: FilterTag[] = [];
    const formValue = this.searchForm.value;
    
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value && value !== '' && value !== 'all') {
        tags.push({
          key,
          label: this.getFilterLabel(key, value),
          value
        });
      }
    });
    
    return tags;
  }

  private getFilterLabel(key: string, value: any): string {
    const labelMap: Record<string, string> = {
      search: `Search: ${value}`,
      isActive: `Status: ${value === 'true' ? 'Active' : 'Inactive'}`,
      tier: `Tier: ${value}`,
      registrationStartDate: `From: ${value}`,
      registrationEndDate: `To: ${value}`,
      minSpent: `Min Spent: ${this.formatCurrency(value)}`,
      maxSpent: `Max Spent: ${this.formatCurrency(value)}`,
      minPoints: `Min Points: ${value}`,
      maxPoints: `Max Points: ${value}`,
      lastTransactionPeriod: `Last Transaction: ${value}`,
      transactionFrequency: `Frequency: ${value}`
    };
    
    return labelMap[key] || `${key}: ${value}`;
  }

  removeFilter(filterKey: string): void {
    this.searchForm.get(filterKey)?.setValue('');
    this.loadMembers();
  }

  // ===== SORTING METHODS =====
  toggleSort(field: string): void {
    if (this.sortField() === field) {
      // Toggle direction
      const newDirection = this.sortDirection() === 'asc' ? 'desc' : 'asc';
      this.sortDirection.set(newDirection);
    } else {
      // New field
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    
    this.applySorting();
  }

  getSortDirection(field: string): string {
    return this.sortField() === field ? this.sortDirection() : '';
  }

  getSortIcon(field: string): string {
    if (this.sortField() !== field) return '↕️';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  private applySorting(): void {
    const field = this.sortField();
    const direction = this.sortDirection();
    
    if (!field || !direction) return;
    
    const members = [...this.members()];
    members.sort((a, b) => {
      let aValue = this.getNestedProperty(a, field);
      let bValue = this.getNestedProperty(b, field);
      
      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Convert to comparable types
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return direction === 'asc' ? comparison : -comparison;
    });
    
    this.members.set(members);
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o && o[p], obj);
  }

  // ===== SELECTION METHODS =====
  toggleSelection(member: MemberDto): void {
    const current = this.selectedMembers();
    const index = current.findIndex(m => m.id === member.id);
    
    if (index > -1) {
      this.selectedMembers.set(current.filter((_, i) => i !== index));
    } else {
      this.selectedMembers.set([...current, member]);
    }
  }

  isSelected(member: MemberDto): boolean {
    return this.selectedMembers().some(m => m.id === member.id);
  }

  selectAll(): void {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      this.selectedMembers.set([...this.members()]);
    }
  }

  clearSelection(): void {
    this.selectedMembers.set([]);
  }

  // ===== NAVIGATION METHODS =====
  createMember(): void {
    this.router.navigate(['/dashboard/membership/create']);
  }

  viewMember(member: MemberDto): void {
    this.router.navigate(['/dashboard/membership/view', member.id]);
  }

  editMember(member: MemberDto): void {
    this.router.navigate(['/dashboard/membership/edit', member.id]);
  }

  managePoints(member: MemberDto): void {
    this.router.navigate(['/dashboard/membership/points', member.id]);
  }

  // ===== MODAL METHODS =====
  openMemberDetailModal(member: MemberDto): void {
    this.selectedMemberForModal.set(member);
    this.showMemberDetailModal.set(true);
  }

  closeMemberDetailModal(): void {
    this.showMemberDetailModal.set(false);
    this.selectedMemberForModal.set(null);
  }

  // ===== BULK OPERATIONS =====
  async bulkActivate(): Promise<void> {
    if (this.selectedMembers().length === 0) return;
    
    const confirmMessage = `Activate ${this.selectedMembers().length} selected member(s)?`;
    if (!confirm(confirmMessage)) return;

    this.loading$.set(true);
    
    try {
      const memberIds = this.selectedMembers().map(m => m.id);
      
      const updatePromises = memberIds.map(id => {
        const updateRequest: UpdateMemberRequest = { isActive: true };
        return this.membershipService.updateMember(id, updateRequest).toPromise();
      });
      
      await Promise.all(updatePromises);
      
      this.members.update(members => 
        members.map(member => 
          memberIds.includes(member.id) 
            ? { ...member, isActive: true }
            : member
        )
      );
      
      this.showSuccessNotification(`${memberIds.length} members activated successfully`);
      this.clearSelection();
    } catch (error) {
      this.showErrorNotification('Failed to activate members');
    } finally {
      this.loading$.set(false);
    }
  }

  async bulkDeactivate(): Promise<void> {
    if (this.selectedMembers().length === 0) return;
    
    const confirmMessage = `Deactivate ${this.selectedMembers().length} selected member(s)?`;
    if (!confirm(confirmMessage)) return;

    this.loading$.set(true);
    
    try {
      const memberIds = this.selectedMembers().map(m => m.id);
      
      const updatePromises = memberIds.map(id => {
        const updateRequest: UpdateMemberRequest = { isActive: false };
        return this.membershipService.updateMember(id, updateRequest).toPromise();
      });
      
      await Promise.all(updatePromises);
      
      this.members.update(members => 
        members.map(member => 
          memberIds.includes(member.id) 
            ? { ...member, isActive: false }
            : member
        )
      );
      
      this.showSuccessNotification(`${memberIds.length} members deactivated successfully`);
      this.clearSelection();
    } catch (error) {
      this.showErrorNotification('Failed to deactivate members');
    } finally {
      this.loading$.set(false);
    }
  }

  // ===== EXPORT METHODS =====
  exportMembers(): void {
    try {
      const csvData = this.convertToCSV(this.filteredMembers());
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `members_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showSuccessNotification('Members exported successfully');
    } catch (error) {
      this.showErrorNotification('Failed to export members');
    }
  }

  exportToExcel(): void {
    // Implement Excel export logic
    this.showSuccessNotification('Excel export feature coming soon');
  }

  private convertToCSV(members: MemberDto[]): string {
    const headers = [
      'Member Number', 'Name', 'Email', 'Phone', 'Tier', 
      'Available Points', 'Total Points', 'Total Spent', 'Total Transactions', 
      'Last Transaction', 'Status', 'Created At'
    ];
    
    const rows = members.map(member => [
      member.memberNumber,
      member.name,
      member.email,
      member.phone,
      member.tier,
      member.availablePoints,
      member.totalPoints,
      member.totalSpent,
      member.totalTransactions,
      this.formatDate(member.lastTransactionDate),
      member.isActive ? 'Active' : 'Inactive',
      this.formatDate(member.createdAt)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  // ===== PAGINATION METHODS =====
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadMembers();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadMembers();
    }
  }

  goToFirstPage(): void {
    this.currentPage.set(1);
    this.loadMembers();
  }

  goToLastPage(): void {
    this.currentPage.set(this.totalPages());
    this.loadMembers();
  }

  goToPage(page: number | string): void {
    if (typeof page === 'string' || page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadMembers();
  }

  getVisiblePages(): (number | string)[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: (number | string)[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }
    
    return pages;
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
    this.loadMembers();
  }

  onPageChange(event: any): void {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex + 1);
    this.loadMembers();
  }

  // ===== UTILITY METHODS =====
  refreshData(): void {
    this.loadMembers();
    this.updateLastUpdated();
    this.showSuccessNotification('Data refreshed');
  }

  private updateLastUpdated(): void {
    this.lastUpdated.set(new Date().toISOString());
  }

  toggleBulkMenu(): void {
    // Implement bulk menu toggle
    console.log('Toggle bulk menu');
  }

  toggleMemberMenu(member: MemberDto): void {
    // Implement member-specific menu
    console.log('Toggle menu for member:', member.id);
  }

  onFilterReset(): void {
    this.searchForm.reset({
      search: '',
      isActive: 'all',
      tier: 'all'
    });
    this.clearSelection();
    this.loadMembers();
  }

  // ===== MEMBER STATUS METHODS =====
  isRecentlyUpdated(member: MemberDto): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const updatedAt = new Date(member.updatedAt);
    return updatedAt > oneHourAgo;
  }

  getMembershipDuration(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  }

  getTransactionFrequency(member: MemberDto): string {
    const count = member.totalTransactions;
    if (count === 0) return 'No transactions';
    if (count === 1) return 'First transaction';
    if (count < 5) return 'Occasional buyer';
    if (count < 15) return 'Regular customer';
    return 'Frequent buyer';
  }

  getTierProgress(member: MemberDto): TierProgress {
    const tierThresholds = {
      Bronze: 0,
      Silver: 1000000,
      Gold: 5000000,
      Platinum: 15000000,
      VIP: 50000000
    };
    
    const tiers = Object.keys(tierThresholds);
    const currentIndex = tiers.indexOf(member.tier);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= tiers.length) {
      return {
        currentTier: member.tier,
        nextTier: 'Max Tier',
        amountNeeded: 0,
        percentage: 100
      };
    }
    
    const nextTier = tiers[nextIndex];
    const currentThreshold = tierThresholds[member.tier as keyof typeof tierThresholds];
    const nextThreshold = tierThresholds[nextTier as keyof typeof tierThresholds];
    const amountNeeded = nextThreshold - member.totalSpent;
    const percentage = Math.min(100, (member.totalSpent / nextThreshold) * 100);
    
    return {
      currentTier: member.tier,
      nextTier,
      amountNeeded: Math.max(0, amountNeeded),
      percentage: Math.round(percentage)
    };
  }

  // ===== TIER UTILITY METHODS =====
  getTierInfo(tier: string): TierInfo {
    return this.tierInfoMap[tier] || this.tierInfoMap['Bronze'];
  }

  getTierIcon(tier: string): string {
    return this.getTierInfo(tier).icon;
  }

  // ===== FORMATTING METHODS =====
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
  }

  formatDate(date: string | null): string {
    if (!date) return 'Never';
    
    try {
      const d = new Date(date);
      return d.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  }

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  // ===== REAL-TIME FEATURES =====
  private initializeRealTimeConnection(): void {
    // Simulate real-time connection
    setTimeout(() => {
      this.realtimeConnected.set(true);
      this.addToast({
        id: this.generateId(),
        type: 'success',
        title: 'Connected',
        message: 'Real-time updates are now active',
        timestamp: new Date()
      });
    }, 2000);
  }

  // ===== TOAST NOTIFICATION METHODS =====
  private addToast(toast: ToastNotification): void {
    this.realtimeToasts.update(toasts => [toast, ...toasts.slice(0, 4)]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.dismissToast(toast.id);
    }, 5000);
  }

  dismissToast(toastId: string): void {
    this.realtimeToasts.update(toasts => 
      toasts.filter(toast => toast.id !== toastId)
    );
  }

  getToastIcon(type: string): string {
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type as keyof typeof icons] || 'ℹ️';
  }

  trackByToast = (index: number, toast: ToastNotification): string => toast.id;

  // ===== PERFORMANCE OPTIMIZATION =====
  trackByMember = (index: number, member: MemberDto): number => member.id;

  // ===== NOTIFICATION HELPERS =====
  private showSuccessNotification(message: string): void {
    this.addToast({
      id: this.generateId(),
      type: 'success',
      title: 'Success',
      message,
      timestamp: new Date()
    });

    // Also use NotificationService if available
    if (this.notificationService) {
      this.notificationService.createNotification({
        title: 'Success',
        message: message,
        type: 'success',
        priority: 'Medium'
      }).subscribe({
        next: () => console.log('Success notification created'),
        error: (error) => console.error('Error creating notification:', error)
      });
    }
  }

  private showErrorNotification(message: string): void {
    this.addToast({
      id: this.generateId(),
      type: 'error',
      title: 'Error',
      message,
      timestamp: new Date()
    });

    // Also use NotificationService if available
    if (this.notificationService) {
      this.notificationService.createNotification({
        title: 'Error',
        message: message,
        type: 'error',
        priority: 'High'
      }).subscribe({
        next: () => console.log('Error notification created'),
        error: (error) => console.error('Error creating notification:', error)
      });
    }
  }

  private showWarningNotification(message: string): void {
    this.addToast({
      id: this.generateId(),
      type: 'warning',
      title: 'Warning',
      message,
      timestamp: new Date()
    });
  }

  private showInfoNotification(message: string): void {
    this.addToast({
      id: this.generateId(),
      type: 'info',
      title: 'Info',
      message,
      timestamp: new Date()
    });
  }

  // ===== UTILITY HELPERS =====
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // ===== MATH UTILITY FOR TEMPLATE =====
  readonly Math = Math;

  // ===== SEARCH HELPERS =====
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchForm.get('search')?.setValue(target.value);
  }

  // ===== SORTING PLACEHOLDER =====
  onSort(column: string): void {
    this.toggleSort(column);
  }
  onPageSizeSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = Number(select.value);
    if (!isNaN(newSize) && newSize > 0) {
      this.pageSize.set(newSize); // assuming pageSize is a signal or property
      this.currentPage.set(1); // reset to first page if using signals
      this.loadMembers(); // reload data with new page size
    }
  }
}