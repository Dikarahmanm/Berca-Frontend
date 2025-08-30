// membership-list.component.ts
// Enhanced with Angular 20 Signals & Clean Simple Design - Compatible with HTML template
// All missing properties and methods added for enhanced features

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Material imports for enhanced UI
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Enhanced service integration with actual backend APIs
import { MembershipService } from '../../services/membership.service';
import { MemberCreditService } from '../../services/member-credit.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  MemberFilter,
  UpdateMemberRequest,
  MemberDto as MembershipMemberDto
} from '../../interfaces/membership.interfaces';
import {
  MemberCreditSummaryDto,
  GrantCreditRequestDto,
  CreditPaymentRequestDto,
  UpdateCreditLimitRequestDto,
  UpdateCreditStatusRequestDto
} from '../../interfaces/member-credit.interfaces';

// Enhanced interfaces for advanced features - Extended with Credit Integration
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
  
  // ===== NEW: Credit Integration Fields =====
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  statusDescription: string;
  creditScore: number;
  isEligibleForCredit: boolean;
  creditUtilization: number;
  paymentTerms: number;
  daysOverdue: number;
  overdueAmount: number;
  creditEnabled: boolean;
  lastPaymentDate?: string;
  paymentSuccessRate: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  maxAllowedTransaction: number;
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

// Removed unused import: MemberCreditModalComponent

