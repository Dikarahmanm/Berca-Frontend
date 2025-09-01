// src/app/modules/inventory-transfer/components/transfer-detail/transfer-detail.component.ts
// Component for viewing transfer request details and managing approval workflow

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TransferService } from '../../services/transfer.service';
import { StateService } from '../../../../core/services/state.service';
import { 
  TransferRequestDto, 
  TransferStatus,
  UpdateTransferStatusDto 
} from '../../interfaces/transfer.interfaces';

@Component({
  selector: 'app-transfer-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatBadgeModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './transfer-detail.component.html',
  styleUrls: ['./transfer-detail.component.scss']
})
export class TransferDetailComponent implements OnInit {
  private transferService = inject(TransferService);
  private stateService = inject(StateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Signals for reactive state
  transfer = signal<TransferRequestDto | null>(null);
  isLoading = signal<boolean>(true);
  isProcessing = signal<boolean>(false);
  showApprovalModal = signal<boolean>(false);
  showRejectModal = signal<boolean>(false);

  // Current user and permissions
  readonly user = this.stateService.user;
  readonly accessibleBranches = this.stateService.accessibleBranches;

  // Computed properties
  readonly canApprove = computed(() => {
    const currentTransfer = this.transfer();
    const currentUser = this.user();
    
    if (!currentTransfer || !currentUser) return false;
    
    // Check if user can approve transfers for target branch
    const targetBranch = this.accessibleBranches().find(
      b => b.branchId === currentTransfer.targetBranchId
    );
    
    return targetBranch?.canManage && 
           currentTransfer.status === 'PendingApproval' &&
           currentUser.id !== currentTransfer.requestedBy;
  });

  readonly canCancel = computed(() => {
    const currentTransfer = this.transfer();
    const currentUser = this.user();
    
    if (!currentTransfer || !currentUser) return false;
    
    return (currentTransfer.requestedBy === currentUser.id || 
            this.canApprove()) && 
           ['PendingApproval', 'Approved'].includes(currentTransfer.status);
  });

  readonly canEdit = computed(() => {
    const currentTransfer = this.transfer();
    const currentUser = this.user();
    
    if (!currentTransfer || !currentUser) return false;
    
    return currentTransfer.requestedBy === currentUser.id && 
           currentTransfer.status === 'PendingApproval';
  });

  readonly statusColor = computed(() => {
    const status = this.transfer()?.status;
    const colors: Record<TransferStatus, string> = {
      'Draft': 'secondary',
      'Requested': 'info',
      'PendingApproval': 'warning',
      'Approved': 'success', 
      'Rejected': 'error',
      'InPreparation': 'info',
      'InTransit': 'info',
      'Delivered': 'success',
      'Received': 'success',
      'Completed': 'success',
      'Cancelled': 'secondary',
      'PartiallyReceived': 'warning'
    };
    return colors[status as TransferStatus] || 'secondary';
  });

  readonly totalQuantity = computed(() => {
    const items = this.transfer()?.items || [];
    return items.reduce((total, item) => total + item.requestedQuantity, 0);
  });

  readonly totalValue = computed(() => {
    const items = this.transfer()?.items || [];
    return items.reduce((total, item) => 
      total + (item.totalValue || 0), 0
    );
  });

  // Forms
  approvalForm: FormGroup = this.fb.group({
    action: ['approve', Validators.required],
    notes: ['', Validators.required]
  });

  rejectForm: FormGroup = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(10)]],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadTransferDetails();
  }

  private async loadTransferDetails(): Promise<void> {
    const transferId = this.route.snapshot.params['id'];
    if (!transferId) {
      this.router.navigate(['/dashboard/inventory-transfer']);
      return;
    }

    this.isLoading.set(true);
    
    try {
      const response = await this.transferService.getTransferById(parseInt(transferId));
      if (response.success) {
        this.transfer.set(response.data);
      } else {
        console.error('Failed to load transfer:', response.message);
        // Could navigate back or show error
      }
    } catch (error) {
      console.error('Error loading transfer details:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Action methods
  onApprove(): void {
    this.approvalForm.patchValue({ action: 'approve' });
    this.showApprovalModal.set(true);
  }

  onReject(): void {
    this.showRejectModal.set(true);
  }

  async submitApproval(): Promise<void> {
    if (!this.approvalForm.valid || !this.transfer()) return;

    this.isProcessing.set(true);
    
    try {
      const formValue = this.approvalForm.value;
      const transferId = this.transfer()!.id;
      
      if (!transferId) {
        throw new Error('Transfer ID is required');
      }

      const updateDto: UpdateTransferStatusDto = {
        status: 'Approved',
        notes: formValue.notes
      };

      const response = await this.transferService.updateTransferStatus(transferId, updateDto);
      
      if (response.success) {
        this.showApprovalModal.set(false);
        await this.loadTransferDetails(); // Reload to get updated data
      }
    } catch (error) {
      console.error('Error approving transfer:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async submitRejection(): Promise<void> {
    if (!this.rejectForm.valid || !this.transfer()) return;

    this.isProcessing.set(true);
    
    try {
      const formValue = this.rejectForm.value;
      const transferId = this.transfer()!.id;
      
      if (!transferId) {
        throw new Error('Transfer ID is required');
      }

      const updateDto: UpdateTransferStatusDto = {
        status: 'Rejected',
        notes: formValue.reason
      };

      const response = await this.transferService.updateTransferStatus(transferId, updateDto);
      
      if (response.success) {
        this.showRejectModal.set(false);
        await this.loadTransferDetails(); // Reload to get updated data
      }
    } catch (error) {
      console.error('Error rejecting transfer:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async cancelTransfer(): Promise<void> {
    if (!this.transfer() || !confirm('Are you sure you want to cancel this transfer?')) {
      return;
    }

    this.isProcessing.set(true);
    
    try {
      const transferId = this.transfer()!.id;
      
      if (!transferId) {
        throw new Error('Transfer ID is required');
      }

      const updateDto: UpdateTransferStatusDto = {
        status: 'Cancelled',
        notes: 'Transfer cancelled by user'
      };

      const response = await this.transferService.updateTransferStatus(transferId, updateDto);
      
      if (response.success) {
        await this.loadTransferDetails(); // Reload to get updated data
      }
    } catch (error) {
      console.error('Error cancelling transfer:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  // Navigation methods
  editTransfer(): void {
    const transferId = this.transfer()?.id;
    if (transferId) {
      this.router.navigate(['/dashboard/inventory-transfer/create'], {
        queryParams: { id: transferId }
      });
    }
  }

  duplicateTransfer(): void {
    const transferId = this.transfer()?.id;
    if (transferId) {
      this.router.navigate(['/dashboard/inventory-transfer/create'], {
        queryParams: { duplicate: transferId }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/inventory-transfer']);
  }

  // Modal control methods
  closeApprovalModal(): void {
    this.showApprovalModal.set(false);
    this.approvalForm.reset();
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.rejectForm.reset();
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

  getStatusIcon(status: TransferStatus): string {
    const icons: Record<TransferStatus, string> = {
      'Draft': 'edit',
      'Requested': 'send',
      'PendingApproval': 'schedule',
      'Approved': 'check_circle',
      'Rejected': 'cancel',
      'InPreparation': 'inventory',
      'InTransit': 'local_shipping',
      'Delivered': 'done',
      'Received': 'inventory_2',
      'Completed': 'done_all',
      'Cancelled': 'block',
      'PartiallyReceived': 'partial_fulfillment'
    };
    return icons[status] || 'help';
  }

  getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      'Low': 'low_priority',
      'Medium': 'priority_high',
      'High': 'warning',
      'Critical': 'error'
    };
    return icons[priority] || 'help';
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'Low': 'info',
      'Medium': 'warning', 
      'High': 'error',
      'Critical': 'error'
    };
    return colors[priority] || 'secondary';
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
  trackByItem = (index: number, item: any): number => item.id || index;
}