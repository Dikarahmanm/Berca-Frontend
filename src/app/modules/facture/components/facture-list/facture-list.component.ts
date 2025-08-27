import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FactureService } from '../../services/facture.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  FactureListDto,
  FactureQueryParams,
  FacturePagedResponseDto,
  FactureStatus,
  FacturePriority
} from '../../interfaces/facture.interfaces';

@Component({
  selector: 'app-facture-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="facture-container">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h2 class="page-title">Facture Management</h2>
          <p class="page-subtitle">Manage supplier invoices and approval workflow</p>
        </div>

        <div class="header-actions">
          <button class="btn btn-primary" (click)="navigateToReceive()">
            + Receive Invoice
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section card">
        <form [formGroup]="searchForm" class="filters-form">
          <div class="filter-row">
            <div class="form-field">
              <label>Search Factures</label>
              <input 
                type="text" 
                formControlName="search"
                placeholder="Search by invoice number, supplier..."
                class="form-control"
              />
            </div>

            <div class="form-field">
              <label>Status</label>
              <select formControlName="status" class="form-control">
                <option value="">All Status</option>
                <option value="0">Received</option>
                <option value="1">Under Verification</option>
                <option value="2">Verified</option>
                <option value="3">Approved</option>
                <option value="4">Paid</option>
                <option value="5">Disputed</option>
                <option value="6">Cancelled</option>
              </select>
            </div>

            <div class="form-field">
              <label>Priority</label>
              <select formControlName="priority" class="form-control">
                <option value="">All Priorities</option>
                <option value="0">Low</option>
                <option value="1">Normal</option>
                <option value="2">High</option>
                <option value="3">Urgent</option>
              </select>
            </div>
          </div>

          <div class="filter-actions">
            <button type="button" class="btn btn-outline" (click)="clearFilters()">
              Clear Filters
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div *ngIf="factureService.loading()" class="loading-section">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading factures...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="factureService.error()" class="error-section card">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-details">
            <h3>Error Loading Factures</h3>
            <p>{{ factureService.error() }}</p>
          </div>
          <button class="btn btn-outline" (click)="loadFactures()">
            Try Again
          </button>
        </div>
      </div>

      <!-- Factures List -->
      <div *ngIf="!factureService.loading() && !factureService.error()" class="content-section">
        
        <!-- Mobile Card View -->
        <div class="mobile-view">
          <div *ngFor="let facture of paginatedFactures(); trackBy: trackByFacture" 
               class="facture-card card">
            <div class="card-header">
              <div class="facture-basic">
                <h4 class="facture-title">{{ facture.supplierInvoiceNumber }}</h4>
                <p class="facture-supplier">{{ facture.supplierName }}</p>
              </div>
              <div class="facture-status">
                <span class="status-badge" [attr.data-status]="facture.status">
                  {{ getStatusLabel(facture.status) }}
                </span>
                <span *ngIf="facture.isOverdue" class="overdue-badge">
                  Overdue
                </span>
              </div>
            </div>

            <div class="card-body">
              <div class="facture-details">
                <div class="detail-row">
                  <span class="detail-label">Amount:</span>
                  <span class="detail-value">{{ formatCurrency(facture.totalAmount) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Due Date:</span>
                  <span class="detail-value" [class.overdue]="facture.isOverdue">
                    {{ formatDate(facture.dueDate) }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Received:</span>
                  <span class="detail-value">{{ formatDate(facture.receivedAt) }}</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <div class="action-buttons">
                <button class="btn btn-sm btn-outline" (click)="navigateToDetail(facture.id)">
                  View Details
                </button>
                <button *ngIf="canVerify(facture)" 
                        class="btn btn-sm btn-primary" 
                        (click)="navigateToVerify(facture.id)">
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div class="desktop-view">
          <div class="table-container card">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let facture of paginatedFactures(); trackBy: trackByFacture">
                  <td class="invoice-cell">
                    <strong>{{ facture.supplierInvoiceNumber }}</strong>
                    <small class="internal-ref">{{ facture.internalReferenceNumber }}</small>
                  </td>
                  <td>{{ facture.supplierName }}</td>
                  <td class="amount-cell">{{ formatCurrency(facture.totalAmount) }}</td>
                  <td class="date-cell" [class.overdue]="facture.isOverdue">
                    {{ formatDate(facture.dueDate) }}
                    <span *ngIf="facture.isOverdue" class="overdue-indicator">⚠️</span>
                  </td>
                  <td>
                    <span class="status-badge" [attr.data-status]="facture.status">
                      {{ getStatusLabel(facture.status) }}
                    </span>
                  </td>
                  <td>
                    <span class="priority-badge" [attr.data-priority]="getPriorityValue(getDynamicPriority(facture))">
                      {{ getDynamicPriority(facture) }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <div class="action-buttons">
                      <button class="btn btn-sm btn-outline" (click)="navigateToDetail(facture.id)">
                        View
                      </button>
                      <button *ngIf="canVerify(facture)" 
                              class="btn btn-sm btn-primary" 
                              (click)="navigateToVerify(facture.id)">
                        Verify
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="paginatedFactures().length === 0" class="empty-state">
          <div class="empty-content">
            <div class="empty-icon">📄</div>
            <h3>No factures found</h3>
            <p>Start by receiving your first supplier invoice.</p>
            <button class="btn btn-primary" (click)="navigateToReceive()">
              Receive Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .facture-container {
      padding: var(--s6);
      max-width: 1400px;
      margin: 0 auto;
      background: var(--bg-primary);
      min-height: 100vh;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--s8);
      gap: var(--s4);
    }

    .page-title {
      font-size: var(--text-3xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
      margin: 0 0 var(--s2) 0;
    }

    .page-subtitle {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: 0;
    }

    .filters-section {
      margin-bottom: var(--s6);
      padding: var(--s6);
    }

    .filter-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--s4);
      margin-bottom: var(--s4);
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    .form-field label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }

    .mobile-view {
      display: grid;
      gap: var(--s4);
      margin-bottom: var(--s6);
    }

    @media (min-width: 1024px) {
      .mobile-view { display: none; }
    }

    @media (max-width: 1023px) {
      .desktop-view { display: none; }
    }

    .facture-card {
      background: var(--surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition: var(--transition-normal);
    }

    .facture-card:hover {
      border-color: var(--primary);
      box-shadow: var(--shadow-md);
    }

    .card-header {
      padding: var(--s5);
      background: var(--surface-soft);
      border-bottom: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .facture-title {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      margin: 0 0 var(--s1) 0;
    }

    .facture-supplier {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: 0;
    }

    .status-badge {
      padding: var(--s1) var(--s3);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      text-transform: uppercase;
    }

    .status-badge[data-status="0"] { background: var(--info-light); color: var(--info); }
    .status-badge[data-status="1"] { background: var(--warning-light); color: var(--warning); }
    .status-badge[data-status="2"] { background: var(--primary-light); color: var(--primary); }
    .status-badge[data-status="3"] { background: var(--success-light); color: var(--success); }
    .status-badge[data-status="4"] { background: var(--success); color: white; }
    .status-badge[data-status="5"] { background: var(--error-light); color: var(--error); }
    .status-badge[data-status="6"] { background: var(--bg-secondary); color: var(--text-muted); }

    .overdue-badge {
      padding: var(--s1) var(--s2);
      background: var(--error);
      color: white;
      font-size: var(--text-xs);
      border-radius: var(--radius-sm);
      margin-left: var(--s2);
    }

    .card-body {
      padding: var(--s5);
    }

    .facture-details {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-label {
      font-weight: var(--font-medium);
      color: var(--text-secondary);
    }

    .detail-value {
      color: var(--text-primary);
      font-weight: var(--font-medium);
    }

    .detail-value.overdue {
      color: var(--error);
    }

    .card-footer {
      padding: var(--s4) var(--s5);
      background: var(--surface-soft);
      border-top: 1px solid var(--border-light);
    }

    .action-buttons {
      display: flex;
      gap: var(--s2);
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .table-container {
      overflow-x: auto;
      background: var(--surface);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }

    .data-table th {
      background: var(--surface-soft);
      padding: var(--s4) var(--s3);
      text-align: left;
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      border-bottom: 2px solid var(--border-medium);
    }

    .data-table td {
      padding: var(--s4) var(--s3);
      border-bottom: 1px solid var(--border-light);
      vertical-align: middle;
    }

    .data-table tr:hover {
      background: var(--surface-soft);
    }

    .invoice-cell {
      min-width: 180px;
    }

    .internal-ref {
      display: block;
      color: var(--text-muted);
      font-family: monospace;
      margin-top: var(--s1);
    }

    .amount-cell {
      font-weight: var(--font-semibold);
      color: var(--primary);
    }

    .date-cell.overdue {
      color: var(--error);
      font-weight: var(--font-semibold);
    }

    .overdue-indicator {
      margin-left: var(--s1);
    }

    .loading-section, .error-section, .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--s12);
      text-align: center;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-light);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: var(--s4);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: var(--s4);
      opacity: 0.5;
    }

    .btn-sm {
      padding: var(--s2) var(--s3);
      font-size: var(--text-xs);
      min-height: 36px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .facture-container {
        padding: var(--s4);
      }
      
      .header-section {
        flex-direction: column;
        align-items: stretch;
        gap: var(--s4);
      }
      
      .filter-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FactureListComponent implements OnInit, OnDestroy {
  // Injected services
  readonly factureService = inject(FactureService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Component state
  private readonly destroy$ = new Subject<void>();
  
  // Reactive form for search and filters
  searchForm: FormGroup;

  // Signal-based state
  private _currentQuery = signal<FactureQueryParams>({
    page: 1,
    pageSize: 25,
    sortBy: 'receivedAt',
    sortOrder: 'desc'
  });

  private _totalCount = signal<number>(0);
  private _factures = signal<FactureListDto[]>([]);

  // Public readonly signals
  readonly currentQuery = this._currentQuery.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly factures = this._factures.asReadonly();

  // Computed properties
  readonly paginatedFactures = computed(() => this.factures());

  constructor() {
    this.searchForm = this.fb.group({
      search: [''],
      status: [''],
      priority: ['']
    });
  }

  ngOnInit(): void {
    this.loadFactures();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchSubscription(): void {
    this.searchForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this._currentQuery.update(query => ({ ...query, page: 1 }));
        this.applyFilters();
      });
  }

  private applyFilters(): void {
    const formValue = this.searchForm.value;
    
    this._currentQuery.update(query => ({
      ...query,
      search: formValue.search || undefined,
      status: formValue.status ? parseInt(formValue.status) : undefined,
      priority: formValue.priority ? parseInt(formValue.priority) : undefined,
      page: 1
    }));

    this.loadFactures();
  }

  loadFactures(): void {
    this.factureService.clearError();
    
    // FOR DEVELOPMENT: Use mock data since backend may not be ready
    console.log('🔍 Loading factures with query:', this.currentQuery());
    
    this.factureService.getFactures(this.currentQuery()).subscribe({
      next: (response: FacturePagedResponseDto) => {
        console.log('✅ Factures loaded successfully:', response);
        this._factures.set(response.factures);
        this._totalCount.set(response.totalCount);
      },
      error: (error) => {
        console.error('❌ Failed to load factures:', error);
        // Show user-friendly error message
        this.toastService.showError('Error', 'Unable to load factures. Backend may not be available.');
        
        // FOR DEVELOPMENT: Set empty data so UI doesn't break
        this._factures.set([]);
        this._totalCount.set(0);
      }
    });
  }

  // Navigation methods
  navigateToReceive(): void {
    this.router.navigate(['/dashboard/facture/receive']);
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/dashboard/facture', id]);
  }

  navigateToVerify(id: number): void {
    this.router.navigate(['/dashboard/facture', id, 'verify']);
  }

  // Helper methods
  canVerify(facture: FactureListDto): boolean {
    return facture.status === FactureStatus.RECEIVED;
  }

  getStatusLabel(status: FactureStatus): string {
    const labels: Record<FactureStatus, string> = {
      [FactureStatus.RECEIVED]: 'Received',
      [FactureStatus.VERIFICATION]: 'Verifying',
      [FactureStatus.VERIFIED]: 'Verified',
      [FactureStatus.APPROVED]: 'Approved',
      [FactureStatus.PAID]: 'Paid',
      [FactureStatus.DISPUTED]: 'Disputed',
      [FactureStatus.CANCELLED]: 'Cancelled',
      [FactureStatus.PARTIAL_PAID]: 'Partial'
    };
    return labels[status] || 'Unknown';
  }

  getDynamicPriority(facture: FactureListDto): string {
    if (facture.status === FactureStatus.PAID || facture.status === FactureStatus.CANCELLED) {
      return 'Low';
    }

    const dueDate = new Date(facture.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return 'Urgent';
    }

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setHours(0, 0, 0, 0);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    if (dueDate <= sevenDaysFromNow) {
      return 'High';
    }

    return 'Normal';
  }

  getPriorityValue(priority: string): number {
    switch (priority) {
      case 'Urgent': return 3;
      case 'High': return 2;
      case 'Normal': return 1;
      case 'Low': return 0;
      default: return 1;
    }
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
      day: 'numeric'
    }).format(new Date(date));
  }

  clearFilters(): void {
    this.searchForm.reset();
    this._currentQuery.set({
      page: 1,
      pageSize: 25,
      sortBy: 'receivedAt',
      sortOrder: 'desc'
    });
    this.loadFactures();
  }

  trackByFacture(index: number, facture: FactureListDto): number {
    return facture.id;
  }

  // Service is already exposed as public readonly above
}