@Component({
  selector: 'app-membership-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule, // Added for ngModel support
    // Material UI imports
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
    // Removed: MemberCreditModalComponent (not used in template)
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
  private readonly memberCreditService = inject(MemberCreditService);
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
  
  // ===== NEW: Credit Filter Signals =====
  readonly creditStatusFilter = signal<string>('all');
  readonly riskLevelFilter = signal<string>('all');
  readonly creditEnabledFilter = signal<string>('all');
  readonly overdueFilter = signal<string>('all');

  // ===== ENHANCED FEATURES SIGNALS =====
  // Real-time connection status
  readonly realtimeConnected = signal<boolean>(false);
  
  // Sorting signals
  readonly sortBy_signal = signal<string>('name');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');
  
  // UI state signals
  readonly showMemberActions = signal<number | null>(null);
  readonly showBulkActionsMenu = signal<boolean>(false);
  
  // Advanced filters
  readonly showAdvancedFilters = signal<boolean>(false);
  readonly selectedSpendingTier = signal<string>('all');
  
  // Modal state
  readonly showMemberDetailModal = signal<boolean>(false);
  readonly selectedMemberForModal = signal<MemberDto | null>(null);
  
  // ===== NEW: Credit Modal State =====
  readonly showMemberCreditModal = signal<boolean>(false);
  readonly selectedMemberForCreditModal = signal<MemberDto | null>(null);
  readonly showCreditModal = signal<boolean>(false);
  readonly selectedMemberForCredit = signal<MemberDto | null>(null);
  
  // Credit form data (regular properties for ngModel)
  creditLimitAmount: number = 0;
  creditLimitReason: string = '';
  grantCreditAmount: number = 0;
  grantCreditType: string = 'Bonus_Credit';
  grantCreditDescription: string = '';
  grantCreditPaymentTerms: number = 30; // Default 30 days
  grantCreditDueDate: string = ''; // Custom due date
  
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
    
    // ===== NEW: Credit Filters =====
    // Credit status filter
    const creditStatus = this.creditStatusFilter();
    if (creditStatus !== 'all') {
      filtered = filtered.filter(member => member.statusDescription === creditStatus);
    }
    
    // Risk level filter
    const riskLevel = this.riskLevelFilter();
    if (riskLevel !== 'all') {
      filtered = filtered.filter(member => member.riskLevel === riskLevel);
    }
    
    // Credit enabled filter
    const creditEnabled = this.creditEnabledFilter();
    if (creditEnabled !== 'all') {
      filtered = filtered.filter(member => 
        creditEnabled === 'true' ? member.creditEnabled : !member.creditEnabled
      );
    }
    
    // Overdue filter
    const overdueFilter = this.overdueFilter();
    if (overdueFilter !== 'all') {
      if (overdueFilter === 'overdue') {
        filtered = filtered.filter(member => member.daysOverdue > 0);
      } else if (overdueFilter === 'current') {
        filtered = filtered.filter(member => member.daysOverdue === 0);
      }
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

  // ===== NEW: Credit Analytics Computed Properties =====
  readonly totalCreditLimit = computed(() => 
    this.filteredMembers().reduce((sum, member) => sum + member.creditLimit, 0)
  );

  readonly totalCurrentDebt = computed(() => 
    this.filteredMembers().reduce((sum, member) => sum + member.currentDebt, 0)
  );

  readonly totalOverdueAmount = computed(() => 
    this.filteredMembers().reduce((sum, member) => sum + member.overdueAmount, 0)
  );

  readonly averageCreditUtilization = computed(() => {
    const members = this.filteredMembers();
    if (members.length === 0) return 0;
    return members.reduce((sum, member) => sum + member.creditUtilization, 0) / members.length;
  });

  readonly membersWithCredit = computed(() => 
    this.filteredMembers().filter(member => member.creditEnabled)
  );

  readonly overdueMembers = computed(() => 
    this.filteredMembers().filter(member => member.daysOverdue > 0)
  );

  readonly criticalRiskMembers = computed(() => 
    this.filteredMembers().filter(member => member.riskLevel === 'Critical')
  );

  // Statistics for dashboard cards
  readonly memberStats = computed(() => {
    const members = this.members();
    return {
      totalMembers: members.length,
      activeMembers: members.filter(m => m.isActive).length,
      creditEnabledMembers: members.filter(m => m.creditLimit > 0).length,
      vipMembers: members.filter(m => m.tier === 'VIP' || m.tier === 'Platinum').length,
      totalPoints: members.reduce((sum, m) => sum + (m.availablePoints || 0), 0)
    };
  });

  readonly activeMembersCount = computed(() => this.memberStats().activeMembers);
  readonly creditEnabledCount = computed(() => this.memberStats().creditEnabledMembers);

  readonly creditStatusSummary = computed(() => {
    const members = this.filteredMembers();
    return {
      good: members.filter(m => m.statusDescription === 'Good').length,
      warning: members.filter(m => m.statusDescription === 'Warning').length,
      bad: members.filter(m => m.statusDescription === 'Bad').length,
      blocked: members.filter(m => m.statusDescription === 'Blocked').length
    };
  });

  // Data source for template compatibility
  readonly dataSource = computed(() => {
    const currentPage = this.currentPage();
    const pageSize = this.pageSize();
    const totalItems = this.totalItems();
    
    return {
      data: this.filteredMembers(),
      currentPage,
      totalPages: this.totalPages(),
      totalItems,
      startItem: ((currentPage - 1) * pageSize) + 1,
      endItem: Math.min(currentPage * pageSize, totalItems)
    };
  });

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

      console.log('Loading members with filters:', filters);

      this.membershipService.searchMembers(filters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (response: MemberSearchResponse) => {
            console.log('Received members from membership service:', response.members.length);
            
            // Load basic member data first
            let membersWithCredit = [...response.members];
            
            // Load credit data for each member
            try {
              console.log('Loading credit data for each member...', response.members.length, 'members to process');
              const creditPromises = response.members.map(async (member) => {
                try {
                  console.log(`Starting credit data load for member ${member.id} (${member.name})`);
                  const creditSummary = await this.memberCreditService.getCreditSummary(member.id).toPromise();
                  console.log(`Credit data received for member ${member.id}:`, creditSummary);
                  
                  if (creditSummary) {
                    const mergedMember = {
                      ...member,
                      creditLimit: creditSummary.creditLimit,
                      currentDebt: creditSummary.currentDebt,
                      availableCredit: creditSummary.availableCredit,
                      statusDescription: creditSummary.statusDescription,
                      creditScore: creditSummary.creditScore,
                      creditUtilization: creditSummary.creditUtilization,
                      paymentTerms: creditSummary.paymentTerms || 30,
                      daysOverdue: creditSummary.daysOverdue || 0,
                      overdueAmount: creditSummary.overdueAmount || 0,
                      creditEnabled: creditSummary.creditLimit > 0,
                      lastPaymentDate: creditSummary.lastPaymentDate,
                      paymentSuccessRate: creditSummary.paymentSuccessRate || 100,
                      riskLevel: creditSummary.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical',
                      isEligibleForCredit: creditSummary.statusDescription !== 'Blocked' && creditSummary.creditScore >= 50,
                      maxAllowedTransaction: creditSummary.availableCredit * 0.8 // 80% of available credit
                    };
                    console.log(`Merged member data for ${member.id}:`, {
                      creditLimit: mergedMember.creditLimit,
                      currentDebt: mergedMember.currentDebt,
                      availableCredit: mergedMember.availableCredit,
                      creditEnabled: mergedMember.creditEnabled
                    });
                    return mergedMember;
                  }
                  console.log(`No credit data found for member ${member.id}, using original member data`);
                  return member; // Return original member if no credit data
                } catch (creditError) {
                  console.warn(`Failed to load credit data for member ${member.id}:`, creditError);
                  return member; // Return original member if credit service fails
                }
              });

              console.log('Waiting for all credit data promises to resolve...');
              membersWithCredit = await Promise.all(creditPromises);
              console.log('Successfully merged member and credit data. Final member count:', membersWithCredit.length);
              
              // Log final results for debugging
              membersWithCredit.forEach((member, index) => {
                console.log(`Final member ${index + 1} (${member.name}):`, {
                  id: member.id,
                  creditLimit: member.creditLimit,
                  currentDebt: member.currentDebt,
                  availableCredit: member.availableCredit,
                  creditEnabled: member.creditEnabled
                });
              });
              
            } catch (creditBatchError) {
              console.error('Error loading credit data batch:', creditBatchError);
              // Continue with basic member data if credit loading fails
            }
            
            this.members.set(membersWithCredit);
            this.totalItems.set(response.totalItems);
            this.loading$.set(false);
            this.updateLastUpdated();
            
            console.log('Final members data with credit:', membersWithCredit.length, 'members loaded');
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

  // ===== NEW: CREDIT MANAGEMENT METHODS =====
  
  /**
   * Open credit management modal for a member
   */
  manageMemberCredit(member: MemberDto): void {
    this.selectedMemberForCredit.set(member);
    this.showCreditModal.set(true);
    
    // Initialize form data with safe default values
    this.creditLimitAmount = Number(member.creditLimit) || 0;
    this.creditLimitReason = '';
    this.grantCreditAmount = 0;
    this.grantCreditType = 'Bonus_Credit';
    this.grantCreditDescription = '';
    
    console.log('Credit modal opened for:', member.name, 'Current limit:', this.creditLimitAmount);
  }

  /**
   * Close credit modal
   */
  closeCreditModal(): void {
    this.showCreditModal.set(false);
    this.selectedMemberForCredit.set(null);
    
    // Reset form data
    this.creditLimitAmount = 0;
    this.creditLimitReason = '';
    this.grantCreditAmount = 0;
    this.grantCreditType = 'Bonus_Credit';
    this.grantCreditDescription = '';
  }

  /**
   * Update member credit limit
   */
  async updateCreditLimit(): Promise<void> {
    const member = this.selectedMemberForCredit();
    if (!member || !this.creditLimitAmount || !this.creditLimitReason) {
      return;
    }

    try {
      const request: UpdateCreditLimitRequestDto = {
        newCreditLimit: this.creditLimitAmount,
        reason: this.creditLimitReason,
        notes: `Credit limit updated to ${this.formatCurrency(this.creditLimitAmount)} - ${this.creditLimitReason}`
      };

      console.log('Update credit limit request:', request);
      
      const response = await this.memberCreditService.updateCreditLimit(member.id, request).toPromise();
      console.log('Update credit limit response:', response);

      // Show success notification
      this.showToast('success', 'Credit Updated', `Credit limit updated to ${this.formatCurrency(this.creditLimitAmount)}`);
      
      // Reset form
      this.creditLimitAmount = 0;
      this.creditLimitReason = '';
      
      // IMPORTANT: Reload data from server to ensure consistency
      await this.loadMembers();
      
      this.closeCreditModal();
      
    } catch (error) {
      console.error('Error updating credit limit:', error);
      this.showToast('error', 'Update Failed', 'Failed to update credit limit. Please try again.');
    }
  }

  /**
   * Grant additional credit to member
   */
  async grantCredit(): Promise<void> {
    const member = this.selectedMemberForCredit();
    if (!member || !this.grantCreditAmount || !this.grantCreditDescription) {
      return;
    }

    try {
      const request: GrantCreditRequestDto = {
        amount: this.grantCreditAmount,
        description: this.grantCreditDescription,
        saleId: 0, // Not related to sale
        notes: this.grantCreditDescription
      };

      // Add payment terms if specified
      if (this.grantCreditDueDate) {
        request.dueDate = this.grantCreditDueDate;
      } else if (this.grantCreditPaymentTerms && this.grantCreditPaymentTerms !== 30) {
        request.paymentTermDays = this.grantCreditPaymentTerms;
      }

      console.log('Grant credit request:', request);
      
      const response = await this.memberCreditService.grantCredit(member.id, request).toPromise();
      console.log('Grant credit response:', response);

      // Show success notification
      this.showToast('success', 'Credit Granted', `${this.formatCurrency(this.grantCreditAmount)} credit granted successfully`);
      
      // Reset form
      this.grantCreditAmount = 0;
      this.grantCreditDescription = '';
      this.grantCreditPaymentTerms = 30;
      this.grantCreditDueDate = '';
      
      // IMPORTANT: Reload data from server to ensure consistency
      await this.loadMembers();
      
      this.closeCreditModal();
      
    } catch (error) {
      console.error('Error granting credit:', error);
      this.showToast('error', 'Grant Failed', 'Failed to grant credit. Please try again.');
    }
  }

  /**
   * View member credit history
   */
  viewCreditHistory(): void {
    const member = this.selectedMemberForCredit();
    if (member) {
      // Navigate to credit history page or open history modal
      // For now, just close the modal
      this.closeCreditModal();
      // TODO: Implement credit history view
    }
  }

  /**
   * Helper method to show toast notifications
   */
  private showToast(type: 'success' | 'warning' | 'error' | 'info', title: string, message: string): void {
    this.addToast({
      id: Date.now().toString(),
      type: type,
      title: title,
      message: message,
      timestamp: new Date()
    });
  }

  // ===== NEW: MISSING METHODS FOR ENHANCED UI =====

  /**
   * Toggle member active status
   */
  async toggleMemberStatus(member: MemberDto): Promise<void> {
    try {
      const newStatus = !member.isActive;
      // Call API to update member status
      // await this.membershipService.updateMemberStatus(member.id, newStatus);
      
      // Update local data
      this.members.update(members => 
        members.map(m => m.id === member.id ? { ...m, isActive: newStatus } : m)
      );

      this.showToast('success', 'Status Updated', `Member ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      this.showToast('error', 'Update Failed', 'Failed to update member status');
    }
  }

  /**
   * View member transaction history
   */
  viewMemberHistory(member: MemberDto): void {
    // Navigate to member history page or open history modal
    console.log('Viewing history for member:', member.name);
    // TODO: Implement member history view
  }

  /**
   * Export member data
   */
  exportMemberData(member: MemberDto): void {
    // Create and download CSV for single member
    const csv = this.convertToCSV([member]);
    this.downloadCSV(csv, `member-${member.memberNumber}-data.csv`);
    
    this.showToast('success', 'Export Complete', `Member data exported successfully`);
  }


  /**
   * Download CSV file
   */
  private downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Close credit management modal
   */
  closeMemberCreditModal(): void {
    this.showMemberCreditModal.set(false);
    this.selectedMemberForCreditModal.set(null);
  }

  /**
   * Handle credit updated event from modal
   */
  onCreditUpdated(creditSummary: MemberCreditSummaryDto): void {
    // Update the member in the local list
    this.members.update(members => 
      members.map(member => {
        if (member.id === creditSummary.memberId) {
          return {
            ...member,
            creditLimit: creditSummary.creditLimit,
            currentDebt: creditSummary.currentDebt,
            availableCredit: creditSummary.availableCredit,
            statusDescription: creditSummary.statusDescription,
            creditScore: creditSummary.creditScore,
            creditUtilization: creditSummary.creditUtilization,
            daysOverdue: creditSummary.daysOverdue,
            overdueAmount: creditSummary.overdueAmount,
            paymentSuccessRate: creditSummary.paymentSuccessRate,
            riskLevel: creditSummary.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical',
            maxAllowedTransaction: 0 // Default value since this field doesn't exist in MemberCreditSummaryDto
          };
        }
        return member;
      })
    );

    this.showSuccessNotification('Member credit information updated');
  }

  /**
   * Quick grant credit to member
   */
  async quickGrantCredit(member: MemberDto, amount: number): Promise<void> {
    if (!member.isEligibleForCredit || member.statusDescription === 'Blocked') {
      this.showErrorNotification('Member is not eligible for credit');
      return;
    }

    const confirmed = confirm(`Grant ${this.formatCurrency(amount)} credit to ${member.name}?`);
    if (!confirmed) return;

    try {
      this.loading$.set(true);
      
      const request: GrantCreditRequestDto = {
        amount,
        description: `Quick credit grant of ${this.formatCurrency(amount)}`,
        saleId: 0, // Not related to sale
        notes: `Quick credit grant of ${this.formatCurrency(amount)}`
      };

      const success = await this.memberCreditService.grantCredit(member.id, request).toPromise();
      
      if (success) {
        this.loadMembers(); // Refresh data
        this.showSuccessNotification(`Credit granted successfully to ${member.name}`);
      }
    } catch (error) {
      console.error('Error granting credit:', error);
      this.showErrorNotification('Failed to grant credit');
    } finally {
      this.loading$.set(false);
    }
  }

  /**
   * Quick record payment for member
   */
  async quickRecordPayment(member: MemberDto, amount: number): Promise<void> {
    if (member.currentDebt <= 0) {
      this.showErrorNotification('Member has no outstanding debt');
      return;
    }

    if (amount > member.currentDebt) {
      this.showErrorNotification('Payment amount cannot exceed outstanding debt');
      return;
    }

    const confirmed = confirm(`Record ${this.formatCurrency(amount)} payment from ${member.name}?`);
    if (!confirmed) return;

    try {
      this.loading$.set(true);
      
      const request: CreditPaymentRequestDto = {
        amount,
        paymentMethod: 'Cash',
        referenceNumber: `QUICK-PAY-${Date.now()}`,
        notes: `Quick payment of ${this.formatCurrency(amount)}`
      };

      const transaction = await this.memberCreditService.recordPayment(member.id, request).toPromise();
      
      if (transaction) {
        this.loadMembers(); // Refresh data
        this.showSuccessNotification(`Payment recorded successfully for ${member.name}`);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      this.showErrorNotification('Failed to record payment');
    } finally {
      this.loading$.set(false);
    }
  }

  /**
   * Toggle member credit status
   */
  async toggleCreditStatus(member: MemberDto): Promise<void> {
    const newStatus = member.statusDescription === 'Blocked' ? 'Good' : 'Blocked';
    const action = newStatus === 'Blocked' ? 'block' : 'unblock';
    
    const confirmed = confirm(`${action === 'block' ? 'Block' : 'Unblock'} credit for ${member.name}?`);
    if (!confirmed) return;

    try {
      this.loading$.set(true);
      
      const request: UpdateCreditStatusRequestDto = {
        memberId: member.id,
        newStatus,
        reason: `Quick ${action} credit action from member list`,
        branchId: 1, // Get from current branch context
        updatedBy: 'System' // Get from current user context
      };

      const success = await this.memberCreditService.updateCreditStatus(request.memberId, request).toPromise();
      
      if (success) {
        this.loadMembers(); // Refresh data
        this.showSuccessNotification(`Member credit ${action}ed successfully`);
      }
    } catch (error) {
      console.error('Error updating credit status:', error);
      this.showErrorNotification('Failed to update credit status');
    } finally {
      this.loading$.set(false);
    }
  }

  /**
   * Bulk grant credit to selected members
   */
  async bulkGrantCredit(amount?: number): Promise<void> {
    // If amount is not provided, prompt user for input
    if (!amount) {
      const userInput = prompt('Enter credit amount to grant to selected members:');
      if (!userInput) return; // User cancelled
      
      const parsedAmount = parseFloat(userInput);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        this.showErrorNotification('Please enter a valid positive amount');
        return;
      }
      amount = parsedAmount;
    }

    const eligibleMembers = this.selectedMembers().filter(m => 
      m.isEligibleForCredit && m.statusDescription !== 'Blocked'
    );

    if (eligibleMembers.length === 0) {
      this.showErrorNotification('No eligible members selected for credit grant');
      return;
    }

    const confirmed = confirm(
      `Grant ${this.formatCurrency(amount)} credit to ${eligibleMembers.length} eligible member(s)?`
    );
    if (!confirmed) return;

    try {
      this.loading$.set(true);
      let successCount = 0;
      let errorCount = 0;

      const grantPromises = eligibleMembers.map(async (member) => {
        try {
          const request: GrantCreditRequestDto = {
            amount,
            description: `Bulk credit grant of ${this.formatCurrency(amount)}`,
            saleId: 0, // Not related to sale
            notes: `Bulk credit grant of ${this.formatCurrency(amount)}`
          };

          await this.memberCreditService.grantCredit(member.id, request).toPromise();
          successCount++;
        } catch (error) {
          console.error(`Error granting credit to member ${member.id}:`, error);
          errorCount++;
        }
      });

      await Promise.all(grantPromises);

      this.loadMembers(); // Refresh data
      this.clearSelection();

      if (errorCount === 0) {
        this.showSuccessNotification(`Credit granted successfully to ${successCount} member(s)`);
      } else {
        this.showWarningNotification(
          `Credit granted to ${successCount} member(s), ${errorCount} failed`
        );
      }
    } catch (error) {
      console.error('Error in bulk credit grant:', error);
      this.showErrorNotification('Failed to complete bulk credit grant');
    } finally {
      this.loading$.set(false);
    }
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
      'Last Transaction', 'Status', 'Created At',
      // ===== NEW: Credit Export Columns =====
      'Credit Limit', 'Current Debt', 'Available Credit', 'Credit Status',
      'Credit Score', 'Credit Utilization %', 'Risk Level', 'Days Overdue',
      'Overdue Amount', 'Payment Success Rate %', 'Credit Enabled'
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
      this.formatDate(member.createdAt),
      // ===== NEW: Credit Export Data =====
      member.creditLimit || 0,
      member.currentDebt || 0,
      member.availableCredit || 0,
      member.statusDescription || 'N/A',
      member.creditScore || 0,
      member.creditUtilization || 0,
      member.riskLevel || 'N/A',
      member.daysOverdue || 0,
      member.overdueAmount || 0,
      member.paymentSuccessRate || 0,
      member.creditEnabled ? 'Yes' : 'No'
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

  formatCompactNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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

  // ===== NEW: CREDIT UTILITY METHODS =====

  /**
   * Get credit status color for UI
   */
  getCreditStatusColor(status: string): string {
    switch (status) {
      case 'Good': return '#52a573'; // Green
      case 'Warning': return '#e6a855'; // Yellow
      case 'Bad': return '#d66b2f'; // Orange
      case 'Blocked': return '#d44a3f'; // Red
      default: return '#6c757d'; // Gray
    }
  }

  /**
   * Get risk level color for UI
   */
  getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'Low': return '#52a573'; // Green
      case 'Medium': return '#e6a855'; // Yellow
      case 'High': return '#d66b2f'; // Orange  
      case 'Critical': return '#d44a3f'; // Red
      default: return '#6c757d'; // Gray
    }
  }

  /**
   * Get credit status badge class
   */
  getCreditStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Good': return 'badge-success';
      case 'Warning': return 'badge-warning';
      case 'Bad': return 'badge-error';
      case 'Blocked': return 'badge-blocked';
      default: return 'badge-secondary';
    }
  }

  /**
   * Get risk level badge class
   */
  getRiskLevelBadgeClass(riskLevel: string): string {
    switch (riskLevel) {
      case 'Low': return 'badge-success';
      case 'Medium': return 'badge-warning';
      case 'High': return 'badge-error';
      case 'Critical': return 'badge-critical';
      default: return 'badge-secondary';
    }
  }

  /**
   * Format percentage with proper rounding
   */
  formatPercentage(value: number): string {
    return `${Math.round(value * 100) / 100}%`;
  }

  /**
   * Check if member has overdue payments
   */
  isOverdue(member: MemberDto): boolean {
    return member.daysOverdue > 0;
  }

  /**
   * Check if member is high risk
   */
  isHighRisk(member: MemberDto): boolean {
    return member.riskLevel === 'High' || member.riskLevel === 'Critical';
  }

  /**
   * Check if member has high credit utilization
   */
  hasHighUtilization(member: MemberDto): boolean {
    return member.creditUtilization > 80;
  }

  /**
   * Get credit utilization level
   */
  getCreditUtilizationLevel(utilization: number): 'low' | 'medium' | 'high' | 'critical' {
    if (utilization <= 30) return 'low';
    if (utilization <= 60) return 'medium';
    if (utilization <= 80) return 'high';
    return 'critical';
  }

  /**
   * Get credit utilization color
   */
  getCreditUtilizationColor(utilization: number): string {
    const level = this.getCreditUtilizationLevel(utilization);
    switch (level) {
      case 'low': return '#52a573'; // Green
      case 'medium': return '#e6a855'; // Yellow
      case 'high': return '#d66b2f'; // Orange
      case 'critical': return '#d44a3f'; // Red
      default: return '#6c757d'; // Gray
    }
  }

  /**
   * Get member credit summary text
   */
  getMemberCreditSummary(member: MemberDto): string {
    if (!member.creditEnabled) {
      return 'Credit not enabled';
    }

    const available = this.formatCurrency(member.availableCredit);
    const limit = this.formatCurrency(member.creditLimit);
    const utilization = this.formatPercentage(member.creditUtilization);

    return `${available} available of ${limit} limit (${utilization} used)`;
  }

  /**
   * Get overdue status text
   */
  getOverdueStatusText(member: MemberDto): string {
    if (member.daysOverdue <= 0) {
      return 'Current';
    }

    if (member.daysOverdue <= 7) {
      return `${member.daysOverdue} day(s) overdue`;
    }

    if (member.daysOverdue <= 30) {
      return `${member.daysOverdue} days overdue - Warning`;
    }

    return `${member.daysOverdue} days overdue - Critical`;
  }

  /**
   * Check if member can receive more credit
   */
  canGrantMoreCredit(member: MemberDto): boolean {
    return member.isEligibleForCredit && 
           member.statusDescription !== 'Blocked' && 
           member.availableCredit > 0 &&
           member.creditUtilization < 95;
  }

  /**
   * Check if member can make payment
   */
  canMakePayment(member: MemberDto): boolean {
    return member.currentDebt > 0;
  }

  /**
   * Get payment priority level
   */
  getPaymentPriorityLevel(member: MemberDto): 'none' | 'low' | 'medium' | 'high' | 'urgent' {
    if (member.currentDebt <= 0) return 'none';
    
    if (member.daysOverdue <= 0) return 'low';
    if (member.daysOverdue <= 7) return 'medium';
    if (member.daysOverdue <= 30) return 'high';
    return 'urgent';
  }

  /**
   * Get suggested action for member
   */
  getSuggestedAction(member: MemberDto): string {
    if (member.statusDescription === 'Blocked') {
      return 'Unblock credit account';
    }

    if (member.daysOverdue > 30) {
      return 'Collect overdue payment urgently';
    }

    if (member.daysOverdue > 0) {
      return 'Follow up on overdue payment';
    }

    if (member.creditUtilization > 90) {
      return 'Consider credit limit increase';
    }

    if (member.riskLevel === 'Critical') {
      return 'Review and reduce risk level';
    }

    if (member.availableCredit <= 0) {
      return 'Member at credit limit';
    }

    return 'Account in good standing';
  }

  /**
   * Calculate member credit health score (0-100)
   */
  getMemberCreditHealthScore(member: MemberDto): number {
    let score = 100;

    // Deduct for overdue days
    if (member.daysOverdue > 0) {
      score -= Math.min(40, member.daysOverdue * 2);
    }

    // Deduct for high utilization
    if (member.creditUtilization > 80) {
      score -= (member.creditUtilization - 80) * 2;
    }

    // Deduct for low payment success rate
    if (member.paymentSuccessRate < 90) {
      score -= (90 - member.paymentSuccessRate);
    }

    // Deduct for risk level
    switch (member.riskLevel) {
      case 'Medium': score -= 10; break;
      case 'High': score -= 25; break;
      case 'Critical': score -= 50; break;
    }

    // Deduct for credit status
    switch (member.statusDescription) {
      case 'Warning': score -= 10; break;
      case 'Bad': score -= 25; break;
      case 'Blocked': score -= 60; break;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get credit health score color
   */
  getCreditHealthScoreColor(score: number): string {
    if (score >= 80) return '#52a573'; // Green
    if (score >= 60) return '#e6a855'; // Yellow
    if (score >= 40) return '#d66b2f'; // Orange
    return '#d44a3f'; // Red
  }

  /**
   * Get credit health description
   */
  getCreditHealthDescription(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  // ===== BULK OPERATIONS FOR NEW UI =====
  /**
   * Bulk update member status
   */
  async bulkUpdateStatus(status: 'active' | 'inactive'): Promise<void> {
    const selected = this.selectedMembers();
    if (selected.length === 0) return;

    const isActive = status === 'active';
    const action = isActive ? 'activate' : 'deactivate';
    
    const confirmed = confirm(`${action} ${selected.length} selected member(s)?`);
    if (!confirmed) return;

    try {
      this.loading$.set(true);
      
      const promises = selected.map(member => 
        this.membershipService.updateMember(member.id, { isActive }).toPromise()
      );

      await Promise.all(promises);
      await this.loadMembers();
      this.clearSelection();
      
      this.showSuccessNotification(`${selected.length} member(s) ${action}d successfully`);
    } catch (error) {
      console.error('Error in bulk status update:', error);
      this.showErrorNotification('Failed to update member status');
    } finally {
      this.loading$.set(false);
    }
  }

  /**
   * Bulk export members
   */
  bulkExportMembers(): void {
    const selected = this.selectedMembers();
    if (selected.length === 0) return;

    const csv = this.convertToCSV(selected);
    this.downloadCSV(csv, `members-bulk-export-${Date.now()}.csv`);
    
    this.showSuccessNotification(`${selected.length} member(s) exported successfully`);
  }

  /**
   * Apply filters method for new UI
   */
  applyFilters(): void {
    // This method is called by the new Material form
    // The filtering is already handled by the computed filteredMembers property
    // We just need to ensure the form values are applied, which happens automatically via signals
    console.log('Filters applied');
  }

  // ===== MISSING TEMPLATE METHODS =====
  
  /**
   * Get empty state message
   */
  getEmptyStateMessage(): string {
    const hasActiveFilters = this.searchQuery() || 
                           this.statusFilter() !== 'all' || 
                           this.tierFilter() !== 'all' ||
                           this.creditStatusFilter() !== 'all';
    
    return hasActiveFilters 
      ? 'No members match the current filters'
      : 'No members found. Add some members to get started.';
  }

  /**
   * Navigation methods for pagination (aliases)
   */
  goToPreviousPage(): void {
    this.previousPage();
  }

  goToNextPage(): void {
    this.nextPage();
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): (number | string)[] {
    return this.getVisiblePages();
  }

  /**
   * Sort by column
   */
  sortBy(column: string): void {
    const currentSort = this.sortBy_signal();
    const currentOrder = this.sortOrder();
    
    if (currentSort === column) {
      // Toggle order
      this.sortOrder.set(currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to asc
      this.sortBy_signal.set(column);
      this.sortOrder.set('asc');
    }
  }

  /**
   * Get credit utilization percentage
   */
  getUtilizationPercentage(member: any): number {
    if (!member.creditLimit || member.creditLimit === 0) return 0;
    return Math.round((member.currentDebt / member.creditLimit) * 100);
  }

  /**
   * Toggle member actions menu
   */
  toggleMemberActions(memberId: number): void {
    const currentId = this.showMemberActions();
    this.showMemberActions.set(currentId === memberId ? null : memberId);
  }

  /**
   * Delete member
   */
  async deleteMember(member: any): Promise<void> {
    const confirmed = confirm(`Are you sure you want to delete member ${member.name}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      this.loading$.set(true);
      await this.membershipService.deleteMember(member.id).toPromise();
      await this.loadMembers();
      this.showSuccessNotification('Member deleted successfully');
    } catch (error) {
      console.error('Error deleting member:', error);
      this.showErrorNotification('Failed to delete member');
    } finally {
      this.loading$.set(false);
    }
  }

  /**
   * Bulk actions aliases
   */
  bulkActivateMembers(): void {
    this.bulkUpdateStatus('active');
  }

  bulkDeactivateMembers(): void {
    this.bulkUpdateStatus('inactive');
  }

  /**
   * Close bulk menu
   */
  closeBulkMenu(): void {
    // Implementation for closing bulk menu
    console.log('Bulk menu closed');
  }

  /**
   * Mobile/Desktop view checks
   */
  isMobileView(): boolean {
    return window.innerWidth <= 768;
  }

  isDesktopView(): boolean {
    return window.innerWidth > 768;
  }

  /**
   * Show member detail (alias)
   */
  showMemberDetail(member: any): void {
    this.openMemberDetailModal(member);
  }

  /**
   * Get avatar icon for tier
   */
  getAvatarIcon(tier: string): string {
    const tierMap: Record<string, string> = {
      'Bronze': '🥉',
      'Silver': '🥈',
      'Gold': '🥇',
      'Platinum': '💎',
      'Diamond': '💍'
    };
    return tierMap[tier] || '👤';
  }
}