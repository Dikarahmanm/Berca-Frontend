// import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Router } from '@angular/router';
// import { MatIconModule } from '@angular/material/icon';
// import { MatCardModule } from '@angular/material/card';
// import { MatButtonModule } from '@angular/material/button';
// import { MatTabsModule } from '@angular/material/tabs';
// import { MatBadgeModule } from '@angular/material/badge';
// import { MatChipsModule } from '@angular/material/chips';
// import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// import { MatSelectModule } from '@angular/material/select';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatInputModule } from '@angular/material/input';
// import { MatTableModule } from '@angular/material/table';
// import { MatMenuModule } from '@angular/material/menu';
// import { MatTooltipModule } from '@angular/material/tooltip';
// import { MultiBranchCoordinationService } from '../../core/services/multi-branch-coordination.service';
// import { StateService } from '../../core/services/state.service';
// import { Subject, takeUntil, interval, Subscription } from 'rxjs';

// // Real API Transfer interfaces
// export interface TransferRequest {
//   id?: number;
//   sourceBranchId: number;
//   sourceBranchName?: string;
//   targetBranchId: number;
//   targetBranchName?: string;
//   productId: number;
//   productName?: string;
//   productSku?: string;
//   requestedQuantity: number;
//   approvedQuantity?: number;
//   urgency: 'low' | 'medium' | 'high' | 'critical';
//   reason: string;
//   expectedDelivery?: string;
//   estimatedCost?: number;
//   status: 'pending' | 'approved' | 'rejected' | 'in_transit' | 'completed' | 'cancelled';
//   priority: 'low' | 'medium' | 'high' | 'urgent';
//   createdAt: string;
//   updatedAt: string;
//   createdBy: number;
//   approvedBy?: number;
//   notes?: string;
//   trackingNumber?: string;
//   actualCost?: number;
//   completedAt?: string;
// }

// export interface TransferMetrics {
//   totalTransfers: number;
//   pendingTransfers: number;
//   inTransitTransfers: number;
//   completedTransfers: number;
//   totalValue: number;
//   averageTime: number;
//   successRate: number;
//   criticalTransfers: number;
// }

// @Component({
//   selector: 'app-transfer-management',
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     MatIconModule,
//     MatCardModule,
//     MatButtonModule,
//     MatTabsModule,
//     MatBadgeModule,
//     MatChipsModule,
//     MatProgressSpinnerModule,
//     MatSelectModule,
//     MatFormFieldModule,
//     MatInputModule,
//     MatTableModule,
//     MatMenuModule,
//     MatTooltipModule
//   ],
//   templateUrl: './transfer-management.component.html',
//   styleUrls: ['./transfer-management.component.scss'],
//   changeDetection: ChangeDetectionStrategy.OnPush
// })
// export class TransferManagementComponent implements OnInit, OnDestroy {
//   private readonly destroy$ = new Subject<void>();
  
//   // Injected services
//   private readonly coordinationService = inject(MultiBranchCoordinationService);
//   private readonly stateService = inject(StateService);
//   private readonly router = inject(Router);

//   // Component signals for real data
//   private readonly _transfers = signal<TransferRequest[]>([]);
//   private readonly _transferMetrics = signal<TransferMetrics | null>(null);
//   private readonly _selectedTransfer = signal<TransferRequest | null>(null);
//   private readonly _isLoading = signal<boolean>(false);
//   private readonly _error = signal<string | null>(null);
//   private readonly _filterStatus = signal<string>('all');
//   private readonly _filterPriority = signal<string>('all');
//   private readonly _searchTerm = signal<string>('');
//   private readonly _sortBy = signal<string>('createdAt');
//   private readonly _sortOrder = signal<'asc' | 'desc'>('desc');
  
//   // Public readonly signals
//   readonly transfers = this._transfers.asReadonly();
//   readonly transferMetrics = this._transferMetrics.asReadonly();
//   readonly selectedTransfer = this._selectedTransfer.asReadonly();
//   readonly isLoading = this._isLoading.asReadonly();
//   readonly error = this._error.asReadonly();
//   readonly filterStatus = this._filterStatus.asReadonly();
//   readonly filterPriority = this._filterPriority.asReadonly();
//   readonly searchTerm = this._searchTerm.asReadonly();

