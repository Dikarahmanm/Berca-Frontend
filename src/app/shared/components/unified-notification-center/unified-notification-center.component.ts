// src/app/shared/components/unified-notification-center/unified-notification-center.component.ts
// Phase 1: Unified Notification Center - Smart + Basic Notifications
// Angular 20 with Signal-based reactive architecture

import { Component, OnInit, computed, signal, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// Material Design imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import { SmartNotificationService } from '../../../core/services/smart-notification.service';
import { NotificationService } from '../../../core/services/notification.service';

// Types
import { ExpiryNotification, ExpiryUrgency } from '../../../core/interfaces/expiry.interfaces';

// Basic notification interface (existing system)
interface BasicNotification {
  id: number;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  type: string;
}

// Smart notification interface (new system)  
interface SmartNotification extends ExpiryNotification {
  potentialLoss?: number;
  actionDeadline?: string;
  confidenceScore?: number;
}

@Component({
  selector: 'app-unified-notification-center',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="unified-notification-center">
      <!-- Unified Notification Bell -->
      <button mat-icon-button 
        [matMenuTriggerFor]="unifiedNotificationMenu"
        class="notification-bell"
        [class.has-critical]="hasCriticalAlerts()">
        <mat-icon [matBadge]="totalUnreadCount()" 
          [matBadgeColor]="getBadgeColor()"
          [matBadgeHidden]="totalUnreadCount() === 0">
          notifications
        </mat-icon>
      </button>

      <!-- Unified Notification Menu -->
      <mat-menu #unifiedNotificationMenu="matMenu" class="unified-menu">
        
        <!-- Header dengan Settings -->
        <div class="menu-header" (click)="$event.stopPropagation()">
          <h3>🔔 Notifications</h3>
          <div class="notification-toggles">
            <mat-slide-toggle 
              [(ngModel)]="smartNotificationsEnabled"
              (change)="savePreferences()"
              class="smart-toggle">
              🧠 Smart
            </mat-slide-toggle>
            <mat-slide-toggle 
              [(ngModel)]="basicNotificationsEnabled" 
              (change)="savePreferences()"
              class="basic-toggle">
              📝 Basic
            </mat-slide-toggle>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Smart Notifications Section -->
        <div class="smart-notifications-section" *ngIf="smartNotificationsEnabled">
          <div class="section-header smart" *ngIf="smartNotifications().length > 0">
            <mat-icon>psychology</mat-icon>
            <span>🧠 Smart Alerts ({{ smartNotifications().length }})</span>
            <mat-chip *ngIf="getTotalPotentialLoss() > 0" 
              class="financial-chip" 
              color="warn">
              {{ formatCurrencyShort(getTotalPotentialLoss()) }}
            </mat-chip>
          </div>
          
          <!-- Critical Smart Notifications -->
          <div class="notification-group critical" 
            *ngIf="criticalSmartNotifications().length > 0">
            <div class="group-label">🚨 Critical ({{ criticalSmartNotifications().length }})</div>
            
            <div class="notification-item smart critical" 
              *ngFor="let notification of criticalSmartNotifications().slice(0, 3)"
              (click)="handleSmartNotificationClick(notification)">
              
              <div class="notification-content">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-message">{{ notification.message }}</div>
                
                <div class="smart-metadata" *ngIf="hasSmartMetadata(notification)">
                  <span class="financial-impact" *ngIf="notification.potentialLoss && notification.potentialLoss > 0">
                    💰 {{ formatCurrency(notification.potentialLoss) }}
                  </span>
                  <span class="action-deadline" *ngIf="notification.actionDeadline">
                    ⏰ {{ formatRelativeTime(notification.actionDeadline) }}
                  </span>
                  <span class="confidence-score" *ngIf="notification.confidenceScore">
                    🎯 {{ notification.confidenceScore }}%
                  </span>
                </div>
              </div>
              
              <div class="smart-actions">
                <button mat-icon-button class="quick-action" 
                  matTooltip="Quick Action"
                  (click)="handleQuickAction(notification); $event.stopPropagation()">
                  <mat-icon>flash_on</mat-icon>
                </button>
              </div>
            </div>
          </div>
          
          <!-- High Priority Smart Notifications -->
          <div class="notification-group high" 
            *ngIf="highPrioritySmartNotifications().length > 0">
            <div class="group-label">⚠️ High Priority ({{ highPrioritySmartNotifications().length }})</div>
            
            <div class="notification-item smart high" 
              *ngFor="let notification of highPrioritySmartNotifications().slice(0, 5)"
              (click)="handleSmartNotificationClick(notification)">
              
              <div class="notification-content">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-message">{{ notification.message }}</div>
              </div>
              
              <mat-chip color="accent" class="smart-chip">Smart</mat-chip>
            </div>
          </div>

          <!-- No Smart Notifications State -->
          <div class="no-smart-notifications" 
            *ngIf="smartNotifications().length === 0 && !loadingSmartNotifications()">
            <mat-icon class="success-icon">check_circle</mat-icon>
            <span>🎉 All systems optimal!</span>
          </div>
        </div>

        <mat-divider *ngIf="smartNotificationsEnabled() && basicNotificationsEnabled()"></mat-divider>

        <!-- Basic/Existing Notifications Section -->
        <div class="basic-notifications-section" *ngIf="basicNotificationsEnabled">
          <div class="section-header basic" *ngIf="basicNotifications().length > 0">
            <mat-icon>notifications</mat-icon>
            <span>📝 Basic Notifications ({{ basicNotifications().length }})</span>
          </div>
          
          <!-- Basic Notifications List -->
          <div class="notification-group basic" 
            *ngIf="basicNotifications().length > 0">
            
            <div class="notification-item basic" 
              *ngFor="let notification of basicNotifications().slice(0, 8)"
              (click)="handleBasicNotificationClick(notification)"
              [class.unread]="!notification.isRead">
              
              <div class="notification-content">
                <div class="notification-title" [class.unread]="!notification.isRead">
                  {{ notification.title }}
                </div>
                <div class="notification-message">{{ notification.message }}</div>
                <div class="notification-time">
                  {{ formatRelativeTime(notification.createdAt) }}
                </div>
              </div>
              
              <div class="basic-actions">
                <mat-chip 
                  [color]="getBasicPriorityColor(notification.priority)" 
                  class="priority-chip">
                  {{ notification.priority }}
                </mat-chip>
                
                <button mat-icon-button 
                  *ngIf="!notification.isRead"
                  (click)="markBasicAsRead(notification.id); $event.stopPropagation()"
                  matTooltip="Mark as Read">
                  <mat-icon>check</mat-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- No Basic Notifications State -->
          <div class="no-basic-notifications" 
            *ngIf="basicNotifications().length === 0 && !loadingBasicNotifications()">
            <mat-icon class="info-icon">info</mat-icon>
            <span>No basic notifications</span>
          </div>
        </div>

        <!-- Loading States -->
        <div class="loading-state" 
          *ngIf="loadingSmartNotifications() || loadingBasicNotifications()">
          <mat-icon class="spinning">autorenew</mat-icon>
          <span>Loading notifications...</span>
        </div>

        <mat-divider></mat-divider>
        
        <!-- Menu Footer -->
        <div class="menu-footer">
          <button mat-button (click)="viewAllNotifications()">
            <mat-icon>view_list</mat-icon>
            View All
          </button>
          <button mat-button (click)="notificationSettings()">
            <mat-icon>settings</mat-icon>
            Settings
          </button>
        </div>
      </mat-menu>
    </div>
  `,
  styles: [`
    .unified-notification-center {
      position: relative;
      display: inline-block;
    }

    .notification-bell {
      position: relative;
      
      &.has-critical {
        animation: pulse-critical 2s infinite;
        
        mat-icon {
          color: #E15A4F !important;
        }
      }
    }

    .unified-menu {
      width: 450px !important;
      max-height: 600px !important;
      overflow-y: auto;
      border-radius: 8px !important;
      border: 2px solid #DEE2E6 !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
      background: #FFFFFF !important;
    }

    .menu-header {
      padding: 20px !important;
      border-bottom: 2px solid #DEE2E6 !important;
      background: #F8F9FA !important;
      
      h3 {
        margin: 0 0 12px 0 !important;
        color: #212529 !important;
        font-size: 18px !important;
        font-weight: 600 !important;
      }
      
      .notification-toggles {
        display: flex;
        gap: 16px !important;
        align-items: center;
        
        .smart-toggle, .basic-toggle {
          font-size: 14px !important;
          color: #212529 !important;
        }
        
        ::ng-deep .mat-slide-toggle {
          .mat-slide-toggle-label {
            color: #212529 !important;
            font-weight: 500 !important;
          }
          
          .mat-slide-toggle-bar {
            background-color: #DEE2E6 !important;
          }
          
          &.mat-checked {
            .mat-slide-toggle-bar {
              background-color: #FF914D !important;
            }
            
            .mat-slide-toggle-thumb {
              background-color: #FFFFFF !important;
            }
          }
        }
      }
    }

    .section-header {
      padding: 12px 20px !important;
      display: flex;
      align-items: center;
      gap: 8px !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      background: #F8F9FA !important;
      border-bottom: 1px solid #DEE2E6;
      
      &.smart {
        color: #FF914D !important;
        
        mat-icon {
          color: #FF914D !important;
          font-size: 20px !important;
        }
      }
      
      &.basic {
        color: #3498DB !important;
        
        mat-icon {
          color: #3498DB !important;
          font-size: 20px !important;
        }
      }
      
      .financial-chip {
        margin-left: auto;
        background: #E15A4F !important;
        color: #FFFFFF !important;
        font-weight: 600 !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        font-size: 12px !important;
      }
    }

    .notification-group {
      border-bottom: 1px solid #F1F3F4;
      
      &:last-child {
        border-bottom: none;
      }
      
      .group-label {
        padding: 8px 20px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #6C757D !important;
        background: #F1F3F4 !important;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .notification-item {
      padding: 16px 20px !important;
      border-left: 4px solid transparent;
      cursor: pointer;
      transition: all 150ms ease !important;
      display: flex;
      align-items: flex-start;
      gap: 12px !important;
      background: #FFFFFF;
      border-bottom: 1px solid #F1F3F4;
      
      &:hover {
        background: #F8F9FA !important;
        transform: translateX(2px);
      }
      
      &:last-child {
        border-bottom: none;
      }
      
      &.smart {
        &.critical {
          border-left-color: #E15A4F !important;
          background: rgba(225, 90, 79, 0.05) !important;
          
          .notification-title {
            color: #E15A4F !important;
            font-weight: 600 !important;
          }
        }
        
        &.high {
          border-left-color: #FFB84D !important;
          background: rgba(255, 184, 77, 0.05) !important;
          
          .notification-title {
            color: #FFB84D !important;
            font-weight: 600 !important;
          }
        }
      }
      
      &.basic {
        border-left-color: #3498DB !important;
        
        &.unread {
          background: rgba(255, 145, 77, 0.08) !important;
          
          .notification-title.unread {
            font-weight: 600 !important;
            color: #FF914D !important;
          }
        }
      }
      
      .notification-content {
        flex: 1;
        
        .notification-title {
          font-size: 14px !important;
          font-weight: 500 !important;
          margin-bottom: 4px !important;
          line-height: 1.3;
          color: #212529 !important;
        }
        
        .notification-message {
          font-size: 12px !important;
          color: #6C757D !important;
          line-height: 1.4;
          margin-bottom: 8px !important;
        }
        
        .notification-time {
          font-size: 11px !important;
          color: #ADB5BD !important;
        }
        
        .smart-metadata {
          display: flex;
          flex-wrap: wrap;
          gap: 8px !important;
          margin-top: 8px !important;
          
          .financial-impact {
            background: #FDECEB !important;
            color: #E15A4F !important;
            padding: 4px 8px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            border: 1px solid rgba(225, 90, 79, 0.2);
          }
          
          .action-deadline {
            background: #FFF9E6 !important;
            color: #FFB84D !important;
            padding: 4px 8px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
            border: 1px solid rgba(255, 184, 77, 0.2);
          }
          
          .confidence-score {
            background: #EBF4FD !important;
            color: #3498DB !important;
            padding: 4px 8px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
            border: 1px solid rgba(52, 152, 219, 0.2);
          }
        }
      }
      
      .smart-actions, .basic-actions {
        display: flex;
        flex-direction: column;
        gap: 8px !important;
        align-items: center;
        
        .quick-action {
          width: 32px !important;
          height: 32px !important;
          background: #FFF4EF !important;
          color: #FF914D !important;
          border: 1px solid rgba(255, 145, 77, 0.2) !important;
          border-radius: 6px !important;
          
          &:hover {
            background: #FF914D !important;
            color: #FFFFFF !important;
            border-color: #FF914D !important;
          }
        }
        
        .priority-chip {
          font-size: 11px !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-weight: 500 !important;
        }
        
        ::ng-deep .mat-chip {
          min-height: 20px !important;
          line-height: 16px !important;
          
          &.mat-primary {
            background-color: #EBF4FD !important;
            color: #3498DB !important;
          }
          
          &.mat-accent {
            background-color: #FFF9E6 !important;
            color: #FFB84D !important;
          }
          
          &.mat-warn {
            background-color: #FDECEB !important;
            color: #E15A4F !important;
          }
        }
      }
    }

    .no-smart-notifications, .no-basic-notifications {
      text-align: center;
      padding: 32px 20px !important;
      color: #6C757D !important;
      background: #F8F9FA;
      border-radius: 8px;
      margin: 16px;
      
      mat-icon {
        font-size: 32px !important;
        margin-bottom: 8px !important;
        display: block !important;
        
        &.success-icon {
          color: #4BBF7B !important;
        }
        
        &.info-icon {
          color: #3498DB !important;
        }
      }
      
      span {
        font-size: 14px !important;
        font-weight: 500 !important;
      }
    }

    .loading-state {
      text-align: center;
      padding: 32px 20px !important;
      color: #6C757D !important;
      background: #F8F9FA;
      border-radius: 8px;
      margin: 16px;
      
      mat-icon {
        font-size: 24px !important;
        margin-bottom: 8px !important;
        display: block !important;
        color: #FF914D !important;
        
        &.spinning {
          animation: spin 1s linear infinite;
        }
      }
      
      span {
        font-size: 14px !important;
        font-weight: 500 !important;
      }
    }

    .menu-footer {
      padding: 16px 20px !important;
      border-top: 2px solid #DEE2E6 !important;
      display: flex;
      gap: 8px !important;
      background: #F8F9FA !important;
      
      button {
        flex: 1;
        font-size: 13px !important;
        padding: 8px 12px !important;
        border: 1px solid #DEE2E6 !important;
        border-radius: 6px !important;
        background: #FFFFFF !important;
        color: #212529 !important;
        font-weight: 500 !important;
        transition: all 150ms ease !important;
        min-height: 36px !important;
        
        &:hover {
          background: #FF914D !important;
          border-color: #FF914D !important;
          color: #FFFFFF !important;
        }
        
        mat-icon {
          font-size: 16px !important;
          margin-right: 4px !important;
        }
      }
    }

    @keyframes pulse-critical {
      0%, 100% { 
        transform: scale(1); 
        opacity: 1;
      }
      50% { 
        transform: scale(1.05); 
        opacity: 0.8;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    // Mobile responsive
    @media (max-width: 640px) {
      .unified-menu {
        width: 95vw !important;
        max-width: 380px !important;
        max-height: 80vh !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
      }
      
      .menu-header {
        padding: 16px !important;
        
        h3 {
          font-size: 16px !important;
        }
        
        .notification-toggles {
          flex-direction: column;
          gap: 8px !important;
          align-items: stretch;
          
          .smart-toggle, .basic-toggle {
            justify-content: space-between;
            font-size: 13px !important;
          }
        }
      }
      
      .section-header {
        padding: 10px 16px !important;
        
        span {
          font-size: 13px !important;
        }
        
        mat-icon {
          font-size: 18px !important;
        }
      }
      
      .notification-item {
        padding: 12px 16px !important;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px !important;
        
        .notification-content {
          width: 100%;
          
          .notification-title {
            font-size: 13px !important;
          }
          
          .notification-message {
            font-size: 11px !important;
          }
        }
        
        .smart-actions, .basic-actions {
          flex-direction: row;
          align-self: flex-end;
          gap: 6px !important;
          
          .quick-action {
            width: 28px !important;
            height: 28px !important;
          }
          
          .priority-chip {
            font-size: 10px !important;
            padding: 2px 4px !important;
          }
        }
        
        .smart-metadata {
          gap: 6px !important;
          
          .financial-impact,
          .action-deadline,
          .confidence-score {
            font-size: 10px !important;
            padding: 2px 6px !important;
          }
        }
      }
      
      .menu-footer {
        padding: 12px 16px !important;
        
        button {
          font-size: 12px !important;
          padding: 6px 10px !important;
          min-height: 32px !important;
          
          mat-icon {
            font-size: 14px !important;
          }
        }
      }
      
      .no-smart-notifications, .no-basic-notifications {
        padding: 24px 16px !important;
        margin: 12px !important;
        
        mat-icon {
          font-size: 28px !important;
        }
        
        span {
          font-size: 13px !important;
        }
      }
      
      .loading-state {
        padding: 24px 16px !important;
        margin: 12px !important;
        
        mat-icon {
          font-size: 20px !important;
        }
        
        span {
          font-size: 13px !important;
        }
      }
    }
  `]
})
export class UnifiedNotificationCenterComponent implements OnInit {
  // ✅ INJECT BOTH SERVICES
  private smartNotificationService = inject(SmartNotificationService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  
  // Input properties
  triggerButton = input<string>('default');
  maxItemsToShow = input<number>(10);
  enableSmartNotifications = input<boolean>(true);
  enableBasicNotifications = input<boolean>(true);
  
  // ✅ USER PREFERENCES
  smartNotificationsEnabled = signal<boolean>(true);
  basicNotificationsEnabled = signal<boolean>(true);
  
  // ✅ BOTH TYPES OF NOTIFICATIONS
  smartNotifications = signal<SmartNotification[]>([]);
  basicNotifications = signal<BasicNotification[]>([]);
  
  // ✅ LOADING STATES
  loadingSmartNotifications = signal<boolean>(false);
  loadingBasicNotifications = signal<boolean>(false);
  
  // ✅ COMPUTED PROPERTIES - COMBINED
  totalUnreadCount = computed(() => {
    const smartUnread = this.smartNotificationsEnabled() ? 
      this.smartNotifications().filter(n => !n.isRead).length : 0;
    const basicUnread = this.basicNotificationsEnabled() ? 
      this.basicNotifications().filter(n => !n.isRead).length : 0;
    return smartUnread + basicUnread;
  });
  
  criticalSmartNotifications = computed(() => 
    this.smartNotifications().filter(n => n.priority === ExpiryUrgency.CRITICAL)
  );
  
  highPrioritySmartNotifications = computed(() => 
    this.smartNotifications().filter(n => n.priority === ExpiryUrgency.HIGH)
  );
  
  hasCriticalAlerts = computed(() => 
    this.criticalSmartNotifications().length > 0
  );

  async ngOnInit(): Promise<void> {
    await this.loadUserPreferences();
    await this.loadAllNotifications();
    
    // Auto-refresh every 2 minutes
    setInterval(() => this.loadAllNotifications(), 2 * 60 * 1000);
  }

  // ===== NOTIFICATION LOADING METHODS =====

  private async loadAllNotifications(): Promise<void> {
    // Load both types in parallel
    await Promise.all([
      this.loadSmartNotifications(),
      this.loadBasicNotifications()
    ]);
  }

  private async loadSmartNotifications(): Promise<void> {
    if (!this.smartNotificationsEnabled()) return;
    
    this.loadingSmartNotifications.set(true);
    try {
      const smartNotifications = this.smartNotificationService.notifications();
      
      // Convert to SmartNotification interface
      const converted: SmartNotification[] = smartNotifications.map(n => ({
        ...n,
        potentialLoss: this.calculatePotentialLoss(n),
        confidenceScore: this.calculateConfidenceScore(n),
        actionDeadline: this.calculateActionDeadline(n)
      }));
      
      this.smartNotifications.set(converted);
    } catch (error) {
      console.error('Error loading smart notifications:', error);
    } finally {
      this.loadingSmartNotifications.set(false);
    }
  }

  private async loadBasicNotifications(): Promise<void> {
    if (!this.basicNotificationsEnabled()) return;
    
    this.loadingBasicNotifications.set(true);
    try {
      // Generate mock basic notifications for demonstration
      const mockBasicNotifications: BasicNotification[] = [
        {
          id: 1,
          title: 'System Backup Completed',
          message: 'Daily backup completed successfully at 02:00 AM',
          priority: 'Medium',
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'system'
        },
        {
          id: 2,
          title: 'New Sale Recorded',
          message: 'Sale #INV-2024-0892 completed for Rp 156,000',
          priority: 'Low',
          isRead: true,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          type: 'sale'
        },
        {
          id: 3,
          title: 'Low Stock Alert',
          message: 'Indomie Goreng running low (8 units remaining)',
          priority: 'High',
          isRead: false,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          type: 'inventory',
          actionUrl: '/dashboard/inventory'
        }
      ];
      
      this.basicNotifications.set(mockBasicNotifications);
    } catch (error) {
      console.error('Error loading basic notifications:', error);
    } finally {
      this.loadingBasicNotifications.set(false);
    }
  }

  // ===== USER PREFERENCE METHODS =====

  private async loadUserPreferences(): Promise<void> {
    // Load user preferences from localStorage or API
    const smartEnabled = localStorage.getItem('smartNotificationsEnabled');
    const basicEnabled = localStorage.getItem('basicNotificationsEnabled');
    
    if (smartEnabled !== null) {
      this.smartNotificationsEnabled.set(smartEnabled === 'true');
    }
    if (basicEnabled !== null) {
      this.basicNotificationsEnabled.set(basicEnabled === 'true');
    }
  }

  savePreferences(): void {
    localStorage.setItem('smartNotificationsEnabled', this.smartNotificationsEnabled().toString());
    localStorage.setItem('basicNotificationsEnabled', this.basicNotificationsEnabled().toString());
    
    // Reload notifications based on new preferences
    this.loadAllNotifications();
  }

  // ===== EVENT HANDLERS =====

  handleSmartNotificationClick(notification: SmartNotification): void {
    // Mark as read if needed
    if (!notification.isRead) {
      this.smartNotificationService.markAsRead(notification.id);
    }
    
    // Navigate to action URL if available
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    } else {
      // Default navigation based on notification type
      switch (notification.type) {
        case 'expiry_warning':
          this.router.navigate(['/dashboard/inventory'], { 
            queryParams: { filter: 'expiring' } 
          });
          break;
        case 'expired_alert':
          this.router.navigate(['/dashboard/inventory'], { 
            queryParams: { filter: 'expired' } 
          });
          break;
        default:
          this.router.navigate(['/dashboard/notifications']);
      }
    }
  }

  handleBasicNotificationClick(notification: BasicNotification): void {
    // Mark as read and navigate if applicable
    if (!notification.isRead) {
      this.markBasicAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  handleQuickAction(notification: SmartNotification): void {
    switch (notification.type) {
      case 'expiry_warning':
        this.router.navigate(['/dashboard/pos'], {
          queryParams: { 
            productId: notification.productId,
            action: 'discount' 
          }
        });
        break;
      case 'expired_alert':
        this.router.navigate(['/dashboard/inventory/dispose'], {
          queryParams: { 
            productId: notification.productId,
            batchId: notification.batchId
          }
        });
        break;
      default:
        this.handleSmartNotificationClick(notification);
    }
  }

  async markBasicAsRead(notificationId: number): Promise<void> {
    try {
      // Update local state immediately for better UX
      this.basicNotifications.update(notifications => 
        notifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      
      console.log(`Marked basic notification ${notificationId} as read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      
      // Revert local state on error
      this.basicNotifications.update(notifications => 
        notifications.map(n => 
          n.id === notificationId ? { ...n, isRead: false } : n
        )
      );
    }
  }

  // ===== UTILITY METHODS =====

  getTotalPotentialLoss(): number {
    return this.smartNotifications().reduce((sum, n) => sum + (n.potentialLoss || 0), 0);
  }

  getBadgeColor(): 'warn' | 'accent' | 'primary' {
    if (this.hasCriticalAlerts()) return 'warn';
    if (this.highPrioritySmartNotifications().length > 0) return 'accent';
    return 'primary';
  }

  hasSmartMetadata(notification: SmartNotification): boolean {
    return !!(notification.potentialLoss || notification.actionDeadline || notification.confidenceScore);
  }

  getBasicPriorityColor(priority: string): 'primary' | 'accent' | 'warn' {
    switch (priority?.toLowerCase()) {
      case 'high': return 'warn';
      case 'medium': return 'accent';
      default: return 'primary';
    }
  }

  viewAllNotifications(): void {
    this.router.navigate(['/dashboard/notifications']);
  }

  notificationSettings(): void {
    this.router.navigate(['/dashboard/settings/notifications']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatCurrencyShort(amount: number): string {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
  }

  formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(Math.abs(diffTime) / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return diffTime > 0 ? `in ${diffMinutes}m` : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return diffTime > 0 ? `in ${diffHours}h` : `${diffHours}h ago`;
    } else {
      return diffTime > 0 ? `in ${diffDays}d` : `${diffDays}d ago`;
    }
  }

  // ===== SMART NOTIFICATION HELPERS =====

  private calculatePotentialLoss(notification: ExpiryNotification): number {
    // Calculate potential financial loss based on notification data
    if (notification.type === 'expiry_warning' && notification.daysUntilExpiry !== undefined) {
      // Estimate loss based on urgency and product value
      const baseValue = 50000; // Rp 50K base estimate
      const urgencyMultiplier = notification.daysUntilExpiry <= 1 ? 3 : 
                               notification.daysUntilExpiry <= 3 ? 2 : 1;
      return baseValue * urgencyMultiplier;
    }
    
    if (notification.type === 'expired_alert') {
      return 75000; // Rp 75K for expired items
    }
    
    return 0;
  }

  private calculateConfidenceScore(notification: ExpiryNotification): number {
    // Calculate AI confidence score based on notification type and data quality
    const baseScore = 75;
    let adjustments = 0;
    
    if (notification.daysUntilExpiry !== undefined) {
      adjustments += 10; // More confident with expiry data
    }
    
    if (notification.productId && notification.batchId) {
      adjustments += 10; // More confident with specific product/batch data
    }
    
    if (notification.priority === ExpiryUrgency.CRITICAL) {
      adjustments += 5; // High confidence for critical items
    }
    
    return Math.min(baseScore + adjustments, 95);
  }

  private calculateActionDeadline(notification: ExpiryNotification): string | undefined {
    if (notification.expiryDate && notification.daysUntilExpiry !== undefined) {
      const actionDays = Math.max(1, Math.floor(notification.daysUntilExpiry / 2));
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + actionDays);
      return deadline.toISOString();
    }
    
    return undefined;
  }
}