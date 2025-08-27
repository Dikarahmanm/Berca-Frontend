import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { SupplierService } from '../../services/supplier.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { SupplierFactureUtils } from '../../../../shared/utils/supplier-facture.utils';
import {
  SupplierDto,
  CreateSupplierDto,
  UpdateSupplierDto
} from '../../interfaces/supplier.interfaces';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="supplier-form-container">
      <!-- Header -->
      <div class="form-header">
        <div class="header-content">
          <button class="back-button" (click)="navigateBack()">
            ← Back to Suppliers
          </button>
          <h2 class="form-title">{{ isEditMode() ? 'Edit Supplier' : 'Create New Supplier' }}</h2>
          <p class="form-subtitle">
            {{ isEditMode() ? 'Update supplier information and settings' : 'Add a new supplier to your system' }}
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-section">
        <div class="loading-spinner"></div>
        <p class="loading-text">{{ isEditMode() ? 'Loading supplier data...' : 'Processing...' }}</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="error-section card">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-details">
            <h3>Error</h3>
            <p>{{ error() }}</p>
          </div>
          <button class="btn btn-outline" (click)="clearError()">
            Dismiss
          </button>
        </div>
      </div>

      <!-- Form -->
      <div *ngIf="!loading()" class="form-section">
        <form [formGroup]="supplierForm" (ngSubmit)="onSubmit()" class="supplier-form">
          
          <!-- Basic Information Card -->
          <div class="form-card card">
            <div class="card-header">
              <h3 class="card-title">Basic Information</h3>
              <p class="card-subtitle">Essential supplier details and contact information</p>
            </div>
            
            <div class="card-body">
              <div class="form-row">
                <!-- Supplier Code -->
                <div class="form-field">
                  <label for="supplierCode" class="field-label">
                    Supplier Code
                    <span class="field-optional">(Auto-generated if empty)</span>
                  </label>
                  <input
                    id="supplierCode"
                    type="text"
                    formControlName="supplierCode"
                    class="form-control"
                    [class.error]="hasFieldError('supplierCode')"
                    placeholder="e.g., SUP-001"
                  />
                  <div *ngIf="hasFieldError('supplierCode')" class="field-error">
                    {{ getFieldError('supplierCode') }}
                  </div>
                  <div class="field-hint">
                    Leave empty to auto-generate a unique supplier code
                  </div>
                </div>

                <!-- Company Name -->
                <div class="form-field">
                  <label for="companyName" class="field-label required">Company Name</label>
                  <input
                    id="companyName"
                    type="text"
                    formControlName="companyName"
                    class="form-control"
                    [class.error]="hasFieldError('companyName')"
                    placeholder="e.g., ABC Supplier Tbk"
                  />
                  <div *ngIf="hasFieldError('companyName')" class="field-error">
                    {{ getFieldError('companyName') }}
                  </div>
                </div>
              </div>

              <div class="form-row">
                <!-- Contact Person -->
                <div class="form-field">
                  <label for="contactPerson" class="field-label required">Contact Person</label>
                  <input
                    id="contactPerson"
                    type="text"
                    formControlName="contactPerson"
                    class="form-control"
                    [class.error]="hasFieldError('contactPerson')"
                    placeholder="e.g., John Doe"
                  />
                  <div *ngIf="hasFieldError('contactPerson')" class="field-error">
                    {{ getFieldError('contactPerson') }}
                  </div>
                </div>

                <!-- Phone -->
                <div class="form-field">
                  <label for="phone" class="field-label required">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    formControlName="phone"
                    class="form-control"
                    [class.error]="hasFieldError('phone')"
                    placeholder="e.g., +62 21 1234 5678"
                  />
                  <div *ngIf="hasFieldError('phone')" class="field-error">
                    {{ getFieldError('phone') }}
                  </div>
                  <div class="field-hint">
                    Indonesian phone format: +62 or 08xx
                  </div>
                </div>
              </div>

              <div class="form-row">
                <!-- Email -->
                <div class="form-field full-width">
                  <label for="email" class="field-label required">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    class="form-control"
                    [class.error]="hasFieldError('email')"
                    placeholder="e.g., contact@abcsupplier.com"
                  />
                  <div *ngIf="hasFieldError('email')" class="field-error">
                    {{ getFieldError('email') }}
                  </div>
                </div>
              </div>

              <div class="form-row">
                <!-- Address -->
                <div class="form-field full-width">
                  <label for="address" class="field-label required">Address</label>
                  <textarea
                    id="address"
                    formControlName="address"
                    class="form-control textarea"
                    [class.error]="hasFieldError('address')"
                    placeholder="Complete address including city and postal code"
                    rows="3"
                  ></textarea>
                  <div *ngIf="hasFieldError('address')" class="field-error">
                    {{ getFieldError('address') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Business Terms Card -->
          <div class="form-card card">
            <div class="card-header">
              <h3 class="card-title">Business Terms</h3>
              <p class="card-subtitle">Payment terms and credit limit settings</p>
            </div>
            
            <div class="card-body">
              <div class="form-row">
                <!-- Payment Terms -->
                <div class="form-field">
                  <label for="paymentTerms" class="field-label required">Payment Terms (Days)</label>
                  <select
                    id="paymentTerms"
                    formControlName="paymentTerms"
                    class="form-control"
                    [class.error]="hasFieldError('paymentTerms')"
                  >
                    <option value="">Select payment terms</option>
                    <option value="0">Cash on Delivery (COD)</option>
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                    <option value="45">45 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                  <div *ngIf="hasFieldError('paymentTerms')" class="field-error">
                    {{ getFieldError('paymentTerms') }}
                  </div>
                  <div class="field-hint">
                    Standard payment period after invoice date
                  </div>
                </div>

                <!-- Credit Limit -->
                <div class="form-field">
                  <label for="creditLimit" class="field-label required">Credit Limit</label>
                  <div class="input-group">
                    <span class="input-prefix">Rp</span>
                    <input
                      id="creditLimit"
                      type="text"
                      formControlName="creditLimit"
                      class="form-control currency-input"
                      [class.error]="hasFieldError('creditLimit')"
                      placeholder="0"
                      (input)="formatCurrencyInput($event)"
                    />
                  </div>
                  <div *ngIf="hasFieldError('creditLimit')" class="field-error">
                    {{ getFieldError('creditLimit') }}
                  </div>
                  <div class="field-hint">
                    Maximum outstanding amount for this supplier
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Assignment Card (if applicable) -->
          <div *ngIf="showBranchSelection" class="form-card card">
            <div class="card-header">
              <h3 class="card-title">Branch Assignment</h3>
              <p class="card-subtitle">Assign supplier to specific branch or make available to all</p>
            </div>
            
            <div class="card-body">
              <div class="form-row">
                <div class="form-field full-width">
                  <label for="branchId" class="field-label">Assigned Branch</label>
                  <select
                    id="branchId"
                    formControlName="branchId"
                    class="form-control"
                  >
                    <option value="">All Branches</option>
                    <!-- Branch options would be loaded dynamically -->
                    <option value="1">Head Office</option>
                    <option value="2">Branch Jakarta</option>
                    <option value="3">Branch Surabaya</option>
                  </select>
                  <div class="field-hint">
                    Leave empty to make supplier available to all branches
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <div class="action-buttons">
              <button type="button" class="btn btn-outline" (click)="navigateBack()">
                Cancel
              </button>
              <button type="button" class="btn btn-secondary" (click)="saveAsDraft()" [disabled]="!canSaveAsDraft()">
                Save as Draft
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="!supplierForm.valid || submitting()">
                <span *ngIf="submitting()" class="btn-spinner"></span>
                {{ isEditMode() ? 'Update Supplier' : 'Create Supplier' }}
              </button>
            </div>
          </div>

          <!-- Form Debug Info (Development Only) -->
          <div *ngIf="showDebugInfo" class="debug-section card">
            <div class="card-header">
              <h3 class="card-title">Form Debug Info</h3>
            </div>
            <div class="card-body">
              <div class="debug-info">
                <p><strong>Form Valid:</strong> {{ supplierForm.valid }}</p>
                <p><strong>Form Dirty:</strong> {{ supplierForm.dirty }}</p>
                <p><strong>Form Touched:</strong> {{ supplierForm.touched }}</p>
                <pre class="debug-json">{{ getFormValue() | json }}</pre>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  `
})
export class SupplierFormComponent implements OnInit, OnDestroy {
  // Injected services
  private readonly supplierService = inject(SupplierService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  // Component state
  private readonly destroy$ = new Subject<void>();
  
  // Signal-based state
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _submitting = signal<boolean>(false);
  private _currentSupplier = signal<SupplierDto | null>(null);
  private _supplierId = signal<number | null>(null);

  // Public readonly signals
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly submitting = this._submitting.asReadonly();
  readonly currentSupplier = this._currentSupplier.asReadonly();

  // Computed properties
  readonly isEditMode = computed(() => this._supplierId() !== null);
  
  // Form configuration
  supplierForm: FormGroup;
  
  // UI state
  showBranchSelection = true; // Could be based on user permissions
  showDebugInfo = false; // Set to true during development

  constructor() {
    this.supplierForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupValidationSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    // Get supplier ID from route params
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this._supplierId.set(parseInt(id, 10));
      this.loadSupplier();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      supplierCode: [''],
      companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      contactPerson: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email], [this.asyncEmailValidator.bind(this)]],
      address: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      paymentTerms: ['', [Validators.required, Validators.min(0), Validators.max(365)]],
      creditLimit: ['', [Validators.required, Validators.min(0)]],
      branchId: [null]
    });
  }

  private setupValidationSubscriptions(): void {
    // Company name async validation
    this.supplierForm.get('companyName')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(value => {
          if (!value || value.length < 2) return of(null);
          return this.supplierService.validateCompanyName(
            value, 
            this.supplierForm.get('branchId')?.value,
            this._supplierId() || undefined
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(isValid => {
        const control = this.supplierForm.get('companyName');
        if (control && !isValid) {
          control.setErrors({ ...control.errors, companyExists: true });
        }
      });

    // Supplier code async validation
    this.supplierForm.get('supplierCode')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(value => {
          if (!value || value.length < 3) return of(null);
          return this.supplierService.validateSupplierCode(value, this._supplierId() || undefined);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(isValid => {
        const control = this.supplierForm.get('supplierCode');
        if (control && !isValid) {
          control.setErrors({ ...control.errors, codeExists: true });
        }
      });
  }

  private async asyncEmailValidator(control: AbstractControl) {
    if (!control.value) return null;
    
    try {
      const isValid = await this.supplierService.validateEmail(
        control.value, 
        this._supplierId() || undefined
      ).toPromise();
      return isValid ? null : { emailExists: true };
    } catch (error) {
      return null; // Don't fail validation on network errors
    }
  }

  private loadSupplier(): void {
    const id = this._supplierId();
    if (!id) return;

    this._loading.set(true);
    this._error.set(null);

    this.supplierService.getSupplierById(id).subscribe({
      next: (supplier) => {
        this._currentSupplier.set(supplier);
        this.populateForm(supplier);
        this._loading.set(false);
      },
      error: (error) => {
        this._error.set(`Failed to load supplier: ${error.message}`);
        this._loading.set(false);
      }
    });
  }

  private populateForm(supplier: SupplierDto): void {
    this.supplierForm.patchValue({
      supplierCode: supplier.supplierCode,
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      paymentTerms: supplier.paymentTerms,
      creditLimit: supplier.creditLimit.toString(),
      branchId: supplier.branchId
    });
  }

  onSubmit(): void {
    if (!this.supplierForm.valid || this.submitting()) return;

    this._submitting.set(true);
    this._error.set(null);

    const formData = this.prepareFormData();

    if (this.isEditMode()) {
      this.updateSupplier(formData);
    } else {
      this.createSupplier(formData);
    }
  }

  private prepareFormData(): CreateSupplierDto | UpdateSupplierDto {
    const formValue = this.supplierForm.value;
    
    return {
      companyName: formValue.companyName.trim(),
      contactPerson: formValue.contactPerson.trim(),
      phone: formValue.phone.trim(),
      email: formValue.email.trim().toLowerCase(),
      address: formValue.address.trim(),
      paymentTerms: parseInt(formValue.paymentTerms, 10),
      creditLimit: this.parseCurrency(formValue.creditLimit),
      branchId: formValue.branchId || undefined,
      ...(this.isEditMode() ? {} : { supplierCode: formValue.supplierCode?.trim() || undefined })
    };
  }

  private createSupplier(data: CreateSupplierDto): void {
    this.supplierService.createSupplier(data).subscribe({
      next: (supplier) => {
        this.toastService.showSuccess('Success', 'Supplier created successfully');
        this._submitting.set(false);
        this.router.navigate(['/dashboard/supplier', supplier.id]);
      },
      error: (error) => {
        this._error.set(`Failed to create supplier: ${error.message}`);
        this._submitting.set(false);
      }
    });
  }

  private updateSupplier(data: UpdateSupplierDto): void {
    const id = this._supplierId();
    if (!id) return;

    this.supplierService.updateSupplier(id, data).subscribe({
      next: (supplier) => {
        this.toastService.showSuccess('Success', 'Supplier updated successfully');
        this._submitting.set(false);
        this.router.navigate(['/dashboard/supplier', supplier.id]);
      },
      error: (error) => {
        this._error.set(`Failed to update supplier: ${error.message}`);
        this._submitting.set(false);
      }
    });
  }

  // Helper methods
  formatCurrencyInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^\d]/g, '');
    const formatted = SupplierFactureUtils.formatCurrency(parseInt(value) || 0);
    input.value = formatted.replace('Rp ', '');
  }

  private parseCurrency(value: string): number {
    return parseInt(value.replace(/[^\d]/g, '') || '0', 10);
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.supplierForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.supplierForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (errors['minlength']) return `${this.getFieldLabel(fieldName)} is too short`;
    if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} is too long`;
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['min']) return `${this.getFieldLabel(fieldName)} must be greater than ${errors['min'].min}`;
    if (errors['max']) return `${this.getFieldLabel(fieldName)} must be less than ${errors['max'].max}`;
    if (errors['indonesianPhone']) return 'Please enter a valid Indonesian phone number';
    if (errors['companyExists']) return 'Company name already exists in this branch';
    if (errors['codeExists']) return 'Supplier code already exists';
    if (errors['emailExists']) return 'Email address already exists';

    return 'Invalid input';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      supplierCode: 'Supplier Code',
      companyName: 'Company Name',
      contactPerson: 'Contact Person',
      phone: 'Phone Number',
      email: 'Email Address',
      address: 'Address',
      paymentTerms: 'Payment Terms',
      creditLimit: 'Credit Limit'
    };
    return labels[fieldName] || fieldName;
  }

  saveAsDraft(): void {
    // TODO: Implement draft save functionality
    this.toastService.showInfo('Info', 'Draft save functionality coming soon');
  }

  canSaveAsDraft(): boolean {
    return this.supplierForm.dirty && !this.submitting();
  }

  navigateBack(): void {
    this.router.navigate(['/dashboard/supplier']);
  }

  clearError(): void {
    this._error.set(null);
  }

  // Debug methods
  getFormValue(): any {
    return this.supplierForm.value;
  }
}