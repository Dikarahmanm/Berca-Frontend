// Mock backend service untuk development sebelum API real tersedia
import { Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject, of, timer, throwError } from 'rxjs';
import { map, delay, switchMap } from 'rxjs/operators';
import { MultiBranchNotification } from './notification.service';

// Simulasi database in-memory
interface MockDatabase {
  notifications: MultiBranchNotification[];
  users: any[];
  branches: any[];
  nextId: number;
}

@Injectable({
  providedIn: 'root'
})
export class MockNotificationBackendService {
  private database: MockDatabase = {
    notifications: [],
    users: [
      { id: 1, username: 'admin', role: 'Admin', branchId: 1 },
      { id: 2, username: 'manager1', role: 'BranchManager', branchId: 1 },
      { id: 3, username: 'manager2', role: 'BranchManager', branchId: 2 }
    ],
    branches: [
      { id: 1, name: 'Jakarta Pusat', code: 'JKT-01' },
      { id: 2, name: 'Surabaya', code: 'SBY-01' },
      { id: 3, name: 'Bandung', code: 'BDG-01' },
      { id: 4, name: 'Medan', code: 'MDN-01' },
      { id: 5, name: 'Semarang', code: 'SMG-01' }
    ],
    nextId: 1
  };

  private readonly _isOnline = signal<boolean>(true);
  readonly isOnline = this._isOnline.asReadonly();

  constructor() {
    this.initializeMockData();
    this.startMockNotificationGenerator();
  }

  // ===== MOCK API ENDPOINTS =====

  /**
   * GET /api/multibranch/notifications
   */
  getNotifications(filters?: any): Observable<MultiBranchNotification[]> {
    return of(this.database.notifications).pipe(
      map(notifications => {
        let filtered = [...notifications];
        
        // Apply filters
        if (filters) {
          if (filters.branchId) {
            filtered = filtered.filter(n => n.branchId === filters.branchId);
          }
          if (filters.type) {
            filtered = filtered.filter(n => n.type === filters.type);
          }
          if (filters.severity) {
            filtered = filtered.filter(n => n.severity === filters.severity);
          }
          if (filters.isRead !== undefined) {
            filtered = filtered.filter(n => n.isRead === filters.isRead);
          }
          if (filters.dateFrom) {
            filtered = filtered.filter(n => new Date(n.createdAt) >= new Date(filters.dateFrom));
          }
          if (filters.dateTo) {
            filtered = filtered.filter(n => new Date(n.createdAt) <= new Date(filters.dateTo));
          }
        }

        // Sort by newest first
        return filtered.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }),
      delay(this.getRandomDelay()) // Simulate network delay
    );
  }

  /**
   * GET /api/multibranch/notifications/{id}
   */
  getNotificationById(id: string): Observable<MultiBranchNotification | null> {
    const notification = this.database.notifications.find(n => n.id === id);
    return of(notification || null).pipe(
      delay(this.getRandomDelay())
    );
  }

  /**
   * POST /api/multibranch/notifications
   */
  createNotification(request: any): Observable<MultiBranchNotification> {
    const newNotification: MultiBranchNotification = {
      id: `notif-${this.database.nextId++}`,
      type: request.type,
      severity: request.severity,
      priority: request.priority,
      title: request.title,
      message: request.message,
      branchId: request.branchId,
      branchName: this.getBranchName(request.branchId),
      userId: request.userId,
      userName: request.userName || 'System',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isRead: false,
      isArchived: false,
      actionRequired: request.actionRequired || false,
      actionUrl: request.actionUrl,
      expiresAt: request.expiresAt,
      metadata: request.metadata || {}
    };

    this.database.notifications.unshift(newNotification);
    
    return of(newNotification).pipe(
      delay(this.getRandomDelay())
    );
  }

  /**
   * PUT /api/multibranch/notifications/{id}
   */
  updateNotification(id: string, updates: any): Observable<boolean> {
    const index = this.database.notifications.findIndex(n => n.id === id);
    
    if (index === -1) {
      return throwError(() => new Error('Notification not found'));
    }

    this.database.notifications[index] = {
      ...this.database.notifications[index],
      ...updates
    };

    return of(true).pipe(
      delay(this.getRandomDelay())
    );
  }

  /**
   * PUT /api/multibranch/notifications/mark-read-bulk
   */
  markMultipleAsRead(ids: string[]): Observable<boolean> {
    ids.forEach(id => {
      const index = this.database.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        this.database.notifications[index].isRead = true;
      }
    });

