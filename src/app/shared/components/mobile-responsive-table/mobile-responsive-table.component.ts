// src/app/shared/components/mobile-responsive-table/mobile-responsive-table.component.ts
// Mobile-first responsive table component that switches between table and card view

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'date' | 'badge' | 'actions';
  sortable?: boolean;
  mobileVisible?: boolean; // Show in mobile card view
  width?: string;
}

export interface TableAction {
  label: string;
  icon: string;
  action: string;
  color?: 'primary' | 'accent' | 'warn';
  disabled?: (item: any) => boolean;
}

@Component({
  selector: 'app-mobile-responsive-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <!-- Desktop Table View -->
    <div class="table-container desktop-view" [class.hidden]="isMobile()">
      <table mat-table [dataSource]="data" class="responsive-table">
        
        <ng-container *ngFor="let column of columns; trackBy: trackByColumn" [matColumnDef]="column.key">
          <th mat-header-cell *matHeaderCellDef [style.width]="column.width">
            <span class="header-content">
              {{ column.label }}
              <mat-icon *ngIf="column.sortable" class="sort-icon">sort</mat-icon>
            </span>
          </th>
          
          <td mat-cell *matCellDef="let item" [attr.data-label]="column.label">
            <ng-container [ngSwitch]="column.type">
              <!-- Text -->
              <span *ngSwitchCase="'text'">{{ getNestedValue(item, column.key) }}</span>
              
              <!-- Number -->
              <span *ngSwitchCase="'number'" class="number-cell">
                {{ formatNumber(getNestedValue(item, column.key)) }}
              </span>
              
              <!-- Currency -->
              <span *ngSwitchCase="'currency'" class="currency-cell">
                {{ formatCurrency(getNestedValue(item, column.key)) }}
              </span>
              
              <!-- Date -->
              <span *ngSwitchCase="'date'" class="date-cell">
                {{ formatDate(getNestedValue(item, column.key)) }}
              </span>
              
              <!-- Badge -->
              <mat-chip *ngSwitchCase="'badge'" 
                        [ngClass]="getBadgeClass(getNestedValue(item, column.key))"
                        class="status-chip">
                {{ getNestedValue(item, column.key) }}
              </mat-chip>
              
              <!-- Actions -->
              <div *ngSwitchCase="'actions'" class="action-buttons">
                <button *ngFor="let action of actions; trackBy: trackByAction"
                        mat-icon-button
                        [color]="action.color || 'primary'"
                        [disabled]="action.disabled ? action.disabled(item) : false"
                        (click)="onActionClick(action.action, item)"
                        [attr.aria-label]="action.label"
                        [matTooltip]="action.label">
                  <mat-icon>{{ action.icon }}</mat-icon>
                </button>
              </div>
              
              <!-- Default -->
              <span *ngSwitchDefault>{{ getNestedValue(item, column.key) }}</span>
            </ng-container>
          </td>
        </ng-container>
        
        <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns();"></tr>
      </table>
    </div>

    <!-- Mobile Card View -->
    <div class="card-container mobile-view" [class.hidden]="!isMobile()">
      <mat-card *ngFor="let item of data; trackBy: trackByItem" class="mobile-card">
        <mat-card-content class="card-content">
          
          <!-- Primary field (usually name/title) -->
          <div class="card-header" *ngIf="primaryColumn">
            <h3 class="card-title">{{ getNestedValue(item, primaryColumn.key) }}</h3>
            <div class="card-actions" *ngIf="actions && actions.length > 0">
              <button *ngFor="let action of actions; trackBy: trackByAction"
                      mat-icon-button
                      [color]="action.color || 'primary'"
                      [disabled]="action.disabled ? action.disabled(item) : false"
                      (click)="onActionClick(action.action, item)"
                      [attr.aria-label]="action.label"
                      [matTooltip]="action.label"
                      class="card-action-btn">
                <mat-icon>{{ action.icon }}</mat-icon>
              </button>
            </div>
          </div>
          
          <!-- Other fields -->
          <div class="card-fields">
            <div *ngFor="let column of mobileColumns(); trackBy: trackByColumn" 
                 class="card-field">
              <span class="field-label">{{ column.label }}:</span>
              
              <ng-container [ngSwitch]="column.type">
                <!-- Text -->
                <span *ngSwitchCase="'text'" class="field-value text-value">
                  {{ getNestedValue(item, column.key) }}
                </span>
                
                <!-- Number -->
                <span *ngSwitchCase="'number'" class="field-value number-value">
                  {{ formatNumber(getNestedValue(item, column.key)) }}
                </span>
                
                <!-- Currency -->
                <span *ngSwitchCase="'currency'" class="field-value currency-value">
                  {{ formatCurrency(getNestedValue(item, column.key)) }}
                </span>
                
                <!-- Date -->
                <span *ngSwitchCase="'date'" class="field-value date-value">
                  {{ formatDate(getNestedValue(item, column.key)) }}
                </span>
                
                <!-- Badge -->
                <mat-chip *ngSwitchCase="'badge'" 
                          [ngClass]="getBadgeClass(getNestedValue(item, column.key))"
                          class="field-value badge-value status-chip">
                  {{ getNestedValue(item, column.key) }}
                </mat-chip>
                
                <!-- Default -->
                <span *ngSwitchDefault class="field-value">
                  {{ getNestedValue(item, column.key) }}
                </span>
              </ng-container>
            </div>
          </div>
          
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./mobile-responsive-table.component.scss']
})
export class MobileResponsiveTableComponent {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() actions: TableAction[] = [];
  @Input() primaryColumn?: TableColumn; // Column to use as card title in mobile view
  @Input() breakpoint: number = 768; // Breakpoint for mobile/desktop switch
  
  @Output() actionClicked = new EventEmitter<{action: string, item: any}>();
  
  // Signals for responsive behavior
  private _screenWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  readonly isMobile = computed(() => this._screenWidth() < this.breakpoint);
  
  readonly displayedColumns = computed(() => this.columns.map(col => col.key));
  
  readonly mobileColumns = computed(() => 
    this.columns.filter(col => 
      col.key !== this.primaryColumn?.key && 
      col.type !== 'actions' && 
      (col.mobileVisible !== false)
    )
  );

  constructor() {
    // Listen for window resize
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this._screenWidth.set(window.innerWidth);
      });
    }
  }
  
  trackByColumn(index: number, column: TableColumn): string {
    return column.key;
  }
  
  trackByAction(index: number, action: TableAction): string {
    return action.action;
  }
  
  trackByItem(index: number, item: any): any {
    return item.id || item.uuid || index;
  }
  
  onActionClick(action: string, item: any): void {
    this.actionClicked.emit({ action, item });
  }
  
  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  formatNumber(value: any): string {
    if (value == null || isNaN(value)) return '-';
    return new Intl.NumberFormat().format(Number(value));
  }
  
  formatCurrency(value: any): string {
    if (value == null || isNaN(value)) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(Number(value));
  }
  
  formatDate(value: any): string {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('id-ID');
    } catch {
      return value;
    }
  }
  
  getBadgeClass(status: string): string {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active': case 'available': case 'in_stock': return 'status-active';
      case 'inactive': case 'unavailable': case 'out_of_stock': return 'status-inactive';
      case 'low_stock': case 'warning': return 'status-warning';
      case 'deleted': case 'error': return 'status-error';
      default: return 'status-default';
    }
  }
}