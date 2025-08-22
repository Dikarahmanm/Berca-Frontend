// ===== PRODUCT FORM COMPONENT =====
// src/app/modules/inventory/components/product-form/product-form.component.ts

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
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
  styleUrls: ['./product-form.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(-100%)', opacity: 0 }))
      ])
    ])
  ]
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
  
  // ✅ NEW: UI Modal signals
  batchModalActive = signal(false);
  showHelpModal = false;
  
  // ===== NEW: Enhanced Batch Detection & Registration Flow =====
  scannedBarcodeForRegistration = signal<string>('');
  isNewProduct = signal(true);
  existingProductForBatch = signal<Product | null>(null);
  
  // ✅ NEW: Multi-step progressive disclosure pattern
  currentStep = signal<'basic' | 'category-check' | 'batch-creation'>('basic');
  completedSteps = signal<string[]>([]);
  
  // User choices
  skipBatchCreation = signal(false);
  showBatchCreationPrompt = signal(false);
  
  // Form validation per step
  basicFormValid = signal(false);
  categorySelected = signal(false);
  batchFormValid = signal(false);
  
  // ===== NEW: Existing batch management =====
  availableExistingBatches = signal<ProductBatch[]>([]);
  selectedExistingBatch = signal<ProductBatch | null>(null);
  addToExistingBatch = signal(false);
  
  // ===== NEW: Enhanced barcode detection =====
  barcodeCheckLoading = signal(false);
  barcodeCheckError = signal<string | null>(null);

  // ✅ Registration workflow step
  registrationStep = signal<'scan' | 'product' | 'batch' | 'complete'>('product');
  
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
  
  canSubmit = computed(() => {
    // ✅ SIMPLIFIED: Basic checks only for computed property performance
    const basicChecks = this.productForm?.valid && 
                       !this.saving() && 
                       !this.expiryValidating();
    
    return basicChecks;
  });

  // ✅ NEW: Detailed validation status for UI feedback
  validationStatus = computed(() => {
    if (!this.productForm) {
      return {
        canSubmit: false,
        reasons: ['Form belum diinisialisasi'],
        isLoading: true
      };
    }

    const reasons: string[] = [];
    
    // Check loading states
    if (this.saving()) reasons.push('Sedang menyimpan produk...');
    if (this.expiryValidating()) reasons.push('Sedang memvalidasi kategori...');
    
    // Check required fields
    const formValidation = this.validateFormWithDetails();
    if (!formValidation.isValid) {
      reasons.push(`Field wajib belum diisi: ${formValidation.missingFields.join(', ')}`);
    }
    
    // Check expiry requirements
    if (this.categoryRequiresExpiry()) {
      const expiryValidation = (this as any).validateExpiryRequirements();
      if (!expiryValidation.isValid) {
        reasons.push(...expiryValidation.errors);
      }
    }
    
    // Check form errors
    if (this.productForm.errors) {
      if (this.productForm.errors['sellPriceTooLow']) {
        reasons.push('Harga jual harus lebih besar atau sama dengan harga beli');
      }
    }
    
    return {
      canSubmit: reasons.length === 0,
      reasons: reasons,
      isLoading: this.saving() || this.expiryValidating()
    };
  });
  
  hasUnsavedChanges = computed(() => 
    this.productForm?.dirty && !this.saving()
  );
  
  // ✅ NEW: Step-based validation computed properties
  canContinueToNextStep = computed(() => {
    const step = this.currentStep();
    
    console.log('🔍 canContinueToNextStep check:', {
      step,
      isBasicStepValid: this.isBasicStepValid(),
      categoryRequiresExpiry: this.categoryRequiresExpiry(),
      isBatchStepValid: step === 'batch-creation' ? this.isBatchStepValid() : 'N/A'
    });
    
    switch (step) {
      case 'basic':
        const basicValid = this.isBasicStepValid();
        console.log('✅ Basic step validation result:', basicValid);
        return basicValid;
        
      case 'category-check':
        // If category requires expiry, user must go to batch step
        if (this.categoryRequiresExpiry()) {
          console.log('✅ Category requires expiry - allowing continue to batch step');
          return true; // Always allow continue to batch step
        }
        console.log('✅ Category optional - allowing continue based on user choice');
        return true; // Just user choice, no validation needed
        
      case 'batch-creation':
        // Validate batch step based on requirements
        const batchValid = this.isBatchStepValid();
        console.log('✅ Batch step validation result:', batchValid);
        return batchValid;
        
      default:
        console.log('❌ Unknown step:', step);
        return false;
    }
  });
  
  stepProgress = computed(() => {
    const steps = ['basic', 'category-check', 'batch-creation'];
    const currentIndex = steps.indexOf(this.currentStep());
    return ((currentIndex + 1) / steps.length) * 100;
  });
  
  currentStepTitle = computed(() => {
    switch (this.currentStep()) {
      case 'basic':
        return 'Basic Product Information';
      case 'category-check':
        return 'Batch Creation Option';
      case 'batch-creation':
        return 'Batch Details';
      default:
        return 'Product Form';
    }
  });
  
  currentStepDescription = computed(() => {
    switch (this.currentStep()) {
      case 'basic':
        return 'Enter essential product details to get started';
      case 'category-check':
        return this.categoryRequiresExpiry() ? 
          'This category requires expiry tracking. Create a batch?' : 
          'Add batch tracking to this product?';
      case 'batch-creation':
        return 'Set up batch tracking with expiry date and batch number';
      default:
        return '';
    }
  });
  
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
      buyPrice: [0, [Validators.required, Validators.min(1)]], // Changed from min(0) to min(1)
      sellPrice: [0, [Validators.required, Validators.min(1)]], // Changed from min(0) to min(1)
      
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
    
    // ✅ NEW: Watch expiry date changes for validation
    this.subscriptions.add(
      this.productForm.get('expiryDate')?.valueChanges.subscribe(() => {
        // Trigger validation when expiry date changes
        this.productForm.updateValueAndValidity();
      })
    );
    
    // ✅ NEW: Watch batch number changes for validation  
    this.subscriptions.add(
      this.productForm.get('batchNumber')?.valueChanges.subscribe(() => {
        // Trigger validation when batch number changes
        this.productForm.updateValueAndValidity();
      })
    );
    
    // ✅ NEW: Watch price field changes specifically  
    this.subscriptions.add(
      this.productForm.get('buyPrice')?.valueChanges.subscribe((value) => {
        console.log('💰 Buy Price changed to:', value, 'type:', typeof value);
        this.productForm.updateValueAndValidity();
      })
    );
    
    this.subscriptions.add(
      this.productForm.get('sellPrice')?.valueChanges.subscribe((value) => {
        console.log('💰 Sell Price changed to:', value, 'type:', typeof value);
        this.productForm.updateValueAndValidity();
      })
    );
    
    // ✅ NEW: Watch all form changes to trigger validation status update
    this.subscriptions.add(
      this.productForm.valueChanges.subscribe(() => {
        // Force validation status recomputation
        // This ensures the UI updates when any field changes
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
        next: async (product) => {
          console.log('📥 Loading product data:', product);
          
          const productData = product as any; // Type assertion for additional fields
          
          // ✅ FIXED: Preserve ALL form data including expiry and batch fields
          const formPayload = {
            // Basic product fields
            name: product.name || '',
            barcode: product.barcode || '',
            description: product.description || '',
            categoryId: product.categoryId || null,
            unit: product.unit || 'pcs',
            isActive: product.isActive !== undefined ? product.isActive : true,
            
            // Pricing fields
            buyPrice: product.buyPrice || 0,
            sellPrice: product.sellPrice || 0,
            
            // Stock fields
            stock: product.stock || 0,
            minimumStock: product.minimumStock || 5,
            
            // ✅ IMPORTANT: Preserve expiry and batch data
            expiryDate: productData.expiryDate ? new Date(productData.expiryDate).toISOString().split('T')[0] : null,
            batchNumber: productData.batchNumber || '',
            productionDate: productData.productionDate ? new Date(productData.productionDate).toISOString().split('T')[0] : null,
            batchInitialStock: productData.batchInitialStock || 0,
            batchCostPerUnit: productData.batchCostPerUnit || 0,
            supplierName: productData.supplierName || '',
            purchaseOrderNumber: productData.purchaseOrderNumber || '',
            batchNotes: productData.batchNotes || '',
            createNewBatch: false, // Default for editing
            selectedExistingBatch: null
          };
          
          console.log('📝 Form payload to patch:', formPayload);
          this.productForm.patchValue(formPayload);
          
          // Handle category change after form is populated
          if (product.categoryId) {
            await this.onCategoryChange(product.categoryId);
          }
          
          // Load related batch data
          if (this.isEdit()) {
            this.loadProductBatches(id);
          }
          
          console.log('✅ Product loaded and form populated');
          this.loading.set(false);
        },
        error: (error) => {
          console.error('❌ Failed to load product:', error);
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
    console.log('🚀 onSubmit called');
    console.log('📋 Form valid:', this.productForm.valid);
    console.log('💾 Currently saving:', this.saving());
    
    // ✅ ENHANCED: Validate form with detailed feedback
    const validationResult = this.validateFormWithDetails();
    if (!validationResult.isValid) {
      this.productForm.markAllAsTouched();
      this.showError(`Form tidak lengkap: ${validationResult.missingFields.join(', ')}`);
      console.log('❌ Validation failed:', validationResult.missingFields);
      return;
    }

    // ✅ ENHANCED: Check expiry requirements
    const expiryValidation = (this as any).validateExpiryRequirements();
    if (!expiryValidation.isValid) {
      this.showError(`Validasi expiry gagal: ${expiryValidation.errors.join(', ')}`);
      console.log('❌ Expiry validation failed:', expiryValidation.errors);
      return;
    }

    console.log('✅ All validations passed, starting save...');
    this.saving.set(true);
    
    try {
      const formData = this.productForm.value;
      console.log('📄 Form data:', formData);

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

      console.log('📤 Request payload:', request);

      if (this.isEdit() && this.productId()) {
        console.log('🔄 Updating product...');
        await this.handleProductUpdate(this.productId()!, request as UpdateProductRequest, formData);
      } else {
        console.log('➕ Creating new product...');
        await this.handleProductCreation(request as CreateProductRequest, formData);
      }
      
      console.log('✅ Save operation completed successfully');
    } catch (error: any) {
      console.error('❌ Save operation failed:', error);
      this.showError(error.message || 'Terjadi kesalahan yang tidak terduga.');
    } finally {
      console.log('🏁 Setting saving to false');
      this.saving.set(false);
    }
  }

  private async handleProductCreation(request: CreateProductRequest, formData: any): Promise<void> {
    console.log('➕ Creating product with request:', request);
    
    try {
      const createdProduct = await firstValueFrom(this.inventoryService.createProduct(request));
      console.log('✅ Product created:', createdProduct);
      
      if (!createdProduct) {
        throw new Error('API returned empty response');
      }

      // Only create batch if expiry is required and batch data exists
      if (this.categoryRequiresExpiry() && formData.batchNumber?.trim()) {
        console.log('📦 Creating batch for product...');
        await this.createProductBatch(createdProduct.id, formData);
        console.log('✅ Batch created successfully');
      }

      this.showSuccess('Produk berhasil dibuat');
      await this.router.navigate(['/dashboard/inventory']);
      console.log('🏠 Navigated back to inventory');
      
    } catch (error: any) {
      console.error('❌ Product creation failed:', error);
      
      // Enhanced error handling
      if (error.status === 400) {
        throw new Error('Data produk tidak valid: ' + (error.error?.message || error.message));
      } else if (error.status === 409) {
        throw new Error('Barcode sudah digunakan oleh produk lain');
      } else if (error.status === 500) {
        throw new Error('Terjadi kesalahan server. Silakan coba lagi.');
      } else {
        throw new Error('Gagal membuat produk: ' + (error.message || 'Unknown error'));
      }
    }
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
      console.log('🔄 Category changed to:', categoryId);
      this.expiryValidating.set(true);
      
      // Get category details and expiry requirements
      const [categoryResponse, expiryResponse] = await Promise.all([
        firstValueFrom(this.categoryService.getCategoryById(categoryId)),
        this.expiryService.checkCategoryRequiresExpiry(categoryId)
      ]);
      
      console.log('📋 Category response:', categoryResponse);
      console.log('📅 Expiry response:', expiryResponse);
      
      // Update signals with category information
      this.selectedCategory.set(categoryResponse);
      this.categoryRequiresExpiry.set(expiryResponse.requiresExpiry);
      this.showExpiryField.set(expiryResponse.requiresExpiry);
      this.expiryFieldRequired.set(expiryResponse.requiresExpiry);
      this.showBatchFields.set(expiryResponse.requiresExpiry);
      this.batchFieldsRequired.set(expiryResponse.requiresExpiry);
      
      // ✅ FIXED: If category requires expiry, force batch creation
      if (expiryResponse.requiresExpiry) {
        this.skipBatchCreation.set(false); // Force batch creation
        console.log('✅ Category requires expiry - forcing batch creation');
      }
      
      // Update form validators
      this.updateConditionalValidators(expiryResponse.requiresExpiry);
      
      // ✅ FIXED: Force validation status update after category change
      setTimeout(() => {
        this.productForm.updateValueAndValidity();
        console.log('🔄 Form validation triggered after category change');
      }, 100);
      
      // Show user feedback about expiry requirements
      if (expiryResponse.requiresExpiry) {
        this.showInfo(`Produk dalam kategori "${categoryResponse.name}" wajib mencantumkan tanggal kadaluarsa`);
      } else {
        this.showInfo(`Produk dalam kategori "${categoryResponse.name}" tidak perlu tanggal kadaluarsa`);
      }
      
    } catch (error) {
      console.error('❌ Error checking category expiry requirements:', error);
      this.showError("Tidak dapat memverifikasi persyaratan tanggal kadaluarsa kategori.");
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
      // Always require expiry date for categories that need it
      expiryControl?.setValidators([Validators.required]);
      
      // ✅ FIXED: Only require batch number if user chooses to create a new batch
      // Don't force batch number for all expiry-enabled products
      if (this.creatingNewBatch() && this.batchModalActive()) {
        batchNumberControl?.setValidators([Validators.required, Validators.maxLength(50)]);
      } else {
        // Batch number is optional unless explicitly creating new batch
        batchNumberControl?.setValidators([Validators.maxLength(50)]);
      }
    } else {
      // Clear all validators for categories that don't need expiry
      expiryControl?.clearValidators();
      batchNumberControl?.clearValidators();
    }
    
    expiryControl?.updateValueAndValidity();
    batchNumberControl?.updateValueAndValidity();
    
    console.log('🔧 Validators updated - Expiry required:', isRequired, 'Batch required:', this.creatingNewBatch() && this.batchModalActive());
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
   * Calculate days until expiry
   */
  private calculateDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // ===== ENHANCED VALIDATION METHODS =====

  /**
   * Validate form with detailed feedback about missing fields
   */
  private validateFormWithDetails(): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    
    // Check required fields
    if (!this.productForm.get('name')?.value?.trim()) {
      missingFields.push('Nama Produk');
    }
    
    if (!this.productForm.get('barcode')?.value?.trim()) {
      missingFields.push('Barcode');
    }
    
    if (!this.productForm.get('categoryId')?.value) {
      missingFields.push('Kategori');
    }
    
    if (!this.productForm.get('buyPrice')?.value || this.productForm.get('buyPrice')?.value <= 0) {
      missingFields.push('Harga Beli');
    }
    
    if (!this.productForm.get('sellPrice')?.value || this.productForm.get('sellPrice')?.value <= 0) {
      missingFields.push('Harga Jual');
    }
    
    if (this.productForm.get('stock')?.value === null || this.productForm.get('stock')?.value < 0) {
      missingFields.push('Stok');
    }
    
    if (this.productForm.get('minimumStock')?.value === null || this.productForm.get('minimumStock')?.value < 0) {
      missingFields.push('Stok Minimum');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Enhanced expiry validation with detailed feedback
   */
  private validateExpiryRequirements(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Only validate if category requires expiry
    if (!this.categoryRequiresExpiry()) {
      return { isValid: true, errors: [] };
    }
    
    const expiryDate = this.productForm.get('expiryDate')?.value;
    const batchNumber = this.productForm.get('batchNumber')?.value;
    
    if (!expiryDate) {
      errors.push('Tanggal kadaluarsa wajib diisi untuk kategori ini');
    } else {
      // Validate expiry date is in the future
      const expiryDateObj = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expiryDateObj <= today) {
        errors.push('Tanggal kadaluarsa harus di masa depan');
      }
    }
    
    // ✅ FIXED: Only require batch number if user is explicitly creating a new batch
    // This gives users flexibility - they can save product with expiry but without batch initially
    if (this.creatingNewBatch() && this.batchModalActive() && !batchNumber?.trim()) {
      errors.push('Nomor batch wajib diisi jika membuat batch baru');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
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
    
    // ✅ FIXED: Don't auto-generate batch number - let user decide
    // User can click the generate button if they want
  }

  /**
   * Close batch management modal
   */
  closeBatchManagementModal(): void {
    console.log('📦 Closing batch management modal...');
    this.batchModalActive.set(false);
  }

  /**
   * ✅ NEW: Save batch data and close modal
   */
  saveBatchData(): void {
    if (!this.isBatchFormValid()) {
      this.showError('Silakan lengkapi informasi batch terlebih dahulu');
      return;
    }

    console.log('💾 Saving batch data...');
    const batchData = {
      batchNumber: this.productForm.get('batchNumber')?.value,
      productionDate: this.productForm.get('productionDate')?.value,
      supplierName: this.productForm.get('supplierName')?.value,
      purchaseOrderNumber: this.productForm.get('purchaseOrderNumber')?.value,
      batchNotes: this.productForm.get('batchNotes')?.value
    };

    console.log('📦 Batch data saved:', batchData);
    this.showSuccess('Informasi batch telah disimpan');
    this.closeBatchManagementModal();
    
    // Update the form to mark it as having batch data
    this.creatingNewBatch.set(true);
    
    // Trigger validation update
    setTimeout(() => {
      this.productForm.updateValueAndValidity();
    }, 100);
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

  // ===== NEW: PROGRESSIVE DISCLOSURE STEP NAVIGATION =====
  
  /**
   * Navigate to next step in the form workflow
   */
  goToNextStep(): void {
    const currentStep = this.currentStep();
    
    switch (currentStep) {
      case 'basic':
        if (this.isBasicStepValid()) {
          this.markStepComplete('basic');
          this.currentStep.set('category-check');
          this.showBatchCreationPrompt.set(true);
        } else {
          this.showError('Please complete all required basic information first');
          this.markRequiredFields();
        }
        break;
        
      case 'category-check':
        this.markStepComplete('category-check');
        
        // If category requires expiry, force batch creation
        if (this.categoryRequiresExpiry()) {
          this.skipBatchCreation.set(false);
          this.currentStep.set('batch-creation');
          this.setupBatchCreationStep();
          console.log('✅ Moving to batch creation (required by category)');
        } else if (this.skipBatchCreation()) {
          // Skip batch creation, go directly to save
          this.submitProduct();
        } else {
          // Continue to batch creation
          this.currentStep.set('batch-creation');
          this.setupBatchCreationStep();
        }
        break;
        
      case 'batch-creation':
        if (this.isBatchStepValid()) {
          this.markStepComplete('batch-creation');
          this.submitProduct();
        } else {
          this.showError('Please complete batch information first');
        }
        break;
    }
  }
  
  /**
   * Navigate to previous step
   */
  goToPreviousStep(): void {
    const currentStep = this.currentStep();
    
    switch (currentStep) {
      case 'category-check':
        this.currentStep.set('basic');
        this.showBatchCreationPrompt.set(false);
        break;
        
      case 'batch-creation':
        this.currentStep.set('category-check');
        this.showBatchCreationPrompt.set(true);
        break;
    }
  }
  
  /**
   * Mark step as completed
   */
  private markStepComplete(stepName: string): void {
    this.completedSteps.update(steps => [...steps, stepName]);
    console.log('✅ Step completed:', stepName);
  }
  
  /**
   * Check if basic step is valid
   */
  private isBasicStepValid(): boolean {
    // Ensure form exists
    if (!this.productForm) {
      console.log('❌ Basic step validation failed: Form not initialized');
      return false;
    }
    
    const name = this.productForm.get('name')?.value?.trim();
    const barcode = this.productForm.get('barcode')?.value?.trim();
    const categoryId = this.productForm.get('categoryId')?.value;
    const buyPrice = this.productForm.get('buyPrice')?.value;
    const sellPrice = this.productForm.get('sellPrice')?.value;
    const unit = this.productForm.get('unit')?.value?.trim();
    const stock = this.productForm.get('stock')?.value;
    const minimumStock = this.productForm.get('minimumStock')?.value;
    
    // Debug all values first
    console.log('🔍 Basic step validation - checking values:');
    console.log('  - Name:', name, '(type:', typeof name, ')');
    console.log('  - Barcode:', barcode, '(type:', typeof barcode, ')');
    console.log('  - Category:', categoryId, '(type:', typeof categoryId, ')');
    console.log('  - Buy Price:', buyPrice, '(type:', typeof buyPrice, ')');
    console.log('  - Sell Price:', sellPrice, '(type:', typeof sellPrice, ')');
    console.log('  - Unit:', unit, '(type:', typeof unit, ')');
    console.log('  - Stock:', stock, '(type:', typeof stock, ')');
    console.log('  - Min Stock:', minimumStock, '(type:', typeof minimumStock, ')');
    
    // Check each field individually for detailed debugging
    const checks = {
      name: !!(name && name.length > 0),
      barcode: !!(barcode && barcode.length > 0), 
      categoryId: !!(categoryId && (typeof categoryId === 'number' ? categoryId > 0 : categoryId !== '')),
      buyPrice: !!(buyPrice !== null && buyPrice !== undefined && buyPrice !== '' && Number(buyPrice) > 0),
      sellPrice: !!(sellPrice !== null && sellPrice !== undefined && sellPrice !== '' && Number(sellPrice) > 0),
      unit: !!(unit && unit.length > 0),
      stock: !!(stock !== null && stock !== undefined && Number(stock) >= 0),
      minimumStock: !!(minimumStock !== null && minimumStock !== undefined && Number(minimumStock) >= 0)
    };
    
    // Enhanced debugging for price fields specifically
    const buyPriceControl = this.productForm.get('buyPrice');
    const sellPriceControl = this.productForm.get('sellPrice');
    
    console.log('💰 Price field debugging:');
    console.log('  - buyPrice raw value:', buyPrice, 'type:', typeof buyPrice);
    console.log('  - buyPrice control valid:', buyPriceControl?.valid);
    console.log('  - buyPrice control errors:', buyPriceControl?.errors);
    console.log('  - buyPrice as Number:', Number(buyPrice), 'isNaN:', isNaN(Number(buyPrice)));
    console.log('  - buyPrice > 0:', Number(buyPrice) > 0);
    console.log('  - sellPrice raw value:', sellPrice, 'type:', typeof sellPrice);
    console.log('  - sellPrice control valid:', sellPriceControl?.valid);
    console.log('  - sellPrice control errors:', sellPriceControl?.errors);
    console.log('  - sellPrice as Number:', Number(sellPrice), 'isNaN:', isNaN(Number(sellPrice)));
    console.log('  - sellPrice > 0:', Number(sellPrice) > 0);
    
    console.log('🔍 Field validation checks:', checks);
    
    // All required fields must be present and valid
    const isValid = Object.values(checks).every(check => check === true);
    
    if (!isValid) {
      console.log('❌ Basic step validation failed - missing fields:');
      Object.entries(checks).forEach(([field, valid]) => {
        console.log(`  - ${field}: ${valid ? '✅' : '❌'}`);
      });
      
      // Also check form validity
      console.log('📋 Form validity:', this.productForm.valid);
      console.log('📋 Form errors:', this.productForm.errors);
    } else {
      console.log('✅ Basic step validation PASSED - all required fields filled correctly');
    }
    
    return isValid;
  }

  /**
   * Get missing required fields for user feedback
   */
  getMissingRequiredFields(): string[] {
    const missing: string[] = [];
    
    const name = this.productForm.get('name')?.value?.trim();
    const barcode = this.productForm.get('barcode')?.value?.trim();
    const categoryId = this.productForm.get('categoryId')?.value;
    const buyPrice = this.productForm.get('buyPrice')?.value;
    const sellPrice = this.productForm.get('sellPrice')?.value;
    const unit = this.productForm.get('unit')?.value?.trim();
    const stock = this.productForm.get('stock')?.value;
    const minimumStock = this.productForm.get('minimumStock')?.value;
    
    if (!name) missing.push('Product Name');
    if (!barcode) missing.push('Barcode');
    if (!categoryId) missing.push('Category');
    if (!buyPrice || buyPrice <= 0) missing.push('Buy Price');
    if (!sellPrice || sellPrice <= 0) missing.push('Sell Price');
    if (!unit) missing.push('Unit');
    if (stock === null || stock === undefined || stock < 0) missing.push('Initial Stock');
    if (minimumStock === null || minimumStock === undefined || minimumStock < 0) missing.push('Minimum Stock');
    
    return missing;
  }
  
  /**
   * Check if batch step is valid (only if creating batch)
   */
  private isBatchStepValid(): boolean {
    // If category requires expiry, batch creation is mandatory
    if (this.categoryRequiresExpiry()) {
      const expiryDate = this.productForm.get('expiryDate')?.value;
      const batchNumber = this.productForm.get('batchNumber')?.value?.trim();
      
      console.log('🔍 Batch validation (required):', {
        expiryDate: expiryDate ? '✅' : '❌',
        batchNumber: batchNumber ? '✅' : '❌'
      });
      
      return !!(expiryDate && batchNumber);
    }
    
    // If user chose to skip batch creation and it's optional
    if (this.skipBatchCreation()) return true;
    
    // If user chose to create batch (optional), validate fields
    const expiryDate = this.productForm.get('expiryDate')?.value;
    const batchNumber = this.productForm.get('batchNumber')?.value?.trim();
    
    console.log('🔍 Batch validation (optional):', {
      expiryDate: expiryDate ? '✅' : '❌',
      batchNumber: batchNumber ? '✅' : '❌'
    });
    
    return !!(expiryDate && batchNumber);
  }
  
  /**
   * Setup batch creation step
   */
  private setupBatchCreationStep(): void {
    // Auto-generate batch number if not provided
    if (!this.productForm.get('batchNumber')?.value?.trim()) {
      this.generateBatchNumber();
    }
    
    // Set minimum expiry date to today
    const today = new Date().toISOString().split('T')[0];
    const expiryControl = this.productForm.get('expiryDate');
    if (!expiryControl?.value) {
      // Set default expiry to 30 days from now for new products
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      expiryControl?.setValue(futureDate.toISOString().split('T')[0]);
    }
  }
  
  /**
   * Handle user choice for batch creation
   */
  chooseBatchCreation(createBatch: boolean): void {
    this.skipBatchCreation.set(!createBatch);
    
    if (createBatch) {
      console.log('👍 User chose to create batch');
      this.showInfo('Great! Let\'s set up batch tracking for this product.');
      
      // Set required validators for batch fields
      const batchNumberControl = this.productForm.get('batchNumber');
      const expiryDateControl = this.productForm.get('expiryDate');
      
      batchNumberControl?.setValidators([Validators.required, Validators.maxLength(50)]);
      expiryDateControl?.setValidators([Validators.required]);
      
      batchNumberControl?.updateValueAndValidity();
      expiryDateControl?.updateValueAndValidity();
      
      // Auto-generate batch number if empty
      if (!batchNumberControl?.value?.trim()) {
        this.generateBatchNumber();
      }
      
    } else {
      console.log('👎 User chose to skip batch creation');
      this.showInfo('Product will be saved without batch tracking.');
      
      // Clear validators for batch fields
      const batchNumberControl = this.productForm.get('batchNumber');
      const expiryDateControl = this.productForm.get('expiryDate');
      
      batchNumberControl?.clearValidators();
      expiryDateControl?.clearValidators();
      
      batchNumberControl?.updateValueAndValidity();
      expiryDateControl?.updateValueAndValidity();
    }
  }
  
  /**
   * Submit product with current step data
   */
  private async submitProduct(): Promise<void> {
    console.log('💾 Submitting product with step data...');
    
    // Use existing onSubmit logic but with step-aware validation
    if (this.skipBatchCreation()) {
      // Clear batch-related fields for non-batch products
      this.productForm.patchValue({
        expiryDate: null,
        batchNumber: '',
        productionDate: null,
        batchCostPerUnit: 0,
        supplierName: '',
        purchaseOrderNumber: '',
        batchNotes: ''
      });
    }
    
    // Call existing submit method
    await this.onSubmit();
  }
  
  /**
   * Mark required fields as touched for validation display
   */
  private markRequiredFields(): void {
    const requiredFields = ['name', 'barcode', 'categoryId', 'buyPrice', 'sellPrice', 'unit'];
    requiredFields.forEach(field => {
      this.productForm.get(field)?.markAsTouched();
    });
  }
  
  // ===== ENHANCED BARCODE DETECTION & PRODUCT LOOKUP =====

  /**
   * Enhanced barcode detection for registration flow
   */
  async checkProductByBarcode(barcode: string): Promise<void> {
    if (!barcode?.trim()) {
      this.showError('Silakan masukkan barcode produk');
      return;
    }

    console.log('🔍 Checking product existence for barcode:', barcode);
    this.barcodeCheckLoading.set(true);
    this.barcodeCheckError.set(null);

    try {
      // Use HEAD request or check product existence endpoint
      const existingProduct = await firstValueFrom(
        this.inventoryService.getProductByBarcode(barcode.trim())
      );

      if (existingProduct) {
        // Existing product - show add batch flow
        console.log('📦 Existing product found:', existingProduct.name);
        this.isNewProduct.set(false);
        this.existingProductForBatch.set(existingProduct);
        this.scannedBarcodeForRegistration.set(barcode.trim());
        
        // Pre-populate some form data from existing product
        this.productForm.patchValue({
          name: existingProduct.name,
          barcode: existingProduct.barcode,
          categoryId: existingProduct.categoryId,
          unit: existingProduct.unit,
          buyPrice: existingProduct.buyPrice,
          sellPrice: existingProduct.sellPrice
        });

        // Load existing batches for this product
        await this.loadExistingBatchesForProduct(existingProduct.id);
        
        // Check if product category requires expiry
        if (existingProduct.categoryId) {
          await this.onCategoryChange(existingProduct.categoryId);
        }

        // Move to batch step if category requires expiry
        if (this.categoryRequiresExpiry()) {
          this.registrationStep.set('batch');
          this.showInfo(`Produk "${existingProduct.name}" ditemukan. Tambah batch baru untuk produk ini.`);
        } else {
          this.registrationStep.set('product'); // Stay in product form for simple stock addition
          this.showInfo(`Produk "${existingProduct.name}" ditemukan. Tambah stock ke produk ini.`);
        }
      } else {
        // New product - show create flow  
        console.log('✨ New product detected for barcode:', barcode);
        this.isNewProduct.set(true);
        this.existingProductForBatch.set(null);
        this.registrationStep.set('product');
        this.scannedBarcodeForRegistration.set(barcode.trim());
        
        // Pre-fill barcode in form
        this.productForm.patchValue({ 
          barcode: barcode.trim(),
          stock: 0, // Start with 0, will be set in batch or later
          minimumStock: 5
        });
        
        this.showInfo('Produk baru terdeteksi. Silakan lengkapi informasi produk.');
      }

    } catch (error: any) {
      console.error('❌ Error checking product:', error);
      
      // If API call fails, assume it's a new product
      console.log('🔄 API check failed, assuming new product');
      this.isNewProduct.set(true);
      this.existingProductForBatch.set(null);
      this.registrationStep.set('product');
      this.scannedBarcodeForRegistration.set(barcode.trim());
      
      this.productForm.patchValue({ 
        barcode: barcode.trim(),
        stock: 0,
        minimumStock: 5
      });
      
      this.showInfo('Sistem mendeteksi ini sebagai produk baru. Silakan lengkapi informasi produk.');
    } finally {
      this.barcodeCheckLoading.set(false);
    }
  }

  /**
   * Load existing batches for a product
   */
  private async loadExistingBatchesForProduct(productId: number): Promise<void> {
    try {
      console.log('📦 Loading existing batches for product:', productId);
      const batches = await firstValueFrom(
        this.expiryService.getProductBatches({ productId })
      );
      
      this.availableExistingBatches.set(batches || []);
      console.log('✅ Loaded existing batches:', batches?.length || 0);
    } catch (error) {
      console.error('❌ Error loading existing batches:', error);
      this.availableExistingBatches.set([]);
      this.showError('Gagal memuat data batch yang ada. Lanjutkan dengan membuat batch baru.');
    }
  }

  /**
   * Enhanced batch creation for existing products
   */
  async createBatchForExistingProduct(): Promise<void> {
    const product = this.existingProductForBatch();
    if (!product) {
      this.showError('Data produk tidak ditemukan');
      return;
    }

    console.log('📦 Creating batch for existing product:', product.name);

    // Validate batch form
    if (!this.isBatchFormValid()) {
      this.showError('Silakan lengkapi informasi batch yang diperlukan');
      return;
    }

    this.saving.set(true);

    try {
      const formData = this.productForm.value;
      
      const batchData: CreateProductBatch = {
        productId: product.id,
        batchNumber: formData.batchNumber || await this.generateBatchNumberForProduct(product.id),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
        productionDate: formData.productionDate ? new Date(formData.productionDate).toISOString() : undefined,
        initialStock: parseInt(formData.stock) || 0,
        costPerUnit: parseFloat(formData.buyPrice) || 0,
        supplierName: formData.supplierName || '',
        purchaseOrderNumber: formData.purchaseOrderNumber || '',
        notes: formData.batchNotes || ''
      };

      console.log('📤 Creating batch with data:', batchData);

      const response = await firstValueFrom(this.expiryService.createProductBatch(batchData));
      
      if (response.success) {
        this.showSuccess(`Batch berhasil ditambahkan ke produk "${product.name}"`);
        this.registrationStep.set('complete');
        
        // Navigate back to inventory after a brief delay
        setTimeout(() => {
          this.router.navigate(['/dashboard/inventory']);
        }, 2000);
      } else {
        throw new Error(response.message || 'Gagal membuat batch');
      }

    } catch (error: any) {
      console.error('❌ Error creating batch:', error);
      this.showError('Gagal membuat batch: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Auto batch number generation for product
   */
  private async generateBatchNumberForProduct(productId: number): Promise<string> {
    try {
      // Try to use API endpoint if available
      const response = await firstValueFrom(
        this.inventoryService.generateBatchNumber(productId)
      );
      return response.batchNumber;
    } catch (error) {
      // Fallback to local generation
      console.log('🔄 Using fallback batch number generation');
      const existingBatches = this.availableExistingBatches();
      const sequence = existingBatches.length + 1;
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      const product = this.existingProductForBatch();
      const productCode = product ? 
        product.name.substring(0, 3).toUpperCase() : 'PRD';
      
      return `${productCode}-${today}-${sequence.toString().padStart(3, '0')}`;
    }
  }

  /**
   * Navigate to barcode scan step
   */
  startBarcodeRegistrationFlow(): void {
    this.registrationStep.set('scan');
    this.resetFormForNewRegistration();
  }

  /**
   * Reset form for new registration
   */
  private resetFormForNewRegistration(): void {
    this.isNewProduct.set(true);
    this.existingProductForBatch.set(null);
    this.availableExistingBatches.set([]);
    this.scannedBarcodeForRegistration.set('');
    this.barcodeCheckError.set(null);
    this.selectedCategory.set(null);
    this.categoryRequiresExpiry.set(false);
    
    // Reset form to initial state
    this.productForm.reset();
    this.initializeForm();
  }

  /**
   * Skip barcode scan and go directly to product creation
   */
  skipBarcodeAndCreateNew(): void {
    this.isNewProduct.set(true);
    this.existingProductForBatch.set(null);
    this.registrationStep.set('product');
    this.showInfo('Membuat produk baru tanpa scan barcode.');
  }

  /**
   * Continue to stock/batch step based on category requirements
   */
  continueToNextStep(): void {
    if (this.categoryRequiresExpiry()) {
      this.registrationStep.set('batch');
    } else {
      // For non-expiry products, complete the flow
      this.onSubmit(); // Use existing submit logic
    }
  }

}
