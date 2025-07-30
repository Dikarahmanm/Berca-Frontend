// src/app/modules/notifications/notification-item/notification-item.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Notification } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-item',
  template: `
    <div class="notification-item" 
         [class.unread]="!notification.isRead"
         [class.expired]="isExpired()"
         [class]="getPriorityClass()"
         (click)="onItemClick()">
      
      <div class="notification-icon" 
           [style.background-color]="getIconColor()">
        <span class="material-icons">{{getIcon()}}</span>
      </div>

      <div class="notification-content">
        <div class="notification-header">
          <h4 class="notification-title">{{notification.title}}</h4>
          <span class="notification-time">{{formatTime(notification.createdAt)}}</span>
        </div>
        
        <p class="notification-message">{{notification.message}}</p>
        
        <div class="notification-meta">
          <span class="notification-type">{{getTypeLabel()}}</span>
          <span class="notification-priority" [class]="'priority-' + notification.priority.toLowerCase()">
            {{notification.priority}}
          </span>
        </div>
      </div>

      <div class="notification-actions">
        <div class="unread-indicator" *ngIf="!notification.isRead"></div>
        
        <button class="delete-btn" 
                (click)="onDeleteClick($event)">
          <span class="material-icons">delete</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 120ms ease-out;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 0.5rem;

      &:hover {
        background: rgba(255, 145, 77, 0.05);
        transform: translateX(4px);
      }

      &.unread {
        background: rgba(255, 145, 77, 0.1);
        border-left: 4px solid #FF914D;
      }

      &.expired {
        opacity: 0.6;
      }

      &.priority-urgent {
        border-left: 4px solid #E15A4F;
      }

      &.priority-high {
        border-left: 4px solid #FF914D;
      }

      &.priority-medium {
        border-left: 4px solid #FFB84D;
      }

      &.priority-low {
        border-left: 4px solid #4BBF7B;
      }
    }

    .notification-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      flex-shrink: 0;

      .material-icons {
        color: white;
        font-size: 1.25rem;
      }
    }

    .notification-content {
      flex: 1;
      min-width: 0;

      .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.5rem;

        .notification-title {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: #333;
          line-height: 1.3;
        }

        .notification-time {
          font-size: 0.75rem;
          color: #666;
          white-space: nowrap;
        }
      }

      .notification-message {
        margin: 0 0 0.5rem 0;
        color: #555;
        font-size: 0.85rem;
        line-height: 1.4;
        word-break: break-word;
      }

      .notification-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;

        .notification-type {
          background: rgba(255, 145, 77, 0.1);
          color: #FF914D;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-weight: 500;
        }

        .notification-priority {
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-weight: 500;
          text-transform: uppercase;

          &.priority-urgent {
            background: rgba(225, 90, 79, 0.1);
            color: #E15A4F;
          }

          &.priority-high {
            background: rgba(255, 145, 77, 0.1);
            color: #FF914D;
          }

          &.priority-medium {
            background: rgba(255, 184, 77, 0.1);
            color: #FFB84D;
          }

          &.priority-low {
            background: rgba(75, 191, 123, 0.1);
            color: #4BBF7B;
          }
        }
      }
    }

    .notification-actions {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      flex-shrink: 0;

      .unread-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #FF914D;
        margin-top: 0.5rem;
      }

      .delete-btn {
        opacity: 0;
        transition: all 120ms ease-out;
        color: #E15A4F;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: rgba(225, 90, 79, 0.1);
        }

        .material-icons {
          font-size: 1rem;
        }
      }
    }

    &:hover .notification-actions .delete-btn {
      opacity: 1;
    }
  `]
})
export class NotificationItemComponent {
  @Input() notification!: Notification;
  @Output() itemClick = new EventEmitter<Notification>();
  @Output() deleteClick = new EventEmitter<Notification>();

  onItemClick() {
    this.itemClick.emit(this.notification);
  }

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteClick.emit(this.notification);
  }

  getIcon(): string {
    const icons: { [key: string]: string } = {
      'LOW_STOCK': 'inventory_2',
      'MONTHLY_REVENUE': 'trending_up',
      'INVENTORY_AUDIT': 'fact_check',
      'SYSTEM_MAINTENANCE': 'build',
      'SALE_COMPLETED': 'point_of_sale',
      'USER_LOGIN': 'person',
      'BACKUP_COMPLETED': 'backup',
      'CUSTOM': 'notifications'
    };
    return icons[this.notification.type] || 'notifications';
  }

  getIconColor(): string {
    const colors: { [key: string]: string } = {
      'LOW': '#4BBF7B',
      'MEDIUM': '#FFB84D',
      'HIGH': '#FF914D',
      'URGENT': '#E15A4F'
    };
    return colors[this.notification.priority] || '#FF914D';
  }

  getTypeLabel(): string {
    const labels: { [key: string]: string } = {
      'LOW_STOCK': 'Stok Menipis',
      'MONTHLY_REVENUE': 'Laporan Bulanan',
      'INVENTORY_AUDIT': 'Audit Inventori',
      'SYSTEM_MAINTENANCE': 'Pemeliharaan Sistem',
      'SALE_COMPLETED': 'Penjualan Selesai',
      'USER_LOGIN': 'Login User',
      'BACKUP_COMPLETED': 'Backup Selesai',
      'CUSTOM': 'Kustom'
    };
    return labels[this.notification.type] || this.notification.type;
  }

  getPriorityClass(): string {
    return `priority-${this.notification.priority.toLowerCase()}`;
  }

  formatTime(date: Date | string): string {
    const notificationDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return notificationDate.toLocaleDateString('id-ID');
  }

  isExpired(): boolean {
    if (!this.notification.expiresAt) return false;
    return new Date(this.notification.expiresAt) < new Date();
  }
}