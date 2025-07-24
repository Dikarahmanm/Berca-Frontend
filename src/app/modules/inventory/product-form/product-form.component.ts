import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TopbarComponent } from '../../../shared/topbar/topbar';
import { InventoryService, Product, Category } from '../services/inventory.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    TopbarComponent
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private inventoryService = inject(InventoryService);
  private snackBar = inject(MatSnackBar);

  currentUser = {
    username: localStorage.getItem('username') || 'User',
    role: localStorage.getItem('role') || 'Kasir'
  };

  productForm: FormGroup;
  categories: Category[] = [];
  isLoading = false;
  isEditMode = false;
  productId: string | null = null;
  pageTitle = 'Tambah Produk';

  units = [
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'box', label: 'Box' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'gram', label: 'Gram (g)' },
    { value: 'liter', label: 'Liter (L)' },
    { value: 'ml', label: 'Mililiter (ml)' },
    { value: 'meter', label: 'Meter (m)' },
    { value: 'pack', label: 'Pack' }
  ];

  constructor() {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      sku: ['', [Validators.required]],
      barcode: [''],
      categoryId: ['', [Validators.required]],
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      minStock: [0, [Validators.required, Validators.min(0)]],
      unit: ['pcs', [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.checkEditMode();
    this.setupFormValidation();
  }

  checkEditMode() {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEditMode = true;
      this.pageTitle = 'Edit Produk';
      this.loadProduct();
    } else {
      this.generateSku();
    }
  }

  loadCategories() {
    this.inventoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories.filter(cat => cat.isActive);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.snackBar.open('Gagal memuat kategori', 'Tutup', { duration: 3000 });
      }
    });
  }

  loadProduct() {
    if (!this.productId) return;

    this.isLoading = true;
    this.inventoryService.getProduct(this.productId).subscribe({
      next: (product) => {
        this.productForm.patchValue({
          name: product.name,
          description: product.description,
          sku: product.sku,
          barcode: product.barcode,
          categoryId: product.categoryId,
          buyPrice: product.buyPrice,
          sellPrice: product.sellPrice,
          stock: product.stock,
          minStock: product.minStock,
          unit: product.unit,
          isActive: product.isActive
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.snackBar.open('Gagal memuat data produk', 'Tutup', { duration: 3000 });
        this.router.navigate(['/inventory/products']);
        this.isLoading = false;
      }
    });
  }

  generateSku() {
    const categoryControl = this.productForm.get('categoryId');
    if (categoryControl?.value) {
      this.inventoryService.generateSku(categoryControl.value).subscribe({
        next: (sku) => {
          this.productForm.patchValue({ sku });
        },
        error: (error) => {
          console.error('Error generating SKU:', error);
        }
      });
    }
  }

  setupFormValidation() {
    // Auto-generate SKU when category changes
    this.productForm.get('categoryId')?.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        this.generateSku();
      }
    });

    // Validate sell price > buy price
    this.productForm.get('buyPrice')?.valueChanges.subscribe(() => {
      this.validatePrices();
    });

    this.productForm.get('sellPrice')?.valueChanges.subscribe(() => {
      this.validatePrices();
    });
  }

  validatePrices() {
    const buyPrice = this.productForm.get('buyPrice')?.value || 0;
    const sellPrice = this.productForm.get('sellPrice')?.value || 0;
    
    const sellPriceControl = this.productForm.get('sellPrice');
    
    if (sellPrice <= buyPrice && sellPrice > 0) {
      sellPriceControl?.setErrors({ sellPriceTooLow: true });
    } else {
      const errors = sellPriceControl?.errors;
      if (errors?.['sellPriceTooLow']) {
        delete errors['sellPriceTooLow'];
        sellPriceControl?.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
  }

  onSubmit() {
    if (this.productForm.valid) {
      this.isLoading = true;
      const formData = this.productForm.value;

      const operation = this.isEditMode
        ? this.inventoryService.updateProduct(this.productId!, formData)
        : this.inventoryService.createProduct(formData);

      operation.subscribe({
        next: (product) => {
          const message = this.isEditMode 
            ? 'Produk berhasil diperbarui' 
            : 'Produk berhasil ditambahkan';
          
          this.snackBar.open(message, 'Tutup', { duration: 3000 });
          this.router.navigate(['/inventory/products']);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error saving product:', error);
          const message = this.isEditMode 
            ? 'Gagal memperbarui produk' 
            : 'Gagal menambahkan produk';
          
          this.snackBar.open(message, 'Tutup', { duration: 3000 });
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel() {
    this.router.navigate(['/inventory/products']);
  }

  onReset() {
    if (this.isEditMode) {
      this.loadProduct();
    } else {
      this.productForm.reset({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        categoryId: '',
        buyPrice: 0,
        sellPrice: 0,
        stock: 0,
        minStock: 0,
        unit: 'pcs',
        isActive: true
      });
      this.generateSku();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getter methods for template
  get nameControl() { return this.productForm.get('name'); }
  get skuControl() { return this.productForm.get('sku'); }
  get categoryControl() { return this.productForm.get('categoryId'); }
  get buyPriceControl() { return this.productForm.get('buyPrice'); }
  get sellPriceControl() { return this.productForm.get('sellPrice'); }
  get stockControl() { return this.productForm.get('stock'); }
  get minStockControl() { return this.productForm.get('minStock'); }
  get unitControl() { return this.productForm.get('unit'); }

  // Helper methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  calculateProfit(): number {
    const buyPrice = this.buyPriceControl?.value || 0;
    const sellPrice = this.sellPriceControl?.value || 0;
    return sellPrice - buyPrice;
  }

  calculateProfitMargin(): number {
    const buyPrice = this.buyPriceControl?.value || 0;
    const sellPrice = this.sellPriceControl?.value || 0;
    
    if (buyPrice === 0) return 0;
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  }
}