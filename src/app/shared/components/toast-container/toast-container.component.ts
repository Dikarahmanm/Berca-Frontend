// src/app/shared/components/toast-container/toast-container.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ToastService } from '../../services/toast.service';
import { ToastNotificationComponent, ToastNotification } from '../toast-notification/toast-notification.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastNotificationComponent],
  template: `
    <div class="toast-container" [style.display]="toasts.length > 0 ? 'flex' : 'none'">
      <!-- DEBUG: Show container info -->
      <div class="debug-info" *ngIf="toasts.length > 0" 
           style="position: absolute; top: -30px; left: 0; background: red; color: white; padding: 4px; font-size: 12px; z-index: 999999;">
        TOASTS: {{toasts.length}}
      </div>
      
      <!-- Stack toasts from top to bottom, newest first -->
      <app-toast-notification
        *ngFor="let toast of toasts; trackBy: trackByToastId; let i = index"
        [notification]="toast"
        [style.animation-delay.ms]="i * 100"
        [style.margin-bottom.px]="8"
        (close)="onToastClose($event)"
        (action)="onToastAction($event)">
      </app-toast-notification>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed !important;
      top: 80px !important;
      right: 20px !important;
      z-index: 999999 !important;
      pointer-events: none !important;
      max-height: calc(100vh - 100px) !important;
      overflow: visible !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      width: auto !important;
      min-width: 320px !important;
    }

    .toast-container > * {
      pointer-events: auto !important;
    }

    .debug-info {
      z-index: 999999 !important;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .toast-container {
        top: 70px !important;
        right: 10px !important;
        left: 10px !important;
        gap: 6px !important;
      }
    }

    /* Force visibility */
    :host {
      position: relative !important;
      z-index: 999999 !important;
      display: block !important;
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: ToastNotification[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🍞 Toast Container initialized');
    
    this.toastService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe((toasts: ToastNotification[]) => {
        console.log('🍞 Toast Container received toasts:', {
          count: toasts.length,
          titles: toasts.map(t => t.title)
        });
        this.toasts = toasts;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onToastClose(toastId: number): void {
    this.toastService.removeToast(toastId);
  }

  onToastAction(event: { id: number, actionUrl?: string }): void {
    if (event.actionUrl) {
      this.router.navigateByUrl(event.actionUrl);
    }
    this.toastService.removeToast(event.id);
  }

  trackByToastId(index: number, toast: ToastNotification): number {
    return toast.id;
  }

  /**
   * ✅ NEW: Get staggered animation delay for multiple toasts
   */
  getAnimationDelay(toast: ToastNotification): number {
    const index = this.toasts.findIndex(t => t.id === toast.id);
    return index * 100; // 100ms delay between each toast
  }
}
