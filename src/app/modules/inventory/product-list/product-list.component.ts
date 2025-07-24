import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TopbarComponent } from '../../../shared/topbar/topbar';
import { InventoryService, Product, Category } from '../services/inventory.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    TopbarComponent
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  currentUser = {
    username: localStorage.getItem('username') || 'User',
    role: localStorage.getItem('role') || 'Kasir'
  };

  displayedColumns: string[] = ['name', 'sku', 'category', 'stock', 'sellPrice', 'status', 'actions'];
  dataSource = new MatTableDataSource<Product>();
  
  searchForm: FormGroup;
  categories: Category[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = true;

  constructor() {
    this.searchForm = this.fb.group({
      search: [''],
      categoryId: ['']
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
    this.setupSearch();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadCategories() {
    this.inventoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadProducts() {
    this.isLoading = true;
    const searchValue = this.searchForm.get('search')?.value;
    const categoryId = this.searchForm.get('categoryId')?.value;

    this.inventoryService.getProducts(
      this.currentPage + 1,
      this.pageSize,
      searchValue,
      categoryId
    ).subscribe({
      next: (response) => {
        this.dataSource.data = response.items;
        this.totalItems = response.totalItems;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoading = false;
      }
    });
  }

  setupSearch() {
    this.searchForm.valueChanges.subscribe(() => {
      this.currentPage = 0;
      this.loadProducts();
    });
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProducts();
  }

  deleteProduct(product: Product) {
    if (confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?`)) {
      this.inventoryService.deleteProduct(product.id).subscribe({
        next: () => {
          this.snackBar.open('Produk berhasil dihapus', 'Tutup', { duration: 3000 });
          this.loadProducts();
        },
        error: (error) => {
          console.error('Error deleting product:', error);
          this.snackBar.open('Gagal menghapus produk', 'Tutup', { duration: 3000 });
        }
      });
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getStockStatusClass(product: Product): string {
    if (product.stock <= 0) return 'out-of-stock';
    if (product.stock <= product.minStock) return 'low-stock';
    return 'in-stock';
  }

  getStockStatusText(product: Product): string {
    if (product.stock <= 0) return 'Habis';
    if (product.stock <= product.minStock) return 'Menipis';
    return 'Tersedia';
  }
}