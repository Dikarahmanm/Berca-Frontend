import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { SupplierService } from '../../services/supplier.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  SupplierDto,
  SupplierQueryDto,
  SupplierPagedResponseDto,
  SupplierStatusDto
} from '../../interfaces/supplier.interfaces';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="supplier-container">
      <!-- Header with Actions -->
      <div class="header-section">
        <div class="header-content">
          <h2 class="page-title">Supplier Management</h2>
          <p class="page-subtitle">Manage your suppliers and their information</p>
        </div>

        <div class="header-actions">
          <button class="btn btn-primary" (click)="navigateToCreate()">
            <span class="btn-icon">+</span>
            Add Supplier
          </button>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="filters-section card">
        <form [formGroup]="searchForm" class="filters-form">
          <div class="filter-row">
            <div class="form-field">
              <label for="search">Search Suppliers</label>
              <input 
                id="search"
                type="text" 
                formControlName="search"
                placeholder="Search by company name, code, or contact..."
                class="form-control"
              />
            </div>

            <div class="form-field">
              <label for="isActive">Status</label>
              <select id="isActive" formControlName="isActive" class="form-control">
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div class="form-field">
              <label for="branchId">Branch</label>
              <select id="branchId" formControlName="branchId" class="form-control">
                <option value="">All Branches</option>
                <!-- Branch options would be loaded dynamically -->
              </select>
            </div>
          </div>

          <div class="filter-row">
            <div class="form-field">
              <label for="minPaymentTerms">Min Payment Terms (Days)</label>
              <input 
                id="minPaymentTerms"
                type="number" 
                formControlName="minPaymentTerms"
                placeholder="e.g. 30"
                class="form-control"
                min="1"
                max="365"
              />
            </div>

            <div class="form-field">
              <label for="maxPaymentTerms">Max Payment Terms (Days)</label>
              <input 
                id="maxPaymentTerms"
                type="number" 
                formControlName="maxPaymentTerms"
                placeholder="e.g. 90"
                class="form-control"
                min="1"
                max="365"
              />
            </div>

            <div class="form-field">
              <label for="minCreditLimit">Min Credit Limit</label>
              <input 
                id="minCreditLimit"
                type="number" 
                formControlName="minCreditLimit"
                placeholder="e.g. 1000000"
                class="form-control"
                min="0"
              />
            </div>
          </div>

          <div class="filter-actions">
            <button type="button" class="btn btn-outline" (click)="clearFilters()">
              Clear Filters
            </button>
            <button type="button" class="btn btn-secondary" (click)="exportSuppliers()">
              Export Data
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div *ngIf="supplierService.loading()" class="loading-section">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading suppliers...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="supplierService.error()" class="error-section card">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-details">
            <h3>Error Loading Suppliers</h3>
            <p>{{ supplierService.error() }}</p>
          </div>
          <button class="btn btn-outline" (click)="loadSuppliers()">
            Try Again
          </button>
        </div>
      </div>

      <!-- Suppliers List -->
      <div *ngIf="!supplierService.loading() && !supplierService.error()" class="content-section">
        <!-- Mobile Card View -->
        <div class="mobile-view">
          <div *ngFor="let supplier of paginatedSuppliers(); trackBy: trackBySupplier" 
               class="supplier-card card">
            <div class="card-header">
              <div class="supplier-basic">
                <h4 class="supplier-name">{{ supplier.companyName }}</h4>
                <p class="supplier-code">{{ supplier.supplierCode }}</p>
              </div>
              <div class="supplier-status">
                <span class="status-badge" 
                      [class.status-active]="supplier.isActive"
                      [class.status-inactive]="!supplier.isActive">
                  {{ supplier.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>

            <div class="card-body">
              <div class="supplier-details">
                <div class="detail-row">
                  <span class="detail-label">Contact:</span>
                  <span class="detail-value">{{ supplier.contactPerson }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Phone:</span>
                  <span class="detail-value">{{ supplier.phone }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment Terms:</span>
                  <span class="detail-value">{{ supplier.paymentTerms }} days</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Credit Limit:</span>
                  <span class="detail-value">{{ formatCurrency(supplier.creditLimit) }}</span>
                </div>
                <div *ngIf="supplier.branchName" class="detail-row">
                  <span class="detail-label">Branch:</span>
                  <span class="detail-value">{{ supplier.branchName }}</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <div class="action-buttons">
                <button class="btn btn-sm btn-outline" (click)="navigateToDetail(supplier.id)">
                  View Details
                </button>
                <button class="btn btn-sm btn-outline" (click)="navigateToEdit(supplier.id)">
                  Edit
                </button>
                <button class="btn btn-sm" 
                        [class.btn-secondary]="supplier.isActive"
                        [class.btn-primary]="!supplier.isActive"
                        (click)="toggleSupplierStatus(supplier)">
                  {{ supplier.isActive ? 'Deactivate' : 'Activate' }}
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
                  <th class="sortable" (click)="onSort('supplierCode')">
                    Supplier Code
                    <span class="sort-indicator" 
                          [class.sort-asc]="currentQuery().sortBy === 'supplierCode' && currentQuery().sortOrder === 'asc'"
                          [class.sort-desc]="currentQuery().sortBy === 'supplierCode' && currentQuery().sortOrder === 'desc'">
                    </span>
                  </th>
                  <th class="sortable" (click)="onSort('companyName')">
                    Company Name
                    <span class="sort-indicator" 
                          [class.sort-asc]="currentQuery().sortBy === 'companyName' && currentQuery().sortOrder === 'asc'"
                          [class.sort-desc]="currentQuery().sortBy === 'companyName' && currentQuery().sortOrder === 'desc'">
                    </span>
                  </th>
                  <th>Contact Person</th>
                  <th>Payment Terms</th>
                  <th class="sortable" (click)="onSort('creditLimit')">
                    Credit Limit
                    <span class="sort-indicator" 
                          [class.sort-asc]="currentQuery().sortBy === 'creditLimit' && currentQuery().sortOrder === 'asc'"
                          [class.sort-desc]="currentQuery().sortBy === 'creditLimit' && currentQuery().sortOrder === 'desc'">
                    </span>
                  </th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th class="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let supplier of paginatedSuppliers(); trackBy: trackBySupplier" 
                    class="table-row">
                  <td class="supplier-code-cell">{{ supplier.supplierCode }}</td>
                  <td class="company-name-cell">
                    <strong>{{ supplier.companyName }}</strong>
                  </td>
                  <td>{{ supplier.contactPerson }}</td>
                  <td>{{ supplier.paymentTerms }} days</td>
                  <td>{{ formatCurrency(supplier.creditLimit) }}</td>
                  <td>
                    <span *ngIf="supplier.branchName" class="branch-badge">
                      {{ supplier.branchName }}
                    </span>
                    <span *ngIf="!supplier.branchName" class="text-muted">All Branches</span>
                  </td>
                  <td>
                    <span class="status-badge" 
                          [class.status-active]="supplier.isActive"
                          [class.status-inactive]="!supplier.isActive">
                      {{ supplier.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <div class="action-buttons">
                      <button class="btn btn-sm btn-outline" 
                              (click)="navigateToDetail(supplier.id)"
                              title="View Details">
                        View
                      </button>
                      <button class="btn btn-sm btn-outline" 
                              (click)="navigateToEdit(supplier.id)"
                              title="Edit Supplier">
                        Edit
                      </button>
                      <button class="btn btn-sm" 
                              [class.btn-secondary]="supplier.isActive"
                              [class.btn-primary]="!supplier.isActive"
                              (click)="toggleSupplierStatus(supplier)"
                              [title]="supplier.isActive ? 'Deactivate Supplier' : 'Activate Supplier'">
                        {{ supplier.isActive ? 'Deactivate' : 'Activate' }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="paginatedSuppliers().length === 0" class="empty-state">
          <div class="empty-content">
            <div class="empty-icon">🏢</div>
            <h3>No suppliers found</h3>
            <p *ngIf="hasActiveFilters()">Try adjusting your search filters or create a new supplier.</p>
            <p *ngIf="!hasActiveFilters()">Start by adding your first supplier to the system.</p>
            <button class="btn btn-primary" (click)="navigateToCreate()">
              Add Your First Supplier
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="totalPages() > 1" class="pagination-section">
          <div class="pagination-info">
            <p class="pagination-text">
              Showing {{ getDisplayStart() }} to {{ getDisplayEnd() }} of {{ totalCount() }} suppliers
            </p>
          </div>

          <div class="pagination-controls">
            <button class="btn btn-outline pagination-btn" 
                    [disabled]="currentQuery().page <= 1"
                    (click)="previousPage()">
              Previous
            </button>

            <div class="page-numbers">
              <button *ngFor="let page of getVisiblePages()" 
                      class="btn pagination-btn"
                      [class.btn-primary]="page === currentQuery().page"
                      [class.btn-outline]="page !== currentQuery().page"
                      (click)="goToPage(page)">
                {{ page }}
              </button>
            </div>

            <button class="btn btn-outline pagination-btn" 
                    [disabled]="currentQuery().page >= totalPages()"
                    (click)="nextPage()">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SupplierListComponent implements OnInit, OnDestroy {
  // Injected services
  readonly supplierService = inject(SupplierService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Component state
  private readonly destroy$ = new Subject<void>();
  
  // Reactive form for search and filters
  searchForm: FormGroup;

  // Signal-based state
  private _currentQuery = signal<SupplierQueryDto>({
    page: 1,
    pageSize: 25,
    sortBy: 'companyName',
    sortOrder: 'asc'
  });

  private _totalCount = signal<number>(0);
  private _suppliers = signal<SupplierDto[]>([]);

  // Public readonly signals
  readonly currentQuery = this._currentQuery.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly suppliers = this._suppliers.asReadonly();

  // Computed properties
  readonly totalPages = computed(() => 
    Math.ceil(this.totalCount() / this.currentQuery().pageSize)
  );

  readonly paginatedSuppliers = computed(() => this.suppliers());

  constructor() {
    this.searchForm = this.fb.group({
      search: [''],
      branchId: [null],
      isActive: [''],
      minPaymentTerms: [null],
      maxPaymentTerms: [null],
      minCreditLimit: [null]
    });
  }

  ngOnInit(): void {
    this.loadSuppliers();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Setup reactive search with debounce
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

  // Apply current form filters to query
  private applyFilters(): void {
    const formValue = this.searchForm.value;
    
    this._currentQuery.update(query => ({
      ...query,
      search: formValue.search || undefined,
      branchId: formValue.branchId || undefined,
      isActive: formValue.isActive === '' ? undefined : formValue.isActive === 'true',
      minPaymentTerms: formValue.minPaymentTerms || undefined,
      maxPaymentTerms: formValue.maxPaymentTerms || undefined,
      minCreditLimit: formValue.minCreditLimit || undefined,
      page: 1
    }));

    this.loadSuppliers();
  }

  // Load suppliers from service
  loadSuppliers(): void {
    this.supplierService.clearError();
    
    this.supplierService.getSuppliers(this.currentQuery()).subscribe({
      next: (response: SupplierPagedResponseDto) => {
        this._suppliers.set(response.suppliers);
        this._totalCount.set(response.totalCount);
      },
      error: (error) => {
        this.toastService.showError('Error', `Failed to load suppliers: ${error.message}`);
      }
    });
  }

  // Navigation methods
  navigateToCreate(): void {
    this.router.navigate(['/dashboard/supplier/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/dashboard/supplier/edit', id]);
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/dashboard/supplier', id]);
  }

  // Sorting
  onSort(column: string): void {
    this._currentQuery.update(query => {
      if (query.sortBy === column) {
        return { ...query, sortOrder: query.sortOrder === 'asc' ? 'desc' : 'asc' };
      } else {
        return { ...query, sortBy: column, sortOrder: 'asc' };
      }
    });
    this.loadSuppliers();
  }

  // Pagination methods
  previousPage(): void {
    if (this.currentQuery().page > 1) {
      this._currentQuery.update(query => ({ ...query, page: query.page - 1 }));
      this.loadSuppliers();
    }
  }

  nextPage(): void {
    if (this.currentQuery().page < this.totalPages()) {
      this._currentQuery.update(query => ({ ...query, page: query.page + 1 }));
      this.loadSuppliers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this._currentQuery.update(query => ({ ...query, page }));
      this.loadSuppliers();
    }
  }

  // Pagination helpers
  getDisplayStart(): number {
    return ((this.currentQuery().page - 1) * this.currentQuery().pageSize) + 1;
  }

  getDisplayEnd(): number {
    const end = this.currentQuery().page * this.currentQuery().pageSize;
    return Math.min(end, this.totalCount());
  }

  getVisiblePages(): number[] {
    const current = this.currentQuery().page;
    const total = this.totalPages();
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, -1);
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
      rangeWithDots.push(-1, total);
    } else if (total > 1) {
      rangeWithDots.push(total);
    }

    return rangeWithDots.filter(page => page !== -1);
  }

  // Status toggle
  toggleSupplierStatus(supplier: SupplierDto): void {
    const statusDto: SupplierStatusDto = {
      isActive: !supplier.isActive,
      reason: `Status changed via admin panel`
    };

    this.supplierService.toggleSupplierStatus(supplier.id, statusDto).subscribe({
      next: (updatedSupplier) => {
        this._suppliers.update(suppliers => 
          suppliers.map(s => s.id === supplier.id ? updatedSupplier : s)
        );
        this.toastService.showSuccess(
          'Success',
          `Supplier ${updatedSupplier.isActive ? 'activated' : 'deactivated'} successfully`
        );
      },
      error: (error) => {
        this.toastService.showError('Error', `Failed to update supplier: ${error.message}`);
      }
    });
  }

  // Utility methods
  clearFilters(): void {
    this.searchForm.reset();
    this._currentQuery.set({
      page: 1,
      pageSize: 25,
      sortBy: 'companyName',
      sortOrder: 'asc'
    });
    this.loadSuppliers();
  }

  hasActiveFilters(): boolean {
    const formValue = this.searchForm.value;
    return !!(formValue.search || formValue.branchId || formValue.isActive || 
             formValue.minPaymentTerms || formValue.maxPaymentTerms || formValue.minCreditLimit);
  }

  exportSuppliers(): void {
    // TODO: Implement CSV/Excel export functionality
    this.toastService.showInfo('Info', 'Export functionality coming soon');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  trackBySupplier(index: number, supplier: SupplierDto): number {
    return supplier.id;
  }

  // Service is already exposed as public readonly above
}