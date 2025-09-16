import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { InventoryTransferService } from '../../core/services/inventory-transfer.service';
import { BranchService } from '../../core/services/branch.service';
import { ProductService } from '../../core/services/product.service';
import { StateService } from '../../core/services/state.service';

import {
  InventoryTransferDto,
  InventoryTransferSummaryDto,
  TransferStatus,
  TransferPriority,
  InventoryTransferQueryParams,
  TransferSortField,
  CreateInventoryTransferRequestDto,
  CreateTransferItemDto,
  EmergencyTransferSuggestionDto,
  TransferAnalyticsDto
} from '../../core/models/inventory-transfer.models';

import { Branch } from '../../core/models/branch.models';
import { Product } from '../../core/services/product.service';

import { Subject, takeUntil, interval, combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';

import { TransferCreationDialogComponent } from './transfer-creation-dialog/transfer-creation-dialog.component';
import { TransferDetailDialogComponent } from './transfer-detail-dialog/transfer-detail-dialog.component';

@Component({
  selector: 'app-transfer-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatBadgeModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatSlideToggleModule
  ],
  templateUrl: './transfer-management.component.html',
  styleUrls: ['./transfer-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransferManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private transferService = inject(InventoryTransferService);
  private branchService = inject(BranchService);
  private productService = inject(ProductService);
  private stateService = inject(StateService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Signals for reactive state management
  transfers = signal<InventoryTransferSummaryDto[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedTab = signal<number>(0);

  // Filter and pagination state
  queryParams = signal<InventoryTransferQueryParams>({
    page: 1,
    pageSize: 10,
    sortBy: TransferSortField.RequestedAt,
    sortOrder: 'desc'
  });

  totalCount = signal<number>(0);

  // Dropdown data
  branches = signal<Branch[]>([]);
  products = signal<Product[]>([]);

  // Emergency suggestions
  emergencySuggestions = signal<EmergencyTransferSuggestionDto[]>([]);

  // Analytics
  analytics = signal<TransferAnalyticsDto | null>(null);

  // Search and filters
  searchForm!: FormGroup;
  filterForm!: FormGroup;

  // Transfer creation form
  transferForm!: FormGroup;

  // Table configuration
  displayedColumns = [
    'transferNumber',
    'sourceBranch',
    'destinationBranch',
    'status',
    'priority',
    'requestedAt',
    'totalItems',
    'totalCost',
    'actions'
  ];

  // Status and priority enums for templates
  TransferStatus = TransferStatus;
  TransferPriority = TransferPriority;

  // Computed values
  filteredTransfers = computed(() => {
    const allTransfers = this.transfers();
    const tab = this.selectedTab();

    switch (tab) {
      case 0: // All
        return allTransfers;
      case 1: // Pending
        return allTransfers.filter(t => t.status === TransferStatus.Pending);
      case 2: // In Transit
        return allTransfers.filter(t =>
          t.status === TransferStatus.Approved ||
          t.status === TransferStatus.InTransit ||
          t.status === TransferStatus.Delivered
        );
      case 3: // Completed
        return allTransfers.filter(t => t.status === TransferStatus.Completed);
      case 4: // Emergency
        return allTransfers.filter(t => t.priority === TransferPriority.Emergency);
      default:
        return allTransfers;
    }
  });

  // Tab counts
  pendingCount = computed(() =>
    this.transfers().filter(t => t.status === TransferStatus.Pending).length
  );

  inTransitCount = computed(() =>
    this.transfers().filter(t =>
      t.status === TransferStatus.Approved ||
      t.status === TransferStatus.InTransit ||
      t.status === TransferStatus.Delivered
    ).length
  );

  completedCount = computed(() =>
    this.transfers().filter(t => t.status === TransferStatus.Completed).length
  );

  emergencyCount = computed(() =>
    this.transfers().filter(t => t.priority === TransferPriority.Emergency).length
  );

  constructor() {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupAutoRefresh();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Search form
    this.searchForm = this.fb.group({
      searchTerm: ['']
    });

    // Filter form
    this.filterForm = this.fb.group({
      status: [null],
      priority: [null],
      sourceBranchId: [null],
      destinationBranchId: [null],
      dateFrom: [null],
      dateTo: [null],
      onlyOverdue: [false],
      onlyEmergency: [false]
    });

    // Transfer creation form
    this.transferForm = this.fb.group({
      sourceBranchId: [null, Validators.required],
      destinationBranchId: [null, Validators.required],
      priority: [TransferPriority.Normal, Validators.required],
      estimatedDeliveryDate: [null],
      notes: [''],
      items: this.fb.array([])
    });
  }

  private loadInitialData(): void {
    // Load branches
    this.branchService.getBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branches: any) => this.branches.set(branches),
        error: (error: any) => this.handleError('Failed to load branches', error)
      });

    // Load products
    this.productService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => this.products.set(result.data?.products || []),
        error: (error: any) => this.handleError('Failed to load products', error)
      });

    // Load transfers
    this.loadTransfers();

    // Load emergency suggestions
    this.loadEmergencySuggestions();

    // Load analytics
    this.loadAnalytics();
  }

  private setupAutoRefresh(): void {
    // Auto-refresh every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.loading()) {
          this.loadTransfers();
          this.loadEmergencySuggestions();
        }
      });
  }

  private setupSearchSubscription(): void {
    // React to search form changes
    this.searchForm.get('searchTerm')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.queryParams.update(params => ({
          ...params,
          searchTerm,
          page: 1
        }));
        this.loadTransfers();
      });

    // React to filter form changes
    this.filterForm.valueChanges
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(filters => {
        this.queryParams.update(params => ({
          ...params,
          ...filters,
          page: 1
        }));
        this.loadTransfers();
      });
  }

  private loadTransfers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.transferService.getTransfers(this.queryParams())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.transfers.set(result.transfers);
          this.totalCount.set(result.totalCount);
          this.loading.set(false);
          // Force change detection to ensure UI updates
          setTimeout(() => {
            this.transfers.set([...result.transfers]);
          }, 0);
        },
        error: (error) => {
          this.handleError('Failed to load transfers', error);
          this.loading.set(false);
        }
      });
  }

  private loadEmergencySuggestions(): void {
    this.transferService.getEmergencyTransferSuggestions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (suggestions) => this.emergencySuggestions.set(suggestions),
        error: (error) => console.error('Failed to load emergency suggestions:', error)
      });
  }

  private loadAnalytics(): void {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    this.transferService.getTransferAnalytics(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (analytics) => this.analytics.set(analytics),
        error: (error) => console.error('Failed to load analytics:', error)
      });
  }

  // Event handlers
  onTabChange(index: number): void {
    this.selectedTab.set(index);
  }

  onPageChange(event: PageEvent): void {
    this.queryParams.update(params => ({
      ...params,
      page: event.pageIndex + 1,
      pageSize: event.pageSize
    }));
    this.loadTransfers();
  }

  onSortChange(sort: Sort): void {
    this.queryParams.update(params => ({
      ...params,
      sortBy: sort.active as TransferSortField,
      sortOrder: sort.direction as 'asc' | 'desc'
    }));
    this.loadTransfers();
  }

  onRefresh(): void {
    this.loadTransfers();
    this.loadEmergencySuggestions();
    this.loadAnalytics();
  }

  onCreateTransfer(): void {
    const dialogRef = this.dialog.open(TransferCreationDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      data: {
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showMessage(`Transfer created successfully: ${result.transferNumber}`, 'success');
        this.loadTransfers();
        this.loadEmergencySuggestions();
      }
    });
  }

  onViewTransfer(transfer: InventoryTransferSummaryDto): void {
    // Navigate to dedicated transfer detail page instead of modal
    this.router.navigate(['/dashboard/transfers', transfer.id]);
  }

  onPrintTransfer(transfer: InventoryTransferSummaryDto): void {
    this.transferService.printTransfer(transfer.id);
  }

  onApproveTransfer(transfer: InventoryTransferSummaryDto): void {
    if (transfer.canApprove) {
      const approval = {
        approved: true,
        approvalNotes: 'Transfer disetujui melalui dashboard',
        itemApprovals: [],
        managerOverride: false
      };

      this.transferService.approveTransfer(transfer.id, approval)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.showMessage(`Transfer ${transfer.transferNumber} berhasil disetujui`, 'success');
            this.loadTransfers();
          },
          error: (error) => this.handleError('Gagal menyetujui transfer', error)
        });
    }
  }

  onCancelTransfer(transfer: InventoryTransferSummaryDto): void {
    if (transfer.canCancel) {
      const confirmed = confirm(`Apakah Anda yakin ingin membatalkan transfer ${transfer.transferNumber}?`);
      if (confirmed) {
        this.transferService.cancelTransfer(transfer.id, 'Dibatalkan melalui dashboard')
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (result) => {
              this.showMessage(`Transfer ${transfer.transferNumber} berhasil dibatalkan`, 'success');
              this.loadTransfers();
            },
            error: (error) => this.handleError('Gagal membatalkan transfer', error)
          });
      }
    }
  }

  onShipTransfer(transfer: InventoryTransferSummaryDto): void {
    if (transfer.canShip) {
      const shipment = {
        shipmentNotes: 'Transfer dikirim melalui dashboard',
        estimatedDeliveryDate: transfer.estimatedDeliveryDate,
        trackingNumber: `TRK-${transfer.transferNumber}`,
        courierName: 'Internal Courier',
        itemShipments: []
      };

      this.transferService.shipTransfer(transfer.id, shipment)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.showMessage(`Transfer ${transfer.transferNumber} berhasil dikirim`, 'success');
            this.loadTransfers();
          },
          error: (error) => this.handleError('Gagal mengirim transfer', error)
        });
    }
  }

  onReceiveTransfer(transfer: InventoryTransferSummaryDto): void {
    if (transfer.canReceive) {
      const receipt = {
        receiptNotes: 'Transfer diterima melalui dashboard',
        actualDeliveryDate: new Date(),
        qualityCheckPassed: true,
        itemReceipts: []
      };

      this.transferService.receiveTransfer(transfer.id, receipt)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.showMessage(`Transfer ${transfer.transferNumber} berhasil diterima dan selesai`, 'success');
            this.loadTransfers();
          },
          error: (error) => this.handleError('Gagal menerima transfer', error)
        });
    }
  }

  onCreateEmergencyTransfer(suggestion: EmergencyTransferSuggestionDto): void {
    // Find the suggested product and destination branch
    const product = this.products().find(p => p.id === suggestion.productId);
    const destinationBranch = this.branches().find(b => b.id === suggestion.destinationBranchId);

    const dialogRef = this.dialog.open(TransferCreationDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      data: {
        mode: 'emergency',
        preselectedProduct: product,
        preselectedDestination: destinationBranch,
        preselectedQuantity: suggestion.suggestedQuantity
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showMessage(`Emergency transfer created: ${result.transferNumber}`, 'success');
        this.loadTransfers();
        this.loadEmergencySuggestions();
      }
    });
  }

  // UI Helper methods
  getStatusBadgeClass(status: TransferStatus): string {
    return this.transferService.getStatusBadgeClass(status);
  }

  getPriorityBadgeClass(priority: TransferPriority): string {
    return this.transferService.getPriorityBadgeClass(priority);
  }

  getStatusDisplayText(status: TransferStatus): string {
    return this.transferService.getStatusDisplayText(status);
  }

  getPriorityDisplayText(priority: TransferPriority): string {
    return this.transferService.getPriorityDisplayText(priority);
  }

  getUrgencyClass(urgencyLevel: string): string {
    const classes = {
      'Low': 'urgency-low',
      'Medium': 'urgency-medium',
      'High': 'urgency-high',
      'Critical': 'urgency-critical'
    };
    return classes[urgencyLevel as keyof typeof classes] || 'urgency-low';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  isOverdue(transfer: InventoryTransferSummaryDto): boolean {
    if (!transfer.estimatedDeliveryDate) return false;
    const now = new Date();
    const estimated = new Date(transfer.estimatedDeliveryDate);
    return now > estimated && transfer.status !== TransferStatus.Completed;
  }

  canPerformAction(transfer: InventoryTransferSummaryDto, action: string): boolean {
    switch (action) {
      case 'approve':
        return transfer.canApprove || false;
      case 'cancel':
        return transfer.canCancel || false;
      case 'ship':
        return transfer.canShip || false;
      case 'receive':
        return transfer.canReceive || false;
      default:
        return false;
    }
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.error.set(message);
    this.showMessage(message, 'error');
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.snackBar.open(message, 'Tutup', {
      duration: 5000,
      panelClass: [`snackbar-${type}`]
    });
  }

  // Analytics helpers
  getAnalyticsPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  getPerformanceClass(rate: number): string {
    if (rate >= 90) return 'performance-excellent';
    if (rate >= 75) return 'performance-good';
    if (rate >= 60) return 'performance-fair';
    return 'performance-poor';
  }
}