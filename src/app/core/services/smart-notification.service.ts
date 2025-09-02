// src/app/core/services/smart-notification.service.ts
// Phase 1: Smart Notification Service with AI-powered intelligent notifications
// Angular 20 with Signal-based reactive architecture

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { 
  ExpiryNotification, 
  NotificationPreferences, 
  ExpiringProduct, 
  ExpiredProduct,
  ExpiryUrgency,
  ExpiryStatus,
  ApiResponse 
} from '../interfaces/expiry.interfaces';

// Enhanced Smart Notification Interfaces
export interface SmartNotificationRule {
  id: number;
  name: string;
  type: 'expiry_warning' | 'expired_alert' | 'low_stock' | 'batch_blocked' | 'disposal_reminder' | 'supplier_overdue' | 'member_debt_due';
  priority: ExpiryUrgency;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  escalationRules: EscalationRule[];
  isActive: boolean;
  branchId?: number;
  categoryId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCondition {
  field: string; // 'daysUntilExpiry', 'stockLevel', 'valueAtRisk', 'categoryId'
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface NotificationAction {
  type: 'browser_notification' | 'email' | 'sms' | 'dashboard_alert' | 'system_log';
  template: string;
  recipients?: string[];
  delay?: number; // minutes
  isEnabled: boolean;
}

export interface EscalationRule {
  level: number;
  triggerAfterMinutes: number;
  escalateTo: 'manager' | 'admin' | 'owner' | 'supplier';
  action: NotificationAction;
  conditions?: NotificationCondition[];
}

export interface SmartNotificationAnalytics {
  totalNotificationsSent: number;
  notificationsByType: Record<string, number>;
  notificationsByPriority: Record<string, number>;
  averageResponseTime: number;
  escalationRate: number;
  effectivenessScore: number;
  topTriggeredRules: SmartNotificationRule[];
  branchPerformance: BranchNotificationStats[];
  trendData: NotificationTrendData[];
}

export interface BranchNotificationStats {
  branchId: number;
  branchName: string;
  totalNotifications: number;
  averageResponseTime: number;
  escalationRate: number;
  effectivenessScore: number;
  criticalUnresolved: number;
}

export interface NotificationTrendData {
  date: string;
  totalSent: number;
  totalResolved: number;
  averageResponseTime: number;
  escalationCount: number;
}

export interface IntelligentRecommendation {
  id: number;
  type: 'stock_optimization' | 'pricing_adjustment' | 'supplier_negotiation' | 'disposal_timing';
  title: string;
  description: string;
  priority: ExpiryUrgency;
  potentialSaving: number;
  confidenceScore: number;
  actionItems: string[];
  relatedData: any;
  validUntil: string;
  implementationEffort: 'low' | 'medium' | 'high';
}

@Injectable({
  providedIn: 'root'
})
export class SmartNotificationService {
  private readonly http = inject(HttpClient);
  // ✅ Use relative URL for proxy routing
  private readonly baseUrl = '/api/SmartNotification';

  // Signal-based state management
  private _notifications = signal<ExpiryNotification[]>([]);
  private _rules = signal<SmartNotificationRule[]>([]);
  private _preferences = signal<NotificationPreferences>({
    enableExpiryWarnings: true,
    warningDaysBefore: 7,
    enableExpiredAlerts: true,
    enableBatchNotifications: true,
    enableDisposalReminders: true,
    emailNotifications: false,
    pushNotifications: true
  });
  private _analytics = signal<SmartNotificationAnalytics | null>(null);
  private _recommendations = signal<IntelligentRecommendation[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly notifications = this._notifications.asReadonly();
  readonly rules = this._rules.asReadonly();
  readonly preferences = this._preferences.asReadonly();
  readonly analytics = this._analytics.asReadonly();
  readonly recommendations = this._recommendations.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties for intelligent insights
  readonly unreadNotifications = computed(() => 
    this._notifications().filter(n => !n.isRead)
  );

  readonly criticalNotifications = computed(() => 
    this._notifications().filter(n => !n.isRead && n.priority === ExpiryUrgency.CRITICAL)
  );

  readonly notificationsByType = computed(() => {
    const notifications = this._notifications();
    const grouped = new Map<string, ExpiryNotification[]>();
    
    notifications.forEach(notification => {
      const type = notification.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(notification);
    });
    
    return grouped;
  });

  readonly urgencyStats = computed(() => {
    const notifications = this.unreadNotifications();
    return {
      critical: notifications.filter((n: any) => n.priority === ExpiryUrgency.CRITICAL).length,
      high: notifications.filter((n: any) => n.priority === ExpiryUrgency.HIGH).length,
      medium: notifications.filter((n: any) => n.priority === ExpiryUrgency.MEDIUM).length,
      low: notifications.filter((n: any) => n.priority === ExpiryUrgency.LOW).length
    };
  });

  readonly activeRules = computed(() => 
    this._rules().filter(rule => rule.isActive)
  );

  readonly highPriorityRecommendations = computed(() => 
    this._recommendations().filter(rec => 
      rec.priority === ExpiryUrgency.HIGH || rec.priority === ExpiryUrgency.CRITICAL
    )
  );

  constructor() {
    this.initializeService();
    this.setupNotificationEffects();
  }

  private initializeService(): void {
    this.loadNotifications();
    this.loadRules();
    this.loadPreferences();
    this.loadAnalytics();
    this.loadRecommendations();
  }

  private setupNotificationEffects(): void {
    // Auto-escalate critical notifications
    effect(() => {
      const critical = this.criticalNotifications();
      if (critical.length > 0) {
        this.handleCriticalNotifications(critical);
      }
    });

    // Generate recommendations based on notification patterns
    effect(() => {
      const analytics = this._analytics();
      if (analytics && analytics.escalationRate > 0.3) {
        this.generateOptimizationRecommendations();
      }
    });
  }

  // ===== CORE NOTIFICATION METHODS =====

  async loadNotifications(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      console.log('🔔 Loading smart notifications from API...');
      
      // Real API call (backend ready)
      const response = await this.http.get<ApiResponse<ExpiryNotification[]>>(
        `${this.baseUrl}/notifications`
      ).toPromise();

      if (response?.success && response.data) {
        this._notifications.set(response.data);
        console.log(`✅ Loaded ${response.data.length} smart notifications`);
      } else {
        // Enhanced fallback with intelligent mock data
        this._notifications.set(this.generateIntelligentMockNotifications());
        console.log('📝 Using intelligent mock notification data');
      }
    } catch (error: any) {
      console.error('❌ Error loading notifications:', error);
      this._error.set('Failed to load notifications');
      this._notifications.set(this.generateIntelligentMockNotifications());
    } finally {
      this._loading.set(false);
    }
  }

  async createSmartNotification(
    type: string,
    productData: any,
    customRules?: Partial<SmartNotificationRule>
  ): Promise<void> {
    try {
      const notification = this.buildIntelligentNotification(type, productData, customRules);
      
      // Real API call (backend ready)
      const response = await this.http.post<ApiResponse<ExpiryNotification>>(
        `${this.baseUrl}/create`,
        notification
      ).toPromise();

      if (response?.success && response.data) {
        this._notifications.update(notifications => [response.data!, ...notifications]);
        console.log('✅ Smart notification created:', response.data.title);
        
        // Trigger intelligent actions
        this.executeNotificationActions(response.data, customRules);
      }
    } catch (error) {
      console.error('❌ Error creating smart notification:', error);
    }
  }

  async processExpiryAlerts(expiringProducts: ExpiringProduct[]): Promise<void> {
    const intelligentAlerts = this.analyzeExpiryPatterns(expiringProducts);
    
    for (const alert of intelligentAlerts) {
      await this.createSmartNotification('expiry_warning', alert.product, {
        escalationRules: alert.escalationRules,
        conditions: alert.conditions
      });
    }
  }

  async processDisposalRecommendations(expiredProducts: ExpiredProduct[]): Promise<void> {
    const recommendations = this.generateDisposalStrategy(expiredProducts);
    
    for (const recommendation of recommendations) {
      await this.createSmartNotification('disposal_reminder', recommendation.product, {
        actions: recommendation.actions,
        priority: recommendation.priority
      });
    }
  }

  // ===== INTELLIGENT ANALYSIS METHODS =====

  private analyzeExpiryPatterns(products: ExpiringProduct[]): any[] {
    return products.map(product => {
      const riskScore = this.calculateRiskScore(product);
      const urgency = this.determineIntelligentUrgency(product, riskScore);
      
      return {
        product,
        riskScore,
        urgency,
        escalationRules: this.buildEscalationRules(urgency, product),
        conditions: this.buildIntelligentConditions(product, riskScore)
      };
    });
  }

  private calculateRiskScore(product: ExpiringProduct): number {
    let score = 0;
    
    // Time factor (40% weight)
    const timeScore = Math.max(0, (30 - product.daysUntilExpiry) / 30) * 40;
    score += timeScore;
    
    // Value factor (35% weight)
    const valueScore = Math.min(product.valueAtRisk / 1000000, 1) * 35;
    score += valueScore;
    
    // Stock factor (25% weight)
    const stockScore = Math.min(product.currentStock / 100, 1) * 25;
    score += stockScore;
    
    return Math.min(score, 100);
  }

  private determineIntelligentUrgency(product: ExpiringProduct, riskScore: number): ExpiryUrgency {
    if (riskScore >= 80 || product.daysUntilExpiry <= 1) {
      return ExpiryUrgency.CRITICAL;
    } else if (riskScore >= 60 || product.daysUntilExpiry <= 3) {
      return ExpiryUrgency.HIGH;
    } else if (riskScore >= 40 || product.daysUntilExpiry <= 7) {
      return ExpiryUrgency.MEDIUM;
    } else {
      return ExpiryUrgency.LOW;
    }
  }

  private buildEscalationRules(urgency: ExpiryUrgency, product: ExpiringProduct): EscalationRule[] {
    const rules: EscalationRule[] = [];
    
    switch (urgency) {
      case ExpiryUrgency.CRITICAL:
        rules.push({
          level: 1,
          triggerAfterMinutes: 15,
          escalateTo: 'manager',
          action: {
            type: 'email',
            template: 'critical_expiry_escalation',
            recipients: ['manager@tokoeniwan.com'],
            isEnabled: true
          }
        });
        rules.push({
          level: 2,
          triggerAfterMinutes: 60,
          escalateTo: 'admin',
          action: {
            type: 'sms',
            template: 'urgent_action_required',
            recipients: ['+6281234567890'],
            isEnabled: true
          }
        });
        break;
        
      case ExpiryUrgency.HIGH:
        rules.push({
          level: 1,
          triggerAfterMinutes: 120,
          escalateTo: 'manager',
          action: {
            type: 'dashboard_alert',
            template: 'high_priority_expiry',
            isEnabled: true
          }
        });
        break;
    }
    
    return rules;
  }

  private buildIntelligentConditions(product: ExpiringProduct, riskScore: number): NotificationCondition[] {
    return [
      {
        field: 'daysUntilExpiry',
        operator: 'less_than',
        value: product.daysUntilExpiry + 1
      },
      {
        field: 'valueAtRisk',
        operator: 'greater_than',
        value: 100000, // IDR 100K minimum
        logicalOperator: 'AND'
      },
      {
        field: 'riskScore',
        operator: 'greater_than',
        value: riskScore - 10,
        logicalOperator: 'AND'
      }
    ];
  }

  private generateDisposalStrategy(expiredProducts: ExpiredProduct[]): any[] {
    return expiredProducts.map(product => {
      const strategy = this.determineOptimalDisposalMethod(product);
      
      return {
        product,
        strategy,
        priority: product.daysOverdue > 30 ? ExpiryUrgency.CRITICAL : ExpiryUrgency.HIGH,
        actions: this.buildDisposalActions(strategy)
      };
    });
  }

  private determineOptimalDisposalMethod(product: ExpiredProduct): string {
    if (product.daysOverdue <= 7 && product.categoryName.includes('Food')) {
      return 'donate'; // Fresh food can be donated quickly
    } else if (product.lossValue > 500000) {
      return 'return_to_supplier'; // High value items
    } else {
      return 'destroy'; // Default disposal
    }
  }

  private buildDisposalActions(strategy: string): NotificationAction[] {
    const actions: NotificationAction[] = [
      {
        type: 'dashboard_alert',
        template: `disposal_${strategy}`,
        isEnabled: true
      }
    ];

    if (strategy === 'return_to_supplier') {
      actions.push({
        type: 'email',
        template: 'supplier_return_request',
        recipients: ['supplier@example.com'],
        isEnabled: true
      });
    }

    return actions;
  }

  private buildIntelligentNotification(
    type: string,
    productData: any,
    customRules?: Partial<SmartNotificationRule>
  ): Partial<ExpiryNotification> {
    const now = new Date().toISOString();
    
    return {
      type: type as any,
      title: this.generateIntelligentTitle(type, productData),
      message: this.generateIntelligentMessage(type, productData),
      productId: productData.productId || productData.id,
      productName: productData.productName || productData.name,
      batchId: productData.batchId,
      batchNumber: productData.batchNumber,
      expiryDate: productData.expiryDate,
      daysUntilExpiry: productData.daysUntilExpiry,
      priority: customRules?.priority || this.calculateIntelligentPriority(type, productData),
      isRead: false,
      actionRequired: this.determineActionRequired(type, productData),
      createdAt: now,
      branchId: productData.branchId,
      branchName: productData.branchName
    };
  }

  private generateIntelligentTitle(type: string, data: any): string {
    switch (type) {
      case 'expiry_warning':
        return `⚠️ ${data.productName} expires in ${data.daysUntilExpiry} day(s)`;
      case 'expired_alert':
        return `🚨 ${data.productName} has expired (${data.daysOverdue} days ago)`;
      case 'disposal_reminder':
        return `🗑️ Disposal required: ${data.productName}`;
      case 'batch_blocked':
        return `🚫 Batch blocked: ${data.productName} (${data.batchNumber})`;
      default:
        return `📋 Notification: ${data.productName}`;
    }
  }

  private generateIntelligentMessage(type: string, data: any): string {
    switch (type) {
      case 'expiry_warning':
        const urgency = data.daysUntilExpiry <= 3 ? 'URGENT ACTION REQUIRED' : 'Action recommended';
        return `${urgency}: ${data.productName} (${data.batchNumber || 'N/A'}) will expire on ${data.expiryDate}. Current stock: ${data.currentStock} units. Value at risk: ${this.formatCurrency(data.valueAtRisk || 0)}.`;
      
      case 'expired_alert':
        return `${data.productName} expired ${data.daysOverdue} days ago. Current stock: ${data.currentStock} units. Loss value: ${this.formatCurrency(data.lossValue || 0)}. Immediate disposal required.`;
      
      case 'disposal_reminder':
        return `${data.productName} requires disposal. Recommended method: ${data.disposalMethod || 'TBD'}. Stock to dispose: ${data.currentStock} units.`;
      
      default:
        return `Notification for ${data.productName}. Please review and take appropriate action.`;
    }
  }

  private calculateIntelligentPriority(type: string, data: any): ExpiryUrgency {
    if (type === 'expired_alert' || (data.daysUntilExpiry && data.daysUntilExpiry <= 1)) {
      return ExpiryUrgency.CRITICAL;
    } else if (data.daysUntilExpiry && data.daysUntilExpiry <= 3) {
      return ExpiryUrgency.HIGH;
    } else if (data.daysUntilExpiry && data.daysUntilExpiry <= 7) {
      return ExpiryUrgency.MEDIUM;
    } else {
      return ExpiryUrgency.LOW;
    }
  }

  private determineActionRequired(type: string, data: any): boolean {
    return ['expired_alert', 'disposal_reminder', 'batch_blocked'].includes(type) ||
           (data.daysUntilExpiry && data.daysUntilExpiry <= 3);
  }

  // ===== RECOMMENDATION ENGINE =====

  async generateOptimizationRecommendations(): Promise<void> {
    try {
      console.log('🧠 Generating intelligent optimization recommendations...');
      
      const analytics = this._analytics();
      const notifications = this._notifications();
      
      if (!analytics) return;
      
      const recommendations: IntelligentRecommendation[] = [];
      
      // Stock optimization recommendations
      if (analytics.escalationRate > 0.25) {
        recommendations.push({
          id: Date.now(),
          type: 'stock_optimization',
          title: 'Optimize Stock Levels',
          description: 'High escalation rate indicates frequent expiry issues. Consider reducing order quantities for frequently expiring categories.',
          priority: ExpiryUrgency.HIGH,
          potentialSaving: analytics.totalNotificationsSent * 50000, // Estimated saving per prevented expiry
          confidenceScore: 0.85,
          actionItems: [
            'Review purchase patterns for top expiring categories',
            'Implement dynamic reorder points based on expiry rates',
            'Negotiate flexible order quantities with suppliers'
          ],
          relatedData: { escalationRate: analytics.escalationRate },
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          implementationEffort: 'medium'
        });
      }
      
      // Pricing adjustment recommendations
      const nearExpiryNotifications = notifications.filter(n => 
        n.type === 'expiry_warning' && n.daysUntilExpiry && n.daysUntilExpiry <= 5
      );
      
      if (nearExpiryNotifications.length > 5) {
        recommendations.push({
          id: Date.now() + 1,
          type: 'pricing_adjustment',
          title: 'Dynamic Pricing Strategy',
          description: 'Multiple items nearing expiry. Implement dynamic discount pricing to reduce waste.',
          priority: ExpiryUrgency.MEDIUM,
          potentialSaving: nearExpiryNotifications.length * 75000, // Average value per item
          confidenceScore: 0.78,
          actionItems: [
            'Implement 20-30% discount for items expiring in 3-5 days',
            'Create "Quick Sale" promotion section',
            'Set up automated pricing rules'
          ],
          relatedData: { nearExpiryCount: nearExpiryNotifications.length },
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          implementationEffort: 'low'
        });
      }
      
      this._recommendations.set(recommendations);
      console.log(`✅ Generated ${recommendations.length} intelligent recommendations`);
      
    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
    }
  }

  // ===== ACTION EXECUTION =====

  private async executeNotificationActions(
    notification: ExpiryNotification,
    rules?: Partial<SmartNotificationRule>
  ): Promise<void> {
    const actions = rules?.actions || this.getDefaultActionsForType(notification.type);
    
    for (const action of actions) {
      if (action.isEnabled) {
        await this.executeAction(action, notification);
      }
    }
  }

  private async executeAction(action: NotificationAction, notification: ExpiryNotification): Promise<void> {
    try {
      switch (action.type) {
        case 'browser_notification':
          this.showBrowserNotification(notification);
          break;
        case 'dashboard_alert':
          this.showDashboardAlert(notification);
          break;
        case 'email':
          await this.sendEmailNotification(notification, action);
          break;
        case 'system_log':
          this.logSystemEvent(notification);
          break;
      }
    } catch (error) {
      console.error(`❌ Error executing action ${action.type}:`, error);
    }
  }

  private showBrowserNotification(notification: ExpiryNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/notification-icon.png',
        tag: notification.type,
        requireInteraction: notification.priority === ExpiryUrgency.CRITICAL
      });
    }
  }

  private showDashboardAlert(notification: ExpiryNotification): void {
    // Add to dashboard alerts (this would integrate with your dashboard service)
    console.log('📊 Dashboard Alert:', notification.title);
  }

  private async sendEmailNotification(notification: ExpiryNotification, action: NotificationAction): Promise<void> {
    // Real API call for email sending
    try {
      await this.http.post(`${this.baseUrl}/send-email`, {
        notification,
        recipients: action.recipients,
        template: action.template
      }).toPromise();
      
      console.log('📧 Email notification sent:', notification.title);
    } catch (error) {
      console.error('❌ Email sending failed:', error);
    }
  }

  private logSystemEvent(notification: ExpiryNotification): void {
    console.log(`🔍 SYSTEM LOG: ${notification.type} - ${notification.title} - ${notification.message}`);
  }

  // ===== HELPER METHODS =====

  private getDefaultActionsForType(type: string): NotificationAction[] {
    const defaults: Record<string, NotificationAction[]> = {
      'expiry_warning': [
        { type: 'browser_notification', template: 'expiry_warning', isEnabled: true },
        { type: 'dashboard_alert', template: 'expiry_warning', isEnabled: true }
      ],
      'expired_alert': [
        { type: 'browser_notification', template: 'expired_alert', isEnabled: true },
        { type: 'dashboard_alert', template: 'expired_alert', isEnabled: true },
        { type: 'system_log', template: 'expired_alert', isEnabled: true }
      ],
      'disposal_reminder': [
        { type: 'dashboard_alert', template: 'disposal_reminder', isEnabled: true }
      ]
    };

    return defaults[type] || [];
  }

  private handleCriticalNotifications(notifications: ExpiryNotification[]): void {
    notifications.forEach(notification => {
      if (!notification.isRead) {
        this.showBrowserNotification(notification);
        console.log('🚨 CRITICAL ALERT:', notification.title);
      }
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  // ===== MOCK DATA FOR DEVELOPMENT =====

  private generateIntelligentMockNotifications(): ExpiryNotification[] {
    const now = new Date();
    const mockData: ExpiryNotification[] = [
      {
        id: 1,
        type: 'expiry_warning',
        title: '⚠️ Susu UHT Indomilk expires in 2 days',
        message: 'URGENT ACTION REQUIRED: Susu UHT Indomilk (BATCH-2024-001) will expire on 2024-08-26. Current stock: 45 units. Value at risk: Rp 225,000.',
        productId: 1,
        productName: 'Susu UHT Indomilk 1L',
        batchId: 101,
        batchNumber: 'BATCH-2024-001',
        expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: 2,
        priority: ExpiryUrgency.CRITICAL,
        isRead: false,
        actionRequired: true,
        createdAt: now.toISOString(),
        branchId: 1,
        branchName: 'Cabang Utama'
      },
      {
        id: 2,
        type: 'expired_alert',
        title: '🚨 Keju Prochiz has expired (3 days ago)',
        message: 'Keju Prochiz expired 3 days ago. Current stock: 12 units. Loss value: Rp 180,000. Immediate disposal required.',
        productId: 2,
        productName: 'Keju Prochiz 200g',
        batchId: 102,
        batchNumber: 'BATCH-2024-002',
        expiryDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: -3,
        priority: ExpiryUrgency.CRITICAL,
        isRead: false,
        actionRequired: true,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        branchId: 1,
        branchName: 'Cabang Utama'
      },
      {
        id: 3,
        type: 'disposal_reminder',
        title: '🗑️ Disposal required: Yogurt Cimory',
        message: 'Yogurt Cimory requires disposal. Recommended method: Donate. Stock to dispose: 8 units.',
        productId: 3,
        productName: 'Yogurt Cimory 80ml',
        batchId: 103,
        batchNumber: 'BATCH-2024-003',
        expiryDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: -1,
        priority: ExpiryUrgency.HIGH,
        isRead: false,
        actionRequired: true,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        branchId: 2,
        branchName: 'Cabang Kedua'
      }
    ];

    return mockData;
  }

  // ===== PUBLIC API METHODS =====

  async markAsRead(notificationId: number): Promise<void> {
    try {
      await this.http.patch(`${this.baseUrl}/${notificationId}/read`, {}).toPromise();
      
      this._notifications.update(notifications =>
        notifications.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await this.http.patch(`${this.baseUrl}/read-all`, {}).toPromise();
      
      this._notifications.update(notifications =>
        notifications.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  }

  async loadRules(): Promise<void> {
    try {
      console.log('📋 Loading notification rules...');
      // Mock rules for now (backend implementation pending)
      this._rules.set([]);
    } catch (error) {
      console.error('❌ Error loading rules:', error);
    }
  }

  async loadPreferences(): Promise<void> {
    try {
      console.log('⚙️ Loading notification preferences...');
      // Load from localStorage or API
      const stored = localStorage.getItem('notification-preferences');
      if (stored) {
        this._preferences.set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('❌ Error loading preferences:', error);
    }
  }

  async loadAnalytics(): Promise<void> {
    try {
      console.log('📊 Loading notification analytics...');
      // Mock analytics for development
      this._analytics.set({
        totalNotificationsSent: 156,
        notificationsByType: {
          'expiry_warning': 89,
          'expired_alert': 34,
          'disposal_reminder': 23,
          'batch_blocked': 10
        },
        notificationsByPriority: {
          'Critical': 45,
          'High': 67,
          'Medium': 32,
          'Low': 12
        },
        averageResponseTime: 245, // minutes
        escalationRate: 0.28,
        effectivenessScore: 0.73,
        topTriggeredRules: [],
        branchPerformance: [],
        trendData: []
      });
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
    }
  }

  async loadRecommendations(): Promise<void> {
    try {
      console.log('💡 Loading intelligent recommendations...');
      // This will be populated by generateOptimizationRecommendations
    } catch (error) {
      console.error('❌ Error loading recommendations:', error);
    }
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const updated = { ...this._preferences(), ...preferences };
      this._preferences.set(updated);
      localStorage.setItem('notification-preferences', JSON.stringify(updated));
      
      console.log('✅ Notification preferences updated');
    } catch (error) {
      console.error('❌ Error updating preferences:', error);
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  refreshAll(): void {
    this.loadNotifications();
    this.loadAnalytics();
    this.loadRecommendations();
  }
}