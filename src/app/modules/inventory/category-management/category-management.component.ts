import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TopbarComponent } from '../../../shared/topbar/topbar';
import { InventoryService, Category } from '../services/inventory.service';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCheckboxModule,
    TopbarComponent
  ],
  template: './category-management.component.html',
  styleUrls: ['./category-management.component.scss']
})
export class CategoryManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private snackBar = inject(MatSnackBar);

  currentUser = {
    username: localStorage.getItem('username') || 'User',
    role: localStorage.getItem('role') || 'Kasir'
  };

  categoryForm: FormGroup;
  categories: Category[] = [];
  editingCategory: Category | null = null;
  isLoading = false;

  constructor() {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.inventoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.snackBar.open('Gagal memuat kategori', 'Tutup', { duration: 3000 });
      }
    });
  }

  onSubmit() {
    if (this.categoryForm.valid) {
      this.isLoading = true;
      const formData = { ...this.categoryForm.value, isActive: true };

      const operation = this.editingCategory
        ? this.inventoryService.updateCategory(this.editingCategory.id, formData)
        : this.inventoryService.createCategory(formData);

      operation.subscribe({
        next: () => {
          const message = this.editingCategory ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan';
          this.snackBar.open(message, 'Tutup', { duration: 3000 });
          this.categoryForm.reset();
          this.editingCategory = null;
          this.loadCategories();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error saving category:', error);
          const message = this.editingCategory ? 'Gagal memperbarui kategori' : 'Gagal menambahkan kategori';
          this.snackBar.open(message, 'Tutup', { duration: 3000 });
          this.isLoading = false;
        }
      });
    }
  }

  editCategory(category: Category) {
    this.editingCategory = category;
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description
    });
  }

  cancelEdit() {
    this.editingCategory = null;
    this.categoryForm.reset();
  }

  toggleCategoryStatus(category: Category) {
    const updatedCategory = { ...category, isActive: !category.isActive };
    
    this.inventoryService.updateCategory(category.id, updatedCategory).subscribe({
      next: () => {
        const message = category.isActive ? 'Kategori dinonaktifkan' : 'Kategori diaktifkan';
        this.snackBar.open(message, 'Tutup', { duration: 3000 });
        this.loadCategories();
      },
      error: (error) => {
        console.error('Error updating category status:', error);
        this.snackBar.open('Gagal mengubah status kategori', 'Tutup', { duration: 3000 });
      }
    });
  }

  deleteCategory(category: Category) {
    if (category.productCount > 0) {
      this.snackBar.open('Tidak dapat menghapus kategori yang masih memiliki produk', 'Tutup', { duration: 4000 });
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus kategori "${category.name}"?`)) {
      this.inventoryService.deleteCategory(category.id).subscribe({
        next: () => {
          this.snackBar.open('Kategori berhasil dihapus', 'Tutup', { duration: 3000 });
          this.loadCategories();
        },
        error: (error) => {
          console.error('Error deleting category:', error);
          this.snackBar.open('Gagal menghapus kategori', 'Tutup', { duration: 3000 });
        }
      });
    }
  }
}