//   // Service signals
//   readonly transferRecommendations = this.coordinationService.transferRecommendations;
//   readonly criticalRecommendations = this.coordinationService.criticalRecommendations;
//   readonly selectedBranchId = this.stateService.selectedBranchId;
//   readonly user = this.stateService.user;

//   // Computed properties
//   filteredTransfers = computed(() => {
//     let result = this._transfers();
    
//     // Apply status filter
//     if (this._filterStatus() !== 'all') {
//       result = result.filter(transfer => transfer.status === this._filterStatus());
//     }
    
//     // Apply priority filter
//     if (this._filterPriority() !== 'all') {
//       result = result.filter(transfer => transfer.priority === this._filterPriority());
//     }
    
//     // Apply search filter
//     if (this._searchTerm().trim()) {
//       const term = this._searchTerm().toLowerCase();
//       result = result.filter(transfer => 
//         transfer.productName?.toLowerCase().includes(term) ||
//         transfer.sourceBranchName?.toLowerCase().includes(term) ||
//         transfer.targetBranchName?.toLowerCase().includes(term) ||
//         transfer.trackingNumber?.toLowerCase().includes(term)
//       );
//     }
    
//     // Apply sorting
//     const sortBy = this._sortBy();
//     const sortOrder = this._sortOrder();
    
//     return result.sort((a, b) => {
//       let aValue = a[sortBy as keyof TransferRequest] as any;
//       let bValue = b[sortBy as keyof TransferRequest] as any;
      
//       if (typeof aValue === 'string') {
//         aValue = aValue.toLowerCase();
//         bValue = bValue.toLowerCase();
//       }
      
//       const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
//       return sortOrder === 'asc' ? comparison : -comparison;
//     });
//   });

//   // Computed properties for real API data
//   readonly pendingApprovals = computed(() => 
//     this._transfers().filter(t => t.status === 'pending' && this.canApproveTransfer(t))
//   );

//   readonly inTransitTransfers = computed(() => 
//     this._transfers().filter(t => t.status === 'in_transit')
//   );

//   readonly criticalTransfers = computed(() => 
//     this._transfers().filter(t => t.urgency === 'critical' && t.status !== 'completed')
//   );

//   readonly transferStatusCounts = computed(() => {
//     const transfers = this._transfers();
//     return {
//       pending: transfers.filter(t => t.status === 'pending').length,
//       approved: transfers.filter(t => t.status === 'approved').length,
//       in_transit: transfers.filter(t => t.status === 'in_transit').length,
//       completed: transfers.filter(t => t.status === 'completed').length,
//       rejected: transfers.filter(t => t.status === 'rejected').length,
//       cancelled: transfers.filter(t => t.status === 'cancelled').length
//     };
//   });

//   // Filter options
//   readonly statusOptions = [
//     { value: 'all', label: 'All Transfers', icon: 'list' },
//     { value: 'pending', label: 'Pending', icon: 'pending' },
//     { value: 'approved', label: 'Approved', icon: 'check_circle' },
//     { value: 'in_transit', label: 'In Transit', icon: 'local_shipping' },
//     { value: 'completed', label: 'Completed', icon: 'done_all' },
//     { value: 'rejected', label: 'Rejected', icon: 'cancel' }
//   ];

//   // Table columns
//   readonly displayedColumns: string[] = [
//     'id', 'product', 'source', 'target', 'quantity', 
//     'urgency', 'status', 'created', 'actions'
//   ];

//   // Form state
//   showCreateTransferModal = false;
//   showDetailsModal = false;
//   newTransferForm = {
//     fromBranchId: null as number | null,
//     toBranchId: null as number | null,
//     productId: null as number | null,
//     requestedQuantity: 0,
//     priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
//     reason: ''
//   };

//   // Subscriptions
//   private subscriptions = new Subscription();

