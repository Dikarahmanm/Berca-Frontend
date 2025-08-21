// ===== PRODUCT FORM COMPONENT =====
// src/app/modules/inventory/components/product-form/product-form.component.ts

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription, firstValueFrom } from 'rxjs';

// Services & Interfaces
import { InventoryService } from '../../services/inventory.service';
import { CategoryService } from '../../../category-management/services/category.service';
import { BarcodeService } from '../../../../core/services/barcode.service';
import { ExpiryManagementService } from '../../../../core/services/expiry-management.service';
import { Product, CreateProductRequest, UpdateProductRequest } from '../../interfaces/inventory.interfaces';
import { Category } from '../../../category-management/models/category.models';
import { ExpiryStatus, ExpiryValidationResult, CreateProductBatch, ProductBatch, BatchStatus, ExpiryFormData } from '../../../../core/interfaces/expiry.interfaces';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatStepperModule,
    MatDividerModule
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit, OnDestroy {
  
  // Inject services using new DI pattern
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private categoryService = inject(CategoryService);
  private barcodeService = inject(BarcodeService);
  private expiryService = inject(ExpiryManagementService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  constructor() {
    console.log('🏗️ ProductFormComponent constructor called');
    console.log('🔧 Services injected successfully');
    console.log('🔄 Initial loading state:', this.loading());
  }

  // Form configuration
  productForm!: FormGroup;
  
  // Signal-based state management
  categories = signal<Category[]>([]);
  selectedCategory = signal<Category | null>(null);
  loading = signal(false);
  saving = signal(false);
  
  // Component state signals
  isEdit = signal(false);
  productId = signal<number | null>(null);
  duplicateData = signal<any>(null);
  
  // Enhanced expiry management signals
  showExpiryField = signal(false);
  categoryRequiresExpiry = signal(false);
  expiryFieldRequired = signal(false);
  expiryValidating = signal(false);
  expiryValidationErrors = signal<string[]>([]);
  
  // Batch management signals
  showBatchFields = signal(false);
  batchFieldsRequired = signal(false);
  existingBatches = signal<ProductBatch[]>([]);
  creatingNewBatch = signal(false);
  batchValidationErrors = signal<string[]>([]);
  selectedBatchId = signal<number | null>(null);
  
  // Barcode management signals
  barcodeError = signal('');
  scannerActive = signal(false);
  
  // ✅ NEW: Batch management modal signals
  batchModalActive = signal(false);
  
  // Computed properties for better UX
  pageTitle = computed(() => this.isEdit() ? 'Edit Product' : 'Add New Product');
  pageSubtitle = computed(() => {
    if (this.isEdit()) return 'Update product information and settings';
    return 'Enter product details to add to inventory';
  });
  
  submitButtonText = computed(() => {
    if (this.saving()) return this.isEdit() ? 'Updating...' : 'Creating...';
    return this.isEdit() ? 'Update Product' : 'Create Product';
  });
  
  canSubmit = computed(() => 
    this.productForm?.valid && 
    !this.saving() && 
    !this.expiryValidating() && 
    this.validateExpiryRequirements()
  );
  
  hasUnsavedChanges = computed(() => 
    this.productForm?.dirty && !this.saving()
  );
  
  // Enhanced expiry status computation
  currentExpiryStatus = computed(() => {
    const expiryDate = this.productForm?.get('expiryDate')?.value;
    if (!expiryDate || !this.categoryRequiresExpiry()) return null;
    
    const days = this.calculateDaysUntilExpiry(expiryDate);
    if (days < 0) return 'expired';
    if (days <= 3) return 'critical';
    if (days <= 7) return 'warning';
    return 'good';
  });
  
  expiryStatusText = computed(() => {
    const status = this.currentExpiryStatus();
    const expiryDate = this.productForm?.get('expiryDate')?.value;
    
    if (!expiryDate || !this.categoryRequiresExpiry()) return '';
    
    const days = this.calculateDaysUntilExpiry(expiryDate);
    
    switch (status) {
      case 'expired':
        return `Expired ${Math.abs(days)} days ago`;
      case 'critical':
        return days === 0 ? 'Expires today' : `${days} days until expiry (Critical)`;
      case 'warning':
        return `${days} days until expiry (Warning)`;
      case 'good':
        return `${days} days until expiry (Good)`;
      default:
        return '';
    }
  });
  
  private subscriptions = new Subscription();

  ngOnInit(): void {
    console.log('🚀 ProductFormComponent ngOnInit started');
    try {
      this.initializeForm();
      console.log('✅ Form initialized');
      this.checkForDuplicateData();
      console.log('✅ Duplicate data checked');
      this.setupSubscriptions();
      console.log('✅ Subscriptions setup');
      this.loadCategories();
      console.log('✅ Categories loading started');
      this.checkEditMode();
      console.log('✅ Edit mode checked');
      
      // Ensure loading is false after initialization for add mode
      if (!this.isEdit()) {
        this.loading.set(false);
        console.log('🆕 Add mode: Loading set to false');
      }
      
      console.log('🎉 ProductFormComponent ngOnInit completed successfully');
      console.log('🔄 Final loading state:', this.loading());
    } catch (error) {
      console.error('❌ Error in ngOnInit:', error);
      this.loading.set(false); // Ensure loading is false even on error
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopBarcodeScanner();
  }

  // ===== INITIALIZATION =====

   private initializeForm(): void {
    console.log('📝 Initializing form...');
    this.productForm = this.fb.group({
      // Product Details
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      barcode: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(1000)]],
      categoryId: [null, [Validators.required]],
      unit: ['pcs', [Validators.required, Validators.maxLength(20)]],
      isActive: [true],
      
      // Pricing
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [0, [Validators.required, Validators.min(0)]],
      
      // Stock
      stock: [0, [Validators.required, Validators.min(0)]],
      minimumStock: [5, [Validators.required, Validators.min(0)]],
      
      // Expiry & Batch (Conditional)
      expiryDate: [null],
      batchNumber: [''],
      productionDate: [null],
      batchInitialStock: [0],
      batchCostPerUnit: [0],
      supplierName: [''],
      purchaseOrderNumber: [''],
      batchNotes: [''],
      createNewBatch: [false],
      selectedExistingBatch: [null]
    }, {
      validators: [this.sellPriceValidator]
    });
    console.log('✅ Form initialized successfully:', !!this.productForm);
  }

  private sellPriceValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const buyPrice = control.get('buyPrice')?.value;
    const sellPrice = control.get('sellPrice')?.value;
    if (buyPrice !== null && sellPrice !== null && sellPrice < buyPrice) {
      return { sellPriceTooLow: true };
    }
    return null;
  }

  private setupSubscriptions(): void {
    // Watch category changes for expiry requirements
    this.subscriptions.add(
      this.productForm.get('categoryId')?.valueChanges.subscribe(categoryId => {
        if (categoryId) {
          this.onCategoryChange(categoryId);
        }
      })
    );
  }

  private checkForDuplicateData(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['duplicateData']) {
      this.duplicateData = navigation.extras.state['duplicateData'];
      this.populateFormWithDuplicate();
    }
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.productId.set(parseInt(id, 10));
      this.loadProduct(this.productId()!);
    }
  }

  // ===== DATA LOADING =====

  private async loadCategories(): Promise<void> {
    console.log('📁 Loading categories...');
    try {
      console.log('📁 Calling categoryService.getCategoriesSimple');
      
      // ✅ FIXED: Use the simple categories endpoint which returns Category[] directly
      const categories = await firstValueFrom(this.categoryService.getCategoriesSimple());
      
      console.log('📁 Categories response received:', categories);
      console.log('📁 Response structure:', { 
        isArray: Array.isArray(categories),
        categoriesLength: categories?.length,
        firstCategory: categories?.[0]
      });
      
      this.categories.set(categories || []);
      console.log('✅ Categories loaded successfully:', categories?.length || 0);
      
      // Log each category for debugging
      categories?.forEach((cat, index) => {
        console.log(`📂 Category ${index + 1}: ID=${cat.id}, Name="${cat.name}"`);
      });
      
    } catch (error: any) {
      console.error('❌ Failed to load categories:', error);
      console.error('❌ Error details:', {
        status: error.status,
        message: error.message,
        error: error.error
      });
      
      // Try alternative approach if simple endpoint fails
      try {
        console.log('🔄 Trying alternative categories loading approach...');
        const response = await firstValueFrom(this.categoryService.getCategories({ 
          page: 1, 
          pageSize: 200, 
          sortBy: 'name',
          sortOrder: 'asc'
        }));
        console.log('📁 Alternative response received:', response);
        this.categories.set(response.categories || []);
        console.log('✅ Categories loaded via alternative method:', response.categories?.length || 0);
      } catch (altError) {
        console.error('❌ Alternative loading also failed:', altError);
        this.showError('Failed to load categories. Please check your connection and try again.');
      }
    }
  }

  private loadProduct(id: number): void {
    this.loading.set(true);
    this.subscriptions.add(
      this.inventoryService.getProduct(id).subscribe({
        next: (product) => {
          const productData = product as any; // Type assertion for expiryDate
          this.productForm.patchValue({
            ...product,
            expiryDate: productData.expiryDate ? new Date(productData.expiryDate).toISOString().split('T')[0] : null
          });
          if (product.categoryId) {
            this.onCategoryChange(product.categoryId);
          }
          if (this.isEdit()) {
            this.loadProductBatches(id);
          }
          this.loading.set(false);
        },
        error: (error) => {
          this.showError('Failed to load product: ' + error.message);
          this.loading.set(false);
        }
      })
    );
  }

  private populateFormWithDuplicate(): void {
    this.productForm.patchValue({
      ...this.duplicateData,
      barcode: '',
      stock: 0,
      isActive: true
    });
  }

  // ===== FORM SUBMISSION =====

  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.showError('Please correct the errors on the form.');
      return;
    }

    this.saving.set(true);
    const formData = this.productForm.value;

    const request: CreateProductRequest | UpdateProductRequest = {
      name: formData.name.trim(),
      barcode: formData.barcode.trim(),
      description: formData.description?.trim() || '',
      categoryId: formData.categoryId,
      buyPrice: parseFloat(formData.buyPrice),
      sellPrice: parseFloat(formData.sellPrice),
      stock: parseInt(formData.stock),
      minimumStock: parseInt(formData.minimumStock),
      unit: formData.unit?.trim() || 'pcs',
      isActive: formData.isActive,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined
    };

    try {
      if (this.isEdit() && this.productId()) {
        await this.handleProductUpdate(this.productId()!, request as UpdateProductRequest, formData);
      } else {
        await this.handleProductCreation(request as CreateProductRequest, formData);
      }
    } catch (error: any) {
      this.showError(error.message || 'An unexpected error occurred.');
    } finally {
      this.saving.set(false);
    }
  }

  private async handleProductCreation(request: CreateProductRequest, formData: any): Promise<void> {
    const createdProduct = await firstValueFrom(this.inventoryService.createProduct(request));
    if (!createdProduct) throw new Error('Failed to create product.');

    if (this.showBatchFields() && this.creatingNewBatch() && formData.batchNumber?.trim()) {
      await this.createProductBatch(createdProduct.id, formData);
    }

    this.showSuccess('Product created successfully');
    this.router.navigate(['/dashboard/inventory']);
  }

  private async handleProductUpdate(productId: number, request: UpdateProductRequest, formData: any): Promise<void> {
    await firstValueFrom(this.inventoryService.updateProduct(productId, request));

    if (this.showBatchFields()) {
      if (this.creatingNewBatch() && formData.batchNumber?.trim()) {
        await this.createProductBatch(productId, formData);
      } else if (formData.selectedExistingBatch) {
        // Update existing batch logic can be added here if needed
      }
    }

    this.showSuccess('Product updated successfully');
    this.router.navigate(['/dashboard/inventory']);
  }

  onCancel(): void {
    this.router.navigate(['/dashboard/inventory']);
  }

  // ===== EXPIRY & BATCH MANAGEMENT =====

  async onCategoryChange(categoryId: number): Promise<void> {
    if (!categoryId) {
      this.resetExpiryFields();
      return;
    }

    try {
      this.expiryValidating.set(true);
      
      // Get category details and expiry requirements
      const [categoryResponse, expiryResponse] = await Promise.all([
        firstValueFrom(this.categoryService.getCategoryById(categoryId)),
        this.expiryService.checkCategoryRequiresExpiry(categoryId)
      ]);
      
      // Update signals with category information
      this.selectedCategory.set(categoryResponse);
      this.categoryRequiresExpiry.set(expiryResponse.requiresExpiry);
      this.showExpiryField.set(expiryResponse.requiresExpiry);
      this.expiryFieldRequired.set(expiryResponse.requiresExpiry);
      this.showBatchFields.set(expiryResponse.requiresExpiry);
      this.batchFieldsRequired.set(expiryResponse.requiresExpiry);
      
      // Update form validators
      this.updateConditionalValidators(expiryResponse.requiresExpiry);
      
      // Show user feedback about expiry requirements
      if (expiryResponse.requiresExpiry) {
        this.showInfo(`Products in "${categoryResponse.name}" category require expiry date tracking`);
      } else {
        this.showInfo(`Products in "${categoryResponse.name}" category do not require expiry date tracking`);
      }
      
    } catch (error) {
      console.error('Error checking category expiry requirements:', error);
      this.showError("Could not verify category's expiry requirements.");
      this.updateConditionalValidators(false);
      this.resetExpiryFields();
    } finally {
      this.expiryValidating.set(false);
    }
  }

  private updateConditionalValidators(isRequired: boolean): void {
    const expiryControl = this.productForm.get('expiryDate');
    const batchNumberControl = this.productForm.get('batchNumber');

    if (isRequired) {
      expiryControl?.setValidators([Validators.required]);
      if (this.creatingNewBatch()) {
        batchNumberControl?.setValidators([Validators.required, Validators.maxLength(50)]);
      }
    } else {
      expiryControl?.clearValidators();
      batchNumberControl?.clearValidators();
    }
    expiryControl?.updateValueAndValidity();
    batchNumberControl?.updateValueAndValidity();
  }

  private loadProductBatches(productId: number): void {
    this.subscriptions.add(
      this.expiryService.getProductBatches({ productId }).subscribe({
        next: (batches) => {
          this.existingBatches.set(batches);
        },
        error: (error) => {
          console.error('Failed to load product batches:', error);
          this.existingBatches.set([]);
        }
      })
    );
  }

  private async createProductBatch(productId: number, formData: any): Promise<void> {
    const batchRequest: CreateProductBatch = {
      productId: productId,
      batchNumber: formData.batchNumber.trim(),
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
      initialStock: parseInt(formData.stock) || 0,
      costPerUnit: parseFloat(formData.buyPrice) || 0,
    };

    const response = await firstValueFrom(this.expiryService.createProductBatch(batchRequest));
    if (!response.success) {
      throw new Error(response.message || 'Failed to create product batch');
    }
  }

  // ===== BARCODE OPERATIONS =====

  startBarcodeScanner(): void {
    console.log('📷 Starting barcode scanner...');
    console.log('📷 Current scanner state BEFORE:', this.scannerActive());
    
    this.scannerActive.set(true);
    
    console.log('📷 Scanner active set to:', this.scannerActive());
    console.log('📷 DOM element exists:', !!document.getElementById('barcode-scanner'));
    
    // ✅ ENHANCED: Add delay to ensure DOM updates
    setTimeout(() => {
      console.log('📷 Starting scanner service after DOM update...');
      this.barcodeService.startScanner((barcode: string) => {
        console.log('📷 Barcode scanned:', barcode);
        this.productForm.patchValue({ barcode });
        this.stopBarcodeScanner();
        this.showSuccess('Barcode scanned successfully: ' + barcode);
      }, 'barcode-scanner').catch((error: any) => {
        console.error('📷 Scanner error:', error);
        this.showError('Failed to start scanner: ' + error.message);
        this.stopBarcodeScanner();
      });
    }, 100);
  }

  stopBarcodeScanner(): void {
    console.log('📷 Stopping barcode scanner...');
    console.log('📷 Current scanner state BEFORE stop:', this.scannerActive());
    
    this.scannerActive.set(false);
    this.barcodeService.stopScanner();
    
    console.log('📷 Scanner stopped, new state:', this.scannerActive());
  }

  generateBarcode(): void {
    const generatedBarcode = `BC${Date.now()}`;
    this.productForm.patchValue({ barcode: generatedBarcode });
    this.showInfo('Barcode generated automatically');
  }

  // ===== UI HELPERS & NOTIFICATIONS =====


  getFieldError(fieldName: string): string {
    const control = this.productForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';
    if (control.hasError('required')) return `${this.getFieldLabel(fieldName)} is required.`;
    if (control.hasError('minlength')) return `Must be at least ${control.errors['minlength'].requiredLength} characters.`;
    if (control.hasError('maxlength')) return `Cannot exceed ${control.errors['maxlength'].requiredLength} characters.`;
    if (control.hasError('min')) return `Must be at least ${control.errors['min'].min}.`;
    if (control.hasError('sellPriceTooLow')) return 'Sell price must be >= buy price.';
    return 'Invalid value.';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Product Name',
      barcode: 'Barcode',
      categoryId: 'Category',
      buyPrice: 'Buy Price',
      sellPrice: 'Sell Price',
      stock: 'Stock',
      minimumStock: 'Minimum Stock',
      unit: 'Unit',
      expiryDate: 'Expiry Date',
      batchNumber: 'Batch Number'
    };
    return labels[fieldName] || fieldName;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
  }

  // ===== ADDITIONAL METHODS =====

  /**
   * Generate automatic batch number
   */
  generateBatchNumber(): void {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    const batchNumber = `B${dateStr}${timeStr}${random}`;
    this.productForm.patchValue({ batchNumber });
    this.showInfo('Batch number generated automatically');
  }

  /**
   * Get minimum allowed expiry date (today)
   */
  getMinExpiryDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Calculate days until expiry for display
   */
  getDaysUntilExpiry(): number | null {
    const expiryDate = this.productForm.get('expiryDate')?.value;
    if (!expiryDate) return null;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Get expiry status for visual indication
   */
  getExpiryStatus(): 'good' | 'warning' | 'critical' | 'expired' | null {
    const days = this.getDaysUntilExpiry();
    if (days === null) return null;

    if (days < 0) return 'expired';
    if (days <= 7) return 'critical';
    if (days <= 30) return 'warning';
    return 'good';
  }



  /**
   * Check if expiry date is valid and not in the past
   */
  isExpiryDateValid(): boolean {
    const expiryDate = this.productForm.get('expiryDate')?.value;
    if (!expiryDate) return !this.expiryFieldRequired;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    return expiry >= today;
  }

  /**
   * Check if field is invalid (for template use)
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.productForm.get(fieldName);
    return !!(control?.errors && control.touched);
  }




  /**
   * Navigate back to inventory list
   */
  goBack(): void {
    this.router.navigate(['/dashboard/inventory']);
  }

  // ===== MISSING UTILITY METHODS FOR FORM =====

  /**
   * Calculate margin percentage
   */
  getMarginPercentage(): number {
    const buyPrice = this.productForm.get('buyPrice')?.value || 0;
    const sellPrice = this.productForm.get('sellPrice')?.value || 0;
    if (buyPrice === 0) return 0;
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  }

  /**
   * Calculate margin amount
   */
  getMarginAmount(): number {
    const buyPrice = this.productForm.get('buyPrice')?.value || 0;
    const sellPrice = this.productForm.get('sellPrice')?.value || 0;
    return sellPrice - buyPrice;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  // ===== ENHANCED EXPIRY MANAGEMENT METHODS =====

  /**
   * Reset expiry fields when no category selected
   */
  private resetExpiryFields(): void {
    this.showExpiryField.set(false);
    this.categoryRequiresExpiry.set(false);
    this.selectedCategory.set(null);
    this.expiryFieldRequired.set(false);
    this.showBatchFields.set(false);
    this.batchFieldsRequired.set(false);
    this.expiryValidationErrors.set([]);
    
    // Clear form values and validators
    const expiryControl = this.productForm.get('expiryDate');
    const batchControl = this.productForm.get('batchNumber');
    
    if (expiryControl) {
      expiryControl.clearValidators();
      expiryControl.setValue(null);
      expiryControl.updateValueAndValidity();
    }
    
    if (batchControl) {
      batchControl.clearValidators();
      batchControl.setValue('');
      batchControl.updateValueAndValidity();
    }
  }

  /**
   * Enhanced validation for expiry requirements
   */
  private validateExpiryRequirements(): boolean {
    if (!this.categoryRequiresExpiry()) return true;
    
    const expiryDate = this.productForm.get('expiryDate')?.value;
    const batchNumber = this.productForm.get('batchNumber')?.value;
    
    const errors: string[] = [];
    
    if (!expiryDate) {
      errors.push('Expiry date is required for this category');
    } else {
      // Validate expiry date is in the future
      const expiryDateObj = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expiryDateObj <= today) {
        errors.push('Expiry date must be in the future');
      }
    }
    
    if (!batchNumber?.trim()) {
      errors.push('Batch number is required for products with expiry dates');
    }
    
    this.expiryValidationErrors.set(errors);
    return errors.length === 0;
  }

  /**
   * Calculate days until expiry
   */
  private calculateDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // ===== BATCH MANAGEMENT MODAL METHODS =====

  /**
   * Open batch management modal
   */
  openBatchManagementModal(): void {
    const expiryDate = this.productForm.get('expiryDate')?.value;
    if (!expiryDate) {
      this.showError('Silakan pilih tanggal kadaluarsa terlebih dahulu');
      return;
    }

    console.log('📦 Opening batch management modal...');
    this.batchModalActive.set(true);
    
    // Auto-generate batch number if not exists
    if (!this.productForm.get('batchNumber')?.value) {
      this.generateBatchNumber();
    }
  }

  /**
   * Close batch management modal
   */
  closeBatchManagementModal(): void {
    console.log('📦 Closing batch management modal...');
    this.batchModalActive.set(false);
  }

  /**
   * Save batch information and close modal
   */
  saveBatchInformation(): void {
    if (!this.isBatchFormValid()) {
      this.showError('Silakan lengkapi informasi batch yang diperlukan');
      return;
    }

    console.log('📦 Saving batch information...');
    this.batchModalActive.set(false);
    this.showSuccess('Informasi batch berhasil disimpan');
  }

  /**
   * Check if batch form is valid
   */
  isBatchFormValid(): boolean {
    const expiryDate = this.productForm.get('expiryDate')?.value;
    const batchNumber = this.productForm.get('batchNumber')?.value;
    
    if (!expiryDate) return false;
    if (!batchNumber?.trim()) return false;
    
    return true;
  }

  /**
   * Get batch validation status class
   */
  getBatchValidationStatus(): string {
    if (this.isBatchFormValid()) {
      return 'text-success';
    } else {
      return 'text-warning';
    }
  }

  /**
   * Get batch validation message
   */
  getBatchValidationMessage(): string {
    const expiryDate = this.productForm.get('expiryDate')?.value;
    const batchNumber = this.productForm.get('batchNumber')?.value;
    
    if (!expiryDate) return 'Tanggal kadaluarsa belum diatur';
    if (!batchNumber?.trim()) return 'Nomor batch belum diatur';
    
    return 'Informasi batch lengkap';
  }

}
