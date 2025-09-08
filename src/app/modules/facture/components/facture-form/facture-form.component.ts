import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, EMPTY, forkJoin, of } from 'rxjs';
import { FactureService } from '../../services/facture.service';
import { SupplierService } from '../../../supplier/services/supplier.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ProductService, Product, UpdateProductRequest } from '../../../../core/services/product.service';
import {
  ReceiveFactureDto,
  CreateFactureItemDto,
} from '../../interfaces/facture.interfaces';
import { SupplierDto } from '../../../supplier/interfaces/supplier.interfaces';

interface FactureItemFormValue {
  productId: number | null;
  originalBuyPrice: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
}

@Component({
  selector: 'app-facture-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="facture-form-container">
      <div class="form-header">
        <h2>Receive Supplier Invoice</h2>
        <p>Enter details for the supplier invoice to begin the verification workflow</p>
      </div>

      <form [formGroup]="factureForm" (ngSubmit)="onSubmit()" class="facture-form">
        <div class="form-sections">
          
          <div class="form-section">
            <h3 class="section-title">Invoice Information</h3>
            
            <div class="form-row">
              <div class="form-field">
                <label for="supplier">Supplier *</label>
                <select id="supplier" formControlName="supplierId" class="form-control" [class.error]="isFieldInvalid('supplierId')" [disabled]="loading()">
                  <option value="">{{ loading() ? 'Loading suppliers...' : 'Select Supplier' }}</option>
                  <option *ngFor="let supplier of suppliers()" [value]="supplier.id">
                    {{ supplier.companyName }} ({{ supplier.supplierCode }})
                  </option>
                </select>
                <div *ngIf="isFieldInvalid('supplierId')" class="error-message">Please select a supplier</div>
                
                <!-- Debug info -->
                <div class="text-xs text-gray-500 mt-1" *ngIf="suppliers().length > 0">
                  {{ suppliers().length }} supplier(s) loaded
                </div>
              </div>

              <div class="form-field">
                <label for="invoiceNumber">Supplier Invoice Number *</label>
                <input id="invoiceNumber" type="text" formControlName="supplierInvoiceNumber" class="form-control" [class.error]="isFieldInvalid('supplierInvoiceNumber')" placeholder="Enter supplier's invoice number">
                <div *ngIf="isFieldInvalid('supplierInvoiceNumber')" class="error-message">Invoice number is required</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="invoiceDate">Invoice Date *</label>
                <input id="invoiceDate" type="date" formControlName="invoiceDate" class="form-control" [class.error]="isFieldInvalid('invoiceDate')">
                <div *ngIf="isFieldInvalid('invoiceDate')" class="error-message">Invoice date is required</div>
              </div>

              <div class="form-field">
                <label for="dueDate">Due Date *</label>
                <input id="dueDate" type="date" formControlName="dueDate" class="form-control" [class.error]="isFieldInvalid('dueDate')">
                <div *ngIf="isFieldInvalid('dueDate')" class="error-message">Due date is required</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field form-field-total-amount">
                <label for="totalAmount">Total Amount *</label>
                <input id="totalAmount" type="text" formControlName="totalAmount" (input)="formatCurrencyOnInput($event.target, 'totalAmount')" class="form-control" [class.error]="isFieldInvalid('totalAmount')" placeholder="Rp 0">
                <div *ngIf="isFieldInvalid('totalAmount')" class="error-message">Total amount is required</div>
              </div>
            </div>
            
            <div class="form-field full-width">
              <label for="description">Description</label>
              <textarea id="description" formControlName="description" class="form-control" rows="3" placeholder="Additional notes about this invoice..."></textarea>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title">Invoice Items</h3>
              <button type="button" class="btn btn-outline btn-sm" (click)="addItem()">+ Add Item</button>
            </div>
            
            <div formArrayName="items" class="items-container">
              <div *ngFor="let itemControl of itemControls.controls; let i = index" [formGroupName]="i" class="item-row">
                <div class="item-fields">
                  <div class="form-field autocomplete-field">
                    <label>Supplier Item Description *</label>
                    <input type="text" formControlName="description" (input)="searchProducts(i, $event)" (focus)="setActiveAutocomplete(i)" class="form-control" placeholder="Start typing to search for a product...">
                    <div *ngIf="activeAutocompleteIndex() === i && productSuggestions().length > 0" class="autocomplete-suggestions">
                      <div *ngFor="let product of productSuggestions()" (click)="selectProduct(i, product)" class="suggestion-item">
                        {{ product.name }}
                      </div>
                    </div>
                  </div>
                  
                  <div class="form-field quantity">
                    <label>Quantity *</label>
                    <input type="number" step="1" formControlName="quantity" class="form-control" placeholder="1">
                  </div>
                  
                  <div class="form-field price">
                    <label>Unit Price *</label>
                    <input type="text" formControlName="unitPrice" (input)="formatCurrencyOnInput($event.target, 'unitPrice', i)" class="form-control" placeholder="Rp 0">
                  </div>
                  
                  <div class="form-field total">
                    <label>Total</label>
                    <input type="text" formControlName="totalAmount" class="form-control" readonly>
                  </div>
                  
                  <div class="form-field actions">
                    <button type="button" class="btn btn-error btn-sm" (click)="removeItem(i)" [disabled]="itemControls.length <= 1">🗑️</button>
                  </div>
                </div>
              </div>
              
              <div *ngIf="itemControls.length === 0" class="no-items">
                <p>No items added. Click "Add Item" to start.</p>
              </div>
            </div>
          </div>

        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" (click)="onCancel()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="factureForm.invalid || loading()">
            {{ loading() ? 'Submitting...' : 'Receive Invoice' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .facture-form-container { padding: var(--s6); max-width: 1200px; margin: 0 auto; }
    .form-header { margin-bottom: var(--s8); text-align: center; }
    .form-header h2 { font-size: var(--text-3xl); font-weight: var(--font-bold); color: var(--text-primary); margin: 0 0 var(--s2) 0; }
    .form-header p { font-size: var(--text-base); color: var(--text-secondary); margin: 0; }
    .facture-form { background: var(--surface); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border); }
    .form-section { padding: var(--s6); border-bottom: 1px solid var(--border); }
    .form-section:last-child { border-bottom: none; }
    .section-title { font-size: var(--text-xl); font-weight: var(--font-semibold); color: var(--text-primary); margin: 0 0 var(--s5) 0; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s5); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s4); margin-bottom: var(--s4); }
    .form-field { margin-bottom: var(--s4); }
    .form-field.full-width { grid-column: 1 / -1; }
    .form-field label { display: block; font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--text-primary); margin-bottom: var(--s2); }
    .form-control { width: 100%; padding: var(--s3); border: 1px solid var(--border); border-radius: var(--radius); font-size: var(--text-base); background: var(--surface); color: var(--text-primary); transition: var(--transition); min-height: 44px; }
    .form-control:focus { outline: none; border-color: var(--primary); }
    .form-control.error { border-color: var(--error); }
    .error-message { color: var(--error); font-size: var(--text-xs); margin-top: var(--s1); }
    .items-container { margin-top: var(--s4); }
    .item-row { background: var(--bg-secondary); border-radius: var(--radius); padding: var(--s4); margin-bottom: var(--s3); }
    .item-fields { display: grid; grid-template-columns: 2fr 100px 120px 120px 60px; gap: var(--s3); align-items: end; }
    .no-items { text-align: center; padding: var(--s8); color: var(--text-secondary); }
    .form-actions { display: flex; justify-content: flex-end; gap: var(--s3); padding: var(--s6); background: var(--bg-secondary); border-top: 1px solid var(--border); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--s2); padding: var(--s3) var(--s5); border: 1px solid transparent; border-radius: var(--radius); font-size: var(--text-sm); font-weight: var(--font-medium); cursor: pointer; transition: var(--transition); text-decoration: none; min-height: 44px; }
    .btn-primary { background: var(--primary); color: white; border-color: var(--primary); }
    .btn-primary:hover:not(:disabled) { background: var(--primary-hover); border-color: var(--primary-hover); }
    .btn-outline { background: var(--surface); color: var(--text-primary); border-color: var(--border); }
    .btn-outline:hover:not(:disabled) { background: var(--primary); color: white; border-color: var(--primary); }
    .btn-error { background: var(--error); color: white; border-color: var(--error); }
    .btn-sm { padding: var(--s2) var(--s3); font-size: var(--text-xs); min-height: 36px; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .form-field-total-amount { grid-column: 1 / -1; }
    .form-field-total-amount .form-control { font-size: 2rem; font-weight: bold; text-align: center; }
    .autocomplete-field { position: relative; }
    .autocomplete-suggestions { position: absolute; background: white; border: 1px solid #ccc; z-index: 1000; width: 100%; max-height: 200px; overflow-y: auto; }
    .suggestion-item { padding: 8px; cursor: pointer; }
    .suggestion-item:hover { background-color: #f0f0f0; }
    @media (max-width: 768px) {
      .form-row { grid-template-columns: 1fr; }
      .item-fields { grid-template-columns: 1fr; gap: var(--s2); }
      .section-header { flex-direction: column; align-items: stretch; gap: var(--s3); }
      .form-actions { flex-direction: column; }
    }
  `]
})
export class FactureFormComponent implements OnInit, OnDestroy {
  private readonly factureService = inject(FactureService);
  private readonly supplierService = inject(SupplierService);
  private readonly productService = inject(ProductService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly destroy$ = new Subject<void>();
  
  suppliers = signal<SupplierDto[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  productSuggestions = signal<Product[]>([]);
  activeAutocompleteIndex = signal<number | null>(null);
  private searchTerms = new Subject<string>();

  factureForm: FormGroup;

  constructor() {
    this.factureForm = this.fb.group({
      supplierId: ['', [Validators.required]],
      supplierInvoiceNumber: ['', [Validators.required, Validators.minLength(3)]],
      invoiceDate: ['', [Validators.required]],
      dueDate: ['', [Validators.required]],
      totalAmount: ['Rp 0', [Validators.required]],
      description: [''],
      items: this.fb.array([])
    });

    this.addItem();
  }

  ngOnInit(): void {
    this.loadSuppliers();
    this.setupFormSubscriptions();
    this.setupProductSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get itemControls(): FormArray {
    return this.factureForm.get('items') as FormArray;
  }

  private loadSuppliers(): void {
    console.log('🔄 Loading suppliers for facture form...');
    this.loading.set(true);
    this.error.set(null);
    
    this.supplierService.getSuppliers({ page: 1, pageSize: 100, sortBy: 'companyName', sortOrder: 'asc', isActive: true }).subscribe({
      next: (response) => {
        console.log('✅ Supplier service response:', response);
        
        // The response structure from SupplierService.getSuppliers returns SupplierPagedResponseDto
        const suppliersList = response.suppliers || [];
        console.log('📋 Extracted suppliers list:', suppliersList);
        
        this.suppliers.set(suppliersList);
        
        if (suppliersList.length === 0) {
          console.warn('⚠️ No suppliers found - checking if backend is available or creating fallback data');
          
          // Create fallback suppliers for testing when backend is not available
          const fallbackSuppliers = this.createFallbackSuppliers();
          this.suppliers.set(fallbackSuppliers);
          
          this.toastService.showWarning('Warning', `Using fallback supplier data (${fallbackSuppliers.length} suppliers). Please check backend connection.`);
        } else {
          console.log('✅ Loaded', suppliersList.length, 'suppliers for dropdown');
        }
        
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Failed to load suppliers:', error);
        console.error('❌ Error details:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        
        let errorMessage = 'Failed to load suppliers';
        
        if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check if backend is running.';
        } else if (error.status === 404) {
          errorMessage = 'Supplier endpoint not found. Please check backend configuration.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        // Create fallback suppliers for testing when backend is completely unavailable
        const fallbackSuppliers = this.createFallbackSuppliers();
        this.suppliers.set(fallbackSuppliers);
        
        this.toastService.showError('Error', errorMessage + ` Using fallback data (${fallbackSuppliers.length} suppliers) for testing.`);
        this.loading.set(false);
      }
    });
  }

  private setupFormSubscriptions(): void {
    this.itemControls.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateTotalAmount());
  }

  private setupProductSearch(): void {
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => term ? this.productService.getProducts({ search: term, pageSize: 10 }) : EMPTY),
      catchError(() => EMPTY),
      takeUntil(this.destroy$)
    ).subscribe(response => {
      if (response.data) {
        this.productSuggestions.set(response.data.products);
      }
    });
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      productId: [null],
      originalBuyPrice: [null],
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: ['Rp 0', [Validators.required]],
      totalAmount: [{ value: 'Rp 0', disabled: true }]
    });

    itemGroup.get('quantity')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateItemTotal(itemGroup));
    itemGroup.get('unitPrice')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateItemTotal(itemGroup));

    this.itemControls.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.itemControls.length > 1) {
      this.itemControls.removeAt(index);
    }
  }

  searchProducts(index: number, event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.setActiveAutocomplete(index);
    this.searchTerms.next(searchTerm);
  }

  setActiveAutocomplete(index: number): void {
    this.activeAutocompleteIndex.set(index);
  }

  selectProduct(index: number, product: Product): void {
    const itemGroup = this.itemControls.at(index) as FormGroup;
    itemGroup.patchValue({
      productId: product.id,
      description: product.name,
      unitPrice: this.formatIDR(product.buyPrice),
      originalBuyPrice: product.buyPrice
    });
    this.updateItemTotal(itemGroup);
    this.productSuggestions.set([]);
    this.activeAutocompleteIndex.set(null);
  }

  private updateItemTotal(itemGroup: FormGroup): void {
    const quantity = itemGroup.get('quantity')?.value || 0;
    const unitPrice = this.parseCurrency(itemGroup.get('unitPrice')?.value) || 0;
    const total = quantity * unitPrice;
    itemGroup.get('totalAmount')?.setValue(this.formatIDR(total), { emitEvent: false });
  }

  private updateTotalAmount(): void {
    const total = this.itemControls.controls.reduce((sum, control) => {
      const itemTotal = this.parseCurrency((control as FormGroup).getRawValue().totalAmount);
      return sum + itemTotal;
    }, 0);
    this.factureForm.get('totalAmount')?.setValue(this.formatIDR(total), { emitEvent: false });
  }

  private parseCurrency(value: string): number {
    if (!value) return 0;
    const parsed = parseFloat(value.replace(/[^0-9]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  private formatIDR(value: number): string {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(value);
  }

  formatCurrencyOnInput(target: any, controlName: string, index?: number) {
    let value = target.value;
    value = value.replace(/[^0-9]/g, '');
    const control = index !== undefined ? this.itemControls.at(index).get(controlName) : this.factureForm.get(controlName);
    if (control) {
      control.setValue(this.formatIDR(this.parseCurrency(value)), { emitEvent: true });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.factureForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.factureForm.invalid) {
      this.markFormGroupTouched(this.factureForm);
      this.toastService.showError('Error', 'Please correct the errors in the form');
      return;
    }

    this.loading.set(true);
    const formValue = this.factureForm.getRawValue();
    const invoiceDate = new Date(formValue.invoiceDate);
    const dueDate = new Date(formValue.dueDate);

    const priceUpdateObservables = formValue.items.map((item: FactureItemFormValue) => {
      if (item.productId && this.parseCurrency(item.unitPrice) !== item.originalBuyPrice) {
        return this.productService.getProductById(item.productId).pipe(
          switchMap(response => {
            if (response.data) {
              const product = response.data;
              const updateRequest: UpdateProductRequest = {
                id: product.id,
                name: product.name,
                barcode: product.barcode,
                stock: product.stock,
                buyPrice: this.parseCurrency(item.unitPrice),
                sellPrice: product.sellPrice,
                categoryId: product.categoryId,
                minStock: product.minStock,
                isActive: product.isActive
              };
              return this.productService.updateProduct(product.id, updateRequest);
            }
            return of(null);
          })
        );
      }
      return of(null);
    });

    forkJoin(priceUpdateObservables).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const receiveDto: ReceiveFactureDto = {
        supplierId: parseInt(formValue.supplierId) || 0,
        branchId: 1,
        supplierInvoiceNumber: formValue.supplierInvoiceNumber?.trim() || '',
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        totalAmount: this.parseCurrency(formValue.totalAmount),
        tax: 0,
        discount: 0,
        description: formValue.description?.trim() || '',
        items: (formValue.items || []).map((item: FactureItemFormValue): CreateFactureItemDto => ({
          productId: item.productId === null ? undefined : item.productId,
          supplierItemDescription: item.description?.trim() || 'No description provided',
          quantity: item.quantity || 1,
          unitPrice: this.parseCurrency(item.unitPrice),
          taxRate: 0,
          discountAmount: 0,
        }))
      };

      const validationErrors = this.validateReceiveDto(receiveDto);
      if (validationErrors.length > 0) {
        this.loading.set(false);
        this.error.set('Please fix the following errors: ' + validationErrors.join(', '));
        return;
      }

      this.factureService.receiveSupplierInvoice(receiveDto).subscribe({
        next: (response) => {
          const stockUpdateObservables = (formValue.items || []).map((item: FactureItemFormValue) => {
            if (item.productId) {
              return this.productService.addStockIncrement(item.productId, item.quantity, `Received from invoice ${formValue.supplierInvoiceNumber}`);
            }
            return of(null);
          });
          forkJoin(stockUpdateObservables).pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.toastService.showSuccess('Success', 'Invoice received and stock updated successfully');
            this.router.navigate(['/dashboard/facture']);
          });
        },
        error: (error) => {
          this.toastService.showError('Error', 'Failed to receive invoice. Backend may not be available.');
          this.loading.set(false);
        }
      });
    });
  }

  onCancel(): void {
    this.router.navigate(['/dashboard/facture']);
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();
        if (control instanceof FormGroup || control instanceof FormArray) {
          this.markFormGroupTouched(control);
        }
      }
    });
  }

  private validateReceiveDto(dto: ReceiveFactureDto): string[] {
    const errors: string[] = [];
    if (!dto.supplierId) errors.push('Supplier is required');
    if (!dto.supplierInvoiceNumber) errors.push('Supplier invoice number is required');
    if (!dto.invoiceDate || isNaN(dto.invoiceDate.getTime())) errors.push('Valid invoice date is required');
    if (!dto.dueDate || isNaN(dto.dueDate.getTime())) errors.push('Valid due date is required');
    if (dto.totalAmount <= 0) errors.push('Total amount must be greater than 0');
    if (dto.invoiceDate && dto.dueDate && dto.dueDate < dto.invoiceDate) errors.push('Due date must be after invoice date');
    if (!dto.items || dto.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      dto.items.forEach((item, index) => {
        if (!item.supplierItemDescription) errors.push(`Item ${index + 1}: Description is required`);
        if (item.quantity <= 0) errors.push(`Item ${index + 1}: Quantity must be > 0`);
        if (item.unitPrice < 0) errors.push(`Item ${index + 1}: Unit price cannot be negative`);
      });
    }
    return errors;
  }

  private createFallbackSuppliers(): SupplierDto[] {
    console.log('🔧 Creating fallback supplier data for testing...');
    
    const fallbackSuppliers: SupplierDto[] = [
      {
        id: 1,
        supplierCode: 'SUP001',
        companyName: 'PT Sumber Rejeki',
        contactPerson: 'Budi Santoso',
        phone: '021-1234567',
        email: 'budi@sumberrejeki.com',
        address: 'Jl. Sudirman No. 123, Jakarta',
        paymentTerms: 30,
        creditLimit: 50000000,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        supplierCode: 'SUP002', 
        companyName: 'CV Maju Bersama',
        contactPerson: 'Siti Rahma',
        phone: '021-2345678',
        email: 'siti@majubersama.com',
        address: 'Jl. Thamrin No. 456, Jakarta',
        paymentTerms: 45,
        creditLimit: 75000000,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        supplierCode: 'SUP003',
        companyName: 'PT Cahaya Baru',
        contactPerson: 'Ahmad Wijaya',
        phone: '021-3456789',
        email: 'ahmad@cahayabaru.com',
        address: 'Jl. Kuningan No. 789, Jakarta',
        paymentTerms: 30,
        creditLimit: 60000000,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 4,
        supplierCode: 'SUP004',
        companyName: 'UD Berkah Jaya',
        contactPerson: 'Rina Dewi',
        phone: '021-4567890',
        email: 'rina@berkahjaya.com',
        address: 'Jl. Gatot Subroto No. 321, Jakarta',
        paymentTerms: 60,
        creditLimit: 40000000,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 5,
        supplierCode: 'SUP005',
        companyName: 'PT Indo Sukses',
        contactPerson: 'Bambang Prakoso',
        phone: '021-5678901',
        email: 'bambang@indosukses.com',
        address: 'Jl. Rasuna Said No. 654, Jakarta',
        paymentTerms: 30,
        creditLimit: 80000000,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log('✅ Created fallback suppliers:', fallbackSuppliers.length);
    return fallbackSuppliers;
  }
}