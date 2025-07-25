// src/app/modules/category-management/services/category-state.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Category, CategoryFilter, CategoryLoadingState } from '../models/category.models';

interface CategoryState {
  categories: Category[];
  selectedCategory: Category | null;
  filter: CategoryFilter;
  loading: CategoryLoadingState;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryStateService {
  
  // Initial state
  private initialState: CategoryState = {
    categories: [],
    selectedCategory: null,
    filter: {
      searchTerm: '',
      color: '',
      page: 1,
      pageSize: 12,
      sortBy: 'name',
      sortOrder: 'asc'
    },
    loading: {
      loading: false,
      creating: false,
      updating: false,
      deleting: false,
      checkingName: false
    },
    error: null,
    totalCount: 0,
    currentPage: 1,
    totalPages: 0
  };

  // State subjects
  private categoriesSubject = new BehaviorSubject<Category[]>(this.initialState.categories);
  private selectedCategorySubject = new BehaviorSubject<Category | null>(this.initialState.selectedCategory);
  private filterSubject = new BehaviorSubject<CategoryFilter>(this.initialState.filter);
  private loadingSubject = new BehaviorSubject<CategoryLoadingState>(this.initialState.loading);
  private errorSubject = new BehaviorSubject<string | null>(this.initialState.error);
  private totalCountSubject = new BehaviorSubject<number>(this.initialState.totalCount);
  private currentPageSubject = new BehaviorSubject<number>(this.initialState.currentPage);
  private totalPagesSubject = new BehaviorSubject<number>(this.initialState.totalPages);

  // Public observables
  public categories$ = this.categoriesSubject.asObservable();
  public selectedCategory$ = this.selectedCategorySubject.asObservable();
  public filter$ = this.filterSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public totalCount$ = this.totalCountSubject.asObservable();
  public currentPage$ = this.currentPageSubject.asObservable();
  public totalPages$ = this.totalPagesSubject.asObservable();

  // Computed observables
  public filteredCategories$: Observable<Category[]> = combineLatest([
    this.categories$,
    this.filter$
  ]).pipe(
    map(([categories, filter]) => this.applyClientSideFilter(categories, filter))
  );

  public hasCategories$ = this.categories$.pipe(
    map(categories => categories.length > 0)
  );

  public isEmpty$ = combineLatest([this.categories$, this.loading$]).pipe(
    map(([categories, loading]) => categories.length === 0 && !loading.loading)
  );

  public isLoading$ = this.loading$.pipe(
    map(loading => loading.loading || loading.creating || loading.updating || loading.deleting)
  );

  public pagination$ = combineLatest([
    this.currentPage$,
    this.totalPages$,
    this.totalCount$,
    this.filter$
  ]).pipe(
    map(([currentPage, totalPages, totalCount, filter]) => ({
      currentPage,
      totalPages,
      totalCount,
      pageSize: filter.pageSize,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1
    }))
  );

  constructor() {}

  // Actions
  setCategories(categories: Category[]): void {
    this.categoriesSubject.next(categories);
  }

  addCategory(category: Category): void {
    const currentCategories = this.categoriesSubject.value;
    this.categoriesSubject.next([...currentCategories, category]);
  }

  updateCategory(updatedCategory: Category): void {
    const currentCategories = this.categoriesSubject.value;
    const updatedCategories = currentCategories.map(cat => 
      cat.id === updatedCategory.id ? updatedCategory : cat
    );
    this.categoriesSubject.next(updatedCategories);
  }

  removeCategory(categoryId: number): void {
    const currentCategories = this.categoriesSubject.value;
    const filteredCategories = currentCategories.filter(cat => cat.id !== categoryId);
    this.categoriesSubject.next(filteredCategories);
  }

  setSelectedCategory(category: Category | null): void {
    this.selectedCategorySubject.next(category);
  }

  setFilter(filter: Partial<CategoryFilter>): void {
    const currentFilter = this.filterSubject.value;
    const newFilter = { ...currentFilter, ...filter };
    this.filterSubject.next(newFilter);
  }

  setSearchTerm(searchTerm: string): void {
    this.setFilter({ searchTerm, page: 1 }); // Reset to first page when searching
  }

  setColorFilter(color: string): void {
    this.setFilter({ color, page: 1 });
  }

  setSorting(sortBy: CategoryFilter['sortBy'], sortOrder: CategoryFilter['sortOrder']): void {
    this.setFilter({ sortBy, sortOrder });
  }

  setPage(page: number): void {
    this.setFilter({ page });
  }

  setPageSize(pageSize: number): void {
    this.setFilter({ pageSize, page: 1 }); // Reset to first page when changing page size
  }

  setLoading(loadingState: Partial<CategoryLoadingState>): void {
    const currentLoading = this.loadingSubject.value;
    const newLoading = { ...currentLoading, ...loadingState };
    this.loadingSubject.next(newLoading);
  }

  setError(error: string | null): void {
    this.errorSubject.next(error);
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  setPagination(totalCount: number, currentPage: number, totalPages: number): void {
    this.totalCountSubject.next(totalCount);
    this.currentPageSubject.next(currentPage);
    this.totalPagesSubject.next(totalPages);
  }

  resetFilter(): void {
    this.filterSubject.next(this.initialState.filter);
  }

  resetState(): void {
    this.categoriesSubject.next(this.initialState.categories);
    this.selectedCategorySubject.next(this.initialState.selectedCategory);
    this.filterSubject.next(this.initialState.filter);
    this.loadingSubject.next(this.initialState.loading);
    this.errorSubject.next(this.initialState.error);
    this.totalCountSubject.next(this.initialState.totalCount);
    this.currentPageSubject.next(this.initialState.currentPage);
    this.totalPagesSubject.next(this.initialState.totalPages);
  }

  // Selectors
  getCurrentCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  getCurrentFilter(): CategoryFilter {
    return this.filterSubject.value;
  }

  getSelectedCategory(): Category | null {
    return this.selectedCategorySubject.value;
  }

  getCategoryById(id: number): Category | undefined {
    return this.categoriesSubject.value.find(cat => cat.id === id);
  }

  // Private helpers
  private applyClientSideFilter(categories: Category[], filter: CategoryFilter): Category[] {
    let filtered = [...categories];

    // Apply search filter
    if (filter.searchTerm?.trim()) {
      const searchTerm = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(searchTerm) ||
        cat.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply color filter
    if (filter.color?.trim()) {
      filtered = filtered.filter(cat => cat.color === filter.color);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[filter.sortBy];
      const bValue = b[filter.sortBy];
      
      if (aValue < bValue) return filter.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filter.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }
}