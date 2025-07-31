// ===== LOW STOCK ALERTS COMPONENT =====
// src/app/modules/inventory/components/low-stock-alerts/low-stock-alerts.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

// Services & Interfaces
import { InventoryService } from '../../services/inventory.service';
import { Product } from '../../interfaces/inventory.interfaces';

@Component({
  selector: 'app-low-stock-alerts',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './low-stock-alerts.component.html',
  styleUrls: ['./low-stock-alerts.component.scss']
})
export class LowStockAlertsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data
  lowStockProducts: Product[] = [];
  outOfStockProducts: Product[] = [];
  
  // State
  loading = false;

  constructor(
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.loadLowStockProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLowStockProducts(): void {
    this.loading = true;
    
    this.inventoryService.getLowStockProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minimumStock);
          this.outOfStockProducts = products.filter(p => p.stock === 0);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading low stock products:', error);
          this.loading = false;
        }
      });
  }

  get totalAlerts(): number {
    return this.lowStockProducts.length + this.outOfStockProducts.length;
  }
}
