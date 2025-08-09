// src/app/shared/components/toast-notification/toast-notification.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, state, style, transition, animate } from '@angular/animations';

export interface ToastNotification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  actionText?: string;
  actionUrl?: string;
  autoClose?: boolean;
  duration?: number;
}

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="toast-notification" 
         [class]="'toast-' + notification.type"
         [@slideIn]="animationState"
         (@slideIn.done)="onAnimationDone($event)">
      
      <!-- Icon based on type -->
      <div class="toast-icon">
        <mat-icon>{{ getIcon() }}</mat-icon>
      </div>
      
      <!-- Content -->
      <div class="toast-content">
        <div class="toast-title">{{ notification.title }}</div>
        <div class="toast-message">{{ notification.message }}</div>
        
        <!-- Action button if provided -->
        <div class="toast-actions" *ngIf="notification.actionText">
          <button mat-button class="toast-action-btn" (click)="onAction()">
            {{ notification.actionText }}
          </button>
        </div>
      </div>
      
      <!-- Close button -->
      <button mat-icon-button class="toast-close" (click)="onClose()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block !important;
      position: relative !important;
      z-index: 999999 !important;
    }

    .toast-notification {
      display: flex !important;
      align-items: flex-start !important;
      padding: 16px !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25) !important;
      backdrop-filter: blur(15px) !important;
      border: 2px solid rgba(255, 255, 255, 0.3) !important;
      min-width: 320px !important;
      max-width: 400px !important;
      position: relative !important;
      overflow: hidden !important;
      z-index: 999999 !important;
      margin-bottom: 8px !important;
    }

    .toast-success {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95)) !important;
      color: white !important;
      border-color: rgba(76, 175, 80, 0.5) !important;
    }

    .toast-info {
      background: linear-gradient(135deg, rgba(33, 150, 243, 0.95), rgba(21, 101, 192, 0.95)) !important;
      color: white !important;
      border-color: rgba(33, 150, 243, 0.5) !important;
    }

    .toast-warning {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.95), rgba(245, 124, 0, 0.95)) !important;
      color: white !important;
      border-color: rgba(255, 152, 0, 0.5) !important;
    }

    .toast-error {
      background: linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(211, 47, 47, 0.95)) !important;
      color: white !important;
      border-color: rgba(244, 67, 54, 0.5) !important;
    }

    .toast-icon {
      margin-right: 12px !important;
      display: flex !important;
      align-items: center !important;
    }

    .toast-icon mat-icon {
      font-size: 24px !important;
      width: 24px !important;
      height: 24px !important;
    }

    .toast-content {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
    }

    .toast-title {
      font-weight: 600 !important;
      font-size: 14px !important;
      margin-bottom: 4px !important;
      line-height: 1.2 !important;
    }

    .toast-message {
      font-size: 13px !important;
      opacity: 0.9 !important;
      line-height: 1.3 !important;
      margin-bottom: 8px !important;
    }

    .toast-actions {
      margin-top: 8px !important;
    }

    .toast-action-btn {
      color: rgba(255, 255, 255, 0.9) !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      font-size: 12px !important;
      padding: 4px 12px !important;
      min-width: auto !important;
      height: 28px !important;
      line-height: 1 !important;
    }

    .toast-action-btn:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.5) !important;
    }

    .toast-close {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      width: 24px !important;
      height: 24px !important;
      line-height: 1 !important;
      color: rgba(255, 255, 255, 0.7) !important;
    }

    .toast-close mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    .toast-close:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      color: white !important;
    }

    /* Progress bar for auto-close */
    .toast-notification::after {
      content: '' !important;
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      height: 3px !important;
      background: rgba(255, 255, 255, 0.3) !important;
      animation: progress linear !important;
    }

    @keyframes progress {
      from { width: 100%; }
      to { width: 0%; }
    }
  `],
  animations: [
    trigger('slideIn', [
      state('in', style({ transform: 'translateX(0)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)')
      ]),
      transition('* => void', [
        animate('200ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastNotificationComponent implements OnInit, OnDestroy {
  @Input() notification!: ToastNotification;
  @Output() close = new EventEmitter<number>();
  @Output() action = new EventEmitter<{ id: number, actionUrl?: string }>();

  animationState = 'in';
  private autoCloseTimer?: any;

  ngOnInit(): void {
    // Auto close if enabled
    if (this.notification.autoClose !== false) {
      const duration = this.notification.duration || 5000;
      this.autoCloseTimer = setTimeout(() => {
        this.onClose();
      }, duration);

      // Add progress animation
      const element = document.querySelector('.toast-notification:last-child::after') as HTMLElement;
      if (element) {
        element.style.animationDuration = `${duration}ms`;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  }

  getIcon(): string {
    switch (this.notification.type) {
      case 'success': return 'check_circle';
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'notifications';
    }
  }

  onClose(): void {
    this.animationState = 'out';
    setTimeout(() => {
      this.close.emit(this.notification.id);
    }, 200);
  }

  onAction(): void {
    this.action.emit({
      id: this.notification.id,
      actionUrl: this.notification.actionUrl
    });
    this.onClose();
  }

  onAnimationDone(event: any): void {
    if (event.toState === 'void') {
      this.close.emit(this.notification.id);
    }
  }
}
