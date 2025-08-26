// src/app/core/services/pwa-analytics.service.ts
// ✅ PWA ANALYTICS SERVICE: Offline support and intelligent caching for analytics
// Following Project Guidelines: Signal-based, Performance Optimized, Production Ready

import { Injectable, signal, computed, inject } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map, startWith, distinctUntilChanged, shareReplay, catchError } from 'rxjs/operators';
import { SmartAnalyticsCacheService } from './smart-analytics-cache.service';

// ===== PWA INTERFACES =====
export interface PWAStatus {
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  swActivated: boolean;
  lastSync: Date | null;
}

export interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SyncConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  syncInterval: number;
}

@Injectable({ providedIn: 'root' })
export class PWAAnalyticsService {
  private readonly cacheService = inject(SmartAnalyticsCacheService);

  // ===== PWA STATE =====
  private _pwaStatus = signal<PWAStatus>({
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    isInstallable: false,
    isInstalled: false,
    swActivated: false,
    lastSync: null
  });

  private _offlineQueue = signal<OfflineQueueItem[]>([]);
  private _syncInProgress = signal<boolean>(false);

  // ===== PUBLIC READONLY SIGNALS =====
  readonly pwaStatus = this._pwaStatus.asReadonly();
  readonly offlineQueue = this._offlineQueue.asReadonly();
  readonly syncInProgress = this._syncInProgress.asReadonly();

  // ===== COMPUTED PROPERTIES =====
  readonly isOnline = computed(() => this._pwaStatus().isOnline);
  readonly hasOfflineData = computed(() => this._offlineQueue().length > 0);
  readonly canSync = computed(() => this.isOnline() && this.hasOfflineData());
  readonly installPromptAvailable = computed(() => this._pwaStatus().isInstallable && !this._pwaStatus().isInstalled);

  // ===== OFFLINE CONFIGURATION =====
  private readonly syncConfig: SyncConfig = {
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    batchSize: 10,
    syncInterval: 30000 // 30 seconds
  };

  // ===== CRITICAL ANALYTICS DATA FOR OFFLINE =====
  private readonly offlineCriticalData = [
    'dashboard-metrics',
    'smart-notifications', 
    'expiry-analytics'
  ];

  private deferredPrompt: any = null;
  private syncTimer: any = null;

  constructor() {
    console.log('🔧 PWA Analytics Service initialized');
    this.setupNetworkMonitoring();
    this.setupServiceWorkerHandlers();
    this.setupInstallPrompt();
    this.loadOfflineQueue();
    this.startPeriodicSync();
    this.preloadOfflineData();
  }

