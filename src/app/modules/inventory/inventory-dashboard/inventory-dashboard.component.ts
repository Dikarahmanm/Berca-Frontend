import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TopbarComponent } from '../../../shared/topbar/topbar';
import { InventoryService, InventoryStats, Product } from '../services/inventory.service';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    TopbarComponent,
    MatDividerModule,
  ],
  templateUrl: './inventory-dashboard.component.html',
  styleUrls: ['./inventory-dashboard.component.scss']
})
export class InventoryDashboardComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  currentUser = {
    username: localStorage.getItem('username') || 'User',
    role: localStorage.getItem('role') || 'Kasir'
  };

  stats: InventoryStats = {
    totalProducts: 0,
    totalCategories: 0,
    lowStockCount: 0,
    totalValue: 0,
    recentAdjustments: 0
  };

  lowStockProducts: Product[] = [];
  isLoading = true;

  ngOnInit() {
    this.loadDashboardData();
    this.loadLowStockProducts();
  }

  loadDashboardData() {
    this.inventoryService.getInventoryStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading inventory stats:', error);
        this.isLoading = false;
      }
    });
  }

  loadLowStockProducts() {
    this.inventoryService.getLowStockProducts().subscribe({
      next: (products) => {
        this.lowStockProducts = products;
      },
      error: (error) => {
        console.error('Error loading low stock products:', error);
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
  getStockStatusClass(product: any): string {
        return product.stock < product.minStock ? 'low-stock' : 'sufficient-stock';
    }

    getStockStatusText(product: any): string {
        return product.stock < product.minStock ? 'Kurang stok' : 'Stok mencukupi';
    }
}
