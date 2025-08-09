// src/app/core/services/state.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService, CurrentUser } from './auth.service';
import { NotificationService } from './notification.service';
import { LayoutService } from '../../shared/services/layout.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class StateService {
  // ===== Signals (state global) =====
  private _user = signal<CurrentUser | null>(null);
  private _loading = signal<boolean>(false);
  private _sidebarCollapsed = signal<boolean>(false);
  private _isMobile = signal<boolean>(false);
  private _unreadNotificationCount = signal<number>(0);

  // ===== Public readonly =====
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();
  readonly isMobile = this._isMobile.asReadonly();
  readonly unreadNotificationCount = this._unreadNotificationCount.asReadonly();

  // ===== Computed =====
  readonly isAuthenticated = computed(() => !!this._user());
  readonly userPermissions = computed<string[]>(() => {
    const role = this._user()?.role;
    return role ? [role] : [];
  });
  readonly criticalNotificationCount = computed(() => this._unreadNotificationCount() >= 10);
  readonly isSidebarOpen = computed(() => !this._sidebarCollapsed());

  private auth = inject(AuthService);
  private layout = inject(LayoutService);
  private notif = inject(NotificationService);

  constructor() {
    // Seed awal (kalau AuthService sudah punya user dari cookie/localStorage)
    try {
      const seed = this.auth.getCurrentUser?.();
      if (seed) this._user.set(seed);
    } catch {}

    // Mirror AuthService → signals
    this.auth.currentUser$
      .pipe(takeUntilDestroyed())
      .subscribe((u) => this._user.set(u));

    this.auth.isLoggedIn$
      .pipe(takeUntilDestroyed())
      .subscribe((logged) => {
        if (!logged) this._user.set(null);
      });

    // Mirror LayoutService → signals
    this.layout.sidebarCollapsed$
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this._sidebarCollapsed.set(v));

    this.layout.isMobile$
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this._isMobile.set(v));

    // Mirror NotificationService → unread count; update badge di sidebar
    this.notif.unreadCount$
      .pipe(takeUntilDestroyed())
      .subscribe((count) => {
        this._unreadNotificationCount.set(count);
        this.layout.updateNotificationBadge(count);
      });
  }

  // ===== Actions =====
  setLoading(v: boolean) { this._loading.set(v); }

  toggleSidebar() {
    const next = !this._sidebarCollapsed();
    this._sidebarCollapsed.set(next);
    this.layout.setSidebarCollapsed(next);
  }

  setUser(u: CurrentUser | null) {
    this._user.set(u);
  }

  hasPermission(required: string): boolean {
    const role = this._user()?.role;
    return !required || (!!role && role === required);
  }

  markNotificationsAsRead() {
    this.notif.markAllAsRead().subscribe();
  }

  logoutToLogin() {
    this.auth.logout().subscribe();
  }
}
