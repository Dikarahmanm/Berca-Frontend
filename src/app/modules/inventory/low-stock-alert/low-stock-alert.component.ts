import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TopbarComponent } from '../../../shared/topbar/topbar';
import { InventoryService, Product } from '../services/inventory.service';

@Component({
  selector: 'app-low-stock-alert',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatBadgeModule,
    MatSnackBarModule,
    TopbarComponent
  ],
  template: './low-stock-alert.component.html',
  styleUrls: ['./low-stock-alert.component.scss']
})
export class LowStockAlertComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private snackBar = inject(MatSnackBar);

  currentUser = {
    username: localStorage.getItem('username') || 'User',
    role: localStorage.getItem('role') || 'Kasir'
  };

  lowStockProducts: Product[] = [];
  isLoading = false;

  ngOnInit() {
    this.loadLowStockProducts();
  }

  loadLowStockProducts() {
    this.isLoading = true;
    this.inventoryService.getLowStockProducts().subscribe({
      next: (products) => {
        this.lowStockProducts = products.sort((a, b) => this.getStockPercentage(a) - this.getStockPercentage(b));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading low stock products:', error);
        this.snackBar.open('Gagal memuat data produk stok menipis', 'Tutup', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  refreshData() {
    this.loadLowStockProducts();
    this.snackBar.open('Data berhasil diperbarui', 'Tutup', { duration: 2000 });
  }

  getStockPercentage(product: Product): number {
    if (product.minStock === 0) return 100;
    return Math.max(0, Math.min(100, (product.stock / product.minStock) * 100));
  }

  getStockStatusClass(product: Product): string {
    const percentage = this.getStockPercentage(product);
    if (percentage === 0) return 'out-of-stock';
    if (percentage <= 50) return 'critical';
    if (percentage <= 100) return 'low-stock';
    return 'in-stock';
  }

  getStockSeverityClass(product: Product): string {
    const percentage = this.getStockPercentage(product);
    if (percentage === 0) return 'severity-critical';
    if (percentage <= 25) return 'severity-high';
    if (percentage <= 50) return 'severity-medium';
    return 'severity-low';
  }

  getUrgencyClass(product: Product): string {
    const percentage = this.getStockPercentage(product);
    if (percentage === 0) return 'urgency-critical';
    if (percentage <= 25) return 'urgency-high';
    if (percentage <= 50) return 'urgency-medium';
    return 'urgency-low';
  }

  getUrgencyIcon(product: Product): string {
    const percentage = this.getStockPercentage(product);
    if (percentage === 0) return 'error';
    if (percentage <= 25) return 'warning';
    if (percentage <= 50) return 'info';
    return 'check_circle';
  }

  getUrgencyText(product: Product): string {
    const percentage = this.getStockPercentage(product);
    if (percentage === 0) return 'HABIS';
    if (percentage <= 25) return 'KRITIS';
    if (percentage <= 50) return 'RENDAH';
    return 'PERHATIAN';
  }

  viewProductDetails(product: Product) {
    // Could open a dialog or navigate to product detail page
    this.snackBar.open(`Detail produk: ${product.name}`, 'Tutup', { duration: 3000 });
  }
}