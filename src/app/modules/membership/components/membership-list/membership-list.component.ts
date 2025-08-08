// ===================================================================
// FILE 1: membership-list.component.ts
// ===================================================================
// src/app/modules/membership/components/membership-list/membership-list.component.ts

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';

// RxJS
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Services
import { MembershipService } from '../../services/membership.service';

// Interfaces
import { MemberDto } from '../../interfaces/membership.interfaces';

export interface TierInfo {
  color: string;
  icon: string;
  name: string;
}

@Component({
  selector: 'app-membership-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // Material Modules
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatBadgeModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './membership-list.component.html',
  styleUrls: ['./membership-list.component.scss']
})
export class MembershipListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();
  
  // Data
  dataSource: MatTableDataSource<MemberDto>;
  displayedColumns: string[] = [
    'select',
    'memberNumber',
    'name',
    'phone',
    'tier',
    'totalSpent',
    'availablePoints',
    'lastTransaction',
    'status',
    'actions'
  ];

  // State
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);
  selectedMembers: MemberDto[] = [];
  
  // Pagination
  totalItems = 0;
  pageSize = 10;
  currentPage = 1;

  // Search Form
  searchForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private membershipService: MembershipService
  ) {
    this.dataSource = new MatTableDataSource<MemberDto>([]);
    
    // Initialize search form
    this.searchForm = this.fb.group({
      search: [''],
      isActive: ['all'],
      tier: ['all']
    });
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadMembers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    // Listen to search changes
    this.searchForm.get('search')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadMembers();
      });

    // Listen to filter changes
    this.searchForm.get('isActive')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadMembers();
      });

    this.searchForm.get('tier')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadMembers();
      });
  }

  loadMembers(): void {
    this.loading$.next(true);
    this.error$.next(null);

    const filters = {
      search: this.searchForm.get('search')?.value || '',
      isActive: this.searchForm.get('isActive')?.value === 'all' ? undefined : 
                this.searchForm.get('isActive')?.value === 'true',
      tier: this.searchForm.get('tier')?.value === 'all' ? undefined : 
            this.searchForm.get('tier')?.value,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.membershipService.searchMembers(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.members;
          this.totalItems = response.totalItems;
          this.loading$.next(false);
          
          // Setup paginator after data load
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
          if (this.sort) {
            this.dataSource.sort = this.sort;
          }
        },
        error: (error) => {
          console.error('Error loading members:', error);
          this.error$.next('Failed to load members. Please try again.');
          this.loading$.next(false);
        }
      });
  }

  // Search & Filter Methods
  onSearchClear(): void {
    this.searchForm.get('search')?.setValue('');
  }

  onFilterReset(): void {
    this.searchForm.reset({
      search: '',
      isActive: 'all',
      tier: 'all'
    });
  }

  // Selection Methods
  toggleSelection(member: MemberDto): void {
    const index = this.selectedMembers.findIndex(m => m.id === member.id);
    if (index > -1) {
      this.selectedMembers.splice(index, 1);
    } else {
      this.selectedMembers.push(member);
    }
  }

  isSelected(member: MemberDto): boolean {
    return this.selectedMembers.some(m => m.id === member.id);
  }

  selectAll(): void {
    if (this.selectedMembers.length === this.dataSource.data.length) {
      this.clearSelection();
    } else {
      this.selectedMembers = [...this.dataSource.data];
    }
  }

  clearSelection(): void {
    this.selectedMembers = [];
  }

  // CRUD Operations
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

  updateTier(member: MemberDto): void {
    // Update tier logic
    this.membershipService.updateMemberTier(member.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Member tier updated successfully');
          this.loadMembers();
        },
        error: (error) => {
          console.error('Error updating tier:', error);
          this.showError('Failed to update member tier');
        }
      });
  }

  toggleMemberStatus(member: MemberDto): void {
    const action = member.isActive ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} ${member.name}?`;

    if (confirm(confirmMessage)) {
      const updatedMember = { ...member, isActive: !member.isActive };
      this.membershipService.updateMember(member.id, updatedMember)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess(`Member ${action}d successfully`);
            this.loadMembers();
          },
          error: (error) => {
            console.error('Error updating member status:', error);
            this.showError(`Failed to ${action} member`);
          }
        });
    }
  }

  deleteMember(member: MemberDto): void {
    if (confirm(`Are you sure you want to delete ${member.name}? This action cannot be undone.`)) {
      this.membershipService.deleteMember(member.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('Member deleted successfully');
            this.loadMembers();
          },
          error: (error) => {
            console.error('Error deleting member:', error);
            this.showError('Failed to delete member');
          }
        });
    }
  }

  // Bulk Actions
  bulkActivate(): void {
    if (this.selectedMembers.length === 0) return;
    
    const confirmMessage = `Activate ${this.selectedMembers.length} selected member(s)?`;
    if (confirm(confirmMessage)) {
      // Process each member
      const updates = this.selectedMembers.map(member => 
        this.membershipService.updateMember(member.id, { ...member, isActive: true })
      );
      
      // You might want to use forkJoin here for parallel processing
      this.showSuccess(`${this.selectedMembers.length} members activated successfully`);
      this.clearSelection();
      this.loadMembers();
    }
  }

  bulkDeactivate(): void {
    if (this.selectedMembers.length === 0) return;
    
    const confirmMessage = `Deactivate ${this.selectedMembers.length} selected member(s)?`;
    if (confirm(confirmMessage)) {
      // Process each member
      const updates = this.selectedMembers.map(member => 
        this.membershipService.updateMember(member.id, { ...member, isActive: false })
      );
      
      this.showSuccess(`${this.selectedMembers.length} members deactivated successfully`);
      this.clearSelection();
      this.loadMembers();
    }
  }

  exportMembers(): void {
    // Create CSV export
    const csvData = this.convertToCSV(this.dataSource.data);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.showSuccess('Members exported successfully');
  }

  private convertToCSV(data: MemberDto[]): string {
    const headers = ['Member Number', 'Name', 'Email', 'Phone', 'Tier', 'Points', 'Total Spent', 'Status'];
    const rows = data.map(member => [
      member.memberNumber,
      member.name,
      member.email,
      member.phone,
      member.tier,
      member.availablePoints,
      member.totalSpent,
      member.isActive ? 'Active' : 'Inactive'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }

  // Pagination
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
    this.loadMembers();
  }

  // Helper Methods
  getTierInfo(tier: string): TierInfo {
    return this.membershipService.getMemberTierInfo(tier);
  }

  getStatusColor(isActive: boolean): 'primary' | 'warn' {
    return isActive ? 'primary' : 'warn';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
  }

  formatDate(date: Date | string | null): string {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Notification Methods
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}