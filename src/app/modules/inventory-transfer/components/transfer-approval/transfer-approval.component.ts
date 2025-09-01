// src/app/modules/inventory-transfer/components/transfer-approval/transfer-approval.component.ts
// Component for bulk transfer approval management

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TransferService } from '../../services/transfer.service';
import { StateService } from '../../../../core/services/state.service';
import { 
  TransferRequestDto, 
  TransferStatus,
  UpdateTransferStatusDto,
  TransferPriority 
} from '../../interfaces/transfer.interfaces';

interface PendingTransfer extends TransferRequestDto {
  selected: boolean;
}

@Component({
  selector: 'app-transfer-approval',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './transfer-approval.component.html',
  styleUrls: ['./transfer-approval.component.scss']
})
export class TransferApprovalComponent implements OnInit {
  private transferService = inject(TransferService);
  private stateService = inject(StateService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Signals for reactive state
  pendingTransfers = signal<PendingTransfer[]>([]);
  isLoading = signal<boolean>(true);
  isProcessing = signal<boolean>(false);
  showBulkApprovalModal = signal<boolean>(false);
  showBulkRejectModal = signal<boolean>(false);

  // Filter states
  selectedPriority = signal<TransferPriority | 'All'>('All');
  selectedBranch = signal<number | null>(null);
  searchQuery = signal<string>('');

  // Current user and permissions
  readonly user = this.stateService.user;
  readonly accessibleBranches = this.stateService.accessibleBranches;

  // Computed properties
  readonly approverBranches = computed(() => {
    return this.accessibleBranches().filter(b => b.canManage);
  });

  readonly filteredTransfers = computed(() => {
    let transfers = this.pendingTransfers();
    
    // Priority filter
    const priority = this.selectedPriority();
    if (priority !== 'All') {
      transfers = transfers.filter(t => t.priority === priority);
    }

    // Branch filter
    const branchId = this.selectedBranch();
    if (branchId) {
      transfers = transfers.filter(t => t.targetBranchId === branchId);
    }

    // Search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      transfers = transfers.filter(t => 
        t.id?.toString().includes(query) ||
        t.reason.toLowerCase().includes(query) ||
        t.requestedByName?.toLowerCase().includes(query)
      );
    }

    return transfers;
  });

  readonly selectedTransfers = computed(() => {
    return this.filteredTransfers().filter(t => t.selected);
  });

  readonly selectedCount = computed(() => {
    return this.selectedTransfers().length;
  });

  readonly allSelected = computed(() => {
    const filtered = this.filteredTransfers();
    return filtered.length > 0 && filtered.every(t => t.selected);
  });

  readonly someSelected = computed(() => {
    const selected = this.selectedCount();
    return selected > 0 && selected < this.filteredTransfers().length;
  });

  // Priority options for filtering
  priorityOptions: (TransferPriority | 'All')[] = ['All', 'Low', 'Medium', 'High', 'Critical'];

  // Forms for bulk actions
  bulkApprovalForm: FormGroup = this.fb.group({
    notes: ['', Validators.required]
  });

  bulkRejectForm: FormGroup = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(10)]]
  });

  ngOnInit(): void {
    this.loadPendingTransfers();
  }

  private async loadPendingTransfers(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      // Load transfers that need approval for branches user can approve
      const approverBranchIds = this.approverBranches().map(b => b.branchId);
      
      const response = await this.transferService.getTransfers({ 
        status: ['PendingApproval'],
        branchIds: approverBranchIds 
      });
      if (response.success) {
        // Filter to only transfers for branches user can approve and add selection state
        const pendingTransfers = response.data
          .filter((t: TransferRequestDto) => approverBranchIds.includes(t.targetBranchId))
          .map((t: TransferRequestDto) => ({ ...t, selected: false }));
        
        this.pendingTransfers.set(pendingTransfers);
      }
    } catch (error) {
      console.error('Error loading pending transfers:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Selection methods
  toggleAll(): void {
    const shouldSelectAll = !this.allSelected();
    this.pendingTransfers.update(transfers => 
      transfers.map(t => {
        const isFiltered = this.filteredTransfers().includes(t);
        return isFiltered ? { ...t, selected: shouldSelectAll } : t;
      })
    );
  }

  toggleTransfer(transferId: number): void {
    this.pendingTransfers.update(transfers =>
      transfers.map(t => 
        t.id === transferId ? { ...t, selected: !t.selected } : t
      )
    );
  }

  selectTransfer(transferId: number): void {
    this.pendingTransfers.update(transfers =>
      transfers.map(t => 
        t.id === transferId ? { ...t, selected: true } : t
      )
    );
  }

  // Filter methods
  onPriorityFilterChange(priority: TransferPriority | 'All'): void {
    this.selectedPriority.set(priority);
  }

  onBranchFilterChange(branchId: number | null): void {
    this.selectedBranch.set(branchId);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  // Individual actions
  async approveTransfer(transfer: PendingTransfer): Promise<void> {
    this.isProcessing.set(true);
    
    try {
      if (!transfer.id) {
        throw new Error('Transfer ID is required');
      }

      const updateDto: UpdateTransferStatusDto = {
        status: 'Approved',
        notes: 'Individually approved'
      };

      const response = await this.transferService.updateTransferStatus(transfer.id, updateDto);
      
      if (response.success) {
        // Remove from pending list
        this.pendingTransfers.update(transfers => 
          transfers.filter(t => t.id !== transfer.id)
        );
      }
    } catch (error) {
      console.error('Error approving transfer:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async rejectTransfer(transfer: PendingTransfer): Promise<void> {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    this.isProcessing.set(true);
    
    try {
      if (!transfer.id) {
        throw new Error('Transfer ID is required');
      }

      const updateDto: UpdateTransferStatusDto = {
        status: 'Rejected',
        notes: reason
      };

      const response = await this.transferService.updateTransferStatus(transfer.id, updateDto);
      
      if (response.success) {
        // Remove from pending list
        this.pendingTransfers.update(transfers => 
          transfers.filter(t => t.id !== transfer.id)
        );
      }
    } catch (error) {
      console.error('Error rejecting transfer:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  // Bulk actions
  openBulkApprovalModal(): void {
    if (this.selectedCount() === 0) return;
    this.showBulkApprovalModal.set(true);
  }

  openBulkRejectModal(): void {
    if (this.selectedCount() === 0) return;
    this.showBulkRejectModal.set(true);
  }

  async submitBulkApproval(): Promise<void> {
    if (!this.bulkApprovalForm.valid || this.selectedCount() === 0) return;

    this.isProcessing.set(true);
    
    try {
      const notes = this.bulkApprovalForm.value.notes;
      const selectedTransfers = this.selectedTransfers();
      
      // Process each transfer individually
      const updatePromises = selectedTransfers.map(async (transfer) => {
        if (!transfer.id) return null;
        
        const updateDto: UpdateTransferStatusDto = {
          status: 'Approved',
          notes
        };
        
        return this.transferService.updateTransferStatus(transfer.id, updateDto);
      });
      
      const responses = await Promise.all(updatePromises);
      const successfulIds = selectedTransfers
        .filter((_, index) => responses[index]?.success)
        .map(t => t.id);
      
      if (successfulIds.length > 0) {
        // Remove approved transfers from pending list
        this.pendingTransfers.update(transfers => 
          transfers.filter(t => !successfulIds.includes(t.id))
        );
        this.closeBulkApprovalModal();
      }
    } catch (error) {
      console.error('Error bulk approving transfers:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async submitBulkRejection(): Promise<void> {
    if (!this.bulkRejectForm.valid || this.selectedCount() === 0) return;

    this.isProcessing.set(true);
    
    try {
      const reason = this.bulkRejectForm.value.reason;
      const selectedTransfers = this.selectedTransfers();
      
      // Process each transfer individually
      const updatePromises = selectedTransfers.map(async (transfer) => {
        if (!transfer.id) return null;
        
        const updateDto: UpdateTransferStatusDto = {
          status: 'Rejected',
          notes: reason
        };
        
        return this.transferService.updateTransferStatus(transfer.id, updateDto);
      });
      
      const responses = await Promise.all(updatePromises);
      const successfulIds = selectedTransfers
        .filter((_, index) => responses[index]?.success)
        .map(t => t.id);
      
      if (successfulIds.length > 0) {
        // Remove rejected transfers from pending list
        this.pendingTransfers.update(transfers => 
          transfers.filter(t => !successfulIds.includes(t.id))
        );
        this.closeBulkRejectModal();
      }
    } catch (error) {
      console.error('Error bulk rejecting transfers:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  // Modal control methods
  closeBulkApprovalModal(): void {
    this.showBulkApprovalModal.set(false);
    this.bulkApprovalForm.reset();
  }

  closeBulkRejectModal(): void {
    this.showBulkRejectModal.set(false);
    this.bulkRejectForm.reset();
  }

  // Navigation methods
  viewTransferDetail(transferId: number): void {
    this.router.navigate(['/dashboard/inventory-transfer/detail', transferId]);
  }

  refreshTransfers(): void {
    this.loadPendingTransfers();
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return this.transferService.formatCurrency(amount);
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('id-ID');
  }

  getBranchName(branchId: number): string {
    const branch = this.accessibleBranches().find(b => b.branchId === branchId);
    return branch?.branchName || 'Unknown Branch';
  }

  getPriorityColor(priority: TransferPriority): string {
    const colors: Record<TransferPriority, string> = {
      'Low': 'info',
      'Medium': 'warning', 
      'High': 'error',
      'Critical': 'error'
    };
    return colors[priority];
  }

  getPriorityIcon(priority: TransferPriority): string {
    const icons: Record<TransferPriority, string> = {
      'Low': 'low_priority',
      'Medium': 'priority_high',
      'High': 'warning',
      'Critical': 'error'
    };
    return icons[priority];
  }

  getTotalQuantity(transfer: PendingTransfer): number {
    return transfer.items.reduce((total, item) => total + item.requestedQuantity, 0);
  }

  getTotalValue(transfer: PendingTransfer): number {
    return transfer.items.reduce((total, item) => total + (item.totalValue || 0), 0);
  }

  // Form validation helpers
  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
    }
    return '';
  }

  // TrackBy functions for performance
  trackByTransfer = (index: number, transfer: PendingTransfer): number => transfer.id || index;
}