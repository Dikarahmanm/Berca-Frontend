import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FactureService } from '../../services/facture.service';
import { SupplierService } from '../../../supplier/services/supplier.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  ReceiveFactureDto,
  CreateFactureItemDto,
  FactureItemDto,
  FacturePriority
} from '../../interfaces/facture.interfaces';
import { SupplierDto } from '../../../supplier/interfaces/supplier.interfaces';

@Component({
  selector: 'app-facture-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="facture-form-container">
      <!-- Header -->
      <div class="form-header">
        <h2>Receive Supplier Invoice</h2>
        <p>Enter details for the supplier invoice to begin the verification workflow</p>
      </div>

      <!-- Form -->
      <form [formGroup]="factureForm" (ngSubmit)="onSubmit()" class="facture-form">
        <div class="form-sections">
          
          <!-- Basic Information Section -->
          <div class="form-section">
            <h3 class="section-title">Invoice Information</h3>
            
            <div class="form-row">
              <div class="form-field">
                <label for="supplier">Supplier *</label>
                <select 
                  id="supplier" 
                  formControlName="supplierId" 
                  class="form-control"
                  [class.error]="isFieldInvalid('supplierId')">
                  <option value="">Select Supplier</option>
                  <option *ngFor="let supplier of suppliers()" [value]="supplier.id">
                    {{ supplier.companyName }} ({{ supplier.supplierCode }})
                  </option>
                </select>
                <div *ngIf="isFieldInvalid('supplierId')" class="error-message">
                  Please select a supplier
                </div>
              </div>

              <div class="form-field">
                <label for="invoiceNumber">Supplier Invoice Number *</label>
                <input 
                  id="invoiceNumber"
                  type="text" 
                  formControlName="supplierInvoiceNumber" 
                  class="form-control"
                  [class.error]="isFieldInvalid('supplierInvoiceNumber')"
                  placeholder="Enter supplier's invoice number">
                <div *ngIf="isFieldInvalid('supplierInvoiceNumber')" class="error-message">
                  Invoice number is required
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="invoiceDate">Invoice Date *</label>
                <input 
                  id="invoiceDate"
                  type="date" 
                  formControlName="invoiceDate" 
                  class="form-control"
                  [class.error]="isFieldInvalid('invoiceDate')">
                <div *ngIf="isFieldInvalid('invoiceDate')" class="error-message">
                  Invoice date is required
                </div>
              </div>

              <div class="form-field">
                <label for="dueDate">Due Date *</label>
                <input 
                  id="dueDate"
                  type="date" 
                  formControlName="dueDate" 
                  class="form-control"
                  [class.error]="isFieldInvalid('dueDate')">
                <div *ngIf="isFieldInvalid('dueDate')" class="error-message">
                  Due date is required
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="totalAmount">Total Amount *</label>
                <input 
                  id="totalAmount"
                  type="number" 
                  step="0.01"
                  formControlName="totalAmount" 
                  class="form-control"
                  [class.error]="isFieldInvalid('totalAmount')"
                  placeholder="0.00">
                <div *ngIf="isFieldInvalid('totalAmount')" class="error-message">
                  Total amount is required
                </div>
              </div>

              <div class="form-field">
                <label for="priority">Priority</label>
                <select 
                  id="priority" 
                  formControlName="priority" 
                  class="form-control">
                  <option [value]="FacturePriority.LOW">Low</option>
                  <option [value]="FacturePriority.NORMAL">Normal</option>
                  <option [value]="FacturePriority.HIGH">High</option>
                  <option [value]="FacturePriority.URGENT">Urgent</option>
                </select>
              </div>
            </div>
            
            <div class="form-field full-width">
              <label for="description">Description</label>
              <textarea 
                id="description"
                formControlName="description" 
                class="form-control"
                rows="3"
                placeholder="Additional notes about this invoice..."></textarea>
            </div>
          </div>

          <!-- Invoice Items Section -->
          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title">Invoice Items</h3>
              <button type="button" class="btn btn-outline btn-sm" (click)="addItem()">
                + Add Item
              </button>
            </div>
            
            <div formArrayName="items" class="items-container">
              <div *ngFor="let itemControl of itemControls.controls; let i = index" 
                   [formGroupName]="i" 
                   class="item-row">
                
                <div class="item-fields">
                  <div class="form-field">
                    <label>Supplier Item Description *</label>
                    <input 
                      type="text" 
                      formControlName="description" 
                      class="form-control"
                      placeholder="Enter supplier's item description (minimum 3 characters)">
                  </div>
                  
                  <div class="form-field quantity">
                    <label>Quantity *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      formControlName="quantity" 
                      class="form-control"
                      placeholder="1">
                  </div>
                  
                  <div class="form-field price">
                    <label>Unit Price *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      formControlName="unitPrice" 
                      class="form-control"
                      placeholder="0.00">
                  </div>
                  
                  <div class="form-field total">
                    <label>Total</label>
                    <input 
                      type="number" 
                      step="0.01"
                      formControlName="totalAmount" 
                      class="form-control"
                      readonly>
                  </div>
                  
                  <div class="form-field actions">
                    <button 
                      type="button" 
                      class="btn btn-error btn-sm" 
                      (click)="removeItem(i)"
                      [disabled]="itemControls.length <= 1">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
              
              <div *ngIf="itemControls.length === 0" class="no-items">
                <p>No items added. Click "Add Item" to start.</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button 
            type="button" 
            class="btn btn-outline" 
            (click)="onCancel()">
            Cancel
          </button>
          
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="factureForm.invalid || loading()">
            {{ loading() ? 'Submitting...' : 'Receive Invoice' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .facture-form-container {
      padding: var(--s6);
      max-width: 1200px;
      margin: 0 auto;
    }

    .form-header {
      margin-bottom: var(--s8);
      text-align: center;
    }

    .form-header h2 {
      font-size: var(--text-3xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
      margin: 0 0 var(--s2) 0;
    }

    .form-header p {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: 0;
    }

    .facture-form {
      background: var(--surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .form-section {
      padding: var(--s6);
      border-bottom: 1px solid var(--border);
    }

    .form-section:last-child {
      border-bottom: none;
    }

    .section-title {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      margin: 0 0 var(--s5) 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--s5);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s4);
      margin-bottom: var(--s4);
    }

    .form-field {
      margin-bottom: var(--s4);
    }

    .form-field.full-width {
      grid-column: 1 / -1;
    }

    .form-field label {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
      margin-bottom: var(--s2);
    }

    .form-control {
      width: 100%;
      padding: var(--s3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: var(--text-base);
      background: var(--surface);
      color: var(--text-primary);
      transition: var(--transition);
      min-height: 44px;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary);
    }

    .form-control.error {
      border-color: var(--error);
    }

    .error-message {
      color: var(--error);
      font-size: var(--text-xs);
      margin-top: var(--s1);
    }

    /* Items Section */
    .items-container {
      margin-top: var(--s4);
    }

    .item-row {
      background: var(--bg-secondary);
      border-radius: var(--radius);
      padding: var(--s4);
      margin-bottom: var(--s3);
    }

    .item-fields {
      display: grid;
      grid-template-columns: 2fr 100px 120px 120px 60px;
      gap: var(--s3);
      align-items: end;
    }

    .no-items {
      text-align: center;
      padding: var(--s8);
      color: var(--text-secondary);
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--s3);
      padding: var(--s6);
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--s2);
      padding: var(--s3) var(--s5);
      border: 1px solid transparent;
      border-radius: var(--radius);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      min-height: 44px;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }

    .btn-outline {
      background: var(--surface);
      color: var(--text-primary);
      border-color: var(--border);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .btn-error {
      background: var(--error);
      color: white;
      border-color: var(--error);
    }

    .btn-sm {
      padding: var(--s2) var(--s3);
      font-size: var(--text-xs);
      min-height: 36px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .item-fields {
        grid-template-columns: 1fr;
        gap: var(--s2);
      }

      .section-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--s3);
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class FactureFormComponent implements OnInit, OnDestroy {
  // Injected services
  private readonly factureService = inject(FactureService);
  private readonly supplierService = inject(SupplierService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Component state
  private readonly destroy$ = new Subject<void>();
  
  // Signals
  suppliers = signal<SupplierDto[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Form
  factureForm: FormGroup;

  // Expose enum for template
  readonly FacturePriority = FacturePriority;

  constructor() {
    this.factureForm = this.fb.group({
      supplierId: ['', [Validators.required]],
      supplierInvoiceNumber: ['', [Validators.required, Validators.minLength(3)]],
      invoiceDate: ['', [Validators.required]],
      dueDate: ['', [Validators.required]],
      totalAmount: [0, [Validators.required, Validators.min(0.01)]],
      priority: [FacturePriority.NORMAL],
      description: [''],
      items: this.fb.array([])
    });

    // Add initial item
    this.addItem();
  }

  ngOnInit(): void {
    this.loadSuppliers();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Form Array getters
  get itemControls(): FormArray {
    return this.factureForm.get('items') as FormArray;
  }

  // Data loading
  private loadSuppliers(): void {
    this.supplierService.getSuppliers({
      page: 1,
      pageSize: 100,
      sortBy: 'companyName',
      sortOrder: 'asc',
      isActive: true
    }).subscribe({
      next: (response) => {
        this.suppliers.set(response.suppliers || []);
      },
      error: (error) => {
        console.error('Failed to load suppliers:', error);
        this.toastService.showError('Error', 'Failed to load suppliers');
        // Set empty array so form doesn't break
        this.suppliers.set([]);
      }
    });
  }

  // Form subscriptions
  private setupFormSubscriptions(): void {
    // Auto-calculate total when items change
    this.itemControls.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateTotalAmount();
      });
  }

  // Item management
  addItem(): void {
    const itemGroup = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]],
      totalAmount: [0]
    });

    // Subscribe to quantity/price changes to update total
    itemGroup.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const total = (value.quantity || 0) * (value.unitPrice || 0);
        itemGroup.get('totalAmount')?.setValue(total, { emitEvent: false });
      });

    this.itemControls.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.itemControls.length > 1) {
      this.itemControls.removeAt(index);
      this.updateTotalAmount();
    }
  }

  private updateTotalAmount(): void {
    const total = this.itemControls.controls.reduce((sum, control) => {
      return sum + (control.get('totalAmount')?.value || 0);
    }, 0);
    
    this.factureForm.get('totalAmount')?.setValue(total, { emitEvent: false });
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.factureForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Form submission
  onSubmit(): void {
    if (this.factureForm.invalid) {
      this.markFormGroupTouched(this.factureForm);
      this.toastService.showError('Error', 'Please correct the errors in the form');
      return;
    }

    this.loading.set(true);
    
    const formValue = this.factureForm.value;
    
    console.log('🔍 Raw form values:', formValue);
    
    // Ensure dates are properly formatted
    const invoiceDate = formValue.invoiceDate instanceof Date 
      ? formValue.invoiceDate 
      : new Date(formValue.invoiceDate);
    const dueDate = formValue.dueDate instanceof Date 
      ? formValue.dueDate 
      : new Date(formValue.dueDate);
    
    console.log('📅 Date processing:');
    console.log('  - Original invoiceDate:', formValue.invoiceDate);
    console.log('  - Processed invoiceDate:', invoiceDate);
    console.log('  - Original dueDate:', formValue.dueDate);
    console.log('  - Processed dueDate:', dueDate);
    
    const receiveDto: ReceiveFactureDto = {
      supplierId: parseInt(formValue.supplierId) || 0,
      branchId: 1, // Default branch - should be from user context
      supplierInvoiceNumber: formValue.supplierInvoiceNumber?.trim() || '',
      supplierPONumber: formValue.supplierPONumber?.trim() || undefined,
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      deliveryDate: formValue.deliveryDate ? 
        (formValue.deliveryDate instanceof Date ? formValue.deliveryDate : new Date(formValue.deliveryDate)) : 
        undefined,
      totalAmount: parseFloat(formValue.totalAmount) || 0,
      tax: parseFloat(formValue.tax) || 0,
      discount: parseFloat(formValue.discount) || 0,
      priority: formValue.priority || 1, // Default to NORMAL
      description: formValue.description?.trim() || '',
      notes: formValue.notes?.trim() || undefined,
      deliveryNoteNumber: formValue.deliveryNoteNumber?.trim() || undefined,
      items: (formValue.items || []).map((item: any): CreateFactureItemDto => ({
        productId: item.productId ? parseInt(item.productId) : undefined,
        supplierItemCode: item.supplierItemCode?.trim() || undefined,
        supplierItemDescription: item.description?.trim() || 'No description provided', // ✅ Required field
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        taxRate: parseFloat(item.taxRate) || parseFloat(item.tax) || 0, // ✅ Correct field name
        discountAmount: parseFloat(item.discountAmount) || parseFloat(item.discount) || 0, // ✅ Correct field name
        notes: item.notes?.trim() || undefined
      }))
    };

    // Validate required data before submission
    const validationErrors = this.validateReceiveDto(receiveDto);
    if (validationErrors.length > 0) {
      console.error('❌ Validation errors:', validationErrors);
      this.loading.set(false);
      this.error.set('Please fix the following errors: ' + validationErrors.join(', '));
      return;
    }

    console.log('🚀 Submitting facture (validation passed):', receiveDto);

    this.factureService.receiveSupplierInvoice(receiveDto).subscribe({
      next: (response) => {
        console.log('✅ Facture received successfully:', response);
        this.toastService.showSuccess('Success', 'Invoice received successfully');
        this.router.navigate(['/dashboard/facture']);
      },
      error: (error) => {
        console.error('❌ Failed to receive facture:', error);
        this.toastService.showError('Error', 'Failed to receive invoice. Backend may not be available.');
        this.loading.set(false);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/dashboard/facture']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();

        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        }
      }
    });
  }

  // Validation method for ReceiveFactureDto
  private validateReceiveDto(dto: ReceiveFactureDto): string[] {
    const errors: string[] = [];

    // Required fields validation
    if (!dto.supplierId || dto.supplierId === 0) {
      errors.push('Supplier is required');
    }
    if (!dto.supplierInvoiceNumber || dto.supplierInvoiceNumber.trim() === '') {
      errors.push('Supplier invoice number is required');
    }
    if (!dto.invoiceDate || isNaN(dto.invoiceDate.getTime())) {
      errors.push('Valid invoice date is required');
    }
    if (!dto.dueDate || isNaN(dto.dueDate.getTime())) {
      errors.push('Valid due date is required');
    }
    if (dto.totalAmount === undefined || dto.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    // Date validation
    if (dto.invoiceDate && dto.dueDate && dto.dueDate < dto.invoiceDate) {
      errors.push('Due date must be after invoice date');
    }

    // Items validation
    if (!dto.items || dto.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      dto.items.forEach((item, index) => {
        if (!item.supplierItemDescription || item.supplierItemDescription.trim() === '') {
          errors.push(`Item ${index + 1}: Supplier item description is required`);
        }
        if (item.quantity === undefined || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
        if (item.unitPrice === undefined || item.unitPrice < 0) {
          errors.push(`Item ${index + 1}: Unit price cannot be negative`);
        }
      });
    }

    return errors;
  }
}