import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  categoryName: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  productCount: number;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalCategories: number;
  lowStockCount: number;
  totalValue: number;
  recentAdjustments: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private readonly API_URL = 'https://localhost:7297/api/inventory';
  
  private lowStockSubject = new BehaviorSubject<Product[]>([]);
  public lowStock$ = this.lowStockSubject.asObservable();

  // Products
  getProducts(page: number = 1, pageSize: number = 10, search?: string, categoryId?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (search) params = params.set('search', search);
    if (categoryId) params = params.set('categoryId', categoryId);
    
    return this.http.get(`${this.API_URL}/products`, { params });
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.API_URL}/products/${id}`);
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.API_URL}/products`, product);
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.API_URL}/products/${id}`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/products/${id}`);
  }

  // Categories
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.API_URL}/categories`);
  }

  createCategory(category: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.API_URL}/categories`, category);
  }

  updateCategory(id: string, category: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.API_URL}/categories/${id}`, category);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/categories/${id}`);
  }

  // Stock Management
  adjustStock(adjustment: Partial<StockAdjustment>): Observable<StockAdjustment> {
    return this.http.post<StockAdjustment>(`${this.API_URL}/stock-adjustment`, adjustment);
  }

  getStockAdjustments(productId?: string): Observable<StockAdjustment[]> {
    let params = new HttpParams();
    if (productId) params = params.set('productId', productId);
    
    return this.http.get<StockAdjustment[]>(`${this.API_URL}/stock-adjustments`, { params });
  }

  getLowStockProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.API_URL}/products/low-stock`)
      .pipe(
        tap(products => this.lowStockSubject.next(products))
      );
  }

  // Dashboard Stats
  getInventoryStats(): Observable<InventoryStats> {
    return this.http.get<InventoryStats>(`${this.API_URL}/stats`);
  }

  // Search by barcode
  searchByBarcode(barcode: string): Observable<Product | null> {
    return this.http.get<Product>(`${this.API_URL}/products/barcode/${barcode}`);
  }

  // Generate SKU
  generateSku(categoryId: string): Observable<string> {
    return this.http.post<string>(`${this.API_URL}/products/generate-sku`, { categoryId });
  }
}