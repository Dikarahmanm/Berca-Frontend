import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-inventory-report-consolidated',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="inventory-report-consolidated">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>inventory</mat-icon>
            Consolidated Inventory Report
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="filterForm" class="filter-form">
            <mat-form-field>
              <mat-label>Category</mat-label>
              <mat-select formControlName="category">
                <mat-option value="">All Categories</mat-option>
                <mat-option value="electronics">Electronics</mat-option>
                <mat-option value="clothing">Clothing</mat-option>
                <mat-option value="books">Books</mat-option>
              </mat-select>
            </mat-form-field>
            
            <mat-form-field>
              <mat-label>Branch</mat-label>
              <mat-select formControlName="branch">
                <mat-option value="">All Branches</mat-option>
                <mat-option value="main">Main Branch</mat-option>
                <mat-option value="downtown">Downtown</mat-option>
                <mat-option value="mall">Mall Location</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="loadReport()">
              <mat-icon>refresh</mat-icon>
              Generate Report
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="summary-cards">
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="card-header">
              <span class="label">Total Products</span>
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div class="value">{{ totalProducts }}</div>
            <div class="change positive">+5% from last period</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="card-header">
              <span class="label">Total Value</span>
              <mat-icon>attach_money</mat-icon>
            </div>
            <div class="value">{{ totalValue | currency }}</div>
            <div class="change positive">+12% from last period</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="card-header">
              <span class="label">Low Stock Items</span>
              <mat-icon>warning</mat-icon>
            </div>
            <div class="value">{{ lowStockItems }}</div>
            <div class="change negative">+3 from last period</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="data-card">
        <mat-card-header>
          <mat-card-title>Inventory Details</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-table [dataSource]="inventoryData" class="inventory-table">
            <ng-container matColumnDef="product">
              <mat-header-cell *matHeaderCellDef>Product</mat-header-cell>
              <mat-cell *matCellDef="let item">{{ item.product }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="branch">
              <mat-header-cell *matHeaderCellDef>Branch</mat-header-cell>
              <mat-cell *matCellDef="let item">{{ item.branch }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="quantity">
              <mat-header-cell *matHeaderCellDef>Quantity</mat-header-cell>
              <mat-cell *matCellDef="let item">{{ item.quantity }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="value">
              <mat-header-cell *matHeaderCellDef>Value</mat-header-cell>
              <mat-cell *matCellDef="let item">{{ item.value | currency }}</mat-cell>
            </ng-container>

            <ng-container matColumnDef="status">
              <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
              <mat-cell *matCellDef="let item">
                <span [class]="'status-' + item.status">{{ item.status }}</span>
              </mat-cell>
            </ng-container>

            <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
            <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
          </mat-table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .inventory-report-consolidated {
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-card {
      margin-bottom: 24px;
    }

    .filter-form {
      display: flex;
      gap: 16px;
      align-items: end;
      flex-wrap: wrap;
    }

    .filter-form mat-form-field {
      min-width: 200px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .summary-card .label {
      font-size: 0.875rem;
      color: #666;
      font-weight: 500;
    }

    .summary-card .value {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .summary-card .change {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .summary-card .change.positive {
      color: #4caf50;
    }

    .summary-card .change.negative {
      color: #f44336;
    }

    .data-card {
      margin-bottom: 24px;
    }

    .inventory-table {
      width: 100%;
    }

    .status-in-stock {
      color: #4caf50;
      font-weight: 500;
    }

    .status-low-stock {
      color: #ff9800;
      font-weight: 500;
    }

    .status-out-of-stock {
      color: #f44336;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .filter-form {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-form mat-form-field {
        min-width: auto;
      }

      .summary-cards {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class InventoryReportConsolidatedComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  filterForm: FormGroup;
  totalProducts = 1248;
  totalValue = 156789;
  lowStockItems = 23;
  
  displayedColumns = ['product', 'branch', 'quantity', 'value', 'status'];
  inventoryData = [
    { product: 'Laptop Dell XPS', branch: 'Main Branch', quantity: 15, value: 25000, status: 'in-stock' },
    { product: 'iPhone 15', branch: 'Downtown', quantity: 5, value: 12000, status: 'low-stock' },
    { product: 'Samsung TV', branch: 'Mall Location', quantity: 0, value: 0, status: 'out-of-stock' },
    { product: 'Nike Shoes', branch: 'Main Branch', quantity: 25, value: 5000, status: 'in-stock' }
  ];

  constructor() {
    this.filterForm = this.fb.group({
      category: [''],
      branch: ['']
    });
  }

  ngOnInit() {
    this.loadReport();
  }

  loadReport() {
    // Implementation for loading inventory report data
    console.log('Loading inventory report with filters:', this.filterForm.value);
  }
}