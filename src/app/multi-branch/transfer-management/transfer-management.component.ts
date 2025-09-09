import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MultiBranchCoordinationService } from '../../core/services/multi-branch-coordination.service';
import { StateService } from '../../core/services/state.service';
import { Branch } from '../../core/models/branch.models';
import { Subscription } from 'rxjs';

// Transfer Management Interfaces
export interface TransferRequest {
  id: number;
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  productId: number;
  productName: string;
  productSku: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  status: 'pending' | 'approved' | 'rejected' | 'in_transit' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  reason: string;
  notes?: string;
  trackingNumber?: string;
}

export interface TransferSummary {
  totalActive: number;
  pending: number;
  approved: number;
  inTransit: number;
  completed: number;
  rejected: number;
}

@Component({
  selector: 'app-transfer-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './transfer-management.component.html',
  styleUrls: ['./transfer-management.component.scss']
})
export class TransferManagementComponent implements OnInit, OnDestroy {
  // Component state signals
  private readonly _transfers = signal<TransferRequest[]>([]);
  private readonly _selectedTransfer = signal<TransferRequest | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _filterStatus = signal<string>('all');
  private readonly _filterPriority = signal<string>('all');
  private readonly _searchTerm = signal<string>('');
  private readonly _sortBy = signal<string>('requestedAt');
  private readonly _sortOrder = signal<'asc' | 'desc'>('desc');

  // Service dependencies - will be initialized in constructor
  availableBranches: any;
  currentUser: any;
  
  // Component state getters
  transfers = this._transfers.asReadonly();
  selectedTransfer = this._selectedTransfer.asReadonly();
  isLoading = this._isLoading.asReadonly();
  filterStatus = this._filterStatus.asReadonly();
  filterPriority = this._filterPriority.asReadonly();
  searchTerm = this._searchTerm.asReadonly();

