// src/app/modules/category-management/category-list/category-list.component.ts
// ✅ FIXED - Added missing properties and methods

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Services & Models
import { CategoryService } from '../services/category.service';
import { CategoryStateService } from '../services/category-state.service';
import { 
  Category, 
  CategoryFilter,
  DEFAULT_CATEGORY_COLORS,
  getContrastTextColor
} from '../models/category.models';

// Components
import { CategoryFormModalComponent } from '../category-form-modal/category-form-modal.component';

interface ViewMode {
  type: 'grid' | 'list';
  size: 'small' | 'medium' | 'large';
}

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CategoryFormModalComponent
  ],
  providers: [
    CategoryService,
    CategoryStateService
  ]
})
export class CategoryListComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef<HTMLInputElement>;

  // ✅ Data properties
  categories: Category[] = [];
  totalCategories = 0; // ✅ ADDED: Missing property
  loading = false;
  error: string | null = null;

  // ✅ Pagination properties
  currentPage = 1;
  totalPages = 0;
  pageSize = 12;

  // Forms
  searchForm: FormGroup;
  filterForm: FormGroup;

  // State
  selectedCategories: Set<number> = new Set();
  viewMode: ViewMode = { type: 'grid', size: 'medium' };
  showFilters = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  categoryToEdit: Category | null = null;
  categoryToDelete: Category | null = null;

  // Constants
  readonly defaultColors = DEFAULT_CATEGORY_COLORS;
  readonly pageSizeOptions = [6, 12, 24, 48];
  readonly sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'color', label: 'Color' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private categoryService: CategoryService,
    private categoryStateService: CategoryStateService,
    private fb: FormBuilder
  ) {
    // Initialize forms
    this.searchForm = this.fb.group({
      searchTerm: ['']
    });

    this.filterForm = this.fb.group({
      color: [''],
      sortBy: ['name'],
      sortOrder: ['asc'],
      pageSize: [12]
    });
  }

  ngOnInit(): void {
    this.subscribeToState();
    this.setupFormSubscriptions();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ SUBSCRIBE TO STATE SERVICE
  private subscribeToState(): void {
    // Subscribe to categories
    this.categoryStateService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.categories = categories;
        console.log('📋 Categories updated:', categories);
      });

    // Subscribe to loading state
    this.categoryStateService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
      });

    // Subscribe to errors
    this.categoryStateService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
        if (error) {
          console.error('❌ Category error:', error);
        }
      });

    // ✅ ADDED: Subscribe to pagination
    this.categoryStateService.totalCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(totalCount => {
        this.totalCategories = totalCount;
      });

    this.categoryStateService.currentPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(currentPage => {
        this.currentPage = currentPage;
      });

    this.categoryStateService.totalPages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(totalPages => {
        this.totalPages = totalPages;
      });
  }

  // ✅ SETUP FORM SUBSCRIPTIONS
  private setupFormSubscriptions(): void {
    // Search subscription
    this.searchForm.get('searchTerm')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        console.log('🔍 Search term changed:', searchTerm);
        this.categoryStateService.setSearchTerm(searchTerm || '');
        this.loadCategories();
      });

    // Filter subscription
    this.filterForm.valueChanges
      .pipe(
        debounceTime(100),
        takeUntil(this.destroy$)
      )
      .subscribe(filterValues => {
        console.log('🎛️ Filter values changed:', filterValues);
        this.categoryStateService.setFilter({
          color: filterValues.color,
          sortBy: filterValues.sortBy,
          sortOrder: filterValues.sortOrder,
          pageSize: filterValues.pageSize
        });
        this.pageSize = filterValues.pageSize; // ✅ ADDED: Update local pageSize
        this.loadCategories();
      });
  }

  // ✅ LOAD CATEGORIES USING SERVICE
  private loadCategories(): void {
    const filter = this.categoryStateService.getCurrentFilter();
    console.log('📊 Loading categories with filter:', filter);

    this.categoryStateService.setLoading({ loading: true });
    this.categoryStateService.clearError();

    this.categoryService.getCategories(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Categories loaded:', response);
          this.categoryStateService.setCategories(response.categories);
          this.categoryStateService.setPagination(
            response.totalCount, 
            response.page,
            response.totalPages
          );
          this.categoryStateService.setLoading({ loading: false });
        },
        error: (error) => {
          console.error('❌ Failed to load categories:', error);
          this.categoryStateService.setError(error.message || 'Failed to load categories');
          this.categoryStateService.setLoading({ loading: false });
        }
      });
  }

  // ✅ REFRESH CATEGORIES
  refreshCategories(): void {
    console.log('🔄 Refreshing categories...');
    this.categoryStateService.clearError();
    this.loadCategories();
  }

  // ✅ EXPORT CATEGORIES
  exportCategories(): void {
    console.log('📊 Exporting categories...');
    const categories = this.categoryStateService.getCurrentCategories();
    
    if (categories.length === 0) {
      console.warn('⚠️ No categories to export');
      return;
    }

    // Create CSV format for better usability
    const csvHeader = 'ID,Name,Color,Description,Created Date,Updated Date,Product Count\n';
    const csvRows = categories.map(cat => 
      `${cat.id},"${cat.name}","${cat.color}","${cat.description || ''}","${new Date(cat.createdAt).toLocaleDateString()}","${new Date(cat.updatedAt).toLocaleDateString()}",${cat.productCount || 0}`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `categories-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    console.log('✅ Categories exported successfully');
  }

  // ✅ SEARCH ACTIONS
  onSearchClear(): void {
    this.searchForm.patchValue({ searchTerm: '' });
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  // ✅ ADDED: Missing onSearch method
  onSearch(): void {
    // This method is called when the form is submitted
    // The actual search is handled by the valueChanges subscription
    console.log('🔍 Search form submitted');
  }

  onColorFilter(color: string): void {
    const currentColor = this.filterForm.get('color')?.value;
    const newColor = currentColor === color ? '' : color;
    this.filterForm.patchValue({ color: newColor });
  }

  clearAllFilters(): void {
    this.searchForm.reset();
    this.filterForm.patchValue({
      color: '',
      sortBy: 'name',
      sortOrder: 'asc',
      pageSize: 12
    });
    this.categoryStateService.resetFilter();
    this.loadCategories();
  }

  toggleSortOrder(): void {
    const currentOrder = this.filterForm.get('sortOrder')?.value;
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    this.filterForm.patchValue({ sortOrder: newOrder });
  }

  // ✅ VIEW MODE
  setViewMode(type: 'grid' | 'list'): void {
    this.viewMode.type = type;
    console.log('👁️ View mode changed:', this.viewMode);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // ✅ SELECTION
  toggleCategorySelection(categoryId: number): void {
    if (this.selectedCategories.has(categoryId)) {
      this.selectedCategories.delete(categoryId);
    } else {
      this.selectedCategories.add(categoryId);
    }
    console.log('✅ Selection changed:', Array.from(this.selectedCategories));
  }

  clearSelection(): void {
    this.selectedCategories.clear();
  }

  isSelected(categoryId: number): boolean {
    return this.selectedCategories.has(categoryId);
  }

  get hasSelection(): boolean {
    return this.selectedCategories.size > 0;
  }

  get selectedCount(): number {
    return this.selectedCategories.size;
  }

  // ✅ PAGINATION
  onPageChange(page: number): void {
    console.log('📄 Page changed:', page);
    this.categoryStateService.setPage(page);
    this.loadCategories();
  }

  // ✅ ADDED: Pagination helper methods
  get canGoNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  nextPage(): void {
    if (this.canGoNext) {
      this.onPageChange(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.canGoPrevious) {
      this.onPageChange(this.currentPage - 1);
    }
  }

  // ✅ CATEGORY ACTIONS USING SERVICE
  onCreateCategory(): void {
    console.log('➕ Creating new category...');
    this.showCreateModal = true;
  }

  onEditCategory(category: Category): void {
    console.log('✏️ Editing category:', category);
    this.categoryToEdit = category;
    this.categoryStateService.setSelectedCategory(category);
    this.showEditModal = true;
  }

  onDeleteCategory(category: Category): void {
    console.log('🗑️ Deleting category:', category);
    this.categoryToDelete = category;
    this.showDeleteModal = true;
  }

  onDuplicateCategory(category: Category): void {
    console.log('📋 Duplicating category:', category);
    
    const duplicateData = {
      name: `${category.name} (Copy)`,
      color: category.color,
      description: category.description
    };
    
    this.categoryStateService.setLoading({ creating: true });
    
    this.categoryService.createCategory(duplicateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newCategory) => {
          console.log('✅ Category duplicated successfully:', newCategory);
          this.categoryStateService.addCategory(newCategory);
          this.categoryStateService.setLoading({ creating: false });
        },
        error: (error) => {
          console.error('❌ Error duplicating category:', error);
          this.categoryStateService.setError(error.message || 'Failed to duplicate category');
          this.categoryStateService.setLoading({ creating: false });
        }
      });
  }

  confirmDelete(): void {
    if (!this.categoryToDelete) return;

    console.log('✅ Confirming delete for:', this.categoryToDelete.name);
    
    this.categoryStateService.setLoading({ deleting: true });
    
    this.categoryService.deleteCategory(this.categoryToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Category deleted successfully');
          this.categoryStateService.removeCategory(this.categoryToDelete!.id);
          this.categoryStateService.setLoading({ deleting: false });
          this.closeDeleteModal();
        },
        error: (error) => {
          console.error('❌ Error deleting category:', error);
          this.categoryStateService.setError(error.message || 'Failed to delete category');
          this.categoryStateService.setLoading({ deleting: false });
        }
      });
  }

  // ✅ BULK DELETE USING SERVICE
  onBulkDelete(): void {
    if (this.selectedCategories.size === 0) return;

    console.log('🗑️ Bulk deleting categories:', Array.from(this.selectedCategories));
    
    const deletePromises = Array.from(this.selectedCategories).map(id =>
      this.categoryService.deleteCategory(id).toPromise()
    );

    this.categoryStateService.setLoading({ deleting: true });

    Promise.allSettled(deletePromises).then((results) => {
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      console.log(`✅ Bulk delete completed: ${successful} successful, ${failed} failed`);
      
      // Refresh categories list
      this.loadCategories();
      this.clearSelection();
      this.categoryStateService.setLoading({ deleting: false });
      
      if (failed > 0) {
        this.categoryStateService.setError(`Failed to delete ${failed} categories`);
      }
    });
  }

  // ✅ MODAL CONTROLS
  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.categoryToEdit = null;
    this.categoryStateService.setSelectedCategory(null);
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.categoryToDelete = null;
  }

  // ✅ EVENT HANDLERS
  onCategoryCreated(category: Category): void {
    console.log('✅ Category created:', category);
    this.categoryStateService.addCategory(category);
    this.closeCreateModal();
  }

  onCategoryUpdated(category: Category): void {
    console.log('✅ Category updated:', category);
    this.categoryStateService.updateCategory(category);
    this.closeEditModal();
  }

  // ✅ UTILITY METHODS
  getContrastTextColor(backgroundColor: string): string {
    return getContrastTextColor(backgroundColor);
  }

  trackByCategory(index: number, category: Category): number {
    return category.id;
  }

  // ✅ ADDED: Additional helper methods
  get displayedItemsInfo(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalCategories);
    return `${start}-${end} of ${this.totalCategories}`;
  }

  get hasCategories(): boolean {
    return this.categories.length > 0;
  }

  get isEmptyState(): boolean {
    return !this.loading && !this.error && this.categories.length === 0;
  }

  get hasActiveFilters(): boolean {
    const searchTerm = this.searchForm.get('searchTerm')?.value;
    const colorFilter = this.filterForm.get('color')?.value;
    return !!(searchTerm || colorFilter);
  }
}