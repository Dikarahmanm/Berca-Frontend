// src/app/modules/inventory-transfer/components/transfer-list/transfer-list.component.ts
// Component for displaying and managing inter-branch transfer requests

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { TransferService } from '../../services/transfer.service';
import { StateService } from '../../../../core/services/state.service';
import { 
  TransferRequestDto, 
  TransferFilterDto, 
  TransferStatus, 
  TransferPriority,
  TRANSFER_STATUS_LABELS,
  TRANSFER_PRIORITY_LABELS
} from '../../interfaces/transfer.interfaces';

@Component({
  selector: 'app-transfer-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatBadgeModule,
    MatChipsModule,
    MatProgressBarModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './transfer-list.component.html',
  styleUrls: ['./transfer-list.component.scss']
})
export class TransferListComponent implements OnInit {
  readonly transferService = inject(TransferService);
  private stateService = inject(StateService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Public constants for template access
  readonly TRANSFER_STATUS_LABELS = TRANSFER_STATUS_LABELS;
  readonly TRANSFER_PRIORITY_LABELS = TRANSFER_PRIORITY_LABELS;

  // Signals for reactive state
  currentView = signal<'all' | 'pending' | 'active' | 'completed' | 'my'>('all');
  searchQuery = signal<string>('');
  selectedBranchId = signal<number | null>(null);
  selectedStatus = signal<TransferStatus[]>([]);
  selectedPriority = signal<TransferPriority[]>([]);

  // Filter form
  filterForm: FormGroup = this.fb.group({
    search: [''],
    branchId: [null],
    status: [[]],
    priority: [[]],
    startDate: [null],
    endDate: [null]
  });

  // Data from service
  readonly transfers = this.transferService.transfers;
  readonly loading = this.transferService.loading;
  readonly error = this.transferService.error;
  readonly transferSummary = this.transferService.transferSummary;
  readonly user = this.stateService.user;
  readonly accessibleBranches = this.stateService.accessibleBranches;

  // Computed filtered transfers based on current view
  readonly filteredTransfers = computed(() => {
    const transfers = this.transfers();
    const view = this.currentView();
    const search = this.searchQuery().toLowerCase();
    const branchId = this.selectedBranchId();
    const statusFilters = this.selectedStatus();
    const priorityFilters = this.selectedPriority();
    const user = this.user();

    let filtered = transfers;

    // Filter by view
    switch (view) {
      case 'pending':
        filtered = transfers.filter(t => ['Requested', 'PendingApproval'].includes(t.status));
        break;
      case 'active':
        filtered = transfers.filter(t => ['Approved', 'InPreparation', 'InTransit', 'Delivered'].includes(t.status));
        break;
      case 'completed':
        filtered = transfers.filter(t => ['Completed', 'Cancelled', 'Rejected'].includes(t.status));
        break;
      case 'my':
        filtered = transfers.filter(t => t.requestedBy === user?.id);
        break;
      default:
        filtered = transfers;
    }

    // Apply search filter
    if (search) {
      filtered = filtered.filter(t => 
        t.transferNumber?.toLowerCase().includes(search) ||
        t.sourceBranchName?.toLowerCase().includes(search) ||
        t.targetBranchName?.toLowerCase().includes(search) ||
        t.reason.toLowerCase().includes(search)
      );
    }

    // Apply branch filter
    if (branchId) {
      filtered = filtered.filter(t => 
        t.sourceBranchId === branchId || t.targetBranchId === branchId
      );
    }

    // Apply status filter
    if (statusFilters.length > 0) {
      filtered = filtered.filter(t => statusFilters.includes(t.status));
    }

    // Apply priority filter
    if (priorityFilters.length > 0) {
      filtered = filtered.filter(t => priorityFilters.includes(t.priority));
    }

    return filtered.sort((a, b) => 
      new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
    );
  });

  // Table configuration
  displayedColumns: string[] = [
    'transferNumber',
    'sourceBranch',
    'targetBranch',
    'totalItems',
    'totalValue',
    'priority',
    'status',
    'requestDate',
    'actions'
  ];

  // Status and priority options
  readonly statusOptions = Object.entries(TRANSFER_STATUS_LABELS).map(([key, label]) => ({
    value: key as TransferStatus,
    label
  }));

  readonly priorityOptions = Object.entries(TRANSFER_PRIORITY_LABELS).map(([key, label]) => ({
    value: key as TransferPriority,
    label
  }));

  // Summary cards data
  readonly summaryCards = computed(() => {
    const summary = this.transferSummary();
    return [
      {
        title: 'Total Requests',
        value: summary?.totalRequests || 0,
        icon: 'swap_horiz',
        color: 'primary'
      },
      {
        title: 'Pending Approval',
        value: summary?.pendingApprovals || 0,
        icon: 'pending_actions',
        color: 'warning'
      },
      {
        title: 'In Transit',
        value: summary?.inTransit || 0,
        icon: 'local_shipping',
        color: 'info'
      },
      {
        title: 'Completed',
        value: summary?.completed || 0,
        icon: 'check_circle',
        color: 'success'
      }
    ];
  });

  ngOnInit(): void {
    this.loadTransfers();
    this.loadTransferSummary();
    this.setupFilterFormSubscription();
  }

  private async loadTransfers(): Promise<void> {
    const filter: TransferFilterDto = {
      page: 1,
      pageSize: 100,
      sortBy: 'requestDate',
      sortDirection: 'desc'
    };

    await this.transferService.getTransfers(filter);
  }

  private async loadTransferSummary(): Promise<void> {
    const branchIds = this.accessibleBranches().map(b => b.branchId);
    await this.transferService.getTransferSummary(branchIds);
  }

  private setupFilterFormSubscription(): void {
    this.filterForm.valueChanges.subscribe(values => {
      this.searchQuery.set(values.search || '');
      this.selectedBranchId.set(values.branchId);
      this.selectedStatus.set(values.status || []);
      this.selectedPriority.set(values.priority || []);
    });
  }

  // View change methods
  setView(view: 'all' | 'pending' | 'active' | 'completed' | 'my'): void {
    this.currentView.set(view);
  }

  // Action methods
  createTransfer(): void {
    this.router.navigate(['/dashboard/inventory-transfer/create']);
  }

  viewTransferDetails(transfer: TransferRequestDto): void {
    this.router.navigate(['/dashboard/inventory-transfer/detail', transfer.id]);
  }

  async approveTransfer(transfer: TransferRequestDto): Promise<void> {
    if (!transfer.id) return;

    await this.transferService.updateTransferStatus(transfer.id, {
      status: 'Approved',
      notes: 'Transfer approved'
    });
  }

  async rejectTransfer(transfer: TransferRequestDto): Promise<void> {
    if (!transfer.id) return;

    await this.transferService.updateTransferStatus(transfer.id, {
      status: 'Rejected',
      notes: 'Transfer rejected'
    });
  }

  async cancelTransfer(transfer: TransferRequestDto): Promise<void> {
    if (!transfer.id) return;

    await this.transferService.updateTransferStatus(transfer.id, {
      status: 'Cancelled',
      notes: 'Transfer cancelled by user'
    });
  }

  editTransfer(transfer: TransferRequestDto): void {
    // Only allow editing if transfer is in Draft or Requested status
    if (['Draft', 'Requested'].includes(transfer.status)) {
      this.router.navigate(['/dashboard/inventory-transfer/create'], {
        queryParams: { id: transfer.id }
      });
    }
  }

  duplicateTransfer(transfer: TransferRequestDto): void {
    this.router.navigate(['/dashboard/inventory-transfer/create'], {
      queryParams: { duplicate: transfer.id }
    });
  }

  // Utility methods
  canApprove(transfer: TransferRequestDto): boolean {
    const user = this.user();
    const userPermissions = this.stateService.userPermissions();
    
    return transfer.status === 'PendingApproval' && 
           userPermissions.includes('inventory.approve') &&
           transfer.requestedBy !== user?.id;
  }

  canReject(transfer: TransferRequestDto): boolean {
    const user = this.user();
    const userPermissions = this.stateService.userPermissions();
    
    return transfer.status === 'PendingApproval' && 
           userPermissions.includes('inventory.approve') &&
           transfer.requestedBy !== user?.id;
  }

  canEdit(transfer: TransferRequestDto): boolean {
    const user = this.user();
    return ['Draft', 'Requested'].includes(transfer.status) && 
           transfer.requestedBy === user?.id;
  }

  canCancel(transfer: TransferRequestDto): boolean {
    const user = this.user();
    return ['Draft', 'Requested', 'PendingApproval'].includes(transfer.status) && 
           transfer.requestedBy === user?.id;
  }

  getStatusColor(status: TransferStatus): string {
    return this.transferService.getStatusColor(status);
  }

  getPriorityColor(priority: TransferPriority): string {
    return this.transferService.getPriorityColor(priority);
  }

  formatCurrency(amount: number): string {
    return this.transferService.formatCurrency(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: TransferStatus): string {
    return TRANSFER_STATUS_LABELS[status] || status;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentView.set('all');
  }

  refreshData(): void {
    this.loadTransfers();
    this.loadTransferSummary();
  }

  exportTransfers(): void {
    // TODO: Implement export functionality
    console.log('Export transfers functionality to be implemented');
  }
}