  // Computed properties
  filteredTransfers = computed(() => {
    let result = this._transfers();
    
    // Apply status filter
    if (this._filterStatus() !== 'all') {
      result = result.filter(transfer => transfer.status === this._filterStatus());
    }
    
    // Apply priority filter
    if (this._filterPriority() !== 'all') {
      result = result.filter(transfer => transfer.priority === this._filterPriority());
    }
    
    // Apply search filter
    if (this._searchTerm().trim()) {
      const term = this._searchTerm().toLowerCase();
      result = result.filter(transfer => 
        transfer.productName.toLowerCase().includes(term) ||
        transfer.fromBranchName.toLowerCase().includes(term) ||
        transfer.toBranchName.toLowerCase().includes(term) ||
        transfer.trackingNumber?.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    const sortBy = this._sortBy();
    const sortOrder = this._sortOrder();
    
    return result.sort((a, b) => {
      let aValue = a[sortBy as keyof TransferRequest] as any;
      let bValue = b[sortBy as keyof TransferRequest] as any;
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  });

  transferSummary = computed((): TransferSummary => {
    const transfers = this._transfers();
    return {
      totalActive: transfers.filter(t => !['completed', 'cancelled', 'rejected'].includes(t.status)).length,
      pending: transfers.filter(t => t.status === 'pending').length,
      approved: transfers.filter(t => t.status === 'approved').length,
      inTransit: transfers.filter(t => t.status === 'in_transit').length,
      completed: transfers.filter(t => t.status === 'completed').length,
      rejected: transfers.filter(t => t.status === 'rejected').length
    };
  });

  // Form state
  showCreateTransferModal = false;
  showDetailsModal = false;
  newTransferForm = {
    fromBranchId: null as number | null,
    toBranchId: null as number | null,
    productId: null as number | null,
    requestedQuantity: 0,
    priority: 'medium' as const,
    reason: ''
  };

  // Subscriptions
  private subscriptions = new Subscription();

  constructor(
    private coordinationService: MultiBranchCoordinationService,
    private stateService: StateService,
    private router: Router
  ) {
    // Initialize service dependencies
    this.availableBranches = this.stateService.availableBranches;
    this.currentUser = this.stateService.user;
  }

  ngOnInit() {
    this.loadTransfers();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // Data loading methods
  loadTransfers() {
    this._isLoading.set(true);
    
    // Mock data - replace with actual service call
    setTimeout(() => {
      const mockTransfers: TransferRequest[] = [
        {
          id: 1,
          fromBranchId: 2,
          fromBranchName: 'Branch Malang',
          toBranchId: 1,
          toBranchName: 'Head Office Jakarta',
          productId: 101,
          productName: 'Laptop Dell Inspiron 15',
          productSku: 'DELL-INS-15-001',
          requestedQuantity: 5,
          approvedQuantity: 5,
          status: 'approved',
          priority: 'high',
          requestedBy: 'John Manager',
          requestedAt: '2024-01-15T10:30:00Z',
          approvedBy: 'Admin User',
          approvedAt: '2024-01-15T11:00:00Z',
          estimatedDelivery: '2024-01-17T16:00:00Z',
          reason: 'High demand for laptops in Jakarta branch',
          trackingNumber: 'TR-2024-001'
        },
        {
          id: 2,
          fromBranchId: 1,
          fromBranchName: 'Head Office Jakarta',
          toBranchId: 3,
          toBranchName: 'Branch Surabaya',
          productId: 102,
          productName: 'Mouse Wireless Logitech',
          productSku: 'LOG-MS-WL-002',
          requestedQuantity: 20,
          status: 'pending',
          priority: 'medium',
          requestedBy: 'Sarah Coordinator',
          requestedAt: '2024-01-16T09:15:00Z',
          reason: 'Stock shortage for computer accessories'
        },
        {
          id: 3,
          fromBranchId: 3,
          fromBranchName: 'Branch Surabaya',
          toBranchId: 2,
          toBranchName: 'Branch Malang',
          productId: 103,
          productName: 'Smartphone Samsung Galaxy',
          productSku: 'SAM-GAL-A54-003',
          requestedQuantity: 8,
          approvedQuantity: 6,
          status: 'in_transit',
          priority: 'urgent',
          requestedBy: 'Mike Store Manager',
          requestedAt: '2024-01-14T14:20:00Z',
          approvedBy: 'Regional Manager',
          approvedAt: '2024-01-14T15:00:00Z',
          estimatedDelivery: '2024-01-16T12:00:00Z',
          reason: 'Emergency request for promotional campaign',
          trackingNumber: 'TR-2024-002'
        }
      ];
      
      this._transfers.set(mockTransfers);
      this._isLoading.set(false);
    }, 1000);
  }

  // Filter and search methods
  setStatusFilter(status: string) {
    this._filterStatus.set(status);
  }

  onStatusFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.setStatusFilter(target.value);
  }

  setPriorityFilter(priority: string) {
    this._filterPriority.set(priority);
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this._searchTerm.set(target.value);
  }

  setSorting(sortBy: string) {
    if (this._sortBy() === sortBy) {
      this._sortOrder.set(this._sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this._sortBy.set(sortBy);
      this._sortOrder.set('asc');
    }
  }

  // Transfer actions
  approveTransfer(transfer: TransferRequest, approvedQuantity?: number) {
    // Implementation for approving transfer
    console.log('Approving transfer:', transfer.id, 'quantity:', approvedQuantity);
    this.updateTransferStatus(transfer.id, 'approved', { approvedQuantity });
  }

  rejectTransfer(transfer: TransferRequest, reason?: string) {
    // Implementation for rejecting transfer
    console.log('Rejecting transfer:', transfer.id, 'reason:', reason);
    this.updateTransferStatus(transfer.id, 'rejected', { notes: reason });
  }

  markInTransit(transfer: TransferRequest, trackingNumber?: string) {
    // Implementation for marking as in transit
    console.log('Marking in transit:', transfer.id, 'tracking:', trackingNumber);
    this.updateTransferStatus(transfer.id, 'in_transit', { trackingNumber });
  }

  markCompleted(transfer: TransferRequest) {
    // Implementation for marking as completed
    console.log('Marking completed:', transfer.id);
    this.updateTransferStatus(transfer.id, 'completed', { 
      actualDelivery: new Date().toISOString()
    });
  }

  cancelTransfer(transfer: TransferRequest, reason?: string) {
    // Implementation for canceling transfer
    console.log('Canceling transfer:', transfer.id, 'reason:', reason);
    this.updateTransferStatus(transfer.id, 'cancelled', { notes: reason });
  }

  private updateTransferStatus(
    transferId: number, 
    status: TransferRequest['status'], 
    updates?: Partial<TransferRequest>
  ) {
    const transfers = this._transfers();
    const updatedTransfers = transfers.map(transfer => {
      if (transfer.id === transferId) {
        return {
          ...transfer,
          status,
          ...updates,
          ...(status === 'approved' && { approvedAt: new Date().toISOString() }),
          ...(status === 'completed' && { actualDelivery: new Date().toISOString() })
        };
      }
      return transfer;
    });
    
    this._transfers.set(updatedTransfers);
  }

  // Modal methods
  showTransferDetails(transfer: TransferRequest) {
    this._selectedTransfer.set(transfer);
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this._selectedTransfer.set(null);
  }

  openCreateTransferModal() {
    this.showCreateTransferModal = true;
  }

  closeCreateTransferModal() {
    this.showCreateTransferModal = false;
    this.resetCreateForm();
  }

  createTransfer() {
    if (this.isCreateFormValid()) {
      const newTransfer: TransferRequest = {
        id: Math.max(...this._transfers().map(t => t.id)) + 1,
        fromBranchId: this.newTransferForm.fromBranchId!,
        fromBranchName: this.getBranchName(this.newTransferForm.fromBranchId!),
        toBranchId: this.newTransferForm.toBranchId!,
        toBranchName: this.getBranchName(this.newTransferForm.toBranchId!),
        productId: this.newTransferForm.productId!,
        productName: 'Product Name', // Would be fetched from product service
        productSku: 'PROD-SKU-001',
        requestedQuantity: this.newTransferForm.requestedQuantity,
        status: 'pending',
        priority: this.newTransferForm.priority,
        requestedBy: this.currentUser()?.username || 'Unknown',
        requestedAt: new Date().toISOString(),
        reason: this.newTransferForm.reason
      };

      const transfers = this._transfers();
      this._transfers.set([newTransfer, ...transfers]);
      this.closeCreateTransferModal();
    }
  }

  // Utility methods
  private getBranchName(branchId: number): string {
    const branch = this.availableBranches().find((b: Branch) => b.id === branchId);
    return branch?.branchName || 'Unknown Branch';
  }

  private resetCreateForm() {
    this.newTransferForm = {
      fromBranchId: null,
      toBranchId: null,
      productId: null,
      requestedQuantity: 0,
      priority: 'medium',
      reason: ''
    };
  }

  isCreateFormValid(): boolean {
    return !!(
      this.newTransferForm.fromBranchId &&
      this.newTransferForm.toBranchId &&
      this.newTransferForm.productId &&
      this.newTransferForm.requestedQuantity > 0 &&
      this.newTransferForm.reason.trim()
    );
  }

  // Status and priority utilities
  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      in_transit: 'status-in-transit',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return statusMap[status] || 'status-unknown';
  }

  getPriorityClass(priority: string): string {
    const priorityMap: Record<string, string> = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      urgent: 'priority-urgent'
    };
    return priorityMap[priority] || 'priority-unknown';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  canApprove(transfer: TransferRequest): boolean {
    const user = this.currentUser();
    return !!(transfer.status === 'pending' && 
           user?.role && 
           ['Admin', 'Manager', 'HeadManager'].includes(user.role));
  }

  canMarkInTransit(transfer: TransferRequest): boolean {
    return transfer.status === 'approved';
  }

  canMarkCompleted(transfer: TransferRequest): boolean {
    return transfer.status === 'in_transit';
  }

  trackByTransferId(index: number, transfer: TransferRequest): number {
    return transfer.id;
  }

  // ✅ NEW: Export method
  exportTransfers(): void {
    const transfers = this.filteredTransfers();
    const csvContent = this.generateTransferCSV(transfers);
    const filename = `transfers-${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadCSV(csvContent, filename);
  }

  private generateTransferCSV(transfers: TransferRequest[]): string {
    const headers = [
      'ID', 'From Branch', 'To Branch', 'Product', 'Quantity Requested', 
      'Quantity Approved', 'Status', 'Priority', 'Requested By', 'Requested At', 'Reason'
    ];
    
    const rows = transfers.map(transfer => [
      transfer.id,
      transfer.fromBranchName,
      transfer.toBranchName,
      transfer.productName,
      transfer.requestedQuantity,
      transfer.approvedQuantity || 'N/A',
      transfer.status,
      transfer.priority,
      transfer.requestedBy,
      this.formatDate(transfer.requestedAt),
      transfer.reason
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}