    return of(true).pipe(
      delay(this.getRandomDelay())
    );
  }

  /**
   * PUT /api/multibranch/notifications/mark-all-read
   */
  markAllAsRead(branchId?: number): Observable<boolean> {
    let notifications = this.database.notifications;
    
    if (branchId) {
      notifications = notifications.filter(n => n.branchId === branchId);
    }

    notifications.forEach(notification => {
      notification.isRead = true;
    });

    return of(true).pipe(
      delay(this.getRandomDelay())
    );
  }

  /**
   * DELETE /api/multibranch/notifications/{id}
   */
  deleteNotification(id: string): Observable<boolean> {
    const index = this.database.notifications.findIndex(n => n.id === id);
    
    if (index === -1) {
      return throwError(() => new Error('Notification not found'));
    }

    this.database.notifications.splice(index, 1);
    return of(true).pipe(
      delay(this.getRandomDelay())
    );
  }

  /**
   * GET /api/multibranch/notifications/stats
   */
  getNotificationStats(branchId?: number, dateFrom?: string, dateTo?: string): Observable<any> {
    let notifications = this.database.notifications;

    // Apply filters
    if (branchId) {
      notifications = notifications.filter(n => n.branchId === branchId);
    }
    if (dateFrom) {
      notifications = notifications.filter(n => new Date(n.createdAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      notifications = notifications.filter(n => new Date(n.createdAt) <= new Date(dateTo));
    }

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: this.groupBy(notifications, 'type'),
      bySeverity: this.groupBy(notifications, 'severity'),
      byPriority: this.groupBy(notifications, 'priority'),
      byBranch: this.groupBy(notifications, 'branchName'),
      actionRequired: notifications.filter(n => n.actionRequired).length,
      archived: notifications.filter(n => n.isArchived).length,
      trends: this.generateTrendData(notifications)
    };

    return of(stats).pipe(
      delay(this.getRandomDelay())
    );
  }

  /**
   * GET /api/multibranch/notifications/health
   */
  getHealthStatus(): Observable<any> {
    return of({
      status: this._isOnline() ? 'healthy' : 'offline',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: {
        connected: true,
        notifications: this.database.notifications.length
      },
      signalr: {
        connected: this._isOnline(),
        connections: Math.floor(Math.random() * 50) + 10
      },
      performance: {
        averageResponseTime: Math.floor(Math.random() * 100) + 50,
        requestsPerMinute: Math.floor(Math.random() * 1000) + 500
      }
    }).pipe(
      delay(this.getRandomDelay())
    );
  }

  // ===== REAL-TIME SIMULATION =====

  /**
   * Simulate real-time notifications
   */
  subscribeToRealTimeUpdates(): Observable<MultiBranchNotification> {
    return timer(0, 30000).pipe( // Every 30 seconds
      switchMap(() => {
        if (Math.random() > 0.3) { // 70% chance
          return this.generateRandomNotification();
        }
        return of(null);
      }),
      map(notification => notification as MultiBranchNotification)
    );
  }

  // ===== UTILITY METHODS =====

  private initializeMockData(): void {
    // Create initial notifications
    const initialNotifications: MultiBranchNotification[] = [
      {
        id: 'mock-001',
        type: 'system',
        severity: 'error',
        priority: 'critical',
        title: 'Database Connection Error',
        message: 'Failed to connect to inventory database at Branch Jakarta',
        branchId: 1,
        branchName: 'Jakarta Pusat',
        userId: 1,
        userName: 'System',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isRead: false,
        isArchived: false,
        actionRequired: true,
        actionUrl: '/admin/database-health',
        metadata: { errorCode: 'DB_CONNECTION_FAILED', retryCount: 3 }
      },
      {
        id: 'mock-002',
        type: 'transfer',
        severity: 'info',
        priority: 'medium',
        title: 'Transfer Request Pending',
        message: '50 units of Aqua 600ml transfer from Jakarta to Surabaya awaiting approval',
        branchId: 1,
        branchName: 'Jakarta Pusat',
        userId: 2,
        userName: 'Manager Jakarta',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        isRead: false,
        isArchived: false,
        actionRequired: true,
        actionUrl: '/transfers/pending/TR-001',
        metadata: { transferId: 'TR-001', quantity: 50, productId: 123 }
      },
      {
        id: 'mock-003',
        type: 'coordination',
        severity: 'success',
        priority: 'low',
        title: 'Daily Sync Completed',
        message: 'All branch data successfully synchronized',
        branchId: undefined,
        branchName: 'System Wide',
        userId: 1,
        userName: 'System',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        isRead: true,
        isArchived: false,
        actionRequired: false,
        metadata: { syncDuration: 45, recordsProcessed: 12450 }
      }
    ];

    this.database.notifications = initialNotifications;
    this.database.nextId = 4;
  }

  private startMockNotificationGenerator(): void {
    // Generate random notifications every 2-5 minutes
    const generateInterval = () => Math.random() * 180000 + 120000; // 2-5 minutes

    const scheduleNext = () => {
      timer(generateInterval()).subscribe(() => {
        if (Math.random() > 0.4) { // 60% chance
          this.generateRandomNotification().subscribe(notification => {
            if (notification) {
              this.database.notifications.unshift(notification);
              console.log('🔔 Generated mock notification:', notification.title);
            }
          });
        }
        scheduleNext(); // Schedule next generation
      });
    };

    scheduleNext();
  }

  private generateRandomNotification(): Observable<MultiBranchNotification> {
    const types = ['system', 'transfer', 'alert', 'user', 'coordination'] as const;
    const severities = ['info', 'warning', 'error', 'success'] as const;
    const priorities = ['low', 'medium', 'high', 'critical'] as const;
    
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const branchId = Math.floor(Math.random() * 5) + 1;

    const templates = {
      system: [
        { title: 'System Performance Alert', message: 'High CPU usage detected on server' },
        { title: 'Backup Completed', message: 'Daily backup completed successfully' },
        { title: 'Update Required', message: 'System update available for installation' }
      ],
      transfer: [
        { title: 'Transfer Request', message: 'New inter-branch transfer request submitted' },
        { title: 'Transfer Completed', message: 'Product transfer completed successfully' },
        { title: 'Transfer Cancelled', message: 'Transfer request cancelled by manager' }
      ],
      alert: [
        { title: 'Low Stock Alert', message: 'Product inventory below minimum threshold' },
        { title: 'Price Change Alert', message: 'Supplier price update received' },
        { title: 'Security Alert', message: 'Unusual login activity detected' }
      ],
      user: [
        { title: 'New User Registration', message: 'New employee registered in the system' },
        { title: 'User Access Request', message: 'Access permission request pending approval' },
        { title: 'User Profile Updated', message: 'Employee profile information updated' }
      ],
      coordination: [
        { title: 'Branch Sync Status', message: 'Multi-branch synchronization completed' },
        { title: 'Coordination Health', message: 'All branches reporting normal status' },
        { title: 'Performance Summary', message: 'Weekly performance report available' }
      ]
    };

    const template = templates[type][Math.floor(Math.random() * templates[type].length)];

    const notification: MultiBranchNotification = {
      id: `mock-${this.database.nextId++}`,
      type,
      severity,
      priority,
      title: template.title,
      message: template.message + ` (Branch: ${this.getBranchName(branchId)})`,
      branchId,
      branchName: this.getBranchName(branchId),
      userId: Math.floor(Math.random() * 3) + 1,
      userName: `User ${Math.floor(Math.random() * 10) + 1}`,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isRead: false,
      isArchived: false,
      actionRequired: severity === 'error' || priority === 'critical' || Math.random() > 0.7,
      actionUrl: this.generateActionUrl(type),
      expiresAt: type === 'alert' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
      metadata: { generated: true, mockData: true }
    };

    return of(notification);
  }

  private getBranchName(branchId?: number): string {
    if (!branchId) return 'System Wide';
    const branch = this.database.branches.find(b => b.id === branchId);
    return branch ? branch.name : `Branch ${branchId}`;
  }

  private generateActionUrl(type: string): string {
    const urls = {
      system: '/admin/system-health',
      transfer: '/coordination/transfers',
      alert: '/admin/alerts',
      user: '/admin/users',
      coordination: '/coordination/dashboard'
    };
    return urls[type as keyof typeof urls] || '/dashboard';
  }

  private getRandomDelay(): number {
    return Math.random() * 500 + 100; // 100-600ms delay
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private generateTrendData(notifications: MultiBranchNotification[]): any[] {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayNotifications = notifications.filter(n => 
        new Date(n.createdAt).toDateString() === date.toDateString()
      );
      
      last7Days.push({
        date: date.toISOString().split('T')[0],
        count: dayNotifications.length,
        unread: dayNotifications.filter(n => !n.isRead).length
      });
    }
    return last7Days;
  }

  // ===== ADMIN METHODS =====

  /**
   * Toggle mock backend online/offline
   */
  toggleOnlineStatus(): void {
    this._isOnline.update(status => !status);
    console.log(`Mock backend is now ${this._isOnline() ? 'online' : 'offline'}`);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.database.notifications = [];
    console.log('All mock notifications cleared');
  }

  /**
   * Get current database state
   */
  getDatabaseState(): MockDatabase {
    return { ...this.database };
  }

  /**
   * Reset to initial state
   */
  resetDatabase(): void {
    this.database.notifications = [];
    this.database.nextId = 1;
    this.initializeMockData();
    console.log('Mock database reset to initial state');
  }
}