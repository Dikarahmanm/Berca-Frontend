import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TopbarComponent } from '../../../shared/topbar/topbar';
import { InventoryService, Product, StockAdjustment } from '../services/inventory.service';

@Component({
  selector: 'app-stock-adjustment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDialogModule,
    MatTooltipModule,
    TopbarComponent
  ],
  templateUrl: './stock-adjustment.component.html',
  styleUrls: ['./stock-adjustment.component.scss']
})
export class StockAdjustmentComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  currentUser = {
    username: localStorage.getItem('username') || 'User',
    role: localStorage.getItem('role') || 'Kasir'
  };

  // Forms
  adjustmentForm: FormGroup;
  searchForm: FormGroup;
  productSearchCtrl = new FormControl('');

  // Data
  products: Product[] = [];
  filteredProducts: Product[] = [];
  stockAdjustments: StockAdjustment[] = [];
  selectedProduct: Product | null = null;
  
  // Table
  displayedColumns: string[] = ['date', 'product', 'type', 'quantity', 'reason', 'performedBy'];
  dataSource = new MatTableDataSource<StockAdjustment>();

  // State
  isLoading = false;
  isSubmitting = false;
  
  // Options
  adjustmentReasons = [
    { value: 'restock', label: 'Restok dari Supplier' },
    { value: 'damaged', label: 'Barang Rusak/Kadaluarsa' },
    { value: 'lost', label: 'Barang Hilang' },
    { value: 'returned', label: 'Retur dari Pelanggan' },
    { value: 'correction', label: 'Koreksi Perhitungan' },
    { value: 'sample', label: 'Sample/Demo' },
    { value: 'other', label: 'Lainnya' }
  ];

  constructor() {
    this.adjustmentForm = this.fb.group({
      productId: ['', [Validators.required]],
      adjustmentType: ['increase', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reason: ['', [Validators.required]],
      notes: ['']
    });

    this.searchForm = this.fb.group({
      productSearch: [''],
      dateFrom: [''],
      dateTo: [''],
      adjustmentType: ['']
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadStockAdjustments();
    this.setupProductSearch();
    this.setupProductFilter();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  setupProductFilter() {
    this.productSearchCtrl.valueChanges.subscribe(value => {
      this.filterProducts(value || '');
    });
  }

  filterProducts(searchValue: string) {
    if (!searchValue) {
      this.filteredProducts = this.products;
      return;
    }

    const filterValue = searchValue.toLowerCase();
    this.filteredProducts = this.products.filter(product =>
      product.name.toLowerCase().includes(filterValue) ||
      product.sku.toLowerCase().includes(filterValue)
    );
  }

  setupProductSearch() {
    this.adjustmentForm.get('productId')?.valueChanges.subscribe(productId => {
      this.selectedProduct = this.products.find(p => p.id === productId) || null;
    });

    // Setup search form for history
    this.searchForm.valueChanges.subscribe(() => {
      this.filterAdjustments();
    });
  }

  loadProducts() {
    this.inventoryService.getProducts(1, 1000).subscribe({
      next: (response) => {
        this.products = response.items.filter((product: Product) => product.isActive);
        this.filteredProducts = this.products;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.snackBar.open('Gagal memuat daftar produk', 'Tutup', { duration: 3000 });
      }
    });
  }

  loadStockAdjustments() {
    this.isLoading = true;
    this.inventoryService.getStockAdjustments().subscribe({
      next: (adjustments) => {
        this.stockAdjustments = adjustments;
        this.dataSource.data = adjustments;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading stock adjustments:', error);
        this.snackBar.open('Gagal memuat riwayat penyesuaian stok', 'Tutup', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    if (this.adjustmentForm.valid && this.selectedProduct) {
      const formData = this.adjustmentForm.value;
      
      // Validate adjustment
      if (formData.adjustmentType === 'decrease' && formData.quantity > this.selectedProduct.stock) {
        this.snackBar.open('Jumlah pengurangan tidak boleh melebihi stok tersedia', 'Tutup', { duration: 4000 });
        return;
      }

      this.isSubmitting = true;
      
      const adjustment = {
        productId: formData.productId,
        adjustmentType: formData.adjustmentType,
        quantity: formData.quantity,
        reason: formData.reason,
        notes: formData.notes,
        performedBy: this.currentUser.username
      };

      this.inventoryService.adjustStock(adjustment).subscribe({
        next: (result) => {
          const actionText = formData.adjustmentType === 'increase' ? 'ditambahkan' : 'dikurangi';
          this.snackBar.open(
            `Stok ${this.selectedProduct?.name} berhasil ${actionText}`, 
            'Tutup', 
            { duration: 3000 }
          );
          
          this.adjustmentForm.reset({
            adjustmentType: 'increase',
            quantity: 1
          });
          this.selectedProduct = null;
          
          // Reload data
          this.loadProducts();
          this.loadStockAdjustments();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error adjusting stock:', error);
          this.snackBar.open('Gagal melakukan penyesuaian stok', 'Tutup', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  filterAdjustments() {
    let filteredData = this.stockAdjustments;
    const searchValue = this.searchForm.get('productSearch')?.value?.toLowerCase();
    const dateFrom = this.searchForm.get('dateFrom')?.value;
    const dateTo = this.searchForm.get('dateTo')?.value;
    const adjustmentType = this.searchForm.get('adjustmentType')?.value;

    if (searchValue) {
      filteredData = filteredData.filter(adj => 
        adj.productName.toLowerCase().includes(searchValue)
      );
    }

    if (dateFrom) {
      filteredData = filteredData.filter(adj => 
        new Date(adj.createdAt) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      filteredData = filteredData.filter(adj => 
        new Date(adj.createdAt) <= new Date(dateTo)
      );
    }

    if (adjustmentType) {
      filteredData = filteredData.filter(adj => 
        adj.adjustmentType === adjustmentType
      );
    }

    this.dataSource.data = filteredData;
  }

  resetFilters() {
    this.searchForm.reset();
    this.dataSource.data = this.stockAdjustments;
  }

  private markFormGroupTouched() {
    Object.keys(this.adjustmentForm.controls).forEach(key => {
      const control = this.adjustmentForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getAdjustmentTypeClass(type: string): string {
    return type === 'increase' ? 'adjustment-increase' : 'adjustment-decrease';
  }

  getAdjustmentTypeIcon(type: string): string {
    return type === 'increase' ? 'add' : 'remove';
  }

  getAdjustmentTypeText(type: string): string {
    return type === 'increase' ? 'Tambah' : 'Kurang';
  }

  // Quick adjustment methods
  quickAdjustment(product: Product, type: 'increase' | 'decrease', quantity: number = 1) {
    this.adjustmentForm.patchValue({
      productId: product.id,
      adjustmentType: type,
      quantity: quantity,
      reason: type === 'increase' ? 'restock' : 'correction'
    });
  }

  // Bulk operations
  bulkIncrease() {
    this.snackBar.open('Fitur bulk increase akan segera tersedia', 'Tutup', { duration: 3000 });
  }

  exportAdjustments() {
    this.snackBar.open('Fitur export akan segera tersedia', 'Tutup', { duration: 3000 });
  }
}