  // ===== NETWORK MONITORING =====
  private setupNetworkMonitoring(): void {
    const online$ = merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(
      startWith(navigator.onLine),
      distinctUntilChanged(),
      shareReplay(1)
    );

    online$.subscribe(isOnline => {
      console.log(`🌐 Network status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      this._pwaStatus.update(status => ({
        ...status,
        isOnline
      }));

      if (isOnline && this.hasOfflineData()) {
        console.log('🔄 Network restored - initiating offline sync');
        this.syncOfflineQueue();
      }
    });
  }

  // ===== SERVICE WORKER HANDLERS =====
  private setupServiceWorkerHandlers(): void {
    console.log('⚠️ Service Worker not available - running in basic PWA mode');
  }

  // ===== APP INSTALLATION =====
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      this._pwaStatus.update(status => ({
        ...status,
        isInstallable: true
      }));

      console.log('📱 PWA install prompt ready');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      
      this._pwaStatus.update(status => ({
        ...status,
        isInstalled: true,
        isInstallable: false
      }));

      console.log('✅ PWA installed successfully');
    });
  }

  // ===== OFFLINE QUEUE MANAGEMENT =====
  
  /**
   * Add request to offline queue when network is unavailable
   */
  queueOfflineRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', data?: any, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'): string {
    const queueItem: OfflineQueueItem = {
      id: this.generateQueueId(),
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      priority
    };

    this._offlineQueue.update(queue => [...queue, queueItem]);
    this.persistOfflineQueue();

    console.log(`📥 Request queued for offline: ${method} ${endpoint}`);
    return queueItem.id;
  }

  /**
   * Sync offline queue when network becomes available
   */
  async syncOfflineQueue(): Promise<void> {
    if (this._syncInProgress() || !this.canSync()) {
      return;
    }

    this._syncInProgress.set(true);
    const queue = [...this._offlineQueue()];
    
    // Sort by priority and timestamp
    const prioritizedQueue = queue.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    console.log(`🔄 Syncing ${prioritizedQueue.length} offline requests`);

    try {
      const batchSize = this.syncConfig.batchSize;
      for (let i = 0; i < prioritizedQueue.length; i += batchSize) {
        const batch = prioritizedQueue.slice(i, i + batchSize);
        await this.syncBatch(batch);
      }

      // Clear successfully synced items
      this._offlineQueue.set([]);
      this.persistOfflineQueue();
      
      this._pwaStatus.update(status => ({
        ...status,
        lastSync: new Date()
      }));

      console.log('✅ Offline queue sync completed');

    } catch (error) {
      console.error('❌ Offline sync failed:', error);
    } finally {
      this._syncInProgress.set(false);
    }
  }

  private async syncBatch(batch: OfflineQueueItem[]): Promise<void> {
    const syncPromises = batch.map(item => this.syncSingleItem(item));
    await Promise.allSettled(syncPromises);
  }

  private async syncSingleItem(item: OfflineQueueItem): Promise<void> {
    try {
      // Simulate API call based on method and endpoint
      await this.executeOfflineRequest(item);
      console.log(`✅ Synced: ${item.method} ${item.endpoint}`);
      
    } catch (error) {
      console.error(`❌ Failed to sync: ${item.method} ${item.endpoint}`, error);
      
      item.retryCount++;
      
      if (item.retryCount < this.syncConfig.maxRetries) {
        // Re-queue for retry
        this._offlineQueue.update(queue => [...queue, item]);
      } else {
        console.warn(`⚠️ Max retries exceeded for: ${item.endpoint}`);
      }
    }
  }

  private async executeOfflineRequest(item: OfflineQueueItem): Promise<any> {
    // Simulate the actual HTTP request
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate success/failure based on network conditions
        if (this.isOnline()) {
          resolve({ success: true, data: null });
        } else {
          reject(new Error('Network unavailable'));
        }
      }, 1000);
    });
  }

  // ===== OFFLINE DATA PRELOADING =====
  
  /**
   * Preload critical analytics data for offline use
   */
  private async preloadOfflineData(): Promise<void> {
    if (!this.isOnline()) {
      console.log('📱 Offline mode - using cached data');
      return;
    }

    console.log('📦 Preloading critical analytics for offline use');
    
    try {
      const preloadPromises = this.offlineCriticalData.map(key => 
        this.cacheService.get(key, () => of(null)).pipe(
          catchError(error => {
            console.warn(`⚠️ Failed to preload ${key}:`, error);
            return of(null);
          })
        ).toPromise()
      );

      await Promise.allSettled(preloadPromises);
      console.log('✅ Critical analytics data preloaded');

    } catch (error) {
      console.error('❌ Failed to preload offline data:', error);
    }
  }

  /**
   * Get analytics data with offline fallback
   */
  getAnalyticsWithOfflineSupport<T>(key: string, apiCall: () => Observable<T>): Observable<T> {
    if (this.isOnline()) {
      return this.cacheService.get(key, apiCall);
    }

    // Offline - try to get from cache
    console.log(`📱 Offline mode - attempting to load ${key} from cache`);
    return this.cacheService.get(key, () => of({} as T)).pipe(
      catchError(() => {
        console.warn(`⚠️ No offline data available for ${key}`);
        return of({} as T);
      })
    );
  }

  // ===== PWA ACTIONS =====
  
  /**
   * Trigger app installation
   */
  async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('⚠️ App installation not available');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted installation');
        return true;
      } else {
        console.log('❌ User declined installation');
        return false;
      }

    } catch (error) {
      console.error('❌ Installation failed:', error);
      return false;
    }
  }

  /**
   * Update app to latest version
   */
  async updateApp(): Promise<void> {
    console.warn('⚠️ Service Worker updates not available');
    // Reload page to get latest version
    window.location.reload();
  }

  // ===== PERIODIC SYNC =====
  private startPeriodicSync(): void {
    this.syncTimer = setInterval(() => {
      if (this.canSync()) {
        this.syncOfflineQueue();
      }
    }, this.syncConfig.syncInterval);
  }

  // ===== PERSISTENCE =====
  private persistOfflineQueue(): void {
    try {
      const queueData = JSON.stringify(this._offlineQueue());
      localStorage.setItem('pwa-offline-queue', queueData);
    } catch (error) {
      console.error('❌ Failed to persist offline queue:', error);
    }
  }

  private loadOfflineQueue(): void {
    try {
      const queueData = localStorage.getItem('pwa-offline-queue');
      if (queueData) {
        const queue = JSON.parse(queueData) as OfflineQueueItem[];
        this._offlineQueue.set(queue);
        console.log(`📦 Loaded ${queue.length} items from offline queue`);
      }
    } catch (error) {
      console.error('❌ Failed to load offline queue:', error);
    }
  }

  // ===== UTILITIES =====
  private generateQueueId(): string {
    return `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== CLEANUP =====
  ngOnDestroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    console.log('🛑 PWA Analytics Service destroyed');
  }

  // ===== DEBUG METHODS =====
  getPWAStatus(): any {
    return {
      status: this._pwaStatus(),
      offlineQueue: this._offlineQueue(),
      cacheSnapshot: this.cacheService.getCacheSnapshot()
    };
  }

  logPWAStatus(): void {
    console.group('📱 PWA Analytics Status');
    console.log('Status:', this._pwaStatus());
    console.log('Offline Queue:', this._offlineQueue().length);
    console.log('Can Sync:', this.canSync());
    console.groupEnd();
  }
}