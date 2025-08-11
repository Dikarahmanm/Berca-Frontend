// src/app/shared/components/context-menu/context-menu.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

export interface ContextMenuAction {
  label: string;
  icon: string;
  action: string;
  disabled?: boolean;
  color?: 'primary' | 'accent' | 'warn';
}

export interface ContextMenuData {
  type: 'product' | 'transaction' | 'category' | 'user';
  id: number | string;
  name: string;
  actions: ContextMenuAction[];
}

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule
  ],
  template: `
    <div class="context-menu">
      <!-- Header -->
      <div class="menu-header">
        <div class="menu-title">
          <mat-icon>{{ getTypeIcon() }}</mat-icon>
          <span>{{ data.name }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="menu-actions">
        <button
          class="menu-action-item"
          *ngFor="let action of data.actions"
          [disabled]="action.disabled"
          [ngClass]="getActionClass(action)"
          (click)="executeAction(action.action)">
          <mat-icon>{{ action.icon }}</mat-icon>
          <span>{{ action.label }}</span>
        </button>
      </div>

      <!-- Footer -->
      <div class="menu-footer">
        <button 
          mat-button 
          class="close-btn" 
          [mat-dialog-close]="null">
          <mat-icon>close</mat-icon>
          Tutup
        </button>
      </div>
    </div>
  `,
  styles: [`
    .context-menu {
      min-width: 200px;
      max-width: 280px;
      padding: 0;
      
      .menu-header {
        padding: var(--s4);
        background: var(--bg);
        border-bottom: 2px solid var(--border);
        
        .menu-title {
          display: flex;
          align-items: center;
          gap: var(--s2);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text);
          
          mat-icon {
            font-size: 18px;
            color: var(--primary);
          }
          
          span {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }

      .menu-actions {
        padding: var(--s2) 0;
        
        .menu-action-item {
          display: flex;
          align-items: center;
          gap: var(--s3);
          width: 100%;
          padding: var(--s3) var(--s4);
          border: none;
          background: var(--surface);
          color: var(--text);
          font-size: var(--text-sm);
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: var(--transition);
          
          &:hover:not(:disabled) {
            background: var(--primary-light);
            color: var(--primary);
          }
          
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          mat-icon {
            font-size: 18px;
            flex-shrink: 0;
          }
          
          span {
            flex: 1;
          }
          
          // Color variants
          &.primary {
            &:hover:not(:disabled) {
              background: var(--primary-light);
              color: var(--primary);
              
              mat-icon {
                color: var(--primary);
              }
            }
          }
          
          &.accent {
            &:hover:not(:disabled) {
              background: #E3F2FD;
              color: #1976D2;
              
              mat-icon {
                color: #1976D2;
              }
            }
          }
          
          &.warn {
            &:hover:not(:disabled) {
              background: #FFF3E0;
              color: var(--warning);
              
              mat-icon {
                color: var(--warning);
              }
            }
          }
          
          &.danger {
            &:hover:not(:disabled) {
              background: #FFEBEE;
              color: var(--error);
              
              mat-icon {
                color: var(--error);
              }
            }
          }
        }
      }

      .menu-footer {
        padding: var(--s2) var(--s4);
        border-top: 1px solid var(--border);
        background: var(--bg);
        
        .close-btn {
          width: 100%;
          color: var(--text-secondary);
          font-size: var(--text-xs);
          
          mat-icon {
            font-size: 16px;
          }
        }
      }
    }
  `]
})
export class ContextMenuComponent {
  constructor(
    public dialogRef: MatDialogRef<ContextMenuComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContextMenuData
  ) {}

  getTypeIcon(): string {
    const typeIcons = {
      'product': 'inventory_2',
      'transaction': 'receipt_long',
      'category': 'category',
      'user': 'person'
    };
    return typeIcons[this.data.type] || 'menu';
  }

  getActionClass(action: ContextMenuAction): string {
    const classes = ['menu-action-item'];
    
    if (action.color) {
      classes.push(action.color);
    }
    
    // Add special classes for certain actions
    if (action.action === 'delete' || action.action === 'remove') {
      classes.push('danger');
    }
    
    return classes.join(' ');
  }

  executeAction(action: string): void {
    this.dialogRef.close(action);
  }
}