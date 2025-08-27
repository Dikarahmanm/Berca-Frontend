import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SupplierService } from '../../services/supplier.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SupplierDto } from '../../interfaces/supplier.interfaces';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="supplier-detail-container">
      <!-- Header -->
      <div class="detail-header">
        <button class="back-button" (click)="navigateBack()">
          ← Back to Suppliers
        </button>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="navigateToEdit()">
            Edit Supplier
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-section">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading supplier details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="error-section card">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-details">
            <h3>Error Loading Supplier</h3>
            <p>{{ error() }}</p>
          </div>
          <button class="btn btn-outline" (click)="loadSupplier()">
            Try Again
          </button>
        </div>
      </div>

      <!-- Supplier Details -->
      <div *ngIf="supplier() && !loading()" class="supplier-details">
        <div class="detail-grid">
          
          <!-- Basic Information Card -->
          <div class="detail-card card">
            <div class="card-header">
              <h3 class="card-title">{{ supplier()!.companyName }}</h3>
              <span class="status-badge" 
                    [class.status-active]="supplier()!.isActive"
                    [class.status-inactive]="!supplier()!.isActive">
                {{ supplier()!.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            
            <div class="card-body">
              <div class="detail-rows">
                <div class="detail-row">
                  <span class="detail-label">Supplier Code</span>
                  <span class="detail-value code">{{ supplier()!.supplierCode }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contact Person</span>
                  <span class="detail-value">{{ supplier()!.contactPerson }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Phone</span>
                  <span class="detail-value">{{ supplier()!.phone }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email</span>
                  <span class="detail-value">{{ supplier()!.email }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Business Terms Card -->
          <div class="detail-card card">
            <div class="card-header">
              <h3 class="card-title">Business Terms</h3>
            </div>
            
            <div class="card-body">
              <div class="detail-rows">
                <div class="detail-row">
                  <span class="detail-label">Payment Terms</span>
                  <span class="detail-value">{{ supplier()!.paymentTerms }} days</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Credit Limit</span>
                  <span class="detail-value">{{ formatCurrency(supplier()!.creditLimit) }}</span>
                </div>
                <div class="detail-row" *ngIf="supplier()!.branchName">
                  <span class="detail-label">Branch</span>
                  <span class="detail-value">{{ supplier()!.branchName }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Address Card -->
          <div class="detail-card card full-width">
            <div class="card-header">
              <h3 class="card-title">Address</h3>
            </div>
            
            <div class="card-body">
              <p class="address-text">{{ supplier()!.address }}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .supplier-detail-container {
      padding: var(--s6);
      max-width: 1200px;
      margin: 0 auto;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s6);
    }

    .back-button {
      background: none;
      border: none;
      color: var(--primary);
      cursor: pointer;
      font-size: var(--text-base);
      padding: var(--s2);
    }

    .header-actions {
      display: flex;
      gap: var(--s3);
    }

    .loading-section, .error-section {
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

    .error-content {
      display: flex;
      align-items: center;
      gap: var(--s4);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: var(--s6);
    }

    .detail-card {
      background: var(--surface);
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .card-header {
      padding: var(--s5);
      border-bottom: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-title {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      margin: 0;
    }

    .status-badge {
      padding: var(--s1) var(--s3);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
    }

    .status-active {
      background: var(--success-light);
      color: var(--success);
    }

    .status-inactive {
      background: var(--bg-secondary);
      color: var(--text-muted);
    }

    .card-body {
      padding: var(--s5);
    }

    .detail-rows {
      display: flex;
      flex-direction: column;
      gap: var(--s3);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s3) 0;
      border-bottom: 1px solid var(--border-subtle);
    }

    .detail-label {
      font-weight: var(--font-medium);
      color: var(--text-secondary);
    }

    .detail-value {
      color: var(--text-primary);
      font-weight: var(--font-medium);
    }

    .detail-value.code {
      font-family: 'Courier New', monospace;
    }

    .address-text {
      line-height: var(--leading-relaxed);
      color: var(--text-primary);
      margin: 0;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .supplier-detail-container {
        padding: var(--s4);
      }
      
      .detail-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--s3);
      }
      
      .detail-grid {
        grid-template-columns: 1fr;
        gap: var(--s4);
      }
    }
  `]
})
export class SupplierDetailComponent implements OnInit, OnDestroy {
  // Injected services
  private readonly supplierService = inject(SupplierService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Component state
  private readonly destroy$ = new Subject<void>();
  
  // Signal-based state
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _supplier = signal<SupplierDto | null>(null);
  private _supplierId = signal<number | null>(null);

  // Public readonly signals
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly supplier = this._supplier.asReadonly();

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Get supplier ID from route params
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this._supplierId.set(parseInt(id, 10));
      this.loadSupplier();
    } else {
      this._error.set('Invalid supplier ID');
    }
  }

  loadSupplier(): void {
    const id = this._supplierId();
    if (!id) return;

    this._loading.set(true);
    this._error.set(null);

    this.supplierService.getSupplierById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (supplier) => {
          this._supplier.set(supplier);
          this._loading.set(false);
        },
        error: (error) => {
          this._error.set(`Failed to load supplier: ${error.message}`);
          this._loading.set(false);
        }
      });
  }

  navigateBack(): void {
    this.router.navigate(['/dashboard/supplier']);
  }

  navigateToEdit(): void {
    const id = this._supplierId();
    if (id) {
      this.router.navigate(['/dashboard/supplier/edit', id]);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}