//   ngOnInit(): void {
//     console.log('🚛 TransferManagement component initialized');
//     this.loadTransfers();
//     this.loadTransferMetrics();
//     this.startRealtimeUpdates();
//   }

//   ngOnDestroy(): void {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   /**
//    * Load transfers from real API
//    */
//   private loadTransfers(): void {
//     console.log('🚛 Loading transfers from API...');
//     this._isLoading.set(true);
//     this._error.set(null);

//     // Call real API - MultiBranchCoordinationController
//     this.coordinationService.getTransferRequests()
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (transfers) => {
//           console.log('✅ Transfers loaded:', transfers.length);
//           this._transfers.set(transfers);
//           this._isLoading.set(false);
//         },
//         error: (error) => {
//           console.error('❌ Failed to load transfers:', error);
//           this._error.set('Failed to load transfers. Please try again.');
//           this._isLoading.set(false);
//         }
//       });
//   }

//   /**
//    * Load transfer metrics from real API
//    */
//   private loadTransferMetrics(): void {
//     console.log('🚛 Loading transfer metrics from API...');
    
//     this.coordinationService.getTransferMetrics()
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (metrics) => {
//           console.log('✅ Transfer metrics loaded:', metrics);
//           this._transferMetrics.set(metrics);
//         },
//         error: (error) => {
//           console.error('❌ Failed to load transfer metrics:', error);
//         }
//       });
//   }

//   /**
//    * Start real-time updates every 30 seconds
//    */
//   private startRealtimeUpdates(): void {
//     console.log('🔄 Starting real-time transfer updates...');
    
//     interval(30000) // 30 seconds
//       .pipe(takeUntil(this.destroy$))
//       .subscribe(() => {
//         if (!this._isLoading()) {
//           this.loadTransfers();
//           this.loadTransferMetrics();
//         }
//       });
//   }

//   // Filter and search methods
//   setStatusFilter(status: string) {
//     this._filterStatus.set(status);
//   }

//   onStatusFilterChange(event: Event) {
//     const target = event.target as HTMLSelectElement;
//     this.setStatusFilter(target.value);
//   }

//   setPriorityFilter(priority: string) {
//     this._filterPriority.set(priority);
//   }

//   onSearchChange(event: Event) {
//     const target = event.target as HTMLInputElement;
//     this._searchTerm.set(target.value);
//   }

//   setSorting(sortBy: string) {
//     if (this._sortBy() === sortBy) {
//       this._sortOrder.set(this._sortOrder() === 'asc' ? 'desc' : 'asc');
//     } else {
//       this._sortBy.set(sortBy);
//       this._sortOrder.set('asc');
//     }
//   }

//   /**
//    * Approve transfer request using real API
//    */
//   approveTransfer(transfer: TransferRequest): void {
//     console.log('✅ Approving transfer:', transfer.id);
    
//     if (!this.canApproveTransfer(transfer)) {
//       this._error.set('You do not have permission to approve this transfer.');
//       return;
//     }

//     this.coordinationService.approveTransfer(transfer.id!, transfer.requestedQuantity)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (result) => {
//           console.log('✅ Transfer approved:', result);
//           this.loadTransfers(); // Refresh data
//         },
//         error: (error) => {
//           console.error('❌ Failed to approve transfer:', error);
//           this._error.set('Failed to approve transfer.');
//         }
//       });
//   }

//   /**
//    * Reject transfer request using real API
//    */
//   rejectTransfer(transfer: TransferRequest): void {
//     const reason = prompt('Please provide a reason for rejection:');
//     if (!reason) return;

//     console.log('❌ Rejecting transfer:', transfer.id, 'Reason:', reason);

//     this.coordinationService.rejectTransfer(transfer.id!, reason)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (result) => {
//           console.log('✅ Transfer rejected:', result);
//           this.loadTransfers(); // Refresh data
//         },
//         error: (error) => {
//           console.error('❌ Failed to reject transfer:', error);
//           this._error.set('Failed to reject transfer.');
//         }
//       });
//   }

//   /**
//    * Mark transfer as in transit using real API
//    */
//   markInTransit(transfer: TransferRequest): void {
//     const trackingNumber = prompt('Enter tracking number (optional):');
    
//     console.log('🚚 Marking transfer as in transit:', transfer.id);

//     this.coordinationService.markTransferInTransit(transfer.id!, trackingNumber || undefined)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (result) => {
//           console.log('✅ Transfer marked in transit:', result);
//           this.loadTransfers(); // Refresh data
//         },
//         error: (error) => {
//           console.error('❌ Failed to mark transfer in transit:', error);
//           this._error.set('Failed to update transfer status.');
//         }
//       });
//   }

//   /**
//    * Complete transfer using real API
//    */
//   markCompleted(transfer: TransferRequest): void {
//     console.log('✅ Completing transfer:', transfer.id);

//     this.coordinationService.completeTransfer(transfer.id!)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (result) => {
//           console.log('✅ Transfer completed:', result);
//           this.loadTransfers(); // Refresh data
//         },
//         error: (error) => {
//           console.error('❌ Failed to complete transfer:', error);
//           this._error.set('Failed to complete transfer.');
//         }
//       });
//   }

//   /**
//    * Cancel transfer request using real API
//    */
//   cancelTransfer(transfer: TransferRequest): void {
//     if (!confirm('Are you sure you want to cancel this transfer?')) return;

//     console.log('🚫 Cancelling transfer:', transfer.id);

//     this.coordinationService.cancelTransfer(transfer.id!)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (result) => {
//           console.log('✅ Transfer cancelled:', result);
//           this.loadTransfers(); // Refresh data
//         },
//         error: (error) => {
//           console.error('❌ Failed to cancel transfer:', error);
//           this._error.set('Failed to cancel transfer.');
//         }
//       });
//   }

//   /**
//    * Create new transfer from recommendation
//    */
//   createFromRecommendation(recommendation: any): void {
//     console.log('🚛 Creating transfer from recommendation:', recommendation);
    
//     const transferRequest: Partial<TransferRequest> = {
//       sourceBranchId: recommendation.sourceBranchId,
//       targetBranchId: recommendation.targetBranchId,
//       productId: recommendation.productId,
//       requestedQuantity: recommendation.recommendedQuantity,
//       urgency: recommendation.urgencyLevel.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
//       reason: `AI Recommendation: ${recommendation.reasoning}`,
//       priority: recommendation.urgencyLevel.toLowerCase() as 'low' | 'medium' | 'high' | 'urgent'
//     };

//     this.coordinationService.createTransferRequestObservable(transferRequest)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (result: any) => {
//           console.log('✅ Transfer created from recommendation:', result);
//           this.loadTransfers(); // Refresh data
//         },
//         error: (error: any) => {
//           console.error('❌ Failed to create transfer:', error);
//           this._error.set('Failed to create transfer from recommendation.');
//         }
//       });
//   }

//   private updateTransferStatus(
//     transferId: number, 
//     status: TransferRequest['status'], 
//     updates?: Partial<TransferRequest>
//   ) {
//     const transfers = this._transfers();
//     const updatedTransfers = transfers.map(transfer => {
//       if (transfer.id === transferId) {
//         return {
//           ...transfer,
//           status,
//           ...updates,
//           ...(status === 'approved' && { approvedAt: new Date().toISOString() }),
//           ...(status === 'completed' && { actualDelivery: new Date().toISOString() })
//         };
//       }
//       return transfer;
//     });
    
//     this._transfers.set(updatedTransfers);
//   }

//   // Modal methods
//   showTransferDetails(transfer: TransferRequest) {
//     this._selectedTransfer.set(transfer);
//     this.showDetailsModal = true;
//   }

//   closeDetailsModal() {
//     this.showDetailsModal = false;
//     this._selectedTransfer.set(null);
//   }

//   openCreateTransferModal() {
//     this.showCreateTransferModal = true;
//   }

//   closeCreateTransferModal() {
//     this.showCreateTransferModal = false;
//     this.resetCreateForm();
//   }

//   createTransfer() {
//     if (this.isCreateFormValid()) {
//       const newTransfer: TransferRequest = {
//         id: Math.max(...this._transfers().map(t => t.id || 0)) + 1,
//         sourceBranchId: this.newTransferForm.fromBranchId!,
//         sourceBranchName: this.getBranchName(this.newTransferForm.fromBranchId!),
//         targetBranchId: this.newTransferForm.toBranchId!,
//         targetBranchName: this.getBranchName(this.newTransferForm.toBranchId!),
//         productId: this.newTransferForm.productId!,
//         productName: 'Product Name', // Would be fetched from product service
//         productSku: 'PROD-SKU-001',
//         requestedQuantity: this.newTransferForm.requestedQuantity,
//         status: 'pending',
//         priority: this.newTransferForm.priority,
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//         createdBy: 1, // Would be current user ID
//         urgency: this.newTransferForm.priority === 'urgent' ? 'critical' : 
//                  this.newTransferForm.priority === 'high' ? 'high' : 'medium',
//         reason: this.newTransferForm.reason
//       };

//       const transfers = this._transfers();
//       this._transfers.set([newTransfer, ...transfers]);
//       this.closeCreateTransferModal();
//     }
//   }

//   // Utility methods
//   private getBranchName(branchId: number): string {
//     // Since we don't have availableBranches signal here, return a default name
//     return `Branch ${branchId}`;
//   }

//   private resetCreateForm() {
//     this.newTransferForm = {
//       fromBranchId: null,
//       toBranchId: null,
//       productId: null,
//       requestedQuantity: 0,
//       priority: 'medium',
//       reason: ''
//     };
//   }

//   isCreateFormValid(): boolean {
//     return !!(
//       this.newTransferForm.fromBranchId &&
//       this.newTransferForm.toBranchId &&
//       this.newTransferForm.productId &&
//       this.newTransferForm.requestedQuantity > 0 &&
//       this.newTransferForm.reason.trim()
//     );
//   }

//   // Status and priority utilities
//   getStatusClass(status: string): string {
//     const statusMap: Record<string, string> = {
//       pending: 'status-pending',
//       approved: 'status-approved',
//       rejected: 'status-rejected',
//       in_transit: 'status-in-transit',
//       completed: 'status-completed',
//       cancelled: 'status-cancelled'
//     };
//     return statusMap[status] || 'status-unknown';
//   }

//   getPriorityClass(priority: string): string {
//     const priorityMap: Record<string, string> = {
//       low: 'priority-low',
//       medium: 'priority-medium',
//       high: 'priority-high',
//       urgent: 'priority-urgent'
//     };
//     return priorityMap[priority] || 'priority-unknown';
//   }

//   formatDate(dateString: string): string {
//     return new Date(dateString).toLocaleString();
//   }

//   /**
//    * Check if user can approve transfer
//    */
//   canApproveTransfer(transfer: TransferRequest): boolean {
//     const user = this.user();
//     const selectedBranchId = this.selectedBranchId();
    
//     if (!user || !selectedBranchId) return false;

//     // Can approve if user is manager of source branch
//     return ['Manager', 'BranchManager', 'Admin'].includes(user.role) && 
//            transfer.sourceBranchId === selectedBranchId;
//   }

//   /**
//    * Check if user can manage transfer
//    */
//   canManageTransfer(transfer: TransferRequest): boolean {
//     const user = this.user();
//     const selectedBranchId = this.selectedBranchId();
    
//     if (!user || !selectedBranchId) return false;

//     return ['Manager', 'BranchManager', 'Admin'].includes(user.role) && 
//            (transfer.sourceBranchId === selectedBranchId || transfer.targetBranchId === selectedBranchId);
//   }

//   canMarkInTransit(transfer: TransferRequest): boolean {
//     return transfer.status === 'approved' && this.canManageTransfer(transfer);
//   }

//   canMarkCompleted(transfer: TransferRequest): boolean {
//     return transfer.status === 'in_transit' && this.canManageTransfer(transfer);
//   }

//   /**
//    * Refresh all data
//    */
//   refresh(): void {
//     console.log('🔄 Refreshing transfer data...');
//     this.loadTransfers();
//     this.loadTransferMetrics();
//     this.coordinationService.refreshAllData();
//   }

//   /**
//    * Clear error
//    */
//   clearError(): void {
//     this._error.set(null);
//   }

//   /**
//    * Get status color class
//    */
//   getStatusColor(status: string): string {
//     const colors = {
//       pending: 'text-yellow-600 bg-yellow-100',
//       approved: 'text-blue-600 bg-blue-100',
//       in_transit: 'text-purple-600 bg-purple-100',
//       completed: 'text-green-600 bg-green-100',
//       rejected: 'text-red-600 bg-red-100',
//       cancelled: 'text-gray-600 bg-gray-100'
//     };
//     return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
//   }

//   /**
//    * Get urgency color class
//    */
//   getUrgencyColor(urgency: string): string {
//     const colors = {
//       critical: 'text-red-600 bg-red-100',
//       high: 'text-orange-600 bg-orange-100',
//       medium: 'text-yellow-600 bg-yellow-100',
//       low: 'text-green-600 bg-green-100'
//     };
//     return colors[urgency as keyof typeof colors] || 'text-gray-600 bg-gray-100';
//   }

//   /**
//    * Get priority color class
//    */
//   getPriorityColor(priority: string): string {
//     const colors = {
//       urgent: 'text-red-600 bg-red-100 animate-pulse',
//       high: 'text-red-600 bg-red-100',
//       medium: 'text-yellow-600 bg-yellow-100',
//       low: 'text-green-600 bg-green-100'
//     };
//     return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-100';
//   }

//   /**
//    * Format currency
//    */
//   formatCurrency(amount: number): string {
//     return new Intl.NumberFormat('id-ID', {
//       style: 'currency',
//       currency: 'IDR',
//       minimumFractionDigits: 0
//     }).format(amount);
//   }

//   /**
//    * Format date
//    */
//   formatDate(dateString: string): string {
//     return new Date(dateString).toLocaleDateString('id-ID', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric'
//     });
//   }

//   /**
//    * Format relative time
//    */
//   formatRelativeTime(dateString: string): string {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
//     if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
//     if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
//     return `${Math.floor(diffInMinutes / 1440)} days ago`;
//   }

//   trackByTransferId(index: number, transfer: TransferRequest): number {
//     return transfer.id!;
//   }

//   trackByRecommendationId(index: number, recommendation: any): string {
//     return recommendation.id || index.toString();
//   }

//   // ✅ Export method
//   exportTransfers(): void {
//     const transfers = this.filteredTransfers();
//     const csvContent = this.generateTransferCSV(transfers);
//     const filename = `transfers-${new Date().toISOString().split('T')[0]}.csv`;
//     this.downloadCSV(csvContent, filename);
//   }

//   private generateTransferCSV(transfers: TransferRequest[]): string {
//     const headers = [
//       'ID', 'Source Branch', 'Target Branch', 'Product', 'SKU', 'Quantity Requested', 
//       'Quantity Approved', 'Status', 'Priority', 'Urgency', 'Created At', 'Reason'
//     ];
    
//     const rows = transfers.map(transfer => [
//       transfer.id || 'N/A',
//       transfer.sourceBranchName || 'N/A',
//       transfer.targetBranchName || 'N/A',
//       transfer.productName || 'N/A',
//       transfer.productSku || 'N/A',
//       transfer.requestedQuantity,
//       transfer.approvedQuantity || 'N/A',
//       transfer.status,
//       transfer.priority,
//       transfer.urgency,
//       this.formatDate(transfer.createdAt),
//       transfer.reason
//     ]);
    
//     const csvContent = [headers, ...rows]
//       .map(row => row.map(cell => `"${cell}"`).join(','))
//       .join('\n');
    
//     return csvContent;
//   }

//   private downloadCSV(content: string, filename: string): void {
//     const blob = new Blob([content], { type: 'text/csv' });
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = filename;
//     link.click();
//     window.URL.revokeObjectURL(url);
//   }
// }