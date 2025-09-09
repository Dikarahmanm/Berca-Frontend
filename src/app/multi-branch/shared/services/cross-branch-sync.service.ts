// Real-time cross-branch synchronization service for multi-branch operations
import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, Subject, merge, timer, interval } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { map, filter, tap, retry, catchError, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../../environment/environment';

export interface BranchStatus {
  branchId: number;
  branchName: string;
  status: 'online' | 'offline' | 'sync' | 'error';
  lastSeen: string;
  version: string;
  pendingSyncItems: number;
  systemLoad: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  networkLatency: number; // milliseconds
}

export interface SyncEvent {
  id: string;
  type: 'notification' | 'data' | 'status' | 'config' | 'alert';
  source: number; // source branch ID
  target?: number; // target branch ID (undefined for broadcast)
  timestamp: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresAcknowledgment: boolean;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed' | 'expired';
}

export interface SyncConflict {
  id: string;
  type: 'data' | 'notification' | 'config';
  branchIds: number[];
  conflictData: ConflictData[];
  resolutionStrategy: ConflictResolutionStrategy;
  status: 'pending' | 'resolved' | 'escalated';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ConflictData {
  branchId: number;
  data: any;
  timestamp: string;
  version: string;
}

export type ConflictResolutionStrategy = 
  | 'latest-wins' 
  | 'manual' 
  | 'merge' 
  | 'branch-priority' 
  | 'rollback';

export interface SyncStatistics {
  totalEvents: number;
  successfulSyncs: number;
  failedSyncs: number;
  pendingEvents: number;
  averageLatency: number;
  syncRate: number;
  conflictsResolved: number;
  activeBranches: number;
}

export interface BranchConnection {
  branchId: number;
  socket?: WebSocketSubject<any>;
  isConnected: boolean;
  lastPing: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

@Injectable({
  providedIn: 'root'
})
export class CrossBranchSyncService {
  // State management
  private readonly _branchStatuses = signal<BranchStatus[]>([]);
  private readonly _syncEvents = signal<SyncEvent[]>([]);
  private readonly _syncConflicts = signal<SyncConflict[]>([]);
  private readonly _isConnected = signal<boolean>(false);
  private readonly _currentBranchId = signal<number>(1); // Would come from auth/config

  // WebSocket connections
  private connections = new Map<number, BranchConnection>();
  private masterConnection?: WebSocketSubject<any>;
  private heartbeatSubject = new Subject<void>();

  // Public readonly signals
  readonly branchStatuses = this._branchStatuses.asReadonly();
  readonly syncEvents = this._syncEvents.asReadonly();
  readonly syncConflicts = this._syncConflicts.asReadonly();
  readonly isConnected = this._isConnected.asReadonly();
  readonly currentBranchId = this._currentBranchId.asReadonly();

  // Computed properties
  readonly onlineBranches = computed(() => 
    this._branchStatuses().filter(b => b.status === 'online')
  );

  readonly offlineBranches = computed(() => 
    this._branchStatuses().filter(b => b.status === 'offline')
  );

  readonly pendingEvents = computed(() => 
    this._syncEvents().filter(e => e.status === 'pending')
  );

  readonly failedEvents = computed(() => 
    this._syncEvents().filter(e => e.status === 'failed')
  );

  readonly unresolvedConflicts = computed(() => 
    this._syncConflicts().filter(c => c.status === 'pending')
  );

  readonly syncStatistics = computed((): SyncStatistics => {
    const events = this._syncEvents();
    const branches = this._branchStatuses();
    const conflicts = this._syncConflicts();

    return {
      totalEvents: events.length,
      successfulSyncs: events.filter(e => e.status === 'acknowledged').length,
      failedSyncs: events.filter(e => e.status === 'failed').length,
      pendingEvents: events.filter(e => e.status === 'pending').length,
      averageLatency: this.calculateAverageLatency(),
      syncRate: this.calculateSyncRate(),
      conflictsResolved: conflicts.filter(c => c.status === 'resolved').length,
      activeBranches: branches.filter(b => b.status === 'online').length
    };
  });

  constructor() {
    this.initializeBranchStatuses();
    this.establishConnections();
    this.startHeartbeat();
    this.startConflictResolution();
    this.startEventCleanup();
  }

  private initializeBranchStatuses() {
    const initialStatuses: BranchStatus[] = [
      {
        branchId: 1,
        branchName: 'Branch Jakarta',
        status: 'online',
        lastSeen: new Date().toISOString(),
        version: '1.0.0',
        pendingSyncItems: 0,
        systemLoad: 45,
        connectionQuality: 'excellent',
        networkLatency: 12
      },
      {
        branchId: 2,
        branchName: 'Branch Surabaya',
        status: 'online',
        lastSeen: new Date().toISOString(),
        version: '1.0.0',
        pendingSyncItems: 2,
        systemLoad: 67,
        connectionQuality: 'good',
        networkLatency: 28
      },
      {
        branchId: 3,
        branchName: 'Branch Bandung',
        status: 'sync',
        lastSeen: new Date(Date.now() - 30000).toISOString(),
        version: '1.0.0',
        pendingSyncItems: 5,
        systemLoad: 89,
        connectionQuality: 'fair',
        networkLatency: 45
      },
      {
        branchId: 4,
        branchName: 'Branch Medan',
        status: 'offline',
        lastSeen: new Date(Date.now() - 300000).toISOString(),
        version: '0.9.8',
        pendingSyncItems: 12,
        systemLoad: 0,
        connectionQuality: 'poor',
        networkLatency: 999
      },
      {
        branchId: 5,
        branchName: 'Branch Semarang',
        status: 'error',
        lastSeen: new Date(Date.now() - 180000).toISOString(),
        version: '1.0.0',
        pendingSyncItems: 8,
        systemLoad: 34,
        connectionQuality: 'good',
        networkLatency: 67
      }
    ];

    this._branchStatuses.set(initialStatuses);
  }

  private establishConnections() {
    // In a real implementation, this would establish WebSocket connections to each branch
    const wsUrl = `${environment.wsUrl || 'ws://localhost:8080'}/sync`;
    
    try {
      this.masterConnection = webSocket({
        url: wsUrl,
        openObserver: {
          next: () => {
            console.log('🔗 Cross-branch sync connected');
            this._isConnected.set(true);
            this.sendEvent('status', { type: 'connection', status: 'connected' }, 'low');
          }
        },
        closeObserver: {
          next: () => {
            console.log('🔌 Cross-branch sync disconnected');
            this._isConnected.set(false);
            this.attemptReconnection();
          }
        }
      });

      // Subscribe to incoming messages
      this.masterConnection.subscribe({
        next: (message) => this.handleIncomingMessage(message),
        error: (error) => {
          console.error('❌ WebSocket error:', error);
          this.attemptReconnection();
        }
      });

    } catch (error) {
      console.error('❌ Failed to establish WebSocket connection:', error);
      this.startMockConnection();
    }
  }

  private startMockConnection() {
    // Mock connection for development
    this._isConnected.set(true);
    
    // Simulate receiving sync events
    interval(5000).subscribe(() => {
      if (Math.random() > 0.7) {
        this.simulateIncomingSyncEvent();
      }
    });

    // Simulate branch status updates
    interval(10000).subscribe(() => {
      this.simulateBranchStatusUpdates();
    });
  }

  private handleIncomingMessage(message: any) {
    switch (message.type) {
      case 'sync_event':
        this.receiveSyncEvent(message.data);
        break;
      case 'branch_status':
        this.updateBranchStatus(message.branchId, message.data);
        break;
      case 'conflict':
        this.handleSyncConflict(message.data);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message.branchId);
        break;
      default:
        console.log('📨 Unknown message type:', message.type);
    }
  }

  // Handle sync conflict resolution
  private handleSyncConflict(conflictData: any) {
    console.warn('🔄 Sync conflict detected:', conflictData);
    const conflict: SyncConflict = {
      id: this.generateEventId(),
      type: 'data',
      branchIds: conflictData.branches || [],
      conflictData: [{
        branchId: conflictData.sourceBranch || 0,
        data: conflictData.source,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }, {
        branchId: conflictData.targetBranch || 0,
        data: conflictData.target,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }],
      resolutionStrategy: 'latest-wins',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Add to conflict queue
    const currentConflicts = this._syncConflicts();
    this._syncConflicts.set([...currentConflicts, conflict]);
  }

  // Sync event management
  sendEvent(
    type: SyncEvent['type'], 
    data: any, 
    priority: SyncEvent['priority'] = 'medium',
    targetBranch?: number
  ): string {
    const event: SyncEvent = {
      id: this.generateEventId(),
      type,
      source: this._currentBranchId(),
      target: targetBranch,
      timestamp: new Date().toISOString(),
      data,
      priority,
      requiresAcknowledgment: priority === 'high' || priority === 'critical',
      retryCount: 0,
      maxRetries: priority === 'critical' ? 5 : 3,
      status: 'pending'
    };

    // Add to local queue
    const current = this._syncEvents();
    this._syncEvents.set([event, ...current]);

    // Send via WebSocket
    this.transmitEvent(event);

    return event.id;
  }

  private transmitEvent(event: SyncEvent) {
    if (this.masterConnection && this._isConnected()) {
      try {
        this.masterConnection.next({
          type: 'sync_event',
          event
        });
        
        // Update event status
        this.updateEventStatus(event.id, 'sent');
        
      } catch (error) {
        console.error('❌ Failed to transmit event:', error);
        this.updateEventStatus(event.id, 'failed');
        this.scheduleRetry(event);
      }
    } else {
      // Queue for later transmission
      console.log('📤 Queuing event for transmission:', event.id);
    }
  }

  private receiveSyncEvent(event: SyncEvent) {
    // Add to local events
    const current = this._syncEvents();
    this._syncEvents.set([event, ...current]);

    // Send acknowledgment if required
    if (event.requiresAcknowledgment) {
      this.sendAcknowledgment(event);
    }

    // Process the event based on type
    this.processSyncEvent(event);
  }

  private processSyncEvent(event: SyncEvent) {
    console.log(`📥 Processing sync event: ${event.type} from branch ${event.source}`);
    
    switch (event.type) {
      case 'notification':
        // Integrate with notification service
        this.handleNotificationSync(event);
        break;
      case 'data':
        this.handleDataSync(event);
        break;
      case 'status':
        this.handleStatusSync(event);
        break;
      case 'config':
        this.handleConfigSync(event);
        break;
      case 'alert':
        this.handleAlertSync(event);
        break;
    }
  }

  // Event handlers
  private handleNotificationSync(event: SyncEvent) {
    // This would integrate with the notification service to add/update notifications
    console.log('🔔 Syncing notification:', event.data);
  }

  private handleDataSync(event: SyncEvent) {
    // Handle data synchronization with conflict detection
    if (this.detectConflict(event)) {
      this.createConflict(event);
    } else {
      console.log('📊 Syncing data:', event.data);
    }
  }

  private handleStatusSync(event: SyncEvent) {
    console.log('📡 Syncing status:', event.data);
    if (event.data.branchId) {
      this.updateBranchStatus(event.data.branchId, event.data);
    }
  }

  private handleConfigSync(event: SyncEvent) {
    console.log('⚙️ Syncing configuration:', event.data);
  }

  private handleAlertSync(event: SyncEvent) {
    console.log('🚨 Syncing alert:', event.data);
  }

  // Conflict management
  private detectConflict(event: SyncEvent): boolean {
    // Simplified conflict detection logic
    // In real implementation, this would check for data conflicts
    return Math.random() < 0.1; // 10% chance of conflict for demo
  }

  private createConflict(event: SyncEvent) {
    const conflict: SyncConflict = {
      id: this.generateEventId(),
      type: event.type as any,
      branchIds: [event.source, this._currentBranchId()],
      conflictData: [
        {
          branchId: event.source,
          data: event.data,
          timestamp: event.timestamp,
          version: '1.0.0'
        },
        {
          branchId: this._currentBranchId(),
          data: { /* current data */ },
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      ],
      resolutionStrategy: 'manual',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const current = this._syncConflicts();
    this._syncConflicts.set([conflict, ...current]);
    
    console.log('⚡ Conflict detected:', conflict.id);
  }

  resolveConflict(
    conflictId: string, 
    resolution: ConflictResolutionStrategy, 
    selectedData?: any,
    resolvedBy?: string
  ) {
    const current = this._syncConflicts();
    const updated = current.map(c => 
      c.id === conflictId ? {
        ...c,
        status: 'resolved' as const,
        resolutionStrategy: resolution,
        resolvedAt: new Date().toISOString(),
        resolvedBy: resolvedBy || 'system'
      } : c
    );

    this._syncConflicts.set(updated);
    
    // Apply resolution
    this.applyConflictResolution(conflictId, resolution, selectedData);
  }

  private applyConflictResolution(
    conflictId: string, 
    resolution: ConflictResolutionStrategy, 
    selectedData?: any
  ) {
    console.log(`🔧 Applying conflict resolution: ${resolution} for ${conflictId}`);
    
    switch (resolution) {
      case 'latest-wins':
        // Use the most recent data
        break;
      case 'manual':
        // Use selectedData
        break;
      case 'merge':
        // Merge conflicting data
        break;
      case 'branch-priority':
        // Use data from higher priority branch
        break;
      case 'rollback':
        // Rollback to previous state
        break;
    }
  }

  // Branch status management
  private updateBranchStatus(branchId: number, statusData: Partial<BranchStatus>) {
    const current = this._branchStatuses();
    const updated = current.map(b => 
      b.branchId === branchId ? { ...b, ...statusData, lastSeen: new Date().toISOString() } : b
    );
    this._branchStatuses.set(updated);
  }

  // Connection management
  private startHeartbeat() {
    interval(30000).subscribe(() => { // Every 30 seconds
      if (this._isConnected()) {
        this.sendHeartbeat();
      }
    });
  }

  private sendHeartbeat() {
    const heartbeat = {
      type: 'heartbeat',
      branchId: this._currentBranchId(),
      timestamp: new Date().toISOString(),
      status: this.getCurrentBranchStatus()
    };

    if (this.masterConnection) {
      try {
        this.masterConnection.next(heartbeat);
      } catch (error) {
        console.error('💓 Heartbeat failed:', error);
      }
    }
  }

  private handleHeartbeat(branchId: number) {
    this.updateBranchStatus(branchId, { 
      lastSeen: new Date().toISOString(),
      status: 'online'
    });
  }

  private attemptReconnection() {
    console.log('🔄 Attempting reconnection...');
    
    // Exponential backoff
    timer(5000).subscribe(() => {
      if (!this._isConnected()) {
        this.establishConnections();
      }
    });
  }

  // Utility methods
  private getCurrentBranchStatus(): Partial<BranchStatus> {
    return {
      systemLoad: Math.floor(Math.random() * 100),
      pendingSyncItems: this.pendingEvents().length,
      networkLatency: Math.floor(Math.random() * 100) + 10
    };
  }

  private sendAcknowledgment(event: SyncEvent) {
    if (this.masterConnection && this._isConnected()) {
      this.masterConnection.next({
        type: 'acknowledgment',
        eventId: event.id,
        branchId: this._currentBranchId(),
        timestamp: new Date().toISOString()
      });
    }
  }

  private updateEventStatus(eventId: string, status: SyncEvent['status']) {
    const current = this._syncEvents();
    const updated = current.map(e => 
      e.id === eventId ? { ...e, status } : e
    );
    this._syncEvents.set(updated);
  }

  private scheduleRetry(event: SyncEvent) {
    if (event.retryCount < event.maxRetries) {
      const delay = Math.pow(2, event.retryCount) * 1000; // Exponential backoff
      
      timer(delay).subscribe(() => {
        const updatedEvent = { ...event, retryCount: event.retryCount + 1 };
        this.transmitEvent(updatedEvent);
      });
    }
  }

  private startConflictResolution() {
    // Auto-resolve simple conflicts every 5 minutes
    interval(300000).subscribe(() => {
      this.autoResolveConflicts();
    });
  }

  private autoResolveConflicts() {
    const pendingConflicts = this.unresolvedConflicts();
    
    for (const conflict of pendingConflicts) {
      if (conflict.resolutionStrategy !== 'manual') {
        this.resolveConflict(conflict.id, conflict.resolutionStrategy, undefined, 'auto-resolver');
      }
    }
  }

  private startEventCleanup() {
    // Clean up old events every hour
    interval(3600000).subscribe(() => {
      this.cleanupOldEvents();
    });
  }

  private cleanupOldEvents() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const current = this._syncEvents();
    const filtered = current.filter(e => 
      new Date(e.timestamp) > oneDayAgo || e.status === 'pending'
    );
    
    if (filtered.length !== current.length) {
      this._syncEvents.set(filtered);
      console.log(`🧹 Cleaned up ${current.length - filtered.length} old events`);
    }
  }

  // Simulation methods for development
  private simulateIncomingSyncEvent() {
    const eventTypes: SyncEvent['type'][] = ['notification', 'data', 'status', 'config', 'alert'];
    const priorities: SyncEvent['priority'][] = ['low', 'medium', 'high', 'critical'];
    const branches = [2, 3, 4, 5]; // Other branches
    
    const mockEvent: SyncEvent = {
      id: this.generateEventId(),
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      source: branches[Math.floor(Math.random() * branches.length)],
      timestamp: new Date().toISOString(),
      data: { message: 'Mock sync data', value: Math.random() },
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      requiresAcknowledgment: Math.random() > 0.5,
      retryCount: 0,
      maxRetries: 3,
      status: 'pending'
    };
    
    this.receiveSyncEvent(mockEvent);
  }

  private simulateBranchStatusUpdates() {
    const current = this._branchStatuses();
    const updated = current.map(branch => ({
      ...branch,
      systemLoad: Math.max(0, Math.min(100, branch.systemLoad + (Math.random() - 0.5) * 20)),
      networkLatency: Math.max(5, branch.networkLatency + (Math.random() - 0.5) * 10),
      lastSeen: Math.random() > 0.1 ? new Date().toISOString() : branch.lastSeen
    }));
    
    this._branchStatuses.set(updated);
  }

  private calculateAverageLatency(): number {
    const branches = this._branchStatuses().filter(b => b.status === 'online');
    if (branches.length === 0) return 0;
    return branches.reduce((sum, b) => sum + b.networkLatency, 0) / branches.length;
  }

  private calculateSyncRate(): number {
    const events = this._syncEvents();
    const successful = events.filter(e => e.status === 'acknowledged');
    return events.length > 0 ? (successful.length / events.length) * 100 : 0;
  }

  private generateEventId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getBranchStatus(branchId: number): BranchStatus | undefined {
    return this._branchStatuses().find(b => b.branchId === branchId);
  }

  forceSyncWithBranch(branchId: number): void {
    this.sendEvent('status', { 
      type: 'force_sync',
      requestedBy: this._currentBranchId(),
      timestamp: new Date().toISOString()
    }, 'high', branchId);
  }

  broadcastNotification(notification: any): void {
    this.sendEvent('notification', notification, 'medium');
  }

  getConnectionHealth(): Observable<any> {
    return new BehaviorSubject({
      isConnected: this._isConnected(),
      latency: this.calculateAverageLatency(),
      onlineBranches: this.onlineBranches().length,
      totalBranches: this._branchStatuses().length,
      syncRate: this.calculateSyncRate(),
      lastUpdate: new Date().toISOString()
    }).asObservable();
  }

  exportSyncData(): any {
    return {
      branchStatuses: this._branchStatuses(),
      syncEvents: this._syncEvents(),
      conflicts: this._syncConflicts(),
      statistics: this.syncStatistics(),
      exportedAt: new Date().toISOString()
    };
  }
}