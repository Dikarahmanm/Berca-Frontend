// Advanced notification routing and escalation system for multi-branch operations
import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, timer, interval } from 'rxjs';
import { map, filter, switchMap, tap } from 'rxjs/operators';

export interface NotificationRoute {
  id: string;
  name: string;
  conditions: RouteCondition[];
  actions: RouteAction[];
  escalation?: EscalationRule;
  isActive: boolean;
  priority: number;
}

export interface RouteCondition {
  field: keyof MultiBranchNotification;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'regex';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RouteAction {
  type: 'email' | 'sms' | 'push' | 'webhook' | 'escalate' | 'assign' | 'archive';
  config: Record<string, any>;
  delay?: number; // milliseconds
}

export interface EscalationRule {
  levels: EscalationLevel[];
  timeoutMinutes: number;
  maxLevel: number;
}

export interface EscalationLevel {
  level: number;
  recipients: NotificationRecipient[];
  actions: RouteAction[];
  timeoutMinutes: number;
}

export interface NotificationRecipient {
  id: string;
  type: 'user' | 'role' | 'branch' | 'department';
  identifier: string; // userId, roleId, branchId, etc.
  contactMethods: ContactMethod[];
}

export interface ContactMethod {
  type: 'email' | 'sms' | 'push' | 'slack' | 'teams';
  address: string;
  isActive: boolean;
  priority: number;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  recipientId: string;
  method: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'acknowledged';
  attempts: number;
  lastAttempt: string;
  deliveredAt?: string;
  acknowledgedAt?: string;
  failureReason?: string;
}

export interface EscalationInstance {
  id: string;
  notificationId: string;
  routeId: string;
  currentLevel: number;
  startedAt: string;
  lastEscalatedAt?: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

// Import the existing interface
import { MultiBranchNotification } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationRoutingService {
  // State signals
  private readonly _routes = signal<NotificationRoute[]>([]);
  private readonly _deliveries = signal<NotificationDelivery[]>([]);
  private readonly _escalations = signal<EscalationInstance[]>([]);
  private readonly _recipients = signal<NotificationRecipient[]>([]);

  // Public readonly signals
  readonly routes = this._routes.asReadonly();
  readonly deliveries = this._deliveries.asReadonly();
  readonly escalations = this._escalations.asReadonly();
  readonly recipients = this._recipients.asReadonly();

  // Computed analytics
  readonly routingStats = computed(() => {
    const routes = this._routes();
    const deliveries = this._deliveries();
    const escalations = this._escalations();

    return {
      totalRoutes: routes.length,
      activeRoutes: routes.filter(r => r.isActive).length,
      totalDeliveries: deliveries.length,
      successfulDeliveries: deliveries.filter(d => d.status === 'delivered').length,
      failedDeliveries: deliveries.filter(d => d.status === 'failed').length,
      activeEscalations: escalations.filter(e => !e.isResolved).length,
      deliveryRate: deliveries.length > 0 ? 
        (deliveries.filter(d => d.status === 'delivered').length / deliveries.length) * 100 : 0
    };
  });

  readonly performanceMetrics = computed(() => {
    const deliveries = this._deliveries();
    const now = new Date();
    const last24Hours = deliveries.filter(d => 
      new Date(d.lastAttempt) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );

    return {
      deliveriesLast24h: last24Hours.length,
      averageDeliveryTime: this.calculateAverageDeliveryTime(last24Hours),
      failureRate: last24Hours.length > 0 ? 
        (last24Hours.filter(d => d.status === 'failed').length / last24Hours.length) * 100 : 0,
      averageAttempts: last24Hours.length > 0 ?
        last24Hours.reduce((sum, d) => sum + d.attempts, 0) / last24Hours.length : 0
    };
  });

  constructor() {
    this.initializeDefaultRoutes();
    this.initializeDefaultRecipients();
    this.startEscalationMonitoring();
  }

  private initializeDefaultRoutes() {
    const defaultRoutes: NotificationRoute[] = [
      {
        id: 'critical-system-failures',
        name: 'Critical System Failures',
        conditions: [
          { field: 'severity', operator: 'equals', value: 'error' },
          { field: 'type', operator: 'equals', value: 'system', logicalOperator: 'AND' }
        ],
        actions: [
          { type: 'email', config: { template: 'critical-alert' } },
          { type: 'sms', config: { message: 'URGENT: System failure detected' } },
          { type: 'push', config: { sound: 'emergency' } }
        ],
        escalation: {
          levels: [
            {
              level: 1,
              recipients: [{ id: 'admin-on-duty', type: 'role', identifier: 'admin', contactMethods: [] }],
              actions: [{ type: 'email', config: {} }],
              timeoutMinutes: 5
            },
            {
              level: 2,
              recipients: [{ id: 'system-managers', type: 'role', identifier: 'system-manager', contactMethods: [] }],
              actions: [{ type: 'email', config: {} }, { type: 'sms', config: {} }],
              timeoutMinutes: 15
            }
          ],
          timeoutMinutes: 30,
          maxLevel: 2
        },
        isActive: true,
        priority: 1
      },
      {
        id: 'transfer-approvals',
        name: 'Transfer Approvals Required',
        conditions: [
          { field: 'type', operator: 'equals', value: 'transfer' },
          { field: 'actionRequired', operator: 'equals', value: true, logicalOperator: 'AND' }
        ],
        actions: [
          { type: 'email', config: { template: 'approval-request' } },
          { type: 'push', config: { category: 'approval' } }
        ],
        escalation: {
          levels: [
            {
              level: 1,
              recipients: [{ id: 'branch-managers', type: 'role', identifier: 'branch-manager', contactMethods: [] }],
              actions: [{ type: 'email', config: {} }],
              timeoutMinutes: 30
            }
          ],
          timeoutMinutes: 60,
          maxLevel: 1
        },
        isActive: true,
        priority: 2
      },
      {
        id: 'high-volume-alerts',
        name: 'High Volume Transaction Alerts',
        conditions: [
          { field: 'type', operator: 'equals', value: 'alert' },
          { field: 'message', operator: 'contains', value: 'High Transaction Volume', logicalOperator: 'AND' }
        ],
        actions: [
          { type: 'email', config: { template: 'volume-alert' } },
          { type: 'webhook', config: { url: '/api/analytics/volume-spike' } }
        ],
        isActive: true,
        priority: 3
      }
    ];

    this._routes.set(defaultRoutes);
  }

  private initializeDefaultRecipients() {
    const defaultRecipients: NotificationRecipient[] = [
      {
        id: 'admin-on-duty',
        type: 'role',
        identifier: 'admin',
        contactMethods: [
          { type: 'email', address: 'admin@company.com', isActive: true, priority: 1 },
          { type: 'sms', address: '+62812345678', isActive: true, priority: 2 }
        ]
      },
      {
        id: 'system-managers',
        type: 'role',
        identifier: 'system-manager',
        contactMethods: [
          { type: 'email', address: 'system-team@company.com', isActive: true, priority: 1 },
          { type: 'slack', address: '#system-alerts', isActive: true, priority: 2 }
        ]
      },
      {
        id: 'branch-managers',
        type: 'role',
        identifier: 'branch-manager',
        contactMethods: [
          { type: 'email', address: 'branch-managers@company.com', isActive: true, priority: 1 },
          { type: 'push', address: 'branch-manager-group', isActive: true, priority: 2 }
        ]
      }
    ];

    this._recipients.set(defaultRecipients);
  }

  // Route Management
  addRoute(route: NotificationRoute): void {
    const current = this._routes();
    this._routes.set([...current, route]);
  }

  updateRoute(routeId: string, updates: Partial<NotificationRoute>): void {
    const current = this._routes();
    const updated = current.map(r => 
      r.id === routeId ? { ...r, ...updates } : r
    );
    this._routes.set(updated);
  }

  deleteRoute(routeId: string): void {
    const current = this._routes();
    this._routes.set(current.filter(r => r.id !== routeId));
  }

  toggleRoute(routeId: string): void {
    const current = this._routes();
    const updated = current.map(r => 
      r.id === routeId ? { ...r, isActive: !r.isActive } : r
    );
    this._routes.set(updated);
  }

  // Notification Processing
  processNotification(notification: MultiBranchNotification): Observable<NotificationDelivery[]> {
    const matchingRoutes = this.findMatchingRoutes(notification);
    const deliveries: NotificationDelivery[] = [];

    for (const route of matchingRoutes) {
      const routeDeliveries = this.executeRouteActions(notification, route);
      deliveries.push(...routeDeliveries);

      // Start escalation if configured
      if (route.escalation) {
        this.startEscalation(notification, route);
      }
    }

    // Update deliveries state
    const currentDeliveries = this._deliveries();
    this._deliveries.set([...currentDeliveries, ...deliveries]);

    return new BehaviorSubject(deliveries).asObservable();
  }

  private findMatchingRoutes(notification: MultiBranchNotification): NotificationRoute[] {
    return this._routes()
      .filter(route => route.isActive)
      .filter(route => this.evaluateConditions(notification, route.conditions))
      .sort((a, b) => a.priority - b.priority);
  }

  private evaluateConditions(notification: MultiBranchNotification, conditions: RouteCondition[]): boolean {
    if (conditions.length === 0) return true;

    let result = this.evaluateCondition(notification, conditions[0]);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(notification, condition);
      
      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult;
      } else { // Default to AND
        result = result && conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(notification: MultiBranchNotification, condition: RouteCondition): boolean {
    const fieldValue = notification[condition.field];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'greaterThan':
        return Number(fieldValue) > Number(conditionValue);
      case 'lessThan':
        return Number(fieldValue) < Number(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'regex':
        return new RegExp(String(conditionValue), 'i').test(String(fieldValue));
      default:
        return false;
    }
  }

  private executeRouteActions(notification: MultiBranchNotification, route: NotificationRoute): NotificationDelivery[] {
    const deliveries: NotificationDelivery[] = [];

    for (const action of route.actions) {
      if (action.delay) {
        // Schedule delayed action
        timer(action.delay).subscribe(() => {
          this.executeAction(notification, action, route);
        });
      } else {
        // Execute immediately
        const delivery = this.executeAction(notification, action, route);
        if (delivery) deliveries.push(delivery);
      }
    }

    return deliveries;
  }

  private executeAction(
    notification: MultiBranchNotification, 
    action: RouteAction, 
    route: NotificationRoute
  ): NotificationDelivery | null {
    const delivery: NotificationDelivery = {
      id: this.generateId(),
      notificationId: notification.id,
      recipientId: route.id, // Simplified - in real app, get from action config
      method: action.type,
      status: 'pending',
      attempts: 1,
      lastAttempt: new Date().toISOString()
    };

    try {
      switch (action.type) {
        case 'email':
          this.sendEmail(notification, action.config);
          delivery.status = 'sent';
          break;
        case 'sms':
          this.sendSMS(notification, action.config);
          delivery.status = 'sent';
          break;
        case 'push':
          this.sendPushNotification(notification, action.config);
          delivery.status = 'delivered';
          break;
        case 'webhook':
          this.callWebhook(notification, action.config);
          delivery.status = 'sent';
          break;
        case 'assign':
          this.assignNotification(notification, action.config);
          delivery.status = 'delivered';
          break;
        case 'archive':
          delivery.status = 'delivered';
          break;
        default:
          delivery.status = 'failed';
          delivery.failureReason = `Unknown action type: ${action.type}`;
      }
    } catch (error) {
      delivery.status = 'failed';
      delivery.failureReason = String(error);
    }

    return delivery;
  }

  // Action executors (mock implementations)
  private sendEmail(notification: MultiBranchNotification, config: any): void {
    console.log('📧 Sending email:', { notification: notification.title, config });
    // Implement actual email sending logic
  }

  private sendSMS(notification: MultiBranchNotification, config: any): void {
    console.log('📱 Sending SMS:', { notification: notification.title, config });
    // Implement actual SMS sending logic
  }

  private sendPushNotification(notification: MultiBranchNotification, config: any): void {
    console.log('🔔 Sending push notification:', { notification: notification.title, config });
    // Implement actual push notification logic
  }

  private callWebhook(notification: MultiBranchNotification, config: any): void {
    console.log('🔗 Calling webhook:', { notification: notification.title, config });
    // Implement actual webhook calling logic
  }

  private assignNotification(notification: MultiBranchNotification, config: any): void {
    console.log('👤 Assigning notification:', { notification: notification.title, config });
    // Implement actual assignment logic
  }

  // Escalation Management
  private startEscalation(notification: MultiBranchNotification, route: NotificationRoute): void {
    if (!route.escalation) return;

    const escalation: EscalationInstance = {
      id: this.generateId(),
      notificationId: notification.id,
      routeId: route.id,
      currentLevel: 0,
      startedAt: new Date().toISOString(),
      isResolved: false
    };

    const current = this._escalations();
    this._escalations.set([...current, escalation]);

    // Schedule first escalation level
    timer(route.escalation.levels[0].timeoutMinutes * 60000).subscribe(() => {
      this.escalateToNextLevel(escalation.id);
    });
  }

  private escalateToNextLevel(escalationId: string): void {
    const current = this._escalations();
    const escalation = current.find(e => e.id === escalationId);
    if (!escalation || escalation.isResolved) return;

    const route = this._routes().find(r => r.id === escalation.routeId);
    if (!route?.escalation) return;

    const nextLevel = escalation.currentLevel + 1;
    if (nextLevel >= route.escalation.levels.length) return;

    // Update escalation
    const updated = current.map(e => 
      e.id === escalationId ? {
        ...e,
        currentLevel: nextLevel,
        lastEscalatedAt: new Date().toISOString()
      } : e
    );
    this._escalations.set(updated);

    // Execute escalation level actions
    const level = route.escalation.levels[nextLevel];
    // Implementation would execute level.actions here

    // Schedule next escalation if available
    if (nextLevel + 1 < route.escalation.levels.length) {
      timer(level.timeoutMinutes * 60000).subscribe(() => {
        this.escalateToNextLevel(escalationId);
      });
    }
  }

  resolveEscalation(escalationId: string, resolvedBy: string): void {
    const current = this._escalations();
    const updated = current.map(e => 
      e.id === escalationId ? {
        ...e,
        isResolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy
      } : e
    );
    this._escalations.set(updated);
  }

  private startEscalationMonitoring(): void {
    // Check for escalations every minute
    interval(60000).subscribe(() => {
      this.processEscalations();
    });
  }

  private processEscalations(): void {
    // Implementation for processing pending escalations
    console.log('🔄 Processing escalations...');
  }

  // Utility methods
  private calculateAverageDeliveryTime(deliveries: NotificationDelivery[]): number {
    const successful = deliveries.filter(d => d.status === 'delivered' && d.deliveredAt);
    if (successful.length === 0) return 0;

    const totalTime = successful.reduce((sum, d) => {
      const sent = new Date(d.lastAttempt);
      const delivered = new Date(d.deliveredAt!);
      return sum + (delivered.getTime() - sent.getTime());
    }, 0);

    return totalTime / successful.length / 1000; // Return in seconds
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Analytics and reporting
  getRoutePerformance(routeId: string): Observable<any> {
    return new BehaviorSubject({
      routeId,
      deliveries: this._deliveries().filter(d => d.recipientId === routeId),
      successRate: 95.5,
      averageDeliveryTime: 2.3,
      lastUsed: new Date().toISOString()
    }).asObservable();
  }

  exportRoutingData(): any {
    return {
      routes: this._routes(),
      deliveries: this._deliveries(),
      escalations: this._escalations(),
      recipients: this._recipients(),
      stats: this.routingStats(),
      performance: this.performanceMetrics(),
      exportedAt: new Date().toISOString()
    };
  }
}