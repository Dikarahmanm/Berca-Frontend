// ===== PRODUCT FORM COMPONENT =====
// src/app/modules/inventory/components/product-form/product-form.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Subscription } from 'rxjs';

// Services & Interfaces
import { InventoryService } from '../../services/inventory.service';
import { CategoryService } from '../../../category-management/services/category.service';
import { BarcodeService } from '../../../../core/services/barcode.service';
import { Product, CreateProductRequest, UpdateProductRequest } from '../../interfaces/inventory.interfaces';
import { Category } from '../../../category-management/models/category.models';

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
  
  // Form configuration
  productForm!: FormGroup;
  categories: Category[] = [];
  
  // Component state
  isEditMode = false;
  productId: number | null = null;
  loading = false;
  saving = false;
  duplicateData: any = null;
  
  // Barcode scanner
  scannerActive = false;
  barcodeError = '';
  
  // Form validation
  formErrors: { [key: string]: string } = {};
  
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private categoryService: CategoryService,
    private barcodeService: BarcodeService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
    this.checkForDuplicateData();
  }

  ngOnInit(): void {
    this.setupSubscriptions();
    this.loadCategories();
    this.checkEditMode();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopBarcodeScanner();
  }

  // ===== INITIALIZATION =====

  private initializeForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      barcode: ['', [Validators.required, Validators.pattern(/^[0-9A-Za-z\-_]+$/)]],
      categoryId: ['', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
      minStock: [10, [Validators.required, Validators.min(0)]],
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [0, [Validators.required, Validators.min(0)]],
      isActive: [true]
    });

    // Add custom validator for sell price > buy price
    this.productForm.addValidators(this.priceValidator as ValidatorFn);
  }

  private setupSubscriptions(): void {
    // Watch form changes for real-time validation
    this.subscriptions.add(
      this.productForm.valueChanges.subscribe(() => {
        this.validateForm();
      })
    );

    // Watch barcode changes for duplicate checking
    this.subscriptions.add(
      this.productForm.get('barcode')?.valueChanges.subscribe(barcode => {
        if (barcode && barcode.length >= 6) {
          this.checkBarcodeAvailability(barcode);
        }
      })
    );
  }

  private checkForDuplicateData(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['duplicateData']) {
      this.duplicateData = navigation.extras.state['duplicateData'];
    }
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.productId = parseInt(id, 10);
      this.loadProduct();
    } else if (this.duplicateData) {
      this.populateFormWithDuplicate();
    }
  }

  // ===== DATA LOADING =====

  private loadCategories(): void {
    this.subscriptions.add(
      this.categoryService.getCategories({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }).subscribe({
        next: (response) => {
          this.categories = response.categories;
        },
        error: (error) => {
          this.showError('Failed to load categories: ' + error.message);
        }
      })
    );
  }

  private loadProduct(): void {
    if (!this.productId) return;
    
    this.loading = true;
    this.subscriptions.add(
      this.inventoryService.getProductById(this.productId).subscribe({
        next: (product) => {
          this.populateForm(product);
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load product: ' + error.message);
          this.loading = false;
          this.goBack();
        }
      })
    );
  }

  private populateForm(product: Product): void {
    this.productForm.patchValue({
      name: product.name,
      barcode: product.barcode,
      categoryId: product.categoryId,
      stock: product.stock,
      minStock: product.minimumStock,
      buyPrice: product.buyPrice,
      sellPrice: product.sellPrice,
      isActive: product.isActive
    });
  }

  private populateFormWithDuplicate(): void {
    this.productForm.patchValue({
      name: this.duplicateData.name,
      barcode: '', // Clear barcode for manual entry
      categoryId: this.duplicateData.categoryId,
      stock: 0, // Reset stock
      minStock: this.duplicateData.minStock,
      buyPrice: this.duplicateData.buyPrice,
      sellPrice: this.duplicateData.sellPrice,
      isActive: true
    });
  }

  // ===== FORM VALIDATION =====

  private priceValidator(formGroup: FormGroup) {
    const buyPrice = formGroup.get('buyPrice')?.value || 0;
    const sellPrice = formGroup.get('sellPrice')?.value || 0;
    
    if (sellPrice <= buyPrice) {
      return { invalidPrice: true };
    }
    
    return null;
  }

  private validateForm(): void {
    this.formErrors = {};
    
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      if (control && control.errors && (control.dirty || control.touched)) {
        this.formErrors[key] = this.getErrorMessage(key, control.errors);
      }
    });
    
    // Check form-level errors
    if (this.productForm.errors?.['invalidPrice']) {
      this.formErrors['sellPrice'] = 'Sell price must be higher than buy price';
    }
  }

  private getErrorMessage(fieldName: string, errors: any): string {
    if (errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} is too long`;
    if (errors['min']) return `${this.getFieldLabel(fieldName)} must be positive`;
    if (errors['pattern']) return `${this.getFieldLabel(fieldName)} format is invalid`;
    if (errors['barcodeExists']) return 'Barcode already exists';
    
    return 'Invalid input';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Product name',
      barcode: 'Barcode',
      categoryId: 'Category',
      stock: 'Stock quantity',
      minStock: 'Minimum stock',
      buyPrice: 'Buy price',
      sellPrice: 'Sell price'
    };
    return labels[fieldName] || fieldName;
  }

  // ===== BARCODE OPERATIONS =====

  private checkBarcodeAvailability(barcode: string): void {
    this.subscriptions.add(
      this.inventoryService.isBarcodeExists(barcode, this.productId || undefined).subscribe({
        next: (exists) => {
          if (exists) {
            this.productForm.get('barcode')?.setErrors({ barcodeExists: true });
          }
        },
        error: (error) => {
          console.error('Barcode check failed:', error);
        }
      })
    );
  }

  startBarcodeScanner(): void {
    this.scannerActive = true;
    this.barcodeError = '';
    
    this.barcodeService.startScanner((barcode: string) => {
      this.productForm.patchValue({ barcode });
      this.stopBarcodeScanner();
      this.showSuccess('Barcode scanned successfully');
    }, 'barcode-scanner').then(() => {
      console.log('Scanner started successfully');
    }).catch((error: any) => {
      this.barcodeError = 'Failed to scan barcode: ' + error.message;
      this.stopBarcodeScanner();
    });
  }

  stopBarcodeScanner(): void {
    this.scannerActive = false;
    this.barcodeService.stopScanner();
  }

  generateBarcode(): void {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const generatedBarcode = timestamp.slice(-8) + random;
    
    this.productForm.patchValue({ barcode: generatedBarcode });
    this.showInfo('Barcode generated automatically');
  }

  // ===== FORM SUBMISSION =====

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.markFormGroupTouched();
      this.validateForm();
      this.showError('Please fix the form errors before submitting');
      return;
    }

    this.saving = true;
    const formData = this.productForm.value;

    if (this.isEditMode) {
      this.updateProduct(formData);
    } else {
      this.createProduct(formData);
    }
  }

  private createProduct(formData: any): void {
    const createRequest: CreateProductRequest = {
      name: formData.name,
      barcode: formData.barcode,
      description: formData.description,
      categoryId: formData.categoryId,
      stock: formData.stock,
      minimumStock: formData.minStock,
      unit: formData.unit || 'PCS',
      buyPrice: formData.buyPrice,
      sellPrice: formData.sellPrice,
      isActive: formData.isActive
    };

    this.subscriptions.add(
      this.inventoryService.createProduct(createRequest).subscribe({
        next: (product) => {
          this.showSuccess('Product created successfully');
          this.saving = false;
          this.router.navigate(['/dashboard/inventory']);
        },
        error: (error) => {
          this.showError('Failed to create product: ' + error.message);
          this.saving = false;
        }
      })
    );
  }

  private updateProduct(formData: any): void {
    if (!this.productId) return;

    const updateRequest: UpdateProductRequest = {
      name: formData.name,
      barcode: formData.barcode,
      description: formData.description,
      categoryId: formData.categoryId,
      stock: formData.stock,
      minimumStock: formData.minStock,
      unit: formData.unit || 'PCS',
      buyPrice: formData.buyPrice,
      sellPrice: formData.sellPrice,
      isActive: formData.isActive
    };

    this.subscriptions.add(
      this.inventoryService.updateProduct(this.productId, updateRequest).subscribe({
        next: (product) => {
          this.showSuccess('Product updated successfully');
          this.saving = false;
          this.router.navigate(['/dashboard/inventory']);
        },
        error: (error) => {
          this.showError('Failed to update product: ' + error.message);
          this.saving = false;
        }
      })
    );
  }

  private markFormGroupTouched(): void {
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      control?.markAsTouched();
    });
  }

  // ===== UTILITY METHODS =====

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  getCategoryColor(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.color || '#666666';
  }

  getMarginPercentage(): number {
    const buyPrice = this.productForm.get('buyPrice')?.value || 0;
    const sellPrice = this.productForm.get('sellPrice')?.value || 0;
    
    if (buyPrice === 0) return 0;
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  }

  getMarginAmount(): number {
    const buyPrice = this.productForm.get('buyPrice')?.value || 0;
    const sellPrice = this.productForm.get('sellPrice')?.value || 0;
    return sellPrice - buyPrice;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  // ===== NAVIGATION =====

  goBack(): void {
    this.router.navigate(['/dashboard/inventory']);
  }

  // ===== FIELD VALIDATION HELPERS =====

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    return this.formErrors[fieldName] || '';
  }

  // ===== NOTIFICATION METHODS =====

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // ===== GETTERS FOR TEMPLATE =====

  get pageTitle(): string {
    if (this.duplicateData) return 'Duplicate Product';
    return this.isEditMode ? 'Edit Product' : 'Add New Product';
  }

  get pageSubtitle(): string {
    if (this.duplicateData) return 'Create a copy of existing product';
    return this.isEditMode ? 'Update product information' : 'Add a new product to inventory';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Update Product' : 'Create Product';
  }

  get canSubmit(): boolean {
    return this.productForm.valid && !this.saving;
  }

  get hasUnsavedChanges(): boolean {
    return this.productForm.dirty;
  }
}