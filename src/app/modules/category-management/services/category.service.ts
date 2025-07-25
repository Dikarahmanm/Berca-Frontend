import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  Category, 
  CategoryListResponse, 
  CreateCategoryRequest, 
  UpdateCategoryRequest,
  CategoryFilter,
  CategoryNameCheckResponse,
  ApiErrorResponse
} from '../models/category.models';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly apiUrl = 'http://localhost:5171/api/Category';
  
  // State management dengan BehaviorSubject
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  public categories$ = this.categoriesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get categories with filtering, sorting, and pagination
   */
  getCategories(filter: CategoryFilter): Observable<CategoryListResponse> {
    this.setLoading(true);
    this.clearError();

    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString())
      .set('sortBy', filter.sortBy)
      .set('sortOrder', filter.sortOrder);

    if (filter.searchTerm?.trim()) {
      params = params.set('searchTerm', filter.searchTerm.trim());
    }

    if (filter.color?.trim()) {
      params = params.set('color', filter.color.trim());
    }

    return this.http.get<CategoryListResponse>(this.apiUrl, { params }).pipe(
      tap(response => {
        this.categoriesSubject.next(response.categories);
        this.setLoading(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get simple category list (untuk dropdowns)
   */
  getCategoriesSimple(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/simple`).pipe(
      tap(categories => this.categoriesSubject.next(categories)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Create new category
   */
  createCategory(categoryData: CreateCategoryRequest): Observable<Category> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<Category>(this.apiUrl, categoryData).pipe(
      tap(newCategory => {
        // Add to current categories list
        const currentCategories = this.categoriesSubject.value;
        this.categoriesSubject.next([...currentCategories, newCategory]);
        this.setLoading(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Update existing category
   */
  updateCategory(id: number, categoryData: UpdateCategoryRequest): Observable<Category> {
    this.setLoading(true);
    this.clearError();

    return this.http.put<Category>(`${this.apiUrl}/${id}`, categoryData).pipe(
      tap(updatedCategory => {
        // Update in current categories list
        const currentCategories = this.categoriesSubject.value;
        const updatedCategories = currentCategories.map(cat => 
          cat.id === id ? updatedCategory : cat
        );
        this.categoriesSubject.next(updatedCategories);
        this.setLoading(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Delete category
   */
  deleteCategory(id: number): Observable<void> {
    this.setLoading(true);
    this.clearError();

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Remove from current categories list
        const currentCategories = this.categoriesSubject.value;
        const filteredCategories = currentCategories.filter(cat => cat.id !== id);
        this.categoriesSubject.next(filteredCategories);
        this.setLoading(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Check if category name exists
   */
  checkCategoryName(name: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams().set('name', name.trim());
    
    if (excludeId) {
      params = params.set('excludeId', excludeId.toString());
    }

    return this.http.get<CategoryNameCheckResponse>(`${this.apiUrl}/check-name`, { params }).pipe(
      map(response => response.exists),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Refresh categories list
   */
  refreshCategories(): Observable<Category[]> {
    return this.getCategoriesSimple();
  }

  /**
   * Search categories by name
   */
  searchCategories(searchTerm: string): Observable<Category[]> {
    const filter: CategoryFilter = {
      searchTerm,
      page: 1,
      pageSize: 50,
      sortBy: 'name',
      sortOrder: 'asc'
    };

    return this.getCategories(filter).pipe(
      map(response => response.categories)
    );
  }

  /**
   * Get categories by color
   */
  getCategoriesByColor(color: string): Observable<Category[]> {
    const filter: CategoryFilter = {
      color,
      page: 1,
      pageSize: 50,
      sortBy: 'name',
      sortOrder: 'asc'
    };

    return this.getCategories(filter).pipe(
      map(response => response.categories)
    );
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    this.setLoading(false);
    
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Invalid request data';
          break;
        case 401:
          errorMessage = 'You are not authorized to perform this action';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action';
          break;
        case 404:
          errorMessage = 'Category not found';
          break;
        case 409:
          errorMessage = error.error?.message || 'Category name already exists';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = error.error?.message || `Error Code: ${error.status}`;
      }
    }
    
    this.errorSubject.next(errorMessage);
    console.error('CategoryService Error:', error);
    
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Get current categories snapshot
   */
  getCurrentCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  /**
   * Get category by name (dari current state)
   */
  getCategoryByName(name: string): Category | undefined {
    return this.categoriesSubject.value.find(
      cat => cat.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Sort categories
   */
  sortCategories(categories: Category[], sortBy: keyof Category, sortOrder: 'asc' | 'desc'): Category[] {
    return [...categories].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (bValue === undefined) return sortOrder === 'asc' ? -1 : 1;
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Filter categories by search term
   */
  filterCategories(categories: Category[], searchTerm: string): Category[] {
    if (!searchTerm.trim()) return categories;
    
    const term = searchTerm.toLowerCase();
    return categories.filter(category =>
      category.name.toLowerCase().includes(term) ||
      category.description?.toLowerCase().includes(term)
    );
  }
}